import { CONFIG } from './config.js';
import { normalizeSpeech } from './v2/speechNormalizer.js';

export interface TTSRequestOptions {
  text: string;
  language_code?: string;
  speaker?: string;
  pace?: number;
  temperature?: number;
}

export interface TTSResult {
  audioBase64: string;
  format: string;
  durationEstimateSeconds: number;
}

export interface TTSChunkPayload {
  chunkIndex: number;
  totalChunks: number;
  isFinal: boolean;
  text: string;
  audioBase64: string;
  durationEstimateSeconds: number;
}

/**
 * Smart Speech Chunking Algorithm
 * Splits multi-sentence turns so that Chunk 0 (the opening/affirmation) synthesizes in <500ms,
 * while merging tiny 2-3 word lead-in tokens into full clauses.
 */
export function splitIntoSpeechChunks(text: string): string[] {
  if (!text) return [];

  const raw = text.match(/[^.!?]+[.!?]+|[^.!?]+$/g) || [text];
  const cleaned = raw.map(s => s.trim()).filter(s => s.length > 0);

  if (cleaned.length <= 1) return [text.trim()];

  const merged: string[] = [];
  let buffer = '';

  for (let i = 0; i < cleaned.length; i++) {
    const s = cleaned[i];
    const words = s.split(/\s+/).length;

    if (buffer) {
      buffer += ' ' + s;
      merged.push(buffer);
      buffer = '';
    } else if (words < 5 && i < cleaned.length - 1) {
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

  return merged.length > 0 ? merged : [text];
}

/**
 * Synthesize a single sentence chunk using Sarvam Bulbul v3 API
 */
export async function synthesizeSpeechChunk(chunkText: string, options: Omit<TTSRequestOptions, 'text'>): Promise<TTSResult> {
  const normalizedText = normalizeSpeech(chunkText);
  const targetLanguage = options.language_code || 'en-IN';
  const speaker = options.speaker || CONFIG.SARVAM_DEFAULT_SPEAKER || 'shubh';
  const primaryKey = CONFIG.SARVAM_API_KEY;
  const backupKey = CONFIG.SARVAM_BACKUP_API_KEY;

  for (const apiKey of [primaryKey, backupKey]) {
    if (!apiKey || !normalizedText.trim()) continue;

    try {
      const response = await fetch('https://api.sarvam.ai/text-to-speech', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'api-subscription-key': apiKey,
        },
        body: JSON.stringify({
          inputs: [normalizedText],
          target_language_code: targetLanguage,
          speaker: speaker,
          model: CONFIG.SARVAM_TTS_MODEL || 'bulbul:v3',
          pace: options.pace || 1.05,
          temperature: options.temperature || 0.72,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        const audios = data?.audios;
        if (audios && audios.length > 0 && audios[0]) {
          const audioBase64 = audios[0];
          const wordCount = normalizedText.split(/\s+/).length;
          const duration = Math.max(0.8, wordCount * 0.38);

          return {
            audioBase64,
            format: 'audio/wav',
            durationEstimateSeconds: duration,
          };
        }
      }
    } catch (err) {
      console.warn('Sarvam TTS chunk request retry notice:', err);
    }
  }

  // Resilient fallback
  return {
    audioBase64: '',
    format: 'none',
    durationEstimateSeconds: Math.max(0.8, normalizedText.split(/\s+/).length * 0.35)
  };
}

/**
 * High-Speed Streaming Speech Synthesizer
 * Synthesizes all sentence chunks concurrently in parallel so subsequent sentences
 * are pre-fetched and ready in the client queue before the first sentence finishes playing.
 */
export async function streamSpeechPipelined(
  fullText: string,
  options: Omit<TTSRequestOptions, 'text'>,
  onChunkReady: (chunk: TTSChunkPayload) => void | Promise<void>,
  isAbortedCheck?: () => boolean
): Promise<void> {
  const chunks = splitIntoSpeechChunks(fullText);
  const totalChunks = chunks.length;

  if (totalChunks === 0) return;

  // Eager parallel synthesis
  const chunkPromises = chunks.map(async (chunkText, index) => {
    const tts = await synthesizeSpeechChunk(chunkText, options);
    return {
      chunkIndex: index,
      totalChunks,
      isFinal: index === totalChunks - 1,
      text: chunkText,
      audioBase64: tts.audioBase64,
      durationEstimateSeconds: tts.durationEstimateSeconds,
    };
  });

  // Dispatch chunks in exact order as each resolves
  for (let i = 0; i < totalChunks; i++) {
    if (isAbortedCheck && isAbortedCheck()) {
      return;
    }

    const payload = await chunkPromises[i];

    if (isAbortedCheck && isAbortedCheck()) {
      return;
    }

    await onChunkReady(payload);
  }
}

/**
 * Legacy full-batch fallback
 */
export async function synthesizeSpeech(options: TTSRequestOptions): Promise<TTSResult> {
  return synthesizeSpeechChunk(options.text, options);
}
