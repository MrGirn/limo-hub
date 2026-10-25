import React, { useState, useEffect } from 'react';
import { ArrowRightLeft, Send, CheckCircle2, Clock, MapPin, DollarSign, RefreshCw, AlertCircle, Plus, Shield } from 'lucide-react';

interface RFPItem {
  rfp_id: string;
  quote_token: string;
  leg_id?: string;
  target_city: string;
  target_vendor_name: string;
  pickup_address: string;
  dropoff_address: string;
  benchmark_payout_usd: number;
  status: string;
  sent_at_utc: string;
}

export const FarmExchangeRFPPanel: React.FC = () => {
  const [rfps, setRfps] = useState<RFPItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cityFilter, setCityFilter] = useState('');
  const [showDispatchModal, setShowDispatchModal] = useState(false);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  // New RFP dispatch form state
  const [dispatchForm, setDispatchForm] = useState({
    target_city: 'Philadelphia',
    pickup_address: 'Philadelphia International Airport (PHL)',
    dropoff_address: 'The Ritz-Carlton, Center City, Philadelphia, PA',
    vehicle_class: 'BUSINESS_CLASS',
    benchmark_payout_usd: 165.00
  });
  const [dispatching, setDispatching] = useState(false);

  const fetchRfps = async () => {
    setLoading(true);
    setError(null);
    try {
      const url = cityFilter 
        ? `/api/v1/global-hub/rfp/active?city=${encodeURIComponent(cityFilter)}` 
        : '/api/v1/global-hub/rfp/active';
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setRfps(data.rfps || []);
    } catch (err: any) {
      setError(err.message || 'Failed to load active RFPs.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRfps();
  }, [cityFilter]);

  const handleAcceptRfp = async (rfp: RFPItem) => {
    try {
      const res = await fetch(`/api/v1/global-hub/rfp/${rfp.quote_token}/accept`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vendor_id: 'vnd_affiliate_direct',
          vendor_name: 'Affiliate Fleet Sovereign Partner',
          bid_payout_usd: rfp.benchmark_payout_usd
        })
      });
      if (!res.ok) throw new Error('Failed to accept RFP');
      const data = await res.json();
      setActionMessage(`Accepted Farm-In bid for RFP ${rfp.rfp_id}. Booking ${data.booking_reference} confirmed.`);
      setTimeout(() => setActionMessage(null), 4000);
      fetchRfps();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleDispatchNewRfp = async (e: React.FormEvent) => {
    e.preventDefault();
    setDispatching(true);
    try {
      const res = await fetch('/api/v1/global-hub/rfp/dispatch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dispatchForm)
      });
      if (!res.ok) throw new Error('Failed to dispatch RFP broadcast');
      const data = await res.json();
      setActionMessage(`Dispatched Farm-Out RFP ${data.rfp_id} to ${data.broadcast_targets_count} vetted regional affiliates.`);
      setTimeout(() => setActionMessage(null), 4000);
      setShowDispatchModal(false);
      fetchRfps();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setDispatching(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ fontSize: '22px', fontWeight: '900', color: '#0F172A', margin: 0, letterSpacing: '-0.02em' }}>
            Farm-Out / Farm-In Exchange & RFP Sourcing Desk
          </h2>
          <p style={{ fontSize: '13px', color: '#64748B', margin: '4px 0 0 0' }}>
            Automated reverse-auction exchange for inter-network ride fulfillment, affiliate bidding, and clearinghouse routing.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            onClick={() => setShowDispatchModal(true)}
            style={{
              background: '#0078D4',
              border: 'none',
              borderRadius: '8px',
              padding: '8px 16px',
              fontSize: '13px',
              fontWeight: '700',
              color: '#FFFFFF',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              boxShadow: '0 2px 8px rgba(0,120,212,0.2)'
            }}
          >
            <Plus size={14} /> Broadcast Farm-Out RFP
          </button>

          <button
            onClick={fetchRfps}
            disabled={loading}
            style={{
              background: '#FFFFFF',
              border: '1px solid #CBD5E1',
              borderRadius: '8px',
              padding: '8px 14px',
              fontSize: '13px',
              fontWeight: '700',
              color: '#0F172A',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <RefreshCw size={14} className={loading ? 'spin' : ''} /> Refresh
          </button>
        </div>
      </div>

      {actionMessage && (
        <div style={{ background: '#ECFDF5', border: '1px solid #A7F3D0', padding: '12px 16px', borderRadius: '8px', color: '#065F46', fontSize: '13px', fontWeight: '700' }}>
          ✓ {actionMessage}
        </div>
      )}

      {/* Filter Tabs */}
      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
        <span style={{ fontSize: '12px', fontWeight: '700', color: '#64748B' }}>Filter Market:</span>
        {['', 'Philadelphia', 'New York', 'London', 'Dubai'].map(city => (
          <button
            key={city || 'all'}
            onClick={() => setCityFilter(city)}
            style={{
              background: cityFilter === city ? '#0078D4' : '#FFFFFF',
              color: cityFilter === city ? '#FFFFFF' : '#475569',
              border: '1px solid #CBD5E1',
              padding: '4px 12px',
              borderRadius: '6px',
              fontSize: '12px',
              fontWeight: '700',
              cursor: 'pointer'
            }}
          >
            {city || 'All Markets'}
          </button>
        ))}
      </div>

      {/* Active RFP List */}
      {loading && rfps.length === 0 ? (
        <div style={{ padding: '60px', textAlign: 'center', color: '#64748B', background: '#FFFFFF', borderRadius: '12px', border: '1px solid #E2E8F0' }}>
          Loading active reverse auction RFPs...
        </div>
      ) : error ? (
        <div style={{ padding: '24px', background: '#FEF2F2', border: '1px solid #FCA5A5', borderRadius: '8px', color: '#991B1B' }}>
          {error}
        </div>
      ) : rfps.length === 0 ? (
        <div style={{ padding: '60px', textAlign: 'center', background: '#FFFFFF', borderRadius: '12px', border: '1px solid #E2E8F0' }}>
          <ArrowRightLeft size={36} color="#94A3B8" style={{ marginBottom: '12px' }} />
          <h3 style={{ fontSize: '16px', fontWeight: '800', color: '#0F172A', margin: 0 }}>No Open Reverse Auction RFPs</h3>
          <p style={{ fontSize: '13px', color: '#64748B', marginTop: '4px' }}>
            All farm-out trips have been claimed or fulfilled. Broadcast a new RFP above to solicit affiliate bids.
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {rfps.map(r => (
            <div
              key={r.rfp_id}
              style={{
                background: '#FFFFFF',
                borderRadius: '12px',
                border: '1px solid #E2E8F0',
                padding: '20px',
                boxShadow: '0 1px 4px rgba(0,0,0,0.02)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '20px'
              }}
            >
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ fontSize: '14px', fontWeight: '800', color: '#0F172A' }}>RFP #{r.rfp_id}</span>
                  <span style={{
                    fontSize: '10px',
                    fontWeight: '800',
                    padding: '2px 8px',
                    borderRadius: '999px',
                    background: r.status === 'OPEN_AUCTION' ? '#EFF6FF' : '#DCFCE7',
                    color: r.status === 'OPEN_AUCTION' ? '#1D4ED8' : '#15803D'
                  }}>
                    {r.status}
                  </span>
                  <span style={{ fontSize: '11px', color: '#0078D4', fontWeight: '700' }}>
                    {r.target_city} Regional Cluster
                  </span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#1E293B' }}>
                  <MapPin size={14} color="#64748B" />
                  <strong>From:</strong> {r.pickup_address}
                  <span style={{ color: '#94A3B8' }}>➔</span>
                  <strong>To:</strong> {r.dropoff_address}
                </div>

                <div style={{ fontSize: '11px', color: '#64748B' }}>
                  Targeted Affiliate: <strong style={{ color: '#0F172A' }}>{r.target_vendor_name}</strong> • Token: <code>{r.quote_token}</code>
                </div>
              </div>

              {/* Payout & Action */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '11px', color: '#64748B', fontWeight: '700' }}>Benchmark Payout</div>
                  <div style={{ fontSize: '20px', fontWeight: '900', color: '#16A34A' }}>${r.benchmark_payout_usd.toFixed(2)}</div>
                  <div style={{ fontSize: '10px', color: '#64748B' }}>80% Escrow Share</div>
                </div>

                {r.status === 'OPEN_AUCTION' && (
                  <button
                    onClick={() => handleAcceptRfp(r)}
                    style={{
                      background: '#16A34A',
                      border: 'none',
                      borderRadius: '8px',
                      padding: '10px 18px',
                      fontSize: '13px',
                      fontWeight: '800',
                      color: '#FFFFFF',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      boxShadow: '0 2px 6px rgba(22,163,74,0.2)'
                    }}
                  >
                    <CheckCircle2 size={15} /> Accept Farm-In Bid
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Broadcast RFP Modal */}
      {showDispatchModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(15, 23, 42, 0.6)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 100
        }}>
          <div style={{
            background: '#FFFFFF',
            borderRadius: '16px',
            width: '100%',
            maxWidth: '520px',
            padding: '28px',
            boxShadow: '0 20px 40px rgba(0,0,0,0.15)'
          }}>
            <h3 style={{ fontSize: '18px', fontWeight: '800', color: '#0F172A', margin: '0 0 4px 0' }}>
              Broadcast Farm-Out RFP to Regional Affiliates
            </h3>
            <p style={{ fontSize: '12px', color: '#64748B', margin: '0 0 20px 0' }}>
              Dispatches real-time reverse auction request to all vetted sovereign carriers in the target corridor.
            </p>

            <form onSubmit={handleDispatchNewRfp} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ fontSize: '11px', fontWeight: '700', color: '#475569', display: 'block', marginBottom: '4px' }}>Target Regional Market</label>
                <select
                  value={dispatchForm.target_city}
                  onChange={e => setDispatchForm({ ...dispatchForm, target_city: e.target.value })}
                  style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '13px' }}
                >
                  <option value="Philadelphia">Philadelphia Hub Cluster</option>
                  <option value="New York">New York / Tri-State Cluster</option>
                  <option value="London">London Sovereign Network</option>
                  <option value="Dubai">Dubai Luxury Fleet Network</option>
                </select>
              </div>

              <div>
                <label style={{ fontSize: '11px', fontWeight: '700', color: '#475569', display: 'block', marginBottom: '4px' }}>Pickup Address / Airport Terminal</label>
                <input
                  type="text"
                  value={dispatchForm.pickup_address}
                  onChange={e => setDispatchForm({ ...dispatchForm, pickup_address: e.target.value })}
                  style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '13px' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '11px', fontWeight: '700', color: '#475569', display: 'block', marginBottom: '4px' }}>Drop-off Address</label>
                <input
                  type="text"
                  value={dispatchForm.dropoff_address}
                  onChange={e => setDispatchForm({ ...dispatchForm, dropoff_address: e.target.value })}
                  style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '13px' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={{ fontSize: '11px', fontWeight: '700', color: '#475569', display: 'block', marginBottom: '4px' }}>Vehicle Class</label>
                  <select
                    value={dispatchForm.vehicle_class}
                    onChange={e => setDispatchForm({ ...dispatchForm, vehicle_class: e.target.value })}
                    style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '13px' }}
                  >
                    <option value="BUSINESS_CLASS">Business Class Sedan</option>
                    <option value="FIRST_CLASS">First Class Sedan</option>
                    <option value="BUSINESS_VAN">Business Executive Van</option>
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: '11px', fontWeight: '700', color: '#475569', display: 'block', marginBottom: '4px' }}>Benchmark Payout ($ USD)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={dispatchForm.benchmark_payout_usd}
                    onChange={e => setDispatchForm({ ...dispatchForm, benchmark_payout_usd: parseFloat(e.target.value) || 0 })}
                    style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '13px' }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                <button
                  type="button"
                  onClick={() => setShowDispatchModal(false)}
                  style={{
                    flex: 1,
                    background: '#F1F5F9',
                    border: '1px solid #CBD5E1',
                    borderRadius: '8px',
                    padding: '10px',
                    fontSize: '13px',
                    fontWeight: '700',
                    cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={dispatching}
                  style={{
                    flex: 1,
                    background: '#0078D4',
                    border: 'none',
                    borderRadius: '8px',
                    padding: '10px',
                    fontSize: '13px',
                    fontWeight: '700',
                    color: '#FFFFFF',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px'
                  }}
                >
                  <Send size={14} />
                  {dispatching ? 'Broadcasting...' : 'Broadcast RFP'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
