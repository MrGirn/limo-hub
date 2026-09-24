import React, { useState, useEffect, useMemo } from 'react';
import { 
  Building2, DollarSign, TrendingUp, Cpu, Globe, Lock, 
  ShieldCheck, Plus, RefreshCw, CheckCircle2, Sliders, Mail, Phone, Zap,
  Calculator, ArrowRight, ArrowUpRight, ArrowDownRight, Equal, PlayCircle, RotateCcw, BookmarkCheck,
  Plane, Compass, Clock, AlertTriangle, Sparkles, Check, ChevronRight
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
    name: 'Airport VIP Transfer',
    description: '18.5 mi Logan/JFK airport arrival with meet & greet',
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
    name: 'Intercity Executive',
    description: '45.0 mi corridor with 12.0 mi depot deadhead',
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
    name: 'As-Directed Hourly',
    description: '4.0 Hours continuous roadshow reservation',
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
    name: 'Peak Rush Hour Run',
    description: '22.0 mi airport run during evening congestion',
    icon: '🚦',
    distance_miles: 22.0,
    is_hourly: false,
    hourly_hours: 0,
    deadhead_miles: 8.0,
    is_airport: true,
    meet_and_greet: true,
    is_rush_hour: true,
    is_late_night: false,
    extra_wait_minutes: 20
  },
  {
    id: 'late_night_mission',
    name: 'Late Night Red-Eye',
    description: '30.0 mi overnight airport arrival',
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

  // Helper to render inline input diff tag
  const renderInputDiff = (savedVal: number | undefined, currentVal: number | undefined, prefix = '$', suffix = '') => {
    const s = Number(savedVal || 0);
    const c = Number(currentVal || 0);
    const diff = c - s;
    if (Math.abs(diff) < 0.001) {
      return (
        <span style={{ fontSize: '10px', color: '#94A3B8', fontWeight: 600 }}>
          Saved: {prefix}{s.toFixed(2)}{suffix}
        </span>
      );
    }
    const isPos = diff > 0;
    return (
      <span style={{ 
        fontSize: '10px', 
        fontWeight: 800, 
        color: isPos ? '#059669' : '#DC2626',
        background: isPos ? '#ECFDF5' : '#FEF2F2',
        padding: '2px 6px',
        borderRadius: '4px'
      }}>
        Saved: {prefix}{s.toFixed(2)} → {isPos ? '+' : '-'}{prefix}{Math.abs(diff).toFixed(2)} ({isPos ? '+' : ''}{((diff/s)*100).toFixed(1)}%)
      </span>
    );
  };

  return (
    <div style={{ width: '100%', maxWidth: '100%', margin: 0, padding: 0 }}>
      {/* Header Banner */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '16px', width: '100%' }}>
        <div>
          <div className="gold-badge" style={{ marginBottom: '4px' }}>
            <Sliders size={12} /> Autonomous Vendor Operations Console
          </div>
          <h1 style={{ fontSize: '24px', fontWeight: 800, color: '#0F172A', letterSpacing: '-0.02em', margin: 0 }}>
            Vendor Pricing Rules, AI Yield & Fleet Inventory
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '13px', marginTop: '2px', marginBottom: 0 }}>
            Change any rate on the left and see the exact real-time quote difference on the right side simultaneously.
          </p>
        </div>

        {/* Action Controls */}
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          {!hideVendorSelector && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#FFFFFF', padding: '6px 12px', borderRadius: '8px', border: '1px solid var(--border-subtle)', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
              <Building2 size={14} color="#2563EB" />
              <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)' }}>Operating Vendor:</span>
              <select
                value={selectedVendorId}
                onChange={(e) => setSelectedVendorId(e.target.value)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  fontSize: '12px',
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
            style={{ fontSize: '12px', padding: '8px 14px', display: 'flex', alignItems: 'center', gap: '6px' }}
            title="Refresh Live Data"
          >
            <RefreshCw size={13} className={loading ? 'pulse-live' : ''} />
            <span>Sync Engine</span>
          </button>
        </div>
      </div>

      {successMsg && (
        <div style={{ background: 'rgba(16, 185, 129, 0.1)', border: '1px solid #10B981', color: '#047857', padding: '10px 16px', borderRadius: '8px', marginBottom: '16px', fontSize: '13px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px', width: '100%' }}>
          <CheckCircle2 size={16} color="#10B981" /> {successMsg}
        </div>
      )}

      {/* Navigation Sub-Tabs */}
      <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid var(--border-subtle)', marginBottom: '18px', overflowX: 'auto', paddingBottom: '4px', width: '100%' }}>
        <button
          onClick={() => setActiveTab('PRICING')}
          style={{
            padding: '8px 16px',
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
          <DollarSign size={15} /> Side-by-Side Tariff Studio & Simulator
        </button>

        <button
          onClick={() => setActiveTab('AI_YIELD')}
          style={{
            padding: '8px 16px',
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
            padding: '8px 16px',
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
          <Globe size={15} /> Fleet Inventory ({inventory.length})
        </button>

        <button
          onClick={() => setActiveTab('COMM')}
          style={{
            padding: '8px 16px',
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

      {/* TAB 1: SIDE-BY-SIDE TARIFF STUDIO */}
      {activeTab === 'PRICING' && selectedRule && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', width: '100%' }}>
          
          {/* VEHICLE TIER SELECTOR PILLS */}
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center', background: '#F8FAFC', padding: '10px 14px', borderRadius: '10px', border: '1px solid var(--border-subtle)' }}>
            <span style={{ fontSize: '12px', fontWeight: 800, color: '#475569', marginRight: '6px' }}>
              SELECT VEHICLE TIER:
            </span>
            {rules.map(r => {
              const isSelected = selectedRule.vehicle_class === r.vehicle_class;
              return (
                <button
                  key={r.vehicle_class}
                  type="button"
                  onClick={() => setSelectedRule(r)}
                  style={{
                    padding: '8px 14px',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    fontSize: '13px',
                    fontWeight: 800,
                    border: isSelected ? '2px solid #2563EB' : '1px solid var(--border-subtle)',
                    background: isSelected ? '#EFF6FF' : '#FFFFFF',
                    color: isSelected ? '#1E40AF' : '#0F172A',
                    boxShadow: isSelected ? '0 2px 6px rgba(37,99,235,0.15)' : 'none',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <span>{r.vehicle_class.replace('_', ' ')}</span>
                  <span style={{ fontSize: '11px', color: isSelected ? '#2563EB' : 'var(--text-muted)', fontWeight: 700 }}>
                    (${Number(r.base_rate_net).toFixed(0)} Base)
                  </span>
                </button>
              );
            })}
          </div>

          {/* 2-COLUMN TRUE SIDE-BY-SIDE LAYOUT */}
          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(420px, 1fr) minmax(460px, 1.15fr)', gap: '20px', width: '100%', alignItems: 'start' }}>
            
            {/* LEFT COLUMN: LIVE TARIFF PARAMETER INPUTS */}
            <form onSubmit={handleSaveRule} className="glass-card" style={{ padding: '22px', width: '100%', background: '#FFFFFF' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px', flexWrap: 'wrap', gap: '8px' }}>
                <div>
                  <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#0F172A', margin: 0 }}>
                    {selectedRule.vehicle_class.replace('_', ' ')} Rates
                  </h3>
                  <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px', marginBottom: 0 }}>
                    Type any new rate below to see live quote diffs on the right.
                  </p>
                </div>

                <div style={{ display: 'flex', gap: '6px' }}>
                  <button
                    type="button"
                    onClick={handleResetToBaseline}
                    className="btn-secondary"
                    style={{ fontSize: '11px', padding: '6px 10px', display: 'flex', alignItems: 'center', gap: '4px' }}
                    title="Revert to saved baseline"
                  >
                    <RotateCcw size={12} /> Reset
                  </button>
                  <button
                    type="button"
                    onClick={handleSetCurrentAsBaseline}
                    className="btn-secondary"
                    style={{ fontSize: '11px', padding: '6px 10px', display: 'flex', alignItems: 'center', gap: '4px' }}
                    title="Lock current numbers as baseline"
                  >
                    <BookmarkCheck size={12} /> Lock Baseline
                  </button>
                </div>
              </div>

              {/* SECTION 1: CORE RATES */}
              <div style={{ marginBottom: '18px', paddingBottom: '16px', borderBottom: '1px solid var(--border-subtle)' }}>
                <div style={{ fontSize: '11px', fontWeight: 800, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '10px' }}>
                  Core Mileage & Hourly Dispatch Rates
                </div>
                
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  {/* Base Fare */}
                  <div>
                    <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: '2px' }}>
                      BASE FARE ({selectedRule.currency}) *
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      value={selectedRule.base_rate_net}
                      onChange={(e) => setSelectedRule({ ...selectedRule, base_rate_net: parseFloat(e.target.value) || 0 })}
                      style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', fontSize: '14px', fontWeight: 700, border: '1px solid var(--border-subtle)' }}
                    />
                    <div style={{ marginTop: '3px' }}>
                      {renderInputDiff(activeBaselineRule?.base_rate_net, selectedRule.base_rate_net)}
                    </div>
                  </div>

                  {/* Per Mile */}
                  <div>
                    <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: '2px' }}>
                      PER MILE ({selectedRule.currency}) *
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
                          per_km_rate_net: parseFloat((mi / 1.60934).toFixed(2))
                        });
                      }}
                      style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', fontSize: '14px', fontWeight: 700, border: '1px solid var(--border-subtle)' }}
                    />
                    <div style={{ marginTop: '3px' }}>
                      {renderInputDiff(activeBaselineRule?.per_mile_rate_net, selectedRule.per_mile_rate_net, '$', '/mi')}
                    </div>
                  </div>

                  {/* Hourly Rate */}
                  <div>
                    <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: '2px' }}>
                      HOURLY RATE ({selectedRule.currency}/HR)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      value={selectedRule.hourly_rate_net || 0}
                      onChange={(e) => setSelectedRule({ ...selectedRule, hourly_rate_net: parseFloat(e.target.value) || 0 })}
                      style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', fontSize: '14px', fontWeight: 700, border: '1px solid var(--border-subtle)' }}
                    />
                    <div style={{ marginTop: '3px' }}>
                      {renderInputDiff(activeBaselineRule?.hourly_rate_net, selectedRule.hourly_rate_net, '$', '/hr')}
                    </div>
                  </div>

                  {/* Deadhead Rate */}
                  <div>
                    <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: '2px' }}>
                      DEADHEAD STAGING ({selectedRule.currency}/MI)
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
                      style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', fontSize: '14px', fontWeight: 700, border: '1px solid var(--border-subtle)' }}
                    />
                    <div style={{ marginTop: '3px' }}>
                      {renderInputDiff(activeBaselineRule?.deadhead_rate_per_mile, selectedRule.deadhead_rate_per_mile, '$', '/mi')}
                    </div>
                  </div>
                </div>
              </div>

              {/* SECTION 2: ACCESSORIAL SURCHARGES */}
              <div style={{ marginBottom: '18px', paddingBottom: '16px', borderBottom: '1px solid var(--border-subtle)' }}>
                <div style={{ fontSize: '11px', fontWeight: 800, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '10px' }}>
                  Airport & Accessorial Surcharges
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  {/* Airport Surcharge */}
                  <div>
                    <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: '2px' }}>
                      AIRPORT / FBO FEE ({selectedRule.currency})
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={selectedRule.airport_surcharge_net || 0}
                      onChange={(e) => setSelectedRule({ ...selectedRule, airport_surcharge_net: parseFloat(e.target.value) || 0 })}
                      style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', fontSize: '14px', fontWeight: 700, border: '1px solid var(--border-subtle)' }}
                    />
                    <div style={{ marginTop: '3px' }}>
                      {renderInputDiff(activeBaselineRule?.airport_surcharge_net, selectedRule.airport_surcharge_net)}
                    </div>
                  </div>

                  {/* Meet & Greet */}
                  <div>
                    <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: '2px' }}>
                      MEET & GREET PLACARD ({selectedRule.currency})
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={selectedRule.meet_and_greet_fee_net || 0}
                      onChange={(e) => setSelectedRule({ ...selectedRule, meet_and_greet_fee_net: parseFloat(e.target.value) || 0 })}
                      style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', fontSize: '14px', fontWeight: 700, border: '1px solid var(--border-subtle)' }}
                    />
                    <div style={{ marginTop: '3px' }}>
                      {renderInputDiff(activeBaselineRule?.meet_and_greet_fee_net, selectedRule.meet_and_greet_fee_net)}
                    </div>
                  </div>

                  {/* Rush Hour Surcharge */}
                  <div>
                    <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: '2px' }}>
                      RUSH HOUR PEAK ({selectedRule.currency})
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={selectedRule.rush_hour_surcharge_net || 0}
                      onChange={(e) => setSelectedRule({ ...selectedRule, rush_hour_surcharge_net: parseFloat(e.target.value) || 0 })}
                      style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', fontSize: '14px', fontWeight: 700, border: '1px solid var(--border-subtle)' }}
                    />
                    <div style={{ marginTop: '3px' }}>
                      {renderInputDiff(activeBaselineRule?.rush_hour_surcharge_net, selectedRule.rush_hour_surcharge_net)}
                    </div>
                  </div>

                  {/* Late Night */}
                  <div>
                    <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: '2px' }}>
                      LATE NIGHT RED-EYE ({selectedRule.currency})
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={selectedRule.late_night_surcharge_net || 0}
                      onChange={(e) => setSelectedRule({ ...selectedRule, late_night_surcharge_net: parseFloat(e.target.value) || 0 })}
                      style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', fontSize: '14px', fontWeight: 700, border: '1px solid var(--border-subtle)' }}
                    />
                    <div style={{ marginTop: '3px' }}>
                      {renderInputDiff(activeBaselineRule?.late_night_surcharge_net, selectedRule.late_night_surcharge_net)}
                    </div>
                  </div>

                  {/* Minimum Floor */}
                  <div>
                    <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: '2px' }}>
                      MIN FARE FLOOR ({selectedRule.currency})
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={selectedRule.minimum_fare_net || 0}
                      onChange={(e) => setSelectedRule({ ...selectedRule, minimum_fare_net: parseFloat(e.target.value) || 0 })}
                      style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', fontSize: '14px', fontWeight: 700, border: '1px solid var(--border-subtle)' }}
                    />
                    <div style={{ marginTop: '3px' }}>
                      {renderInputDiff(activeBaselineRule?.minimum_fare_net, selectedRule.minimum_fare_net)}
                    </div>
                  </div>

                  {/* Extra Wait Rate */}
                  <div>
                    <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: '2px' }}>
                      WAIT RATE ({selectedRule.currency}/MIN)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={selectedRule.wait_minute_rate_net || 1.0}
                      onChange={(e) => setSelectedRule({ ...selectedRule, wait_minute_rate_net: parseFloat(e.target.value) || 0 })}
                      style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', fontSize: '14px', fontWeight: 700, border: '1px solid var(--border-subtle)' }}
                    />
                    <div style={{ marginTop: '3px' }}>
                      {renderInputDiff(activeBaselineRule?.wait_minute_rate_net, selectedRule.wait_minute_rate_net, '$', '/min')}
                    </div>
                  </div>
                </div>
              </div>

              {/* SAVE BUTTON */}
              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <button type="submit" disabled={loading} className="btn-primary" style={{ width: '100%', padding: '12px', fontSize: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                  <ShieldCheck size={18} /> Save & Apply {selectedRule.vehicle_class.replace('_', ' ')} Tariff
                </button>
              </div>
            </form>

            {/* RIGHT COLUMN: REAL-TIME BEFORE & AFTER COMPARISON */}
            <div className="glass-card" style={{ padding: '22px', width: '100%', background: '#FFFFFF', border: '1px solid #BFDBFE' }}>
              
              {/* TOP KPI CARDS */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
                <div style={{ 
                  padding: '12px 14px', 
                  borderRadius: '10px', 
                  background: netDelta > 0 ? '#ECFDF5' : (netDelta < 0 ? '#FEF2F2' : '#F8FAFC'),
                  border: netDelta > 0 ? '1px solid #A7F3D0' : (netDelta < 0 ? '1px solid #FECACA' : '1px solid var(--border-subtle)')
                }}>
                  <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-secondary)' }}>NET VENDOR PAYOUT $\Delta$</div>
                  <div style={{ fontSize: '20px', fontWeight: 800, color: netDelta > 0 ? '#059669' : (netDelta < 0 ? '#DC2626' : '#475569'), display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
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
                  padding: '12px 14px', 
                  borderRadius: '10px', 
                  background: grossDelta > 0 ? '#EFF6FF' : (grossDelta < 0 ? '#FFFBEB' : '#F8FAFC'),
                  border: grossDelta > 0 ? '1px solid #BFDBFE' : (grossDelta < 0 ? '1px solid #FDE68A' : '1px solid var(--border-subtle)')
                }}>
                  <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-secondary)' }}>CUSTOMER GROSS QUOTE $\Delta$</div>
                  <div style={{ fontSize: '20px', fontWeight: 800, color: grossDelta > 0 ? '#2563EB' : (grossDelta < 0 ? '#D97706' : '#475569'), display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
                    {grossDelta >= 0 ? `+$${grossDelta.toFixed(2)}` : `-$${Math.abs(grossDelta).toFixed(2)}`}
                    <span style={{ fontSize: '12px', fontWeight: 700, marginLeft: '4px' }}>
                      ({grossDeltaPct >= 0 ? `+${grossDeltaPct.toFixed(1)}%` : `${grossDeltaPct.toFixed(1)}%`})
                    </span>
                  </div>
                </div>
              </div>

              {/* BENCHMARK SCENARIO SELECTOR */}
              <div style={{ marginBottom: '14px' }}>
                <div style={{ fontSize: '11px', fontWeight: 800, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>
                  Simulated Scenario:
                </div>
                <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', paddingBottom: '4px' }}>
                  {PRESET_SCENARIOS.map(s => {
                    const isSelected = activeScenarioId === s.id;
                    return (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => setActiveScenarioId(s.id)}
                        style={{
                          padding: '6px 10px',
                          borderRadius: '6px',
                          cursor: 'pointer',
                          fontSize: '11px',
                          fontWeight: 700,
                          border: isSelected ? '1px solid #2563EB' : '1px solid var(--border-subtle)',
                          background: isSelected ? '#EFF6FF' : '#F8FAFC',
                          color: isSelected ? '#1E40AF' : '#475569',
                          whiteSpace: 'nowrap',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px'
                        }}
                      >
                        <span>{s.icon}</span>
                        <span>{s.name}</span>
                      </button>
                    );
                  })}
                  <button
                    type="button"
                    onClick={() => setActiveScenarioId('custom')}
                    style={{
                      padding: '6px 10px',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontSize: '11px',
                      fontWeight: 700,
                      border: activeScenarioId === 'custom' ? '1px solid #2563EB' : '1px solid var(--border-subtle)',
                      background: activeScenarioId === 'custom' ? '#EFF6FF' : '#F8FAFC',
                      color: activeScenarioId === 'custom' ? '#1E40AF' : '#475569',
                      whiteSpace: 'nowrap',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}
                  >
                    <span>🛠️</span>
                    <span>Custom</span>
                  </button>
                </div>
              </div>

              {/* CUSTOM SCENARIO BUILDER (IF SELECTED) */}
              {activeScenarioId === 'custom' && (
                <div style={{ background: '#F8FAFC', border: '1px solid var(--border-subtle)', borderRadius: '8px', padding: '12px', marginBottom: '14px' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', alignItems: 'center' }}>
                    <div>
                      <label style={{ fontSize: '10px', fontWeight: 700, color: 'var(--text-secondary)' }}>DIST (MI)</label>
                      <input
                        type="number"
                        step="1"
                        value={customScenario.distance_miles}
                        onChange={(e) => setCustomScenario({ ...customScenario, distance_miles: parseFloat(e.target.value) || 0 })}
                        style={{ width: '100%', padding: '6px', borderRadius: '4px', fontSize: '12px', border: '1px solid var(--border-subtle)' }}
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: '10px', fontWeight: 700, color: 'var(--text-secondary)' }}>DEADHEAD (MI)</label>
                      <input
                        type="number"
                        step="1"
                        value={customScenario.deadhead_miles}
                        onChange={(e) => setCustomScenario({ ...customScenario, deadhead_miles: parseFloat(e.target.value) || 0 })}
                        style={{ width: '100%', padding: '6px', borderRadius: '4px', fontSize: '12px', border: '1px solid var(--border-subtle)' }}
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: '10px', fontWeight: 700, color: 'var(--text-secondary)' }}>WAIT (MINS)</label>
                      <input
                        type="number"
                        step="5"
                        value={customScenario.extra_wait_minutes}
                        onChange={(e) => setCustomScenario({ ...customScenario, extra_wait_minutes: parseInt(e.target.value) || 0 })}
                        style={{ width: '100%', padding: '6px', borderRadius: '4px', fontSize: '12px', border: '1px solid var(--border-subtle)' }}
                      />
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '12px', marginTop: '8px', fontSize: '11px', fontWeight: 700 }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }}>
                      <input type="checkbox" checked={customScenario.is_airport} onChange={(e) => setCustomScenario({ ...customScenario, is_airport: e.target.checked })} /> Airport
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }}>
                      <input type="checkbox" checked={customScenario.meet_and_greet} onChange={(e) => setCustomScenario({ ...customScenario, meet_and_greet: e.target.checked })} /> Meet & Greet
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }}>
                      <input type="checkbox" checked={customScenario.is_rush_hour} onChange={(e) => setCustomScenario({ ...customScenario, is_rush_hour: e.target.checked })} /> Rush Hour
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }}>
                      <input type="checkbox" checked={customScenario.is_late_night} onChange={(e) => setCustomScenario({ ...customScenario, is_late_night: e.target.checked })} /> Late Night
                    </label>
                  </div>
                </div>
              )}

              {/* LIVE SIDE-BY-SIDE COMPARISON TABLE */}
              <div style={{ borderRadius: '8px', border: '1px solid var(--border-subtle)', overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', textAlign: 'left' }}>
                  <thead>
                    <tr style={{ background: '#F8FAFC', borderBottom: '2px solid var(--border-subtle)' }}>
                      <th style={{ padding: '8px 12px', fontWeight: 800, color: '#475569' }}>FARE LINE ITEM</th>
                      <th style={{ padding: '8px 12px', fontWeight: 800, color: '#64748B', width: '25%' }}>BEFORE (SAVED)</th>
                      <th style={{ padding: '8px 12px', fontWeight: 800, color: '#2563EB', width: '25%' }}>AFTER (NEW)</th>
                      <th style={{ padding: '8px 12px', fontWeight: 800, color: '#0F172A', width: '22%' }}>DIFF ($\Delta$)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {!currentScenario.is_hourly && (
                      <tr style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                        <td style={{ padding: '8px 12px', color: '#0F172A' }}>Base Dispatch Fare</td>
                        <td style={{ padding: '8px 12px', color: '#64748B' }}>${baselineQuote.baseFare.toFixed(2)}</td>
                        <td style={{ padding: '8px 12px', fontWeight: 700, color: '#0F172A' }}>${draftQuote.baseFare.toFixed(2)}</td>
                        <td style={{ padding: '8px 12px', fontWeight: 700, color: draftQuote.baseFare >= baselineQuote.baseFare ? (draftQuote.baseFare === baselineQuote.baseFare ? '#64748B' : '#059669') : '#DC2626' }}>
                          {draftQuote.baseFare >= baselineQuote.baseFare ? (draftQuote.baseFare === baselineQuote.baseFare ? '$0.00' : `+$${(draftQuote.baseFare - baselineQuote.baseFare).toFixed(2)}`) : `-$${Math.abs(draftQuote.baseFare - baselineQuote.baseFare).toFixed(2)}`}
                        </td>
                      </tr>
                    )}

                    {!currentScenario.is_hourly && (
                      <tr style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                        <td style={{ padding: '8px 12px', color: '#0F172A' }}>Distance ({currentScenario.distance_miles} mi)</td>
                        <td style={{ padding: '8px 12px', color: '#64748B' }}>${baselineQuote.distanceCharge.toFixed(2)}</td>
                        <td style={{ padding: '8px 12px', fontWeight: 700, color: '#0F172A' }}>${draftQuote.distanceCharge.toFixed(2)}</td>
                        <td style={{ padding: '8px 12px', fontWeight: 700, color: draftQuote.distanceCharge >= baselineQuote.distanceCharge ? (draftQuote.distanceCharge === baselineQuote.distanceCharge ? '#64748B' : '#059669') : '#DC2626' }}>
                          {draftQuote.distanceCharge >= baselineQuote.distanceCharge ? (draftQuote.distanceCharge === baselineQuote.distanceCharge ? '$0.00' : `+$${(draftQuote.distanceCharge - baselineQuote.distanceCharge).toFixed(2)}`) : `-$${Math.abs(draftQuote.distanceCharge - baselineQuote.distanceCharge).toFixed(2)}`}
                        </td>
                      </tr>
                    )}

                    {currentScenario.is_hourly && (
                      <tr style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                        <td style={{ padding: '8px 12px', color: '#0F172A' }}>Hourly ({currentScenario.hourly_hours} hrs)</td>
                        <td style={{ padding: '8px 12px', color: '#64748B' }}>${baselineQuote.hourlyCharge.toFixed(2)}</td>
                        <td style={{ padding: '8px 12px', fontWeight: 700, color: '#0F172A' }}>${draftQuote.hourlyCharge.toFixed(2)}</td>
                        <td style={{ padding: '8px 12px', fontWeight: 700, color: draftQuote.hourlyCharge >= baselineQuote.hourlyCharge ? (draftQuote.hourlyCharge === baselineQuote.hourlyCharge ? '#64748B' : '#059669') : '#DC2626' }}>
                          {draftQuote.hourlyCharge >= baselineQuote.hourlyCharge ? (draftQuote.hourlyCharge === baselineQuote.hourlyCharge ? '$0.00' : `+$${(draftQuote.hourlyCharge - baselineQuote.hourlyCharge).toFixed(2)}`) : `-$${Math.abs(draftQuote.hourlyCharge - baselineQuote.hourlyCharge).toFixed(2)}`}
                        </td>
                      </tr>
                    )}

                    <tr style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                      <td style={{ padding: '8px 12px', color: '#0F172A' }}>Deadhead ({currentScenario.deadhead_miles} mi)</td>
                      <td style={{ padding: '8px 12px', color: '#64748B' }}>${baselineQuote.deadheadCharge.toFixed(2)}</td>
                      <td style={{ padding: '8px 12px', fontWeight: 700, color: '#0F172A' }}>${draftQuote.deadheadCharge.toFixed(2)}</td>
                      <td style={{ padding: '8px 12px', fontWeight: 700, color: draftQuote.deadheadCharge >= baselineQuote.deadheadCharge ? (draftQuote.deadheadCharge === baselineQuote.deadheadCharge ? '#64748B' : '#059669') : '#DC2626' }}>
                        {draftQuote.deadheadCharge >= baselineQuote.deadheadCharge ? (draftQuote.deadheadCharge === baselineQuote.deadheadCharge ? '$0.00' : `+$${(draftQuote.deadheadCharge - baselineQuote.deadheadCharge).toFixed(2)}`) : `-$${Math.abs(draftQuote.deadheadCharge - baselineQuote.deadheadCharge).toFixed(2)}`}
                      </td>
                    </tr>

                    {currentScenario.is_airport && (
                      <tr style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                        <td style={{ padding: '8px 12px', color: '#0F172A' }}>Airport Surcharge</td>
                        <td style={{ padding: '8px 12px', color: '#64748B' }}>${baselineQuote.airportFee.toFixed(2)}</td>
                        <td style={{ padding: '8px 12px', fontWeight: 700, color: '#0F172A' }}>${draftQuote.airportFee.toFixed(2)}</td>
                        <td style={{ padding: '8px 12px', fontWeight: 700, color: draftQuote.airportFee >= baselineQuote.airportFee ? (draftQuote.airportFee === baselineQuote.airportFee ? '#64748B' : '#059669') : '#DC2626' }}>
                          {draftQuote.airportFee >= baselineQuote.airportFee ? (draftQuote.airportFee === baselineQuote.airportFee ? '$0.00' : `+$${(draftQuote.airportFee - baselineQuote.airportFee).toFixed(2)}`) : `-$${Math.abs(draftQuote.airportFee - baselineQuote.airportFee).toFixed(2)}`}
                        </td>
                      </tr>
                    )}

                    {currentScenario.meet_and_greet && (
                      <tr style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                        <td style={{ padding: '8px 12px', color: '#0F172A' }}>Meet & Greet Placard</td>
                        <td style={{ padding: '8px 12px', color: '#64748B' }}>${baselineQuote.meetGreetFee.toFixed(2)}</td>
                        <td style={{ padding: '8px 12px', fontWeight: 700, color: '#0F172A' }}>${draftQuote.meetGreetFee.toFixed(2)}</td>
                        <td style={{ padding: '8px 12px', fontWeight: 700, color: draftQuote.meetGreetFee >= baselineQuote.meetGreetFee ? (draftQuote.meetGreetFee === baselineQuote.meetGreetFee ? '#64748B' : '#059669') : '#DC2626' }}>
                          {draftQuote.meetGreetFee >= baselineQuote.meetGreetFee ? (draftQuote.meetGreetFee === baselineQuote.meetGreetFee ? '$0.00' : `+$${(draftQuote.meetGreetFee - baselineQuote.meetGreetFee).toFixed(2)}`) : `-$${Math.abs(draftQuote.meetGreetFee - baselineQuote.meetGreetFee).toFixed(2)}`}
                        </td>
                      </tr>
                    )}

                    {currentScenario.is_rush_hour && (
                      <tr style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                        <td style={{ padding: '8px 12px', color: '#0F172A' }}>Rush Hour Surcharge</td>
                        <td style={{ padding: '8px 12px', color: '#64748B' }}>${baselineQuote.rushHourFee.toFixed(2)}</td>
                        <td style={{ padding: '8px 12px', fontWeight: 700, color: '#0F172A' }}>${draftQuote.rushHourFee.toFixed(2)}</td>
                        <td style={{ padding: '8px 12px', fontWeight: 700, color: draftQuote.rushHourFee >= baselineQuote.rushHourFee ? (draftQuote.rushHourFee === baselineQuote.rushHourFee ? '#64748B' : '#059669') : '#DC2626' }}>
                          {draftQuote.rushHourFee >= baselineQuote.rushHourFee ? (draftQuote.rushHourFee === baselineQuote.rushHourFee ? '$0.00' : `+$${(draftQuote.rushHourFee - baselineQuote.rushHourFee).toFixed(2)}`) : `-$${Math.abs(draftQuote.rushHourFee - baselineQuote.rushHourFee).toFixed(2)}`}
                        </td>
                      </tr>
                    )}

                    {currentScenario.is_late_night && (
                      <tr style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                        <td style={{ padding: '8px 12px', color: '#0F172A' }}>Late Night Surcharge</td>
                        <td style={{ padding: '8px 12px', color: '#64748B' }}>${baselineQuote.lateNightFee.toFixed(2)}</td>
                        <td style={{ padding: '8px 12px', fontWeight: 700, color: '#0F172A' }}>${draftQuote.lateNightFee.toFixed(2)}</td>
                        <td style={{ padding: '8px 12px', fontWeight: 700, color: draftQuote.lateNightFee >= baselineQuote.lateNightFee ? (draftQuote.lateNightFee === baselineQuote.lateNightFee ? '#64748B' : '#059669') : '#DC2626' }}>
                          {draftQuote.lateNightFee >= baselineQuote.lateNightFee ? (draftQuote.lateNightFee === baselineQuote.lateNightFee ? '$0.00' : `+$${(draftQuote.lateNightFee - baselineQuote.lateNightFee).toFixed(2)}`) : `-$${Math.abs(draftQuote.lateNightFee - baselineQuote.lateNightFee).toFixed(2)}`}
                        </td>
                      </tr>
                    )}

                    {/* NET VENDOR PAYOUT SUBTOTAL */}
                    <tr style={{ background: '#F8FAFC', borderTop: '2px solid var(--border-subtle)', borderBottom: '1px solid var(--border-subtle)' }}>
                      <td style={{ padding: '10px 12px', fontWeight: 800, color: '#0F172A' }}>
                        NET VENDOR PAYOUT
                      </td>
                      <td style={{ padding: '10px 12px', fontWeight: 800, color: '#64748B' }}>
                        ${baselineQuote.netSubtotal.toFixed(2)}
                      </td>
                      <td style={{ padding: '10px 12px', fontWeight: 800, color: '#2563EB', fontSize: '14px' }}>
                        ${draftQuote.netSubtotal.toFixed(2)}
                      </td>
                      <td style={{ padding: '10px 12px', fontWeight: 800, color: netDelta >= 0 ? (netDelta === 0 ? '#64748B' : '#059669') : '#DC2626', fontSize: '13px' }}>
                        {netDelta >= 0 ? (netDelta === 0 ? '$0.00' : `+$${netDelta.toFixed(2)}`) : `-$${Math.abs(netDelta).toFixed(2)}`}
                      </td>
                    </tr>

                    {/* FINAL CUSTOMER GROSS */}
                    <tr style={{ background: '#EFF6FF' }}>
                      <td style={{ padding: '12px', fontWeight: 800, color: '#1E40AF', fontSize: '13px' }}>
                        CUSTOMER GROSS
                      </td>
                      <td style={{ padding: '12px', fontWeight: 800, color: '#64748B', fontSize: '13px' }}>
                        ${baselineQuote.totalGross.toFixed(2)}
                      </td>
                      <td style={{ padding: '12px', fontWeight: 800, color: '#1E40AF', fontSize: '15px' }}>
                        ${draftQuote.totalGross.toFixed(2)}
                      </td>
                      <td style={{ padding: '12px', fontWeight: 800, color: grossDelta >= 0 ? (grossDelta === 0 ? '#64748B' : '#2563EB') : '#D97706', fontSize: '14px' }}>
                        {grossDelta >= 0 ? (grossDelta === 0 ? '$0.00' : `+$${grossDelta.toFixed(2)}`) : `-$${Math.abs(grossDelta).toFixed(2)}`}
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
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 380px', gap: '20px', width: '100%', alignItems: 'start' }}>
          <div className="glass-card" style={{ padding: '24px', width: '100%' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px', flexWrap: 'wrap', gap: '12px' }}>
              <div>
                <div className="gold-badge" style={{ marginBottom: '4px' }}>
                  <TrendingUp size={12} /> Neural Booking Yield Optimizer
                </div>
                <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#0F172A', margin: 0 }}>
                  Continuous Pricing Intelligence & Learning Engine
                </h3>
              </div>

              <button className="btn-primary" onClick={handleTrainAI} disabled={loading} style={{ fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Zap size={13} /> Re-Train Model
              </button>
            </div>

            <p style={{ color: 'var(--text-secondary)', fontSize: '13px', marginBottom: '20px', lineHeight: 1.5 }}>
              The system analyzes historical quote acceptance rates, deadhead positioning recovery, driver idle times, and peak demand corridors for <strong>{activeVendor?.name || 'Sovereign Fleet'}</strong> to compute optimal dynamic pricing multipliers.
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '14px', marginBottom: '20px' }}>
              <div style={{ background: '#F8FAFC', border: '1px solid var(--border-subtle)', borderRadius: '10px', padding: '14px' }}>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 700 }}>QUOTE ACCEPTANCE RATE</div>
                <div style={{ fontSize: '22px', fontWeight: 800, color: '#10B981', marginTop: '2px' }}>
                  {aiMetrics.acceptance_rate_pct.toFixed(1)}%
                </div>
              </div>

              <div style={{ background: '#F8FAFC', border: '1px solid var(--border-subtle)', borderRadius: '10px', padding: '14px' }}>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 700 }}>FLEET UTILIZATION</div>
                <div style={{ fontSize: '22px', fontWeight: 800, color: '#2563EB', marginTop: '2px' }}>
                  {aiMetrics.fleet_utilization_pct.toFixed(1)}%
                </div>
              </div>

              <div style={{ background: '#F8FAFC', border: '1px solid var(--border-subtle)', borderRadius: '10px', padding: '14px' }}>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 700 }}>DEADHEAD RECOVERY</div>
                <div style={{ fontSize: '22px', fontWeight: 800, color: 'var(--accent-gold)', marginTop: '2px' }}>
                  {aiMetrics.deadhead_recovery_efficiency.toFixed(1)}%
                </div>
              </div>
            </div>

            <div style={{ background: '#EFF6FF', border: '1px solid #BFDBFE', borderRadius: '10px', padding: '16px' }}>
              <div style={{ fontSize: '12px', fontWeight: 800, color: '#1E40AF', marginBottom: '4px' }}>
                🧠 AI TELEMETRY ANALYSIS:
              </div>
              <div style={{ fontSize: '12px', color: '#1E3A8A', lineHeight: 1.5 }}>
                {aiMetrics.ai_optimization_notes}
              </div>
            </div>
          </div>

          {/* AI Rate Recommendations Card */}
          <div className="glass-card" style={{ padding: '20px', width: '100%' }}>
            <h4 style={{ fontSize: '15px', fontWeight: 800, color: '#0F172A', marginBottom: '14px' }}>
              Recommended Rate Adjustments
            </h4>

            <div style={{ display: 'grid', gap: '12px', marginBottom: '20px', fontSize: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '6px', borderBottom: '1px solid var(--border-subtle)' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Suggested Base Fare:</span>
                <strong style={{ color: '#0F172A' }}>${Number(aiMetrics.suggested_base_rate).toFixed(2)}</strong>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '6px', borderBottom: '1px solid var(--border-subtle)' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Suggested Per-Mile:</span>
                <strong style={{ color: '#0F172A' }}>${Number(aiMetrics.suggested_per_mile_rate).toFixed(2)} / mi</strong>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '6px', borderBottom: '1px solid var(--border-subtle)' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Demand Multiplier:</span>
                <span style={{ fontWeight: 800, color: '#2563EB' }}>{aiMetrics.peak_demand_multiplier}x</span>
              </div>
            </div>

            <button
              className="btn-gold"
              onClick={handleApplyAI}
              disabled={loading}
              style={{ width: '100%', padding: '12px', fontSize: '13px', fontWeight: 800 }}
            >
              Apply AI Dynamic Rates to Catalog
            </button>
          </div>
        </div>
      )}

      {/* TAB 3: FLEET INVENTORY & NETWORK PARTITIONING */}
      {activeTab === 'INVENTORY' && (
        <div className="glass-card" style={{ padding: '24px', width: '100%' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
            <div>
              <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#0F172A', margin: 0 }}>
                Executive Vehicle Fleet & Network Allocation
              </h3>
              <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px', marginBottom: 0 }}>
                Select which executive vehicles connect to the <strong>Global Autonomous Network 🌐</strong> and which stay dedicated to your <strong>Local Private Fleet 🔒</strong>.
              </p>
            </div>

            <button className="btn-primary" onClick={() => setShowAddVehModal(true)} style={{ fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Plus size={14} /> Add Vehicle
            </button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '16px', width: '100%' }}>
            {inventory.map(veh => {
              const isGlobal = veh.network_mode === 'GLOBAL_NETWORK_CONNECTED';
              return (
                <div 
                  key={veh.id} 
                  style={{ 
                    background: '#FFFFFF', 
                    border: isGlobal ? '1px solid #2563EB' : '1px solid var(--border-subtle)', 
                    borderRadius: '10px', 
                    padding: '16px',
                    boxShadow: isGlobal ? '0 4px 12px rgba(37,99,235,0.08)' : '0 1px 3px rgba(0,0,0,0.02)'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                    <div>
                      <div style={{ fontWeight: 800, color: '#0F172A', fontSize: '15px' }}>
                        {veh.make} {veh.model}
                      </div>
                      <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                        {veh.year} · Plate: <strong>{veh.license_plate}</strong>
                      </div>
                    </div>

                    <span className="gold-badge" style={{ fontSize: '10px' }}>
                      {veh.vehicle_class}
                    </span>
                  </div>

                  <div style={{ display: 'flex', gap: '12px', fontSize: '11px', color: 'var(--text-muted)', marginBottom: '12px' }}>
                    <span>👥 {veh.passenger_capacity} Pass</span>
                    <span>🧳 {veh.luggage_capacity} Bags</span>
                  </div>

                  <div style={{
                    background: isGlobal ? '#EFF6FF' : '#F8FAFC',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: '8px',
                    padding: '10px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      {isGlobal ? <Globe size={14} color="#2563EB" /> : <Lock size={14} color="#64748B" />}
                      <div style={{ fontSize: '11px', fontWeight: 700, color: isGlobal ? '#1E40AF' : '#475569' }}>
                        {isGlobal ? 'Global Network' : 'Local Private'}
                      </div>
                    </div>

                    <button
                      onClick={() => handleToggleNetwork(veh.id)}
                      className={isGlobal ? 'btn-secondary' : 'btn-primary'}
                      style={{ fontSize: '11px', padding: '4px 8px' }}
                    >
                      {isGlobal ? 'Switch Local' : 'Connect Global'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Add Vehicle Modal */}
          {showAddVehModal && (
            <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
              <form onSubmit={handleAddVehicle} className="glass-card" style={{ width: '480px', padding: '24px', background: '#FFFFFF' }}>
                <h3 style={{ fontSize: '16px', fontWeight: 800, color: '#0F172A', marginBottom: '14px' }}>
                  Add Vehicle to Depot Inventory
                </h3>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '16px' }}>
                  <div>
                    <label style={{ fontSize: '10px', fontWeight: 700, color: 'var(--text-secondary)' }}>MAKE *</label>
                    <input
                      type="text"
                      required
                      value={newVeh.make}
                      onChange={(e) => setNewVeh({ ...newVeh, make: e.target.value })}
                      style={{ width: '100%', padding: '6px 8px', borderRadius: '6px', fontSize: '12px' }}
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: '10px', fontWeight: 700, color: 'var(--text-secondary)' }}>MODEL *</label>
                    <input
                      type="text"
                      required
                      value={newVeh.model}
                      onChange={(e) => setNewVeh({ ...newVeh, model: e.target.value })}
                      style={{ width: '100%', padding: '6px 8px', borderRadius: '6px', fontSize: '12px' }}
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: '10px', fontWeight: 700, color: 'var(--text-secondary)' }}>YEAR *</label>
                    <input
                      type="number"
                      required
                      value={newVeh.year}
                      onChange={(e) => setNewVeh({ ...newVeh, year: parseInt(e.target.value) || 2025 })}
                      style={{ width: '100%', padding: '6px 8px', borderRadius: '6px', fontSize: '12px' }}
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: '10px', fontWeight: 700, color: 'var(--text-secondary)' }}>LICENSE PLATE *</label>
                    <input
                      type="text"
                      required
                      value={newVeh.license_plate}
                      onChange={(e) => setNewVeh({ ...newVeh, license_plate: e.target.value })}
                      style={{ width: '100%', padding: '6px 8px', borderRadius: '6px', fontSize: '12px' }}
                    />
                  </div>

                  <div style={{ gridColumn: 'span 2' }}>
                    <label style={{ fontSize: '10px', fontWeight: 700, color: 'var(--text-secondary)' }}>VEHICLE TIER CLASS *</label>
                    <select
                      value={newVeh.vehicle_class}
                      onChange={(e) => setNewVeh({ ...newVeh, vehicle_class: e.target.value as VehicleClass })}
                      style={{ width: '100%', padding: '6px 8px', borderRadius: '6px', fontSize: '12px' }}
                    >
                      <option value="BUSINESS_SEDAN">Business Sedan (Mercedes E-Class, BMW 5-Series)</option>
                      <option value="LUXURY_SUV">Luxury SUV (Escalade ESV, Navigator L)</option>
                      <option value="FIRST_CLASS">First Class (Mercedes S 580, BMW 760i)</option>
                      <option value="BUSINESS_VAN">Business Van VIP (Sprinter 3500)</option>
                      <option value="ELECTRIC_VIP">Electric VIP (Lucid Air Grand Touring)</option>
                    </select>
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                  <button type="button" className="btn-secondary" onClick={() => setShowAddVehModal(false)} style={{ fontSize: '12px', padding: '6px 12px' }}>
                    Cancel
                  </button>
                  <button type="submit" className="btn-primary" style={{ fontSize: '12px', padding: '6px 14px' }}>
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
        <form onSubmit={handleSaveComm} className="glass-card" style={{ padding: '24px', width: '100%' }}>
          <div style={{ marginBottom: '18px' }}>
            <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#0F172A', margin: 0 }}>
              Communication Channels & AWS SES Infrastructure
            </h3>
            <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px', marginBottom: 0 }}>
              Configure inbound/outbound telephony (Twilio), WhatsApp business intake, and AWS SES transactional delivery.
            </p>
          </div>

          <div style={{ background: '#F8FAFC', border: '1px solid var(--border-subtle)', borderRadius: '10px', padding: '16px', marginBottom: '18px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={commConfig.use_global_aws_ses}
                onChange={(e) => setCommConfig({ ...commConfig, use_global_aws_ses: e.target.checked })}
              />
              <span style={{ fontSize: '13px', fontWeight: 700, color: '#0F172A' }}>
                Use Global Platform AWS SES Relay (us-east-1 Verified Deliverability)
              </span>
            </label>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '14px', marginBottom: '20px' }}>
            <div>
              <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                24/7 VOICE HOTLINE DISPATCH PHONE (TWILIO)
              </label>
              <input
                type="text"
                value={commConfig.custom_twilio_phone || ''}
                onChange={(e) => setCommConfig({ ...commConfig, custom_twilio_phone: e.target.value })}
                placeholder="+1 800 555 0199"
                style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', fontSize: '13px', border: '1px solid var(--border-subtle)' }}
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
                style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', fontSize: '13px', border: '1px solid var(--border-subtle)' }}
              />
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button type="submit" disabled={loading} className="btn-primary" style={{ padding: '10px 22px', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <ShieldCheck size={16} /> Save Communication Settings
            </button>
          </div>
        </form>
      )}
    </div>
  );
};
