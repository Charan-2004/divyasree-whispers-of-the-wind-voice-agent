# LIVEKIT ARCHITECTURE & ECOSYSTEM RESEARCH

**Project**: Divyasree Developers — Whispers of the Wind (WOW) AI Voice Agent  
**Role**: Senior Voice-AI Architect & Code Reviewer  
**Date**: August 2026  
**Focus**: LiveKit Server, LiveKit Agents Framework, Sarvam & Google Plugins, Free-Tier Quotas, and Architectural Trade-offs  

---

## 1. Executive Summary of LiveKit Voice Architecture

LiveKit is an open-source real-time communication platform built on **WebRTC (Selective Forwarding Unit / SFU)** that recently introduced the **LiveKit Agents** framework for building server-side AI voice assistants.

In LiveKit's model:
1. The browser connects via WebRTC to a LiveKit Room.
2. A server-side Worker process (`livekit-agents`) joins the room as an active participant.
3. Audio is transported via standard WebRTC Opus streams (20ms frames, ultra-low transport jitter).
4. The Agent pipeline coordinates VAD (Silero), STT (streaming Saaras v3), LLM (Gemini / streaming chat completion), and TTS (streaming Bulbul v3), with built-in turn-detection and audio frame synchronization.

---

## 2. Official Sarvam & Google Integrations

### 2.1 Sarvam Plugin (`livekit-plugins-sarvam`)
* **Package**: `livekit-plugins-sarvam` (Python: `pip install livekit-plugins-sarvam livekit-plugins-silero livekit-agents`)
* **STT Support**:
  * `sarvam.STT(model="saaras:v3")` for batch audio transcription.
  * `sarvam.STTStreaming(model="saaras:v3-realtime")` for true real-time streaming partial transcripts.
* **TTS Support**:
  * `sarvam.TTS(model="bulbul:v3", speaker="shubh")` for Indian English and 10 Indian languages.
  * Supports pace control and phonetics.
* **LLM Support**:
  * `sarvam.LLM(model="sarvam-105b")` for Indian regional language reasoning.

### 2.2 Google Gemini Plugin (`livekit-plugins-google`)
* **Package**: `livekit-plugins-google`
* **LLM Support**:
  * `google.LLM(model="gemini-2.5-flash")` or `google.LLM(model="gemini-2.0-flash")`.
  * Supports streaming response generation and custom system instructions.

---

## 3. LiveKit Cloud Free-Tier Allowances & Hard Caps

LiveKit Cloud offers a **Build Plan (Free Tier)** with zero credit card required:

| Resource Metric | Free Monthly Allowance (Build Plan) | Hard Cap Behavior | Estimated Demo Call Usage (3 min) |
| :--- | :--- | :--- | :--- |
| **Agent Session Minutes** | **1,000 minutes / month** | Service stops until month reset | ~3 minutes per call (allows ~330 calls/month) |
| **Connection / WebRTC Minutes** | **5,000 minutes / month** | Hard cap | ~6 participant minutes per call |
| **Egress Bandwidth** | **50 GB / month** | Hard cap | ~5 MB audio per call |
| **Concurrent Participants** | **Up to 100** | Throttles over 100 | 2 participants (User + AI Agent) |
| **Cost** | **$0.00 / ₹0.00** | Strict hard cap, zero overage charges | **₹0.00** |

*Self-Hosting Alternative*: Can run locally via `livekit-server --dev` with zero external cloud dependencies.

---

## 4. LiveKit Inference vs. Direct Providers Policy

> [!IMPORTANT]
> **Strict Policy: DO NOT USE LIVEKIT INFERENCE.**
> LiveKit provides a managed billing layer called "LiveKit Inference" that proxies STT/LLM/TTS calls for a marked-up fee. 
> Since we already have direct, free developer credentials for **Sarvam AI** (`SARVAM_API_KEY`) and **Google AI Studio** (`GEMINI_API_KEY`), LiveKit is evaluated solely as a **WebRTC transport and agent orchestration layer**.

---

## 5. Architectural Comparison: Option A (V1) vs. Option B (LiveKit)

```
================================================================================
OPTION A: CURRENT VERSION 1 (Node.js WebSocket + Web Audio VAD + Direct REST/WS)
================================================================================
Browser (Web Audio 16kHz)
   ↓ (Custom WebSocket JSON events)
Node.js Session Manager
   ├── Sarvam Saaras v3 (STT)
   ├── Deterministic Qualification State Machine (TypeScript)
   ├── Gemini 2.5 Flash (Structured JSON Schema)
   └── Sarvam Bulbul v3 (TTS with Phonetics)
   ↓ (Base64 WAV Chunks over WebSocket)
Browser Web Audio Player (Client-side RMS Barge-In)

================================================================================
OPTION B: LIVEKIT WEBRTC AGENT PIPELINE
================================================================================
Browser (LiveKit WebRTC Client SDK)
   ↓ (WebRTC Opus Stream via SFU)
LiveKit Server / Cloud (WebRTC Room)
   ↓ (Audio Tracks)
LiveKit Agent Worker (Python livekit-agents)
   ├── Silero VAD (Server-side turn detection)
   ├── Sarvam Saaras v3 Streaming STT (livekit-plugins-sarvam)
   ├── Deterministic Qualification State Machine
   ├── Gemini 2.5 Flash (livekit-plugins-google)
   └── Sarvam Bulbul v3 TTS (livekit-plugins-sarvam)
   ↓ (WebRTC Opus Audio Track)
Browser (LiveKit Audio Element with Native Barge-in)
```

---

## 6. Official Documentation & Source References

1. **LiveKit Agents Core**: [https://docs.livekit.io/agents/](https://docs.livekit.io/agents/)
2. **LiveKit Sarvam Plugin**: [https://docs.livekit.io/agents/plugins/sarvam/](https://docs.livekit.io/agents/plugins/sarvam/)
3. **Sarvam AI LiveKit Integration Guide**: [https://docs.sarvam.ai/guides/livekit/](https://docs.sarvam.ai/guides/livekit/)
4. **LiveKit Cloud Pricing & Allowances**: [https://livekit.io/pricing](https://livekit.io/pricing)
5. **LiveKit Python Agent Repository**: [https://github.com/livekit/agents](https://github.com/livekit/agents)
