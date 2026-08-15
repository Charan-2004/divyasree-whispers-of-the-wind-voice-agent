export function splitIntoSpeechChunksSmart(text: string): string[] {
  if (!text) return [];

  // Match sentences ending in punctuation
  const raw = text.match(/[^.!?]+[.!?]+|[^.!?]+$/g) || [text];
  const cleaned = raw.map(s => s.trim()).filter(s => s.length > 0);

  if (cleaned.length <= 1) return [text.trim()];

  // If total words are under 32 words, keep as 1 continuous fluid utterance
  const totalWords = text.trim().split(/\s+/).length;
  if (totalWords <= 32) {
    return [text.trim()];
  }

  // Merge short lead-in clauses (under 7 words) into the subsequent sentence
  const merged: string[] = [];
  let buffer = '';

  for (let i = 0; i < cleaned.length; i++) {
    const s = cleaned[i];
    const words = s.split(/\s+/).length;

    if (buffer) {
      buffer += ' ' + s;
      merged.push(buffer);
      buffer = '';
    } else if (words < 7 && i < cleaned.length - 1) {
      buffer = s;
    } else {
      merged.push(s);
    }
  }

  if (buffer) {
    if (merged.length > 0) {
      merged[merged.length - 1] += ' ' + buffer;
    } else {
      merged.push(buffer);
    }
  }

  return merged;
}

const tests = [
  "That is fantastic news. I will have our senior property expert reach out to you shortly to schedule your private tour.",
  "Hello, this is Rohan calling from Divyasree regarding Whispers of the Wind, our private valley community near Nandi Hills. I know I am catching you during the day — do you have a quick minute to speak?",
  "Perfect! It is a fantastic location with excellent connectivity. To ensure this aligns with your plans, are you comfortable with our pricing, which starts at ninety two point four lakh and goes up to two point four six crore?"
];

for (const t of tests) {
  console.log('INPUT:', t);
  console.log('CHUNKS:', splitIntoSpeechChunksSmart(t));
  console.log('---');
}
