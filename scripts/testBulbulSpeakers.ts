import { CONFIG } from '../server/config.js';

async function testAllBulbulSpeakers() {
  const candidates = ['shubh', 'priya', 'ratan', 'meera', 'arvind', 'kavya', 'rohan', 'ishaan', 'aditi'];
  const testText = "Hello, this is Divyasree Whispers of the Wind.";
  const apiKey = CONFIG.SARVAM_API_KEY;

  for (const spk of candidates) {
    try {
      const res = await fetch('https://api.sarvam.ai/text-to-speech', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'api-subscription-key': apiKey,
        },
        body: JSON.stringify({
          inputs: [testText],
          target_language_code: 'en-IN',
          speaker: spk,
          model: 'bulbul:v3',
        }),
      });
      if (res.ok) {
        console.log(`[VALID] Speaker: ${spk}`);
      } else {
        const err = await res.json();
        console.log(`[INVALID] ${spk}: ${err.message || res.statusText}`);
      }
    } catch (e) {
      console.log(`[ERR] ${spk}:`, e);
    }
  }
}

testAllBulbulSpeakers();
