import React, { useState } from 'react';
import { Phone, Mail, MapPin, Clock, Send, CheckCircle2, MessageSquare, Building2, Shield, Crown, Sparkles, ArrowRight, ShieldCheck } from 'lucide-react';
import { VendorBrandingProfile } from '../../types';

interface PublicContactPageProps {
  branding: VendorBrandingProfile;
  vendorName: string;
  onNavigateToBooking?: () => void;
}

export const PublicContactPage: React.FC<PublicContactPageProps> = ({ 
  branding, 
  vendorName,
  onNavigateToBooking 
}) => {
  const [formSubmitted, setFormSubmitted] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    inquiryType: 'RESERVATION',
    message: ''
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormSubmitted(true);
  };

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
          <span>{vendorName} · 24/7 VIP Concierge &amp; Dispatch</span>
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
          Direct VIP Concierge &amp; Inquiries
        </h1>

        <p style={{ fontSize: '15px', color: '#586579', maxWidth: '640px', margin: '0 auto', lineHeight: '1.65' }}>
          Our round-the-clock operations and dispatch control centers are standing by for instant quotes, bespoke itinerary planning, and urgent chauffeur modifications.
        </p>
      </div>

      {/* 2. MAIN GRID (HOTLINES & INQUIRY FORM) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '32px', alignItems: 'start' }}>
        
        {/* Left Column: Hotlines & Direct Channels */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div style={{ 
            background: '#FFFFFF', 
            border: '1px solid #E5E8ED', 
            borderRadius: '16px', 
            padding: '30px', 
            display: 'flex', 
            flexDirection: 'column', 
            gap: '22px', 
            boxShadow: '0 8px 24px rgba(16, 37, 63, 0.05)' 
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{
                width: '38px',
                height: '38px',
                borderRadius: '8px',
                background: '#FDFBF7',
                border: '1px solid #EADBBE',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <Phone size={18} color="#967B42" />
              </div>
              <h3 style={{ fontFamily: '"Libre Baskerville", Georgia, serif', fontSize: '18px', fontWeight: 400, color: '#0B1B2D', margin: 0 }}>
                Direct Dispatch Hotlines
              </h3>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', fontSize: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', padding: '16px', background: '#F8FAFC', borderRadius: '10px', border: '1px solid #E5E8ED' }}>
                <Phone size={16} color="#967B42" style={{ flexShrink: 0, marginTop: '2px' }} />
                <div>
                  <span style={{ color: '#586579', display: 'block', fontWeight: 500, marginBottom: '2px' }}>Toll-Free VIP Priority Line</span>
                  {branding.contact_phone ? (
                    <a href={`tel:${branding.contact_phone}`} style={{ fontSize: '14px', fontWeight: 700, color: '#0B1B2D', textDecoration: 'none' }}>
                      {branding.contact_phone}
                    </a>
                  ) : (
                    <span style={{ fontSize: '13px', color: '#586579' }}>Contact phone pending configuration</span>
                  )}
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', padding: '16px', background: '#F8FAFC', borderRadius: '10px', border: '1px solid #E5E8ED' }}>
                <Mail size={16} color="#967B42" style={{ flexShrink: 0, marginTop: '2px' }} />
                <div>
                  <span style={{ color: '#586579', display: 'block', fontWeight: 500, marginBottom: '2px' }}>Operations &amp; Dispatch Email</span>
                  <span style={{ fontSize: '13px', fontWeight: 700, color: '#0B1B2D' }}>
                    {branding.domain ? `dispatch@${branding.domain}` : 'dispatch@limo-ops.com'}
                  </span>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', padding: '16px', background: '#F8FAFC', borderRadius: '10px', border: '1px solid #E5E8ED' }}>
                <MapPin size={16} color="#967B42" style={{ flexShrink: 0, marginTop: '2px' }} />
                <div>
                  <span style={{ color: '#586579', display: 'block', fontWeight: 500, marginBottom: '2px' }}>Headquarters &amp; Fleet Depot</span>
                  <span style={{ fontSize: '13px', fontWeight: 600, color: '#10253F', lineHeight: '1.5' }}>
                    {branding.office_address || 'Executive Operations Center'}
                  </span>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', padding: '16px', background: '#F8FAFC', borderRadius: '10px', border: '1px solid #E5E8ED' }}>
                <Clock size={16} color="#059669" style={{ flexShrink: 0, marginTop: '2px' }} />
                <div>
                  <span style={{ color: '#586579', display: 'block', fontWeight: 500, marginBottom: '2px' }}>Operations Availability</span>
                  <span style={{ fontSize: '13px', fontWeight: 700, color: '#059669' }}>
                    24 Hours / 7 Days a Week / 365 Days a Year
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Contact Form */}
        <div>
          <div style={{ 
            background: '#FFFFFF', 
            border: '1px solid #E5E8ED', 
            borderRadius: '16px', 
            padding: '32px', 
            boxShadow: '0 8px 24px rgba(16, 37, 63, 0.05)' 
          }}>
            {formSubmitted ? (
              <div style={{ textAlign: 'center', padding: '36px 0', display: 'flex', flexDirection: 'column', gap: '16px', alignItems: 'center' }}>
                <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: '#FDFBF7', border: '1px solid #EADBBE', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#967B42' }}>
                  <CheckCircle2 size={32} color="#059669" />
                </div>
                <h3 style={{ fontFamily: '"Libre Baskerville", Georgia, serif', fontSize: '20px', fontWeight: 400, color: '#0B1B2D', margin: 0 }}>
                  Inquiry Transmitted
                </h3>
                <p style={{ fontSize: '13px', color: '#586579', maxWidth: '360px', lineHeight: '1.6', margin: 0 }}>
                  Thank you, <strong style={{ color: '#0B1B2D' }}>{formData.name}</strong>. A dedicated VIP concierge dispatcher will review your itinerary and contact you at <strong style={{ color: '#967B42' }}>{formData.email}</strong> within 15 minutes.
                </p>
                <button
                  onClick={() => setFormSubmitted(false)}
                  style={{ 
                    padding: '10px 22px', 
                    background: '#967B42', 
                    color: '#FFFFFF', 
                    fontSize: '13px', 
                    fontWeight: 600, 
                    borderRadius: '5px', 
                    border: 'none', 
                    cursor: 'pointer',
                    marginTop: '8px'
                  }}
                >
                  Send Another Inquiry
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginBottom: '4px' }}>
                  <h3 style={{ fontFamily: '"Libre Baskerville", Georgia, serif', fontSize: '18px', fontWeight: 400, color: '#0B1B2D', margin: 0 }}>
                    Send an Instant VIP Inquiry
                  </h3>
                  <span style={{ fontSize: '12px', color: '#586579' }}>Direct priority transmission to executive dispatch.</span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '14px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#10253F', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Full Name</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Eleanor Vance"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      style={{ width: '100%', padding: '11px 13px', fontSize: '13px', borderRadius: '6px', background: '#FFFFFF', color: '#0B1B2D', border: '1px solid #E5E8ED', outline: 'none', boxSizing: 'border-box' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#10253F', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Email Address</label>
                    <input
                      type="email"
                      required
                      placeholder="e.g. e.vance@citadel.com"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      style={{ width: '100%', padding: '11px 13px', fontSize: '13px', borderRadius: '6px', background: '#FFFFFF', color: '#0B1B2D', border: '1px solid #E5E8ED', outline: 'none', boxSizing: 'border-box' }}
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '14px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#10253F', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Phone Number</label>
                    <input
                      type="tel"
                      placeholder="+1 (215) 555-0144"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      style={{ width: '100%', padding: '11px 13px', fontSize: '13px', borderRadius: '6px', background: '#FFFFFF', color: '#0B1B2D', border: '1px solid #E5E8ED', outline: 'none', boxSizing: 'border-box' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#10253F', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Inquiry Type</label>
                    <select
                      value={formData.inquiryType}
                      onChange={(e) => setFormData({ ...formData, inquiryType: e.target.value })}
                      style={{ width: '100%', padding: '11px 13px', fontSize: '13px', borderRadius: '6px', background: '#FFFFFF', color: '#0B1B2D', border: '1px solid #E5E8ED', outline: 'none', boxSizing: 'border-box' }}
                    >
                      <option value="RESERVATION">Reservation Assistance</option>
                      <option value="CORPORATE_RFP">Corporate Account / RFP</option>
                      <option value="EVENT_SHUTTLE">Wedding or Gala Fleet Charter</option>
                      <option value="AFFILIATE_PARTNER">Affiliate Fleet Network Partnership</option>
                      <option value="BILLING">Billing &amp; Invoicing Support</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#10253F', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Message / Route Requirements</label>
                  <textarea
                    rows={4}
                    required
                    placeholder="Provide trip dates, itinerary details, passenger counts, or specific vehicle preferences..."
                    value={formData.message}
                    onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                    style={{ width: '100%', padding: '11px 13px', fontSize: '13px', borderRadius: '6px', background: '#FFFFFF', color: '#0B1B2D', border: '1px solid #E5E8ED', outline: 'none', boxSizing: 'border-box', resize: 'vertical' }}
                  />
                </div>

                <button
                  type="submit"
                  style={{
                    marginTop: '6px',
                    padding: '13px 20px',
                    background: '#967B42',
                    color: '#FFFFFF',
                    fontWeight: 600,
                    fontSize: '13px',
                    borderRadius: '5px',
                    border: 'none',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    boxShadow: '0 4px 14px rgba(150, 123, 66, 0.2)',
                    transition: 'background-color 0.16s ease'
                  }}
                >
                  <Send size={15} color="#FFFFFF" />
                  <span>Transmit Inquiry to VIP Dispatch Desk</span>
                </button>
              </form>
            )}
          </div>
        </div>

      </div>

      {/* 3. FOOTER QUICK ACTION */}
      {onNavigateToBooking && (
        <div style={{
          background: 'linear-gradient(180deg, #FFFFFF 0%, #F8FAFC 100%)',
          border: '1px solid #E5E8ED',
          borderRadius: '16px',
          padding: '28px 36px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '20px',
          boxShadow: '0 8px 24px rgba(16, 37, 63, 0.05)'
        }}>
          <div>
            <h4 style={{ fontFamily: '"Libre Baskerville", Georgia, serif', fontSize: '18px', fontWeight: 400, color: '#0B1B2D', margin: '0 0 4px 0' }}>
              Need an immediate point-to-point or airport quote?
            </h4>
            <p style={{ fontSize: '13px', color: '#586579', margin: 0 }}>
              Use our live rate calculation engine for instant booking confirmation.
            </p>
          </div>
          <button
            onClick={onNavigateToBooking}
            style={{
              padding: '11px 22px',
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
            <span>Instant Online Booking</span>
            <ArrowRight size={14} color="#FFFFFF" />
          </button>
        </div>
      )}

    </div>
  );
};
