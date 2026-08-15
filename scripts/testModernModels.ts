import { CONFIG } from '../server/config.js';

async function testModernModels() {
  const models = [
    'gemini-2.5-flash-lite',
    'gemini-flash-latest',
    'gemini-flash-lite-latest',
    'gemini-3.1-flash-lite',
    'gemini-3.7-flash'
  ];

  for (const m of models) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${m}:generateContent?key=${CONFIG.GEMINI_API_KEY}`;
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: 'Hello, respond with ONE word: Ready' }] }]
        })
      });
      const data = await res.json();
      if (res.ok) {
        console.log(`[SUCCESS] ${m} -> Response:`, data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim());
      } else {
        console.log(`[FAILED] ${m} -> Status ${res.status}:`, data?.error?.message?.substring(0, 100));
      }
    } catch (e) {
      console.log(`[ERR] ${m}:`, e);
    }
  }
}

testModernModels();
