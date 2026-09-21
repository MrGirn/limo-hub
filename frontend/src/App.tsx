import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { CustomerPortal } from './components/CustomerPortal';
import { CorporateBookerPortal } from './components/CorporateBookerPortal';
import { VendorDispatchPortal } from './components/VendorDispatchPortal';
import { DriverMobileDashboard } from './components/DriverMobileDashboard';
import { VendorOwnerDashboard } from './components/VendorOwnerDashboard';
import { GlobalHubAdminPortal } from './components/GlobalHubAdminPortal';
import { GlobalMarketplaceBookingPage } from './components/public/GlobalMarketplaceBookingPage';
import { PublicVendorOnboardingPage } from './components/public/PublicVendorOnboardingPage';
import { ActorImpersonationBar } from './components/ActorImpersonationBar';

// Public White-Label Pages & Auth
import { PublicHeader, PublicPage } from './components/public/PublicHeader';
import { PublicFooter } from './components/public/PublicFooter';
import { PublicHomePage } from './components/public/PublicHomePage';
import { PublicFleetPage } from './components/public/PublicFleetPage';
import { PublicAboutPage } from './components/public/PublicAboutPage';
import { PublicServicesPage } from './components/public/PublicServicesPage';
import { PublicPoliciesPage } from './components/public/PublicPoliciesPage';
import { PublicContactPage } from './components/public/PublicContactPage';
import { PublicVendorQuotePortal } from './components/PublicVendorQuotePortal';
import { MultiVendorComparisonStudio } from './components/MultiVendorComparisonStudio';
import { VendorBrandingProfile, VendorPortalConfig, SystemRuntimeMode } from './types';
import { fetchVendorPortalConfig, resolveVendorByDomain, fetchSystemRuntimeMode } from './api';

type PortalView = 
  | 'PUBLIC_WEBSITE'
  | 'MULTI_VENDOR_STUDIO'
  | 'GLOBAL_MARKETPLACE'
  | 'GLOBAL_HUB_ADMIN'
  | 'VENDOR_OWNER_DASHBOARD'
  | 'OPERATOR_ONBOARDING'
  | 'DRIVER_APP'
  | 'CORPORATE_PORTAL'
  | 'CUSTOMER_BOOKING'
  | 'PUBLIC_VENDOR_QUOTE';

const DEFAULT_BRANDING: VendorBrandingProfile = {
  primary_color: '#0F172A',
  accent_color: '#F59E0B',
  company_tagline: '',
  contact_phone: '',
  office_address: '',
  domain: ''
};

const MainLayout: React.FC = () => {
  const { user, role, switchPersona } = useAuth();
  const [activeView, setActiveView] = useState<PortalView>('PUBLIC_WEBSITE');
  const [publicPage, setPublicPage] = useState<PublicPage>('HOME');
  const [runtimeMode, setRuntimeMode] = useState<SystemRuntimeMode | null>(null);
  
  // Active Vendor White-Label Configuration Profile
  const [vendorConfig, setVendorConfig] = useState<VendorPortalConfig>({
    vendor_id: '',
    vendor_name: '',
    tier: 'AUTONOMOUS_T1',
    operating_mode: 'GLOBAL_FEDERATED',
    currency: 'USD',
    base_rate_usd: 75.0,
    per_km_usd: 3.25,
    branding: DEFAULT_BRANDING
  });

  const isSovereignMode = Boolean(runtimeMode?.is_sovereign_cell || runtimeMode?.is_prod_mode);
  const isGlobalHub = Boolean(runtimeMode?.hub_mode);

  const handleVendorSelect = async (vendorId: string) => {
    // If container is locked in sovereign mode, ignore cross-vendor switching
    if (runtimeMode?.is_sovereign_cell && runtimeMode?.sovereign_vendor_id && vendorId !== runtimeMode.sovereign_vendor_id) {
      return;
    }
    try {
      const config = await fetchVendorPortalConfig(vendorId);
      if (config) {
        setVendorConfig(config);
        // Only append ?vt token if on global hub/multi-tenant router, NOT on standalone sovereign cells
        if (config.encrypted_token && !runtimeMode?.is_sovereign_cell) {
          const url = new URL(window.location.href);
          url.searchParams.delete('domain');
          url.searchParams.delete('vendor_domain');
          url.searchParams.set('vt', config.encrypted_token);
          window.history.replaceState({}, '', url.toString());
        }
      }
    } catch {
      setVendorConfig(prev => ({
        ...prev,
        vendor_id: vendorId,
        vendor_name: prev.vendor_name || vendorId
      }));
    }
  };

  // Check runtime mode on initial mount and route accordingly
  useEffect(() => {
    const initModeAndDomain = async () => {
      try {
        const mode = await fetchSystemRuntimeMode();
        setRuntimeMode(mode);

        // 1. Central Global Federation Hub (Port 8000) -> Boots into Worldwide Customer Marketplace
        if (mode.hub_mode) {
          setActiveView('GLOBAL_MARKETPLACE');
          return;
        }

        // 2. Sovereign Vendor Cell (Port 8001 / 8002) -> Boots directly into Local Vendor Public Website
        if (mode.is_sovereign_cell && mode.sovereign_vendor_id) {
          // If address bar has old ?vt= or ?domain= from another session, clear it for a clean URL
          if (window.location.search) {
            const url = new URL(window.location.href);
            url.searchParams.delete('vt');
            url.searchParams.delete('token');
            url.searchParams.delete('cell_token');
            url.searchParams.delete('domain');
            url.searchParams.delete('vendor_domain');
            window.history.replaceState({}, '', url.pathname + (url.search ? url.search : ''));
          }
          setActiveView('PUBLIC_WEBSITE');
          setPublicPage('HOME');
          try {
            const config = await fetchVendorPortalConfig(mode.sovereign_vendor_id);
            if (config) {
              setVendorConfig(config);
            }
          } catch (e) {
            console.error('Could not load sovereign config:', e);
          }
          return;
        }

        const hostname = window.location.hostname;
        const searchParams = new URLSearchParams(window.location.search);
        const encryptedToken = searchParams.get('vt') || searchParams.get('token') || searchParams.get('cell_token');
        const queryDomain = searchParams.get('domain') || searchParams.get('vendor_domain');
        const targetValue = encryptedToken || queryDomain || hostname;

        if (targetValue && targetValue !== 'localhost' && targetValue !== '127.0.0.1') {
          const resolved = await resolveVendorByDomain(targetValue);
          if (resolved) {
            setVendorConfig(resolved);
            if (resolved.encrypted_token && !encryptedToken) {
              const url = new URL(window.location.href);
              url.searchParams.delete('domain');
              url.searchParams.set('vt', resolved.encrypted_token);
              window.history.replaceState({}, '', url.toString());
            }
            return;
          }
        }
      } catch (err) {
        console.warn('Runtime mode / Domain auto-resolution fallback:', err);
      }
      // Default initial fetch
      handleVendorSelect(vendorConfig.vendor_id);
    };

    initModeAndDomain();
  }, []);

  const handleAuthSuccess = (authenticatedUser: any, token: string) => {
    if (authenticatedUser.role === 'ROLE_CHAUFFEUR') {
      switchPersona('ROLE_CHAUFFEUR');
      setActiveView('DRIVER_APP');
    } else if (authenticatedUser.role === 'ROLE_CORPORATE_BOOKER') {
      switchPersona('ROLE_CORPORATE_BOOKER');
      setActiveView('CORPORATE_PORTAL');
    } else if (authenticatedUser.role === 'ROLE_SUPER_ADMIN') {
      switchPersona('ROLE_SUPER_ADMIN');
      setActiveView('GLOBAL_HUB_ADMIN');
    } else if (authenticatedUser.role === 'ROLE_VENDOR_ADMIN' || authenticatedUser.role === 'ROLE_DISPATCHER') {
      switchPersona('ROLE_VENDOR_ADMIN');
      setActiveView('VENDOR_OWNER_DASHBOARD');
    } else {
      switchPersona('ROLE_CUSTOMER');
      setPublicPage('BOOKING');
      setActiveView('PUBLIC_WEBSITE');
    }
  };

  // Render Inner View Component
  const renderViewContent = () => {
    // --- 1. DRIVER / CHAUFFEUR MOBILE APP VIEW ---
    if (role === 'ROLE_CHAUFFEUR' || activeView === 'DRIVER_APP') {
      return (
        <div style={{ minHeight: '100vh', backgroundColor: '#F1F5F9', color: '#0F172A', display: 'flex', flexDirection: 'column', fontFamily: 'var(--font-family)' }}>
          {/* Top Header to Return to Storefront / Owner Portal */}
          <div style={{ background: '#FFFFFF', borderBottom: '1px solid #E2E8F0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', padding: '12px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '14px', fontWeight: 800, color: '#0F172A' }}>📱 Chauffeur Mobile Portal</span>
              <span style={{ fontSize: '12px', color: '#64748B' }}>• {vendorConfig.vendor_name}</span>
            </div>

            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                onClick={() => {
                  switchPersona('ROLE_VENDOR_ADMIN');
                  setActiveView('VENDOR_OWNER_DASHBOARD');
                }}
                style={{
                  background: '#0078D4',
                  color: '#FFFFFF',
                  border: 'none',
                  borderRadius: '6px',
                  padding: '6px 14px',
                  fontSize: '12px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  boxShadow: '0 1px 2px rgba(0, 120, 212, 0.2)'
                }}
              >
                🏢 Owner Console
              </button>

              <button
                onClick={() => {
                  switchPersona('ROLE_CUSTOMER');
                  setActiveView('PUBLIC_WEBSITE');
                }}
                style={{
                  background: '#F8FAFC',
                  color: '#334155',
                  border: '1px solid #CBD5E1',
                  borderRadius: '6px',
                  padding: '6px 14px',
                  fontSize: '12px',
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                🌐 Public Website
              </button>
            </div>
          </div>

          <div style={{ flex: 1, padding: '24px 16px', maxWidth: '680px', margin: '0 auto', width: '100%' }}>
            <DriverMobileDashboard />
          </div>
        </div>
      );
    }

    // --- 2. CORPORATE BOOKER & EXPENSE HUB PORTAL ---
    if (role === 'ROLE_CORPORATE_BOOKER' || activeView === 'CORPORATE_PORTAL') {
      return (
        <div style={{ minHeight: '100vh', backgroundColor: '#F8FAFC', display: 'flex', flexDirection: 'column' }}>
          <div style={{ background: '#FFFFFF', borderBottom: '1px solid #E2E8F0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', padding: '12px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '14px', fontWeight: 800, color: '#0F172A' }}>🏢 Corporate Booker & Expense Hub</span>
              <span style={{ fontSize: '12px', color: '#64748B' }}>• {vendorConfig.vendor_name}</span>
            </div>

            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                onClick={() => {
                  switchPersona('ROLE_VENDOR_ADMIN');
                  setActiveView('VENDOR_OWNER_DASHBOARD');
                }}
                style={{
                  background: '#0078D4',
                  color: '#FFFFFF',
                  border: 'none',
                  borderRadius: '6px',
                  padding: '6px 14px',
                  fontSize: '12px',
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                🏢 Owner Console
              </button>

              <button
                onClick={() => {
                  switchPersona('ROLE_CUSTOMER');
                  setActiveView('PUBLIC_WEBSITE');
                  setPublicPage('HOME');
                }}
                style={{
                  background: '#F8FAFC',
                  color: '#334155',
                  border: '1px solid #CBD5E1',
                  borderRadius: '6px',
                  padding: '6px 14px',
                  fontSize: '12px',
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                🌐 Public Website
              </button>
            </div>
          </div>
          <CorporateBookerPortal />
        </div>
      );
    }

    // --- 2b. MULTI-VENDOR REAL-TIME LIVE COMPARISON STUDIO ---
    if (activeView === 'MULTI_VENDOR_STUDIO') {
      return (
        <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
          <div style={{ background: '#0F172A', borderBottom: '1px solid #1E293B', padding: '10px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '13px', fontWeight: 800, color: '#38BDF8' }}>⚡ Live Dynamic Pricing & Multi-Vendor Comparison Studio</span>
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                onClick={() => setActiveView('GLOBAL_MARKETPLACE')}
                style={{ background: '#1E293B', color: '#E2E8F0', border: '1px solid #334155', borderRadius: '6px', padding: '6px 14px', fontSize: '12px', fontWeight: 700, cursor: 'pointer' }}
              >
                🌐 Global Marketplace
              </button>
              <button
                onClick={() => {
                  setActiveView('PUBLIC_WEBSITE');
                  setPublicPage('HOME');
                }}
                style={{ background: '#0078D4', color: '#FFFFFF', border: 'none', borderRadius: '6px', padding: '6px 14px', fontSize: '12px', fontWeight: 700, cursor: 'pointer' }}
              >
                🏠 Return to Storefront
              </button>
            </div>
          </div>
          <MultiVendorComparisonStudio />
        </div>
      );
    }

    // --- 3. GLOBAL HUB WORLDWIDE MARKETPLACE VIEW (Port 8000) ---
    if (isGlobalHub && activeView === 'GLOBAL_MARKETPLACE') {
      return (
        <GlobalMarketplaceBookingPage
          onOpenAdminPortal={() => setActiveView('GLOBAL_HUB_ADMIN')}
          onOpenOperatorOnboarding={() => setActiveView('OPERATOR_ONBOARDING')}
        />
      );
    }

    // --- 4. GLOBAL HUB SAAS SUPERADMIN CONSOLE (Port 8000 Admin) ---
    if (activeView === 'GLOBAL_HUB_ADMIN' || role === 'ROLE_SUPER_ADMIN') {
      return (
        <GlobalHubAdminPortal
          onNavigateToGlobalBooking={() => setActiveView(isGlobalHub ? 'GLOBAL_MARKETPLACE' : 'PUBLIC_WEBSITE')}
        />
      );
    }

    // --- 5. DEDICATED LOCAL VENDOR OWNER DASHBOARD (Port 8001 / 8002) ---
    if (activeView === 'VENDOR_OWNER_DASHBOARD' || ((role === 'ROLE_VENDOR_ADMIN' || role === 'ROLE_DISPATCHER') && activeView !== 'PUBLIC_WEBSITE')) {
      return (
        <VendorOwnerDashboard
          config={vendorConfig}
          onNavigateToStorefront={() => {
            switchPersona('ROLE_CUSTOMER');
            setActiveView('PUBLIC_WEBSITE');
            setPublicPage('HOME');
          }}
        />
      );
    }

    // --- 6. PUBLIC SELF-SERVICE OPERATOR ONBOARDING PORTAL ---
    if (activeView === 'OPERATOR_ONBOARDING') {
      return (
        <PublicVendorOnboardingPage
          onNavigateHome={() => setActiveView(isGlobalHub ? 'GLOBAL_MARKETPLACE' : 'PUBLIC_WEBSITE')}
          onSuccessRedirect={async (vendorId, secureUrl) => {
            try {
              const newCfg = await fetchVendorPortalConfig(vendorId);
              setVendorConfig(newCfg);
            } catch (e) {
              console.error('Could not fetch new vendor config', e);
            }
            switchPersona('ROLE_VENDOR_ADMIN');
            setActiveView('VENDOR_OWNER_DASHBOARD');
            if (secureUrl) {
              window.history.pushState({}, '', secureUrl);
            }
          }}
        />
      );
    }

    // --- 7. PUBLIC MOBILE VENDOR QUOTE PORTAL (External RFP Landing Page) ---
    if (activeView === 'PUBLIC_VENDOR_QUOTE') {
      const searchParams = new URLSearchParams(window.location.search);
      const token = searchParams.get('token') || searchParams.get('quote_token') || '';
      return (
        <PublicVendorQuotePortal
          token={token}
          onBackToMain={() => setActiveView('VENDOR_OWNER_DASHBOARD')}
        />
      );
    }

    // --- 8. WHITE-LABELED PUBLIC MULTI-PAGE CUSTOMER WEBSITE (Port 8001 / 8002) ---
    return (
      <div className="public-site" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
        {/* Public Header with Option 1 Premium Chauffeur Styling */}
        <PublicHeader
          config={vendorConfig}
          activeTab={publicPage}
          onSelectTab={(page) => setPublicPage(page)}
          selectedVendorId={vendorConfig.vendor_id}
          onSelectVendor={handleVendorSelect}
          onAuthSuccess={handleAuthSuccess}
          onOpenOwnerPortal={() => {
            switchPersona('ROLE_VENDOR_ADMIN');
            setActiveView('VENDOR_OWNER_DASHBOARD');
          }}
          onOpenDriverApp={() => {
            switchPersona('ROLE_CHAUFFEUR');
            setActiveView('DRIVER_APP');
          }}
          onOpenOperatorOnboarding={() => setActiveView('OPERATOR_ONBOARDING')}
          isSovereignMode={isSovereignMode}
        />

        {/* Main Multi-Page Container */}
        <main style={{ flex: 1, maxWidth: '1440px', width: '100%', margin: '0 auto', padding: '32px 24px' }}>
          {publicPage === 'HOME' && (
            <PublicHomePage
              branding={vendorConfig.branding}
              vendorName={vendorConfig.vendor_name}
              onNavigateToBooking={(details) => setPublicPage('BOOKING')}
              onNavigateToFleet={() => setPublicPage('FLEET')}
            />
          )}

          {publicPage === 'FLEET' && (
            <PublicFleetPage
              config={vendorConfig}
              onSelectVehicle={(vClass) => setPublicPage('BOOKING')}
            />
          )}

          {publicPage === 'SERVICES' && (
            <PublicServicesPage
              branding={vendorConfig.branding}
              vendorName={vendorConfig.vendor_name}
              onBookService={(svc) => setPublicPage('BOOKING')}
            />
          )}

          {publicPage === 'ABOUT' && (
            <PublicAboutPage
              branding={vendorConfig.branding}
              vendorName={vendorConfig.vendor_name}
              onNavigateToBooking={() => setPublicPage('BOOKING')}
              onNavigateToFleet={() => setPublicPage('FLEET')}
            />
          )}

          {publicPage === 'POLICIES' && (
            <PublicPoliciesPage
              branding={vendorConfig.branding}
              vendorName={vendorConfig.vendor_name}
              onNavigateToBooking={() => setPublicPage('BOOKING')}
              onNavigateToContact={() => setPublicPage('CONTACT')}
            />
          )}

          {publicPage === 'CONTACT' && (
            <PublicContactPage
              branding={vendorConfig.branding}
              vendorName={vendorConfig.vendor_name}
              onNavigateToBooking={() => setPublicPage('BOOKING')}
            />
          )}

          {publicPage === 'BOOKING' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', fontFamily: 'var(--font-ui)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: '16px', borderBottom: '1px solid #E5E8ED' }}>
                <div>
                  <h1 style={{ fontFamily: '"Libre Baskerville", Georgia, serif', fontSize: '28px', fontWeight: 400, color: '#0B1B2D', margin: '0 0 4px 0' }}>
                    Direct Executive Reservation
                  </h1>
                  <p style={{ fontSize: '13px', color: '#586579', margin: 0 }}>
                    Guaranteed upfront pricing and dedicated flight tracking with {vendorConfig.vendor_name}
                  </p>
                </div>
                <button
                  onClick={() => setPublicPage('HOME')}
                  style={{ 
                    background: '#FFFFFF', 
                    border: '1px solid #E5E8ED', 
                    color: '#967B42', 
                    fontSize: '12px', 
                    fontWeight: 600, 
                    padding: '8px 14px',
                    borderRadius: '5px',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease'
                  }}
                >
                  ← Return to Overview
                </button>
              </div>
              <CustomerPortal config={vendorConfig} />
            </div>
          )}
        </main>

        {/* Public Footer with PPA/TLC Regulatory & $5M Insurance Trust Badges */}
        <PublicFooter
          config={vendorConfig}
          onSelectTab={(page) => setPublicPage(page)}
          onOpenOperatorOnboarding={() => setActiveView('OPERATOR_ONBOARDING')}
        />
      </div>
    );
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <div style={{ flex: 1 }}>
        {renderViewContent()}
      </div>
    </div>
  );
};

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <MainLayout />
    </AuthProvider>
  );
};

export default App;

