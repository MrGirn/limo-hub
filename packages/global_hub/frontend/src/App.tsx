import React, { useState } from 'react';
import { 
  Globe, Search, Bell, Settings, HelpCircle, User, Terminal, Menu, X, ChevronRight, 
  RefreshCw, Download, Plus, Compass, Building2, ArrowRightLeft, Navigation, BarChart3, 
  Sliders, Radio, Shield, ShieldCheck, CreditCard, Layers, ExternalLink, ArrowLeft,
  CheckCircle2, AlertCircle, Sparkles, Database, Activity, FileText
} from 'lucide-react';
import { GlobalGeoMeshPortal } from './components/GeoMesh/GlobalGeoMeshPortal';
import { GlobalMarketplacePortal } from './components/GlobalMarketplace/GlobalMarketplacePortal';
import { MarketplaceRulesPanel } from './components/GlobalMarketplace/MarketplaceRulesPanel';
import { VendorCellsManagementPanel } from './components/GlobalMarketplace/VendorCellsManagementPanel';
import { FarmExchangeRFPPanel } from './components/GlobalMarketplace/FarmExchangeRFPPanel';
import { FleetTrackingAndDispatchPanel } from './components/GlobalMarketplace/FleetTrackingAndDispatchPanel';
import { FinancialReportsLedgerPanel } from './components/GlobalMarketplace/FinancialReportsLedgerPanel';
import { LimoPublicBookingApp } from './components/PublicBooking/LimoPublicBookingApp';

export const App: React.FC = () => {
  // Navigation mode: 'public' (Consumer View) vs 'operations' (Admin/Operator View)
  const [viewMode, setViewMode] = useState<'public' | 'operations'>('public');
  const [activeBlade, setActiveBlade] = useState<'sourcing' | 'cells' | 'farm' | 'tracking' | 'financials' | 'rules' | 'geomesh'>('sourcing');
  const [activeRole, setActiveRole] = useState('ROLE_GLOBAL_SUPER_ADMIN');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [globalSearch, setGlobalSearch] = useState('');
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [appLauncherOpen, setAppLauncherOpen] = useState(false);

  if (viewMode === 'public') {
    return (
      <LimoPublicBookingApp
        onOpenOperationsPortal={(blade) => {
          setViewMode('operations');
          if (blade) {
            setActiveBlade(blade as any);
          }
        }}
        isAuthenticatedAsAdmin={activeRole === 'ROLE_GLOBAL_SUPER_ADMIN'}
      />
    );
  }

  // --- MICROSOFT AZURE / M365 OPERATIONS PORTAL ---
  return (
    <div style={{ minHeight: '100vh', background: '#F0F2F5', color: '#1B1A19', fontFamily: '"Segoe UI", -apple-system, BlinkMacSystemFont, Roboto, "Helvetica Neue", sans-serif', display: 'flex', flexDirection: 'column', position: 'relative' }}>
      
      {/* APP LAUNCHER MODAL (9-DOTS) */}
      {appLauncherOpen && (
        <div style={{
          position: 'fixed',
          top: '48px',
          left: '8px',
          width: '380px',
          background: '#FFFFFF',
          borderRadius: '8px',
          boxShadow: '0 8px 32px rgba(0,0,0,0.25)',
          border: '1px solid #EDEBE9',
          zIndex: 1000,
          padding: '16px',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #F3F2F1', paddingBottom: '8px' }}>
            <span style={{ fontSize: '13px', fontWeight: '700', color: '#323130' }}>Global Hub Services & Modules</span>
            <button onClick={() => setAppLauncherOpen(false)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#605E5C' }}>
              <X size={16} />
            </button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
            {[
              { id: 'cells', label: 'Vendor Network & Lifecycle', desc: 'Sovereign cells, compliance, disputes', icon: Building2, color: '#0284C7' },
              { id: 'rules', label: 'Marketplace & Clearinghouse Rules', desc: '80/10/10 splits, Stripe Connect, tariffs', icon: Sliders, color: '#4F46E5' },
              { id: 'financials', label: 'Financial Reports & Escrow', desc: 'Settlement ledger, corporate invoicing', icon: BarChart3, color: '#059669' },
              { id: 'sourcing', label: 'Global Sourcing Desk', desc: 'Live multi-city airline quotes', icon: Compass, color: '#0078D4' },
              { id: 'farm', label: 'Farm-Out / Farm-In RFP', desc: 'Reverse auctions & broadcast bids', icon: ArrowRightLeft, color: '#EA580C' },
              { id: 'tracking', label: 'Live Telemetry & Dispatch', desc: 'GPS tracking & flight radar feeds', icon: Navigation, color: '#7C3AED' },
              { id: 'geomesh', label: 'Worldwide Geo-Mesh', desc: 'Cross-region peer synchronization', icon: Radio, color: '#0891B2' },
            ].map(app => {
              const IconComp = app.icon;
              return (
                <div
                  key={app.id}
                  onClick={() => {
                    setActiveBlade(app.id as any);
                    setAppLauncherOpen(false);
                  }}
                  style={{
                    padding: '10px',
                    borderRadius: '6px',
                    border: '1px solid #F3F2F1',
                    background: '#FAFAFA',
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '4px',
                    transition: 'all 0.15s ease'
                  }}
                  onMouseEnter={e => (e.currentTarget.style.background = '#EFF6FC')}
                  onMouseLeave={e => (e.currentTarget.style.background = '#FAFAFA')}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ width: '24px', height: '24px', borderRadius: '4px', background: `${app.color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <IconComp size={14} color={app.color} />
                    </div>
                    <span style={{ fontSize: '12px', fontWeight: '700', color: '#1E293B', lineHeight: '1.2' }}>{app.label}</span>
                  </div>
                  <span style={{ fontSize: '10px', color: '#64748B', lineHeight: '1.3' }}>{app.desc}</span>
                </div>
              );
            })}
          </div>

          <div style={{ borderTop: '1px solid #F3F2F1', paddingTop: '8px', display: 'flex', justifyContent: 'space-between' }}>
            <button
              onClick={() => {
                setViewMode('public');
                setAppLauncherOpen(false);
              }}
              style={{
                width: '100%',
                background: '#0F172A',
                color: '#FFFFFF',
                border: 'none',
                borderRadius: '6px',
                padding: '8px',
                fontSize: '11px',
                fontWeight: '700',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px'
              }}
            >
              <Globe size={13} /> Switch to Consumer Booking Portal
            </button>
          </div>
        </div>
      )}

      {/* 1. TOP AZURE GLOBAL BLUE RIBBON */}
      <header style={{
        height: '48px',
        background: '#002050',
        color: '#FFFFFF',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 16px',
        position: 'sticky',
        top: 0,
        zIndex: 100,
        boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
      }}>
        {/* Left: App Launcher (9 dots) + Azure Branding */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button
            onClick={() => setAppLauncherOpen(!appLauncherOpen)}
            title="App Launcher (9-Dots)"
            style={{
              background: appLauncherOpen ? 'rgba(255,255,255,0.2)' : 'transparent',
              border: 'none',
              color: '#FFFFFF',
              cursor: 'pointer',
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 4px)',
              gridGap: '3px',
              padding: '6px',
              borderRadius: '4px'
            }}
          >
            {[...Array(9)].map((_, i) => (
              <span key={i} style={{ width: '4px', height: '4px', background: '#FFFFFF', borderRadius: '1px' }} />
            ))}
          </button>

          <button
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            title="Toggle Navigation Menu"
            style={{ background: 'transparent', border: 'none', color: '#FFFFFF', cursor: 'pointer', padding: '4px' }}
          >
            <Menu size={18} />
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }} onClick={() => setActiveBlade('sourcing')}>
            <div style={{ width: '22px', height: '22px', background: '#0078D4', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Globe size={14} color="#FFFFFF" />
            </div>
            <span style={{ fontSize: '15px', fontWeight: '600', letterSpacing: '-0.01em' }}>
              Microsoft Azure
            </span>
            <span style={{ color: '#8BA2C4', fontSize: '13px', fontWeight: '400' }}>|</span>
            <span style={{ fontSize: '13px', fontWeight: '600', color: '#E1DFDD' }}>
              Global Hub Operations & Clearinghouse
            </span>
          </div>
        </div>

        {/* Center: Global Search Bar */}
        <div style={{ flex: 1, maxWidth: '460px', margin: '0 20px', position: 'relative' }}>
          <Search size={14} color="#8BA2C4" style={{ position: 'absolute', left: '10px', top: '9px' }} />
          <input
            type="text"
            placeholder="Search resources, sovereign cells, rides, and docs (Ctrl + /)"
            value={globalSearch}
            onChange={e => setGlobalSearch(e.target.value)}
            style={{
              width: '100%',
              background: 'rgba(255, 255, 255, 0.12)',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              borderRadius: '4px',
              padding: '6px 12px 6px 32px',
              fontSize: '12px',
              color: '#FFFFFF',
              outline: 'none'
            }}
          />
        </div>

        {/* Right: Tenant, Cloud Shell, Notifications, Settings, User */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            onClick={() => setViewMode('public')}
            style={{
              background: '#0078D4',
              border: 'none',
              borderRadius: '4px',
              padding: '4px 10px',
              fontSize: '11px',
              fontWeight: '600',
              color: '#FFFFFF',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '5px'
            }}
          >
            <ArrowLeft size={12} /> Public Portal
          </button>

          <div style={{ height: '18px', width: '1px', background: 'rgba(255,255,255,0.2)' }} />

          {/* Directory Context */}
          <div style={{ fontSize: '11px', color: '#8BA2C4', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', lineHeight: '1.2' }}>
            <span style={{ color: '#FFFFFF', fontWeight: '600' }}>Contoso Global Limo Directory</span>
            <span>hub-us-east-prod (Default)</span>
          </div>

          <button title="Notifications" onClick={() => setNotificationsOpen(!notificationsOpen)} style={{ background: 'transparent', border: 'none', color: '#FFFFFF', cursor: 'pointer', padding: '6px', position: 'relative' }}>
            <Bell size={16} />
            <span style={{ position: 'absolute', top: '3px', right: '3px', width: '7px', height: '7px', background: '#0078D4', borderRadius: '50%' }} />
          </button>

          <button title="Settings" onClick={() => setActiveBlade('rules')} style={{ background: 'transparent', border: 'none', color: '#FFFFFF', cursor: 'pointer', padding: '6px' }}>
            <Settings size={16} />
          </button>

          <button title="Help & Support" style={{ background: 'transparent', border: 'none', color: '#FFFFFF', cursor: 'pointer', padding: '6px' }}>
            <HelpCircle size={16} />
          </button>

          {/* User Badge */}
          <div style={{
            width: '28px',
            height: '28px',
            borderRadius: '50%',
            background: '#0078D4',
            border: '1.5px solid #FFFFFF',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '11px',
            fontWeight: '700',
            color: '#FFFFFF'
          }}>
            SA
          </div>
        </div>
      </header>

      {/* 2. BODY LAYOUT: SIDEBAR + MAIN BLADE */}
      <div style={{ display: 'flex', flex: 1, minHeight: 'calc(100vh - 48px)' }}>
        
        {/* LEFT AZURE SERVICE NAVIGATION TREE */}
        <aside style={{
          width: sidebarCollapsed ? '52px' : '260px',
          background: '#FFFFFF',
          borderRight: '1px solid #EDEBE9',
          display: 'flex',
          flexDirection: 'column',
          transition: 'width 0.2s ease',
          userSelect: 'none',
          zIndex: 40
        }}>
          {/* Favorites Group Header */}
          {!sidebarCollapsed && (
            <div style={{ padding: '14px 16px 6px 16px', fontSize: '11px', fontWeight: '700', color: '#605E5C', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Core Global Hub Modules
            </div>
          )}

          <nav style={{ display: 'flex', flexDirection: 'column', gap: '2px', padding: '4px' }}>
            {[
              { id: 'sourcing', label: 'Global Sourcing Desk & Quotes', icon: Compass, badge: 'Live Quotes' },
              { id: 'cells', label: 'Vendor Network & Lifecycle Management', icon: Building2, badge: '4 Cells' },
              { id: 'rules', label: 'Marketplace Config & Clearinghouse Rules', icon: Sliders, badge: '80/10/10' },
              { id: 'financials', label: 'Financial Reports & Escrow Ledger', icon: BarChart3, badge: 'SOC 1' },
              { id: 'farm', label: 'Farm-Out / Farm-In RFP Auctions', icon: ArrowRightLeft, badge: 'Auctions' },
              { id: 'tracking', label: 'Live Telemetry & Chauffeur Dispatch', icon: Navigation, badge: 'GPS Radar' },
              { id: 'geomesh', label: 'Worldwide Peer Geo-Mesh Cluster', icon: Radio, badge: '6 Nodes' }
            ].map(item => {
              const IconComp = item.icon;
              const isSelected = activeBlade === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveBlade(item.id as any)}
                  title={item.label}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    padding: '9px 12px',
                    borderRadius: '4px',
                    border: 'none',
                    cursor: 'pointer',
                    background: isSelected ? '#EFF6FC' : 'transparent',
                    color: isSelected ? '#0078D4' : '#323130',
                    fontWeight: isSelected ? '700' : '500',
                    fontSize: '13px',
                    borderLeft: isSelected ? '3px solid #0078D4' : '3px solid transparent',
                    textAlign: 'left',
                    width: '100%'
                  }}
                >
                  <IconComp size={16} color={isSelected ? '#0078D4' : '#605E5C'} style={{ minWidth: '16px' }} />
                  {!sidebarCollapsed && (
                    <span style={{ flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {item.label}
                    </span>
                  )}
                  {!sidebarCollapsed && item.badge && (
                    <span style={{
                      fontSize: '9px',
                      fontWeight: '700',
                      padding: '1px 6px',
                      borderRadius: '999px',
                      background: isSelected ? '#0078D4' : '#EDEBE9',
                      color: isSelected ? '#FFFFFF' : '#605E5C'
                    }}>
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>

          {/* Monitoring & Security Section */}
          {!sidebarCollapsed && (
            <div style={{ padding: '16px 16px 6px 16px', fontSize: '11px', fontWeight: '700', color: '#605E5C', textTransform: 'uppercase', letterSpacing: '0.05em', borderTop: '1px solid #F3F2F1', marginTop: '10px' }}>
              Platform Diagnostics
            </div>
          )}

          {!sidebarCollapsed && (
            <div style={{ padding: '8px 16px', display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '12px', color: '#605E5C' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <ShieldCheck size={14} color="#107C10" />
                <span>Security: <strong>OTP + DDoS Shield</strong></span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <CreditCard size={14} color="#0078D4" />
                <span>Payment: <strong>Stripe Connect 80/10/10</strong></span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Activity size={14} color="#107C10" />
                <span>SLA Compliance: <strong>99.4% On-Time</strong></span>
              </div>
            </div>
          )}

          {/* Role Switcher at Bottom of Sidebar */}
          <div style={{ marginTop: 'auto', padding: '12px', borderTop: '1px solid #EDEBE9', background: '#FAF9F8' }}>
            {!sidebarCollapsed ? (
              <div>
                <div style={{ fontSize: '10px', fontWeight: '700', color: '#605E5C', textTransform: 'uppercase', marginBottom: '4px' }}>
                  Active RBAC Role
                </div>
                <select
                  value={activeRole}
                  onChange={e => setActiveRole(e.target.value)}
                  style={{
                    width: '100%',
                    background: '#FFFFFF',
                    border: '1px solid #CBD5E1',
                    borderRadius: '4px',
                    padding: '6px',
                    fontSize: '11px',
                    fontWeight: '600',
                    color: '#323130',
                    cursor: 'pointer'
                  }}
                >
                  <option value="ROLE_GLOBAL_SUPER_ADMIN">Global Super Admin</option>
                  <option value="ROLE_GLOBAL_OPS_CONCIERGE">Global Ops Concierge</option>
                  <option value="ROLE_GLOBAL_FINANCE_AUDITOR">Global Finance Auditor</option>
                </select>
              </div>
            ) : (
              <div title="Role: Global Super Admin" style={{ textAlign: 'center' }}>
                <User size={16} color="#0078D4" />
              </div>
            )}
          </div>
        </aside>

        {/* MAIN AZURE BLADE WORKSPACE */}
        <main style={{ flex: 1, display: 'flex', flexDirection: 'column', background: '#F0F2F5', overflowY: 'auto' }}>
          
          {/* Azure Breadcrumbs & Subscription Blade Header */}
          <div style={{ background: '#FFFFFF', borderBottom: '1px solid #EDEBE9', padding: '14px 28px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#605E5C', marginBottom: '4px' }}>
              <span style={{ color: '#0078D4', cursor: 'pointer' }} onClick={() => setActiveBlade('sourcing')}>Home</span>
              <ChevronRight size={12} />
              <span>Global Hub Clearinghouse</span>
              <ChevronRight size={12} />
              <strong style={{ color: '#323130' }}>
                {activeBlade === 'sourcing' && 'Global Itinerary Sourcing Desk'}
                {activeBlade === 'cells' && 'Sovereign Vendor Cells & Rates'}
                {activeBlade === 'farm' && 'Farm-Out / Farm-In RFP Auctions'}
                {activeBlade === 'tracking' && 'Live GPS Fleet Telemetry & Dispatch'}
                {activeBlade === 'financials' && 'Cost Management & 80/10/10 Escrow'}
                {activeBlade === 'rules' && 'Marketplace Rules & Surcharges'}
                {activeBlade === 'geomesh' && 'Worldwide Active-Active Peer Mesh'}
              </strong>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h1 style={{ fontSize: '20px', fontWeight: '700', color: '#323130', margin: 0, letterSpacing: '-0.01em' }}>
                  {activeBlade === 'sourcing' && 'Global Itinerary Sourcing Desk'}
                  {activeBlade === 'cells' && 'Sovereign Affiliate Cells & Rate Cards'}
                  {activeBlade === 'farm' && 'Farm-Out / Farm-In Exchange & RFP Desk'}
                  {activeBlade === 'tracking' && 'Live Fleet Telemetry & Dispatch Console'}
                  {activeBlade === 'financials' && 'Financial Analytics & Escrow Ledger (SOC 1)'}
                  {activeBlade === 'rules' && 'Dynamic Marketplace Rules & Tax Tariffs'}
                  {activeBlade === 'geomesh' && 'Worldwide Geo-Mesh Cluster Topology'}
                </h1>
                <div style={{ fontSize: '11px', color: '#605E5C', marginTop: '2px' }}>
                  Subscription: <strong style={{ color: '#0078D4' }}>Azure Global Production Escrow (sub-80-10-10)</strong> • Resource group: <strong style={{ color: '#323130' }}>rg-global-clearinghouse</strong> • Location: <strong style={{ color: '#323130' }}>East US (Virginia)</strong>
                </div>
              </div>

              {/* Azure Fluent Command Bar */}
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  onClick={() => window.location.reload()}
                  style={{
                    background: '#FFFFFF',
                    border: '1px solid #8A8886',
                    borderRadius: '4px',
                    padding: '6px 12px',
                    fontSize: '12px',
                    fontWeight: '600',
                    color: '#323130',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  <RefreshCw size={13} /> Refresh Blade
                </button>
              </div>
            </div>
          </div>

          {/* Main Blade Content Container */}
          <div style={{ padding: '24px 28px', maxWidth: '1440px', width: '100%', boxSizing: 'border-box' }}>
            {activeBlade === 'sourcing' && <GlobalMarketplacePortal />}
            {activeBlade === 'cells' && <VendorCellsManagementPanel />}
            {activeBlade === 'farm' && <FarmExchangeRFPPanel />}
            {activeBlade === 'tracking' && <FleetTrackingAndDispatchPanel />}
            {activeBlade === 'financials' && <FinancialReportsLedgerPanel />}
            {activeBlade === 'rules' && <MarketplaceRulesPanel />}
            {activeBlade === 'geomesh' && <GlobalGeoMeshPortal />}
          </div>
        </main>
      </div>
    </div>
  );
};
