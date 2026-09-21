import React from 'react';
import { Shield, Clock, Luggage, Ban, RefreshCw, AlertCircle, CheckCircle, HelpCircle, Crown, ArrowRight, ShieldCheck } from 'lucide-react';
import { VendorBrandingProfile } from '../../types';

interface PublicPoliciesPageProps {
  branding: VendorBrandingProfile;
  vendorName: string;
  onNavigateToBooking?: () => void;
  onNavigateToContact?: () => void;
}

export const PublicPoliciesPage: React.FC<PublicPoliciesPageProps> = ({ 
  branding, 
  vendorName,
  onNavigateToBooking,
  onNavigateToContact
}) => {
  const faqs = [
    {
      q: 'What is the cancellation and modification policy?',
      a: 'Standard point-to-point and airport transfer reservations may be cancelled or modified free of charge up to 2 hours prior to scheduled pickup time. Hourly charters and executive Sprinter van bookings require a 24-hour notice for a full refund.'
    },
    {
      q: 'How are flight delays monitored and handled?',
      a: 'Our dispatch system integrates real-time FlightAware transponder radar feeds. Your chauffeur automatically adjusts their arrival time according to actual wheels-down time. Commercial flights receive 45 minutes of complimentary wait time after gate arrival (60 minutes for international flights).'
    },
    {
      q: 'Are tolls, taxes, and driver gratuities included in quotes?',
      a: 'Yes. All online quotes generated through our system provide 100% upfront, transparent pricing including base rate, local state livery taxes, toll estimates, and standard chauffeur gratuity. There are zero hidden fees at checkout.'
    },
    {
      q: 'What is the policy on luggage capacity?',
      a: 'Cadillac Escalade ESVs and GMC Yukon Denali XLs accommodate up to 6 large checked bags and multiple carry-ons. Executive Sprinter vans support up to 14 standard pieces of luggage in dedicated rear partitions.'
    },
    {
      q: 'What safety and background screening procedures are enforced?',
      a: 'All chauffeurs undergo mandatory annual FBI fingerprint background checks, 10-panel drug screenings, continuous motor vehicle record (MVR) telemetry monitoring, and defensive driving certification.'
    }
  ];

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
          <span>{vendorName} · Terms of Carriage &amp; Standards</span>
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
          Policies, Terms &amp; FAQ
        </h1>

        <p style={{ fontSize: '15px', color: '#586579', maxWidth: '640px', margin: '0 auto', lineHeight: '1.65' }}>
          Clear, transparent policies ensuring the highest levels of predictability, safety, and mutual respect for guests and chauffeurs alike.
        </p>
      </div>

      {/* 2. POLICY HIGHLIGHTS GRID */}
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
            color: '#967B42' 
          }}>
            <Clock size={20} />
          </div>
          <h3 style={{ fontFamily: '"Libre Baskerville", Georgia, serif', fontSize: '18px', fontWeight: 400, color: '#0B1B2D', margin: 0 }}>
            Complimentary Wait Time
          </h3>
          <p style={{ fontSize: '13px', color: '#586579', lineHeight: '1.65', margin: 0 }}>
            • Residential/Office: 15 mins<br />
            • Domestic Flights: 45 mins<br />
            • International Flights: 60 mins<br />
            • Train Arrivals: 30 mins
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
            color: '#967B42' 
          }}>
            <RefreshCw size={20} />
          </div>
          <h3 style={{ fontFamily: '"Libre Baskerville", Georgia, serif', fontSize: '18px', fontWeight: 400, color: '#0B1B2D', margin: 0 }}>
            Cancellation Windows
          </h3>
          <p style={{ fontSize: '13px', color: '#586579', lineHeight: '1.65', margin: 0 }}>
            • Sedans &amp; SUVs: 2 hours notice<br />
            • Mercedes Sprinters: 24 hours notice<br />
            • Wedding/Galas: 72 hours notice<br />
            • Instant full refund to card
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
            color: '#967B42' 
          }}>
            <Shield size={20} />
          </div>
          <h3 style={{ fontFamily: '"Libre Baskerville", Georgia, serif', fontSize: '18px', fontWeight: 400, color: '#0B1B2D', margin: 0 }}>
            Sanitization &amp; Cleanliness
          </h3>
          <p style={{ fontSize: '13px', color: '#586579', lineHeight: '1.65', margin: 0 }}>
            All vehicles are non-smoking. Vehicles receive hospital-grade ozone sterilization and complete interior detail between each passenger engagement.
          </p>
        </div>
      </div>

      {/* 3. FREQUENTLY ASKED QUESTIONS */}
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
            <HelpCircle size={20} color="#967B42" />
          </div>
          <h2 style={{ fontFamily: '"Libre Baskerville", Georgia, serif', fontSize: '20px', fontWeight: 400, color: '#0B1B2D', margin: 0 }}>
            Frequently Asked Questions
          </h2>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {faqs.map((faq, idx) => (
            <div key={idx} style={{ padding: '18px 20px', background: '#F8FAFC', borderRadius: '10px', border: '1px solid #E5E8ED', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <h4 style={{ fontFamily: '"Libre Baskerville", Georgia, serif', fontSize: '15px', fontWeight: 400, color: '#0B1B2D', display: 'flex', alignItems: 'flex-start', gap: '8px', margin: 0 }}>
                <span style={{ color: '#967B42', fontWeight: 700, fontFamily: 'var(--font-ui)', fontSize: '13px' }}>Q:</span> 
                <span>{faq.q}</span>
              </h4>
              <p style={{ fontSize: '13px', color: '#586579', paddingLeft: '20px', lineHeight: '1.65', margin: 0 }}>
                {faq.a}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* 4. BOTTOM ACTION BANNER */}
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
            Have a specialized itinerary question?
          </h3>
          <p style={{ fontSize: '13px', color: '#586579', margin: 0 }}>
            Our 24/7 VIP operations desk is ready to assist with custom manifests and multi-vehicle coordination.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          {onNavigateToContact && (
            <button
              onClick={onNavigateToContact}
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
              <span>Contact Dispatch</span>
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
              <span>Reserve a Ride</span>
              <ArrowRight size={14} color="#FFFFFF" />
            </button>
          )}
        </div>
      </div>

    </div>
  );
};
