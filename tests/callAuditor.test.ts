import { describe, it, expect } from 'vitest';
import { analyzeCompletedCall } from '../server/v2/callAuditor.js';
import { createInitialV2State } from '../server/v2/stateEngine.js';

describe('Post-Call Deep Analysis & Interruption Audit Tests', () => {
  it('should accurately extract multi-turn dialogue with lower budget and unasked timeline', async () => {
    const history = [
      { role: 'agent' as const, text: "Hello, this is Rohan calling from Divyashree regarding Whispers of the Wind, our private valley community near Nandi Hills. Do you have a quick minute to speak?" },
      { role: 'user' as const, text: "yes yes" },
      { role: 'agent' as const, text: "Are you primarily exploring this as a serene weekend retreat for your family, or are you looking at it from a long-term investment perspective?" },
      { role: 'user' as const, text: "Wrong Turn" },
      { role: 'agent' as const, text: "I apologize for the confusion. Is there a specific detail you would like me to clarify?" },
      { role: 'user' as const, text: "I said long term" },
      { role: 'agent' as const, text: "Since you are looking at this from a long-term investment perspective, our location just 20 minutes from the airport is seeing significant appreciation; does this corridor near Nandi Hills align with your current investment geography?" },
      { role: 'user' as const, text: "yes it works" },
      { role: 'agent' as const, text: "Given that our plots start at ₹92.4 lakh, does that budget range align with your current investment plans?" },
      { role: 'user' as const, text: "no like I can't do 90 to I can do round 80" },
      { role: 'agent' as const, text: "While our starting price is ₹92.4 lakh, we do offer flexible milestone payment schedules. Would you be open to having a senior Property Expert share specific details?" },
      { role: 'user' as const, text: "yeah that works you can ask him to call me" },
      { role: 'agent' as const, text: "I will have one of our senior Property Experts reach out to you shortly. Thank you for your time today." }
    ];

    const interruptions = [
      {
        turnId: 4,
        agentSpeechSnippet: "Are you primarily exploring this as a serene...",
        userBargeInText: "Wrong Turn",
        timestamp: "2:12:44 PM"
      }
    ];

    const initialState = createInitialV2State().qualification;
    const audit = await analyzeCompletedCall(history, initialState, interruptions);

    expect(audit.qualificationState.intent).toBe('investment');
    expect(audit.qualificationState.location_fit).toBe('fit');
    expect(audit.qualificationState.budget_fit).toBe('below_budget');
    expect(audit.qualificationState.timeline_fit).toBeNull(); // 2029 was never asked!
    expect(audit.qualificationState.handoff_requested).toBe(true);
    expect(audit.qualificationState.objections).toContain('budget_mismatch');
    expect(audit.interruption_audit.was_interrupted).toBe(true);
    expect(audit.interruption_audit.total_interruptions).toBe(1);
    expect(audit.handoff_details.senior_expert_required).toBe(true);
  });
});
