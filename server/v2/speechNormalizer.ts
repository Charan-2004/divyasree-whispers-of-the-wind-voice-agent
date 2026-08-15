/**
 * V2 Speech Normalization & Naturalization Engine
 * Converts numbers, currencies, units, acreage, dates, times, and abbreviations into natural spoken words
 * to guarantee fluid, human-like delivery on Sarvam Bulbul v3 TTS.
 */

export interface NormalizationRule {
  pattern: RegExp;
  replacement: string;
}

export const SPEECH_RULES: NormalizationRule[] = [
  // 1. Time & Appointment Normalization (e.g. "8:30 a.m.", "8:30 am", "5:00 pm")
  { pattern: /\b8:30\s*(a\.?m\.?|am)\b/gi, replacement: 'eight thirty AM' },
  { pattern: /\b9:30\s*(a\.?m\.?|am)\b/gi, replacement: 'nine thirty AM' },
  { pattern: /\b10:30\s*(a\.?m\.?|am)\b/gi, replacement: 'ten thirty AM' },
  { pattern: /\b11:30\s*(a\.?m\.?|am)\b/gi, replacement: 'eleven thirty AM' },
  { pattern: /\b12:30\s*(p\.?m\.?|pm)\b/gi, replacement: 'twelve thirty PM' },
  { pattern: /\b([0-9]|1[0-2]):30\s*(a\.?m\.?|am)\b/gi, replacement: '$1 thirty AM' },
  { pattern: /\b([0-9]|1[0-2]):30\s*(p\.?m\.?|pm)\b/gi, replacement: '$1 thirty PM' },
  { pattern: /\b([0-9]|1[0-2]):00\s*(a\.?m\.?|am)\b/gi, replacement: '$1 AM' },
  { pattern: /\b([0-9]|1[0-2]):00\s*(p\.?m\.?|pm)\b/gi, replacement: '$1 PM' },
  { pattern: /\b([0-9]|1[0-2])\s*(a\.?m\.?|am)\b/gi, replacement: '$1 AM' },
  { pattern: /\b([0-9]|1[0-2])\s*(p\.?m\.?|pm)\b/gi, replacement: '$1 PM' },
  { pattern: /\ba\.m\.\b/gi, replacement: 'AM' },
  { pattern: /\bp\.m\.\b/gi, replacement: 'PM' },

  // 2. Brand & Regional Location Naturalization
  { pattern: /\bDivyasree\b/gi, replacement: 'Divyashree' },
  { pattern: /\bWhispers of the Wind \(WOW\)\b/gi, replacement: 'Whispers of the Wind' },
  { pattern: /\b\(WOW\)\b/gi, replacement: '' },
  { pattern: /\bWOW\b/g, replacement: 'Whispers of the Wind' },
  { pattern: /\bNandi Hills\b/gi, replacement: 'Nandi Hills' },
  { pattern: /\bNandi Valley\b/gi, replacement: 'Nandi Valley' },
  { pattern: /\bDevanahalli\b/gi, replacement: 'Devanahalli' },
  { pattern: /\bHeggadihalli\b/gi, replacement: 'Heggadihalli' },
  { pattern: /\bBengaluru\b/gi, replacement: 'Bangalore' },

  // 3. Estate Metrics, Acreage & Numbers (Eliminates letter-by-letter digit spelling)
  { pattern: /\b38[- ]acres?\b/gi, replacement: 'thirty eight acre' },
  { pattern: /\b74\s*%/g, replacement: 'seventy four percent' },
  { pattern: /\b20,000\b/g, replacement: 'twenty thousand' },
  { pattern: /\b20000\b/g, replacement: 'twenty thousand' },
  { pattern: /\b1,200\b/g, replacement: 'twelve hundred' },
  { pattern: /\b1200\b/g, replacement: 'twelve hundred' },
  { pattern: /\b3,199\b/g, replacement: 'thirty one ninety nine' },
  { pattern: /\b3199\b/g, replacement: 'thirty one ninety nine' },
  { pattern: /\b50[- ]*to[- ]*60[- ]*(mins?|minutes?)\b/gi, replacement: 'fifty to sixty minutes' },
  { pattern: /\b20[- ]*(mins?|minutes?)\b/gi, replacement: 'twenty minutes' },
  { pattern: /\b15[- ]*(mins?|minutes?)\b/gi, replacement: 'fifteen minutes' },
  { pattern: /\b30[- ]*(mins?|minutes?)\b/gi, replacement: 'thirty minutes' },
  { pattern: /\b10[- ]*(mins?|minutes?)\b/gi, replacement: 'ten minutes' },
  { pattern: /\b(\d+)[- ]*(mins?|minutes?)\b/gi, replacement: '$1 minutes' },
  { pattern: /\b2029\b/g, replacement: 'twenty twenty nine' },

  // 4. Indian Currency Expansions
  { pattern: /₹\s*92\.4\s*lakhs?\b/gi, replacement: 'ninety two point four lakh rupees' },
  { pattern: /\b92\.4\s*lakhs?\b/gi, replacement: 'ninety two point four lakh' },
  { pattern: /₹\s*2\.46\s*(crores?|cr)\b/gi, replacement: 'two point four six crore rupees' },
  { pattern: /\b2\.46\s*(crores?|cr)\b/gi, replacement: 'two point four six crore' },
  { pattern: /₹\s*1\.5\s*(crores?|cr)\b/gi, replacement: 'one point five crore rupees' },
  { pattern: /\b1\.5\s*(crores?|cr)\b/gi, replacement: 'one point five crore' },
  { pattern: /₹\s*1\.2\s*(crores?|cr)\b/gi, replacement: 'one point two crore rupees' },
  { pattern: /\b1\.2\s*(crores?|cr)\b/gi, replacement: 'one point two crore' },
  { pattern: /₹\s*80\s*lakhs?\b/gi, replacement: 'eighty lakh rupees' },
  { pattern: /\b80\s*lakhs?\b/gi, replacement: 'eighty lakh' },
  { pattern: /₹\s*70\s*lakhs?\b/gi, replacement: 'seventy lakh rupees' },
  { pattern: /\b70\s*lakhs?\b/gi, replacement: 'seventy lakh' },
  { pattern: /₹\s*50\s*lakhs?\b/gi, replacement: 'fifty lakh rupees' },
  { pattern: /\b50\s*lakhs?\b/gi, replacement: 'fifty lakh' },
  { pattern: /₹\s*45\s*lakhs?\b/gi, replacement: 'forty five lakh rupees' },
  { pattern: /\b45\s*lakhs?\b/gi, replacement: 'forty five lakh' },
  { pattern: /₹\s*([0-9.]+)\s*lakhs?\b/gi, replacement: '$1 lakh rupees' },
  { pattern: /₹\s*([0-9.]+)\s*(crores?|cr)\b/gi, replacement: '$1 crore rupees' },
  { pattern: /\b([0-9.]+)\s*cr\b/gi, replacement: '$1 crore' },
  { pattern: /₹\s*([0-9,]+)/g, replacement: '$1 rupees' },

  // 5. Units & Real Estate Terms
  { pattern: /\bsq\.?\s*ft\.?\b/gi, replacement: 'square feet' },
  { pattern: /\bsqft\b/gi, replacement: 'square feet' },
  { pattern: /\bCXO\b/g, replacement: 'C X O' },
  { pattern: /\bNRI\b/g, replacement: 'N R I' },
  { pattern: /\bHNI\b/g, replacement: 'H N I' },
  { pattern: /\bRERA\b/g, replacement: 'RERA' },

  // 6. Clean Markdown & Punctuation
  { pattern: /[*_#`~]/g, replacement: '' },
  { pattern: /\s{2,}/g, replacement: ' ' },
];

/**
 * Normalizes text for flawless text-to-speech output
 */
export function normalizeSpeech(text: string): string {
  if (!text) return '';
  let normalized = text;
  for (const rule of SPEECH_RULES) {
    normalized = normalized.replace(rule.pattern, rule.replacement);
  }
  return normalized.trim();
}
