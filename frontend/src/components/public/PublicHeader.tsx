import React, { useState, useEffect, useRef } from 'react';
import { Menu, X, Calendar, LogOut, User, ChevronDown, Building2, Car } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { VendorPortalConfig, UserSession } from '../../types';
import { PublicAuthDropdown } from './PublicAuthDropdown';
import { CustomerBookingsLookupModal } from './CustomerBookingsLookupModal';
import { UserProfileModal } from './UserProfileModal';

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
  const { user, token, logout, setSession } = useAuth();
  const [isAuthDropdownOpen, setIsAuthDropdownOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isLookupModalOpen, setIsLookupModalOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);
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

  // Close mobile menu or user dropdown on Escape key and restore focus
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
        if (isUserMenuOpen) {
          setIsUserMenuOpen(false);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isMobileMenuOpen, isAuthDropdownOpen, isUserMenuOpen]);

  // Close user menu on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setIsUserMenuOpen(false);
      }
    };
    if (isUserMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isUserMenuOpen]);

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
            
            {/* User Session Dropdown or Sign In Trigger */}
            {token && user ? (
              <div ref={userMenuRef} className="public-header-desktop-only" style={{ position: 'relative' }}>
                <button
                  type="button"
                  onClick={() => setIsUserMenuOpen(prev => !prev)}
                  aria-expanded={isUserMenuOpen}
                  aria-haspopup="true"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '5px 12px 5px 6px',
                    backgroundColor: isUserMenuOpen ? '#FDFBF7' : '#FFFFFF',
                    borderRadius: '24px',
                    border: isUserMenuOpen ? '1px solid #C5A572' : '1px solid #E2E8F0',
                    fontSize: '12.5px',
                    color: '#0B1B2D',
                    fontWeight: 600,
                    cursor: 'pointer',
                    transition: 'all 0.18s ease',
                    boxShadow: isUserMenuOpen ? '0 2px 8px rgba(150, 123, 66, 0.2)' : '0 1px 3px rgba(11, 27, 45, 0.05)'
                  }}
                  title="Open Account Menu"
                >
                  <span style={{
                    width: '26px',
                    height: '26px',
                    borderRadius: '50%',
                    backgroundColor: '#0B1B2D',
                    color: '#D4AF37',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '12px',
                    fontWeight: 800,
                    border: '1px solid rgba(212, 175, 55, 0.35)',
                    flexShrink: 0
                  }}>
                    {(user.full_name || user.email || 'U').charAt(0).toUpperCase()}
                  </span>
                  <span style={{ maxWidth: '115px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {user.full_name || user.email.split('@')[0]}
                  </span>
                  <span style={{
                    fontSize: '9px',
                    fontWeight: 800,
                    padding: '2px 5px',
                    borderRadius: '4px',
                    letterSpacing: '0.4px',
                    textTransform: 'uppercase',
                    backgroundColor: user.role === 'ROLE_VENDOR_ADMIN' ? '#FEF3C7' : user.role === 'ROLE_DISPATCHER' ? '#DBEAFE' : user.role === 'ROLE_CHAUFFEUR' ? '#DCFCE7' : user.role === 'ROLE_CORPORATE_BOOKER' ? '#F3E8FF' : '#FDF4E7',
                    color: user.role === 'ROLE_VENDOR_ADMIN' ? '#92400E' : user.role === 'ROLE_DISPATCHER' ? '#1E40AF' : user.role === 'ROLE_CHAUFFEUR' ? '#166534' : user.role === 'ROLE_CORPORATE_BOOKER' ? '#6B21A8' : '#967B42',
                    border: user.role === 'ROLE_CUSTOMER' ? '1px solid rgba(150, 123, 66, 0.25)' : 'none'
                  }}>
                    {user.role === 'ROLE_VENDOR_ADMIN' ? 'ADMIN' : user.role === 'ROLE_DISPATCHER' ? 'DISPATCH' : user.role === 'ROLE_CHAUFFEUR' ? 'DRIVER' : user.role === 'ROLE_CORPORATE_BOOKER' ? 'CORP' : 'VIP'}
                  </span>
                  <ChevronDown
                    size={14}
                    style={{
                      color: '#64748B',
                      transition: 'transform 0.2s ease',
                      transform: isUserMenuOpen ? 'rotate(180deg)' : 'none'
                    }}
                  />
                </button>

                {/* Floating Luxury User Dropdown Menu */}
                {isUserMenuOpen && (
                  <div
                    style={{
                      position: 'absolute',
                      top: 'calc(100% + 8px)',
                      right: 0,
                      width: '260px',
                      backgroundColor: '#FFFFFF',
                      borderRadius: '12px',
                      border: '1px solid #E2E8F0',
                      boxShadow: '0 16px 36px -4px rgba(11, 27, 45, 0.16), 0 4px 12px -2px rgba(11, 27, 45, 0.08)',
                      padding: '8px',
                      zIndex: 1000
                    }}
                  >
                    {/* Header info */}
                    <div style={{ padding: '8px 10px 10px', borderBottom: '1px solid #F1F5F9', marginBottom: '4px' }}>
                      <div style={{ fontSize: '13px', fontWeight: 700, color: '#0B1B2D', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {user.full_name || 'VIP Client'}
                      </div>
                      <div style={{ fontSize: '11px', color: '#64748B', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {user.email}
                      </div>
                    </div>

                    {/* Menu items */}
                    <button
                      type="button"
                      onClick={() => {
                        setIsUserMenuOpen(false);
                        setIsProfileModalOpen(true);
                      }}
                      style={{
                        width: '100%',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                        padding: '8px 10px',
                        borderRadius: '8px',
                        border: 'none',
                        backgroundColor: 'transparent',
                        color: '#1E293B',
                        fontSize: '12.5px',
                        fontWeight: 600,
                        cursor: 'pointer',
                        textAlign: 'left',
                        transition: 'background 0.15s ease'
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#F8FAFC')}
                      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                    >
                      <User size={15} style={{ color: '#D4AF37', flexShrink: 0 }} />
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <span>Profile &amp; Preferences</span>
                        <span style={{ fontSize: '10px', color: '#94A3B8', fontWeight: 400 }}>VIP cabin temp, audio, beverage</span>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setIsUserMenuOpen(false);
                        setIsLookupModalOpen(true);
                      }}
                      style={{
                        width: '100%',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                        padding: '8px 10px',
                        borderRadius: '8px',
                        border: 'none',
                        backgroundColor: 'transparent',
                        color: '#1E293B',
                        fontSize: '12.5px',
                        fontWeight: 600,
                        cursor: 'pointer',
                        textAlign: 'left',
                        transition: 'background 0.15s ease'
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#F8FAFC')}
                      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                    >
                      <Calendar size={15} style={{ color: '#3B82F6', flexShrink: 0 }} />
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <span>My Bookings &amp; Status</span>
                        <span style={{ fontSize: '10px', color: '#94A3B8', fontWeight: 400 }}>Active ride GPS &amp; schedule</span>
                      </div>
                    </button>

                    {isOwnerOrDispatcher && onOpenOwnerPortal && (
                      <button
                        type="button"
                        onClick={() => {
                          setIsUserMenuOpen(false);
                          onOpenOwnerPortal();
                        }}
                        style={{
                          width: '100%',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '10px',
                          padding: '8px 10px',
                          borderRadius: '8px',
                          border: 'none',
                          backgroundColor: 'transparent',
                          color: '#0B1B2D',
                          fontSize: '12.5px',
                          fontWeight: 600,
                          cursor: 'pointer',
                          textAlign: 'left',
                          transition: 'background 0.15s ease'
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#F8FAFC')}
                        onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                      >
                        <Building2 size={15} style={{ color: '#0284C7', flexShrink: 0 }} />
                        <span>Owner Operations Console</span>
                      </button>
                    )}

                    {isChauffeur && onOpenDriverApp && (
                      <button
                        type="button"
                        onClick={() => {
                          setIsUserMenuOpen(false);
                          onOpenDriverApp();
                        }}
                        style={{
                          width: '100%',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '10px',
                          padding: '8px 10px',
                          borderRadius: '8px',
                          border: 'none',
                          backgroundColor: 'transparent',
                          color: '#0B1B2D',
                          fontSize: '12.5px',
                          fontWeight: 600,
                          cursor: 'pointer',
                          textAlign: 'left',
                          transition: 'background 0.15s ease'
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#F8FAFC')}
                        onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                      >
                        <Car size={15} style={{ color: '#059669', flexShrink: 0 }} />
                        <span>Driver App Manifest</span>
                      </button>
                    )}

                    <div style={{ height: '1px', backgroundColor: '#F1F5F9', margin: '4px 0' }} />

                    <button
                      type="button"
                      onClick={() => {
                        setIsUserMenuOpen(false);
                        logout();
                      }}
                      style={{
                        width: '100%',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                        padding: '8px 10px',
                        borderRadius: '8px',
                        border: 'none',
                        backgroundColor: 'transparent',
                        color: '#DC2626',
                        fontSize: '12.5px',
                        fontWeight: 600,
                        cursor: 'pointer',
                        textAlign: 'left',
                        transition: 'background 0.15s ease'
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#FEF2F2')}
                      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                    >
                      <LogOut size={15} style={{ flexShrink: 0 }} />
                      <span>Sign Out</span>
                    </button>
                  </div>
                )}
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
                type="button"
                onClick={() => {
                  setIsMobileMenuOpen(false);
                  setIsProfileModalOpen(true);
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  color: '#0F172A',
                  fontWeight: 700,
                  fontSize: '13px',
                  padding: '8px 10px',
                  backgroundColor: '#F1F5F9',
                  border: '1px solid #CBD5E1',
                  borderRadius: '6px',
                  cursor: 'pointer'
                }}
              >
                <User size={16} />
                <span>Profile &amp; Preferences</span>
              </button>
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

      {/* Executive User Profile, Security & Preferences Modal */}
      <UserProfileModal
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
        currentUser={user}
        onUpdateUser={(updatedUser) => {
          if (token) {
            setSession(updatedUser, token);
          }
        }}
      />
    </>
  );
};

