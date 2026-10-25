import React, { useState, useEffect, useRef } from 'react';
import { Menu, X, Calendar, LogOut } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { VendorPortalConfig, UserSession } from '../../types';
import { PublicAuthDropdown } from './PublicAuthDropdown';
import { CustomerBookingsLookupModal } from './CustomerBookingsLookupModal';

export type PublicPage = 'HOME' | 'FLEET' | 'ABOUT' | 'SERVICES' | 'POLICIES' | 'CONTACT' | 'BOOKING';
export type PublicPageTab = PublicPage;

export interface PublicHeaderProps {
  config: VendorPortalConfig;
  activeTab: PublicPage;
  onSelectTab: (tab: PublicPage) => void;
  availableVendors?: { id: string; name: string }[];
  selectedVendorId?: string;
  onSelectVendor?: (id: string) => void;
  onOpenAuthModal?: () => void;
  onAuthSuccess?: (user: UserSession, token: string) => void;
  onOpenOwnerPortal?: () => void;
  onOpenDriverApp?: () => void;
  onOpenOperatorOnboarding?: () => void;
  isSovereignMode?: boolean;
}

export const PublicHeader: React.FC<PublicHeaderProps> = ({
  config,
  activeTab,
  onSelectTab,
  onAuthSuccess,
  onOpenOwnerPortal,
  onOpenDriverApp,
  isSovereignMode
}) => {
  const { user, token, logout } = useAuth();
  const [isAuthDropdownOpen, setIsAuthDropdownOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isLookupModalOpen, setIsLookupModalOpen] = useState(false);
  const menuToggleRef = useRef<HTMLButtonElement>(null);
  const mobileMenuRef = useRef<HTMLDivElement>(null);

  const isOwnerOrDispatcher = Boolean(
    token && user && (
      user.role === 'ROLE_VENDOR_ADMIN' ||
      user.role === 'ROLE_DISPATCHER' ||
      user.role === 'ROLE_SUPER_ADMIN'
    )
  );

  const isChauffeur = Boolean(
    token && user && user.role === 'ROLE_CHAUFFEUR'
  );

  // Close mobile menu on Escape key and restore focus
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (isMobileMenuOpen) {
          setIsMobileMenuOpen(false);
          menuToggleRef.current?.focus();
        }
        if (isAuthDropdownOpen) {
          setIsAuthDropdownOpen(false);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isMobileMenuOpen, isAuthDropdownOpen]);

  const handleNavClick = (tab: PublicPage) => {
    onSelectTab(tab);
    setIsMobileMenuOpen(false);
  };

  return (
    <>
      <header className="public-header" role="banner">
        <div className="public-header__inner">
          
          {/* Brand: Logo + Dynamic Vendor Name + Tagline */}
          <div 
            className="public-header__brand"
            onClick={() => handleNavClick('HOME')}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') handleNavClick('HOME'); }}
            aria-label={`${config.vendor_name || 'Executive Chauffeur'} - Return to homepage`}
          >
            <div className="public-header__logo" aria-hidden="true" style={{ backgroundColor: config.branding?.primary_color || '#0B1B2D' }}>
              <span>{(config.vendor_name || 'E').charAt(0).toUpperCase()}</span>
            </div>
            <div className="public-header__brand-copy">
              <span className="public-header__name">{config.vendor_name || 'Executive Limousine'}</span>
              <span className="public-header__tagline">
                {config.branding?.company_tagline || (config.city ? `${config.city} & Regional Metro` : 'Philadelphia & Beyond')}
              </span>
            </div>
          </div>

          {/* Desktop Navigation */}
          <nav className="public-header__nav" aria-label="Main Navigation">
            <button
              onClick={() => handleNavClick('FLEET')}
              aria-current={activeTab === 'FLEET' ? 'page' : undefined}
            >
              Our Fleet
            </button>
            <button
              onClick={() => handleNavClick('SERVICES')}
              aria-current={activeTab === 'SERVICES' ? 'page' : undefined}
            >
              Services
            </button>
            <button
              onClick={() => handleNavClick('ABOUT')}
              aria-current={activeTab === 'ABOUT' ? 'page' : undefined}
            >
              About
            </button>
            <button
              onClick={() => handleNavClick('CONTACT')}
              aria-current={activeTab === 'CONTACT' ? 'page' : undefined}
            >
              Contact
            </button>
            <button
              type="button"
              onClick={() => setIsLookupModalOpen(true)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                color: '#9A7B4F',
                fontWeight: 700,
                cursor: 'pointer'
              }}
            >
              <Calendar size={14} />
              <span>My Bookings</span>
            </button>
          </nav>

          {/* Actions: Sign In + Book a Ride + Mobile Menu Toggle */}
          <div className="public-header__actions">
            
            {/* User Session Profile & Sign Out or Sign In Trigger */}
            {token && user ? (
              <div className="public-header__user-session" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '4px 10px',
                  backgroundColor: '#F8FAFC',
                  borderRadius: '20px',
                  border: '1px solid #E2E8F0',
                  fontSize: '12px',
                  color: '#0F172A',
                  fontWeight: 600
                }}>
                  <span style={{
                    width: '20px',
                    height: '20px',
                    borderRadius: '50%',
                    backgroundColor: '#0A192F',
                    color: '#D4AF37',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '11px',
                    fontWeight: 800
                  }}>
                    {(user.full_name || user.email || 'U').charAt(0).toUpperCase()}
                  </span>
                  <span style={{ maxWidth: '110px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {user.full_name || user.email.split('@')[0]}
                  </span>
                  <span style={{
                    fontSize: '9px',
                    fontWeight: 800,
                    padding: '2px 5px',
                    borderRadius: '4px',
                    letterSpacing: '0.3px',
                    backgroundColor: user.role === 'ROLE_VENDOR_ADMIN' ? '#FEF3C7' : user.role === 'ROLE_DISPATCHER' ? '#DBEAFE' : user.role === 'ROLE_CHAUFFEUR' ? '#DCFCE7' : user.role === 'ROLE_CORPORATE_BOOKER' ? '#F3E8FF' : '#F1F5F9',
                    color: user.role === 'ROLE_VENDOR_ADMIN' ? '#92400E' : user.role === 'ROLE_DISPATCHER' ? '#1E40AF' : user.role === 'ROLE_CHAUFFEUR' ? '#166534' : user.role === 'ROLE_CORPORATE_BOOKER' ? '#6B21A8' : '#475569'
                  }}>
                    {user.role === 'ROLE_VENDOR_ADMIN' ? 'ADMIN' : user.role === 'ROLE_DISPATCHER' ? 'DISPATCH' : user.role === 'ROLE_CHAUFFEUR' ? 'CHAUFFEUR' : user.role === 'ROLE_CORPORATE_BOOKER' ? 'CORP' : 'GUEST'}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={logout}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    padding: '6px 10px',
                    backgroundColor: '#FEF2F2',
                    color: '#DC2626',
                    border: '1px solid #FECACA',
                    borderRadius: '6px',
                    fontSize: '11.5px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    transition: 'all 0.15s ease'
                  }}
                  title="Sign out of your session"
                >
                  <LogOut size={13} />
                  <span>Sign Out</span>
                </button>
              </div>
            ) : (
              <div className="public-header__signin-wrapper" style={{ position: 'relative' }}>
                <button
                  className="public-header__signin"
                  onClick={() => setIsAuthDropdownOpen((prev) => !prev)}
                  aria-expanded={isAuthDropdownOpen}
                  aria-haspopup="true"
                >
                  Sign In
                </button>

                {/* Auth Dropdown (Google / Apple / Password) */}
                <PublicAuthDropdown
                  isOpen={isAuthDropdownOpen}
                  onClose={() => setIsAuthDropdownOpen(false)}
                  onAuthSuccess={(u, t) => {
                    setIsAuthDropdownOpen(false);
                    if (onAuthSuccess) onAuthSuccess(u, t);
                  }}
                  vendorName={config.vendor_name || 'Executive Chauffeur'}
                  vendorId={config.vendor_id}
                />
              </div>
            )}

            {/* Book a Ride Button (Compact on Mobile or in Drawer) */}
            <button
              className="public-header__book public-header-desktop-only"
              onClick={() => handleNavClick('BOOKING')}
            >
              Book a Ride
            </button>

            {/* Owner Operations Portal Shortcut (Authorized Role Only) */}
            {isOwnerOrDispatcher && onOpenOwnerPortal && (
              <button
                type="button"
                className="public-header-desktop-only"
                onClick={onOpenOwnerPortal}
                style={{
                  background: '#0F172A',
                  color: '#FFFFFF',
                  border: '1px solid #334155',
                  borderRadius: '6px',
                  padding: '7px 12px',
                  fontSize: '11px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px'
                }}
                title="Return to Sovereign Vendor Operations & Dispatch Console"
              >
                <span>🏢 Owner Console</span>
              </button>
            )}

            {/* Chauffeur Mobile Portal Shortcut (Authorized Chauffeur Only) */}
            {isChauffeur && onOpenDriverApp && (
              <button
                type="button"
                className="public-header-desktop-only"
                onClick={onOpenDriverApp}
                style={{
                  background: '#064E3B',
                  color: '#FFFFFF',
                  border: '1px solid #059669',
                  borderRadius: '6px',
                  padding: '7px 12px',
                  fontSize: '11px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px'
                }}
                title="Open Chauffeur Mobile Manifest"
              >
                <span>🚗 Driver App</span>
              </button>
            )}

            {/* Mobile Menu Toggle Button */}
            <button
              ref={menuToggleRef}
              className="public-header__menu-toggle"
              onClick={() => setIsMobileMenuOpen((prev) => !prev)}
              aria-expanded={isMobileMenuOpen}
              aria-controls="public-mobile-nav"
              aria-label={isMobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
            >
              {isMobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
            </button>

          </div>

        </div>

        {/* Mobile Drawer Menu */}
        <div 
          id="public-mobile-nav"
          ref={mobileMenuRef}
          className="public-header__mobile-menu"
          hidden={!isMobileMenuOpen}
          aria-label="Mobile Navigation"
        >
          <button
            onClick={() => handleNavClick('BOOKING')}
            aria-current={activeTab === 'BOOKING' ? 'page' : undefined}
            style={{ fontWeight: 800, color: '#D4AF37', fontSize: '15px' }}
          >
            ✨ Book an Executive Ride
          </button>
          <button
            onClick={() => {
              setIsMobileMenuOpen(false);
              setIsLookupModalOpen(true);
            }}
            style={{ color: '#9A7B4F', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px' }}
          >
            <Calendar size={16} />
            <span>My Bookings &amp; Ride Status</span>
          </button>
          <button
            onClick={() => handleNavClick('FLEET')}
            aria-current={activeTab === 'FLEET' ? 'page' : undefined}
          >
            Our Fleet
          </button>
          <button
            onClick={() => handleNavClick('SERVICES')}
            aria-current={activeTab === 'SERVICES' ? 'page' : undefined}
          >
            Services
          </button>
          <button
            onClick={() => handleNavClick('ABOUT')}
            aria-current={activeTab === 'ABOUT' ? 'page' : undefined}
          >
            About
          </button>
          <button
            onClick={() => handleNavClick('CONTACT')}
            aria-current={activeTab === 'CONTACT' ? 'page' : undefined}
          >
            Contact
          </button>

          {/* Mobile Auth Section */}
          {token && user ? (
            <div style={{ borderTop: '1px solid var(--border)', marginTop: '8px', paddingTop: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 10px', background: '#F8FAFC', borderRadius: '6px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{
                    width: '24px',
                    height: '24px',
                    borderRadius: '50%',
                    backgroundColor: '#0A192F',
                    color: '#D4AF37',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '11px',
                    fontWeight: 800
                  }}>
                    {(user.full_name || user.email || 'U').charAt(0).toUpperCase()}
                  </span>
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <span style={{ fontSize: '13px', fontWeight: 700, color: '#1E293B' }}>{user.full_name || user.email.split('@')[0]}</span>
                    <span style={{ fontSize: '11px', color: '#64748B' }}>{user.email}</span>
                  </div>
                </div>
                <span style={{ fontSize: '9px', fontWeight: 800, padding: '2px 5px', borderRadius: '4px', backgroundColor: '#E2E8F0', color: '#334155' }}>
                  {user.role === 'ROLE_VENDOR_ADMIN' ? 'ADMIN' : user.role === 'ROLE_DISPATCHER' ? 'DISPATCH' : user.role === 'ROLE_CHAUFFEUR' ? 'DRIVER' : user.role === 'ROLE_CORPORATE_BOOKER' ? 'CORP' : 'GUEST'}
                </span>
              </div>
              <button
                onClick={() => {
                  setIsMobileMenuOpen(false);
                  logout();
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  color: '#DC2626',
                  fontWeight: 700,
                  fontSize: '13px',
                  padding: '8px 10px',
                  backgroundColor: '#FEF2F2',
                  border: '1px solid #FECACA',
                  borderRadius: '6px',
                  cursor: 'pointer'
                }}
              >
                <LogOut size={16} />
                <span>Sign Out</span>
              </button>
            </div>
          ) : (
            <button
              onClick={() => {
                setIsMobileMenuOpen(false);
                setIsAuthDropdownOpen(true);
              }}
              style={{ borderTop: '1px solid var(--border)', marginTop: '4px', paddingTop: '12px' }}
            >
              Sign In / Accounts
            </button>
          )}

          {/* Operations & Driver Shortcuts (Authorized Roles Only) */}
          {isOwnerOrDispatcher && onOpenOwnerPortal && (
            <button
              onClick={() => {
                setIsMobileMenuOpen(false);
                onOpenOwnerPortal();
              }}
              style={{ color: '#0078D4', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <span>🏢 Owner Console</span>
            </button>
          )}

          {isChauffeur && onOpenDriverApp && (
            <button
              onClick={() => {
                setIsMobileMenuOpen(false);
                onOpenDriverApp();
              }}
              style={{ color: '#059669', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <span>🚗 Driver App</span>
            </button>
          )}
        </div>

      </header>

      {/* Customer Upcoming Bookings & Schedule Lookup Modal */}
      <CustomerBookingsLookupModal
        isOpen={isLookupModalOpen}
        onClose={() => setIsLookupModalOpen(false)}
      />
    </>
  );
};

