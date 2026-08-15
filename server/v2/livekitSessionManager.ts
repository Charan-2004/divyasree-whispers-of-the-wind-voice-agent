import { CONFIG } from '../config.js';
import { 
  QualificationState, 
  ConversationState, 
  CompletionState, 
  createInitialV2State, 
  calculateV2LeadClassification 
} from './stateEngine.js';
import { planConversationalTurn, ConversationHistoryMessage } from './conversationalPlanner.js';
import { normalizeSpeech } from './speechNormalizer.js';
import { synthesizeSpeechChunk } from '../sarvamTTS.js';

import { analyzeCompletedCall, InterruptionEvent, PostCallAuditResult } from './callAuditor.js';

export interface V2CallSession {
  sessionId: string;
  roomName: string;
  currentTurnId: number;
  qualificationState: QualificationState;
  conversationState: ConversationState;
  completionState: CompletionState;
  history: ConversationHistoryMessage[];
  isSpeaking: boolean;
  isProcessingTurn: boolean;
  isCompleted: boolean;
  lastSpokenSentenceChunks: string[];
  interruptionEvents: InterruptionEvent[];
  silenceTimer1: NodeJS.Timeout | null;
  silenceTimer2: NodeJS.Timeout | null;
}

// In-Memory Pre-warmed Greeting Cache for instant 0ms call start
let CACHED_GREETING_AUDIO_BASE64: string = '';

const DEFAULT_GREETING = "Hello, this is Rohan calling from Divyashree regarding Whispers of the Wind, our private valley community near Nandi Hills. I know I am catching you during the day — do you have a quick minute to speak?";

// Pre-warm the greeting audio asynchronously at server startup
(async () => {
  if (CONFIG.SARVAM_API_KEY) {
    try {
      const normalized = normalizeSpeech(DEFAULT_GREETING);
      const tts = await synthesizeSpeechChunk(normalized, {
        language_code: 'en-IN',
        speaker: CONFIG.SARVAM_DEFAULT_SPEAKER || 'shubh',
        pace: 1.05,
        temperature: 0.7
      });
      if (tts && tts.audioBase64) {
        CACHED_GREETING_AUDIO_BASE64 = tts.audioBase64;
        console.log('⚡ [LiveKit V2] Opening greeting pre-warmed in memory (0ms instant start ready).');
      }
    } catch (e) {
      console.warn('Greeting pre-warm notice:', e);
    }
  }
})();

export class LiveKitSessionManager {
  private sessions: Map<string, V2CallSession> = new Map();

  createSession(sessionId: string, roomName: string): V2CallSession {
    const initialState = createInitialV2State();
    const session: V2CallSession = {
      sessionId,
      roomName,
      currentTurnId: 0,
      qualificationState: initialState.qualification,
      conversationState: initialState.conversation,
      completionState: initialState.completion,
      history: [],
      isSpeaking: false,
      isProcessingTurn: false,
      isCompleted: false,
      lastSpokenSentenceChunks: [],
      interruptionEvents: [],
      silenceTimer1: null,
      silenceTimer2: null
    };

    this.sessions.set(sessionId, session);
    return session;
  }

  async createToken(roomName: string, participantName: string): Promise<string> {
    const { AccessToken } = await import('livekit-server-sdk');
    const at = new AccessToken(CONFIG.LIVEKIT_API_KEY, CONFIG.LIVEKIT_API_SECRET, {
      identity: participantName,
      name: participantName,
    });
    at.addGrant({ roomJoin: true, room: roomName, canPublish: true, canSubscribe: true });
    return await at.toJwt();
  }

  getSession(sessionId: string): V2CallSession | undefined {
    return this.sessions.get(sessionId);
  }

  /**
   * Handles user barge-in (interruption):
   * Truncates the last agent history turn to what was actually delivered to speakers,
   * preserving memory that subsequent questions were not yet heard.
   */
  handleBargeIn(session: V2CallSession, userBargeInText: string = ''): number {
    session.currentTurnId++;
    session.isSpeaking = false;
    session.isProcessingTurn = false;
    this.clearSilenceTimers(session);

    let lastAgentSnippet = 'Opening / In-flight statement';
    if (session.history.length > 0 && session.history[session.history.length - 1].role === 'agent') {
      if (session.lastSpokenSentenceChunks.length > 0) {
        session.history[session.history.length - 1].text = session.lastSpokenSentenceChunks.join(' ') + ' [Interrupted by user]';
      }
      lastAgentSnippet = session.history[session.history.length - 1].text.slice(0, 70) + '...';
    }

    session.lastSpokenSentenceChunks = [];

    session.interruptionEvents.push({
      turnId: session.currentTurnId,
      agentSpeechSnippet: lastAgentSnippet,
      userBargeInText: userBargeInText || '[Voice Barge-in Detected]',
      timestamp: new Date().toLocaleTimeString('en-US')
    });

    return session.currentTurnId;
  }

  /**
   * Generates Comprehensive Post-Call Audit
   */
  async generatePostCallAudit(session: V2CallSession): Promise<PostCallAuditResult> {
    const audit = await analyzeCompletedCall(session.history, session.qualificationState, session.interruptionEvents);
    session.qualificationState = audit.qualificationState;
    return audit;
  }

  /**
   * Processes a finalized user utterance through the V2 conversational turn pipeline
   */
  async processTurn(
    session: V2CallSession,
    userText: string,
    onChunk: (payload: any) => void | Promise<void>,
    onStateUpdate: (statePayload: any) => void
  ): Promise<void> {
    if (session.isCompleted || !userText.trim()) return;

    // Disarm silence timers & increment turn ID
    this.clearSilenceTimers(session);
    session.currentTurnId++;
    const activeTurnId = session.currentTurnId;
    session.isProcessingTurn = true;
    session.lastSpokenSentenceChunks = [];

    // Append user message to history & bump turn count
    session.history.push({ role: 'user', text: userText });
    session.qualificationState.turns_count++;

    // Step 1: Conversational Turn Planning
    const plan = await planConversationalTurn(
      session.history,
      session.qualificationState,
      session.conversationState,
      session.completionState,
      userText
    );

    // If interrupted while planning, abort immediately
    if (session.currentTurnId !== activeTurnId) return;

    // Step 2: Update Application-Owned State
    session.qualificationState = {
      ...session.qualificationState,
      ...plan.proposed_qualification_updates,
      turns_count: session.qualificationState.turns_count
    };
    session.conversationState = plan.next_conversation_state;
    session.completionState = plan.next_completion_state;

    // Compute updated classification
    const classification = calculateV2LeadClassification(session.qualificationState);
    session.qualificationState.lead_classification = classification.classification;

    // Add agent reply to history
    session.history.push({ role: 'agent', text: plan.reply });

    // Step 3: Speech Normalization & Sentence Pipelining
    const normalizedSpokenText = normalizeSpeech(plan.reply);
    const rawSentences = normalizedSpokenText.match(/[^.!?]+[.!?]+|\S[^.!?]*$/g) || [normalizedSpokenText];
    const sentences = rawSentences.map(s => s.trim()).filter(s => s.length > 0);

    const estimatedTotalSeconds = Math.max(2.5, normalizedSpokenText.split(/\s+/).length * 0.40);
    session.isSpeaking = true;

    // Fast-Path Pipelined Sentence Synthesis
    for (let i = 0; i < sentences.length; i++) {
      const sentenceText = sentences[i];
      const isFirst = i === 0;
      const isLast = i === sentences.length - 1;

      const tts = await synthesizeSpeechChunk(sentenceText, {
        language_code: session.qualificationState.language,
        speaker: CONFIG.SARVAM_DEFAULT_SPEAKER || 'shubh',
        pace: 1.05,
        temperature: 0.72
      });

      if (session.currentTurnId !== activeTurnId) return;

      session.lastSpokenSentenceChunks.push(sentenceText);

      // On first audio chunk ready, notify state and render transcript in sync with audio start
      if (isFirst) {
        onStateUpdate({
          turnId: activeTurnId,
          reply: plan.reply,
          tone: plan.tone,
          user_intent: plan.user_intent,
          qualificationState: session.qualificationState,
          conversationState: session.conversationState,
          completionState: session.completionState,
          classification: classification
        });
      }

      await onChunk({
        turnId: activeTurnId,
        chunkIndex: i,
        totalChunks: sentences.length,
        isFinal: isLast,
        text: sentenceText,
        audioBase64: tts.audioBase64,
        durationEstimate: tts.durationEstimateSeconds || Math.max(1.2, sentenceText.split(/\s+/).length * 0.4),
        qualificationState: session.qualificationState,
        conversationState: session.conversationState,
        completionState: session.completionState
      });
    }

    session.isSpeaking = false;
    session.isProcessingTurn = false;

    // Step 5: Check if call should conclude
    if (plan.should_end_call || session.completionState === 'DO_NOT_CONTACT') {
      session.isCompleted = true;
    } else {
      // Re-arm silence watchdog after audio completes playing
      this.armSilenceWatchdog(session, estimatedTotalSeconds, onStateUpdate, onChunk);
    }
  }

  /**
   * Generates opening outbound greeting with Instant 0ms Pre-warmed Audio
   */
  async startOutboundCall(
    session: V2CallSession,
    onChunk: (payload: any) => void | Promise<void>,
    onStateUpdate: (statePayload: any) => void
  ): Promise<void> {
    session.currentTurnId = 1;
    const activeTurnId = session.currentTurnId;
    const greetingText = DEFAULT_GREETING;

    session.history.push({ role: 'agent', text: greetingText });
    session.conversationState = 'permission';

    onStateUpdate({
      turnId: activeTurnId,
      reply: greetingText,
      tone: 'warm',
      qualificationState: session.qualificationState,
      conversationState: session.conversationState,
      completionState: session.completionState
    });

    const normalizedGreeting = normalizeSpeech(greetingText);
    const estimatedGreetingSeconds = 6.0;

    let audioBase64 = CACHED_GREETING_AUDIO_BASE64;
    if (!audioBase64) {
      const tts = await synthesizeSpeechChunk(normalizedGreeting, {
        language_code: session.qualificationState.language,
        speaker: CONFIG.SARVAM_DEFAULT_SPEAKER || 'shubh',
        pace: 1.05,
        temperature: 0.7
      });
      audioBase64 = tts.audioBase64;
    }

    if (session.currentTurnId !== activeTurnId) return;

    await onChunk({
      turnId: activeTurnId,
      chunkIndex: 0,
      totalChunks: 1,
      isFinal: true,
      text: normalizedGreeting,
      audioBase64: audioBase64,
      durationEstimate: estimatedGreetingSeconds,
      qualificationState: session.qualificationState
    });

    this.armSilenceWatchdog(session, estimatedGreetingSeconds, onStateUpdate, onChunk);
  }

  private armSilenceWatchdog(
    session: V2CallSession,
    playbackDurationEstimateSeconds: number,
    onStateUpdate: (statePayload: any) => void,
    onChunk: (payload: any) => void | Promise<void>
  ) {
    this.clearSilenceTimers(session);
    if (session.isCompleted) return;

    // Generous delay: wait for audio to finish + 30 seconds of prospect thinking time
    const initialDelayMs = Math.round((playbackDurationEstimateSeconds + 30) * 1000);

    session.silenceTimer1 = setTimeout(async () => {
      if (session.isCompleted || session.isProcessingTurn || session.isSpeaking) return;

      session.currentTurnId++;
      const silenceTurnId = session.currentTurnId;
      const promptText = "Take your time — please let me know if you are still with me.";
      session.history.push({ role: 'agent', text: promptText });

      onStateUpdate({
        turnId: silenceTurnId,
        reply: promptText,
        tone: 'curious',
        isSilencePrompt: true,
        qualificationState: session.qualificationState
      });

      const tts = await synthesizeSpeechChunk(promptText, {
        language_code: session.qualificationState.language,
        speaker: CONFIG.SARVAM_DEFAULT_SPEAKER || 'shubh'
      });

      if (session.currentTurnId !== silenceTurnId) return;

      await onChunk({
        turnId: silenceTurnId,
        chunkIndex: 0,
        totalChunks: 1,
        isFinal: true,
        text: promptText,
        audioBase64: tts.audioBase64,
        isSilencePrompt: true
      });

      // Timer 2: Patient Wrap up after additional 45 seconds of silence
      session.silenceTimer2 = setTimeout(async () => {
        if (session.isCompleted || session.isProcessingTurn || session.isSpeaking) return;

        session.currentTurnId++;
        const wrapTurnId = session.currentTurnId;
        const wrapText = "I will let you get back to your day for now. I'll have our Property Expert share the masterplan at a more convenient time. Have a great day.";
        
        session.qualificationState.permission = 'callback_requested';
        session.completionState = 'COMPLETED';
        session.isCompleted = true;
        session.history.push({ role: 'agent', text: wrapText });

        onStateUpdate({
          turnId: wrapTurnId,
          reply: wrapText,
          tone: 'calm',
          qualificationState: session.qualificationState,
          completionState: session.completionState
        });

        const wrapTts = await synthesizeSpeechChunk(wrapText, {
          language_code: session.qualificationState.language,
          speaker: CONFIG.SARVAM_DEFAULT_SPEAKER || 'shubh'
        });

        if (session.currentTurnId !== wrapTurnId) return;

        await onChunk({
          turnId: wrapTurnId,
          chunkIndex: 0,
          totalChunks: 1,
          isFinal: true,
          text: wrapText,
          audioBase64: wrapTts.audioBase64
        });
      }, 16000);
    }, initialDelayMs);
  }

  private clearSilenceTimers(session: V2CallSession) {
    if (session.silenceTimer1) clearTimeout(session.silenceTimer1);
    if (session.silenceTimer2) clearTimeout(session.silenceTimer2);
    session.silenceTimer1 = null;
    session.silenceTimer2 = null;
  }
}

export const livekitSessionManager = new LiveKitSessionManager();
