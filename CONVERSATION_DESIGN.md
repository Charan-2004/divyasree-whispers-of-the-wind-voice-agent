# CONVERSATION DESIGN SPECIFICATION: Divyasree "Whispers of the Wind"

This document specifies the conversational architecture, qualification checkpoints, state transitions, dynamic branches, and dialogue patterns for the outbound AI voice qualification agent.

---

## 1. High-Level Conversational Flowchart

```mermaid
stateDiagram-v2
    [*] --> INTRO : Outbound Call Connected
    INTRO --> PERMISSION_CHECK : Greeting & Value Proposition
    
    PERMISSION_CHECK --> INTENT : Permission Granted ("Yes / Sure / Tell me")
    PERMISSION_CHECK --> CALLBACK : Busy ("In a meeting / Call later")
    PERMISSION_CHECK --> DO_NOT_CONTACT : Irritated ("Stop calling / Not interested")
    
    INTENT --> GEOGRAPHY : Intent Captured (Self-use / Investment / Both)
    GEOGRAPHY --> BUDGET : Geography Qualified (Nandi Hills / North BLR)
    BUDGET --> TIMELINE : Budget Checked (₹92.4L+ starting range)
    TIMELINE --> PITCH : Timeline Checked (Dec 2029 possession)
    
    PITCH --> CTA_HANDOFF : Aspirational Tailored Pitch
    CTA_HANDOFF --> COMPLETED : Site Visit / Expert Call Scheduled
    
    CALLBACK --> [*]
    DO_NOT_CONTACT --> [*]
    COMPLETED --> [*]
```

---

## 2. The 4 Checkpoints & Dialogue Matrix

### Checkpoint 0: Introduction & Permission to Speak
* **Agent Goal**: Introduce as Divyasree consultant, mention "Whispers of the Wind" near Nandi Hills, and explicitly ask for 1 minute of permission.
* **Sample Opening**:
  > *"Hello, this is Rohan calling from Divyasree regarding Whispers of the Wind, our private valley community near Nandi Hills. I know I am catching you during the day — do you have a quick minute to speak?"*
* **Transitions**:
  * If `"Yes / Sure / Go ahead"` $\rightarrow$ Proceed to **Checkpoint 1 (Intent)**.
  * If `"I'm busy / In a meeting"` $\rightarrow$ *"I completely understand. I will have our team follow up at a more convenient time. Have a great day!"* (Mark `CALLBACK`).
  * If `"Who are you / What is this?"` $\rightarrow$ Clarify briefly, then re-check permission.
  * If `"Not interested / Don't call me"` $\rightarrow$ Respect immediately, end call (Mark `DO_NOT_CONTACT`).

---

### Checkpoint 1: Intent Qualification
* **Agent Goal**: Determine whether the buyer is looking for a **Weekend Home / Self-Use** vs. **Long-Term Investment** vs. **Both**.
* **Sample Dialogue**:
  > *"Wonderful. Just to understand what you have in mind — would you be exploring this more as a private weekend retreat for family, or primarily as a long-term investment?"*
* **Intent Categorization**:
  * `self_use`: Mentions family, weekend villa, holiday home, peace, nature, retirement.
  * `investment`: Mentions land appreciation, rental potential, portfolio diversification, capital growth.
  * `both`: Wants personal usage on weekends with capital appreciation.
  * `unclear`: Ambiguous response; agent gently clarifies.

---

### Checkpoint 2: Geography / Location Qualification
* **Agent Goal**: Verify comfort with **Nandi Valley / Nandi Hills / Devanahalli / North Bengaluru corridor**.
* **Sample Dialogue**:
  > *"Got it. Whispers of the Wind is set right in Nandi Valley, about 20 minutes from the International Airport. Are you comfortable with the Nandi Hills and North Bengaluru corridor for your property?"*
* **Location Fit Handling**:
  * `fit`: Comfortable with North Bengaluru or specifically looking for Nandi Hills.
  * `not_fit` ("Too far / I prefer Whitefield / South Bangalore"):
    * Agent responds: *"Understood. It is positioned for those seeking scenic privacy within 20 minutes of the airport, but I appreciate that location preferences vary. Thank you for letting me know."* (No high-pressure arguing).

---

### Checkpoint 3: Source Budget Qualification
* **Agent Goal**: Tactfully verify comfort with the starting price of **₹92.4 lakh+** (up to ₹2.46 Cr) without interrogating personal finances.
* **Sample Dialogue**:
  > *"That makes sense. Our curated villa plots currently start from around ₹92.4 lakh inclusive of taxes. Would that range align with what you have in mind?"*
* **Budget Fit Handling**:
  * `fit`: Confirms budget is ₹90L+, ₹1 Cr, ₹1.5 Cr, ₹2 Cr+, or "yes that works".
  * `below_budget` ("My budget is 40-50 lakhs"):
    * Agent responds: *"I appreciate your transparency. While Whispers of the Wind starts at ₹92.4 lakh, I can certainly have our Property Expert note your preference for future developments."* (Dignified and respectful).

---

### Checkpoint 4: Timeline Qualification
* **Agent Goal**: Confirm comfort with an ongoing phased development delivering in **December 2029**.
* **Sample Dialogue**:
  > *"Understood. Whispers of the Wind is an ongoing masterplanned development, with possession scheduled for December 2029. Does that timeline fit your planning horizon?"*
* **Timeline Fit Handling**:
  * `fit`: Comfortable with 2028-2029 or long-term horizon.
  * `immediate_needed` ("I need to build and move in next month"):
    * Agent explains: *"This is a curated greenfield community designed for phased delivery by late 2029. If immediate possession is essential, our expert can highlight alternative ready properties for you."*

---

### The Pitch: Tailored Luxury Private Valley Narrative
* **Goal**: Deliver a concise (2-sentence) aspirational lifestyle pitch rather than a dry list of plot dimensions.
* **Branch A (Self-Use / Weekend Home Focus)**:
  > *"Whispers of the Wind is designed as a sanctuary — 74% open landscape with scenic hill views, eco-parks, and a 20,000 square foot private clubhouse, giving your family a tranquil weekend escape away from the city."*
* **Branch B (Investment Focus)**:
  > *"It combines the exclusivity of a 38-acre private valley masterplan with the rapid growth of the North Bengaluru airport corridor, offering strong long-term plotted value in a high-demand luxury enclave."*

---

### Call-to-Action (CTA) & Property Expert Handoff
* **Agent Goal**: Secure interest for a dedicated site visit or a consultation with the Divyasree Senior Property Expert.
* **Sample Dialogue**:
  > *"Would you be open to having our senior Property Expert share the masterplan layout and arrange an exclusive private site visit for you this weekend?"*
* **Outcomes**:
  * Lead accepts: *"Excellent. I will have our Property Expert reach out with the brochure and schedule your visit. Thank you for your time!"* (Handoff requested).
  * Lead hesitates: *"No problem at all. I can have the digital brochure emailed to you first for your review. Have a wonderful day."*

---

## 3. Early Information Extraction Logic

The system is explicitly programmed to never re-ask known information.

| User Statement | Extracted Dimensions | Next Question Generated by Agent |
| :--- | :--- | :--- |
| *"I'm looking for a weekend home near Nandi Hills and my budget is around 1.5 Cr."* | `intent: "self_use"`<br>`location_fit: "fit"`<br>`budget_fit: "fit"` | Acknowledges intent, location, and budget. Asks directly about **Timeline (Dec 2029)**. |
| *"I want to invest around 1 crore in North Bangalore."* | `intent: "investment"`<br>`location_fit: "fit"`<br>`budget_fit: "fit"` | Acknowledges investment in North Bangalore. Asks directly about **Timeline (Dec 2029)**. |
| *"I am only looking in Sarjapur Road."* | `location_fit: "not_fit"` | Acknowledges Sarjapur preference without pushing Nandi Hills; offers polite wrap up. |

---

## 4. Edge Cases & Silence Handling Protocol

### A. Interruption / Barge-in
1. When user speech is detected while the agent audio is playing:
   - Audio playback is halted instantly (<50ms).
   - Any buffered audio chunks are discarded.
   - The user's new utterance is captured cleanly.
   - The agent responds to the new input without desynchronization.

### B. Silence Handling Timers
* **Silence 1 (after 6 seconds of inactivity)**:
  > *"Are you still with me?"* (or *"Are you able to hear me clearly?"*)
* **Silence 2 (after additional 7 seconds of inactivity)**:
  > *"No problem at all — I can let you go for now. Would you prefer a callback from our Property Expert at a later time?"*
* **Silence 3 (final)**: End call gracefully and set status to `CALLBACK`.

### C. Irritated or Hostile User
* Keywords: *"Stop calling", "Don't disturb", "Who gave you this number", "Remove me from list"*
* Action: Immediate polite de-escalation:
  > *"I completely understand and apologize for the disturbance. I have updated our records so you will not be contacted again. Have a good day."*
* State: `lead_classification = "DO_NOT_CONTACT"`, call ends immediately.
