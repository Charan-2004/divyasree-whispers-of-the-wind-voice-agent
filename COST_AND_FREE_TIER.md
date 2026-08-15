# COST AND FREE-TIER ARCHITECTURE SPECIFICATION

This document details how the **Divyasree Whispers of the Wind** AI Voice Agent is designed to operate completely within free-tier quotas and free developer credits at **₹0 total cost**, while providing enterprise-grade cost protection guardrails.

---

## 1. Zero-Cost Technology Stack Overview

| Component | Selected Technology | Free-Tier Quota & Limits | Cost per Demo Call (2-3 min) | Total Cost |
| :--- | :--- | :--- | :--- | :--- |
| **Reasoning Engine** | **Gemini 2.5 Flash** (Google AI Studio) | 15 Requests/Min (RPM)<br>1,000,000 Tokens/Min (TPM)<br>1,500 Requests/Day (RPD) | ~8–12 turns (~3,000 input tokens, ~600 output tokens) | **₹0.00** |
| **Speech-to-Text (STT)** | **Sarvam Saaras v3** (`saaras:v3`) | Free onboarding developer credits (₹1,000 credit on signup) | ~120–180 seconds audio processing | **₹0.00** |
| **Text-to-Speech (TTS)** | **Sarvam Bulbul v3** (`bulbul:v3`) | Free onboarding developer credits (₹1,000 credit on signup) | ~1,200–2,000 synthesized characters | **₹0.00** |
| **Audio Transport** | Native Web Audio & Server WebSocket | Zero external telephony cost | 0 PSTN minutes (runs via browser mic) | **₹0.00** |
| **Backend & Hosting** | Local Node.js / Free Serverless | Local / Free tiers (e.g. Render, Railway, Vercel) | Unlimited local runs | **₹0.00** |

---

## 2. Why Expensive Paid Telephony Was Avoided

Paid voice platforms (e.g., Twilio SIP trunking, Vapi paid tiers, Retell AI, ElevenLabs paid subscriptions) incur significant per-minute phone charges ($0.05 – $0.25 / minute). 

To satisfy the assignment's **strict zero-cost constraint**:
* The application runs as a **Simulated Outbound Phone Call** in the browser.
* The evaluator clicks "Call Lead" $\rightarrow$ the system plays an authentic ringtone $\rightarrow$ establishes a Web Audio stream to the backend agent $\rightarrow$ communicates in real-time.
* This delivers the exact same conversational voice experience without requiring real PSTN numbers, credit cards, or paid telecom infrastructure.

---

## 3. Developer Cost Guard Implementation

To prevent runaway loops, infinite retries, or accidental quota exhaustion, the backend implements hard session guardrails:

```typescript
export const COST_GUARD_CONFIG = {
  MAX_CALL_DURATION_SECONDS: 180,  // Max 3 minutes per call session
  MAX_TURNS_PER_CALL: 20,          // Max 20 conversational turns
  MAX_TTS_CHARACTERS_PER_CALL: 3500,// Max characters synthesized per call
  MAX_STT_SECONDS_PER_CALL: 180,   // Max audio duration processed
  SILENCE_TIMEOUT_1_SECONDS: 6,    // "Are you still with me?"
  SILENCE_TIMEOUT_2_SECONDS: 7,    // Offer callback & politely end
};
```

If any limit is reached during a call session:
1. The backend safely completes or winds down the active dialogue.
2. The UI notifies the user gracefully that the demo session duration limit has been reached.
3. No background or orphaned API calls continue running.
