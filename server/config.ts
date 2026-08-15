import dotenv from 'dotenv';
dotenv.config();

export const CONFIG = {
  PORT: parseInt(process.env.PORT || '3050', 10),
  NODE_ENV: process.env.NODE_ENV || 'development',

  // LiveKit Cloud Configuration
  LIVEKIT_URL: process.env.LIVEKIT_URL || 'wss://testing-only-45lsgpoc.livekit.cloud',
  LIVEKIT_API_KEY: process.env.LIVEKIT_API_KEY || 'API5ZC7qXALJwhf',
  LIVEKIT_API_SECRET: process.env.LIVEKIT_API_SECRET || 'l4HHG8wb6mDmS5x1cgKBuwymwpYiSXL0IthyUopMaoG',

  // Gemini Configuration
  GEMINI_API_KEY: process.env.GEMINI_API_KEY || '',
  GEMINI_MODEL: process.env.GEMINI_MODEL || 'gemini-3.1-flash-lite',

  // Sarvam AI Configuration
  SARVAM_API_KEY: process.env.SARVAM_API_KEY || '',
  SARVAM_BACKUP_API_KEY: process.env.SARVAM_BACKUP_API_KEY || '',
  SARVAM_STT_MODEL: process.env.SARVAM_STT_MODEL || 'saaras:v3',
  SARVAM_TTS_MODEL: process.env.SARVAM_TTS_MODEL || 'bulbul:v3',
  SARVAM_DEFAULT_SPEAKER: process.env.SARVAM_DEFAULT_SPEAKER || 'shubh',

  // Silence Timeouts (Human conversational pause tolerances)
  SILENCE_TIMEOUT_1_SECONDS: parseInt(process.env.SILENCE_TIMEOUT_1_SECONDS || '14', 10),
  SILENCE_TIMEOUT_2_SECONDS: parseInt(process.env.SILENCE_TIMEOUT_2_SECONDS || '14', 10),

  // Cost Guard Limits
  MAX_CALL_DURATION_SECONDS: parseInt(process.env.MAX_CALL_DURATION_SECONDS || '180', 10),
  MAX_TURNS_PER_CALL: parseInt(process.env.MAX_TURNS_PER_CALL || '20', 10),
  MAX_TTS_CHARACTERS_PER_CALL: parseInt(process.env.MAX_TTS_CHARACTERS_PER_CALL || '3500', 10),
  MAX_STT_SECONDS_PER_CALL: parseInt(process.env.MAX_STT_SECONDS_PER_CALL || '180', 10),
};
