# TEST PLAN & QA VERIFICATION PROTOCOL

This document details the comprehensive testing strategy, automated test suites, manual voice QA procedures, latency benchmarks, and resilience testing for the **Divyasree Whispers of the Wind** AI Lead Qualification Voice Agent.

---

## 1. Automated Test Suites Overview

The test framework runs using **Vitest** and **TSX** with zero external dependencies:

```bash
# Run all unit and integration test suites
npm test

# Run the automated 6-flow end-to-end conversation simulation harness
npm run test:flows
```

### Test Suite Breakdown:

| Test File | Scope | Key Assertions | Status |
| :--- | :--- | :--- | :--- |
| `tests/stateMachine.test.ts` | State machine & extraction logic | • Initial state defaults<br>• Multi-dimensional extraction<br>• Duplicate question prevention<br>• Budget fitment (`₹92.4L+` vs below)<br>• Location fitment (Nandi Hills vs out-of-corridor)<br>• Hostile / Irritated user (`DO_NOT_CONTACT`)<br>• Meeting / Busy user (`CALLBACK`)<br>• Final classification evaluation | **100% PASS** (8/8) |
| `tests/costGuard.test.ts` | Developer cost protections & phonetics | • Duration limit (`<=180s`)<br>• Max turns limit (`<=20`)<br>• Max TTS characters limit<br>• Brand phonetics (`Divyasree` $\rightarrow$ `Div-yaa-shree`)<br>• Real estate notations (`₹92.4 lakh`, `2.46 crore`, `square feet`)<br>• Geographic phonetics (`Nun-dhee`, `Devana-halli`) | **100% PASS** (4/4) |
| `tests/conversationFlows.test.ts` | End-to-end multi-turn flows | • Flow 1: Hot Self-Use Lead (`HOT`)<br>• Flow 2: Investment Lead without ROI claims (`HOT/WARM`)<br>• Flow 3: Budget Mismatch Lead (`COLD`)<br>• Flow 4: Location Mismatch Lead (`COLD`)<br>• Flow 5: Hostile / DNC Lead (`DO_NOT_CONTACT`)<br>• Flow 6: Hindi/Hinglish Lead (`HOT/WARM`) | **100% PASS** (6/6) |

---

## 2. The 6 Mandatory Conversation Flows

### Flow 1: Hot Self-Use Lead (Arjun Mehta - Tech CXO)
* **Goal**: Qualify a high-intent buyer seeking a family weekend retreat.
* **Lead Utterances**:
  1. *"Yes, sure. I have a minute."*
  2. *"I am looking for a peaceful weekend retreat for my family in Nandi Hills away from city noise."*
  3. *"Our budget is around 1.5 Crore, so starting at 92.4 lakh fits very well."*
  4. *"December 2029 is a good timeline for us. Please schedule a private site visit this weekend."*
* **Expected Outcome**: Lead classified as **`HOT`**, handoff scheduled.

### Flow 2: Investment Lead (Priya Sharma - NRI Director)
* **Goal**: Qualify an investor while ensuring the agent does **NOT** promise guaranteed ROI or rental yields.
* **Lead Utterances**:
  1. *"Yes, please go ahead."*
  2. *"I am an NRI looking for long-term plotted land investments in the North Bangalore corridor."*
  3. *"Around 1.5 to 2 Crore is comfortable. What kind of returns are typically expected?"*
  4. *"Understood on market dynamics. 2029 possession works. Please connect me with the Property Expert."*
* **Expected Outcome**: Lead classified as **`HOT/WARM`**, agent safely explains market factors without financial guarantees.

### Flow 3: Budget Mismatch Lead (Vikram Malhotra - Startup Founder)
* **Goal**: Tactfully qualify a lead whose budget is ₹50 Lakhs (below the starting price of ₹92.4 Lakhs).
* **Lead Utterances**:
  1. *"Yes, tell me briefly."*
  2. *"I love Nandi Hills for a small weekend getaway, but my strict budget is only 45 to 50 lakhs."*
  3. *"Understood. Please keep me on the list if smaller plots open up in the future."*
* **Expected Outcome**: Lead classified as **`COLD`**, handled politely without condescension.

### Flow 4: Location Mismatch Lead (Ananya Rao - Design Director)
* **Goal**: Qualify a lead with a healthy budget (₹1.5 Cr) who rejects Nandi Hills in favor of Whitefield/Sarjapur.
* **Lead Utterances**:
  1. *"Yes, I have a minute."*
  2. *"I have a budget of 1.5 Cr, but Nandi Hills is far too distant. I am strictly looking for plots in Whitefield or Sarjapur."*
  3. *"No thank you, I only want East Bangalore."*
* **Expected Outcome**: Lead classified as **`COLD`**, agent respects location preference without arguing.

### Flow 5: Irritated / Do-Not-Contact Lead (Rajesh Verma - Senior VP)
* **Goal**: Immediate de-escalation and termination when a lead expresses frustration.
* **Lead Utterances**:
  1. *"Please stop calling me! Remove my number from your database immediately."*
* **Expected Outcome**: Immediate apology, zero sales pitch, call terminates, classified as **`DO_NOT_CONTACT`**.

### Flow 6: Hindi / Hinglish Lead (Sunita Agarwal - Business Owner)
* **Goal**: Seamless multilingual support in Hindi & Hinglish.
* **Lead Utterances**:
  1. *"हाँ जी, बताइए।"*
  2. *"मुझे अपनी फैमिली के लिए नंदी हिल्स में एक शांत वीकेंड विला प्लॉट चाहिए।"*
  3. *"हाँ, लोकेशन बहुत अच्छी है और हमारा बजट करीब 1.5 करोड़ तक का है।"*
  4. *"2029 का टाइमलाइन ठीक है। क्या आप इस वीकेंड साइट विजिट करवा सकते हैं?"*
* **Expected Outcome**: Seamless Hindi dialogue, lead classified as **`HOT`**.

---

## 3. Manual Voice & Audio QA Checklist

Evaluators can follow this checklist to verify real-time voice behavior:

- [x] **Microphone Streaming**: Audio captures at 16kHz PCM mono via Web Audio API.
- [x] **Barge-in / Interruption**: Speaking while the agent is talking instantly halts audio playback (<50ms) and switches UI state to `Interrupted` $\rightarrow$ `Listening`.
- [x] **Silence Timeout 1 (6 seconds)**: Agent proactively asks *"Are you still with me?"*.
- [x] **Silence Timeout 2 (additional 7 seconds)**: Agent offers callback and gracefully concludes call.
- [x] **Cost Guard Limits**: Call terminates safely at 180 seconds or 20 turns.
- [x] **Phonetics Quality**: Pronounces "Divyasree" as "Div-yaa-shree", "Nandi" as "Nun-dhee", expands "₹92.4 lakh" to natural speech.
- [x] **UI Responsiveness**: 7-state circular voice visualizer (`Ready`, `Calling`, `Listening`, `Thinking`, `Speaking`, `Interrupted`, `Completed`) responds in real-time.
- [x] **Final Summary**: Modal presents complete qualification breakdown with one-click JSON export.
