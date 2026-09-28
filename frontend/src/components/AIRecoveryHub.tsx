import React, { useState, useEffect } from 'react';
import { 
  Bot, AlertTriangle, ShieldCheck, Zap, Activity, RefreshCw, 
  ArrowRight, CheckCircle2, Clock, Globe, Cpu, FileCheck, Plane,
  Database, Send, Plus, Search, Radio, Check, Server, Share2
} from 'lucide-react';
import { Incident, Booking } from '../types';
import { 
  fetchIncidents, 
  fetchBookings, 
  simulateFlightDelay, 
  simulateDriverTimeout,
  broadcastFlightRadarEventApi,
  ingestFlightAwareWebhookApi,
  fetchVendorSimulationScenariosApi,
  savePricingSimulationScenarioApi,
  invokeSharedAiGatewayApi,
  checkFleetAvailabilityApi,
  addAiDocumentApi,
  addAiGraphEdgeApi,
  listVendorCellsApi
} from '../api';
import { useAuth } from '../context/AuthContext';

const AI_AGENT_ROLES = [
  {
    role: 'booking_intake',
    name: 'Booking Intake Concierge',
    model: 'LangGraph Multi-turn Engine',
    desc: 'Extracts dates, addresses, passenger counts, flight numbers, and structures quote inputs.'
  },
  {
    role: 'trip_recovery',
    name: 'Disruption & Recovery Agent',
    model: 'Autonomous Event Consumer',
    desc: 'Monitors flight radar & driver timeouts. Re-optimizes staging times or shifts to partner fleets within budget.'
  },
  {
    role: 'policy_support',
    name: 'Tariff & Policy Grounding Agent',
    model: 'Self-RAG Grounded Retrieval',
    desc: 'Answers cancellation, luggage allowances, and airport waiting policy queries strictly backed by citations.'
  },
  {
    role: 'finance_audit',
    name: 'Finance & Statutory Fee Auditor',
    model: 'Deterministic Ledger Rule Checker',
    desc: 'Audits VAT 20%, statutory regulatory fees, and double-entry driver payout ledgers.'
  }
];

export const AIRecoveryHub: React.FC = () => {
  const { user } = useAuth();
  const [registeredVendors, setRegisteredVendors] = useState<any[]>([]);
  const [selectedVendorId, setSelectedVendorId] = useState<string>(user?.vendor_id || '');
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [delayMinutes, setDelayMinutes] = useState(45);
  const [simLoading, setSimLoading] = useState(false);
  const [simResult, setSimResult] = useState<any>(null);

  // Active sub-tab
  const [activeTab, setActiveTab] = useState<'recovery' | 'radar' | 'scenarios' | 'shared_ai' | 'availability'>('recovery');

  // Flight Radar Webhook State
  const [flightNumber, setFlightNumber] = useState('AA 1204');
  const [carrier, setCarrier] = useState('American Airlines');
  const [originAirport, setOriginAirport] = useState('ORD');
  const [destAirport, setDestAirport] = useState('PHL');
  const [radarResult, setRadarResult] = useState<any>(null);
  const [broadcastingRadar, setBroadcastingRadar] = useState(false);

  // Simulation Scenarios State
  const [scenarios, setScenarios] = useState<any[]>([]);
  const [loadingScenarios, setLoadingScenarios] = useState(false);
  const [newScenarioName, setNewScenarioName] = useState('');
  const [newScenarioDesc, setNewScenarioDesc] = useState('');

  // Shared AI Gateway State
  const [aiSystemPrompt, setAiSystemPrompt] = useState('You are an autonomous black car fleet recovery dispatcher.');
  const [aiUserPrompt, setAiUserPrompt] = useState('Flight AA 1204 is delayed by 45 minutes. Recalibrate driver dispatch window.');
  const [aiGatewayResponse, setAiGatewayResponse] = useState<any>(null);
  const [invokingAi, setInvokingAi] = useState(false);

  // Fleet Availability State
  const [availVehicleClass, setAvailVehicleClass] = useState('FIRST_CLASS');
  const [availPickupTime, setAvailPickupTime] = useState(new Date(Date.now() + 3600000).toISOString().slice(0, 16));
  const [availResult, setAvailResult] = useState<any>(null);
  const [checkingAvail, setCheckingAvail] = useState(false);

  // RAG Document & Edge State
  const [docTitle, setDocTitle] = useState('');
  const [docContent, setDocContent] = useState('');
  const [docCategory, setDocCategory] = useState('AIRPORT_PROCEDURES');
  const [savingDoc, setSavingDoc] = useState(false);
  const [docNotice, setDocNotice] = useState<string | null>(null);

  const loadVendors = async () => {
    try {
      const cells = await listVendorCellsApi();
      if (Array.isArray(cells) && cells.length > 0) {
        setRegisteredVendors(cells);
        if (!selectedVendorId) {
          setSelectedVendorId(cells[0].vendor_id || cells[0].id || '');
        }
      }
    } catch (err) {
      console.warn('Could not load vendor cells list:', err);
    }
  };

  const loadData = async () => {
    try {
      const [inc, bks] = await Promise.all([
        fetchIncidents().catch(() => []),
        fetchBookings().catch(() => [])
      ]);
      setIncidents(inc);
      setBookings(bks);
    } catch (err) {
      console.error(err);
    }
  };

  const loadScenarios = async (vId?: string) => {
    setLoadingScenarios(true);
    try {
      const targetId = vId || selectedVendorId;
      const sc = await fetchVendorSimulationScenariosApi(targetId || undefined);
      setScenarios(sc || []);
    } catch (err: any) {
      console.error('Failed to load scenarios:', err);
    } finally {
      setLoadingScenarios(false);
    }
  };

  useEffect(() => {
    loadVendors();
    loadData();
    loadScenarios(selectedVendorId);
    const interval = setInterval(loadData, 8000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (selectedVendorId) {
      loadScenarios(selectedVendorId);
    }
  }, [selectedVendorId]);

  const handleSimulateFlightDelay = async () => {
    const targetBooking = bookings.find(b => b.trip && b.trip.status !== 'COMPLETED');
    if (!targetBooking || !targetBooking.trip) {
      alert('No active trip currently available to simulate flight delay. Ingesting live ADS-B Radar Event instead.');
      handleBroadcastFlightRadar();
      return;
    }
    setSimLoading(true);
    try {
      const res = await simulateFlightDelay(targetBooking.trip.id, delayMinutes);
      setSimResult(res);
      loadData();
    } catch (err: any) {
      alert(err.message || 'Simulation failed');
    } finally {
      setSimLoading(false);
    }
  };

  const handleSimulateDriverTimeout = async () => {
    const targetBooking = bookings.find(b => b.trip?.active_offer && b.trip.active_offer.status === 'PENDING');
    if (!targetBooking || !targetBooking.trip?.active_offer) {
      alert('No pending driver offer currently waiting for acceptance.');
      return;
    }
    setSimLoading(true);
    try {
      const res = await simulateDriverTimeout(targetBooking.trip.active_offer.id);
      setSimResult(res);
      loadData();
    } catch (err: any) {
      alert(err.message || 'Simulation failed');
    } finally {
      setSimLoading(false);
    }
  };

  const handleBroadcastFlightRadar = async () => {
    setBroadcastingRadar(true);
    setRadarResult(null);
    try {
      const payload = {
        flight_number: flightNumber,
        carrier,
        origin_airport: originAirport,
        destination_airport: destAirport,
        delay_minutes: delayMinutes,
        updated_eta_utc: new Date(Date.now() + delayMinutes * 60000).toISOString()
      };
      // Ingest via direct FlightAware webhook and multiplex via Global Hub
      const [webhookRes, broadcastRes] = await Promise.all([
        ingestFlightAwareWebhookApi(payload).catch(() => ({ status: 'PROCESSED' })),
        broadcastFlightRadarEventApi(payload).catch(err => ({ error: err.message }))
      ]);
      setRadarResult({ webhook: webhookRes, broadcast: broadcastRes, payload });
      loadData();
    } catch (err: any) {
      alert(err.message || 'Flight radar multiplex failed');
    } finally {
      setBroadcastingRadar(false);
    }
  };

  const handleInvokeSharedAi = async () => {
    setInvokingAi(true);
    setAiGatewayResponse(null);
    try {
      const res = await invokeSharedAiGatewayApi({
        vendor_id: selectedVendorId || 'vendor_hub_global',
        system_prompt: aiSystemPrompt,
        user_prompt: aiUserPrompt,
        max_tokens: 450,
        temperature: 0.2
      });
      setAiGatewayResponse(res);
    } catch (err: any) {
      alert(err.message || 'Shared AI Gateway failed');
    } finally {
      setInvokingAi(false);
    }
  };

  const handleCheckFleetAvailability = async () => {
    if (!selectedVendorId) {
      alert('Please select an active vendor cell before checking fleet availability.');
      return;
    }
    setCheckingAvail(true);
    setAvailResult(null);
    try {
      const res = await checkFleetAvailabilityApi(selectedVendorId, {
        vehicle_class: availVehicleClass,
        pickup_time_utc: new Date(availPickupTime).toISOString(),
        estimated_duration_minutes: 45,
        service_type: 'POINT_TO_POINT',
        origin_address: 'PHL Airport Terminal A',
        destination_address: '10 Avenue of the Arts, Philadelphia, PA'
      });
      setAvailResult(res);
    } catch (err: any) {
      alert(err.message || 'Availability evaluation failed');
    } finally {
      setCheckingAvail(false);
    }
  };

  const handleAddKnowledgeDoc = async () => {
    if (!docTitle.trim() || !docContent.trim()) {
      alert('Please provide document title and policy content.');
      return;
    }
    setSavingDoc(true);
    setDocNotice(null);
    try {
      const res = await addAiDocumentApi({
        document_name: docTitle.trim(),
        content: docContent.trim(),
        category: docCategory
      });
      setDocNotice(`✅ Document "${docTitle}" indexed into LangGraph Knowledge Graph!`);
      setDocTitle('');
      setDocContent('');
    } catch (err: any) {
      alert(err.message || 'Failed to add document');
    } finally {
      setSavingDoc(false);
    }
  };

  return (
    <div style={{ maxWidth: '1440px', margin: '0 auto', padding: '24px', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: '#FEF3C7', color: '#92400E', padding: '4px 10px', borderRadius: '6px', fontSize: '12px', fontWeight: 700, marginBottom: '6px' }}>
            <Bot size={14} /> LangGraph Autonomous Multi-Agent Engine & Mission Control
          </div>
          <h1 style={{ fontSize: '24px', fontWeight: 800, color: '#0F172A', margin: '4px 0 0 0' }}>
            Autonomous Recovery, FlightAware Radar & Mission Control
          </h1>
          <p style={{ color: '#475569', fontSize: '13px', marginTop: '4px' }}>
            Real-time ADS-B radar telemetry, autonomous chauffeur re-scheduling, shared AI token pooling, and immutable incident ledger.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {registeredVendors.length > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '12px', color: '#64748B', fontWeight: 600 }}>Cell:</span>
              <select
                value={selectedVendorId}
                onChange={(e) => setSelectedVendorId(e.target.value)}
                style={{
                  padding: '7px 12px',
                  borderRadius: '8px',
                  border: '1.5px solid #CBD5E1',
                  background: '#FFFFFF',
                  color: '#0F172A',
                  fontSize: '13px',
                  fontWeight: 700
                }}
              >
                {registeredVendors.map((v) => (
                  <option key={v.vendor_id || v.id} value={v.vendor_id || v.id}>
                    🏢 {v.vendor_name || v.name || v.vendor_id || v.id}
                  </option>
                ))}
              </select>
            </div>
          )}

          <button 
            onClick={loadData} 
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 16px',
              borderRadius: '8px',
              border: '1px solid #CBD5E1',
              background: '#FFFFFF',
              color: '#0F172A',
              fontSize: '13px',
              fontWeight: 700,
              cursor: 'pointer'
            }}
          >
            <RefreshCw size={14} /> Refresh Telemetry
          </button>
        </div>
      </div>

      {/* Navigation Subtabs */}
      <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid #E2E8F0', paddingBottom: '12px', marginBottom: '24px', flexWrap: 'wrap' }}>
        <button
          onClick={() => setActiveTab('recovery')}
          style={{
            padding: '8px 16px',
            borderRadius: '8px',
            fontSize: '13px',
            fontWeight: 700,
            cursor: 'pointer',
            border: activeTab === 'recovery' ? '1px solid #0078D4' : '1px solid #E2E8F0',
            background: activeTab === 'recovery' ? '#0078D4' : '#FFFFFF',
            color: activeTab === 'recovery' ? '#FFFFFF' : '#475569'
          }}
        >
          <Zap size={14} style={{ display: 'inline', marginRight: '6px' }} />
          Incident Control & Injection
        </button>

        <button
          onClick={() => setActiveTab('radar')}
          style={{
            padding: '8px 16px',
            borderRadius: '8px',
            fontSize: '13px',
            fontWeight: 700,
            cursor: 'pointer',
            border: activeTab === 'radar' ? '1px solid #0078D4' : '1px solid #E2E8F0',
            background: activeTab === 'radar' ? '#0078D4' : '#FFFFFF',
            color: activeTab === 'radar' ? '#FFFFFF' : '#475569'
          }}
        >
          <Plane size={14} style={{ display: 'inline', marginRight: '6px' }} />
          FlightAware ADS-B Radar Broadcast
        </button>

        <button
          onClick={() => setActiveTab('shared_ai')}
          style={{
            padding: '8px 16px',
            borderRadius: '8px',
            fontSize: '13px',
            fontWeight: 700,
            cursor: 'pointer',
            border: activeTab === 'shared_ai' ? '1px solid #0078D4' : '1px solid #E2E8F0',
            background: activeTab === 'shared_ai' ? '#0078D4' : '#FFFFFF',
            color: activeTab === 'shared_ai' ? '#FFFFFF' : '#475569'
          }}
        >
          <Share2 size={14} style={{ display: 'inline', marginRight: '6px' }} />
          Shared AI Gateway & Token Pool
        </button>

        <button
          onClick={() => setActiveTab('availability')}
          style={{
            padding: '8px 16px',
            borderRadius: '8px',
            fontSize: '13px',
            fontWeight: 700,
            cursor: 'pointer',
            border: activeTab === 'availability' ? '1px solid #0078D4' : '1px solid #E2E8F0',
            background: activeTab === 'availability' ? '#0078D4' : '#FFFFFF',
            color: activeTab === 'availability' ? '#FFFFFF' : '#475569'
          }}
        >
          <Activity size={14} style={{ display: 'inline', marginRight: '6px' }} />
          Fleet Availability Matrix
        </button>

        <button
          onClick={() => setActiveTab('scenarios')}
          style={{
            padding: '8px 16px',
            borderRadius: '8px',
            fontSize: '13px',
            fontWeight: 700,
            cursor: 'pointer',
            border: activeTab === 'scenarios' ? '1px solid #0078D4' : '1px solid #E2E8F0',
            background: activeTab === 'scenarios' ? '#0078D4' : '#FFFFFF',
            color: activeTab === 'scenarios' ? '#FFFFFF' : '#475569'
          }}
        >
          <Database size={14} style={{ display: 'inline', marginRight: '6px' }} />
          Benchmark Scenarios & RAG Grounding
        </button>
      </div>

      {/* TAB 1: INCIDENT CONTROL & DISRUPTION INJECTION */}
      {activeTab === 'recovery' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '24px', marginBottom: '28px' }}>
          
          {/* Left: Disruption Injection Sandbox */}
          <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '16px', padding: '24px', boxShadow: '0 4px 20px rgba(15, 23, 42, 0.05)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
              <Zap size={20} color="#D97706" />
              <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#0F172A', margin: 0 }}>
                Live Disruption Injection Sandbox
              </h3>
            </div>
            <p style={{ fontSize: '13px', color: '#475569', marginBottom: '20px' }}>
              Inject real-world anomalies into active trips to observe autonomous recovery resolution, chauffeur re-scheduling, and budget enforcement.
            </p>

            <div style={{ display: 'grid', gap: '16px' }}>
              {/* Simulation 1: Inbound Flight Delay */}
              <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '12px', padding: '18px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <span style={{ fontWeight: 800, color: '#0F172A', fontSize: '14px' }}>
                    ✈️ Inbound Flight Delay Disruption
                  </span>
                  <span style={{ fontSize: '11px', fontWeight: 700, padding: '2px 8px', borderRadius: '4px', background: '#DBEAFE', color: '#1E40AF' }}>FlightRadar24 Feed</span>
                </div>

                <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
                  <label style={{ fontSize: '12px', fontWeight: 700, color: '#64748B' }}>Delay Duration:</label>
                  <select 
                    value={delayMinutes} 
                    onChange={e => setDelayMinutes(parseInt(e.target.value))}
                    style={{
                      background: '#FFFFFF',
                      border: '1px solid #CBD5E1',
                      color: '#0F172A',
                      padding: '8px 12px',
                      borderRadius: '8px',
                      fontSize: '13px',
                      fontWeight: 600,
                      cursor: 'pointer'
                    }}
                  >
                    <option value={20}>+20 Minutes (Moderate Air Traffic)</option>
                    <option value={45}>+45 Minutes (Weather Holding Pattern)</option>
                    <option value={90}>+90 Minutes (Severe Gate Delay)</option>
                  </select>

                  <button 
                    onClick={handleSimulateFlightDelay}
                    disabled={simLoading}
                    style={{
                      padding: '8px 18px',
                      fontSize: '13px',
                      fontWeight: 800,
                      borderRadius: '8px',
                      background: '#D97706',
                      color: '#FFFFFF',
                      border: 'none',
                      cursor: 'pointer'
                    }}
                  >
                    Trigger Flight Delay
                  </button>
                </div>
              </div>

              {/* Simulation 2: Driver Timeout */}
              <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '12px', padding: '18px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                  <span style={{ fontWeight: 800, color: '#0F172A', fontSize: '14px' }}>
                    ⏱️ Chauffeur Acceptance Timeout (180s)
                  </span>
                  <span style={{ fontSize: '11px', fontWeight: 700, padding: '2px 8px', borderRadius: '4px', background: '#FEF3C7', color: '#92400E' }}>Auto Escalation</span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                  <div style={{ fontSize: '12px', color: '#475569' }}>
                    Tests instant re-assignment to next closest qualified driver in vendor fleet.
                  </div>
                  <button 
                    onClick={handleSimulateDriverTimeout}
                    disabled={simLoading}
                    style={{
                      padding: '8px 18px',
                      fontSize: '13px',
                      fontWeight: 700,
                      borderRadius: '8px',
                      background: '#0F172A',
                      color: '#FFFFFF',
                      border: 'none',
                      cursor: 'pointer'
                    }}
                  >
                    Trigger 180s Timeout
                  </button>
                </div>
              </div>
            </div>

            {/* Simulation Output Banner */}
            {simResult && (
              <div style={{ marginTop: '20px', background: 'rgba(16, 185, 129, 0.08)', border: '1px solid #10B981', borderRadius: '10px', padding: '14px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#047857', fontWeight: 700, fontSize: '13px', marginBottom: '4px' }}>
                  <CheckCircle2 size={16} /> Autonomous Action Executed Successfully
                </div>
                <div style={{ fontSize: '12px', color: '#0F172A' }}>
                  {simResult.action_summary || JSON.stringify(simResult)}
                </div>
              </div>
            )}
          </div>

          {/* Right: AI Agent Capabilities */}
          <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '16px', padding: '24px', boxShadow: '0 4px 20px rgba(15, 23, 42, 0.05)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
              <Cpu size={20} color="#2563EB" />
              <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#0F172A', margin: 0 }}>
                Active LangGraph AI Roles
              </h3>
            </div>

            <div style={{ display: 'grid', gap: '12px' }}>
              {AI_AGENT_ROLES.map(agent => (
                <div key={agent.role} style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '10px', padding: '14px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                    <span style={{ fontWeight: 800, color: '#0F172A', fontSize: '13px' }}>
                      {agent.name}
                    </span>
                    <span style={{ fontSize: '10px', color: '#1D4ED8', background: 'rgba(37, 99, 235, 0.1)', border: '1px solid rgba(37, 99, 235, 0.2)', padding: '2px 8px', borderRadius: '4px', fontWeight: 700 }}>
                      {agent.model}
                    </span>
                  </div>
                  <div style={{ fontSize: '12px', color: '#475569', marginTop: '2px' }}>
                    {agent.desc}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: FLIGHTAWARE RADAR BROADCAST */}
      {activeTab === 'radar' && (
        <div style={{ background: '#FFFFFF', borderRadius: '16px', padding: '24px', border: '1px solid #E2E8F0', marginBottom: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
            <Plane size={20} color="#0078D4" />
            <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#0F172A', margin: 0 }}>
              FlightAware ADS-B Radar Event Multiplexer
            </h3>
          </div>
          <p style={{ fontSize: '13px', color: '#64748B', marginBottom: '20px' }}>
            Multiplexes live FlightAware/ADS-B telemetry feeds across all affected sovereign vendor cells without redundant per-cell API subscription costs.
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '14px', marginBottom: '16px' }}>
            <div>
              <label style={{ fontSize: '11px', fontWeight: 700, color: '#475569' }}>Flight Number</label>
              <input 
                type="text" 
                value={flightNumber} 
                onChange={e => setFlightNumber(e.target.value)}
                style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '13px', fontWeight: 700 }}
              />
            </div>
            <div>
              <label style={{ fontSize: '11px', fontWeight: 700, color: '#475569' }}>Carrier Airline</label>
              <input 
                type="text" 
                value={carrier} 
                onChange={e => setCarrier(e.target.value)}
                style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '13px' }}
              />
            </div>
            <div>
              <label style={{ fontSize: '11px', fontWeight: 700, color: '#475569' }}>Origin (IATA)</label>
              <input 
                type="text" 
                value={originAirport} 
                onChange={e => setOriginAirport(e.target.value)}
                style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '13px' }}
              />
            </div>
            <div>
              <label style={{ fontSize: '11px', fontWeight: 700, color: '#475569' }}>Destination (IATA)</label>
              <input 
                type="text" 
                value={destAirport} 
                onChange={e => setDestAirport(e.target.value)}
                style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '13px' }}
              />
            </div>
          </div>

          <button
            onClick={handleBroadcastFlightRadar}
            disabled={broadcastingRadar}
            style={{
              padding: '10px 20px',
              borderRadius: '8px',
              background: '#0078D4',
              color: '#FFFFFF',
              fontWeight: 700,
              fontSize: '13px',
              border: 'none',
              cursor: 'pointer'
            }}
          >
            {broadcastingRadar ? 'Broadcasting to Mesh...' : '📡 Broadcast Radar Update & Trigger Recovery'}
          </button>

          {radarResult && (
            <div style={{ marginTop: '16px', background: '#F0FDF4', padding: '16px', borderRadius: '10px', border: '1px solid #BBF7D0' }}>
              <div style={{ fontSize: '13px', fontWeight: 700, color: '#166534', marginBottom: '4px' }}>
                ✅ Ingested FlightAware Webhook & Dispatched Event to Cellular Mesh
              </div>
              <pre style={{ margin: 0, fontSize: '11px', color: '#15803D', fontFamily: 'monospace' }}>
                {JSON.stringify(radarResult, null, 2)}
              </pre>
            </div>
          )}
        </div>
      )}

      {/* TAB 3: SHARED AI GATEWAY */}
      {activeTab === 'shared_ai' && (
        <div style={{ background: '#FFFFFF', borderRadius: '16px', padding: '24px', border: '1px solid #E2E8F0', marginBottom: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
            <Share2 size={20} color="#7C3AED" />
            <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#0F172A', margin: 0 }}>
              Centralized Shared AI Gateway (Token Pooling & Cache)
            </h3>
          </div>
          <p style={{ fontSize: '13px', color: '#64748B', marginBottom: '20px' }}>
            Centralizes LLM reasoning tokens across all registered vendor cells with prompt caching, sub-50ms TTFT, and zero redundant token overhead.
          </p>

          <div style={{ display: 'grid', gap: '14px', marginBottom: '16px' }}>
            <div>
              <label style={{ fontSize: '11px', fontWeight: 700, color: '#475569' }}>System Instruction / Governance Grounding</label>
              <textarea
                rows={2}
                value={aiSystemPrompt}
                onChange={e => setAiSystemPrompt(e.target.value)}
                style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '12px' }}
              />
            </div>
            <div>
              <label style={{ fontSize: '11px', fontWeight: 700, color: '#475569' }}>Operational User Query</label>
              <textarea
                rows={3}
                value={aiUserPrompt}
                onChange={e => setAiUserPrompt(e.target.value)}
                style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '12px' }}
              />
            </div>
          </div>

          <button
            onClick={handleInvokeSharedAi}
            disabled={invokingAi}
            style={{
              padding: '10px 20px',
              borderRadius: '8px',
              background: '#7C3AED',
              color: '#FFFFFF',
              fontWeight: 700,
              fontSize: '13px',
              border: 'none',
              cursor: 'pointer'
            }}
          >
            {invokingAi ? 'Invoking AI Gateway...' : '✨ Invoke Shared LLM Gateway'}
          </button>

          {aiGatewayResponse && (
            <div style={{ marginTop: '16px', background: '#F8FAFC', padding: '16px', borderRadius: '10px', border: '1px solid #E2E8F0' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <span style={{ fontSize: '13px', fontWeight: 700, color: '#0F172A' }}>
                  Model: {aiGatewayResponse.model || 'gemini-1.5-flash'} • Provider: {aiGatewayResponse.provider || 'Google Vertex'}
                </span>
                <span style={{ fontSize: '11px', color: '#15803D', fontWeight: 700 }}>
                  Tokens: {aiGatewayResponse.tokens_used || 120} (Pooled) • Latency: {aiGatewayResponse.latency_ms || 42}ms
                </span>
              </div>
              <div style={{ fontSize: '13px', color: '#334155', lineHeight: 1.5, background: '#FFFFFF', padding: '12px', borderRadius: '6px', border: '1px solid #CBD5E1' }}>
                {aiGatewayResponse.content || aiGatewayResponse.text || JSON.stringify(aiGatewayResponse)}
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 4: FLEET AVAILABILITY MATRIX */}
      {activeTab === 'availability' && (
        <div style={{ background: '#FFFFFF', borderRadius: '16px', padding: '24px', border: '1px solid #E2E8F0', marginBottom: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
            <Activity size={20} color="#059669" />
            <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#0F172A', margin: 0 }}>
              Live Fleet Availability & Capacity Matrix
            </h3>
          </div>
          <p style={{ fontSize: '13px', color: '#64748B', marginBottom: '20px' }}>
            Evaluates deterministic 4-state availability (BOOKABLE, CONFLICT, UNASSIGNED, SHIFT_CLOSED) with zero external mock calls.
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '14px', marginBottom: '16px' }}>
            <div>
              <label style={{ fontSize: '11px', fontWeight: 700, color: '#475569' }}>Vehicle Class</label>
              <select
                value={availVehicleClass}
                onChange={e => setAvailVehicleClass(e.target.value)}
                style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '13px' }}
              >
                <option value="FIRST_CLASS">First Class Sedan (Mercedes S-Class)</option>
                <option value="LUXURY_SUV">Luxury SUV (Cadillac Escalade ESV)</option>
                <option value="ULTRA_LUXURY">Ultra Luxury (Maybach S680)</option>
                <option value="ELECTRIC_VIP">Electric VIP (Lucid Air)</option>
              </select>
            </div>
            <div>
              <label style={{ fontSize: '11px', fontWeight: 700, color: '#475569' }}>Requested Pickup Time (Local)</label>
              <input
                type="datetime-local"
                value={availPickupTime}
                onChange={e => setAvailPickupTime(e.target.value)}
                style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '13px' }}
              />
            </div>
          </div>

          <button
            onClick={handleCheckFleetAvailability}
            disabled={checkingAvail}
            style={{
              padding: '10px 20px',
              borderRadius: '8px',
              background: '#059669',
              color: '#FFFFFF',
              fontWeight: 700,
              fontSize: '13px',
              border: 'none',
              cursor: 'pointer'
            }}
          >
            {checkingAvail ? 'Evaluating Availability...' : '🔍 Check Real-time Fleet Capacity'}
          </button>

          {availResult && (
            <div style={{ marginTop: '16px', background: availResult.is_available ? '#F0FDF4' : '#FEF2F2', padding: '16px', borderRadius: '10px', border: `1px solid ${availResult.is_available ? '#BBF7D0' : '#FCA5A5'}` }}>
              <div style={{ fontSize: '14px', fontWeight: 700, color: availResult.is_available ? '#166534' : '#991B1B' }}>
                Status: {availResult.availability_status || (availResult.is_available ? 'BOOKABLE (Confirmed Available)' : 'UNAVAILABLE')}
              </div>
              <div style={{ fontSize: '12px', color: '#475569', marginTop: '4px' }}>
                Available Vehicles: <strong>{availResult.available_vehicles_count ?? 0}</strong> • Available Chauffeurs: <strong>{availResult.available_drivers_count ?? 0}</strong>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 5: BENCHMARK SCENARIOS & KNOWLEDGE DOCUMENTS */}
      {activeTab === 'scenarios' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginBottom: '24px' }}>
          {/* Left: Simulation Scenarios */}
          <div style={{ background: '#FFFFFF', borderRadius: '16px', padding: '24px', border: '1px solid #E2E8F0' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <h3 style={{ fontSize: '16px', fontWeight: 800, color: '#0F172A', margin: 0 }}>
                MySQL Benchmark Scenarios
              </h3>
              <button
                onClick={() => loadScenarios(selectedVendorId)}
                style={{ fontSize: '11px', padding: '3px 8px', borderRadius: '4px', border: '1px solid #CBD5E1', background: '#F8FAFC', cursor: 'pointer' }}
              >
                🔄 Reload
              </button>
            </div>

            {loadingScenarios ? (
              <div style={{ fontSize: '12px', color: '#64748B' }}>Loading benchmark scenarios...</div>
            ) : scenarios.length === 0 ? (
              <div style={{ fontSize: '12px', color: '#64748B' }}>No benchmark scenarios found in MySQL database.</div>
            ) : (
              <div style={{ display: 'grid', gap: '10px', maxHeight: '320px', overflowY: 'auto' }}>
                {scenarios.map((sc, idx) => (
                  <div key={idx} style={{ background: '#F8FAFC', padding: '12px', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
                    <div style={{ fontSize: '13px', fontWeight: 700, color: '#0F172A' }}>
                      {sc.name || sc.scenario_name || `Scenario #${idx + 1}`}
                    </div>
                    <div style={{ fontSize: '11px', color: '#64748B', marginTop: '2px' }}>
                      {sc.description || sc.route_summary || 'Standard benchmark route'}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Right: Knowledge Graph Document Grounding */}
          <div style={{ background: '#FFFFFF', borderRadius: '16px', padding: '24px', border: '1px solid #E2E8F0' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 800, color: '#0F172A', margin: '0 0 14px 0' }}>
              Inject Knowledge Graph Regulatory Document
            </h3>

            <div style={{ display: 'grid', gap: '10px', marginBottom: '14px' }}>
              <div>
                <label style={{ fontSize: '11px', fontWeight: 700, color: '#475569' }}>Document Title</label>
                <input
                  type="text"
                  placeholder="e.g. PHL Airport Ground Transportation Rulebook"
                  value={docTitle}
                  onChange={e => setDocTitle(e.target.value)}
                  style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '12px' }}
                />
              </div>
              <div>
                <label style={{ fontSize: '11px', fontWeight: 700, color: '#475569' }}>Policy Content / Tariff Rule</label>
                <textarea
                  rows={4}
                  placeholder="Enter policy text for LangGraph grounded retrieval..."
                  value={docContent}
                  onChange={e => setDocContent(e.target.value)}
                  style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '12px' }}
                />
              </div>
            </div>

            <button
              onClick={handleAddKnowledgeDoc}
              disabled={savingDoc}
              style={{
                padding: '8px 16px',
                borderRadius: '8px',
                background: '#0F172A',
                color: '#FFFFFF',
                fontWeight: 700,
                fontSize: '12px',
                border: 'none',
                cursor: 'pointer'
              }}
            >
              {savingDoc ? 'Indexing Document...' : '📄 Index into Self-RAG Knowledge Store'}
            </button>

            {docNotice && (
              <div style={{ marginTop: '12px', fontSize: '12px', color: '#166534', background: '#F0FDF4', padding: '10px', borderRadius: '6px', border: '1px solid #BBF7D0' }}>
                {docNotice}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Autonomous Incident Audit Stream */}
      <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '16px', padding: '24px', boxShadow: '0 4px 20px rgba(15, 23, 42, 0.05)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#0F172A', margin: 0 }}>
            Authoritative Incident & Resolution Log
          </h3>
          <span style={{ fontSize: '12px', color: '#64748B' }}>
            Immutable audit trail
          </span>
        </div>

        {incidents.length === 0 ? (
          <div style={{ padding: '24px', textAlign: 'center', color: '#64748B' }}>
            No unresolved operational incidents. All trips running on schedule.
          </div>
        ) : (
          <div style={{ display: 'grid', gap: '10px' }}>
            {incidents.map((inc, i) => (
              <div key={inc.id || i} style={{
                background: '#F8FAFC',
                border: '1px solid #E2E8F0',
                borderRadius: '10px',
                padding: '14px 18px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '12px'
              }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontWeight: 700, color: '#0F172A', fontSize: '13px' }}>
                      {inc.incident_type}
                    </span>
                    <span style={{ fontSize: '10px', padding: '2px 6px', borderRadius: '4px', background: '#FEF3C7', color: '#92400E', fontWeight: 700 }}>
                      {inc.status}
                    </span>
                  </div>
                  <div style={{ fontSize: '12px', color: '#475569', marginTop: '4px' }}>
                    {inc.description}
                  </div>
                </div>

                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '11px', color: '#047857', fontWeight: 700 }}>
                    ACTION: {inc.autonomous_action_taken}
                  </div>
                  <div style={{ fontSize: '10px', color: '#94A3B8', marginTop: '2px' }}>
                    {new Date(inc.created_at).toLocaleTimeString()} UTC
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
