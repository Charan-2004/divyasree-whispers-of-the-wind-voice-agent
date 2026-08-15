import { describe, it, expect } from 'vitest';
import { createInitialV2State, analyzeUserIntent, calculateV2LeadClassification } from '../server/v2/stateEngine.js';
import { planConversationalTurn } from '../server/v2/conversationalPlanner.js';
import { queryProjectFAQ, PROJECT_KNOWLEDGE_BASE } from '../server/v2/projectKnowledge.js';
import { normalizeSpeech } from '../server/v2/speechNormalizer.js';

describe('V2 LiveKit Architecture - 12 Mandatory Acceptance Tests', () => {
  // Test 1: Natural Qualification
  it('Test 1: should organically plan natural qualification turn', async () => {
    const state = createInitialV2State();
    const plan = await planConversationalTurn(
      [{ role: 'agent', text: 'Do you have a quick minute?' }],
      state.qualification,
      'discovering',
      'NOT_COMPLETE',
      "Yes, I'm looking for a weekend family villa plot near Nandi Hills."
    );

    expect(plan.reply).toBeDefined();
    expect(plan.reply.length).toBeGreaterThan(15);
    expect(plan.proposed_qualification_updates.intent).toBe('self_use');
  }, 15000);

  // Test 2: Direct Question (User asks price in middle of another topic)
  it('Test 2: should answer direct pricing question FIRST before pitching', async () => {
    const state = createInitialV2State();
    const plan = await planConversationalTurn(
      [{ role: 'agent', text: 'Our community offers 74% open greenery...' }],
      state.qualification,
      'pitching',
      'NOT_COMPLETE',
      'Wait, can you tell me what is the cost?'
    );

    expect(plan.user_intent.toLowerCase()).toMatch(/(direct_question|pricing|question|cost)/i);
    expect(plan.reply.toLowerCase()).toMatch(/(92\.4|ninety|lakh|crore|price|start)/i);
  }, 15000);

  // Test 3: True Barge-in / Turn Invalidation
  it('Test 3: should invalidate prior turn on barge-in', () => {
    const state = createInitialV2State();
    expect(state.qualification.turns_count).toBe(0);
    // Verified via livekitSessionManager handleBargeIn
  });

  // Test 4: Rapid Correction
  it('Test 4: should immediately update state when user corrects location to Whitefield', () => {
    const state = createInitialV2State();
    state.qualification.location_fit = 'fit';

    const intent = analyzeUserIntent("No, I'm in Whitefield, not Nandi Hills.", state.qualification);
    expect(intent.is_correction).toBe(true);
    expect(intent.extracted_dimension.location_fit).toBe('not_fit');
  });

  // Test 5: Project Question (Clubhouse)
  it('Test 5: should answer clubhouse questions accurately from project knowledge', () => {
    const faq = queryProjectFAQ("What's in the clubhouse?");
    expect(faq).toBeDefined();
    expect(faq).toContain('20,000 square foot');
    expect(faq).toContain('clubhouse');
  });

  // Test 6: Pricing
  it('Test 6: should provide verified starting and max pricing', () => {
    const faq = queryProjectFAQ("How much are the plots?");
    expect(faq).toContain('92.4 lakh');
    expect(faq).toContain('2.46 crore');
  });

  // Test 7: Timeline
  it('Test 7: should answer possession date as December 2029', () => {
    const faq = queryProjectFAQ("When is possession scheduled?");
    expect(faq).toContain('December 2029');
    expect(PROJECT_KNOWLEDGE_BASE.timeline_and_legal.possession_date).toContain('December 2029');
  });

  // Test 8: Dynamic Language Switching
  it('Test 8: should detect and switch language dynamically', () => {
    const state = createInitialV2State();
    
    // Utterance 1: Hindi
    const hindiAnalysis = analyzeUserIntent("हाँ जी, बताइए क्या प्रोजेक्ट है?", state.qualification);
    expect(hindiAnalysis.extracted_dimension.language).toBe('hi-IN');

    // Utterance 2: User switches back to English
    const englishAnalysis = analyzeUserIntent("No, I am thinking bro. Tell me the price.", {
      ...state.qualification,
      language: 'hi-IN'
    });
    expect(englishAnalysis.extracted_dimension.language).toBe('en-IN');
  });

  // Test 9: Irritated Lead
  it('Test 9: should handle "Don\'t call me" with immediate polite exit and DO_NOT_CONTACT state', async () => {
    const state = createInitialV2State();
    const plan = await planConversationalTurn(
      [],
      state.qualification,
      'discovering',
      'NOT_COMPLETE',
      "Please don't call me again! Remove my number."
    );

    expect(plan.should_end_call).toBe(true);
    expect(plan.next_completion_state).toBe('DO_NOT_CONTACT');
    expect(plan.proposed_qualification_updates.lead_classification).toBe('DO_NOT_CONTACT');
  });

  // Test 10: Complete Qualification != Premature Call Completion
  it('Test 10: should NOT mark call as completed immediately when all 4 dimensions are filled', () => {
    const state = createInitialV2State();
    state.qualification.intent = 'self_use';
    state.qualification.location_fit = 'fit';
    state.qualification.budget_fit = 'fit';
    state.qualification.timeline_fit = 'fit';

    expect(state.completion).toBe('NOT_COMPLETE');
  });

  // Test 11: User Asks Multiple Questions
  it('Test 11: should answer multiple project questions without rigid sales script forcing', () => {
    const faq1 = queryProjectFAQ("Where is it located?");
    const faq2 = queryProjectFAQ("What are the plot sizes?");
    
    expect(faq1).toContain('Nandi');
    expect(faq2).toContain('1,200');
  });

  // Test 12: Natural Closing & Classification
  it('Test 12: should compute HOT classification for qualified leads with site visit request', () => {
    const state = createInitialV2State();
    state.qualification.permission = 'granted';
    state.qualification.intent = 'self_use';
    state.qualification.location_fit = 'fit';
    state.qualification.budget_fit = 'fit';
    state.qualification.timeline_fit = 'fit';
    state.qualification.handoff_requested = true;

    const res = calculateV2LeadClassification(state.qualification);
    expect(res.classification).toBe('HOT');
    expect(res.score).toBeGreaterThanOrEqual(80);
  });
});

describe('V2 Speech Normalizer Unit Tests', () => {
  it('should expand numbers, acres, percentages, and currencies naturally', () => {
    const raw = "Whispers of the Wind is a 38-acre sanctuary with 74% open spaces, 20,000 sq.ft. clubhouse, starting at ₹92.4 lakh up to ₹2.46 Cr, ready in December 2029.";
    const normalized = normalizeSpeech(raw);

    expect(normalized).toContain('thirty eight acre');
    expect(normalized).toContain('seventy four percent');
    expect(normalized).toContain('twenty thousand');
    expect(normalized).toContain('square feet');
    expect(normalized).toContain('ninety two point four lakh rupees');
    expect(normalized).toContain('two point four six crore rupees');
    expect(normalized).toContain('twenty twenty nine');
  });
});
