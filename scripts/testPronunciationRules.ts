import { normalizeForSpeech } from '../server/pronunciation.js';

const testPhrases = [
  "Whispers of the Wind is a 38-acre sanctuary with 74% open green spaces, a 20,000 sq.ft. clubhouse, and plots starting from ₹92.4 lakh up to ₹2.46 crore, just 20 mins from airport.",
  "1,200 to 3,199 sq.ft. villa plots."
];

for (const p of testPhrases) {
  console.log('ORIGINAL:\n', p);
  console.log('NORMALIZED:\n', normalizeForSpeech(p));
  console.log('---');
}
