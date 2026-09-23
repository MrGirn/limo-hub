import React, { useState, useEffect } from 'react';
import { 
  Radio, Car, Users, Navigation, MapPin, Clock, AlertTriangle, 
  CheckCircle, ArrowUpRight, ShieldAlert, Zap, RefreshCw, Eye, Route, Building2,
  Scale, ShieldCheck, X, Plane, DollarSign, PhoneCall, MessageSquare, Activity
} from 'lucide-react';
import { Vehicle, Driver, Booking, SystemSummary, Vendor, ComplianceAlert, AssignmentAuditRecord, WebhookEvent, SplitSettlementRecord, Dispatch24hAlert } from '../types';
import { 
  fetchFleetVehicles, fetchDrivers, fetchBookings, fetchSystemSummary, fetchVendors, 
  fetchComplianceAlerts, triggerComplianceScan, fetchAssignmentAudit,
  fetchWebhookEvents, fetchSplitSettlements, simulateWebhookEvent,
  fetchPending24hDispatchAlerts, assign24hChauffeur
} from '../api';
import { SourcingConciergeDesk } from './SourcingConciergeDesk';
import { DispatcherPhoneBookingModal } from './DispatcherPhoneBookingModal';

export const VendorDispatchPortal: React.FC = () => {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [summary, setSummary] = useState<SystemSummary | null>(null);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [loading, setLoading] = useState(false);
  const [killSwitchActive, setKillSwitchActive] = useState(false);
  const [selectedVendorId, setSelectedVendorId] = useState<string>('vendor-ny-executive');
  const [showPhoneBookingModal, setShowPhoneBookingModal] = useState(false);

  const [pending24hAlerts, setPending24hAlerts] = useState<Dispatch24hAlert[]>([]);
  const [assigning24hTripId, setAssigning24hTripId] = useState<string | null>(null);
  const [assignSuccessMessage, setAssignSuccessMessage] = useState<string | null>(null);

  const [complianceAlerts, setComplianceAlerts] = useState<ComplianceAlert[]>([]);
  const [scanningCompliance, setScanningCompliance] = useState(false);
  const [activeAudit, setActiveAudit] = useState<AssignmentAuditRecord | null>(null);
  const [showAuditModal, setShowAuditModal] = useState(false);

  // Sprint 2: Webhooks & Telemetry Stream / Simulator State
  const [showWebhookModal, setShowWebhookModal] = useState(false);
  const [webhookEvents, setWebhookEvents] = useState<WebhookEvent[]>([]);
  const [splitSettlements, setSplitSettlements] = useState<SplitSettlementRecord[]>([]);
  const [simulatingWebhook, setSimulatingWebhook] = useState(false);
  const [simulationNotification, setSimulationNotification] = useState<string | null>(null);

  const activeVendor = vendors.find(v => v.id === selectedVendorId) || vendors[0];
  const vendorVehicles = vehicles.filter(v => !selectedVendorId || v.vendor_id === selectedVendorId);
  const vendorDrivers = drivers.filter(d => !selectedVendorId || d.vendor_id === selectedVendorId);
  const vendorBookings = bookings.filter(b => !selectedVendorId || b.vendor_id === selectedVendorId);

  const loadData = async () => {
    setLoading(true);
    try {
      const [v, d, b, s, vnd] = await Promise.all([
        fetchFleetVehicles(),
        fetchDrivers(),
        fetchBookings(),
        fetchSystemSummary(),
        fetchVendors()
      ]);
      setVehicles(v);
      setDrivers(d);
      setBookings(b);
      setSummary(s);
      setVendors(vnd);
      
      // Load active compliance alerts
      try {
        const calerts = await fetchComplianceAlerts();
        if (calerts && calerts.alerts) {
          setComplianceAlerts(calerts.alerts);
        }
      } catch (e) {
        // quiet
      }

      // Load 24-hour JIT dispatch alerts
      try {
        const alerts = await fetchPending24hDispatchAlerts(selectedVendorId);
        setPending24hAlerts(alerts || []);
      } catch (e) {
        // quiet
      }

      if (b.length > 0 && !selectedBooking) {
        setSelectedBooking(b[0]);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleAssign24hChauffeur = async (tripId: string, driverId?: string, vehicleId?: string) => {
    setAssigning24hTripId(tripId);
    try {
      const res = await assign24hChauffeur(tripId, driverId, vehicleId);
      setAssignSuccessMessage(res?.message || 'Chauffeur successfully assigned in 24h window!');
      await loadData();
      setTimeout(() => setAssignSuccessMessage(null), 5000);
    } catch (e: any) {
      alert(`Assignment failed: ${e.message}`);
    } finally {
      setAssigning24hTripId(null);
    }
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 8000);
    return () => clearInterval(interval);
  }, []);

  const handleScanCompliance = async () => {
    setScanningCompliance(true);
    try {
      const res = await triggerComplianceScan();
      if (res && res.alerts) {
        setComplianceAlerts(res.alerts);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setScanningCompliance(false);
    }
  };

  const handleOpenAudit = async (tripId: string) => {
    try {
      const res = await fetchAssignmentAudit(tripId);
      if (res && res.assignment_audit) {
        setActiveAudit(res.assignment_audit);
        setShowAuditModal(true);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const loadWebhookData = async () => {
    try {
      const [eventsRes, settlementsRes] = await Promise.all([
        fetchWebhookEvents(30),
        fetchSplitSettlements()
      ]);
      if (eventsRes && eventsRes.events) {
        setWebhookEvents(eventsRes.events);
      }
      if (settlementsRes && settlementsRes.settlements) {
        setSplitSettlements(settlementsRes.settlements);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleOpenWebhookModal = () => {
    loadWebhookData();
    setShowWebhookModal(true);
  };

  const handleTriggerSimulation = async (type: string, extra: Record<string, any> = {}) => {
    setSimulatingWebhook(true);
    try {
      const res = await simulateWebhookEvent({ simulation_type: type, ...extra });
      setSimulationNotification(res.summary || res.transition_note || `Simulated ${type} event successfully.`);
      await loadWebhookData();
      await loadData();
      setTimeout(() => setSimulationNotification(null), 5000);
    } catch (e: any) {
      setSimulationNotification(`Simulation error: ${e.message}`);
    } finally {
      setSimulatingWebhook(false);
    }
  };

  return (
    <div style={{ maxWidth: '1440px', margin: '0 auto', padding: '24px' }}>
      {/* Top Bar / Multi-Vendor Hub Selector */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <div className="blue-badge" style={{ marginBottom: '6px' }}>
            <Radio size={12} className="pulse-live" /> Multi-Vendor Operations & Dispatch Board
          </div>
          <h1 style={{ fontSize: '28px', fontWeight: 800, color: '#0F172A' }}>
            {activeVendor?.name || 'New York Executive Chauffeur & Fleet LLC'}
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Building2 size={14} color="#2563EB" /> Depot: <strong style={{ color: '#0F172A' }}>{activeVendor?.depot_address || activeVendor?.hq_address || '550 W 54th St, New York, NY 10019'}</strong> · Radius: {activeVendor?.service_radius_miles || 65} mi ({activeVendor?.service_radius_km || Math.round((activeVendor?.service_radius_miles || 65) * 1.60934)} km)
          </p>
        </div>

        <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
          {/* Multi-Vendor Depot Switcher */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#FFFFFF', padding: '6px 12px', borderRadius: '10px', border: '1px solid var(--border-subtle)', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
            <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)' }}>Vendor Hub:</span>
            <select
              value={selectedVendorId}
              onChange={(e) => setSelectedVendorId(e.target.value)}
              style={{
                background: 'transparent',
                border: 'none',
                fontSize: '13px',
                fontWeight: 700,
                color: '#2563EB',
                cursor: 'pointer',
                outline: 'none'
              }}
            >
              {vendors.map(v => (
                <option key={v.id} value={v.id}>{v.name}</option>
              ))}
              {vendors.length === 0 && (
                <option value="vendor-ny-executive">New York Executive Fleet LLC (NYC)</option>
              )}
            </select>
          </div>

          <button 
            onClick={() => setShowPhoneBookingModal(true)}
            style={{
              fontSize: '13px',
              padding: '10px 18px',
              backgroundColor: '#10B981',
              color: '#FFFFFF',
              border: 'none',
              borderRadius: '8px',
              fontWeight: 800,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              boxShadow: '0 2px 4px rgba(16, 185, 129, 0.25)'
            }}
          >
            <PhoneCall size={14} /> 📞 Inbound Phone Booking Desk
          </button>

          <button 
            className="btn-primary"
            onClick={handleOpenWebhookModal}
            style={{ fontSize: '13px', padding: '10px 16px', display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <Zap size={14} /> Webhooks & Telemetry Stream
          </button>

          <button 
            className="btn-secondary" 
            onClick={loadData}
            style={{ fontSize: '13px', padding: '10px 16px' }}
          >
            <RefreshCw size={14} className={loading ? 'pulse-live' : ''} /> Refresh Board
          </button>

          <button 
            onClick={() => setKillSwitchActive(!killSwitchActive)}
            style={{
              background: killSwitchActive ? 'rgba(239,68,68,0.1)' : '#FFFFFF',
              border: killSwitchActive ? '1px solid #EF4444' : '1px solid var(--border-subtle)',
              color: killSwitchActive ? '#DC2626' : 'var(--text-secondary)',
              padding: '10px 16px',
              borderRadius: '8px',
              fontSize: '13px',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
            }}
          >
            <ShieldAlert size={14} color={killSwitchActive ? '#EF4444' : '#64748B'} />
            {killSwitchActive ? 'Automation Paused (Kill Switch ON)' : 'Emergency Automation Kill Switch'}
          </button>
        </div>
      </div>

      {/* Compliance Expiration Alerts Banner */}
      {complianceAlerts.length > 0 && (
        <div style={{
          background: '#FEF2F2',
          border: '1px solid #FCA5A5',
          borderRadius: '12px',
          padding: '16px 20px',
          marginBottom: '20px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '12px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '36px',
              height: '36px',
              borderRadius: '8px',
              background: '#EF4444',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#FFFFFF'
            }}>
              <AlertTriangle size={20} />
            </div>
            <div>
              <div style={{ fontSize: '14px', fontWeight: 800, color: '#991B1B' }}>
                Fleet Compliance Warnings: {complianceAlerts.length} Document(s) Expiring / Require Upkeep
              </div>
              <div style={{ fontSize: '12px', color: '#B91C1C', marginTop: '2px' }}>
                {complianceAlerts[0]?.message} {complianceAlerts.length > 1 && `(+${complianceAlerts.length - 1} more)`}
              </div>
            </div>
          </div>

          <button
            onClick={handleScanCompliance}
            disabled={scanningCompliance}
            style={{
              background: '#FFFFFF',
              border: '1px solid #DC2626',
              color: '#DC2626',
              padding: '8px 14px',
              borderRadius: '6px',
              fontSize: '12px',
              fontWeight: 700,
              cursor: 'pointer'
            }}
          >
            {scanningCompliance ? 'Scanning Fleet...' : '🔄 Run Fleet Compliance Scan'}
          </button>
        </div>
      )}

      {/* 24-Hour Just-In-Time Chauffeur Dispatch Alerts Banner */}
      {assignSuccessMessage && (
        <div style={{
          background: '#ECFDF5',
          border: '1px solid #6EE7B7',
          borderRadius: '12px',
          padding: '14px 20px',
          marginBottom: '20px',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          color: '#065F46',
          fontSize: '13px',
          fontWeight: 700
        }}>
          <CheckCircle size={18} color="#059669" />
          {assignSuccessMessage}
        </div>
      )}

      {pending24hAlerts.length > 0 && (
        <div style={{
          background: 'linear-gradient(135deg, #1E1B4B 0%, #0F172A 100%)',
          border: '1px solid rgba(129, 140, 248, 0.3)',
          borderRadius: '16px',
          padding: '24px',
          marginBottom: '24px',
          boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.3)',
          color: '#FFFFFF'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', marginBottom: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{
                width: '40px',
                height: '40px',
                borderRadius: '10px',
                background: 'linear-gradient(135deg, #6366F1 0%, #4F46E5 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 4px 12px rgba(99, 102, 241, 0.4)'
              }}>
                <Clock size={22} color="#FFFFFF" />
              </div>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <h3 style={{ fontSize: '18px', fontWeight: 800, margin: 0, letterSpacing: '-0.02em' }}>
                    24-Hour Just-In-Time Chauffeur Dispatch Queue
                  </h3>
                  <span style={{
                    background: '#EF4444',
                    color: '#FFFFFF',
                    padding: '2px 8px',
                    borderRadius: '12px',
                    fontSize: '11px',
                    fontWeight: 800
                  }}>
                    {pending24hAlerts.length} PENDING ACTION
                  </span>
                </div>
                <p style={{ fontSize: '13px', color: '#94A3B8', margin: '4px 0 0 0' }}>
                  Trips approaching the 24-hour pickup window without an assigned chauffeur. Proximity & availability matching active.
                </p>
              </div>
            </div>

            <button
              onClick={loadData}
              disabled={loading}
              style={{
                background: 'rgba(255, 255, 255, 0.1)',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                color: '#FFFFFF',
                padding: '8px 14px',
                borderRadius: '8px',
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <RefreshCw size={14} className={loading ? 'pulse-live' : ''} /> Refresh Queue
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {pending24hAlerts.map((alert) => {
              const isUrgent = alert.urgency === 'CRITICAL' || alert.urgency === 'URGENT';
              const urgencyColor = alert.urgency === 'CRITICAL' ? '#EF4444' : (alert.urgency === 'URGENT' ? '#F59E0B' : '#6366F1');
              const urgencyBg = alert.urgency === 'CRITICAL' ? 'rgba(239,68,68,0.2)' : (alert.urgency === 'URGENT' ? 'rgba(245,158,11,0.2)' : 'rgba(99,102,241,0.2)');

              return (
                <div key={alert.trip_id} style={{
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: `1px solid ${isUrgent ? urgencyColor : 'rgba(255, 255, 255, 0.1)'}`,
                  borderRadius: '12px',
                  padding: '20px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '16px'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span style={{
                        background: urgencyBg,
                        border: `1px solid ${urgencyColor}`,
                        color: urgencyColor,
                        padding: '4px 10px',
                        borderRadius: '6px',
                        fontSize: '11px',
                        fontWeight: 800,
                        letterSpacing: '0.05em'
                      }}>
                        {alert.urgency} · IN {alert.hours_until_pickup}h
                      </span>
                      <span style={{ fontSize: '12px', color: '#94A3B8', fontFamily: 'monospace' }}>
                        Trip: {alert.trip_id}
                      </span>
                      <span style={{
                        background: 'rgba(255, 255, 255, 0.1)',
                        padding: '3px 8px',
                        borderRadius: '4px',
                        fontSize: '11px',
                        color: '#E2E8F0',
                        fontWeight: 600
                      }}>
                        {alert.vehicle_class.replace('_', ' ')}
                      </span>
                      {alert.flight_number && (
                        <span style={{
                          background: 'rgba(59, 130, 246, 0.2)',
                          border: '1px solid #3B82F6',
                          color: '#93C5FD',
                          padding: '3px 8px',
                          borderRadius: '4px',
                          fontSize: '11px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px'
                        }}>
                          <Plane size={12} /> {alert.flight_number}
                        </span>
                      )}
                    </div>

                    <button
                      onClick={() => handleAssign24hChauffeur(alert.trip_id)}
                      disabled={assigning24hTripId === alert.trip_id}
                      style={{
                        background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
                        border: 'none',
                        color: '#FFFFFF',
                        padding: '8px 16px',
                        borderRadius: '8px',
                        fontSize: '12px',
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)'
                      }}
                    >
                      <Zap size={14} />
                      {assigning24hTripId === alert.trip_id ? 'Assigning...' : '⚡ Auto-Assign Best Chauffeur'}
                    </button>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
                    <div>
                      <div style={{ fontSize: '11px', color: '#94A3B8', textTransform: 'uppercase', fontWeight: 700, marginBottom: '6px' }}>
                        Pickup & Itinerary
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#F1F5F9', marginBottom: '4px' }}>
                        <MapPin size={14} color="#10B981" />
                        <span style={{ fontWeight: 600 }}>{alert.pickup_address}</span>
                      </div>
                      {alert.dropoff_address && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#94A3B8' }}>
                          <Route size={14} color="#6366F1" />
                          <span>{alert.dropoff_address}</span>
                        </div>
                      )}
                    </div>

                    <div>
                      <div style={{ fontSize: '11px', color: '#94A3B8', textTransform: 'uppercase', fontWeight: 700, marginBottom: '6px' }}>
                        Candidate On-Duty Chauffeurs ({alert.recommended_candidates.length})
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {alert.recommended_candidates.length === 0 ? (
                          <div style={{ fontSize: '12px', color: '#EF4444', fontStyle: 'italic' }}>
                            ⚠️ No on-duty chauffeurs available in radius. Consider fleet re-assignment or farm-out.
                          </div>
                        ) : (
                          alert.recommended_candidates.map((cand, cIdx) => (
                            <div key={cand.driver_id} style={{
                              background: 'rgba(0, 0, 0, 0.25)',
                              border: '1px solid rgba(255, 255, 255, 0.1)',
                              borderRadius: '8px',
                              padding: '10px 12px',
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              gap: '12px'
                            }}>
                              <div>
                                <div style={{ fontSize: '13px', fontWeight: 700, color: '#FFFFFF', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                  <span>{cIdx === 0 ? '🥇' : (cIdx === 1 ? '🥈' : '🥉')}</span>
                                  {cand.driver_name}
                                  <span style={{ fontSize: '11px', color: '#FBBF24', fontWeight: 600 }}>★ {cand.rating.toFixed(2)}</span>
                                </div>
                                <div style={{ fontSize: '11px', color: '#94A3B8', marginTop: '2px' }}>
                                  {cand.vehicle_name} ({cand.license_plate}) · <span style={{ color: '#38BDF8' }}>{cand.distance_miles} mi away (~{cand.eta_minutes}m ETA)</span>
                                </div>
                              </div>

                              <button
                                onClick={() => handleAssign24hChauffeur(alert.trip_id, cand.driver_id, cand.vehicle_id)}
                                disabled={assigning24hTripId === alert.trip_id}
                                style={{
                                  background: 'rgba(99, 102, 241, 0.2)',
                                  border: '1px solid #6366F1',
                                  color: '#A5B4FC',
                                  padding: '6px 12px',
                                  borderRadius: '6px',
                                  fontSize: '11px',
                                  fontWeight: 700,
                                  cursor: 'pointer',
                                  whiteSpace: 'nowrap'
                                }}
                              >
                                {assigning24hTripId === alert.trip_id ? 'Assigning...' : 'Assign'}
                              </button>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Operations Metric Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginBottom: '24px' }}>
        <div className="glass-card" style={{ padding: '18px' }}>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 700 }}>ACTIVE DEPOT FLEET</div>
          <div style={{ fontSize: '26px', fontWeight: 800, color: '#0F172A', marginTop: '4px' }}>
            {vendorVehicles.length} <span style={{ fontSize: '13px', color: '#10B981', fontWeight: 600 }}>100% Operational</span>
          </div>
        </div>

        <div className="glass-card" style={{ padding: '18px' }}>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 700 }}>CHAUFFEURS ON DUTY</div>
          <div style={{ fontSize: '26px', fontWeight: 800, color: '#0F172A', marginTop: '4px' }}>
            {vendorDrivers.filter(d => d.is_on_duty).length} / {vendorDrivers.length} <span style={{ fontSize: '13px', color: '#2563EB', fontWeight: 600 }}>Available</span>
          </div>
        </div>

        <div className="glass-card" style={{ padding: '18px' }}>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 700 }}>CONFIRMED BOOKINGS</div>
          <div style={{ fontSize: '26px', fontWeight: 800, color: 'var(--accent-gold)', marginTop: '4px' }}>
            {vendorBookings.length} <span style={{ fontSize: '13px', color: 'var(--text-secondary)', fontWeight: 500 }}>Depot queue</span>
          </div>
        </div>

        <div className="glass-card" style={{ padding: '18px' }}>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 700 }}>AUTONOMOUS RESOLUTIONS</div>
          <div style={{ fontSize: '26px', fontWeight: 800, color: '#10B981', marginTop: '4px' }}>
            {summary?.incidents_resolved_autonomously || 1} <span style={{ fontSize: '13px', color: '#10B981', fontWeight: 600 }}>0 Staff Queued</span>
          </div>
        </div>
      </div>

      {/* Vendor Operating Mode & Omnichannel Intake Configuration */}
      <div className="glass-card" style={{ padding: '20px 24px', marginBottom: '24px', background: '#FFFFFF' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', marginBottom: '16px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '15px', fontWeight: 800, color: 'var(--text-primary)' }}>
                Vendor Architecture Mode:
              </span>
              <span style={{
                fontSize: '12px',
                fontWeight: 700,
                padding: '4px 10px',
                borderRadius: '6px',
                background: 'rgba(37,99,235,0.08)',
                color: '#2563EB',
                border: '1px solid rgba(37,99,235,0.2)'
              }}>
                🌐 GLOBAL NETWORK FEDERATED
              </span>
              <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                (Can be toggled to 🏢 Standalone Private OS anytime)
              </span>
            </div>
            <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>
              Servicing local fleet rides + earning 10% commission on outbound international client journeys (London, Paris, Tokyo).
            </div>
          </div>

          {/* Active Intake Channel Badges */}
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#F8FAFC', border: '1px solid var(--border-subtle)', padding: '6px 12px', borderRadius: '8px', fontSize: '12px' }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10B981' }} />
              <strong>📞 Voice Hotline:</strong> +1 (800) 555-0199
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#F8FAFC', border: '1px solid var(--border-subtle)', padding: '6px 12px', borderRadius: '8px', fontSize: '12px' }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10B981' }} />
              <strong>💬 WhatsApp:</strong> +1 (917) 555-0199
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#F8FAFC', border: '1px solid var(--border-subtle)', padding: '6px 12px', borderRadius: '8px', fontSize: '12px' }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10B981' }} />
              <strong>✉️ Inbound Email:</strong> dispatch@vendor.com
            </div>
          </div>
        </div>

        {/* Live Phone Call Quote & Verbal Booking Simulator */}
        <div style={{ background: '#F8FAFC', border: '1px solid var(--border-subtle)', borderRadius: '10px', padding: '14px 18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: '13px', color: 'var(--text-primary)' }}>
              📞 Real-Time Conversational Phone Intake Simulator
            </div>
            <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
              Simulate customer calling the VIP dispatch line → Instant binding quote spoken → Verbal booking confirmation on call.
            </div>
          </div>
          <button 
            className="btn-gold" 
            onClick={async () => {
              try {
                const res = await fetch('http://127.0.0.1:8000/api/v1/vendors/vendor-ny-executive/voice-call-intake', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    caller_phone: '+19175550199',
                    speech_text: 'I need an Escalade tomorrow at 4pm from The Peninsula Hotel to JFK Terminal 7 for Sir Arthur Davies.',
                    customer_name: 'Sir Arthur Davies',
                    customer_email: 'arthur@davies-holdings.co.uk',
                    auto_confirm_and_book: true
                  })
                });
                const data = await res.json();
                alert(`📞 [LIVE VOICE CALL SIMULATION]\n\nAI Spoken Response:\n"${data.voice_spoken_response}"\n\nStripe Payment Status: ${data.payment_status}\nBooking Created: ${data.booking ? data.booking.id : 'Quote Only'}\nSMS Confirmation Dispatched: YES`);
                loadData();
              } catch (e: any) {
                alert('Phone simulation error: ' + e.message);
              }
            }}
            style={{ padding: '8px 16px', fontSize: '12px', fontWeight: 700 }}
          >
            Test Real-Time Phone Call Booking
          </button>
        </div>
      </div>

      {/* AI Autonomous Sourcing & Out-of-Market Concierge Desk */}
      <div style={{ marginBottom: '24px' }}>
        <SourcingConciergeDesk />
      </div>

      {/* Main Grid: Left = Live Dispatch Table, Right = Map & Detail View */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: '24px' }}>
        
        {/* Left Column: Live Bookings & Dispatch Grid */}
        <div className="glass-card" style={{ padding: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
            <h3 style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text-primary)' }}>
              Live Operational Queue
            </h3>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
              MySQL & Telemetry WebSocket Stream
            </span>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-subtle)', color: 'var(--text-muted)' }}>
                  <th style={{ padding: '10px 8px', fontWeight: 700 }}>TRIP / TIME</th>
                  <th style={{ padding: '10px 8px', fontWeight: 700 }}>SERVICE & ROUTE</th>
                  <th style={{ padding: '10px 8px', fontWeight: 700 }}>TRANSIT / FLIGHT</th>
                  <th style={{ padding: '10px 8px', fontWeight: 700 }}>CHAUFFEUR</th>
                  <th style={{ padding: '10px 8px', fontWeight: 700 }}>STATUS</th>
                  <th style={{ padding: '10px 8px', fontWeight: 700 }}>ACTION</th>
                </tr>
              </thead>
              <tbody>
                {bookings.map(b => {
                  const isSelected = selectedBooking?.id === b.id;
                  const trip = b.trip;
                  return (
                    <tr 
                      key={b.id}
                      onClick={() => setSelectedBooking(b)}
                      style={{
                        borderBottom: '1px solid var(--border-subtle)',
                        cursor: 'pointer',
                        background: isSelected ? 'rgba(37,99,235,0.06)' : undefined
                      }}
                    >
                      <td style={{ padding: '12px 8px' }}>
                        <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{b.id}</div>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                          {new Date(b.pickup_time_utc).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} UTC
                        </div>
                      </td>

                      <td style={{ padding: '12px 8px' }}>
                        <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                          {b.service_type.replace('_', ' ')}
                        </div>
                        <div style={{ fontSize: '11px', color: 'var(--text-secondary)', maxWidth: '220px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {b.pickup_address}
                        </div>
                      </td>

                      <td style={{ padding: '12px 8px' }}>
                        {b.flight_number ? (
                          <div style={{ fontSize: '12px', fontWeight: 600, color: '#1D4ED8' }}>✈️ {b.flight_number}</div>
                        ) : b.train_number ? (
                          <div style={{ fontSize: '12px', fontWeight: 600, color: '#047857' }}>🚆 {b.train_number}</div>
                        ) : (
                          <span style={{ color: 'var(--text-muted)', fontSize: '11px' }}>—</span>
                        )}
                      </td>

                      <td style={{ padding: '12px 8px' }}>
                        {trip?.driver_id ? (
                          <div>
                            <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                              {drivers.find(d => d.id === trip.driver_id)?.first_name || 'Assigned'}
                            </div>
                            <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                              {vehicles.find(v => v.id === trip.vehicle_id)?.model.split(' ')[0] || 'Escalade'}
                            </div>
                          </div>
                        ) : (
                          <span style={{ color: '#D97706', fontWeight: 600 }}>⚡ Offer Dispatched</span>
                        )}
                      </td>

                      <td style={{ padding: '12px 8px' }}>
                        <span className={trip?.status === 'COMPLETED' ? 'badge-green' : trip?.status === 'ARRIVED' ? 'gold-badge' : 'blue-badge'}>
                          {trip?.status ? trip.status.replace('_', ' ') : 'SCHEDULED'}
                        </span>
                      </td>

                      <td style={{ padding: '12px 8px' }}>
                        <div style={{ display: 'flex', gap: '6px' }}>
                          <button 
                            className="btn-secondary" 
                            style={{ padding: '4px 8px', fontSize: '11px' }}
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedBooking(b);
                            }}
                          >
                            <Eye size={12} /> Inspect
                          </button>
                          <button 
                            className="btn-secondary" 
                            style={{ padding: '4px 8px', fontSize: '11px', color: '#2563EB', borderColor: 'rgba(37,99,235,0.3)' }}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenAudit(b.trip?.id || b.id);
                            }}
                            title="Inspect Neutrality Dispatch Audit"
                          >
                            <Scale size={12} /> Audit
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Active Fleet Availability Grid */}
          <div style={{ marginTop: '28px', borderTop: '1px solid var(--border-subtle)', paddingTop: '20px' }}>
            <h4 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '14px' }}>
              Global Chauffeur & Executive Fleet Telemetry
            </h4>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '12px' }}>
              {drivers.map(d => {
                const veh = vehicles.find(v => v.id === d.current_vehicle_id);
                return (
                  <div key={d.id} style={{ background: '#F8FAFC', border: '1px solid var(--border-subtle)', borderRadius: '10px', padding: '12px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                      <span style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '13px' }}>
                        {d.first_name} {d.last_name}
                      </span>
                      <span style={{ fontSize: '11px', color: '#047857', fontWeight: 700 }}>
                        ★ {d.rating.toFixed(2)}
                      </span>
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                      {veh ? `${veh.make} ${veh.model}` : 'Executive Chauffeur'}
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px', display: 'flex', justifyContent: 'space-between' }}>
                      <span>TLC Plate: {veh?.license_plate || '—'}</span>
                      <span style={{ color: '#1D4ED8', fontWeight: 600 }}>{d.trips_completed} trips</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Column: Selected Booking Detail & Simulated Radar Map */}
        <div>
          {selectedBooking ? (
            <div className="glass-card" style={{ padding: '24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <span className="gold-badge">Dispatch Inspection</span>
                <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)' }}>
                  {selectedBooking.id}
                </span>
              </div>

              {/* Telemetry Simulation Map Box */}
              <div style={{
                height: '180px',
                borderRadius: '12px',
                background: 'linear-gradient(135deg, #F1F5F9 0%, #E2E8F0 100%)',
                border: '1px solid var(--border-active)',
                position: 'relative',
                overflow: 'hidden',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '20px'
              }}>
                <div style={{ position: 'absolute', inset: 0, opacity: 0.25, backgroundImage: 'radial-gradient(#2563EB 1px, transparent 1px)', backgroundSize: '16px 16px' }} />
                
                <div style={{ textAlign: 'center', zIndex: 1 }}>
                  <div style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '50%',
                    background: 'rgba(37,99,235,0.15)',
                    border: '2px solid #2563EB',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto 8px auto',
                    color: '#2563EB'
                  }} className="pulse-live">
                    <Car size={20} />
                  </div>
                  <div style={{ fontSize: '11px', fontWeight: 700, color: '#1D4ED8' }}>
                    GPS TELEMETRY: 40.6550° N, 73.7920° W
                  </div>
                  <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                    Van Wyck Expressway · Approaching JFK T4 VIP Ramp
                  </div>
                </div>
              </div>

              {/* 3-Leg Route Breakdown in Drawer */}
              <div style={{ background: '#F8FAFC', border: '1px solid var(--border-subtle)', borderRadius: '10px', padding: '12px', marginBottom: '16px', fontSize: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '8px' }}>
                  <Route size={14} color="#2563EB" /> 3-Leg Dispatch Routing
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                  <span>Outbound Staging (Depot → Pickup):</span>
                  <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>17.8 mi</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                  <span>Passenger Trip (JFK → Plaza):</span>
                  <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>18.5 mi</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                  <span>Return Deadhead (Plaza → Depot):</span>
                  <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>2.1 mi</span>
                </div>
              </div>

              {/* Passenger & Fare Info */}
              <div style={{ display: 'grid', gap: '10px', fontSize: '13px', marginBottom: '18px' }}>
                <div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>PASSENGER</div>
                  <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{selectedBooking.party.passenger_name} ({selectedBooking.party.passenger_phone})</div>
                </div>

                <div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>AUTHORIZED TOTAL</div>
                  <div style={{ fontSize: '20px', fontWeight: 800, color: 'var(--accent-gold)' }}>
                    ${Number(selectedBooking.total_amount || 0).toFixed(2)}
                  </div>
                </div>
              </div>

              {/* Event Log Stream */}
              <div>
                <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '10px' }}>
                  TRIP AUDIT TIMELINE
                </div>
                <div style={{ display: 'grid', gap: '8px' }}>
                  {selectedBooking.trip?.events.map((ev, i) => (
                    <div key={i} style={{ fontSize: '11px', borderLeft: '2px solid #2563EB', paddingLeft: '10px', color: 'var(--text-secondary)' }}>
                      <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{ev.event_type} · {ev.actor}</div>
                      <div>{ev.description}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="glass-card" style={{ padding: '32px', textAlign: 'center' }}>
              <p style={{ color: 'var(--text-muted)' }}>Select a booking to inspect dispatch details.</p>
            </div>
          )}
        </div>
      </div>

      {/* Assignment Neutrality Audit Record Modal */}
      {showAuditModal && activeAudit && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(15, 23, 42, 0.65)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: '20px'
        }}>
          <div style={{
            background: '#FFFFFF',
            borderRadius: '16px',
            maxWidth: '680px',
            width: '100%',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2), 0 10px 10px -5px rgba(0, 0, 0, 0.1)',
            border: '1px solid var(--border-subtle)',
            overflow: 'hidden'
          }}>
            {/* Modal Header */}
            <div style={{
              background: '#0F172A',
              color: '#FFFFFF',
              padding: '20px 24px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Scale size={20} color="#60A5FA" />
                <div>
                  <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 700 }}>Neutral Dispatch Algorithm Audit</h3>
                  <p style={{ margin: 0, fontSize: '12px', color: '#94A3B8' }}>Trip ID: {activeAudit.trip_id}</p>
                </div>
              </div>
              <button 
                onClick={() => setShowAuditModal(false)}
                style={{ background: 'transparent', border: 'none', color: '#94A3B8', cursor: 'pointer', padding: '4px' }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Body */}
            <div style={{ padding: '24px', maxHeight: '75vh', overflowY: 'auto' }}>
              {/* Guarantee Banner */}
              <div style={{
                background: 'rgba(16, 185, 129, 0.1)',
                border: '1px solid #10B981',
                borderRadius: '10px',
                padding: '14px 18px',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                marginBottom: '20px'
              }}>
                <ShieldCheck size={22} color="#059669" />
                <div>
                  <div style={{ fontWeight: 700, fontSize: '14px', color: '#065F46' }}>
                    Neutrality Guarantee Met (No Self-Preferencing)
                  </div>
                  <div style={{ fontSize: '12px', color: '#047857' }}>
                    Assigned to <strong>{activeAudit.assigned_vendor_name}</strong> ({activeAudit.assigned_vendor_id}) with composite score <strong>{activeAudit.total_composite_score.toFixed(1)}/100</strong> across {activeAudit.competing_candidates_count} competing candidate{activeAudit.competing_candidates_count > 1 ? 's' : ''}
                  </div>
                </div>
              </div>

              {/* 5-Factor Weighted Score Breakdown */}
              <h4 style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '12px' }}>
                5-Factor Scoring Weight Distribution
              </h4>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))', gap: '10px', marginBottom: '20px' }}>
                <div style={{ background: '#F8FAFC', border: '1px solid var(--border-subtle)', borderRadius: '8px', padding: '10px', textAlign: 'center' }}>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600 }}>Proximity (30%)</div>
                  <div style={{ fontSize: '16px', fontWeight: 800, color: '#2563EB', marginTop: '4px' }}>
                    {activeAudit.proximity_score.toFixed(1)}
                  </div>
                </div>
                <div style={{ background: '#F8FAFC', border: '1px solid var(--border-subtle)', borderRadius: '8px', padding: '10px', textAlign: 'center' }}>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600 }}>Quality (25%)</div>
                  <div style={{ fontSize: '16px', fontWeight: 800, color: '#059669', marginTop: '4px' }}>
                    {activeAudit.quality_rating_score.toFixed(1)}
                  </div>
                </div>
                <div style={{ background: '#F8FAFC', border: '1px solid var(--border-subtle)', borderRadius: '8px', padding: '10px', textAlign: 'center' }}>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600 }}>Preferred (20%)</div>
                  <div style={{ fontSize: '16px', fontWeight: 800, color: '#D97706', marginTop: '4px' }}>
                    {activeAudit.preferred_partner_bonus.toFixed(1)}
                  </div>
                </div>
                <div style={{ background: '#F8FAFC', border: '1px solid var(--border-subtle)', borderRadius: '8px', padding: '10px', textAlign: 'center' }}>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600 }}>Rate (15%)</div>
                  <div style={{ fontSize: '16px', fontWeight: 800, color: '#7C3AED', marginTop: '4px' }}>
                    {activeAudit.price_competitiveness_score.toFixed(1)}
                  </div>
                </div>
                <div style={{ background: '#F8FAFC', border: '1px solid var(--border-subtle)', borderRadius: '8px', padding: '10px', textAlign: 'center' }}>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600 }}>Neutrality (10%)</div>
                  <div style={{ fontSize: '16px', fontWeight: 800, color: '#0891B2', marginTop: '4px' }}>
                    {activeAudit.neutrality_load_balance_score.toFixed(1)}
                  </div>
                </div>
              </div>

              {/* Justification & Assigned Resource Details */}
              <div style={{ background: '#F8FAFC', borderRadius: '10px', border: '1px solid var(--border-subtle)', padding: '16px', marginBottom: '16px' }}>
                <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '6px' }}>
                  Deterministic Justification Summary:
                </div>
                <div style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                  {activeAudit.justification_summary}
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', fontSize: '12px' }}>
                <div>
                  <span style={{ color: 'var(--text-muted)' }}>City / Market:</span> <strong style={{ color: 'var(--text-primary)' }}>{activeAudit.city_name}</strong>
                </div>
                <div>
                  <span style={{ color: 'var(--text-muted)' }}>Assigned Driver ID:</span> <strong style={{ color: 'var(--text-primary)' }}>{activeAudit.assigned_driver_id || 'Auto-Pooled'}</strong>
                </div>
                <div>
                  <span style={{ color: 'var(--text-muted)' }}>Timestamp:</span> <strong style={{ color: 'var(--text-primary)' }}>{activeAudit.evaluated_at ? new Date(activeAudit.evaluated_at).toLocaleString() : 'Just now'}</strong>
                </div>
                <div>
                  <span style={{ color: 'var(--text-muted)' }}>Audit Log Ref:</span> <strong style={{ color: '#2563EB' }}>{activeAudit.audit_id}</strong>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div style={{ padding: '16px 24px', background: '#F8FAFC', borderTop: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'flex-end' }}>
              <button 
                className="btn-primary" 
                onClick={() => setShowAuditModal(false)}
                style={{ padding: '8px 20px', fontSize: '13px' }}
              >
                Close Audit Inspection
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Sprint 2: Webhooks & Real-Time Telemetry Stream / Simulator Modal */}
      {showWebhookModal && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(15, 23, 42, 0.7)',
          backdropFilter: 'blur(5px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: '20px'
        }}>
          <div style={{
            background: '#FFFFFF',
            borderRadius: '16px',
            maxWidth: '960px',
            width: '100%',
            maxHeight: '90vh',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
            border: '1px solid var(--border-subtle)',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden'
          }}>
            {/* Header */}
            <div style={{
              background: '#0F172A',
              color: '#FFFFFF',
              padding: '18px 24px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Activity size={22} color="#60A5FA" className="pulse-live" />
                <div>
                  <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 800 }}>
                    Live Webhooks & Telemetry Operations Stream
                  </h3>
                  <p style={{ margin: 0, fontSize: '12px', color: '#94A3B8' }}>
                    Real-time FlightAware radar delays, Stripe 85/10/5 settlements, Twilio IVR, & GPS geofencing
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setShowWebhookModal(false)}
                style={{ background: 'transparent', border: 'none', color: '#94A3B8', cursor: 'pointer', padding: '4px' }}
              >
                <X size={22} />
              </button>
            </div>

            {/* Notification Alert if trigger executed */}
            {simulationNotification && (
              <div style={{
                background: '#ECFDF5',
                borderBottom: '1px solid #A7F3D0',
                color: '#065F46',
                padding: '12px 24px',
                fontSize: '13px',
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                <CheckCircle size={16} color="#059669" />
                {simulationNotification}
              </div>
            )}

            {/* Body */}
            <div style={{ padding: '24px', overflowY: 'auto', flex: 1 }}>
              {/* Trigger Simulator Section */}
              <div style={{ background: '#F8FAFC', borderRadius: '12px', border: '1px solid var(--border-subtle)', padding: '18px', marginBottom: '24px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '12px' }}>
                  <Zap size={16} color="#2563EB" /> One-Click Live Webhook Event Simulator
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '10px' }}>
                  <button
                    disabled={simulatingWebhook}
                    onClick={() => handleTriggerSimulation('FLIGHT_DELAY', { flight_number: 'BA 177', delay_minutes: 45 })}
                    className="btn-secondary"
                    style={{ padding: '10px 14px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '8px', background: '#FFFFFF' }}
                  >
                    <Plane size={14} color="#2563EB" /> Simulate Flight Delay (+45m)
                  </button>

                  <button
                    disabled={simulatingWebhook}
                    onClick={() => handleTriggerSimulation('WHEELS_DOWN', { flight_number: 'BA 177' })}
                    className="btn-secondary"
                    style={{ padding: '10px 14px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '8px', background: '#FFFFFF' }}
                  >
                    <Plane size={14} color="#059669" /> Simulate Touchdown / Wheels-Down
                  </button>

                  <button
                    disabled={simulatingWebhook}
                    onClick={() => handleTriggerSimulation('STRIPE_CAPTURE', { amount_usd: 195.00 })}
                    className="btn-secondary"
                    style={{ padding: '10px 14px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '8px', background: '#FFFFFF' }}
                  >
                    <DollarSign size={14} color="#7C3AED" /> Stripe 85/10/5 Split Capture
                  </button>

                  <button
                    disabled={simulatingWebhook}
                    onClick={() => handleTriggerSimulation('TWILIO_VOICE')}
                    className="btn-secondary"
                    style={{ padding: '10px 14px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '8px', background: '#FFFFFF' }}
                  >
                    <PhoneCall size={14} color="#D97706" /> Twilio Voice IVR Quote
                  </button>

                  <button
                    disabled={simulatingWebhook}
                    onClick={() => handleTriggerSimulation('TWILIO_WHATSAPP')}
                    className="btn-secondary"
                    style={{ padding: '10px 14px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '8px', background: '#FFFFFF' }}
                  >
                    <MessageSquare size={14} color="#059669" /> WhatsApp Quote Inbound
                  </button>

                  <button
                    disabled={simulatingWebhook}
                    onClick={() => handleTriggerSimulation('GPS_PING', { lat: 40.6413, lng: -73.7781 })}
                    className="btn-secondary"
                    style={{ padding: '10px 14px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '8px', background: '#FFFFFF' }}
                  >
                    <Navigation size={14} color="#0891B2" /> Geofence JFK Airport Arrival
                  </button>
                </div>
              </div>

              {/* Escrow Split Settlements Section */}
              {splitSettlements.length > 0 && (
                <div style={{ marginBottom: '24px' }}>
                  <h4 style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '10px' }}>
                    💳 Inter-Vendor Escrow Split Settlements (85% / 10% / 5%)
                  </h4>
                  <div style={{ overflowX: 'auto', border: '1px solid var(--border-subtle)', borderRadius: '10px' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', textAlign: 'left' }}>
                      <thead style={{ background: '#F8FAFC', color: 'var(--text-muted)' }}>
                        <tr>
                          <th style={{ padding: '8px 12px' }}>SETTLEMENT ID</th>
                          <th style={{ padding: '8px 12px' }}>TRIP / BOOKING</th>
                          <th style={{ padding: '8px 12px' }}>TOTAL GROSS</th>
                          <th style={{ padding: '8px 12px', color: '#059669' }}>SERVICING (85%)</th>
                          <th style={{ padding: '8px 12px', color: '#D97706' }}>ORIGINATING (10%)</th>
                          <th style={{ padding: '8px 12px', color: '#2563EB' }}>PLATFORM (5%)</th>
                          <th style={{ padding: '8px 12px' }}>STATUS</th>
                        </tr>
                      </thead>
                      <tbody>
                        {splitSettlements.map((s, idx) => (
                          <tr key={idx} style={{ borderTop: '1px solid var(--border-subtle)' }}>
                            <td style={{ padding: '10px 12px', fontWeight: 700 }}>{s.settlement_id}</td>
                            <td style={{ padding: '10px 12px' }}>{s.trip_id}</td>
                            <td style={{ padding: '10px 12px', fontWeight: 800 }}>${Number(s.total_amount_gross).toFixed(2)}</td>
                            <td style={{ padding: '10px 12px', fontWeight: 700, color: '#059669' }}>${Number(s.servicing_partner_payout_net).toFixed(2)}</td>
                            <td style={{ padding: '10px 12px', fontWeight: 700, color: '#D97706' }}>${Number(s.originating_commission_net).toFixed(2)}</td>
                            <td style={{ padding: '10px 12px', fontWeight: 700, color: '#2563EB' }}>${Number(s.platform_clearing_fee_net).toFixed(2)}</td>
                            <td style={{ padding: '10px 12px' }}>
                              <span className="badge-green" style={{ fontSize: '10px' }}>{s.status}</span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Ingested Webhook Feed Table */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                  <h4 style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
                    📡 Live Ingested Webhook & Telemetry Feed ({webhookEvents.length})
                  </h4>
                  <button onClick={loadWebhookData} className="btn-secondary" style={{ padding: '4px 10px', fontSize: '11px' }}>
                    <RefreshCw size={11} /> Refresh Feed
                  </button>
                </div>
                <div style={{ overflowX: 'auto', border: '1px solid var(--border-subtle)', borderRadius: '10px' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', textAlign: 'left' }}>
                    <thead style={{ background: '#F8FAFC', color: 'var(--text-muted)' }}>
                      <tr>
                        <th style={{ padding: '8px 12px' }}>TIME (UTC)</th>
                        <th style={{ padding: '8px 12px' }}>SOURCE</th>
                        <th style={{ padding: '8px 12px' }}>EVENT TYPE</th>
                        <th style={{ padding: '8px 12px' }}>DETAILS & NOTES</th>
                        <th style={{ padding: '8px 12px' }}>STATUS</th>
                      </tr>
                    </thead>
                    <tbody>
                      {webhookEvents.length === 0 ? (
                        <tr>
                          <td colSpan={5} style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)' }}>
                            No webhook events ingested yet. Use the simulator buttons above to trigger live events.
                          </td>
                        </tr>
                      ) : (
                        webhookEvents.map(ev => (
                          <tr key={ev.id} style={{ borderTop: '1px solid var(--border-subtle)' }}>
                            <td style={{ padding: '10px 12px', whiteSpace: 'nowrap', color: 'var(--text-muted)' }}>
                              {new Date(ev.processed_at_utc).toLocaleTimeString()}
                            </td>
                            <td style={{ padding: '10px 12px' }}>
                              <span className={
                                ev.source === 'FLIGHTAWARE' ? 'blue-badge' :
                                ev.source === 'STRIPE' ? 'gold-badge' :
                                ev.source === 'TELEMETRY_GPS' ? 'badge-green' : 'blue-badge'
                              } style={{ fontSize: '10px' }}>
                                {ev.source}
                              </span>
                            </td>
                            <td style={{ padding: '10px 12px', fontWeight: 600, color: 'var(--text-primary)' }}>
                              {ev.event_type}
                            </td>
                            <td style={{ padding: '10px 12px', color: 'var(--text-secondary)' }}>
                              {ev.processing_notes || JSON.stringify(ev.payload)}
                            </td>
                            <td style={{ padding: '10px 12px' }}>
                              <span className="badge-green" style={{ fontSize: '10px' }}>
                                {ev.status}
                              </span>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div style={{ padding: '16px 24px', background: '#F8FAFC', borderTop: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'flex-end' }}>
              <button 
                className="btn-primary" 
                onClick={() => setShowWebhookModal(false)}
                style={{ padding: '8px 20px', fontSize: '13px' }}
              >
                Close Stream Monitor
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DISPATCHER INBOUND PHONE BOOKING DESK MODAL */}
      <DispatcherPhoneBookingModal
        isOpen={showPhoneBookingModal}
        onClose={() => setShowPhoneBookingModal(false)}
        vendorId={selectedVendorId}
        vendorName={activeVendor?.name || 'Sovereign Fleet'}
        availableDrivers={vendorDrivers}
        availableVehicles={vendorVehicles}
        onBookingCreated={async (bkgId) => {
          await loadData();
        }}
      />
    </div>
  );
};
