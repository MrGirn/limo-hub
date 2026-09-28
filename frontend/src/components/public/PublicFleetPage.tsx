import React, { useState, useEffect } from 'react';
import { Users, Briefcase, Sparkles, Shield, Wifi, Droplets, VolumeX, CheckCircle2, ArrowRight, Camera, ChevronLeft, ChevronRight, Eye, Award, Star, Compass, Wind, Coffee, Crown, Car } from 'lucide-react';
import { VendorPortalConfig, VehicleClass } from '../../types';

interface VehiclePhoto {
  url: string;
  caption: string;
  viewType: 'EXTERIOR' | 'CABIN' | 'SEATING' | 'LUGGAGE' | 'DETAILS';
}

interface FleetVehicle {
  id: string;
  type: VehicleClass;
  categoryName: string;
  title: string;
  makeModel: string;
  year: string;
  tagline: string;
  pax: number;
  luggage: number;
  multiplier: number;
  badge: string;
  badgeColor: string;
  desc: string;
  specs: {
    seatingType: string;
    soundSystem: string;
    connectivity: string;
    climate: string;
    beverage: string;
    safetyRating: string;
  };
  amenities: string[];
  photos: VehiclePhoto[];
}

interface PublicFleetPageProps {
  config: VendorPortalConfig;
  onSelectVehicle: (vClass: VehicleClass) => void;
}

export const PublicFleetPage: React.FC<PublicFleetPageProps> = ({ config, onSelectVehicle }) => {
  const branding = config.branding || {};
  const primaryColor = branding.primary_color || '#0F172A';
  const accentColor = branding.accent_color || '#D97706';

  const [activeCategory, setActiveCategory] = useState<string>('ALL');
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState<Record<string, number>>({});
  const [expandedDetailsVehicleId, setExpandedDetailsVehicleId] = useState<string | null>(null);
  const [liveVehicles, setLiveVehicles] = useState<FleetVehicle[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Authoritative database-backed fleet vehicles derived from cached portal bootstrap
  const configFleetVehicles: FleetVehicle[] = (config.fleet_vehicles || config.vehicle_options || []).map((v: any, idx: number) => ({
    id: v.id || `veh_cls_${v.type || idx}`,
    type: (v.type || 'LUXURY_SUV') as VehicleClass,
    categoryName: v.categoryName || (String(v.type).includes('SUV') ? 'SUV' : String(v.type).includes('VAN') ? 'VAN' : 'SEDAN'),
    title: v.title || 'Executive Fleet Vehicle',
    makeModel: v.makeModel || v.models || v.title || 'Executive Fleet Model',
    year: v.year || '2025 Fleet Model',
    tagline: v.tagline || v.subtitle || 'Pinnacle Chauffeur Luxury & Executive Transport',
    pax: v.pax || 4,
    luggage: v.luggage || 3,
    multiplier: v.multiplier || 1.0,
    badge: v.badge || '👑 Sovereign Verified Fleet',
    badgeColor: v.badgeColor || '#10253F',
    desc: v.desc || v.tagline || 'Commercial flagship vehicle certified for private aviation, diplomatic roadshows, and executive airport transfers.',
    specs: v.specs || {
      seatingType: 'Executive Leather Heated/Cooled Comfort Seats',
      soundSystem: 'High-Fidelity Acoustic Surround Sound',
      connectivity: 'High-Speed 5G Wi-Fi Hotspot & USB-C Power',
      climate: 'Multi-Zone Automatic Climate & HEPA Air Ionizer',
      beverage: 'Complimentary Chilled Artesian Bottled Water',
      safetyRating: 'Surround 360 Telemetry & DOT Vetted Chauffeur'
    },
    amenities: (v.amenities && v.amenities.length > 0) ? v.amenities : (v.features || [
      'Dedicated Luggage Cargo Space',
      'Complimentary High-Speed Wi-Fi Hotspot',
      'Chilled Fiji Bottled Water & Travel Refreshments'
    ]),
    photos: (v.photos && v.photos.length > 0) ? v.photos : [
      {
        url: v.photoUrl || 'https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?auto=format&fit=crop&w=1200&q=80',
        caption: `${v.title || 'Executive Vehicle'} - Fleet Exterior Profile`,
        viewType: 'EXTERIOR'
      }
    ]
  }));

  const fleetVehicles: FleetVehicle[] = configFleetVehicles;

  useEffect(() => {
    let isMounted = true;
    if (!config.vendor_id) {
      setLoading(false);
      return;
    }
    
    fetch(`/api/v1/vendors/${config.vendor_id}/fleet-inventory`)
      .then(res => {
        if (!res.ok) throw new Error('Fleet fetch error');
        return res.json();
      })
      .then((data: any[]) => {
        if (!isMounted) return;
        if (Array.isArray(data) && data.length > 0) {
          // Strictly filter only active & available vehicles (omit maintenance / disabled vehicles)
          const activeFleetData = data.filter((v: any) => v.is_active !== false && v.status !== 'MAINTENANCE' && v.status !== 'DISABLED');
          const mapped: FleetVehicle[] = activeFleetData.map((v: any) => {
            const vClass = (v.vehicle_class || 'LUXURY_SUV') as VehicleClass;
            let catName = 'SUV';
            const vClassStr = String(v.vehicle_class || '');
            if (vClassStr.includes('SEDAN') || vClassStr === 'FIRST_CLASS' || vClassStr.includes('ELECTRIC')) {
              catName = 'SEDAN';
            } else if (vClassStr.includes('VAN') || vClassStr.includes('SPRINTER') || vClassStr.includes('MINIVAN')) {
              catName = 'VAN';
            }

            const photos: VehiclePhoto[] = Array.isArray(v.photos) && v.photos.length > 0
              ? v.photos.map((p: any) => ({
                  url: p.photo_url || p.url,
                  caption: p.label || p.caption || v.name,
                  viewType: (p.photo_type || 'EXTERIOR') as any
                }))
              : [
                  {
                    url: 'https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?auto=format&fit=crop&w=1200&q=80',
                    caption: `${v.name} - Fleet Exterior Profile`,
                    viewType: 'EXTERIOR'
                  }
                ];

            return {
              id: v.id,
              type: vClass,
              categoryName: catName,
              title: v.name,
              makeModel: `${v.name}${v.exterior_color ? ` (${v.exterior_color})` : ''}`,
              year: v.created_at ? `Certified ${new Date(v.created_at).getFullYear()}` : '2025 Fleet Model',
              tagline: v.tagline || 'Pinnacle Chauffeur Luxury & Executive Transport',
              pax: v.passenger_capacity || 4,
              luggage: v.luggage_capacity || 3,
              multiplier: 1.0,
              badge: v.participate_in_network ? '👑 Live Verified Fleet' : '⭐️ Sovereign Dedicated Fleet',
              badgeColor: '#10253F',
              desc: v.tagline 
                ? `${v.tagline}. Meticulously maintained to sovereign white-glove standards with ${v.exterior_color || 'Obsidian Black'} exterior and ${v.interior_color || 'Executive Handcrafted'} interior.`
                : 'Commercial flagship vehicle certified for private aviation, diplomatic roadshows, and executive airport transfers.',
              specs: {
                seatingType: `${v.interior_color || 'Executive Leather'} Heated/Cooled Comfort Seats`,
                soundSystem: 'High-Fidelity Acoustic Surround Sound',
                connectivity: 'High-Speed 5G Wi-Fi Hotspot & USB-C Power',
                climate: 'Multi-Zone Automatic Climate & HEPA Air Ionizer',
                beverage: 'Complimentary Chilled Artesian Bottled Water',
                safetyRating: 'Surround 360 Telemetry & DOT Vetted Chauffeur'
              },
              amenities: Array.isArray(v.amenities) && v.amenities.length > 0
                ? v.amenities
                : [
                    'Dedicated Luggage Cargo Space',
                    'Complimentary High-Speed Wi-Fi Hotspot',
                    'Chilled Fiji Bottled Water & Travel Refreshments',
                    'Acoustic Noise Privacy Glass & Window Sunshades'
                  ],
              photos
            };
          });
          setLiveVehicles(mapped);
        }
        setLoading(false);
      })
      .catch(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [config.vendor_id]);

  const displayVehicles = liveVehicles.length > 0 ? liveVehicles : fleetVehicles;

  const filteredVehicles = activeCategory === 'ALL'
    ? displayVehicles
    : displayVehicles.filter(v => v.categoryName === activeCategory);

  const handleNextPhoto = (vehicleId: string, totalPhotos: number, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedPhotoIndex(prev => ({
      ...prev,
      [vehicleId]: ((prev[vehicleId] || 0) + 1) % totalPhotos
    }));
  };

  const handlePrevPhoto = (vehicleId: string, totalPhotos: number, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedPhotoIndex(prev => ({
      ...prev,
      [vehicleId]: ((prev[vehicleId] || 0) - 1 + totalPhotos) % totalPhotos
    }));
  };

  return (
    <div style={{ maxWidth: '1440px', margin: '0 auto', padding: '32px 24px', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      
      {/* --- 1. HERO HEADER WITH PRESTIGE BADGE --- */}
      <div style={{ textAlign: 'center', maxWidth: '840px', margin: '0 auto 40px auto' }}>
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
          marginBottom: '16px'
        }}>
          <Crown size={14} color="#967B42" /> {config.vendor_name} · Premier Fleet Collection
        </div>

        <h1 style={{ 
          fontFamily: '"Libre Baskerville", Georgia, serif',
          fontSize: '40px', 
          fontWeight: 400, 
          color: '#0B1B2D', 
          letterSpacing: '-0.02em', 
          margin: '0 0 16px 0',
          lineHeight: 1.2
        }}>
          The Executive Fleet
        </h1>

        <p style={{ fontSize: '15px', color: '#586579', lineHeight: 1.65, margin: '0 0 28px 0', fontFamily: 'var(--font-ui)' }}>
          Every vehicle is late-model, commercially insured for <strong>$5,000,000</strong>, meticulously detailed prior to every mission, and piloted by a certified, background-screened executive chauffeur.
        </p>

        {/* Category Filter Pills */}
        <div style={{ display: 'flex', justifyContent: 'center', flexWrap: 'wrap', gap: '8px' }}>
          {[
            { id: 'ALL', label: 'All Vehicles' },
            { id: 'SUV', label: 'Executive SUVs' },
            { id: 'SEDAN', label: 'Diplomatic Sedans' },
            { id: 'VAN', label: 'Executive Sprinters' }
          ].map((tab) => {
            const isActive = activeCategory === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveCategory(tab.id)}
                style={{
                  background: isActive ? '#10253F' : '#FFFFFF',
                  color: isActive ? '#FFFFFF' : '#586579',
                  border: isActive ? '1px solid #10253F' : '1px solid #E5E8ED',
                  padding: '8px 18px',
                  borderRadius: '5px',
                  fontSize: '13px',
                  fontWeight: isActive ? 600 : 500,
                  cursor: 'pointer',
                  boxShadow: isActive ? '0 2px 8px rgba(16, 37, 63, 0.15)' : 'none',
                  transition: 'all 0.16s ease'
                }}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* --- 2. LUXURY VEHICLE SHOWCASE GRID --- */}
      <div className="public-fleet-grid">
        {filteredVehicles.map((vehicle) => {
          const currentPhotoIdx = selectedPhotoIndex[vehicle.id] || 0;
          const currentPhoto = vehicle.photos[currentPhotoIdx] || vehicle.photos[0];
          const isDetailsOpen = expandedDetailsVehicleId === vehicle.id;

          return (
            <div
              key={vehicle.id}
              style={{
                background: '#FFFFFF',
                borderRadius: '16px',
                border: '1px solid #E5E8ED',
                overflow: 'hidden',
                boxShadow: '0 8px 24px rgba(16, 37, 63, 0.05)',
                display: 'flex',
                flexDirection: 'column',
                transition: 'all 0.2s ease'
              }}
            >
              {/* --- Vehicle Photo Gallery Hero --- */}
              <div style={{ position: 'relative', width: '100%', height: '340px', background: '#0B1B2D', overflow: 'hidden' }}>
                <img
                  src={currentPhoto.url}
                  alt={currentPhoto.caption}
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                    transition: 'opacity 0.3s ease'
                  }}
                />

                {/* Top Badge */}
                <div style={{ position: 'absolute', top: '16px', left: '16px', display: 'flex', gap: '8px' }}>
                  <span style={{
                    background: 'rgba(11, 27, 45, 0.88)',
                    backdropFilter: 'blur(8px)',
                    color: '#F8FAFC',
                    border: '1px solid rgba(255,255,255,0.2)',
                    fontSize: '11px',
                    fontWeight: 600,
                    padding: '4px 10px',
                    borderRadius: '4px',
                    letterSpacing: '0.04em'
                  }}>
                    {vehicle.badge}
                  </span>
                  <span style={{
                    background: '#FDFBF7',
                    color: '#806734',
                    border: '1px solid #EADBBE',
                    fontSize: '11px',
                    fontWeight: 700,
                    padding: '4px 8px',
                    borderRadius: '4px'
                  }}>
                    {vehicle.year}
                  </span>
                </div>

                {/* Photo Caption Pill */}
                <div style={{
                  position: 'absolute',
                  bottom: '16px',
                  left: '16px',
                  background: 'rgba(11, 27, 45, 0.88)',
                  backdropFilter: 'blur(8px)',
                  color: '#FFFFFF',
                  padding: '6px 12px',
                  borderRadius: '5px',
                  fontSize: '12px',
                  fontWeight: 500,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  border: '1px solid rgba(255,255,255,0.15)'
                }}>
                  <Camera size={13} color="#C2A363" />
                  <span>{currentPhoto.caption}</span>
                  <span style={{ color: '#94A3B8', fontSize: '11px' }}>({currentPhotoIdx + 1}/{vehicle.photos.length})</span>
                </div>

                {/* Left/Right Carousel Controls */}
                {vehicle.photos.length > 1 && (
                  <>
                    <button
                      onClick={(e) => handlePrevPhoto(vehicle.id, vehicle.photos.length, e)}
                      aria-label="Previous photo"
                      style={{
                        position: 'absolute',
                        left: '12px',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        width: '36px',
                        height: '36px',
                        borderRadius: '50%',
                        background: 'rgba(11, 27, 45, 0.75)',
                        backdropFilter: 'blur(6px)',
                        color: '#FFFFFF',
                        border: '1px solid rgba(255,255,255,0.3)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        transition: 'background 0.2s ease'
                      }}
                    >
                      <ChevronLeft size={20} />
                    </button>

                    <button
                      onClick={(e) => handleNextPhoto(vehicle.id, vehicle.photos.length, e)}
                      aria-label="Next photo"
                      style={{
                        position: 'absolute',
                        right: '12px',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        width: '36px',
                        height: '36px',
                        borderRadius: '50%',
                        background: 'rgba(11, 27, 45, 0.75)',
                        backdropFilter: 'blur(6px)',
                        color: '#FFFFFF',
                        border: '1px solid rgba(255,255,255,0.3)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        transition: 'background 0.2s ease'
                      }}
                    >
                      <ChevronRight size={20} />
                    </button>
                  </>
                )}
              </div>

              {/* --- Multiple Thumbnail Strip Selector --- */}
              <div style={{
                display: 'flex',
                gap: '8px',
                padding: '10px 16px',
                background: '#F8FAFC',
                borderBottom: '1px solid #E5E8ED',
                overflowX: 'auto'
              }}>
                {vehicle.photos.map((photo, pIdx) => {
                  const isSelected = pIdx === currentPhotoIdx;
                  return (
                    <button
                      key={pIdx}
                      onClick={() => setSelectedPhotoIndex(prev => ({ ...prev, [vehicle.id]: pIdx }))}
                      style={{
                        flex: '0 0 72px',
                        height: '46px',
                        borderRadius: '4px',
                        overflow: 'hidden',
                        border: isSelected ? '2px solid #967B42' : '1px solid #CBD5E1',
                        padding: 0,
                        cursor: 'pointer',
                        position: 'relative',
                        opacity: isSelected ? 1 : 0.65,
                        transition: 'all 0.15s ease'
                      }}
                    >
                      <img
                        src={photo.url}
                        alt={photo.caption}
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      />
                    </button>
                  );
                })}
              </div>

              {/* --- Vehicle Header & Description --- */}
              <div style={{ padding: '24px', flex: 1, display: 'flex', flexDirection: 'column', gap: '18px' }}>
                <div>
                  <div style={{ fontSize: '11px', fontWeight: 700, color: '#806734', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                    {vehicle.makeModel}
                  </div>
                  <h3 style={{ fontFamily: '"Libre Baskerville", Georgia, serif', fontSize: '22px', fontWeight: 400, color: '#0B1B2D', margin: '4px 0 6px 0', letterSpacing: '-0.01em' }}>
                    {vehicle.title}
                  </h3>
                  <p style={{ fontSize: '13px', color: '#586579', lineHeight: 1.6, margin: 0 }}>
                    {vehicle.desc}
                  </p>
                </div>

                {/* Passenger & Luggage Capacity Pills */}
                <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                  <div style={{
                    flex: '1 1 auto',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '10px 14px',
                    background: '#F8FAFC',
                    borderRadius: '6px',
                    border: '1px solid #E5E8ED',
                    fontSize: '13px',
                    fontWeight: 600,
                    color: '#0B1B2D'
                  }}>
                    <Users size={16} color="#10253F" />
                    <span><strong>{vehicle.pax}</strong> Passengers</span>
                  </div>

                  <div style={{
                    flex: '1 1 auto',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '10px 14px',
                    background: '#F8FAFC',
                    borderRadius: '6px',
                    border: '1px solid #E5E8ED',
                    fontSize: '13px',
                    fontWeight: 600,
                    color: '#0B1B2D'
                  }}>
                    <Briefcase size={16} color="#10253F" />
                    <span><strong>{vehicle.luggage}</strong> Luggage Trunks</span>
                  </div>
                </div>

                {/* Key Executive In-Cabin Amenities */}
                <div>
                  <div style={{ fontSize: '12px', fontWeight: 700, color: '#0B1B2D', marginBottom: '8px', letterSpacing: '0.02em' }}>
                    First-Class Standard Inclusions:
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '8px' }}>
                    {vehicle.amenities.slice(0, 4).map((item, i) => (
                      <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '7px', fontSize: '12px', color: '#586579' }}>
                        <CheckCircle2 size={13} color="#059669" />
                        <span>{item}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Collapsible Full Engineering Specifications */}
                {isDetailsOpen && (
                  <div style={{
                    background: '#F8FAFC',
                    borderRadius: '8px',
                    padding: '16px',
                    border: '1px solid #E5E8ED',
                    marginTop: '4px'
                  }}>
                    <div style={{ fontSize: '12px', fontWeight: 700, color: '#0B1B2D', marginBottom: '10px' }}>
                      Detailed Cabin &amp; Audio Specifications:
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', fontSize: '11px', color: '#586579' }}>
                      <div><strong>Seating:</strong> {vehicle.specs.seatingType}</div>
                      <div><strong>Audio:</strong> {vehicle.specs.soundSystem}</div>
                      <div><strong>Displays:</strong> {vehicle.specs.connectivity}</div>
                      <div><strong>Climate:</strong> {vehicle.specs.climate}</div>
                      <div><strong>Beverage:</strong> {vehicle.specs.beverage}</div>
                      <div><strong>Safety:</strong> {vehicle.specs.safetyRating}</div>
                    </div>
                  </div>
                )}

                {/* Bottom Bar: Toggle Details & Direct Booking CTA (No Rates Shown) */}
                <div style={{
                  marginTop: 'auto',
                  paddingTop: '16px',
                  borderTop: '1px solid #E5E8ED',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: '12px'
                }}>
                  <div>
                    <button
                      onClick={() => setExpandedDetailsVehicleId(isDetailsOpen ? null : vehicle.id)}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: '#586579',
                        fontSize: '12px',
                        fontWeight: 500,
                        cursor: 'pointer',
                        padding: 0,
                        textDecoration: 'underline'
                      }}
                    >
                      {isDetailsOpen ? 'Hide Full Technical Specs' : 'View Full Technical Specs & Interior Details'}
                    </button>
                  </div>

                  <button
                    onClick={() => onSelectVehicle(vehicle.type)}
                    style={{
                      background: '#967B42',
                      color: '#FFFFFF',
                      border: 'none',
                      padding: '12px 24px',
                      borderRadius: '5px',
                      fontSize: '13px',
                      fontWeight: 600,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      transition: 'background-color 0.16s ease'
                    }}
                  >
                    <span>Reserve &amp; Request Quote</span>
                    <ArrowRight size={14} color="#FFFFFF" />
                  </button>
                </div>

              </div>

            </div>
          );
        })}
      </div>

      {/* --- 3. VENDOR FLEET DISCLOSURE & PROTOCOLS --- */}
      <div style={{
        marginTop: '56px',
        background: '#FFFFFF',
        borderRadius: '16px',
        border: '1px solid #E2E8F0',
        padding: '28px 32px',
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
        gap: '24px',
        boxShadow: '0 4px 20px rgba(0,0,0,0.03)'
      }}>
        <div style={{ display: 'flex', gap: '14px' }}>
          <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: '#EFF6FF', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Shield size={20} color="#2563EB" />
          </div>
          <div>
            <h4 style={{ margin: '0 0 4px 0', fontSize: '14px', fontWeight: 800, color: '#0F172A' }}>$5,000,000 Commercial Policy</h4>
            <p style={{ margin: 0, fontSize: '12px', color: '#64748B', lineHeight: 1.5 }}>
              All vehicles operate with primary commercial liability coverage surpassing municipal and airport authority mandates.
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '14px' }}>
          <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: '#FEF3C7', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Sparkles size={20} color="#D97706" />
          </div>
          <div>
            <h4 style={{ margin: '0 0 4px 0', fontSize: '14px', fontWeight: 800, color: '#0F172A' }}>Pre-Mission Detailing</h4>
            <p style={{ margin: 0, fontSize: '12px', color: '#64748B', lineHeight: 1.5 }}>
              Hand-washed, vacuumed, sanitized, and restocked with fresh glass Fiji water and amenities 45 minutes prior to staging.
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '14px' }}>
          <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: '#ECFDF5', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Award size={20} color="#059669" />
          </div>
          <div>
            <h4 style={{ margin: '0 0 4px 0', fontSize: '14px', fontWeight: 800, color: '#0F172A' }}>Certified Chauffeur Vetting</h4>
            <p style={{ margin: 0, fontSize: '12px', color: '#64748B', lineHeight: 1.5 }}>
              Fingerprint background checks, defensive driving certifications, non-disclosure agreements, and executive etiquette training.
            </p>
          </div>
        </div>
      </div>

    </div>
  );
};

