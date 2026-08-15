import { CONFIG } from '../server/config.js';

async function testGeminiDetailed() {
  const promptContext = `
You are Rohan, an elite property advisor for Divyasree Developers representing "Whispers of the Wind", a luxury villa plot development near Nandi Hills.

CONVERSATION HISTORY:
AGENT: Hello, this is Rohan from Divyasree regarding Whispers of the Wind, our private valley community near Nandi Hills. Do you have a quick minute to speak?
USER: yes first tell me who are you and where is this located

LATEST USER UTTERANCE:
"yes first tell me who are you and where is this located"

INSTRUCTIONS:
1. Answer the user's specific question directly (who you are, Divyasree developer, Nandi Hills location 20 mins from airport).
2. Keep response to 1-2 conversational sentences.
3. Return JSON matching the schema.
`;

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${CONFIG.GEMINI_MODEL}:generateContent?key=${CONFIG.GEMINI_API_KEY}`;
  
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ role: 'user', parts: [{ text: promptContext }] }],
      generationConfig: {
        temperature: 0.3,
        responseMimeType: 'application/json',
        responseSchema: {
          type: 'OBJECT',
          properties: {
            reply: { type: 'STRING' },
            state_updates: {
              type: 'OBJECT',
              properties: {
                permission: { type: 'STRING' },
                intent: { type: 'STRING' },
                location_fit: { type: 'STRING' },
                budget_fit: { type: 'STRING' },
                timeline_fit: { type: 'STRING' }
              }
            },
            next_checkpoint: { type: 'STRING' },
            lead_temperature: { type: 'STRING' },
            handoff_requested: { type: 'BOOLEAN' },
            should_end_call: { type: 'BOOLEAN' }
          },
          required: ['reply', 'state_updates', 'next_checkpoint', 'lead_temperature', 'handoff_requested', 'should_end_call']
        }
      }
    })
  });

  const data = await res.json();
  console.log('Status:', res.status);
  console.log('Output JSON:', data?.candidates?.[0]?.content?.parts?.[0]?.text);
}

testGeminiDetailed();
