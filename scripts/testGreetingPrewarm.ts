import { CONFIG } from '../server/config.js';
import { normalizeSpeech } from '../server/v2/speechNormalizer.js';

const greeting = "Hello, this is Rohan calling from Divyashree regarding Whispers of the Wind, our private valley community near Nandi Hills. I know I am catching you during the day — do you have a quick minute to speak?";

async function preWarmGreeting() {
  const t0 = Date.now();
  const normalized = normalizeSpeech(greeting);
  console.log('Normalized Greeting:', normalized);

  const res = await fetch('https://api.sarvam.ai/text-to-speech', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'api-subscription-key': CONFIG.SARVAM_API_KEY,
    },
    body: JSON.stringify({
      inputs: [normalized],
      target_language_code: 'en-IN',
      speaker: 'shubh',
      model: 'bulbul:v3',
      pace: 1.05,
      temperature: 0.7,
    }),
  });

  const t1 = Date.now();
  if (res.ok) {
    const data = await res.json();
    console.log(`Greeting Pre-warm Success in ${t1 - t0}ms! Audio length:`, data?.audios?.[0]?.length);
  } else {
    console.log('Error:', res.status, await res.text());
  }
}

preWarmGreeting();
