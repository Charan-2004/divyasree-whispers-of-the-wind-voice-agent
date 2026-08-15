import { CONFIG } from '../server/config.js';

async function testGeminiDirect() {
  console.log('Testing Gemini API call:');
  console.log('API Key present:', !!CONFIG.GEMINI_API_KEY, 'Key snippet:', CONFIG.GEMINI_API_KEY?.substring(0, 10));
  console.log('Model:', CONFIG.GEMINI_MODEL);

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${CONFIG.GEMINI_MODEL}:generateContent?key=${CONFIG.GEMINI_API_KEY}`;
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [
          {
            role: 'user',
            parts: [{ text: 'Who are you and what project do you represent?' }]
          }
        ]
      })
    });

    console.log('Gemini HTTP Status:', res.status, res.statusText);
    const body = await res.text();
    console.log('Gemini Response Body:', body);
  } catch (e) {
    console.error('Fetch error:', e);
  }
}

testGeminiDirect();
