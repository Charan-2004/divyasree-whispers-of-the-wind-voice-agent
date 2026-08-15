import { createInitialV2State } from '../server/v2/stateEngine.js';
import { planConversationalTurn } from '../server/v2/conversationalPlanner.js';

async function testTurn() {
  const state = createInitialV2State();
  const history = [
    { role: 'agent', text: 'Hello, this is Rohan calling from Divyashree regarding Whispers of the Wind, our private valley community near Nandi Hills. I know I am catching you during the day — do you have a quick minute to speak?' }
  ];

  console.log('Testing turn planning for: "han Tu Hai Kaun"');
  const t0 = Date.now();
  const plan = await planConversationalTurn(
    history as any,
    state.qualification,
    state.conversation,
    state.completion,
    "han Tu Hai Kaun"
  );
  const t1 = Date.now();
  console.log(`Plan generated in ${t1 - t0}ms:`, JSON.stringify(plan, null, 2));
}

testTurn();
