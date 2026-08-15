/**
 * Divyasree Whispers of the Wind - Frontend Client Application (V2 LiveKit & WebSocket)
 * Features Strict Chunk Ordering, Utterance Debouncing, Speaker Echo Shield,
 * Dynamic 3-Tier State Cards, and Real-Time Turn Synchronization.
 */

// Application State
const state = {
  ws: null,
  callActive: false,
  callStartTime: null,
  timerInterval: null,
  audioContext: null,
  mediaStream: null,
  audioProcessor: null,
  speechRecognizer: null,
  speechDebounceTimer: null,
  audioQueue: [],
  currentAudioSource: null,
  isPlayingAudio: false,
  currentTurnId: 0,
  selectedPersona: 'custom',
  latestState: null,
  conversationLog: [],
  currentScenarioRunning: false,
  pendingCompletion: null,
  recordedSamples: [],
  isRecordingUserSpeech: false,
  isPushToTalking: false,
  autoVADEnabled: true,
  sustainedSpeechFrames: 0,
  silenceFrames: 0,
};

// Persona Presets & Live Custom Mode
const personas = {
  custom: {
    name: 'You (Live Evaluator)',
    title: 'Custom Prospect / Evaluator',
    city: 'Live Mic / Custom City',
    phone: 'Freeform Voice & Text',
    goal: 'Live Qualification Testing',
  },
  arjun: {
    name: 'Arjun Mehta',
    title: 'Tech VP / CXO',
    city: 'Indiranagar, Bengaluru',
    phone: '+91 9845X-XX102',
    goal: 'Weekend Villa Plot (Self-Use)',
  },
  priya: {
    name: 'Priya Sharma',
    title: 'NRI Managing Director',
    city: 'Singapore / Bengaluru',
    phone: '+65 912X-XX89',
    goal: 'High-Yield Plotted Investment',
  },
  vikram: {
    name: 'Vikram Malhotra',
    title: 'Startup Founder',
    city: 'Koramangala, Bengaluru',
    phone: '+91 9980X-XX341',
    goal: 'Budget Mismatch (₹50L)',
  },
  ananya: {
    name: 'Ananya Rao',
    title: 'Design Director',
    city: 'Whitefield, Bengaluru',
    phone: '+91 9741X-XX567',
    goal: 'Location Mismatch (East BLR)',
  },
  rajesh: {
    name: 'Rajesh Verma',
    title: 'Senior VP',
    city: 'Bellary Road, Bengaluru',
    phone: '+91 9611X-XX998',
    goal: 'Do-Not-Contact Lead',
  },
  sunita: {
    name: 'Sunita Agarwal',
    title: 'Business Owner',
    city: 'Sadashivanagar, Bengaluru',
    phone: '+91 9886X-XX234',
    goal: 'Hindi / Hinglish Lead',
  },
};

// Scenario Scripted Utterances for Instant Testing
const scenarioFlows = {
  flow1: {
    persona: 'arjun',
    name: 'Flow 1: Hot Self-Use Lead',
    steps: [
      { delay: 1000, text: "Yes, sure. I have a minute." },
      { delay: 1400, text: "I'm actually looking for a luxury weekend villa plot for my family away from city traffic." },
      { delay: 1400, text: "Yes, Nandi Hills is perfect for us. We love the valley views." },
      { delay: 1400, text: "Our budget is around 1.2 to 1.5 crore, so that fits comfortably." },
      { delay: 1400, text: "December 2029 is fine. We are looking for long term quality." },
      { delay: 1400, text: "Yes, please arrange a private site visit for this Saturday." }
    ]
  },
  flow2: {
    persona: 'priya',
    name: 'Flow 2: Investment Lead',
    steps: [
      { delay: 1000, text: "Yes, tell me quickly about the project." },
      { delay: 1400, text: "I am an NRI looking primarily at land investment in Bangalore." },
      { delay: 1400, text: "North Bangalore airport corridor makes a lot of sense for growth." },
      { delay: 1400, text: "Yes, 92.4 lakh to 2 crore is well within my allocation. What kind of returns are expected?" },
      { delay: 1400, text: "Fair enough, I understand there are no guarantees. 2029 possession is fine." },
      { delay: 1400, text: "Sure, please connect me with your Property Expert with the masterplan." }
    ]
  },
  flow3: {
    persona: 'vikram',
    name: 'Flow 3: Budget Mismatch Lead',
    steps: [
      { delay: 1000, text: "Yes, go ahead." },
      { delay: 1400, text: "I want a small holiday plot near Nandi Hills." },
      { delay: 1400, text: "I love Nandi Hills, but my strict budget is only 45 to 50 lakhs total." },
      { delay: 1400, text: "Understood. Please keep my contact for smaller releases in future." }
    ]
  },
  flow4: {
    persona: 'ananya',
    name: 'Flow 4: Location Mismatch Lead',
    steps: [
      { delay: 1000, text: "Yes, I have a quick minute." },
      { delay: 1400, text: "I'm looking for a weekend plot with budget around 1.5 Cr, but Nandi Hills is way too far for me. I only want Whitefield or Sarjapur." },
      { delay: 1400, text: "No, I am strictly looking in East Bangalore. Thank you." }
    ]
  },
  flow5: {
    persona: 'rajesh',
    name: 'Flow 5: Irritated / Do-Not-Contact',
    steps: [
      { delay: 800, text: "Please stop calling me! Remove my number from your database immediately." }
    ]
  },
  flow6: {
    persona: 'sunita',
    name: 'Flow 6: Hindi / Hinglish Lead',
    steps: [
      { delay: 1000, text: "हाँ जी, बताइए, क्या प्रोजेक्ट है?" },
      { delay: 1400, text: "मुझे अपनी फैमिली के लिए नंदी हिल्स में एक शांत वीकेंड विला प्लॉट चाहिए।" },
      { delay: 1400, text: "हाँ, लोकेशन बहुत अच्छी है और हमारा बजट करीब 1.5 करोड़ तक का है।" },
      { delay: 1400, text: "2029 का टाइमलाइन ठीक है। क्या आप इस वीकेंड साइट विजिट करवा सकते हैं?" }
    ]
  }
};

// DOM References
const dom = {
  personaSelect: document.getElementById('personaSelect'),
  leadPhone: document.getElementById('leadPhone'),
  leadCity: document.getElementById('leadCity'),
  leadGoal: document.getElementById('leadGoal'),
  callTimer: document.getElementById('callTimer'),
  voiceStatusText: document.getElementById('voiceStatusText'),
  orbContainer: document.getElementById('orbContainer'),
  btnStartCall: document.getElementById('btnStartCall'),
  btnBargeIn: document.getElementById('btnBargeIn'),
  btnEndCall: document.getElementById('btnEndCall'),
  btnPushToTalk: document.getElementById('btnPushToTalk'),
  btnToggleAutoMic: document.getElementById('btnToggleAutoMic'),
  micIcon: document.getElementById('micIcon'),
  micStatusLabel: document.getElementById('micStatusLabel'),
  manualTextInput: document.getElementById('manualTextInput'),
  btnSendText: document.getElementById('btnSendText'),
  transcriptFeed: document.getElementById('transcriptFeed'),
  btnClearLog: document.getElementById('btnClearLog'),
  btnExportSummary: document.getElementById('btnExportSummary'),
  leadClassificationBadge: document.getElementById('leadClassificationBadge'),
  cardIntent: document.getElementById('cardIntent'),
  cardGeography: document.getElementById('cardGeography'),
  cardBudget: document.getElementById('cardBudget'),
  cardTimeline: document.getElementById('cardTimeline'),
  statusIntent: document.getElementById('statusIntent'),
  statusGeography: document.getElementById('statusGeography'),
  statusBudget: document.getElementById('statusBudget'),
  statusTimeline: document.getElementById('statusTimeline'),
  valIntent: document.getElementById('valIntent'),
  valGeography: document.getElementById('valGeography'),
  valBudget: document.getElementById('valBudget'),
  valTimeline: document.getElementById('valTimeline'),
  summaryModal: document.getElementById('summaryModal'),
  modalBody: document.getElementById('modalBody'),
  btnCloseModal: document.getElementById('btnCloseModal'),
  btnCloseModalBtn: document.getElementById('btnCloseModalBtn'),
  btnCopyJson: document.getElementById('btnCopyJson'),
};

// Initialize WebSocket
function initWebSocket() {
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const wsUrl = `${protocol}//${window.location.host}/ws/call`;
  
  state.ws = new WebSocket(wsUrl);

  state.ws.onopen = () => {
    console.log('Connected to Divyasree Voice Agent V2 server.');
    document.getElementById('connectionStatus').textContent = 'LiveKit V2 Connected • Gemini 3.1 & Sarvam Active';
  };

  state.ws.onmessage = async (event) => {
    try {
      const data = JSON.parse(event.data);
      handleServerMessage(data);
    } catch (e) {
      console.error('Error parsing server message:', e);
    }
  };

  state.ws.onclose = () => {
    console.warn('WebSocket closed. Reconnecting in 2s...');
    document.getElementById('connectionStatus').textContent = 'Reconnecting server...';
    setTimeout(initWebSocket, 2000);
  };
}

// Handle Server Messages
function handleServerMessage(data) {
  if (!state.callActive && data.type !== 'call_completed') {
    return;
  }

  switch (data.type) {
    case 'agent_thinking':
      if (data.turnId) state.currentTurnId = data.turnId;
      setVoiceState('thinking', 'Advisor is formulating response...');
      break;

    case 'agent_transcribing':
      setVoiceState('listening', 'Transcribing your voice with Saaras v3...');
      break;

    case 'user_message':
      addTranscriptMessage('user', data.text);
      break;

    case 'agent_speaking_start':
      if (data.turnId) state.currentTurnId = data.turnId;
      setVoiceState('speaking', 'Divyasree Advisor Speaking...');
      if (data.reply || data.fullText) {
        addTranscriptMessage('agent', data.reply || data.fullText);
      }
      if (data.qualificationState) updateQualificationCards(data.qualificationState);
      break;

    case 'agent_chunk':
      if (!state.callActive) return;
      if (data.turnId) {
        if (data.turnId < state.currentTurnId) {
          // Strictly ignore audio from older discarded turns
          return;
        }
        state.currentTurnId = data.turnId;
      }
      if (data.qualificationState) updateQualificationCards(data.qualificationState);
      if (data.audioBase64) {
        enqueueAudioChunk(data);
      } else {
        setTimeout(() => {
          if (state.callActive && !state.isPlayingAudio && state.audioQueue.length === 0) {
            setVoiceState('listening', 'Listening to you...');
          }
        }, 1200);
      }
      break;

    case 'barge_in_acknowledged':
      if (data.turnId) state.currentTurnId = data.turnId;
      stopAudioPlayback();
      setVoiceState('interrupted', 'Interrupted: Advisor yielding to you');
      setTimeout(() => {
        if (state.callActive && !state.isPlayingAudio) setVoiceState('listening', 'Listening to you...');
      }, 200);
      break;

    case 'call_completed':
      if (data.finalState) updateQualificationCards(data.finalState);
      state.pendingCompletion = data;
      break;

    case 'audit_in_progress':
      setVoiceState('completed', 'Call Concluded • Running Deep LLM Audit...');
      break;

    case 'call_audit_completed':
      state.latestAudit = data.audit;
      if (data.audit && data.audit.qualificationState) {
        updateQualificationCards(data.audit.qualificationState);
        state.latestState = data.audit.qualificationState;
      }
      setVoiceState('completed', 'Executive Lead Audit Complete (View Summary)');
      break;
  }
}

let thinkingSafetyTimer = null;
function setVoiceState(stateName, statusText) {
  dom.orbContainer.className = `voice-orb-container ${stateName}`;
  dom.voiceStatusText.textContent = statusText;

  if (thinkingSafetyTimer) {
    clearTimeout(thinkingSafetyTimer);
    thinkingSafetyTimer = null;
  }

  if (stateName === 'thinking') {
    thinkingSafetyTimer = setTimeout(() => {
      if (state.callActive && !state.isPlayingAudio && state.audioQueue.length === 0) {
        setVoiceState('listening', 'Listening to you...');
      }
    }, 4000);
  }
}

// Start Call Session
async function startCallSession() {
  if (state.callActive) return;

  const persona = personas[state.selectedPersona] || personas.custom || {
    name: 'You (Live Evaluator)',
    phone: '+91 98765-XXXXX',
    city: 'Live Mic'
  };

  state.callActive = true;
  state.currentScenarioRunning = false;
  state.callStartTime = Date.now();
  state.conversationLog = [];
  state.audioQueue = [];
  state.currentTurnId = 0;
  state.pendingCompletion = null;
  state.sustainedSpeechFrames = 0;
  state.silenceFrames = 0;
  state.latestAudit = null;
  dom.transcriptFeed.innerHTML = '';
  
  updateQualificationCards({
    intent: null,
    location_fit: null,
    budget_fit: null,
    timeline_fit: null,
    lead_classification: 'WARM'
  });
  
  dom.btnStartCall.disabled = true;
  if (dom.btnBargeIn) dom.btnBargeIn.disabled = false;
  dom.btnEndCall.disabled = false;
  dom.manualTextInput.disabled = false;
  dom.btnSendText.disabled = false;

  setVoiceState('calling', 'Connecting to Divyasree Advisor (Rohan)...');

  // Unlock AudioContext
  try {
    if (!state.audioContext) {
      state.audioContext = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (state.audioContext.state === 'suspended') {
      await state.audioContext.resume();
    }
  } catch (e) {
    console.warn('AudioContext unlock notice:', e);
  }

  // Start Timer
  if (state.timerInterval) clearInterval(state.timerInterval);
  state.timerInterval = setInterval(() => {
    const elapsed = Math.floor((Date.now() - state.callStartTime) / 1000);
    const mins = String(Math.floor(elapsed / 60)).padStart(2, '0');
    const secs = String(elapsed % 60).padStart(2, '0');
    dom.callTimer.textContent = `${mins}:${secs}`;
  }, 1000);

  // 1. Send Start Call Event IMMEDIATELY (<5ms)
  if (state.ws && state.ws.readyState === WebSocket.OPEN) {
    state.ws.send(JSON.stringify({
      type: 'start_call',
      persona: {
        name: persona.name,
        phone_masked: persona.phone || '+91 98765-XXXXX',
        city: persona.city || 'Bangalore'
      }
    }));
  }

  // 2. Initialize Microphone & Speech Recognition asynchronously
  (async () => {
    try {
      await startMicrophoneAudio();
      if (state.autoVADEnabled && state.callActive) {
        startSpeechRecognition();
      }
    } catch (micErr) {
      console.warn('Microphone start notice:', micErr);
    }
  })();

  // 3. Connect to LiveKit Cloud Room via WebRTC in background (Non-blocking)
  (async () => {
    try {
      const lkRes = await fetch('/api/livekit/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          roomName: `whispers-wind-${Date.now()}`,
          participantName: persona.name
        })
      });

      if (lkRes.ok) {
        const lkData = await lkRes.json();
        if (window.LivekitClient && lkData.token && lkData.url && state.callActive) {
          state.livekitRoom = new LivekitClient.Room({
            adaptiveStream: true,
            dynacast: true
          });
          await state.livekitRoom.connect(lkData.url, lkData.token);
          console.log('⚡ Connected to LiveKit Cloud SFU Room:', lkData.roomName);
          
          if (state.mediaStream && state.callActive) {
            const audioTrack = state.mediaStream.getAudioTracks()[0];
            if (audioTrack) {
              await state.livekitRoom.localParticipant.publishTrack(audioTrack);
              console.log('🎙️ Published live microphone track to LiveKit Cloud (Active WebRTC Bandwidth)!');
            }
          }
        }
      }
    } catch (lkErr) {
      console.warn('LiveKit Cloud connection background notice:', lkErr);
    }
  })();

  setTimeout(() => {
    if (dom.manualTextInput) dom.manualTextInput.focus();
  }, 100);
}

// End Call Session
function endCallSession(notifyServer = true) {
  state.callActive = false;
  state.currentScenarioRunning = false;
  state.currentTurnId++;
  state.pendingCompletion = null;
  
  if (state.timerInterval) {
    clearInterval(state.timerInterval);
    state.timerInterval = null;
  }

  if (state.livekitRoom) {
    try {
      state.livekitRoom.disconnect();
      console.log('🔌 Disconnected from LiveKit Cloud Room');
    } catch (e) {}
    state.livekitRoom = null;
  }

  stopAudioPlayback();
  stopMicrophoneAudio();
  stopSpeechRecognition();

  dom.btnStartCall.disabled = false;
  if (dom.btnBargeIn) dom.btnBargeIn.disabled = true;
  dom.btnEndCall.disabled = true;
  dom.manualTextInput.disabled = true;
  dom.btnSendText.disabled = true;

  setVoiceState('completed', 'Call Ended • Summary Saved');

  if (notifyServer && state.ws && state.ws.readyState === WebSocket.OPEN) {
    state.ws.send(JSON.stringify({ type: 'end_call' }));
  }
}

// Barge-In
function triggerBargeIn() {
  if (!state.callActive) return;

  stopAudioPlayback();
  setVoiceState('interrupted', 'Interrupted: Advisor yielding to you');
  
  if (state.ws && state.ws.readyState === WebSocket.OPEN) {
    state.ws.send(JSON.stringify({ 
      type: 'barge_in'
    }));
  }

  setTimeout(() => {
    if (state.callActive && !state.isPlayingAudio) {
      setVoiceState('listening', 'Listening to you...');
    }
  }, 200);
}

// Microphone Audio Capture & Echo Immunity
async function startMicrophoneAudio() {
  try {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      dom.micStatusLabel.textContent = 'Microphone: Not Supported (Type Below)';
      return;
    }

    state.mediaStream = await navigator.mediaDevices.getUserMedia({
      audio: {
        channelCount: 1,
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      }
    });

    if (!state.audioContext) {
      state.audioContext = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (state.audioContext.state === 'suspended') {
      await state.audioContext.resume();
    }

    const source = state.audioContext.createMediaStreamSource(state.mediaStream);
    state.audioProcessor = state.audioContext.createScriptProcessor(4096, 1, 1);

    const SPEECH_ENERGY_THRESHOLD = 0.025;
    const SUSTAINED_FRAMES_REQUIRED_FOR_BARGE_IN = 3;

    state.audioProcessor.onaudioprocess = (e) => {
      if (!state.callActive) return;
      
      const inputData = e.inputBuffer.getChannelData(0);

      // Push-to-Talk active
      if (state.isPushToTalking) {
        for (let i = 0; i < inputData.length; i++) {
          state.recordedSamples.push(inputData[i]);
        }
        return;
      }

      if (!state.autoVADEnabled) return;

      // Instant Voice Barge-In: When agent is speaking, detect voice to yield immediately
      if (state.isPlayingAudio) {
        let sum = 0;
        for (let i = 0; i < inputData.length; i++) sum += inputData[i] * inputData[i];
        const rms = Math.sqrt(sum / inputData.length);
        
        if (rms > 0.035) {
          triggerBargeIn();
        }
        return;
      }

      // Normal VAD listening
      let sum = 0;
      for (let i = 0; i < inputData.length; i++) {
        sum += inputData[i] * inputData[i];
      }
      const rms = Math.sqrt(sum / inputData.length);

      if (rms > SPEECH_ENERGY_THRESHOLD) {
        state.silenceFrames = 0;
        state.isRecordingUserSpeech = true;
        for (let i = 0; i < inputData.length; i++) {
          state.recordedSamples.push(inputData[i]);
        }
      } else if (state.isRecordingUserSpeech) {
        state.silenceFrames++;
        for (let i = 0; i < inputData.length; i++) {
          state.recordedSamples.push(inputData[i]);
        }

        if (state.silenceFrames >= 4) {
          state.isRecordingUserSpeech = false;
          flushRecordedAudioToSTT();
        }
      }
    };

    source.connect(state.audioProcessor);
    // Note: Do not connect audioProcessor to destination to prevent mic echo feedback loop into speakers

    dom.micStatusLabel.textContent = state.autoVADEnabled ? 'Auto VAD: Active (Listening)' : 'Push to Talk: Hold Space / Tap';
    dom.micIcon.style.color = '#10B981';
  } catch (err) {
    console.warn('Microphone permission or init issue:', err);
    dom.micStatusLabel.textContent = 'Microphone: Inactive (Type responses below)';
  }
}

function stopMicrophoneAudio() {
  if (state.mediaStream) {
    state.mediaStream.getTracks().forEach(track => track.stop());
    state.mediaStream = null;
  }
  if (state.audioProcessor) {
    state.audioProcessor.disconnect();
    state.audioProcessor = null;
  }
  state.recordedSamples = [];
  state.isRecordingUserSpeech = false;
  state.isPushToTalking = false;
  state.sustainedSpeechFrames = 0;
  state.silenceFrames = 0;
  dom.micStatusLabel.textContent = 'Microphone: Inactive';
  dom.micIcon.style.color = 'inherit';
}

// Convert recorded Float32 PCM to 16-bit WAV and send to Sarvam Saaras v3 STT
function flushRecordedAudioToSTT() {
  if (state.recordedSamples.length < 6000 || !state.callActive) {
    state.recordedSamples = [];
    return;
  }

  const sampleRate = state.audioContext ? state.audioContext.sampleRate : 16000;
  const samples = new Float32Array(state.recordedSamples);
  state.recordedSamples = [];

  const wavBlob = encodeWAV(samples, sampleRate);
  const reader = new FileReader();
  reader.onloadend = () => {
    const base64Data = (reader.result).split(',')[1];
    if (base64Data && state.ws && state.ws.readyState === WebSocket.OPEN && state.callActive) {
      state.ws.send(JSON.stringify({
        type: 'user_audio',
        audioBase64: base64Data
      }));
    }
  };
  reader.readAsDataURL(wavBlob);
}

// Helper: Encode raw PCM float array to 16-bit mono WAV Blob
function encodeWAV(samples, sampleRate) {
  const buffer = new ArrayBuffer(44 + samples.length * 2);
  const view = new DataView(buffer);

  writeString(view, 0, 'RIFF');
  view.setUint32(4, 36 + samples.length * 2, true);
  writeString(view, 8, 'WAVE');
  writeString(view, 12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeString(view, 36, 'data');
  view.setUint32(40, samples.length * 2, true);

  let offset = 44;
  for (let i = 0; i < samples.length; i++, offset += 2) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
  }

  return new Blob([view], { type: 'audio/wav' });
}

function writeString(view, offset, string) {
  for (let i = 0; i < string.length; i++) {
    view.setUint8(offset + i, string.charCodeAt(i));
  }
}

// Native Web Speech Recognition with Auto-Recreation on onend & Echo Shield
function startSpeechRecognition() {
  if (!state.callActive) return;
  const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRec) return;

  if (state.speechRecognizer) {
    try {
      state.speechRecognizer.abort();
    } catch (e) {}
    state.speechRecognizer = null;
  }

  try {
    const recognizer = new SpeechRec();
    recognizer.continuous = true;
    recognizer.interimResults = true;
    recognizer.lang = 'en-IN';

    recognizer.onresult = (event) => {
      if (!state.callActive) return;

      let finalTranscript = '';
      let interimTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          finalTranscript += event.results[i][0].transcript;
        } else {
          interimTranscript += event.results[i][0].transcript;
        }
      }

      const activeText = (finalTranscript || interimTranscript).trim();

      // Instant Barge-In: Yield advisor immediately on user voice
      if (state.isPlayingAudio && activeText.length >= 1) {
        triggerBargeIn();
      }

      // Visual feedback: user is speaking
      if (activeText.length > 0 && !state.isPlayingAudio) {
        dom.micStatusLabel.textContent = `Hearing: "${activeText}"`;
        dom.micIcon.style.color = '#3B82F6';
      }

      if (finalTranscript && finalTranscript.trim().length >= 2 && !/^(uh|um|ah|er)$/i.test(finalTranscript.trim())) {
        const textToSend = finalTranscript.trim();
        if (state.speechDebounceTimer) clearTimeout(state.speechDebounceTimer);

        state.speechDebounceTimer = setTimeout(() => {
          if (state.ws && state.ws.readyState === WebSocket.OPEN && state.callActive) {
            state.ws.send(JSON.stringify({
              type: 'user_text',
              text: textToSend
            }));
            dom.micStatusLabel.textContent = 'Auto VAD: Active (Listening)';
            dom.micIcon.style.color = '#10B981';
          }
        }, 100);
      }
    };

    recognizer.onerror = (e) => {
      console.log('WebSpeech error notice:', e.error);
      if (e.error === 'not-allowed') {
        dom.micStatusLabel.textContent = 'Microphone Permission Blocked';
      }
    };

    recognizer.onend = () => {
      // Cleanly re-create a new recognition instance when browser cycle ends
      if (state.callActive && state.autoVADEnabled) {
        setTimeout(() => {
          if (state.callActive && state.autoVADEnabled) {
            startSpeechRecognition();
          }
        }, 150);
      }
    };

    state.speechRecognizer = recognizer;
    recognizer.start();
    console.log('🎙️ WebSpeech Recognition active & listening.');
  } catch (e) {
    console.log('WebSpeech start notice:', e);
  }
}

function stopSpeechRecognition() {
  if (state.speechRecognizer) {
    try {
      state.speechRecognizer.stop();
    } catch (e) {}
    state.speechRecognizer = null;
  }
  if (state.speechDebounceTimer) {
    clearTimeout(state.speechDebounceTimer);
    state.speechDebounceTimer = null;
  }
}

// Enqueue & Play Pipelined Audio Chunks with Guaranteed Ordering
async function enqueueAudioChunk(chunkData) {
  if (!chunkData.audioBase64 || !state.callActive) return;

  try {
    if (!state.audioContext) {
      state.audioContext = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (state.audioContext.state === 'suspended') {
      await state.audioContext.resume();
    }

    const binaryString = window.atob(chunkData.audioBase64);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }

    const audioBuffer = await state.audioContext.decodeAudioData(bytes.buffer.slice(0));

    if (!state.callActive || (chunkData.turnId && chunkData.turnId !== state.currentTurnId)) {
      return;
    }

    const chunkItem = {
      turnId: chunkData.turnId,
      chunkIndex: chunkData.chunkIndex !== undefined ? chunkData.chunkIndex : 0,
      totalChunks: chunkData.totalChunks || 1,
      text: chunkData.text,
      isFinal: chunkData.isFinal,
      audioBuffer
    };

    // Maintain strict sort order by chunkIndex
    let insertIdx = state.audioQueue.length;
    for (let i = 0; i < state.audioQueue.length; i++) {
      if (state.audioQueue[i].turnId === chunkItem.turnId && state.audioQueue[i].chunkIndex > chunkItem.chunkIndex) {
        insertIdx = i;
        break;
      }
    }
    state.audioQueue.splice(insertIdx, 0, chunkItem);

    if (!state.isPlayingAudio) {
      // If chunk 0 is still decoding and totalChunks > 1, wait briefly
      const head = state.audioQueue[0];
      if (head && head.chunkIndex > 0 && chunkItem.totalChunks > 1) {
        setTimeout(() => {
          if (!state.isPlayingAudio && state.audioQueue.length > 0) {
            playNextInAudioQueue();
          }
        }, 40);
      } else {
        playNextInAudioQueue();
      }
    }
  } catch (err) {
    console.warn('Audio chunk decoding error:', err);
  }
}

async function playNextInAudioQueue() {
  if (!state.callActive || state.audioQueue.length === 0) {
    state.isPlayingAudio = false;
    
    if (state.pendingCompletion) {
      setVoiceState('completed', 'Call Completed • Summary Generated');
      endCallSession(false);
      return;
    }

    if (state.callActive) {
      setVoiceState('listening', 'Listening to you...');
    }
    return;
  }

  if (state.audioContext && state.audioContext.state === 'suspended') {
    try {
      await state.audioContext.resume();
    } catch (e) {}
  }

  const chunk = state.audioQueue.shift();

  if (!state.callActive || (chunk.turnId && chunk.turnId !== state.currentTurnId)) {
    playNextInAudioQueue();
    return;
  }

  try {
    const source = state.audioContext.createBufferSource();
    source.buffer = chunk.audioBuffer;
    source.connect(state.audioContext.destination);

    state.currentAudioSource = source;
    state.isPlayingAudio = true;

    setVoiceState('speaking', 'Divyasree Advisor Speaking...');

    source.onended = () => {
      state.currentAudioSource = null;
      playNextInAudioQueue();
    };

    source.start(0);
  } catch (err) {
    console.warn('Playback error on audio chunk:', err);
    state.isPlayingAudio = false;
    playNextInAudioQueue();
  }
}

function stopAudioPlayback() {
  state.audioQueue = [];
  if (state.currentAudioSource) {
    try {
      state.currentAudioSource.stop();
    } catch (e) {}
    state.currentAudioSource = null;
  }
  state.isPlayingAudio = false;
}

// Live Qualification Cards Visualizer
function updateQualificationCards(s) {
  state.latestState = s;

  // 1. Intent
  if (s.intent) {
    dom.cardIntent.className = 'checkpoint-card fit-confirmed';
    dom.statusIntent.className = 'status-chip chip-fit';
    dom.statusIntent.textContent = s.intent === 'self_use' ? 'Weekend Home' : s.intent === 'investment' ? 'Investment' : 'Both';
    dom.valIntent.textContent = s.intent === 'self_use' ? '✦ Self-Use / Family Weekend Retreat' : '✦ Long-term Land Asset Appreciation';
  } else {
    dom.cardIntent.className = 'checkpoint-card';
    dom.statusIntent.className = 'status-chip';
    dom.statusIntent.textContent = 'Pending';
    dom.valIntent.textContent = 'Awaiting prospect intent...';
  }

  // 2. Geography
  if (s.location_fit === 'fit') {
    dom.cardGeography.className = 'checkpoint-card fit-confirmed';
    dom.statusGeography.className = 'status-chip chip-fit';
    dom.statusGeography.textContent = 'Fit';
    dom.valGeography.textContent = '✦ Comfortable with Nandi Hills / North BLR Corridor';
  } else if (s.location_fit === 'not_fit') {
    dom.cardGeography.className = 'checkpoint-card mismatch-detected';
    dom.statusGeography.className = 'status-chip chip-not-fit';
    dom.statusGeography.textContent = 'Mismatch';
    dom.valGeography.textContent = '✖ Location Mismatch (Wants other corridor)';
  } else {
    dom.cardGeography.className = 'checkpoint-card';
    dom.statusGeography.className = 'status-chip';
    dom.statusGeography.textContent = 'Pending';
    dom.valGeography.textContent = 'Awaiting location comfort confirmation...';
  }

  // 3. Budget
  if (s.budget_fit === 'fit') {
    dom.cardBudget.className = 'checkpoint-card fit-confirmed';
    dom.statusBudget.className = 'status-chip chip-fit';
    dom.statusBudget.textContent = 'Fit';
    dom.valBudget.textContent = '✦ Fits starting range ₹92.4 Lakh+';
  } else if (s.budget_fit === 'below_budget') {
    dom.cardBudget.className = 'checkpoint-card mismatch-detected';
    dom.statusBudget.className = 'status-chip chip-not-fit';
    dom.statusBudget.textContent = 'Below Range';
    dom.valBudget.textContent = '✖ Budget below starting price of ₹92.4L';
  } else {
    dom.cardBudget.className = 'checkpoint-card';
    dom.statusBudget.className = 'status-chip';
    dom.statusBudget.textContent = 'Pending';
    dom.valBudget.textContent = 'Awaiting budget fitment...';
  }

  // 4. Timeline
  if (s.timeline_fit === 'fit' || s.timeline_fit === 'flexible') {
    dom.cardTimeline.className = 'checkpoint-card fit-confirmed';
    dom.statusTimeline.className = 'status-chip chip-fit';
    dom.statusTimeline.textContent = 'Fit';
    dom.valTimeline.textContent = '✦ Aligned with December 2029 completion';
  } else if (s.timeline_fit === 'immediate_needed') {
    dom.cardTimeline.className = 'checkpoint-card mismatch-detected';
    dom.statusTimeline.className = 'status-chip chip-not-fit';
    dom.statusTimeline.textContent = 'Immediate Needed';
    dom.valTimeline.textContent = '✖ Requires ready-to-move property';
  } else {
    dom.cardTimeline.className = 'checkpoint-card';
    dom.statusTimeline.className = 'status-chip';
    dom.statusTimeline.textContent = 'Pending';
    dom.valTimeline.textContent = 'Awaiting timeline alignment...';
  }

  // Lead Classification Score
  const classification = s.lead_classification || 'WARM';
  dom.leadClassificationBadge.textContent = classification;
  dom.leadClassificationBadge.className = `score-pill score-${classification.toLowerCase().replace(/_/g, '-')}`;
}

// Add Message to Live Transcript Box
function addTranscriptMessage(role, text) {
  const currentPersonaName = personas[state.selectedPersona]?.name || 'You';
  state.conversationLog.push({ role, text, time: new Date().toLocaleTimeString() });

  const placeholder = dom.transcriptFeed.querySelector('.transcript-placeholder');
  if (placeholder) placeholder.remove();

  const bubble = document.createElement('div');
  bubble.className = `chat-bubble bubble-${role}`;

  const speakerTag = document.createElement('span');
  speakerTag.className = 'bubble-speaker-tag';
  speakerTag.textContent = role === 'agent' ? '✦ Divyasree Advisor (Rohan)' : `✦ ${currentPersonaName}`;

  const messageContent = document.createElement('span');
  messageContent.textContent = text;

  bubble.appendChild(speakerTag);
  bubble.appendChild(messageContent);
  dom.transcriptFeed.appendChild(bubble);

  dom.transcriptFeed.scrollTop = dom.transcriptFeed.scrollHeight;
}

// Send Manual Text Utterance (Type and Press Enter/Send)
function sendUserText() {
  const text = dom.manualTextInput.value.trim();
  if (!text || !state.callActive) return;

  dom.manualTextInput.value = '';
  if (state.ws && state.ws.readyState === WebSocket.OPEN) {
    state.ws.send(JSON.stringify({ type: 'user_text', text }));
  }
}

// Update Persona / Evaluator Meta
function updatePersonaMeta() {
  const p = personas[state.selectedPersona] || personas.custom;
  if (p) {
    if (dom.leadPhone) dom.leadPhone.textContent = p.phone;
    if (dom.leadCity) dom.leadCity.textContent = p.city;
    if (dom.leadGoal) dom.leadGoal.textContent = p.goal;
  }
}

// Open Summary Modal with Deep Audit Breakdown
function showSummaryModal() {
  const s = state.latestState || {};
  const audit = state.latestAudit;
  const personaName = personas[state.selectedPersona]?.name || 'You';
  const personaTitle = personas[state.selectedPersona]?.title || 'Custom Evaluator';

  let interruptionHtml = '';
  if (audit && audit.interruption_audit) {
    const ia = audit.interruption_audit;
    interruptionHtml = `
      <div style="background: ${ia.was_interrupted ? 'rgba(239, 68, 68, 0.08)' : 'rgba(16, 185, 129, 0.08)'}; border: 1px solid ${ia.was_interrupted ? '#EF4444' : '#10B981'}; padding: 10px 14px; border-radius: 8px; margin-bottom: 14px; font-size: 12px;">
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <span style="font-weight: 600; color: ${ia.was_interrupted ? '#F87171' : '#34D399'};">
            ${ia.was_interrupted ? `⚡ Interrupted Turns (${ia.total_interruptions})` : '✓ Fluid Turn Execution (0 Interruptions)'}
          </span>
          <span style="color: #94A3B8;">Communication Fluidity: <strong>${ia.fluidity_score}%</strong></span>
        </div>
        ${ia.was_interrupted ? `<div style="margin-top: 6px; color: #CBD5E1; font-size: 11px;">Agent yielded immediately on user barge-in without audio overlap.</div>` : ''}
      </div>
    `;
  }

  let executiveSummaryHtml = '';
  if (audit && audit.executive_summary) {
    executiveSummaryHtml = `
      <div style="background: rgba(197, 160, 89, 0.08); border: 1px solid var(--gold-border); padding: 12px; border-radius: 8px; margin-bottom: 14px; font-size: 12px; line-height: 1.5; color: #E2E8F0;">
        <strong style="color: var(--gold-light);">Executive Call Summary:</strong><br>
        ${audit.executive_summary}
      </div>
    `;
  }

  dom.modalBody.innerHTML = `
    <div style="display: flex; justify-content: space-between; align-items: center; background: rgba(0,0,0,0.4); border: 1px solid var(--gold-border); padding: 12px 16px; border-radius: 8px; margin-bottom: 14px;">
      <div>
        <h4 style="color: var(--gold-light); margin: 0; font-family: var(--font-serif); font-size: 16px;">Lead Classification: <strong>${audit?.lead_classification || s.lead_classification || 'WARM'}</strong></h4>
        <p style="color: #94A3B8; font-size: 11px; margin: 4px 0 0 0;">Prospect: <strong>${personaName}</strong> (${personaTitle})</p>
      </div>
      <div style="text-align: right;">
        <span class="score-pill score-${(audit?.lead_classification || s.lead_classification || 'warm').toLowerCase().replace(/_/g, '-')}" style="font-size: 12px; padding: 4px 10px;">
          Score: ${audit?.score || (s.lead_classification === 'HOT' ? 85 : 60)}/100
        </span>
      </div>
    </div>

    ${interruptionHtml}
    ${executiveSummaryHtml}

    <table style="width: 100%; border-collapse: collapse; font-size: 12px; margin-bottom: 16px;">
      <tr style="border-bottom: 1px solid rgba(255,255,255,0.06);">
        <td style="padding: 7px 0; color: #94A3B8;">1. Intent</td>
        <td style="padding: 7px 0; font-weight: 600; color: var(--gold-light); text-align: right;">
          ${s.intent === 'investment' ? 'Investment (Capital Growth)' : s.intent === 'self_use' ? 'Self-Use (Weekend Home)' : s.intent || 'Unspecified'}
        </td>
      </tr>
      <tr style="border-bottom: 1px solid rgba(255,255,255,0.06);">
        <td style="padding: 7px 0; color: #94A3B8;">2. Geography (Nandi Hills / Corridor)</td>
        <td style="padding: 7px 0; font-weight: 600; color: ${s.location_fit === 'fit' ? '#10B981' : '#F87171'}; text-align: right;">
          ${s.location_fit === 'fit' ? 'Fit (Confirmed)' : s.location_fit === 'not_fit' ? 'Mismatch' : 'Pending / Neutral'}
        </td>
      </tr>
      <tr style="border-bottom: 1px solid rgba(255,255,255,0.06);">
        <td style="padding: 7px 0; color: #94A3B8;">3. Source Budget (₹92.4L+)</td>
        <td style="padding: 7px 0; font-weight: 600; color: ${s.budget_fit === 'fit' ? '#10B981' : s.budget_fit === 'below_budget' ? '#F59E0B' : 'var(--gold-light)'}; text-align: right;">
          ${s.budget_fit === 'below_budget' ? 'Targeting ~₹80L (Payment Scheme Open)' : s.budget_fit === 'fit' ? 'Fit (₹92.4L+)' : 'Pending'}
        </td>
      </tr>
      <tr style="border-bottom: 1px solid rgba(255,255,255,0.06);">
        <td style="padding: 7px 0; color: #94A3B8;">4. Timeline (Dec 2029 Delivery)</td>
        <td style="padding: 7px 0; font-weight: 600; color: var(--gold-light); text-align: right;">
          ${s.timeline_fit === 'fit' ? 'Fit (Dec 2029)' : 'Unasked / Flexible'}
        </td>
      </tr>
      <tr style="border-bottom: 1px solid rgba(255,255,255,0.06);">
        <td style="padding: 7px 0; color: #94A3B8;">Property Expert Handoff</td>
        <td style="padding: 7px 0; font-weight: 600; color: #10B981; text-align: right;">
          ${s.handoff_requested ? '✓ Requested by Lead' : 'Pending'}
        </td>
      </tr>
      ${s.objections && s.objections.length > 0 ? `
      <tr>
        <td style="padding: 7px 0; color: #F87171;">Objections Logged</td>
        <td style="padding: 7px 0; font-weight: 600; color: #F87171; text-align: right;">
          ${s.objections.join(', ')}
        </td>
      </tr>` : ''}
    </table>

    <div style="background: rgba(0,0,0,0.3); padding: 12px; border-radius: 6px; font-size: 11px; max-height: 140px; overflow-y: auto;">
      <strong style="color: var(--gold-primary);">Full Conversation Log (${state.conversationLog.length} turns):</strong><br>
      ${state.conversationLog.map(m => `<strong>[${m.role.toUpperCase()}]:</strong> ${m.text}`).join('<br>')}
    </div>
  `;
  dom.summaryModal.style.display = 'flex';
}

// Push-to-Talk Handling
function startPushToTalk() {
  if (!state.callActive) return;
  state.isPushToTalking = true;
  state.recordedSamples = [];
  dom.btnPushToTalk.classList.add('recording');
  dom.micStatusLabel.textContent = 'Recording Voice (Speak Now)...';
  dom.micIcon.style.color = '#EF4444';
  if (state.isPlayingAudio) triggerBargeIn();
}

function stopPushToTalk() {
  if (!state.isPushToTalking) return;
  state.isPushToTalking = false;
  dom.btnPushToTalk.classList.remove('recording');
  dom.micStatusLabel.textContent = state.autoVADEnabled ? 'Auto VAD: Active (Listening)' : 'Push to Talk: Ready';
  dom.micIcon.style.color = state.autoVADEnabled ? '#10B981' : 'inherit';
  flushRecordedAudioToSTT();
}

// Toggle Auto VAD Mode
function toggleAutoVAD() {
  state.autoVADEnabled = !state.autoVADEnabled;
  if (state.autoVADEnabled) {
    dom.btnToggleAutoMic.textContent = 'Auto VAD: ON';
    dom.btnToggleAutoMic.classList.add('active-vad');
    dom.micStatusLabel.textContent = 'Auto VAD: Active (Listening)';
    if (state.callActive) startSpeechRecognition();
  } else {
    dom.btnToggleAutoMic.textContent = 'Auto VAD: OFF (PTT Only)';
    dom.btnToggleAutoMic.classList.remove('active-vad');
    dom.micStatusLabel.textContent = 'Push to Talk: Hold Space / Tap';
    stopSpeechRecognition();
  }
}

// Event Listeners
dom.btnStartCall.addEventListener('click', startCallSession);
if (dom.btnBargeIn) dom.btnBargeIn.addEventListener('click', triggerBargeIn);
dom.btnEndCall.addEventListener('click', () => endCallSession(true));
dom.btnSendText.addEventListener('click', sendUserText);
dom.btnToggleAutoMic.addEventListener('click', toggleAutoVAD);

// Push-to-Talk Mouse & Touch
dom.btnPushToTalk.addEventListener('mousedown', startPushToTalk);
dom.btnPushToTalk.addEventListener('mouseup', stopPushToTalk);
dom.btnPushToTalk.addEventListener('mouseleave', stopPushToTalk);
dom.btnPushToTalk.addEventListener('touchstart', (e) => { e.preventDefault(); startPushToTalk(); });
dom.btnPushToTalk.addEventListener('touchend', (e) => { e.preventDefault(); stopPushToTalk(); });

// Spacebar Keydown for Push-to-Talk
window.addEventListener('keydown', (e) => {
  if (e.code === 'Space' && state.callActive && document.activeElement !== dom.manualTextInput && !state.isPushToTalking) {
    e.preventDefault();
    startPushToTalk();
  }
});

window.addEventListener('keyup', (e) => {
  if (e.code === 'Space' && state.isPushToTalking) {
    e.preventDefault();
    stopPushToTalk();
  }
});

dom.manualTextInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') sendUserText();
});

if (dom.personaSelect) {
  dom.personaSelect.addEventListener('change', (e) => {
    state.selectedPersona = e.target.value;
    updatePersonaMeta();
  });
}

dom.btnClearLog.addEventListener('click', () => {
  state.conversationLog = [];
  dom.transcriptFeed.innerHTML = `
    <div class="transcript-placeholder">
      <div class="placeholder-icon">💬</div>
      <div class="placeholder-text">Log cleared. Ready for next call session.</div>
    </div>
  `;
});

dom.btnExportSummary.addEventListener('click', showSummaryModal);
dom.btnCloseModal.addEventListener('click', () => { dom.summaryModal.style.display = 'none'; });
dom.btnCloseModalBtn.addEventListener('click', () => { dom.summaryModal.style.display = 'none'; });

dom.btnCopyJson.addEventListener('click', () => {
  const persona = personas[state.selectedPersona] || personas.custom;
  const json = JSON.stringify({
    persona: persona,
    qualificationState: state.latestState,
    conversationLog: state.conversationLog
  }, null, 2);
  navigator.clipboard.writeText(json);
  alert('Full JSON copied to clipboard!');
});

// Init on Load
window.addEventListener('DOMContentLoaded', () => {
  initWebSocket();
  updatePersonaMeta();
  dom.btnToggleAutoMic.classList.add('active-vad');
});
