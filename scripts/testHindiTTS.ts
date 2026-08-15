import { CONFIG } from '../server/config.js';
import { synthesizeSpeechChunk } from '../server/sarvamTTS.js';

async function testHindiTTS() {
  const text = "माफ़ी चाहता हूँ, मैं रोहन हूँ दिव्यश्री डेवलपर्स से। मैं नंदी हिल्स के पास हमारे प्रोजेक्ट 'व्हिस्पर्स ऑफ द विंड' के बारे में बात कर रहा हूँ—क्या आपके पास एक मिनट का समय है?";
  console.log('Testing Hindi TTS for:', text);
  const t0 = Date.now();
  const res = await synthesizeSpeechChunk(text, {
    language_code: 'hi-IN',
    speaker: 'shubh',
    pace: 1.05,
    temperature: 0.72
  });
  const t1 = Date.now();
  console.log(`Synthesized in ${t1 - t0}ms:`, {
    format: res.format,
    audioLength: res.audioBase64?.length,
    duration: res.durationEstimateSeconds
  });
}

testHindiTTS();
