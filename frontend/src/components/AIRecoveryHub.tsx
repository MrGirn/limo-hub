import React, { useState, useEffect } from 'react';
import { 
  Bot, AlertTriangle, ShieldCheck, Zap, Activity, RefreshCw, 
  ArrowRight, CheckCircle2, Clock, Globe, Cpu, FileCheck
} from 'lucide-react';
import { Incident, Booking } from '../types';
import { fetchIncidents, fetchBookings, simulateFlightDelay, simulateDriverTimeout } from '../api';

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
    desc: 'Audits VAT 20%, Austrian 1% GebG fee, and double-entry driver payout ledgers.'
  }
];

export const AIRecoveryHub: React.FC = () => {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [delayMinutes, setDelayMinutes] = useState(40);
  const [simLoading, setSimLoading] = useState(false);
  const [simResult, setSimResult] = useState<any>(null);

  const loadData = async () => {
    try {
      const [inc, bks] = await Promise.all([
        fetchIncidents(),
        fetchBookings()
      ]);
      setIncidents(inc);
      setBookings(bks);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 6000);
    return () => clearInterval(interval);
  }, []);

  const handleSimulateFlightDelay = async () => {
    const targetBooking = bookings.find(b => b.trip && b.trip.status !== 'COMPLETED');
    if (!targetBooking || !targetBooking.trip) {
      alert('No active trip available to simulate flight delay');
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
      alert('No pending driver offer currently waiting for acceptance');
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

  return (
    <div style={{ maxWidth: '1440px', margin: '0 auto', padding: '24px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '28px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <div className="gold-badge" style={{ marginBottom: '6px' }}>
            <Bot size={13} /> LangGraph Autonomous Agents & Global Recovery
          </div>
          <h1 style={{ fontSize: '28px', fontWeight: 800, color: '#0F172A' }}>
            Autonomous Incident & Disruption Control Center
          </h1>
          <p style={{ color: '#475569', fontSize: '14px', marginTop: '4px' }}>
            Real-time event processing, deterministic recovery policies, and multi-agent reasoning traces without routine human queues.
          </p>
        </div>

        <button className="btn-secondary" onClick={loadData} style={{ fontSize: '13px', padding: '10px 16px' }}>
          <RefreshCw size={14} /> Refresh Traces
        </button>
      </div>

      {/* Disruption Simulator & Active Agent Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '24px', marginBottom: '28px' }}>
        
        {/* Left: Disruption Injection Sandbox */}
        <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '16px', padding: '24px', boxShadow: '0 4px 20px rgba(15, 23, 42, 0.05)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
            <Zap size={20} color="#D97706" />
            <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#0F172A' }}>
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
                <span className="blue-badge">FlightRadar24 Feed</span>
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
                  className="btn-gold" 
                  onClick={handleSimulateFlightDelay}
                  disabled={simLoading}
                  style={{ padding: '8px 18px', fontSize: '13px' }}
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
                <span className="gold-badge">Auto Escalation</span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                <div style={{ fontSize: '12px', color: '#475569' }}>
                  Tests instant re-assignment to next closest qualified driver in vendor fleet.
                </div>
                <button 
                  className="btn-secondary" 
                  onClick={handleSimulateDriverTimeout}
                  disabled={simLoading}
                  style={{ padding: '8px 18px', fontSize: '13px' }}
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
                {simResult.action_summary}
              </div>
            </div>
          )}
        </div>

        {/* Right: AI Agent Capabilities */}
        <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '16px', padding: '24px', boxShadow: '0 4px 20px rgba(15, 23, 42, 0.05)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
            <Cpu size={20} color="#2563EB" />
            <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#0F172A' }}>
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

      {/* Autonomous Incident Audit Stream */}
      <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '16px', padding: '24px', boxShadow: '0 4px 20px rgba(15, 23, 42, 0.05)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#0F172A' }}>
            Authoritative Incident & Resolution Log
          </h3>
          <span style={{ fontSize: '12px', color: '#64748B' }}>
            Immutable audit trail
          </span>
        </div>

        {incidents.length === 0 ? (
          <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)' }}>
            No unresolved operational incidents. All trips running on schedule.
          </div>
        ) : (
          <div style={{ display: 'grid', gap: '10px' }}>
            {incidents.map((inc, i) => (
              <div key={inc.id || i} style={{
                background: '#F8FAFC',
                border: '1px solid var(--border-subtle)',
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
                    <span style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '13px' }}>
                      {inc.incident_type}
                    </span>
                    <span className="gold-badge" style={{ fontSize: '10px', padding: '2px 6px' }}>
                      {inc.status}
                    </span>
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                    {inc.description}
                  </div>
                </div>

                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '11px', color: '#047857', fontWeight: 700 }}>
                    ACTION: {inc.autonomous_action_taken}
                  </div>
                  <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '2px' }}>
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
