import React from 'react';
import { ShieldCheck, Lock, Award, Phone, Mail, MapPin, Crown } from 'lucide-react';
import { VendorPortalConfig } from '../../types';
import { PublicPageTab } from './PublicHeader';

interface PublicFooterProps {
  config: VendorPortalConfig;
  onSelectTab: (tab: PublicPageTab) => void;
  onOpenOperatorOnboarding?: () => void;
}

export const PublicFooter: React.FC<PublicFooterProps> = ({ config, onSelectTab, onOpenOperatorOnboarding }) => {
  const branding = config.branding || {};

  return (
    <footer style={{
      background: '#FFFFFF',
      color: '#586579',
      borderTop: '1px solid #E5E8ED',
      padding: '52px 24px 28px 24px',
      fontSize: '13px',
      fontFamily: 'var(--font-ui)',
      boxShadow: '0 -2px 10px rgba(16, 37, 63, 0.02)'
    }}>
      <div style={{
        maxWidth: '1440px',
        margin: '0 auto',
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
        gap: '40px',
        marginBottom: '40px'
      }}>
        
        {/* Column 1: Company Profile & Trust Badges */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
            <div style={{
              width: '36px',
              height: '36px',
              borderRadius: '6px',
              background: '#0B1B2D',
              border: '1px solid #967B42',
              color: '#967B42',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 800,
              fontSize: '18px',
              fontFamily: '"Libre Baskerville", Georgia, serif'
            }}>
              {config.vendor_name.charAt(0)}
            </div>
            <div>
              <span style={{ fontFamily: '"Libre Baskerville", Georgia, serif', fontSize: '18px', fontWeight: 400, color: '#0B1B2D', display: 'block' }}>
                {config.vendor_name}
              </span>
              <span style={{ fontSize: '11px', color: '#806734', fontWeight: 600, letterSpacing: '0.04em' }}>
                Philadelphia &amp; Beyond
              </span>
            </div>
          </div>

          <p style={{ color: '#586579', lineHeight: 1.65, fontSize: '12px', margin: '0 0 18px 0' }}>
            {branding.company_tagline || 'Leading executive chauffeur provider with licensed career chauffeurs, FlightAware telemetry radar, and guaranteed $5,000,000 livery protection.'}
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#059669', fontWeight: 600 }}>
              <ShieldCheck size={15} /> $5,000,000 Commercial Liability Coverage
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#10253F', fontWeight: 600 }}>
              <Lock size={15} /> 256-bit Encrypted Pre-Auth Security
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#967B42', fontWeight: 600 }}>
              <Award size={15} /> TLC / PPA Certified Background-Checked Chauffeurs
            </div>
          </div>
        </div>

        {/* Column 2: Quick Links */}
        <div>
          <h4 style={{ fontFamily: '"Libre Baskerville", Georgia, serif', color: '#0B1B2D', fontSize: '15px', fontWeight: 400, marginBottom: '16px' }}>
            Navigation &amp; Services
          </h4>
          <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <li>
              <button
                onClick={() => onSelectTab('HOME')}
                style={{ background: 'transparent', border: 'none', color: '#586579', cursor: 'pointer', padding: 0, fontSize: '13px', fontWeight: 500, textAlign: 'left', transition: 'color 0.15s ease' }}
                onMouseOver={(e) => (e.currentTarget.style.color = '#0B1B2D')}
                onMouseOut={(e) => (e.currentTarget.style.color = '#586579')}
              >
                Instant Chauffeur Quote
              </button>
            </li>
            <li>
              <button
                onClick={() => onSelectTab('FLEET')}
                style={{ background: 'transparent', border: 'none', color: '#586579', cursor: 'pointer', padding: 0, fontSize: '13px', fontWeight: 500, textAlign: 'left', transition: 'color 0.15s ease' }}
                onMouseOver={(e) => (e.currentTarget.style.color = '#0B1B2D')}
                onMouseOut={(e) => (e.currentTarget.style.color = '#586579')}
              >
                Executive Fleet Showroom (Escalade &amp; Denali)
              </button>
            </li>
            <li>
              <button
                onClick={() => onSelectTab('SERVICES')}
                style={{ background: 'transparent', border: 'none', color: '#586579', cursor: 'pointer', padding: 0, fontSize: '13px', fontWeight: 500, textAlign: 'left', transition: 'color 0.15s ease' }}
                onMouseOver={(e) => (e.currentTarget.style.color = '#0B1B2D')}
                onMouseOut={(e) => (e.currentTarget.style.color = '#586579')}
              >
                Airport Transfers &amp; FBO Tarmac Clearance
              </button>
            </li>
            {onOpenOperatorOnboarding && (
              <li>
                <button
                  onClick={onOpenOperatorOnboarding}
                  style={{ background: 'transparent', border: 'none', color: '#967B42', cursor: 'pointer', padding: 0, fontSize: '13px', fontWeight: 700, textAlign: 'left', transition: 'color 0.15s ease' }}
                  onMouseOver={(e) => (e.currentTarget.style.color = '#806734')}
                  onMouseOut={(e) => (e.currentTarget.style.color = '#967B42')}
                >
                  👑 Operator Onboarding &amp; Fleet Expansion
                </button>
              </li>
            )}
            <li>
              <button
                onClick={() => onSelectTab('ABOUT')}
                style={{ background: 'transparent', border: 'none', color: '#586579', cursor: 'pointer', padding: 0, fontSize: '13px', fontWeight: 500, textAlign: 'left', transition: 'color 0.15s ease' }}
                onMouseOver={(e) => (e.currentTarget.style.color = '#0B1B2D')}
                onMouseOut={(e) => (e.currentTarget.style.color = '#586579')}
              >
                Chauffeur Standards &amp; Safety
              </button>
            </li>
            <li>
              <button
                onClick={() => onSelectTab('POLICIES')}
                style={{ background: 'transparent', border: 'none', color: '#586579', cursor: 'pointer', padding: 0, fontSize: '13px', fontWeight: 500, textAlign: 'left', transition: 'color 0.15s ease' }}
                onMouseOver={(e) => (e.currentTarget.style.color = '#0B1B2D')}
                onMouseOut={(e) => (e.currentTarget.style.color = '#586579')}
              >
                Policies, Terms &amp; Cancellation Windows
              </button>
            </li>
          </ul>
        </div>

        {/* Column 3: Service Areas & Airports */}
        <div>
          <h4 style={{ fontFamily: '"Libre Baskerville", Georgia, serif', color: '#0B1B2D', fontSize: '15px', fontWeight: 400, marginBottom: '16px' }}>
            Service Corridors &amp; FBOs
          </h4>
          <p style={{ fontSize: '12px', color: '#586579', lineHeight: 1.6, margin: '0 0 14px 0' }}>
            Providing 24/7 private terminal staging and door-to-door luxury transport across:
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
            {['PHL Airport', 'Atlantic Aviation FBO', 'Center City Philadelphia', 'Main Line PA', 'JFK & EWR Hubs', 'Manhattan VIP', 'Wilmington DE', 'Atlantic City'].map((area) => (
              <span
                key={area}
                style={{
                  background: '#F8FAFC',
                  color: '#10253F',
                  padding: '5px 10px',
                  borderRadius: '5px',
                  fontSize: '11px',
                  fontWeight: 600,
                  border: '1px solid #E5E8ED'
                }}
              >
                {area}
              </span>
            ))}
          </div>
        </div>

        {/* Column 4: 24/7 Dispatch Office */}
        <div>
          <h4 style={{ fontFamily: '"Libre Baskerville", Georgia, serif', color: '#0B1B2D', fontSize: '15px', fontWeight: 400, marginBottom: '16px' }}>
            Dispatch Headquarters
          </h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '12px', color: '#586579' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
              <MapPin size={15} color="#967B42" style={{ flexShrink: 0, marginTop: '2px' }} />
              <span style={{ lineHeight: '1.5' }}>{branding.office_address || '1500 Market St, Center City, Philadelphia, PA 19102'}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Phone size={15} color="#967B42" style={{ flexShrink: 0 }} />
              <strong style={{ color: '#0B1B2D', fontSize: '13px' }}>{branding.contact_phone || '+1 (215) 555-0144'}</strong>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Mail size={15} color="#967B42" style={{ flexShrink: 0 }} />
              <span>{branding.domain ? `dispatch@${branding.domain}` : 'dispatch@anblimo-philly.com'}</span>
            </div>
          </div>
        </div>

      </div>

      {/* Copyright & Regulatory Attribution Bar */}
      <div style={{
        maxWidth: '1440px',
        margin: '0 auto',
        borderTop: '1px solid #E5E8ED',
        paddingTop: '20px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '12px',
        fontSize: '11px',
        color: '#586579'
      }}>
        <div>
          © {new Date().getFullYear()} {config.vendor_name}. All rights reserved. Sovereign Cellular Operations Node #{config.vendor_id}.
        </div>
        <div style={{ display: 'flex', gap: '18px', flexWrap: 'wrap' }}>
          <span style={{ cursor: 'pointer' }} onClick={() => onSelectTab('POLICIES')}>Privacy Policy</span>
          <span style={{ cursor: 'pointer' }} onClick={() => onSelectTab('POLICIES')}>Terms of Carriage</span>
          <span style={{ cursor: 'pointer' }} onClick={() => onSelectTab('ABOUT')}>TLC / PPA Authority</span>
          <span>NIST AI Safety Guardrails</span>
        </div>
      </div>
    </footer>
  );
};
