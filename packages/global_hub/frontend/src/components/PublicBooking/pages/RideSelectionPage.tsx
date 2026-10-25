import React, { useState, useEffect } from 'react';
import { Plane, ChevronDown, ChevronUp, Users, Briefcase, Navigation, Clock, Check } from 'lucide-react';
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
  const [isChangingVehicle, setIsChangingVehicle] = useState(false);
  const [isLoadingQuotes, setIsLoadingQuotes] = useState(true);

  const [routeInfo, setRouteInfo] = useState<{ distanceMiles: number; durationMinutes: number; tolls: number }>({
    distanceMiles: 0,
    durationMinutes: 0,
    tolls: 0
  });

  const [tierQuotes, setTierQuotes] = useState<Record<VehicleClassType, { total: number; base: number; fees: number }>>({
    BUSINESS_CLASS: { total: state.totalFare || 145, base: state.baseFare || 125, fees: state.feesAndTaxes || 20 },
    BUSINESS_SEDAN: { total: state.totalFare || 145, base: state.baseFare || 125, fees: state.feesAndTaxes || 20 },
    FIRST_CLASS: { total: 0, base: 0, fees: 0 },
    LUXURY_SUV: { total: 0, base: 0, fees: 0 },
    BUSINESS_VAN: { total: 0, base: 0, fees: 0 }
  });

  const [servicingVendor, setServicingVendor] = useState<{
    id: string;
    name: string;
    city: string;
    chauffeur: string;
    plate: string;
  }>({
    id: state.assignedVendorId || '',
    name: state.assignedVendorName || 'Executive Chauffeur Network',
    city: state.marketCity || '',
    chauffeur: '',
    plate: ''
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
            pickup: state.pickupAddress || 'Philadelphia International Airport (PHL)',
            dropoff: state.serviceType === 'ONE_WAY' ? (state.dropoffAddress || 'John F. Kennedy International Airport (JFK)') : undefined,
            service_type: state.serviceType || 'ONE_WAY',
            vehicle_class: state.vehicleClass || 'BUSINESS_CLASS',
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
          let activeVendor = vendorsList[0];

          if (activeVendor) {
            setServicingVendor({
              id: activeVendor.vendor_id,
              name: activeVendor.company_name,
              city: activeVendor.market_city,
              chauffeur: activeVendor.primary_chauffeur_name,
              plate: activeVendor.primary_vehicle_plate
            });

            const vRates = activeVendor.rates;
            if (vRates) {
              const newTierQuotes: Record<VehicleClassType, { total: number; base: number; fees: number }> = {
                BUSINESS_CLASS: {
                  total: vRates.BUSINESS_CLASS?.total_fare_usd || vRates.BUSINESS_SEDAN?.total_fare_usd || data.total_fare_usd || 145,
                  base: vRates.BUSINESS_CLASS?.base_fare_usd || vRates.BUSINESS_SEDAN?.base_fare_usd || data.base_fare_usd || 125,
                  fees: vRates.BUSINESS_CLASS?.fees_and_taxes_usd || vRates.BUSINESS_SEDAN?.fees_and_taxes_usd || data.fees_and_taxes_usd || 20
                },
                BUSINESS_SEDAN: {
                  total: vRates.BUSINESS_SEDAN?.total_fare_usd || data.total_fare_usd || 145,
                  base: vRates.BUSINESS_SEDAN?.base_fare_usd || data.base_fare_usd || 125,
                  fees: vRates.BUSINESS_SEDAN?.fees_and_taxes_usd || data.fees_and_taxes_usd || 20
                },
                FIRST_CLASS: {
                  total: vRates.FIRST_CLASS?.total_fare_usd || (data.total_fare_usd * 1.35) || 195,
                  base: vRates.FIRST_CLASS?.base_fare_usd || (data.base_fare_usd * 1.35) || 165,
                  fees: vRates.FIRST_CLASS?.fees_and_taxes_usd || data.fees_and_taxes_usd || 30
                },
                LUXURY_SUV: {
                  total: vRates.LUXURY_SUV?.total_fare_usd || (data.total_fare_usd * 1.25) || 175,
                  base: vRates.LUXURY_SUV?.base_fare_usd || (data.base_fare_usd * 1.25) || 150,
                  fees: vRates.LUXURY_SUV?.fees_and_taxes_usd || data.fees_and_taxes_usd || 25
                },
                BUSINESS_VAN: {
                  total: vRates.BUSINESS_VAN?.total_fare_usd || (data.total_fare_usd * 1.45) || 215,
                  base: vRates.BUSINESS_VAN?.base_fare_usd || (data.base_fare_usd * 1.45) || 180,
                  fees: vRates.BUSINESS_VAN?.fees_and_taxes_usd || data.fees_and_taxes_usd || 35
                }
              };
              setTierQuotes(newTierQuotes);

              const activeCls = state.vehicleClass || 'BUSINESS_CLASS';
              const currentQuote = newTierQuotes[activeCls] || newTierQuotes.BUSINESS_CLASS;
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
        }
      } catch (err) {
        console.error('Failed to load quotes:', err);
      } finally {
        if (isMounted) setIsLoadingQuotes(false);
      }
    };

    fetchTierQuotes();
    return () => { isMounted = false; };
  }, [state.pickupAddress, state.dropoffAddress, state.serviceType, state.hourlyDuration]);

  const vehicleTiers: { id: VehicleClassType; name: string; subtitle: string; pax: string; bags: string; total: number; base: number; fees: number; imageSrc: string }[] = [
    {
      id: 'BUSINESS_CLASS',
      name: 'Business Class',
      subtitle: 'Mercedes-Benz S-Class or similar',
      pax: '2-3 passengers',
      bags: '2 suitcases',
      total: tierQuotes.BUSINESS_CLASS?.total || tierQuotes.BUSINESS_SEDAN?.total || 145,
      base: tierQuotes.BUSINESS_CLASS?.base || tierQuotes.BUSINESS_SEDAN?.base || 125,
      fees: tierQuotes.BUSINESS_CLASS?.fees || tierQuotes.BUSINESS_SEDAN?.fees || 20,
      imageSrc: '/assets/fleet/mercedes_s.jpg'
    },
    {
      id: 'FIRST_CLASS',
      name: 'First Class',
      subtitle: 'Mercedes-Benz S-Class, BMW 7 Series or Maybach',
      pax: '2-3 passengers',
      bags: '2 suitcases',
      total: tierQuotes.FIRST_CLASS?.total || 195,
      base: tierQuotes.FIRST_CLASS?.base || 165,
      fees: tierQuotes.FIRST_CLASS?.fees || 30,
      imageSrc: '/assets/fleet/mercedes_s.jpg'
    },
    {
      id: 'LUXURY_SUV',
      name: 'Executive SUV',
      subtitle: 'Cadillac Escalade, Lincoln Navigator, Yukon Denali',
      pax: '5-6 passengers',
      bags: '5-6 suitcases',
      total: tierQuotes.LUXURY_SUV?.total || 175,
      base: tierQuotes.LUXURY_SUV?.base || 150,
      fees: tierQuotes.LUXURY_SUV?.fees || 25,
      imageSrc: '/assets/fleet/escalade.jpg'
    },
    {
      id: 'BUSINESS_VAN',
      name: 'Business Van',
      subtitle: 'Mercedes-Benz V-Class, Sprinter Executive',
      pax: '5-7 passengers',
      bags: '6 suitcases',
      total: tierQuotes.BUSINESS_VAN?.total || 215,
      base: tierQuotes.BUSINESS_VAN?.base || 180,
      fees: tierQuotes.BUSINESS_VAN?.fees || 35,
      imageSrc: '/assets/fleet/sprinter.jpg'
    }
  ];

  const selectedTier = vehicleTiers.find(v => v.id === state.vehicleClass) || vehicleTiers[0];

  const handleSelectTier = (tier: (typeof vehicleTiers)[0]) => {
    onChange({
      vehicleClass: tier.id,
      baseFare: tier.base,
      feesAndTaxes: tier.fees,
      totalFare: tier.total
    });
    setIsChangingVehicle(false);
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

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: '48px', alignItems: 'start', paddingBottom: '60px' }}>
          {/* Left Column: Make it your ride */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
            <div>
              <h1 style={{ fontSize: '38px', fontWeight: '800', color: '#000000', letterSpacing: '-0.03em', margin: 0 }}>
                Make it your ride.
              </h1>
            </div>

            {/* Selected Vehicle Card (Clean Luxury Design) */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <label style={{ fontSize: '13px', fontWeight: '700', color: '#111827' }}>
                Selected vehicle
              </label>

              <div style={{
                background: '#FFFFFF',
                border: '1.5px solid #E5E7EB',
                borderRadius: '12px',
                padding: '16px 20px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                  {/* Car Thumbnail */}
                  <div style={{
                    width: '110px',
                    height: '64px',
                    background: '#F9FAFB',
                    borderRadius: '8px',
                    overflow: 'hidden',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    <img
                      src={selectedTier.imageSrc}
                      alt={selectedTier.name}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      onError={(e: any) => {
                        e.target.style.display = 'none';
                        e.target.parentElement.innerHTML = '🚘';
                      }}
                    />
                  </div>

                  <div>
                    <div style={{ fontSize: '17px', fontWeight: '800', color: '#111827' }}>
                      {selectedTier.name}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px', fontSize: '13px', color: '#6B7280', marginTop: '4px' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                        <Users size={14} color="#6B7280" /> {selectedTier.pax}
                      </span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                        <Briefcase size={14} color="#6B7280" /> {selectedTier.bags}
                      </span>
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setIsChangingVehicle(!isChangingVehicle)}
                  style={{
                    background: '#FFFFFF',
                    border: '1px solid #D1D5DB',
                    color: '#111827',
                    padding: '8px 16px',
                    borderRadius: '8px',
                    fontSize: '13px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    transition: 'all 0.15s'
                  }}
                >
                  {isChangingVehicle ? 'Close' : 'Change vehicle'}
                </button>
              </div>

              {/* Collapsible Vehicle Class Switcher */}
              {isChangingVehicle && (
                <div style={{
                  background: '#F9FAFB',
                  border: '1.5px solid #E5E7EB',
                  borderRadius: '12px',
                  padding: '12px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '10px',
                  marginTop: '4px'
                }}>
                  {vehicleTiers.map((tier) => {
                    const isSelected = selectedTier.id === tier.id;
                    return (
                      <div
                        key={tier.id}
                        onClick={() => handleSelectTier(tier)}
                        style={{
                          background: isSelected ? '#EFF6FF' : '#FFFFFF',
                          border: isSelected ? '1.5px solid #1D68FE' : '1px solid #E5E7EB',
                          borderRadius: '10px',
                          padding: '12px 16px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          cursor: 'pointer',
                          transition: 'all 0.15s'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                          <div style={{
                            width: '70px',
                            height: '42px',
                            background: '#F3F4F6',
                            borderRadius: '6px',
                            overflow: 'hidden'
                          }}>
                            <img src={tier.imageSrc} alt={tier.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          </div>
                          <div>
                            <div style={{ fontSize: '15px', fontWeight: '700', color: '#111827' }}>
                              {tier.name}
                            </div>
                            <div style={{ fontSize: '12px', color: '#6B7280' }}>
                              {tier.pax} • {tier.bags}
                            </div>
                          </div>
                        </div>

                        <div style={{ fontSize: '16px', fontWeight: '800', color: isSelected ? '#1D68FE' : '#111827' }}>
                          ${tier.total.toFixed(0)}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Flight number (optional) */}
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: '#111827', marginBottom: '6px' }}>
                Flight number <span style={{ fontWeight: '400', color: '#6B7280' }}>(optional)</span>
              </label>
              <input
                type="text"
                placeholder="e.g. AA123"
                value={state.flightNumber || ''}
                onChange={(e) => onChange({ flightNumber: e.target.value })}
                style={{
                  width: '100%',
                  padding: '12px 14px',
                  borderRadius: '8px',
                  border: '1px solid #D1D5DB',
                  fontSize: '14px',
                  color: '#111827',
                  outline: 'none',
                  boxSizing: 'border-box'
                }}
              />
              <div style={{ fontSize: '12px', color: '#6B7280', marginTop: '4px' }}>
                For airport pickup
              </div>
            </div>

            {/* Pickup meeting point */}
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: '#111827', marginBottom: '6px' }}>
                Pickup meeting point
              </label>
              <div style={{ position: 'relative' }}>
                <select
                  value={state.pickupMeetingPoint}
                  onChange={(e) => onChange({ pickupMeetingPoint: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '12px 14px 12px 38px',
                    borderRadius: '8px',
                    border: '1px solid #D1D5DB',
                    fontSize: '14px',
                    color: '#111827',
                    background: '#FFFFFF',
                    cursor: 'pointer',
                    appearance: 'none',
                    boxSizing: 'border-box'
                  }}
                >
                  <option value="Airport / Terminal Arrivals (Baggage Claim)">Airport Arrivals (Baggage Claim)</option>
                  <option value="Curbside Express Pickup">Curbside Express Pickup</option>
                  <option value="Hotel Main Lobby / Valet">Hotel Main Lobby / Valet</option>
                  <option value="VIP FBO Private Jet Terminal">VIP FBO Private Jet Terminal</option>
                </select>
                <Plane size={16} color="#111827" style={{ position: 'absolute', left: '14px', top: '15px' }} />
                <ChevronDown size={16} color="#6B7280" style={{ position: 'absolute', right: '14px', top: '15px', pointerEvents: 'none' }} />
              </div>
            </div>

            {/* Add a child seat / Special requests Accordion */}
            <div style={{
              background: '#FFFFFF',
              border: '1px solid #E5E7EB',
              borderRadius: '8px',
              padding: '14px 16px'
            }}>
              <div
                onClick={() => setShowSpecialRequests(!showSpecialRequests)}
                style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}
              >
                <span style={{ fontSize: '13px', fontWeight: '600', color: '#111827' }}>
                  Add a child seat / Special requests
                </span>
                {showSpecialRequests ? <ChevronUp size={16} color="#6B7280" /> : <ChevronDown size={16} color="#6B7280" />}
              </div>

              {showSpecialRequests && (
                <div style={{ marginTop: '12px', paddingTop: '10px', borderTop: '1px solid #F3F4F6' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                    <span style={{ fontSize: '13px', color: '#4B5563' }}>Child Safety Seat</span>
                    <select
                      value={state.childSeatsCount}
                      onChange={(e) => onChange({ childSeatsCount: parseInt(e.target.value, 10) })}
                      style={{ padding: '6px 12px', borderRadius: '6px', border: '1px solid #D1D5DB', fontSize: '13px' }}
                    >
                      <option value={0}>0</option>
                      <option value={1}>1</option>
                      <option value={2}>2</option>
                    </select>
                  </div>
                  <textarea
                    placeholder="Provide name placard or accessibility requests..."
                    value={state.specialRequests || ''}
                    onChange={(e) => onChange({ specialRequests: e.target.value })}
                    rows={2}
                    style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #D1D5DB', fontSize: '13px', boxSizing: 'border-box' }}
                  />
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Trip summary Card */}
          <div style={{
            background: '#FFFFFF',
            border: '1px solid #E5E7EB',
            borderRadius: '16px',
            padding: '24px',
            position: 'sticky',
            top: '80px',
            boxShadow: '0 4px 20px rgba(0,0,0,0.03)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '16px', fontWeight: '800', color: '#111827', margin: 0 }}>Trip summary</h3>
              <span onClick={onEditTrip} style={{ fontSize: '13px', fontWeight: '600', color: '#1D68FE', cursor: 'pointer' }}>Edit</span>
            </div>

            {/* Distance & Travel Duration Banner */}
            {routeInfo.distanceMiles > 0 && (
              <div style={{
                background: '#F9FAFB',
                borderRadius: '8px',
                padding: '8px 12px',
                marginBottom: '16px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                fontSize: '12px',
                color: '#4B5563',
                fontWeight: '600'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <Navigation size={13} color="#1D68FE" />
                  <span>{routeInfo.distanceMiles} miles</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <Clock size={13} color="#6B7280" />
                  <span>~{Math.floor(routeInfo.durationMinutes / 60)}h {routeInfo.durationMinutes % 60}m drive</span>
                </div>
              </div>
            )}

            {/* Timeline */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', paddingBottom: '16px', borderBottom: '1px solid #F3F4F6', fontSize: '13px' }}>
              <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#1D68FE', marginTop: '5px', flexShrink: 0 }} />
                <div>
                  <div style={{ fontWeight: '700', color: '#111827' }}>{state.pickupAddress.split(',')[0] || 'JFK Airport'}</div>
                  <div style={{ fontSize: '12px', color: '#6B7280' }}>{state.pickupAddress || 'New York, NY'}</div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#111827', marginTop: '5px', flexShrink: 0 }} />
                <div>
                  <div style={{ fontWeight: '700', color: '#111827' }}>{state.dropoffAddress.split(',')[0] || 'Manhattan'}</div>
                  <div style={{ fontSize: '12px', color: '#6B7280' }}>{state.dropoffAddress || 'New York, NY'}</div>
                </div>
              </div>
            </div>

            {/* Date & Passengers Info */}
            <div style={{ padding: '14px 0', borderBottom: '1px solid #F3F4F6', display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '13px', color: '#4B5563' }}>
              <div>📅 {state.dateStr} at {state.timeStr}</div>
              <div>👤 {state.passengers} passengers • 🚘 {selectedTier.name}</div>
            </div>

            {/* Total Fare */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', margin: '20px 0' }}>
              <span style={{ fontSize: '14px', fontWeight: '600', color: '#4B5563' }}>Total</span>
              <span style={{ fontSize: '28px', fontWeight: '800', color: '#111827' }}>
                ${(state.totalFare || selectedTier.total).toFixed(0)}
              </span>
            </div>

            {/* Primary Action Button */}
            <button
              type="button"
              onClick={onContinue}
              style={{
                width: '100%',
                background: '#1D68FE',
                color: '#FFFFFF',
                border: 'none',
                padding: '14px',
                borderRadius: '8px',
                fontSize: '15px',
                fontWeight: '700',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                transition: 'background 0.15s'
              }}
              onMouseOver={(e: any) => e.target.style.background = '#1557E0'}
              onMouseOut={(e: any) => e.target.style.background = '#1D68FE'}
            >
              Continue
            </button>
          </div>
        </div>
      </div>

      <SharedBookingFooter />
    </div>
  );
};
