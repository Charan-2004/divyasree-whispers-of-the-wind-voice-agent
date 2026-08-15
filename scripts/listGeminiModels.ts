import { CONFIG } from '../server/config.js';

async function listModels() {
  const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${CONFIG.GEMINI_API_KEY}`;
  try {
    const res = await fetch(url);
    const data = await res.json();
    console.log('Available models:');
    if (data.models) {
      data.models.forEach((m: any) => {
        if (m.supportedGenerationMethods?.includes('generateContent')) {
          console.log(`- ${m.name} (${m.displayName})`);
        }
      });
    } else {
      console.log(data);
    }
  } catch (e) {
    console.error('List models error:', e);
  }
}

listModels();
