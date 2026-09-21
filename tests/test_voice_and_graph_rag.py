"""
Tests for Sprint 4:
- Track 1 (Phase 19): Real-Time Voice AI Telephony & Audio Streaming Engine
- Track 2 (Phase 20): GraphRAG Multi-Hop Regulatory & Procedures Knowledge Engine
"""
import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.services.voice_stream_service import voice_stream_engine, VoiceStreamSession
from app.services.graph_rag_service import graph_rag_engine, GraphNode, GraphEdge


@pytest.fixture
def client():
    return TestClient(app)


# =========================================================================
# Track 1: Voice AI Telephony & Streaming Engine Tests
# =========================================================================

def test_voice_stream_session_consent_and_barge_in():
    sess = voice_stream_engine.get_or_create_session()
    assert sess.state == "AWAITING_CONSENT"

    # Consent granted
    ack = voice_stream_engine.process_consent(sess.session_id, True)
    assert ack["consent"] is True
    assert ack["state"] == "LISTENING"
    assert "audio_frame" in ack
    assert ack["audio_frame"]["codec"] == "pcm_s16le"

    # Handle barge-in
    barge = voice_stream_engine.handle_barge_in(sess.session_id)
    assert barge["event"] == "BARGE_IN_TRIGGERED"
    assert barge["barge_in_count"] == 1
    assert barge["latency_ms"] < 50.0
    assert barge["new_state"] == "LISTENING"


def test_voice_conversational_quote_and_hold_saga():
    sess = voice_stream_engine.get_or_create_session()
    voice_stream_engine.process_consent(sess.session_id, True)

    # 1. User requests ride with route and tier
    res1 = voice_stream_engine.process_user_speech(
        sess.session_id,
        "I need a first-class Mercedes S-Class from JFK Terminal 4 to The Plaza Hotel Manhattan."
    )
    assert res1["state"] == "QUOTE_PRESENTED"
    assert res1["quote_amount_cents"] > 0
    assert res1["vehicle_tier"] == "FIRST_CLASS"
    assert "guaranteed all-inclusive executive fare" in res1["agent_text"]

    # 2. User confirms booking -> triggers preauth hold saga
    res2 = voice_stream_engine.process_user_speech(
        sess.session_id,
        "Confirmed, please go ahead and charge my corporate card."
    )
    assert res2["state"] == "HOLD_CONFIRMED"
    assert res2["preauth_hold_id"] is not None
    assert res2["preauth_hold_id"].startswith("hold_stripe_")
    assert "authorized a pre-auth hold" in res2["agent_text"]


def test_voice_simulate_call_rest_api(client):
    payload = {
        "caller_phone": "+1-212-555-0999",
        "passenger_name": "Senator Montgomery",
        "user_prompts": [
            "Yes, I agree to recording.",
            "Can I get an Escalade SUV from JFK to Manhattan Plaza Hotel?",
            "Book it now please."
        ]
    }
    response = client.post("/api/v1/voice/simulate-call", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["final_state"] == "HOLD_CONFIRMED"
    assert data["quote_amount_cents"] > 0
    assert data["preauth_hold_id"] is not None
    assert len(data["turns"]) == 3
    assert len(data["transcript_history"]) >= 4


def test_voice_websocket_endpoint(client):
    with client.websocket_connect("/ws/voice/stream") as websocket:
        init_msg = websocket.receive_json()
        assert init_msg["type"] == "SESSION_INIT"
        session_id = init_msg["session_id"]
        assert init_msg["consent_required"] is True

        # Send consent
        websocket.send_json({"type": "CONSENT", "consent": True})
        ack = websocket.receive_json()
        assert ack["type"] == "CONSENT_ACK"
        assert ack["payload"]["consent"] is True

        # Send speech
        websocket.send_json({
            "type": "USER_SPEECH",
            "transcript": "Need a first class ride from JFK to Plaza Hotel"
        })
        resp = websocket.receive_json()
        assert resp["type"] == "AGENT_RESPONSE"
        assert resp["payload"]["state"] == "QUOTE_PRESENTED"

        # Send Barge-In
        websocket.send_json({"type": "BARGE_IN"})
        barge_resp = websocket.receive_json()
        assert barge_resp["type"] == "BARGE_IN_TRIGGERED"
        assert barge_resp["payload"]["event"] == "BARGE_IN_TRIGGERED"


# =========================================================================
# Track 2: GraphRAG Multi-Hop Regulatory & Knowledge Engine Tests
# =========================================================================

def test_graph_rag_seeded_nodes():
    export = graph_rag_engine.export_graph()
    nodes = {n["id"]: n for n in export["nodes"]}
    
    assert "NYC_TLC" in nodes
    assert "LON_TFL" in nodes
    assert "CA_CPUC" in nodes
    assert "TYO_MLIT" in nodes
    assert "DXB_RTA" in nodes

    assert nodes["NYC_TLC"]["citation_id"] == "NYC_TLC_TITLE_35"
    assert nodes["LON_TFL"]["citation_id"] == "TFL_PHV_ACT_1998"
    assert nodes["CA_CPUC"]["citation_id"] == "CPUC_PUB_UTIL_SEC_5381"
    assert nodes["TYO_MLIT"]["citation_id"] == "MLIT_ROAD_TRANS_ACT_SEC_4"
    assert nodes["DXB_RTA"]["citation_id"] == "RTA_EXEC_COUNCIL_RES_2026"


def test_graph_rag_multi_hop_pathfinding():
    paths = graph_rag_engine.find_multi_hop_paths("NYC_TLC", max_hops=3)
    assert len(paths) >= 2
    
    # Verify path from NYC_TLC to JFK_VIP_T4 or Congestion Zone
    targets = [p.target_node for p in paths]
    assert "NYC_BCF_PERMIT" in targets
    assert ("JFK_VIP_T4" in targets or "NYC_CONGESTION_ZONE" in targets)

    # Check citations chain
    for p in paths:
        assert len(p.citations) >= 2
        assert "NYC_TLC_TITLE_35" in p.citations


def test_graph_rag_verification_and_hallucination_rejection():
    # Valid grounded claim
    valid_claim = "Operating in NYC requires compliance with Taxi & Limousine Commission TLC and Black Car Fund."
    res_valid = graph_rag_engine.verify_regulatory_claim(valid_claim, jurisdiction="NYC")
    assert res_valid.verified is True
    assert res_valid.confidence_score >= 0.90
    assert "NYC_TLC_TITLE_35" in res_valid.supporting_citations or "NY_EXEC_LAW_ART_6F" in res_valid.supporting_citations

    # Hallucinated illegal claim
    hallucinated_claim = "Drivers may do cash pickup allowed without permit in London Heathrow."
    res_hallucination = graph_rag_engine.verify_regulatory_claim(hallucinated_claim)
    assert res_hallucination.verified is False
    assert res_hallucination.confidence_score >= 0.95
    assert "contradicts statutory licensing" in res_hallucination.rejection_reason


def test_graph_rag_rest_api_endpoints(client):
    # Export graph
    export_resp = client.get("/api/v1/graph-rag/export")
    assert export_resp.status_code == 200
    assert len(export_resp.json()["nodes"]) >= 10

    # Paths query
    path_resp = client.post("/api/v1/graph-rag/paths", json={"start_node_id": "LON_TFL", "max_hops": 2})
    assert path_resp.status_code == 200
    assert path_resp.json()["path_count"] >= 1

    # Verify claim
    verify_resp = client.post("/api/v1/graph-rag/verify", json={
        "claim": "Dubai limousines must comply with RTA luxury licensing and Al Majlis VIP terminal rules.",
        "jurisdiction": "DXB"
    })
    assert verify_resp.status_code == 200
    assert verify_resp.json()["verified"] is True
    assert "RTA_EXEC_COUNCIL_RES_2026" in verify_resp.json()["supporting_citations"]


# =========================================================================
# Sprint 4 Advanced Extensions Tests: Twilio PSTN, Neo4j Aura & Raw Audio
# =========================================================================

def test_voice_raw_audio_chunk_ingestion():
    import base64
    dummy_payload = base64.b64encode(b"PCM_CHUNK_DATA_SAMPLE_FRAME_12345").decode("ascii")
    res = voice_stream_engine.process_raw_audio_chunk("vcall_test_mic", dummy_payload)
    assert res["audio_status"] == "PROCESSED_INTO_SPEECH_STREAM"
    assert res["bytes_received"] > 0
    assert res["vad_speech_detected"] is False  # under 100 bytes


def test_twilio_media_streams_websocket_lifecycle(client):
    from app.services.voice_stream_service import twilio_media_handler
    import base64

    with client.websocket_connect("/ws/voice/twilio/media") as websocket:
        # 1. Connected event
        websocket.send_json({"event": "connected", "protocol": "Call"})
        
        # 2. Start event
        websocket.send_json({
            "event": "start",
            "streamSid": "MZ_test_stream_001",
            "start": {
                "streamSid": "MZ_test_stream_001",
                "callSid": "CA_test_call_999",
                "customParameters": {"caller": "+1-212-555-0999"}
            }
        })
        outbound_msg = websocket.receive_json()
        assert outbound_msg["event"] == "media"
        assert outbound_msg["streamSid"] == "MZ_test_stream_001"
        assert "payload" in outbound_msg["media"]

        # 3. Inbound Media chunk
        dummy_mulaw = base64.b64encode(b"MULAW_AUDIO_SAMPLE").decode("ascii")
        websocket.send_json({
            "event": "media",
            "streamSid": "MZ_test_stream_001",
            "media": {"payload": dummy_mulaw}
        })

        # 4. Stop event
        websocket.send_json({
            "event": "stop",
            "streamSid": "MZ_test_stream_001"
        })


def test_twilio_generate_media_stream_twiml():
    from app.services.twilio_webhook_service import TwilioWebhookService
    twiml = TwilioWebhookService.generate_media_stream_twiml(caller_phone="+18005550199")
    assert "<Stream" in twiml
    assert "<Connect>" in twiml
    assert "wss://" in twiml
    assert "+18005550199" in twiml


def test_neo4j_cypher_export_and_sync():
    from app.services.graph_rag_service import neo4j_connector
    statements = neo4j_connector.generate_cypher_export()
    assert len(statements) >= 10
    assert any("CREATE CONSTRAINT" in s for s in statements)
    assert any("MERGE (n:RegulatoryNode" in s for s in statements)

    sync_res = neo4j_connector.sync_to_neo4j()
    assert sync_res["status"] == "SYNC_SUCCESS"
    assert sync_res["nodes_synced"] >= 10
    assert sync_res["edges_synced"] >= 6


def test_neo4j_cypher_rest_endpoints(client):
    # Sync endpoint
    sync_resp = client.post("/api/v1/graph-rag/neo4j/sync", json={"neo4j_uri": "neo4j+s://aura.test.database:7687"})
    assert sync_resp.status_code == 200
    assert sync_resp.json()["status"] == "SYNC_SUCCESS"

    # Cypher execution endpoint
    cypher_resp = client.post("/api/v1/graph-rag/neo4j/cypher", json={"cypher_query": "MATCH (n:RegulatoryNode) RETURN n.id LIMIT 5"})
    assert cypher_resp.status_code == 200
    assert cypher_resp.json()["status"] == "EXECUTED"
    assert cypher_resp.json()["result_count"] >= 1

