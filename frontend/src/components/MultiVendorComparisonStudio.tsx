import React, { useState, useEffect } from 'react';
import { 
  Building2, Car, Shield, Sparkles, CheckCircle2, ArrowRight, 
  DollarSign, MapPin, Clock, CreditCard, RefreshCw, Award, Zap,
  TrendingDown, Info, ShieldCheck, Check, Sliders, ChevronRight,
  Plane, Navigation
} from 'lucide-react';
import { VehicleClass, ServiceType } from '../types';

interface VendorCandidate {
  vendor_id: string;
  vendor_name: string;
  depot_address: string;
  rating: number;
  outbound_staging_miles: number;
  total_operating_miles: number;
  base_fare_usd: number;
  fuel_surcharge_usd: number;
  service_charge_usd: number;
  tolls_usd: number;
  credit_card_fee_usd: number;
  total_payable_amount: number;
  currency: string;
  badge: 'BEST_PRICE' | 'FASTEST_DISPATCH' | 'TOP_RATED' | 'STANDARD' | 'COMPETITIVE_OPTION';
  quote_id: string;
  score: number;
}

interface MarketComparisonData {
  winning_vendor_id: string;
  winning_vendor_name: string;
  selection_reason: string;
  candidates_evaluated_count: number;
  ranked_candidates: VendorCandidate[];
  lowest_market_price: number;
  highest_market_price: number;
  customer_savings_usd: number;
  primary_quote: any;
}

interface PresetScenario {
  id: string;
  name: string;
  serviceType: ServiceType;
  pickup: string;
  dropoff: string;
  hours?: number;
  vehicleClass: VehicleClass;
  description: string;
}

const CURATED_DEMO_SCENARIOS: PresetScenario[] = [
  {
    id: 'broomall_nyc_8hr',
    name: '8-Hour Executive Charter (Broomall PA → NYC)',
    serviceType: 'HOURLY_AS_DIRECTED',
    pickup: '2103 S Sproul Rd, Broomall, PA 19008',
    dropoff: '50 Hudson Street, New York, NY 10013',
    hours: 8,
    vehicleClass: 'LUXURY_SUV',
    description: 'Real Luxury Chauffeur Benchmark (Cadillac Escalade ESV • $110/hr)'
  },
  {
    id: 'phl_wilmington_airport',
    name: 'PHL Airport VIP → Wilmington DE Transfer',
    serviceType: 'AIRPORT_TRANSFER',
    pickup: 'Philadelphia International Airport (PHL), PA',
    dropoff: '400 Bellevue Parkway, Wilmington, DE 19809',
    vehicleClass: 'FIRST_CLASS',
    description: 'Tri-state airport transfer corridor with meet & greet'
  },
  {
    id: 'jfk_manhattan_vip',
    name: 'JFK Airport VIP → Manhattan The Plaza',
    serviceType: 'AIRPORT_TRANSFER',
    pickup: 'John F. Kennedy International Airport (JFK), Terminal 4',
    dropoff: 'The Plaza Hotel, 768 5th Ave, New York, NY 10019',
    vehicleClass: 'LUXURY_SUV',
    description: 'New York metro luxury airport transfer corridor'
  },
  {
    id: 'london_lhr_mayfair',
    name: 'London Heathrow (LHR) → Mayfair VIP Transfer',
    serviceType: 'AIRPORT_TRANSFER',
    pickup: 'London Heathrow Airport (LHR), Terminal 5 VIP',
    dropoff: 'The Connaught Hotel, Carlos Pl, Mayfair, London W1K 2AL',
    vehicleClass: 'FIRST_CLASS',
    description: 'Royal Crown Chauffeurs UK sovereign cell (GBP £)'
  }
];

export const MultiVendorComparisonStudio: React.FC = () => {
  const [activeScenarios, setActiveScenarios] = useState<PresetScenario[]>(CURATED_DEMO_SCENARIOS);
  const [selectedScenario, setSelectedScenario] = useState<string>('broomall_nyc_8hr');
  const [serviceType, setServiceType] = useState<ServiceType>('HOURLY_AS_DIRECTED');
  const [pickupAddress, setPickupAddress] = useState<string>('2103 S Sproul Rd, Broomall, PA 19008');
  const [dropoffAddress, setDropoffAddress] = useState<string>('50 Hudson Street, New York, NY 10013');
  const [hourlyHours, setHourlyHours] = useState<number>(8);
  const [vehicleClass, setVehicleClass] = useState<VehicleClass>('LUXURY_SUV');
  const [paymentMethod, setPaymentMethod] = useState<'CREDIT_CARD' | 'DIRECT_ACH'>('CREDIT_CARD');
  const [meetAndGreet, setMeetAndGreet] = useState<boolean>(true);
  
  const [loading, setLoading] = useState<boolean>(false);
  const [comparison, setComparison] = useState<MarketComparisonData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [bookedQuoteId, setBookedQuoteId] = useState<string | null>(null);

  // Load and merge live vendor cell corridors
  useEffect(() => {
    const loadDynamicCorridors = async () => {
      try {
        const res = await fetch('/api/v1/vendor-cell/all-cells');
        if (res.ok) {
          const cells = await res.json();
          if (Array.isArray(cells) && cells.length > 0) {
            const dynamicList: PresetScenario[] = cells.map((c: any) => {
              const cfg = c.config || c;
              const cityName = cfg.city || cfg.state || 'Metropolitan';
              const depot = cfg.operational_stats?.depot_address || cfg.office_address || `${cityName} Executive Fleet Depot`;
              return {
                id: `cell_${cfg.vendor_id}`,
                name: `${cfg.vendor_name || cfg.vendor_id} Corridor`,
                serviceType: 'HOURLY_AS_DIRECTED',
                pickup: depot,
                dropoff: `${cityName} Financial & VIP District`,
                hours: 8,
                vehicleClass: 'LUXURY_SUV',
                description: `Live Sovereign Cell in ${cityName} (${cfg.local_currency || 'USD'}) • Tier ${cfg.tier || 'AUTONOMOUS_T1'}`
              };
            });
            // Combine curated scenarios with dynamic cells
            setActiveScenarios([...CURATED_DEMO_SCENARIOS, ...dynamicList]);
          }
        }
      } catch (err) {
        console.warn('Could not load live vendor cells:', err);
      }
    };
    loadDynamicCorridors();
  }, []);

  const applyPreset = (preset: PresetScenario) => {
    setSelectedScenario(preset.id);
    setServiceType(preset.serviceType);
    setPickupAddress(preset.pickup);
    setDropoffAddress(preset.dropoff);
    setVehicleClass(preset.vehicleClass);
    if (preset.hours) setHourlyHours(preset.hours);
  };

  const fetchComparison = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/v1/quotes/compare', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          service_type: serviceType,
          vehicle_class: vehicleClass,
          pickup_address: pickupAddress,
          dropoff_address: dropoffAddress,
          hourly_hours: serviceType === 'HOURLY_AS_DIRECTED' ? hourlyHours : undefined,
          meet_and_greet_inside: meetAndGreet,
          currency: 'USD'
        })
      });

      if (!res.ok) {
        throw new Error(`Failed to calculate multi-vendor comparison (${res.statusText})`);
      }

      const data = await res.json();
      setComparison(data);
    } catch (err: any) {
      setError(err.message || 'Error fetching real-time vendor comparison');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchComparison();
  }, [serviceType, vehicleClass, hourlyHours, paymentMethod, meetAndGreet]);

  const getBadgeStyle = (badge: string) => {
    switch (badge) {
      case 'BEST_PRICE':
        return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40';
      case 'FASTEST_DISPATCH':
        return 'bg-amber-500/20 text-amber-300 border-amber-500/40';
      case 'TOP_RATED':
        return 'bg-purple-500/20 text-purple-300 border-purple-500/40';
      default:
        return 'bg-slate-700/50 text-slate-300 border-slate-600';
    }
  };

  const getBadgeIcon = (badge: string) => {
    switch (badge) {
      case 'BEST_PRICE': return <Award className="w-3.5 h-3.5 mr-1 text-emerald-400" />;
      case 'FASTEST_DISPATCH': return <Zap className="w-3.5 h-3.5 mr-1 text-amber-400" />;
      case 'TOP_RATED': return <Sparkles className="w-3.5 h-3.5 mr-1 text-purple-400" />;
      default: return null;
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 md:p-8">
      {/* Studio Header */}
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/30 text-blue-400 text-xs font-semibold uppercase tracking-wider mb-2">
              <Zap className="w-3.5 h-3.5" />
              Real-Time Dynamic Pricing Engine
            </div>
            <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-white flex items-center gap-3">
              Multi-Vendor Live Quote Comparison Studio
            </h1>
            <p className="text-slate-400 text-sm mt-1">
              Zero hardcoding real-time dispatch evaluation across all sovereign cells, TollGuru turnpikes, and transparent fee itemization.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={fetchComparison}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-medium shadow-lg shadow-blue-500/20 transition-all disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              Re-Calculate All Vendors
            </button>
          </div>
        </div>

        {/* Curated Demo Scenarios & Live Corridor Selector */}
        {activeScenarios.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            {activeScenarios.map((preset) => (
              <button
                key={preset.id}
                onClick={() => applyPreset(preset)}
                className={`text-left p-3.5 rounded-xl border transition-all ${
                  selectedScenario === preset.id
                    ? 'bg-blue-900/30 border-blue-500/80 shadow-md shadow-blue-500/10'
                    : 'bg-slate-900/60 border-slate-800 hover:border-slate-700 hover:bg-slate-900'
                }`}
              >
                <div className="text-xs font-semibold text-blue-400 mb-1">{preset.serviceType.replace('_', ' ')}</div>
                <div className="text-sm font-medium text-white line-clamp-1">{preset.name}</div>
                <div className="text-xs text-slate-400 mt-1 line-clamp-1">{preset.description}</div>
              </button>
            ))}
          </div>
        )}

        {/* Real-Time Parameter Controls */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 md:p-6 shadow-xl backdrop-blur-md">
          <h2 className="text-base font-semibold text-white mb-4 flex items-center gap-2">
            <Sliders className="w-4 h-4 text-blue-400" />
            Live Parameter Configuration
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {/* Service Type */}
            <div>
              <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-1.5">
                Service Type
              </label>
              <select
                value={serviceType}
                onChange={(e) => setServiceType(e.target.value as ServiceType)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
              >
                <option value="HOURLY_AS_DIRECTED">Hourly As-Directed Charter</option>
                <option value="POINT_TO_POINT">Point-to-Point Transfer</option>
                <option value="AIRPORT_TRANSFER">Airport VIP Transfer</option>
              </select>
            </div>

            {/* Vehicle Class */}
            <div>
              <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-1.5">
                Vehicle Class
              </label>
              <select
                value={vehicleClass}
                onChange={(e) => setVehicleClass(e.target.value as VehicleClass)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
              >
                <option value="BUSINESS_SEDAN">Business Sedan ($85/hr - Lincoln CT6)</option>
                <option value="ELECTRIC_VIP">Electric VIP ($95/hr - Lucid/Tesla)</option>
                <option value="LUXURY_SUV">Luxury SUV ($110/hr - Cadillac Escalade)</option>
                <option value="FIRST_CLASS">First Class ($135/hr - Mercedes S-Class)</option>
                <option value="BUSINESS_VAN">Executive Sprinter Van ($175/hr - 12-Pax)</option>
              </select>
            </div>

            {/* Duration Slider (if hourly) */}
            {serviceType === 'HOURLY_AS_DIRECTED' && (
              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    Duration: {hourlyHours} Hours
                  </label>
                  <span className="text-xs text-blue-400 font-mono font-medium">{hourlyHours} hrs</span>
                </div>
                <input
                  type="range"
                  min="2"
                  max="16"
                  step="1"
                  value={hourlyHours}
                  onChange={(e) => setHourlyHours(parseInt(e.target.value))}
                  className="w-full h-2 bg-slate-950 rounded-lg appearance-none cursor-pointer accent-blue-500"
                />
              </div>
            )}

            {/* Payment Method / Fee Pass-Through */}
            <div>
              <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-1.5">
                Customer Payment Method
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setPaymentMethod('CREDIT_CARD')}
                  className={`px-3 py-2 rounded-xl text-xs font-medium border flex items-center justify-center gap-1.5 transition-all ${
                    paymentMethod === 'CREDIT_CARD'
                      ? 'bg-blue-600 border-blue-500 text-white'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  <CreditCard className="w-3.5 h-3.5" />
                  Credit Card (+2.31%)
                </button>
                <button
                  type="button"
                  onClick={() => setPaymentMethod('DIRECT_ACH')}
                  className={`px-3 py-2 rounded-xl text-xs font-medium border flex items-center justify-center gap-1.5 transition-all ${
                    paymentMethod === 'DIRECT_ACH'
                      ? 'bg-emerald-600 border-emerald-500 text-white'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  <Building2 className="w-3.5 h-3.5" />
                  ACH / Wire (0%)
                </button>
              </div>
            </div>
          </div>

          {/* Address Inputs */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4 pt-4 border-t border-slate-800/80">
            <div>
              <label className="text-xs font-semibold text-slate-400 block mb-1 flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-emerald-400" />
                Pickup Address
              </label>
              <input
                type="text"
                value={pickupAddress}
                onChange={(e) => setPickupAddress(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500 font-mono"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-400 block mb-1 flex items-center gap-1.5">
                <Navigation className="w-3.5 h-3.5 text-blue-400" />
                Dropoff Address
              </label>
              <input
                type="text"
                value={dropoffAddress}
                onChange={(e) => setDropoffAddress(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500 font-mono"
              />
            </div>
          </div>
        </div>

        {/* Live Savings & Optimization Summary Banner */}
        {comparison && (
          <div className="bg-gradient-to-r from-emerald-950/40 via-slate-900 to-blue-950/40 border border-emerald-500/30 rounded-2xl p-5 shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-emerald-500/20 border border-emerald-500/40 rounded-xl text-emerald-400">
                <Award className="w-6 h-6" />
              </div>
              <div>
                <div className="text-xs font-semibold uppercase tracking-wider text-emerald-400">
                  Winning Algorithm Recommendation
                </div>
                <div className="text-lg font-bold text-white flex items-center gap-2">
                  <span>{comparison.winning_vendor_name}</span>
                  <span className="px-2 py-0.5 rounded-md bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs font-mono">
                    ${comparison.lowest_market_price.toFixed(2)}
                  </span>
                </div>
                <div className="text-xs text-slate-400 mt-0.5">
                  {comparison.selection_reason}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-6 border-t md:border-t-0 md:border-l border-slate-800 pt-3 md:pt-0 md:pl-6">
              <div>
                <div className="text-xs text-slate-400">Candidates Evaluated</div>
                <div className="text-base font-bold text-white font-mono">
                  {comparison.candidates_evaluated_count} Active Cells
                </div>
              </div>
              <div>
                <div className="text-xs text-slate-400">Customer Savings</div>
                <div className="text-base font-bold text-emerald-400 font-mono flex items-center gap-1">
                  <TrendingDown className="w-4 h-4" />
                  ${comparison.customer_savings_usd.toFixed(2)}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Multi-Vendor Comparison Grid */}
        <div className="space-y-4">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Building2 className="w-5 h-5 text-blue-400" />
            Candidate Vendor Dispatch & Tariff Matrix
          </h2>

          {loading ? (
            <div className="text-center py-16 bg-slate-900/40 border border-slate-800 rounded-2xl">
              <RefreshCw className="w-8 h-8 text-blue-400 animate-spin mx-auto mb-3" />
              <div className="text-sm font-medium text-slate-300">
                Evaluating candidate vendor positioning & live TollGuru tariffs...
              </div>
            </div>
          ) : comparison && comparison.ranked_candidates.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {comparison.ranked_candidates.map((cand, idx) => {
                // Adjust for payment method display
                const adjustedCcFee = paymentMethod === 'CREDIT_CARD' ? cand.credit_card_fee_usd : 0.0;
                const finalTotal = cand.total_payable_amount - (paymentMethod === 'DIRECT_ACH' ? cand.credit_card_fee_usd : 0);
                const isWinner = cand.vendor_id === comparison.winning_vendor_id;

                return (
                  <div
                    key={cand.vendor_id}
                    className={`rounded-2xl p-5 border transition-all flex flex-col justify-between ${
                      isWinner
                        ? 'bg-slate-900 border-emerald-500/70 shadow-xl shadow-emerald-500/10 ring-1 ring-emerald-500/30'
                        : 'bg-slate-900/70 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div>
                      {/* Card Header */}
                      <div className="flex items-start justify-between gap-2 mb-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-mono text-slate-500">#{idx + 1}</span>
                            <h3 className="text-base font-bold text-white line-clamp-1">{cand.vendor_name}</h3>
                          </div>
                          <div className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
                            <MapPin className="w-3 h-3 text-slate-500" />
                            <span className="line-clamp-1">{cand.depot_address}</span>
                          </div>
                        </div>

                        <span className={`px-2.5 py-1 rounded-full text-xs font-semibold border flex items-center shrink-0 ${getBadgeStyle(cand.badge)}`}>
                          {getBadgeIcon(cand.badge)}
                          {cand.badge.replace('_', ' ')}
                        </span>
                      </div>

                      {/* Staging & Proximity Stats */}
                      <div className="grid grid-cols-2 gap-2 bg-slate-950/70 rounded-xl p-2.5 mb-4 border border-slate-800/80 text-xs">
                        <div>
                          <span className="text-slate-500 block">Depot Staging</span>
                          <span className="font-semibold text-slate-200 font-mono">{cand.outbound_staging_miles} miles</span>
                        </div>
                        <div>
                          <span className="text-slate-500 block">Fleet Quality</span>
                          <span className="font-semibold text-amber-400 font-mono">★ {cand.rating.toFixed(2)} / 5.0</span>
                        </div>
                      </div>

                      {/* Itemized Line Items Breakdown */}
                      <div className="space-y-1.5 text-xs text-slate-300 border-t border-slate-800/80 pt-3 mb-4">
                        <div className="flex justify-between">
                          <span className="text-slate-400">Base Reservation Tariff</span>
                          <span className="font-mono font-medium">${cand.base_fare_usd.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400">Fuel Surcharge (10%)</span>
                          <span className="font-mono">${cand.fuel_surcharge_usd.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400">Operations Service Charge (7%)</span>
                          <span className="font-mono">${cand.service_charge_usd.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400">Bridge & Highway Tolls</span>
                          <span className="font-mono font-medium text-blue-400">${cand.tolls_usd.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400">Credit Card Processing Fee</span>
                          <span className={`font-mono ${paymentMethod === 'DIRECT_ACH' ? 'text-emerald-400' : 'text-slate-300'}`}>
                            {paymentMethod === 'DIRECT_ACH' ? '$0.00 (Waived)' : `$${adjustedCcFee.toFixed(2)}`}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Card Footer with Final Price & Book Action */}
                    <div className="border-t border-slate-800 pt-3 mt-2">
                      <div className="flex items-baseline justify-between mb-3">
                        <span className="text-xs text-slate-400">All-Inclusive Total</span>
                        <span className="text-xl font-extrabold text-white font-mono">
                          ${finalTotal.toFixed(2)}
                        </span>
                      </div>

                      <button
                        onClick={() => setBookedQuoteId(cand.quote_id)}
                        className={`w-full py-2.5 rounded-xl font-semibold text-xs transition-all flex items-center justify-center gap-2 ${
                          bookedQuoteId === cand.quote_id
                            ? 'bg-emerald-600 text-white'
                            : isWinner
                            ? 'bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-500/20'
                            : 'bg-slate-800 hover:bg-slate-700 text-slate-200'
                        }`}
                      >
                        {bookedQuoteId === cand.quote_id ? (
                          <>
                            <CheckCircle2 className="w-4 h-4 text-emerald-200" />
                            Dispatched to Sovereign Cell
                          </>
                        ) : (
                          <>
                            Instant Book & Dispatch
                            <ArrowRight className="w-3.5 h-3.5" />
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-12 bg-slate-900 border border-slate-800 rounded-2xl text-slate-400">
              No candidate vendors found for this corridor.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
