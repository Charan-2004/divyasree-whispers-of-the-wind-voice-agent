import { WebSocket } from 'ws';
import { CONFIG } from './config.js';
import { 
  QualificationState, 
  createInitialState, 
  calculateLeadClassification, 
  getNextCheckpoint 
} from './stateMachine.js';
import { generateAgentResponse, ConversationMessage } from './geminiService.js';
import { streamSpeechPipelined, synthesizeSpeechChunk } from './sarvamTTS.js';
import { transcribeAudio } from './sarvamSTT.js';

export interface CallSession {
  sessionId: string;
  ws: WebSocket;
  state: QualificationState;
  history: ConversationMessage[];
  startTime: number;
  totalAudioSentChars: number;
  silenceTimer1?: NodeJS.Timeout;
  silenceTimer2?: NodeJS.Timeout;
  silenceCount: number;
  isProcessingTurn: boolean;
  isCompleted: boolean;
  currentTurnId: number;
}

export class SessionManager {
  private sessions = new Map<string, CallSession>();

  createSession(sessionId: string, ws: WebSocket, persona?: { name: string; phone_masked: string; city: string }): CallSession {
    const session: CallSession = {
      sessionId,
      ws,
      state: createInitialState(persona),
      history: [],
      startTime: Date.now(),
      totalAudioSentChars: 0,
      silenceCount: 0,
      isProcessingTurn: false,
      isCompleted: false,
      currentTurnId: 0
    };

    this.sessions.set(sessionId, session);
    return session;
  }

  getSession(sessionId: string): CallSession | undefined {
    return this.sessions.get(sessionId);
  }

  removeSession(sessionId: string) {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.isCompleted = true;
      session.currentTurnId++;
      this.clearSilenceTimers(session);
      this.sessions.delete(sessionId);
    }
  }

  /**
   * Start call and emit initial greeting via pipelined streaming TTS
   */
  async startCall(session: CallSession) {
    session.currentTurnId++;
    const turnId = session.currentTurnId;
    const greetingText = `Hello, this is Rohan calling from Divyasree regarding Whispers of the Wind, our private valley community near Nandi Hills. I know I am catching you during the day — do you have a quick minute to speak?`;

    session.history.push({ role: 'agent', text: greetingText });
    session.state.current_checkpoint = 'PERMISSION';

    // Notify UI that advisor has begun speaking (provides instant transcript display)
    this.sendToClient(session, {
      type: 'agent_speaking_start',
      turnId,
      fullText: greetingText,
      checkpoint: session.state.current_checkpoint,
      state: session.state
    });

    // Pipelined chunk delivery
    await streamSpeechPipelined(
      greetingText,
      {
        language_code: session.state.language,
        speaker: CONFIG.SARVAM_DEFAULT_SPEAKER
      },
      (chunk) => {
        if (session.currentTurnId !== turnId) return;

        this.sendToClient(session, {
          type: 'agent_chunk',
          turnId,
          chunkIndex: chunk.chunkIndex,
          totalChunks: chunk.totalChunks,
          isFinal: chunk.isFinal,
          text: chunk.text,
          audioBase64: chunk.audioBase64,
          durationEstimate: chunk.durationEstimateSeconds,
          checkpoint: session.state.current_checkpoint,
          state: session.state
        });
      },
      () => session.currentTurnId !== turnId || session.isCompleted
    );

    this.resetSilenceWatchdog(session);
  }

  /**
   * Process a text utterance from user
   */
  async processUserUtterance(session: CallSession, userText: string) {
    if (!userText || session.isCompleted) return;

    session.currentTurnId++;
    const activeTurnId = session.currentTurnId;

    this.clearSilenceTimers(session);
    session.silenceCount = 0;
    session.isProcessingTurn = true;
    session.state.turns_count++;

    // Notify client thinking
    this.sendToClient(session, { 
      type: 'agent_thinking',
      turnId: activeTurnId 
    });

    // Cost guard check
    const elapsedSeconds = (Date.now() - session.startTime) / 1000;
    if (elapsedSeconds > CONFIG.MAX_CALL_DURATION_SECONDS || session.state.turns_count > CONFIG.MAX_TURNS_PER_CALL) {
      return this.handleCostGuardExpiry(session);
    }

    session.history.push({ role: 'user', text: userText });

    // Send user message ack to UI
    this.sendToClient(session, {
      type: 'user_message',
      turnId: activeTurnId,
      text: userText
    });

    // Generate AI response via Gemini 2.5 Flash
    const turnResult = await generateAgentResponse(session.history, session.state, userText);

    // If user interrupted during Gemini thinking phase, discard turn
    if (session.currentTurnId !== activeTurnId) {
      return;
    }

    // Apply state updates
    Object.assign(session.state, turnResult.state_updates);
    session.state.current_checkpoint = turnResult.next_checkpoint || getNextCheckpoint(session.state);
    session.state.lead_temperature = turnResult.lead_temperature;
    
    // Evaluate classification
    const classification = calculateLeadClassification(session.state);
    session.state.lead_classification = classification.classification;

    session.history.push({ role: 'agent', text: turnResult.reply });
    session.totalAudioSentChars += turnResult.reply.length;

    // Send instant text to UI for zero transcript lag
    this.sendToClient(session, {
      type: 'agent_speaking_start',
      turnId: activeTurnId,
      fullText: turnResult.reply,
      checkpoint: session.state.current_checkpoint,
      state: session.state,
      leadClassification: classification
    });

    // Pipelined Streaming Speech Synthesis
    await streamSpeechPipelined(
      turnResult.reply,
      {
        language_code: session.state.language,
        speaker: CONFIG.SARVAM_DEFAULT_SPEAKER
      },
      (chunk) => {
        if (session.currentTurnId !== activeTurnId) return;

        this.sendToClient(session, {
          type: 'agent_chunk',
          turnId: activeTurnId,
          chunkIndex: chunk.chunkIndex,
          totalChunks: chunk.totalChunks,
          isFinal: chunk.isFinal,
          text: chunk.text,
          audioBase64: chunk.audioBase64,
          durationEstimate: chunk.durationEstimateSeconds,
          checkpoint: session.state.current_checkpoint,
          state: session.state,
          leadClassification: classification
        });
      },
      () => session.currentTurnId !== activeTurnId || session.isCompleted
    );

    session.isProcessingTurn = false;

    if (turnResult.should_end_call || session.state.current_checkpoint === 'COMPLETED' || turnResult.state_updates.permission === 'denied' || turnResult.state_updates.permission === 'callback_requested') {
      session.isCompleted = true;
      this.sendToClient(session, {
        type: 'call_completed',
        turnId: activeTurnId,
        summary: classification.summary,
        finalState: session.state,
        classification: classification
      });
    } else {
      this.resetSilenceWatchdog(session);
    }
  }

  /**
   * Process raw audio buffer from client
   */
  async processAudioBuffer(session: CallSession, buffer: Buffer) {
    if (session.isCompleted) return;

    this.clearSilenceTimers(session);
    this.sendToClient(session, { type: 'agent_transcribing' });

    const sttResult = await transcribeAudio({
      audioBuffer: buffer,
      model: CONFIG.SARVAM_STT_MODEL,
      mode: 'codemix'
    });

    if (sttResult.transcript) {
      await this.processUserUtterance(session, sttResult.transcript);
    } else {
      this.resetSilenceWatchdog(session);
    }
  }

  /**
   * Handle user interruption / barge-in
   */
  handleBargeIn(session: CallSession) {
    session.currentTurnId++;
    this.clearSilenceTimers(session);
    session.isProcessingTurn = false;
    this.sendToClient(session, {
      type: 'barge_in_acknowledged',
      turnId: session.currentTurnId
    });
  }

  /**
   * Silence handling timers
   */
  private resetSilenceWatchdog(session: CallSession) {
    this.clearSilenceTimers(session);

    if (session.isCompleted) return;

    // Timer 1: "Are you still with me?" after 6 seconds
    session.silenceTimer1 = setTimeout(async () => {
      if (session.isCompleted || session.isProcessingTurn) return;
      session.silenceCount++;

      session.currentTurnId++;
      const silenceTurnId = session.currentTurnId;
      const promptText = "Are you still with me?";
      session.history.push({ role: 'agent', text: promptText });

      this.sendToClient(session, {
        type: 'agent_speaking_start',
        turnId: silenceTurnId,
        fullText: promptText,
        isSilencePrompt: true
      });

      const ttsResult = await synthesizeSpeechChunk(promptText, {
        language_code: session.state.language
      });

      if (session.currentTurnId !== silenceTurnId) return;

      this.sendToClient(session, {
        type: 'agent_chunk',
        turnId: silenceTurnId,
        chunkIndex: 0,
        totalChunks: 1,
        isFinal: true,
        text: promptText,
        audioBase64: ttsResult.audioBase64,
        durationEstimate: ttsResult.durationEstimateSeconds,
        isSilencePrompt: true
      });

      // Timer 2: Polite callback wrap-up after additional 7 seconds
      session.silenceTimer2 = setTimeout(async () => {
        if (session.isCompleted || session.isProcessingTurn) return;

        session.currentTurnId++;
        const wrapUpTurnId = session.currentTurnId;
        const wrapUpText = "No problem at all — I will let you go for now. I'll have our Property Expert follow up at a more convenient time. Have a great day.";
        session.state.permission = 'callback_requested';
        session.state.lead_classification = 'CALLBACK';
        session.isCompleted = true;

        session.history.push({ role: 'agent', text: wrapUpText });

        this.sendToClient(session, {
          type: 'agent_speaking_start',
          turnId: wrapUpTurnId,
          fullText: wrapUpText,
          state: session.state
        });

        const finalTTS = await synthesizeSpeechChunk(wrapUpText, {
          language_code: session.state.language
        });

        if (session.currentTurnId !== wrapUpTurnId) return;

        this.sendToClient(session, {
          type: 'agent_chunk',
          turnId: wrapUpTurnId,
          chunkIndex: 0,
          totalChunks: 1,
          isFinal: true,
          text: wrapUpText,
          audioBase64: finalTTS.audioBase64,
          durationEstimate: finalTTS.durationEstimateSeconds,
          state: session.state
        });

        const classification = calculateLeadClassification(session.state);
        this.sendToClient(session, {
          type: 'call_completed',
          turnId: wrapUpTurnId,
          summary: classification.summary,
          finalState: session.state,
          classification: classification
        });
      }, CONFIG.SILENCE_TIMEOUT_2_SECONDS * 1000);

    }, CONFIG.SILENCE_TIMEOUT_1_SECONDS * 1000);
  }

  private clearSilenceTimers(session: CallSession) {
    if (session.silenceTimer1) clearTimeout(session.silenceTimer1);
    if (session.silenceTimer2) clearTimeout(session.silenceTimer2);
  }

  private async handleCostGuardExpiry(session: CallSession) {
    session.isCompleted = true;
    this.clearSilenceTimers(session);

    session.currentTurnId++;
    const costTurnId = session.currentTurnId;
    const wrapUp = "Thank you so much for your time today. Our senior Property Expert will connect with you to discuss the details. Have a wonderful day!";
    session.history.push({ role: 'agent', text: wrapUp });

    this.sendToClient(session, {
      type: 'agent_speaking_start',
      turnId: costTurnId,
      fullText: wrapUp,
      state: session.state
    });

    const ttsResult = await synthesizeSpeechChunk(wrapUp, {
      language_code: session.state.language
    });

    const classification = calculateLeadClassification(session.state);

    if (session.currentTurnId === costTurnId) {
      this.sendToClient(session, {
        type: 'agent_chunk',
        turnId: costTurnId,
        chunkIndex: 0,
        totalChunks: 1,
        isFinal: true,
        text: wrapUp,
        audioBase64: ttsResult.audioBase64,
        durationEstimate: ttsResult.durationEstimateSeconds,
        state: session.state
      });
    }

    this.sendToClient(session, {
      type: 'call_completed',
      turnId: costTurnId,
      costGuardTriggered: true,
      summary: classification.summary,
      finalState: session.state,
      classification: classification
    });
  }

  private sendToClient(session: CallSession, payload: any) {
    if (session.ws.readyState === WebSocket.OPEN) {
      session.ws.send(JSON.stringify(payload));
    }
  }
}

export const sessionManager = new SessionManager();
