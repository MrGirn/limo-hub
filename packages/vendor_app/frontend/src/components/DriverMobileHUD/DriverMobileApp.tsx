import React, { useState, useEffect, useRef } from 'react';
import { 
  Navigation, Phone, MessageSquare, CheckCircle2, DollarSign, 
  MapPin, Plane, ShieldCheck, QrCode, ExternalLink, X, ChevronRight, 
  Fuel, UserCheck, Radio, PenTool, BatteryCharging, Compass, AlertCircle
} from 'lucide-react';

interface DriverMobileAppProps {
  session?: any;
  onLogout?: () => void;
}

export const DriverMobileApp: React.FC<DriverMobileAppProps> = ({ 
  session = { full_name: 'Marcus Brody', vendor_id: 'vendor_anb_philly' }, 
  onLogout = () => {} 
}) => {
  const [tripState, setTripState] = useState<'EN_ROUTE' | 'ARRIVED' | 'PASSENGER_ONBOARD' | 'SIGNATURE' | 'COMPLETED'>('EN_ROUTE');
  const [showGreetingSign, setShowGreetingSign] = useState(false);
  const [showSignatureModal, setShowSignatureModal] = useState(false);
  const [todayEarnings, setTodayEarnings] = useState(415.00);
  const [isBroadcastingGps, setIsBroadcastingGps] = useState(true);
  const [gpsTelemetry, setGpsTelemetry] = useState({ lat: 39.9526, lng: -75.1652, speed: '42 mph', heading: 'SW 210°' });

  // Signature Canvas state
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasSignature, setHasSignature] = useState(false);

  const passenger = {
    name: 'Sir Arthur Davies',
    phone: '+1 (215) 555-9000',
    flight: 'BA 178 (Touchdown On-Time · Gate A14)',
    pickup: 'The Ritz-Carlton, 10 Ave of the Arts, Philadelphia, PA',
    destination: 'Philadelphia International Airport (PHL) Terminal A (VIP Gate)',
    vehicle: 'Cadillac Escalade ESV (Plate: PA-LIMO-01)',
    payout: 175.00,
    grossFare: 250.00,
    gratuity: 50.00
  };

  useEffect(() => {
    if (!isBroadcastingGps) return;
    const interval = setInterval(() => {
      setGpsTelemetry(prev => ({
        lat: Number((prev.lat + 0.0004).toFixed(5)),
        lng: Number((prev.lng - 0.0003).toFixed(5)),
        speed: `${Math.floor(38 + Math.random() * 12)} mph`,
        heading: 'SW 215°'
      }));
    }, 3000);
    return () => clearInterval(interval);
  }, [isBroadcastingGps]);

  const handleOpenMaps = (address: string, app: 'google' | 'apple' | 'waze') => {
    const encoded = encodeURIComponent(address);
    if (app === 'apple') {
      window.open(`maps://?daddr=${encoded}`, '_blank');
    } else if (app === 'waze') {
      window.open(`https://waze.com/ul?q=${encoded}`, '_blank');
    } else {
      window.open(`https://www.google.com/maps/dir/?api=1&destination=${encoded}`, '_blank');
    }
  };

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    setIsDrawing(true);
    setHasSignature(true);
    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    ctx.beginPath();
    ctx.moveTo(clientX - rect.left, clientY - rect.top);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#2563EB';
    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    ctx.lineTo(clientX - rect.left, clientY - rect.top);
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearSignature = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasSignature(false);
  };

  const handleCompleteTrip = () => {
    setTripState('COMPLETED');
    setTodayEarnings(prev => prev + passenger.payout);
  };

  return (
    <div style={{ maxWidth: '440px', margin: '0 auto', background: '#FFFFFF', color: '#0F172A', minHeight: '92vh', borderRadius: '28px', overflow: 'hidden', border: '1px solid #E2E8F0', boxShadow: '0 20px 40px rgba(0,0,0,0.08)', display: 'flex', flexDirection: 'column' }}>
      
      {/* --- FULLSCREEN DIGITAL IPAD GREETING SIGN MODAL (LIGHT LUXURY GOLD) --- */}
      {showGreetingSign && (
        <div style={{ 
          position: 'fixed', 
          inset: 0, 
          zIndex: 9999, 
          background: '#FFFBEB', 
          display: 'flex', 
          flexDirection: 'column', 
          justifyContent: 'space-between', 
          padding: '32px 24px',
          border: '12px solid #D97706'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '13px', fontWeight: '900', letterSpacing: '0.15em', color: '#B45309' }}>
              👑 EXECUTIVE MEET & GREET
            </span>
            <button 
              onClick={() => setShowGreetingSign(false)}
              style={{ background: '#FFFFFF', color: '#0F172A', border: '1px solid #CBD5E1', borderRadius: '50%', width: '44px', height: '44px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', boxShadow: '0 2px 6px rgba(0,0,0,0.1)' }}
            >
              <X size={24} />
            </button>
          </div>

          <div style={{ textAlign: 'center', margin: 'auto 0' }}>
            <div style={{ fontSize: '18px', color: '#92400E', textTransform: 'uppercase', letterSpacing: '0.2em', marginBottom: '12px', fontWeight: 700 }}>
              WELCOME TO PHILADELPHIA
            </div>
            <h1 style={{ 
              fontSize: '48px', 
              fontWeight: '900', 
              color: '#0F172A', 
              lineHeight: 1.1,
              textTransform: 'uppercase',
              letterSpacing: '0.04em',
              margin: '0 0 16px 0'
            }}>
              {passenger.name}
            </h1>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '10px', background: '#FFFFFF', padding: '10px 24px', borderRadius: '999px', border: '2px solid #D97706', boxShadow: '0 4px 12px rgba(217,119,6,0.15)' }}>
              <Plane size={18} color="#D97706" />
              <span style={{ fontSize: '15px', fontWeight: '800', color: '#92400E' }}>Flight BA 178 · Terminal A Gate 14</span>
            </div>
          </div>

          <div style={{ textAlign: 'center', borderTop: '1px solid #FDE68A', paddingTop: '16px', color: '#78350F', fontSize: '13px', fontWeight: 600 }}>
            ANB Limo Executive Chauffeur Fleet · Tap ✕ to return to HUD
          </div>
        </div>
      )}

      {/* --- DIGITAL SIGNATURE & LUGGAGE SIGN-OFF MODAL --- */}
      {showSignatureModal && (
        <div style={{ 
          position: 'fixed', 
          inset: 0, 
          zIndex: 9998, 
          background: 'rgba(15, 23, 42, 0.6)', 
          backdropFilter: 'blur(6px)',
          display: 'flex', 
          flexDirection: 'column', 
          justifyContent: 'center', 
          padding: '24px' 
        }}>
          <div style={{ background: '#FFFFFF', borderRadius: '20px', padding: '24px', border: '1px solid #E2E8F0', maxWidth: '400px', margin: '0 auto', width: '100%', boxShadow: '0 20px 40px rgba(0,0,0,0.2)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <PenTool size={18} color="#2563EB" />
                <h3 style={{ fontSize: '16px', fontWeight: '800', margin: 0, color: '#0F172A' }}>VIP Luggage & Ride Sign-Off</h3>
              </div>
              <button onClick={() => setShowSignatureModal(false)} style={{ background: 'transparent', border: 'none', color: '#64748B', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>
            
            <p style={{ fontSize: '12px', color: '#64748B', marginBottom: '16px' }}>
              Passenger or Aviation Handler acknowledges 3 pieces of luggage safely stowed.
            </p>

            {/* Canvas Pad */}
            <div style={{ background: '#F8FAFC', borderRadius: '12px', border: '2px dashed #CBD5E1', overflow: 'hidden', touchAction: 'none' }}>
              <canvas 
                ref={canvasRef}
                width={350}
                height={160}
                onMouseDown={startDrawing}
                onMouseMove={draw}
                onMouseUp={stopDrawing}
                onMouseLeave={stopDrawing}
                onTouchStart={startDrawing}
                onTouchMove={draw}
                onTouchEnd={stopDrawing}
                style={{ width: '100%', height: '160px', display: 'block', cursor: 'crosshair' }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '14px' }}>
              <button 
                onClick={clearSignature}
                style={{ background: '#F1F5F9', color: '#475569', border: '1px solid #CBD5E1', padding: '6px 12px', borderRadius: '6px', fontSize: '11px', fontWeight: 700, cursor: 'pointer' }}
              >
                Clear Pad
              </button>
              <button 
                disabled={!hasSignature}
                onClick={() => {
                  setShowSignatureModal(false);
                  setTripState('PASSENGER_ONBOARD');
                }}
                style={{ 
                  background: hasSignature ? '#2563EB' : '#E2E8F0', 
                  color: hasSignature ? '#FFFFFF' : '#94A3B8', 
                  border: 'none', 
                  padding: '8px 16px', 
                  borderRadius: '8px', 
                  fontSize: '12px', 
                  fontWeight: '700', 
                  cursor: hasSignature ? 'pointer' : 'not-allowed' 
                }}
              >
                Confirm Signature & Depart
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- TOP HUD BAR --- */}
      <div style={{ padding: '14px 18px', background: '#F8FAFC', borderBottom: '1px solid #E2E8F0' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: '38px', height: '38px', borderRadius: '50%', background: '#FEF3C7', color: '#B45309', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '800', fontSize: '14px', border: '2px solid #F59E0B' }}>
              {session.full_name?.split(' ').map((n: string) => n[0]).join('') || 'MB'}
            </div>
            <div>
              <div style={{ fontSize: '10px', color: '#B45309', fontWeight: '800', letterSpacing: '0.08em' }}>CHAUFFEUR MOBILE HUD</div>
              <div style={{ fontSize: '14px', fontWeight: '800', color: '#0F172A' }}>{session.full_name || 'Marcus Brody'}</div>
            </div>
          </div>

          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '10px', color: '#64748B', fontWeight: 600 }}>TODAY'S PAY</div>
            <div style={{ fontSize: '16px', fontWeight: '900', color: '#16A34A' }}>${todayEarnings.toFixed(2)}</div>
          </div>
        </div>

        {/* Live Telemetry Status Strip */}
        <div style={{ marginTop: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#FFFFFF', padding: '6px 12px', borderRadius: '8px', border: '1px solid #E2E8F0', fontSize: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: isBroadcastingGps ? '#16A34A' : '#EF4444' }}>
            <Radio size={12} className={isBroadcastingGps ? 'animate-pulse' : ''} />
            <span style={{ fontWeight: '800' }}>{isBroadcastingGps ? 'GPS RADAR: LIVE (30s)' : 'GPS OFFLINE'}</span>
          </div>
          <div style={{ color: '#64748B', display: 'flex', gap: '8px', fontWeight: 600 }}>
            <span>{gpsTelemetry.speed}</span>
            <span>{gpsTelemetry.heading}</span>
            <span style={{ color: '#2563EB' }}>{gpsTelemetry.lat}, {gpsTelemetry.lng}</span>
          </div>
        </div>
      </div>

      {/* --- MAIN HUD CONTENT --- */}
      <div style={{ padding: '18px', flex: 1, display: 'flex', flexDirection: 'column', gap: '14px', overflowY: 'auto' }}>
        
        {/* Active Mission Card */}
        <div style={{ background: '#FFFFFF', borderRadius: '20px', padding: '18px', border: '1px solid #E2E8F0', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <span style={{ fontSize: '10px', fontWeight: '800', background: '#DCFCE7', color: '#16A34A', padding: '3px 8px', borderRadius: '6px', border: '1px solid #BBF7D0' }}>
              ASSIGNED MISSION #TRP-881
            </span>
            <div style={{ textAlign: 'right' }}>
              <span style={{ fontSize: '10px', color: '#64748B', fontWeight: 600 }}>YOUR NET PAY: </span>
              <strong style={{ fontSize: '16px', color: '#D97706' }}>${passenger.payout.toFixed(2)}</strong>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '14px' }}>
            <div>
              <h2 style={{ fontSize: '18px', fontWeight: '900', color: '#0F172A', margin: 0 }}>{passenger.name}</h2>
              <div style={{ fontSize: '12px', color: '#64748B', marginTop: '2px', fontWeight: 500 }}>{passenger.vehicle}</div>
            </div>
            <button 
              onClick={() => setShowGreetingSign(true)}
              style={{ 
                background: '#FEF3C7', 
                border: '1px solid #FDE68A', 
                color: '#B45309', 
                padding: '6px 12px', 
                borderRadius: '8px', 
                fontSize: '11px', 
                fontWeight: '800', 
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '5px'
              }}
            >
              🪧 iPad Sign
            </button>
          </div>

          {/* Turn-by-Turn Route Points with Deep Link Launchers */}
          <div style={{ display: 'grid', gap: '12px', background: '#F8FAFC', padding: '14px', borderRadius: '14px', border: '1px solid #E2E8F0' }}>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                <div style={{ color: '#64748B', fontSize: '10px', fontWeight: '800' }}>1. PICKUP ADDRESS</div>
                <div style={{ display: 'flex', gap: '4px' }}>
                  <button 
                    onClick={() => handleOpenMaps(passenger.pickup, 'google')}
                    style={{ background: '#FFFFFF', color: '#2563EB', border: '1px solid #CBD5E1', padding: '2px 6px', borderRadius: '4px', fontSize: '9px', fontWeight: '700', cursor: 'pointer' }}
                  >
                    Google
                  </button>
                  <button 
                    onClick={() => handleOpenMaps(passenger.pickup, 'apple')}
                    style={{ background: '#FFFFFF', color: '#7C3AED', border: '1px solid #CBD5E1', padding: '2px 6px', borderRadius: '4px', fontSize: '9px', fontWeight: '700', cursor: 'pointer' }}
                  >
                    Apple
                  </button>
                  <button 
                    onClick={() => handleOpenMaps(passenger.pickup, 'waze')}
                    style={{ background: '#FFFFFF', color: '#16A34A', border: '1px solid #CBD5E1', padding: '2px 6px', borderRadius: '4px', fontSize: '9px', fontWeight: '700', cursor: 'pointer' }}
                  >
                    Waze
                  </button>
                </div>
              </div>
              <div style={{ color: '#0F172A', fontSize: '12px', fontWeight: '600' }}>{passenger.pickup}</div>
            </div>

            <div style={{ borderTop: '1px solid #E2E8F0', paddingTop: '10px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                <div style={{ color: '#64748B', fontSize: '10px', fontWeight: '800' }}>2. DESTINATION (AIRPORT RADAR)</div>
                <div style={{ display: 'flex', gap: '4px' }}>
                  <button 
                    onClick={() => handleOpenMaps(passenger.destination, 'google')}
                    style={{ background: '#FFFFFF', color: '#2563EB', border: '1px solid #CBD5E1', padding: '2px 6px', borderRadius: '4px', fontSize: '9px', fontWeight: '700', cursor: 'pointer' }}
                  >
                    Google
                  </button>
                  <button 
                    onClick={() => handleOpenMaps(passenger.destination, 'apple')}
                    style={{ background: '#FFFFFF', color: '#7C3AED', border: '1px solid #CBD5E1', padding: '2px 6px', borderRadius: '4px', fontSize: '9px', fontWeight: '700', cursor: 'pointer' }}
                  >
                    Apple
                  </button>
                </div>
              </div>
              <div style={{ color: '#0F172A', fontSize: '12px', fontWeight: '600' }}>{passenger.destination}</div>
              <div style={{ fontSize: '11px', color: '#B45309', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 600 }}>
                <Plane size={12} /> {passenger.flight}
              </div>
            </div>
          </div>

          {/* Direct Passenger Contact Bar */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginTop: '12px' }}>
            <a 
              href={`tel:${passenger.phone}`} 
              style={{ background: '#F8FAFC', color: '#0F172A', textDecoration: 'none', padding: '10px', borderRadius: '10px', fontSize: '12px', fontWeight: '700', textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', border: '1px solid #CBD5E1' }}
            >
              <Phone size={14} color="#16A34A" /> Call Passenger
            </a>
            <a 
              href={`sms:${passenger.phone}`} 
              style={{ background: '#F8FAFC', color: '#0F172A', textDecoration: 'none', padding: '10px', borderRadius: '10px', fontSize: '12px', fontWeight: '700', textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', border: '1px solid #CBD5E1' }}
            >
              <MessageSquare size={14} color="#2563EB" /> Text Message
            </a>
          </div>
        </div>

        {/* --- LARGE CHAUFFEUR LIFECYCLE ACTION BUTTONS --- */}
        <div style={{ marginTop: 'auto', display: 'grid', gap: '10px' }}>
          {tripState === 'EN_ROUTE' && (
            <button
              onClick={() => setTripState('ARRIVED')}
              style={{ background: '#2563EB', color: '#FFFFFF', padding: '16px', borderRadius: '14px', border: 'none', fontWeight: '800', fontSize: '15px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', boxShadow: '0 4px 12px rgba(37,99,235,0.25)' }}
            >
              <Navigation size={18} /> I HAVE ARRIVED ON-SITE (NOTIFY VIP)
            </button>
          )}

          {tripState === 'ARRIVED' && (
            <div style={{ display: 'grid', gap: '8px' }}>
              <button
                onClick={() => setShowSignatureModal(true)}
                style={{ background: '#7C3AED', color: '#FFFFFF', padding: '13px', borderRadius: '12px', border: 'none', fontWeight: '800', fontSize: '14px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', boxShadow: '0 2px 8px rgba(124,58,237,0.2)' }}
              >
                <PenTool size={16} /> Luggage / Tarmac Sign-Off Pad
              </button>
              <button
                onClick={() => setTripState('PASSENGER_ONBOARD')}
                style={{ background: '#D97706', color: '#FFFFFF', padding: '15px', borderRadius: '12px', border: 'none', fontWeight: '800', fontSize: '15px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', boxShadow: '0 4px 12px rgba(217,119,6,0.25)' }}
              >
                <UserCheck size={18} /> PASSENGER ONBOARD & DEPART
              </button>
            </div>
          )}

          {tripState === 'PASSENGER_ONBOARD' && (
            <button
              onClick={handleCompleteTrip}
              style={{ background: '#059669', color: '#FFFFFF', padding: '16px', borderRadius: '14px', border: 'none', fontWeight: '800', fontSize: '15px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', boxShadow: '0 4px 12px rgba(5,150,105,0.25)' }}
            >
              <DollarSign size={18} /> COMPLETE TRIP & COLLECT ${passenger.payout.toFixed(2)}
            </button>
          )}

          {tripState === 'COMPLETED' && (
            <div style={{ background: '#ECFDF5', padding: '18px', borderRadius: '16px', textAlign: 'center', color: '#065F46', border: '1px solid #A7F3D0' }}>
              <CheckCircle2 size={30} style={{ margin: '0 auto 6px auto', color: '#10B981' }} />
              <div style={{ fontSize: '17px', fontWeight: '900', color: '#065F46' }}>Mission Completed!</div>
              <div style={{ fontSize: '12px', color: '#047857', marginTop: '4px', fontWeight: 600 }}>
                ${passenger.payout.toFixed(2)} transferred instantly to your Stripe Connect card.
              </div>
              <button 
                onClick={() => setTripState('EN_ROUTE')}
                style={{ marginTop: '12px', background: '#059669', color: '#FFFFFF', border: 'none', padding: '8px 16px', borderRadius: '8px', fontSize: '12px', fontWeight: '700', cursor: 'pointer' }}
              >
                Ready for Next Assignment
              </button>
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', background: '#F8FAFC', borderRadius: '10px', fontSize: '11px', color: '#64748B', border: '1px solid #E2E8F0' }}>
            <span>Stripe Connect: <strong style={{ color: '#16A34A' }}>Instant Payouts Active</strong></span>
            <button onClick={onLogout} style={{ background: 'transparent', color: '#EF4444', border: 'none', fontWeight: '700', cursor: 'pointer' }}>
              End Shift
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
