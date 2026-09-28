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
    <div className="ops-pricing-studio">
      {/* Header Banner */}
      <div className="ops-banner">
        <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <div className="ops-badge">
              <Sparkles size={13} color="#60A5FA" />
              <span>Operations Pricing Intelligence & Strategy Workbench</span>
            </div>
            <h2 className="ops-banner-title" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              Real-Time Tariff Comparison & Live Research Studio
            </h2>
            <p className="ops-banner-desc">
              Compare your live fleet pricing side-by-side against market benchmark references, itemize surcharges, and adjust customer billing strategies in real time.
            </p>
          </div>

          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '10px' }}>
            <button
              onClick={() => { fetchSimulation(); fetchCentralTollRegistry(); fetchTaxRules(); }}
              disabled={loading}
              className="ops-btn ops-btn-recalc"
            >
              <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
              <span>Recalculate</span>
            </button>

            <button
              onClick={() => setShowTaxRulesModal(!showTaxRulesModal)}
              className="ops-btn ops-btn-tax"
            >
              <Landmark size={13} />
              <span>Regional Tax Rules ({regionalTaxRules.length})</span>
            </button>

            <button
              onClick={() => setShowTollHubModal(!showTollHubModal)}
              className="ops-btn ops-btn-toll"
            >
              <Database size={13} />
              <span>Global Hub Toll Cache ({tollRegistry.length})</span>
            </button>

            <button
              onClick={handleRunAiValidation}
              disabled={aiValidating}
              className="ops-btn ops-btn-ai"
            >
              <BrainCircuit size={13} />
              <span>{aiValidating ? 'Validating with Gemini...' : 'AI Price Validation'}</span>
            </button>
          </div>
        </div>

        {/* Preset Scenarios Selector */}
        <div className="ops-presets-grid">
          {RESEARCH_PRESETS.map((preset) => {
            const isSelected = selectedScenarioId === preset.id;
            return (
              <button
                key={preset.id}
                onClick={() => applyPreset(preset)}
                className={`ops-preset-card ${isSelected ? 'active' : ''}`}
              >
                <div style={{ fontSize: '10.5px', fontWeight: 800, color: '#60A5FA', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  {preset.serviceType.replace(/_/g, ' ')} {preset.isInterstate ? '• Interstate' : ''}
                </div>
                <div style={{ fontSize: '12.5px', fontWeight: 800, color: '#FFFFFF' }}>{preset.name}</div>
                <div style={{ fontSize: '11px', color: '#94A3B8', marginTop: '2px', lineHeight: '1.4' }}>{preset.description}</div>
              </button>
            );
          })}
        </div>
      </div>

      {/* AI GEMINI PRICE VALIDATION RESULT BANNER */}
      {aiValidation && (
        <div style={{
          background: 'linear-gradient(135deg, rgba(88, 28, 135, 0.4) 0%, rgba(15, 23, 42, 0.95) 50%, rgba(49, 46, 129, 0.4) 100%)',
          border: '1px solid rgba(168, 85, 247, 0.4)',
          borderRadius: '16px',
          padding: '20px',
          boxShadow: '0 8px 30px rgba(0,0,0,0.5)',
          display: 'flex',
          flexDirection: 'column',
          gap: '14px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px', borderBottom: '1px solid rgba(168, 85, 247, 0.2)', paddingBottom: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Sparkles size={18} color="#C084FC" />
              <h4 style={{ margin: 0, fontSize: '14px', fontWeight: 800, color: '#FFFFFF' }}>Google Gemini Market Pricing Intelligence & Benchmark Validation</h4>
              <span style={{ padding: '2px 8px', borderRadius: '9999px', background: 'rgba(168, 85, 247, 0.2)', border: '1px solid rgba(168, 85, 247, 0.4)', color: '#D8B4FE', fontSize: '10px', fontWeight: 800, fontFamily: 'monospace' }}>
                {aiValidation.ai_model_used || 'gemini-3.8-flash'}
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px' }}>
              <span style={{ color: '#94A3B8' }}>Confidence:</span>
              <span style={{ fontWeight: 800, color: '#34D399', fontFamily: 'monospace' }}>{((aiValidation.confidence_score || 0.95) * 100).toFixed(0)}%</span>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '12px' }}>
            <div className="ops-metric-box">
              <div style={{ fontSize: '10.5px', color: '#94A3B8' }}>Your Proposed Price</div>
              <div style={{ fontSize: '18px', fontWeight: 800, color: '#FFFFFF', fontFamily: 'monospace', marginTop: '4px' }}>${Number(aiValidation.proposed_price || 0).toFixed(2)}</div>
            </div>
            <div className="ops-metric-box" style={{ borderColor: 'rgba(168, 85, 247, 0.4)' }}>
              <div style={{ fontSize: '10.5px', color: '#C084FC' }}>AI Recommended Price</div>
              <div style={{ fontSize: '18px', fontWeight: 800, color: '#D8B4FE', fontFamily: 'monospace', marginTop: '4px' }}>${Number(aiValidation.ai_recommended_price || 0).toFixed(2)}</div>
            </div>
            <div className="ops-metric-box">
              <div style={{ fontSize: '10.5px', color: '#94A3B8' }}>Market Range (Low - High)</div>
              <div style={{ fontSize: '15px', fontWeight: 700, color: '#E2E8F0', fontFamily: 'monospace', marginTop: '4px' }}>
                ${Number(aiValidation.market_low || 0).toFixed(0)} - ${Number(aiValidation.market_high || 0).toFixed(0)}
              </div>
            </div>
            <div className="ops-metric-box" style={{ borderColor: 'rgba(16, 185, 129, 0.4)' }}>
              <div style={{ fontSize: '10.5px', color: '#94A3B8' }}>Recommendation Status</div>
              <div style={{ fontSize: '12px', fontWeight: 800, color: '#34D399', marginTop: '6px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                {aiValidation.recommendation_status?.replace(/_/g, ' ') || 'OPTIMAL COMPETITIVE'}
              </div>
            </div>
          </div>

          <div style={{ fontSize: '12px', color: '#CBD5E1', background: 'rgba(11, 15, 25, 0.6)', padding: '12px 16px', borderRadius: '10px', border: '1px solid rgba(168, 85, 247, 0.25)', lineHeight: '1.5' }}>
            <strong style={{ color: '#D8B4FE' }}>Market Intelligence & Context: </strong>
            {aiValidation.reasoning_and_market_context}
          </div>
        </div>
      )}

      {saveSuccess && (
        <div style={{ background: 'rgba(6, 78, 59, 0.5)', border: '1px solid rgba(16, 185, 129, 0.45)', color: '#6EE7B7', padding: '14px 18px', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px', fontWeight: 700 }}>
          <CheckCircle2 size={18} color="#34D399" />
          <span>{saveSuccess}</span>
        </div>
      )}

      {error && (
        <div style={{ background: 'rgba(127, 29, 29, 0.5)', border: '1px solid rgba(239, 68, 68, 0.45)', color: '#FCA5A5', padding: '14px 18px', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px', fontWeight: 700 }}>
          <AlertCircle size={18} color="#EF4444" />
          <span>{error}</span>
        </div>
      )}

      {/* 3-COLUMN SIDE-BY-SIDE TARIFF COMPARISON MATRIX */}
      <div className="ops-comparison-grid">
        
        {/* COLUMN 1: LIVE MARKET REFERENCE (BENCHMARK) */}
        <div className="ops-card ops-card-benchmark">
          <div className="ops-card-badge">
            Live Market Benchmark
          </div>

          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              <Award size={18} color="#FBBF24" />
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 800, color: '#FFFFFF' }}>Live Reference Tariff</h3>
            </div>
            <p style={{ fontSize: '12px', color: '#94A3B8', margin: '0 0 16px 0' }}>
              Industry standard reference model ({vehicleClass.replace(/_/g, ' ')} • {hourlyHours} Hours Charter).
            </p>

            {bench && (
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <div className="ops-line-item">
                  <span style={{ color: '#94A3B8' }}>Base Rate (${bench.hourly_rate.toFixed(2)} × {hourlyHours}h):</span>
                  <span style={{ fontFamily: 'monospace', fontWeight: 700, color: '#FFFFFF' }}>${bench.base_fare.toFixed(2)}</span>
                </div>
                <div className="ops-line-item">
                  <span style={{ color: '#94A3B8' }}>Fuel Surcharge (10.0%):</span>
                  <span style={{ fontFamily: 'monospace', fontWeight: 700, color: '#FCD34D' }}>+${bench.fuel_surcharge.toFixed(2)}</span>
                </div>
                <div className="ops-line-item">
                  <span style={{ color: '#94A3B8' }}>Operating Service Charge (7.0%):</span>
                  <span style={{ fontFamily: 'monospace', fontWeight: 700, color: '#FCD34D' }}>+${bench.service_charge.toFixed(2)}</span>
                </div>
                <div className="ops-line-item">
                  <span style={{ color: '#94A3B8' }}>Bridge, Tunnel & Turnpike Tolls:</span>
                  <span style={{ fontFamily: 'monospace', fontWeight: 700, color: '#93C5FD' }}>+${bench.tolls.toFixed(2)}</span>
                </div>
                <div className="ops-line-item">
                  <span style={{ color: '#94A3B8' }}>Credit Card Fee (~2.31%):</span>
                  <span style={{ fontFamily: 'monospace', fontWeight: 700, color: '#E2E8F0' }}>+${bench.credit_card_fee.toFixed(2)}</span>
                </div>
                <div className="ops-line-item">
                  <span style={{ color: '#94A3B8' }}>Sales Tax (Interstate Exemption):</span>
                  <span style={{ fontFamily: 'monospace', fontWeight: 700, color: '#34D399' }}>${bench.tax.toFixed(2)} (Exempt)</span>
                </div>
                <div className="ops-line-item">
                  <span style={{ color: '#94A3B8' }}>Driver Gratuity:</span>
                  <span style={{ fontFamily: 'monospace', color: '#64748B' }}>$0.00 (Customer Tip Pills)</span>
                </div>
              </div>
            )}
          </div>

          <div style={{ marginTop: '20px', paddingTop: '16px', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
              <span style={{ fontSize: '11px', fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Benchmark Total:</span>
              <span style={{ fontSize: '24px', fontWeight: 800, color: '#FBBF24', fontFamily: 'monospace' }}>
                ${bench?.total_payable.toFixed(2) || '1,147.56'}
              </span>
            </div>
          </div>
        </div>

        {/* COLUMN 2: OWNER ACTIVE FLEET TARIFF (CURRENT IN DB) */}
        <div className="ops-card ops-card-active">
          <div className="ops-card-badge">
            Active in Database
          </div>

          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              <Building2 size={18} color="#60A5FA" />
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 800, color: '#FFFFFF' }}>Your Current Tariff</h3>
            </div>
            <p style={{ fontSize: '12px', color: '#94A3B8', margin: '0 0 16px 0' }}>
              Real-time calculation from your active database rules.
            </p>

            {active && (
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <div className="ops-line-item">
                  <span style={{ color: '#94A3B8' }}>Base Hourly / Charter Fare:</span>
                  <span style={{ fontFamily: 'monospace', fontWeight: 700, color: '#FFFFFF' }}>${active.base_fare.toFixed(2)}</span>
                </div>
                <div className="ops-line-item">
                  <span style={{ color: '#94A3B8' }}>Fuel Surcharge:</span>
                  <span style={{ fontFamily: 'monospace', fontWeight: 700, color: '#CBD5E1' }}>+${active.fuel_surcharge.toFixed(2)}</span>
                </div>
                <div className="ops-line-item">
                  <span style={{ color: '#94A3B8' }}>Operating Service Charge:</span>
                  <span style={{ fontFamily: 'monospace', fontWeight: 700, color: '#CBD5E1' }}>+${active.service_charge.toFixed(2)}</span>
                </div>
                <div className="ops-line-item">
                  <span style={{ color: '#94A3B8' }}>Detected Corridor Tolls:</span>
                  <span style={{ fontFamily: 'monospace', fontWeight: 700, color: '#93C5FD' }}>+${active.tolls.toFixed(2)}</span>
                </div>
                <div className="ops-line-item">
                  <span style={{ color: '#94A3B8' }}>Credit Card Fee:</span>
                  <span style={{ fontFamily: 'monospace', fontWeight: 700, color: '#CBD5E1' }}>+${active.credit_card_fee.toFixed(2)}</span>
                </div>
                <div className="ops-line-item">
                  <span style={{ color: '#94A3B8' }}>Jurisdiction Sales Tax:</span>
                  <span style={{ fontFamily: 'monospace', fontWeight: 700, color: '#CBD5E1' }}>+${active.tax.toFixed(2)}</span>
                </div>
                <div className="ops-line-item">
                  <span style={{ color: '#94A3B8' }}>Variance vs. Benchmark:</span>
                  <span style={{
                    fontFamily: 'monospace',
                    fontWeight: 800,
                    color: active.total_payable > (bench?.total_payable || 0) ? '#F87171' : '#34D399'
                  }}>
                    {active.total_payable > (bench?.total_payable || 0) ? '+' : ''}
                    ${(active.total_payable - (bench?.total_payable || 0)).toFixed(2)}
                  </span>
                </div>
              </div>
            )}
          </div>

          <div style={{ marginTop: '20px', paddingTop: '16px', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
              <span style={{ fontSize: '11px', fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Active Total:</span>
              <span style={{ fontSize: '24px', fontWeight: 800, color: '#FFFFFF', fontFamily: 'monospace' }}>
                ${active?.total_payable.toFixed(2) || '0.00'}
              </span>
            </div>
          </div>
        </div>

        {/* COLUMN 3: OPERATIONS RECOMMENDED TARIFF */}
        <div className="ops-card ops-card-rec">
          <div className="ops-card-badge">
            Optimized Recommendation
          </div>

          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              <Sparkles size={18} color="#34D399" />
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 800, color: '#FFFFFF' }}>Operations Recommendation</h3>
            </div>
            <p style={{ fontSize: '12px', color: '#94A3B8', margin: '0 0 16px 0' }}>
              Algorithm-optimized profit margin with competitive win-rate.
            </p>

            {rec && (
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <div className="ops-line-item">
                  <span style={{ color: '#94A3B8' }}>Base Rate (${rec.hourly_rate.toFixed(2)} × {hourlyHours}h):</span>
                  <span style={{ fontFamily: 'monospace', fontWeight: 700, color: '#FFFFFF' }}>${rec.base_fare.toFixed(2)}</span>
                </div>
                <div className="ops-line-item">
                  <span style={{ color: '#94A3B8' }}>Fuel Surcharge (10.0%):</span>
                  <span style={{ fontFamily: 'monospace', fontWeight: 700, color: '#6EE7B7' }}>+${rec.fuel_surcharge.toFixed(2)}</span>
                </div>
                <div className="ops-line-item">
                  <span style={{ color: '#94A3B8' }}>Operating Service Charge (7.0%):</span>
                  <span style={{ fontFamily: 'monospace', fontWeight: 700, color: '#6EE7B7' }}>+${rec.service_charge.toFixed(2)}</span>
                </div>
                <div className="ops-line-item">
                  <span style={{ color: '#94A3B8' }}>Tolls (Roundtrip Pass-Through):</span>
                  <span style={{ fontFamily: 'monospace', fontWeight: 700, color: '#93C5FD' }}>+${rec.tolls.toFixed(2)}</span>
                </div>
                <div className="ops-line-item">
                  <span style={{ color: '#94A3B8' }}>Credit Card Fee (2.31%):</span>
                  <span style={{ fontFamily: 'monospace', fontWeight: 700, color: '#CBD5E1' }}>+${rec.credit_card_fee.toFixed(2)}</span>
                </div>
                <div className="ops-line-item">
                  <span style={{ color: '#94A3B8' }}>Sales Tax (Interstate Livery):</span>
                  <span style={{ fontFamily: 'monospace', fontWeight: 700, color: '#34D399' }}>$0.00 (Exempt)</span>
                </div>
                <div style={{ padding: '10px 12px', background: 'rgba(16, 185, 129, 0.12)', border: '1px solid rgba(16, 185, 129, 0.25)', borderRadius: '8px', fontSize: '11px', color: '#6EE7B7', marginTop: '10px', lineHeight: '1.4' }}>
                  {rec.strategy_note}
                </div>
              </div>
            )}
          </div>

          <div style={{ marginTop: '20px', paddingTop: '16px', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
              <span style={{ fontSize: '11px', fontWeight: 700, color: '#34D399', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Recommended Total:</span>
              <span style={{ fontSize: '24px', fontWeight: 800, color: '#34D399', fontFamily: 'monospace' }}>
                ${rec?.total_payable.toFixed(2) || '1,195.45'}
              </span>
            </div>
          </div>
        </div>

      </div>

      {/* INTERACTIVE STRATEGY ADJUSTER & UNIT ECONOMICS SIMULATOR */}
      <div className="ops-adjuster-panel">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '14px', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '16px' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: '#FFFFFF', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Sliders size={18} color="#60A5FA" />
              Interactive Strategy Adjuster & Decision Controls
            </h3>
            <p style={{ margin: '4px 0 0 0', fontSize: '12.5px', color: '#94A3B8' }}>
              Customize how you charge customers, test different tariff levers, and see the live impact on gross revenue and owner net margin.
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '12px', fontWeight: 700, color: '#94A3B8' }}>Strategy:</span>
            <div style={{ display: 'flex', background: '#0B0F19', padding: '4px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.1)' }}>
              <button
                type="button"
                onClick={() => setChargingStrategy('CALCULATED_MATRIX')}
                style={{
                  padding: '6px 12px',
                  borderRadius: '8px',
                  fontSize: '11.5px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  border: 'none',
                  backgroundColor: chargingStrategy === 'CALCULATED_MATRIX' ? '#2563EB' : 'transparent',
                  color: chargingStrategy === 'CALCULATED_MATRIX' ? '#FFFFFF' : '#94A3B8',
                  transition: 'all 0.2s ease'
                }}
              >
                Calculated Matrix
              </button>
              <button
                type="button"
                onClick={() => setChargingStrategy('FLAT_HOURLY')}
                style={{
                  padding: '6px 12px',
                  borderRadius: '8px',
                  fontSize: '11.5px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  border: 'none',
                  backgroundColor: chargingStrategy === 'FLAT_HOURLY' ? '#2563EB' : 'transparent',
                  color: chargingStrategy === 'FLAT_HOURLY' ? '#FFFFFF' : '#94A3B8',
                  transition: 'all 0.2s ease'
                }}
              >
                Flat Hourly Charter
              </button>
              <button
                type="button"
                onClick={() => setChargingStrategy('FLAT_MILEAGE')}
                style={{
                  padding: '6px 12px',
                  borderRadius: '8px',
                  fontSize: '11.5px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  border: 'none',
                  backgroundColor: chargingStrategy === 'FLAT_MILEAGE' ? '#2563EB' : 'transparent',
                  color: chargingStrategy === 'FLAT_MILEAGE' ? '#FFFFFF' : '#94A3B8',
                  transition: 'all 0.2s ease'
                }}
              >
                Flat Per-Mile
              </button>
            </div>
          </div>
        </div>

        {/* CONTROLS GRID */}
        <div className="ops-controls-grid">
          
          {/* Base Hourly Rate Slider */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
              <label style={{ fontSize: '12px', fontWeight: 700, color: '#E2E8F0' }}>Base Hourly Rate</label>
              <span style={{ fontSize: '12.5px', fontFamily: 'monospace', fontWeight: 800, color: '#60A5FA' }}>${hourlyRate.toFixed(2)}/hr</span>
            </div>
            <input
              type="range"
              min="80"
              max="250"
              step="5"
              value={hourlyRate}
              onChange={(e) => setHourlyRate(parseFloat(e.target.value))}
              className="ops-slider"
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: '#64748B', marginTop: '4px' }}>
              <span>$80</span>
              <span>$110 (Benchmark)</span>
              <span>$250</span>
            </div>
          </div>

          {/* Fuel Surcharge Slider */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
              <label style={{ fontSize: '12px', fontWeight: 700, color: '#E2E8F0' }}>Fuel Surcharge %</label>
              <span style={{ fontSize: '12.5px', fontFamily: 'monospace', fontWeight: 800, color: '#FBBF24' }}>{fuelSurchargePct.toFixed(1)}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="25"
              step="0.5"
              value={fuelSurchargePct}
              onChange={(e) => setFuelSurchargePct(parseFloat(e.target.value))}
              disabled={chargingStrategy !== 'CALCULATED_MATRIX'}
              className="ops-slider"
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: '#64748B', marginTop: '4px' }}>
              <span>0%</span>
              <span>10% (Live Ref)</span>
              <span>25%</span>
            </div>
          </div>

          {/* Operating Service Charge Slider */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
              <label style={{ fontSize: '12px', fontWeight: 700, color: '#E2E8F0' }}>Service Charge %</label>
              <span style={{ fontSize: '12.5px', fontFamily: 'monospace', fontWeight: 800, color: '#FBBF24' }}>{serviceChargePct.toFixed(1)}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="20"
              step="0.5"
              value={serviceChargePct}
              onChange={(e) => setServiceChargePct(parseFloat(e.target.value))}
              disabled={chargingStrategy !== 'CALCULATED_MATRIX'}
              className="ops-slider"
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: '#64748B', marginTop: '4px' }}>
              <span>0%</span>
              <span>7% (Live Ref)</span>
              <span>20%</span>
            </div>
          </div>

          {/* Toll Pass-Through Mode */}
          <div>
            <label style={{ fontSize: '12px', fontWeight: 700, color: '#E2E8F0', display: 'block', marginBottom: '6px' }}>Intercity Toll Pass-Through</label>
            <select
              value={tollMode}
              onChange={(e) => setTollMode(e.target.value as any)}
              className="ops-select"
            >
              <option value="ROUNDTRIP">Round-Trip Tolls ($92.00 - Full Pass)</option>
              <option value="ONE_WAY">One-Way Tolls ($38.00 - Passenger Leg)</option>
              <option value="INCLUDED">Absorbed / Included in Base Fare</option>
            </select>
          </div>

          {/* Credit Card Processing Fee */}
          <div>
            <label style={{ fontSize: '12px', fontWeight: 700, color: '#E2E8F0', display: 'block', marginBottom: '6px' }}>Credit Card Surcharge</label>
            <button
              type="button"
              onClick={() => setCcFeePassthrough(!ccFeePassthrough)}
              style={{
                width: '100%',
                padding: '8px 12px',
                borderRadius: '10px',
                fontSize: '11.5px',
                fontWeight: 700,
                cursor: 'pointer',
                border: ccFeePassthrough ? '1px solid #3B82F6' : '1px solid rgba(255,255,255,0.12)',
                backgroundColor: ccFeePassthrough ? 'rgba(59, 130, 246, 0.18)' : '#0B0F19',
                color: ccFeePassthrough ? '#60A5FA' : '#94A3B8',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                transition: 'all 0.2s ease'
              }}
            >
              <span>{ccFeePassthrough ? 'Pass-Through +2.31%' : 'Absorb CC Merchant Fee (0%)'}</span>
              {ccFeePassthrough && <Check size={14} color="#60A5FA" />}
            </button>
          </div>

          {/* Interstate Tax Exemption */}
          <div>
            <label style={{ fontSize: '12px', fontWeight: 700, color: '#E2E8F0', display: 'block', marginBottom: '6px' }}>Interstate Tax Regulation</label>
            <button
              type="button"
              onClick={() => setInterstateTaxExempt(!interstateTaxExempt)}
              style={{
                width: '100%',
                padding: '8px 12px',
                borderRadius: '10px',
                fontSize: '11.5px',
                fontWeight: 700,
                cursor: 'pointer',
                border: interstateTaxExempt ? '1px solid #10B981' : '1px solid rgba(255,255,255,0.12)',
                backgroundColor: interstateTaxExempt ? 'rgba(16, 185, 129, 0.18)' : '#0B0F19',
                color: interstateTaxExempt ? '#34D399' : '#94A3B8',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                transition: 'all 0.2s ease'
              }}
            >
              <span>{interstateTaxExempt ? 'Tax-Exempt (49 U.S.C. § 14505)' : 'Charge State Tax'}</span>
              {interstateTaxExempt && <ShieldCheck size={14} color="#34D399" />}
            </button>
          </div>

          {/* Driver Payout Split */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
              <label style={{ fontSize: '12px', fontWeight: 700, color: '#E2E8F0' }}>Driver Payout Cut</label>
              <span style={{ fontSize: '12.5px', fontFamily: 'monospace', fontWeight: 800, color: '#C084FC' }}>{driverPayoutPct.toFixed(0)}% of Base</span>
            </div>
            <input
              type="range"
              min="40"
              max="80"
              step="5"
              value={driverPayoutPct}
              onChange={(e) => setDriverPayoutPct(parseFloat(e.target.value))}
              className="ops-slider"
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: '#64748B', marginTop: '4px' }}>
              <span>40%</span>
              <span>60% (Standard)</span>
              <span>80%</span>
            </div>
          </div>

          {/* Vehicle Class Selector */}
          <div>
            <label style={{ fontSize: '12px', fontWeight: 700, color: '#E2E8F0', display: 'block', marginBottom: '6px' }}>Vehicle Tier</label>
            <select
              value={vehicleClass}
              onChange={(e) => setVehicleClass(e.target.value as VehicleClass)}
              className="ops-select"
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
          <div style={{ background: 'rgba(11, 15, 25, 0.8)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px', padding: '18px', marginTop: '20px' }}>
            <div style={{ fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#94A3B8', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <TrendingUp size={15} color="#34D399" />
              <span>Simulated Unit Economics & Margin Health</span>
            </div>

            <div className="ops-unit-metrics-grid">
              <div className="ops-metric-box">
                <div style={{ fontSize: '11px', color: '#94A3B8' }}>Customer Total</div>
                <div style={{ fontSize: '17px', fontWeight: 800, color: '#FFFFFF', fontFamily: 'monospace', marginTop: '4px' }}>
                  ${unit.gross_revenue.toFixed(2)}
                </div>
              </div>

              <div className="ops-metric-box">
                <div style={{ fontSize: '11px', color: '#94A3B8' }}>Driver Payout</div>
                <div style={{ fontSize: '17px', fontWeight: 800, color: '#C084FC', fontFamily: 'monospace', marginTop: '4px' }}>
                  ${unit.driver_payout.toFixed(2)}
                </div>
              </div>

              <div className="ops-metric-box">
                <div style={{ fontSize: '11px', color: '#94A3B8' }}>Tolls & CC Fee Pass</div>
                <div style={{ fontSize: '17px', fontWeight: 800, color: '#60A5FA', fontFamily: 'monospace', marginTop: '4px' }}>
                  ${unit.pass_through_costs.toFixed(2)}
                </div>
              </div>

              <div className="ops-metric-box">
                <div style={{ fontSize: '11px', color: '#94A3B8' }}>Fuel Allocation</div>
                <div style={{ fontSize: '17px', fontWeight: 800, color: '#FBBF24', fontFamily: 'monospace', marginTop: '4px' }}>
                  ${unit.fuel_cost_est.toFixed(2)}
                </div>
              </div>

              <div className="ops-metric-box">
                <div style={{ fontSize: '11px', color: '#94A3B8' }}>Owner Net Profit</div>
                <div style={{ fontSize: '17px', fontWeight: 800, color: '#34D399', fontFamily: 'monospace', marginTop: '4px' }}>
                  ${unit.owner_net_profit.toFixed(2)}
                </div>
              </div>

              <div className="ops-metric-box" style={{ borderColor: 'rgba(16, 185, 129, 0.4)' }}>
                <div style={{ fontSize: '11px', color: '#94A3B8' }}>Net Profit Margin</div>
                <div style={{ fontSize: '17px', fontWeight: 800, color: '#6EE7B7', fontFamily: 'monospace', marginTop: '4px' }}>
                  {unit.net_margin_pct.toFixed(1)}%
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ACTION BUTTON TO PERSIST TO LIVE DATABASE */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px', paddingTop: '18px', borderTop: '1px solid rgba(255,255,255,0.08)', marginTop: '20px' }}>
          <div style={{ fontSize: '12px', color: '#94A3B8', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Info size={15} color="#60A5FA" />
            <span>Applying this strategy will immediately update your live dispatch engine & customer booking quotes.</span>
          </div>

          <button
            type="button"
            onClick={handleApplyStrategyToDatabase}
            disabled={savingRule}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '12px 24px',
              background: 'linear-gradient(135deg, #059669 0%, #10B981 100%)',
              border: 'none',
              borderRadius: '12px',
              color: '#FFFFFF',
              fontSize: '13.5px',
              fontWeight: 800,
              cursor: 'pointer',
              boxShadow: '0 4px 20px rgba(16, 185, 129, 0.35)',
              transition: 'all 0.2s ease',
              opacity: savingRule ? 0.6 : 1
            }}
          >
            <Save size={16} className={savingRule ? 'animate-spin' : ''} />
            <span>{savingRule ? 'Persisting to Database...' : 'Apply Strategy to Live Fleet Matrix'}</span>
          </button>
        </div>

      </div>

      {/* CENTRALIZED GLOBAL HUB TOLL REGISTRY MODAL */}
      {showTollHubModal && (
        <div style={{
          background: 'linear-gradient(135deg, #0F172A 0%, #090D16 100%)',
          border: '1px solid rgba(59, 130, 246, 0.4)',
          borderRadius: '16px',
          padding: '24px',
          boxShadow: '0 10px 40px rgba(0,0,0,0.6)',
          display: 'flex',
          flexDirection: 'column',
          gap: '14px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Database size={18} color="#60A5FA" />
              <h4 style={{ margin: 0, fontSize: '15px', fontWeight: 800, color: '#FFFFFF' }}>Centralized Global Hub Toll Rate Registry & Cache</h4>
            </div>
            <button
              onClick={() => setShowTollHubModal(false)}
              style={{ fontSize: '12px', color: '#94A3B8', background: '#1E293B', border: '1px solid rgba(255,255,255,0.1)', padding: '4px 10px', borderRadius: '8px', cursor: 'pointer' }}
            >
              Close
            </button>
          </div>

          <p style={{ fontSize: '12px', color: '#94A3B8', margin: 0, lineHeight: '1.5' }}>
            Toll rates are calculated once via TollGuru / Google Routes API and cached authoritatively in the Central Global Hub. All vendor cells and customer quotes query this shared registry with <strong>0ms network latency and zero duplicate API charges</strong>.
          </p>

          <div style={{ maxHeight: '260px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {tollRegistry.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '24px', fontSize: '12px', color: '#64748B' }}>
                No cached toll records yet. Toll rates are cached automatically upon first trip calculation.
              </div>
            ) : (
              tollRegistry.map((item, idx) => (
                <div key={idx} style={{ padding: '12px 14px', background: '#0B0F19', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '12px' }}>
                  <div>
                    <div style={{ fontWeight: 800, color: '#FFFFFF' }}>{item.origin} ➔ {item.destination}</div>
                    <div style={{ fontSize: '10.5px', color: '#64748B', marginTop: '2px' }}>
                      Cached via {item.provider} • {item.hits} Central Hub hits
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontFamily: 'monospace', fontWeight: 800, color: '#60A5FA' }}>${parseFloat(item.toll_usd).toFixed(2)} One-Way</div>
                    <div style={{ fontFamily: 'monospace', fontSize: '11px', color: '#34D399' }}>${parseFloat(item.roundtrip_toll_usd).toFixed(2)} Round-Trip</div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* REGIONAL TAX RULES & EXEMPTION MODAL */}
      {showTaxRulesModal && (
        <div style={{
          background: 'linear-gradient(135deg, #0F172A 0%, #090D16 100%)',
          border: '1px solid rgba(16, 185, 129, 0.4)',
          borderRadius: '16px',
          padding: '24px',
          boxShadow: '0 10px 40px rgba(0,0,0,0.6)',
          display: 'flex',
          flexDirection: 'column',
          gap: '14px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Landmark size={18} color="#34D399" />
              <h4 style={{ margin: 0, fontSize: '15px', fontWeight: 800, color: '#FFFFFF' }}>Authoritative State & Metro Regional Tax Rules</h4>
            </div>
            <button
              onClick={() => setShowTaxRulesModal(false)}
              style={{ fontSize: '12px', color: '#94A3B8', background: '#1E293B', border: '1px solid rgba(255,255,255,0.1)', padding: '4px 10px', borderRadius: '8px', cursor: 'pointer' }}
            >
              Close
            </button>
          </div>

          <p style={{ fontSize: '12px', color: '#94A3B8', margin: 0, lineHeight: '1.5' }}>
            Loaded authoritatively from the Central Tax & Compliance Registry. Tax rates automatically apply depending on intrastate vs. interstate passenger routes.
          </p>

          <div style={{ maxHeight: '280px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {regionalTaxRules.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '24px', fontSize: '12px', color: '#64748B' }}>
                Loading authoritative regional tax rules...
              </div>
            ) : (
              regionalTaxRules.map((rule, idx) => (
                <div key={idx} style={{ padding: '12px 14px', background: '#0B0F19', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '12px' }}>
                  <div>
                    <div style={{ fontWeight: 800, color: '#FFFFFF', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span>{rule.jurisdiction_name || rule.state_code || rule.region}</span>
                      <span style={{ padding: '2px 7px', borderRadius: '9999px', background: 'rgba(16, 185, 129, 0.15)', color: '#34D399', border: '1px solid rgba(16, 185, 129, 0.35)', fontSize: '10px', fontFamily: 'monospace', fontWeight: 800 }}>
                        {rule.tax_type || 'SALES_TAX'}
                      </span>
                    </div>
                    <div style={{ fontSize: '11px', color: '#94A3B8', marginTop: '2px' }}>
                      {rule.description || 'Statutory chauffeured passenger transportation tax rule'}
                      {rule.interstate_exempt ? ' • Interstate Exempt' : ' • Applies to all routes'}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontFamily: 'monospace', fontWeight: 800, color: '#34D399', fontSize: '14px' }}>
                      {(Number(rule.rate_percentage || rule.tax_rate || 0) * 100).toFixed(2)}%
                    </div>
                    <div style={{ fontSize: '10px', color: '#64748B', fontFamily: 'monospace' }}>
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


