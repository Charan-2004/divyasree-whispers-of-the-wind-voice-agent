import { CONFIG } from '../server/config.js';
import { generateAgentResponse } from '../server/geminiService.js';

async function testAgentWithModel() {
  const history = [
    { role: 'agent', text: 'Hello, this is Rohan from Divyasree regarding Whispers of the Wind. Do you have a quick minute?' },
    { role: 'user', text: 'yes first tell me who are you and where is this located' }
  ];

  const state = {
    permission: 'granted',
    intent: null,
    location_fit: null,
    budget_fit: null,
    timeline_fit: null,
    lead_classification: null,
    lead_temperature: null,
    language: 'en-IN',
    handoff_requested: false,
    conversation_complete: false
  };

  const t0 = Date.now();
  const res = await generateAgentResponse(history as any, state as any, 'yes first tell me who are you and where is this located');
  const elapsed = Date.now() - t0;

  console.log(`Generated response in ${elapsed}ms:`);
  console.log('Reply:', res.reply);
  console.log('State updates:', res.state_updates);
  console.log('Next checkpoint:', res.next_checkpoint);
}

testAgentWithModel();
