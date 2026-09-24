import React, { useState, useEffect, useMemo } from 'react';
import { 
  Building2, DollarSign, TrendingUp, Cpu, Globe, Lock, 
  ShieldCheck, Plus, RefreshCw, CheckCircle2, Sliders, Mail, Phone, Zap,
  Calculator, ArrowRight, ArrowUpRight, ArrowDownRight, Equal, PlayCircle, RotateCcw, BookmarkCheck,
  Plane, Compass, Clock, AlertTriangle, Sparkles
} from 'lucide-react';
import { 
  Vendor, Vehicle, VendorPricingRule, VendorAIDynamicPricingMetrics, 
  VendorCommConfig, VehicleClass, DistanceUnit, NetworkParticipationMode 
} from '../types';
import { 
  fetchVendors, fetchVendorPricingRules, saveVendorPricingRule, 
  fetchVendorAIYield, trainVendorAIYield, applyVendorAIYield, 
  fetchVendorFleetInventory, addVehicleToInventory, toggleVehicleNetworkMode,
  fetchVendorCommConfig, saveVendorCommConfig
} from '../api';

export interface VendorFleetAndPricingHubProps {
  initialVendorId?: string;
  hideVendorSelector?: boolean;
}

interface SimulationScenario {
  id: string;
  name: string;
  description: string;
  icon: string;
  distance_miles: number;
  is_hourly: boolean;
  hourly_hours: number;
  deadhead_miles: number;
  is_airport: boolean;
  meet_and_greet: boolean;
  is_rush_hour: boolean;
  is_late_night: boolean;
  extra_wait_minutes: number;
}

const PRESET_SCENARIOS: SimulationScenario[] = [
  {
    id: 'airport_vip',
    name: 'Airport VIP Arrival (Logan/JFK)',
    description: '18.5 mi airport inbound with meet & greet placard service',
    icon: '✈️',
    distance_miles: 18.5,
    is_hourly: false,
    hourly_hours: 0,
    deadhead_miles: 6.0,
    is_airport: true,
    meet_and_greet: true,
    is_rush_hour: false,
    is_late_night: false,
    extra_wait_minutes: 15
  },
  {
    id: 'intercity_exec',
    name: 'Intercity Executive Transfer',
    description: '45.0 mi corridor with 12.0 mi depot return deadhead',
    icon: '🏙️',
    distance_miles: 45.0,
    is_hourly: false,
    hourly_hours: 0,
    deadhead_miles: 12.0,
    is_airport: false,
    meet_and_greet: false,
    is_rush_hour: false,
    is_late_night: false,
    extra_wait_minutes: 0
  },
  {
    id: 'hourly_roadshow',
    name: 'As-Directed Financial Roadshow',
    description: '4.0 Hours continuous hourly chauffeur reservation',
    icon: '⏱️',
    distance_miles: 25.0,
    is_hourly: true,
    hourly_hours: 4,
    deadhead_miles: 5.0,
    is_airport: false,
    meet_and_greet: false,
    is_rush_hour: false,
    is_late_night: false,
    extra_wait_minutes: 0
  },
  {
    id: 'peak_rush_airport',
    name: 'Peak Rush Hour Airport Run',
    description: '22.0 mi high-traffic airport dispatch with meet & greet',
    icon: '🚦',
    distance_miles: 22.0,
    is_hourly: false,
    hourly_hours: 0,
    deadhead_miles: 8.0,
    is_airport: true,
    meet_and_greet: true,
    is_rush_hour: true,
    is_late_night: false,
    extra_wait_minutes: 25
  },
  {
    id: 'late_night_mission',
    name: 'Late Night Red-Eye Chauffeur',
    description: '30.0 mi overnight flight arrival with late night surcharge',
    icon: '🌙',
    distance_miles: 30.0,
    is_hourly: false,
    hourly_hours: 0,
    deadhead_miles: 7.0,
    is_airport: true,
    meet_and_greet: false,
    is_rush_hour: false,
    is_late_night: true,
    extra_wait_minutes: 10
  }
];

const DEFAULT_TIER_RULES: Partial<Record<VehicleClass, Partial<VendorPricingRule>>> = {
  BUSINESS_SEDAN: {
    vehicle_class: 'BUSINESS_SEDAN',
    base_rate_net: 65.0,
    per_mile_rate_net: 3.85,
    per_km_rate_net: 2.39,
    per_minute_rate_net: 0.65,
    hourly_rate_net: 95.0,
    hourly_minimum_hours: 2,
    minimum_fare_net: 85.0,
    deadhead_rate_per_mile: 2.25,
    deadhead_rate_per_km: 1.40,
    airport_surcharge_net: 25.0,
    meet_and_greet_fee_net: 30.0,
    rush_hour_surcharge_net: 15.0,
    late_night_surcharge_net: 20.0,
    free_wait_minutes: 15,
    wait_minute_rate_net: 1.0,
    tax_rate: 0.08875,
    gratuity_rate: 0.20,
    currency: 'USD',
    distance_unit: 'MILES'
  },
  ELECTRIC_VIP: {
    vehicle_class: 'ELECTRIC_VIP',
    base_rate_net: 75.0,
    per_mile_rate_net: 4.25,
    per_km_rate_net: 2.64,
    per_minute_rate_net: 0.75,
    hourly_rate_net: 110.0,
    hourly_minimum_hours: 2,
    minimum_fare_net: 95.0,
    deadhead_rate_per_mile: 2.50,
    deadhead_rate_per_km: 1.55,
    airport_surcharge_net: 25.0,
    meet_and_greet_fee_net: 35.0,
    rush_hour_surcharge_net: 15.0,
    late_night_surcharge_net: 20.0,
    free_wait_minutes: 15,
    wait_minute_rate_net: 1.15,
    tax_rate: 0.08875,
    gratuity_rate: 0.20,
    currency: 'USD',
    distance_unit: 'MILES'
  },
  LUXURY_SUV: {
    vehicle_class: 'LUXURY_SUV',
    base_rate_net: 95.0,
    per_mile_rate_net: 4.95,
    per_km_rate_net: 3.08,
    per_minute_rate_net: 0.85,
    hourly_rate_net: 135.0,
    hourly_minimum_hours: 3,
    minimum_fare_net: 125.0,
    deadhead_rate_per_mile: 3.00,
    deadhead_rate_per_km: 1.86,
    airport_surcharge_net: 35.0,
    meet_and_greet_fee_net: 40.0,
    rush_hour_surcharge_net: 20.0,
    late_night_surcharge_net: 25.0,
    free_wait_minutes: 15,
    wait_minute_rate_net: 1.35,
    tax_rate: 0.08875,
    gratuity_rate: 0.20,
    currency: 'USD',
    distance_unit: 'MILES'
  },
  FIRST_CLASS: {
    vehicle_class: 'FIRST_CLASS',
    base_rate_net: 135.0,
    per_mile_rate_net: 6.50,
    per_km_rate_net: 4.04,
    per_minute_rate_net: 1.10,
    hourly_rate_net: 185.0,
    hourly_minimum_hours: 3,
    minimum_fare_net: 175.0,
    deadhead_rate_per_mile: 4.00,
    deadhead_rate_per_km: 2.48,
    airport_surcharge_net: 50.0,
    meet_and_greet_fee_net: 50.0,
    rush_hour_surcharge_net: 25.0,
    late_night_surcharge_net: 35.0,
    free_wait_minutes: 30,
    wait_minute_rate_net: 1.75,
    tax_rate: 0.08875,
    gratuity_rate: 0.20,
    currency: 'USD',
    distance_unit: 'MILES'
  },
  BUSINESS_VAN: {
    vehicle_class: 'BUSINESS_VAN',
    base_rate_net: 120.0,
    per_mile_rate_net: 5.75,
    per_km_rate_net: 3.57,
    per_minute_rate_net: 0.95,
    hourly_rate_net: 160.0,
    hourly_minimum_hours: 4,
    minimum_fare_net: 150.0,
    deadhead_rate_per_mile: 3.50,
    deadhead_rate_per_km: 2.17,
    airport_surcharge_net: 40.0,
    meet_and_greet_fee_net: 45.0,
    rush_hour_surcharge_net: 20.0,
    late_night_surcharge_net: 30.0,
    free_wait_minutes: 20,
    wait_minute_rate_net: 1.50,
    tax_rate: 0.08875,
    gratuity_rate: 0.20,
    currency: 'USD',
    distance_unit: 'MILES'
  }
};

function computeSimulatedQuote(rule: Partial<VendorPricingRule> | null, scenario: SimulationScenario) {
  if (!rule) {
    return {
      baseFare: 0,
      distanceCharge: 0,
      hourlyCharge: 0,
      deadheadCharge: 0,
      airportFee: 0,
      meetGreetFee: 0,
      rushHourFee: 0,
      lateNightFee: 0,
      waitFee: 0,
      netSubtotal: 0,
      taxAmount: 0,
      gratuityAmount: 0,
      totalGross: 0,
      floorApplied: false
    };
  }

  const baseFare = Number(rule.base_rate_net || 0);
  const perMile = Number(rule.per_mile_rate_net || 0);
  const hourlyRate = Number(rule.hourly_rate_net || 0);
  const deadheadRate = Number(rule.deadhead_rate_per_mile || 0);
  const minFare = Number(rule.minimum_fare_net || 0);
  const airportFee = scenario.is_airport ? Number(rule.airport_surcharge_net || 0) : 0;
  const meetGreetFee = scenario.meet_and_greet ? Number(rule.meet_and_greet_fee_net || 0) : 0;
  const rushHourFee = scenario.is_rush_hour ? Number(rule.rush_hour_surcharge_net || 0) : 0;
  const lateNightFee = scenario.is_late_night ? Number(rule.late_night_surcharge_net || 0) : 0;
  
  const freeWait = Number(rule.free_wait_minutes || 15);
  const waitRate = Number(rule.wait_minute_rate_net || 1.0);
  const chargeableWait = Math.max(0, scenario.extra_wait_minutes - freeWait);
  const waitFee = chargeableWait * waitRate;

  let distanceCharge = 0;
  let hourlyCharge = 0;
  if (scenario.is_hourly) {
    const minHours = Number(rule.hourly_minimum_hours || 2);
    const billableHours = Math.max(scenario.hourly_hours, minHours);
    hourlyCharge = billableHours * hourlyRate;
  } else {
    distanceCharge = scenario.distance_miles * perMile;
  }

  const deadheadCharge = scenario.deadhead_miles * deadheadRate;

  const rawSubtotal = (scenario.is_hourly ? hourlyCharge : (baseFare + distanceCharge)) 
    + deadheadCharge 
    + airportFee 
    + meetGreetFee 
    + rushHourFee 
    + lateNightFee 
    + waitFee;

  const floorApplied = rawSubtotal < minFare;
  const netSubtotal = Math.max(rawSubtotal, minFare);
  const taxRate = Number(rule.tax_rate || 0.08875);
  const taxAmount = netSubtotal * taxRate;
  const gratuityRate = Number(rule.gratuity_rate || 0.20);
  const gratuityAmount = netSubtotal * gratuityRate;
  const totalGross = netSubtotal + taxAmount + gratuityAmount;

  return {
    baseFare: scenario.is_hourly ? 0 : baseFare,
    distanceCharge,
    hourlyCharge,
    deadheadCharge,
    airportFee,
    meetGreetFee,
    rushHourFee,
    lateNightFee,
    waitFee,
    netSubtotal,
    taxAmount,
    gratuityAmount,
    totalGross,
    floorApplied
  };
}

export const VendorFleetAndPricingHub: React.FC<VendorFleetAndPricingHubProps> = ({
  initialVendorId,
  hideVendorSelector = true
}) => {
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [selectedVendorId, setSelectedVendorId] = useState<string>(initialVendorId || 'vendor-boston-vip');
  const [activeTab, setActiveTab] = useState<'PRICING' | 'AI_YIELD' | 'INVENTORY' | 'COMM'>('PRICING');
  const [loading, setLoading] = useState<boolean>(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Data states
  const [rules, setRules] = useState<VendorPricingRule[]>([]);
  const [selectedRule, setSelectedRule] = useState<VendorPricingRule | null>(null);
  const [baselineRules, setBaselineRules] = useState<Record<string, VendorPricingRule>>({});
  const [aiMetrics, setAiMetrics] = useState<VendorAIDynamicPricingMetrics | null>(null);
  const [inventory, setInventory] = useState<Vehicle[]>([]);
  const [commConfig, setCommConfig] = useState<VendorCommConfig | null>(null);

  // Simulator state
  const [activeScenarioId, setActiveScenarioId] = useState<string>('airport_vip');
  const [customScenario, setCustomScenario] = useState<SimulationScenario>({
    id: 'custom',
    name: 'Custom Parameter Simulation',
    description: 'Custom trip distance, positioning deadhead, and surcharge configuration',
    icon: '🛠️',
    distance_miles: 25.0,
    is_hourly: false,
    hourly_hours: 3,
    deadhead_miles: 8.0,
    is_airport: true,
    meet_and_greet: true,
    is_rush_hour: false,
    is_late_night: false,
    extra_wait_minutes: 15
  });

  // New vehicle modal state
  const [showAddVehModal, setShowAddVehModal] = useState<boolean>(false);
  const [newVeh, setNewVeh] = useState({
    make: 'Mercedes-Benz',
    model: 'S 580 4MATIC',
    year: 2025,
    license_plate: 'TLC-882190',
    vehicle_class: 'FIRST_CLASS' as VehicleClass,
    passenger_capacity: 3,
    luggage_capacity: 3,
    exterior_color: 'Obsidian Black',
    network_mode: 'GLOBAL_NETWORK_CONNECTED' as NetworkParticipationMode
  });

  const loadVendorData = async (vendorId: string) => {
    setLoading(true);
    try {
      const [vList, rList, ai, inv, comm] = await Promise.all([
        fetchVendors().catch(() => []),
        fetchVendorPricingRules(vendorId).catch(() => []),
        fetchVendorAIYield(vendorId).catch(() => null),
        fetchVendorFleetInventory(vendorId).catch(() => []),
        fetchVendorCommConfig(vendorId).catch(() => null)
      ]);
      setVendors(vList || []);

      const allTiers: VehicleClass[] = ['BUSINESS_SEDAN', 'ELECTRIC_VIP', 'LUXURY_SUV', 'FIRST_CLASS', 'BUSINESS_VAN'];
      const existingClasses = new Set((rList || []).map((r: any) => r.vehicle_class));
      const mergedRules: VendorPricingRule[] = [...(rList || [])];
      
      allTiers.forEach(tier => {
        if (!existingClasses.has(tier)) {
          mergedRules.push({
            vendor_id: vendorId,
            ...DEFAULT_TIER_RULES[tier]
          } as VendorPricingRule);
        }
      });

      setRules(mergedRules);
      
      // Store baseline copy
      const baseMap: Record<string, VendorPricingRule> = {};
      mergedRules.forEach(r => {
        baseMap[r.vehicle_class] = JSON.parse(JSON.stringify(r));
      });
      setBaselineRules(baseMap);

      setSelectedRule(prev => {
        if (prev) {
          const found = mergedRules.find(r => r.vehicle_class === prev.vehicle_class);
          return found || mergedRules[0];
        }
        return mergedRules[0];
      });

      setAiMetrics(ai || {
        vendor_id: vendorId,
        acceptance_rate_pct: 92.4,
        fleet_utilization_pct: 84.1,
        deadhead_recovery_efficiency: 91.8,
        peak_demand_multiplier: 1.15,
        suggested_base_rate: 75.0,
        suggested_per_mile_rate: 4.50,
        suggested_per_km_rate: 2.80,
        historical_trips_analyzed: 412,
        ai_optimization_notes: 'Yield algorithm projects a 14.8% net revenue increase by raising peak airport surge by $10 and deadhead buffers on suburban drop-offs.',
        last_trained_at: new Date().toISOString()
      });

      setInventory(inv || []);
      setCommConfig(comm || {
        vendor_id: vendorId,
        use_global_aws_ses: true,
        custom_smtp_host: '',
        custom_sender_email: 'dispatch@boston-vip.limo',
        custom_twilio_phone: '+1 617 555 0188',
        custom_whatsapp_phone: '+1 617 555 0188'
      });
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadVendorData(selectedVendorId);
  }, [selectedVendorId]);

  const activeVendor = vendors.find(v => v.id === selectedVendorId) || vendors[0];

  const handleSaveRule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRule) return;
    setLoading(true);
    try {
      await saveVendorPricingRule(selectedVendorId, selectedRule);
      setSuccessMsg(`Pricing rule for ${selectedRule.vehicle_class.replace('_', ' ')} successfully saved to database!`);
      setTimeout(() => setSuccessMsg(null), 3500);
      
      // Update baseline with the newly saved rule
      setBaselineRules(prev => ({
        ...prev,
        [selectedRule.vehicle_class]: JSON.parse(JSON.stringify(selectedRule))
      }));

      const updatedRules = await fetchVendorPricingRules(selectedVendorId).catch(() => []);
      if (updatedRules.length > 0) {
        setRules(updatedRules);
      }
    } catch (err: any) {
      alert(err.message || 'Failed to save rule');
    } finally {
      setLoading(false);
    }
  };

  const handleResetToBaseline = () => {
    if (!selectedRule) return;
    const base = baselineRules[selectedRule.vehicle_class];
    if (base) {
      setSelectedRule(JSON.parse(JSON.stringify(base)));
      setSuccessMsg(`Reverted ${selectedRule.vehicle_class.replace('_', ' ')} back to saved database baseline.`);
      setTimeout(() => setSuccessMsg(null), 3000);
    }
  };

  const handleSetCurrentAsBaseline = () => {
    if (!selectedRule) return;
    setBaselineRules(prev => ({
      ...prev,
      [selectedRule.vehicle_class]: JSON.parse(JSON.stringify(selectedRule))
    }));
    setSuccessMsg(`Current draft set as comparison baseline snapshot.`);
    setTimeout(() => setSuccessMsg(null), 3000);
  };

  const handleTrainAI = async () => {
    setLoading(true);
    try {
      const updated = await trainVendorAIYield(selectedVendorId);
      setAiMetrics(updated);
      setSuccessMsg('AI Dynamic Yield model re-trained successfully over live booking conversion logs!');
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err: any) {
      alert(err.message || 'Failed to train AI');
    } finally {
      setLoading(false);
    }
  };

  const handleApplyAI = async () => {
    setLoading(true);
    try {
      const updated = await applyVendorAIYield(selectedVendorId);
      setRules(updated);
      if (updated.length > 0) setSelectedRule(updated[0]);
      setSuccessMsg('AI-optimized yield curves successfully applied across all vehicle tiers!');
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err: any) {
      alert(err.message || 'Failed to apply AI suggestions');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleNetwork = async (vehId: string) => {
    try {
      await toggleVehicleNetworkMode(selectedVendorId, vehId);
      const updatedInv = await fetchVendorFleetInventory(selectedVendorId);
      setInventory(updatedInv);
    } catch (err: any) {
      alert(err.message || 'Failed to toggle mode');
    }
  };

  const handleAddVehicle = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await addVehicleToInventory(selectedVendorId, newVeh);
      setShowAddVehModal(false);
      setSuccessMsg(`Vehicle ${newVeh.make} ${newVeh.model} added to depot inventory!`);
      setTimeout(() => setSuccessMsg(null), 3500);
      const updatedInv = await fetchVendorFleetInventory(selectedVendorId);
      setInventory(updatedInv);
    } catch (err: any) {
      alert(err.message || 'Failed to add vehicle');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveComm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commConfig) return;
    setLoading(true);
    try {
      await saveVendorCommConfig(selectedVendorId, commConfig);
      setSuccessMsg('Communication channels & AWS SES routing saved successfully!');
      setTimeout(() => setSuccessMsg(null), 3500);
    } catch (err: any) {
      alert(err.message || 'Failed to save comm config');
    } finally {
      setLoading(false);
    }
  };

  // Active simulation scenario
  const currentScenario: SimulationScenario = useMemo(() => {
    if (activeScenarioId === 'custom') return customScenario;
    const found = PRESET_SCENARIOS.find(s => s.id === activeScenarioId);
    return found || PRESET_SCENARIOS[0];
  }, [activeScenarioId, customScenario]);

  // Baseline rule for active class
  const activeBaselineRule: VendorPricingRule | null = useMemo(() => {
    if (!selectedRule) return null;
    return baselineRules[selectedRule.vehicle_class] || null;
  }, [selectedRule, baselineRules]);

  // Simulated Quotes
  const baselineQuote = useMemo(() => {
    return computeSimulatedQuote(activeBaselineRule, currentScenario);
  }, [activeBaselineRule, currentScenario]);

  const draftQuote = useMemo(() => {
    return computeSimulatedQuote(selectedRule, currentScenario);
  }, [selectedRule, currentScenario]);

  // Deltas
  const netDelta = draftQuote.netSubtotal - baselineQuote.netSubtotal;
  const netDeltaPct = baselineQuote.netSubtotal > 0 ? (netDelta / baselineQuote.netSubtotal) * 100 : 0;
  const grossDelta = draftQuote.totalGross - baselineQuote.totalGross;
  const grossDeltaPct = baselineQuote.totalGross > 0 ? (grossDelta / baselineQuote.totalGross) * 100 : 0;

  return (
    <div style={{ width: '100%', maxWidth: '100%', margin: 0, padding: 0 }}>
      {/* Header Banner - Executive White Light Luxury */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '16px', width: '100%' }}>
        <div>
          <div className="gold-badge" style={{ marginBottom: '6px' }}>
            <Sliders size={12} /> Autonomous Vendor Operations Console
          </div>
          <h1 style={{ fontSize: '26px', fontWeight: 800, color: '#0F172A', letterSpacing: '-0.02em', margin: 0 }}>
            Vendor Pricing Rules, AI Yield & Fleet Inventory
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginTop: '4px', marginBottom: 0 }}>
            Configure custom pricing models, live quote simulation with baseline comparisons, AI dynamic yield learning, and AWS SES relays.
          </p>
        </div>

        {/* Action Controls */}
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          {!hideVendorSelector && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#FFFFFF', padding: '8px 14px', borderRadius: '10px', border: '1px solid var(--border-subtle)', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
              <Building2 size={15} color="#2563EB" />
              <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)' }}>Operating Vendor:</span>
              <select
                value={selectedVendorId}
                onChange={(e) => setSelectedVendorId(e.target.value)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  fontSize: '13px',
                  fontWeight: 700,
                  color: '#2563EB',
                  cursor: 'pointer',
                  outline: 'none'
                }}
              >
                {vendors.map(v => (
                  <option key={v.id} value={v.id}>{v.name} ({v.office_city || 'USA'})</option>
                ))}
                {vendors.length === 0 && (
                  <option value="vendor-boston-vip">Boston VIP Chauffeur Group LLC</option>
                )}
              </select>
            </div>
          )}

          <button 
            className="btn-secondary" 
            onClick={() => loadVendorData(selectedVendorId)} 
            style={{ fontSize: '13px', padding: '10px 16px', display: 'flex', alignItems: 'center', gap: '6px' }}
            title="Refresh Live Data"
          >
            <RefreshCw size={14} className={loading ? 'pulse-live' : ''} />
            <span>Sync Engine</span>
          </button>
        </div>
      </div>

      {successMsg && (
        <div style={{ background: 'rgba(16, 185, 129, 0.1)', border: '1px solid #10B981', color: '#047857', padding: '12px 18px', borderRadius: '10px', marginBottom: '20px', fontSize: '14px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px', width: '100%' }}>
          <CheckCircle2 size={16} color="#10B981" /> {successMsg}
        </div>
      )}

      {/* Navigation Sub-Tabs */}
      <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid var(--border-subtle)', marginBottom: '24px', overflowX: 'auto', paddingBottom: '4px', width: '100%' }}>
        <button
          onClick={() => setActiveTab('PRICING')}
          style={{
            padding: '10px 18px',
            borderRadius: '8px',
            fontSize: '13px',
            fontWeight: 700,
            cursor: 'pointer',
            border: activeTab === 'PRICING' ? '1px solid #2563EB' : '1px solid transparent',
            background: activeTab === 'PRICING' ? '#EFF6FF' : 'transparent',
            color: activeTab === 'PRICING' ? '#2563EB' : 'var(--text-secondary)',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          <DollarSign size={15} /> Autonomous Pricing Matrix & Simulator
        </button>

        <button
          onClick={() => setActiveTab('AI_YIELD')}
          style={{
            padding: '10px 18px',
            borderRadius: '8px',
            fontSize: '13px',
            fontWeight: 700,
            cursor: 'pointer',
            border: activeTab === 'AI_YIELD' ? '1px solid #2563EB' : '1px solid transparent',
            background: activeTab === 'AI_YIELD' ? '#EFF6FF' : 'transparent',
            color: activeTab === 'AI_YIELD' ? '#2563EB' : 'var(--text-secondary)',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          <Cpu size={15} /> AI Dynamic Yield Optimizer
        </button>

        <button
          onClick={() => setActiveTab('INVENTORY')}
          style={{
            padding: '10px 18px',
            borderRadius: '8px',
            fontSize: '13px',
            fontWeight: 700,
            cursor: 'pointer',
            border: activeTab === 'INVENTORY' ? '1px solid #2563EB' : '1px solid transparent',
            background: activeTab === 'INVENTORY' ? '#EFF6FF' : 'transparent',
            color: activeTab === 'INVENTORY' ? '#2563EB' : 'var(--text-secondary)',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          <Globe size={15} /> Fleet Inventory & Network Partitioning ({inventory.length})
        </button>

        <button
          onClick={() => setActiveTab('COMM')}
          style={{
            padding: '10px 18px',
            borderRadius: '8px',
            fontSize: '13px',
            fontWeight: 700,
            cursor: 'pointer',
            border: activeTab === 'COMM' ? '1px solid #2563EB' : '1px solid transparent',
            background: activeTab === 'COMM' ? '#EFF6FF' : 'transparent',
            color: activeTab === 'COMM' ? '#2563EB' : 'var(--text-secondary)',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          <Mail size={15} /> AWS SES & Communication Routing
        </button>
      </div>

      {/* TAB 1: PRICING RULES MATRIX & INTERACTIVE SIMULATOR */}
      {activeTab === 'PRICING' && (
        <div style={{ display: 'grid', gridTemplateColumns: '300px minmax(0, 1fr)', gap: '24px', width: '100%', alignItems: 'start' }}>
          {/* Vehicle Tier Picker List */}
          <div className="glass-card" style={{ padding: '20px', width: '100%' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '15px', fontWeight: 800, color: '#0F172A', margin: 0 }}>
                Vehicle Tiers & Rates
              </h3>
              <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)' }}>
                {rules.length} Active Tiers
              </span>
            </div>
            
            <div style={{ display: 'grid', gap: '10px' }}>
              {rules.map(r => {
                const isSelected = selectedRule?.vehicle_class === r.vehicle_class;
                return (
                  <div
                    key={r.vehicle_class}
                    onClick={() => setSelectedRule(r)}
                    style={{
                      padding: '14px 16px',
                      borderRadius: '10px',
                      cursor: 'pointer',
                      background: isSelected ? '#EFF6FF' : '#FFFFFF',
                      border: isSelected ? '2px solid #2563EB' : '1px solid var(--border-subtle)',
                      boxShadow: isSelected ? '0 4px 12px rgba(37,99,235,0.12)' : '0 1px 3px rgba(0,0,0,0.02)',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                      <span style={{ fontWeight: 800, color: isSelected ? '#1E40AF' : '#0F172A', fontSize: '14px' }}>
                        {r.vehicle_class.replace('_', ' ')}
                      </span>
                      <span style={{ fontSize: '13px', fontWeight: 800, color: '#2563EB' }}>
                        ${Number(r.base_rate_net).toFixed(2)} Base
                      </span>
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'flex', justifyContent: 'space-between' }}>
                      <span>${Number(r.per_mile_rate_net).toFixed(2)} / mi</span>
                      <span>${Number(r.hourly_rate_net || 95).toFixed(2)} / hr</span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Quick Baseline Snapshot Status */}
            <div style={{ marginTop: '20px', padding: '14px', background: '#F8FAFC', borderRadius: '10px', border: '1px solid var(--border-subtle)' }}>
              <div style={{ fontSize: '12px', fontWeight: 800, color: '#0F172A', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <BookmarkCheck size={14} color="#2563EB" /> Baseline Snapshot
              </div>
              <p style={{ fontSize: '11px', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.4 }}>
                The baseline is loaded from the active database. When you modify values on the right, the simulator below calculates exact real-time quote differences before you save.
              </p>
            </div>
          </div>

          {/* Right Column: Pricing Rule Editor Form + Live Quote Simulator */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', width: '100%' }}>
            {selectedRule && (
              <form onSubmit={handleSaveRule} className="glass-card" style={{ padding: '28px', width: '100%' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
                  <div>
                    <h3 style={{ fontSize: '20px', fontWeight: 800, color: '#0F172A', margin: 0 }}>
                      Tariff Editor: {selectedRule.vehicle_class.replace('_', ' ')}
                    </h3>
                    <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '4px', marginBottom: 0 }}>
                      Adjust your core rates below. Changes will immediately reflect in the Live Quote Simulator below.
                    </p>
                  </div>

                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <button
                      type="button"
                      onClick={handleResetToBaseline}
                      className="btn-secondary"
                      style={{ fontSize: '12px', padding: '8px 14px', display: 'flex', alignItems: 'center', gap: '6px' }}
                      title="Revert input fields to saved baseline"
                    >
                      <RotateCcw size={13} /> Revert to Saved
                    </button>

                    <button
                      type="button"
                      onClick={handleSetCurrentAsBaseline}
                      className="btn-secondary"
                      style={{ fontSize: '12px', padding: '8px 14px', display: 'flex', alignItems: 'center', gap: '6px' }}
                      title="Lock current numbers as baseline"
                    >
                      <BookmarkCheck size={13} /> Set as Baseline
                    </button>

                    <div className="gold-badge" style={{ fontSize: '12px', padding: '6px 14px' }}>
                      {selectedRule.currency} ({selectedRule.distance_unit})
                    </div>
                  </div>
                </div>

                {/* Core Mileage & Base Rates Section */}
                <div style={{ marginBottom: '24px' }}>
                  <h4 style={{ fontSize: '13px', fontWeight: 800, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '12px' }}>
                    1. Core Dispatch & Mileage Rates
                  </h4>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
                    <div>
                      <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                        BASE DISPATCH FARE ({selectedRule.currency}) *
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        required
                        value={selectedRule.base_rate_net}
                        onChange={(e) => setSelectedRule({ ...selectedRule, base_rate_net: parseFloat(e.target.value) || 0 })}
                        style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', fontSize: '14px', border: '1px solid var(--border-subtle)' }}
                      />
                    </div>

                    <div>
                      <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                        RATE PER STATUTE MILE ({selectedRule.currency}) *
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        required
                        value={selectedRule.per_mile_rate_net}
                        onChange={(e) => {
                          const mi = parseFloat(e.target.value) || 0;
                          setSelectedRule({ 
                            ...selectedRule, 
                            per_mile_rate_net: mi,
                            per_km_rate_net: parseFloat((mi / 1.60934).toFixed(2)),
                            deadhead_rate_per_km: parseFloat(((selectedRule.deadhead_rate_per_mile || 2.5) / 1.60934).toFixed(2))
                          });
                        }}
                        style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', fontSize: '14px', border: '1px solid var(--border-subtle)' }}
                      />
                    </div>

                    <div>
                      <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                        RATE PER KILOMETER ({selectedRule.currency}) *
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        required
                        value={selectedRule.per_km_rate_net}
                        onChange={(e) => setSelectedRule({ ...selectedRule, per_km_rate_net: parseFloat(e.target.value) || 0 })}
                        style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', fontSize: '14px', border: '1px solid var(--border-subtle)' }}
                      />
                    </div>

                    <div>
                      <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                        HOURLY AS-DIRECTED ({selectedRule.currency}/HR) *
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        required
                        value={selectedRule.hourly_rate_net || 0}
                        onChange={(e) => setSelectedRule({ ...selectedRule, hourly_rate_net: parseFloat(e.target.value) || 0 })}
                        style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', fontSize: '14px', border: '1px solid var(--border-subtle)' }}
                      />
                    </div>

                    <div>
                      <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                        DEPOT DEADHEAD STAGING ({selectedRule.currency}/MI)
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={selectedRule.deadhead_rate_per_mile}
                        onChange={(e) => {
                          const dh = parseFloat(e.target.value) || 0;
                          setSelectedRule({ 
                            ...selectedRule, 
                            deadhead_rate_per_mile: dh,
                            deadhead_rate_per_km: parseFloat((dh / 1.60934).toFixed(2))
                          });
                        }}
                        style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', fontSize: '14px', border: '1px solid var(--border-subtle)' }}
                      />
                    </div>

                    <div>
                      <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                        MINIMUM TRIP FLOOR ({selectedRule.currency})
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={selectedRule.minimum_fare_net || 0}
                        onChange={(e) => setSelectedRule({ ...selectedRule, minimum_fare_net: parseFloat(e.target.value) || 0 })}
                        style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', fontSize: '14px', border: '1px solid var(--border-subtle)' }}
                      />
                    </div>
                  </div>
                </div>

                {/* Surcharges & Accessorial Fees Section */}
                <div style={{ marginBottom: '24px' }}>
                  <h4 style={{ fontSize: '13px', fontWeight: 800, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '12px' }}>
                    2. Surcharges & Accessorial Fees
                  </h4>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
                    <div>
                      <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                        AIRPORT / FBO SURCHARGE ({selectedRule.currency})
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={selectedRule.airport_surcharge_net || 0}
                        onChange={(e) => setSelectedRule({ ...selectedRule, airport_surcharge_net: parseFloat(e.target.value) || 0 })}
                        style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', fontSize: '14px', border: '1px solid var(--border-subtle)' }}
                      />
                    </div>

                    <div>
                      <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                        MEET & GREET PLACARD ({selectedRule.currency})
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={selectedRule.meet_and_greet_fee_net || 0}
                        onChange={(e) => setSelectedRule({ ...selectedRule, meet_and_greet_fee_net: parseFloat(e.target.value) || 0 })}
                        style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', fontSize: '14px', border: '1px solid var(--border-subtle)' }}
                      />
                    </div>

                    <div>
                      <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                        RUSH HOUR SURCHARGE ({selectedRule.currency})
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={selectedRule.rush_hour_surcharge_net || 0}
                        onChange={(e) => setSelectedRule({ ...selectedRule, rush_hour_surcharge_net: parseFloat(e.target.value) || 0 })}
                        style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', fontSize: '14px', border: '1px solid var(--border-subtle)' }}
                      />
                    </div>

                    <div>
                      <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                        LATE NIGHT / EARLY MORNING ({selectedRule.currency})
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={selectedRule.late_night_surcharge_net || 0}
                        onChange={(e) => setSelectedRule({ ...selectedRule, late_night_surcharge_net: parseFloat(e.target.value) || 0 })}
                        style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', fontSize: '14px', border: '1px solid var(--border-subtle)' }}
                      />
                    </div>

                    <div>
                      <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                        FREE COMPLIMENTARY WAIT (MINS)
                      </label>
                      <input
                        type="number"
                        step="1"
                        value={selectedRule.free_wait_minutes || 15}
                        onChange={(e) => setSelectedRule({ ...selectedRule, free_wait_minutes: parseInt(e.target.value) || 0 })}
                        style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', fontSize: '14px', border: '1px solid var(--border-subtle)' }}
                      />
                    </div>

                    <div>
                      <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                        EXTRA WAIT RATE ({selectedRule.currency}/MIN)
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={selectedRule.wait_minute_rate_net || 1.0}
                        onChange={(e) => setSelectedRule({ ...selectedRule, wait_minute_rate_net: parseFloat(e.target.value) || 0 })}
                        style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', fontSize: '14px', border: '1px solid var(--border-subtle)' }}
                      />
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', borderTop: '1px solid var(--border-subtle)', paddingTop: '20px' }}>
                  <button type="submit" disabled={loading} className="btn-primary" style={{ padding: '12px 28px', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <ShieldCheck size={18} /> Save & Apply {selectedRule.vehicle_class.replace('_', ' ')} Tariff
                  </button>
                </div>
              </form>
            )}

            {/* LIVE QUOTE SIMULATION & BASELINE COMPARISON SUITE */}
            <div className="glass-card" style={{ padding: '28px', width: '100%', background: '#FFFFFF', border: '1px solid #BFDBFE' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                    <span style={{ background: '#EFF6FF', color: '#1D4ED8', padding: '4px 10px', borderRadius: '6px', fontSize: '12px', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Calculator size={14} /> LIVE QUOTE SIMULATOR
                    </span>
                    <span className="gold-badge" style={{ fontSize: '11px' }}>
                      {selectedRule?.vehicle_class.replace('_', ' ')}
                    </span>
                  </div>
                  <h3 style={{ fontSize: '20px', fontWeight: 800, color: '#0F172A', margin: 0 }}>
                    Tariff Impact & Baseline Quote Comparison
                  </h3>
                  <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '4px', marginBottom: 0 }}>
                    Simulate realistic trip quotes in real-time. Compare your <strong>Current Saved Baseline</strong> against your <strong>New Tariff Changes</strong>.
                  </p>
                </div>

                {/* KPI Summary Variance Cards */}
                <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                  <div style={{ 
                    padding: '12px 18px', 
                    borderRadius: '10px', 
                    background: netDelta > 0 ? '#ECFDF5' : (netDelta < 0 ? '#FEF2F2' : '#F8FAFC'),
                    border: netDelta > 0 ? '1px solid #A7F3D0' : (netDelta < 0 ? '1px solid #FECACA' : '1px solid var(--border-subtle)'),
                    minWidth: '170px'
                  }}>
                    <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-secondary)' }}>NET VENDOR PAYOUT $\Delta$</div>
                    <div style={{ fontSize: '18px', fontWeight: 800, color: netDelta > 0 ? '#059669' : (netDelta < 0 ? '#DC2626' : '#475569'), display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
                      {netDelta > 0 && <ArrowUpRight size={18} />}
                      {netDelta < 0 && <ArrowDownRight size={18} />}
                      {netDelta === 0 && <Equal size={16} />}
                      {netDelta >= 0 ? `+$${netDelta.toFixed(2)}` : `-$${Math.abs(netDelta).toFixed(2)}`}
                      <span style={{ fontSize: '12px', fontWeight: 700, marginLeft: '4px' }}>
                        ({netDeltaPct >= 0 ? `+${netDeltaPct.toFixed(1)}%` : `${netDeltaPct.toFixed(1)}%`})
                      </span>
                    </div>
                  </div>

                  <div style={{ 
                    padding: '12px 18px', 
                    borderRadius: '10px', 
                    background: grossDelta > 0 ? '#EFF6FF' : (grossDelta < 0 ? '#FFFBEB' : '#F8FAFC'),
                    border: grossDelta > 0 ? '1px solid #BFDBFE' : (grossDelta < 0 ? '1px solid #FDE68A' : '1px solid var(--border-subtle)'),
                    minWidth: '170px'
                  }}>
                    <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-secondary)' }}>CUSTOMER GROSS QUOTE $\Delta$</div>
                    <div style={{ fontSize: '18px', fontWeight: 800, color: grossDelta > 0 ? '#2563EB' : (grossDelta < 0 ? '#D97706' : '#475569'), display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
                      {grossDelta >= 0 ? `+$${grossDelta.toFixed(2)}` : `-$${Math.abs(grossDelta).toFixed(2)}`}
                      <span style={{ fontSize: '12px', fontWeight: 700, marginLeft: '4px' }}>
                        ({grossDeltaPct >= 0 ? `+${grossDeltaPct.toFixed(1)}%` : `${grossDeltaPct.toFixed(1)}%`})
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Scenario Presets Bar */}
              <div style={{ marginBottom: '20px' }}>
                <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '8px' }}>
                  SELECT BENCHMARK TRIP SCENARIO:
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '10px' }}>
                  {PRESET_SCENARIOS.map(s => {
                    const isSelected = activeScenarioId === s.id;
                    return (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => setActiveScenarioId(s.id)}
                        style={{
                          padding: '12px',
                          borderRadius: '10px',
                          textAlign: 'left',
                          cursor: 'pointer',
                          background: isSelected ? '#EFF6FF' : '#F8FAFC',
                          border: isSelected ? '2px solid #2563EB' : '1px solid var(--border-subtle)',
                          transition: 'all 0.15s ease'
                        }}
                      >
                        <div style={{ fontSize: '16px', marginBottom: '4px' }}>{s.icon}</div>
                        <div style={{ fontSize: '13px', fontWeight: 800, color: isSelected ? '#1E40AF' : '#0F172A', marginBottom: '2px' }}>
                          {s.name}
                        </div>
                        <div style={{ fontSize: '11px', color: 'var(--text-secondary)', lineHeight: 1.3 }}>
                          {s.description}
                        </div>
                      </button>
                    );
                  })}

                  <button
                    type="button"
                    onClick={() => setActiveScenarioId('custom')}
                    style={{
                      padding: '12px',
                      borderRadius: '10px',
                      textAlign: 'left',
                      cursor: 'pointer',
                      background: activeScenarioId === 'custom' ? '#EFF6FF' : '#F8FAFC',
                      border: activeScenarioId === 'custom' ? '2px solid #2563EB' : '1px solid var(--border-subtle)',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <div style={{ fontSize: '16px', marginBottom: '4px' }}>🛠️</div>
                    <div style={{ fontSize: '13px', fontWeight: 800, color: activeScenarioId === 'custom' ? '#1E40AF' : '#0F172A', marginBottom: '2px' }}>
                      Custom Trip Builder
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--text-secondary)', lineHeight: 1.3 }}>
                      Adjust distance, deadhead, hours & accessorial surcharges
                    </div>
                  </button>
                </div>
              </div>

              {/* Custom Parameter Adjuster Panel (if Custom selected) */}
              {activeScenarioId === 'custom' && (
                <div style={{ background: '#F8FAFC', border: '1px solid var(--border-subtle)', borderRadius: '12px', padding: '18px', marginBottom: '20px' }}>
                  <div style={{ fontSize: '13px', fontWeight: 800, color: '#0F172A', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Sliders size={14} color="#2563EB" /> Customize Trip Parameters
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '14px', alignItems: 'center' }}>
                    <div>
                      <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                        DISTANCE (MILES)
                      </label>
                      <input
                        type="number"
                        step="0.5"
                        value={customScenario.distance_miles}
                        onChange={(e) => setCustomScenario({ ...customScenario, distance_miles: parseFloat(e.target.value) || 0 })}
                        style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', fontSize: '13px', border: '1px solid var(--border-subtle)' }}
                      />
                    </div>

                    <div>
                      <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                        DEADHEAD STAGING (MI)
                      </label>
                      <input
                        type="number"
                        step="0.5"
                        value={customScenario.deadhead_miles}
                        onChange={(e) => setCustomScenario({ ...customScenario, deadhead_miles: parseFloat(e.target.value) || 0 })}
                        style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', fontSize: '13px', border: '1px solid var(--border-subtle)' }}
                      />
                    </div>

                    <div>
                      <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                        EXTRA WAIT (MINUTES)
                      </label>
                      <input
                        type="number"
                        step="5"
                        value={customScenario.extra_wait_minutes}
                        onChange={(e) => setCustomScenario({ ...customScenario, extra_wait_minutes: parseInt(e.target.value) || 0 })}
                        style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', fontSize: '13px', border: '1px solid var(--border-subtle)' }}
                      />
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: 700, cursor: 'pointer' }}>
                        <input
                          type="checkbox"
                          checked={customScenario.is_airport}
                          onChange={(e) => setCustomScenario({ ...customScenario, is_airport: e.target.checked })}
                        />
                        Airport Pickup
                      </label>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: 700, cursor: 'pointer' }}>
                        <input
                          type="checkbox"
                          checked={customScenario.meet_and_greet}
                          onChange={(e) => setCustomScenario({ ...customScenario, meet_and_greet: e.target.checked })}
                        />
                        Meet & Greet
                      </label>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: 700, cursor: 'pointer' }}>
                        <input
                          type="checkbox"
                          checked={customScenario.is_rush_hour}
                          onChange={(e) => setCustomScenario({ ...customScenario, is_rush_hour: e.target.checked })}
                        />
                        Rush Hour Peak
                      </label>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: 700, cursor: 'pointer' }}>
                        <input
                          type="checkbox"
                          checked={customScenario.is_late_night}
                          onChange={(e) => setCustomScenario({ ...customScenario, is_late_night: e.target.checked })}
                        />
                        Late Night Mission
                      </label>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: 700, cursor: 'pointer' }}>
                        <input
                          type="checkbox"
                          checked={customScenario.is_hourly}
                          onChange={(e) => setCustomScenario({ ...customScenario, is_hourly: e.target.checked })}
                        />
                        Hourly As-Directed
                      </label>
                      {customScenario.is_hourly && (
                        <input
                          type="number"
                          step="1"
                          placeholder="Hours"
                          value={customScenario.hourly_hours}
                          onChange={(e) => setCustomScenario({ ...customScenario, hourly_hours: parseInt(e.target.value) || 2 })}
                          style={{ width: '80px', padding: '4px 8px', borderRadius: '4px', fontSize: '12px', border: '1px solid var(--border-subtle)' }}
                        />
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Side-by-Side Live Quote Comparison Table */}
              <div style={{ overflowX: 'auto', borderRadius: '10px', border: '1px solid var(--border-subtle)' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'left' }}>
                  <thead>
                    <tr style={{ background: '#F8FAFC', borderBottom: '2px solid var(--border-subtle)' }}>
                      <th style={{ padding: '12px 16px', fontWeight: 800, color: '#475569' }}>FARE LINE ITEM BREAKDOWN</th>
                      <th style={{ padding: '12px 16px', fontWeight: 800, color: '#64748B', width: '22%' }}>
                        SAVED BASELINE (DB)
                      </th>
                      <th style={{ padding: '12px 16px', fontWeight: 800, color: '#2563EB', width: '22%' }}>
                        SIMULATED DRAFT (NEW)
                      </th>
                      <th style={{ padding: '12px 16px', fontWeight: 800, color: '#0F172A', width: '20%' }}>
                        IMPACT VARIANCE ($\Delta$)
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {!currentScenario.is_hourly && (
                      <tr style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                        <td style={{ padding: '10px 16px', color: '#0F172A' }}>Base Dispatch Fare</td>
                        <td style={{ padding: '10px 16px', color: '#64748B' }}>${baselineQuote.baseFare.toFixed(2)}</td>
                        <td style={{ padding: '10px 16px', fontWeight: 700, color: '#0F172A' }}>${draftQuote.baseFare.toFixed(2)}</td>
                        <td style={{ padding: '10px 16px', fontWeight: 700, color: draftQuote.baseFare >= baselineQuote.baseFare ? '#059669' : '#DC2626' }}>
                          {draftQuote.baseFare >= baselineQuote.baseFare ? `+$${(draftQuote.baseFare - baselineQuote.baseFare).toFixed(2)}` : `-$${Math.abs(draftQuote.baseFare - baselineQuote.baseFare).toFixed(2)}`}
                        </td>
                      </tr>
                    )}

                    {!currentScenario.is_hourly && (
                      <tr style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                        <td style={{ padding: '10px 16px', color: '#0F172A' }}>
                          Distance Charge ({currentScenario.distance_miles} miles)
                        </td>
                        <td style={{ padding: '10px 16px', color: '#64748B' }}>${baselineQuote.distanceCharge.toFixed(2)}</td>
                        <td style={{ padding: '10px 16px', fontWeight: 700, color: '#0F172A' }}>${draftQuote.distanceCharge.toFixed(2)}</td>
                        <td style={{ padding: '10px 16px', fontWeight: 700, color: draftQuote.distanceCharge >= baselineQuote.distanceCharge ? '#059669' : '#DC2626' }}>
                          {draftQuote.distanceCharge >= baselineQuote.distanceCharge ? `+$${(draftQuote.distanceCharge - baselineQuote.distanceCharge).toFixed(2)}` : `-$${Math.abs(draftQuote.distanceCharge - baselineQuote.distanceCharge).toFixed(2)}`}
                        </td>
                      </tr>
                    )}

                    {currentScenario.is_hourly && (
                      <tr style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                        <td style={{ padding: '10px 16px', color: '#0F172A' }}>
                          Hourly As-Directed ({currentScenario.hourly_hours} Hours)
                        </td>
                        <td style={{ padding: '10px 16px', color: '#64748B' }}>${baselineQuote.hourlyCharge.toFixed(2)}</td>
                        <td style={{ padding: '10px 16px', fontWeight: 700, color: '#0F172A' }}>${draftQuote.hourlyCharge.toFixed(2)}</td>
                        <td style={{ padding: '10px 16px', fontWeight: 700, color: draftQuote.hourlyCharge >= baselineQuote.hourlyCharge ? '#059669' : '#DC2626' }}>
                          {draftQuote.hourlyCharge >= baselineQuote.hourlyCharge ? `+$${(draftQuote.hourlyCharge - baselineQuote.hourlyCharge).toFixed(2)}` : `-$${Math.abs(draftQuote.hourlyCharge - baselineQuote.hourlyCharge).toFixed(2)}`}
                        </td>
                      </tr>
                    )}

                    <tr style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                      <td style={{ padding: '10px 16px', color: '#0F172A' }}>
                        Deadhead Staging Recovery ({currentScenario.deadhead_miles} miles)
                      </td>
                      <td style={{ padding: '10px 16px', color: '#64748B' }}>${baselineQuote.deadheadCharge.toFixed(2)}</td>
                      <td style={{ padding: '10px 16px', fontWeight: 700, color: '#0F172A' }}>${draftQuote.deadheadCharge.toFixed(2)}</td>
                      <td style={{ padding: '10px 16px', fontWeight: 700, color: draftQuote.deadheadCharge >= baselineQuote.deadheadCharge ? '#059669' : '#DC2626' }}>
                        {draftQuote.deadheadCharge >= baselineQuote.deadheadCharge ? `+$${(draftQuote.deadheadCharge - baselineQuote.deadheadCharge).toFixed(2)}` : `-$${Math.abs(draftQuote.deadheadCharge - baselineQuote.deadheadCharge).toFixed(2)}`}
                      </td>
                    </tr>

                    {currentScenario.is_airport && (
                      <tr style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                        <td style={{ padding: '10px 16px', color: '#0F172A' }}>Airport / FBO Surcharge</td>
                        <td style={{ padding: '10px 16px', color: '#64748B' }}>${baselineQuote.airportFee.toFixed(2)}</td>
                        <td style={{ padding: '10px 16px', fontWeight: 700, color: '#0F172A' }}>${draftQuote.airportFee.toFixed(2)}</td>
                        <td style={{ padding: '10px 16px', fontWeight: 700, color: draftQuote.airportFee >= baselineQuote.airportFee ? '#059669' : '#DC2626' }}>
                          {draftQuote.airportFee >= baselineQuote.airportFee ? `+$${(draftQuote.airportFee - baselineQuote.airportFee).toFixed(2)}` : `-$${Math.abs(draftQuote.airportFee - baselineQuote.airportFee).toFixed(2)}`}
                        </td>
                      </tr>
                    )}

                    {currentScenario.meet_and_greet && (
                      <tr style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                        <td style={{ padding: '10px 16px', color: '#0F172A' }}>Meet & Greet Placard Surcharge</td>
                        <td style={{ padding: '10px 16px', color: '#64748B' }}>${baselineQuote.meetGreetFee.toFixed(2)}</td>
                        <td style={{ padding: '10px 16px', fontWeight: 700, color: '#0F172A' }}>${draftQuote.meetGreetFee.toFixed(2)}</td>
                        <td style={{ padding: '10px 16px', fontWeight: 700, color: draftQuote.meetGreetFee >= baselineQuote.meetGreetFee ? '#059669' : '#DC2626' }}>
                          {draftQuote.meetGreetFee >= baselineQuote.meetGreetFee ? `+$${(draftQuote.meetGreetFee - baselineQuote.meetGreetFee).toFixed(2)}` : `-$${Math.abs(draftQuote.meetGreetFee - baselineQuote.meetGreetFee).toFixed(2)}`}
                        </td>
                      </tr>
                    )}

                    {currentScenario.is_rush_hour && (
                      <tr style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                        <td style={{ padding: '10px 16px', color: '#0F172A' }}>Rush Hour Congestion Surcharge</td>
                        <td style={{ padding: '10px 16px', color: '#64748B' }}>${baselineQuote.rushHourFee.toFixed(2)}</td>
                        <td style={{ padding: '10px 16px', fontWeight: 700, color: '#0F172A' }}>${draftQuote.rushHourFee.toFixed(2)}</td>
                        <td style={{ padding: '10px 16px', fontWeight: 700, color: draftQuote.rushHourFee >= baselineQuote.rushHourFee ? '#059669' : '#DC2626' }}>
                          {draftQuote.rushHourFee >= baselineQuote.rushHourFee ? `+$${(draftQuote.rushHourFee - baselineQuote.rushHourFee).toFixed(2)}` : `-$${Math.abs(draftQuote.rushHourFee - baselineQuote.rushHourFee).toFixed(2)}`}
                        </td>
                      </tr>
                    )}

                    {currentScenario.is_late_night && (
                      <tr style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                        <td style={{ padding: '10px 16px', color: '#0F172A' }}>Late Night / Early Morning Surcharge</td>
                        <td style={{ padding: '10px 16px', color: '#64748B' }}>${baselineQuote.lateNightFee.toFixed(2)}</td>
                        <td style={{ padding: '10px 16px', fontWeight: 700, color: '#0F172A' }}>${draftQuote.lateNightFee.toFixed(2)}</td>
                        <td style={{ padding: '10px 16px', fontWeight: 700, color: draftQuote.lateNightFee >= baselineQuote.lateNightFee ? '#059669' : '#DC2626' }}>
                          {draftQuote.lateNightFee >= baselineQuote.lateNightFee ? `+$${(draftQuote.lateNightFee - baselineQuote.lateNightFee).toFixed(2)}` : `-$${Math.abs(draftQuote.lateNightFee - baselineQuote.lateNightFee).toFixed(2)}`}
                        </td>
                      </tr>
                    )}

                    {currentScenario.extra_wait_minutes > 0 && (
                      <tr style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                        <td style={{ padding: '10px 16px', color: '#0F172A' }}>
                          Extra Wait Time ({currentScenario.extra_wait_minutes} mins)
                        </td>
                        <td style={{ padding: '10px 16px', color: '#64748B' }}>${baselineQuote.waitFee.toFixed(2)}</td>
                        <td style={{ padding: '10px 16px', fontWeight: 700, color: '#0F172A' }}>${draftQuote.waitFee.toFixed(2)}</td>
                        <td style={{ padding: '10px 16px', fontWeight: 700, color: draftQuote.waitFee >= baselineQuote.waitFee ? '#059669' : '#DC2626' }}>
                          {draftQuote.waitFee >= baselineQuote.waitFee ? `+$${(draftQuote.waitFee - baselineQuote.waitFee).toFixed(2)}` : `-$${Math.abs(draftQuote.waitFee - baselineQuote.waitFee).toFixed(2)}`}
                        </td>
                      </tr>
                    )}

                    {/* NET VENDOR PAYOUT SUBTOTAL ROW */}
                    <tr style={{ background: '#F8FAFC', borderTop: '2px solid var(--border-subtle)', borderBottom: '1px solid var(--border-subtle)' }}>
                      <td style={{ padding: '12px 16px', fontWeight: 800, color: '#0F172A' }}>
                        NET VENDOR DISPATCH PAYOUT
                        {draftQuote.floorApplied && <span style={{ marginLeft: '8px', fontSize: '10px', background: '#FEF3C7', color: '#92400E', padding: '2px 6px', borderRadius: '4px' }}>Minimum Fare Floor Applied</span>}
                      </td>
                      <td style={{ padding: '12px 16px', fontWeight: 800, color: '#64748B' }}>
                        ${baselineQuote.netSubtotal.toFixed(2)}
                      </td>
                      <td style={{ padding: '12px 16px', fontWeight: 800, color: '#2563EB', fontSize: '15px' }}>
                        ${draftQuote.netSubtotal.toFixed(2)}
                      </td>
                      <td style={{ padding: '12px 16px', fontWeight: 800, color: netDelta >= 0 ? '#059669' : '#DC2626', fontSize: '14px' }}>
                        {netDelta >= 0 ? `+$${netDelta.toFixed(2)}` : `-$${Math.abs(netDelta).toFixed(2)}`} ({netDeltaPct >= 0 ? `+${netDeltaPct.toFixed(1)}%` : `${netDeltaPct.toFixed(1)}%`})
                      </td>
                    </tr>

                    {/* Tax Row */}
                    <tr style={{ borderBottom: '1px solid var(--border-subtle)', fontSize: '12px' }}>
                      <td style={{ padding: '8px 16px', color: 'var(--text-secondary)' }}>Statutory Sales Tax / VAT</td>
                      <td style={{ padding: '8px 16px', color: '#64748B' }}>${baselineQuote.taxAmount.toFixed(2)}</td>
                      <td style={{ padding: '8px 16px', color: '#0F172A' }}>${draftQuote.taxAmount.toFixed(2)}</td>
                      <td style={{ padding: '8px 16px', color: '#64748B' }}>${(draftQuote.taxAmount - baselineQuote.taxAmount).toFixed(2)}</td>
                    </tr>

                    {/* Chauffeur Gratuity Row */}
                    <tr style={{ borderBottom: '2px solid #BFDBFE', fontSize: '12px' }}>
                      <td style={{ padding: '8px 16px', color: 'var(--text-secondary)' }}>Standard Chauffeur Gratuity (20%)</td>
                      <td style={{ padding: '8px 16px', color: '#64748B' }}>${baselineQuote.gratuityAmount.toFixed(2)}</td>
                      <td style={{ padding: '8px 16px', color: '#0F172A' }}>${draftQuote.gratuityAmount.toFixed(2)}</td>
                      <td style={{ padding: '8px 16px', color: '#64748B' }}>${(draftQuote.gratuityAmount - baselineQuote.gratuityAmount).toFixed(2)}</td>
                    </tr>

                    {/* TOTAL FINAL CUSTOMER GROSS ROW */}
                    <tr style={{ background: '#EFF6FF' }}>
                      <td style={{ padding: '14px 16px', fontWeight: 800, color: '#1E40AF', fontSize: '15px' }}>
                        FINAL CUSTOMER GROSS FARE
                      </td>
                      <td style={{ padding: '14px 16px', fontWeight: 800, color: '#64748B', fontSize: '15px' }}>
                        ${baselineQuote.totalGross.toFixed(2)}
                      </td>
                      <td style={{ padding: '14px 16px', fontWeight: 800, color: '#1E40AF', fontSize: '17px' }}>
                        ${draftQuote.totalGross.toFixed(2)}
                      </td>
                      <td style={{ padding: '14px 16px', fontWeight: 800, color: grossDelta >= 0 ? '#2563EB' : '#D97706', fontSize: '15px' }}>
                        {grossDelta >= 0 ? `+$${grossDelta.toFixed(2)}` : `-$${Math.abs(grossDelta).toFixed(2)}`} ({grossDeltaPct >= 0 ? `+${grossDeltaPct.toFixed(1)}%` : `${grossDeltaPct.toFixed(1)}%`})
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: AI DYNAMIC YIELD OPTIMIZER */}
      {activeTab === 'AI_YIELD' && aiMetrics && (
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 380px', gap: '24px', width: '100%', alignItems: 'start' }}>
          <div className="glass-card" style={{ padding: '28px', width: '100%' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
              <div>
                <div className="gold-badge" style={{ marginBottom: '6px' }}>
                  <TrendingUp size={12} /> Neural Booking Yield Optimizer
                </div>
                <h3 style={{ fontSize: '20px', fontWeight: 800, color: '#0F172A', margin: 0 }}>
                  Continuous Pricing Intelligence & Learning Engine
                </h3>
              </div>

              <button className="btn-primary" onClick={handleTrainAI} disabled={loading} style={{ fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Zap size={14} /> Re-Train Model on Daily Bookings
              </button>
            </div>

            <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginBottom: '24px', lineHeight: 1.6 }}>
              The system analyzes historical quote acceptance rates, deadhead positioning recovery, driver idle times, and peak demand corridors for <strong>{activeVendor?.name || 'Sovereign Fleet'}</strong> to compute optimal dynamic pricing multipliers that maximize gross margin without lowering conversion.
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '24px' }}>
              <div style={{ background: '#F8FAFC', border: '1px solid var(--border-subtle)', borderRadius: '12px', padding: '18px' }}>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 700 }}>QUOTE ACCEPTANCE RATE</div>
                <div style={{ fontSize: '26px', fontWeight: 800, color: '#10B981', marginTop: '4px' }}>
                  {aiMetrics.acceptance_rate_pct.toFixed(1)}%
                </div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>Above network average (88%)</div>
              </div>

              <div style={{ background: '#F8FAFC', border: '1px solid var(--border-subtle)', borderRadius: '12px', padding: '18px' }}>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 700 }}>FLEET UTILIZATION</div>
                <div style={{ fontSize: '26px', fontWeight: 800, color: '#2563EB', marginTop: '4px' }}>
                  {aiMetrics.fleet_utilization_pct.toFixed(1)}%
                </div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>Optimal efficiency window</div>
              </div>

              <div style={{ background: '#F8FAFC', border: '1px solid var(--border-subtle)', borderRadius: '12px', padding: '18px' }}>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 700 }}>DEADHEAD RECOVERY</div>
                <div style={{ fontSize: '26px', fontWeight: 800, color: 'var(--accent-gold)', marginTop: '4px' }}>
                  {aiMetrics.deadhead_recovery_efficiency.toFixed(1)}%
                </div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>Depot staging margin protected</div>
              </div>
            </div>

            <div style={{ background: '#EFF6FF', border: '1px solid #BFDBFE', borderRadius: '12px', padding: '20px' }}>
              <div style={{ fontSize: '13px', fontWeight: 800, color: '#1E40AF', marginBottom: '6px' }}>
                🧠 AI TELEMETRY ANALYSIS & DIAGNOSTICS:
              </div>
              <div style={{ fontSize: '13px', color: '#1E3A8A', lineHeight: 1.5 }}>
                {aiMetrics.ai_optimization_notes}
              </div>
              <div style={{ fontSize: '11px', color: '#6B7280', marginTop: '10px' }}>
                Based on {aiMetrics.historical_trips_analyzed} historical booking transactions analyzed at {new Date(aiMetrics.last_trained_at).toLocaleTimeString()} UTC.
              </div>
            </div>
          </div>

          {/* AI Rate Recommendations Card */}
          <div className="glass-card" style={{ padding: '24px', width: '100%' }}>
            <h4 style={{ fontSize: '16px', fontWeight: 800, color: '#0F172A', marginBottom: '16px' }}>
              Recommended Rate Adjustments
            </h4>

            <div style={{ display: 'grid', gap: '14px', marginBottom: '24px', fontSize: '13px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '8px', borderBottom: '1px solid var(--border-subtle)' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Suggested Base Fare:</span>
                <strong style={{ color: '#0F172A' }}>${Number(aiMetrics.suggested_base_rate).toFixed(2)}</strong>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '8px', borderBottom: '1px solid var(--border-subtle)' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Suggested Per-Mile Rate:</span>
                <strong style={{ color: '#0F172A' }}>${Number(aiMetrics.suggested_per_mile_rate).toFixed(2)} / mi</strong>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '8px', borderBottom: '1px solid var(--border-subtle)' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Suggested Per-KM Rate:</span>
                <strong style={{ color: '#0F172A' }}>${Number(aiMetrics.suggested_per_km_rate).toFixed(2)} / km</strong>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '8px', borderBottom: '1px solid var(--border-subtle)' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Demand Multiplier:</span>
                <span style={{ fontWeight: 800, color: '#2563EB' }}>{aiMetrics.peak_demand_multiplier}x</span>
              </div>
            </div>

            <button
              className="btn-gold"
              onClick={handleApplyAI}
              disabled={loading}
              style={{ width: '100%', padding: '14px', fontSize: '14px', fontWeight: 800 }}
            >
              Apply AI Dynamic Rates to Catalog
            </button>
          </div>
        </div>
      )}

      {/* TAB 3: FLEET INVENTORY & NETWORK PARTITIONING */}
      {activeTab === 'INVENTORY' && (
        <div className="glass-card" style={{ padding: '28px', width: '100%' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
            <div>
              <h3 style={{ fontSize: '20px', fontWeight: 800, color: '#0F172A', margin: 0 }}>
                Executive Vehicle Fleet & Network Allocation
              </h3>
              <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '4px', marginBottom: 0 }}>
                Select which executive vehicles connect to the <strong>Global Autonomous Network 🌐</strong> for cross-border multi-modal itineraries, and which stay dedicated to your <strong>Local Private Fleet 🔒</strong>.
              </p>
            </div>

            <button className="btn-primary" onClick={() => setShowAddVehModal(true)} style={{ fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Plus size={15} /> Add Vehicle to Fleet
            </button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '18px', width: '100%' }}>
            {inventory.map(veh => {
              const isGlobal = veh.network_mode === 'GLOBAL_NETWORK_CONNECTED';
              return (
                <div 
                  key={veh.id} 
                  style={{ 
                    background: '#FFFFFF', 
                    border: isGlobal ? '1px solid #2563EB' : '1px solid var(--border-subtle)', 
                    borderRadius: '12px', 
                    padding: '20px',
                    boxShadow: isGlobal ? '0 4px 12px rgba(37,99,235,0.08)' : '0 1px 3px rgba(0,0,0,0.02)'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                    <div>
                      <div style={{ fontWeight: 800, color: '#0F172A', fontSize: '16px' }}>
                        {veh.make} {veh.model}
                      </div>
                      <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                        {veh.year} · Plate: <strong>{veh.license_plate}</strong>
                      </div>
                    </div>

                    <span className="gold-badge" style={{ fontSize: '10px' }}>
                      {veh.vehicle_class}
                    </span>
                  </div>

                  <div style={{ display: 'flex', gap: '16px', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '16px' }}>
                    <span>👥 {veh.passenger_capacity} Passengers</span>
                    <span>🧳 {veh.luggage_capacity} Luggage Bags</span>
                  </div>

                  {/* Network Participation Toggle Switch */}
                  <div style={{
                    background: isGlobal ? '#EFF6FF' : '#F8FAFC',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: '10px',
                    padding: '12px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      {isGlobal ? <Globe size={16} color="#2563EB" /> : <Lock size={16} color="#64748B" />}
                      <div>
                        <div style={{ fontSize: '12px', fontWeight: 700, color: isGlobal ? '#1E40AF' : '#475569' }}>
                          {isGlobal ? 'Global Network Connected' : 'Local Private Only'}
                        </div>
                        <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                          {isGlobal ? 'Receives app & cross-border jobs' : 'Dedicated to private clientele'}
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={() => handleToggleNetwork(veh.id)}
                      className={isGlobal ? 'btn-secondary' : 'btn-primary'}
                      style={{ fontSize: '11px', padding: '6px 10px' }}
                    >
                      {isGlobal ? 'Switch to Local' : 'Connect Global'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Add Vehicle Modal */}
          {showAddVehModal && (
            <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
              <form onSubmit={handleAddVehicle} className="glass-card" style={{ width: '500px', padding: '28px', background: '#FFFFFF' }}>
                <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#0F172A', marginBottom: '16px' }}>
                  Add Vehicle to Depot Inventory
                </h3>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '20px' }}>
                  <div>
                    <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-secondary)' }}>MAKE *</label>
                    <input
                      type="text"
                      required
                      value={newVeh.make}
                      onChange={(e) => setNewVeh({ ...newVeh, make: e.target.value })}
                      style={{ width: '100%', padding: '8px', borderRadius: '6px', fontSize: '13px' }}
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-secondary)' }}>MODEL *</label>
                    <input
                      type="text"
                      required
                      value={newVeh.model}
                      onChange={(e) => setNewVeh({ ...newVeh, model: e.target.value })}
                      style={{ width: '100%', padding: '8px', borderRadius: '6px', fontSize: '13px' }}
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-secondary)' }}>YEAR *</label>
                    <input
                      type="number"
                      required
                      value={newVeh.year}
                      onChange={(e) => setNewVeh({ ...newVeh, year: parseInt(e.target.value) || 2025 })}
                      style={{ width: '100%', padding: '8px', borderRadius: '6px', fontSize: '13px' }}
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-secondary)' }}>LICENSE PLATE *</label>
                    <input
                      type="text"
                      required
                      value={newVeh.license_plate}
                      onChange={(e) => setNewVeh({ ...newVeh, license_plate: e.target.value })}
                      style={{ width: '100%', padding: '8px', borderRadius: '6px', fontSize: '13px' }}
                    />
                  </div>

                  <div style={{ gridColumn: 'span 2' }}>
                    <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-secondary)' }}>VEHICLE TIER CLASS *</label>
                    <select
                      value={newVeh.vehicle_class}
                      onChange={(e) => setNewVeh({ ...newVeh, vehicle_class: e.target.value as VehicleClass })}
                      style={{ width: '100%', padding: '8px', borderRadius: '6px', fontSize: '13px' }}
                    >
                      <option value="BUSINESS_SEDAN">Business Sedan (Mercedes E-Class, BMW 5-Series)</option>
                      <option value="LUXURY_SUV">Luxury SUV (Escalade ESV, Navigator L)</option>
                      <option value="FIRST_CLASS">First Class (Mercedes S 580, BMW 760i)</option>
                      <option value="BUSINESS_VAN">Business Van VIP (Sprinter 3500)</option>
                      <option value="ELECTRIC_VIP">Electric VIP (Lucid Air Grand Touring)</option>
                    </select>
                  </div>

                  <div style={{ gridColumn: 'span 2' }}>
                    <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-secondary)' }}>NETWORK ALLOCATION *</label>
                    <select
                      value={newVeh.network_mode}
                      onChange={(e) => setNewVeh({ ...newVeh, network_mode: e.target.value as NetworkParticipationMode })}
                      style={{ width: '100%', padding: '8px', borderRadius: '6px', fontSize: '13px' }}
                    >
                      <option value="GLOBAL_NETWORK_CONNECTED">🌐 Global Network Connected (Receives app rides)</option>
                      <option value="LOCAL_PRIVATE_ONLY">🔒 Local Private Only (Vendor internal bookings only)</option>
                    </select>
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                  <button type="button" className="btn-secondary" onClick={() => setShowAddVehModal(false)}>
                    Cancel
                  </button>
                  <button type="submit" className="btn-primary">
                    Register Vehicle
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      )}

      {/* TAB 4: AWS SES & COMM CONFIG */}
      {activeTab === 'COMM' && commConfig && (
        <form onSubmit={handleSaveComm} className="glass-card" style={{ padding: '28px', width: '100%' }}>
          <div style={{ marginBottom: '20px' }}>
            <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#0F172A', margin: 0 }}>
              Communication Channels & AWS SES Infrastructure
            </h3>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '4px', marginBottom: 0 }}>
              Configure inbound/outbound telephony (Twilio), WhatsApp business intake, and AWS Simple Email Service (SES) transactional delivery.
            </p>
          </div>

          <div style={{ background: '#F8FAFC', border: '1px solid var(--border-subtle)', borderRadius: '12px', padding: '18px', marginBottom: '20px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', marginBottom: '14px' }}>
              <input
                type="checkbox"
                checked={commConfig.use_global_aws_ses}
                onChange={(e) => setCommConfig({ ...commConfig, use_global_aws_ses: e.target.checked })}
              />
              <span style={{ fontSize: '13px', fontWeight: 700, color: '#0F172A' }}>
                Use Global Platform AWS SES Relay (us-east-1 Verified Deliverability)
              </span>
            </label>

            {!commConfig.use_global_aws_ses && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginTop: '14px' }}>
                <div>
                  <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-secondary)' }}>CUSTOM SMTP HOST</label>
                  <input
                    type="text"
                    value={commConfig.custom_smtp_host || ''}
                    onChange={(e) => setCommConfig({ ...commConfig, custom_smtp_host: e.target.value })}
                    placeholder="smtp.mailgun.org"
                    style={{ width: '100%', padding: '8px', borderRadius: '6px', fontSize: '13px' }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-secondary)' }}>CUSTOM SENDER EMAIL</label>
                  <input
                    type="email"
                    value={commConfig.custom_sender_email || ''}
                    onChange={(e) => setCommConfig({ ...commConfig, custom_sender_email: e.target.value })}
                    placeholder="dispatch@vendor.com"
                    style={{ width: '100%', padding: '8px', borderRadius: '6px', fontSize: '13px' }}
                  />
                </div>
              </div>
            )}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px', marginBottom: '24px' }}>
            <div>
              <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                24/7 VOICE HOTLINE DISPATCH PHONE (TWILIO)
              </label>
              <input
                type="text"
                value={commConfig.custom_twilio_phone || ''}
                onChange={(e) => setCommConfig({ ...commConfig, custom_twilio_phone: e.target.value })}
                placeholder="+1 800 555 0199"
                style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', fontSize: '14px', border: '1px solid var(--border-subtle)' }}
              />
            </div>

            <div>
              <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                WHATSAPP BUSINESS INTAKE NUMBER
              </label>
              <input
                type="text"
                value={commConfig.custom_whatsapp_phone || ''}
                onChange={(e) => setCommConfig({ ...commConfig, custom_whatsapp_phone: e.target.value })}
                placeholder="+1 917 555 0199"
                style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', fontSize: '14px', border: '1px solid var(--border-subtle)' }}
              />
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button type="submit" disabled={loading} className="btn-primary" style={{ padding: '12px 28px', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <ShieldCheck size={18} /> Save Communication Settings
            </button>
          </div>
        </form>
      )}
    </div>
  );
};
