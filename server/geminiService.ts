import { CONFIG } from './config.js';
import { QualificationState, Checkpoint, getNextCheckpoint, extractDimensionsFromText } from './stateMachine.js';

export interface GeminiTurnResult {
  reply: string;
  state_updates: Partial<QualificationState>;
  next_checkpoint: Checkpoint;
  lead_temperature: 'hot' | 'warm' | 'cold' | 'callback' | 'do_not_contact';
  handoff_requested: boolean;
  should_end_call: boolean;
}

export interface ConversationMessage {
  role: 'agent' | 'user';
  text: string;
}

const SYSTEM_INSTRUCTION_TEXT = `
You are Rohan, an elite, consultative Senior Property Advisor for Divyasree Developers representing "Whispers of the Wind", an exclusive 38-acre private valley plotted development near Nandi Hills, North Bangalore.

# YOUR ROLE AS AN OUTBOUND ADVISOR:
You called the prospect. You must be proactive, engaging, warm, and conversational. Do NOT just interrogate them with repetitive questions. Explain and pitch the unique beauty and lifestyle of the project naturally throughout the dialogue.

# KEY PROPERTY HIGHLIGHTS:
- Developer: Divyasree Developers (30+ year legacy).
- Project: Whispers of the Wind — a private 38-acre valley sanctuary surrounded by nature.
- Location: Nandi Valley, adjacent to Nandi Hills & Devanahalli corridor, North Bangalore (~20 mins from Airport).
- Product: Premium villa plots (1,200 to 3,199 square feet) starting from ₹92.4 lakh up to ₹2.46 crore.
- USPs: 74% open green spaces, 20,000 sq.ft. signature clubhouse, organic farming zones, scenic hill panoramas, private valley seclusion.
- Possession: Phased development delivering by December 2029.

# CONVERSATIONAL PRINCIPLES:
1. DYNAMIC LANGUAGE MATCHING: ALWAYS reply in the EXACT language the user is speaking in their latest utterance. If the user speaks English, reply in English. If the user speaks Hindi, reply in Hindi/Hinglish. Never get stuck in Hindi if they switch to English.
2. PROACTIVE PITCH & CONSULTATIVE CHARM: 
   - When the user asks who you are or what the project is, give a captivating 1-sentence introduction of the private valley setting before asking your question.
   - If the user says "I am thinking", "Give me a second", or "Not sure", reassure them warmly (e.g. "Take your time! What most people love is the fresh air and 74% open greenery just 20 mins from the airport...") and offer a helpful detail.
3. CONCISE SPOKEN FLOW: Keep responses to 1 to 2 spoken sentences (max 3). Sound human, polished, and enthusiastic.
4. ONE CLEAR QUESTION AT A TIME: Guide the prospect through the 4 qualification dimensions (Intent -> Geography -> Budget -> Timeline -> Site Visit CTA) naturally without feeling like a rigid questionnaire.
5. NEVER sound robotic, and never start every turn with "Wonderful" or "Great".
`;

export async function generateAgentResponse(
  conversationHistory: ConversationMessage[],
  currentState: QualificationState,
  latestUserUtterance: string
): Promise<GeminiTurnResult> {
  // Extract deterministic dimensions from latest user utterance
  const extracted = extractDimensionsFromText(latestUserUtterance);
  
  // If user requested stop / callback, handle immediately
  if (extracted.lead_temperature === 'do_not_contact') {
    return {
      reply: "I completely understand and apologize for disturbing you. I'll make sure our team does not contact you again. Have a great day.",
      state_updates: extracted,
      next_checkpoint: 'COMPLETED',
      lead_temperature: 'do_not_contact',
      handoff_requested: false,
      should_end_call: true,
    };
  }

  if (extracted.lead_temperature === 'callback') {
    return {
      reply: "I completely understand you're busy right now. I will have our Property Expert reach out at a more convenient time. Have a wonderful day.",
      state_updates: extracted,
      next_checkpoint: 'COMPLETED',
      lead_temperature: 'callback',
      handoff_requested: true,
      should_end_call: true,
    };
  }

  // Call Gemini Flash Lite with structured schema
  if (CONFIG.GEMINI_API_KEY) {
    try {
      const promptContext = `
CURRENT QUALIFICATION STATE:
${JSON.stringify(currentState, null, 2)}

EXTRACTED FROM LATEST UTTERANCE:
${JSON.stringify(extracted, null, 2)}

CONVERSATION HISTORY:
${conversationHistory.map(m => `${m.role.toUpperCase()}: ${m.text}`).join('\n')}

LATEST USER UTTERANCE:
"${latestUserUtterance}"

TARGET NEXT CHECKPOINT: ${getNextCheckpoint({ ...currentState, ...extracted })}

Generate the next natural, consultative, conversational spoken response and state updates. Ensure language strictly matches the latest utterance.
`;

      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${CONFIG.GEMINI_MODEL}:generateContent?key=${CONFIG.GEMINI_API_KEY}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [
              {
                role: 'user',
                parts: [{ text: promptContext }]
              }
            ],
            systemInstruction: {
              parts: [{ text: SYSTEM_INSTRUCTION_TEXT }]
            },
            generationConfig: {
              temperature: 0.35,
              maxOutputTokens: 800,
              responseMimeType: 'application/json',
              responseSchema: {
                type: 'OBJECT',
                properties: {
                  reply: { type: 'STRING' },
                  state_updates: {
                    type: 'OBJECT',
                    properties: {
                      permission: { type: 'STRING', enum: ['granted', 'denied', 'callback_requested'] },
                      intent: { type: 'STRING', enum: ['self_use', 'investment', 'both', 'unclear'] },
                      location_fit: { type: 'STRING', enum: ['fit', 'not_fit', 'neutral'] },
                      budget_fit: { type: 'STRING', enum: ['fit', 'below_budget', 'flexible'] },
                      timeline_fit: { type: 'STRING', enum: ['fit', 'immediate_needed', 'flexible'] },
                      language: { type: 'STRING', enum: ['en-IN', 'hi-IN', 'hinglish'] }
                    }
                  },
                  next_checkpoint: { 
                    type: 'STRING', 
                    enum: ['PERMISSION', 'INTENT', 'GEOGRAPHY', 'BUDGET', 'TIMELINE', 'PITCH', 'CTA', 'COMPLETED'] 
                  },
                  lead_temperature: { 
                    type: 'STRING', 
                    enum: ['hot', 'warm', 'cold', 'callback', 'do_not_contact'] 
                  },
                  handoff_requested: { type: 'BOOLEAN' },
                  should_end_call: { type: 'BOOLEAN' }
                },
                required: ['reply', 'state_updates', 'next_checkpoint', 'lead_temperature', 'handoff_requested', 'should_end_call']
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
          const parsed = JSON.parse(rawJson) as GeminiTurnResult;
          const mergedUpdates = { ...parsed.state_updates, ...extracted };
          return {
            ...parsed,
            state_updates: mergedUpdates
          };
        }
      }
    } catch (err) {
      console.warn('Gemini API call warning, falling back to deterministic response generator:', err);
    }
  }

  // Deterministic Fallback Engine
  return generateDeterministicTurn(conversationHistory, currentState, latestUserUtterance, extracted);
}

/**
 * High-quality deterministic conversational engine used for offline testing or instant API fallback
 */
function generateDeterministicTurn(
  _history: ConversationMessage[],
  currentState: QualificationState,
  latestUserUtterance: string,
  extracted: Partial<QualificationState>
): GeminiTurnResult {
  const mergedState: QualificationState = {
    ...currentState,
    ...extracted
  };

  const next = getNextCheckpoint(mergedState);
  let reply = '';
  let shouldEnd = false;
  let handoff = false;

  // Check if Hindi is active
  const isHindi = mergedState.language === 'hi-IN';

  switch (next) {
    case 'PERMISSION':
      reply = isHindi
        ? "नमस्ते, मैं दिव्यश्री डेवलपर्स से रोहन बात कर रहा हूँ। नंदी हिल्स के पास हमारे नए विला प्लॉट प्रोजेक्ट 'व्हिस्पर ऑफ द विंड' के बारे में क्या आपके पास दो मिनट का समय है?"
        : "Hello, this is Rohan calling from Divyasree regarding Whispers of the Wind, our private valley community near Nandi Hills. I know I am catching you during the day — do you have a quick minute to speak?";
      break;

    case 'INTENT':
      reply = isHindi
        ? "यह नंदी वैली में 38 एकड़ का खूबसूरत वैली प्रोजेक्ट है। क्या आप इसे अपने परिवार के लिए एक वीकेंड होम के रूप में देख रहे हैं या निवेश के लिए?"
        : "Whispers of the Wind is our 38-acre private valley sanctuary nestled near Nandi Hills. Are you picturing this primarily as a family weekend retreat away from city traffic, or as a long-term investment?";
      break;

    case 'GEOGRAPHY':
      if (mergedState.intent === 'self_use') {
        reply = isHindi
          ? "यह प्रोजेक्ट एयरपोर्ट से सिर्फ 20 मिनट की दूरी पर नंदी वैली में स्थित है। क्या आपके वीकेंड होम के लिए नंदी हिल्स का यह शांत लोकेशन सही रहेगा?"
          : "The community is situated right in Nandi Valley, about 20 minutes from the airport with panoramic valley views. Are you comfortable with the Nandi Hills corridor for your weekend home?";
      } else {
        reply = isHindi
          ? "यह नॉर्थ बैंगलोर के तेजी से बढ़ते एयरपोर्ट कॉरिडोर में है। क्या यह लोकेशन आपके इन्वेस्टमेंट प्लान में फिट बैठती है?"
          : "It is strategically located along the North Bangalore airport corridor in Nandi Valley. Does that location align with your investment portfolio?";
      }
      break;

    case 'BUDGET':
      reply = isHindi
        ? "हमारे विला प्लॉट्स लगभग ₹92.4 लाख से शुरू होते हैं। क्या यह बजट रेंज आपके लिए आरामदायक रहेगी?"
        : "Our private villa plots start from around ₹92.4 lakh inclusive of taxes. Would that starting range fit comfortably within what you have in mind?";
      break;

    case 'TIMELINE':
      reply = isHindi
        ? "व्हिस्पर्स ऑफ द विंड का पजेशन दिसंबर 2029 तक तय किया गया है। क्या यह टाइमलाइन आपकी प्लानिंग के अनुकूल है?"
        : "Whispers of the Wind is an ongoing masterplanned development with scheduled possession by December 2029. Does that timeline align with your expectations?";
      break;

    case 'PITCH':
      reply = isHindi
        ? "इस प्रोजेक्ट में 74% खुली हरियाली, 20,000 वर्ग फुट का लक्ज़री क्लब हाउस और खूबसूरत नंदी हिल्स के दृश्य हैं।"
        : "Whispers of the Wind features 74% open green spaces, a 20,000 square foot luxury clubhouse, and panoramic hill views designed as a peaceful private sanctuary.";
      break;

    case 'CTA':
      reply = isHindi
        ? "क्या आप चाहेंगे कि हमारे सीनियर प्रॉपर्टी एक्सपर्ट आपको मास्टरप्लान शेयर करें और इस वीकेंड आपके लिए एक प्राइवेट साइट विजिट का प्रबंध करें?"
        : "Would you be interested in having our senior Property Expert share the complete masterplan and arrange an exclusive private site visit for you this weekend?";
      break;

    case 'COMPLETED':
    default:
      reply = isHindi
        ? "आपसे बात करके बहुत अच्छा लगा। मैंने आपकी जानकारी दर्ज कर ली है और हमारे एक्सपर्ट जल्द ही आपसे संपर्क करेंगे। आपका दिन शुभ हो!"
        : "Thank you so much for your time today. I have noted your preferences and our Property Expert will connect with you shortly. Have a wonderful day!";
      shouldEnd = true;
      handoff = true;
      break;
  }

  return {
    reply,
    state_updates: extracted,
    next_checkpoint: next,
    lead_temperature: mergedState.location_fit === 'not_fit' || mergedState.budget_fit === 'below_budget' ? 'cold' : 'hot',
    handoff_requested: handoff || !!mergedState.handoff_requested,
    should_end_call: shouldEnd
  };
}
