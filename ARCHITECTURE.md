# ARCHITECTURE SPECIFICATION: Divyasree "Whispers of the Wind" AI Voice Agent

This document details the complete end-to-end architecture, audio streaming protocols, state machine mechanics, barge-in handling, latency optimizations, and security guarantees.

---

## 1. System Architecture Diagram

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                                   BROWSER CLIENT                                       │
│                                                                                        │
│   ┌──────────────────────────────┐                 ┌──────────────────────────────┐    │
│   │   Microphone & Web Audio     │                 │    Audio Player & Queue      │    │
│   │   - 16kHz PCM mono capture   │                 │    - Web Audio API (PCM/WAV) │    │
│   │   - Real-time VAD detector   │                 │    - Instant cutoff on barge │    │
│   └──────────────┬───────────────┘                 └──────────────▲───────────────┘    │
│                  │                                                │                    │
│                  │ Audio Chunks (Binary/JSON)                     │ Audio Stream (PCM) │
│                  ▼                                                │                    │
│   ┌───────────────────────────────────────────────────────────────┴───────────────┐    │
│   │                         Client WebSocket Controller                           │    │
│   │   - Manages connection lifecycle (`/ws/call`)                                 │    │
│   │   - Emits `audio_chunk`, `barge_in`, `mute`, `hangup`                         │    │
│   │   - Renders live transcript, voice visualizer & qualification state card       │    │
│   └──────────────────────────────────────┬────────────────────────────────────────┘    │
└──────────────────────────────────────────┼─────────────────────────────────────────────┘
                                           │
                                WebSocket Connection (`ws://localhost:3000/ws/call`)
                                           │
┌──────────────────────────────────────────▼─────────────────────────────────────────────┐
│                                BACKEND NODE.JS SERVER                                  │
│                                                                                        │
│  ┌──────────────────────────────────────────────────────────────────────────────────┐  │
│  │                            Session & Cost Guard Manager                          │  │
│  │  - Enforces `MAX_CALL_DURATION_SECONDS` (180s) & `MAX_TURNS` (20)                │  │
│  │  - Manages call state, silence timers, and cancellation tokens                   │  │
│  └────────┬───────────────────────────────────┬──────────────────────────────────▲──┘  │
│           │                                   │                                  │     │
│           │ Forward PCM                       │ Update Transcript                │ TTS │
│           ▼                                   ▼                                  │     │
│  ┌─────────────────┐                 ┌─────────────────┐                ┌────────┴──┐  │
│  │ Sarvam Saaras   │                 │ Qualification   │                │ Sarvam    │  │
│  │ v3 STT Client   │                 │ State Machine   │                │ Bulbul v3 │  │
│  │ - Real-time WS  │ ──Transcript──► │ - Fast Gemini   │ ──Reply Text─► │ TTS Engine│  │
│  │ - en-IN, hi-IN, │                 │   2.5 Flash     │   + Phonetics  │ - Speaker:│  │
│  │   codemix       │                 │ - Schema JSON   │                │  'shubh'  │  │
│  │ - REST fallback │                 │ - Classify Lead │                │ - REST/WS │  │
│  └─────────────────┘                 └─────────────────┘                └───────────┘  │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Audio Pipeline & Latency Optimization

To deliver conversational realism with sub-second turn-around time:
1. **Audio Capture**: Browser captures microphone input at 16,000 Hz, 16-bit PCM mono.
2. **Streaming Speech-to-Text**:
   - Sent via WebSocket directly to Sarvam `saaras:v3-realtime` or processed in streaming chunks.
   - Fallback to rapid REST endpoint `/speech-to-text` ensures 100% resilience across all networks.
3. **Conversational Reasoning (Gemini Flash)**:
   - System prompt is optimized for low-latency structured output (`responseMimeType: application/json`).
   - Limits response generation to 1–2 conversational sentences (40–70 tokens), reducing Time-to-First-Token (TTFT) to ~300-500ms.
4. **Phonetic Preprocessing**:
   - Spoken text is instantly normalized (e.g. `Divyasree` $\rightarrow$ `Div-yaa-shree`, `₹92.4 lakh` $\rightarrow$ `92.4 lakh`) before synthesis.
5. **Speech Synthesis (Sarvam Bulbul v3)**:
   - Uses `bulbul:v3` model with speaker `shubh` or `priya` and target language `en-IN` / `hi-IN`.
   - Audio is streamed to the browser and queued for immediate playback via Web Audio API.

---

## 3. Client-Side Barge-in / Interruption Architecture

Handling interruptions naturally is critical for an executive-grade voice agent:
1. **Speech Detection during Playback**: When the browser microphone detects user speech (energy threshold above noise floor) while agent audio is playing:
2. **Immediate Local Cutoff**:
   - The Web Audio `AudioBufferSourceNode` is stopped immediately.
   - Any unplayed audio chunks in the playback queue are flushed.
   - The UI visualizer switches instantly to `Interrupted` $\rightarrow$ `Listening`.
3. **Backend Cancellation Signal**:
   - Browser emits `{ "type": "barge_in", "timestamp": Date.now() }`.
   - Backend aborts any pending LLM generation or TTS requests for that turn.
   - New user audio is piped directly to STT without desynchronization.

---

## 4. Deterministic State Machine & Schema

The qualification state is maintained in an explicit application-level state machine:

```typescript
export interface QualificationState {
  permission: "granted" | "denied" | "callback_requested" | null;
  intent: "self_use" | "investment" | "both" | "unclear" | null;
  location_fit: "fit" | "not_fit" | "neutral" | null;
  budget_fit: "fit" | "below_budget" | "flexible" | null;
  timeline_fit: "fit" | "immediate_needed" | "flexible" | null;
  language: "en-IN" | "hi-IN" | "hinglish";
  lead_temperature: "hot" | "warm" | "cold" | "callback" | "do_not_contact";
  lead_classification: "HOT" | "WARM" | "COLD" | "CALLBACK" | "DO_NOT_CONTACT";
  objections: string[];
  handoff_requested: boolean;
  conversation_complete: boolean;
}
```

### Classification Algorithm:
* **`HOT`**: `permission == "granted"` AND `intent in ["self_use", "investment", "both"]` AND `location_fit == "fit"` AND `budget_fit == "fit"` AND `timeline_fit == "fit"`.
* **`WARM`**: Positive intent and budget fit, but with minor hesitation on timeline or location (or callback requested with high interest).
* **`COLD`**: Clear mismatch on location (`location_fit == "not_fit"`) OR budget significantly below starting price (`budget_fit == "below_budget"`).
* **`CALLBACK`**: Lead was busy or in a meeting and requested a future call.
* **`DO_NOT_CONTACT`**: Lead explicitly stated "stop calling", "not interested", or requested removal.

---

## 5. Security & Zero-Cost Guardrails

1. **Zero Client Secret Exposure**:
   - `SARVAM_API_KEY` and `GEMINI_API_KEY` are stored strictly on the server in `.env`.
   - Client communicates only through the backend WebSocket `/ws/call`.
2. **Cost Guard Limits**:
   - `MAX_CALL_DURATION_SECONDS = 180` (3 minutes max per session).
   - `MAX_TURNS = 20` (prevents infinite conversational loops).
   - `MAX_TTS_CHARS_PER_CALL = 3000` (caps synthetic speech consumption).
   - Automatic termination when limits are reached.
