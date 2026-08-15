/**
 * Phonetic Normalization & Pronunciation Rules for Sarvam Bulbul TTS
 * Ensures natural Indian English cadence and prevents abbreviation/number mispronunciation.
 * Expands numbers, percentages, and units into natural spoken words.
 */

export interface PronunciationRule {
  pattern: RegExp;
  replacement: string;
}

export const PRONUNCIATION_RULES: PronunciationRule[] = [
  // Brand & Location Naturalization
  { pattern: /\bDivyasree\b/gi, replacement: 'Divyashree' },
  { pattern: /\bWhispers of the Wind \(WOW\)\b/gi, replacement: 'Whispers of the Wind' },
  { pattern: /\b\(WOW\)\b/gi, replacement: '' },
  { pattern: /\bWOW\b/g, replacement: 'Whispers of the Wind' },
  { pattern: /\bNandi Hills\b/gi, replacement: 'Nandi Hills' },
  { pattern: /\bNandi Valley\b/gi, replacement: 'Nandi Valley' },
  { pattern: /\bDevanahalli\b/gi, replacement: 'Devanahalli' },
  { pattern: /\bHeggadihalli\b/gi, replacement: 'Heggadihalli' },
  { pattern: /\bBengaluru\b/gi, replacement: 'Bangalore' },
  
  // Estate Specifics & Acreage (Prevents letter-by-letter spelling)
  { pattern: /\b38[- ]acres?\b/gi, replacement: 'thirty eight acre' },
  { pattern: /\b74\s*%/g, replacement: 'seventy four percent' },
  { pattern: /\b20,000\b/g, replacement: 'twenty thousand' },
  { pattern: /\b20000\b/g, replacement: 'twenty thousand' },
  { pattern: /\b1,200\b/g, replacement: 'twelve hundred' },
  { pattern: /\b1200\b/g, replacement: 'twelve hundred' },
  { pattern: /\b3,199\b/g, replacement: 'thirty one ninety nine' },
  { pattern: /\b3199\b/g, replacement: 'thirty one ninety nine' },
  { pattern: /\b20\s*(mins|min|minutes)\b/gi, replacement: 'twenty minutes' },
  { pattern: /\b2029\b/g, replacement: 'twenty twenty nine' },
  
  // Real Estate Units & Pricing Expansion
  { pattern: /₹\s*92\.4\s*lakh\b/gi, replacement: 'ninety two point four lakh rupees' },
  { pattern: /\b92\.4\s*lakh\b/gi, replacement: 'ninety two point four lakh' },
  { pattern: /₹\s*2\.46\s*(crores?|cr)\b/gi, replacement: 'two point four six crore rupees' },
  { pattern: /\b2\.46\s*(crores?|cr)\b/gi, replacement: 'two point four six crore' },
  { pattern: /₹\s*1\.5\s*(crores?|cr)\b/gi, replacement: 'one point five crore rupees' },
  { pattern: /\b1\.5\s*(crores?|cr)\b/gi, replacement: 'one point five crore' },
  { pattern: /₹\s*1\.2\s*(crores?|cr)\b/gi, replacement: 'one point two crore rupees' },
  { pattern: /\b1\.2\s*(crores?|cr)\b/gi, replacement: 'one point two crore' },
  { pattern: /₹\s*([0-9.]+)\s*lakh\b/gi, replacement: '$1 lakh rupees' },
  { pattern: /₹\s*([0-9.]+)\s*(crores?|cr)\b/gi, replacement: '$1 crore rupees' },
  { pattern: /\b([0-9.]+)\s*cr\b/gi, replacement: '$1 crore' },
  { pattern: /₹\s*([0-9,]+)/g, replacement: '$1 rupees' },
  { pattern: /\bsq\.?\s*ft\.?\b/gi, replacement: 'square feet' },
  { pattern: /\bsqft\b/gi, replacement: 'square feet' },
  { pattern: /\bCXO\b/g, replacement: 'C X O' },
  { pattern: /\bNRI\b/g, replacement: 'N R I' },
  { pattern: /\bHNI\b/g, replacement: 'H N I' },
  { pattern: /\bRERA\b/g, replacement: 'RERA' },
  
  // Clean markdown symbols & conversational artifacts
  { pattern: /[*_#`~]/g, replacement: '' },
  { pattern: /\s{2,}/g, replacement: ' ' },
];

/**
 * Normalizes input text according to pronunciation dictionary rules
 * for optimal synthesis by Sarvam Bulbul v3.
 */
export function normalizeForSpeech(text: string): string {
  if (!text) return '';
  let normalized = text;
  for (const rule of PRONUNCIATION_RULES) {
    normalized = normalized.replace(rule.pattern, rule.replacement);
  }
  return normalized.trim();
}
