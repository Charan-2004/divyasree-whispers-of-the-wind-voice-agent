# COST & FREE-TIER COMPARISON ANALYSIS
**Project**: Divyasree Developers — Whispers of the Wind AI Voice Agent  
**Constraint**: Strict ₹0-Money-Spent Assignment Requirement  
**Date**: August 2026  

---

## 1. Zero-Cost Infrastructure Verification

| Architecture Component | Option A: Current Version 1 | Option B: LiveKit Cloud | Option B: Self-Hosted LiveKit |
| :--- | :--- | :--- | :--- |
| **Transport Infrastructure** | Custom WebSocket on Node.js<br>**Cost: ₹0.00** | LiveKit Cloud "Build" Free Tier (1,000 agent mins/mo)<br>**Cost: ₹0.00** | `livekit-server --dev` on local CPU / VPS<br>**Cost: ₹0.00** |
| **Speech-to-Text (STT)** | Sarvam `saaras:v3` via Free Developer Credits<br>**Cost: ₹0.00** | Sarvam `saaras:v3` via Free Developer Credits<br>**Cost: ₹0.00** | Sarvam `saaras:v3` via Free Developer Credits<br>**Cost: ₹0.00** |
| **Reasoning / LLM** | Gemini 2.5 Flash Free Tier (15 RPM / 1,500 RPD)<br>**Cost: ₹0.00** | Gemini 2.5 Flash Free Tier (15 RPM / 1,500 RPD)<br>**Cost: ₹0.00** | Gemini 2.5 Flash Free Tier (15 RPM / 1,500 RPD)<br>**Cost: ₹0.00** |
| **Speech Synthesis (TTS)** | Sarvam `bulbul:v3` via Free Developer Credits<br>**Cost: ₹0.00** | Sarvam `bulbul:v3` via Free Developer Credits<br>**Cost: ₹0.00** | Sarvam `bulbul:v3` via Free Developer Credits<br>**Cost: ₹0.00** |
| **Telephony / PSTN** | Browser-based Outbound Call Simulator<br>**Cost: ₹0.00** | Browser-based WebRTC Room Simulator<br>**Cost: ₹0.00** | Browser-based WebRTC Room Simulator<br>**Cost: ₹0.00** |
| **Total Monetary Spend** | **₹0.00 (Zero)** | **₹0.00 (Zero)** | **₹0.00 (Zero)** |

---

## 2. Hard Limits & Quota Protections

### Option A (Version 1):
* **Developer Session Caps**: Configured in `server/config.ts`:
  * Max Call Duration: `180 seconds`
  * Max Conversational Turns: `20 turns`
  * Max TTS Characters: `3,500 characters`
* **Risk**: High safety. Process terminates cleanly upon reaching limits.

### Option B (LiveKit Cloud):
* **Hard Caps**: LiveKit Build plan provides hard monthly limits (1,000 agent mins, 5,000 WebRTC mins, 50 GB egress).
* **Overage Policy**: Operations stop until the first day of the next month. **Zero surprise credit card charges** because no billing method is attached.

---

## 3. Cost Conclusion

Both architectures satisfy the **strict ₹0-money-spent** requirement. LiveKit does not add financial cost as long as:
1. LiveKit's Free Build Plan (or self-hosted binary) is used.
2. Direct API keys (`SARVAM_API_KEY`, `GEMINI_API_KEY`) are utilized without enabling LiveKit Inference paid proxies.
