import React, { useState } from 'react';
import { 
  Radio, Phone, MessageSquare, AlertTriangle, Plane, 
  Car, UserCheck, ShieldAlert, CheckCircle2, RotateCcw, Clock, ArrowRight, UserPlus
} from 'lucide-react';

interface DispatcherMobileOpsProps {
  session?: any;
  onLogout?: () => void;
}

export const DispatcherMobileOps: React.FC<DispatcherMobileOpsProps> = ({
  session = { full_name: 'David Sterling', role: 'ROLE_DISPATCHER' },
  onLogout = () => {}
}) => {
  const [filter, setFilter] = useState<'ALL' | 'EN_ROUTE' | 'ONBOARD' | 'ALERTS'>('ALL');
  const [reassignModalTrip, setReassignModalTrip] = useState<any | null>(null);

  const [activeTrips, setActiveTrips] = useState([
    {
      id: 'TRP-PHL-881',
      passenger: 'Sir Arthur Davies',
      phone: '+1 (215) 555-9000',
      driver: 'Marcus Brody',
      driverPhone: '+1 (215) 555-0199',
      vehicle: 'Cadillac Escalade ESV (PA-LIMO-01)',
      status: 'EN_ROUTE',
      pickup: 'The Ritz-Carlton Philadelphia',
      dropoff: 'PHL Airport Terminal A',
      flight: 'BA 178 (Touchdown On-Time)',
      etaMins: 4,
      alert: null
    },
    {
      id: 'TRP-PHL-882',
      passenger: 'Eleanor Roosevelt',
      phone: '+1 (215) 555-0144',
      driver: 'Marcus Vance',
      driverPhone: '+1 (215) 555-0188',
      vehicle: 'Mercedes-Benz S 580 (PA-LIMO-02)',
      status: 'ONBOARD',
      pickup: '30th Street Amtrak Station',
      dropoff: 'Comcast Technology Center',
      flight: 'Amtrak Acela #2150',
      etaMins: 12,
      alert: null
    },
    {
      id: 'TRP-PHL-883',
      passenger: 'Jonathan Miller',
      phone: '+1 (215) 555-4411',
      driver: 'Unassigned',
      driverPhone: '',
      vehicle: 'First Class Sedan',
      status: 'PENDING_ASSIGN',
      pickup: 'Four Seasons Hotel Philadelphia',
      dropoff: 'Newark Liberty International (EWR)',
      flight: 'UA 882 (Delayed 25 mins)',
      etaMins: 45,
      alert: 'FLIGHT_DELAY_DETECTED'
    }
  ]);

  const availableDrivers = [
    { name: 'Marcus Brody', vehicle: 'Cadillac Escalade ESV', status: 'ON_DUTY' },
    { name: 'Dave Miller', vehicle: 'Mercedes-Benz S 580', status: 'STANDBY' },
    { name: 'Samuel Vance', vehicle: 'Executive Sprinter Van', status: 'STANDBY' }
  ];

  const handleReassignDriver = (tripId: string, newDriverName: string) => {
    setActiveTrips(prev => prev.map(t => {
      if (t.id === tripId) {
        return { ...t, driver: newDriverName, status: 'EN_ROUTE' };
      }
      return t;
    }));
    setReassignModalTrip(null);
  };

  const filteredTrips = activeTrips.filter(t => {
    if (filter === 'EN_ROUTE') return t.status === 'EN_ROUTE';
    if (filter === 'ONBOARD') return t.status === 'ONBOARD';
    if (filter === 'ALERTS') return t.alert !== null;
    return true;
  });

  return (
    <div style={{ maxWidth: '440px', margin: '0 auto', background: '#FFFFFF', color: '#0F172A', minHeight: '92vh', borderRadius: '28px', overflow: 'hidden', border: '1px solid #E2E8F0', boxShadow: '0 20px 40px rgba(0,0,0,0.08)', display: 'flex', flexDirection: 'column' }}>
      
      {/* Top Mobile Bar */}
      <div style={{ padding: '16px 20px', background: '#F8FAFC', borderBottom: '1px solid #E2E8F0' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#10B981', boxShadow: '0 0 8px #10B981' }} />
            <div>
              <div style={{ fontSize: '10px', color: '#2563EB', fontWeight: 800, letterSpacing: '0.08em' }}>DISPATCHER QUICK-OPS</div>
              <div style={{ fontSize: '14px', fontWeight: 900, color: '#0F172A' }}>ANB Limo Radar ({session.full_name?.split(' ')[0] || 'Dispatch'})</div>
            </div>
          </div>

          <div style={{ textAlign: 'right' }}>
            <span style={{ fontSize: '11px', background: '#DCFCE7', color: '#16A34A', padding: '3px 8px', borderRadius: '6px', fontWeight: 800, border: '1px solid #BBF7D0' }}>
              3 ACTIVE MISSIONS
            </span>
          </div>
        </div>

        {/* Quick Filter Strip */}
        <div style={{ display: 'flex', gap: '4px', marginTop: '12px', background: '#E2E8F0', padding: '3px', borderRadius: '8px' }}>
          {(['ALL', 'EN_ROUTE', 'ONBOARD', 'ALERTS'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              style={{
                flex: 1,
                padding: '6px 0',
                border: 'none',
                borderRadius: '6px',
                fontSize: '10px',
                fontWeight: 800,
                cursor: 'pointer',
                background: filter === f ? '#FFFFFF' : 'transparent',
                color: filter === f ? '#2563EB' : '#64748B',
                boxShadow: filter === f ? '0 1px 3px rgba(0,0,0,0.1)' : 'none'
              }}
            >
              {f === 'ALERTS' ? '⚠️ ALERTS' : f}
            </button>
          ))}
        </div>
      </div>

      {/* Trips Feed */}
      <div style={{ padding: '16px', flex: 1, display: 'flex', flexDirection: 'column', gap: '12px', overflowY: 'auto' }}>
        
        {filteredTrips.map(trip => (
          <div key={trip.id} style={{ background: '#FFFFFF', borderRadius: '16px', padding: '16px', border: trip.alert ? '2px solid #F87171' : '1px solid #E2E8F0', boxShadow: '0 2px 6px rgba(0,0,0,0.04)' }}>
            
            {/* Header with status badge */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <div style={{ fontSize: '12px', fontWeight: 900, color: '#0F172A', fontFamily: 'monospace' }}>
                {trip.id}
              </div>
              <span style={{ 
                fontSize: '10px', 
                fontWeight: 800, 
                padding: '2px 8px', 
                borderRadius: '6px',
                background: trip.status === 'EN_ROUTE' ? '#DBEAFE' : trip.status === 'ONBOARD' ? '#DCFCE7' : '#FEF3C7',
                color: trip.status === 'EN_ROUTE' ? '#1D4ED8' : trip.status === 'ONBOARD' ? '#16A34A' : '#B45309'
              }}>
                {trip.status}
              </span>
            </div>

            {/* Alert banner if flight delayed */}
            {trip.alert && (
              <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: '8px', padding: '8px 10px', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px', color: '#DC2626', fontSize: '11px', fontWeight: 700 }}>
                <AlertTriangle size={14} /> Flight Delayed 25 mins · Auto-Staged Chauffeur
              </div>
            )}

            {/* Passenger & Flight */}
            <div style={{ marginBottom: '10px' }}>
              <div style={{ fontSize: '15px', fontWeight: 800, color: '#0F172A' }}>{trip.passenger}</div>
              <div style={{ fontSize: '11px', color: '#64748B', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
                <Plane size={12} color="#D97706" /> {trip.flight}
              </div>
            </div>

            {/* Route Points */}
            <div style={{ background: '#F8FAFC', borderRadius: '10px', padding: '10px', fontSize: '11px', border: '1px solid #E2E8F0', marginBottom: '10px' }}>
              <div style={{ color: '#0F172A', fontWeight: 600 }}>📍 {trip.pickup}</div>
              <div style={{ color: '#64748B', marginTop: '4px' }}>🏁 {trip.dropoff}</div>
            </div>

            {/* Chauffeur Assignment Strip */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 10px', background: '#F1F5F9', borderRadius: '8px', fontSize: '11px', marginBottom: '10px' }}>
              <div>
                <div style={{ color: '#64748B', fontSize: '9px', fontWeight: 700 }}>ASSIGNED DRIVER</div>
                <div style={{ fontWeight: 800, color: '#0F172A' }}>{trip.driver}</div>
              </div>
              <button 
                onClick={() => setReassignModalTrip(trip)}
                style={{ background: '#FFFFFF', border: '1px solid #CBD5E1', padding: '4px 8px', borderRadius: '6px', fontSize: '10px', fontWeight: 700, color: '#2563EB', cursor: 'pointer' }}
              >
                Reassign
              </button>
            </div>

            {/* Quick Action Dialers */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
              <a 
                href={`tel:${trip.driverPhone || trip.phone}`}
                style={{ background: '#F8FAFC', color: '#0F172A', textDecoration: 'none', padding: '8px', borderRadius: '8px', fontSize: '11px', fontWeight: 700, textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', border: '1px solid #CBD5E1' }}
              >
                <Phone size={12} color="#16A34A" /> Call Driver
              </a>
              <a 
                href={`tel:${trip.phone}`}
                style={{ background: '#F8FAFC', color: '#0F172A', textDecoration: 'none', padding: '8px', borderRadius: '8px', fontSize: '11px', fontWeight: 700, textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', border: '1px solid #CBD5E1' }}
              >
                <Phone size={12} color="#2563EB" /> Call VIP
              </a>
            </div>

          </div>
        ))}

      </div>

      {/* --- REASSIGN CHAUFFEUR BOTTOM SHEET MODAL --- */}
      {reassignModalTrip && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(15,23,42,0.6)', backdropFilter: 'blur(4px)', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
          <div style={{ background: '#FFFFFF', borderTopLeftRadius: '24px', borderTopRightRadius: '24px', padding: '24px', maxWidth: '440px', margin: '0 auto', width: '100%', boxShadow: '0 -10px 30px rgba(0,0,0,0.15)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <div>
                <h3 style={{ fontSize: '16px', fontWeight: 900, color: '#0F172A', margin: 0 }}>Reassign Chauffeur</h3>
                <div style={{ fontSize: '12px', color: '#64748B' }}>Mission #{reassignModalTrip.id} · {reassignModalTrip.passenger}</div>
              </div>
              <button onClick={() => setReassignModalTrip(null)} style={{ background: '#F1F5F9', border: 'none', borderRadius: '50%', width: '32px', height: '32px', cursor: 'pointer', fontWeight: 700 }}>
                ✕
              </button>
            </div>

            <div style={{ display: 'grid', gap: '8px', marginBottom: '16px' }}>
              {availableDrivers.map(d => (
                <button
                  key={d.name}
                  onClick={() => handleReassignDriver(reassignModalTrip.id, d.name)}
                  style={{
                    background: '#F8FAFC',
                    border: '1px solid #E2E8F0',
                    borderRadius: '12px',
                    padding: '12px 16px',
                    textAlign: 'left',
                    cursor: 'pointer',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 800, color: '#0F172A', fontSize: '13px' }}>{d.name}</div>
                    <div style={{ fontSize: '11px', color: '#64748B' }}>{d.vehicle}</div>
                  </div>
                  <span style={{ fontSize: '10px', background: '#DCFCE7', color: '#16A34A', padding: '2px 8px', borderRadius: '6px', fontWeight: 800 }}>
                    {d.status}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <div style={{ padding: '12px', textAlign: 'center', background: '#F8FAFC', borderTop: '1px solid #E2E8F0', fontSize: '11px', color: '#64748B', fontWeight: 600 }}>
        ANB Limo Dispatcher Mobile Gateway · 256-Bit SSL
      </div>
    </div>
  );
};
