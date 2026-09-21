import json
import os
import secrets
from contextlib import asynccontextmanager
from pathlib import Path
from decimal import Decimal
from typing import Annotated

from fastapi import FastAPI, Depends, HTTPException, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.security import APIKeyHeader
from pydantic import BaseModel, Field
from app.pricing import calculate_quote
from app import knowledge
from app.ai_api import router as ai_router
from app.business_api import router as business_router
from app.services.voice_stream_service import voice_stream_engine, twilio_media_handler


from app.services.vendor_spinup_service import vendor_spinup_service


@asynccontextmanager
async def lifespan(app):
    knowledge.initialise()
    try:
        vendor_spinup_service.load_all_declarative_definitions()
    except Exception as e:
        print(f"Error loading vendor definitions: {e}")
    yield


app = FastAPI(
    title='Limo Autonomous Operations Platform',
    version='1.0.0',
    lifespan=lifespan,
    description='Comprehensive Autonomous Limo Fleet & Operations Platform: Booking, Pricing, Dispatch, Driver App, Autonomous Recovery, and AI Services.'
)

# Enable CORS for local development and web frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

key_header = APIKeyHeader(name='X-Demo-Key', auto_error=False)


def authenticate(key: Annotated[str | None, Depends(key_header)]):
    expected = os.getenv('DEMO_API_KEY', '')
    if not expected:
        # If not explicitly set in demo mode, allow default dev key
        expected = 'dev-demo-key-2026'
    if key is None or not (key == expected or secrets.compare_digest(key, expected)):
        raise HTTPException(401, 'Invalid demo API key')


# Business Operations API (Open for Portals & Operations)
app.include_router(business_router)

# AI LangGraph & Analysis API (Key Protected)
app.include_router(ai_router, dependencies=[Depends(authenticate)])


@app.websocket("/ws/voice/stream")
async def voice_websocket_stream(websocket: WebSocket):
    """
    Bi-directional real-time WebSocket audio & turn-taking stream for Voice AI Concierge.
    Handles barge-in interruption frames, consent negotiation, and quote-to-hold commitments.
    """
    await websocket.accept()
    session = voice_stream_engine.get_or_create_session()
    
    # Send initial connection handshake
    await websocket.send_json({
        "type": "SESSION_INIT",
        "session_id": session.session_id,
        "caller_phone": session.caller_phone,
        "state": session.state,
        "consent_required": True,
        "message": "Connected to Sovereign Voice AI Concierge. Regulatory recording consent required before dispatch intake."
    })

    try:
        while True:
            data = await websocket.receive_json()
            event_type = data.get("type", "").upper()

            if event_type == "PING":
                await websocket.send_json({"type": "PONG", "timestamp": data.get("timestamp")})

            elif event_type == "CONSENT":
                consent_val = bool(data.get("consent", True))
                res = voice_stream_engine.process_consent(session.session_id, consent_val)
                await websocket.send_json({
                    "type": "CONSENT_ACK",
                    "payload": res
                })

            elif event_type == "BARGE_IN":
                res = voice_stream_engine.handle_barge_in(session.session_id)
                await websocket.send_json({
                    "type": "BARGE_IN_TRIGGERED",
                    "payload": res
                })

            elif event_type in ["USER_SPEECH", "AUDIO_CHUNK_FINAL"]:
                transcript = data.get("transcript", "")
                res = voice_stream_engine.process_user_speech(session.session_id, transcript)
                await websocket.send_json({
                    "type": "AGENT_RESPONSE",
                    "payload": res
                })

            elif event_type == "RAW_AUDIO_CHUNK":
                payload_b64 = data.get("payload_b64", "")
                res = voice_stream_engine.process_raw_audio_chunk(session.session_id, payload_b64)
                await websocket.send_json({
                    "type": "AUDIO_CHUNK_ACK",
                    "payload": res
                })

            elif event_type == "GET_STATE":
                curr_sess = voice_stream_engine.get_session(session.session_id)
                await websocket.send_json({
                    "type": "SESSION_STATE",
                    "session": curr_sess.dict() if curr_sess else None
                })

    except WebSocketDisconnect:
        # Client gracefully or ungracefully disconnected
        pass
    except Exception as exc:
        await websocket.close(code=1011, reason=str(exc))


@app.websocket("/ws/voice/twilio/media")
async def twilio_voice_media_stream(websocket: WebSocket):
    """
    Twilio Media Streams bi-directional audio WebSocket gateway.
    Transcodes inbound μ-law audio packets and sends synthesized voice response.
    """
    await websocket.accept()
    stream_sid = None

    try:
        while True:
            data = await websocket.receive_json()
            response = twilio_media_handler.handle_twilio_message(data)

            if data.get("event") == "start":
                stream_sid = data.get("streamSid") or (data.get("start", {}).get("streamSid"))
                # Send welcome μ-law audio packet back to caller
                outbound = twilio_media_handler.generate_outbound_media_message(
                    stream_sid=stream_sid,
                    pcm_text="Welcome to Sovereign Voice AI Concierge."
                )
                await websocket.send_json(outbound)

            elif response and response.get("event") == "stream_stopped":
                break

    except WebSocketDisconnect:
        pass
    except Exception as exc:
        await websocket.close(code=1011, reason=str(exc))


def read_policy():
    path = Path(os.getenv('POLICY_PATH', 'config/demo-policy.json'))
    return json.loads(path.read_text(encoding='utf-8'))


class QuoteRequest(BaseModel):
    distance_km: Decimal = Field(ge=0, le=10000, max_digits=10, decimal_places=2)
    wait_minutes: int = Field(default=0, ge=0, le=1440)


@app.get('/health')
def health():
    return {
        'status': 'ok',
        'platform': 'Limo Autonomous Operations',
        'version': '1.0.0',
        'mode': 'autonomous-local',
        'live_integrations': True
    }


@app.get('/api/demo/policy')
def policy():
    return read_policy()


@app.post('/api/demo/quotes')
def quote(request: QuoteRequest):
    return calculate_quote(read_policy(), request.distance_km, request.wait_minutes)


# Mount frontend static distribution if built
frontend_dist = Path(__file__).parent.parent / 'frontend' / 'dist'
if frontend_dist.exists() and (frontend_dist / 'index.html').exists():
    app.mount("/", StaticFiles(directory=str(frontend_dist), html=True), name="static_frontend")
