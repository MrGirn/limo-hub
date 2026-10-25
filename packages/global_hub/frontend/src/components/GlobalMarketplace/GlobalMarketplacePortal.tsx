import React, { useState, useEffect } from 'react';
import { 
  Plane, MapPin, Calendar, Users, DollarSign, ArrowRight, ShieldCheck, Clock, 
  CheckCircle2, Plus, RefreshCw, AlertCircle, Sparkles, Building2, Radio, 
  FileText, ArrowRightLeft, Navigation, Edit2, Trash2, Send, Download
} from 'lucide-react';

interface ItineraryLeg {
  id: string;
  leg_number: number;
  city: string;
  origin: string;
  destination: string;
  vehicle_class: string;
  vehicle_name: string;
  assigned_vendor_id: string;
  assigned_vendor_name: string;
  flight_number?: string;
  flight_status?: string;
  pickup_datetime_str: string;
  distance_miles: number;
  base_fare_usd: number;
  total_fare_usd: number;
  status: 'QUOTE_READY' | 'ASSIGNED_TO_CELL' | 'CHAUFFEUR_DISPATCHED' | 'EN_ROUTE' | 'COMPLETED';
  audit_logs: Array<{ timestamp: string; message: string; actor: string }>;
}

export const GlobalMarketplacePortal: React.FC = () => {
  const [legs, setLegs] = useState<ItineraryLeg[]>([]);
  const [availableVendors, setAvailableVendors] = useState<any[]>([]);
  const [bookingSuccess, setBookingSuccess] = useState<string | null>(null);
  const [isAuthorizing, setIsAuthorizing] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);

  // New leg modal state
  const [newLegCity, setNewLegCity] = useState('Philadelphia (PHL)');
  const [newLegOrigin, setNewLegOrigin] = useState('Rittenhouse Square, Philadelphia, PA');
  const [newLegDest, setNewLegDest] = useState('Philadelphia International Airport (PHL)');
  const [newLegVehicle, setNewLegVehicle] = useState('Cadillac Escalade ESV');
  const [newLegFare, setNewLegFare] = useState('135.00');

  const loadLiveBookings = () => {
    fetch('/api/v1/global-hub/admin/all-bookings')
      .then(res => res.json())
      .then((data: any[]) => {
        if (Array.isArray(data) && data.length > 0) {
          const liveLegs: ItineraryLeg[] = data.map((b, idx) => ({
            id: b.booking_reference,
            leg_number: idx + 1,
            city: b.pickup_address.includes(',') ? b.pickup_address.split(',')[1].trim() : b.pickup_address,
            origin: b.pickup_address,
            destination: b.dropoff_address,
            vehicle_class: b.vehicle_class,
            vehicle_name: b.vehicle_model_name,
            assigned_vendor_id: b.assigned_vendor_id || 'vnd_sovereign_philly',
            assigned_vendor_name: b.assigned_vendor_name || 'ANB Executive Chauffeur',
            flight_number: b.flight_number,
            flight_status: b.flight_radar_status || (b.flight_number ? 'ON_SCHEDULE' : undefined),
            pickup_datetime_str: b.pickup_datetime_str,
            distance_miles: 18.0,
            base_fare_usd: b.base_fare_usd,
            total_fare_usd: b.total_amount_usd,
            status: b.booking_status === 'CONFIRMED' ? 'ASSIGNED_TO_CELL' : b.booking_status,
            audit_logs: [
              { timestamp: new Date(b.created_at || Date.now()).toLocaleTimeString() + ' UTC', message: `Booking ${b.booking_reference} confirmed & clearhouse escrow held.`, actor: 'Clearinghouse' }
            ]
          }));
          setLegs(liveLegs);
        }
      })
      .catch(err => console.warn('Could not load live bookings:', err));
  };

  useEffect(() => {
    loadLiveBookings();
    fetch('/api/v1/global-hub/vendors')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          setAvailableVendors(data);
        }
      })
      .catch(() => {});
  }, []);

  const totalAllInclusive = legs.reduce((acc, leg) => acc + leg.total_fare_usd, 0);
  const carrierPayout = totalAllInclusive * 0.8;
  const bookerCommission = totalAllInclusive * 0.1;
  const platformFee = totalAllInclusive * 0.1;

  const handleSimulateFlightDelay = async (legId: string) => {
    const leg = legs.find(l => l.id === legId);
    if (!leg || !leg.flight_number) return;
    try {
      const isCurrentlyDelayed = leg.flight_status && leg.flight_status.includes('DELAY');
      const res = await fetch('/api/v1/global-hub/webhooks/flight-radar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          flight_number: leg.flight_number,
          event_type: isCurrentlyDelayed ? 'FLIGHT_STATUS_UPDATE' : 'FLIGHT_DELAY',
          delay_minutes: isCurrentlyDelayed ? 0 : 45,
          status: isCurrentlyDelayed ? 'ON_SCHEDULE' : 'DELAYED',
          terminal: 'Terminal 4',
          gate: 'B22'
        })
      });
      if (res.ok) {
        loadLiveBookings();
      }
    } catch (err) {
      console.warn('Flight radar trigger notice:', err);
    }
  };

  const handleReassignVendor = (legId: string, vendorId: string, vendorName: string) => {
    setLegs(prev => prev.map(leg => {
      if (leg.id === legId) {
        return {
          ...leg,
          assigned_vendor_id: vendorId,
          assigned_vendor_name: vendorName,
          audit_logs: [
            {
              timestamp: new Date().toLocaleTimeString() + ' UTC',
              message: `Re-assigned executing carrier to '${vendorName}' via Sourcing Desk.`,
              actor: 'OpsSuperAdmin'
            },
            ...leg.audit_logs
          ]
        };
      }
      return leg;
    }));
  };

  const handleAddNewLeg = () => {
    const fare = parseFloat(newLegFare) || 120.0;
    const newLeg: ItineraryLeg = {
      id: `leg-${Date.now()}`,
      leg_number: legs.length + 1,
      city: newLegCity,
      origin: newLegOrigin,
      destination: newLegDest,
      vehicle_class: 'BUSINESS_CLASS',
      vehicle_name: newLegVehicle,
      assigned_vendor_id: 'vnd-philly-001',
      assigned_vendor_name: 'Philadelphia Premier Chauffeur LLC',
      pickup_datetime_str: 'Nov 1, 2026 at 10:00 AM',
      distance_miles: 12.4,
      base_fare_usd: fare * 0.85,
      total_fare_usd: fare,
      status: 'ASSIGNED_TO_CELL',
      audit_logs: [
        { timestamp: new Date().toLocaleTimeString() + ' UTC', message: 'Leg added manually to transcontinental master itinerary.', actor: 'OpsConcierge' }
      ]
    };

    setLegs([...legs, newLeg]);
    setShowAddModal(false);
  };

  const handleDeleteLeg = (legId: string) => {
    setLegs(prev => prev.filter(l => l.id !== legId).map((l, idx) => ({ ...l, leg_number: idx + 1 })));
  };

  const handleCreateUnifiedMasterBooking = async () => {
    setIsAuthorizing(true);
    setBookingSuccess(null);

    try {
      const payload = {
        trip_type: 'MULTI_CITY',
        pickup_address: legs[0].origin,
        dropoff_address: legs[legs.length - 1].destination,
        pickup_datetime_str: legs[0].pickup_datetime_str,
        passengers_count: 2,
        vehicle_class: 'FIRST_CLASS',
        passenger_type: 'VIP_CORPORATE',
        passenger_first_name: 'Alexander',
        passenger_last_name: 'Vance',
        passenger_email: 'alexander.vance@vance-holdings.com',
        passenger_phone: '+1 (212) 555-0199',
        base_fare_usd: totalAllInclusive * 0.85,
        fees_and_taxes_usd: totalAllInclusive * 0.15,
        assigned_vendor_id: legs[0].assigned_vendor_id,
        assigned_vendor_name: legs[0].assigned_vendor_name,
        multi_city_legs: legs.map(l => ({
          city: l.city,
          pickup_address: l.origin,
          dropoff_address: l.destination,
          pickup_datetime_str: l.pickup_datetime_str,
          vehicle_class: l.vehicle_class,
          flight_number: l.flight_number || '',
          leg_fare_usd: l.total_fare_usd
        }))
      };

      const res = await fetch('/api/v1/global-hub/public/book', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        throw new Error(`Booking failed with HTTP ${res.status}`);
      }

      const data = await res.json();
      setBookingSuccess(data.booking_reference || 'LM-99014');
    } catch (err: any) {
      alert(`Booking pre-authorization failed: ${err.message}`);
    } finally {
      setIsAuthorizing(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      
      {/* 1. Header with Status & Action Bar */}
      <div style={{
        background: '#FFFFFF',
        padding: '24px',
        borderRadius: '10px',
        border: '1px solid #E2E8F0',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '16px'
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{
              background: '#0284C7',
              color: '#FFFFFF',
              padding: '3px 10px',
              borderRadius: '999px',
              fontSize: '11px',
              fontWeight: '800',
              letterSpacing: '0.04em'
            }}>
              LIVE SOURCING DESK
            </span>
            <span style={{ fontSize: '12px', color: '#64748B', fontWeight: '600' }}>
              Multi-Leg Transcontinental Journey Orchestrator
            </span>
          </div>
          <h2 style={{ fontSize: '22px', fontWeight: '800', color: '#0F172A', margin: '6px 0 2px 0' }}>
            Transcontinental Chauffeured Itinerary Builder
          </h2>
          <p style={{ fontSize: '13px', color: '#64748B', margin: 0 }}>
            Unified booking across multi-continent legs. Sourced and serviced by sovereign vetted affiliates with 80/10/10 Stripe split.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            onClick={() => setShowAddModal(true)}
            style={{
              background: '#F1F5F9',
              border: '1px solid #CBD5E1',
              color: '#0F172A',
              padding: '8px 14px',
              borderRadius: '6px',
              fontSize: '12px',
              fontWeight: '700',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <Plus size={14} color="#0078D4" /> Add Journey Leg
          </button>

          <button
            onClick={handleCreateUnifiedMasterBooking}
            disabled={isAuthorizing}
            style={{
              background: '#0078D4',
              border: 'none',
              color: '#FFFFFF',
              padding: '8px 18px',
              borderRadius: '6px',
              fontSize: '13px',
              fontWeight: '700',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <Send size={14} />
            {isAuthorizing ? 'Authorizing Single Escrow Hold...' : 'Authorize & Lock Itinerary'}
          </button>
        </div>
      </div>

      {bookingSuccess && (
        <div style={{
          background: '#DCFCE7',
          border: '1px solid #86EFAC',
          borderRadius: '8px',
          padding: '16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          color: '#166534'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <CheckCircle2 size={20} color="#16A34A" />
            <div>
              <div style={{ fontWeight: '800', fontSize: '14px' }}>Unified Itinerary Confirmed & Escrow Held in Stripe!</div>
              <div style={{ fontSize: '12px' }}>
                Master Reference: <strong>{bookingSuccess}</strong> • Single Pre-Authorization Hold: <strong>${totalAllInclusive.toFixed(2)} USD</strong>
              </div>
            </div>
          </div>
          <button
            onClick={() => window.open(`/api/v1/global-hub/bookings/${bookingSuccess}/invoice.pdf`, '_blank')}
            style={{
              background: '#16A34A',
              color: '#FFFFFF',
              border: 'none',
              padding: '6px 12px',
              borderRadius: '6px',
              fontSize: '12px',
              fontWeight: '700',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <Download size={13} /> Download Unified PDF
          </button>
        </div>
      )}

      {/* 2. Interactive Leg Management Rows */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        {legs.map((leg) => (
          <div
            key={leg.id}
            style={{
              background: '#FFFFFF',
              borderRadius: '10px',
              border: '1px solid #E2E8F0',
              borderLeft: '5px solid #0078D4',
              padding: '18px 22px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
            }}
          >
            {/* Top Bar of Leg */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '10px', marginBottom: '14px' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '12px', fontWeight: '800', color: '#0078D4', letterSpacing: '0.04em' }}>
                    LEG {leg.leg_number} — {leg.city}
                  </span>
                  <span style={{
                    fontSize: '10px',
                    fontWeight: '800',
                    padding: '2px 8px',
                    borderRadius: '999px',
                    background: '#DCFCE7',
                    color: '#15803D'
                  }}>
                    {leg.status}
                  </span>
                  {leg.flight_number && (
                    <span style={{
                      fontSize: '10px',
                      fontWeight: '800',
                      padding: '2px 8px',
                      borderRadius: '999px',
                      background: leg.flight_status?.includes('DELAYED') ? '#FEF3C7' : '#EFF6FF',
                      color: leg.flight_status?.includes('DELAYED') ? '#B45309' : '#1D4ED8',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}>
                      <Plane size={11} /> Flight {leg.flight_number}: {leg.flight_status}
                    </span>
                  )}
                </div>
                <h3 style={{ fontSize: '16px', fontWeight: '800', color: '#0F172A', marginTop: '3px' }}>
                  {leg.vehicle_name} <span style={{ fontSize: '12px', color: '#64748B', fontWeight: '500' }}>({leg.vehicle_class})</span>
                </h3>
              </div>

              {/* Price & Management Action Controls */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '20px', fontWeight: '800', color: '#0078D4' }}>${leg.total_fare_usd.toFixed(2)}</div>
                  <div style={{ fontSize: '11px', color: '#64748B' }}>All-Inclusive (Tax + Tip)</div>
                </div>

                <div style={{ display: 'flex', gap: '6px' }}>
                  {leg.flight_number && (
                    <button
                      onClick={() => handleSimulateFlightDelay(leg.id)}
                      title="Simulate live Flight Radar delay webhook trigger"
                      style={{
                        background: '#FEF3C7',
                        border: '1px solid #FCD34D',
                        color: '#92400E',
                        borderRadius: '6px',
                        padding: '6px 10px',
                        fontSize: '11px',
                        fontWeight: '700',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px'
                      }}
                    >
                      <Clock size={12} /> Test Delay
                    </button>
                  )}

                  <button
                    onClick={() => handleDeleteLeg(leg.id)}
                    title="Remove Leg"
                    style={{
                      background: '#FEE2E2',
                      border: '1px solid #FCA5A5',
                      color: '#B91C1C',
                      borderRadius: '6px',
                      padding: '6px 10px',
                      fontSize: '11px',
                      fontWeight: '700',
                      cursor: 'pointer'
                    }}
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              </div>
            </div>

            {/* Middle Grid: Routing & Assigned Sovereign Cell */}
            <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '16px', background: '#F8FAFC', padding: '14px', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '13px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <MapPin size={14} color="#16A34A" />
                  <span><strong>Pickup:</strong> {leg.origin}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <MapPin size={14} color="#DC2626" />
                  <span><strong>Drop-off:</strong> {leg.destination}</span>
                </div>
                <div style={{ fontSize: '12px', color: '#64748B', marginTop: '2px' }}>
                  📅 Scheduled: <strong>{leg.pickup_datetime_str}</strong> • Distance: <strong>{leg.distance_miles} miles</strong>
                </div>
              </div>

              {/* Carrier Selector */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '12px' }}>
                <div style={{ color: '#64748B', fontWeight: '700' }}>ASSIGNED EXECUTING CARRIER (CELL):</div>
                <select
                  value={leg.assigned_vendor_id}
                  onChange={(e) => {
                    const found = availableVendors.find(v => v.vendor_id === e.target.value);
                    handleReassignVendor(leg.id, e.target.value, found?.company_name || e.target.value);
                  }}
                  style={{
                    padding: '6px 8px',
                    borderRadius: '6px',
                    border: '1px solid #CBD5E1',
                    fontSize: '12px',
                    fontWeight: '700',
                    color: '#0F172A',
                    background: '#FFFFFF',
                    cursor: 'pointer'
                  }}
                >
                  <option value={leg.assigned_vendor_id}>{leg.assigned_vendor_name} (Active)</option>
                  {availableVendors
                    .filter(v => v.vendor_id !== leg.assigned_vendor_id)
                    .map(v => (
                      <option key={v.vendor_id} value={v.vendor_id}>
                        {v.company_name} ({v.market_city} • {v.rating_score}★)
                      </option>
                    ))}
                </select>

                <div style={{ fontSize: '11px', color: '#64748B' }}>
                  80% Carrier Payout: <strong style={{ color: '#16A34A' }}>${(leg.total_fare_usd * 0.8).toFixed(2)}</strong> • 10% Booker: <strong>${(leg.total_fare_usd * 0.1).toFixed(2)}</strong>
                </div>
              </div>
            </div>

            {/* Bottom: Live Audit Event Logs */}
            <div style={{ marginTop: '10px', borderTop: '1px solid #F1F5F9', paddingTop: '8px' }}>
              <div style={{ fontSize: '11px', fontWeight: '700', color: '#64748B', marginBottom: '4px' }}>
                LIVE LEG EVENT & AUDIT LOGS:
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                {leg.audit_logs.map((log, lIdx) => (
                  <div key={lIdx} style={{ fontSize: '11px', color: '#475569', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ color: '#0078D4', fontFamily: 'monospace', fontWeight: '700' }}>[{log.timestamp}]</span>
                    <span style={{ color: '#7C3AED', fontWeight: '700' }}>@{log.actor}:</span>
                    <span>{log.message}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* 3. Escrow 80/10/10 Split & Total Commitment Card */}
      <div style={{
        background: '#FFFFFF',
        padding: '24px',
        borderRadius: '10px',
        border: '1px solid #E2E8F0',
        boxShadow: '0 2px 6px rgba(0,0,0,0.06)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <div style={{ fontSize: '12px', color: '#64748B', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Total Multi-Leg Itinerary Commitment ({legs.length} Legs)
            </div>
            <div style={{ fontSize: '28px', fontWeight: '900', color: '#0F172A', marginTop: '2px' }}>
              ${totalAllInclusive.toFixed(2)} USD
            </div>
            <div style={{ fontSize: '12px', color: '#16A34A', marginTop: '4px', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <CheckCircle2 size={15} /> Single Stripe Pre-Authorization Hold • Zero Foreign Conversion Fees
            </div>
          </div>

          {/* 80/10/10 Breakdown Cards */}
          <div style={{ display: 'flex', gap: '14px', flexWrap: 'wrap' }}>
            <div style={{ background: '#F8FAFC', padding: '12px 18px', borderRadius: '8px', border: '1px solid #E2E8F0', minWidth: '150px' }}>
              <div style={{ fontSize: '10px', color: '#64748B', fontWeight: '800', letterSpacing: '0.04em' }}>80% SERVICING CARRIERS</div>
              <div style={{ fontSize: '18px', fontWeight: '900', color: '#16A34A', marginTop: '2px' }}>
                ${carrierPayout.toFixed(2)}
              </div>
              <div style={{ fontSize: '10px', color: '#64748B' }}>Split across {legs.length} local cells</div>
            </div>

            <div style={{ background: '#F8FAFC', padding: '12px 18px', borderRadius: '8px', border: '1px solid #E2E8F0', minWidth: '150px' }}>
              <div style={{ fontSize: '10px', color: '#64748B', fontWeight: '800', letterSpacing: '0.04em' }}>10% ORIGINATING BOOKER</div>
              <div style={{ fontSize: '18px', fontWeight: '900', color: '#D97706', marginTop: '2px' }}>
                ${bookerCommission.toFixed(2)}
              </div>
              <div style={{ fontSize: '10px', color: '#64748B' }}>Affiliate farm-out fee</div>
            </div>

            <div style={{ background: '#F8FAFC', padding: '12px 18px', borderRadius: '8px', border: '1px solid #E2E8F0', minWidth: '150px' }}>
              <div style={{ fontSize: '10px', color: '#64748B', fontWeight: '800', letterSpacing: '0.04em' }}>10% GLOBAL CLEARINGHOUSE</div>
              <div style={{ fontSize: '18px', fontWeight: '900', color: '#0078D4', marginTop: '2px' }}>
                ${platformFee.toFixed(2)}
              </div>
              <div style={{ fontSize: '10px', color: '#64748B' }}>Platform clearing margin</div>
            </div>
          </div>
        </div>
      </div>

      {/* Add New Leg Modal */}
      {showAddModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999
        }}>
          <div style={{
            background: '#FFFFFF',
            borderRadius: '10px',
            padding: '24px',
            width: '460px',
            boxShadow: '0 10px 30px rgba(0,0,0,0.3)',
            display: 'flex',
            flexDirection: 'column',
            gap: '14px'
          }}>
            <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '800', color: '#0F172A' }}>Add Journey Leg to Itinerary</h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <label style={{ fontSize: '11px', fontWeight: '700', color: '#475569' }}>Market City</label>
              <input
                type="text"
                value={newLegCity}
                onChange={e => setNewLegCity(e.target.value)}
                style={{ padding: '8px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '12px' }}
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <label style={{ fontSize: '11px', fontWeight: '700', color: '#475569' }}>Pickup Address</label>
              <input
                type="text"
                value={newLegOrigin}
                onChange={e => setNewLegOrigin(e.target.value)}
                style={{ padding: '8px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '12px' }}
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <label style={{ fontSize: '11px', fontWeight: '700', color: '#475569' }}>Drop-off Destination</label>
              <input
                type="text"
                value={newLegDest}
                onChange={e => setNewLegDest(e.target.value)}
                style={{ padding: '8px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '12px' }}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '11px', fontWeight: '700', color: '#475569' }}>Vehicle</label>
                <input
                  type="text"
                  value={newLegVehicle}
                  onChange={e => setNewLegVehicle(e.target.value)}
                  style={{ padding: '8px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '12px' }}
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '11px', fontWeight: '700', color: '#475569' }}>Calculated Fare ($ USD)</label>
                <input
                  type="number"
                  value={newLegFare}
                  onChange={e => setNewLegFare(e.target.value)}
                  style={{ padding: '8px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '12px' }}
                />
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '10px' }}>
              <button
                onClick={() => setShowAddModal(false)}
                style={{ background: '#F1F5F9', border: 'none', padding: '8px 14px', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', fontWeight: '600' }}
              >
                Cancel
              </button>
              <button
                onClick={handleAddNewLeg}
                style={{ background: '#0078D4', color: '#FFFFFF', border: 'none', padding: '8px 16px', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', fontWeight: '700' }}
              >
                Add Leg
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
