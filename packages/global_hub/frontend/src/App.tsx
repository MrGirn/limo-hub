import React, { useState } from 'react';
import { Globe, Layers, DollarSign, Bot, ShieldCheck, MapPin, Radio } from 'lucide-react';
import { GlobalGeoMeshPortal } from './components/GeoMesh/GlobalGeoMeshPortal';
import { GlobalMarketplacePortal } from './components/GlobalMarketplace/GlobalMarketplacePortal';

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'marketplace' | 'geomesh' | 'escrow'>('marketplace');
  const [activeRole, setActiveRole] = useState('ROLE_GLOBAL_SUPER_ADMIN');

  return (
    <div style={{ minHeight: '100vh', background: '#F8FAFC', color: '#0F172A' }}>
      {/* Top Global Clearinghouse Navigation (Light Mode) */}
      <header style={{ 
        height: '64px', 
        background: '#FFFFFF', 
        borderBottom: '1px solid #E2E8F0',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 28px',
        position: 'sticky',
        top: 0,
        zIndex: 50,
        boxShadow: '0 1px 4px rgba(0,0,0,0.03)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{ 
            width: '38px', 
            height: '38px', 
            borderRadius: '10px', 
            background: 'linear-gradient(135deg, #0078D4 0%, #0284C7 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 2px 10px rgba(0,120,212,0.3)'
          }}>
            <Globe size={22} color="#FFFFFF" />
          </div>
          <div>
            <div style={{ fontSize: '15px', fontWeight: '800', color: '#0F172A', letterSpacing: '-0.02em' }}>
              GLOBAL HUB CLEARINGHOUSE
            </div>
            <div style={{ fontSize: '11px', color: '#0078D4', fontWeight: '700' }}>
              Multi-Region Active-Active Mesh (Port 8000 / 5173)
            </div>
          </div>
        </div>

        {/* Center Tabs */}
        <div style={{ display: 'flex', gap: '8px', background: '#F1F5F9', padding: '4px', borderRadius: '10px', border: '1px solid #E2E8F0' }}>
          <button
            onClick={() => setActiveTab('marketplace')}
            style={{
              padding: '8px 16px',
              borderRadius: '8px',
              fontSize: '13px',
              fontWeight: '700',
              border: 'none',
              cursor: 'pointer',
              background: activeTab === 'marketplace' ? '#0078D4' : 'transparent',
              color: activeTab === 'marketplace' ? '#FFFFFF' : '#64748B',
              boxShadow: activeTab === 'marketplace' ? '0 2px 8px rgba(0,120,212,0.25)' : 'none',
              transition: 'all 0.15s ease'
            }}
          >
            Global Itinerary Builder
          </button>
          <button
            onClick={() => setActiveTab('geomesh')}
            style={{
              padding: '8px 16px',
              borderRadius: '8px',
              fontSize: '13px',
              fontWeight: '700',
              border: 'none',
              cursor: 'pointer',
              background: activeTab === 'geomesh' ? '#0078D4' : 'transparent',
              color: activeTab === 'geomesh' ? '#FFFFFF' : '#64748B',
              boxShadow: activeTab === 'geomesh' ? '0 2px 8px rgba(0,120,212,0.25)' : 'none',
              transition: 'all 0.15s ease'
            }}
          >
            Worldwide Geo-Mesh (6 Nodes)
          </button>
        </div>

        {/* Role & Node Indicator */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#F1F5F9', padding: '6px 12px', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
            <Radio size={14} color="#16A34A" className="pulse-live" />
            <span style={{ fontSize: '11px', color: '#64748B' }}>NODE: <strong style={{ color: '#0F172A' }}>hub-us-east-prod</strong></span>
          </div>

          <select
            value={activeRole}
            onChange={e => setActiveRole(e.target.value)}
            style={{
              background: '#FFFFFF',
              color: '#0F172A',
              border: '1.5px solid #CBD5E1',
              fontSize: '11px',
              fontWeight: '700',
              padding: '6px 10px',
              borderRadius: '8px',
              cursor: 'pointer'
            }}
          >
            <option value="ROLE_GLOBAL_SUPER_ADMIN">Global Super Admin</option>
            <option value="ROLE_GLOBAL_OPS_CONCIERGE">Global Ops Concierge</option>
            <option value="ROLE_GLOBAL_FINANCE_AUDITOR">Global Finance Auditor</option>
          </select>
        </div>
      </header>

      {/* Main Body */}
      <main style={{ maxWidth: '1280px', margin: '0 auto', padding: '32px 24px' }}>
        {activeTab === 'marketplace' && <GlobalMarketplacePortal />}
        {activeTab === 'geomesh' && <GlobalGeoMeshPortal />}
      </main>
    </div>
  );
};
