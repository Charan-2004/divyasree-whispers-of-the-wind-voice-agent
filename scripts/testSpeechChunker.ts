import { normalizeForSpeech } from '../server/pronunciation.js';

/**
 * Splits response text into natural conversational chunks for pipelined TTS.
 * Protects abbreviations (sq. ft., ₹92.4, etc.) from accidental splits.
 */
export function splitIntoSpeechChunks(text: string): string[] {
  if (!text || !text.trim()) return [];

  // Protect decimal numbers like 92.4, 1.5, 2.46 with a temporary token
  const protectedText = text
    .replace(/(\d+)\.(\d+)/g, '$1__DOT__$2')
    .replace(/(sq|ft|dr|mr|mrs|ms|prof|e\.g|i\.e)\./gi, '$1__DOT__');

  // Split on sentence boundaries: (. | ? | ! | । | newline) followed by space or end
  const rawChunks = protectedText
    .split(/(?<=[.?!।\n])\s+/)
    .map(c => c.replace(/__DOT__/g, '.').trim())
    .filter(c => c.length > 0);

  if (rawChunks.length === 0) return [text.trim()];

  // If there is an ultra-short leading word like "Understood." or "Certainly." or "Great.",
  // it's an ideal fast-opening chunk (~600ms TTS).
  // If chunks are too small (< 2 words) in the middle, combine with the subsequent chunk.
  const finalChunks: string[] = [];
  for (let i = 0; i < rawChunks.length; i++) {
    const chunk = rawChunks[i];
    const wordCount = chunk.split(/\s+/).length;

    if (finalChunks.length > 0 && wordCount < 3 && i === rawChunks.length - 1) {
      // Merge trailing small snippet with previous chunk
      finalChunks[finalChunks.length - 1] += ' ' + chunk;
    } else {
      finalChunks.push(chunk);
    }
  }

  return finalChunks;
}

// Quick validation tests
const testCases = [
  "Understood. If you're considering this primarily for your family, the private valley setting is one of the main reasons buyers look at the project. Would you also be comfortable with the Nandi Hills location?",
  "Certainly! The starting price is ₹92.4 lakh for a 1,200 sq.ft. villa plot. Does this price range fit your budget?",
  "Hello, this is Rohan calling from Divyasree regarding Whispers of the Wind, our private valley community near Nandi Hills. I know I am catching you during the day — do you have a quick minute to speak?",
  "नमस्ते! क्या आपको नंदी हिल्स में वीकेंड होम चाहिए? हमारा प्रोजेक्ट 2029 में डिलीवर होगा।"
];

console.log('Testing splitIntoSpeechChunks:');
for (const tc of testCases) {
  console.log('\nInput:', tc);
  const chunks = splitIntoSpeechChunks(tc);
  console.log('Chunks (' + chunks.length + '):', chunks);
}
