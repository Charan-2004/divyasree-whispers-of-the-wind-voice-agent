import { normalizeSpeech } from '../server/v2/speechNormalizer.js';

const testStr = "which is just a 20-minute drive from the airport, 38-acre valley, starting at ₹92.4 lakh";
console.log('Original:', testStr);
console.log('Normalized:', normalizeSpeech(testStr));
