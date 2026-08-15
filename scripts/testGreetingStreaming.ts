import { streamSpeechPipelined } from '../server/sarvamTTS.js';
import { CONFIG } from '../server/config.js';

async function testGreetingStreaming() {
  console.log('Testing streaming speech with speaker:', CONFIG.SARVAM_DEFAULT_SPEAKER);
  const greetingText = `Hello, this is Rohan calling from Divyasree regarding Whispers of the Wind, our private valley community near Nandi Hills. I know I am catching you during the day — do you have a quick minute to speak?`;

  let chunksReceived = 0;
  const t0 = Date.now();
  await streamSpeechPipelined(
    greetingText,
    {
      language_code: 'en-IN',
      speaker: CONFIG.SARVAM_DEFAULT_SPEAKER
    },
    (chunk) => {
      chunksReceived++;
      console.log(`[Chunk ${chunk.chunkIndex + 1}/${chunk.totalChunks}] in ${Date.now() - t0}ms: "${chunk.text}" | audio bytes: ${chunk.audioBase64?.length}`);
    },
    () => false
  );

  console.log('Finished streaming greeting. Total chunks:', chunksReceived);
}

testGreetingStreaming();
