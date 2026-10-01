import React, { useState, useEffect } from 'react';
import {
  X, MapPin, Navigation, Car, Phone, MessageSquare, ShieldCheck,
  Clock, Activity, RefreshCw, CheckCircle2, AlertCircle, Sparkles,
  Compass, Radio, Zap
} from 'lucide-react';
import { fetchBookingLiveTrackingApi, sendDriverLocationPingApi, LiveTrackingResponse } from '../../api';

interface LiveRideTrackingModalProps {
  bookingId: string;
  isOpen: boolean;
  onClose: () => void;
}

export const LiveRideTrackingModal: React.FC<LiveRideTrackingModalProps> = ({
  bookingId,
  isOpen,
  onClose
}) => {
  const [trackingData, setTrackingData] = useState<LiveTrackingResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [simulating, setSimulating] = useState(false);
  const [simStep, setSimStep] = useState(0);

  const loadTracking = async () => {
    try {
      setError(null);
      const data = await fetchBookingLiveTrackingApi(bookingId);
      setTrackingData(data);
    } catch (err: any) {
      setError(err.message || 'Unable to stream live chauffeur telemetry');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isOpen) return;
    loadTracking();
    const interval = setInterval(loadTracking, 3000);
    return () => clearInterval(interval);
  }, [isOpen, bookingId]);

  if (!isOpen) return null;

  // Simulation steps for interactive testing
  const handleSimulateGpsMove = async () => {
    setSimulating(true);
    try {
      const nextStep = (simStep + 1) % 4;
      setSimStep(nextStep);

      // Coordinates stepping from Center City Philly towards PHL Airport
      const coords = [
        { lat: 39.9526, lng: -75.1652, speed: 32, note: 'Departing Center City Garage' },
        { lat: 39.9150, lng: -75.1950, speed: 48, note: 'Cruising on I-95 South' },
        { lat: 39.8820, lng: -75.2350, speed: 25, note: 'Entering Airport Terminal Corridor' },
        { lat: 39.8744, lng: -75.2424, speed: 0, note: 'Arrived at Terminal Curbside VIP Geofence' }
      ];

      const currentPoint = coords[nextStep];
      await sendDriverLocationPingApi({
        driver_id: trackingData?.driver?.id || 'drv_01',
        trip_id: trackingData?.trip_id,
        latitude: currentPoint.lat,
        longitude: currentPoint.lng,
        speed_mph: currentPoint.speed
      });

      await loadTracking();
    } catch (err: any) {
      console.warn('Simulation ping notice:', err.message);
    } finally {
      setSimulating(false);
    }
  };

  const getStepIndex = (status: string) => {
    switch (status?.toUpperCase()) {
      case 'SCHEDULED':
      case 'CONFIRMED':
        return 1;
      case 'DRIVER_ACCEPTED':
      case 'ACCEPTED':
        return 2;
      case 'EN_ROUTE':
        return 3;
      case 'ARRIVED':
        return 4;
      case 'IN_PROGRESS':
      case 'ONBOARD':
        return 5;
      case 'COMPLETED':
        return 6;
      default:
        return 2;
    }
  };

  const currentStep = getStepIndex(trackingData?.status || 'EN_ROUTE');

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.75)',
        backdropFilter: 'blur(6px)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px'
      }}
    >
      <div
        style={{
          backgroundColor: '#FFFFFF',
          borderRadius: '16px',
          width: '100%',
          maxWidth: '680px',
          maxHeight: '92vh',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          border: '1px solid #E2E8F0'
        }}
      >
        {/* Header (Light Mode) */}
        <div
          style={{
            padding: '18px 24px',
            backgroundColor: '#FFFFFF',
            borderBottom: '1px solid #E2E8F0',
            color: '#0F172A',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: '38px',
                height: '38px',
                borderRadius: '8px',
                backgroundColor: '#FEF3C7',
                border: '1px solid #FCD34D',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <Radio size={20} color="#D97706" className="pulse-live" />
            </div>
            <div>
              <div style={{ fontSize: '16px', fontWeight: 800, color: '#0F172A', letterSpacing: '-0.01em' }}>
                Live Chauffeur Radar &amp; Telemetry
              </div>
              <div style={{ fontSize: '12px', color: '#64748B' }}>
                Booking Ref: <span style={{ color: '#D97706', fontFamily: 'monospace', fontWeight: 800, backgroundColor: '#FFFBEB', padding: '1px 6px', borderRadius: '4px', border: '1px solid #FEF3C7' }}>#{bookingId}</span> · Real-Time GPS Stream
              </div>
            </div>
          </div>

          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              color: '#64748B',
              cursor: 'pointer',
              padding: '6px',
              borderRadius: '6px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Modal Body */}
        <div style={{ padding: '20px 24px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '18px', backgroundColor: '#F8FAFC' }}>
          
          {loading && !trackingData && (
            <div style={{ textAlign: 'center', padding: '40px 0', color: '#64748B' }}>
              <RefreshCw size={28} color="#0078D4" className="pulse-live" style={{ margin: '0 auto 12px auto' }} />
              <div style={{ fontWeight: 700, fontSize: '14px' }}>Connecting to Chauffeur GPS Stream...</div>
            </div>
          )}

          {error && (
            <div style={{ padding: '14px', backgroundColor: '#FEF2F2', border: '1px solid #FCA5A5', borderRadius: '8px', color: '#991B1B', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <AlertCircle size={18} />
              <span>{error}</span>
            </div>
          )}

          {trackingData && (
            <>
              {/* ETA Radar & Status Hero Banner (Light Mode) */}
              <div
                style={{
                  background: 'linear-gradient(135deg, #FFFFFF 0%, #EFF6FF 100%)',
                  borderRadius: '14px',
                  border: '1px solid #BFDBFE',
                  padding: '18px 22px',
                  color: '#0F172A',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  boxShadow: '0 4px 14px rgba(0, 120, 212, 0.08)',
                  flexWrap: 'wrap',
                  gap: '12px'
                }}
              >
                <div>
                  <div style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.06em', color: '#1D4ED8', fontWeight: 800 }}>
                    Estimated Time of Arrival
                  </div>
                  <div style={{ fontSize: '28px', fontWeight: 900, color: '#0F172A', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span>{trackingData.telemetry?.eta_minutes || 4} Mins</span>
                    <span style={{ fontSize: '13px', fontWeight: 600, color: '#64748B' }}>
                      ({trackingData.telemetry?.dist_miles || 1.8} mi away)
                    </span>
                  </div>
                  <div style={{ fontSize: '11.5px', color: '#475569', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Activity size={13} color="#059669" />
                    <span>Speed: <strong>{trackingData.telemetry?.speed_mph || 28} mph</strong> · Heading: <strong>{trackingData.telemetry?.heading || 135}° SE</strong></span>
                  </div>
                </div>

                <div style={{ textAlign: 'right' }}>
                  <span
                    style={{
                      display: 'inline-block',
                      backgroundColor: '#DCFCE7',
                      border: '1px solid #86EFAC',
                      color: '#166534',
                      padding: '4px 12px',
                      borderRadius: '20px',
                      fontSize: '12px',
                      fontWeight: 800,
                      letterSpacing: '0.04em'
                    }}
                  >
                    ● {trackingData.status || 'EN_ROUTE'}
                  </span>
                  <div style={{ fontSize: '10.5px', color: '#64748B', marginTop: '6px', fontWeight: 600 }}>
                    Synced {new Date(trackingData.telemetry?.updated_at || Date.now()).toLocaleTimeString()}
                  </div>
                </div>
              </div>

              {/* Interactive Vector Radar Map (Light Mode) */}
              <div
                style={{
                  backgroundColor: '#FFFFFF',
                  borderRadius: '12px',
                  border: '1px solid #CBD5E1',
                  padding: '20px',
                  position: 'relative',
                  overflow: 'hidden',
                  minHeight: '160px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)'
                }}
              >
                {/* Visual Grid Dots */}
                <div
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    backgroundImage: 'radial-gradient(circle, rgba(15,23,42,0.08) 1px, transparent 1px)',
                    backgroundSize: '20px 20px',
                    pointerEvents: 'none'
                  }}
                />

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', zIndex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11.5px', color: '#0F172A', fontWeight: 800 }}>
                    <Compass size={14} color="#0078D4" />
                    <span>Live GPS Corridor Telemetry</span>
                  </div>
                  <span style={{ fontSize: '10px', backgroundColor: '#EFF6FF', color: '#1D4ED8', border: '1px solid #DBEAFE', padding: '2px 8px', borderRadius: '4px', fontWeight: 700 }}>
                    Lat: {Number(trackingData.telemetry?.lat || 39.9526).toFixed(4)}, Lng: {Number(trackingData.telemetry?.lng || -75.1652).toFixed(4)}
                  </span>
                </div>

                {/* Animated Route Line */}
                <div style={{ position: 'relative', margin: '24px 12px', zIndex: 1 }}>
                  <div style={{ height: '5px', backgroundColor: '#E2E8F0', borderRadius: '3px', width: '100%', position: 'relative' }}>
                    <div
                      style={{
                        position: 'absolute',
                        left: 0,
                        top: 0,
                        bottom: 0,
                        width: `${Math.min(100, Math.max(15, (currentStep / 6) * 100))}%`,
                        backgroundColor: '#0078D4',
                        borderRadius: '3px',
                        transition: 'width 0.5s ease'
                      }}
                    />
                  </div>

                  {/* Pickup Dot */}
                  <div
                    style={{
                      position: 'absolute',
                      left: '0%',
                      top: '50%',
                      transform: 'translate(-50%, -50%)',
                      width: '18px',
                      height: '18px',
                      borderRadius: '50%',
                      backgroundColor: '#10B981',
                      border: '3px solid #FFFFFF',
                      boxShadow: '0 0 8px rgba(16, 185, 129, 0.6)'
                    }}
                    title="Pickup Location"
                  />

                  {/* Vehicle Moving Marker */}
                  <div
                    style={{
                      position: 'absolute',
                      left: `${Math.min(90, Math.max(10, (currentStep / 6) * 100))}%`,
                      top: '50%',
                      transform: 'translate(-50%, -50%)',
                      width: '32px',
                      height: '32px',
                      borderRadius: '50%',
                      backgroundColor: '#0078D4',
                      border: '3px solid #FFFFFF',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      boxShadow: '0 2px 10px rgba(0, 120, 212, 0.45)',
                      transition: 'left 0.5s ease'
                    }}
                  >
                    <Car size={16} color="#FFFFFF" />
                  </div>

                  {/* Dropoff Dot */}
                  <div
                    style={{
                      position: 'absolute',
                      left: '100%',
                      top: '50%',
                      transform: 'translate(-50%, -50%)',
                      width: '18px',
                      height: '18px',
                      borderRadius: '50%',
                      backgroundColor: '#F59E0B',
                      border: '3px solid #FFFFFF',
                      boxShadow: '0 0 8px rgba(245, 158, 11, 0.6)'
                    }}
                    title="Dropoff Destination"
                  />
                </div>

                {/* Corridor Endpoint Labels */}
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#334155', zIndex: 1, gap: '12px' }}>
                  <div style={{ maxWidth: '48%' }}>
                    <span style={{ color: '#059669', fontWeight: 800 }}>● Pickup: </span>
                    <span>{trackingData.route?.pickup_address}</span>
                  </div>
                  <div style={{ maxWidth: '48%', textAlign: 'right' }}>
                    <span style={{ color: '#D97706', fontWeight: 800 }}>● Destination: </span>
                    <span>{trackingData.route?.dropoff_address || 'As Directed'}</span>
                  </div>
                </div>
              </div>

              {/* VIP Chauffeur & Vehicle Credentials Card */}
              <div
                style={{
                  backgroundColor: '#FFFFFF',
                  borderRadius: '12px',
                  border: '1px solid #E2E8F0',
                  padding: '18px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: '14px'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                  <div
                    style={{
                      width: '54px',
                      height: '54px',
                      borderRadius: '50%',
                      backgroundImage: `url(${trackingData.driver?.photo_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=250&q=80'})`,
                      backgroundSize: 'cover',
                      backgroundPosition: 'center',
                      border: '2px solid #0078D4',
                      flexShrink: 0
                    }}
                  />
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <div style={{ fontSize: '15px', fontWeight: 800, color: '#0F172A' }}>
                        {trackingData.driver?.name || 'Marcus Sterling'}
                      </div>
                      <span style={{ fontSize: '10.5px', backgroundColor: '#FEF3C7', color: '#B45309', padding: '1px 6px', borderRadius: '4px', fontWeight: 800 }}>
                        ★ {trackingData.driver?.rating || 4.99}
                      </span>
                    </div>
                    <div style={{ fontSize: '12px', color: '#64748B', marginTop: '2px' }}>
                      {trackingData.vehicle?.model || 'Cadillac Escalade ESV'} · <strong style={{ color: '#0F172A' }}>{trackingData.vehicle?.license_plate || 'PA-LIV-9921'}</strong>
                    </div>
                    <div style={{ fontSize: '11px', color: '#0078D4', fontWeight: 600, marginTop: '2px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <ShieldCheck size={13} />
                      <span>Livery Badge: {trackingData.driver?.badge_id || 'PPA-CH-88219'} (Verified)</span>
                    </div>
                  </div>
                </div>

                {/* Call & SMS Buttons */}
                <div style={{ display: 'flex', gap: '8px' }}>
                  <a
                    href={`tel:${trackingData.driver?.phone || '+12155550199'}`}
                    style={{
                      textDecoration: 'none',
                      backgroundColor: '#EFF6FF',
                      color: '#0078D4',
                      border: '1px solid #BFDBFE',
                      padding: '8px 14px',
                      borderRadius: '8px',
                      fontSize: '12px',
                      fontWeight: 700,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px'
                    }}
                  >
                    <Phone size={14} />
                    <span>Call Chauffeur</span>
                  </a>

                  <a
                    href={`sms:${trackingData.driver?.phone || '+12155550199'}`}
                    style={{
                      textDecoration: 'none',
                      backgroundColor: '#0F172A',
                      color: '#FFFFFF',
                      padding: '8px 14px',
                      borderRadius: '8px',
                      fontSize: '12px',
                      fontWeight: 700,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px'
                    }}
                  >
                    <MessageSquare size={14} />
                    <span>SMS</span>
                  </a>
                </div>
              </div>

              {/* Trip Lifecycle Stepper */}
              <div
                style={{
                  backgroundColor: '#FFFFFF',
                  borderRadius: '12px',
                  border: '1px solid #E2E8F0',
                  padding: '16px 18px'
                }}
              >
                <div style={{ fontSize: '11.5px', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', marginBottom: '12px' }}>
                  Trip Lifecycle Progress
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '6px', textAlign: 'center' }}>
                  {[
                    { label: 'Assigned', step: 2 },
                    { label: 'En Route', step: 3 },
                    { label: 'Arrived', step: 4 },
                    { label: 'Onboard', step: 5 },
                    { label: 'Completed', step: 6 }
                  ].map((s) => {
                    const isPassed = currentStep >= s.step;
                    const isCurrent = currentStep === s.step;
                    return (
                      <div key={s.label} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                        <div
                          style={{
                            width: '24px',
                            height: '24px',
                            borderRadius: '50%',
                            backgroundColor: isPassed ? '#10B981' : '#E2E8F0',
                            color: isPassed ? '#FFFFFF' : '#64748B',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '11px',
                            fontWeight: 800,
                            border: isCurrent ? '2px solid #0078D4' : 'none'
                          }}
                        >
                          {isPassed ? <CheckCircle2 size={14} /> : s.step - 1}
                        </div>
                        <span style={{ fontSize: '10.5px', fontWeight: isCurrent ? 800 : 600, color: isCurrent ? '#0078D4' : (isPassed ? '#0F172A' : '#94A3B8') }}>
                          {s.label}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Dev Simulation Bar for Quick Interactive Testing */}
              <div
                style={{
                  backgroundColor: '#FEF3C7',
                  border: '1px solid #FCD34D',
                  borderRadius: '10px',
                  padding: '12px 16px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: '8px'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Zap size={16} color="#B45309" />
                  <span style={{ fontSize: '12px', fontWeight: 700, color: '#92400E' }}>
                    Live GPS Telemetry Simulator (Dev / Field Testing)
                  </span>
                </div>

                <button
                  onClick={handleSimulateGpsMove}
                  disabled={simulating}
                  style={{
                    backgroundColor: '#B45309',
                    color: '#FFFFFF',
                    border: 'none',
                    borderRadius: '6px',
                    padding: '6px 12px',
                    fontSize: '11.5px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}
                >
                  <Navigation size={12} />
                  <span>{simulating ? 'Broadcasting...' : 'Broadcast Next GPS Ping'}</span>
                </button>
              </div>
            </>
          )}

        </div>

        {/* Footer */}
        <div
          style={{
            padding: '14px 24px',
            backgroundColor: '#FFFFFF',
            borderTop: '1px solid #E2E8F0',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}
        >
          <div style={{ fontSize: '11px', color: '#64748B' }}>
            🛰️ Live telemetry updates automatically every 3 seconds
          </div>

          <button
            onClick={onClose}
            style={{
              padding: '9px 20px',
              backgroundColor: '#0078D4',
              color: '#FFFFFF',
              borderRadius: '8px',
              border: 'none',
              fontSize: '12px',
              fontWeight: 800,
              cursor: 'pointer',
              boxShadow: '0 2px 8px rgba(0, 120, 212, 0.3)',
              transition: 'all 0.15s ease'
            }}
          >
            Close Radar
          </button>
        </div>
      </div>
    </div>
  );
};
