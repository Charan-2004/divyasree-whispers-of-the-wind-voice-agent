import { CONFIG } from '../server/config.js';

async function testWorkingModels() {
  const models = [
    'gemini-3.1-flash-lite',
    'gemini-3.7-flash',
    'gemini-flash-latest',
    'gemini-flash-lite-latest',
    'gemini-2.5-pro',
    'gemini-pro-latest'
  ];

  for (const m of models) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${m}:generateContent?key=${CONFIG.GEMINI_API_KEY}`;
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: 'Answer in 5 words: Who is Rohan?' }] }],
          generationConfig: { maxOutputTokens: 50 }
        })
      });
      const data = await res.json();
      if (res.ok) {
        console.log(`[WORKING 200 OK] ${m} -> Response:`, data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim());
      } else {
        console.log(`[STATUS ${res.status}] ${m} ->`, data?.error?.message?.substring(0, 120));
      }
    } catch (e) {
      console.log(`[ERR] ${m}:`, e);
    }
  }
}

testWorkingModels();
