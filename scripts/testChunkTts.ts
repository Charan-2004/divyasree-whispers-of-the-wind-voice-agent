import { performance } from 'perf_hooks';
import { synthesizeSpeech } from '../server/sarvamTTS.js';

async function testTtsChunking() {
  const fullParagraph = "Understood. If you're considering this primarily for your family, the private valley setting is one of the main reasons buyers look at the project. Would you also be comfortable with the Nandi Hills location?";
  
  console.log('Testing Full Paragraph TTS Synthesis:');
  const t0 = performance.now();
  const fullResult = await synthesizeSpeech({ text: fullParagraph, language_code: 'en-IN' });
  const fullTime = performance.now() - t0;
  console.log(`Full Paragraph (${fullParagraph.length} chars) TTS Time: ${fullTime.toFixed(0)}ms (Audio length: ${fullResult.audioBase64.length} b64 chars)\n`);

  const sentence1 = "Understood.";
  const sentence2 = "If you're considering this primarily for your family, the private valley setting is one of the main reasons buyers look at the project.";
  const sentence3 = "Would you also be comfortable with the Nandi Hills location?";

  console.log('Testing Sentence-by-Sentence TTS Synthesis:');
  const t1 = performance.now();
  const chunk1 = await synthesizeSpeech({ text: sentence1, language_code: 'en-IN' });
  const timeChunk1 = performance.now() - t1;
  console.log(`Chunk 1 ("${sentence1}") TTS Time: ${timeChunk1.toFixed(0)}ms`);

  const t2 = performance.now();
  const chunk2 = await synthesizeSpeech({ text: sentence2, language_code: 'en-IN' });
  const timeChunk2 = performance.now() - t2;
  console.log(`Chunk 2 ("${sentence2}") TTS Time: ${timeChunk2.toFixed(0)}ms`);

  const t3 = performance.now();
  const chunk3 = await synthesizeSpeech({ text: sentence3, language_code: 'en-IN' });
  const timeChunk3 = performance.now() - t3;
  console.log(`Chunk 3 ("${sentence3}") TTS Time: ${timeChunk3.toFixed(0)}ms`);
}

testTtsChunking().catch(console.error);
