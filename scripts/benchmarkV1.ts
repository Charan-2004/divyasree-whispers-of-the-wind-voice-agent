/**
 * Version 1 Benchmarking & Metrics Measurement Script
 * Measures empirical TTFR (Time to First Response), TTFT, Sentence 1 TTS, and state accuracy.
 */

import { performance } from 'perf_hooks';
import { createInitialState, calculateLeadClassification, QualificationState } from '../server/stateMachine.js';
import { generateAgentResponse, ConversationMessage } from '../server/geminiService.js';
import { splitIntoSpeechChunks, synthesizeSpeechChunk } from '../server/sarvamTTS.js';

interface BenchmarkResult {
  flowName: string;
  turnsCount: number;
  avgLlmLatencyMs: number;
  avgFirstChunkTtsMs: number;
  avgTtfrMs: number;
  avgTotalTtsMs: number;
  stateAccuracy: boolean;
  classificationResult: string;
}

const BENCHMARK_FLOWS = [
  {
    name: 'Flow 1: Hot Self-Use Lead (Arjun Mehta)',
    turns: [
      "Yes, sure. I have a minute.",
      "I am looking for a peaceful weekend retreat for my family in Nandi Hills away from city noise.",
      "Our budget is around 1.5 Crore, so starting at 92.4 lakh fits very well.",
      "December 2029 is a good timeline for us. Please schedule a private site visit this weekend."
    ],
    expectedClassification: 'HOT'
  },
  {
    name: 'Flow 2: Investment Lead (Priya Sharma)',
    turns: [
      "Yes, please go ahead.",
      "I am an NRI looking for long-term plotted land investments in the North Bangalore corridor.",
      "Around 1.5 to 2 Crore is comfortable. What kind of returns are typically expected?",
      "Understood on market dynamics. 2029 possession works. Please connect me with the Property Expert."
    ],
    expectedClassification: 'HOT'
  },
  {
    name: 'Flow 3: Budget Mismatch Lead (Vikram Malhotra)',
    turns: [
      "Yes, tell me briefly.",
      "I love Nandi Hills for a small weekend getaway, but my strict budget is only 45 to 50 lakhs.",
      "Understood. Please keep me on the list if smaller plots open up in the future."
    ],
    expectedClassification: 'COLD'
  },
  {
    name: 'Flow 4: Location Mismatch Lead (Ananya Rao)',
    turns: [
      "Yes, I have a minute.",
      "I have a budget of 1.5 Cr, but Nandi Hills is far too distant. I am strictly looking for plots in Whitefield or Sarjapur.",
      "No thank you, I only want East Bangalore."
    ],
    expectedClassification: 'COLD'
  },
  {
    name: 'Flow 5: Irritated / Do-Not-Contact (Rajesh Verma)',
    turns: [
      "Please stop calling me! Remove my number from your database immediately."
    ],
    expectedClassification: 'DO_NOT_CONTACT'
  }
];

async function runBenchmark() {
  console.log('===============================================================');
  console.log('       OPTIMIZED V1 VOICE-AI PIPELINED STREAMING BENCHMARK     ');
  console.log('===============================================================\n');

  const results: BenchmarkResult[] = [];

  for (const flow of BENCHMARK_FLOWS) {
    console.log(`▶ Benchmarking: ${flow.name}`);
    let state: QualificationState = createInitialState();
    const history: ConversationMessage[] = [];
    const llmLatencies: number[] = [];
    const firstChunkTtsLatencies: number[] = [];
    const ttfrLatencies: number[] = [];
    const totalTtsLatencies: number[] = [];

    for (const utterance of flow.turns) {
      history.push({ role: 'user', text: utterance });
      
      // Measure LLM Generation Latency
      const t0 = performance.now();
      const response = await generateAgentResponse(history, state, utterance);
      const llmTime = performance.now() - t0;
      llmLatencies.push(llmTime);

      Object.assign(state, response.state_updates);
      history.push({ role: 'agent', text: response.reply });

      // Measure Pipelined Sentence TTS
      const chunks = splitIntoSpeechChunks(response.reply);
      const chunkTimes: number[] = [];

      for (let i = 0; i < chunks.length; i++) {
        const tc0 = performance.now();
        await synthesizeSpeechChunk(chunks[i], { language_code: 'en-IN' });
        const tcTime = performance.now() - tc0;
        chunkTimes.push(tcTime);
      }

      const firstChunkTts = chunkTimes[0] || 0;
      const totalTts = chunkTimes.reduce((a, b) => a + b, 0);
      const ttfr = llmTime + firstChunkTts; // Perceived latency until first sound!

      firstChunkTtsLatencies.push(firstChunkTts);
      totalTtsLatencies.push(totalTts);
      ttfrLatencies.push(ttfr);

      console.log(`  Turn latency -> LLM: ${llmTime.toFixed(0)}ms | Chunk 1 TTS: ${firstChunkTts.toFixed(0)}ms | TTFR (Perceived): ${ttfr.toFixed(0)}ms | Total TTS (${chunks.length} chunks): ${totalTts.toFixed(0)}ms`);

      if (response.should_end_call || state.conversation_complete) break;
    }

    const finalEval = calculateLeadClassification(state);
    state.lead_classification = finalEval.classification;

    const avgLlm = llmLatencies.reduce((a, b) => a + b, 0) / llmLatencies.length;
    const avgFirstChunkTts = firstChunkTtsLatencies.reduce((a, b) => a + b, 0) / firstChunkTtsLatencies.length;
    const avgTtfr = ttfrLatencies.reduce((a, b) => a + b, 0) / ttfrLatencies.length;
    const avgTotalTts = totalTtsLatencies.reduce((a, b) => a + b, 0) / totalTtsLatencies.length;

    const matched = state.lead_classification === flow.expectedClassification || 
                    (flow.expectedClassification === 'HOT' && state.lead_classification === 'WARM');

    results.push({
      flowName: flow.name,
      turnsCount: flow.turns.length,
      avgLlmLatencyMs: avgLlm,
      avgFirstChunkTtsMs: avgFirstChunkTts,
      avgTtfrMs: avgTtfr,
      avgTotalTtsMs: avgTotalTts,
      stateAccuracy: matched,
      classificationResult: state.lead_classification
    });

    console.log(`  Outcome: ${state.lead_classification} (Expected: ${flow.expectedClassification}) -> ${matched ? 'PASS' : 'FAIL'}\n`);
  }

  console.log('===============================================================');
  console.log('            OPTIMIZED V1 EMPIRICAL BENCHMARK TABLE             ');
  console.log('===============================================================');
  console.table(results.map(r => ({
    Flow: r.flowName.split(':')[0],
    Turns: r.turnsCount,
    'Avg LLM (ms)': Math.round(r.avgLlmLatencyMs),
    'Chunk 1 TTS (ms)': Math.round(r.avgFirstChunkTtsMs),
    'TTFR (First Sound) (ms)': Math.round(r.avgTtfrMs),
    'Total TTS (ms)': Math.round(r.avgTotalTtsMs),
    Classified: r.classificationResult,
    Accuracy: r.stateAccuracy ? '100%' : '0%'
  })));
}

runBenchmark().catch(err => {
  console.error('Benchmark failed:', err);
});
