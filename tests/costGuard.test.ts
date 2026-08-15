import { describe, it, expect } from 'vitest';
import { CONFIG } from '../server/config.js';
import { normalizeForSpeech } from '../server/pronunciation.js';

describe('Developer Cost Guard & Phonetic Normalization', () => {
  it('should have strict cost protection limits configured', () => {
    expect(CONFIG.MAX_CALL_DURATION_SECONDS).toBeLessThanOrEqual(180);
    expect(CONFIG.MAX_TURNS_PER_CALL).toBeLessThanOrEqual(20);
    expect(CONFIG.MAX_TTS_CHARACTERS_PER_CALL).toBeLessThanOrEqual(5000);
  });

  it('should correctly normalize Divyasree brand phonetics', () => {
    const raw = "Welcome to Divyasree developers project Whispers of the Wind (WOW).";
    const normalized = normalizeForSpeech(raw);

    expect(normalized).toContain('Divyashree');
    expect(normalized).not.toContain('(WOW)');
  });

  it('should normalize real estate currency and unit notations', () => {
    const raw = "Plots starting from ₹92.4 lakh up to ₹2.46 Cr with sizes around 1,200 sq.ft.";
    const normalized = normalizeForSpeech(raw);

    expect(normalized).toContain('ninety two point four lakh rupees');
    expect(normalized).toContain('two point four six crore rupees');
    expect(normalized).toContain('twelve hundred');
    expect(normalized).toContain('square feet');
    expect(normalized).not.toContain('sq.ft.');
  });

  it('should normalize Nandi Hills location phonetics', () => {
    const raw = "Located in scenic Nandi Hills valley near Devanahalli.";
    const normalized = normalizeForSpeech(raw);

    expect(normalized).toContain('Nandi Hills');
    expect(normalized).toContain('Devanahalli');
  });
});
