import React, { useState, useEffect } from 'react';
import { Plane, ChevronDown, ChevronUp, ShieldCheck, CheckCircle2, Users, Briefcase, Navigation, Clock, Star, Award, Car } from 'lucide-react';
import { BookingState, VehicleClassType } from '../types';
import { SharedBookingHeader } from './SharedBookingHeader';
import { SharedBookingFooter } from './SharedBookingFooter';
import { SharedStepper } from './SharedStepper';

interface Props {
  state: BookingState;
  onChange: (updates: Partial<BookingState>) => void;
  onContinue: () => void;
  onEditTrip?: () => void;
  onOpenMyBookings?: () => void;
  onOpenSignIn?: () => void;
}

interface CityVendor {
  vendor_id: string;
  company_name: string;
  market_city: string;
  rating_score: number;
  total_reviews_count: number;
  fleet_size: number;
  vehicle_makes: string;
  primary_chauffeur_name: string;
  primary_chauffeur_phone: string;
  primary_vehicle_plate: string;
  primary_vehicle_name: string;
  amenities: string[];
  cancellation_policy: string;
  rates: Record<VehicleClassType, {
    base_fare_usd: number;
    fees_and_taxes_usd: number;
    total_fare_usd: number;
  }>;
}

export const RideSelectionPage: React.FC<Props> = ({
  state,
  onChange,
  onContinue,
  onEditTrip,
  onOpenMyBookings,
  onOpenSignIn
}) => {
  const [showSpecialRequests, setShowSpecialRequests] = useState(false);
  const [isLoadingQuotes, setIsLoadingQuotes] = useState(true);

  const [routeInfo, setRouteInfo] = useState<{ distanceMiles: number; durationMinutes: number; tolls: number }>({
    distanceMiles: 0,
    durationMinutes: 0,
    tolls: 0
  });

  const [cityVendors, setCityVendors] = useState<CityVendor[]>([]);
  const [selectedVendorId, setSelectedVendorId] = useState<string>(state.assignedVendorId || '');

  const [tierQuotes, setTierQuotes] = useState<Record<VehicleClassType, { total: number; base: number; fees: number }>>({
    LUXURY_SUV: { total: state.totalFare || 0, base: state.baseFare || 0, fees: state.feesAndTaxes || 0 },
    FIRST_CLASS: { total: 0, base: 0, fees: 0 },
    BUSINESS_SEDAN: { total: 0, base: 0, fees: 0 },
    BUSINESS_CLASS: { total: 0, base: 0, fees: 0 },
    BUSINESS_VAN: { total: 0, base: 0, fees: 0 }
  });

  const [servicingVendor, setServicingVendor] = useState<{
    id: string;
    name: string;
    city: string;
    chauffeur: string;
    plate: string;
    vehicles: string;
    rating: number;
    reviews: number;
    amenities: string[];
    cancellation: string;
  }>({
    id: state.assignedVendorId || '',
    name: state.assignedVendorName || 'Loading verified operator...',
    city: state.marketCity || '',
    chauffeur: '',
    plate: '',
    vehicles: '',
    rating: 4.95,
    reviews: 1200,
    amenities: [],
    cancellation: 'Free cancellation up to 24 hours before pickup'
  });

  // Fetch Quotes Dynamically from Global Hub API
  useEffect(() => {
    let isMounted = true;
    const fetchTierQuotes = async () => {
      setIsLoadingQuotes(true);
      try {
        const res = await fetch('/api/v1/global-hub/quotes/calculate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            pickup: state.pickupAddress || '',
            dropoff: state.serviceType === 'ONE_WAY' ? state.dropoffAddress : undefined,
            service_type: state.serviceType || 'ONE_WAY',
            vehicle_class: state.vehicleClass || 'LUXURY_SUV',
            hourly_duration: state.hourlyDuration || 3,
            stops_count: (state.stops || []).length
          })
        });

        if (res.ok && isMounted) {
          const data = await res.json();
          const dist = Number(data.distance_miles || 0);
          const dur = Number(data.duration_minutes || 0);
          const tTolls = Number(data.tolls_usd || 0);
          setRouteInfo({ distanceMiles: dist, durationMinutes: dur, tolls: tTolls });

          const vendorsList: CityVendor[] = data.city_vendors || [];
          setCityVendors(vendorsList);

          // Find active vendor (either previously selected or first returned)
          let activeVendor = vendorsList.find(v => v.vendor_id === state.assignedVendorId) ||
                             vendorsList.find(v => v.vendor_id === data.servicing_vendor_id) ||
                             vendorsList[0];

          if (activeVendor) {
            setSelectedVendorId(activeVendor.vendor_id);
            setServicingVendor({
              id: activeVendor.vendor_id,
              name: activeVendor.company_name,
              city: activeVendor.market_city,
              chauffeur: activeVendor.primary_chauffeur_name,
              plate: activeVendor.primary_vehicle_plate,
              vehicles: activeVendor.vehicle_makes,
              rating: activeVendor.rating_score,
              reviews: activeVendor.total_reviews_count,
              amenities: activeVendor.amenities || [],
              cancellation: activeVendor.cancellation_policy
            });

            // Map rates from the active vendor
            const vRates = activeVendor.rates;
            if (vRates) {
              const newTierQuotes: Record<VehicleClassType, { total: number; base: number; fees: number }> = {
                LUXURY_SUV: {
                  total: vRates.LUXURY_SUV?.total_fare_usd || 0,
                  base: vRates.LUXURY_SUV?.base_fare_usd || 0,
                  fees: vRates.LUXURY_SUV?.fees_and_taxes_usd || 0
                },
                FIRST_CLASS: {
                  total: vRates.FIRST_CLASS?.total_fare_usd || 0,
                  base: vRates.FIRST_CLASS?.base_fare_usd || 0,
                  fees: vRates.FIRST_CLASS?.fees_and_taxes_usd || 0
                },
                BUSINESS_SEDAN: {
                  total: vRates.BUSINESS_SEDAN?.total_fare_usd || vRates.BUSINESS_CLASS?.total_fare_usd || 0,
                  base: vRates.BUSINESS_SEDAN?.base_fare_usd || vRates.BUSINESS_CLASS?.base_fare_usd || 0,
                  fees: vRates.BUSINESS_SEDAN?.fees_and_taxes_usd || vRates.BUSINESS_CLASS?.fees_and_taxes_usd || 0
                },
                BUSINESS_CLASS: {
                  total: vRates.BUSINESS_CLASS?.total_fare_usd || vRates.BUSINESS_SEDAN?.total_fare_usd || 0,
                  base: vRates.BUSINESS_CLASS?.base_fare_usd || vRates.BUSINESS_SEDAN?.base_fare_usd || 0,
                  fees: vRates.BUSINESS_CLASS?.fees_and_taxes_usd || vRates.BUSINESS_SEDAN?.fees_and_taxes_usd || 0
                },
                BUSINESS_VAN: {
                  total: vRates.BUSINESS_VAN?.total_fare_usd || 0,
                  base: vRates.BUSINESS_VAN?.base_fare_usd || 0,
                  fees: vRates.BUSINESS_VAN?.fees_and_taxes_usd || 0
                }
              };
              setTierQuotes(newTierQuotes);

              const currentCls = state.vehicleClass || 'LUXURY_SUV';
              const currentQuote = newTierQuotes[currentCls] || newTierQuotes.LUXURY_SUV;
              if (currentQuote) {
                onChange({
                  baseFare: currentQuote.base,
                  feesAndTaxes: currentQuote.fees,
                  totalFare: currentQuote.total,
                  assignedVendorId: activeVendor.vendor_id,
                  assignedVendorName: activeVendor.company_name,
                  marketCity: activeVendor.market_city
                });
              }
            }
          } else {
            // Fallback to top-level returned quote if no vendor array
            const total = Number(data.total_fare_usd || 0);
            const base = Number(data.base_fare_usd || 0);
            const fees = Number(data.fees_and_taxes_usd || 0);
            onChange({
              baseFare: base,
              feesAndTaxes: fees,
              totalFare: total,
              assignedVendorId: data.servicing_vendor_id,
              assignedVendorName: data.servicing_vendor_name,
              marketCity: data.market_city
            });
          }
        }
      } catch (err) {
        console.warn('Backend quote sync notice:', err);
      } finally {
        if (isMounted) setIsLoadingQuotes(false);
      }
    };

    fetchTierQuotes();
    return () => { isMounted = false; };
  }, [state.pickupAddress, state.dropoffAddress, state.serviceType, state.hourlyDuration, (state.stops || []).length]);

  // Handle switching vendor when multiple vendors operate in the city
  const handleSelectVendor = (vendor: CityVendor) => {
    setSelectedVendorId(vendor.vendor_id);
    setServicingVendor({
      id: vendor.vendor_id,
      name: vendor.company_name,
      city: vendor.market_city,
      chauffeur: vendor.primary_chauffeur_name,
      plate: vendor.primary_vehicle_plate,
      vehicles: vendor.vehicle_makes,
      rating: vendor.rating_score,
      reviews: vendor.total_reviews_count,
      amenities: vendor.amenities || [],
      cancellation: vendor.cancellation_policy
    });

    if (vendor.rates) {
      const newTierQuotes: Record<VehicleClassType, { total: number; base: number; fees: number }> = {
        LUXURY_SUV: {
          total: vendor.rates.LUXURY_SUV?.total_fare_usd || 0,
          base: vendor.rates.LUXURY_SUV?.base_fare_usd || 0,
          fees: vendor.rates.LUXURY_SUV?.fees_and_taxes_usd || 0
        },
        FIRST_CLASS: {
          total: vendor.rates.FIRST_CLASS?.total_fare_usd || 0,
          base: vendor.rates.FIRST_CLASS?.base_fare_usd || 0,
          fees: vendor.rates.FIRST_CLASS?.fees_and_taxes_usd || 0
        },
        BUSINESS_SEDAN: {
          total: vendor.rates.BUSINESS_SEDAN?.total_fare_usd || vendor.rates.BUSINESS_CLASS?.total_fare_usd || 0,
          base: vendor.rates.BUSINESS_SEDAN?.base_fare_usd || vendor.rates.BUSINESS_CLASS?.base_fare_usd || 0,
          fees: vendor.rates.BUSINESS_SEDAN?.fees_and_taxes_usd || vendor.rates.BUSINESS_CLASS?.fees_and_taxes_usd || 0
        },
        BUSINESS_CLASS: {
          total: vendor.rates.BUSINESS_CLASS?.total_fare_usd || vendor.rates.BUSINESS_SEDAN?.total_fare_usd || 0,
          base: vendor.rates.BUSINESS_CLASS?.base_fare_usd || vendor.rates.BUSINESS_SEDAN?.base_fare_usd || 0,
          fees: vendor.rates.BUSINESS_CLASS?.fees_and_taxes_usd || vendor.rates.BUSINESS_SEDAN?.fees_and_taxes_usd || 0
        },
        BUSINESS_VAN: {
          total: vendor.rates.BUSINESS_VAN?.total_fare_usd || 0,
          base: vendor.rates.BUSINESS_VAN?.base_fare_usd || 0,
          fees: vendor.rates.BUSINESS_VAN?.fees_and_taxes_usd || 0
        }
      };
      setTierQuotes(newTierQuotes);

      const currentCls = state.vehicleClass || 'LUXURY_SUV';
      const activeQuote = newTierQuotes[currentCls] || newTierQuotes.LUXURY_SUV;
      if (activeQuote) {
        onChange({
          baseFare: activeQuote.base,
          feesAndTaxes: activeQuote.fees,
          totalFare: activeQuote.total,
          assignedVendorId: vendor.vendor_id,
          assignedVendorName: vendor.company_name,
          marketCity: vendor.market_city
        });
      }
    }
  };

  const vehicleTiers: { id: VehicleClassType; name: string; subtitle: string; tag?: string; pax: string; bags: string; total: number; base: number; fees: number; imageSrc: string; features: string[] }[] = [
    {
      id: 'LUXURY_SUV',
      name: 'Executive Chauffeur SUV',
      subtitle: 'Cadillac Escalade ESV, Lincoln Navigator L, Chevrolet Suburban',
      tag: 'MOST POPULAR',
      pax: '6 passengers',
      bags: '6 bags',
      features: ['Complimentary Wi-Fi', 'Chilled Bottled Water'],
      total: tierQuotes.LUXURY_SUV?.total || 0,
      base: tierQuotes.LUXURY_SUV?.base || 0,
      fees: tierQuotes.LUXURY_SUV?.fees || 0,
      imageSrc: '/assets/fleet/escalade.jpg'
    },
    {
      id: 'FIRST_CLASS',
      name: 'First Class VIP Sedan',
      subtitle: 'Mercedes-Benz S580, BMW 760i xDrive, Mercedes-Maybach',
      tag: 'VIP LUXURY',
      pax: '3 passengers',
      bags: '3 bags',
      features: ['Executive Recline Seating', 'Burmester High-End 4D Audio'],
      total: tierQuotes.FIRST_CLASS?.total || 0,
      base: tierQuotes.FIRST_CLASS?.base || 0,
      fees: tierQuotes.FIRST_CLASS?.fees || 0,
      imageSrc: '/assets/fleet/mercedes_s.jpg'
    },
    {
      id: 'BUSINESS_SEDAN',
      name: 'Executive Business Sedan',
      subtitle: 'Lincoln Continental, Mercedes-Benz E-Class, Cadillac CT6',
      tag: 'BEST VALUE',
      pax: '3 passengers',
      bags: '3 bags',
      features: ['Leather Upholstery', 'Dual-Zone Climate Control'],
      total: tierQuotes.BUSINESS_SEDAN?.total || tierQuotes.BUSINESS_CLASS?.total || 0,
      base: tierQuotes.BUSINESS_SEDAN?.base || tierQuotes.BUSINESS_CLASS?.base || 0,
      fees: tierQuotes.BUSINESS_SEDAN?.fees || tierQuotes.BUSINESS_CLASS?.fees || 0,
      imageSrc: '/assets/fleet/lincoln_sedan.jpg'
    },
    {
      id: 'BUSINESS_VAN',
      name: 'Executive Sprinter Jet Van',
      subtitle: 'Mercedes-Benz Sprinter Executive, Mercedes-Benz V-Class',
      tag: 'GROUP VIP',
      pax: '14 passengers',
      bags: '14 bags',
      features: ['Standing Headroom', 'Individual Captain Leather Seats'],
      total: tierQuotes.BUSINESS_VAN?.total || 0,
      base: tierQuotes.BUSINESS_VAN?.base || 0,
      fees: tierQuotes.BUSINESS_VAN?.fees || 0,
      imageSrc: '/assets/fleet/sprinter.jpg'
    }
  ];

  const selectedVehicle = vehicleTiers.find(v => v.id === state.vehicleClass) || vehicleTiers[0];

  const handleSelectTier = (tier: (typeof vehicleTiers)[0]) => {
    onChange({
      vehicleClass: tier.id,
      baseFare: tier.base,
      feesAndTaxes: tier.fees,
      totalFare: tier.total,
      assignedVendorId: servicingVendor.id,
      assignedVendorName: servicingVendor.name,
      marketCity: servicingVendor.city
    });
  };

  return (
    <div style={{ minHeight: '100vh', background: '#FFFFFF', color: '#111827', display: 'flex', flexDirection: 'column', fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>
      <SharedBookingHeader
        onOpenMyBookings={onOpenMyBookings}
        onOpenSignIn={onOpenSignIn}
        onHomeClick={onEditTrip}
      />

      <div style={{ maxWidth: '1040px', margin: '0 auto', width: '100%', padding: '0 24px', flex: 1 }}>
        <SharedStepper currentStep={1} />

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: '40px', alignItems: 'start', paddingBottom: '60px' }}>
          {/* Left Column: Vehicle Selection & Form Details */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <div>
              <h1 style={{ fontSize: '36px', fontWeight: '800', color: '#000000', letterSpacing: '-0.03em', margin: 0 }}>
                Select your vehicle & chauffeur.
              </h1>
              <p style={{ fontSize: '14px', color: '#64748B', marginTop: '6px' }}>
                All-inclusive binding rate cards dynamically fetched from vetted local operators in {servicingVendor.city || 'your market'}.
              </p>
            </div>

            {/* City Operators Switcher (if multiple vetted vendors exist in this market city) */}
            {cityVendors.length > 1 && (
              <div style={{
                background: '#F8FAFC',
                border: '1.5px solid #E2E8F0',
                borderRadius: '14px',
                padding: '16px',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ fontSize: '13px', fontWeight: '800', color: '#334155', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Car size={16} color="#0078D4" />
                    <span>CHOOSE VETTED OPERATOR IN {servicingVendor.city?.toUpperCase()}:</span>
                  </div>
                  <span style={{ fontSize: '11px', color: '#64748B', fontWeight: '600' }}>
                    {cityVendors.length} Verified Affiliates Live
                  </span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: `repeat(${cityVendors.length}, 1fr)`, gap: '10px' }}>
                  {cityVendors.map((vnd) => {
                    const isVndActive = selectedVendorId === vnd.vendor_id;
                    return (
                      <div
                        key={vnd.vendor_id}
                        onClick={() => handleSelectVendor(vnd)}
                        style={{
                          background: isVndActive ? '#EFF6FF' : '#FFFFFF',
                          border: isVndActive ? '2px solid #0078D4' : '1px solid #CBD5E1',
                          borderRadius: '10px',
                          padding: '12px',
                          cursor: 'pointer',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '4px',
                          transition: 'all 0.15s'
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                          <span style={{ fontSize: '13px', fontWeight: '800', color: isVndActive ? '#0078D4' : '#0F172A' }}>
                            {vnd.company_name}
                          </span>
                          {isVndActive && (
                            <span style={{ background: '#0078D4', color: '#FFFFFF', fontSize: '9px', fontWeight: '800', padding: '2px 6px', borderRadius: '4px' }}>
                              ACTIVE
                            </span>
                          )}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: '#64748B' }}>
                          <span style={{ color: '#D97706', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '2px' }}>
                            <Star size={11} fill="#D97706" /> {vnd.rating_score}
                          </span>
                          <span>•</span>
                          <span>{vnd.fleet_size} Vehicles</span>
                        </div>
                        <div style={{ fontSize: '11px', color: '#059669', fontWeight: '700', marginTop: '2px' }}>
                          Chauffeur: {vnd.primary_chauffeur_name}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Nearest Sovereign Vendor Affiliate Card */}
            <div style={{
              background: '#F0FDF4',
              border: '1.5px solid #86EFAC',
              borderRadius: '14px',
              padding: '16px 20px',
              display: 'flex',
              flexDirection: 'column',
              gap: '8px'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#15803D', fontWeight: '800', fontSize: '13px' }}>
                  <ShieldCheck size={18} color="#16A34A" />
                  <span>ASSIGNED VETTED LOCAL OPERATOR:</span>
                </div>
                <span style={{ background: '#DCFCE7', color: '#166534', padding: '3px 10px', borderRadius: '12px', fontSize: '11px', fontWeight: '700' }}>
                  🟢 ONLINE_HEALTHY
                </span>
              </div>
              
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', flexWrap: 'wrap', gap: '8px' }}>
                <div>
                  <div style={{ fontSize: '18px', fontWeight: '800', color: '#14532D' }}>
                    {servicingVendor.name}
                  </div>
                  <div style={{ fontSize: '12px', color: '#15803D', marginTop: '2px' }}>
                    📍 Market: <strong>{servicingVendor.city}</strong> {servicingVendor.chauffeur && `• Primary Chauffeur: `}<strong>{servicingVendor.chauffeur}</strong> {servicingVendor.plate && `(Plate: ${servicingVendor.plate})`}
                  </div>
                </div>
                <div style={{ fontSize: '12px', fontWeight: '700', color: '#166534' }}>
                  ⚡ Live Dynamic Rates Connected
                </div>
              </div>

              {servicingVendor.amenities && servicingVendor.amenities.length > 0 && (
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '6px', paddingTop: '6px', borderTop: '1px solid #DCFCE7' }}>
                  {servicingVendor.amenities.map((am, idx) => (
                    <span key={idx} style={{ background: '#DCFCE7', color: '#166534', padding: '2px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: '600' }}>
                      ✓ {am}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Vehicle Options List (With Live Dynamic Prices) */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ fontSize: '14px', fontWeight: '700', color: '#334155' }}>
                Available Vehicle Classes & Live Rate Cards ({servicingVendor.name}):
              </div>

              {isLoadingQuotes ? (
                <div style={{ padding: '30px', textAlign: 'center', background: '#F8FAFC', borderRadius: '14px', border: '1px dashed #CBD5E1', color: '#64748B' }}>
                  <div style={{ fontSize: '14px', fontWeight: '700' }}>⚡ Fetching live API rate cards from performing cell...</div>
                </div>
              ) : (
                vehicleTiers.map((tier) => {
                  const isSelected = state.vehicleClass === tier.id;
                  return (
                    <div
                      key={tier.id}
                      onClick={() => handleSelectTier(tier)}
                      style={{
                        background: isSelected ? '#F0F9FF' : '#FFFFFF',
                        border: isSelected ? '2px solid #0078D4' : '1.5px solid #E2E8F0',
                        borderRadius: '14px',
                        padding: '16px 20px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        cursor: 'pointer',
                        boxShadow: isSelected ? '0 4px 16px rgba(0,120,212,0.12)' : '0 1px 3px rgba(0,0,0,0.04)',
                        transition: 'all 0.15s ease-in-out'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '18px' }}>
                        {/* Radio Selection Indicator */}
                        <div style={{
                          width: '20px',
                          height: '20px',
                          borderRadius: '50%',
                          border: isSelected ? '6px solid #0078D4' : '2px solid #CBD5E1',
                          background: '#FFFFFF',
                          flexShrink: 0
                        }} />

                        {/* Vehicle Image Thumbnail */}
                        <div style={{
                          width: '90px',
                          height: '52px',
                          background: '#F8FAFC',
                          borderRadius: '8px',
                          overflow: 'hidden',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0
                        }}>
                          <img
                            src={tier.imageSrc}
                            alt={tier.name}
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                            onError={(e: any) => {
                              e.target.style.display = 'none';
                              e.target.parentElement.innerHTML = tier.id === 'BUSINESS_VAN' ? '🚐' : tier.id === 'FIRST_CLASS' ? '🏎️' : '🚘';
                            }}
                          />
                        </div>

                        {/* Details */}
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ fontSize: '16px', fontWeight: '800', color: '#0F172A' }}>{tier.name}</span>
                            {tier.tag && (
                              <span style={{
                                background: tier.id === 'LUXURY_SUV' ? '#FEF3C7' : tier.id === 'FIRST_CLASS' ? '#EDE9FE' : tier.id === 'BUSINESS_SEDAN' ? '#E0F2FE' : '#F1F5F9',
                                color: tier.id === 'LUXURY_SUV' ? '#92400E' : tier.id === 'FIRST_CLASS' ? '#5B21B6' : tier.id === 'BUSINESS_SEDAN' ? '#0369A1' : '#334155',
                                fontSize: '10px',
                                fontWeight: '800',
                                padding: '2px 6px',
                                borderRadius: '4px'
                              }}>
                                {tier.tag}
                              </span>
                            )}
                            {isSelected && (
                              <span style={{ background: '#0078D4', color: '#FFFFFF', fontSize: '10px', fontWeight: '800', padding: '2px 8px', borderRadius: '4px' }}>
                                SELECTED
                              </span>
                            )}
                          </div>
                          <div style={{ fontSize: '12px', color: '#64748B', marginTop: '2px' }}>
                            {tier.subtitle}
                          </div>
                          <div style={{ fontSize: '12px', color: '#475569', marginTop: '4px', display: 'flex', gap: '14px', flexWrap: 'wrap' }}>
                            <span><Users size={13} style={{ display: 'inline', marginRight: '4px' }} />{tier.pax}</span>
                            <span><Briefcase size={13} style={{ display: 'inline', marginRight: '4px' }} />{tier.bags}</span>
                            {tier.features && tier.features.map((feat, fIdx) => (
                              <span key={fIdx} style={{ color: '#059669', fontWeight: '600' }}>• {feat}</span>
                            ))}
                          </div>
                        </div>
                      </div>

                      {/* Price Badge */}
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '22px', fontWeight: '800', color: isSelected ? '#0078D4' : '#0F172A' }}>
                          ${tier.total.toFixed(2)}
                        </div>
                        <div style={{ fontSize: '11px', color: '#64748B', marginTop: '2px' }}>
                          Base: ${tier.base.toFixed(2)} + Taxes/Tolls
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Flight number (optional) */}
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#374151', marginBottom: '6px' }}>
                Flight number <span style={{ fontWeight: '400', color: '#6B7280' }}>(optional for airport arrival tracking)</span>
              </label>
              <input
                type="text"
                placeholder="e.g. AA123, DL456, BA178"
                value={state.flightNumber || ''}
                onChange={(e) => onChange({ flightNumber: e.target.value })}
                style={{
                  width: '100%',
                  padding: '12px 14px',
                  borderRadius: '10px',
                  border: '1.5px solid #D1D5DB',
                  fontSize: '14px',
                  color: '#111827',
                  outline: 'none',
                  boxSizing: 'border-box'
                }}
              />
            </div>

            {/* Pickup meeting point */}
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#374151', marginBottom: '6px' }}>
                Pickup meeting point
              </label>
              <div style={{ position: 'relative' }}>
                <select
                  value={state.pickupMeetingPoint}
                  onChange={(e) => onChange({ pickupMeetingPoint: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '12px 14px 12px 38px',
                    borderRadius: '10px',
                    border: '1.5px solid #D1D5DB',
                    fontSize: '14px',
                    color: '#111827',
                    background: '#FFFFFF',
                    cursor: 'pointer',
                    appearance: 'none',
                    boxSizing: 'border-box'
                  }}
                >
                  <option value="Airport / Terminal Arrivals (Baggage Claim)">Airport / Terminal Arrivals (Baggage Claim Meet & Greet)</option>
                  <option value="Curbside Express Pickup">Curbside Express Pickup</option>
                  <option value="Hotel Main Lobby / Valet">Hotel Main Lobby / Valet</option>
                  <option value="Private Residence / Street Address">Private Residence / Street Address</option>
                </select>
                <Plane size={16} color="#111827" style={{ position: 'absolute', left: '12px', top: '15px' }} />
                <ChevronDown size={16} color="#6B7280" style={{ position: 'absolute', right: '12px', top: '15px', pointerEvents: 'none' }} />
              </div>
            </div>

            {/* Add a child seat / Special requests Accordion */}
            <div style={{
              background: '#FFFFFF',
              border: '1.5px solid #E5E7EB',
              borderRadius: '10px',
              padding: '14px 16px'
            }}>
              <div
                onClick={() => setShowSpecialRequests(!showSpecialRequests)}
                style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}
              >
                <span style={{ fontSize: '13px', fontWeight: '700', color: '#111827' }}>
                  Add a child seat / Special chauffeur requests
                </span>
                {showSpecialRequests ? <ChevronUp size={16} color="#6B7280" /> : <ChevronDown size={16} color="#6B7280" />}
              </div>

              {showSpecialRequests && (
                <div style={{ marginTop: '12px', paddingTop: '10px', borderTop: '1px solid #F3F4F6' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                    <span style={{ fontSize: '12px', color: '#4B5563' }}>Child Safety Seat ($15.00)</span>
                    <select
                      value={state.childSeatsCount}
                      onChange={(e) => onChange({ childSeatsCount: parseInt(e.target.value, 10) })}
                      style={{ padding: '6px 10px', borderRadius: '6px', border: '1px solid #D1D5DB', fontSize: '12px' }}
                    >
                      <option value={0}>0 Seats</option>
                      <option value={1}>1 Seat</option>
                      <option value={2}>2 Seats</option>
                    </select>
                  </div>
                  <textarea
                    placeholder="Provide name placard or special luggage / accessibility notes..."
                    value={state.specialRequests || ''}
                    onChange={(e) => onChange({ specialRequests: e.target.value })}
                    rows={2}
                    style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #D1D5DB', fontSize: '12px', boxSizing: 'border-box' }}
                  />
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Trip summary Card */}
          <div style={{
            background: '#FFFFFF',
            border: '1.5px solid #E2E8F0',
            borderRadius: '16px',
            padding: '22px',
            position: 'sticky',
            top: '80px',
            boxShadow: '0 4px 20px rgba(0,0,0,0.06)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '15px', fontWeight: '800', color: '#0F172A', margin: 0 }}>Trip summary</h3>
              <span onClick={onEditTrip} style={{ fontSize: '12px', fontWeight: '700', color: '#0078D4', cursor: 'pointer' }}>Edit</span>
            </div>

            {/* Distance & Travel Duration Banner */}
            <div style={{
              background: '#F8FAFC',
              border: '1px solid #E2E8F0',
              borderRadius: '10px',
              padding: '10px 12px',
              marginBottom: '14px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              fontSize: '12px',
              color: '#334155',
              fontWeight: '600'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Navigation size={14} color="#0078D4" />
                <span>{routeInfo.distanceMiles > 0 ? `${routeInfo.distanceMiles} miles` : 'Live Route'}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Clock size={14} color="#64748B" />
                <span>
                  {routeInfo.durationMinutes > 0
                    ? `~${Math.floor(routeInfo.durationMinutes / 60)}h ${routeInfo.durationMinutes % 60}m drive`
                    : 'Calculating route...'}
                </span>
              </div>
            </div>

            {/* Timeline */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', paddingBottom: '16px', borderBottom: '1px solid #F1F5F9', fontSize: '13px' }}>
              {state.serviceType === 'MULTI_CITY' && state.multiCityLegs && state.multiCityLegs.length > 0 ? (
                state.multiCityLegs.map((leg, i) => (
                  <div key={leg.id || i} style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                    <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#0078D4', marginTop: '6px' }} />
                    <div>
                      <div style={{ fontWeight: '700', color: '#0F172A' }}>Leg {i + 1}: {leg.pickup.split(',')[0]} ➔ {leg.dropoff.split(',')[0]}</div>
                      <div style={{ fontSize: '11px', color: '#64748B' }}>📅 {leg.dateStr} at {leg.timeStr}</div>
                    </div>
                  </div>
                ))
              ) : state.serviceType === 'HOURLY' ? (
                <>
                  <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                    <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#0078D4', marginTop: '6px' }} />
                    <div>
                      <div style={{ fontWeight: '700', color: '#0F172A' }}>{state.pickupAddress.split(',')[0] || 'Pickup Location'}</div>
                      <div style={{ fontSize: '11px', color: '#64748B' }}>{state.pickupAddress}</div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                    <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#0078D4', marginTop: '6px' }} />
                    <div>
                      <div style={{ fontWeight: '700', color: '#0078D4' }}>Hourly Service ({state.hourlyDuration || 3} Hours)</div>
                      <div style={{ fontSize: '11px', color: '#64748B' }}>Dedicated chauffeur at your disposal</div>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                    <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#0078D4', marginTop: '5px', flexShrink: 0 }} />
                    <div>
                      <div style={{ fontWeight: '700', color: '#0F172A' }}>{state.pickupAddress.split(',')[0] || 'Pickup Location'}</div>
                      <div style={{ fontSize: '11px', color: '#64748B' }}>{state.pickupAddress}</div>
                    </div>
                  </div>

                  {state.stops && state.stops.map((stop, sIdx) => (
                    <div key={sIdx} style={{ display: 'flex', gap: '10px', alignItems: 'flex-start', paddingLeft: '8px' }}>
                      <div style={{ width: '4px', height: '4px', borderRadius: '50%', background: '#64748B', marginTop: '7px' }} />
                      <div style={{ fontSize: '11px', color: '#475569' }}>Stop {sIdx + 1}: {stop}</div>
                    </div>
                  ))}

                  <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                    <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#E11D48', marginTop: '5px', flexShrink: 0 }} />
                    <div>
                      <div style={{ fontWeight: '700', color: '#0F172A' }}>{state.dropoffAddress.split(',')[0] || 'Destination'}</div>
                      <div style={{ fontSize: '11px', color: '#64748B' }}>{state.dropoffAddress}</div>
                    </div>
                  </div>
                </>
              )}

              <div style={{ fontSize: '12px', color: '#475569', marginTop: '4px' }}>
                📅 {state.dateStr} at {state.timeStr}
              </div>
              <div style={{ fontSize: '12px', color: '#475569' }}>
                👤 {state.passengers} passengers • 🚘 {selectedVehicle.name}
              </div>

              {/* Servicing Affiliate Badge */}
              <div style={{
                background: '#F0FDF4',
                border: '1px solid #BBF7D0',
                borderRadius: '8px',
                padding: '10px 12px',
                marginTop: '8px',
                fontSize: '12px',
                color: '#15803D'
              }}>
                <div style={{ fontWeight: '700', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span>🛡️ Vetted Local Partner:</span>
                </div>
                <div style={{ fontWeight: '800', color: '#166534', marginTop: '2px' }}>
                  {servicingVendor.name}
                </div>
                <div style={{ fontSize: '11px', color: '#15803D', marginTop: '2px' }}>
                  Market: {servicingVendor.city} {servicingVendor.chauffeur && `• Driver: ${servicingVendor.chauffeur}`}
                </div>
              </div>
            </div>

            {/* Price Breakdown */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '13px', borderBottom: '1px solid #F1F5F9', paddingBottom: '14px', marginTop: '14px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#475569' }}>
                <span>Base & Mileage ({selectedVehicle.name})</span>
                <span style={{ fontWeight: '700', color: '#0F172A' }}>${(state.baseFare || selectedVehicle.base).toFixed(2)}</span>
              </div>
              {routeInfo.tolls > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#475569' }}>
                  <span>Highway & Bridge Tolls</span>
                  <span style={{ fontWeight: '700', color: '#0F172A' }}>${routeInfo.tolls.toFixed(2)}</span>
                </div>
              )}
              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#475569' }}>
                <span>Taxes & Surcharges</span>
                <span style={{ fontWeight: '700', color: '#0F172A' }}>${Math.max(0, ((state.feesAndTaxes || selectedVehicle.fees) - (routeInfo.tolls || 0))).toFixed(2)}</span>
              </div>
              {state.childSeatsCount > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#475569' }}>
                  <span>Child Safety Seats ({state.childSeatsCount})</span>
                  <span style={{ fontWeight: '700', color: '#0F172A' }}>${(state.childSeatsCount * 15).toFixed(2)}</span>
                </div>
              )}
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '16px 0' }}>
              <span style={{ fontSize: '13px', fontWeight: '700', color: '#475569' }}>Total (All-Inclusive)</span>
              <span style={{ fontSize: '26px', fontWeight: '800', color: '#0078D4' }}>
                ${((state.totalFare || selectedVehicle.total) + (state.childSeatsCount * 15)).toFixed(2)}
              </span>
            </div>

            <button
              onClick={onContinue}
              disabled={isLoadingQuotes || (state.totalFare || selectedVehicle.total) <= 0}
              style={{
                width: '100%',
                background: (isLoadingQuotes || (state.totalFare || selectedVehicle.total) <= 0) ? '#94A3B8' : '#0078D4',
                color: '#FFFFFF',
                border: 'none',
                borderRadius: '10px',
                padding: '14px',
                fontSize: '15px',
                fontWeight: '700',
                cursor: (isLoadingQuotes || (state.totalFare || selectedVehicle.total) <= 0) ? 'not-allowed' : 'pointer',
                boxShadow: '0 4px 14px rgba(0,120,212,0.3)',
                transition: 'background 0.15s'
              }}
            >
              {isLoadingQuotes ? 'Calculating dynamic fare...' : 'Continue to passenger details ➔'}
            </button>
          </div>
        </div>
      </div>

      <SharedBookingFooter />
    </div>
  );
};
