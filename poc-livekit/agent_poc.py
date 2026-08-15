"""
LiveKit Agent Proof of Concept (POC)
Integrates LiveKit Agents with Sarvam Saaras v3 STT, Bulbul v3 TTS, and Gemini Flash LLM.
"""

import os
import asyncio
import dotenv

dotenv.load_dotenv()

async def test_livekit_sarvam_imports():
    print("Testing LiveKit Sarvam plugin imports...")
    try:
        from livekit.agents import AutoSubscribe, JobContext, WorkerOptions, cli, llm
        from livekit.plugins import sarvam, google
        print("[OK] LiveKit and Sarvam plugins imported successfully!")
        
        # Test STT initialization
        sarvam_key = os.getenv("SARVAM_API_KEY")
        if sarvam_key:
            stt = sarvam.STT(model="saaras:v3", api_key=sarvam_key)
            tts = sarvam.TTS(model="bulbul:v3", speaker="shubh", api_key=sarvam_key)
            print(f"[OK] Sarvam STT and TTS initialized successfully!")
            
        gemini_key = os.getenv("GEMINI_API_KEY")
        if gemini_key:
            model = google.LLM(model="gemini-2.5-flash", api_key=gemini_key)
            print(f"[OK] Google Gemini LLM initialized successfully!")
            
        return True
    except Exception as e:
        print(f"[FAIL] Import/Init failed: {e}")
        return False

if __name__ == "__main__":
    asyncio.run(test_livekit_sarvam_imports())
