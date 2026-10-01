import React, { useState, useEffect } from 'react';
import { ShieldCheck, Users, Briefcase, Plane, Sparkles, Check, ChevronDown, ChevronUp, Star, Building2, Wifi, Coffee } from 'lucide-react';
import { BookingState, VehicleClassType, VendorOption } from '../types';

interface Props {
  state: BookingState;
  onChange: (updates: Partial<BookingState>) => void;
  onNext: () => void;
  onBack: () => void;
}

export const VehicleAndVendorSelectionView: React.FC<Props> = ({ state, onChange, onNext, onBack }) => {
  const [vendors, setVendors] = useState<VendorOption[]>([]);
  const [loadingVendors, setLoadingVendors] = useState(false);
  const [showSpecialRequests, setShowSpecialRequests] = useState(false);

  useEffect(() => {
    fetchVendors();
  }, []);

  const fetchVendors = async () => {
    setLoadingVendors(true);
    try {
      const res = await fetch('/api/v1/global-hub/vendors/compare?city=New York');
      if (res.ok) {
        const data = await res.json();
        setVendors(data.vendors || []);
      }
    } catch (e) {
      console.error('Failed to fetch vendors', e);
    } finally {
      setLoadingVendors(false);
    }
  };

  const handleSelectTier = (tier: VehicleClassType, base: number, fee: number) => {
    onChange({
      vehicleClass: tier,
      baseFare: base,
      feesAndTaxes: fee,
      totalFare: base + fee
    });
  };

  const vehicles: { id: VehicleClassType; title: string; subtitle: string; baseFare: number; fees: number; total: number; passengers: string; bags: string }[] = [
    {
      id: 'BUSINESS_CLASS',
      title: 'Business Class',
      subtitle: 'Mercedes-Benz S-Class, BMW 7 Series or similar',
      baseFare: 125,
      fees: 20,
      total: 145,
      passengers: '1–3',
      bags: '2'
    },
    {
      id: 'FIRST_CLASS',
      title: 'First Class',
      subtitle: 'Mercedes-Maybach, Audi A8 L or similar',
      baseFare: 185,
      fees: 25,
      total: 210,
      passengers: '1–3',
      bags: '2'
    },
    {
      id: 'BUSINESS_VAN',
      title: 'Business Van',
      subtitle: 'Mercedes-Benz V-Class, Cadillac Escalade or similar',
      baseFare: 165,
      fees: 20,
      total: 185,
      passengers: '1–7',
      bags: '6'
    }
  ];

  return (
    <div style={{ maxWidth: '1180px', margin: '0 auto' }}>
      {/* Progress Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '32px', marginBottom: '32px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: '#0078D4', color: '#FFFFFF', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', fontWeight: '800' }}>1</div>
          <span style={{ fontSize: '14px', fontWeight: '700', color: '#0078D4' }}>Ride details</span>
        </div>
        <div style={{ width: '32px', height: '2px', background: '#E2E8F0' }} />
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: '#F1F5F9', color: '#64748B', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', fontWeight: '800' }}>2</div>
          <span style={{ fontSize: '14px', fontWeight: '600', color: '#64748B' }}>Passenger details</span>
        </div>
        <div style={{ width: '32px', height: '2px', background: '#E2E8F0' }} />
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: '#F1F5F9', color: '#64748B', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', fontWeight: '800' }}>3</div>
          <span style={{ fontSize: '14px', fontWeight: '600', color: '#64748B' }}>Review & pay</span>
        </div>
        <div style={{ width: '32px', height: '2px', background: '#E2E8F0' }} />
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: '#F1F5F9', color: '#64748B', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', fontWeight: '800' }}>4</div>
          <span style={{ fontSize: '14px', fontWeight: '600', color: '#64748B' }}>Confirmation</span>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: '28px', alignItems: 'start' }}>
        {/* Main Selection Column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <div className="glass-card" style={{ padding: '28px', background: '#FFFFFF' }}>
            <h2 style={{ fontSize: '26px', fontWeight: '800', color: '#0F172A', marginBottom: '8px' }}>
              Choose your ride.
            </h2>
            <p style={{ fontSize: '14px', color: '#64748B', marginBottom: '20px' }}>
              All rides include complimentary wait time, flight tracking, and vetted professional chauffeurs.
            </p>

            {/* Sourcing Mode Toggle */}
            <div style={{ display: 'flex', gap: '8px', background: '#F8FAFC', padding: '6px', borderRadius: '12px', border: '1px solid #E2E8F0', marginBottom: '22px' }}>
              <button
                onClick={() => onChange({ sourcingMode: 'AUTO_ROUTED', selectedVendorId: undefined, selectedVendorName: undefined })}
                style={{
                  flex: 1,
                  padding: '10px 14px',
                  borderRadius: '8px',
                  border: 'none',
                  fontSize: '13px',
                  fontWeight: '700',
                  cursor: 'pointer',
                  background: state.sourcingMode === 'AUTO_ROUTED' ? '#0078D4' : 'transparent',
                  color: state.sourcingMode === 'AUTO_ROUTED' ? '#FFFFFF' : '#64748B',
                  boxShadow: state.sourcingMode === 'AUTO_ROUTED' ? '0 2px 8px rgba(0,120,212,0.25)' : 'none'
                }}
              >
                Auto-Routed Network
              </button>
              <button
                onClick={() => onChange({ sourcingMode: 'EXPLICIT_VENDOR' })}
                style={{
                  flex: 1,
                  padding: '10px 14px',
                  borderRadius: '8px',
                  border: 'none',
                  fontSize: '13px',
                  fontWeight: '700',
                  cursor: 'pointer',
                  background: state.sourcingMode === 'EXPLICIT_VENDOR' ? '#0078D4' : 'transparent',
                  color: state.sourcingMode === 'EXPLICIT_VENDOR' ? '#FFFFFF' : '#64748B',
                  boxShadow: state.sourcingMode === 'EXPLICIT_VENDOR' ? '0 2px 8px rgba(0,120,212,0.25)' : 'none'
                }}
              >
                Compare Local Affiliates (Airline Mode)
              </button>
            </div>

            {/* Auto-routed Vehicle Tier Cards */}
            {state.sourcingMode === 'AUTO_ROUTED' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                {vehicles.map((v) => {
                  const isSelected = state.vehicleClass === v.id;
                  return (
                    <div
                      key={v.id}
                      onClick={() => handleSelectTier(v.id, v.baseFare, v.fees)}
                      style={{
                        padding: '18px 20px',
                        borderRadius: '14px',
                        border: isSelected ? '2px solid #0078D4' : '1.5px solid #E2E8F0',
                        background: isSelected ? '#F0F9FF' : '#FFFFFF',
                        cursor: 'pointer',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                        <div style={{ width: '56px', height: '40px', background: '#F1F5F9', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '22px' }}>
                          {v.id === 'BUSINESS_CLASS' ? '🚘' : v.id === 'FIRST_CLASS' ? '🏎️' : '🚐'}
                        </div>
                        <div>
                          <div style={{ fontSize: '16px', fontWeight: '800', color: '#0F172A' }}>{v.title}</div>
                          <div style={{ fontSize: '12px', color: '#64748B', marginTop: '2px' }}>{v.subtitle}</div>
                          <div style={{ display: 'flex', gap: '12px', marginTop: '6px', fontSize: '11px', color: '#64748B', fontWeight: '600' }}>
                            <span><Users size={12} style={{ display: 'inline', marginRight: '3px' }} />{v.passengers} passengers</span>
                            <span><Briefcase size={12} style={{ display: 'inline', marginRight: '3px' }} />{v.bags} suitcases</span>
                          </div>
                        </div>
                      </div>

                      <div style={{ textAlign: 'right', display: 'flex', alignItems: 'center', gap: '14px' }}>
                        <div>
                          <div style={{ fontSize: '20px', fontWeight: '800', color: '#0F172A' }}>${v.total}</div>
                          <div style={{ fontSize: '11px', color: '#64748B' }}>All-inclusive</div>
                        </div>
                        <div style={{
                          width: '22px',
                          height: '22px',
                          borderRadius: '50%',
                          border: isSelected ? 'none' : '2px solid #CBD5E1',
                          background: isSelected ? '#0078D4' : '#FFFFFF',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}>
                          {isSelected && <Check size={14} color="#FFFFFF" />}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Airline-style Affiliate Vendor Comparison */}
            {state.sourcingMode === 'EXPLICIT_VENDOR' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                {vendors.map((vnd) => {
                  const isSelected = state.selectedVendorId === vnd.vendor_id;
                  const rate = vnd.rates[state.vehicleClass] || 145;
                  return (
                    <div
                      key={vnd.vendor_id}
                      onClick={() => onChange({
                        selectedVendorId: vnd.vendor_id,
                        selectedVendorName: vnd.company_name,
                        baseFare: rate - 20,
                        feesAndTaxes: 20,
                        totalFare: rate
                      })}
                      style={{
                        padding: '18px 20px',
                        borderRadius: '14px',
                        border: isSelected ? '2px solid #0078D4' : '1.5px solid #E2E8F0',
                        background: isSelected ? '#F0F9FF' : '#FFFFFF',
                        cursor: 'pointer',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '10px'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <Building2 size={16} color="#0078D4" />
                            <h4 style={{ fontSize: '15px', fontWeight: '800', color: '#0F172A' }}>{vnd.company_name}</h4>
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', background: '#FEF3C7', color: '#B45309', padding: '2px 6px', borderRadius: '6px', fontSize: '11px', fontWeight: '800' }}>
                              <Star size={12} fill="#B45309" />
                              {vnd.rating_score.toFixed(2)} ({vnd.total_reviews_count})
                            </span>
                          </div>
                          <div style={{ fontSize: '12px', color: '#64748B', marginTop: '4px' }}>
                            Fleet: {vnd.vehicle_makes}
                          </div>
                        </div>

                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontSize: '20px', fontWeight: '800', color: '#0078D4' }}>${rate}</div>
                          <div style={{ fontSize: '11px', color: '#64748B' }}>Single Invoice</div>
                        </div>
                      </div>

                      <div style={{ display: 'flex', gap: '14px', fontSize: '11px', color: '#059669', fontWeight: '600' }}>
                        <span>✓ {vnd.cancellation_policy}</span>
                        <span>✓ Meet & Greet Included</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Flight number & Meeting Point Inputs */}
            <div style={{ marginTop: '24px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#334155', marginBottom: '6px' }}>
                  Flight number (optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. AA123 or BA178"
                  value={state.flightNumber || ''}
                  onChange={(e) => onChange({ flightNumber: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: '10px',
                    border: '1.5px solid #E2E8F0',
                    fontSize: '13px'
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#334155', marginBottom: '6px' }}>
                  Pickup meeting point
                </label>
                <select
                  value={state.pickupMeetingPoint}
                  onChange={(e) => onChange({ pickupMeetingPoint: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: '10px',
                    border: '1.5px solid #E2E8F0',
                    fontSize: '13px',
                    background: '#FFFFFF'
                  }}
                >
                  <option value="Airport Arrivals (Baggage Claim)">Airport Arrivals (Baggage Claim)</option>
                  <option value="Curbside Express Pickup">Curbside Express Pickup</option>
                  <option value="Hotel Valet / Main Lobby Entrance">Hotel Valet / Main Lobby Entrance</option>
                  <option value="Private Residence / Office Forecourt">Private Residence / Office Forecourt</option>
                </select>
              </div>
            </div>

            {/* Special requests accordion */}
            <div style={{ marginTop: '16px' }}>
              <button
                onClick={() => setShowSpecialRequests(!showSpecialRequests)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#0078D4',
                  fontSize: '13px',
                  fontWeight: '700',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  cursor: 'pointer'
                }}
              >
                {showSpecialRequests ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                Add child seat / Special requests
              </button>

              {showSpecialRequests && (
                <div style={{ marginTop: '12px', padding: '14px', background: '#F8FAFC', borderRadius: '10px', border: '1px solid #E2E8F0' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                    <span style={{ fontSize: '13px', fontWeight: '700', color: '#0F172A' }}>Child Safety Seats ($15)</span>
                    <select
                      value={state.childSeatsCount}
                      onChange={(e) => onChange({ childSeatsCount: parseInt(e.target.value, 10) })}
                      style={{ padding: '6px 10px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '12px' }}
                    >
                      <option value={0}>0 Seats</option>
                      <option value={1}>1 Booster / Infant Seat</option>
                      <option value={2}>2 Booster / Infant Seats</option>
                    </select>
                  </div>
                  <textarea
                    placeholder="Provide any specific instructions for your chauffeur (e.g. name on pickup placard, temperature preferences)..."
                    value={state.specialRequests || ''}
                    onChange={(e) => onChange({ specialRequests: e.target.value })}
                    rows={2}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #E2E8F0', fontSize: '12px' }}
                  />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Sticky Trip Summary Column */}
        <div className="glass-card" style={{ padding: '22px', background: '#FFFFFF', position: 'sticky', top: '80px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: '800', color: '#0F172A' }}>Trip summary</h3>
            <button onClick={onBack} style={{ background: 'none', border: 'none', color: '#0078D4', fontSize: '12px', fontWeight: '700', cursor: 'pointer' }}>Edit</button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', paddingBottom: '14px', borderBottom: '1px solid #F1F5F9', fontSize: '13px' }}>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
              <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#0078D4', marginTop: '5px' }} />
              <div>
                <strong style={{ color: '#0F172A' }}>{state.pickupAddress || 'JFK Airport, New York, NY'}</strong>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
              <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10B981', marginTop: '5px' }} />
              <div>
                <strong style={{ color: '#0F172A' }}>{state.dropoffAddress || 'Manhattan, New York, NY'}</strong>
              </div>
            </div>
            <div style={{ color: '#64748B', fontSize: '12px', marginTop: '4px' }}>
              {state.dateStr} at {state.timeStr} • {state.passengers} passengers
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '18px 0' }}>
            <span style={{ fontSize: '14px', fontWeight: '700', color: '#64748B' }}>Total</span>
            <span style={{ fontSize: '24px', fontWeight: '800', color: '#0F172A' }}>${state.totalFare}</span>
          </div>

          <button
            onClick={onNext}
            style={{
              width: '100%',
              background: '#0078D4',
              color: '#FFFFFF',
              border: 'none',
              borderRadius: '12px',
              padding: '14px',
              fontSize: '15px',
              fontWeight: '700',
              cursor: 'pointer',
              boxShadow: '0 4px 14px rgba(0,120,212,0.3)'
            }}
          >
            Continue
          </button>
        </div>
      </div>
    </div>
  );
};
