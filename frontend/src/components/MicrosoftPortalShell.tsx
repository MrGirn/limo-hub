import React, { useState } from 'react';
import { 
  Terminal, Search, Bell, Settings, HelpCircle, User, 
  ChevronRight, ChevronDown, Car, Users, Sliders, Shield, 
  Layers, Radio, Plane, Mail, RefreshCw, Plus, Download, 
  Filter, Grid, LayoutDashboard, Database, Activity, 
  ExternalLink, X, CheckCircle2, AlertTriangle, Building2
} from 'lucide-react';
import { UserSession, UserRole } from '../types';

interface NavItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  category?: string;
  badge?: string;
}

interface MicrosoftPortalShellProps {
  user: UserSession | null;
  activeView: string;
  onSelectView: (viewId: string) => void;
  onRefreshAll?: () => void;
  children: React.ReactNode;
}

export const MicrosoftPortalShell: React.FC<MicrosoftPortalShellProps> = ({
  user,
  activeView,
  onSelectView,
  onRefreshAll,
  children
}) => {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [activeBlade, setActiveBlade] = useState<{ title: string; content: React.ReactNode } | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSubscription, setSelectedSubscription] = useState('Production - Philly / Northeast Corridor Cell');

  const navItems: NavItem[] = [
    { id: 'VENDOR_OWNER_DASHBOARD', label: 'Vendor Operations & Business KPIs', icon: <Building2 size={16} />, category: 'Management' },
    { id: 'VENDOR_DISPATCH', label: 'Live Dispatch & Telemetry Matrix', icon: <Car size={16} />, category: 'Operations' },
    { id: 'VOICE_AI_STUDIO', label: 'Voice AI & GraphRAG Studio', icon: <Radio size={16} />, category: 'Intelligence' },
    { id: 'VENDOR_FLEET_PRICING', label: 'Fleet & Dynamic AI Yield Rules', icon: <Sliders size={16} />, category: 'Fleet Management' },
    { id: 'VENDOR_OMNICHANNEL', label: 'Omnichannel RFQ Intake', icon: <Mail size={16} />, category: 'Operations' },
    { id: 'VENDOR_RADAR', label: 'FlightAware Transit Radar', icon: <Plane size={16} />, category: 'Intelligence' },
    { id: 'CORPORATE_BOOKER', label: 'Corporate B2B Travel Desk', icon: <Building2 size={16} />, category: 'Corporate' },
    { id: 'SUPERADMIN_RECOVERY', label: 'Autonomous Recovery Hub', icon: <Shield size={16} />, category: 'Governance' },
  ];

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', backgroundColor: '#F3F4F6', color: '#0F172A', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      
      {/* 1. Microsoft Azure Portal Top Bar (Authentic Blue) */}
      <header style={{
        height: '48px',
        backgroundColor: '#0078D4',
        color: '#FFFFFF',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 16px',
        boxShadow: '0 1px 4px rgba(0,0,0,0.15)',
        zIndex: 50,
        userSelect: 'none'
      }}>
        
        {/* Left: Portal Logo & Tenant */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <button 
            onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
            style={{ background: 'transparent', border: 'none', color: '#FFFFFF', cursor: 'pointer', padding: '6px', borderRadius: '4px', display: 'flex', alignItems: 'center' }}
            title="Toggle Navigation Pane"
          >
            <Grid size={18} />
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontWeight: 800, fontSize: '14px', letterSpacing: '0.02em' }}>Limo Sovereign Cloud</span>
            <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: '12px' }}>|</span>
            <span style={{ fontWeight: 600, fontSize: '12px', color: 'rgba(255,255,255,0.95)' }}>
              Autonomous Fleet & Operations Portal
            </span>
          </div>

          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            marginLeft: '12px',
            padding: '4px 10px',
            backgroundColor: 'rgba(0,0,0,0.2)',
            borderRadius: '4px',
            fontSize: '11px',
            border: '1px solid rgba(255,255,255,0.2)'
          }}>
            <Building2 size={13} color="#FBBF24" />
            <select
              value={selectedSubscription}
              onChange={(e) => setSelectedSubscription(e.target.value)}
              style={{
                background: 'transparent',
                border: 'none',
                fontSize: '11px',
                color: '#FFFFFF',
                outline: 'none',
                cursor: 'pointer',
                fontWeight: 600
              }}
            >
              <option value="Production - Philly / Northeast Corridor Cell" style={{ background: '#FFFFFF', color: '#0F172A' }}>
                Sub: Production - Philly Cell (vendor_anb_philly)
              </option>
              <option value="Production - New York Executive Cell" style={{ background: '#FFFFFF', color: '#0F172A' }}>
                Sub: Production - NY Executive Hub (vendor_ny_executive)
              </option>
            </select>
          </div>
        </div>

        {/* Center: Global Search Bar */}
        <div style={{ display: 'flex', alignItems: 'center', flex: 1, maxWidth: '440px', margin: '0 24px' }}>
          <div style={{ position: 'relative', width: '100%' }}>
            <Search size={14} style={{ position: 'absolute', left: '10px', top: '9px', color: 'rgba(255,255,255,0.7)' }} />
            <input
              type="text"
              placeholder="Search resources, trips, drivers, flights, policies (G+/)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: '100%',
                background: 'rgba(255,255,255,0.25)',
                color: '#FFFFFF',
                border: '1px solid rgba(255,255,255,0.35)',
                borderRadius: '4px',
                padding: '6px 12px 6px 32px',
                fontSize: '12px',
                outline: 'none',
                boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.1)'
              }}
            />
          </div>
        </div>

        {/* Right: Quick Action Controls & User Identity */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            onClick={() => onSelectView('PUBLIC_WEBSITE')}
            style={{
              background: 'rgba(255, 255, 255, 0.2)',
              color: '#FFFFFF',
              border: '1px solid rgba(255, 255, 255, 0.4)',
              borderRadius: '4px',
              padding: '4px 10px',
              fontSize: '11px',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <span>← Customer Storefront</span>
          </button>

          <button 
            style={{ background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.9)', cursor: 'pointer', padding: '6px', borderRadius: '4px' }}
            title="Cloud Shell Terminal"
            onClick={() => setActiveBlade({
              title: 'Azure Cloud Shell (PowerShell)',
              content: (
                <div style={{ padding: '16px', background: '#F8FAFC', border: '1px solid #E2E8F0', fontFamily: 'monospace', fontSize: '11px', color: '#0F172A', height: '100%', lineHeight: '1.6' }}>
                  <div style={{ color: '#0078D4', fontWeight: 700 }}>PS Azure:\&gt; Get-AzContainerGroup -ResourceGroupName "Limo-Sovereign-RG"</div>
                  <div style={{ color: '#475569', marginTop: '6px' }}>Name &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; Location &nbsp;&nbsp; State &nbsp;&nbsp;&nbsp;&nbsp; IPAddress</div>
                  <div style={{ color: '#16A34A', fontWeight: 600 }}>limo-cell-anb-philly &nbsp;&nbsp;&nbsp;&nbsp;&nbsp; eastus &nbsp;&nbsp;&nbsp;&nbsp; Running &nbsp; 127.0.0.1:8001</div>
                  <div style={{ color: '#16A34A', fontWeight: 600 }}>limo-cell-ny-executive &nbsp;&nbsp; eastus2 &nbsp;&nbsp;&nbsp; Running &nbsp; 127.0.0.1:8002</div>
                </div>
              )
            })}
          >
            <Terminal size={16} />
          </button>

          <button 
            style={{ background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.9)', cursor: 'pointer', padding: '6px', borderRadius: '4px', position: 'relative' }}
            title="Notifications"
          >
            <Bell size={16} />
            <span style={{ position: 'absolute', top: '4px', right: '4px', width: '6px', height: '6px', backgroundColor: '#FBBF24', borderRadius: '50%' }} />
          </button>

          <div style={{ height: '16px', width: '1px', backgroundColor: 'rgba(255,255,255,0.25)', margin: '0 4px' }} />

          {/* User Badge */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', paddingLeft: '6px' }}>
            <div style={{
              width: '28px',
              height: '28px',
              borderRadius: '50%',
              background: '#FFFFFF',
              border: '1px solid rgba(0,0,0,0.1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '12px',
              fontWeight: 800,
              color: '#0078D4'
            }}>
              {user?.full_name?.charAt(0) || 'D'}
            </div>
            <div style={{ textAlign: 'left', fontSize: '11px', lineHeight: '1.2' }}>
              <div style={{ fontWeight: 600, color: '#FFFFFF' }}>{user?.full_name || 'Dispatcher Ops'}</div>
              <div style={{ color: 'rgba(255,255,255,0.8)', fontSize: '10px' }}>{user?.role || 'ROLE_VENDOR_ADMIN'}</div>
            </div>
          </div>
        </div>
      </header>

      {/* 2. Main Portal Workspace Layout (Light Theme) */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        
        {/* Left Tree Sidebar (Light Mode) */}
        <aside style={{
          width: isSidebarCollapsed ? '52px' : '260px',
          backgroundColor: '#FFFFFF',
          borderRight: '1px solid #E5E7EB',
          display: 'flex',
          flexDirection: 'column',
          transition: 'width 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
          userSelect: 'none'
        }}>
          
          <div style={{
            padding: '12px 14px',
            borderBottom: '1px solid #E5E7EB',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            backgroundColor: '#F9FAFB'
          }}>
            {!isSidebarCollapsed && (
              <span style={{ fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#6B7280' }}>
                Operations Explorer
              </span>
            )}
            <button
              onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
              style={{ background: 'transparent', border: 'none', color: '#6B7280', cursor: 'pointer', padding: '4px', borderRadius: '4px', display: 'flex', alignItems: 'center' }}
            >
              <ChevronRight size={14} style={{ transform: isSidebarCollapsed ? 'none' : 'rotate(180deg)', transition: 'transform 0.2s' }} />
            </button>
          </div>

          <div style={{ flex: 1, overflowY: 'auto', padding: '8px 0' }}>
            {navItems.map((item) => {
              const isActive = activeView === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => onSelectView(item.id)}
                  style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    padding: '10px 14px',
                    fontSize: '12px',
                    fontWeight: isActive ? 800 : 600,
                    color: isActive ? '#0078D4' : '#374151',
                    background: isActive ? '#EFF6FF' : 'transparent',
                    border: 'none',
                    borderLeft: isActive ? '3px solid #0078D4' : '3px solid transparent',
                    cursor: 'pointer',
                    textAlign: 'left',
                    transition: 'all 0.15s ease'
                  }}
                  title={item.label}
                >
                  <span style={{ color: isActive ? '#0078D4' : '#6B7280', display: 'flex', alignItems: 'center' }}>{item.icon}</span>
                  {!isSidebarCollapsed && (
                    <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.label}</span>
                  )}
                </button>
              );
            })}
          </div>

          {!isSidebarCollapsed && (
            <div style={{ padding: '12px 14px', borderTop: '1px solid #E5E7EB', fontSize: '11px', color: '#6B7280', backgroundColor: '#F9FAFB' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                <span>Fluent UI State:</span>
                <span style={{ color: '#16A34A', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Activity size={10} /> Online
                </span>
              </div>
              <div style={{ fontSize: '10px', color: '#9CA3AF' }}>
                Azure Tenant: <strong style={{ color: '#374151' }}>US-EAST-CORE-01</strong>
              </div>
            </div>
          )}
        </aside>

        {/* Center Workspace Content Area (Light Theme) */}
        <main style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', backgroundColor: '#F3F4F6' }}>
          
          {/* Breadcrumbs & Command Bar */}
          <div style={{
            backgroundColor: '#FFFFFF',
            borderBottom: '1px solid #E5E7EB',
            padding: '10px 24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '12px'
          }}>
            
            {/* Breadcrumb Trail */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: '#6B7280' }}>
              <span style={{ cursor: 'pointer', color: '#374151' }} onClick={() => onSelectView('VENDOR_OWNER_DASHBOARD')}>Home</span>
              <ChevronRight size={12} color="#9CA3AF" />
              <span style={{ color: '#374151', fontWeight: 500 }}>Vendor Operations</span>
              <ChevronRight size={12} color="#9CA3AF" />
              <span style={{ color: '#0078D4', fontWeight: 800 }}>{navItems.find(n => n.id === activeView)?.label || activeView}</span>
            </div>

            {/* Command Bar Actions */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              {onRefreshAll && (
                <button
                  onClick={onRefreshAll}
                  style={{
                    padding: '6px 12px',
                    backgroundColor: '#FFFFFF',
                    color: '#374151',
                    borderRadius: '4px',
                    fontSize: '12px',
                    fontWeight: 600,
                    border: '1px solid #D1D5DB',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  <RefreshCw size={12} color="#0078D4" />
                  <span>Refresh</span>
                </button>
              )}
              <button
                onClick={() => setActiveBlade({
                  title: 'New Emergency Ride Manifest',
                  content: (
                    <div style={{ padding: '16px', fontSize: '12px', color: '#374151', lineHeight: '1.6' }}>
                      <p style={{ marginBottom: '12px' }}>Manually inject an emergency VIP transfer or VIP delegation itinerary directly into the active dispatch queue.</p>
                      <button 
                        onClick={() => onSelectView('CUSTOMER_BOOKING')}
                        style={{
                          width: '100%',
                          padding: '10px',
                          backgroundColor: '#0078D4',
                          color: '#FFFFFF',
                          fontWeight: 700,
                          borderRadius: '6px',
                          border: 'none',
                          cursor: 'pointer'
                        }}
                      >
                        Launch Booking Dispatch Wizard
                      </button>
                    </div>
                  )
                })}
                style={{
                  padding: '6px 14px',
                  backgroundColor: '#0078D4',
                  color: '#FFFFFF',
                  borderRadius: '4px',
                  fontSize: '12px',
                  fontWeight: 700,
                  border: 'none',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  boxShadow: '0 1px 4px rgba(0, 120, 212, 0.3)'
                }}
              >
                <Plus size={13} />
                <span>Add Resource / Trip</span>
              </button>
            </div>
          </div>

          {/* Primary View Render */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '24px' }}>
            {children}
          </div>
        </main>

        {/* 3. Slide-Over Detail Blade Drawer (Light Mode) */}
        {activeBlade && (
          <aside style={{
            width: '400px',
            backgroundColor: '#FFFFFF',
            borderLeft: '1px solid #E5E7EB',
            boxShadow: '-4px 0 20px rgba(0,0,0,0.1)',
            display: 'flex',
            flexDirection: 'column',
            zIndex: 40
          }}>
            <div style={{
              padding: '14px 16px',
              backgroundColor: '#F9FAFB',
              borderBottom: '1px solid #E5E7EB',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <h4 style={{ fontSize: '12px', fontWeight: 800, color: '#0F172A', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Sliders size={14} color="#0078D4" />
                <span>{activeBlade.title}</span>
              </h4>
              <button 
                onClick={() => setActiveBlade(null)}
                style={{ background: 'transparent', border: 'none', color: '#6B7280', cursor: 'pointer', padding: '4px', borderRadius: '4px' }}
              >
                <X size={16} />
              </button>
            </div>
            <div style={{ flex: 1, overflowY: 'auto' }}>
              {activeBlade.content}
            </div>
          </aside>
        )}

      </div>
    </div>
  );
};
