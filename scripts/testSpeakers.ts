import { CONFIG } from '../server/config.js';

async function testSpeakers() {
  const speakers = ['shubh', 'priya', 'amartya', 'arun'];
  const testText = "Hello, this is Rohan calling from Divyasree regarding Whispers of the Wind, our private valley community near Nandi Hills. Do you have a quick minute to speak?";

  const apiKey = CONFIG.SARVAM_API_KEY;
  for (const spk of speakers) {
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
          pace: 1.0,
          temperature: 0.6,
        }),
      });
      console.log(`Speaker ${spk}: status ${res.status}`);
    } catch (e) {
      console.log(`Speaker ${spk} error:`, e);
    }
  }
}

testSpeakers();
