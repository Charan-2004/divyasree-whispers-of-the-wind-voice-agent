# Divyasree "Whispers of the Wind" — AI Voice Qualification Consultant

> **Production-grade outbound AI voice qualification agent engineered for Divyasree Developers' signature ultra-luxury private valley plotted development near Nandi Hills, Bengaluru.**

---

## 🌟 Executive Summary

This project delivers an autonomous, high-touch AI Voice Consultant designed specifically for **High-Net-Worth Individuals (HNIs), Corporate CXOs, and NRIs**. It qualifies prospective luxury real estate leads through an articulate, natural 2–3 minute voice conversation.

Built with **Gemini Flash reasoning**, **Sarvam Saaras v3 real-time speech-to-text**, **Sarvam Bulbul v3 expressive speech synthesis with Pipelined Sentence Streaming**, and **client-side barge-in (<50ms)**, the agent operates under an explicit, deterministic state machine with strict zero-cost developer protections.

---

## 🏛️ Project & Architectural Highlights

* **Primary Source of Truth**: Evaluated against the official assignment specification for **Divyasree Whispers of the Wind (WOW)**.
* **4-Point Qualification Checkpoints**:
  1. **Intent**: Self-use (weekend retreat) vs. Long-term Investment vs. Both.
  2. **Geography**: Comfort with Nandi Hills / Devanahalli / North Bengaluru airport corridor.
  3. **Source Budget**: Fitment check for starting price of **₹92.4 Lakh+** (up to ₹2.46 Cr).
  4. **Timeline**: Comfort with phased delivery completing by **December 2029**.
* **Pipelined Sentence Streaming TTS**: Time to First Response (TTFR) optimized to **~1.1s – 1.4s** (71% latency reduction).
* **Aspirational Pitch**: Tailored lifestyle narrative (38-acre private valley, 74% open greenery, 20,000 sq.ft. signature clubhouse, scenic hill views).
* **CTA / Handoff**: Dedicated invitation for a private site visit or consultation with a Senior Property Expert.
* **No Re-Asking Known Info**: Multi-dimensional extraction instantly captures combined lead utterances and advances past known checkpoints.
* **Natural Interruption / Barge-in**: Sub-50ms instant client-side audio cutoff when user begins speaking.
* **Zero-Cost Architecture**: Operates 100% within free-tier quotas and developer credits at **₹0 spend** (zero paid telephony).
* **Multilingual Capabilities**: Seamless support for Indian English, Hindi, and code-mixed Hinglish.

---

## 🚀 Quick Start Guide

### 1. Installation
Ensure Node.js (v18+) is installed on your machine:

```bash
npm install
```

### 2. Environment Configuration
The `.env` file is pre-configured with active keys. You can customize keys in `.env`:

```env
PORT=3000
GEMINI_API_KEY=your_gemini_key_here
GEMINI_MODEL=gemini-2.5-flash
SARVAM_API_KEY=your_sarvam_key_here
SARVAM_STT_MODEL=saaras:v3
SARVAM_TTS_MODEL=bulbul:v3
SARVAM_DEFAULT_SPEAKER=shubh
```

### 3. Start the Voice Consultant
Launch the local server:

```bash
npm start
```

Open your browser and navigate to: **`http://localhost:3000`**

---

## 🧪 Automated Testing & Simulation Suites

Run the complete test suite verifying the state machine, phonetic normalizations, cost guards, and multi-turn conversation flows:

```bash
# Run all Vitest unit and integration test suites (18 tests)
npm test

# Run the automated 6-flow end-to-end conversation simulation harness
npm run test:flows

# Run the empirical TTFR and latency benchmark suite
npm run benchmark
```

---

## 📁 Comprehensive Deliverables Index

| Document | Description |
| :--- | :--- |
| [FINAL_PERFORMANCE_RESULTS.md](file:///c:/Users/kryog/Documents/antigravity/agitated-volta/FINAL_PERFORMANCE_RESULTS.md) | **Empirical Performance Report**: Turn-by-turn TTFR measurements before vs. after pipelined streaming optimization (~1.2s TTFR). |
| [LIVEKIT_DECISION.md](file:///c:/Users/kryog/Documents/antigravity/agitated-volta/LIVEKIT_DECISION.md) | **15-Category Architectural Decision Matrix**: Detailed evaluation comparing V1 vs. LiveKit WebRTC and answering key evaluation questions. |
| [LIVEKIT_RESEARCH.md](file:///c:/Users/kryog/Documents/antigravity/agitated-volta/LIVEKIT_RESEARCH.md) | Comprehensive research on LiveKit WebRTC SFU, Python `livekit-plugins-sarvam`, Gemini, and free-tier quotas. |
| [V1_ARCHITECTURE_AUDIT.md](file:///c:/Users/kryog/Documents/antigravity/agitated-volta/V1_ARCHITECTURE_AUDIT.md) | Complete architectural trace of the V1 pipeline, state machine, and audio components. |
| [FINAL_REQUIREMENTS_AUDIT.md](file:///c:/Users/kryog/Documents/antigravity/agitated-volta/FINAL_REQUIREMENTS_AUDIT.md) | Line-by-line audit matrix validating 100% compliance across all assignment requirements. |
| [PROJECT_FACTS.md](file:///c:/Users/kryog/Documents/antigravity/agitated-volta/PROJECT_FACTS.md) | Assignment facts vs. verified online research (RERA, 38 acres, 207 units, airport distance) and reconciliation rules. |
| [SYSTEM_PROMPT.md](file:///c:/Users/kryog/Documents/antigravity/agitated-volta/SYSTEM_PROMPT.md) | Full production system prompt with persona, 4 checkpoints, affirmations, and JSON schema. |
| [PRONUNCIATION_DICTIONARY.md](file:///c:/Users/kryog/Documents/antigravity/agitated-volta/PRONUNCIATION_DICTIONARY.md) | Complete phonetic normalization rules for Indian real-estate terms (`Div-yaa-shree`, `Nun-dhee`, etc.). |
| [CONVERSATION_DESIGN.md](file:///c:/Users/kryog/Documents/antigravity/agitated-volta/CONVERSATION_DESIGN.md) | Dialogue trees, state flowchart, early extraction logic, silence timers, and objection handling. |
| [DEMO_SCRIPT.md](file:///c:/Users/kryog/Documents/antigravity/agitated-volta/DEMO_SCRIPT.md) | Evaluator guide for running the demo, testing scenarios, live microphone, and report exports. |

---

## 🎯 Evaluator Test Flows (One-Click Testing)

In the web interface (`http://localhost:3000`), the **Instant Test Harness** provides one-click access to all 6 conversational flows:

1. **Flow 1: Hot Self-Use Lead (Arjun Mehta - Tech CXO)** $\rightarrow$ Classifies as **`HOT`**.
2. **Flow 2: Investment Lead (Priya Sharma - NRI Director)** $\rightarrow$ Classifies as **`HOT/WARM`** (handles ROI questions without false guarantees).
3. **Flow 3: Budget Mismatch Lead (Vikram Malhotra - Startup Founder)** $\rightarrow$ Classifies as **`COLD`** (handles ₹50L budget with dignity).
4. **Flow 4: Location Mismatch Lead (Ananya Rao - Design Director)** $\rightarrow$ Classifies as **`COLD`** (respects Whitefield preference without pushing).
5. **Flow 5: Irritated / Do-Not-Contact Lead (Rajesh Verma - Senior VP)** $\rightarrow$ Classifies as **`DO_NOT_CONTACT`** (halts call immediately).
6. **Flow 6: Hindi / Hinglish Lead (Sunita Agarwal - Business Owner)** $\rightarrow$ Classifies as **`HOT`** (seamless Hindi dialogue).

---

## 🛡️ Security & Zero-Cost Guardrails

* **Server-Side Key Isolation**: All Gemini and Sarvam API keys are stored strictly on the server in `.env`.
* **Cost Guard Session Watchdogs**:
  * Max Call Duration: `180 seconds`
  * Max Conversational Turns: `20 turns`
  * Max TTS Characters per Call: `3,500 characters`
  * Silence Timer 1: `6 seconds` (*"Are you still with me?"*)
  * Silence Timer 2: `7 seconds` (Polite callback offer & wrap up)

---

## ⚖️ License
MIT License. Developed for Divyasree Developers Whispers of the Wind AI Lead Qualification evaluation.
