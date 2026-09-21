import React, { useState } from 'react';
import { 
  Navigation, Plane, User, Phone, Car, Clock, ShieldCheck, 
  AlertTriangle, Radio, Settings, FileText, Mail, RotateCcw, 
  DollarSign, CheckCircle2, Shield, Sparkles, MapPin, Eye
} from 'lucide-react';

interface VendorDispatchRadarProps {
  session: any;
  onLogout: () => void;
}

export const VendorDispatchRadar: React.FC<VendorDispatchRadarProps> = ({ session, onLogout }) => {
  const [activeTab, setActiveTab] = useState<'RADAR' | 'DRIVERS' | 'TARIFFS' | 'POLICIES' | 'COMMUNICATIONS'>('RADAR');

  // Business Rules: Cancellation Policy State
  const [freeCancelHours, setFreeCancelHours] = useState(12);
  const [latePenaltyPct, setLatePenaltyPct] = useState(50);
  const [airportWaitMins, setAirportWaitMins] = useState(60);
  const [fboWaitMins, setFboWaitMins] = useState(45);
  const [customTermsNotice, setCustomTermsNotice] = useState("ANB Limo provides 60 minutes complimentary waiting on all commercial flights from touchdown.");
  const [policySaved, setPolicySaved] = useState(false);

  // Business Rules: Driver Payroll State
  const [driverPayoutPct, setDriverPayoutPct] = useState(70);
  const [gratuityPassThrough, setGratuityPassThrough] = useState(100);
  const [payrollSaved, setPayrollSaved] = useState(false);

  // Active Trips State
  const [trips, setTrips] = useState<any[]>([]);

  const [activeActionModal, setActiveActionModal] = useState<any | null>(null);
  const [refundResult, setRefundResult] = useState<any | null>(null);

  const handleCancelTripAction = (trip: any) => {
    let penalty = 0.0;
    let refund = trip.fare_usd;
    let tier = "FREE_CANCELLATION";

    if (trip.hours_until_pickup >= freeCancelHours) {
      tier = "FREE_CANCELLATION";
      penalty = 0.0;
      refund = trip.fare_usd;
    } else if (trip.hours_until_pickup >= 6) {
      tier = "LATE_CANCELLATION_PARTIAL";
      penalty = trip.fare_usd * (latePenaltyPct / 100);
      refund = trip.fare_usd - penalty;
    } else {
      tier = "NO_REFUND_FORFEITURE";
      penalty = trip.fare_usd;
      refund = 0.0;
    }

    setRefundResult({
      trip_id: trip.trip_id,
      passenger_name: trip.passenger_name,
      original_fare: trip.fare_usd,
      tier,
      penalty,
      refund,
      credit_memo_id: `CM-${Math.floor(100000 + Math.random() * 900000)}`
    });

    setTrips(prev => prev.map(t => t.trip_id === trip.trip_id ? { ...t, status: 'CANCELLED_REFUNDED' } : t));
  };

  return (
    <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '16px 24px', color: '#0F172A' }}>
      
      {/* Top Header Card */}
      <div style={{
        background: '#FFFFFF',
        padding: '20px 28px',
        borderRadius: '16px',
        border: '1px solid #E2E8F0',
        marginBottom: '20px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '12px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#10B981', boxShadow: '0 0 10px #10B981' }} />
          <div>
            <div style={{ fontSize: '11px', color: '#64748B', fontWeight: 800, letterSpacing: '0.08em' }}>PRIMARY FLEET OPERATIONS DESK (PORT 8001)</div>
            <div style={{ fontSize: '18px', fontWeight: 900, color: '#0F172A' }}>
              ANB Limo Philadelphia · {session.full_name} ({session.role?.replace('ROLE_', '')})
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <span style={{ fontSize: '11px', background: '#FEF3C7', color: '#B45309', padding: '4px 12px', borderRadius: '8px', fontWeight: 800, border: '1px solid #FDE68A' }}>
            👑 Sovereign Tier Active
          </span>
          <button
            onClick={onLogout}
            style={{ padding: '6px 14px', borderRadius: '6px', border: '1px solid #CBD5E1', background: '#F8FAFC', fontSize: '12px', fontWeight: 700, cursor: 'pointer' }}
          >
            Sign Out
          </button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div style={{ display: 'flex', gap: '6px', marginBottom: '20px', background: '#F1F5F9', padding: '4px', borderRadius: '12px', border: '1px solid #E2E8F0', flexWrap: 'wrap' }}>
        <button
          onClick={() => setActiveTab('RADAR')}
          style={{
            padding: '10px 18px',
            borderRadius: '8px',
            fontSize: '13px',
            fontWeight: 800,
            border: 'none',
            background: activeTab === 'RADAR' ? '#FFFFFF' : 'transparent',
            color: activeTab === 'RADAR' ? '#2563EB' : '#64748B',
            boxShadow: activeTab === 'RADAR' ? '0 2px 6px rgba(0,0,0,0.08)' : 'none',
            cursor: 'pointer'
          }}
        >
          📡 Live Dispatch Radar ({trips.length})
        </button>

        <button
          onClick={() => setActiveTab('POLICIES')}
          style={{
            padding: '10px 18px',
            borderRadius: '8px',
            fontSize: '13px',
            fontWeight: 800,
            border: 'none',
            background: activeTab === 'POLICIES' ? '#FFFFFF' : 'transparent',
            color: activeTab === 'POLICIES' ? '#DC2626' : '#64748B',
            boxShadow: activeTab === 'POLICIES' ? '0 2px 6px rgba(0,0,0,0.08)' : 'none',
            cursor: 'pointer'
          }}
        >
          ⚖️ Cancellation & Refund Rules
        </button>

        <button
          onClick={() => setActiveTab('DRIVERS')}
          style={{
            padding: '10px 18px',
            borderRadius: '8px',
            fontSize: '13px',
            fontWeight: 800,
            border: 'none',
            background: activeTab === 'DRIVERS' ? '#FFFFFF' : 'transparent',
            color: activeTab === 'DRIVERS' ? '#16A34A' : '#64748B',
            boxShadow: activeTab === 'DRIVERS' ? '0 2px 6px rgba(0,0,0,0.08)' : 'none',
            cursor: 'pointer'
          }}
        >
          🚘 Chauffeur Roster & Payroll
        </button>

        <button
          onClick={() => setActiveTab('TARIFFS')}
          style={{
            padding: '10px 18px',
            borderRadius: '8px',
            fontSize: '13px',
            fontWeight: 800,
            border: 'none',
            background: activeTab === 'TARIFFS' ? '#FFFFFF' : 'transparent',
            color: activeTab === 'TARIFFS' ? '#D97706' : '#64748B',
            boxShadow: activeTab === 'TARIFFS' ? '0 2px 6px rgba(0,0,0,0.08)' : 'none',
            cursor: 'pointer'
          }}
        >
          💰 Tariff Matrix & Location Taxes
        </button>

        <button
          onClick={() => setActiveTab('COMMUNICATIONS')}
          style={{
            padding: '10px 18px',
            borderRadius: '8px',
            fontSize: '13px',
            fontWeight: 800,
            border: 'none',
            background: activeTab === 'COMMUNICATIONS' ? '#FFFFFF' : 'transparent',
            color: activeTab === 'COMMUNICATIONS' ? '#7C3AED' : '#64748B',
            boxShadow: activeTab === 'COMMUNICATIONS' ? '0 2px 6px rgba(0,0,0,0.08)' : 'none',
            cursor: 'pointer'
          }}
        >
          ✉️ Outbound Emails & PDF Invoices
        </button>
      </div>

      {/* --- TAB 1: LIVE DISPATCH RADAR --- */}
      {activeTab === 'RADAR' && (
        <div style={{ display: 'grid', gap: '16px' }}>
          
          {/* Refund Notice Banner if just processed */}
          {refundResult && (
            <div style={{ background: '#ECFDF5', border: '1px solid #A7F3D0', padding: '16px 20px', borderRadius: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <strong style={{ color: '#065F46', fontSize: '14px' }}>✓ Cancellation & Refund Successfully Settled</strong>
                <div style={{ color: '#047857', fontSize: '12px', marginTop: '2px' }}>
                  Credit Memo #{refundResult.credit_memo_id} · ${refundResult.refund.toFixed(2)} refunded to {refundResult.passenger_name} via Stripe Connect ({refundResult.tier}).
                </div>
              </div>
              <button 
                onClick={() => setRefundResult(null)}
                style={{ background: '#059669', color: '#FFFFFF', border: 'none', padding: '6px 12px', borderRadius: '6px', fontSize: '11px', fontWeight: 700, cursor: 'pointer' }}
              >
                Dismiss
              </button>
            </div>
          )}

          {trips.map(trip => (
            <div key={trip.trip_id} style={{ background: '#FFFFFF', padding: '24px', borderRadius: '16px', border: '1px solid #E2E8F0', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px', marginBottom: '16px' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ fontSize: '13px', fontWeight: 900, color: '#0F172A', fontFamily: 'monospace' }}>{trip.trip_id}</span>
                    <span style={{ 
                      fontSize: '11px', 
                      fontWeight: 800, 
                      padding: '3px 8px', 
                      borderRadius: '6px',
                      background: trip.status === 'CANCELLED_REFUNDED' ? '#FEE2E2' : trip.status === 'PASSENGER_ONBOARD' ? '#DCFCE7' : '#EFF6FF',
                      color: trip.status === 'CANCELLED_REFUNDED' ? '#DC2626' : trip.status === 'PASSENGER_ONBOARD' ? '#16A34A' : '#1D4ED8'
                    }}>
                      {trip.status}
                    </span>
                  </div>
                  <h3 style={{ fontSize: '18px', fontWeight: 900, color: '#0F172A', margin: '6px 0 2px 0' }}>{trip.passenger_name}</h3>
                  <div style={{ fontSize: '12px', color: '#64748B' }}>{trip.phone} · Total Paid: <strong style={{ color: '#0F172A' }}>${trip.fare_usd.toFixed(2)}</strong></div>
                </div>

                {/* Operations Actions */}
                <div style={{ display: 'flex', gap: '8px' }}>
                  {trip.status !== 'CANCELLED_REFUNDED' && (
                    <button
                      onClick={() => handleCancelTripAction(trip)}
                      style={{ background: '#FEE2E2', color: '#DC2626', border: '1px solid #FECACA', padding: '8px 14px', borderRadius: '8px', fontSize: '12px', fontWeight: 700, cursor: 'pointer' }}
                    >
                      Cancel & Refund Trip
                    </button>
                  )}
                  <button
                    onClick={() => setActiveTab('COMMUNICATIONS')}
                    style={{ background: '#F8FAFC', color: '#0F172A', border: '1px solid #CBD5E1', padding: '8px 14px', borderRadius: '8px', fontSize: '12px', fontWeight: 700, cursor: 'pointer' }}
                  >
                    View Outgoing Confirmation
                  </button>
                </div>
              </div>

              {/* Route & Flight Details */}
              <div style={{ background: '#F8FAFC', padding: '16px', borderRadius: '12px', border: '1px solid #E2E8F0', display: 'grid', gridTemplateColumns: '1.2fr 1.2fr 1fr', gap: '16px', fontSize: '12px' }}>
                <div>
                  <div style={{ color: '#64748B', fontSize: '10px', fontWeight: 700 }}>PICKUP</div>
                  <div style={{ fontWeight: 700, color: '#0F172A', marginTop: '2px' }}>{trip.pickup}</div>
                </div>
                <div>
                  <div style={{ color: '#64748B', fontSize: '10px', fontWeight: 700 }}>DESTINATION</div>
                  <div style={{ fontWeight: 700, color: '#0F172A', marginTop: '2px' }}>{trip.dropoff}</div>
                  <div style={{ color: '#D97706', fontWeight: 700, marginTop: '2px' }}>✈ {trip.flight}</div>
                </div>
                <div>
                  <div style={{ color: '#64748B', fontSize: '10px', fontWeight: 700 }}>ASSIGNED CHAUFFEUR</div>
                  <div style={{ fontWeight: 800, color: '#0F172A', marginTop: '2px' }}>{trip.driver_name}</div>
                  <div style={{ color: '#64748B', fontSize: '11px' }}>{trip.vehicle}</div>
                </div>
              </div>
            </div>
          ))}

        </div>
      )}

      {/* --- TAB 2: VENDOR CANCELLATION & REFUND POLICY RULES (ENTERPRISE OPERATIONS VIEW) --- */}
      {activeTab === 'POLICIES' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '24px' }}>
          
          {/* Left Column: Policy Configuration Form */}
          <div style={{ background: '#FFFFFF', padding: '28px', borderRadius: '16px', border: '1px solid #E2E8F0', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
            <div style={{ borderBottom: '1px solid #E2E8F0', paddingBottom: '14px', marginBottom: '20px' }}>
              <span style={{ fontSize: '11px', fontWeight: 800, color: '#DC2626', letterSpacing: '0.08em' }}>SOVEREIGN BUSINESS RULES CONFIGURATION</span>
              <h2 style={{ fontSize: '20px', fontWeight: 900, color: '#0F172A', margin: '4px 0' }}>
                Cancellation & Refund Parameters
              </h2>
              <p style={{ fontSize: '12px', color: '#64748B', margin: 0 }}>
                Define your company's operational rules for free cancellation windows, late penalties, and airport wait times.
              </p>
            </div>

            <div style={{ display: 'grid', gap: '18px' }}>
              <div>
                <label style={{ fontSize: '12px', fontWeight: 800, color: '#0F172A', display: 'block', marginBottom: '6px' }}>
                  FREE CANCELLATION DEADLINE WINDOW
                </label>
                <select
                  value={freeCancelHours}
                  onChange={(e) => setFreeCancelHours(Number(e.target.value))}
                  style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '13px', background: '#F8FAFC', color: '#0F172A', fontWeight: 600 }}
                >
                  <option value={6}>6 Hours Prior to Pickup (Sedans / Rapid Turnaround)</option>
                  <option value={12}>12 Hours Prior to Pickup (Executive SUVs / Standard Fleet)</option>
                  <option value={24}>24 Hours Prior to Pickup (First Class Mercedes S-Class)</option>
                  <option value={48}>48 Hours Prior to Pickup (Executive Sprinters & Vans)</option>
                </select>
              </div>

              <div>
                <label style={{ fontSize: '12px', fontWeight: 800, color: '#0F172A', display: 'block', marginBottom: '6px' }}>
                  LATE CANCELLATION PENALTY (% RETAINED)
                </label>
                <select
                  value={latePenaltyPct}
                  onChange={(e) => setLatePenaltyPct(Number(e.target.value))}
                  style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '13px', background: '#F8FAFC', color: '#0F172A', fontWeight: 600 }}
                >
                  <option value={30}>30% Vehicle Staging Fee (70% Refunded to Card)</option>
                  <option value={50}>50% Late Cancellation Penalty (50% Refunded to Card)</option>
                  <option value={100}>100% Full Fare Forfeiture (0% Refund)</option>
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 800, color: '#0F172A', display: 'block', marginBottom: '6px' }}>
                    AIRPORT WAITING (MINS)
                  </label>
                  <input
                    type="number"
                    value={airportWaitMins}
                    onChange={(e) => setAirportWaitMins(Number(e.target.value))}
                    style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '13px', background: '#F8FAFC', color: '#0F172A', fontWeight: 600 }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 800, color: '#0F172A', display: 'block', marginBottom: '6px' }}>
                    FBO TARMAC WAITING (MINS)
                  </label>
                  <input
                    type="number"
                    value={fboWaitMins}
                    onChange={(e) => setFboWaitMins(Number(e.target.value))}
                    style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '13px', background: '#F8FAFC', color: '#0F172A', fontWeight: 600 }}
                  />
                </div>
              </div>

              <div>
                <label style={{ fontSize: '12px', fontWeight: 800, color: '#0F172A', display: 'block', marginBottom: '6px' }}>
                  CUSTOM LEGAL DISCLOSURE & TERMS TEXT
                </label>
                <textarea
                  rows={3}
                  value={customTermsNotice}
                  onChange={(e) => setCustomTermsNotice(e.target.value)}
                  style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '13px', background: '#F8FAFC', color: '#0F172A' }}
                />
              </div>

              <button
                onClick={() => {
                  setPolicySaved(true);
                  setTimeout(() => setPolicySaved(false), 3000);
                }}
                style={{
                  background: '#DC2626',
                  color: '#FFFFFF',
                  padding: '12px 24px',
                  borderRadius: '8px',
                  border: 'none',
                  fontWeight: 800,
                  fontSize: '14px',
                  cursor: 'pointer',
                  boxShadow: '0 2px 6px rgba(220,38,38,0.2)'
                }}
              >
                Save & Enforce Policy Across All Booking Channels
              </button>

              {policySaved && (
                <div style={{ background: '#DCFCE7', color: '#16A34A', padding: '10px', borderRadius: '8px', textAlign: 'center', fontSize: '12px', fontWeight: 800 }}>
                  ✓ Policy rules successfully saved and active across all dispatch radars and quotes.
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Live Policy Matrix & Customer Disclosure Preview */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            
            {/* Active Policy Rules Matrix */}
            <div style={{ background: '#FFFFFF', padding: '24px', borderRadius: '16px', border: '1px solid #E2E8F0', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                <h3 style={{ fontSize: '15px', fontWeight: 800, color: '#0F172A', margin: 0 }}>
                  📊 Active Cancellation Tier Matrix
                </h3>
                <span style={{ fontSize: '10px', background: '#DCFCE7', color: '#16A34A', padding: '2px 8px', borderRadius: '4px', fontWeight: 800, border: '1px solid #BBF7D0' }}>
                  LIVE ENFORCEMENT
                </span>
              </div>

              <div style={{ display: 'grid', gap: '8px', fontSize: '12px' }}>
                <div style={{ background: '#F8FAFC', padding: '10px 14px', borderRadius: '8px', border: '1px solid #E2E8F0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontWeight: 800, color: '#16A34A' }}>Tier 1: Free Cancellation</div>
                    <div style={{ color: '#64748B', fontSize: '11px' }}>Greater than {freeCancelHours} hours before pickup</div>
                  </div>
                  <strong style={{ color: '#16A34A', fontSize: '13px' }}>100% Refund ($0 Fee)</strong>
                </div>

                <div style={{ background: '#F8FAFC', padding: '10px 14px', borderRadius: '8px', border: '1px solid #E2E8F0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontWeight: 800, color: '#D97706' }}>Tier 2: Late Cancellation</div>
                    <div style={{ color: '#64748B', fontSize: '11px' }}>Between 6 and {freeCancelHours} hours before pickup</div>
                  </div>
                  <strong style={{ color: '#D97706', fontSize: '13px' }}>{100 - latePenaltyPct}% Refund ({latePenaltyPct}% Fee)</strong>
                </div>

                <div style={{ background: '#F8FAFC', padding: '10px 14px', borderRadius: '8px', border: '1px solid #E2E8F0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontWeight: 800, color: '#DC2626' }}>Tier 3: Immediate Forfeiture</div>
                    <div style={{ color: '#64748B', fontSize: '11px' }}>Under 6 hours / Chauffeur En Route</div>
                  </div>
                  <strong style={{ color: '#DC2626', fontSize: '13px' }}>0% Refund (100% Penalty)</strong>
                </div>

                <div style={{ background: '#EFF6FF', padding: '10px 14px', borderRadius: '8px', border: '1px solid #BFDBFE', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontWeight: 800, color: '#2563EB' }}>✈ Flight Delay / Cancellation Shield</div>
                    <div style={{ color: '#1E40AF', fontSize: '11px' }}>Airline cancelled or delayed</div>
                  </div>
                  <strong style={{ color: '#2563EB', fontSize: '13px' }}>100% Free Re-Stage / Refund</strong>
                </div>
              </div>
            </div>

            {/* Customer Disclosure Preview */}
            <div style={{ background: '#FFFFFF', padding: '24px', borderRadius: '16px', border: '1px solid #E2E8F0', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
              <div style={{ fontSize: '11px', fontWeight: 800, color: '#64748B', marginBottom: '8px' }}>
                📄 CUSTOMER CONFIRMATION DISCLOSURE PREVIEW
              </div>
              <div style={{ background: '#F8FAFC', border: '1px solid #CBD5E1', borderRadius: '10px', padding: '14px', fontSize: '11px', color: '#334155', lineHeight: 1.6 }}>
                <div style={{ fontWeight: 800, color: '#0F172A', marginBottom: '4px' }}>ANB Limo Cancellation Policy & Leg Terms:</div>
                <div>• Free cancellation deadline: <strong>Up to {freeCancelHours}h before pickup</strong></div>
                <div>• Late cancellation penalty: <strong>{latePenaltyPct}% vehicle hold fee</strong></div>
                <div>• Airport waiting allowance: <strong>{airportWaitMins} min complimentary from wheels-down</strong></div>
                <div>• Notice: <em>{customTermsNotice}</em></div>
              </div>
            </div>

          </div>

        </div>
      )}

      {/* --- TAB 3: CHAUFFEUR ROSTER & PAYROLL --- */}
      {activeTab === 'DRIVERS' && (
        <div style={{ background: '#FFFFFF', padding: '32px', borderRadius: '16px', border: '1px solid #E2E8F0', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
          <h2 style={{ fontSize: '20px', fontWeight: 900, color: '#0F172A', marginBottom: '8px' }}>
            🚘 Chauffeur Commission & Instant Stripe Payout Controls
          </h2>
          <p style={{ fontSize: '13px', color: '#64748B', marginBottom: '24px' }}>
            Adjust how much your chauffeurs earn on each trip directly in-app without logging into external payment dashboards.
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', maxWidth: '700px' }}>
            <div>
              <label style={{ fontSize: '12px', fontWeight: 800, color: '#0F172A', display: 'block', marginBottom: '6px' }}>
                DEFAULT CHAUFFEUR SPLIT (%)
              </label>
              <input
                type="number"
                value={driverPayoutPct}
                onChange={(e) => setDriverPayoutPct(Number(e.target.value))}
                style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '13px', background: '#F8FAFC' }}
              />
            </div>
            <div>
              <label style={{ fontSize: '12px', fontWeight: 800, color: '#0F172A', display: 'block', marginBottom: '6px' }}>
                GRATUITY PASS-THROUGH (%)
              </label>
              <input
                type="number"
                value={gratuityPassThrough}
                onChange={(e) => setGratuityPassThrough(Number(e.target.value))}
                style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '13px', background: '#F8FAFC' }}
              />
            </div>
          </div>

          <button
            onClick={() => {
              setPayrollSaved(true);
              setTimeout(() => setPayrollSaved(false), 3000);
            }}
            style={{ marginTop: '20px', background: '#16A34A', color: '#FFFFFF', padding: '10px 20px', borderRadius: '8px', border: 'none', fontWeight: 800, fontSize: '13px', cursor: 'pointer' }}
          >
            Update Driver Commission Splits
          </button>

          {payrollSaved && (
            <div style={{ marginTop: '12px', background: '#DCFCE7', color: '#16A34A', padding: '8px', borderRadius: '8px', fontSize: '12px', fontWeight: 800 }}>
              ✓ Driver payout split updated to {driverPayoutPct}% with {gratuityPassThrough}% tip pass-through.
            </div>
          )}
        </div>
      )}

      {/* --- TAB 4: TARIFF MATRIX & LOCATION TAXES --- */}
      {activeTab === 'TARIFFS' && (
        <div style={{ background: '#FFFFFF', padding: '32px', borderRadius: '16px', border: '1px solid #E2E8F0', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
          <h2 style={{ fontSize: '20px', fontWeight: 900, color: '#0F172A', marginBottom: '8px' }}>
            💰 Sovereign Tariff Matrix & Jurisdictional Taxes
          </h2>
          <p style={{ fontSize: '13px', color: '#64748B', marginBottom: '24px' }}>
            Deterministic location taxes and airport concession surcharges automatically applied to every quote.
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '16px' }}>
            <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '12px', padding: '18px' }}>
              <div style={{ fontWeight: 800, color: '#0F172A', fontSize: '14px', marginBottom: '4px' }}>📍 Philadelphia (PHL / PA)</div>
              <div style={{ fontSize: '12px', color: '#64748B' }}>PA Sales Tax: <strong>8.0%</strong></div>
              <div style={{ fontSize: '12px', color: '#64748B' }}>PHL Airport Curbside Concession: <strong>$3.50</strong></div>
              <div style={{ fontSize: '12px', color: '#64748B' }}>PPA Regulatory Assessment: <strong>$1.50</strong></div>
            </div>

            <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '12px', padding: '18px' }}>
              <div style={{ fontWeight: 800, color: '#0F172A', fontSize: '14px', marginBottom: '4px' }}>📍 New York City (JFK / LGA / Manhattan)</div>
              <div style={{ fontSize: '12px', color: '#64748B' }}>NY Combined Tax: <strong>8.875%</strong></div>
              <div style={{ fontSize: '12px', color: '#64748B' }}>NY Black Car Fund (Workers Comp): <strong>3.0%</strong></div>
              <div style={{ fontSize: '12px', color: '#64748B' }}>Manhattan Congestion Surcharge: <strong>$2.75</strong></div>
              <div style={{ fontSize: '12px', color: '#64748B' }}>Port Authority Airport Access: <strong>$5.00</strong></div>
            </div>

            <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '12px', padding: '18px' }}>
              <div style={{ fontWeight: 800, color: '#0F172A', fontSize: '14px', marginBottom: '4px' }}>📍 London (LHR / TfL / UK)</div>
              <div style={{ fontSize: '12px', color: '#64748B' }}>UK Standard VAT: <strong>20.0%</strong></div>
              <div style={{ fontSize: '12px', color: '#64748B' }}>Heathrow Drop-Off Charge: <strong>£5.00</strong></div>
              <div style={{ fontSize: '12px', color: '#64748B' }}>TfL Central Congestion Charge: <strong>£15.00</strong></div>
            </div>
          </div>
        </div>
      )}

      {/* --- TAB 5: COMMUNICATIONS & INVOICES --- */}
      {activeTab === 'COMMUNICATIONS' && (
        <div style={{ background: '#FFFFFF', padding: '32px', borderRadius: '16px', border: '1px solid #E2E8F0', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '1px solid #E2E8F0', paddingBottom: '16px' }}>
            <div>
              <h2 style={{ fontSize: '20px', fontWeight: 900, color: '#0F172A', margin: '0 0 4px 0' }}>
                ✉️ Outbound Confirmation Email & PDF Tax Invoices
              </h2>
              <p style={{ fontSize: '13px', color: '#64748B', margin: 0 }}>
                Live rendering of customer-facing confirmation emails with vendor branding, location taxes, and per-leg cancellation terms.
              </p>
            </div>
          </div>

          {/* Email Preview Card */}
          <div style={{ border: '1px solid #CBD5E1', borderRadius: '14px', padding: '24px', background: '#F8FAFC', maxWidth: '650px', margin: '0 auto' }}>
            <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '12px', padding: '24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '2px solid #D97706', paddingBottom: '12px', marginBottom: '16px' }}>
                <div>
                  <div style={{ fontSize: '11px', fontWeight: 800, color: '#D97706' }}>ANB LIMO PHILADELPHIA</div>
                  <div style={{ fontSize: '18px', fontWeight: 900, color: '#0F172A' }}>Reservation Confirmed (#TRP-881)</div>
                </div>
                <div style={{ background: '#DCFCE7', color: '#16A34A', padding: '4px 10px', borderRadius: '6px', fontSize: '11px', fontWeight: 800, height: 'fit-content' }}>
                  ✓ CONFIRMED
                </div>
              </div>

              <div style={{ fontSize: '13px', color: '#334155', lineHeight: 1.6 }}>
                <div><strong>Passenger:</strong> Sir Arthur Davies (+1 215-555-9000)</div>
                <div><strong>Pickup:</strong> The Ritz-Carlton Philadelphia</div>
                <div><strong>Destination:</strong> PHL Airport Terminal A (Flight BA 178)</div>
              </div>

              <div style={{ borderTop: '1px solid #E2E8F0', marginTop: '14px', paddingTop: '12px' }}>
                <div style={{ fontSize: '12px', fontWeight: 800, color: '#0F172A', marginBottom: '6px' }}>Itemized Tariff & Taxes (PA & PHL):</div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#64748B' }}>
                  <span>Base + Mileage + Tolls:</span>
                  <span>$163.63</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#64748B' }}>
                  <span>PHL Airport Fee + PPA:</span>
                  <span>$5.00</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#64748B' }}>
                  <span>PA Sales Tax (8.0%):</span>
                  <span>$12.48</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#64748B' }}>
                  <span>20% Chauffeur Gratuity:</span>
                  <span>$35.10</span>
                </div>
                <div style={{ borderTop: '1px solid #0F172A', marginTop: '6px', paddingTop: '6px', display: 'flex', justifyContent: 'space-between', fontSize: '15px', fontWeight: 900, color: '#0F172A' }}>
                  <span>All-Inclusive Total Paid:</span>
                  <span>$216.21</span>
                </div>
              </div>

              {/* Legal Terms Disclosure */}
              <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '8px', padding: '12px', marginTop: '16px', fontSize: '11px', color: '#64748B' }}>
                <div style={{ fontWeight: 800, color: '#0F172A', marginBottom: '2px' }}>ANB Limo Cancellation Policy & Leg Terms:</div>
                <div>• Free cancellation deadline: <strong>Up to {freeCancelHours}h before pickup</strong></div>
                <div>• Late cancellation penalty: <strong>{latePenaltyPct}% of total fare</strong></div>
                <div>• Airport waiting allowance: <strong>{airportWaitMins} min complimentary from touchdown</strong></div>
                <div>• Flight Protection: <strong>Automated flight delay re-staging with zero penalty</strong></div>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
