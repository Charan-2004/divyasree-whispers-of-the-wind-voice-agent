import { CONFIG } from '../config.js';
import { 
  QualificationState, 
  ConversationState, 
  CompletionState, 
  analyzeUserIntent, 
  UserIntentAnalysis 
} from './stateEngine.js';
import { PROJECT_KNOWLEDGE_BASE, queryProjectFAQ } from './projectKnowledge.js';

export interface V2TurnPlan {
  reply: string;
  tone: 'warm' | 'empathetic' | 'confident' | 'curious' | 'calm' | 'reassuring' | 'concise' | 'professional';
  user_intent: string;
  proposed_qualification_updates: Partial<QualificationState>;
  next_conversation_state: ConversationState;
  next_completion_state: CompletionState;
  should_end_call: boolean;
}

export interface ConversationHistoryMessage {
  role: 'agent' | 'user';
  text: string;
}

const V2_SYSTEM_INSTRUCTION = `
You are Rohan, an articulate, courteous, and top-performing Senior Real Estate Consultant for Divyasree Developers representing "Whispers of the Wind", an exclusive 38-acre private valley plotted community near Nandi Hills, North Bangalore.

# YOUR CONVERSATIONAL PERSONA:
- Speak naturally and warmly like a world-class luxury property advisor, not like a scripted robot or survey taker.
- Use natural transitional affirmations: "Understood", "Certainly", "That makes great sense", "I appreciate you sharing that".
- Sound consultative, executive, and non-intrusive.
- Mirror the prospect's language: speak fluent English for English speakers, and natural, polite Hindi for Hindi/Hinglish speakers.

# THE 4 QUALIFICATION CHECKPOINTS (Ensure all 4 are covered across the call):
1. Intent: Self-use / family weekend retreat vs. long-term land investment.
2. Geography: Comfort with the Nandi Hills / Devanahalli airport corridor (20 mins from airport).
3. Source Budget: ALWAYS anchor upfront with exact numbers: "Our luxury villa plots start from ₹92.4 lakh up to ₹2.46 crore — is that starting price range comfortable for you?" (Never ask open-ended budget without stating ₹92.4L - ₹2.46 Cr).
4. Timeline: Comfort with ongoing phased development delivering by December 2029.

# HANDLING LOWER BUDGETS (e.g. ₹70L - ₹80L):
- Never be dismissive. Acknowledge with respect: Explain that while starting price is ₹92.4 lakh inclusive of taxes, Divyasree offers milestone-linked payment schedules across construction phases, and offer to have a senior Property Expert share the payment plan.

# INTERRUPTION & CHECKPOINT RECOVERY:
- If the user interrupted your previous turn or asked a side question (e.g. ROI, kids play areas, clubhouse), answer the question FIRST, and then smoothly resume asking the next unqualified checkpoint.
- Never assume a question was heard or answered if the turn was cut off mid-speech.

# HANDLING "HOW DID YOU GET MY NUMBER?":
- Calmly and reassuringly answer: "You had previously registered interest in premium real estate / plotted communities in Bangalore through our digital inquiry channels, so I am following up with our curated private valley release at Whispers of the Wind. Do you have a quick minute?"

# HANDLING "WHERE IS THE LOCATION?" (Always ask comfort after describing):
- If the prospect asks where the project is located, describe the location clearly: "Whispers of the Wind is tucked in a private valley at the foothills of Nandi Hills, just 20 minutes from the Kempegowda International Airport. Are you comfortable with this North Bangalore corridor?"
- Only mark location_fit as "fit" once the prospect confirms they are comfortable with the location.

# STRICT PROJECT FACT TRUTHFULNESS & ANTI-HALLUCINATION:
- NEVER invent unverified dates, early phase years (e.g. 2024, 2027), or fake features.
- Official Completion Timeline: The phased development delivers in December 2029 (RERA compliant).
- If the customer asks a specific question not covered in the verified project facts (e.g. exact unannounced phase handovers, custom construction bylaws), DO NOT guess. Be candid and helpful:
  "I am not entirely certain about that specific detail, but I can have our senior Property Expert clarify that for you along with the masterplan. What time suits you for a quick call?"
  (Only use this when you are genuinely unsure about a specific customer inquiry, not on routine FAQs).

# THE ASPIRATIONAL PITCH:
- Describe the unique "Private Valley" sanctuary: 38 secluded acres at the foothills of Nandi Hills with 74% open greenery, organic farming zones, nature trails, and a 20,000 sq.ft. signature luxury clubhouse.

# THE PRIMARY CTA:
- Request a convenient time for a follow-up consultation with a senior Property Expert to share the masterplan brochure and discuss plot selections.
- When asking the CTA (e.g. "Would tomorrow morning or afternoon work better?"), DO NOT set should_end_call to true. Wait for the customer's response first!
- Only set should_end_call to true AFTER the customer gives their preferred time and you give the final warm goodbye ("Wonderful, I've noted that down. Our expert will call you tomorrow morning. Have a great day!").

# CRITICAL CONVERSATIONAL RULES:
- Never repeat a question if the user already provided the answer.
- Answer any question the user asks FIRST before advancing the flow.
- Keep each spoken response natural, engaging, and conversational (around 1-3 fluid spoken sentences).
`;

/**
 * Generates an adaptive, human-like turn plan using Gemini Flash Lite with deterministic fallback
 */
export async function planConversationalTurn(
  history: ConversationHistoryMessage[],
  qualificationState: QualificationState,
  conversationState: ConversationState,
  completionState: CompletionState,
  latestUserUtterance: string
): Promise<V2TurnPlan> {
  // Step 1: Analyze user intent deterministically
  const intentAnalysis: UserIntentAnalysis = analyzeUserIntent(latestUserUtterance, qualificationState);

  // Immediate handling for Do-Not-Contact / Hard Exit
  if (intentAnalysis.primary_intent === 'STOP_OR_DO_NOT_CONTACT') {
    const isCallback = intentAnalysis.extracted_dimension.permission === 'callback_requested';
    return {
      reply: isCallback
        ? "I completely understand you are busy right now. I will make sure our Property Expert reaches out at a more convenient time. Have a wonderful day!"
        : "I sincerely apologize for disturbing you. I have marked your contact to not receive further calls from us. Have a good day.",
      tone: 'calm',
      user_intent: intentAnalysis.primary_intent,
      proposed_qualification_updates: intentAnalysis.extracted_dimension,
      next_conversation_state: 'closing',
      next_completion_state: isCallback ? 'COMPLETED' : 'DO_NOT_CONTACT',
      should_end_call: true
    };
  }

  // Step 2: Check for direct project FAQ match
  const directFaqAnswer = queryProjectFAQ(latestUserUtterance);

  // Compute missing checkpoints in strict logical order
  const missingCheckpoints: string[] = [];
  if (!qualificationState.intent) missingCheckpoints.push('1. Intent (Weekend retreat vs Investment)');
  if (!qualificationState.location_fit) missingCheckpoints.push('2. Geography (Comfort with Nandi Hills corridor: "Are you comfortable with this corridor in North Bangalore?")');
  if (!qualificationState.budget_fit) missingCheckpoints.push('3. Budget (Anchor ₹92.4L to ₹2.46 Cr: "Our plots start from ₹92.4 lakh up to ₹2.46 crore — is that starting range comfortable for you?")');
  if (!qualificationState.timeline_fit) missingCheckpoints.push('4. Timeline (December 2029 Delivery: "Does December 2029 timeline align with your plans?")');

  const nextTargetCheckpoint = missingCheckpoints[0] || null;

  // Step 3: Invoke Gemini for dynamic turn reasoning
  if (CONFIG.GEMINI_API_KEY) {
    try {
      const promptContext = `
CURRENT QUALIFICATION STATE (Application-Owned):
${JSON.stringify(qualificationState, null, 2)}

NEXT CHECKPOINT TO QUALIFY NOW:
${nextTargetCheckpoint ? `👉 FOCUS ON: ${nextTargetCheckpoint}` : "🎉 All 4 checkpoints covered! Proceed to Aspirational Pitch & Senior Expert Consultation CTA."}

REMAINING UNQUALIFIED CHECKPOINTS TO COVER ACROSS THE CALL:
${missingCheckpoints.length > 0 ? missingCheckpoints.join('\n') : "None (All 4 complete)"}

CURRENT CONVERSATION STATE: ${conversationState}
CURRENT COMPLETION STATE: ${completionState}

DETERMINISTIC INTENT ANALYSIS:
${JSON.stringify(intentAnalysis, null, 2)}

VERIFIED PROJECT FAQ HIT (If any):
${directFaqAnswer ? `"${directFaqAnswer}"` : "None"}

CONVERSATION HISTORY:
${history.map(m => `${m.role.toUpperCase()}: ${m.text}`).join('\n')}

LATEST USER UTTERANCE:
"${latestUserUtterance}"

TASK INSTRUCTIONS:
1. If the user asked a question (e.g. ROI, amenities, how did you get my number, speak in Hindi), answer it FIRST with confidence.
2. DO NOT SKIP ANY CHECKPOINT:
   - If Geography is pending: Describe the private valley at the foothills of Nandi Hills (20 mins from airport) and EXPLICITLY ASK: "Are you comfortable with this corridor in North Bangalore?"
   - If Budget is pending: Anchor upfront: "Our luxury villa plots start from ₹92.4 lakh up to ₹2.46 crore — is that starting price range comfortable for you?"
   - If Timeline is pending: Check: "Our phased development is scheduled for completion by December 2029 — does that timeline align with your plans?"
3. NEVER mark location_fit as "fit" unless the user explicitly confirmed they are okay with Nandi Hills / North Bangalore.
4. Keep the response natural, warm, and consultative (1-3 fluid spoken sentences).
`;

      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${CONFIG.GEMINI_MODEL}:generateContent?key=${CONFIG.GEMINI_API_KEY}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ role: 'user', parts: [{ text: promptContext }] }],
            systemInstruction: { parts: [{ text: V2_SYSTEM_INSTRUCTION }] },
            generationConfig: {
              temperature: 0.3,
              maxOutputTokens: 600,
              responseMimeType: 'application/json',
              responseSchema: {
                type: 'OBJECT',
                properties: {
                  reply: { type: 'STRING' },
                  tone: { type: 'STRING', enum: ['warm', 'empathetic', 'confident', 'curious', 'calm', 'reassuring', 'concise', 'professional'] },
                  user_intent: { type: 'STRING' },
                  proposed_qualification_updates: {
                    type: 'OBJECT',
                    properties: {
                      intent: { type: 'STRING', enum: ['self_use', 'investment', 'both', 'unclear'] },
                      location_fit: { type: 'STRING', enum: ['fit', 'not_fit', 'neutral'] },
                      budget_fit: { type: 'STRING', enum: ['fit', 'below_budget', 'flexible'] },
                      timeline_fit: { type: 'STRING', enum: ['fit', 'immediate_needed', 'flexible'] },
                      language: { type: 'STRING', enum: ['en-IN', 'hi-IN', 'hinglish'] },
                      handoff_requested: { type: 'BOOLEAN' }
                    }
                  },
                  next_conversation_state: {
                    type: 'STRING',
                    enum: ['permission', 'discovering', 'qualifying', 'pitching', 'answering_question', 'handling_objection', 'cta', 'closing']
                  },
                  next_completion_state: {
                    type: 'STRING',
                    enum: ['NOT_COMPLETE', 'READY_TO_CLOSE', 'COMPLETED', 'DO_NOT_CONTACT']
                  },
                  should_end_call: { type: 'BOOLEAN' }
                },
                required: ['reply', 'tone', 'user_intent', 'proposed_qualification_updates', 'next_conversation_state', 'next_completion_state', 'should_end_call']
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
          
          const parsed = JSON.parse(rawJson) as V2TurnPlan;
          
          // Strict application governance: only update state dimensions that have evidence
          const safeUpdates: Partial<QualificationState> = {};
          if (intentAnalysis.extracted_dimension.language) safeUpdates.language = intentAnalysis.extracted_dimension.language;
          if (intentAnalysis.extracted_dimension.permission) safeUpdates.permission = intentAnalysis.extracted_dimension.permission;
          if (intentAnalysis.extracted_dimension.intent) safeUpdates.intent = intentAnalysis.extracted_dimension.intent;
          if (intentAnalysis.extracted_dimension.location_fit) safeUpdates.location_fit = intentAnalysis.extracted_dimension.location_fit;
          if (intentAnalysis.extracted_dimension.budget_fit) safeUpdates.budget_fit = intentAnalysis.extracted_dimension.budget_fit;
          if (intentAnalysis.extracted_dimension.timeline_fit) safeUpdates.timeline_fit = intentAnalysis.extracted_dimension.timeline_fit;
          if (intentAnalysis.extracted_dimension.handoff_requested) safeUpdates.handoff_requested = intentAnalysis.extracted_dimension.handoff_requested;

          // If Gemini also extracted intent/location that wasn't in deterministic keywords, allow only if relevant
          if (parsed.proposed_qualification_updates.intent && !qualificationState.intent) {
            safeUpdates.intent = parsed.proposed_qualification_updates.intent;
          }
          if (parsed.proposed_qualification_updates.location_fit && !qualificationState.location_fit) {
            safeUpdates.location_fit = parsed.proposed_qualification_updates.location_fit;
          }

          // Strict Programmatic Guard: Never end call while asking a question
          let finalShouldEndCall = parsed.should_end_call;
          let finalCompletionState = parsed.next_completion_state;
          if (parsed.reply.trim().endsWith('?') && parsed.user_intent !== 'STOP_OR_DO_NOT_CONTACT') {
            finalShouldEndCall = false;
            if (finalCompletionState === 'COMPLETED') {
              finalCompletionState = 'READY_TO_CLOSE';
            }
          }

          return {
            ...parsed,
            should_end_call: finalShouldEndCall,
            next_completion_state: finalCompletionState,
            proposed_qualification_updates: safeUpdates
          };
        }
      }
    } catch (err) {
      console.warn('Gemini V2 planning error, falling back to deterministic planner:', err);
    }
  }

  // Deterministic Fallback Planner
  return generateDeterministicV2Plan(qualificationState, intentAnalysis, directFaqAnswer);
}

/**
 * High-quality deterministic fallback plan generator following the 4 checkpoints + pitch + CTA
 */
function generateDeterministicV2Plan(
  state: QualificationState,
  intentAnalysis: UserIntentAnalysis,
  faqAnswer: string | null
): V2TurnPlan {
  const isHindi = state.language === 'hi-IN';
  const mergedState: QualificationState = {
    ...state,
    ...intentAnalysis.extracted_dimension
  };

  // Direct FAQ Answer
  if (faqAnswer) {
    return {
      reply: faqAnswer + " Would you like to know more about the masterplan or our private site visits this weekend?",
      tone: 'confident',
      user_intent: 'DIRECT_QUESTION',
      proposed_qualification_updates: intentAnalysis.extracted_dimension,
      next_conversation_state: 'answering_question',
      next_completion_state: 'NOT_COMPLETE',
      should_end_call: false
    };
  }

  // Location Mismatch
  if (intentAnalysis.extracted_dimension.location_fit === 'not_fit') {
    return {
      reply: isHindi
        ? "समझ गया, नंदी हिल्स आपके लिए दूर हो सकता है। यह प्रोजेक्ट विशेष रूप से शांत वीकेंड वैली रिट्रीट के लिए है। क्या आप चाहेंगे कि हम ईस्ट बैंगलोर के किसी प्रोजेक्ट के लिए आपकी जानकारी नोट कर लें?"
        : "Understood, I completely realize Nandi Hills may be farther than you'd prefer if you are strictly focused on East Bangalore. Would you like me to keep your contact on file for future releases in that corridor?",
      tone: 'empathetic',
      user_intent: 'OBJECTION',
      proposed_qualification_updates: intentAnalysis.extracted_dimension,
      next_conversation_state: 'handling_objection',
      next_completion_state: 'READY_TO_CLOSE',
      should_end_call: false
    };
  }

  // Budget Mismatch
  if (intentAnalysis.extracted_dimension.budget_fit === 'below_budget') {
    return {
      reply: isHindi
        ? "समझ गया। व्हिस्पर्स ऑफ द विंड में हमारे विला प्लॉट्स 92.4 लाख से शुरू होते हैं। मैं आपकी जानकारी नोट कर लेता हूँ ताकि अगर कोई छोटा प्लॉट उपलब्ध हो तो आपको सूचित किया जा सके।"
        : "Understood. Our private villa plots start at ₹92.4 lakh. I'll make sure to note your preferences in case we release any smaller configurations in the future.",
      tone: 'empathetic',
      user_intent: 'OBJECTION',
      proposed_qualification_updates: intentAnalysis.extracted_dimension,
      next_conversation_state: 'handling_objection',
      next_completion_state: 'READY_TO_CLOSE',
      should_end_call: false
    };
  }

  // Follow 4 Checkpoints + Pitch + CTA
  // 1. Intent Checkpoint
  if (!mergedState.intent) {
    return {
      reply: isHindi
        ? "व्हिस्पर्स ऑफ द विंड नंदी हिल्स के पास 38 एकड़ का खूबसूरत वैली प्रोजेक्ट है। क्या आप इसे परिवार के वीकेंड होम के लिए देख रहे हैं या निवेश के लिए?"
        : "Thank you! Whispers of the Wind is our 38-acre private valley sanctuary nestled near Nandi Hills. Are you exploring this primarily as a peaceful family weekend retreat, or as a long-term investment?",
      tone: 'warm',
      user_intent: 'QUALIFICATION_ANSWER',
      proposed_qualification_updates: intentAnalysis.extracted_dimension,
      next_conversation_state: 'qualifying',
      next_completion_state: 'NOT_COMPLETE',
      should_end_call: false
    };
  }

  // 2. Geography Checkpoint
  if (!mergedState.location_fit) {
    return {
      reply: isHindi
        ? "परफेक्ट! यह प्रोजेक्ट एयरपोर्ट से सिर्फ 20 मिनट की दूरी पर नंदी वैली में स्थित है। क्या नंदी हिल्स का यह शांत लोकेशन आपके लिए आरामदायक रहेगा?"
        : "Perfect! The community is located in Nandi Valley, about 20 minutes from the airport with scenic hill panoramas. Are you comfortable with the Nandi Hills corridor?",
      tone: 'warm',
      user_intent: 'QUALIFICATION_ANSWER',
      proposed_qualification_updates: intentAnalysis.extracted_dimension,
      next_conversation_state: 'qualifying',
      next_completion_state: 'NOT_COMPLETE',
      should_end_call: false
    };
  }

  // 3. Budget Checkpoint
  if (!mergedState.budget_fit) {
    return {
      reply: isHindi
        ? "शानदार! हमारे प्रीमियम विला प्लॉट्स ₹92.4 लाख से शुरू होकर ₹2.46 करोड़ तक हैं। क्या यह बजट रेंज आपकी प्लानिंग के हिसाब से सही बैठती है?"
        : "Understood! Our private villa plots start from around ₹92.4 lakh inclusive of taxes. Would that starting price fit comfortably within what you have in mind?",
      tone: 'confident',
      user_intent: 'QUALIFICATION_ANSWER',
      proposed_qualification_updates: intentAnalysis.extracted_dimension,
      next_conversation_state: 'qualifying',
      next_completion_state: 'NOT_COMPLETE',
      should_end_call: false
    };
  }

  // 4. Timeline Checkpoint
  if (!mergedState.timeline_fit) {
    return {
      reply: isHindi
        ? "बिल्कुल। व्हिस्पर्स ऑफ द विंड का पजेशन दिसंबर 2029 तक तय किया गया है। क्या यह टाइमलाइन आपकी प्लानिंग के अनुकूल है?"
        : "Certainly. Scheduled possession is in December 2029 as part of our phased masterplan. Does that timeline align with your expectations?",
      tone: 'professional',
      user_intent: 'QUALIFICATION_ANSWER',
      proposed_qualification_updates: intentAnalysis.extracted_dimension,
      next_conversation_state: 'qualifying',
      next_completion_state: 'NOT_COMPLETE',
      should_end_call: false
    };
  }

  // 5. The Pitch + CTA
  if (!mergedState.handoff_requested) {
    return {
      reply: isHindi
        ? "व्हिस्पर्स ऑफ द विंड में 74% खुली हरियाली, 20,000 वर्ग फुट का सिग्नेचर क्लब हाउस और ऑर्गेनिक फार्मिंग जोन हैं। क्या आप चाहेंगे कि हमारे सीनियर प्रॉपर्टी एक्सपर्ट आपको कॉल करके मास्टरप्लान समझाएं?"
        : "Whispers of the Wind offers a unique private valley lifestyle with 74% open green spaces, organic farming zones, and a 20,000 square foot luxury clubhouse. Would you like me to arrange a brief follow-up consultation with our senior Property Expert to walk you through the masterplan?",
      tone: 'warm',
      user_intent: 'QUALIFICATION_ANSWER',
      proposed_qualification_updates: intentAnalysis.extracted_dimension,
      next_conversation_state: 'cta',
      next_completion_state: 'READY_TO_CLOSE',
      should_end_call: false
    };
  }

  // Closing
  return {
    reply: isHindi
      ? "आपसे बात करके बहुत अच्छा लगा। मैंने आपकी जानकारी नोट कर ली है और हमारे एक्सपर्ट जल्द ही आपसे संपर्क करेंगे। अपना ख्याल रखें, नमस्ते और अलविदा!"
      : "Thank you so much for your time today! I have noted all your preferences and our Property Expert will connect with you shortly. Take care, have a wonderful day, and goodbye!",
    tone: 'warm',
    user_intent: 'SMALL_TALK',
    proposed_qualification_updates: intentAnalysis.extracted_dimension,
    next_conversation_state: 'closing',
    next_completion_state: 'COMPLETED',
    should_end_call: true
  };
}
