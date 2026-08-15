import { describe, it, expect } from 'vitest';
import { 
  createInitialState, 
  calculateLeadClassification, 
  extractDimensionsFromText,
  QualificationState 
} from '../server/stateMachine.js';
import { generateAgentResponse, ConversationMessage } from '../server/geminiService.js';

describe('Mandatory 5 Conversation Flows Verification', { timeout: 35000 }, () => {

  it('FLOW 1: Hot Self-Use Lead (Arjun Mehta)', async () => {
    let state: QualificationState = createInitialState({
      name: 'Arjun Mehta',
      phone_masked: '+91 9845X-XX102',
      city: 'Bengaluru'
    });
    const history: ConversationMessage[] = [];

    // Turn 1: Lead grants permission
    const turn1 = await generateAgentResponse(history, state, "Yes, sure. I have a minute.");
    Object.assign(state, turn1.state_updates);
    expect(state.permission).toBe('granted');

    // Turn 2: Lead specifies self-use weekend home in Nandi Hills
    const turn2 = await generateAgentResponse(history, state, "I am looking for a weekend retreat for my family in Nandi Hills.");
    Object.assign(state, turn2.state_updates);
    expect(state.intent).toBe('self_use');
    expect(state.location_fit).toBe('fit');

    // Turn 3: Lead confirms budget ₹1.5 Cr
    const turn3 = await generateAgentResponse(history, state, "Yes, my budget is around 1.5 Cr, so starting at 92.4 lakh is great.");
    Object.assign(state, turn3.state_updates);
    expect(state.budget_fit).toBe('fit');

    // Turn 4: Lead accepts 2029 timeline and asks for site visit
    const turn4 = await generateAgentResponse(history, state, "December 2029 timeline works fine. Please schedule a site visit this Saturday.");
    Object.assign(state, turn4.state_updates);
    expect(state.timeline_fit).toBe('fit');
    expect(state.handoff_requested).toBe(true);

    const classification = calculateLeadClassification(state);
    expect(classification.classification).toBe('HOT');
  });

  it('FLOW 2: Investment Lead (Priya Sharma)', async () => {
    let state: QualificationState = createInitialState();
    const history: ConversationMessage[] = [];

    // Turn 1: Permission
    const turn1 = await generateAgentResponse(history, state, "Yes, go ahead.");
    Object.assign(state, turn1.state_updates);

    // Turn 2: NRI Investor interested in North Bangalore
    const turn2 = await generateAgentResponse(history, state, "I am an NRI looking for long-term land investment in North Bangalore corridor.");
    Object.assign(state, turn2.state_updates);
    expect(state.intent).toBe('investment');
    expect(state.location_fit).toBe('fit');

    // Turn 3: Budget fit + inquiry about returns
    const turn3 = await generateAgentResponse(history, state, "Budget around 2 Crore is comfortable. What kind of returns are expected?");
    Object.assign(state, turn3.state_updates);
    expect(state.budget_fit).toBe('fit');
    // Agent must NOT make guaranteed financial claims
    expect(turn3.reply.toLowerCase()).not.toContain('guaranteed');

    // Turn 4: Timeline & expert handoff
    const turn4 = await generateAgentResponse(history, state, "2029 timeline is fine. Connect me with your Property Expert.");
    Object.assign(state, turn4.state_updates);
    expect(state.timeline_fit).toBe('fit');
    expect(state.handoff_requested).toBe(true);

    const classification = calculateLeadClassification(state);
    expect(['HOT', 'WARM']).toContain(classification.classification);
  });

  it('FLOW 3: Budget Mismatch Lead (Vikram Malhotra)', async () => {
    let state: QualificationState = createInitialState();
    const history: ConversationMessage[] = [];

    // Turn 1: Permission
    await generateAgentResponse(history, state, "Yes, tell me.");

    // Turn 2: Likes location but budget is 40-50 Lakhs
    const turn2 = await generateAgentResponse(history, state, "I love Nandi Hills for a weekend plot, but my maximum budget is strictly 45 to 50 lakhs.");
    Object.assign(state, turn2.state_updates);

    expect(state.location_fit).toBe('fit');
    expect(state.budget_fit).toBe('below_budget');

    const classification = calculateLeadClassification(state);
    expect(classification.classification).toBe('COLD');
  });

  it('FLOW 4: Location Mismatch Lead (Ananya Rao)', async () => {
    let state: QualificationState = createInitialState();
    const history: ConversationMessage[] = [];

    // Turn 1: Permission
    await generateAgentResponse(history, state, "Sure.");

    // Turn 2: Budget fits but hates North Bangalore / Nandi Hills
    const turn2 = await generateAgentResponse(history, state, "I have a budget of 1.5 Cr, but Nandi Hills is too far. I am only looking in Whitefield and East Bangalore.");
    Object.assign(state, turn2.state_updates);

    expect(state.location_fit).toBe('not_fit');
    expect(state.budget_fit).toBe('fit');

    const classification = calculateLeadClassification(state);
    expect(classification.classification).toBe('COLD');
  });

  it('FLOW 5: Irritated / Do-Not-Contact Lead (Rajesh Verma)', async () => {
    let state: QualificationState = createInitialState();
    const history: ConversationMessage[] = [];

    // Turn 1: Immediate hostile rejection
    const turn1 = await generateAgentResponse(history, state, "Please stop calling me! Remove my number immediately.");
    Object.assign(state, turn1.state_updates);

    expect(state.permission).toBe('denied');
    expect(turn1.should_end_call).toBe(true);

    const classification = calculateLeadClassification(state);
    expect(classification.classification).toBe('DO_NOT_CONTACT');
  });

  it('FLOW 6: Hindi / Hinglish Lead (Sunita Agarwal)', async () => {
    let state: QualificationState = createInitialState();
    const history: ConversationMessage[] = [];

    // Turn 1: Hindi Permission
    const turn1 = await generateAgentResponse(history, state, "हाँ जी, बताइए।");
    Object.assign(state, turn1.state_updates);

    // Turn 2: Hindi multi-dimensional utterance
    const turn2 = await generateAgentResponse(history, state, "मुझे अपनी फैमिली के लिए नंदी हिल्स में वीकेंड विला प्लॉट चाहिए, बजट 1.5 करोड़ तक का है।");
    Object.assign(state, turn2.state_updates);

    expect(state.intent).toBe('self_use');
    expect(state.location_fit).toBe('fit');
    expect(state.budget_fit).toBe('fit');
  });
});
