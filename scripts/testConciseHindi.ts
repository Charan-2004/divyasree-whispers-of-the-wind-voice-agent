import { synthesizeSpeechChunk } from '../server/sarvamTTS.js';

async function testConciseHindi() {
  const text = "माफ़ी चाहता हूँ, मैं दिव्यश्री डेवलपर्स से रोहन हूँ। क्या आपके पास एक मिनट है?";
  const t0 = Date.now();
  const res = await synthesizeSpeechChunk(text, {
    language_code: 'hi-IN',
    speaker: 'shubh',
    pace: 1.1,
    temperature: 0.7
  });
  const t1 = Date.now();
  console.log(`Concise Hindi (12 words) synthesized in ${t1 - t0}ms! Length:`, res.audioBase64?.length);
}

testConciseHindi();
