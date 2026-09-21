import React, { useState } from 'react';
import { VendorLoginModal } from './components/VendorAuth/VendorLoginModal';
import { VendorPublicPortal } from './components/VendorPublicBooking/VendorPublicPortal';
import { VendorDispatchRadar } from './components/VendorOperationsDesk/VendorDispatchRadar';
import { DriverMobileApp } from './components/DriverMobileHUD/DriverMobileApp';
import { PassengerLiveTracking } from './components/PassengerLiveTracking/PassengerLiveTracking';
import { DispatcherMobileOps } from './components/DispatcherMobileOps/DispatcherMobileOps';
import { Shield, Car, Radio, Globe, LogIn, LogOut, Smartphone } from 'lucide-react';

export const App: React.FC = () => {
  const [viewMode, setViewMode] = useState<'OPS_DASHBOARD' | 'PASSENGER_TRACKING' | 'DRIVER_HUD' | 'DISPATCHER_MOBILE' | 'PUBLIC_BOOKING'>('OPS_DASHBOARD');
  const [session, setSession] = useState<any | null>({
    full_name: 'David Sterling',
    role: 'ROLE_DISPATCHER',
    department: 'Fleet Logistics & Tariff Operations',
    vendor_id: 'vendor_anb_philly'
  });

  return (
    <div style={{ minHeight: '100vh', background: '#F8FAFC', color: '#0F172A', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      {/* Top Navigation Bar */}
      <header style={{
        background: '#FFFFFF',
        color: '#0F172A',
        padding: '12px 24px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderBottom: '1px solid #E2E8F0',
        boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
        flexWrap: 'wrap',
        gap: '12px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ background: '#2563EB', padding: '7px', borderRadius: '10px', boxShadow: '0 2px 6px rgba(37,99,235,0.25)' }}>
            <Car size={18} color="#FFFFFF" />
          </div>
          <div>
            <div style={{ fontSize: '15px', fontWeight: 900, color: '#0F172A', letterSpacing: '-0.02em' }}>ANB LIMO PHILADELPHIA</div>
            <div style={{ fontSize: '11px', color: '#64748B', fontWeight: 600 }}>Sovereign Vendor Operating System</div>
          </div>
        </div>

        {/* View Switcher Tabs - Clean Light Mode Pills */}
        <div style={{ display: 'flex', gap: '4px', background: '#F1F5F9', padding: '4px', borderRadius: '10px', border: '1px solid #E2E8F0', flexWrap: 'wrap' }}>
          <button
            onClick={() => setViewMode('OPS_DASHBOARD')}
            style={{
              padding: '6px 14px',
              borderRadius: '8px',
              fontSize: '12px',
              fontWeight: 800,
              border: 'none',
              background: viewMode === 'OPS_DASHBOARD' ? '#FFFFFF' : 'transparent',
              color: viewMode === 'OPS_DASHBOARD' ? '#2563EB' : '#64748B',
              boxShadow: viewMode === 'OPS_DASHBOARD' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
              cursor: 'pointer'
            }}
          >
            📡 Operations Dashboard
          </button>

          <button
            onClick={() => setViewMode('PASSENGER_TRACKING')}
            style={{
              padding: '6px 14px',
              borderRadius: '8px',
              fontSize: '12px',
              fontWeight: 800,
              border: 'none',
              background: viewMode === 'PASSENGER_TRACKING' ? '#FFFFFF' : 'transparent',
              color: viewMode === 'PASSENGER_TRACKING' ? '#0284C7' : '#64748B',
              boxShadow: viewMode === 'PASSENGER_TRACKING' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
              cursor: 'pointer'
            }}
          >
            📱 Passenger Live VIP Tracker
          </button>

          <button
            onClick={() => setViewMode('DRIVER_HUD')}
            style={{
              padding: '6px 14px',
              borderRadius: '8px',
              fontSize: '12px',
              fontWeight: 800,
              border: 'none',
              background: viewMode === 'DRIVER_HUD' ? '#FFFFFF' : 'transparent',
              color: viewMode === 'DRIVER_HUD' ? '#16A34A' : '#64748B',
              boxShadow: viewMode === 'DRIVER_HUD' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
              cursor: 'pointer'
            }}
          >
            🚘 Chauffeur Mobile HUD
          </button>

          <button
            onClick={() => setViewMode('DISPATCHER_MOBILE')}
            style={{
              padding: '6px 14px',
              borderRadius: '8px',
              fontSize: '12px',
              fontWeight: 800,
              border: 'none',
              background: viewMode === 'DISPATCHER_MOBILE' ? '#FFFFFF' : 'transparent',
              color: viewMode === 'DISPATCHER_MOBILE' ? '#D97706' : '#64748B',
              boxShadow: viewMode === 'DISPATCHER_MOBILE' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
              cursor: 'pointer'
            }}
          >
            📲 Dispatcher Mobile Ops
          </button>

          <button
            onClick={() => setViewMode('PUBLIC_BOOKING')}
            style={{
              padding: '6px 14px',
              borderRadius: '8px',
              fontSize: '12px',
              fontWeight: 800,
              border: 'none',
              background: viewMode === 'PUBLIC_BOOKING' ? '#FFFFFF' : 'transparent',
              color: viewMode === 'PUBLIC_BOOKING' ? '#475569' : '#64748B',
              boxShadow: viewMode === 'PUBLIC_BOOKING' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
              cursor: 'pointer'
            }}
          >
            🌐 Client Booking Portal
          </button>
        </div>

        <div>
          {session ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '12px', color: '#2563EB', fontWeight: 700 }}>{session.full_name}</span>
              <button
                onClick={() => setSession(null)}
                style={{ background: '#F1F5F9', color: '#475569', border: '1px solid #CBD5E1', padding: '5px 10px', borderRadius: '6px', fontSize: '11px', fontWeight: 700, cursor: 'pointer' }}
              >
                Sign Out
              </button>
            </div>
          ) : (
            <button
              onClick={() => setViewMode('OPS_DASHBOARD')}
              style={{ background: '#2563EB', color: '#FFFFFF', border: 'none', padding: '7px 14px', borderRadius: '8px', fontSize: '12px', fontWeight: 700, cursor: 'pointer', boxShadow: '0 2px 4px rgba(37,99,235,0.2)' }}
            >
              Sign In
            </button>
          )}
        </div>
      </header>

      {/* Main View Container */}
      <main style={{ padding: '20px 0' }}>
        {viewMode === 'OPS_DASHBOARD' && (
          session ? (
            <VendorDispatchRadar session={session} onLogout={() => setSession(null)} />
          ) : (
            <VendorLoginModal onSuccess={(sess) => setSession(sess)} />
          )
        )}

        {viewMode === 'PASSENGER_TRACKING' && (
          <PassengerLiveTracking onBackToPortal={() => setViewMode('OPS_DASHBOARD')} />
        )}

        {viewMode === 'DRIVER_HUD' && (
          <DriverMobileApp session={{ full_name: 'Marcus Brody', vendor_id: 'vendor_anb_philly' }} onLogout={() => setSession(null)} />
        )}

        {viewMode === 'DISPATCHER_MOBILE' && (
          <DispatcherMobileOps session={session} onLogout={() => setSession(null)} />
        )}

        {viewMode === 'PUBLIC_BOOKING' && (
          <VendorPublicPortal />
        )}
      </main>
    </div>
  );
};
