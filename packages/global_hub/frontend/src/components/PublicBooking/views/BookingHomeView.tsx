import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, 
  Clock, 
  CheckCircle2, 
  Users, 
  Briefcase, 
  Plus, 
  Calendar, 
  MapPin, 
  ArrowRight, 
  Plane, 
  Sparkles, 
  Navigation,
  Trash2,
  X
} from 'lucide-react';
import { BookingState, ServiceType, ItineraryLeg } from '../types';

export interface GooglePlacesPrediction {
  name: string;
  sub: string;
  type: string;
}

export interface GooglePlacesInputProps {
  label?: string;
  value: string;
  placeholder: string;
  onChange: (val: string) => void;
  icon?: 'pickup' | 'dropoff' | 'stop';
  compact?: boolean;
  hasError?: boolean;
  errorMessage?: string;
  onRemove?: () => void;
}

export const GooglePlacesInput: React.FC<GooglePlacesInputProps> = ({ 
  label, 
  value, 
  placeholder, 
  onChange, 
  icon = 'pickup', 
  compact = false,
  hasError = false,
  errorMessage,
  onRemove 
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState(value || '');
  const [liveResults, setLiveResults] = useState<GooglePlacesPrediction[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    setQuery(value || '');
  }, [value]);

  useEffect(() => {
    if (!query || query.trim().length === 0) {
      setLiveResults([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/v1/global-hub/places/autocomplete?q=${encodeURIComponent(query.trim())}`);
        if (res.ok) {
          const data = await res.json();
          if (data.predictions && Array.isArray(data.predictions)) {
            setLiveResults(
              data.predictions.map((p: any) => ({
                name: p.main_text || (p.description ? p.description.split(',')[0] : query),
                sub: p.secondary_text || p.description || '',
                type: p.category || 'ADDRESS'
              }))
            );
          }
        }
      } catch (e) {
        console.warn('Google Places live autocomplete query notice:', e);
      } finally {
        setIsLoading(false);
      }
    }, 150);

    return () => clearTimeout(timer);
  }, [query]);

  const displayList = liveResults;

  const handleSelectPrediction = (item: GooglePlacesPrediction) => {
    const valToSet = item.sub && item.sub !== item.name ? `${item.name}, ${item.sub}` : item.name;
    setQuery(valToSet);
    onChange(valToSet);
    setIsOpen(false);
  };

  return (
    <div style={{ position: 'relative', width: '100%' }}>
      {label && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
          <label style={{ fontSize: compact ? '11px' : '12px', fontWeight: '700', color: hasError ? '#DC2626' : '#334155' }}>
            {label} {hasError && <span style={{ color: '#DC2626' }}>*</span>}
          </label>
          {onRemove && (
            <button
              type="button"
              onClick={onRemove}
              style={{
                background: 'none',
                border: 'none',
                color: '#EF4444',
                fontSize: '12px',
                fontWeight: '600',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                padding: '0 2px'
              }}
            >
              <Trash2 size={13} /> Remove
            </button>
          )}
        </div>
      )}
      <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
        {icon === 'pickup' ? (
          <Navigation size={compact ? 15 : 18} color="#0078D4" style={{ position: 'absolute', left: '14px', zIndex: 2 }} />
        ) : icon === 'dropoff' ? (
          <MapPin size={compact ? 15 : 18} color="#E11D48" style={{ position: 'absolute', left: '14px', zIndex: 2 }} />
        ) : (
          <MapPin size={compact ? 15 : 18} color="#D97706" style={{ position: 'absolute', left: '14px', zIndex: 2 }} />
        )}
        <input
          type="text"
          placeholder={placeholder}
          value={query}
          onFocus={() => setIsOpen(true)}
          onChange={(e) => {
            setQuery(e.target.value);
            onChange(e.target.value);
            setIsOpen(true);
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              if (displayList.length > 0) {
                handleSelectPrediction(displayList[0]);
              } else if (query.trim()) {
                onChange(query.trim());
                setIsOpen(false);
              }
            } else if (e.key === 'Escape') {
              setIsOpen(false);
            }
          }}
          style={{
            width: '100%',
            padding: compact ? '10px 32px 10px 38px' : '12px 38px 12px 42px',
            borderRadius: compact ? '8px' : '12px',
            border: hasError ? '2px solid #EF4444' : '1.5px solid #E2E8F0',
            fontSize: compact ? '13px' : '14px',
            color: '#0F172A',
            outline: 'none',
            fontWeight: '600',
            boxSizing: 'border-box',
            transition: 'all 0.2s',
            background: hasError ? '#FEF2F2' : '#FFFFFF',
            boxShadow: hasError ? '0 0 0 3px rgba(239, 68, 68, 0.15)' : 'none'
          }}
        />
        {query && (
          <button
            type="button"
            onClick={() => {
              setQuery('');
              onChange('');
            }}
            style={{
              position: 'absolute',
              right: '12px',
              background: 'none',
              border: 'none',
              color: '#94A3B8',
              cursor: 'pointer',
              padding: '4px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <X size={14} />
          </button>
        )}
      </div>

      {hasError && errorMessage && (
        <div style={{ fontSize: '12px', color: '#DC2626', fontWeight: '700', marginTop: '5px', display: 'flex', alignItems: 'center', gap: '4px' }}>
          <span>⚠️</span> {errorMessage}
        </div>
      )}

      {isOpen && (
        <>
          <div
            onMouseDown={() => setIsOpen(false)}
            style={{ position: 'fixed', inset: 0, zIndex: 90 }}
          />
          <div style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            right: 0,
            marginTop: '6px',
            background: '#FFFFFF',
            borderRadius: '12px',
            border: '1px solid #E2E8F0',
            boxShadow: '0 16px 36px rgba(0,0,0,0.14)',
            zIndex: 100,
            maxHeight: '260px',
            overflowY: 'auto'
          }}>
            <div style={{ padding: '8px 14px', fontSize: '11px', fontWeight: '700', color: '#64748B', borderBottom: '1px solid #F1F5F9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>GOOGLE PLACES SEARCH</span>
              <span style={{ color: '#4285F4', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span style={{ fontWeight: '800' }}>Google</span> Places API
              </span>
            </div>

            {isLoading && (
              <div style={{ padding: '14px', fontSize: '13px', color: '#64748B', textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                <span className="spinner-border" style={{ display: 'inline-block', width: '14px', height: '14px', border: '2px solid #0078D4', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.6s linear infinite' }} />
                Searching Google Places in real-time...
              </div>
            )}

            {!isLoading && query.trim().length === 0 && (
              <div style={{ padding: '14px 16px', fontSize: '12px', color: '#64748B', fontStyle: 'italic' }}>
                🔍 Type any airport, hotel, train station, landmark, or street address worldwide...
              </div>
            )}

            {!isLoading && displayList.map((item, idx) => (
              <div
                key={idx}
                onMouseDown={(e) => {
                  e.preventDefault();
                  handleSelectPrediction(item);
                }}
                style={{
                  padding: '10px 14px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  cursor: 'pointer',
                  borderBottom: idx < displayList.length - 1 ? '1px solid #F8FAFC' : 'none',
                  transition: 'background 0.15s'
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = '#F0F9FF')}
                onMouseLeave={(e) => (e.currentTarget.style.background = '#FFFFFF')}
              >
                <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: '#F1F5F9', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', flexShrink: 0 }}>
                  {item.type === 'AIRPORT' ? '✈️' : item.type === 'HOTEL' ? '🏨' : item.type === 'STATION' || item.type === 'TRAIN_STATION' ? '🚆' : item.type === 'LANDMARK' ? '🏛️' : '📍'}
                </div>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: '13px', fontWeight: '700', color: '#0F172A', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.name}</div>
                  <div style={{ fontSize: '11px', color: '#64748B', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.sub}</div>
                </div>
              </div>
            ))}

            {!isLoading && displayList.length === 0 && query.trim().length > 0 && (
              <div
                onMouseDown={(e) => {
                  e.preventDefault();
                  setQuery(query.trim());
                  onChange(query.trim());
                  setIsOpen(false);
                }}
                style={{
                  padding: '12px 14px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  cursor: 'pointer',
                  background: '#F8FAFC'
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = '#F0F9FF')}
                onMouseLeave={(e) => (e.currentTarget.style.background = '#F8FAFC')}
              >
                <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: '#E0F2FE', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px' }}>
                  📍
                </div>
                <div>
                  <div style={{ fontSize: '13px', fontWeight: '700', color: '#0078D4' }}>Use "{query.trim()}"</div>
                  <div style={{ fontSize: '11px', color: '#64748B' }}>Search live location coordinate</div>
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};

interface BookingHomeViewProps {
  state: BookingState;
  onChange: (updates: Partial<BookingState>) => void;
  onProceed: () => void;
}

export const BookingHomeView: React.FC<BookingHomeViewProps> = ({ state, onChange, onProceed }) => {
  const [stops, setStops] = useState<string[]>(state.stops || []);
  const [multiLegs, setMultiLegs] = useState<ItineraryLeg[]>(
    state.multiCityLegs && state.multiCityLegs.length > 0
      ? state.multiCityLegs
      : [
          { id: 'leg_1', pickup: 'JFK Airport, New York, NY', dropoff: 'Manhattan, New York, NY', dateStr: 'Oct 15, 2026', timeStr: '10:00 AM' },
          { id: 'leg_2', pickup: 'London Heathrow Airport (LHR)', dropoff: 'The Mayfair Townhouse, London', dateStr: 'Oct 17, 2026', timeStr: '02:30 PM' }
        ]
  );
  const [isSearching, setIsSearching] = useState(false);
  const [errors, setErrors] = useState<{ pickup?: string; dropoff?: string }>({});

  const handleAddStop = () => {
    setStops((prev) => [...prev, '']);
  };

  const handleRemoveStop = (idx: number) => {
    const updated = stops.filter((_, i) => i !== idx);
    setStops(updated);
    onChange({ stops: updated });
  };

  const handleStopChange = (idx: number, val: string) => {
    const updated = [...stops];
    updated[idx] = val;
    setStops(updated);
    onChange({ stops: updated });
  };

  const handleAddLeg = () => {
    const newLeg: ItineraryLeg = {
      id: `leg_${multiLegs.length + 1}`,
      pickup: 'Dubai International Airport (DXB)',
      dropoff: 'Burj Al Arab, Jumeirah, Dubai',
      dateStr: 'Oct 18, 2026',
      timeStr: '12:00 PM'
    };
    const updated = [...multiLegs, newLeg];
    setMultiLegs(updated);
    onChange({ multiCityLegs: updated });
  };

  const handleRemoveLeg = (idx: number) => {
    if (multiLegs.length <= 1) return;
    const updated = multiLegs.filter((_, i) => i !== idx);
    setMultiLegs(updated);
    onChange({ multiCityLegs: updated });
  };

  const handleLegChange = (idx: number, field: keyof ItineraryLeg, val: string) => {
    const updated = [...multiLegs];
    updated[idx] = { ...updated[idx], [field]: val };
    setMultiLegs(updated);
    onChange({ multiCityLegs: updated });
  };

  const handleSearchSubmit = async () => {
    // Validate required fields
    const newErrors: { pickup?: string; dropoff?: string } = {};
    if (!state.pickupAddress || !state.pickupAddress.trim()) {
      newErrors.pickup = 'Please enter or select a pickup location';
    }
    if (state.serviceType === 'ONE_WAY' && (!state.dropoffAddress || !state.dropoffAddress.trim())) {
      newErrors.dropoff = 'Please enter or select a drop-off location';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }
    setErrors({});
    setIsSearching(true);

    try {
      const filteredStops = stops.filter(s => s && s.trim().length > 0);
      const payload = {
        pickup: state.pickupAddress || 'JFK Airport, New York, NY',
        dropoff: state.serviceType === 'ONE_WAY' ? (state.dropoffAddress || 'Manhattan, New York, NY') : undefined,
        service_type: state.serviceType,
        vehicle_class: state.vehicleClass || 'BUSINESS_CLASS',
        hourly_duration: state.hourlyDuration || 3,
        stops_count: filteredStops.length,
        multi_city_legs: state.serviceType === 'MULTI_CITY'
          ? multiLegs.map((l) => ({
              pickup: l.pickup,
              dropoff: l.dropoff,
              date_str: l.dateStr,
              time_str: l.timeStr
            }))
          : undefined
      };

      const res = await fetch('/api/v1/global-hub/quotes/calculate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        const quoteData = await res.json();
        onChange({
          baseFare: quoteData.base_fare_usd || 115,
          feesAndTaxes: quoteData.fees_and_taxes_usd || 17.25,
          totalFare: quoteData.total_fare_usd || 132.25,
          assignedVendorId: quoteData.servicing_vendor_id || 'vnd_anb_philly',
          assignedVendorName: quoteData.servicing_vendor_name || 'ANB Trans Inc Executive Chauffeurs',
          marketCity: quoteData.market_city || 'Philadelphia',
          stops: filteredStops,
          multiCityLegs: state.serviceType === 'MULTI_CITY' ? multiLegs : undefined
        });
      }
    } catch (e) {
      console.warn('Quote calculation notice:', e);
    } finally {
      setIsSearching(false);
      onProceed();
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '36px', maxWidth: '1080px', margin: '0 auto', fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>
      {/* Hero Title */}
      <div style={{ textAlign: 'center', paddingTop: '16px', paddingBottom: '8px' }}>
        <h1 style={{ fontSize: '42px', fontWeight: '800', color: '#0F172A', letterSpacing: '-0.03em', lineHeight: 1.15, margin: 0 }}>
          Your next ride, simplified.
        </h1>
        <p style={{ fontSize: '18px', color: '#64748B', marginTop: '10px', fontWeight: '500' }}>
          Airport transfers. Hourly rides. Every stop in between.
        </p>
      </div>

      {/* Main Search Booking Card */}
      <div className="glass-card" style={{ padding: '24px', background: '#FFFFFF', boxShadow: '0 8px 30px rgba(0,0,0,0.06)', borderRadius: '20px', border: '1px solid #E2E8F0' }}>
        {/* Service Type Tabs: One way / Hourly / Multi-city */}
        <div style={{ display: 'flex', gap: '28px', borderBottom: '1.5px solid #F1F5F9', paddingBottom: '14px', marginBottom: '20px' }}>
          {(['ONE_WAY', 'HOURLY', 'MULTI_CITY'] as ServiceType[]).map((type) => {
            const label = type === 'ONE_WAY' ? 'One way' : type === 'HOURLY' ? 'Hourly' : 'Multi-city';
            const isActive = state.serviceType === type;
            return (
              <button
                key={type}
                onClick={() => {
                  setErrors({});
                  onChange({ serviceType: type });
                }}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '15px',
                  fontWeight: isActive ? '700' : '600',
                  color: isActive ? '#0078D4' : '#64748B',
                  cursor: 'pointer',
                  position: 'relative',
                  paddingBottom: '8px'
                }}
              >
                {label}
                {isActive && (
                  <div style={{ position: 'absolute', bottom: '-15px', left: 0, right: 0, height: '3px', background: '#0078D4', borderRadius: '3px' }} />
                )}
              </button>
            );
          })}
        </div>

        {/* 1. ONE-WAY INPUTS */}
        {state.serviceType === 'ONE_WAY' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
              {/* Pickup */}
              <GooglePlacesInput
                label="Pickup location"
                placeholder="Airport, hotel or address"
                value={state.pickupAddress}
                onChange={(val) => {
                  if (errors.pickup) setErrors(prev => ({ ...prev, pickup: undefined }));
                  onChange({ pickupAddress: val });
                }}
                icon="pickup"
                hasError={!!errors.pickup}
                errorMessage={errors.pickup}
              />

              {/* Drop-off */}
              <GooglePlacesInput
                label="Drop-off location"
                placeholder="Airport, hotel or address"
                value={state.dropoffAddress}
                onChange={(val) => {
                  if (errors.dropoff) setErrors(prev => ({ ...prev, dropoff: undefined }));
                  onChange({ dropoffAddress: val });
                }}
                icon="dropoff"
                hasError={!!errors.dropoff}
                errorMessage={errors.dropoff}
              />
            </div>



            {/* Dynamic Intermediate Stops */}
            {stops.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {stops.map((stop, idx) => (
                  <GooglePlacesInput
                    key={idx}
                    label={`Stop ${idx + 1}`}
                    placeholder={`Stop ${idx + 1} airport, hotel or landmark`}
                    value={stop}
                    onChange={(val) => handleStopChange(idx, val)}
                    icon="stop"
                    onRemove={() => handleRemoveStop(idx)}
                  />
                ))}
              </div>
            )}

            {/* Date, Time, Passengers */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#334155', marginBottom: '6px' }}>
                  Date
                </label>
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                  <Calendar size={18} color="#64748B" style={{ position: 'absolute', left: '14px' }} />
                  <input
                    type="text"
                    value={state.dateStr}
                    onChange={(e) => onChange({ dateStr: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '12px 14px 12px 42px',
                      borderRadius: '12px',
                      border: '1.5px solid #E2E8F0',
                      fontSize: '14px',
                      color: '#0F172A',
                      fontWeight: '600',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#334155', marginBottom: '6px' }}>
                  Time
                </label>
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                  <Clock size={18} color="#64748B" style={{ position: 'absolute', left: '14px' }} />
                  <input
                    type="text"
                    value={state.timeStr}
                    onChange={(e) => onChange({ timeStr: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '12px 14px 12px 42px',
                      borderRadius: '12px',
                      border: '1.5px solid #E2E8F0',
                      fontSize: '14px',
                      color: '#0F172A',
                      fontWeight: '600',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#334155', marginBottom: '6px' }}>
                  Passengers
                </label>
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                  <Users size={18} color="#64748B" style={{ position: 'absolute', left: '14px' }} />
                  <select
                    value={state.passengers}
                    onChange={(e) => onChange({ passengers: parseInt(e.target.value, 10) })}
                    style={{
                      width: '100%',
                      padding: '12px 14px 12px 42px',
                      borderRadius: '12px',
                      border: '1.5px solid #E2E8F0',
                      fontSize: '14px',
                      color: '#0F172A',
                      fontWeight: '600',
                      background: '#FFFFFF',
                      cursor: 'pointer',
                      boxSizing: 'border-box'
                    }}
                  >
                    <option value={1}>1 passenger</option>
                    <option value={2}>2 passengers</option>
                    <option value={3}>3 passengers</option>
                    <option value={4}>4 passengers</option>
                    <option value={6}>6 passengers (Van)</option>
                  </select>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 2. HOURLY INPUTS */}
        {state.serviceType === 'HOURLY' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
              {/* Pickup */}
              <GooglePlacesInput
                label="Pickup location"
                placeholder="Hotel, office, or airport address"
                value={state.pickupAddress}
                onChange={(val) => {
                  if (errors.pickup) setErrors(prev => ({ ...prev, pickup: undefined }));
                  onChange({ pickupAddress: val });
                }}
                icon="pickup"
                hasError={!!errors.pickup}
                errorMessage={errors.pickup}
              />

              {/* Duration (Hours) */}
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#334155', marginBottom: '6px' }}>
                  Duration (hours)
                </label>
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                  <Clock size={18} color="#0078D4" style={{ position: 'absolute', left: '14px' }} />
                  <select
                    value={state.hourlyDuration || 3}
                    onChange={(e) => onChange({ hourlyDuration: parseInt(e.target.value, 10) })}
                    style={{
                      width: '100%',
                      padding: '12px 14px 12px 42px',
                      borderRadius: '12px',
                      border: '1.5px solid #E2E8F0',
                      fontSize: '14px',
                      color: '#0F172A',
                      fontWeight: '700',
                      background: '#FFFFFF',
                      cursor: 'pointer',
                      boxSizing: 'border-box'
                    }}
                  >
                    <option value={2}>2 hours (Minimum)</option>
                    <option value={3}>3 hours</option>
                    <option value={4}>4 hours (Half Day)</option>
                    <option value={5}>5 hours</option>
                    <option value={6}>6 hours</option>
                    <option value={8}>8 hours (Full Day)</option>
                    <option value={10}>10 hours</option>
                    <option value={12}>12 hours (Executive Day)</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Dynamic Intermediate Stops for Hourly */}
            {stops.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {stops.map((stop, idx) => (
                  <GooglePlacesInput
                    key={idx}
                    label={`Stop ${idx + 1}`}
                    placeholder={`Stop ${idx + 1} airport, hotel or landmark`}
                    value={stop}
                    onChange={(val) => handleStopChange(idx, val)}
                    icon="stop"
                    onRemove={() => handleRemoveStop(idx)}
                  />
                ))}
              </div>
            )}

            {/* Date, Time, Passengers */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#334155', marginBottom: '6px' }}>
                  Date
                </label>
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                  <Calendar size={18} color="#64748B" style={{ position: 'absolute', left: '14px' }} />
                  <input
                    type="text"
                    value={state.dateStr}
                    onChange={(e) => onChange({ dateStr: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '12px 14px 12px 42px',
                      borderRadius: '12px',
                      border: '1.5px solid #E2E8F0',
                      fontSize: '14px',
                      color: '#0F172A',
                      fontWeight: '600',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#334155', marginBottom: '6px' }}>
                  Start time
                </label>
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                  <Clock size={18} color="#64748B" style={{ position: 'absolute', left: '14px' }} />
                  <input
                    type="text"
                    value={state.timeStr}
                    onChange={(e) => onChange({ timeStr: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '12px 14px 12px 42px',
                      borderRadius: '12px',
                      border: '1.5px solid #E2E8F0',
                      fontSize: '14px',
                      color: '#0F172A',
                      fontWeight: '600',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#334155', marginBottom: '6px' }}>
                  Passengers
                </label>
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                  <Users size={18} color="#64748B" style={{ position: 'absolute', left: '14px' }} />
                  <select
                    value={state.passengers}
                    onChange={(e) => onChange({ passengers: parseInt(e.target.value, 10) })}
                    style={{
                      width: '100%',
                      padding: '12px 14px 12px 42px',
                      borderRadius: '12px',
                      border: '1.5px solid #E2E8F0',
                      fontSize: '14px',
                      color: '#0F172A',
                      fontWeight: '600',
                      background: '#FFFFFF',
                      cursor: 'pointer',
                      boxSizing: 'border-box'
                    }}
                  >
                    <option value={1}>1 passenger</option>
                    <option value={2}>2 passengers</option>
                    <option value={3}>3 passengers</option>
                    <option value={4}>4 passengers</option>
                    <option value={6}>6 passengers (Van)</option>
                  </select>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 3. MULTI-CITY INPUTS */}
        {state.serviceType === 'MULTI_CITY' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ fontSize: '13px', color: '#0078D4', fontWeight: '700' }}>
              Multi-City Itinerary Legs ({multiLegs.length} legs configured)
            </div>

            {multiLegs.map((leg, idx) => (
              <div
                key={leg.id}
                style={{
                  background: '#F8FAFC',
                  border: '1px solid #E2E8F0',
                  borderRadius: '14px',
                  padding: '16px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px',
                  position: 'relative'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '12px', fontWeight: '800', color: '#0F172A', background: '#E2E8F0', padding: '2px 8px', borderRadius: '4px' }}>
                    Leg {idx + 1}
                  </span>
                  {multiLegs.length > 1 && (
                    <button
                      onClick={() => handleRemoveLeg(idx)}
                      style={{ background: 'none', border: 'none', color: '#EF4444', cursor: 'pointer', fontSize: '12px', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '2px' }}
                    >
                      <X size={14} /> Remove leg
                    </button>
                  )}
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <GooglePlacesInput
                    label=""
                    placeholder="Pickup location (Airport, Hotel, City)"
                    value={leg.pickup}
                    onChange={(val) => handleLegChange(idx, 'pickup', val)}
                    icon="pickup"
                    compact
                  />
                  <GooglePlacesInput
                    label=""
                    placeholder="Drop-off location"
                    value={leg.dropoff}
                    onChange={(val) => handleLegChange(idx, 'dropoff', val)}
                    icon="dropoff"
                    compact
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <input
                    type="text"
                    placeholder="Date (e.g. Oct 14, 2026)"
                    value={leg.dateStr}
                    onChange={(e) => handleLegChange(idx, 'dateStr', e.target.value)}
                    style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '13px', boxSizing: 'border-box' }}
                  />
                  <input
                    type="text"
                    placeholder="Time (e.g. 10:00 AM)"
                    value={leg.timeStr}
                    onChange={(e) => handleLegChange(idx, 'timeStr', e.target.value)}
                    style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '13px', boxSizing: 'border-box' }}
                  />
                </div>
              </div>
            ))}

            {multiLegs.length < 5 && (
              <button
                onClick={handleAddLeg}
                style={{
                  background: '#F0F9FF',
                  border: '1.5px dashed #0078D4',
                  borderRadius: '12px',
                  padding: '12px',
                  color: '#0078D4',
                  fontWeight: '700',
                  fontSize: '13px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px'
                }}
              >
                <Plus size={16} /> Add another city leg
              </button>
            )}
          </div>
        )}

        {/* Footer actions inside search card */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '22px', flexWrap: 'wrap', gap: '12px' }}>
          {state.serviceType !== 'MULTI_CITY' ? (
            <button
              onClick={handleAddStop}
              style={{
                background: 'none',
                border: 'none',
                color: '#0078D4',
                fontSize: '14px',
                fontWeight: '700',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                cursor: 'pointer'
              }}
            >
              <div style={{ width: '22px', height: '22px', borderRadius: '50%', background: '#E0F2FE', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Plus size={14} color="#0078D4" />
              </div>
              Add stop
            </button>
          ) : <div />}

          <button
            disabled={isSearching}
            onClick={handleSearchSubmit}
            style={{
              background: '#0078D4',
              color: '#FFFFFF',
              border: 'none',
              borderRadius: '12px',
              padding: '14px 38px',
              fontSize: '16px',
              fontWeight: '700',
              cursor: isSearching ? 'wait' : 'pointer',
              boxShadow: '0 4px 14px rgba(0,120,212,0.3)',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            {isSearching ? 'Searching...' : 'Find a ride'}
            <ArrowRight size={18} />
          </button>
        </div>
      </div>

      {/* Value Badges */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px', textAlign: 'center', padding: '10px 0' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}>
          <ShieldCheck size={26} color="#0078D4" />
          <span style={{ fontSize: '15px', fontWeight: '700', color: '#1E293B' }}>Professional chauffeurs</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}>
          <CheckCircle2 size={26} color="#0078D4" />
          <span style={{ fontSize: '15px', fontWeight: '700', color: '#1E293B' }}>Clear pricing</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}>
          <Calendar size={26} color="#0078D4" />
          <span style={{ fontSize: '15px', fontWeight: '700', color: '#1E293B' }}>Easy booking</span>
        </div>
      </div>

      {/* A ride for every plan */}
      <div>
        <h2 style={{ fontSize: '24px', fontWeight: '800', color: '#0F172A', marginBottom: '18px' }}>
          A ride for every plan.
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
          <div className="glass-card" style={{ padding: '20px', background: '#FFFFFF', borderRadius: '16px', border: '1px solid #E2E8F0' }}>
            <div style={{ height: '140px', background: 'linear-gradient(135deg, #1E293B 0%, #0F172A 100%)', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#FFFFFF', position: 'relative', overflow: 'hidden' }}>
              <Plane size={48} color="#38BDF8" style={{ opacity: 0.85 }} />
              <div style={{ position: 'absolute', bottom: '10px', left: '14px', fontSize: '12px', fontWeight: '700', color: '#BAE6FD' }}>Flight Radar Connected</div>
            </div>
            <h3 style={{ fontSize: '17px', fontWeight: '700', color: '#0F172A', marginTop: '14px' }}>Airport transfers</h3>
            <p style={{ fontSize: '13px', color: '#64748B', marginTop: '4px' }}>Flight tracking & 60 mins complimentary wait time.</p>
          </div>

          <div className="glass-card" style={{ padding: '20px', background: '#FFFFFF', borderRadius: '16px', border: '1px solid #E2E8F0' }}>
            <div style={{ height: '140px', background: 'linear-gradient(135deg, #0F172A 0%, #1E1B4B 100%)', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#FFFFFF', position: 'relative', overflow: 'hidden' }}>
              <Clock size={48} color="#A855F7" style={{ opacity: 0.85 }} />
              <div style={{ position: 'absolute', bottom: '10px', left: '14px', fontSize: '12px', fontWeight: '700', color: '#DDD6FE' }}>Flexible Itinerary</div>
            </div>
            <h3 style={{ fontSize: '17px', fontWeight: '700', color: '#0F172A', marginTop: '14px' }}>By the hour</h3>
            <p style={{ fontSize: '13px', color: '#64748B', marginTop: '4px' }}>Dedicated chauffeur at your disposal for meetings or events.</p>
          </div>

          <div className="glass-card" style={{ padding: '20px', background: '#FFFFFF', borderRadius: '16px', border: '1px solid #E2E8F0' }}>
            <div style={{ height: '140px', background: 'linear-gradient(135deg, #0369A1 0%, #0C4A6E 100%)', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#FFFFFF', position: 'relative', overflow: 'hidden' }}>
              <Sparkles size={48} color="#FDE047" style={{ opacity: 0.85 }} />
              <div style={{ position: 'absolute', bottom: '10px', left: '14px', fontSize: '12px', fontWeight: '700', color: '#FEF08A' }}>Cross-City & Global</div>
            </div>
            <h3 style={{ fontSize: '17px', fontWeight: '700', color: '#0F172A', marginTop: '14px' }}>Multi-city journeys</h3>
            <p style={{ fontSize: '13px', color: '#64748B', marginTop: '4px' }}>Global clearinghouse across New York, London, Paris & Dubai.</p>
          </div>
        </div>
      </div>

      {/* Travel your way / Vehicle tiers */}
      <div>
        <h2 style={{ fontSize: '24px', fontWeight: '800', color: '#0F172A', marginBottom: '18px' }}>
          Travel your way.
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '20px' }}>
          <div className="glass-card" style={{ padding: '22px', background: '#FFFFFF', textAlign: 'center', borderRadius: '16px', border: '1px solid #E2E8F0' }}>
            <div style={{ height: '110px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#F8FAFC', borderRadius: '12px', marginBottom: '12px' }}>
              <div style={{ fontSize: '32px' }}>🚘</div>
            </div>
            <h3 style={{ fontSize: '17px', fontWeight: '800', color: '#0F172A', margin: 0 }}>Business Class</h3>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '14px', marginTop: '8px', color: '#64748B', fontSize: '13px', fontWeight: '600' }}>
              <span><Users size={14} style={{ display: 'inline', marginRight: '4px' }} />1–3</span>
              <span><Briefcase size={14} style={{ display: 'inline', marginRight: '4px' }} />2</span>
            </div>
          </div>

          <div className="glass-card" style={{ padding: '22px', background: '#FFFFFF', textAlign: 'center', borderRadius: '16px', border: '1px solid #E2E8F0' }}>
            <div style={{ height: '110px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#F8FAFC', borderRadius: '12px', marginBottom: '12px' }}>
              <div style={{ fontSize: '32px' }}>🏎️</div>
            </div>
            <h3 style={{ fontSize: '17px', fontWeight: '800', color: '#0F172A', margin: 0 }}>First Class</h3>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '14px', marginTop: '8px', color: '#64748B', fontSize: '13px', fontWeight: '600' }}>
              <span><Users size={14} style={{ display: 'inline', marginRight: '4px' }} />1–3</span>
              <span><Briefcase size={14} style={{ display: 'inline', marginRight: '4px' }} />2</span>
            </div>
          </div>

          <div className="glass-card" style={{ padding: '22px', background: '#FFFFFF', textAlign: 'center', borderRadius: '16px', border: '1px solid #E2E8F0' }}>
            <div style={{ height: '110px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#F8FAFC', borderRadius: '12px', marginBottom: '12px' }}>
              <div style={{ fontSize: '32px' }}>🚐</div>
            </div>
            <h3 style={{ fontSize: '17px', fontWeight: '800', color: '#0F172A', margin: 0 }}>Business Van</h3>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '14px', marginTop: '8px', color: '#64748B', fontSize: '13px', fontWeight: '600' }}>
              <span><Users size={14} style={{ display: 'inline', marginRight: '4px' }} />1–7</span>
              <span><Briefcase size={14} style={{ display: 'inline', marginRight: '4px' }} />6</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
