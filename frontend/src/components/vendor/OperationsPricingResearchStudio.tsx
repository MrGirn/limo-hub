import React, { useState, useEffect } from 'react';
import { 
  Building2, Car, Sparkles, CheckCircle2, ArrowRight, 
  DollarSign, MapPin, Clock, CreditCard, RefreshCw, Award, Zap,
  TrendingUp, TrendingDown, Info, ShieldCheck, Check, Sliders, ChevronRight,
  Plane, Navigation, Shield, Database, Layers, CheckCircle, Percent,
  ArrowUpRight, AlertCircle, Save, BrainCircuit, Landmark, HelpCircle, Loader2
} from 'lucide-react';
import { VehicleClass, ServiceType, PricingModelType, TaxGratuityDisplayMode } from '../../types';
import { 
  saveVendorPricingRule, 
  fetchRegionalTaxRulesApi, 
  aiValidateVendorPricingApi, 
  aiValidatePricingQuoteApi 
} from '../../api';

interface PresetScenario {
  id: string;
  name: string;
  serviceType: ServiceType;
  pickup: string;
  dropoff: string;
  hours: number;
  vehicleClass: VehicleClass;
  description: string;
  isInterstate: boolean;
}

const RESEARCH_PRESETS: PresetScenario[] = [
  {
    id: 'broomall_nyc_8hr',
    name: 'Live Use Case: 8-Hour Hourly Charter (Broomall PA → NYC)',
    serviceType: 'HOURLY_AS_DIRECTED',
    pickup: '301 Lawrence Road, Broomall, PA, USA',
    dropoff: '50 Hudson Street, New York, NY, USA',
    hours: 8,
    vehicleClass: 'LUXURY_SUV',
    description: 'Real Live Customer Scenario (Cadillac Escalade ESV • $110/hr + Roundtrip Tolls & Surcharges)',
    isInterstate: true
  },
  {
    id: 'phl_wilmington_airport',
    name: 'Airport VIP: PHL Airport → Wilmington DE',
    serviceType: 'AIRPORT_TRANSFER',
    pickup: 'Philadelphia International Airport (PHL), PA',
    dropoff: '400 Bellevue Parkway, Wilmington, DE 19809',
    hours: 3,
    vehicleClass: 'FIRST_CLASS',
    description: 'Tri-state airport transfer corridor with meet & greet',
    isInterstate: true
  },
  {
    id: 'jfk_manhattan_vip',
    name: 'New York VIP: JFK Airport → The Plaza Manhattan',
    serviceType: 'AIRPORT_TRANSFER',
    pickup: 'John F. Kennedy International Airport (JFK), Terminal 4',
    dropoff: 'The Plaza Hotel, 768 5th Ave, New York, NY 10019',
    hours: 3,
    vehicleClass: 'LUXURY_SUV',
    description: 'New York metro luxury airport transfer corridor',
    isInterstate: false
  },
  {
    id: 'custom_corridor',
    name: 'Custom Research Route & Tariff',
    serviceType: 'HOURLY_AS_DIRECTED',
    pickup: '301 Lawrence Road, Broomall, PA, USA',
    dropoff: '50 Hudson Street, New York, NY, USA',
    hours: 8,
    vehicleClass: 'LUXURY_SUV',
    description: 'Custom research workbench with live Google Maps & Toll routing',
    isInterstate: true
  }
];

export interface OperationsPricingResearchStudioProps {
  vendorId: string;
  vendorName?: string;
  onRuleApplied?: () => void;
}

export const OperationsPricingResearchStudio: React.FC<OperationsPricingResearchStudioProps> = ({
  vendorId,
  vendorName = 'Fleet Owner',
  onRuleApplied
}) => {
  const [selectedScenarioId, setSelectedScenarioId] = useState<string>('broomall_nyc_8hr');
  const [serviceType, setServiceType] = useState<ServiceType>('HOURLY_AS_DIRECTED');
  const [pickupAddress, setPickupAddress] = useState<string>('301 Lawrence Road, Broomall, PA, USA');
  const [dropoffAddress, setDropoffAddress] = useState<string>('50 Hudson Street, New York, NY, USA');
  const [hourlyHours, setHourlyHours] = useState<number>(8);
  const [vehicleClass, setVehicleClass] = useState<VehicleClass>('LUXURY_SUV');

  // Interactive Adjuster Sliders & Strategy State
  const [chargingStrategy, setChargingStrategy] = useState<'CALCULATED_MATRIX' | 'FLAT_HOURLY' | 'FLAT_MILEAGE'>('CALCULATED_MATRIX');
  const [hourlyRate, setHourlyRate] = useState<number>(110.0);
  const [flatPerMile, setFlatPerMile] = useState<number>(5.50);
  const [fuelSurchargePct, setFuelSurchargePct] = useState<number>(10.0);
  const [serviceChargePct, setServiceChargePct] = useState<number>(7.0);
  const [tollMode, setTollMode] = useState<'ROUNDTRIP' | 'ONE_WAY' | 'INCLUDED'>('ROUNDTRIP');
  const [ccFeePassthrough, setCcFeePassthrough] = useState<boolean>(true);
  const [interstateTaxExempt, setInterstateTaxExempt] = useState<boolean>(true);
  const [driverPayoutPct, setDriverPayoutPct] = useState<number>(60.0);

  // Live Simulation Response & Loading
  const [loading, setLoading] = useState<boolean>(false);
  const [simulationData, setSimulationData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);
  const [savingRule, setSavingRule] = useState<boolean>(false);

  // Central Toll Registry & Tax Rules
  const [tollRegistry, setTollRegistry] = useState<any[]>([]);
  const [showTollHubModal, setShowTollHubModal] = useState<boolean>(false);
  const [regionalTaxRules, setRegionalTaxRules] = useState<any[]>([]);
  const [showTaxRulesModal, setShowTaxRulesModal] = useState<boolean>(false);

  // AI Gemini Pricing Validation
  const [aiValidation, setAiValidation] = useState<any | null>(null);
  const [aiValidating, setAiValidating] = useState<boolean>(false);

  const applyPreset = (preset: PresetScenario) => {
    setSelectedScenarioId(preset.id);
    setServiceType(preset.serviceType);
    setPickupAddress(preset.pickup);
    setDropoffAddress(preset.dropoff);
    setHourlyHours(preset.hours);
    setVehicleClass(preset.vehicleClass);
    setInterstateTaxExempt(preset.isInterstate);
  };

  const fetchSimulation = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/v1/pricing/research-simulate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vendor_id: vendorId,
          vehicle_class: vehicleClass,
          service_type: serviceType,
          pickup_address: pickupAddress,
          dropoff_address: dropoffAddress,
          hourly_hours: hourlyHours,
          custom_overrides: {
            charging_strategy: chargingStrategy,
            hourly_rate: hourlyRate,
            flat_per_mile: flatPerMile,
            fuel_surcharge_pct: fuelSurchargePct,
            service_charge_pct: serviceChargePct,
            toll_mode: tollMode,
            cc_fee_passthrough: ccFeePassthrough,
            interstate_tax_exempt: interstateTaxExempt
          }
        })
      });

      if (!res.ok) {
        throw new Error(`Simulation failed (${res.statusText})`);
      }

      const data = await res.json();
      setSimulationData(data);
    } catch (err: any) {
      setError(err.message || 'Error running live pricing simulation');
    } finally {
      setLoading(false);
    }
  };

  const fetchCentralTollRegistry = async () => {
    try {
      const res = await fetch('/api/v1/hub/toll-registry');
      if (res.ok) {
        const data = await res.json();
        setTollRegistry(data || []);
      }
    } catch (e) {
      console.warn('Could not fetch central toll registry:', e);
    }
  };

  const fetchTaxRules = async () => {
    try {
      const data = await fetchRegionalTaxRulesApi();
      setRegionalTaxRules(data || []);
    } catch (e) {
      console.warn('Could not fetch regional tax rules:', e);
    }
  };

  const handleRunAiValidation = async () => {
    setAiValidating(true);
    try {
      const proposedAmt = simulationData?.simulated_strategy?.unit_economics?.gross_revenue || 
                          (chargingStrategy === 'FLAT_HOURLY' ? hourlyRate * hourlyHours : 450);
      const res = await aiValidateVendorPricingApi(vendorId, {
        service_type: serviceType,
        vehicle_class: vehicleClass,
        pickup_address: pickupAddress,
        dropoff_address: dropoffAddress,
        hourly_hours: hourlyHours,
        proposed_quote_amount: proposedAmt,
        currency: 'USD'
      });
      setAiValidation(res);
    } catch (err: any) {
      setError(err.message || 'AI pricing validation failed');
    } finally {
      setAiValidating(false);
    }
  };

  useEffect(() => {
    fetchSimulation();
    fetchCentralTollRegistry();
    fetchTaxRules();
  }, [
    vendorId, vehicleClass, serviceType, pickupAddress, dropoffAddress,
    hourlyHours, chargingStrategy, hourlyRate, flatPerMile, fuelSurchargePct,
    serviceChargePct, tollMode, ccFeePassthrough, interstateTaxExempt
  ]);


  const handleApplyStrategyToDatabase = async () => {
    setSavingRule(true);
    setSaveSuccess(null);
    try {
      const pricingModelType: PricingModelType = 
        chargingStrategy === 'FLAT_HOURLY' ? 'FLAT_HOURLY_CHARTER' :
        chargingStrategy === 'FLAT_MILEAGE' ? 'FLAT_ALL_INCLUSIVE_PER_MILE' : 'DYNAMIC_MATRIX';

      const payload = {
        vendor_id: vendorId,
        vehicle_class: vehicleClass,
        base_rate_net: 95.0,
        per_mile_rate_net: 3.75,
        hourly_rate_net: hourlyRate,
        hourly_minimum_hours: serviceType === 'HOURLY_AS_DIRECTED' ? Math.min(hourlyHours, 4) : 2,
        fuel_surcharge_pct: fuelSurchargePct / 100.0,
        service_charge_pct: serviceChargePct / 100.0,
        credit_card_fee_pct: ccFeePassthrough ? 0.02315 : 0.0,
        flat_per_mile_all_inclusive: flatPerMile,
        pricing_model_type: pricingModelType,
        tax_gratuity_display_mode: 'ITEMIZED_SEPARATE' as TaxGratuityDisplayMode,
        tax_rate: interstateTaxExempt ? 0.0 : 0.06
      };

      await saveVendorPricingRule(vendorId, payload);
      setSaveSuccess(`Successfully updated active ${vehicleClass.replace('_', ' ')} tariff rules in the database!`);
      if (onRuleApplied) onRuleApplied();
      fetchSimulation();
    } catch (err: any) {
      setError(err.message || 'Failed to save pricing rule to database');
    } finally {
      setSavingRule(false);
    }
  };

  const bench = simulationData?.benchmark_model;
  const active = simulationData?.owner_active_matrix;
  const rec = simulationData?.operations_recommendation;
  const sim = simulationData?.simulated_strategy;
  const unit = sim?.unit_economics;

  return (
    <div className="space-y-6 w-full text-slate-100">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-blue-950/40 to-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl backdrop-blur-md">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/30 text-blue-400 text-xs font-semibold uppercase tracking-wider mb-2">
              <Sparkles className="w-3.5 h-3.5" />
              Operations Pricing Intelligence & Strategy Workbench
            </div>
            <h2 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight flex items-center gap-3">
              Real-Time Tariff Comparison & Live Research Studio
            </h2>
            <p className="text-slate-400 text-sm mt-1">
              Compare your live fleet pricing side-by-side against market benchmark references, itemize surcharges, and adjust customer billing strategies in real time.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => { fetchSimulation(); fetchCentralTollRegistry(); fetchTaxRules(); }}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-semibold border border-slate-700 shadow transition-all"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              Recalculate
            </button>

            <button
              onClick={() => setShowTaxRulesModal(!showTaxRulesModal)}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 rounded-xl text-xs font-semibold border border-emerald-500/40 shadow transition-all"
            >
              <Landmark className="w-3.5 h-3.5" />
              Regional Tax Rules ({regionalTaxRules.length})
            </button>

            <button
              onClick={() => setShowTollHubModal(!showTollHubModal)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 rounded-xl text-xs font-semibold border border-blue-500/40 shadow transition-all"
            >
              <Database className="w-3.5 h-3.5" />
              Global Hub Toll Cache ({tollRegistry.length})
            </button>

            <button
              onClick={handleRunAiValidation}
              disabled={aiValidating}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white rounded-xl text-xs font-semibold shadow-lg shadow-purple-500/20 transition-all"
            >
              <BrainCircuit className={`w-3.5 h-3.5 ${aiValidating ? 'animate-spin' : ''}`} />
              {aiValidating ? 'Validating with Gemini...' : 'AI Price Validation'}
            </button>
          </div>
        </div>

        {/* Preset Scenarios Selector */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mt-6 pt-5 border-t border-slate-800/80">
          {RESEARCH_PRESETS.map((preset) => {
            const isSelected = selectedScenarioId === preset.id;
            return (
              <button
                key={preset.id}
                onClick={() => applyPreset(preset)}
                className={`text-left p-3.5 rounded-xl border transition-all ${
                  isSelected
                    ? 'bg-blue-900/30 border-blue-500 shadow-md shadow-blue-500/10 ring-1 ring-blue-500'
                    : 'bg-slate-950/60 border-slate-800 hover:border-slate-700 hover:bg-slate-900/60'
                }`}
              >
                <div className="text-[11px] font-bold text-blue-400 uppercase tracking-wider mb-1">
                  {preset.serviceType.replace('_', ' ')} {preset.isInterstate ? '• Interstate' : ''}
                </div>
                <div className="text-xs font-bold text-white line-clamp-1">{preset.name}</div>
                <div className="text-[11px] text-slate-400 mt-1 line-clamp-2">{preset.description}</div>
              </button>
            );
          })}
        </div>
      </div>

      {/* AI GEMINI PRICE VALIDATION RESULT BANNER */}
      {aiValidation && (
        <div className="bg-gradient-to-r from-purple-950/70 via-slate-900 to-indigo-950/70 border border-purple-500/40 rounded-2xl p-5 shadow-2xl space-y-3">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-b border-purple-500/20 pb-3">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-purple-400 animate-pulse" />
              <h4 className="text-sm font-bold text-white">Google Gemini Market Pricing Intelligence & Benchmark Validation</h4>
              <span className="px-2 py-0.5 rounded-full bg-purple-500/20 border border-purple-500/40 text-purple-300 text-[10px] font-bold font-mono">
                {aiValidation.ai_model_used || 'gemini-3.8-flash'}
              </span>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <span className="text-slate-400">Confidence:</span>
              <span className="font-bold text-emerald-400 font-mono">{((aiValidation.confidence_score || 0.95) * 100).toFixed(0)}%</span>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div className="p-3 bg-slate-950/80 rounded-xl border border-slate-800">
              <div className="text-[10px] text-slate-400">Your Proposed Price</div>
              <div className="text-base font-extrabold text-white font-mono mt-0.5">${Number(aiValidation.proposed_price || 0).toFixed(2)}</div>
            </div>
            <div className="p-3 bg-slate-950/80 rounded-xl border border-slate-800">
              <div className="text-[10px] text-purple-400">AI Recommended Price</div>
              <div className="text-base font-extrabold text-purple-300 font-mono mt-0.5">${Number(aiValidation.ai_recommended_price || 0).toFixed(2)}</div>
            </div>
            <div className="p-3 bg-slate-950/80 rounded-xl border border-slate-800">
              <div className="text-[10px] text-slate-400">Market Range (Low - High)</div>
              <div className="text-sm font-bold text-slate-200 font-mono mt-0.5">
                ${Number(aiValidation.market_low || 0).toFixed(0)} - ${Number(aiValidation.market_high || 0).toFixed(0)}
              </div>
            </div>
            <div className="p-3 bg-slate-950/80 rounded-xl border border-slate-800">
              <div className="text-[10px] text-slate-400">Recommendation Status</div>
              <div className="text-xs font-bold text-emerald-400 mt-1 uppercase tracking-wide">
                {aiValidation.recommendation_status?.replace(/_/g, ' ') || 'OPTIMAL COMPETITIVE'}
              </div>
            </div>
          </div>

          <div className="text-xs text-slate-300 bg-slate-950/50 p-3 rounded-xl border border-purple-500/20 leading-relaxed">
            <strong className="text-purple-300">Market Intelligence & Context: </strong>
            {aiValidation.reasoning_and_market_context}
          </div>
        </div>
      )}


      {saveSuccess && (
        <div className="bg-emerald-950/50 border border-emerald-500/40 text-emerald-300 p-4 rounded-xl flex items-center gap-3 text-sm font-semibold">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          {saveSuccess}
        </div>
      )}

      {error && (
        <div className="bg-red-950/50 border border-red-500/40 text-red-300 p-4 rounded-xl flex items-center gap-3 text-sm font-semibold">
          <AlertCircle className="w-5 h-5 text-red-400 shrink-0" />
          {error}
        </div>
      )}

      {/* 3-COLUMN SIDE-BY-SIDE TARIFF COMPARISON MATRIX */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        
        {/* COLUMN 1: LIVE MARKET REFERENCE (THEIR MODEL) */}
        <div className="bg-slate-900/90 border border-amber-500/30 rounded-2xl p-5 shadow-xl flex flex-col justify-between relative overflow-hidden">
          <div className="absolute top-0 right-0 bg-amber-500/10 border-l border-b border-amber-500/30 px-3 py-1 text-[10px] font-extrabold uppercase tracking-wider text-amber-400 rounded-bl-xl">
            Live Market Benchmark
          </div>

          <div>
            <div className="flex items-center gap-2 mb-3">
              <Award className="w-5 h-5 text-amber-400" />
              <h3 className="text-base font-bold text-white">Live Reference Tariff</h3>
            </div>
            <p className="text-xs text-slate-400 mb-4">
              Industry standard reference model ({vehicleClass.replace('_', ' ')} • 8 Hours Charter).
            </p>

            {bench && (
              <div className="space-y-2.5 text-xs">
                <div className="flex justify-between py-1.5 border-b border-slate-800">
                  <span className="text-slate-400">Base Rate (${bench.hourly_rate.toFixed(2)} × {hourlyHours}h):</span>
                  <span className="font-mono font-bold text-white">${bench.base_fare.toFixed(2)}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-800">
                  <span className="text-slate-400">Fuel Surcharge (10.0%):</span>
                  <span className="font-mono font-bold text-amber-300">+${bench.fuel_surcharge.toFixed(2)}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-800">
                  <span className="text-slate-400">Operating Service Charge (7.0%):</span>
                  <span className="font-mono font-bold text-amber-300">+${bench.service_charge.toFixed(2)}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-800">
                  <span className="text-slate-400">Bridge, Tunnel & Turnpike Tolls:</span>
                  <span className="font-mono font-bold text-blue-300">+${bench.tolls.toFixed(2)}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-800">
                  <span className="text-slate-400">Credit Card Service Fee (~2.31%):</span>
                  <span className="font-mono font-bold text-slate-300">+${bench.credit_card_fee.toFixed(2)}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-800">
                  <span className="text-slate-400">Sales Tax (Interstate Exemption):</span>
                  <span className="font-mono font-bold text-emerald-400">${bench.tax.toFixed(2)} (Exempt)</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-800">
                  <span className="text-slate-400">Driver Gratuity:</span>
                  <span className="font-mono text-slate-400">$0.00 (Customer Tip Pills)</span>
                </div>
              </div>
            )}
          </div>

          <div className="mt-6 pt-4 border-t border-slate-800">
            <div className="flex justify-between items-baseline">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Benchmark Total:</span>
              <span className="text-2xl font-extrabold text-amber-400 font-mono">
                ${bench?.total_payable.toFixed(2) || '1,147.56'}
              </span>
            </div>
          </div>
        </div>

        {/* COLUMN 2: OWNER ACTIVE FLEET TARIFF (CURRENT IN DB) */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl flex flex-col justify-between relative overflow-hidden">
          <div className="absolute top-0 right-0 bg-slate-800 px-3 py-1 text-[10px] font-extrabold uppercase tracking-wider text-slate-300 rounded-bl-xl">
            Active in Database
          </div>

          <div>
            <div className="flex items-center gap-2 mb-3">
              <Building2 className="w-5 h-5 text-blue-400" />
              <h3 className="text-base font-bold text-white">Your Current Tariff</h3>
            </div>
            <p className="text-xs text-slate-400 mb-4">
              Real-time calculation from your active database rules.
            </p>

            {active && (
              <div className="space-y-2.5 text-xs">
                <div className="flex justify-between py-1.5 border-b border-slate-800">
                  <span className="text-slate-400">Base Hourly / Charter Fare:</span>
                  <span className="font-mono font-bold text-white">${active.base_fare.toFixed(2)}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-800">
                  <span className="text-slate-400">Fuel Surcharge:</span>
                  <span className="font-mono font-bold text-slate-300">${active.fuel_surcharge.toFixed(2)}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-800">
                  <span className="text-slate-400">Operating Service Charge:</span>
                  <span className="font-mono font-bold text-slate-300">${active.service_charge.toFixed(2)}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-800">
                  <span className="text-slate-400">Detected Corridor Tolls:</span>
                  <span className="font-mono font-bold text-blue-300">+${active.tolls.toFixed(2)}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-800">
                  <span className="text-slate-400">Credit Card Fee:</span>
                  <span className="font-mono font-bold text-slate-300">${active.credit_card_fee.toFixed(2)}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-800">
                  <span className="text-slate-400">Jurisdiction Sales Tax:</span>
                  <span className="font-mono font-bold text-slate-300">${active.tax.toFixed(2)}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-800">
                  <span className="text-slate-400">Variance vs. Benchmark:</span>
                  <span className={`font-mono font-bold ${active.total_payable > (bench?.total_payable || 0) ? 'text-red-400' : 'text-emerald-400'}`}>
                    {active.total_payable > (bench?.total_payable || 0) ? '+' : ''}
                    ${(active.total_payable - (bench?.total_payable || 0)).toFixed(2)}
                  </span>
                </div>
              </div>
            )}
          </div>

          <div className="mt-6 pt-4 border-t border-slate-800">
            <div className="flex justify-between items-baseline">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Active Total:</span>
              <span className="text-2xl font-extrabold text-white font-mono">
                ${active?.total_payable.toFixed(2) || '0.00'}
              </span>
            </div>
          </div>
        </div>

        {/* COLUMN 3: OPERATIONS RECOMMENDED TARIFF */}
        <div className="bg-gradient-to-br from-emerald-950/40 via-slate-900 to-blue-950/40 border border-emerald-500/40 rounded-2xl p-5 shadow-xl flex flex-col justify-between relative overflow-hidden">
          <div className="absolute top-0 right-0 bg-emerald-500/20 border-l border-b border-emerald-500/40 px-3 py-1 text-[10px] font-extrabold uppercase tracking-wider text-emerald-300 rounded-bl-xl">
            Optimized Recommendation
          </div>

          <div>
            <div className="flex items-center gap-2 mb-3">
              <Sparkles className="w-5 h-5 text-emerald-400" />
              <h3 className="text-base font-bold text-white">Operations Recommendation</h3>
            </div>
            <p className="text-xs text-slate-400 mb-4">
              Algorithm-optimized profit margin with competitive win-rate.
            </p>

            {rec && (
              <div className="space-y-2.5 text-xs">
                <div className="flex justify-between py-1.5 border-b border-slate-800">
                  <span className="text-slate-400">Base Rate (${rec.hourly_rate.toFixed(2)} × {hourlyHours}h):</span>
                  <span className="font-mono font-bold text-white">${rec.base_fare.toFixed(2)}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-800">
                  <span className="text-slate-400">Fuel Surcharge (10.0%):</span>
                  <span className="font-mono font-bold text-emerald-300">+${rec.fuel_surcharge.toFixed(2)}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-800">
                  <span className="text-slate-400">Operating Service Charge (7.0%):</span>
                  <span className="font-mono font-bold text-emerald-300">+${rec.service_charge.toFixed(2)}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-800">
                  <span className="text-slate-400">Tolls (Roundtrip Pass-Through):</span>
                  <span className="font-mono font-bold text-blue-300">+${rec.tolls.toFixed(2)}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-800">
                  <span className="text-slate-400">Credit Card Fee (2.31%):</span>
                  <span className="font-mono font-bold text-slate-300">+${rec.credit_card_fee.toFixed(2)}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-800">
                  <span className="text-slate-400">Sales Tax (Interstate Livery):</span>
                  <span className="font-mono font-bold text-emerald-400">$0.00 (Exempt)</span>
                </div>
                <div className="p-2.5 bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-[11px] text-emerald-300 mt-2">
                  {rec.strategy_note}
                </div>
              </div>
            )}
          </div>

          <div className="mt-6 pt-4 border-t border-slate-800">
            <div className="flex justify-between items-baseline">
              <span className="text-xs font-semibold text-emerald-400 uppercase tracking-wider">Recommended Total:</span>
              <span className="text-2xl font-extrabold text-emerald-400 font-mono">
                ${rec?.total_payable.toFixed(2) || '1,195.45'}
              </span>
            </div>
          </div>
        </div>

      </div>

      {/* INTERACTIVE STRATEGY ADJUSTER & UNIT ECONOMICS SIMULATOR */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-4">
          <div>
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <Sliders className="w-5 h-5 text-blue-400" />
              Interactive Strategy Adjuster & Decision Controls
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Customize how you charge customers, test different tariff levers, and see the live impact on gross revenue and owner net margin.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-400">Strategy:</span>
            <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800">
              <button
                type="button"
                onClick={() => setChargingStrategy('CALCULATED_MATRIX')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  chargingStrategy === 'CALCULATED_MATRIX' ? 'bg-blue-600 text-white shadow' : 'text-slate-400 hover:text-white'
                }`}
              >
                Calculated Matrix
              </button>
              <button
                type="button"
                onClick={() => setChargingStrategy('FLAT_HOURLY')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  chargingStrategy === 'FLAT_HOURLY' ? 'bg-blue-600 text-white shadow' : 'text-slate-400 hover:text-white'
                }`}
              >
                Flat Hourly Charter
              </button>
              <button
                type="button"
                onClick={() => setChargingStrategy('FLAT_MILEAGE')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  chargingStrategy === 'FLAT_MILEAGE' ? 'bg-blue-600 text-white shadow' : 'text-slate-400 hover:text-white'
                }`}
              >
                Flat Per-Mile
              </button>
            </div>
          </div>
        </div>

        {/* CONTROLS GRID */}
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6">
          
          {/* Base Hourly Rate Slider */}
          <div>
            <div className="flex justify-between items-center mb-1.5">
              <label className="text-xs font-bold text-slate-300">Base Hourly Rate</label>
              <span className="text-xs font-mono font-bold text-blue-400">${hourlyRate.toFixed(2)}/hr</span>
            </div>
            <input
              type="range"
              min="80"
              max="250"
              step="5"
              value={hourlyRate}
              onChange={(e) => setHourlyRate(parseFloat(e.target.value))}
              className="w-full h-2 bg-slate-950 rounded-lg appearance-none cursor-pointer accent-blue-500"
            />
            <div className="flex justify-between text-[10px] text-slate-500 mt-1">
              <span>$80</span>
              <span>$110 (Benchmark)</span>
              <span>$250</span>
            </div>
          </div>

          {/* Fuel Surcharge Slider */}
          <div>
            <div className="flex justify-between items-center mb-1.5">
              <label className="text-xs font-bold text-slate-300">Fuel Surcharge %</label>
              <span className="text-xs font-mono font-bold text-amber-400">{fuelSurchargePct.toFixed(1)}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="25"
              step="0.5"
              value={fuelSurchargePct}
              onChange={(e) => setFuelSurchargePct(parseFloat(e.target.value))}
              disabled={chargingStrategy !== 'CALCULATED_MATRIX'}
              className="w-full h-2 bg-slate-950 rounded-lg appearance-none cursor-pointer accent-amber-500 disabled:opacity-30"
            />
            <div className="flex justify-between text-[10px] text-slate-500 mt-1">
              <span>0%</span>
              <span>10% (Live Ref)</span>
              <span>25%</span>
            </div>
          </div>

          {/* Operating Service Charge Slider */}
          <div>
            <div className="flex justify-between items-center mb-1.5">
              <label className="text-xs font-bold text-slate-300">Service Charge %</label>
              <span className="text-xs font-mono font-bold text-amber-400">{serviceChargePct.toFixed(1)}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="20"
              step="0.5"
              value={serviceChargePct}
              onChange={(e) => setServiceChargePct(parseFloat(e.target.value))}
              disabled={chargingStrategy !== 'CALCULATED_MATRIX'}
              className="w-full h-2 bg-slate-950 rounded-lg appearance-none cursor-pointer accent-amber-500 disabled:opacity-30"
            />
            <div className="flex justify-between text-[10px] text-slate-500 mt-1">
              <span>0%</span>
              <span>7% (Live Ref)</span>
              <span>20%</span>
            </div>
          </div>

          {/* Toll Pass-Through Mode */}
          <div>
            <label className="text-xs font-bold text-slate-300 block mb-1.5">Intercity Toll Pass-Through</label>
            <select
              value={tollMode}
              onChange={(e) => setTollMode(e.target.value as any)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
            >
              <option value="ROUNDTRIP">Round-Trip Tolls ($92.00 - Full Pass)</option>
              <option value="ONE_WAY">One-Way Tolls ($38.00 - Passenger Leg)</option>
              <option value="INCLUDED">Absorbed / Included in Base Fare</option>
            </select>
          </div>

          {/* Credit Card Processing Fee */}
          <div>
            <label className="text-xs font-bold text-slate-300 block mb-1.5">Credit Card Surcharge</label>
            <button
              type="button"
              onClick={() => setCcFeePassthrough(!ccFeePassthrough)}
              className={`w-full px-3 py-2 rounded-xl text-xs font-semibold border flex items-center justify-between transition-all ${
                ccFeePassthrough
                  ? 'bg-blue-600/20 border-blue-500 text-blue-300'
                  : 'bg-slate-950 border-slate-800 text-slate-400'
              }`}
            >
              <span>{ccFeePassthrough ? 'Pass-Through +2.31%' : 'Absorb CC Merchant Fee (0%)'}</span>
              {ccFeePassthrough && <Check className="w-4 h-4 text-blue-400" />}
            </button>
          </div>

          {/* Interstate Tax Exemption */}
          <div>
            <label className="text-xs font-bold text-slate-300 block mb-1.5">Interstate Tax Regulation</label>
            <button
              type="button"
              onClick={() => setInterstateTaxExempt(!interstateTaxExempt)}
              className={`w-full px-3 py-2 rounded-xl text-xs font-semibold border flex items-center justify-between transition-all ${
                interstateTaxExempt
                  ? 'bg-emerald-600/20 border-emerald-500 text-emerald-300'
                  : 'bg-slate-950 border-slate-800 text-slate-400'
              }`}
            >
              <span>{interstateTaxExempt ? 'Tax-Exempt (49 U.S.C. § 14505)' : 'Charge PA State Tax (6%)'}</span>
              {interstateTaxExempt && <ShieldCheck className="w-4 h-4 text-emerald-400" />}
            </button>
          </div>

          {/* Driver Payout Split */}
          <div>
            <div className="flex justify-between items-center mb-1.5">
              <label className="text-xs font-bold text-slate-300">Driver Payout Cut</label>
              <span className="text-xs font-mono font-bold text-purple-400">{driverPayoutPct.toFixed(0)}% of Base</span>
            </div>
            <input
              type="range"
              min="40"
              max="80"
              step="5"
              value={driverPayoutPct}
              onChange={(e) => setDriverPayoutPct(parseFloat(e.target.value))}
              className="w-full h-2 bg-slate-950 rounded-lg appearance-none cursor-pointer accent-purple-500"
            />
            <div className="flex justify-between text-[10px] text-slate-500 mt-1">
              <span>40%</span>
              <span>60% (Standard)</span>
              <span>80%</span>
            </div>
          </div>

          {/* Vehicle Class Selector */}
          <div>
            <label className="text-xs font-bold text-slate-300 block mb-1.5">Vehicle Tier</label>
            <select
              value={vehicleClass}
              onChange={(e) => setVehicleClass(e.target.value as VehicleClass)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
            >
              <option value="LUXURY_SUV">Luxury SUV (Cadillac Escalade)</option>
              <option value="FIRST_CLASS">First Class (Mercedes-Benz S-Class)</option>
              <option value="BUSINESS_SEDAN">Business Sedan (Lincoln CT6)</option>
              <option value="BUSINESS_VAN">Executive Sprinter Van (12-Pax)</option>
              <option value="ELECTRIC_VIP">Electric VIP (Lucid / Tesla)</option>
            </select>
          </div>

        </div>

        {/* UNIT ECONOMICS & PROFIT MARGIN DASHBOARD */}
        {unit && (
          <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-5">
            <div className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-4 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-emerald-400" />
              Simulated Unit Economics & Margin Health
            </div>

            <div className="grid grid-cols-2 md:grid-cols-6 gap-4 text-center">
              <div className="bg-slate-900 p-3 rounded-lg border border-slate-800">
                <div className="text-[11px] text-slate-400">Customer Total</div>
                <div className="text-base font-extrabold text-white font-mono mt-0.5">
                  ${unit.gross_revenue.toFixed(2)}
                </div>
              </div>

              <div className="bg-slate-900 p-3 rounded-lg border border-slate-800">
                <div className="text-[11px] text-slate-400">Driver Payout</div>
                <div className="text-base font-extrabold text-purple-400 font-mono mt-0.5">
                  ${unit.driver_payout.toFixed(2)}
                </div>
              </div>

              <div className="bg-slate-900 p-3 rounded-lg border border-slate-800">
                <div className="text-[11px] text-slate-400">Tolls & CC Fee Pass</div>
                <div className="text-base font-extrabold text-blue-400 font-mono mt-0.5">
                  ${unit.pass_through_costs.toFixed(2)}
                </div>
              </div>

              <div className="bg-slate-900 p-3 rounded-lg border border-slate-800">
                <div className="text-[11px] text-slate-400">Fuel Allocation</div>
                <div className="text-base font-extrabold text-amber-400 font-mono mt-0.5">
                  ${unit.fuel_cost_est.toFixed(2)}
                </div>
              </div>

              <div className="bg-slate-900 p-3 rounded-lg border border-slate-800">
                <div className="text-[11px] text-slate-400">Owner Net Profit</div>
                <div className="text-base font-extrabold text-emerald-400 font-mono mt-0.5">
                  ${unit.owner_net_profit.toFixed(2)}
                </div>
              </div>

              <div className="bg-slate-900 p-3 rounded-lg border border-emerald-500/30">
                <div className="text-[11px] text-slate-400">Net Profit Margin</div>
                <div className="text-base font-extrabold text-emerald-300 font-mono mt-0.5">
                  {unit.net_margin_pct.toFixed(1)}%
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ACTION BUTTON TO PERSIST TO LIVE DATABASE */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-slate-800">
          <div className="text-xs text-slate-400 flex items-center gap-1.5">
            <Info className="w-4 h-4 text-blue-400" />
            Applying this strategy will immediately update your live dispatch engine & customer booking quotes.
          </div>

          <button
            type="button"
            onClick={handleApplyStrategyToDatabase}
            disabled={savingRule}
            className="flex items-center gap-2 px-6 py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold shadow-lg shadow-emerald-500/20 transition-all disabled:opacity-50"
          >
            <Save className={`w-4 h-4 ${savingRule ? 'animate-spin' : ''}`} />
            {savingRule ? 'Persisting to Database...' : 'Apply Strategy to Live Fleet Matrix'}
          </button>
        </div>

      </div>

      {/* CENTRALIZED GLOBAL HUB TOLL REGISTRY MODAL */}
      {showTollHubModal && (
        <div className="bg-slate-900 border border-blue-500/40 rounded-2xl p-6 shadow-2xl space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <Database className="w-5 h-5 text-blue-400" />
              <h4 className="text-base font-bold text-white">Centralized Global Hub Toll Rate Registry & Cache</h4>
            </div>
            <button
              onClick={() => setShowTollHubModal(false)}
              className="text-xs text-slate-400 hover:text-white px-2 py-1 rounded-lg bg-slate-800"
            >
              Close
            </button>
          </div>

          <p className="text-xs text-slate-400">
            Toll rates are calculated once via TollGuru / Google Routes API and cached authoritatively in the Central Global Hub. All vendor cells and customer quotes query this shared registry with <strong>0ms network latency and zero duplicate API charges</strong>.
          </p>

          <div className="max-h-64 overflow-y-auto space-y-2">
            {tollRegistry.length === 0 ? (
              <div className="text-center py-6 text-xs text-slate-500">
                No cached toll records yet. Toll rates are cached automatically upon first trip calculation.
              </div>
            ) : (
              tollRegistry.map((item, idx) => (
                <div key={idx} className="p-3 bg-slate-950 rounded-xl border border-slate-800 flex items-center justify-between text-xs">
                  <div>
                    <div className="font-bold text-white">{item.origin} ➔ {item.destination}</div>
                    <div className="text-[10px] text-slate-500 mt-0.5">
                      Cached via {item.provider} • {item.hits} Central Hub hits
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-mono font-bold text-blue-400">${parseFloat(item.toll_usd).toFixed(2)} One-Way</div>
                    <div className="font-mono text-[11px] text-emerald-400">${parseFloat(item.roundtrip_toll_usd).toFixed(2)} Round-Trip</div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* REGIONAL TAX RULES & EXEMPTION MODAL */}
      {showTaxRulesModal && (
        <div className="bg-slate-900 border border-emerald-500/40 rounded-2xl p-6 shadow-2xl space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <Landmark className="w-5 h-5 text-emerald-400" />
              <h4 className="text-base font-bold text-white">Authoritative State & Metro Regional Tax Rules</h4>
            </div>
            <button
              onClick={() => setShowTaxRulesModal(false)}
              className="text-xs text-slate-400 hover:text-white px-2 py-1 rounded-lg bg-slate-800"
            >
              Close
            </button>
          </div>

          <p className="text-xs text-slate-400">
            Loaded authoritatively from the Central Tax & Compliance Registry. Tax rates automatically apply depending on intrastate vs. interstate passenger routes.
          </p>

          <div className="max-h-72 overflow-y-auto space-y-2">
            {regionalTaxRules.length === 0 ? (
              <div className="text-center py-6 text-xs text-slate-500">
                Loading authoritative regional tax rules...
              </div>
            ) : (
              regionalTaxRules.map((rule, idx) => (
                <div key={idx} className="p-3 bg-slate-950 rounded-xl border border-slate-800 flex items-center justify-between text-xs">
                  <div>
                    <div className="font-bold text-white flex items-center gap-2">
                      <span>{rule.jurisdiction_name || rule.state_code || rule.region}</span>
                      <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-[10px] font-mono font-bold">
                        {rule.tax_type || 'SALES_TAX'}
                      </span>
                    </div>
                    <div className="text-[10px] text-slate-400 mt-0.5">
                      {rule.description || 'Statutory chauffeured passenger transportation tax rule'}
                      {rule.interstate_exempt ? ' • Interstate Exempt' : ' • Applies to all routes'}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-mono font-bold text-emerald-400 text-sm">
                      {(Number(rule.rate_percentage || rule.tax_rate || 0) * 100).toFixed(2)}%
                    </div>
                    <div className="text-[10px] text-slate-500 font-mono">
                      {rule.country_code || 'US'}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

    </div>
  );
};

