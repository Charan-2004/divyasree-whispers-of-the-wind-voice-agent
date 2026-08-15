import { CONFIG } from '../server/config.js';

async function benchmarkSpeakers() {
  const speakers = ['shubh', 'priya', 'rohan', 'ratan'];
  const text = "Hello, this is Rohan from Divyasree regarding Whispers of the Wind.";
  
  for (const s of speakers) {
    const t0 = Date.now();
    try {
      const res = await fetch('https://api.sarvam.ai/text-to-speech', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'api-subscription-key': CONFIG.SARVAM_API_KEY,
        },
        body: JSON.stringify({
          inputs: [text],
          target_language_code: 'en-IN',
          speaker: s,
          model: 'bulbul:v3',
        }),
      });
      const elapsed = Date.now() - t0;
      console.log(`Speaker ${s}: ${elapsed}ms (status ${res.status})`);
    } catch (e) {
      console.log(`Speaker ${s} error:`, e);
    }
  }
}

benchmarkSpeakers();
