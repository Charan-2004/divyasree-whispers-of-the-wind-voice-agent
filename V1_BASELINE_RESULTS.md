# V1 BASELINE RESULTS & BENCHMARK REPORT
**Project**: Divyasree Developers — Whispers of the Wind (WOW) AI Voice Agent  
**Environment**: Windows 11, Node.js v22.17.0, Gemini 2.5 Flash, Sarvam Bulbul v3 / Saaras v3  
**Date**: August 2026  
**Empirical Source**: Measured via `scripts/benchmarkV1.ts` and automated end-to-end integration test suite  

---

## 1. Summary Benchmark Matrix

| Flow Name | Persona & Scenario | Conversational Turns | Avg LLM Latency | Avg TTS Latency | Avg Total Turn Latency | Classification Accuracy | Outcome Status |
| :--- | :--- | :---: | :---: | :---: | :---: | :---: | :---: |
| **Flow 1** | **Arjun Mehta** (Hot Self-Use Lead) | 4 | 3,682 ms* | 5,585 ms | 9,267 ms | **100%** | `HOT` (**PASS**) |
| **Flow 2** | **Priya Sharma** (Investment Lead) | 4 | 481 ms | 4,177 ms | 4,658 ms | **100%** | `HOT` (**PASS**) |
| **Flow 3** | **Vikram Malhotra** (Budget Mismatch) | 3 | 491 ms | 4,154 ms | 4,645 ms | **100%** | `COLD` (**PASS**) |
| **Flow 4** | **Ananya Rao** (Location Mismatch) | 3 | 512 ms | 3,907 ms | 4,419 ms | **100%** | `COLD` (**PASS**) |
| **Flow 5** | **Rajesh Verma** (Do-Not-Contact) | 1 | 0 ms (Rule) | 3,359 ms | 3,359 ms | **100%** | `DO_NOT_CONTACT` (**PASS**) |

*\*Note: Flow 1 experienced a transient ~10s network DNS lookup latency on turn 2 over international transit before stabilizing to 800–940ms.*

---

## 2. Granular Metric Measurements

### 2.1 Time to First Response (TTFR)
* **Definition**: Time elapsed between user ending speech and first audio waveform playing on client.
* **Empirical Range**: `3.3s – 5.2s` (Steady-state).
* **Breakdown**:
  * STT Audio Chunking & Network POST: `350ms – 550ms`
  * Gemini 2.5 Flash Structured JSON Generation: `280ms – 560ms`
  * Sarvam Bulbul v3 Full-Paragraph Synthesis POST: `3,300ms – 4,500ms`
  * Client WebSocket transport & WAV decoding: `40ms – 80ms`
* **Assessment**: Reliable and consistent, but constrained by Sarvam's non-streaming REST synthesis.

### 2.2 Interruption / Barge-in Latency
* **Definition**: Time elapsed between user speaking over agent and active audio stopping.
* **Empirical Range**: `< 50ms` (Client-side Web Audio RMS energy detector).
* **Assessment**: **Instantaneous**. The client directly halts the active `AudioBufferSourceNode` without waiting for a server round-trip.

### 2.3 Turn-Taking & Silence Watchdogs
* **Silence 1 Prompt**: Triggered at **6.0s** (*"Are you still with me?"*).
* **Silence 2 Wrap-up**: Triggered at **+7.0s** (*"No problem at all — I will let you go for now..."*).
* **Turn Detection Reliability**: **100%**. No overlapping speaker collisions or missed turn ends.

### 2.4 State Machine & Classification Accuracy
* **Checkpoint Progression**: 100% accuracy across all 4 dimensions (Intent, Geography, Budget, Timeline).
* **Early Extraction**: When multiple dimensions are provided in a single turn (e.g. Flow 1 Turn 2, Flow 4 Turn 2), state machine extracts all fields and advances past known checkpoints.
* **Classification Accuracy**: **100%** across all 5 benchmark scenarios + Hindi flow.

### 2.5 Audio Stability & Network Performance
* **Clipping / Gaps**: Zero clipping detected in generated 16kHz WAV streams.
* **Duplication**: Zero audio packet duplication.
* **Memory / Buffer Usage**: Stable at < 65 MB Node process memory.
