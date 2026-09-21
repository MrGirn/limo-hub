import React, { useState, useEffect, useRef } from 'react';
import { Menu, X, Calendar } from 'lucide-react';
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
  onAuthSuccess
}) => {
  const [isAuthDropdownOpen, setIsAuthDropdownOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isLookupModalOpen, setIsLookupModalOpen] = useState(false);
  const menuToggleRef = useRef<HTMLButtonElement>(null);
  const mobileMenuRef = useRef<HTMLDivElement>(null);

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
            
            {/* Sign In Dropdown Wrapper */}
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
                onAuthSuccess={(user, token) => {
                  setIsAuthDropdownOpen(false);
                  if (onAuthSuccess) onAuthSuccess(user, token);
                }}
                vendorName={config.vendor_name || 'Executive Chauffeur'}
                vendorId={config.vendor_id}
              />
            </div>

            {/* Book a Ride Button */}
            <button
              className="public-header__book"
              onClick={() => handleNavClick('HOME')}
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
            onClick={() => {
              setIsMobileMenuOpen(false);
              setIsLookupModalOpen(true);
            }}
            style={{ color: '#9A7B4F', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <Calendar size={16} />
            <span>My Bookings</span>
          </button>
          <button
            onClick={() => {
              setIsMobileMenuOpen(false);
              setIsAuthDropdownOpen(true);
            }}
            style={{ borderTop: '1px solid var(--border)', marginTop: '4px', paddingTop: '12px' }}
          >
            Sign In
          </button>
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

