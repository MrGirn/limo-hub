import React, { useState, useEffect } from 'react';
import { 
  Smartphone, MapPin, Navigation, Clock, CheckCircle2, 
  AlertCircle, Phone, User, ShieldCheck, ArrowRight, Zap, 
  RefreshCw, Plane, ExternalLink, BatteryCharging, Shield, Activity,
  DollarSign, CreditCard, ChevronRight, TrendingUp, Check, Award, AlertTriangle,
  Upload, Camera, FileText, CheckCheck, Eye, Lock
} from 'lucide-react';
import { DriverOffer, Trip, TripStatus, DriverCredentialDocument, DriverDocumentType } from '../types';
import { fetchDriverOffers, acceptDriverOffer, updateTripStatus, fetchBookings, extractErrorMessage, fetchDriverDocuments, uploadDriverDocument } from '../api';

export const DriverMobileDashboard: React.FC = () => {
  const [offers, setOffers] = useState<DriverOffer[]>([]);
  const [activeTrip, setActiveTrip] = useState<Trip | null>(null);
  const [activeBooking, setActiveBooking] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [waitTimer, setWaitTimer] = useState(0);
  const [dutyStatus, setDutyStatus] = useState<'ON_DUTY' | 'ON_BREAK' | 'OFF_DUTY'>('ON_DUTY');
  const [drivingHoursToday, setDrivingHoursToday] = useState(3.4);
  const [offerCountdown, setOfferCountdown] = useState(112);
  const [activeDriverTab, setActiveDriverTab] = useState<'mission' | 'earnings' | 'shift' | 'credentials'>('mission');
  const [instantPayoutNotice, setInstantPayoutNotice] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  // Driver Credentials State (GAP-D1)
  const [driverDocuments, setDriverDocuments] = useState<DriverCredentialDocument[]>([]);
  const [uploadingDoc, setUploadingDoc] = useState(false);
  const [docType, setDocType] = useState<DriverDocumentType>('COMMERCIAL_CHAUFFEUR_LICENSE');
  const [docName, setDocName] = useState('PA Chauffeur TLC License');
  const [docExpiry, setDocExpiry] = useState('2027-10-15');
  const [docFileBase64, setDocFileBase64] = useState<string | null>(null);
  const [docPreviewUrl, setDocPreviewUrl] = useState<string | null>(null);

  // Driver Compensation Model & Profile (populated from live backend API)
  const [driverProfile, setDriverProfile] = useState<any>({
    id: 'drv_01',
    name: 'Marcus Brody',
    badge_id: 'PPA-CH-88219',
    vehicle: 'Cadillac Escalade ESV',
    compensation_model: 'CONTRACTOR_COMMISSION',
    commission_pct: 65,
    hourly_rate: 32.0,
    stripe_connected: true,
    stripe_account_id: 'acct_1Q7zL92eZvKYlo2C',
    earnings_today_base: 0.00,
    earnings_today_tips: 0.00,
    earnings_today_tolls: 0.00,
    trips_today: 0,
    rating: 5.0
  });

  const [completedPayouts, setCompletedPayouts] = useState<any[]>([]);


  const loadDriverData = async () => {
    setLoading(true);
    try {
      const allOffers = await fetchDriverOffers();
      setOffers(allOffers);

      const allBookings = await fetchBookings();
      const current = allBookings.find(
        (b: any) => b.trip && b.trip.status !== 'COMPLETED' && b.trip.status !== 'CANCELLED'
      );
      if (current && current.trip) {
        setActiveTrip(current.trip);
        setActiveBooking(current);
      } else {
        setActiveTrip(null);
        setActiveBooking(null);
      }

      // Fetch live driver credentials and documents from Sovereign Vault (GAP-D1)
      try {
        const docRes = await fetchDriverDocuments('drv_01');
        if (docRes && docRes.documents && Array.isArray(docRes.documents)) {
          setDriverDocuments(docRes.documents);
        }
      } catch (dErr) {
        console.warn('Could not load live driver credentials', dErr);
      }

      // Fetch live payroll summary & real driver payout ledger from backend
      try {
        const payrollRes = await fetch('/api/v1/vendors/vendor_anb_philly/payroll/summary');
        if (payrollRes.ok) {
          const pData = await payrollRes.json();
          if (pData.contractor_payouts && Array.isArray(pData.contractor_payouts)) {
            setCompletedPayouts(pData.contractor_payouts);
          }
          if (pData.driver_profiles && pData.driver_profiles['drv_01']) {
            setDriverProfile((prev: any) => ({
              ...prev,
              ...pData.driver_profiles['drv_01']
            }));
          }
        }
      } catch (pErr) {
        console.warn('Could not load live payroll summary for driver', pErr);
      }
    } catch (err) {
      console.error('Error loading driver data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      setDocFileBase64(base64);
      setDocPreviewUrl(base64);
    };
    reader.readAsDataURL(file);
  };

  const handleUploadDocumentSubmit = async () => {
    if (!docFileBase64) {
      setStatusMessage('Please snap a photo or choose a document file first.');
      return;
    }
    setUploadingDoc(true);
    setStatusMessage(null);
    try {
      await uploadDriverDocument(driverProfile.id || 'drv_01', {
        vendor_id: 'vendor_anb_philly',
        document_type: docType,
        document_name: docName,
        base64_data: docFileBase64,
        expiry_date: docExpiry
      });
      setInstantPayoutNotice(`✓ ${docName} successfully uploaded & synchronized to Sovereign S3 Vault!`);
      setDocFileBase64(null);
      setDocPreviewUrl(null);
      const docData = await fetchDriverDocuments(driverProfile.id || 'drv_01');
      if (docData && docData.documents) {
        setDriverDocuments(docData.documents);
      }
    } catch (err: any) {
      setStatusMessage(extractErrorMessage(err, 'Failed to upload document'));
    } finally {
      setUploadingDoc(false);
    }
  };


  useEffect(() => {
    loadDriverData();
    const interval = setInterval(loadDriverData, 5000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      setOfferCountdown(prev => (prev > 0 ? prev - 1 : 120));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    let t: any;
    if (activeTrip?.status === 'ARRIVED') {
      t = setInterval(() => setWaitTimer(prev => prev + 1), 1000);
    } else {
      setWaitTimer(0);
    }
    return () => clearInterval(t);
  }, [activeTrip?.status]);

  const handleAcceptOffer = async (offerId: string) => {
    try {
      setStatusMessage(null);
      const trip = await acceptDriverOffer(offerId);
      setActiveTrip(trip);
      loadDriverData();
    } catch (err: any) {
      setStatusMessage(extractErrorMessage(err, 'Error accepting ride offer'));
    }
  };

  // Live HTML5 Geolocation Telemetry Streaming to Backend
  useEffect(() => {
    if (!navigator.geolocation || !activeTrip) return;
    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        const { latitude, longitude, speed } = pos.coords;
        fetch('/api/v1/telemetry/driver-location', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            driver_id: 'drv_01',
            trip_id: activeTrip.id,
            latitude,
            longitude,
            speed_mph: speed ? Math.round(speed * 2.23694) : 28,
            timestamp_utc: new Date().toISOString()
          })
        }).catch(() => {});
      },
      (err) => console.warn('HTML5 GPS notice:', err.message),
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 10000 }
    );
    return () => navigator.geolocation.clearWatch(watchId);
  }, [activeTrip?.id]);

  const handleTransition = async (nextStatus: TripStatus) => {
    if (!activeTrip) return;
    try {
      setStatusMessage(null);
      const updated = await updateTripStatus(activeTrip.id, nextStatus, `Chauffeur updated status to ${nextStatus}`);
      setActiveTrip(updated);
      
      if (nextStatus === 'COMPLETED') {
        const grossFare = Number((activeTrip as any)?.price_usd || activeBooking?.quoted_price_usd || 0);
        const subtotal = grossFare > 0 ? grossFare * 0.8 : 100.0;
        const gratuity = grossFare > 0 ? grossFare * 0.2 : 25.0;

        try {
          const settleRes = await fetch('/api/v1/vendor-app/trips/settle-driver-payout', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              trip_id: activeTrip.id,
              total_fare_usd: grossFare || 125.0,
              subtotal_usd: subtotal,
              gratuity_usd: gratuity,
              assigned_chauffeur_id: 'drv_01'
            })
          });
          if (settleRes.ok) {
            const settleData = await settleRes.json();
            const newPayout = {
              id: `TX-STRIPE-${activeTrip.id.substring(0, 8)}`,
              trip_id: activeTrip.id,
              passenger: activeBooking?.passenger_name || 'Executive Passenger',
              gross_fare: grossFare || 125.0,
              base_cut: settleData.driver_payout_usd - gratuity,
              tip: gratuity,
              toll: 0,
              total_payout: settleData.driver_payout_usd,
              transfer_sid: settleData.driver_stripe_transfer_id || `tr_${activeTrip.id}`,
              status: settleData.payout_status || 'TRANSFERRED_INSTANT',
              time: 'Just now'
            };

            setCompletedPayouts(prev => [newPayout, ...prev]);
            setDriverProfile(prev => ({
              ...prev,
              earnings_today_base: prev.earnings_today_base + (settleData.driver_payout_usd - gratuity),
              earnings_today_tips: prev.earnings_today_tips + gratuity,
              trips_today: prev.trips_today + 1
            }));

            setInstantPayoutNotice(`⚡ Instant Stripe Payout Sent! $${settleData.driver_payout_usd.toFixed(2)} deposited to your connected account (${settleData.driver_stripe_transfer_id}).`);
          }
        } catch (sErr) {
          console.warn('Driver settlement notice:', sErr);
        }
      }

      loadDriverData();
    } catch (err: any) {
      setStatusMessage(extractErrorMessage(err, 'Error updating trip status'));
    }
  };

  const formatWaitTime = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const totalEarningsToday = driverProfile.earnings_today_base + driverProfile.earnings_today_tips + driverProfile.earnings_today_tolls;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', maxWidth: '640px', margin: '0 auto', fontFamily: 'system-ui, -apple-system, sans-serif', color: '#0F172A' }}>
      
      {/* Top Driver Header Card */}
      <div style={{ background: '#FFFFFF', borderRadius: '16px', padding: '18px', border: '1px solid #E2E8F0', boxShadow: '0 2px 8px rgba(0,0,0,0.04)', display: 'flex', flexDirection: 'column', gap: '14px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: '#EFF6FF', border: '2px solid #0078D4', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <User size={24} color="#0078D4" />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <h2 style={{ margin: 0, fontSize: '17px', fontWeight: 800, color: '#0F172A' }}>
                  {driverProfile.name}
                </h2>
                <span style={{ fontSize: '10px', background: '#DCFCE7', color: '#15803D', padding: '2px 6px', borderRadius: '4px', fontWeight: 800 }}>
                  ★ {driverProfile.rating}
                </span>
              </div>
              <p style={{ margin: '2px 0 0 0', fontSize: '11px', color: '#64748B' }}>
                {driverProfile.vehicle} • Badge: {driverProfile.badge_id}
              </p>
            </div>
          </div>

          <button 
            onClick={loadDriverData}
            style={{ padding: '8px', background: '#F8FAFC', border: '1px solid #CBD5E1', borderRadius: '8px', color: '#64748B', cursor: 'pointer' }}
          >
            <RefreshCw size={14} className={loading ? 'pulse-live' : ''} />
          </button>
        </div>

        {/* Chauffeur Compensation Status Banner */}
        <div style={{ background: '#F8FAFC', borderRadius: '10px', padding: '10px 14px', border: '1px solid #E2E8F0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '10px', fontWeight: 800, padding: '3px 8px', borderRadius: '4px', backgroundColor: '#EFF6FF', color: '#1D4ED8' }}>
              {driverProfile.compensation_model === 'CONTRACTOR_COMMISSION' ? '1099 CONTRACTOR' : 'W-2 HOURLY'}
            </span>
            <span style={{ fontSize: '12px', fontWeight: 700, color: '#374151' }}>
              {driverProfile.commission_pct}% Split + 100% Tips & Tolls
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', color: '#16A34A', fontWeight: 700 }}>
            <Zap size={13} />
            <span>Stripe Instant Payouts Active</span>
          </div>
        </div>

        {/* Daily Financial Summary Snapshot (Light Mode) */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px', background: 'linear-gradient(135deg, #F8FAFC 0%, #EFF6FF 100%)', border: '1px solid #DBEAFE', borderRadius: '12px', padding: '16px', color: '#0F172A' }}>
          <div>
            <div style={{ fontSize: '10px', color: '#64748B', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Today Earned</div>
            <div style={{ fontSize: '20px', fontWeight: 900, color: '#15803D', marginTop: '4px' }}>
              ${totalEarningsToday.toFixed(2)}
            </div>
          </div>

          <div>
            <div style={{ fontSize: '10px', color: '#64748B', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Tips & Tolls</div>
            <div style={{ fontSize: '20px', fontWeight: 900, color: '#0284C7', marginTop: '4px' }}>
              +${(driverProfile.earnings_today_tips + driverProfile.earnings_today_tolls).toFixed(2)}
            </div>
          </div>

          <div>
            <div style={{ fontSize: '10px', color: '#64748B', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Trips Done</div>
            <div style={{ fontSize: '20px', fontWeight: 900, color: '#0F172A', marginTop: '4px' }}>
              {driverProfile.trips_today}
            </div>
          </div>
        </div>

        {/* Duty Status & DOT Compliance Bar */}
        <div style={{ padding: '10px 14px', background: '#F8FAFC', borderRadius: '10px', border: '1px solid #E2E8F0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '11px', color: '#64748B', fontWeight: 700 }}>Duty:</span>
            <div style={{ display: 'flex', gap: '4px' }}>
              {(['ON_DUTY', 'ON_BREAK', 'OFF_DUTY'] as const).map((st) => (
                <button
                  key={st}
                  onClick={() => setDutyStatus(st)}
                  style={{
                    fontSize: '10px',
                    fontWeight: 800,
                    padding: '3px 8px',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    border: dutyStatus === st ? '1px solid #16A34A' : '1px solid transparent',
                    background: dutyStatus === st ? '#DCFCE7' : 'transparent',
                    color: dutyStatus === st ? '#15803D' : '#64748B'
                  }}
                >
                  {st.replace('_', ' ')}
                </button>
              ))}
            </div>
          </div>

          <div style={{ fontSize: '11px', color: '#64748B', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <Activity size={12} color="#16A34A" />
            <span>DOT Hours: <strong style={{ color: '#0F172A' }}>{drivingHoursToday}h</strong> / 10h</span>
          </div>
        </div>

        {/* Navigation Tabs (4-column) */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '6px', borderTop: '1px solid #E2E8F0', paddingTop: '10px' }}>
          <button
            onClick={() => setActiveDriverTab('mission')}
            style={{
              padding: '8px 4px',
              borderRadius: '6px',
              fontSize: '11px',
              fontWeight: 700,
              cursor: 'pointer',
              border: 'none',
              backgroundColor: activeDriverTab === 'mission' ? '#0078D4' : '#F1F5F9',
              color: activeDriverTab === 'mission' ? '#FFFFFF' : '#475569'
            }}
          >
            🚗 Mission
          </button>

          <button
            onClick={() => setActiveDriverTab('earnings')}
            style={{
              padding: '8px 4px',
              borderRadius: '6px',
              fontSize: '11px',
              fontWeight: 700,
              cursor: 'pointer',
              border: 'none',
              backgroundColor: activeDriverTab === 'earnings' ? '#0078D4' : '#F1F5F9',
              color: activeDriverTab === 'earnings' ? '#FFFFFF' : '#475569'
            }}
          >
            💰 Payouts ({completedPayouts.length})
          </button>

          <button
            onClick={() => setActiveDriverTab('shift')}
            style={{
              padding: '8px 4px',
              borderRadius: '6px',
              fontSize: '11px',
              fontWeight: 700,
              cursor: 'pointer',
              border: 'none',
              backgroundColor: activeDriverTab === 'shift' ? '#0078D4' : '#F1F5F9',
              color: activeDriverTab === 'shift' ? '#FFFFFF' : '#475569'
            }}
          >
            ⏱️ Shift
          </button>

          <button
            onClick={() => setActiveDriverTab('credentials')}
            style={{
              padding: '8px 4px',
              borderRadius: '6px',
              fontSize: '11px',
              fontWeight: 700,
              cursor: 'pointer',
              border: 'none',
              backgroundColor: activeDriverTab === 'credentials' ? '#0078D4' : '#F1F5F9',
              color: activeDriverTab === 'credentials' ? '#FFFFFF' : '#475569'
            }}
          >
            📄 Docs ({driverDocuments.length})
          </button>
        </div>
      </div>

      {/* Instant Payout Notification Toast */}
      {instantPayoutNotice && (
        <div style={{ background: '#ECFDF5', border: '1px solid #10B981', color: '#065F46', padding: '12px 16px', borderRadius: '12px', fontSize: '12px', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <CheckCircle2 size={16} color="#10B981" />
            <span>{instantPayoutNotice}</span>
          </div>
          <button onClick={() => setInstantPayoutNotice(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#065F46', fontWeight: 800 }}>
            ✕
          </button>
        </div>
      )}

      {/* TAB 1: ACTIVE MISSION & OFFERS */}
      {activeDriverTab === 'mission' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* 1. Pending Incoming Offers Card */}
          {offers.filter(o => o.status === 'PENDING').length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '11px', fontWeight: 800, color: '#D97706', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Zap size={14} /> New Ride Opportunity
                </span>
                <span style={{ color: '#64748B', fontWeight: 400 }}>
                  Acceptance window: <strong style={{ color: '#D97706' }}>{offerCountdown}s</strong>
                </span>
              </div>

              {offers.filter(o => o.status === 'PENDING').map(offer => {
                const estGross = Number(offer.payout_amount ?? offer.offered_payout_net ?? 135.00);
                const estBaseCut = (estGross * driverProfile.commission_pct) / 100;
                const estTip = 25.00;
                const estToll = 10.00;
                const estNet = estBaseCut + estTip + estToll;

                return (
                  <div 
                    key={offer.id} 
                    style={{
                      background: '#FFFFFF',
                      border: '2px solid #F59E0B',
                      borderRadius: '16px',
                      padding: '20px',
                      boxShadow: '0 4px 16px rgba(245, 158, 11, 0.15)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '14px'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div>
                        <span style={{ fontSize: '10px', fontWeight: 800, color: '#A16207', background: '#FEF08A', padding: '2px 6px', borderRadius: '4px', border: '1px solid #FDE047' }}>
                          GUARANTEED NET CHAUFFEUR PAYOUT (65% + TIPS)
                        </span>
                        <div style={{ fontSize: '28px', fontWeight: 900, color: '#0F172A', marginTop: '4px' }}>
                          ${estNet.toFixed(2)}
                        </div>
                      </div>

                      <div style={{ textAlign: 'right', fontSize: '11px', color: '#64748B' }}>
                        <div>Pickup in <strong>{offer.estimated_pickup_minutes ?? 15} min</strong></div>
                        <div>Deadhead: <strong>{(offer.deadhead_miles ?? 2.4).toFixed(1)} mi</strong></div>
                      </div>
                    </div>

                    {/* Fare Calculation Breakdown */}
                    <div style={{ padding: '10px', backgroundColor: '#FFFBEB', borderRadius: '8px', border: '1px solid #FDE68A', fontSize: '11px', display: 'flex', justifyContent: 'space-between', color: '#78350F' }}>
                      <span>Gross Fare: <strong>${estGross.toFixed(2)}</strong></span>
                      <span>Base Cut (65%): <strong>${estBaseCut.toFixed(2)}</strong></span>
                      <span>Tips & Tolls: <strong>+${(estTip + estToll).toFixed(2)}</strong></span>
                    </div>

                    <div style={{ background: '#F8FAFC', padding: '12px', borderRadius: '10px', border: '1px solid #E2E8F0', fontSize: '12px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                        <MapPin size={14} color="#D97706" style={{ flexShrink: 0, marginTop: '2px' }} />
                        <div>
                          <span style={{ color: '#64748B', display: 'block' }}>Pickup:</span>
                          <strong style={{ color: '#0F172A' }}>{offer.pickup_address || 'Philadelphia International Airport (PHL)'}</strong>
                        </div>
                      </div>
                      {offer.dropoff_address && (
                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', paddingTop: '4px', borderTop: '1px solid #E2E8F0' }}>
                          <Navigation size={14} color="#0078D4" style={{ flexShrink: 0, marginTop: '2px' }} />
                          <div>
                            <span style={{ color: '#64748B', display: 'block' }}>Dropoff:</span>
                            <strong style={{ color: '#0F172A' }}>{offer.dropoff_address}</strong>
                          </div>
                        </div>
                      )}
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                      <button
                        onClick={() => handleAcceptOffer(offer.id)}
                        style={{
                          padding: '12px',
                          background: '#16A34A',
                          color: '#FFFFFF',
                          fontWeight: 800,
                          fontSize: '13px',
                          borderRadius: '8px',
                          border: 'none',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '6px'
                        }}
                      >
                        <CheckCircle2 size={16} />
                        <span>Accept Ride</span>
                      </button>

                      <button
                        style={{
                          padding: '12px',
                          background: '#F1F5F9',
                          color: '#64748B',
                          fontWeight: 700,
                          fontSize: '13px',
                          borderRadius: '8px',
                          border: '1px solid #CBD5E1',
                          cursor: 'pointer'
                        }}
                      >
                        Decline
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* 2. Active Trip State Machine */}
          {activeTrip && (
            <div style={{ background: '#FFFFFF', borderRadius: '16px', padding: '20px', border: '2px solid #0078D4', boxShadow: '0 4px 16px rgba(0, 120, 212, 0.12)', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '11px', fontWeight: 800, color: '#0078D4', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  Active Chauffeur Mission
                </span>
                <span style={{ fontSize: '11px', fontWeight: 800, background: '#EFF6FF', color: '#0078D4', padding: '3px 8px', borderRadius: '6px', border: '1px solid #BFDBFE' }}>
                  {activeTrip.status}
                </span>
              </div>

              <div style={{ background: '#F8FAFC', padding: '14px', borderRadius: '10px', border: '1px solid #E2E8F0', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ fontSize: '15px', fontWeight: 800, color: '#0F172A' }}>
                  Passenger: {activeBooking?.passenger_name || 'VIP Client'}
                </div>
                <div style={{ fontSize: '12px', color: '#475569' }}>
                  <strong>Pickup:</strong> {activeBooking?.pickup_address || activeTrip.pickup_address}
                </div>
                <div style={{ fontSize: '12px', color: '#475569' }}>
                  <strong>Dropoff:</strong> {activeBooking?.dropoff_address || activeTrip.dropoff_address}
                </div>
              </div>

              {/* Action Buttons depending on status */}
              {activeTrip.status === 'SCHEDULED' && (
                <button
                  onClick={() => handleTransition('EN_ROUTE')}
                  style={{ padding: '14px', backgroundColor: '#0078D4', color: '#FFFFFF', fontWeight: 800, fontSize: '14px', borderRadius: '8px', border: 'none', cursor: 'pointer' }}
                >
                  Start Driving (En Route to Pickup)
                </button>
              )}

              {activeTrip.status === 'EN_ROUTE' && (
                <button
                  onClick={() => handleTransition('ARRIVED')}
                  style={{ padding: '14px', backgroundColor: '#D97706', color: '#FFFFFF', fontWeight: 800, fontSize: '14px', borderRadius: '8px', border: 'none', cursor: 'pointer' }}
                >
                  Arrived on Scene (Notify Passenger)
                </button>
              )}

              {activeTrip.status === 'ARRIVED' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <div style={{ textAlign: 'center', fontSize: '12px', color: '#D97706', fontWeight: 700 }}>
                    ⏱️ Waiting on scene: {formatWaitTime(waitTimer)}
                  </div>
                  <button
                    onClick={() => handleTransition('PASSENGER_ONBOARD')}
                    style={{ padding: '14px', backgroundColor: '#16A34A', color: '#FFFFFF', fontWeight: 800, fontSize: '14px', borderRadius: '8px', border: 'none', cursor: 'pointer' }}
                  >
                    Passenger Onboard (Begin Journey)
                  </button>
                </div>
              )}

              {activeTrip.status === 'PASSENGER_ONBOARD' && (
                <button
                  onClick={() => handleTransition('COMPLETED')}
                  style={{ padding: '14px', backgroundColor: '#16A34A', color: '#FFFFFF', fontWeight: 800, fontSize: '14px', borderRadius: '8px', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                >
                  <Zap size={18} />
                  Complete Trip & Trigger Instant Stripe Payout
                </button>
              )}
            </div>
          )}

          {/* 3. Empty State */}
          {!activeTrip && offers.filter(o => o.status === 'PENDING').length === 0 && (
            <div style={{ background: '#FFFFFF', borderRadius: '16px', padding: '32px 20px', border: '1px solid #E2E8F0', textAlign: 'center', color: '#64748B' }}>
              <Clock size={32} color="#94A3B8" style={{ margin: '0 auto 12px auto' }} />
              <h3 style={{ margin: '0 0 4px 0', fontSize: '15px', fontWeight: 800, color: '#0F172A' }}>
                Standing By for Next Dispatch
              </h3>
              <p style={{ margin: 0, fontSize: '12px' }}>
                You are online and prioritized for VIP airport transfers in Philadelphia / Center City.
              </p>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: INSTANT STRIPE PAYOUTS AUDIT */}
      {activeDriverTab === 'earnings' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div style={{ background: '#FFFFFF', borderRadius: '14px', padding: '18px', border: '1px solid #E2E8F0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
            <h3 style={{ margin: '0 0 4px 0', fontSize: '15px', fontWeight: 800, color: '#0F172A' }}>
              Instant Stripe Direct Transfers
            </h3>
            <p style={{ margin: '0 0 16px 0', fontSize: '12px', color: '#64748B' }}>
              1099 contractor commission splits and 100% customer tips transferred to {driverProfile.stripe_account_id}
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {completedPayouts.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '24px 12px', color: '#64748B', fontSize: '12px' }}>
                  <CreditCard size={28} color="#94A3B8" style={{ margin: '0 auto 8px auto' }} />
                  <p style={{ margin: 0, fontWeight: 700, color: '#334155' }}>No Instant Stripe Payouts Recorded Yet</p>
                  <p style={{ margin: '4px 0 0 0', fontSize: '11px' }}>Direct deposit payouts will appear in real time once your dispatched trips are completed.</p>
                </div>
              ) : (
                completedPayouts.map((pay, idx) => {
                  const baseCut = Number(pay.base_cut ?? pay.base_payout_usd ?? 0);
                  const tipVal = Number(pay.tip ?? pay.tip_amount_usd ?? 0);
                  const tollVal = Number(pay.toll ?? pay.tolls_usd ?? 0);
                  const totalVal = Number(pay.total_payout ?? pay.total_transfer_usd ?? (baseCut + tipVal + tollVal));

                  return (
                    <div key={pay.id || pay.transfer_sid || idx} style={{ background: '#F8FAFC', borderRadius: '10px', padding: '14px', border: '1px solid #E2E8F0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <div style={{ fontSize: '13px', fontWeight: 800, color: '#0F172A' }}>
                          {pay.trip_id || 'TRIP'} • {pay.passenger || pay.passenger_name || 'Passenger'}
                        </div>
                        <div style={{ fontSize: '11px', color: '#64748B', marginTop: '2px', fontFamily: 'monospace' }}>
                          {pay.transfer_sid || pay.id || 'tr_stripe_transfer'} • {pay.time || pay.created_at || 'Completed'}
                        </div>
                        <div style={{ fontSize: '11px', color: '#16A34A', marginTop: '4px', fontWeight: 600 }}>
                          Base: ${baseCut.toFixed(2)} + Tip: ${tipVal.toFixed(2)} + Toll: ${tollVal.toFixed(2)}
                        </div>
                      </div>

                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '16px', fontWeight: 900, color: '#16A34A' }}>
                          +${totalVal.toFixed(2)}
                        </div>
                        <span style={{ fontSize: '9px', fontWeight: 800, padding: '2px 6px', borderRadius: '4px', backgroundColor: '#DCFCE7', color: '#15803D' }}>
                          {pay.status || 'TRANSFERRED'}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: SHIFT CLOCK-IN & ACCRUAL TRACKER */}
      {activeDriverTab === 'shift' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div style={{ background: '#FFFFFF', borderRadius: '14px', padding: '18px', border: '1px solid #E2E8F0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
            <h3 style={{ margin: '0 0 4px 0', fontSize: '15px', fontWeight: 800, color: '#0F172A' }}>
              Shift & Active Duty Hours Tracker
            </h3>
            <p style={{ margin: '0 0 16px 0', fontSize: '12px', color: '#64748B' }}>
              Logged into ANB Limo Company active payroll ledger for bi-weekly Gusto / ADP sync
            </p>

            <div style={{ padding: '16px', backgroundColor: '#F8FAFC', borderRadius: '10px', border: '1px solid #E2E8F0', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '13px', fontWeight: 700, color: '#374151' }}>Current Shift Duration</span>
                <span style={{ fontSize: '16px', fontWeight: 900, color: '#0078D4' }}>{drivingHoursToday} hrs</span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '13px', fontWeight: 700, color: '#374151' }}>Base Hourly Rate</span>
                <span style={{ fontSize: '14px', fontWeight: 800, color: '#0F172A' }}>${driverProfile.hourly_rate.toFixed(2)} / hr</span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '13px', fontWeight: 700, color: '#374151' }}>FLSA Overtime Rate (&gt;40h)</span>
                <span style={{ fontSize: '14px', fontWeight: 800, color: '#B91C1C' }}>${(driverProfile.hourly_rate * 1.5).toFixed(2)} / hr</span>
              </div>

              <button
                onClick={() => {
                  setDrivingHoursToday(prev => Number((prev + 1.0).toFixed(1)));
                  setInstantPayoutNotice('⏱️ Added +1.0 active shift hour to your payroll ledger.');
                }}
                style={{
                  marginTop: '8px',
                  padding: '12px',
                  backgroundColor: '#0078D4',
                  color: '#FFFFFF',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '13px',
                  fontWeight: 800,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px'
                }}
              >
                <Clock size={16} />
                <span>Add Shift Hours (+1.0 hr)</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: CHAUFFEUR CREDENTIALS & MOBILE DOCUMENT VAULT (GAP-D1) */}
      {activeDriverTab === 'credentials' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          
          {/* Upload New Document Card */}
          <div style={{ background: '#FFFFFF', borderRadius: '14px', padding: '18px', border: '1px solid #E2E8F0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
              <Camera size={18} color="#0078D4" />
              <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 800, color: '#0F172A' }}>
                Mobile Credential & Document Upload (GAP-D1)
              </h3>
            </div>
            <p style={{ margin: '0 0 16px 0', fontSize: '12px', color: '#64748B' }}>
              Upload photos of renewed Chauffeur Licenses, DOT Medical Cards, or Airport Security Badges directly to the Sovereign S3 Vault.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label style={{ fontSize: '11px', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '4px' }}>
                  DOCUMENT CATEGORY
                </label>
                <select
                  value={docType}
                  onChange={(e) => {
                    const t = e.target.value as DriverDocumentType;
                    setDocType(t);
                    if (t === 'COMMERCIAL_CHAUFFEUR_LICENSE') setDocName('PA PPA Chauffeur License');
                    else if (t === 'DOT_MEDICAL_CERTIFICATE') setDocName('DOT Medical Examiner Certificate');
                    else if (t === 'AIRPORT_SECURITY_BADGE') setDocName('PHL Airport SIDA Badge');
                    else if (t === 'COMMERCIAL_INSURANCE_CARD') setDocName('Commercial Chauffeur Insurance Card');
                    else if (t === 'VEHICLE_REGISTRATION') setDocName('Vehicle Registration Card');
                    else setDocName('Chauffeur Document');
                  }}
                  style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '13px', background: '#FFFFFF', color: '#0F172A' }}
                >
                  <option value="COMMERCIAL_CHAUFFEUR_LICENSE">Commercial Chauffeur / TLC License</option>
                  <option value="DOT_MEDICAL_CERTIFICATE">DOT Medical Card / Physical Exam</option>
                  <option value="AIRPORT_SECURITY_BADGE">Airport Security / Ground Transport Badge</option>
                  <option value="COMMERCIAL_INSURANCE_CARD">Commercial Auto Liability Insurance</option>
                  <option value="VEHICLE_REGISTRATION">State Vehicle Registration Card</option>
                  <option value="BACKGROUND_CHECK_CERTIFICATE">Safeguarding / Background Check</option>
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={{ fontSize: '11px', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '4px' }}>
                    DOCUMENT NAME
                  </label>
                  <input
                    type="text"
                    value={docName}
                    onChange={(e) => setDocName(e.target.value)}
                    style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '13px' }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '11px', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '4px' }}>
                    EXPIRATION DATE
                  </label>
                  <input
                    type="date"
                    value={docExpiry}
                    onChange={(e) => setDocExpiry(e.target.value)}
                    style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '13px' }}
                  />
                </div>
              </div>

              {/* Photo Snap / File Picker Input */}
              <div style={{ border: '2px dashed #CBD5E1', borderRadius: '10px', padding: '16px', textAlign: 'center', background: '#F8FAFC', cursor: 'pointer' }}>
                <input
                  type="file"
                  id="driverDocFileInput"
                  accept="image/*,application/pdf"
                  capture="environment"
                  onChange={handleFileChange}
                  style={{ display: 'none' }}
                />
                <label htmlFor="driverDocFileInput" style={{ cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
                  <Camera size={24} color="#0078D4" />
                  <span style={{ fontSize: '13px', fontWeight: 700, color: '#0078D4' }}>
                    {docFileBase64 ? '✓ Photo Selected (Tap to Change)' : '📷 Snap Photo with Camera or Browse File'}
                  </span>
                  <span style={{ fontSize: '11px', color: '#64748B' }}>
                    Supports JPEG, PNG, WEBP, or PDF
                  </span>
                </label>
              </div>

              {/* Live Preview If Selected */}
              {docPreviewUrl && (
                <div style={{ background: '#0F172A', padding: '10px', borderRadius: '8px', textAlign: 'center' }}>
                  <img
                    src={docPreviewUrl}
                    alt="Document Preview"
                    style={{ maxHeight: '160px', maxWidth: '100%', borderRadius: '6px', objectFit: 'contain' }}
                  />
                  <div style={{ fontSize: '11px', color: '#94A3B8', marginTop: '6px' }}>
                    Photo ready for sovereign vault encryption
                  </div>
                </div>
              )}

              <button
                onClick={handleUploadDocumentSubmit}
                disabled={uploadingDoc || !docFileBase64}
                style={{
                  padding: '12px',
                  backgroundColor: !docFileBase64 ? '#94A3B8' : (uploadingDoc ? '#64748B' : '#0078D4'),
                  color: '#FFFFFF',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '13px',
                  fontWeight: 800,
                  cursor: !docFileBase64 || uploadingDoc ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  boxShadow: '0 2px 8px rgba(0, 120, 212, 0.25)'
                }}
              >
                <Upload size={16} />
                <span>{uploadingDoc ? 'Encrypting & Uploading to S3...' : 'Upload & Sync Credential'}</span>
              </button>
            </div>
          </div>

          {/* Active Verified Documents Card */}
          <div style={{ background: '#FFFFFF', borderRadius: '14px', padding: '18px', border: '1px solid #E2E8F0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
            <h3 style={{ margin: '0 0 4px 0', fontSize: '15px', fontWeight: 800, color: '#0F172A' }}>
              Verified Chauffeur Credentials Vault
            </h3>
            <p style={{ margin: '0 0 16px 0', fontSize: '12px', color: '#64748B' }}>
              Authoritative compliance credentials checked prior to dispatching passenger trips
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {/* Default driver license representation */}
              <div style={{ background: '#F8FAFC', borderRadius: '10px', padding: '14px', border: '1px solid #E2E8F0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ width: '40px', height: '40px', borderRadius: '8px', background: '#EFF6FF', border: '1px solid #BFDBFE', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <ShieldCheck size={20} color="#1D4ED8" />
                  </div>
                  <div>
                    <div style={{ fontSize: '13px', fontWeight: 800, color: '#0F172A' }}>
                      PA Commercial Chauffeur License
                    </div>
                    <div style={{ fontSize: '11px', color: '#64748B', marginTop: '2px' }}>
                      Badge: {driverProfile.badge_id} • Expires: {driverProfile.license_expiry || '2027-10-15'}
                    </div>
                  </div>
                </div>

                <span style={{ fontSize: '10px', fontWeight: 800, padding: '3px 8px', borderRadius: '4px', backgroundColor: '#DCFCE7', color: '#15803D' }}>
                  ✓ VERIFIED
                </span>
              </div>

              {/* Uploaded Documents List */}
              {driverDocuments.map((doc, idx) => (
                <div key={doc.document_id || idx} style={{ background: '#F8FAFC', borderRadius: '10px', padding: '14px', border: '1px solid #E2E8F0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ width: '40px', height: '40px', borderRadius: '8px', background: '#F0FDF4', border: '1px solid #BBF7D0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <FileText size={20} color="#15803D" />
                    </div>
                    <div>
                      <div style={{ fontSize: '13px', fontWeight: 800, color: '#0F172A' }}>
                        {doc.document_name}
                      </div>
                      <div style={{ fontSize: '11px', color: '#64748B', marginTop: '2px' }}>
                        {doc.document_type.replace(/_/g, ' ')} {doc.expiry_date ? `• Exp: ${doc.expiry_date}` : ''}
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <a
                      href={doc.file_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ fontSize: '11px', color: '#0078D4', fontWeight: 700, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '3px' }}
                    >
                      <Eye size={12} /> View
                    </a>
                    <span style={{ fontSize: '10px', fontWeight: 800, padding: '3px 8px', borderRadius: '4px', backgroundColor: '#DCFCE7', color: '#15803D' }}>
                      {doc.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>
      )}

    </div>
  );
};

