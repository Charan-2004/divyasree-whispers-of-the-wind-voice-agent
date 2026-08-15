import { CONFIG } from '../server/config.js';

async function testExactBody() {
  const promptContext = "Test prompt context";
  const SYSTEM_INSTRUCTION_TEXT = "Test system instruction";

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
          temperature: 0.4,
          maxOutputTokens: 1000,
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

  console.log('Status:', response.status);
  const data = await response.json();
  console.log('Response JSON:', JSON.stringify(data, null, 2));
}

testExactBody();
