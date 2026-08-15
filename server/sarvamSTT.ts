import { CONFIG } from './config.js';

export interface STTRequestOptions {
  audioBuffer: Buffer;
  mimeType?: string;
  language_code?: string;
  model?: string;
  mode?: 'transcribe' | 'translate' | 'verbatim' | 'translit' | 'codemix';
}

export interface STTResult {
  transcript: string;
  language_code?: string;
  confidence?: number;
}

/**
 * Transcribe audio using Sarvam Saaras v3 Speech-to-Text API
 */
export async function transcribeAudio(options: STTRequestOptions): Promise<STTResult> {
  const apiKey = CONFIG.SARVAM_API_KEY || CONFIG.SARVAM_BACKUP_API_KEY;

  if (apiKey && options.audioBuffer && options.audioBuffer.length > 0) {
    try {
      // Build multipart/form-data for Sarvam STT REST API
      const formData = new FormData();
      const audioBlob = new Blob([options.audioBuffer], { type: options.mimeType || 'audio/wav' });
      formData.append('file', audioBlob, 'audio.wav');
      formData.append('model', options.model || CONFIG.SARVAM_STT_MODEL || 'saaras:v3');
      
      if (options.mode) {
        formData.append('mode', options.mode);
      } else {
        formData.append('mode', 'codemix'); // Default to codemix for natural Hindi/English mixing
      }

      if (options.language_code) {
        formData.append('language_code', options.language_code);
      }

      const response = await fetch('https://api.sarvam.ai/speech-to-text', {
        method: 'POST',
        headers: {
          'api-subscription-key': apiKey,
        },
        body: formData,
      });

      if (response.ok) {
        const data = await response.json();
        const transcript = data?.transcript || '';
        const detectedLanguage = data?.language_code || 'en-IN';
        return {
          transcript: transcript.trim(),
          language_code: detectedLanguage,
          confidence: 0.95
        };
      } else {
        const errText = await response.text();
        console.warn('Sarvam STT API returned non-OK status:', response.status, errText);
      }
    } catch (err) {
      console.warn('Sarvam STT request failed:', err);
    }
  }

  return {
    transcript: '',
    language_code: 'en-IN',
    confidence: 0
  };
}
