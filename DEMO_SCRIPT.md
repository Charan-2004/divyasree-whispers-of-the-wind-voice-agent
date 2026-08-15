# EVALUATOR DEMO SCRIPT: Divyasree "Whispers of the Wind"

This guide walks assignment reviewers and evaluators through testing the outbound AI Voice Lead Qualification Agent.

---

## 1. Quick Launch (30 Seconds)

### Step 1: Start the Local Voice Server
From the project root directory, run:

```bash
npm start
```

*The server will start on `http://localhost:3000` with WebSocket endpoint `ws://localhost:3000/ws/call`.*

### Step 2: Open the Luxury Web Application
Open your modern web browser (Google Chrome, Microsoft Edge, Safari, or Firefox) and navigate to:

```
http://localhost:3000
```

---

## 2. Interactive Test Scenarios (Instant One-Click Evaluation)

The application includes an **Instant Test Harness** with buttons corresponding to all 6 conversation flows. You can test each flow and listen to the real voice conversation:

```
┌────────────────────────────────────────────────────────────────────────┐
│  ⚡ Instant Test Harness (5 Required Flows + Hindi)                     │
│  [1. Hot Self-Use]   [2. Investment Lead]   [3. Budget Mismatch]       │
│  [4. Location Mismatch] [5. Do-Not-Contact] [6. Hindi / Hinglish]      │
└────────────────────────────────────────────────────────────────────────┘
```

### Scenario Walkthroughs:

#### Test 1: Hot Self-Use Lead
1. Click **`1. Hot Self-Use`** on the right panel.
2. The dialer initiates the outbound call to *Arjun Mehta (Tech CXO)*.
3. The agent introduces itself, requests permission, and qualifies intent, geography (Nandi Hills), budget (₹1.5 Cr), and timeline (Dec 2029).
4. **Observe**: The 4-point qualification cards turn green (`Fit`), the lead score badges update to **`HOT`**, and a site visit handoff is scheduled.

#### Test 2: Investment Lead
1. Click **`2. Investment Lead`**.
2. The dialer calls *Priya Sharma (NRI Director)*.
3. The lead asks: *"What kind of returns are expected?"*
4. **Observe**: The agent acknowledges the North Bengaluru corridor growth **without** making guaranteed ROI promises, and qualifies the investor as **`HOT/WARM`**.

#### Test 3: Budget Mismatch Lead
1. Click **`3. Budget Mismatch`**.
2. The dialer calls *Vikram Malhotra (Startup Founder)*.
3. The lead shares a maximum budget of ₹45–50 Lakhs (below the starting price of ₹92.4 Lakhs).
4. **Observe**: The agent handles the mismatch with dignity, notes the preference for future releases, and records **`COLD`** fitment.

#### Test 4: Location Mismatch Lead
1. Click **`4. Location Mismatch`**.
2. The dialer calls *Ananya Rao (Design Director)*.
3. The lead likes the budget but rejects Nandi Hills (*"too far, strictly Whitefield/Sarjapur only"*).
4. **Observe**: The agent respects the customer's choice without high-pressure arguing and records **`COLD`** location mismatch.

#### Test 5: Irritated / Do-Not-Contact Lead
1. Click **`5. Do-Not-Contact`**.
2. The lead says: *"Please stop calling me! Remove my number immediately."*
3. **Observe**: The agent stops pitching instantly, apologizes politely, terminates the call, and marks the classification as **`DO_NOT_CONTACT`**.

#### Test 6: Hindi / Hinglish Lead
1. Click **`6. Hindi / Hinglish`**.
2. The lead speaks in natural conversational Hindi: *"मुझे अपनी फैमिली के लिए नंदी हिल्स में वीकेंड विला प्लॉट चाहिए..."*
3. **Observe**: The agent responds in Hindi, captures the intent, location, and budget accurately, and marks **`HOT`**.

---

## 3. Live Microphone Interaction & Barge-In Testing

To experience the voice agent using your own microphone:

1. Select **Arjun Mehta** or any persona from the top-left dropdown.
2. Click the **Call Lead** button. Allow microphone permissions in your browser.
3. When the agent speaks the opening line, speak into your microphone:
   > *"Hi, I'm actually looking for a weekend home near Nandi Hills and my budget is around 1.5 crore."*
4. **Observe Early Multi-Fact Extraction**: The agent immediately recognizes your intent (weekend home), location (Nandi Hills), and budget (₹1.5 Cr), skips re-asking those questions, and proceeds directly to **Timeline (December 2029)**.
5. **Observe Barge-In / Interruption**: Speak while the agent is speaking or click the **Barge-in / Interrupt** button. Notice that agent speech halts instantly (<50ms) and the visualizer shifts to `Interrupted` $\rightarrow$ `Listening`.

---

## 4. Viewing & Exporting Qualification Reports

At the end of any call:
1. Click **📄 View Lead Summary & Export Report** at the bottom-right.
2. Inspect the structured modal showing all 4 checkpoint statuses, final classification, and transcript.
3. Click **Copy Full JSON** to copy the complete session telemetry.
