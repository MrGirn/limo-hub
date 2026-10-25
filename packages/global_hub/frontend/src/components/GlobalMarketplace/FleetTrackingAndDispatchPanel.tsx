import React, { useState, useEffect } from 'react';
import { Navigation, Compass, Radio, MapPin, Phone, User, Calendar, CheckCircle, RefreshCw, Plane, AlertTriangle, ExternalLink } from 'lucide-react';

interface AdminBooking {
  booking_reference: string;
  trip_type: string;
  pickup_address: string;
  dropoff_address: string;
  pickup_datetime_str: string;
  passengers_count: number;
  vehicle_class: string;
  vehicle_model_name?: string;
  booking_status: string;
  escrow_status: string;
  total_amount_usd: number;
  assigned_vendor_name: string;
  assigned_chauffeur_name?: string;
  assigned_chauffeur_phone?: string;
  assigned_vehicle_plate?: string;
  flight_number?: string;
  flight_radar_status?: string;
  passenger_first_name: string;
  passenger_last_name: string;
  passenger_email: string;
  passenger_phone: string;
  special_requests?: string;
  created_at: string;
  telemetry?: {
    latitude: number;
    longitude: number;
    speed_mph: number;
    heading_deg: number;
    eta_minutes: number;
    ride_phase: string;
  };
  settlement: {
    servicing_payout_usd: number;
    originating_commission_usd: number;
    platform_clearing_fee_usd: number;
    status: string;
  };
}

export const FleetTrackingAndDispatchPanel: React.FC = () => {
  const [bookings, setBookings] = useState<AdminBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [settlingRef, setSettlingRef] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  const fetchBookings = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (statusFilter !== 'ALL') params.append('status', statusFilter);
      if (searchQuery) params.append('search', searchQuery);

      const res = await fetch(`/api/v1/global-hub/admin/all-bookings?${params.toString()}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setBookings(data.bookings || []);
    } catch (err: any) {
      setError(err.message || 'Failed to load fleet rides.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBookings();
  }, [statusFilter]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchBookings();
  };

  const handleCompleteAndSettle = async (ref: string) => {
    if (!confirm(`Confirm ride completion for ${ref} and trigger live Stripe Connect payout release?`)) return;
    setSettlingRef(ref);
    try {
      const res = await fetch(`/api/v1/global-hub/public/booking/${ref}/complete-and-settle`, {
        method: 'POST'
      });
      if (!res.ok) throw new Error('Failed to complete and settle ride');
      const data = await res.json();
      setActionMessage(`Ride ${ref} marked COMPLETED. Escrow settled: $${data.escrow_settlement?.servicing_payout_usd || 0} released to affiliate carrier.`);
      setTimeout(() => setActionMessage(null), 4000);
      fetchBookings();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSettlingRef(null);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ fontSize: '22px', fontWeight: '900', color: '#0F172A', margin: 0, letterSpacing: '-0.02em' }}>
            Live Fleet GPS Tracking & Active Ride Dispatch
          </h2>
          <p style={{ fontSize: '13px', color: '#64748B', margin: '4px 0 0 0' }}>
            Real-time vehicle telemetry feeds, heading compass, Flight Radar webhooks, and live clearinghouse settlements.
          </p>
        </div>

        <button
          onClick={fetchBookings}
          disabled={loading}
          style={{
            background: '#FFFFFF',
            border: '1px solid #CBD5E1',
            borderRadius: '8px',
            padding: '8px 16px',
            fontSize: '13px',
            fontWeight: '700',
            color: '#0F172A',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          <RefreshCw size={14} className={loading ? 'spin' : ''} /> Refresh Telemetry
        </button>
      </div>

      {actionMessage && (
        <div style={{ background: '#ECFDF5', border: '1px solid #A7F3D0', padding: '12px 16px', borderRadius: '8px', color: '#065F46', fontSize: '13px', fontWeight: '700' }}>
          ✓ {actionMessage}
        </div>
      )}

      {/* Search & Filters */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '16px' }}>
        <div style={{ display: 'flex', gap: '8px' }}>
          {['ALL', 'CONFIRMED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'].map(st => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              style={{
                background: statusFilter === st ? '#0078D4' : '#FFFFFF',
                color: statusFilter === st ? '#FFFFFF' : '#475569',
                border: '1px solid #CBD5E1',
                padding: '6px 14px',
                borderRadius: '8px',
                fontSize: '12px',
                fontWeight: '700',
                cursor: 'pointer'
              }}
            >
              {st}
            </button>
          ))}
        </div>

        <form onSubmit={handleSearch} style={{ display: 'flex', gap: '8px', flex: 1, maxWidth: '400px' }}>
          <input
            type="text"
            placeholder="Search reference, passenger, or carrier..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            style={{ flex: 1, padding: '8px 12px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '12px' }}
          />
          <button
            type="submit"
            style={{
              background: '#0F172A',
              color: '#FFFFFF',
              border: 'none',
              padding: '8px 14px',
              borderRadius: '8px',
              fontSize: '12px',
              fontWeight: '700',
              cursor: 'pointer'
            }}
          >
            Search
          </button>
        </form>
      </div>

      {/* Rides List with Telemetry Cards */}
      {loading && bookings.length === 0 ? (
        <div style={{ padding: '60px', textAlign: 'center', color: '#64748B', background: '#FFFFFF', borderRadius: '12px', border: '1px solid #E2E8F0' }}>
          Loading active fleet telemetry...
        </div>
      ) : error ? (
        <div style={{ padding: '24px', background: '#FEF2F2', border: '1px solid #FCA5A5', borderRadius: '8px', color: '#991B1B' }}>
          {error}
        </div>
      ) : bookings.length === 0 ? (
        <div style={{ padding: '60px', textAlign: 'center', background: '#FFFFFF', borderRadius: '12px', border: '1px solid #E2E8F0' }}>
          <Navigation size={36} color="#94A3B8" style={{ marginBottom: '12px' }} />
          <h3 style={{ fontSize: '16px', fontWeight: '800', color: '#0F172A', margin: 0 }}>No Rides Found</h3>
          <p style={{ fontSize: '13px', color: '#64748B', marginTop: '4px' }}>
            Try changing the status filter or search keywords.
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {bookings.map(b => (
            <div
              key={b.booking_reference}
              style={{
                background: '#FFFFFF',
                borderRadius: '12px',
                border: '1px solid #E2E8F0',
                padding: '24px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
                display: 'flex',
                flexDirection: 'column',
                gap: '16px'
              }}
            >
              {/* Row 1: Header & Status Badges */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ fontSize: '18px', fontWeight: '900', color: '#0F172A' }}>{b.booking_reference}</span>
                    <span style={{
                      fontSize: '11px',
                      fontWeight: '800',
                      padding: '3px 10px',
                      borderRadius: '999px',
                      background: b.booking_status === 'COMPLETED' ? '#DCFCE7' : b.booking_status === 'CANCELLED' ? '#FEE2E2' : '#EFF6FF',
                      color: b.booking_status === 'COMPLETED' ? '#15803D' : b.booking_status === 'CANCELLED' ? '#B91C1C' : '#1D4ED8'
                    }}>
                      {b.booking_status}
                    </span>
                    <span style={{
                      fontSize: '11px',
                      fontWeight: '800',
                      padding: '3px 10px',
                      borderRadius: '999px',
                      background: '#F1F5F9',
                      color: '#475569'
                    }}>
                      {b.trip_type}
                    </span>
                  </div>

                  <div style={{ fontSize: '12px', color: '#64748B', marginTop: '4px' }}>
                    Pickup: <strong>{b.pickup_datetime_str}</strong> • Created: {b.created_at ? new Date(b.created_at).toLocaleString() : 'N/A'}
                  </div>
                </div>

                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '20px', fontWeight: '900', color: '#0078D4' }}>${(b.total_amount_usd ?? 0).toFixed(2)}</div>
                  <div style={{ fontSize: '11px', color: '#64748B' }}>
                    Escrow: <strong style={{ color: b.escrow_status === 'HELD_IN_ESCROW' ? '#CA8A04' : '#16A34A' }}>{b.escrow_status}</strong>
                  </div>
                </div>
              </div>

              {/* Row 2: Route & Flight */}
              <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '20px', background: '#F8FAFC', padding: '16px', borderRadius: '10px', border: '1px solid #E2E8F0' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px' }}>
                    <MapPin size={15} color="#16A34A" />
                    <span><strong>Pickup:</strong> {b.pickup_address}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px' }}>
                    <MapPin size={15} color="#DC2626" />
                    <span><strong>Drop-off:</strong> {b.dropoff_address}</span>
                  </div>
                  {b.flight_number && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: '#0078D4', background: '#EFF6FF', padding: '4px 10px', borderRadius: '6px', width: 'fit-content' }}>
                      <Plane size={13} />
                      <span>Flight {b.flight_number}: <strong>{b.flight_radar_status || 'ON_SCHEDULE'}</strong></span>
                    </div>
                  )}
                </div>

                {/* Chauffeur & Vehicle */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '12px' }}>
                  <div>Assigned Carrier: <strong style={{ color: '#0F172A' }}>{b.assigned_vendor_name}</strong></div>
                  <div>Chauffeur: <strong style={{ color: '#0F172A' }}>{b.assigned_chauffeur_name || 'Dispatching'}</strong> {b.assigned_chauffeur_phone && `(${b.assigned_chauffeur_phone})`}</div>
                  <div>Vehicle: <strong style={{ color: '#0F172A' }}>{b.vehicle_model_name || b.vehicle_class}</strong> {b.assigned_vehicle_plate && `[${b.assigned_vehicle_plate}]`}</div>
                  <div>Passenger: <strong style={{ color: '#0F172A' }}>{b.passenger_first_name} {b.passenger_last_name}</strong> ({b.passenger_email})</div>
                </div>
              </div>

              {/* Row 3: Live Telemetry Telemetry Bar & Escrow Payout Split */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                {/* Telemetry */}
                <div style={{ background: '#0F172A', color: '#FFFFFF', padding: '14px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <Radio size={18} color="#22C55E" />
                    <div>
                      <div style={{ fontSize: '11px', color: '#94A3B8', textTransform: 'uppercase', fontWeight: '800' }}>GPS Telemetry</div>
                      <div style={{ fontSize: '13px', fontWeight: '700', color: '#FFFFFF' }}>
                        Phase: <span style={{ color: '#38BDF8' }}>{b.telemetry?.ride_phase || 'EN_ROUTE_PICKUP'}</span>
                      </div>
                    </div>
                  </div>

                  <div style={{ textAlign: 'right', fontSize: '11px', color: '#94A3B8' }}>
                    <div>Speed: <strong style={{ color: '#FFFFFF' }}>{b.telemetry?.speed_mph || 0} mph</strong></div>
                    <div>Coords: {b.telemetry?.latitude ? b.telemetry.latitude.toFixed(4) : '0.0000'}, {b.telemetry?.longitude ? b.telemetry.longitude.toFixed(4) : '0.0000'}</div>
                  </div>
                </div>

                {/* Settlement 80/10/10 Breakdown */}
                <div style={{ background: '#F1F5F9', padding: '14px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '12px' }}>
                  <div>
                    <div style={{ fontSize: '11px', color: '#64748B', fontWeight: '800' }}>80/10/10 Escrow Split</div>
                    <div style={{ color: '#0F172A', marginTop: '2px' }}>
                      80% Carrier: <strong>${(b.settlement?.servicing_payout_usd ?? 0).toFixed(2)}</strong>
                    </div>
                    <div style={{ color: '#64748B', fontSize: '11px' }}>
                      10% Booker: ${(b.settlement?.originating_commission_usd ?? 0).toFixed(2)} • 10% Hub: ${(b.settlement?.platform_clearing_fee_usd ?? 0).toFixed(2)}
                    </div>
                  </div>

                  {b.booking_status !== 'COMPLETED' && b.booking_status !== 'CANCELLED' && (
                    <button
                      onClick={() => handleCompleteAndSettle(b.booking_reference)}
                      disabled={settlingRef === b.booking_reference}
                      style={{
                        background: '#16A34A',
                        border: 'none',
                        borderRadius: '8px',
                        padding: '8px 14px',
                        fontSize: '12px',
                        fontWeight: '800',
                        color: '#FFFFFF',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px'
                      }}
                    >
                      <CheckCircle size={14} />
                      {settlingRef === b.booking_reference ? 'Settling...' : 'Complete & Settle'}
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
