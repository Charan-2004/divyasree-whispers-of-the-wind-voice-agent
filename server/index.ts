import express from 'express';
import { createServer } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { CONFIG } from './config.js';
import { livekitSessionManager, V2CallSession } from './v2/livekitSessionManager.js';
import { synthesizeSpeech } from './sarvamTTS.js';
import { transcribeAudio } from './sarvamSTT.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));

const server = createServer(app);
const wss = new WebSocketServer({ server, path: '/ws/call' });

// Health check endpoint
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    version: '2.0.0-livekit',
    service: 'Divyasree Whispers of the Wind AI Conversational Consultant',
    livekitUrl: CONFIG.LIVEKIT_URL,
    models: {
      llm: CONFIG.GEMINI_MODEL,
      stt: CONFIG.SARVAM_STT_MODEL,
      tts: CONFIG.SARVAM_TTS_MODEL,
    },
    costGuards: {
      maxCallDurationSeconds: CONFIG.MAX_CALL_DURATION_SECONDS,
      maxTurns: CONFIG.MAX_TURNS_PER_CALL,
      maxTtsChars: CONFIG.MAX_TTS_CHARACTERS_PER_CALL,
    },
  });
});

// LiveKit Room Token Generation Endpoint
app.post('/api/livekit/token', async (req, res) => {
  try {
    const { roomName, participantName } = req.body;
    const room = roomName || `whispers_room_${Date.now()}`;
    const participant = participantName || `evaluator_${Math.random().toString(36).substring(2, 7)}`;
    
    const token = await livekitSessionManager.createToken(room, participant);
    res.json({
      token,
      url: CONFIG.LIVEKIT_URL,
      roomName: room,
      participantName: participant
    });
  } catch (err: any) {
    console.error('Error generating LiveKit token:', err);
    res.status(500).json({ error: err.message || 'Failed to generate token' });
  }
});

// Preset Personas Endpoint
app.get('/api/personas', (_req, res) => {
  res.json([
    {
      id: 'custom',
      name: 'You (Live Evaluator)',
      title: 'Custom Prospect / Evaluator',
      city: 'Live Mic / Custom City',
      phone_masked: 'Freeform Voice & Text',
      scenario: 'Live Qualification Testing',
      avatar: '🎙️',
    },
    {
      id: 'arjun',
      name: 'Arjun Mehta',
      title: 'Tech VP / CXO',
      city: 'Indiranagar, Bengaluru',
      phone_masked: '+91 9845X-XX102',
      scenario: 'High-Intent Weekend Home Buyer',
      avatar: '👨‍💼',
    },
    {
      id: 'priya',
      name: 'Priya Sharma',
      title: 'NRI Managing Director',
      city: 'Singapore / Bengaluru',
      phone_masked: '+65 912X-XX89',
      scenario: 'High-Yield Plotted Investor',
      avatar: '👩‍💼',
    },
    {
      id: 'vikram',
      name: 'Vikram Malhotra',
      title: 'Startup Founder',
      city: 'Koramangala, Bengaluru',
      phone_masked: '+91 9980X-XX341',
      scenario: 'Budget Mismatch Lead (₹50L)',
      avatar: '🧑‍💻',
    },
    {
      id: 'ananya',
      name: 'Ananya Rao',
      title: 'Design Director',
      city: 'Whitefield, Bengaluru',
      phone_masked: '+91 9741X-XX567',
      scenario: 'Location Mismatch Lead (East BLR only)',
      avatar: '👩‍🎨',
    },
    {
      id: 'rajesh',
      name: 'Rajesh Verma',
      title: 'Senior Consultant',
      city: 'Bellary Road, Bengaluru',
      phone_masked: '+91 9611X-XX998',
      scenario: 'Irritated / Do-Not-Contact Lead',
      avatar: '🛑',
    },
    {
      id: 'sunita',
      name: 'Sunita Agarwal',
      title: 'Business Owner',
      city: 'Sadashivanagar, Bengaluru',
      phone_masked: '+91 9886X-XX234',
      scenario: 'Hinglish / Hindi Speaker Lead',
      avatar: '🇮🇳',
    },
  ]);
});

// Quick TTS preview endpoint
app.post('/api/tts-preview', async (req, res) => {
  try {
    const { text, speaker, language_code } = req.body;
    const result = await synthesizeSpeech({
      text: text || 'Welcome to Divyasree Whispers of the Wind.',
      speaker: speaker || 'shubh',
      language_code: language_code || 'en-IN',
    });
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Post-Call Deep Analysis Audit Endpoint
app.post('/api/call/audit', async (req, res) => {
  try {
    const { history, qualificationState, interruptions } = req.body || {};
    const { analyzeCompletedCall } = await import('./v2/callAuditor.js');
    const audit = await analyzeCompletedCall(
      history || [],
      qualificationState || {
        intent: null,
        location_fit: null,
        budget_fit: null,
        timeline_fit: null,
        language: 'en-IN',
        lead_temperature: 'warm',
        lead_classification: 'WARM',
        objections: [],
        handoff_requested: false,
        turns_count: (history || []).length,
        total_duration_seconds: 0,
        permission: null
      },
      interruptions || []
    );
    res.json(audit);
  } catch (err: any) {
    console.error('Error generating post-call audit:', err);
    res.status(500).json({ error: err.message || 'Audit generation failed' });
  }
});

// V2 Real-Time Conversational WebSocket Bridge
wss.on('connection', (ws: WebSocket) => {
  const sessionId = `v2_call_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
  const roomName = `room_${sessionId}`;
  const session = livekitSessionManager.createSession(sessionId, roomName);

  const send = (data: any) => {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(data));
    }
  };

  const finalizeAndAuditCall = async () => {
    session.isCompleted = true;
    send({
      type: 'call_completed',
      finalState: session.qualificationState,
      conversationState: session.conversationState,
      completionState: session.completionState
    });

    send({ type: 'audit_in_progress', message: 'Analyzing full conversation transcript with Deep LLM Lead Auditor...' });
    const audit = await livekitSessionManager.generatePostCallAudit(session);
    send({
      type: 'call_audit_completed',
      audit: audit
    });
  };

  ws.on('message', async (messageData: any) => {
    try {
      if (typeof messageData === 'string' || messageData instanceof Buffer) {
        let parsed: any;
        try {
          parsed = JSON.parse(messageData.toString());
        } catch {
          return;
        }

        if (parsed) {
          switch (parsed.type) {
            case 'start_call':
              const freshSession = livekitSessionManager.createSession(sessionId, roomName);
              Object.assign(session, freshSession);
              session.isCompleted = false;
              session.history = [];
              session.interruptionEvents = [];
              session.lastSpokenSentenceChunks = [];

              await livekitSessionManager.startOutboundCall(
                session,
                (chunkPayload) => {
                  send({
                    type: 'agent_chunk',
                    ...chunkPayload
                  });
                },
                (statePayload) => {
                  send({
                    type: 'agent_speaking_start',
                    ...statePayload
                  });
                }
              );
              break;

            case 'user_text':
              send({ type: 'user_message', text: parsed.text });
              send({ type: 'agent_thinking', turnId: session.currentTurnId + 1 });
              
              await livekitSessionManager.processTurn(
                session,
                parsed.text,
                (chunkPayload) => {
                  send({
                    type: 'agent_chunk',
                    ...chunkPayload
                  });
                },
                (statePayload) => {
                  send({
                    type: 'agent_speaking_start',
                    ...statePayload
                  });
                }
              );

              if (session.isCompleted) {
                await finalizeAndAuditCall();
              }
              break;

            case 'user_audio':
              if (parsed.audioBase64 && !session.isCompleted) {
                send({ type: 'agent_transcribing' });
                try {
                  const audioBuffer = Buffer.from(parsed.audioBase64, 'base64');
                  const sttResult = await transcribeAudio({ audioBuffer, mimeType: 'audio/wav' });
                  if (sttResult && sttResult.transcript && sttResult.transcript.trim()) {
                    send({ type: 'user_message', text: sttResult.transcript });
                    send({ type: 'agent_thinking', turnId: session.currentTurnId + 1 });
                    await livekitSessionManager.processTurn(
                      session,
                      sttResult.transcript,
                      (chunkPayload) => {
                        send({
                          type: 'agent_chunk',
                          ...chunkPayload
                        });
                      },
                      (statePayload) => {
                        send({
                          type: 'agent_speaking_start',
                          ...statePayload
                        });
                      }
                    );

                    if (session.isCompleted) {
                      await finalizeAndAuditCall();
                    }
                  }
                } catch (sttErr) {
                  console.warn('STT transcription processing notice:', sttErr);
                }
              }
              break;

            case 'barge_in':
              const newTurn = livekitSessionManager.handleBargeIn(session, parsed.userText || '');
              send({
                type: 'barge_in_acknowledged',
                turnId: newTurn
              });
              break;

            case 'end_call':
              await finalizeAndAuditCall();
              break;
          }
        }
      }
    } catch (err) {
      console.error('Error handling V2 WebSocket message:', err);
    }
  });

  ws.on('close', () => {
    session.isCompleted = true;
  });
});

server.listen(CONFIG.PORT, () => {
  console.log(`=======================================================`);
  console.log(` Divyasree Whispers of the Wind AI Voice Agent (V2)`);
  console.log(` Running on: http://localhost:${CONFIG.PORT}`);
  console.log(` LiveKit URL: ${CONFIG.LIVEKIT_URL}`);
  console.log(` WebSocket: ws://localhost:${CONFIG.PORT}/ws/call`);
  console.log(` Environment: ${CONFIG.NODE_ENV}`);
  console.log(`=======================================================`);
});
