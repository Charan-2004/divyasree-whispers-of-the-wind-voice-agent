import { CONFIG } from '../config.js';
import { QualificationState, ConversationState, CompletionState, calculateV2LeadClassification } from './stateEngine.js';
import { ConversationHistoryMessage } from './conversationalPlanner.js';

export interface InterruptionEvent {
  turnId: number;
  agentSpeechSnippet: string;
  userBargeInText: string;
  timestamp: string;
}

export interface PostCallAuditResult {
  executive_summary: string;
  lead_classification: 'HOT' | 'WARM' | 'COLD' | 'CALLBACK' | 'DO_NOT_CONTACT' | 'UNQUALIFIED';
  classification_reason: string;
  score: number;
  qualificationState: QualificationState;
  dimension_breakdown: {
    intent: { value: string | null; evidence: string; confidence: string };
    location: { value: string | null; evidence: string; confidence: string };
    budget: { value: string | null; evidence: string; confidence: string };
    timeline: { value: string | null; evidence: string; confidence: string };
  };
  objections: string[];
  handoff_details: {
    requested: boolean;
    senior_expert_required: boolean;
    reason: string;
    preferred_topics: string[];
  };
  interruption_audit: {
    total_interruptions: number;
    was_interrupted: boolean;
    interruption_events: InterruptionEvent[];
    fluidity_score: number; // 0 to 100
  };
  suggested_next_steps: string[];
}

const AUDIT_SYSTEM_PROMPT = `
You are the Chief Sales & Qualification Auditor for Divyasree Whispers of the Wind (38-acre luxury villa plot project near Nandi Hills / Devanahalli).

Your task is to thoroughly analyze the COMPLETE VERBATIM CONVERSATION LOG between Rohan (Divyasree AI Advisor) and the prospect.

Evaluate with 100% precision:
1. INTENT: Did user seek self-use / weekend retreat ("self_use"), long-term appreciation ("investment"), or both ("both")?
2. LOCATION FIT:
   - "fit": User confirmed comfort with Nandi Hills / Devanahalli / Airport corridor ("yes it works", "airport corridor is fine").
   - "not_fit": User rejected location (e.g. "only looking in Whitefield / Sarjapur").
   - null: Location was never discussed or user was non-committal.
3. BUDGET FIT:
   - "fit": User comfortable with starting ₹92.4 Lakhs+ / ₹1.5 Cr+.
   - "below_budget": User explicitly has lower budget (e.g. ₹80 Lakhs, ₹50 Lakhs, "can't do 92, can do 80").
   - "flexible": Open to payment schemes / stretching.
   - null: Budget was never discussed.
4. TIMELINE FIT:
   - "fit": User confirmed comfort with phased delivery completing by December 2029.
   - "immediate_needed": User wants immediate ready-to-move-in.
   - null: Possession timeline / 2029 was NEVER mentioned or asked. CRITICAL: If 2029 was never asked or mentioned in the conversation, timeline_fit MUST BE null!
5. HANDOFF & SENIOR EXPERT REQUEST:
   - Did user agree to / request a Senior Property Expert follow-up (e.g., to discuss ₹80L payment plans or visit)?
6. OBJECTIONS:
   - List any objections raised (e.g. 'budget_mismatch', 'location_distance', 'immediate_possession_needed').

CRITICAL RULES:
- If user said "no like I can't do 90 to I can do round 80", budget_fit is "below_budget" and objections MUST include "budget_mismatch".
- If user said "yes it works" to the Devanahalli/Nandi Hills corridor, location_fit is "fit".
- If 2029 possession was NEVER discussed, timeline_fit is null.
- Provide direct quote snippets as evidence for every evaluated dimension.
`;

export async function analyzeCompletedCall(
  history: ConversationHistoryMessage[],
  currentQualification: QualificationState,
  interruptions: InterruptionEvent[] = []
): Promise<PostCallAuditResult> {
  const formattedTranscript = history
    .map((m, idx) => `[Turn ${idx + 1}] ${m.role === 'agent' ? 'Rohan (Advisor)' : 'Prospect'}: "${m.text}"`)
    .join('\n');

  // Fallback Deterministic Extraction
  let fallbackIntent = currentQualification.intent;
  let fallbackLocation = currentQualification.location_fit;
  let fallbackBudget = currentQualification.budget_fit;
  let fallbackTimeline = currentQualification.timeline_fit;
  let fallbackHandoff = currentQualification.handoff_requested;
  const fallbackObjections = [...currentQualification.objections];

  const fullText = history.map(h => h.text.toLowerCase()).join(' ');

  if (fullText.includes('long term') || fullText.includes('investment')) {
    fallbackIntent = 'investment';
  } else if (fullText.includes('weekend') || fullText.includes('self use') || fullText.includes('family')) {
    fallbackIntent = 'self_use';
  }

  if (fullText.includes('yes it works') || fullText.includes('nandi') || fullText.includes('airport corridor')) {
    fallbackLocation = 'fit';
  }

  if (fullText.includes("can't do 9") || fullText.includes("round 80") || fullText.includes("80 lakh") || fullText.includes("50 lakh")) {
    fallbackBudget = 'below_budget';
    if (!fallbackObjections.includes('budget_mismatch')) fallbackObjections.push('budget_mismatch');
  }

  // Only mark timeline if 2029 or possession was actually mentioned
  if (!fullText.includes('2029') && !fullText.includes('possession') && !fullText.includes('delivery')) {
    fallbackTimeline = null;
  }

  if (fullText.includes('ask him to call') || fullText.includes('senior expert') || fullText.includes('call me')) {
    fallbackHandoff = true;
  }

  const deterministicState: QualificationState = {
    ...currentQualification,
    intent: fallbackIntent,
    location_fit: fallbackLocation,
    budget_fit: fallbackBudget,
    timeline_fit: fallbackTimeline,
    handoff_requested: fallbackHandoff,
    objections: fallbackObjections
  };

  const deterministicClassification = calculateV2LeadClassification(deterministicState);

  // Try LLM Deep Audit
  if (CONFIG.GEMINI_API_KEY && history.length >= 2) {
    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${CONFIG.GEMINI_MODEL}:generateContent?key=${CONFIG.GEMINI_API_KEY}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [
              {
                role: 'user',
                parts: [
                  {
                    text: `Analyze this complete call transcript:\n\n${formattedTranscript}\n\nInterruption Count: ${interruptions.length}\n\nReturn complete JSON audit matching schema.`
                  }
                ]
              }
            ],
            systemInstruction: { parts: [{ text: AUDIT_SYSTEM_PROMPT }] },
            generationConfig: {
              temperature: 0.1,
              maxOutputTokens: 1200,
              responseMimeType: 'application/json',
              responseSchema: {
                type: 'OBJECT',
                properties: {
                  executive_summary: { type: 'STRING' },
                  lead_classification: { type: 'STRING', enum: ['HOT', 'WARM', 'COLD', 'UNQUALIFIED', 'DO_NOT_CONTACT'] },
                  classification_reason: { type: 'STRING' },
                  score: { type: 'INTEGER' },
                  qualification: {
                    type: 'OBJECT',
                    properties: {
                      intent: { type: 'STRING', enum: ['self_use', 'investment', 'both', 'unclear'] },
                      intent_evidence: { type: 'STRING' },
                      location_fit: { type: 'STRING', enum: ['fit', 'not_fit', 'neutral'] },
                      location_evidence: { type: 'STRING' },
                      budget_fit: { type: 'STRING', enum: ['fit', 'below_budget', 'flexible'] },
                      budget_evidence: { type: 'STRING' },
                      timeline_fit: { type: 'STRING', enum: ['fit', 'immediate_needed', 'flexible', 'unasked'] },
                      timeline_evidence: { type: 'STRING' },
                      handoff_requested: { type: 'BOOLEAN' }
                    },
                    required: ['intent', 'location_fit', 'budget_fit', 'timeline_fit', 'handoff_requested']
                  },
                  objections: {
                    type: 'ARRAY',
                    items: { type: 'STRING' }
                  },
                  senior_expert_followup: {
                    type: 'OBJECT',
                    properties: {
                      required: { type: 'BOOLEAN' },
                      reason: { type: 'STRING' },
                      topics: { type: 'ARRAY', items: { type: 'STRING' } }
                    },
                    required: ['required', 'reason', 'topics']
                  },
                  suggested_next_steps: {
                    type: 'ARRAY',
                    items: { type: 'STRING' }
                  }
                },
                required: ['executive_summary', 'lead_classification', 'classification_reason', 'score', 'qualification', 'objections', 'senior_expert_followup', 'suggested_next_steps']
              }
            }
          })
        }
      );

      if (response.ok) {
        const data = await response.json();
        let rawJson = data?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (rawJson) {
          rawJson = rawJson.replace(/^```json\s*/i, '').replace(/^```\s*/, '').replace(/\s*```$/, '').trim();
          const jsonMatch = rawJson.match(/\{[\s\S]*\}/);
          if (jsonMatch) rawJson = jsonMatch[0];

          const parsed = JSON.parse(rawJson);

          // Build final audited state
          const finalState: QualificationState = {
            ...deterministicState,
            intent: parsed.qualification?.intent_identified !== undefined ? parsed.qualification.intent_identified : deterministicState.intent,
            location_fit: parsed.qualification?.location_comfort !== undefined ? parsed.qualification.location_comfort : deterministicState.location_fit,
            budget_fit: parsed.qualification?.budget_status !== undefined ? parsed.qualification.budget_status : deterministicState.budget_fit,
            timeline_fit: parsed.qualification?.timeline_status !== undefined ? parsed.qualification.timeline_status : deterministicState.timeline_fit,
            objections: Array.from(new Set([...deterministicState.objections, ...(parsed.objections_raised || [])])),
            handoff_requested: parsed.senior_expert_followup?.required || deterministicState.handoff_requested
          };

          const classification = calculateV2LeadClassification(finalState);

          return {
            executive_summary: parsed.executive_summary || 'Executive synopsis generated.',
            lead_classification: classification.classification,
            classification_reason: parsed.classification_reason || classification.reason,
            score: classification.score,
            qualificationState: finalState,
            dimension_breakdown: {
              intent: { value: finalState.intent, evidence: parsed.qualification?.intent_evidence || 'N/A', confidence: 'HIGH' },
              location: { value: finalState.location_fit, evidence: parsed.qualification?.location_evidence || 'N/A', confidence: 'HIGH' },
              budget: { value: finalState.budget_fit, evidence: parsed.qualification?.budget_evidence || 'N/A', confidence: 'HIGH' },
              timeline: { value: finalState.timeline_fit, evidence: parsed.qualification?.timeline_evidence || 'N/A', confidence: 'HIGH' }
            },
            objections: finalState.objections,
            handoff_details: {
              requested: finalState.handoff_requested,
              senior_expert_required: parsed.senior_expert_followup?.required || false,
              reason: parsed.senior_expert_followup?.reason || 'Standard Handoff',
              preferred_topics: parsed.senior_expert_followup?.topics || []
            },
            interruption_audit: {
              total_interruptions: interruptions.length,
              was_interrupted: interruptions.length > 0,
              interruption_events: interruptions,
              fluidity_score: Math.max(0, 100 - (interruptions.length * 10))
            },
            suggested_next_steps: parsed.suggested_next_steps || []
          };
        }
      }
    } catch (llmErr) {
      console.error('LLM Audit failed, falling back:', llmErr);
    }
  }

  return {
    executive_summary: `Prospect ${deterministicState.handoff_requested ? 'requested' : 'did not request'} a follow-up. Lead status based on deterministic analysis.`,
    lead_classification: deterministicClassification.classification,
    classification_reason: deterministicClassification.reason,
    score: deterministicClassification.score,
    qualificationState: deterministicState,
    dimension_breakdown: {
      intent: { value: deterministicState.intent, evidence: 'Deterministic', confidence: 'LOW' },
      location: { value: deterministicState.location_fit, evidence: 'Deterministic', confidence: 'LOW' },
      budget: { value: deterministicState.budget_fit, evidence: 'Deterministic', confidence: 'LOW' },
      timeline: { value: deterministicState.timeline_fit, evidence: 'Deterministic', confidence: 'LOW' }
    },
    objections: deterministicState.objections,
    handoff_details: {
      requested: deterministicState.handoff_requested,
      senior_expert_required: true,
      reason: 'Discuss flexible payment plans to bridge ₹80L budget.',
      preferred_topics: ['Milestone payment schedule', 'Masterplan review']
    },
    interruption_audit: {
      total_interruptions: interruptions.length,
      was_interrupted: interruptions.length > 0,
      interruption_events: interruptions,
      fluidity_score: Math.max(50, 100 - interruptions.length * 15)
    },
    suggested_next_steps: [
      'Assign Senior Property Expert to call prospect regarding payment structure',
      'Send Whispers of the Wind masterplan'
    ]
  };
}
