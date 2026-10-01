import React, { useState } from 'react';
import { Globe, Layers, DollarSign, Bot, ShieldCheck, MapPin, Radio, Smartphone, Compass, Lock, ArrowLeft, Sliders } from 'lucide-react';
import { GlobalGeoMeshPortal } from './components/GeoMesh/GlobalGeoMeshPortal';
import { GlobalMarketplacePortal } from './components/GlobalMarketplace/GlobalMarketplacePortal';
import { MarketplaceRulesPanel } from './components/GlobalMarketplace/MarketplaceRulesPanel';
import { LimoPublicBookingApp } from './components/PublicBooking/LimoPublicBookingApp';

export const App: React.FC = () => {
  // Navigation mode: 'public' (Consumer View) vs 'operations' (Admin/Operator View)
  const [viewMode, setViewMode] = useState<'public' | 'operations'>('public');
  const [activeOpsTab, setActiveOpsTab] = useState<'marketplace' | 'geomesh' | 'rules'>('marketplace');
  const [activeRole, setActiveRole] = useState('ROLE_GLOBAL_SUPER_ADMIN');

  if (viewMode === 'public') {
    return (
      <LimoPublicBookingApp
        onOpenOperationsPortal={() => setViewMode('operations')}
        isAuthenticatedAsAdmin={activeRole === 'ROLE_GLOBAL_SUPER_ADMIN'}
      />
    );
  }

  // --- INTERNAL OPERATIONS & CLEARINGHOUSE ADMIN PORTAL (ROLE PROTECTED) ---
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
          <button
            onClick={() => setViewMode('public')}
            style={{
              background: '#F1F5F9',
              border: '1px solid #CBD5E1',
              borderRadius: '8px',
              padding: '6px 12px',
              fontSize: '12px',
              fontWeight: '700',
              color: '#0F172A',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <ArrowLeft size={14} /> Back to Public Web
          </button>

          <div style={{ 
            width: '36px', 
            height: '36px', 
            borderRadius: '10px', 
            background: 'linear-gradient(135deg, #0078D4 0%, #0284C7 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <Globe size={20} color="#FFFFFF" />
          </div>
          <div>
            <div style={{ fontSize: '14px', fontWeight: '800', color: '#0F172A', letterSpacing: '-0.02em' }}>
              GLOBAL HUB OPERATIONS
            </div>
            <div style={{ fontSize: '11px', color: '#0078D4', fontWeight: '700' }}>
              Internal Clearinghouse & Mesh Controller
            </div>
          </div>
        </div>

        {/* Center Operations Tabs */}
        <div style={{ display: 'flex', gap: '8px', background: '#F1F5F9', padding: '4px', borderRadius: '10px', border: '1px solid #E2E8F0' }}>
          <button
            onClick={() => setActiveOpsTab('marketplace')}
            style={{
              padding: '8px 16px',
              borderRadius: '8px',
              fontSize: '13px',
              fontWeight: '700',
              border: 'none',
              cursor: 'pointer',
              background: activeOpsTab === 'marketplace' ? '#0078D4' : 'transparent',
              color: activeOpsTab === 'marketplace' ? '#FFFFFF' : '#64748B',
              boxShadow: activeOpsTab === 'marketplace' ? '0 2px 8px rgba(0,120,212,0.25)' : 'none',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <Compass size={15} />
            Global Itinerary Sourcing
          </button>

          <button
            onClick={() => setActiveOpsTab('rules')}
            style={{
              padding: '8px 16px',
              borderRadius: '8px',
              fontSize: '13px',
              fontWeight: '700',
              border: 'none',
              cursor: 'pointer',
              background: activeOpsTab === 'rules' ? '#0078D4' : 'transparent',
              color: activeOpsTab === 'rules' ? '#FFFFFF' : '#64748B',
              boxShadow: activeOpsTab === 'rules' ? '0 2px 8px rgba(0,120,212,0.25)' : 'none',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <Sliders size={15} />
            Marketplace Rules & Surcharges
          </button>

          <button
            onClick={() => setActiveOpsTab('geomesh')}
            style={{
              padding: '8px 16px',
              borderRadius: '8px',
              fontSize: '13px',
              fontWeight: '700',
              border: 'none',
              cursor: 'pointer',
              background: activeOpsTab === 'geomesh' ? '#0078D4' : 'transparent',
              color: activeOpsTab === 'geomesh' ? '#FFFFFF' : '#64748B',
              boxShadow: activeOpsTab === 'geomesh' ? '0 2px 8px rgba(0,120,212,0.25)' : 'none',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <Radio size={15} />
            Worldwide Geo-Mesh
          </button>
        </div>

        {/* Role & Node Indicator */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#F1F5F9', padding: '6px 12px', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
            <Radio size={14} color="#16A34A" />
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

      {/* Main Operations Body */}
      <main style={{ maxWidth: '1280px', margin: '0 auto', padding: '32px 24px' }}>
        {activeOpsTab === 'marketplace' && <GlobalMarketplacePortal />}
        {activeOpsTab === 'rules' && <MarketplaceRulesPanel />}
        {activeOpsTab === 'geomesh' && <GlobalGeoMeshPortal />}
      </main>
    </div>
  );
};

