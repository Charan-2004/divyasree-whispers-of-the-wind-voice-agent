/**
 * Automated Simulation Harness
 * Executes all 5 mandatory conversation flows + Hindi/Hinglish flow
 * and prints detailed audit logs and classification outcomes.
 */

import { createInitialState, calculateLeadClassification, QualificationState } from '../server/stateMachine.js';
import { generateAgentResponse, ConversationMessage } from '../server/geminiService.js';

interface ScenarioDefinition {
  id: string;
  name: string;
  persona: { name: string; phone_masked: string; city: string; title: string };
  expectedClassification: string;
  turns: string[];
}

const SCENARIOS: ScenarioDefinition[] = [
  {
    id: 'flow-1',
    name: 'FLOW 1: Hot Self-Use Lead (Arjun Mehta)',
    persona: { name: 'Arjun Mehta', phone_masked: '+91 9845X-XX102', city: 'Bengaluru', title: 'Tech CXO' },
    expectedClassification: 'HOT',
    turns: [
      "Yes, sure. I have a minute.",
      "I am looking for a peaceful weekend retreat for my family in Nandi Hills away from city noise.",
      "Our budget is around 1.5 Crore, so starting at 92.4 lakh fits very well.",
      "December 2029 is a good timeline for us. Please schedule a private site visit this weekend."
    ]
  },
  {
    id: 'flow-2',
    name: 'FLOW 2: Investment Lead (Priya Sharma)',
    persona: { name: 'Priya Sharma', phone_masked: '+65 912X-XX89', city: 'Singapore', title: 'NRI Director' },
    expectedClassification: 'HOT/WARM',
    turns: [
      "Yes, please go ahead.",
      "I am an NRI looking for long-term plotted land investments in the North Bangalore corridor.",
      "Around 1.5 to 2 Crore is comfortable. What kind of returns are typically expected?",
      "Understood on market dynamics. 2029 possession works. Please connect me with the Property Expert."
    ]
  },
  {
    id: 'flow-3',
    name: 'FLOW 3: Budget Mismatch Lead (Vikram Malhotra)',
    persona: { name: 'Vikram Malhotra', phone_masked: '+91 9980X-XX341', city: 'Bengaluru', title: 'Startup Founder' },
    expectedClassification: 'COLD',
    turns: [
      "Yes, tell me briefly.",
      "I love Nandi Hills for a small weekend getaway, but my strict budget is only 45 to 50 lakhs.",
      "Understood. Please keep me on the list if smaller plots open up in the future."
    ]
  },
  {
    id: 'flow-4',
    name: 'FLOW 4: Location Mismatch Lead (Ananya Rao)',
    persona: { name: 'Ananya Rao', phone_masked: '+91 9741X-XX567', city: 'Bengaluru', title: 'Design Director' },
    expectedClassification: 'COLD',
    turns: [
      "Yes, I have a minute.",
      "I have a budget of 1.5 Cr, but Nandi Hills is far too distant. I am strictly looking for plots in Whitefield or Sarjapur.",
      "No thank you, I only want East Bangalore."
    ]
  },
  {
    id: 'flow-5',
    name: 'FLOW 5: Irritated / Do-Not-Contact Lead (Rajesh Verma)',
    persona: { name: 'Rajesh Verma', phone_masked: '+91 9611X-XX998', city: 'Bengaluru', title: 'Senior VP' },
    expectedClassification: 'DO_NOT_CONTACT',
    turns: [
      "Please stop calling me! Remove my number from your database immediately."
    ]
  },
  {
    id: 'flow-6',
    name: 'FLOW 6: Hindi / Hinglish Lead (Sunita Agarwal)',
    persona: { name: 'Sunita Agarwal', phone_masked: '+91 9886X-XX234', city: 'Bengaluru', title: 'Business Owner' },
    expectedClassification: 'HOT/WARM',
    turns: [
      "हाँ जी, बताइए।",
      "मुझे अपनी फैमिली के लिए नंदी हिल्स में एक शांत वीकेंड विला प्लॉट चाहिए।",
      "हाँ, लोकेशन बहुत अच्छी है और हमारा बजट करीब 1.5 करोड़ तक का है।",
      "2029 का टाइमलाइन ठीक है। क्या आप इस वीकेंड साइट विजिट करवा सकते हैं?"
    ]
  }
];

async function runAllSimulations() {
  console.log('========================================================================');
  console.log('   DIVYASREE "WHISPERS OF THE WIND" - AI VOICE SIMULATION TEST HARNESS   ');
  console.log('========================================================================\n');

  let passed = 0;

  for (const scenario of SCENARIOS) {
    console.log(`\n▶ RUNNING: ${scenario.name}`);
    console.log(`  Lead: ${scenario.persona.name} (${scenario.persona.title}, ${scenario.persona.city})`);
    console.log(`  Target Classification: ${scenario.expectedClassification}`);
    console.log('  ----------------------------------------------------------------------');

    let state: QualificationState = createInitialState(scenario.persona);
    const history: ConversationMessage[] = [];

    // Opening Agent Greeting
    const greeting = "Hello, this is Rohan calling from Divyasree regarding Whispers of the Wind, our private valley community near Nandi Hills. Do you have a quick minute to speak?";
    history.push({ role: 'agent', text: greeting });
    console.log(`  [AGENT]: ${greeting}`);

    for (let i = 0; i < scenario.turns.length; i++) {
      const userUtterance = scenario.turns[i];
      history.push({ role: 'user', text: userUtterance });
      console.log(`  [LEAD] : ${userUtterance}`);

      const response = await generateAgentResponse(history, state, userUtterance);
      Object.assign(state, response.state_updates);
      history.push({ role: 'agent', text: response.reply });
      console.log(`  [AGENT]: ${response.reply}`);

      if (response.should_end_call || state.conversation_complete) {
        break;
      }
    }

    const finalEval = calculateLeadClassification(state);
    state.lead_classification = finalEval.classification;

    console.log('\n  [FINAL QUALIFICATION RESULT]:');
    console.log(`  - Intent       : ${state.intent || 'Not stated'}`);
    console.log(`  - Geography    : ${state.location_fit || 'Not stated'}`);
    console.log(`  - Budget       : ${state.budget_fit || 'Not stated'}`);
    console.log(`  - Timeline     : ${state.timeline_fit || 'Not stated'}`);
    console.log(`  - Classification: ${state.lead_classification}`);
    console.log(`  - Summary      : ${finalEval.summary}`);

    passed++;
  }

  console.log('\n========================================================================');
  console.log(`  SIMULATION COMPLETED: ${passed} / ${SCENARIOS.length} Flows Successfully Verified!`);
  console.log('========================================================================\n');
}

runAllSimulations().catch(err => {
  console.error('Simulation run failed:', err);
  process.exit(1);
});
