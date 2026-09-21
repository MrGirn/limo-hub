import React from 'react';
import { Shield, Award, Users, CheckCircle2, History, Globe, Star, HeartHandshake, Crown, Sparkles, ArrowRight, ShieldCheck } from 'lucide-react';
import { VendorBrandingProfile } from '../../types';

interface PublicAboutPageProps {
  branding: VendorBrandingProfile;
  vendorName: string;
  onNavigateToBooking?: () => void;
  onNavigateToFleet?: () => void;
}

export const PublicAboutPage: React.FC<PublicAboutPageProps> = ({ 
  branding, 
  vendorName,
  onNavigateToBooking,
  onNavigateToFleet
}) => {
  return (
    <div style={{ maxWidth: '1100px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '40px', padding: '16px 0', fontFamily: 'var(--font-ui)' }}>
      
      {/* 1. HERO HEADER WITH PRESTIGE BADGE */}
      <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', gap: '12px', maxWidth: '780px', margin: '0 auto' }}>
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '8px',
          background: '#FDFBF7',
          color: '#806734',
          border: '1px solid #EADBBE',
          padding: '6px 16px',
          borderRadius: '6px',
          fontSize: '12px',
          fontWeight: 700,
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
          margin: '0 auto',
          width: 'fit-content'
        }}>
          <Crown size={14} color="#967B42" />
          <span>Setting the Global Standard in Executive Mobility</span>
        </div>

        <h1 style={{ 
          fontFamily: '"Libre Baskerville", Georgia, serif', 
          fontSize: '38px', 
          fontWeight: 400, 
          color: '#0B1B2D', 
          letterSpacing: '-0.02em',
          margin: '4px 0 0 0',
          lineHeight: '1.25'
        }}>
          About {vendorName}
        </h1>

        <p style={{ fontSize: '15px', color: '#586579', maxWidth: '640px', margin: '0 auto', lineHeight: '1.65' }}>
          Founded with an uncompromising commitment to precision, safety, and discretion, {vendorName} orchestrates luxury ground transport for Fortune 500 executives, dignitaries, and discerning private travelers across the Northeast Corridor and global hubs.
        </p>
      </div>

      {/* 2. PILLARS GRID */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px' }}>
        <div style={{ 
          background: '#FFFFFF', 
          border: '1px solid #E5E8ED', 
          borderRadius: '16px', 
          padding: '28px', 
          display: 'flex', 
          flexDirection: 'column', 
          gap: '14px', 
          boxShadow: '0 8px 24px rgba(16, 37, 63, 0.05)' 
        }}>
          <div style={{ 
            width: '44px', 
            height: '44px', 
            borderRadius: '8px', 
            background: '#FDFBF7', 
            border: '1px solid #EADBBE', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            color: '#967B42', 
            fontWeight: 800,
            fontSize: '14px'
          }}>
            01
          </div>
          <h3 style={{ fontFamily: '"Libre Baskerville", Georgia, serif', fontSize: '18px', fontWeight: 400, color: '#0B1B2D', margin: 0 }}>
            Chauffeur Mastery
          </h3>
          <p style={{ fontSize: '13px', color: '#586579', lineHeight: '1.65', margin: 0 }}>
            Every chauffeur is a career professional trained in defensive driving, evasive maneuvers, executive etiquette, and non-disclosure discretion.
          </p>
        </div>

        <div style={{ 
          background: '#FFFFFF', 
          border: '1px solid #E5E8ED', 
          borderRadius: '16px', 
          padding: '28px', 
          display: 'flex', 
          flexDirection: 'column', 
          gap: '14px', 
          boxShadow: '0 8px 24px rgba(16, 37, 63, 0.05)' 
        }}>
          <div style={{ 
            width: '44px', 
            height: '44px', 
            borderRadius: '8px', 
            background: '#FDFBF7', 
            border: '1px solid #EADBBE', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            color: '#967B42', 
            fontWeight: 800,
            fontSize: '14px'
          }}>
            02
          </div>
          <h3 style={{ fontFamily: '"Libre Baskerville", Georgia, serif', fontSize: '18px', fontWeight: 400, color: '#0B1B2D', margin: 0 }}>
            Pristine Modern Fleet
          </h3>
          <p style={{ fontSize: '13px', color: '#586579', lineHeight: '1.65', margin: 0 }}>
            Our late-model Cadillac Escalade ESVs, GMC Yukon Denali XLs, and custom Sprinters are meticulously detailed, inspected daily, and equipped with enterprise Wi-Fi.
          </p>
        </div>

        <div style={{ 
          background: '#FFFFFF', 
          border: '1px solid #E5E8ED', 
          borderRadius: '16px', 
          padding: '28px', 
          display: 'flex', 
          flexDirection: 'column', 
          gap: '14px', 
          boxShadow: '0 8px 24px rgba(16, 37, 63, 0.05)' 
        }}>
          <div style={{ 
            width: '44px', 
            height: '44px', 
            borderRadius: '8px', 
            background: '#FDFBF7', 
            border: '1px solid #EADBBE', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            color: '#967B42', 
            fontWeight: 800,
            fontSize: '14px'
          }}>
            03
          </div>
          <h3 style={{ fontFamily: '"Libre Baskerville", Georgia, serif', fontSize: '18px', fontWeight: 400, color: '#0B1B2D', margin: 0 }}>
            Telemetry & Safety Assurance
          </h3>
          <p style={{ fontSize: '13px', color: '#586579', lineHeight: '1.65', margin: 0 }}>
            24/7 telemetry monitoring, geofence status dispatch, and automated FlightAware transponder matching guarantee zero waiting time upon touchdown.
          </p>
        </div>
      </div>

      {/* 3. COMPLIANCE & REGULATORY TRUST BOX */}
      <div style={{ 
        background: '#FFFFFF', 
        border: '1px solid #E5E8ED', 
        borderRadius: '16px', 
        padding: '32px', 
        display: 'flex', 
        flexDirection: 'column', 
        gap: '20px', 
        boxShadow: '0 8px 24px rgba(16, 37, 63, 0.05)' 
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            width: '36px',
            height: '36px',
            borderRadius: '8px',
            background: '#FDFBF7',
            border: '1px solid #EADBBE',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <Shield size={20} color="#967B42" />
          </div>
          <h2 style={{ fontFamily: '"Libre Baskerville", Georgia, serif', fontSize: '20px', fontWeight: 400, color: '#0B1B2D', margin: 0 }}>
            Regulatory Compliance & Trust Verification
          </h2>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px', fontSize: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', padding: '16px', background: '#F8FAFC', borderRadius: '10px', border: '1px solid #E5E8ED' }}>
            <ShieldCheck size={18} color="#059669" style={{ flexShrink: 0, marginTop: '2px' }} />
            <div>
              <strong style={{ color: '#0B1B2D', display: 'block', marginBottom: '4px', fontSize: '13px' }}>PPA Livery License Authority</strong>
              <span style={{ color: '#586579', lineHeight: '1.5' }}>Certified under Philadelphia Parking Authority CPC luxury limousine authority.</span>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', padding: '16px', background: '#F8FAFC', borderRadius: '10px', border: '1px solid #E5E8ED' }}>
            <ShieldCheck size={18} color="#059669" style={{ flexShrink: 0, marginTop: '2px' }} />
            <div>
              <strong style={{ color: '#0B1B2D', display: 'block', marginBottom: '4px', fontSize: '13px' }}>NYC TLC Interstate Authority</strong>
              <span style={{ color: '#586579', lineHeight: '1.5' }}>Full authorization for private transfers across PA, NJ, NY, DE, and MD corridors.</span>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', padding: '16px', background: '#F8FAFC', borderRadius: '10px', border: '1px solid #E5E8ED' }}>
            <ShieldCheck size={18} color="#059669" style={{ flexShrink: 0, marginTop: '2px' }} />
            <div>
              <strong style={{ color: '#0B1B2D', display: 'block', marginBottom: '4px', fontSize: '13px' }}>$5,000,000 Livery Policy</strong>
              <span style={{ color: '#586579', lineHeight: '1.5' }}>Complete comprehensive passenger and property commercial liability protection.</span>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', padding: '16px', background: '#F8FAFC', borderRadius: '10px', border: '1px solid #E5E8ED' }}>
            <ShieldCheck size={18} color="#059669" style={{ flexShrink: 0, marginTop: '2px' }} />
            <div>
              <strong style={{ color: '#0B1B2D', display: 'block', marginBottom: '4px', fontSize: '13px' }}>National Limousine Association</strong>
              <span style={{ color: '#586579', lineHeight: '1.5' }}>Active member adhering to the highest global chauffeur service standards.</span>
            </div>
          </div>
        </div>
      </div>

      {/* 4. CALL TO ACTION BANNER */}
      <div style={{
        background: 'linear-gradient(180deg, #FFFFFF 0%, #F8FAFC 100%)',
        border: '1px solid #E5E8ED',
        borderRadius: '16px',
        padding: '32px 36px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '20px',
        boxShadow: '0 8px 24px rgba(16, 37, 63, 0.05)'
      }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <h3 style={{ fontFamily: '"Libre Baskerville", Georgia, serif', fontSize: '20px', fontWeight: 400, color: '#0B1B2D', margin: 0 }}>
            Experience the Executive Standard
          </h3>
          <p style={{ fontSize: '13px', color: '#586579', margin: 0 }}>
            Book your next airport transfer, corporate roadshow, or private charter in seconds.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          {onNavigateToFleet && (
            <button
              onClick={onNavigateToFleet}
              style={{
                padding: '11px 20px',
                background: '#FFFFFF',
                color: '#10253F',
                fontSize: '13px',
                fontWeight: 600,
                borderRadius: '5px',
                border: '1px solid #E5E8ED',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              <span>Explore Fleet</span>
            </button>
          )}

          {onNavigateToBooking && (
            <button
              onClick={onNavigateToBooking}
              style={{
                padding: '11px 24px',
                background: '#967B42',
                color: '#FFFFFF',
                fontSize: '13px',
                fontWeight: 600,
                borderRadius: '5px',
                border: 'none',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              <span>Book a Ride</span>
              <ArrowRight size={14} color="#FFFFFF" />
            </button>
          )}
        </div>
      </div>

    </div>
  );
};
