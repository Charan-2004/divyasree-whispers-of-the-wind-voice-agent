import { CONFIG } from '../server/config.js';
import { synthesizeSpeechChunk } from '../server/sarvamTTS.js';

async function testNewKeyLatency() {
  console.log('Testing Sarvam API key:', CONFIG.SARVAM_API_KEY.slice(0, 12) + '...');
  
  // Sentence 1 (Fast-path opener)
  const sentence1 = "Understood, that makes great sense.";
  const t0 = Date.now();
  const res1 = await synthesizeSpeechChunk(sentence1, {
    language_code: 'en-IN',
    speaker: 'shubh',
    pace: 1.05,
    temperature: 0.7
  });
  const t1 = Date.now();
  console.log(`⚡ Sentence 1 (6 words) synthesized in ${t1 - t0}ms! Length:`, res1.audioBase64?.length);

  // Sentence 2
  const sentence2 = "Whispers of the Wind is located near Nandi Hills, about twenty minutes from the airport.";
  const t2 = Date.now();
  const res2 = await synthesizeSpeechChunk(sentence2, {
    language_code: 'en-IN',
    speaker: 'shubh',
    pace: 1.05,
    temperature: 0.7
  });
  const t3 = Date.now();
  console.log(`⚡ Sentence 2 (15 words) synthesized in ${t3 - t2}ms! Length:`, res2.audioBase64?.length);
}

testNewKeyLatency();
