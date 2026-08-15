import { generateAgentResponse } from '../server/geminiService.js';

async function testLanguageAndPitch() {
  const history = [
    { role: 'agent', text: 'Hello, this is Rohan calling from Divyasree regarding Whispers of the Wind. Do you have a quick minute to speak?' },
    { role: 'user', text: 'Yes' },
    { role: 'agent', text: 'Thank you. Are you looking at this property primarily for a serene weekend home or as a long-term investment?' },
  ];

  const state = {
    permission: 'granted',
    intent: 'unclear',
    location_fit: null,
    budget_fit: null,
    timeline_fit: null,
    language: 'en-IN',
    lead_temperature: 'warm',
    lead_classification: 'WARM',
    objections: [],
    handoff_requested: false,
    conversation_complete: false,
    current_checkpoint: 'INTENT',
    turns_count: 2,
    total_duration_seconds: 15
  };

  console.log('--- Testing User saying "No, I am thinking bro." ---');
  const res = await generateAgentResponse(history as any, state as any, 'No, I am thinking bro.');
  console.log('AI Spoken Reply:\n', res.reply);
  console.log('Detected Language in state updates:', res.state_updates?.language || state.language);
}

testLanguageAndPitch();
