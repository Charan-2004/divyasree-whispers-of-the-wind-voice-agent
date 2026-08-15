import { CONFIG } from '../server/config.js';

const testSpeakers = ['aditya', 'anand', 'shubh', 'ritu', 'priya', 'rohan', 'ratan'];
const sampleText = "Whispers of the Wind is our thirty-eight acre private valley sanctuary nestled near Nandi Hills with seventy-four percent open green spaces, just twenty minutes from the airport.";

async function testVoices() {
  const apiKey = CONFIG.SARVAM_API_KEY;
  for (const speaker of testSpeakers) {
    const t0 = Date.now();
    try {
      const res = await fetch('https://api.sarvam.ai/text-to-speech', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'api-subscription-key': apiKey,
        },
        body: JSON.stringify({
          inputs: [sampleText],
          target_language_code: 'en-IN',
          speaker: speaker,
          model: 'bulbul:v3',
          pace: 1.0,
          temperature: 0.7,
        }),
      });
      const t1 = Date.now();
      if (res.ok) {
        const data = await res.json();
        console.log(`Speaker [${speaker}] OK - Latency: ${t1 - t0}ms, audio length: ${data?.audios?.[0]?.length || 0}`);
      } else {
        console.log(`Speaker [${speaker}] Error: ${res.status}`);
      }
    } catch (e: any) {
      console.log(`Speaker [${speaker}] Exception: ${e.message}`);
    }
  }
}

testVoices();
