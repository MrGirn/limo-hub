import React from 'react';
import { Plane, Building2, Clock, Users, Sparkles, Navigation, ArrowRight, ShieldCheck, Heart } from 'lucide-react';
import { VendorBrandingProfile } from '../../types';

interface PublicServicesPageProps {
  branding: VendorBrandingProfile;
  vendorName: string;
  onBookService: (serviceType: string) => void;
}

export const PublicServicesPage: React.FC<PublicServicesPageProps> = ({ branding, vendorName, onBookService }) => {
  const services = [
    {
      id: 'AIRPORT_TRANSFER',
      title: 'Commercial & Private Aviation Transfers',
      icon: <Plane size={24} color="#D97706" />,
      desc: 'Seamless meet-and-greet curbside or FBO tarmac transfers at PHL, JFK, EWR, LGA, and TEB. Includes 60 minutes complimentary flight delay buffer and real-time transponder tracking.',
      features: ['Curbside or Inside Baggage Meet & Greet', 'FlightAware Radar Sync', 'Complimentary Bottled Water & Wi-Fi']
    },
    {
      id: 'POINT_TO_POINT',
      title: 'City-to-City Executive Direct',
      icon: <Navigation size={24} color="#2563EB" />,
      desc: 'Avoid regional rail congestion and commuter flight headaches. Travel door-to-door between Philadelphia, Manhattan, Washington D.C., and Boston in quiet luxury.',
      features: ['Productive Mobile Workspace', 'Fixed Guaranteed Upfront Rates', 'Direct Highway EZ-Pass Routing']
    },
    {
      id: 'HOURLY_AS_DIRECTED',
      title: 'Hourly As-Directed Concierge',
      icon: <Clock size={24} color="#059669" />,
      desc: 'Your dedicated personal chauffeur on standby for multi-stop board meetings, roadshows, donor tours, or evening dining galas. Modify destinations effortlessly on the fly.',
      features: ['Unlimited Route Alterations', 'Driver On-Site Standby', 'Custom Route Itinerary Management']
    },
    {
      id: 'CORPORATE_SHUTTLE',
      title: 'Corporate Travel Management & Shuttles',
      icon: <Building2 size={24} color="#7C3AED" />,
      desc: 'Enterprise group transfers, corporate conferences, and VIP delegations orchestrated with Mercedes-Benz Sprinter vans and luxury SUV convoys.',
      features: ['Centralized Monthly Corporate Invoicing', 'Dedicated Account Manager', 'Multi-Vehicle Manifest Sync']
    },
    {
      id: 'WEDDING_GALA',
      title: 'Weddings, Galas & Red Carpet Galas',
      icon: <Sparkles size={24} color="#E11D48" />,
      desc: 'Flawless wedding party transportation, anniversary celebrations, and black-tie gala arrivals with immaculate vehicles and white-glove chauffeur etiquette.',
      features: ['Red Carpet Departure Service', 'Champagne Chiller Amenities', 'Punctuality Guarantee']
    }
  ];

  return (
    <div style={{ maxWidth: '1100px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '36px', padding: '16px 0', fontFamily: 'var(--font-ui)' }}>
      <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', gap: '8px' }}>
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
          {vendorName} · Chauffeur Solutions
        </div>
        <h1 style={{ fontFamily: '"Libre Baskerville", Georgia, serif', fontSize: '38px', fontWeight: 400, color: '#0B1B2D', letterSpacing: '-0.02em', margin: '8px 0 0 0' }}>
          Bespoke Chauffeur Services
        </h1>
        <p style={{ fontSize: '15px', color: '#586579', maxWidth: '640px', margin: '0 auto', lineHeight: 1.6 }}>
          Tailored luxury ground transportation solutions engineered for flawless reliability, uncompromising comfort, and total privacy.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '24px' }}>
        {services.map((svc) => (
          <div 
            key={svc.id}
            style={{
              background: '#FFFFFF',
              border: '1px solid #E5E8ED',
              borderRadius: '16px',
              padding: '28px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              boxShadow: '0 8px 24px rgba(16, 37, 63, 0.05)',
              gap: '20px'
            }}
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{
                width: '48px',
                height: '48px',
                borderRadius: '8px',
                background: '#F8FAFC',
                border: '1px solid #E5E8ED',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                {svc.icon}
              </div>

              <h3 style={{ fontFamily: '"Libre Baskerville", Georgia, serif', fontSize: '18px', fontWeight: 400, color: '#0B1B2D', margin: 0 }}>
                {svc.title}
              </h3>

              <p style={{ fontSize: '13px', color: '#586579', lineHeight: '1.6', margin: 0 }}>
                {svc.desc}
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', paddingTop: '14px', borderTop: '1px solid #F1F5F9' }}>
                {svc.features.map((feat, idx) => (
                  <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: '#586579' }}>
                    <ShieldCheck size={14} color="#059669" style={{ flexShrink: 0 }} />
                    <span>{feat}</span>
                  </div>
                ))}
              </div>
            </div>

            <button
              onClick={() => onBookService(svc.id)}
              style={{
                width: '100%',
                padding: '12px',
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
                transition: 'background-color 0.16s ease'
              }}
            >
              <span>Reserve This Service</span>
              <ArrowRight size={14} color="#FFFFFF" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};
