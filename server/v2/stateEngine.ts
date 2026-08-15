/**
 * V2 Three-Tier State Machine & Intent Priority Engine
 * Separates Qualification State (Application-Owned), Conversation State, and Completion State.
 * Ensures User Intent ALWAYS overrides the sales flow.
 */

export interface QualificationState {
  intent: 'self_use' | 'investment' | 'both' | 'unclear' | null;
  location_fit: 'fit' | 'not_fit' | 'neutral' | null;
  budget_fit: 'fit' | 'below_budget' | 'flexible' | null;
  timeline_fit: 'fit' | 'immediate_needed' | 'flexible' | null;
  lead_temperature: 'hot' | 'warm' | 'cold' | 'callback' | 'do_not_contact';
  lead_classification: 'HOT' | 'WARM' | 'COLD' | 'CALLBACK' | 'DO_NOT_CONTACT';
  objections: string[];
  handoff_requested: boolean;
  language: 'en-IN' | 'hi-IN' | 'hinglish';
  turns_count: number;
  total_duration_seconds: number;
  permission: 'granted' | 'denied' | 'callback_requested' | null;
}

export type ConversationState = 
  | 'permission'
  | 'discovering'
  | 'answering_question'
  | 'qualifying'
  | 'handling_objection'
  | 'explaining_project'
  | 'pitching'
  | 'cta'
  | 'closing';

export type CompletionState = 
  | 'NOT_COMPLETE'
  | 'READY_TO_CLOSE'
  | 'COMPLETED'
  | 'DO_NOT_CONTACT';

export type UserIntentType =
  | 'STOP_OR_DO_NOT_CONTACT'
  | 'DIRECT_QUESTION'
  | 'CORRECTION_OR_CLARIFICATION'
  | 'OBJECTION'
  | 'NEW_INFORMATION'
  | 'REQUEST_FOR_DETAILS'
  | 'QUALIFICATION_ANSWER'
  | 'SMALL_TALK'
  | 'UNCLEAR';

export interface UserIntentAnalysis {
  primary_intent: UserIntentType;
  extracted_dimension: Partial<QualificationState>;
  question_topic?: string;
  is_correction: boolean;
}

/**
 * Initializes a clean 3-tier state instance for a new call session
 */
export function createInitialV2State(): {
  qualification: QualificationState;
  conversation: ConversationState;
  completion: CompletionState;
} {
  return {
    qualification: {
      intent: null,
      location_fit: null,
      budget_fit: null,
      timeline_fit: null,
      lead_temperature: 'warm',
      lead_classification: 'WARM',
      objections: [],
      handoff_requested: false,
      language: 'en-IN',
      turns_count: 0,
      total_duration_seconds: 0,
      permission: null
    },
    conversation: 'permission',
    completion: 'NOT_COMPLETE'
  };
}

/**
 * Deterministic Intent Priority Engine
 * Analyzes user utterance and determines the highest-priority intent that MUST be handled first.
 */
export function analyzeUserIntent(text: string, currentState: QualificationState): UserIntentAnalysis {
  const lower = text.toLowerCase().trim();
  const extracted: Partial<QualificationState> = {};

  // 1. Dynamic Language Detection
  const devanagariMatches = (text.match(/[\u0900-\u097F]/g) || []).length;
  const isExplicitHindi = devanagariMatches >= 2 || /\b(namaste|kaise|aap|bataiye|kya|mujhe|chahiye|nahi|theek|kaun|hai|tu|batao|kahan|kisne|kripya|bol|baat|ghar|zameen|bhai)\b/i.test(lower);
  const isExplicitEnglish = /[a-zA-Z]{3,}/.test(text) && devanagariMatches === 0 && !isExplicitHindi;

  if (isExplicitHindi) {
    extracted.language = 'hi-IN';
  } else if (isExplicitEnglish) {
    extracted.language = 'en-IN';
  }

  // Priority 1: STOP / DO-NOT-CONTACT / CALL BACK LATER
  if (lower.includes('stop calling') || lower.includes("don't call") || lower.includes('dont call') || lower.includes('remove my number') || lower.includes('wrong number') || lower.includes('not interested') || lower.includes('shut up') || lower.includes('police') || lower.includes('scam') || lower.includes('harass')) {
    extracted.permission = 'denied';
    extracted.lead_temperature = 'do_not_contact';
    extracted.lead_classification = 'DO_NOT_CONTACT';
    return {
      primary_intent: 'STOP_OR_DO_NOT_CONTACT',
      extracted_dimension: extracted,
      is_correction: false
    };
  }

  if (lower.includes('busy') || lower.includes('in a meeting') || lower.includes('call back later') || lower.includes('call later') || lower.includes('driving') || lower.includes('cannot talk')) {
    extracted.permission = 'callback_requested';
    extracted.lead_temperature = 'callback';
    extracted.lead_classification = 'CALLBACK';
    return {
      primary_intent: 'STOP_OR_DO_NOT_CONTACT',
      extracted_dimension: extracted,
      is_correction: false
    };
  }

  // Priority 2: NUMBER SOURCE / PRIVACY INQUIRY (e.g. "Who gave you my number?", "How did you get this?")
  const isNumberSourceQuery = lower.includes('who gave') || lower.includes('how did you get') || lower.includes('where did you get') || lower.includes('got my number') || lower.includes('gave you my number') || lower.includes('get my number') || lower.includes('kahan se') || lower.includes('kisne diya') || lower.includes('number first');
  if (isNumberSourceQuery) {
    return {
      primary_intent: 'DIRECT_QUESTION',
      extracted_dimension: extracted,
      question_topic: 'number_source',
      is_correction: false
    };
  }

  // Final Closing / Small Talk / Goodbye Check
  if (lower === 'thank you' || lower === 'thanks' || lower === 'bye' || lower === 'goodbye' || lower === 'take care' || lower.includes('thanks bye') || lower.includes('thank you bye') || lower.includes('dhanyawad') || lower.includes('shukriya')) {
    return {
      primary_intent: 'SMALL_TALK',
      extracted_dimension: extracted,
      is_correction: false
    };
  }

  // Priority 2: DIRECT QUESTION (Price, Location, Clubhouse, Possession, Developer/Identity)
  const isPriceQuery = lower.includes('price') || lower.includes('cost') || lower.includes('costing') || lower.includes('rate') || lower.includes('how much') || lower.includes('kitna');
  const isLocationQuery = lower.includes('where') || lower.includes('location') || lower.includes('how far') || lower.includes('distance') || lower.includes('airport');
  const isClubhouseQuery = lower.includes('clubhouse') || lower.includes('amenities') || lower.includes('facilities') || lower.includes('pool') || lower.includes('gym');
  const isPossessionQuery = lower.includes('when') || lower.includes('possession') || lower.includes('ready to move') || lower.includes('timeline');
  const isSizeQuery = lower.includes('size') || lower.includes('sizes') || lower.includes('sqft') || lower.includes('square feet') || lower.includes('plot size');
  const isWhoQuery = lower.includes('who are you') || lower.includes('who is this') || lower.includes('which company') || lower.includes('developer') || lower.includes('kaun') || lower.includes('tu hai') || lower.includes('aap kaun');

  if (isPriceQuery || isLocationQuery || isClubhouseQuery || isPossessionQuery || isSizeQuery || isWhoQuery) {
    let topic = 'general';
    if (isPriceQuery) topic = 'pricing';
    if (isLocationQuery) topic = 'location';
    if (isClubhouseQuery) topic = 'amenities';
    if (isPossessionQuery) topic = 'timeline';
    if (isSizeQuery) topic = 'sizes';
    if (isWhoQuery) topic = 'developer';

    return {
      primary_intent: 'DIRECT_QUESTION',
      extracted_dimension: extracted,
      question_topic: topic,
      is_correction: false
    };
  }

  // Priority 3: CORRECTION / CLARIFICATION (e.g. "No, I'm in Whitefield", "I meant weekend home")
  const isCorrection = lower.startsWith('no,') || lower.startsWith('no ') || lower.includes('i mean') || lower.includes('i meant') || lower.includes('actually');
  
  // Extract explicit location preferences
  if (lower.includes('whitefield') || lower.includes('sarjapur') || lower.includes('south bangalore') || lower.includes('east bangalore') || lower.includes('too far')) {
    extracted.location_fit = 'not_fit';
    if (!currentState.objections.includes('location_mismatch')) {
      extracted.objections = [...currentState.objections, 'location_mismatch'];
    }
    return {
      primary_intent: isCorrection ? 'CORRECTION_OR_CLARIFICATION' : 'OBJECTION',
      extracted_dimension: extracted,
      is_correction: true
    };
  }

  // Priority 4: OBJECTION (Budget mismatch, lower budget request, numerical parsing)
  const lakhMatch = lower.match(/(\d+(?:\.\d+)?)\s*(?:lakh|lacs|lac|l\b)/i);
  const croreMatch = lower.match(/(\d+(?:\.\d+)?)\s*(?:crore|cr|crores)/i);

  let parsedBudgetFit: 'fit' | 'below_budget' | 'above_budget' | null = null;
  if (croreMatch) {
    const crVal = parseFloat(croreMatch[1]);
    if (crVal >= 0.92) parsedBudgetFit = 'fit';
  } else if (lakhMatch) {
    const lakhVal = parseFloat(lakhMatch[1]);
    if (lakhVal >= 92) {
      parsedBudgetFit = 'fit';
    } else {
      parsedBudgetFit = 'below_budget';
    }
  }

  const isLowerBudgetQuery = 
    parsedBudgetFit === 'below_budget' ||
    lower.includes('lower') || lower.includes('less') || lower.includes('cheaper') || 
    lower.includes('discount') || lower.includes('too expensive') || lower.includes('expensive') || 
    lower.includes('negotiat') || lower.includes('budget is only') || lower.includes('a bit lower') ||
    lower.includes('needle');

  if (isLowerBudgetQuery) {
    extracted.budget_fit = 'below_budget';
    if (!currentState.objections.includes('budget_mismatch')) {
      extracted.objections = [...currentState.objections, 'budget_mismatch'];
    }
    return {
      primary_intent: 'OBJECTION',
      extracted_dimension: extracted,
      is_correction: isCorrection
    };
  }

  // Priority 5: Explicit Content-Based Intent Extractions
  const isWeekend = lower.includes('weekend') || lower.includes('self use') || lower.includes('self-use') || lower.includes('living') || lower.includes('family') || lower.includes('stay') || lower.includes('personal') || lower.includes('live there') || lower.includes('holiday');
  const isInvest = lower.includes('invest') || lower.includes('long term') || lower.includes('long-term') || lower.includes('longterm') || lower.includes('roi') || lower.includes('returns') || lower.includes('appreciation') || lower.includes('portfolio') || lower.includes('capital growth') || lower.includes('land investment');
  
  if (lower.includes('both') || (isWeekend && isInvest)) {
    extracted.intent = 'both';
  } else if (isWeekend) {
    extracted.intent = 'self_use';
  } else if (isInvest) {
    extracted.intent = 'investment';
  }

  if ((lower.includes('nandi') || lower.includes('north bangalore') || lower.includes('airport') || lower.includes('valley')) && 
      (lower.includes('like') || lower.includes('love') || lower.includes('comfortable') || lower.includes('fine') || lower.includes('works') || lower.includes('good') || lower.includes('perfect') || lower.includes('ok') || lower.includes('prefer'))) {
    extracted.location_fit = 'fit';
  } else if (lower.includes('fine with north') || lower.includes('nandi hills is fine') || lower.includes('nandi hills works') || lower.includes('location is good') || lower.includes('location is fine') || lower.includes('location works') || lower.includes('location is comfortable')) {
    extracted.location_fit = 'fit';
  }

  if (parsedBudgetFit === 'fit' || lower.includes('fits budget') || lower.includes('within range') || lower.includes('in my budget') || lower.includes('budget fits') || lower.includes('works for me')) {
    extracted.budget_fit = 'fit';
  }

  // Timeline MUST be explicitly confirmed via timeline-specific words (e.g. 2029, possession) or sequential affirmation
  const hasTimelineMention = lower.includes('2029') || lower.includes('29 works') || lower.includes('fine with timeline') || lower.includes('timeline is fine') || lower.includes('delivery is fine') || lower.includes('possession in 2029') || lower.includes('phased timeline');
  if (hasTimelineMention) {
    extracted.timeline_fit = 'fit';
  } else if (lower.includes('immediate') || lower.includes('ready to move') || lower.includes('urgent') || lower.includes('earlier')) {
    extracted.timeline_fit = 'immediate_needed';
  }

  if (lower.includes('site visit') || lower.includes('visit') || lower.includes('saturday') || lower.includes('sunday') || lower.includes('send brochure') || lower.includes('expert to call') || lower.includes('senior to call') || lower.includes('call me') || lower.includes('connect expert') || lower.includes('arrange') || lower.includes('i am in') || lower.includes('count me in')) {
    extracted.handoff_requested = true;
  }

  // Robust Sequential Affirmation Resolver for clean answers (handles phonetic STT variants like "yesudas", "yes it does", "yes I am", "haan", etc.)
  const isCleanAffirmative = 
    /^(yes|yeah|yep|sure|works|fine|ok|okay|good|comfortable|perfect|haan|theek|sahi|definitely|yesudas)/i.test(lower) ||
    lower.startsWith('yes') || lower.startsWith('yeah') || lower.startsWith('yep') || lower.startsWith('sure') || lower.startsWith('haan') || lower.startsWith('theek') || lower.startsWith('ok') ||
    lower.includes('yes') || lower.includes('yeah') || lower.includes('sure') || lower.includes('works') || lower.includes('comfortable') || lower.includes('i am') || lower.includes('it does') || lower.includes('yesudas') || lower.includes('probably we can');

  if (isCleanAffirmative && !isLowerBudgetQuery) {
    if (!currentState.permission) {
      extracted.permission = 'granted';
    } else if (currentState.intent && !currentState.location_fit) {
      extracted.location_fit = 'fit';
    } else if (currentState.location_fit && !currentState.budget_fit) {
      extracted.budget_fit = 'fit';
    } else if (currentState.budget_fit && !currentState.timeline_fit) {
      extracted.timeline_fit = 'fit';
    } else if (currentState.timeline_fit && !currentState.handoff_requested) {
      extracted.handoff_requested = true;
    }
  }

  const hasAnyFitExtraction = extracted.intent || extracted.location_fit || extracted.budget_fit || extracted.timeline_fit || extracted.handoff_requested || extracted.permission;

  if (hasAnyFitExtraction) {
    return {
      primary_intent: isCorrection ? 'CORRECTION_OR_CLARIFICATION' : 'QUALIFICATION_ANSWER',
      extracted_dimension: extracted,
      is_correction: isCorrection
    };
  }

  if (lower.includes('tell me more') || lower.includes('what else') || lower.includes('explain')) {
    return {
      primary_intent: 'REQUEST_FOR_DETAILS',
      extracted_dimension: extracted,
      is_correction: false
    };
  }

  return {
    primary_intent: 'UNCLEAR',
    extracted_dimension: extracted,
    is_correction: false
  };
}

/**
 * Calculates Lead Classification Deterministically
 */
export function calculateV2LeadClassification(q: QualificationState): {
  classification: 'HOT' | 'WARM' | 'COLD' | 'CALLBACK' | 'DO_NOT_CONTACT';
  score: number;
  reason: string;
} {
  if (q.lead_temperature === 'do_not_contact' || q.permission === 'denied') {
    return { classification: 'DO_NOT_CONTACT', score: 0, reason: 'Lead explicitly asked not to be contacted' };
  }

  if (q.lead_temperature === 'callback' || q.permission === 'callback_requested') {
    return { classification: 'CALLBACK', score: 40, reason: 'Callback requested by lead' };
  }

  if (q.location_fit === 'not_fit' || q.budget_fit === 'below_budget') {
    return { classification: 'COLD', score: 25, reason: 'Hard mismatch in budget or location' };
  }

  let score = 50;
  if (q.permission === 'granted') score += 10;
  if (q.intent === 'self_use' || q.intent === 'investment' || q.intent === 'both') score += 15;
  if (q.location_fit === 'fit') score += 10;
  if (q.budget_fit === 'fit') score += 10;
  if (q.timeline_fit === 'fit' || q.timeline_fit === 'flexible') score += 5;
  if (q.handoff_requested) score += 10;

  if (score >= 80 && (q.location_fit === 'fit' || q.budget_fit === 'fit')) {
    return { classification: 'HOT', score, reason: 'High intent with location and budget alignment' };
  }

  return { classification: 'WARM', score, reason: 'Qualified prospect exploring valley options' };
}
