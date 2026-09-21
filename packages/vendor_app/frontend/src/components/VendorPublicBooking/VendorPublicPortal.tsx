import React, { useState, useEffect } from 'react';
import { Plane, MapPin, Clock, ShieldCheck, Sparkles, CreditCard, ArrowRight, CheckCircle2, Car, Globe, Check, PhoneCall } from 'lucide-react';
import { VehicleClass } from '../../types';

interface WhiteLabelBrand {
  vendor_id: string;
  company_name: string;
  market_city: string;
  custom_domain: string;
  primary_color: string;
  accent_color: string;
  light_bg_color: string;
  tagline: string;
  hero_title: string;
  support_phone: string;
  support_email: string;
  currency: string;
}

const PRESET_DOMAINS: Record<string, WhiteLabelBrand> = {
  'book.anblimo-philly.com': {
    vendor_id: 'vendor_anb_philly',
    company_name: 'ANB Limo Executive Chauffeurs',
    market_city: 'Philadelphia, PA',
    custom_domain: 'book.anblimo-philly.com',
    primary_color: '#D97706',
    accent_color: '#B45309',
    light_bg_color: '#FEF3C7',
    tagline: "Philadelphia's Elite Chauffeur & Airport Transfer Fleet",
    hero_title: 'Reserve Your Philly Executive Transfer',
    support_phone: '+1 (215) 555-0188',
    support_email: 'dispatch@anblimo-philly.com',
    currency: 'USD'
  },
  'vip.manhattanprestige.com': {
    vendor_id: 'vendor_manhattan_prestige',
    company_name: 'Manhattan Prestige Limousine',
    market_city: 'New York, NY',
    custom_domain: 'vip.manhattanprestige.com',
    primary_color: '#2563EB',
    accent_color: '#1D4ED8',
    light_bg_color: '#DBEAFE',
    tagline: "NYC's Premier First-Class Diplomatic & Aviation Chauffeur Service",
    hero_title: 'Manhattan VIP Aviation & Ground Logistics',
    support_phone: '+1 (212) 555-0192',
    support_email: 'vip@manhattanprestige.com',
    currency: 'USD'
  },
  'reserve.mayfairroyal.co.uk': {
    vendor_id: 'vendor_mayfair_royal',
    company_name: 'Mayfair Royal Chauffeurs UK',
    market_city: 'London, UK',
    custom_domain: 'reserve.mayfairroyal.co.uk',
    primary_color: '#059669',
    accent_color: '#047857',
    light_bg_color: '#D1FAE5',
    tagline: 'Bespoke London & Heathrow Executive Chauffeur Excellence',
    hero_title: 'London Chauffeur Drive & Airport Concierge',
    support_phone: '+44 20 7946 0912',
    support_email: 'reservations@mayfairroyal.co.uk',
    currency: 'GBP'
  }
};

export const VendorPublicPortal: React.FC = () => {
  const [activeDomain, setActiveDomain] = useState<string>('book.anblimo-philly.com');
  const [branding, setBranding] = useState<WhiteLabelBrand>(PRESET_DOMAINS['book.anblimo-philly.com']);
  
  const [pickup, setPickup] = useState('');
  const [dropoff, setDropoff] = useState('');
  const [flightNumber, setFlightNumber] = useState('');
  const [vehicleClass, setVehicleClass] = useState<VehicleClass>(VehicleClass.FIRST_CLASS);
  const [isLateNight, setIsLateNight] = useState(false);
  const [isMeetAndGreet, setIsMeetAndGreet] = useState(false);

  const [quote, setQuote] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<'QUOTE' | 'PASSENGER' | 'CONFIRMED'>('QUOTE');

  const [passengerName, setPassengerName] = useState('');
  const [passengerPhone, setPassengerPhone] = useState('');

  const handleSwitchDomain = (domain: string) => {
    setActiveDomain(domain);
    if (PRESET_DOMAINS[domain]) {
      setBranding(PRESET_DOMAINS[domain]);
    }
  };

  const handleCalculateQuote = async () => {
    if (!pickup || !dropoff) {
      setQuote(null);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch('/api/v1/quotes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vendor_id: branding.vendor_id,
          pickup_address: pickup,
          dropoff_address: dropoff,
          vehicle_class: vehicleClass,
          service_type: 'AIRPORT_TRANSFER',
          flight_number: flightNumber || undefined
        })
      });
      if (res.ok) {
        const data = await res.json();
        setQuote(data);
      } else {
        setQuote(null);
      }
    } catch (e) {
      setQuote(null);
    } finally {
      setLoading(false);
    }
  };

  // Debounced auto-recalculate live quote whenever any booking field or preference changes
  useEffect(() => {
    const timer = setTimeout(() => {
      handleCalculateQuote();
    }, 350);
    return () => clearTimeout(timer);
  }, [pickup, dropoff, vehicleClass, flightNumber, isLateNight, isMeetAndGreet, branding.vendor_id]);

  const currencySymbol = branding.currency === 'GBP' ? '£' : '$';

  return (
    <div style={{ maxWidth: '980px', margin: '0 auto', padding: '16px 24px', color: '#0F172A' }}>
      
      {/* Custom Domain Simulator Banner - Light Theme */}
      <div style={{ 
        background: '#FFFFFF', 
        border: '1px solid #E2E8F0', 
        borderRadius: '12px', 
        padding: '10px 18px', 
        marginBottom: '20px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '12px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Globe size={16} color="#2563EB" />
          <span style={{ fontSize: '12px', color: '#64748B', fontWeight: 600 }}>Active CNAME Domain:</span>
          <span style={{ fontSize: '13px', fontWeight: '800', color: '#0F172A', fontFamily: 'monospace' }}>https://{branding.custom_domain}</span>
          <span style={{ fontSize: '10px', background: '#DCFCE7', color: '#16A34A', padding: '2px 6px', borderRadius: '4px', fontWeight: 700, border: '1px solid #BBF7D0' }}>SSL Verified</span>
        </div>

        <div style={{ display: 'flex', gap: '6px' }}>
          {Object.keys(PRESET_DOMAINS).map(dom => (
            <button
              key={dom}
              onClick={() => handleSwitchDomain(dom)}
              style={{
                fontSize: '11px',
                padding: '4px 10px',
                borderRadius: '6px',
                border: activeDomain === dom ? `1px solid ${branding.primary_color}` : '1px solid #E2E8F0',
                background: activeDomain === dom ? branding.light_bg_color : '#F8FAFC',
                color: activeDomain === dom ? branding.accent_color : '#64748B',
                cursor: 'pointer',
                fontWeight: activeDomain === dom ? '800' : '600'
              }}
            >
              {dom.split('.')[1]} ({PRESET_DOMAINS[dom].market_city.split(',')[0]})
            </button>
          ))}
        </div>
      </div>

      {/* Brand Header - Crisp Luxury Light Banner */}
      <div style={{
        background: '#FFFFFF',
        border: '1px solid #E2E8F0',
        borderRadius: '16px',
        padding: '28px 32px',
        marginBottom: '24px',
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.04)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '16px'
      }}>
        <div>
          <span style={{ 
            fontSize: '11px', 
            fontWeight: 800, 
            background: branding.light_bg_color, 
            color: branding.accent_color, 
            padding: '4px 10px', 
            borderRadius: '12px', 
            border: `1px solid ${branding.primary_color}33` 
          }}>
            👑 SOVEREIGN DIRECT FLEET PORTAL
          </span>
          <h1 style={{ fontSize: '26px', fontWeight: 900, marginTop: '8px', marginBottom: '4px', color: '#0F172A', letterSpacing: '-0.02em' }}>
            {branding.company_name}
          </h1>
          <p style={{ color: '#64748B', fontSize: '13px', margin: 0, fontWeight: 500 }}>
            {branding.tagline} · 60 Min Complimentary Airport Waiting
          </p>
        </div>

        <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', padding: '10px 18px', borderRadius: '12px', textAlign: 'right' }}>
          <div style={{ color: '#64748B', fontWeight: 700, fontSize: '11px' }}>24/7 VIP Concierge Hotline</div>
          <div style={{ fontWeight: 900, fontSize: '15px', color: '#0F172A', marginTop: '2px' }}>{branding.support_phone}</div>
        </div>
      </div>

      {/* Main Booking Panel */}
      {step === 'CONFIRMED' ? (
        <div style={{ background: '#FFFFFF', padding: '40px', borderRadius: '16px', textAlign: 'center', border: '1px solid #E2E8F0', boxShadow: '0 4px 12px rgba(0,0,0,0.04)' }}>
          <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: '#DCFCE7', color: '#16A34A', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px auto' }}>
            <CheckCircle2 size={32} />
          </div>
          <h2 style={{ fontSize: '24px', fontWeight: 900, color: '#0F172A', marginBottom: '8px' }}>Reservation Confirmed</h2>
          <p style={{ color: '#64748B', fontSize: '14px', marginBottom: '16px' }}>
            Thank you, <strong>{passengerName}</strong>. Your executive chauffeur with {branding.company_name} is scheduled.
          </p>
          <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '10px', padding: '14px 18px', maxWidth: '500px', margin: '0 auto 24px auto', textAlign: 'left', fontSize: '12px' }}>
            <div style={{ fontWeight: 800, color: '#0F172A', marginBottom: '4px' }}>📱 Real-Time Live VIP SMS Link Sent:</div>
            <div style={{ color: '#64748B', lineHeight: '1.5' }}>
              We sent a real-time tracking link to <strong>{passengerPhone}</strong>. You can switch to the <em>"📱 Passenger Live VIP Tracker"</em> tab in the top header anytime to monitor live chauffeur approach.
            </div>
          </div>
          <button 
            onClick={() => setStep('QUOTE')} 
            style={{ 
              background: branding.primary_color, 
              color: '#FFFFFF', 
              padding: '10px 24px', 
              borderRadius: '8px', 
              border: 'none', 
              fontWeight: 800, 
              cursor: 'pointer',
              boxShadow: '0 2px 6px rgba(0,0,0,0.1)'
            }}
          >
            Book Another Transfer
          </button>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: '24px' }}>
          {/* Left Form - Pure Light Card */}
          <div style={{ background: '#FFFFFF', padding: '24px', borderRadius: '16px', border: '1px solid #E2E8F0', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 800, color: '#0F172A', marginBottom: '16px' }}>1. Route & Travel Details</h3>
            
            <div style={{ display: 'grid', gap: '14px' }}>
              <div>
                <label style={{ fontSize: '11px', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '4px' }}>PICKUP ADDRESS / AIRPORT</label>
                <input
                  type="text"
                  value={pickup}
                  onChange={(e) => setPickup(e.target.value)}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '13px', background: '#F8FAFC', color: '#0F172A', outline: 'none' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '11px', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '4px' }}>DESTINATION ADDRESS</label>
                <input
                  type="text"
                  value={dropoff}
                  onChange={(e) => setDropoff(e.target.value)}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '13px', background: '#F8FAFC', color: '#0F172A', outline: 'none' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '11px', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '4px' }}>FLIGHT NUMBER (RADAR)</label>
                  <input
                    type="text"
                    value={flightNumber}
                    onChange={(e) => setFlightNumber(e.target.value)}
                    style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '13px', background: '#F8FAFC', color: '#0F172A', outline: 'none' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '11px', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '4px' }}>VEHICLE TIER</label>
                  <select
                    value={vehicleClass}
                    onChange={(e) => setVehicleClass(e.target.value as VehicleClass)}
                    style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '13px', background: '#F8FAFC', color: '#0F172A', outline: 'none' }}
                  >
                    <option value={VehicleClass.LUXURY_SUV}>Luxury SUV (Escalade ESV)</option>
                    <option value={VehicleClass.FIRST_CLASS}>First Class (Mercedes S 580)</option>
                    <option value={VehicleClass.BUSINESS_VAN}>VIP Executive Van (Sprinter)</option>
                  </select>
                </div>
              </div>

              <button
                onClick={handleCalculateQuote}
                disabled={loading}
                style={{
                  background: branding.primary_color,
                  color: '#FFFFFF',
                  padding: '13px',
                  borderRadius: '10px',
                  border: 'none',
                  fontWeight: 800,
                  fontSize: '14px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  marginTop: '10px',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                }}
              >
                {loading ? 'Calculating Tariff...' : `Calculate Guaranteed ${branding.company_name.split(' ')[0]} Quote`}
                <ArrowRight size={16} />
              </button>
            </div>
          </div>

          {/* Right Quote Summary - Elegant Crisp Light Card */}
          <div style={{ background: '#FFFFFF', color: '#0F172A', padding: '24px', borderRadius: '16px', border: '1px solid #E2E8F0', boxShadow: '0 2px 8px rgba(0,0,0,0.04)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            {quote ? (
              <div>
                <div style={{ fontSize: '11px', fontWeight: 800, color: branding.accent_color, letterSpacing: '0.05em' }}>GUARANTEED BINDING QUOTE</div>
                <div style={{ fontSize: '34px', fontWeight: 900, marginTop: '4px', color: '#0F172A', letterSpacing: '-0.02em' }}>
                  {currencySymbol}{Number(quote.all_inclusive_total || quote.all_inclusive_total_usd || 0).toFixed(2)}
                </div>
                <div style={{ fontSize: '12px', color: '#64748B', marginBottom: '16px', fontWeight: 500 }}>
                  All-Inclusive (Tolls, Tax & {((Number(quote.gratuity_rate) || 0.20) * 100).toFixed(0)}% Chauffeur Gratuity)
                </div>

                <div style={{ borderTop: '1px solid #E2E8F0', paddingTop: '14px', display: 'grid', gap: '10px', fontSize: '12px' }}>
                  {quote.line_items && quote.line_items.length > 0 ? (
                    quote.line_items.map((item: any, idx: number) => (
                      <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', color: '#334155' }}>
                        <span>{item.description || item.name}</span>
                        <span style={{ fontWeight: 700 }}>{currencySymbol}{Number(item.amount_net || item.amount || 0).toFixed(2)}</span>
                      </div>
                    ))
                  ) : (
                    <>
                      <div style={{ display: 'flex', justifyContent: 'space-between', color: '#334155' }}>
                        <span>Base Fleet Tariff</span>
                        <span style={{ fontWeight: 700 }}>{currencySymbol}{Number(quote.subtotal_net || 0).toFixed(2)}</span>
                      </div>
                      {Number(quote.estimated_tolls_net || 0) > 0 && (
                        <div style={{ display: 'flex', justifyContent: 'space-between', color: '#334155' }}>
                          <span>Tolls & Turnpike Fees</span>
                          <span style={{ fontWeight: 700 }}>{currencySymbol}{Number(quote.estimated_tolls_net).toFixed(2)}</span>
                        </div>
                      )}
                      {Number(quote.tax_amount || 0) > 0 && (
                        <div style={{ display: 'flex', justifyContent: 'space-between', color: '#334155' }}>
                          <span>Taxes & Surcharges</span>
                          <span style={{ fontWeight: 700 }}>{currencySymbol}{Number(quote.tax_amount).toFixed(2)}</span>
                        </div>
                      )}
                      {Number(quote.gratuity_amount || 0) > 0 && (
                        <div style={{ display: 'flex', justifyContent: 'space-between', color: '#334155' }}>
                          <span>Chauffeur Gratuity</span>
                          <span style={{ fontWeight: 700 }}>{currencySymbol}{Number(quote.gratuity_amount).toFixed(2)}</span>
                        </div>
                      )}
                    </>
                  )}
                </div>

                <button
                  onClick={() => setStep('CONFIRMED')}
                  style={{
                    width: '100%',
                    background: branding.primary_color,
                    color: '#FFFFFF',
                    padding: '13px',
                    borderRadius: '10px',
                    border: 'none',
                    fontWeight: 800,
                    fontSize: '14px',
                    cursor: 'pointer',
                    marginTop: '24px',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                  }}
                >
                  Reserve with {branding.company_name.split(' ')[0]} Chauffeur
                </button>
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '40px 0', color: '#94A3B8' }}>
                <Car size={40} style={{ margin: '0 auto 12px auto', opacity: 0.4, color: '#64748B' }} />
                <p style={{ fontSize: '13px', color: '#64748B', fontWeight: 500, lineHeight: 1.5 }}>
                  Enter your trip itinerary on the left to see deterministic direct fleet pricing.
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
