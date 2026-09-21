import React, { useState, useEffect } from 'react';
import { 
  Smartphone, MapPin, Navigation, Clock, CheckCircle2, 
  AlertCircle, Phone, User, ShieldCheck, ArrowRight, Zap, RefreshCw, Plane, Train
} from 'lucide-react';
import { DriverOffer, Trip, TripStatus } from '../types';
import { fetchDriverOffers, acceptDriverOffer, updateTripStatus, fetchBookings } from '../api';

export const DriverApp: React.FC = () => {
  const [offers, setOffers] = useState<DriverOffer[]>([]);
  const [activeTrip, setActiveTrip] = useState<Trip | null>(null);
  const [activeBooking, setActiveBooking] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [waitTimer, setWaitTimer] = useState(0);

  // 5-Star VIP Protocol Prep Checklist States
  const [prepTemp, setPrepTemp] = useState(true);
  const [prepBeverage, setPrepBeverage] = useState(true);
  const [prepAudio, setPrepAudio] = useState(true);
  const [prepSeat, setPrepSeat] = useState(true);
  const [showIpadSign, setShowIpadSign] = useState(false);

  const loadDriverData = async () => {
    setLoading(true);
    try {
      const allOffers = await fetchDriverOffers();
      setOffers(allOffers);

      const allBookings = await fetchBookings();
      const current = allBookings.find(b => b.trip && b.trip.status !== 'COMPLETED' && b.trip.status !== 'CANCELLED');
      if (current && current.trip) {
        setActiveTrip(current.trip);
        setActiveBooking(current);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDriverData();
    const interval = setInterval(loadDriverData, 5000);
    return () => clearInterval(interval);
  }, []);

  // Waiting meter ticker if ARRIVED
  useEffect(() => {
    let t: any;
    if (activeTrip?.status === 'ARRIVED') {
      t = setInterval(() => setWaitTimer(prev => prev + 1), 1000);
    }
    return () => clearInterval(t);
  }, [activeTrip?.status]);

  const handleAcceptOffer = async (offerId: string) => {
    try {
      const trip = await acceptDriverOffer(offerId);
      setActiveTrip(trip);
      loadDriverData();
    } catch (err: any) {
      alert(err.message || 'Error accepting offer');
    }
  };

  const handleTransition = async (nextStatus: TripStatus) => {
    if (!activeTrip) return;
    try {
      const updated = await updateTripStatus(activeTrip.id, nextStatus, `Chauffeur updated status to ${nextStatus}`);
      setActiveTrip(updated);
      loadDriverData();
    } catch (err: any) {
      alert(err.message || 'Error updating status');
    }
  };

  return (
    <div style={{ maxWidth: '640px', margin: '0 auto', padding: '20px' }}>
      {/* Mobile Device Frame Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div>
          <div className="gold-badge" style={{ marginBottom: '4px' }}>
            <Smartphone size={12} /> TLC Chauffeur Companion App
          </div>
          <h2 style={{ fontSize: '22px', fontWeight: 800, color: 'var(--text-primary)' }}>
            Marcus Sterling
          </h2>
          <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
            2025 Cadillac Escalade ESV · TLC #589210 · ★ 4.99
          </div>
        </div>

        <button className="btn-secondary" onClick={loadDriverData} style={{ padding: '8px 12px', fontSize: '12px' }}>
          <RefreshCw size={12} className={loading ? 'pulse-live' : ''} /> Sync
        </button>
      </div>

      {/* 1. Pending Incoming Offers Card */}
      {offers.filter(o => o.status === 'PENDING').length > 0 && (
        <div style={{ marginBottom: '24px' }}>
          {offers.filter(o => o.status === 'PENDING').map(offer => (
            <div 
              key={offer.id} 
              className="glass-card" 
              style={{
                padding: '20px',
                border: '1px solid var(--border-gold)',
                background: '#FFFFFF',
                boxShadow: 'var(--shadow-gold-glow)',
                marginBottom: '16px'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <span className="gold-badge">⚡ New Autonomous Ride Offer</span>
                <span style={{ fontSize: '12px', color: '#B45309', fontWeight: 700 }}>
                  Expires in 175s
                </span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '12px' }}>
                <div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>NET CHAUFFEUR PAYOUT</div>
                  <div style={{ fontSize: '26px', fontWeight: 800, color: 'var(--accent-gold)' }}>
                    ${Number(offer.offered_payout_net || 0).toFixed(2)}
                  </div>
                </div>
                <div style={{ textAlign: 'right', fontSize: '12px', color: 'var(--text-primary)', fontWeight: 600 }}>
                  {offer.vehicle_details}
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginTop: '14px' }}>
                <button 
                  className="btn-gold" 
                  onClick={() => handleAcceptOffer(offer.id)}
                  style={{ width: '100%', padding: '12px', fontWeight: 800 }}
                >
                  <CheckCircle2 size={16} /> Accept Mission
                </button>
                <button 
                  className="btn-secondary"
                  style={{ width: '100%', padding: '12px' }}
                >
                  Decline
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 2. Active Trip Workflow Interface */}
      {activeTrip && activeTrip.status !== 'COMPLETED' ? (
        <div className="glass-card" style={{ padding: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <span className="blue-badge">
              <Navigation size={12} /> Live Step: {activeTrip.status.replace('_', ' ')}
            </span>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
              Trip #{activeTrip.id.slice(0, 10)}
            </span>
          </div>

          {/* Passenger & Transit Details */}
          {activeBooking && (
            <div style={{ background: '#F8FAFC', border: '1px solid var(--border-subtle)', borderRadius: '12px', padding: '16px', marginBottom: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <User size={18} color="#2563EB" />
                  <div>
                    <span style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '15px' }}>
                      {activeBooking.party.passenger_name}
                    </span>
                    <span style={{ marginLeft: '8px', fontSize: '10px', background: 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)', color: '#FFFFFF', padding: '2px 8px', borderRadius: '10px', fontWeight: 800 }}>
                      ⭐ VIP PLATINUM
                    </span>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    onClick={() => setShowIpadSign(true)}
                    style={{
                      background: 'linear-gradient(135deg, #1E293B 0%, #0F172A 100%)',
                      border: '1px solid #334155',
                      color: '#F8FAFC',
                      padding: '6px 12px',
                      borderRadius: '8px',
                      fontSize: '12px',
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}
                  >
                    📲 iPad Sign
                  </button>
                  <a 
                    href={`tel:${activeBooking.party.passenger_phone}`}
                    style={{
                      background: 'rgba(37,99,235,0.08)',
                      border: '1px solid #2563EB',
                      color: '#1D4ED8',
                      padding: '6px 12px',
                      borderRadius: '8px',
                      fontSize: '12px',
                      fontWeight: 700,
                      textDecoration: 'none',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}
                  >
                    <Phone size={12} /> Call Guest
                  </a>
                </div>
              </div>

              {activeBooking.flight_number && (
                <div style={{ fontSize: '12px', color: '#1D4ED8', background: 'rgba(37,99,235,0.08)', padding: '6px 10px', borderRadius: '6px', marginBottom: '8px', fontWeight: 600 }}>
                  ✈️ Flight Radar: {activeBooking.flight_number} {activeTrip.flight_delay_minutes > 0 ? `(+${activeTrip.flight_delay_minutes}m delay)` : '(On Time · Staging VIP Ramp)'}
                </div>
              )}

              {activeBooking.train_number && (
                <div style={{ fontSize: '12px', color: '#1D4ED8', background: 'rgba(37,99,235,0.08)', padding: '6px 10px', borderRadius: '6px', marginBottom: '8px', fontWeight: 600 }}>
                  🚆 Amtrak Live: {activeBooking.train_number} (Track Staging Synced)
                </div>
              )}

              <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '6px' }}>
                <strong>Pickup:</strong> {activeTrip.pickup_address}
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                <strong>Destination:</strong> {activeTrip.dropoff_address || 'As Directed (Hourly)'}
              </div>

              {/* 5-STAR VIP SERVICE PROTOCOL BRIEFING & PREP CHECKLIST */}
              <div style={{ marginTop: '16px', borderTop: '1px solid #E2E8F0', paddingTop: '14px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                  <div style={{ fontSize: '12px', fontWeight: 800, color: '#0F172A', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <ShieldCheck size={14} color="#D97706" /> 5-STAR VIP CHAUFFEUR PROTOCOL
                  </div>
                  <span style={{ fontSize: '11px', color: '#16A34A', fontWeight: 700, background: '#DCFCE7', padding: '2px 8px', borderRadius: '6px' }}>
                    Mandatory Prep
                  </span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '12px' }}>
                  <div 
                    onClick={() => setPrepTemp(!prepTemp)}
                    style={{
                      background: prepTemp ? '#ECFDF5' : '#FFFFFF',
                      border: prepTemp ? '1px solid #10B981' : '1px solid #CBD5E1',
                      borderRadius: '8px',
                      padding: '10px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      fontSize: '11px',
                      fontWeight: 600,
                      color: prepTemp ? '#047857' : '#334155'
                    }}
                  >
                    <CheckCircle2 size={16} color={prepTemp ? '#10B981' : '#94A3B8'} />
                    <div>
                      <div>🌡️ Cabin Temp</div>
                      <div style={{ fontWeight: 800 }}>Set to 68°F</div>
                    </div>
                  </div>

                  <div 
                    onClick={() => setPrepBeverage(!prepBeverage)}
                    style={{
                      background: prepBeverage ? '#ECFDF5' : '#FFFFFF',
                      border: prepBeverage ? '1px solid #10B981' : '1px solid #CBD5E1',
                      borderRadius: '8px',
                      padding: '10px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      fontSize: '11px',
                      fontWeight: 600,
                      color: prepBeverage ? '#047857' : '#334155'
                    }}
                  >
                    <CheckCircle2 size={16} color={prepBeverage ? '#10B981' : '#94A3B8'} />
                    <div>
                      <div>💧 Beverage Bar</div>
                      <div style={{ fontWeight: 800 }}>Chilled San Pellegrino</div>
                    </div>
                  </div>

                  <div 
                    onClick={() => setPrepAudio(!prepAudio)}
                    style={{
                      background: prepAudio ? '#ECFDF5' : '#FFFFFF',
                      border: prepAudio ? '1px solid #10B981' : '1px solid #CBD5E1',
                      borderRadius: '8px',
                      padding: '10px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      fontSize: '11px',
                      fontWeight: 600,
                      color: prepAudio ? '#047857' : '#334155'
                    }}
                  >
                    <CheckCircle2 size={16} color={prepAudio ? '#10B981' : '#94A3B8'} />
                    <div>
                      <div>🎵 Acoustic Preset</div>
                      <div style={{ fontWeight: 800 }}>Quiet Ride / DND</div>
                    </div>
                  </div>

                  <div 
                    onClick={() => setPrepSeat(!prepSeat)}
                    style={{
                      background: prepSeat ? '#ECFDF5' : '#FFFFFF',
                      border: prepSeat ? '1px solid #10B981' : '1px solid #CBD5E1',
                      borderRadius: '8px',
                      padding: '10px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      fontSize: '11px',
                      fontWeight: 600,
                      color: prepSeat ? '#047857' : '#334155'
                    }}
                  >
                    <CheckCircle2 size={16} color={prepSeat ? '#10B981' : '#94A3B8'} />
                    <div>
                      <div>💺 Front Seat Forward</div>
                      <div style={{ fontWeight: 800 }}>Max Legroom Ready</div>
                    </div>
                  </div>
                </div>

                <div style={{ background: '#FFFBEB', border: '1px solid #FCD34D', borderRadius: '8px', padding: '10px', fontSize: '11px', color: '#92400E' }}>
                  <strong>Chauffeur Etiquette:</strong> Inside baggage claim meet & greet with iPad sign. Curbside luggage handling mandatory. Strict executive confidentiality.
                </div>
              </div>
            </div>
          )}

          {/* Waiting Time Counter if Arrived */}
          {activeTrip.status === 'ARRIVED' && (
            <div style={{
              background: 'rgba(16, 185, 129, 0.08)',
              border: '1px solid #10B981',
              borderRadius: '12px',
              padding: '16px',
              textAlign: 'center',
              marginBottom: '20px'
            }}>
              <div style={{ fontSize: '12px', color: '#047857', fontWeight: 700 }}>
                STAGING AT VIP ARRIVAL LANE · WAITING TIMER
              </div>
              <div style={{ fontSize: '34px', fontWeight: 800, color: 'var(--text-primary)', marginTop: '4px', fontFamily: 'monospace' }}>
                {Math.floor(waitTimer / 60).toString().padStart(2, '0')}:{(waitTimer % 60).toString().padStart(2, '0')}
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                45 minutes complimentary flight arrival allowance active
              </div>
            </div>
          )}

          {/* One-Click Step Transition Control */}
          <div>
            {activeTrip.status === 'SCHEDULED' || activeTrip.status === 'DRIVER_ACCEPTED' ? (
              <button 
                className="btn-primary" 
                onClick={() => handleTransition('EN_ROUTE')}
                style={{ width: '100%', padding: '16px', fontSize: '16px' }}
              >
                <Navigation size={18} /> Start Navigation / En Route to Pickup
              </button>
            ) : activeTrip.status === 'EN_ROUTE' ? (
              <button 
                className="btn-primary" 
                onClick={() => handleTransition('ARRIVED')}
                style={{ width: '100%', padding: '16px', fontSize: '16px', background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)' }}
              >
                <MapPin size={18} /> Arrived at Pickup Staging Lane
              </button>
            ) : activeTrip.status === 'ARRIVED' ? (
              <button 
                className="btn-gold" 
                onClick={() => handleTransition('PASSENGER_ONBOARD')}
                style={{ width: '100%', padding: '16px', fontSize: '16px' }}
              >
                <User size={18} /> Passenger Onboard · Depart for Destination
              </button>
            ) : activeTrip.status === 'PASSENGER_ONBOARD' || activeTrip.status === 'IN_PROGRESS' ? (
              <button 
                className="btn-primary" 
                onClick={() => handleTransition('COMPLETED')}
                style={{ width: '100%', padding: '16px', fontSize: '16px', background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)' }}
              >
                <CheckCircle2 size={18} /> Complete Trip & Drive Back to Depot
              </button>
            ) : null}
          </div>
        </div>
      ) : (
        <div className="glass-card" style={{ padding: '40px', textAlign: 'center' }}>
          <CheckCircle2 size={40} color="#10B981" style={{ margin: '0 auto 12px auto' }} />
          <h3 style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '6px' }}>
            Ready for Next Mission
          </h3>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
            Chauffeur status is active on duty at Manhattan Fleet Depot (550 W 54th St). New dispatch offers will alert you here.
          </p>
        </div>
      )}

      {/* FULLSCREEN DIGITAL IPAD GREETING SIGN MODAL */}
      {showIpadSign && activeBooking && (
        <div 
          onClick={() => setShowIpadSign(false)}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 99999,
            background: '#0B0F19',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            padding: '30px',
            cursor: 'pointer'
          }}
        >
          <div style={{ position: 'absolute', top: '24px', right: '24px', color: '#64748B', fontSize: '13px' }}>
            Tap anywhere to close ✕
          </div>

          <div style={{
            width: '100%',
            maxWidth: '850px',
            border: '2px solid #D97706',
            borderRadius: '24px',
            padding: '60px 40px',
            background: 'radial-gradient(circle at center, #1E293B 0%, #0F172A 100%)',
            textAlign: 'center',
            boxShadow: '0 0 60px rgba(217, 119, 6, 0.25)'
          }}>
            <div style={{ color: '#F59E0B', letterSpacing: '6px', fontSize: '16px', fontWeight: 800, marginBottom: '24px' }}>
              ✦ LIMO EXECUTIVE CHAUFFEUR NETWORK ✦
            </div>

            <div style={{ color: '#FFFFFF', fontSize: '48px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '2px', lineHeight: 1.1, marginBottom: '16px' }}>
              {activeBooking.party.passenger_name}
            </div>

            <div style={{ color: '#93C5FD', fontSize: '24px', fontWeight: 700, letterSpacing: '3px', textTransform: 'uppercase', marginBottom: '30px' }}>
              CITADEL SECURITIES · VIP PLATINUM
            </div>

            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '12px', background: 'rgba(255,255,255,0.08)', padding: '10px 24px', borderRadius: '30px', color: '#E2E8F0', fontSize: '14px' }}>
              <span>✈️ FLIGHT {activeBooking.flight_number || 'BA 178'}</span>
              <span>·</span>
              <span>PHL VIP TERMINAL</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
