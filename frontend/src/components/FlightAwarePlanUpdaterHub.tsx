import React, { useState, useEffect } from 'react';
import { 
  Plane, Train, Radio, Phone, MessageSquare, Mail, 
  Sparkles, CheckCircle2, Clock, MapPin, RefreshCw, Send, AlertTriangle
} from 'lucide-react';
import { TransitRadarEvent, Booking } from '../types';
import { fetchTransitRadarStream, simulateRadarDelay, executeInboundPlanUpdate, fetchBookings } from '../api';

export const FlightAwarePlanUpdaterHub: React.FC = () => {
  const [radarStream, setRadarStream] = useState<TransitRadarEvent[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'RADAR' | 'OMNICHANNEL'>('RADAR');
  const [lastActionRes, setLastActionRes] = useState<any | null>(null);

  // Radar simulator form
  const [flightNo, setFlightNo] = useState<string>('BA 178');
  const [delayMin, setDelayMin] = useState<number>(45);
  const [newArrival, setNewArrival] = useState<string>('18:30 UTC');
  const [delayReason, setDelayReason] = useState<string>('Air Traffic Control Congestion over Atlantic');

  // Omnichannel update simulator form
  const [selectedBookingId, setSelectedBookingId] = useState<string>('');
  const [intakeSource, setIntakeSource] = useState<'VOICE_HOTLINE' | 'WHATSAPP' | 'EMAIL'>('VOICE_HOTLINE');
  const [rawTranscript, setRawTranscript] = useState<string>(
    'Hello, this is Arthur Davies on flight BA 178. We just got delayed by 45 minutes departing London Heathrow due to weather. Please adjust my chauffeur pickup accordingly.'
  );

  const loadData = async () => {
    setLoading(true);
    try {
      const [radar, bks] = await Promise.all([
        fetchTransitRadarStream(),
        fetchBookings()
      ]);
      setRadarStream(radar);
      setBookings(bks);
      if (bks.length > 0 && !selectedBookingId) {
        setSelectedBookingId(bks[0].id);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 10000);
    return () => clearInterval(interval);
  }, []);

  const handleSimulateRadar = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setLastActionRes(null);
    try {
      const res = await simulateRadarDelay({
        flight_or_train_number: flightNo,
        delay_minutes: delayMin,
        new_estimated_arrival: newArrival,
        reason: delayReason
      });
      setLastActionRes({
        type: 'RADAR_EVENT',
        title: `Radar Event Ingested for ${flightNo}`,
        detail: `FlightAware radar broadcasted a +${delayMin} min delay. All matching bookings were autonomously rescheduled with deadhead staging adjusted.`,
        data: res
      });
      loadData();
    } catch (err: any) {
      alert(err.message || 'Simulation failed');
    } finally {
      setLoading(false);
    }
  };

  const handleExecuteInboundUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setLastActionRes(null);
    try {
      const res = await executeInboundPlanUpdate({
        booking_id: selectedBookingId || (bookings[0]?.id || 'bk-demo'),
        update_source: intakeSource,
        raw_message_transcript: rawTranscript,
        detected_delay_minutes: delayMin
      });
      setLastActionRes({
        type: 'AI_RESCHEDULE',
        title: `Agentic AI Plan Reschedule Executed`,
        detail: res.ai_reasoning,
        data: res
      });
      loadData();
    } catch (err: any) {
      alert(err.message || 'Update failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: '1440px', margin: '0 auto', padding: '24px' }}>
      {/* Header Banner - Executive White Light Luxury */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <div className="gold-badge" style={{ marginBottom: '6px' }}>
            <Radio size={12} className="pulse-live" /> FlightAware & Live Transit Radar
          </div>
          <h1 style={{ fontSize: '28px', fontWeight: 800, color: '#0F172A' }}>
            FlightAware ADS-B Radar & AI Autonomous Plan Updater
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginTop: '4px' }}>
            Automatic flight touchdown & train tracking with Omnichannel (Voice Call, WhatsApp, Email) AI intent extraction to dynamically reschedule reservations, 3-leg staging deadhead windows, and chauffeur arrivals.
          </p>
        </div>

        <button className="btn-secondary" onClick={loadData} style={{ fontSize: '13px', padding: '10px 16px' }}>
          <RefreshCw size={14} className={loading ? 'pulse-live' : ''} /> Refresh Telemetry Stream
        </button>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid var(--border-subtle)', marginBottom: '24px' }}>
        <button
          onClick={() => setActiveTab('RADAR')}
          style={{
            padding: '10px 18px',
            borderRadius: '8px',
            fontSize: '13px',
            fontWeight: 700,
            cursor: 'pointer',
            border: activeTab === 'RADAR' ? '1px solid #2563EB' : '1px solid transparent',
            background: activeTab === 'RADAR' ? '#EFF6FF' : 'transparent',
            color: activeTab === 'RADAR' ? '#2563EB' : 'var(--text-secondary)',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          <Plane size={15} /> FlightAware Radar Simulator
        </button>

        <button
          onClick={() => setActiveTab('OMNICHANNEL')}
          style={{
            padding: '10px 18px',
            borderRadius: '8px',
            fontSize: '13px',
            fontWeight: 700,
            cursor: 'pointer',
            border: activeTab === 'OMNICHANNEL' ? '1px solid #2563EB' : '1px solid transparent',
            background: activeTab === 'OMNICHANNEL' ? '#EFF6FF' : 'transparent',
            color: activeTab === 'OMNICHANNEL' ? '#2563EB' : 'var(--text-secondary)',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          <Sparkles size={15} /> Omnichannel Voice / Message AI Rescheduler
        </button>
      </div>

      {/* AI Action Execution Feedback Banner */}
      {lastActionRes && (
        <div style={{ background: '#F0FDF4', border: '1px solid #86EFAC', borderRadius: '12px', padding: '20px', marginBottom: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#166534', fontWeight: 800, fontSize: '15px', marginBottom: '6px' }}>
            <CheckCircle2 size={18} color="#16A34A" /> {lastActionRes.title}
          </div>
          <div style={{ fontSize: '13px', color: '#14532D', marginBottom: '10px' }}>
            {lastActionRes.detail}
          </div>
          {lastActionRes.data?.revised_pickup_utc && (
            <div style={{ display: 'flex', gap: '16px', fontSize: '12px', background: '#FFFFFF', padding: '10px 14px', borderRadius: '8px', border: '1px solid #BBF7D0' }}>
              <div><strong>Booking ID:</strong> {lastActionRes.data.booking_id}</div>
              <div><strong>Revised Pickup:</strong> {new Date(lastActionRes.data.revised_pickup_utc).toLocaleTimeString()} UTC</div>
              <div><strong>Chauffeur Staging:</strong> <span style={{ color: '#16A34A', fontWeight: 700 }}>SYNCHRONIZED</span></div>
              <div><strong>SMS & AWS SES:</strong> <span style={{ color: '#2563EB', fontWeight: 700 }}>DELIVERED</span></div>
            </div>
          )}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 420px', gap: '24px' }}>
        {/* Left Column: Interactive Simulation Control */}
        <div>
          {activeTab === 'RADAR' ? (
            <div className="glass-card" style={{ padding: '28px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <div>
                  <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#0F172A' }}>
                    Simulate FlightAware ADS-B Delay Event
                  </h3>
                  <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                    Trigger real-time flight tracking telemetry to verify automated chauffeur staging adjustment.
                  </p>
                </div>
                <div className="gold-badge">
                  <Plane size={12} /> ADS-B LIVE
                </div>
              </div>

              <form onSubmit={handleSimulateRadar}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px' }}>
                  <div>
                    <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                      AIRLINE & FLIGHT NUMBER *
                    </label>
                    <input
                      type="text"
                      required
                      value={flightNo}
                      onChange={(e) => setFlightNo(e.target.value)}
                      placeholder="e.g. BA 178, DL 492, AA 100"
                      style={{ width: '100%', padding: '10px', borderRadius: '8px', fontSize: '14px' }}
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                      RADAR DETECTED DELAY (MINUTES) *
                    </label>
                    <input
                      type="number"
                      required
                      value={delayMin}
                      onChange={(e) => setDelayMin(parseInt(e.target.value) || 0)}
                      style={{ width: '100%', padding: '10px', borderRadius: '8px', fontSize: '14px' }}
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                      NEW ESTIMATED TOUCHDOWN (UTC) *
                    </label>
                    <input
                      type="text"
                      required
                      value={newArrival}
                      onChange={(e) => setNewArrival(e.target.value)}
                      placeholder="e.g. 18:30 UTC"
                      style={{ width: '100%', padding: '10px', borderRadius: '8px', fontSize: '14px' }}
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                      TELEMETRY RADAR REASON
                    </label>
                    <input
                      type="text"
                      value={delayReason}
                      onChange={(e) => setDelayReason(e.target.value)}
                      placeholder="e.g. ATC Holding Pattern"
                      style={{ width: '100%', padding: '10px', borderRadius: '8px', fontSize: '14px' }}
                    />
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <button type="submit" disabled={loading} className="btn-primary" style={{ padding: '12px 24px', fontSize: '14px' }}>
                    <Radio size={16} /> Broadcast Radar Telemetry Event
                  </button>
                </div>
              </form>
            </div>
          ) : (
            <div className="glass-card" style={{ padding: '28px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <div>
                  <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#0F172A' }}>
                    Omnichannel Customer Voice / Message Delay Intake
                  </h3>
                  <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                    Customer calls 24/7 Voice Hotline, texts via WhatsApp, or sends email to report a delay or schedule change. Agentic AI parses intent and autonomously reschedules.
                  </p>
                </div>
                <div className="blue-badge">
                  <Sparkles size={12} /> NLP AGENTIC AI
                </div>
              </div>

              <form onSubmit={handleExecuteInboundUpdate}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                  <div>
                    <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                      ACTIVE RESERVATION TO UPDATE *
                    </label>
                    <select
                      value={selectedBookingId}
                      onChange={(e) => setSelectedBookingId(e.target.value)}
                      style={{ width: '100%', padding: '10px', borderRadius: '8px', fontSize: '14px' }}
                    >
                      {bookings.map(b => (
                        <option key={b.id} value={b.id}>
                          {b.id} — {b.party.passenger_name} ({b.flight_number || b.service_type})
                        </option>
                      ))}
                      {bookings.length === 0 && <option value="bk-demo">bk-demo — Sir Arthur Davies (BA 178)</option>}
                    </select>
                  </div>

                  <div>
                    <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                      INTAKE CHANNEL *
                    </label>
                    <select
                      value={intakeSource}
                      onChange={(e) => setIntakeSource(e.target.value as any)}
                      style={{ width: '100%', padding: '10px', borderRadius: '8px', fontSize: '14px' }}
                    >
                      <option value="VOICE_HOTLINE">📞 24/7 Voice AI Dispatch Call Transcript</option>
                      <option value="WHATSAPP">💬 WhatsApp Executive Business Message</option>
                      <option value="EMAIL">✉️ Inbound Concierge Email</option>
                    </select>
                  </div>
                </div>

                <div style={{ marginBottom: '20px' }}>
                  <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                    INBOUND MESSAGE / CALL AUDIO TRANSCRIPTION (RAW INPUT) *
                  </label>
                  <textarea
                    rows={4}
                    required
                    value={rawTranscript}
                    onChange={(e) => setRawTranscript(e.target.value)}
                    style={{ width: '100%', padding: '12px', borderRadius: '8px', fontSize: '13px', lineHeight: 1.5 }}
                  />
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <button type="submit" disabled={loading} className="btn-primary" style={{ padding: '12px 24px', fontSize: '14px' }}>
                    <Sparkles size={16} /> Execute AI Plan Extraction & Reschedule
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Live FlightAware Radar Feed Grid */}
          <div className="glass-card" style={{ padding: '24px', marginTop: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h4 style={{ fontSize: '16px', fontWeight: 800, color: '#0F172A' }}>
                Live Transit Radar Event Stream
              </h4>
              <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                FlightAware ADS-B & Amtrak Live Feed
              </span>
            </div>

            <div style={{ display: 'grid', gap: '12px' }}>
              {radarStream.map(ev => (
                <div key={ev.id} style={{ background: '#F8FAFC', border: '1px solid var(--border-subtle)', borderRadius: '10px', padding: '14px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      {ev.source.includes('FLIGHT') ? <Plane size={15} color="#2563EB" /> : <Train size={15} color="#047857" />}
                      <span style={{ fontWeight: 800, color: '#0F172A', fontSize: '14px' }}>{ev.carrier} ({ev.flight_or_train_number})</span>
                    </div>
                    <span className={ev.delay_minutes > 0 ? 'gold-badge' : 'badge-green'} style={{ fontSize: '11px' }}>
                      {ev.delay_minutes > 0 ? `+${ev.delay_minutes} min delay` : 'ON TIME'}
                    </span>
                  </div>

                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                    {ev.origin} → {ev.destination} · Est. Arrival: <strong>{ev.estimated_arrival}</strong>
                  </div>

                  <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                    Gate: {ev.gate_or_terminal || 'VIP Terminal'} · Status: {ev.status_summary}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: Active Autonomous Rescheduling Drawer */}
        <div>
          <div className="glass-card" style={{ padding: '24px', position: 'sticky', top: '90px' }}>
            <h4 style={{ fontSize: '16px', fontWeight: 800, color: '#0F172A', marginBottom: '16px' }}>
              Autonomous Action Stream
            </h4>

            <div style={{ display: 'grid', gap: '12px', fontSize: '12px' }}>
              <div style={{ background: '#EFF6FF', border: '1px solid #BFDBFE', borderRadius: '10px', padding: '12px' }}>
                <div style={{ fontWeight: 700, color: '#1E40AF', marginBottom: '2px' }}>
                  1. FlightAware Radar Ingest
                </div>
                <div style={{ color: '#1E3A8A' }}>
                  Monitors ADS-B altitude, speed, and ETA shifts continuously.
                </div>
              </div>

              <div style={{ background: '#EFF6FF', border: '1px solid #BFDBFE', borderRadius: '10px', padding: '12px' }}>
                <div style={{ fontWeight: 700, color: '#1E40AF', marginBottom: '2px' }}>
                  2. 3-Leg Deadhead Recalculation
                </div>
                <div style={{ color: '#1E3A8A' }}>
                  Adjusts driver departure from vendor depot so chauffeur arrives 15 min before revised touchdown.
                </div>
              </div>

              <div style={{ background: '#EFF6FF', border: '1px solid #BFDBFE', borderRadius: '10px', padding: '12px' }}>
                <div style={{ fontWeight: 700, color: '#1E40AF', marginBottom: '2px' }}>
                  3. Twilio SMS & AWS SES Relay
                </div>
                <div style={{ color: '#1E3A8A' }}>
                  Dispatches instant reassurance notifications to passenger and reassigned chauffeur.
                </div>
              </div>

              <div style={{ background: '#EFF6FF', border: '1px solid #BFDBFE', borderRadius: '10px', padding: '12px' }}>
                <div style={{ fontWeight: 700, color: '#1E40AF', marginBottom: '2px' }}>
                  4. Free Touchdown Waiting Buffer
                </div>
                <div style={{ color: '#1E3A8A' }}>
                  Includes 60 min complimentary waiting from wheels-down timestamp for baggage clearance.
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
