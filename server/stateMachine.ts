/**
 * Explicit Application-Level Qualification State Machine for Divyasree "Whispers of the Wind"
 */

export type PermissionStatus = 'granted' | 'denied' | 'callback_requested' | null;
export type IntentType = 'self_use' | 'investment' | 'both' | 'unclear' | null;
export type FitStatus = 'fit' | 'not_fit' | 'neutral' | 'below_budget' | 'immediate_needed' | 'flexible' | null;
export type LanguageCode = 'en-IN' | 'hi-IN' | 'hinglish';
export type LeadTemperature = 'hot' | 'warm' | 'cold' | 'callback' | 'do_not_contact';
export type LeadClassification = 'HOT' | 'WARM' | 'COLD' | 'CALLBACK' | 'DO_NOT_CONTACT';

export type Checkpoint = 
  | 'INTRO'
  | 'PERMISSION'
  | 'INTENT'
  | 'GEOGRAPHY'
  | 'BUDGET'
  | 'TIMELINE'
  | 'PITCH'
  | 'CTA'
  | 'COMPLETED';

export interface QualificationState {
  permission: PermissionStatus;
  intent: IntentType;
  location_fit: FitStatus;
  budget_fit: FitStatus;
  timeline_fit: FitStatus;
  language: LanguageCode;
  lead_temperature: LeadTemperature;
  lead_classification: LeadClassification;
  objections: string[];
  handoff_requested: boolean;
  conversation_complete: boolean;
  current_checkpoint: Checkpoint;
  turns_count: number;
  total_duration_seconds: number;
  user_persona?: {
    name: string;
    phone_masked: string;
    city: string;
  };
}

export function createInitialState(persona?: { name: string; phone_masked: string; city: string }): QualificationState {
  return {
    permission: null,
    intent: null,
    location_fit: null,
    budget_fit: null,
    timeline_fit: null,
    language: 'en-IN',
    lead_temperature: 'warm',
    lead_classification: 'WARM',
    objections: [],
    handoff_requested: false,
    conversation_complete: false,
    current_checkpoint: 'PERMISSION',
    turns_count: 0,
    total_duration_seconds: 0,
    user_persona: persona || {
      name: 'Arjun Mehta',
      phone_masked: '+91 98XXX-XX412',
      city: 'Bengaluru'
    }
  };
}

/**
 * Deterministic rules to extract dimensions from user text.
 * Serves as an immediate validation and backup to LLM output.
 */
export function extractDimensionsFromText(text: string): Partial<QualificationState> {
  const lower = text.toLowerCase();
  const updates: Partial<QualificationState> = {};

  // 1. Dynamic Language Mirroring (Seamless English <-> Hindi switching)
  const devanagariMatches = (text.match(/[\u0900-\u097F]/g) || []).length;
  const isExplicitHindi = devanagariMatches >= 2 || /(namaste|kaise|aap|bataiye|kya|mujhe|chahiye|nahi|theek)/i.test(lower);
  const isExplicitEnglish = /[a-zA-Z]{3,}/.test(text) && devanagariMatches === 0;

  if (isExplicitHindi) {
    updates.language = 'hi-IN';
  } else if (isExplicitEnglish) {
    updates.language = 'en-IN';
  }

  // 2. Permission / Hostility / Callback
  if (lower.includes('stop calling') || lower.includes("don't call") || lower.includes('dont call') || lower.includes('remove my number') || lower.includes('not interested') || lower.includes('wrong number')) {
    updates.permission = 'denied';
    updates.lead_temperature = 'do_not_contact';
    updates.lead_classification = 'DO_NOT_CONTACT';
    updates.conversation_complete = true;
    return updates;
  }

  if (lower.includes('busy') || lower.includes('in a meeting') || lower.includes('call back later') || lower.includes('call later') || lower.includes('driving') || lower.includes('cannot talk')) {
    updates.permission = 'callback_requested';
    updates.lead_temperature = 'callback';
    updates.lead_classification = 'CALLBACK';
    updates.conversation_complete = true;
    return updates;
  }

  if (lower.includes('yes') || lower.includes('sure') || lower.includes('go ahead') || lower.includes('tell me') || lower.includes('yeah') || lower.includes('okay') || lower.includes('ok') || lower.includes('haa') || lower.includes('haan') || lower.includes('हाँ') || lower.includes('हां') || lower.includes('बताइए') || lower.includes('जी')) {
    if (!updates.permission) {
      updates.permission = 'granted';
    }
  }

  // 3. Intent extraction (supports English & Hindi/Hinglish)
  const isWeekendHome = lower.includes('weekend') || lower.includes('वीकेंड') || lower.includes('self use') || lower.includes('self-use') || lower.includes('living') || lower.includes('holiday home') || lower.includes('stay') || lower.includes('vacation') || lower.includes('family') || lower.includes('फैमिली') || lower.includes('घर');
  const isInvestment = lower.includes('invest') || lower.includes('निवेश') || lower.includes('roi') || lower.includes('returns') || lower.includes('appreciation') || lower.includes('rental') || lower.includes('portfolio') || lower.includes('capital');

  if (isWeekendHome && isInvestment) {
    updates.intent = 'both';
  } else if (isWeekendHome) {
    updates.intent = 'self_use';
  } else if (isInvestment) {
    updates.intent = 'investment';
  }

  // 4. Geography / Location extraction (Check negative mismatch first)
  if (lower.includes('too far') || lower.includes('distant') || lower.includes('not comfortable') || lower.includes('only whitefield') || lower.includes('only sarjapur') || lower.includes('only south bangalore') || lower.includes('only east bangalore') || lower.includes('strictly looking in east') || lower.includes('hate north bangalore') || lower.includes('not comfortable with nandi') || lower.includes('not looking in north')) {
    updates.location_fit = 'not_fit';
  } else if (lower.includes('nandi') || lower.includes('नंदी') || lower.includes('north bangalore') || lower.includes('north bengaluru') || lower.includes('devanahalli') || lower.includes('airport') || lower.includes('valley')) {
    updates.location_fit = 'fit';
  }

  // 5. Budget extraction (supports English & Hindi/Hinglish)
  if (lower.includes('1.5 cr') || lower.includes('1.5 crore') || lower.includes('1.5 करोड़') || lower.includes('करोड़') || lower.includes('1 crore') || lower.includes('2 crore') || lower.includes('2 cr') || lower.includes('1 cr') || lower.includes('92 lakh') || lower.includes('92.4') || lower.includes('1.2 cr') || lower.includes('within range') || lower.includes('comfortable with price') || lower.includes('budget fits')) {
    updates.budget_fit = 'fit';
  } else if (lower.includes('40 lakh') || lower.includes('50 lakh') || lower.includes('30 lakh') || lower.includes('60 lakh') || lower.includes('40 लाख') || lower.includes('50 लाख') || lower.includes('too expensive') || lower.includes('below 90') || lower.includes('budget is 50')) {
    updates.budget_fit = 'below_budget';
  }

  // 6. Timeline extraction
  if (lower.includes('2029') || lower.includes('fine with timeline') || lower.includes('long term') || lower.includes('phased') || lower.includes('flexible') || lower.includes('no hurry') || lower.includes('2 to 3 years') || lower.includes('few years') || lower.includes('टाइमलाइन ঠিক') || lower.includes('टाइमलाइन')) {
    updates.timeline_fit = 'fit';
  } else if (lower.includes('immediate') || lower.includes('ready to move') || lower.includes('next month') || lower.includes('urgent possession')) {
    updates.timeline_fit = 'immediate_needed';
  }

  // 7. CTA / Handoff
  if (lower.includes('site visit') || lower.includes('connect') || lower.includes('expert') || lower.includes('property expert') || lower.includes('send brochure') || lower.includes('share details') || lower.includes('yes arrange') || lower.includes('call me') || lower.includes('साइट विजिट')) {
    updates.handoff_requested = true;
  }

  return updates;
}

/**
 * Calculates the next optimal checkpoint based on what is currently known,
 * guaranteeing we NEVER re-ask an already answered question.
 */
export function getNextCheckpoint(state: QualificationState): Checkpoint {
  if (state.conversation_complete || state.permission === 'denied' || state.permission === 'callback_requested') {
    return 'COMPLETED';
  }

  if (state.permission === null) {
    return 'PERMISSION';
  }

  if (state.intent === null) {
    return 'INTENT';
  }

  if (state.location_fit === null) {
    return 'GEOGRAPHY';
  }

  if (state.budget_fit === null) {
    return 'BUDGET';
  }

  if (state.timeline_fit === null) {
    return 'TIMELINE';
  }

  if (!state.handoff_requested && state.current_checkpoint !== 'CTA') {
    return 'PITCH';
  }

  if (state.current_checkpoint === 'PITCH') {
    return 'CTA';
  }

  return 'COMPLETED';
}

/**
 * Evaluates the full qualification state and produces the final deterministic lead classification.
 */
export function calculateLeadClassification(state: QualificationState): {
  classification: LeadClassification;
  temperature: LeadTemperature;
  summary: string;
} {
  if (state.permission === 'denied' || state.lead_temperature === 'do_not_contact') {
    return {
      classification: 'DO_NOT_CONTACT',
      temperature: 'do_not_contact',
      summary: 'Lead explicitly requested not to be contacted or displayed strong disinterest.'
    };
  }

  if (state.permission === 'callback_requested') {
    return {
      classification: 'CALLBACK',
      temperature: 'callback',
      summary: 'Lead was busy / requested a follow-up call at a later time.'
    };
  }

  if (state.location_fit === 'not_fit') {
    return {
      classification: 'COLD',
      temperature: 'cold',
      summary: 'Location mismatch: Lead is not comfortable with Nandi Hills / North Bengaluru corridor.'
    };
  }

  if (state.budget_fit === 'below_budget') {
    return {
      classification: 'COLD',
      temperature: 'cold',
      summary: 'Budget mismatch: Lead budget is below starting price of ₹92.4 lakh.'
    };
  }

  const isIntentFit = state.intent === 'self_use' || state.intent === 'investment' || state.intent === 'both';
  const isLocationFit = state.location_fit === 'fit';
  const isBudgetFit = state.budget_fit === 'fit';
  const isTimelineFit = state.timeline_fit === 'fit' || state.timeline_fit === 'flexible';

  if (isIntentFit && isLocationFit && isBudgetFit && isTimelineFit) {
    return {
      classification: 'HOT',
      temperature: 'hot',
      summary: `High Intent Lead (${state.intent}): Matches location (Nandi Hills), budget (₹92.4L+), and timeline (Dec 2029). Handoff ${state.handoff_requested ? 'scheduled' : 'recommended'}.`
    };
  }

  if (isIntentFit && (isLocationFit || isBudgetFit)) {
    return {
      classification: 'WARM',
      temperature: 'warm',
      summary: `Moderate Fit Lead (${state.intent}): Positive interest with minor questions on timeline or commercials.`
    };
  }

  return {
    classification: 'WARM',
    temperature: 'warm',
    summary: 'Lead engaged in qualification; further consultation with Property Expert recommended.'
  };
}
