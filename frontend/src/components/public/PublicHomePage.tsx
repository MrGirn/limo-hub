import React, { useState } from 'react';
import { 
  Plane, Clock, Shield, Star, MapPin, Award, 
  ArrowRight, CheckCircle2, Car, Sparkles, Navigation, Calendar, Users, Briefcase,
  ChevronRight, Crown, Phone, ShieldCheck, Wifi, Eye
} from 'lucide-react';
import { VendorBrandingProfile, ServiceType, VehicleClass } from '../../types';

interface PublicHomePageProps {
  branding: VendorBrandingProfile;
  vendorName: string;
  onNavigateToBooking: (initialDetails?: any) => void;
  onNavigateToFleet: () => void;
  onOpenAuthModal?: () => void;
}

export const PublicHomePage: React.FC<PublicHomePageProps> = ({
  branding,
  vendorName,
  onNavigateToBooking,
  onNavigateToFleet,
  onOpenAuthModal
}) => {
  const [serviceType, setServiceType] = useState<ServiceType>('AIRPORT_TRANSFER');
  const [vehicleClass, setVehicleClass] = useState<VehicleClass>('LUXURY_SUV');
  const [pickupLocation, setPickupLocation] = useState('');
  const [dropoffLocation, setDropoffLocation] = useState('');
  const [flightNumber, setFlightNumber] = useState('');
  
  // Real dynamic date & time based on current execution time
  const now = new Date();
  const todayStr = now.toISOString().split('T')[0];
  const defaultHour = String((now.getHours() + 2) % 24).padStart(2, '0');
  const defaultMinute = now.getMinutes() < 30 ? '30' : '00';
  const [pickupDate, setPickupDate] = useState(todayStr);
  const [pickupTime, setPickupTime] = useState(`${defaultHour}:${defaultMinute}`);
  const [passengers, setPassengers] = useState(2);

  const handleInstantQuote = (e: React.FormEvent) => {
    e.preventDefault();
    onNavigateToBooking({
      serviceType,
      vehicleClass,
      pickupLocation: pickupLocation || (serviceType === 'AIRPORT_TRANSFER' ? 'Philadelphia International Airport (PHL)' : 'Center City, Philadelphia, PA'),
      dropoffLocation: dropoffLocation || 'The Ritz-Carlton, Center City Philadelphia',
      flightNumber: serviceType === 'AIRPORT_TRANSFER' ? (flightNumber || undefined) : undefined,
      pickupDate: pickupDate || todayStr,
      pickupTime: pickupTime || `${defaultHour}:${defaultMinute}`,
      passengers
    });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '48px', paddingBottom: '60px', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      
      {/* --- 1. ULTRA-LUXURY EXECUTIVE HERO BANNER (PURE LIGHT MODE) --- */}
      <div style={{
        position: 'relative',
        overflow: 'hidden',
        borderRadius: '24px',
        background: 'linear-gradient(180deg, #FFFFFF 0%, #F8FAFC 100%)',
        border: '1px solid #E5E8ED',
        padding: '52px 40px',
        boxShadow: '0 10px 30px rgba(16, 37, 63, 0.06)',
        color: '#10253F'
      }}>
        {/* Subtle Ambient Gold Accent */}
        <div style={{
          position: 'absolute',
          top: '-80px',
          right: '-80px',
          width: '380px',
          height: '380px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(150,123,66,0.08) 0%, rgba(150,123,66,0) 70%)',
          filter: 'blur(30px)',
          pointerEvents: 'none'
        }} />

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))',
          gap: '44px',
          alignItems: 'center',
          position: 'relative',
          zIndex: 10
        }}>
          
          {/* Left Hero Content */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '6px 14px',
              borderRadius: '6px',
              background: '#FDFBF7',
              border: '1px solid #EADBBE',
              color: '#806734',
              fontSize: '12px',
              fontWeight: 700,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              width: 'fit-content'
            }}>
              <Crown size={14} color="#967B42" />
              <span>Philadelphia &amp; Beyond · Premier Chauffeur Fleet</span>
            </div>

            <h1 style={{
              fontFamily: '"Libre Baskerville", Georgia, serif',
              fontSize: '44px',
              fontWeight: 400,
              color: '#0B1B2D',
              letterSpacing: '-0.02em',
              lineHeight: '1.2',
              margin: 0
            }}>
              Your journey.<br />
              <span style={{ color: '#967B42', fontStyle: 'italic' }}>Exceptionally driven.</span>
            </h1>

            <p style={{ fontSize: '15px', color: '#586579', lineHeight: '1.65', margin: 0, fontFamily: 'var(--font-ui)' }}>
              Welcome to <strong style={{ color: '#0B1B2D' }}>{vendorName}</strong>. Flagship Cadillac Escalade ESVs, GMC Yukon Denali XLs, and executive diplomatic sedans. Backed by guaranteed zero-wait FlightRadar24 airport telemetry and strict <strong>$5,000,000 livery insurance</strong>.
            </p>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '14px', paddingTop: '6px' }}>
              <button
                onClick={onNavigateToFleet}
                style={{
                  padding: '13px 24px',
                  background: '#967B42',
                  color: '#FFFFFF',
                  fontWeight: 600,
                  fontSize: '14px',
                  borderRadius: '5px',
                  border: 'none',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  boxShadow: '0 4px 14px rgba(150, 123, 66, 0.25)',
                  transition: 'all 0.16s ease'
                }}
              >
                <Car size={16} color="#FFFFFF" />
                <span>Explore Escalade &amp; Denali Fleet</span>
                <ArrowRight size={16} />
              </button>

              <button
                onClick={onOpenAuthModal}
                style={{
                  padding: '13px 20px',
                  background: '#FFFFFF',
                  color: '#10253F',
                  fontWeight: 600,
                  fontSize: '14px',
                  borderRadius: '5px',
                  border: '1px solid #CBD5E1',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  transition: 'all 0.16s ease'
                }}
              >
                <span>VIP Client Sign In</span>
              </button>
            </div>

            {/* Prestige Badges */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
              gap: '14px',
              paddingTop: '18px',
              borderTop: '1px solid #E5E8ED',
              fontSize: '12px',
              color: '#586579'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <ShieldCheck size={16} color="#059669" />
                <span>$5M Livery Coverage</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Plane size={16} color="#2563EB" />
                <span>FlightRadar24 Synced</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Award size={16} color="#967B42" />
                <span>Secret Service Vetted</span>
              </div>
            </div>
          </div>

          {/* Right Hero Booking Card (Crisp Executive Light Surface) */}
          <div>
            <div style={{
              background: '#FFFFFF',
              border: '1px solid #CBD5E1',
              borderRadius: '24px',
              padding: '28px',
              boxShadow: '0 20px 45px rgba(0, 0, 0, 0.35)',
              color: '#0F172A'
            }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                paddingBottom: '14px',
                marginBottom: '16px',
                borderBottom: '1px solid #F1F5F9'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Navigation size={18} color="#D97706" />
                  <h3 style={{ fontSize: '13px', fontWeight: 900, color: '#0F172A', textTransform: 'uppercase', letterSpacing: '0.06em', margin: 0 }}>
                    Instant Ride Quote & Reservation
                  </h3>
                </div>
                <span style={{ fontSize: '11px', background: 'rgba(16, 185, 129, 0.12)', color: '#047857', border: '1px solid rgba(16, 185, 129, 0.35)', padding: '2px 8px', borderRadius: '6px', fontWeight: 800 }}>
                  Live Dispatch Available
                </span>
              </div>

              <form onSubmit={handleInstantQuote} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                
                {/* Service Type Selection */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
                  {[
                    { id: 'AIRPORT_TRANSFER', label: 'Airport', icon: <Plane size={13} /> },
                    { id: 'POINT_TO_POINT', label: 'Point to Point', icon: <MapPin size={13} /> },
                    { id: 'HOURLY_AS_DIRECTED', label: 'Hourly', icon: <Clock size={13} /> },
                  ].map((st) => (
                    <button
                      type="button"
                      key={st.id}
                      onClick={() => setServiceType(st.id as ServiceType)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px',
                        padding: '10px 6px',
                        fontSize: '12px',
                        fontWeight: 800,
                        borderRadius: '8px',
                        border: serviceType === st.id ? '2px solid #D97706' : '1px solid #CBD5E1',
                        background: serviceType === st.id ? '#FFFBEB' : '#F8FAFC',
                        color: serviceType === st.id ? '#B45309' : '#475569',
                        cursor: 'pointer'
                      }}
                    >
                      {st.icon}
                      <span>{st.label}</span>
                    </button>
                  ))}
                </div>

                {/* Pickup & Destination */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: 800, color: '#334155', marginBottom: '4px' }}>Pickup Location</label>
                    <input
                      type="text"
                      required
                      value={pickupLocation}
                      onChange={(e) => setPickupLocation(e.target.value)}
                      style={{ width: '100%', padding: '10px 12px', fontSize: '12px', borderRadius: '8px', background: '#FFFFFF', color: '#0F172A', border: '1px solid #CBD5E1', fontWeight: 600 }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: 800, color: '#334155', marginBottom: '4px' }}>Destination</label>
                    <input
                      type="text"
                      required
                      value={dropoffLocation}
                      onChange={(e) => setDropoffLocation(e.target.value)}
                      style={{ width: '100%', padding: '10px 12px', fontSize: '12px', borderRadius: '8px', background: '#FFFFFF', color: '#0F172A', border: '1px solid #CBD5E1', fontWeight: 600 }}
                    />
                  </div>

                  {serviceType === 'AIRPORT_TRANSFER' && (
                    <div>
                      <label style={{ display: 'block', fontSize: '11px', fontWeight: 800, color: '#334155', marginBottom: '4px' }}>Flight Number (Radar Tracked)</label>
                      <input
                        type="text"
                        value={flightNumber}
                        onChange={(e) => setFlightNumber(e.target.value)}
                        placeholder="e.g. AA 1842 / DL 402"
                        style={{ width: '100%', padding: '10px 12px', fontSize: '12px', borderRadius: '8px', textTransform: 'uppercase', background: '#FFFFFF', color: '#0F172A', border: '1px solid #CBD5E1', fontWeight: 700 }}
                      />
                    </div>
                  )}

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '11px', fontWeight: 800, color: '#334155', marginBottom: '4px' }}>Date</label>
                      <input
                        type="date"
                        value={pickupDate}
                        onChange={(e) => setPickupDate(e.target.value)}
                        style={{ width: '100%', padding: '9px 10px', fontSize: '12px', borderRadius: '8px', background: '#FFFFFF', color: '#0F172A', border: '1px solid #CBD5E1', fontWeight: 600 }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '11px', fontWeight: 800, color: '#334155', marginBottom: '4px' }}>Time</label>
                      <input
                        type="time"
                        value={pickupTime}
                        onChange={(e) => setPickupTime(e.target.value)}
                        style={{ width: '100%', padding: '9px 10px', fontSize: '12px', borderRadius: '8px', background: '#FFFFFF', color: '#0F172A', border: '1px solid #CBD5E1', fontWeight: 600 }}
                      />
                    </div>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: 800, color: '#334155', marginBottom: '4px' }}>Vehicle Class</label>
                    <select
                      value={vehicleClass}
                      onChange={(e) => setVehicleClass(e.target.value as VehicleClass)}
                      style={{ width: '100%', padding: '10px 12px', fontSize: '12px', borderRadius: '8px', background: '#FFFFFF', color: '#0F172A', border: '1px solid #CBD5E1', fontWeight: 700 }}
                    >
                      <option value="LUXURY_SUV">Flagship Luxury SUV (Cadillac Escalade ESV / Lincoln Navigator L)</option>
                      <option value="FIRST_CLASS">First Class Diplomatic Sedan (Mercedes-Maybach S 580 / S-Class)</option>
                      <option value="BUSINESS_VAN">Executive Sprinter Jet Lounge (Mercedes Sprinter 12-Pax)</option>
                      <option value="ELECTRIC_VIP">Electric VIP Lounge (Lucid Air Grand Touring / Tesla Model S)</option>
                    </select>
                  </div>
                </div>

                <button
                  type="submit"
                  style={{
                    marginTop: '6px',
                    padding: '14px',
                    background: 'linear-gradient(135deg, #0F172A 0%, #1E293B 100%)',
                    color: '#FFFFFF',
                    fontWeight: 900,
                    fontSize: '14px',
                    borderRadius: '12px',
                    border: '1px solid #D97706',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    boxShadow: '0 6px 16px rgba(15, 23, 42, 0.25)'
                  }}
                >
                  <Sparkles size={16} color="#F59E0B" />
                  <span>Compute Guaranteed Quote & Reserve</span>
                  <ArrowRight size={16} color="#F59E0B" />
                </button>
              </form>
            </div>
          </div>

        </div>
      </div>

      {/* --- 2. MULTI-PHOTO FLEET SPOTLIGHT SECTION --- */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <div style={{ fontSize: '12px', fontWeight: 800, color: '#D97706', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '4px' }}>
              Flagship Collection
            </div>
            <h2 style={{ fontSize: '28px', fontWeight: 900, color: '#0F172A', margin: 0, letterSpacing: '-0.02em' }}>
              Pinnacle Executive Ground Fleet
            </h2>
          </div>

          <button
            onClick={onNavigateToFleet}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#D97706',
              fontSize: '14px',
              fontWeight: 800,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <span>View All Vehicles & Multi-Photo Galleries</span>
            <ChevronRight size={16} />
          </button>
        </div>

        {/* 3-Column Fleet Preview Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '24px' }}>
          {[
            {
              title: 'Mercedes-Maybach S 580',
              badge: 'First-Class Sedan',
              img: 'https://images.unsplash.com/photo-1618843479313-40f8afb4b4d8?auto=format&fit=crop&w=800&q=80',
              pax: 3,
              luggage: 3,
              desc: 'Reclining Nappa leather captain chairs, hot stone massage, champagne flute console.'
            },
            {
              title: 'Cadillac Escalade ESV',
              badge: 'Flagship Luxury SUV',
              img: 'https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?auto=format&fit=crop&w=800&q=80',
              pax: 6,
              luggage: 6,
              desc: 'Extended wheelbase with generous cargo volume for full international luggage sets.'
            },
            {
              title: 'Mercedes Sprinter Jet Lounge',
              badge: 'Private Jet Edition',
              img: 'https://images.unsplash.com/photo-1570125909232-eb263c188f7e?auto=format&fit=crop&w=800&q=80',
              pax: 12,
              luggage: 14,
              desc: 'Standing walk-in height, starlight ceiling, conference club seating and 4K display.'
            }
          ].map((item, idx) => (
            <div
              key={idx}
              onClick={onNavigateToFleet}
              style={{
                background: '#FFFFFF',
                borderRadius: '18px',
                border: '1px solid #E2E8F0',
                overflow: 'hidden',
                boxShadow: '0 4px 20px rgba(15, 23, 42, 0.05)',
                cursor: 'pointer',
                transition: 'transform 0.2s, box-shadow 0.2s'
              }}
            >
              <div style={{ height: '200px', width: '100%', position: 'relative', overflow: 'hidden' }}>
                <img
                  src={item.img}
                  alt={item.title}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
                <span style={{
                  position: 'absolute',
                  top: '12px',
                  left: '12px',
                  background: 'rgba(15, 23, 42, 0.85)',
                  backdropFilter: 'blur(6px)',
                  color: '#F8FAFC',
                  fontSize: '11px',
                  fontWeight: 800,
                  padding: '4px 10px',
                  borderRadius: '6px'
                }}>
                  {item.badge}
                </span>
              </div>

              <div style={{ padding: '20px' }}>
                <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#0F172A', margin: '0 0 6px 0' }}>{item.title}</h3>
                <p style={{ fontSize: '13px', color: '#64748B', lineHeight: 1.5, margin: '0 0 14px 0' }}>{item.desc}</p>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px', fontWeight: 700, color: '#334155', borderTop: '1px solid #F1F5F9', paddingTop: '12px' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Users size={14} color="#2563EB" /> {item.pax} Passengers</span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Briefcase size={14} color="#2563EB" /> {item.luggage} Luggage Trunks</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* --- 3. VALUE PROPOSITION CARDS --- */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '24px' }}>
        <div style={{
          background: '#FFFFFF',
          border: '1px solid #E2E8F0',
          borderRadius: '20px',
          padding: '28px',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
          boxShadow: '0 4px 16px rgba(15, 23, 42, 0.04)'
        }}>
          <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'rgba(37, 99, 235, 0.1)', border: '1px solid rgba(37, 99, 235, 0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#2563EB' }}>
            <Plane size={24} />
          </div>
          <h3 style={{ fontSize: '17px', fontWeight: 900, color: '#0F172A', margin: 0 }}>FlightRadar24 Auto-Sync</h3>
          <p style={{ fontSize: '13px', color: '#64748B', lineHeight: '1.6', margin: 0 }}>
            Never worry about commercial or private flight delays. Our dispatch telemetry automatically adjusts chauffeur arrival based on live transponder beacons.
          </p>
        </div>

        <div style={{
          background: '#FFFFFF',
          border: '1px solid #E2E8F0',
          borderRadius: '20px',
          padding: '28px',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
          boxShadow: '0 4px 16px rgba(15, 23, 42, 0.04)'
        }}>
          <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'rgba(217, 119, 6, 0.1)', border: '1px solid rgba(217, 119, 6, 0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#D97706' }}>
            <Shield size={24} />
          </div>
          <h3 style={{ fontSize: '17px', fontWeight: 900, color: '#0F172A', margin: 0 }}>Secret Service & FBI Vetted</h3>
          <p style={{ fontSize: '13px', color: '#64748B', lineHeight: '1.6', margin: 0 }}>
            All chauffeurs undergo biometric background checks, defensive tactical driving training, strict NDA protocols, and continuous MVR scrutiny.
          </p>
        </div>

        <div style={{
          background: '#FFFFFF',
          border: '1px solid #E2E8F0',
          borderRadius: '20px',
          padding: '28px',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
          boxShadow: '0 4px 16px rgba(15, 23, 42, 0.04)'
        }}>
          <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'rgba(124, 58, 237, 0.1)', border: '1px solid rgba(124, 58, 237, 0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#7C3AED' }}>
            <Briefcase size={24} />
          </div>
          <h3 style={{ fontSize: '17px', fontWeight: 900, color: '#0F172A', margin: 0 }}>Corporate Billing & Duty of Care</h3>
          <p style={{ fontSize: '13px', color: '#64748B', lineHeight: '1.6', margin: 0 }}>
            Itemized location tax receipts, per-leg cancellation policy disclosures, corporate expense exports, and centralized account managers.
          </p>
        </div>
      </div>

    </div>
  );
};

