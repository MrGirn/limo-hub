import React, { useState, useEffect } from 'react';
import { 
  Navigation, Phone, MessageSquare, ShieldCheck, MapPin, 
  Plane, Sparkles, Clock, CheckCircle2, ChevronRight, VolumeX, Thermometer, Droplets, Car
} from 'lucide-react';

interface PassengerLiveTrackingProps {
  tripId?: string;
  onBackToPortal?: () => void;
}

export const PassengerLiveTracking: React.FC<PassengerLiveTrackingProps> = ({ 
  tripId = 'TRP-PHL-88129', 
  onBackToPortal 
}) => {
  const [tripStatus, setTripStatus] = useState<'EN_ROUTE' | 'ARRIVED' | 'IN_TRANSIT' | 'COMPLETED'>('EN_ROUTE');
  const [etaMinutes, setEtaMinutes] = useState(4);
  const [carPosition, setCarPosition] = useState({ progress: 65 });
  const [quietMode, setQuietMode] = useState(true);
  const [cabinTemp, setCabinTemp] = useState('68°F');
  const [doorAlertSent, setDoorAlertSent] = useState(false);

  const chauffeur = {
    name: 'Marcus Brody',
    title: 'Senior Master Chauffeur · Secret Service Verified',
    rating: '4.99 ★ (1,480 VIP Trips)',
    phone: '+1 (215) 555-0199',
    avatar: 'MB',
    vehicle: 'Cadillac Escalade ESV (Black Edition)',
    plate: 'PA-LIMO-01',
    company: 'ANB Limo Executive Chauffeurs',
    pickup: 'The Ritz-Carlton, 10 Ave of the Arts, Philadelphia, PA',
    destination: 'Philadelphia International Airport (PHL) Terminal A (VIP Gate)',
    flight: 'British Airways BA 178'
  };

  useEffect(() => {
    const interval = setInterval(() => {
      setCarPosition(prev => {
        if (prev.progress >= 100) return { progress: 100 };
        return { progress: prev.progress + 2 };
      });
    }, 4000);

    return () => clearInterval(interval);
  }, []);

  const handleSendLocationPing = (door: string) => {
    setDoorAlertSent(true);
    setTimeout(() => setDoorAlertSent(false), 4000);
  };

  return (
    <div style={{ maxWidth: '440px', margin: '0 auto', background: '#FFFFFF', color: '#0F172A', minHeight: '92vh', borderRadius: '28px', overflow: 'hidden', border: '1px solid #E2E8F0', boxShadow: '0 20px 40px rgba(0,0,0,0.08)', display: 'flex', flexDirection: 'column' }}>
      
      {/* --- TOP STATUS & BRAND BAR --- */}
      <div style={{ padding: '16px 20px', background: '#F8FAFC', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #E2E8F0' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#10B981', boxShadow: '0 0 8px #10B981' }} />
          <span style={{ fontSize: '11px', fontWeight: '800', letterSpacing: '0.08em', color: '#2563EB' }}>LIVE VIP RADAR</span>
        </div>

        <div style={{ fontSize: '11px', color: '#64748B', fontFamily: 'monospace', fontWeight: '700' }}>
          TRIP: {tripId}
        </div>
      </div>

      {/* --- INTERACTIVE MAP SIMULATION HUD (LIGHT THEME) --- */}
      <div style={{ 
        height: '240px', 
        background: 'linear-gradient(180deg, #F1F5F9 0%, #E2E8F0 100%)', 
        position: 'relative', 
        overflow: 'hidden',
        borderBottom: '1px solid #CBD5E1'
      }}>
        {/* Radar grid lines */}
        <div style={{
          position: 'absolute',
          inset: 0,
          backgroundImage: 'radial-gradient(#CBD5E1 1px, transparent 1px)',
          backgroundSize: '20px 20px',
          opacity: 0.8
        }} />

        {/* Route Line */}
        <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}>
          <line x1="40" y1="180" x2="380" y2="60" stroke="#94A3B8" strokeWidth="6" strokeLinecap="round" />
          <line 
            x1="40" 
            y1="180" 
            x2={40 + (340 * (carPosition.progress / 100))} 
            y2={180 - (120 * (carPosition.progress / 100))} 
            stroke="#2563EB" 
            strokeWidth="6" 
            strokeLinecap="round" 
          />
        </svg>

        {/* Origin Marker */}
        <div style={{ position: 'absolute', left: '30px', top: '165px', textAlign: 'center' }}>
          <div style={{ width: '22px', height: '22px', borderRadius: '50%', background: '#2563EB', border: '3px solid #FFFFFF', boxShadow: '0 2px 8px rgba(37,99,235,0.4)', margin: '0 auto' }} />
          <div style={{ fontSize: '9px', fontWeight: '800', color: '#334155', marginTop: '4px' }}>Ritz-Carlton</div>
        </div>

        {/* Moving Chauffeur Vehicle Marker */}
        <div style={{ 
          position: 'absolute', 
          left: `${Math.min(350, 25 + (340 * (carPosition.progress / 100)))}px`, 
          top: `${Math.max(45, 165 - (120 * (carPosition.progress / 100)))}px`,
          transform: 'translate(-50%, -50%)',
          transition: 'all 1s ease-in-out',
          zIndex: 10
        }}>
          <div style={{ 
            background: '#D97706', 
            color: '#FFFFFF', 
            borderRadius: '50%', 
            width: '38px', 
            height: '38px', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            boxShadow: '0 4px 14px rgba(217,119,6,0.5)',
            border: '3px solid #FFFFFF'
          }}>
            <Car size={18} />
          </div>
          <div style={{ 
            background: '#FFFFFF', 
            border: '1px solid #D97706', 
            padding: '2px 6px', 
            borderRadius: '4px', 
            fontSize: '9px', 
            fontWeight: '800', 
            color: '#B45309', 
            whiteSpace: 'nowrap',
            marginTop: '2px',
            textAlign: 'center',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
          }}>
            MARCUS (ESCALADE)
          </div>
        </div>

        {/* Destination Marker */}
        <div style={{ position: 'absolute', right: '30px', top: '45px', textAlign: 'center' }}>
          <div style={{ width: '22px', height: '22px', borderRadius: '50%', background: '#10B981', border: '3px solid #FFFFFF', boxShadow: '0 2px 8px rgba(16,185,129,0.4)', margin: '0 auto' }} />
          <div style={{ fontSize: '9px', fontWeight: '800', color: '#047857', marginTop: '4px' }}>PHL Terminal A</div>
        </div>

        {/* Live Floating ETA Pill */}
        <div style={{ 
          position: 'absolute', 
          top: '12px', 
          left: '12px', 
          background: 'rgba(255, 255, 255, 0.95)', 
          backdropFilter: 'blur(8px)',
          border: '1px solid #CBD5E1', 
          borderRadius: '10px', 
          padding: '6px 12px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.06)'
        }}>
          <Clock size={14} color="#2563EB" />
          <div>
            <div style={{ fontSize: '9px', color: '#64748B', fontWeight: 600 }}>ESTIMATED ARRIVAL</div>
            <div style={{ fontSize: '13px', fontWeight: '900', color: '#0F172A' }}>
              {etaMinutes} MINS AWAY · ON-TIME
            </div>
          </div>
        </div>
      </div>

      {/* --- PASSENGER CONTROLS & CHAUFFEUR CARD --- */}
      <div style={{ padding: '18px', flex: 1, display: 'flex', flexDirection: 'column', gap: '14px', overflowY: 'auto' }}>
        
        {/* Chauffeur Card */}
        <div style={{ background: '#FFFFFF', borderRadius: '18px', padding: '18px', border: '1px solid #E2E8F0', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div style={{ width: '50px', height: '50px', borderRadius: '50%', background: '#FEF3C7', color: '#B45309', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '900', fontSize: '18px', border: '2px solid #F59E0B' }}>
              {chauffeur.avatar}
            </div>

            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <h3 style={{ fontSize: '16px', fontWeight: '800', color: '#0F172A', margin: 0 }}>{chauffeur.name}</h3>
                <ShieldCheck size={16} color="#16A34A" />
              </div>
              <div style={{ fontSize: '11px', color: '#64748B', marginTop: '2px', fontWeight: 500 }}>{chauffeur.title}</div>
              <div style={{ fontSize: '11px', color: '#D97706', fontWeight: '700', marginTop: '2px' }}>{chauffeur.rating}</div>
            </div>
          </div>

          <div style={{ borderTop: '1px solid #F1F5F9', marginTop: '14px', paddingTop: '12px', display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '8px', fontSize: '12px' }}>
            <div>
              <div style={{ color: '#64748B', fontSize: '10px', fontWeight: 600 }}>VEHICLE</div>
              <strong style={{ color: '#0F172A', fontSize: '12px' }}>{chauffeur.vehicle}</strong>
            </div>
            <div>
              <div style={{ color: '#64748B', fontSize: '10px', fontWeight: 600 }}>LICENSE PLATE</div>
              <strong style={{ color: '#2563EB', fontSize: '12px', fontFamily: 'monospace' }}>{chauffeur.plate}</strong>
            </div>
          </div>

          {/* Secure 1-Tap Call/SMS */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginTop: '14px' }}>
            <a 
              href={`tel:${chauffeur.phone}`} 
              style={{ background: '#F8FAFC', color: '#0F172A', textDecoration: 'none', padding: '10px', borderRadius: '10px', fontSize: '12px', fontWeight: '700', textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', border: '1px solid #CBD5E1' }}
            >
              <Phone size={14} color="#16A34A" /> Call Chauffeur
            </a>
            <a 
              href={`sms:${chauffeur.phone}`} 
              style={{ background: '#F8FAFC', color: '#0F172A', textDecoration: 'none', padding: '10px', borderRadius: '10px', fontSize: '12px', fontWeight: '700', textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', border: '1px solid #CBD5E1' }}
            >
              <MessageSquare size={14} color="#2563EB" /> Text Chauffeur
            </a>
          </div>
        </div>

        {/* Quick Curbside Location Notification */}
        <div style={{ background: '#FFFFFF', borderRadius: '16px', padding: '16px', border: '1px solid #E2E8F0', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
          <div style={{ fontSize: '11px', fontWeight: '800', color: '#475569', marginBottom: '8px' }}>
            WHERE ARE YOU WAITING? (NOTIFY CHAUFFEUR)
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
            <button 
              onClick={() => handleSendLocationPing('Front Lobby')}
              style={{ background: '#F8FAFC', color: '#0F172A', border: '1px solid #CBD5E1', padding: '8px', borderRadius: '8px', fontSize: '11px', fontWeight: '700', cursor: 'pointer' }}
            >
              🏨 Front Lobby
            </button>
            <button 
              onClick={() => handleSendLocationPing('Baggage Door 3')}
              style={{ background: '#F8FAFC', color: '#0F172A', border: '1px solid #CBD5E1', padding: '8px', borderRadius: '8px', fontSize: '11px', fontWeight: '700', cursor: 'pointer' }}
            >
              🚪 Baggage Door 3
            </button>
          </div>
          {doorAlertSent && (
            <div style={{ marginTop: '8px', fontSize: '11px', color: '#16A34A', textAlign: 'center', fontWeight: '700' }}>
              ✓ Chauffeur notified: "Passenger waiting at location"
            </div>
          )}
        </div>

        {/* In-Car VIP Amenities Preferences */}
        <div style={{ background: '#FFFFFF', borderRadius: '16px', padding: '16px', border: '1px solid #E2E8F0', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
            <div style={{ fontSize: '11px', fontWeight: '800', color: '#475569' }}>IN-CABIN PREFERENCES</div>
            <Sparkles size={14} color="#D97706" />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
            <button 
              onClick={() => setQuietMode(!quietMode)}
              style={{ 
                background: quietMode ? '#DBEAFE' : '#F8FAFC', 
                border: quietMode ? '1px solid #2563EB' : '1px solid #CBD5E1',
                color: quietMode ? '#1D4ED8' : '#64748B',
                padding: '8px', 
                borderRadius: '8px', 
                fontSize: '11px', 
                fontWeight: '700', 
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                justifyContent: 'center'
              }}
            >
              <VolumeX size={14} /> Quiet Ride Mode
            </button>

            <button 
              onClick={() => setCabinTemp(cabinTemp === '68°F' ? '72°F' : '68°F')}
              style={{ 
                background: '#F8FAFC', 
                border: '1px solid #CBD5E1',
                color: '#0F172A',
                padding: '8px', 
                borderRadius: '8px', 
                fontSize: '11px', 
                fontWeight: '700', 
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                justifyContent: 'center'
              }}
            >
              <Thermometer size={14} color="#EF4444" /> Cabin: {cabinTemp}
            </button>
          </div>
        </div>

        {/* Flight & Destination Info */}
        <div style={{ background: '#F8FAFC', borderRadius: '14px', padding: '14px', border: '1px solid #E2E8F0', fontSize: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#B45309', fontWeight: '800', marginBottom: '4px' }}>
            <Plane size={14} /> {chauffeur.flight}
          </div>
          <div style={{ color: '#64748B', fontSize: '11px', fontWeight: 500 }}>
            Destination: {chauffeur.destination}
          </div>
        </div>

      </div>

      {/* Footer */}
      <div style={{ padding: '12px', textAlign: 'center', background: '#F8FAFC', borderTop: '1px solid #E2E8F0', fontSize: '11px', color: '#64748B', fontWeight: 600 }}>
        {chauffeur.company} · 256-Bit SSL Telemetry
      </div>
    </div>
  );
};
