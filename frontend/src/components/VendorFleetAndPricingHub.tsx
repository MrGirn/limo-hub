import React, { useState, useEffect, useMemo } from 'react';
import { 
  Building2, DollarSign, TrendingUp, Cpu, Globe, Lock, 
  ShieldCheck, Plus, RefreshCw, CheckCircle2, Sliders, Mail, Phone, Zap,
  Calculator, ArrowRight, ArrowUpRight, ArrowDownRight, Equal, PlayCircle, RotateCcw, BookmarkCheck,
  Plane, Compass, Clock, AlertTriangle, Sparkles, Check, ChevronRight, BookOpen
} from 'lucide-react';
import { VendorCommercialGuideModal } from './VendorCommercialGuideModal';
import { OperationsPricingResearchStudio } from './vendor/OperationsPricingResearchStudio';
import { 
  Vendor, Vehicle, VendorPricingRule, VendorAIDynamicPricingMetrics, 
  VendorCommConfig, VehicleClass, DistanceUnit, NetworkParticipationMode,
  PricingModelType, TaxGratuityDisplayMode 
} from '../types';
import { 
  fetchVendors, fetchVendorPricingRules, saveVendorPricingRule, 
  fetchVendorAiYieldApi, trainVendorAiYieldApi, applyVendorAiYieldApi, 
  fetchVendorFleetInventory, addVehicleToInventory, toggleVehicleNetworkMode,
  fetchVendorCommConfig, saveVendorCommConfig, fetchSimulationScenarios
} from '../api';

export interface VendorFleetAndPricingHubProps {
  initialVendorId?: string;
  hideVendorSelector?: boolean;
}

export interface SimulationScenario {
  id: string;
  vendor_id?: string | null;
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
  sort_order?: number;
}

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
      floorApplied: false,
      isAllInclusive: false,
      pricingModel: 'DYNAMIC_MATRIX' as PricingModelType
    };
  }

  const pricingModel: PricingModelType = (rule.pricing_model_type as PricingModelType) || 'DYNAMIC_MATRIX';
  const tgMode: TaxGratuityDisplayMode = (rule.tax_gratuity_display_mode as TaxGratuityDisplayMode) || 'ITEMIZED_SEPARATE';
  const isAllInclusive = tgMode === 'ALL_INCLUSIVE_BUNDLED';

  const baseFare = Number(rule.base_rate_net || 0);
  const perMile = Number(rule.per_mile_rate_net || 0);
  const flatPerMile = Number(rule.flat_per_mile_all_inclusive !== undefined ? rule.flat_per_mile_all_inclusive : 5.50);
  const hourlyRate = Number(rule.hourly_rate_net || 0);
  const deadheadRate = Number(rule.deadhead_rate_per_mile || 0);
  const minFare = Number(rule.minimum_fare_net || 0);
  const minHours = Number(rule.hourly_minimum_hours || 2);

  let calculatedBase = 0;
  let distanceCharge = 0;
  let hourlyCharge = 0;
  let deadheadCharge = 0;
  let airportFee = 0;
  let meetGreetFee = 0;
  let rushHourFee = 0;
  let lateNightFee = 0;
  let waitFee = 0;
  let rawSubtotal = 0;

  if (pricingModel === 'FLAT_ALL_INCLUSIVE_PER_MILE' && !scenario.is_hourly) {
    distanceCharge = scenario.distance_miles * flatPerMile;
    rawSubtotal = distanceCharge;
  } else if (pricingModel === 'FLAT_HOURLY_CHARTER' || scenario.is_hourly) {
    const billableHours = Math.max(scenario.hourly_hours, minHours);
    hourlyCharge = billableHours * hourlyRate;
    rawSubtotal = hourlyCharge;
  } else {
    // DYNAMIC_MATRIX / VEHICLE_SPECIFIC_PREMIUM
    calculatedBase = baseFare;
    distanceCharge = scenario.distance_miles * perMile;
    deadheadCharge = scenario.deadhead_miles * deadheadRate;
    airportFee = scenario.is_airport ? Number(rule.airport_surcharge_net || 0) : 0;
    meetGreetFee = scenario.meet_and_greet ? Number(rule.meet_and_greet_fee_net || 0) : 0;
    rushHourFee = scenario.is_rush_hour ? Number(rule.rush_hour_surcharge_net || 0) : 0;
    lateNightFee = scenario.is_late_night ? Number(rule.late_night_surcharge_net || 0) : 0;
    
    const freeWait = Number(rule.free_wait_minutes || 15);
    const waitRate = Number(rule.wait_minute_rate_net || 1.0);
    const chargeableWait = Math.max(0, scenario.extra_wait_minutes - freeWait);
    waitFee = chargeableWait * waitRate;

    rawSubtotal = calculatedBase + distanceCharge + deadheadCharge + airportFee + meetGreetFee + rushHourFee + lateNightFee + waitFee;
  }

  const floorApplied = rawSubtotal < minFare;
  const netSubtotal = Math.max(rawSubtotal, minFare);
  
  let taxAmount = 0;
  let gratuityAmount = 0;
  let totalGross = netSubtotal;

  if (isAllInclusive) {
    taxAmount = 0;
    gratuityAmount = 0;
    totalGross = netSubtotal;
  } else {
    const taxRate = Number(rule.tax_rate || 0.08875);
    taxAmount = netSubtotal * taxRate;
    const gratuityRate = Number(rule.gratuity_rate !== undefined ? rule.gratuity_rate : 0.20);
    gratuityAmount = netSubtotal * gratuityRate;
    totalGross = netSubtotal + taxAmount + gratuityAmount;
  }

  return {
    baseFare: calculatedBase,
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
    floorApplied,
    isAllInclusive,
    pricingModel
  };
}

export const VendorFleetAndPricingHub: React.FC<VendorFleetAndPricingHubProps> = ({
  initialVendorId,
  hideVendorSelector = true
}) => {
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [selectedVendorId, setSelectedVendorId] = useState<string>(initialVendorId || 'vendor-boston-vip');
  const [activeTab, setActiveTab] = useState<'RESEARCH' | 'PRICING' | 'AI_YIELD' | 'COMM'>('RESEARCH');
  const [loading, setLoading] = useState<boolean>(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Data states
  const [rules, setRules] = useState<VendorPricingRule[]>([]);
  const [selectedRule, setSelectedRule] = useState<VendorPricingRule | null>(null);
  const [baselineRules, setBaselineRules] = useState<Record<string, VendorPricingRule>>({});
  const [aiMetrics, setAiMetrics] = useState<VendorAIDynamicPricingMetrics | null>(null);
  const [inventory, setInventory] = useState<Vehicle[]>([]);
  const [commConfig, setCommConfig] = useState<VendorCommConfig | null>(null);
  const [scenarios, setScenarios] = useState<SimulationScenario[]>([]);

  // Safety Confirmation Gates
  const [aiImpactAcknowledged, setAiImpactAcknowledged] = useState<boolean>(false);
  const [tariffImpactAcknowledged, setTariffImpactAcknowledged] = useState<boolean>(false);
  const [simCalcTrigger, setSimCalcTrigger] = useState<number>(0);
  const [showCommercialGuideModal, setShowCommercialGuideModal] = useState<boolean>(false);

  // Simulator state
  const [activeScenarioId, setActiveScenarioId] = useState<string>('airport_vip');
  const [customScenario, setCustomScenario] = useState<{
    id: string;
    name: string;
    description: string;
    icon: string;
    distance_miles: string | number;
    is_hourly: boolean;
    hourly_hours: string | number;
    deadhead_miles: string | number;
    is_airport: boolean;
    meet_and_greet: boolean;
    is_rush_hour: boolean;
    is_late_night: boolean;
    extra_wait_minutes: string | number;
  }>({
    id: 'custom',
    name: 'Custom Parameter Simulation',
    description: 'Custom trip distance, positioning deadhead, and surcharge configuration',
    icon: '🛠️',
    distance_miles: '25',
    is_hourly: false,
    hourly_hours: '3',
    deadhead_miles: '8',
    is_airport: true,
    meet_and_greet: true,
    is_rush_hour: false,
    is_late_night: false,
    extra_wait_minutes: '15'
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
      const [vList, rList, ai, inv, comm, scenList] = await Promise.all([
        fetchVendors().catch(() => []),
        fetchVendorPricingRules(vendorId).catch(() => []),
        fetchVendorAiYieldApi(vendorId).catch(() => null),
        fetchVendorFleetInventory(vendorId).catch(() => []),
        fetchVendorCommConfig(vendorId).catch(() => null),
        fetchSimulationScenarios(vendorId).catch(() => [])
      ]);
      setVendors(vList || []);
      setScenarios(scenList || []);

      const dbRules: VendorPricingRule[] = rList || [];
      setRules(dbRules);
      
      // Store authoritative database baseline copy
      const baseMap: Record<string, VendorPricingRule> = {};
      dbRules.forEach(r => {
        baseMap[r.vehicle_class] = JSON.parse(JSON.stringify(r));
      });
      setBaselineRules(baseMap);

      setSelectedRule(prev => {
        if (prev) {
          const found = dbRules.find(r => r.vehicle_class === prev.vehicle_class);
          return found || dbRules[0] || null;
        }
        return dbRules[0] || null;
      });

      if (scenList && scenList.length > 0 && activeScenarioId !== 'custom') {
        setActiveScenarioId(scenList[0].id);
      }

      setAiMetrics(ai || null);
      setInventory(inv || []);
      setCommConfig(comm || null);
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

  // Helper to update numeric rule fields cleanly without zero-lock
  const updateRuleField = (field: keyof VendorPricingRule, rawValue: any) => {
    if (!selectedRule) return;
    setSelectedRule(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        [field]: rawValue
      };
    });
  };

  const handlePerMileChange = (val: string) => {
    if (!selectedRule) return;
    const num = parseFloat(val);
    setSelectedRule(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        per_mile_rate_net: val as any,
        per_km_rate_net: !isNaN(num) ? parseFloat((num / 1.60934).toFixed(2)) : ('' as any)
      };
    });
  };

  const handleDeadheadChange = (val: string) => {
    if (!selectedRule) return;
    const num = parseFloat(val);
    setSelectedRule(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        deadhead_rate_per_mile: val as any,
        deadhead_rate_per_km: !isNaN(num) ? parseFloat((num / 1.60934).toFixed(2)) : ('' as any)
      };
    });
  };

  const handleSaveRule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRule) return;
    setLoading(true);
    try {
            const cleanRuleToSave: VendorPricingRule = {
        ...selectedRule,
        pricing_model_type: selectedRule.pricing_model_type || 'DYNAMIC_MATRIX',
        tax_gratuity_display_mode: selectedRule.tax_gratuity_display_mode || 'ITEMIZED_SEPARATE',
        flat_per_mile_all_inclusive: parseFloat(String(selectedRule.flat_per_mile_all_inclusive || 5.50)) || 5.50,
        flat_per_km_all_inclusive: parseFloat(String(selectedRule.flat_per_km_all_inclusive || 3.45)) || 3.45,
        base_rate_net: parseFloat(String(selectedRule.base_rate_net || 0)) || 0,
        per_mile_rate_net: parseFloat(String(selectedRule.per_mile_rate_net || 0)) || 0,
        per_km_rate_net: parseFloat(String(selectedRule.per_km_rate_net || 0)) || 0,
        hourly_rate_net: parseFloat(String(selectedRule.hourly_rate_net || 0)) || 0,
        hourly_minimum_hours: parseInt(String(selectedRule.hourly_minimum_hours || 2)) || 2,
        deadhead_rate_per_mile: parseFloat(String(selectedRule.deadhead_rate_per_mile || 0)) || 0,
        deadhead_rate_per_km: parseFloat(String(selectedRule.deadhead_rate_per_km || 0)) || 0,
        airport_surcharge_net: parseFloat(String(selectedRule.airport_surcharge_net || 0)) || 0,
        meet_and_greet_fee_net: parseFloat(String(selectedRule.meet_and_greet_fee_net || 0)) || 0,
        rush_hour_surcharge_net: parseFloat(String(selectedRule.rush_hour_surcharge_net || 0)) || 0,
        late_night_surcharge_net: parseFloat(String(selectedRule.late_night_surcharge_net || 0)) || 0,
        minimum_fare_net: parseFloat(String(selectedRule.minimum_fare_net || 0)) || 0,
        wait_minute_rate_net: parseFloat(String(selectedRule.wait_minute_rate_net || 0)) || 0,
        enable_out_of_town_stay: Boolean(selectedRule.enable_out_of_town_stay),
        out_of_town_stay_rate_net: parseFloat(String(selectedRule.out_of_town_stay_rate_net || 300)) || 300,
        overnight_distance_threshold_miles: parseFloat(String(selectedRule.overnight_distance_threshold_miles || 250)) || 250,
        daily_standby_min_hours: parseInt(String(selectedRule.daily_standby_min_hours || 6)) || 6,
      };

      await saveVendorPricingRule(selectedVendorId, cleanRuleToSave);
      setSuccessMsg(`Pricing rule for ${selectedRule.vehicle_class.replace('_', ' ')} successfully saved to database!`);
      setTimeout(() => setSuccessMsg(null), 3500);
      
      // Update baseline with the newly saved rule
      setBaselineRules(prev => ({
        ...prev,
        [selectedRule.vehicle_class]: JSON.parse(JSON.stringify(cleanRuleToSave))
      }));
      setTariffImpactAcknowledged(false);

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
      const updated = await trainVendorAiYieldApi(selectedVendorId);
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
      const updated = await applyVendorAiYieldApi(selectedVendorId);
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
    if (activeScenarioId === 'custom') {
      return {
        id: 'custom',
        name: customScenario.name,
        description: customScenario.description,
        icon: customScenario.icon,
        distance_miles: parseFloat(String(customScenario.distance_miles)) || 0,
        is_hourly: customScenario.is_hourly,
        hourly_hours: parseInt(String(customScenario.hourly_hours)) || 0,
        deadhead_miles: parseFloat(String(customScenario.deadhead_miles)) || 0,
        is_airport: customScenario.is_airport,
        meet_and_greet: customScenario.meet_and_greet,
        is_rush_hour: customScenario.is_rush_hour,
        is_late_night: customScenario.is_late_night,
        extra_wait_minutes: parseInt(String(customScenario.extra_wait_minutes)) || 0
      };
    }
    const found = scenarios.find(s => s.id === activeScenarioId);
    return found || scenarios[0] || {
      id: 'airport_vip',
      name: 'Airport VIP Arrival',
      description: 'Airport VIP Transfer',
      icon: '✈️',
      distance_miles: 22.0,
      is_hourly: false,
      hourly_hours: 3,
      deadhead_miles: 6.0,
      is_airport: true,
      meet_and_greet: true,
      is_rush_hour: false,
      is_late_night: false,
      extra_wait_minutes: 15
    };
  }, [activeScenarioId, customScenario, scenarios, simCalcTrigger]);

  // Baseline rule for active class
  const activeBaselineRule: VendorPricingRule | null = useMemo(() => {
    if (!selectedRule) return null;
    return baselineRules[selectedRule.vehicle_class] || null;
  }, [selectedRule, baselineRules]);

  // Simulated Quotes
  const baselineQuote = useMemo(() => {
    return computeSimulatedQuote(activeBaselineRule, currentScenario);
  }, [activeBaselineRule, currentScenario, simCalcTrigger]);

  const draftQuote = useMemo(() => {
    return computeSimulatedQuote(selectedRule, currentScenario);
  }, [selectedRule, currentScenario, simCalcTrigger]);

  // Deltas
  const netDelta = draftQuote.netSubtotal - baselineQuote.netSubtotal;
  const netDeltaPct = baselineQuote.netSubtotal > 0 ? (netDelta / baselineQuote.netSubtotal) * 100 : 0;
  const grossDelta = draftQuote.totalGross - baselineQuote.totalGross;
  const grossDeltaPct = baselineQuote.totalGross > 0 ? (grossDelta / baselineQuote.totalGross) * 100 : 0;

  // Check if current draft differs from saved database baseline
  const hasTariffChanges = useMemo(() => {
    if (!selectedRule || !activeBaselineRule) return false;
    return (
      parseFloat(String(selectedRule.base_rate_net)) !== parseFloat(String(activeBaselineRule.base_rate_net)) ||
      parseFloat(String(selectedRule.per_mile_rate_net)) !== parseFloat(String(activeBaselineRule.per_mile_rate_net)) ||
      parseFloat(String(selectedRule.minimum_fare_net)) !== parseFloat(String(activeBaselineRule.minimum_fare_net)) ||
      parseFloat(String(selectedRule.deadhead_rate_per_mile)) !== parseFloat(String(activeBaselineRule.deadhead_rate_per_mile)) ||
      parseFloat(String(selectedRule.airport_surcharge_net)) !== parseFloat(String(activeBaselineRule.airport_surcharge_net)) ||
      parseFloat(String(selectedRule.hourly_rate_net)) !== parseFloat(String(activeBaselineRule.hourly_rate_net)) ||
      parseFloat(String(selectedRule.rush_hour_surcharge_net)) !== parseFloat(String(activeBaselineRule.rush_hour_surcharge_net)) ||
      parseFloat(String(selectedRule.late_night_surcharge_net)) !== parseFloat(String(activeBaselineRule.late_night_surcharge_net)) ||
      parseFloat(String(selectedRule.meet_and_greet_fee_net)) !== parseFloat(String(activeBaselineRule.meet_and_greet_fee_net)) ||
      parseFloat(String(selectedRule.wait_minute_rate_net)) !== parseFloat(String(activeBaselineRule.wait_minute_rate_net))
    );
  }, [selectedRule, activeBaselineRule]);

  // Helper to render inline input diff tag
  const renderInputDiff = (savedVal: number | string | undefined, currentVal: number | string | undefined, prefix = '$', suffix = '') => {
    const s = parseFloat(String(savedVal || 0)) || 0;
    const c = parseFloat(String(currentVal || 0)) || 0;
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
          onClick={() => setActiveTab('RESEARCH')}
          style={{
            padding: '8px 16px',
            borderRadius: '8px',
            fontSize: '13px',
            fontWeight: 700,
            cursor: 'pointer',
            border: activeTab === 'RESEARCH' ? '1px solid #2563EB' : '1px solid transparent',
            background: activeTab === 'RESEARCH' ? '#EFF6FF' : 'transparent',
            color: activeTab === 'RESEARCH' ? '#2563EB' : 'var(--text-secondary)',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          <Sparkles size={15} color={activeTab === 'RESEARCH' ? '#2563EB' : undefined} /> Operations Research & Live Comparison
        </button>

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

      {/* TAB 0: OPERATIONS PRICING RESEARCH & REAL-TIME COMPARISON */}
      {activeTab === 'RESEARCH' && (
        <OperationsPricingResearchStudio
          vendorId={selectedVendorId}
          onRuleApplied={() => loadVendorData(selectedVendorId)}
        />
      )}

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

          {/* FULL WIDTH EXPANDED TARIFF STUDIO */}
          <div style={{ width: '100%' }}>
            
            {/* MAIN TARIFF PARAMETER INPUTS (FULL WIDTH WORKSPACE) */}
            <form onSubmit={handleSaveRule} className="glass-card" style={{ padding: '24px', width: '100%', background: '#FFFFFF', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '8px' }}>
                <div>
                  <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#0F172A', margin: 0 }}>
                    {selectedRule.vehicle_class.replace('_', ' ')} Pricing Strategy
                  </h3>
                  <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px', marginBottom: 0 }}>
                    Configure the active pricing model, tax/gratuity inclusivity, and rate thresholds for this tier.
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

              {/* SECTION 0: TIER PRICING MODEL STRATEGY SELECTOR */}
              <div style={{ marginBottom: '18px', padding: '14px', background: '#F8FAFC', borderRadius: '10px', border: '1px solid var(--border-subtle)' }}>
                <div style={{ fontSize: '11px', fontWeight: 800, color: '#1E293B', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Sparkles size={13} color="#2563EB" /> Commercial Pricing Model for {selectedRule.vehicle_class.replace('_', ' ')}:
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '12px' }}>
                  {/* Model 1: Dynamic Matrix */}
                  <div
                    onClick={() => updateRuleField('pricing_model_type', 'DYNAMIC_MATRIX')}
                    style={{
                      padding: '10px',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      border: (selectedRule.pricing_model_type || 'DYNAMIC_MATRIX') === 'DYNAMIC_MATRIX' ? '2px solid #2563EB' : '1px solid var(--border-subtle)',
                      background: (selectedRule.pricing_model_type || 'DYNAMIC_MATRIX') === 'DYNAMIC_MATRIX' ? '#EFF6FF' : '#FFFFFF',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <div style={{ fontSize: '12px', fontWeight: 800, color: (selectedRule.pricing_model_type || 'DYNAMIC_MATRIX') === 'DYNAMIC_MATRIX' ? '#1E40AF' : '#0F172A' }}>
                      ⚡ Dynamic 3-Leg Matrix
                    </div>
                    <div style={{ fontSize: '10px', color: 'var(--text-secondary)', marginTop: '2px', lineHeight: 1.3 }}>
                      Base + Mileage + Deadhead + Airport + Rush/Night Surcharges.
                    </div>
                  </div>

                  {/* Model 2: Flat All-Inclusive Per-Mile */}
                  <div
                    onClick={() => updateRuleField('pricing_model_type', 'FLAT_ALL_INCLUSIVE_PER_MILE')}
                    style={{
                      padding: '10px',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      border: selectedRule.pricing_model_type === 'FLAT_ALL_INCLUSIVE_PER_MILE' ? '2px solid #059669' : '1px solid var(--border-subtle)',
                      background: selectedRule.pricing_model_type === 'FLAT_ALL_INCLUSIVE_PER_MILE' ? '#ECFDF5' : '#FFFFFF',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <div style={{ fontSize: '12px', fontWeight: 800, color: selectedRule.pricing_model_type === 'FLAT_ALL_INCLUSIVE_PER_MILE' ? '#047857' : '#0F172A' }}>
                      🏷️ Flat All-Inclusive Rate
                    </div>
                    <div style={{ fontSize: '10px', color: 'var(--text-secondary)', marginTop: '2px', lineHeight: 1.3 }}>
                      Single all-in rate per mile/km + Minimum trip floor.
                    </div>
                  </div>

                  {/* Model 3: Flat Hourly Charter */}
                  <div
                    onClick={() => updateRuleField('pricing_model_type', 'FLAT_HOURLY_CHARTER')}
                    style={{
                      padding: '10px',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      border: selectedRule.pricing_model_type === 'FLAT_HOURLY_CHARTER' ? '2px solid #7C3AED' : '1px solid var(--border-subtle)',
                      background: selectedRule.pricing_model_type === 'FLAT_HOURLY_CHARTER' ? '#F5F3FF' : '#FFFFFF',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <div style={{ fontSize: '12px', fontWeight: 800, color: selectedRule.pricing_model_type === 'FLAT_HOURLY_CHARTER' ? '#6D28D9' : '#0F172A' }}>
                      ⏱️ Hourly Charter Dedicated
                    </div>
                    <div style={{ fontSize: '10px', color: 'var(--text-secondary)', marginTop: '2px', lineHeight: 1.3 }}>
                      Fixed $/hour charter with minimum duration.
                    </div>
                  </div>

                  {/* Model 4: Showroom Vehicle Specific */}
                  <div
                    onClick={() => updateRuleField('pricing_model_type', 'VEHICLE_SPECIFIC_PREMIUM')}
                    style={{
                      padding: '10px',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      border: selectedRule.pricing_model_type === 'VEHICLE_SPECIFIC_PREMIUM' ? '2px solid #D97706' : '1px solid var(--border-subtle)',
                      background: selectedRule.pricing_model_type === 'VEHICLE_SPECIFIC_PREMIUM' ? '#FFFBEB' : '#FFFFFF',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <div style={{ fontSize: '12px', fontWeight: 800, color: selectedRule.pricing_model_type === 'VEHICLE_SPECIFIC_PREMIUM' ? '#B45309' : '#0F172A' }}>
                      💎 Showroom Asset Premium
                    </div>
                    <div style={{ fontSize: '10px', color: 'var(--text-secondary)', marginTop: '2px', lineHeight: 1.3 }}>
                      Uses custom rates set on specific Showroom profile.
                    </div>
                  </div>
                </div>

                {/* TAX & GRATUITY INCLUSIVITY SWITCHER */}
                <div style={{ borderTop: '1px dashed var(--border-subtle)', paddingTop: '10px', marginTop: '6px' }}>
                  <div style={{ fontSize: '11px', fontWeight: 800, color: '#334155', marginBottom: '6px' }}>
                    Tax & Chauffeur Gratuity Checkout Policy:
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                    <button
                      type="button"
                      onClick={() => updateRuleField('tax_gratuity_display_mode', 'ITEMIZED_SEPARATE')}
                      style={{
                        padding: '6px 10px',
                        borderRadius: '6px',
                        fontSize: '11px',
                        fontWeight: 700,
                        cursor: 'pointer',
                        border: (selectedRule.tax_gratuity_display_mode || 'ITEMIZED_SEPARATE') === 'ITEMIZED_SEPARATE' ? '1.5px solid #2563EB' : '1px solid var(--border-subtle)',
                        background: (selectedRule.tax_gratuity_display_mode || 'ITEMIZED_SEPARATE') === 'ITEMIZED_SEPARATE' ? '#EFF6FF' : '#FFFFFF',
                        color: (selectedRule.tax_gratuity_display_mode || 'ITEMIZED_SEPARATE') === 'ITEMIZED_SEPARATE' ? '#1E40AF' : '#64748B'
                      }}
                    >
                      🧾 Itemize Tax & Gratuity Separately
                    </button>

                    <button
                      type="button"
                      onClick={() => updateRuleField('tax_gratuity_display_mode', 'ALL_INCLUSIVE_BUNDLED')}
                      style={{
                        padding: '6px 10px',
                        borderRadius: '6px',
                        fontSize: '11px',
                        fontWeight: 700,
                        cursor: 'pointer',
                        border: selectedRule.tax_gratuity_display_mode === 'ALL_INCLUSIVE_BUNDLED' ? '1.5px solid #059669' : '1px solid var(--border-subtle)',
                        background: selectedRule.tax_gratuity_display_mode === 'ALL_INCLUSIVE_BUNDLED' ? '#ECFDF5' : '#FFFFFF',
                        color: selectedRule.tax_gratuity_display_mode === 'ALL_INCLUSIVE_BUNDLED' ? '#047857' : '#64748B'
                      }}
                    >
                      ✨ All-Inclusive (Tax & Tip Bundled in Total)
                    </button>
                  </div>
                </div>
              </div>

              {/* SECTION 1: DYNAMIC INPUTS ACCORDING TO ACTIVE MODEL */}
              {selectedRule.pricing_model_type === 'FLAT_ALL_INCLUSIVE_PER_MILE' ? (
                /* FLAT ALL-INCLUSIVE FIELDS */
                <div style={{ marginBottom: '18px', padding: '16px', background: '#ECFDF5', border: '1.5px solid #A7F3D0', borderRadius: '10px' }}>
                  <div style={{ fontSize: '12px', fontWeight: 800, color: '#065F46', marginBottom: '8px' }}>
                    🏷️ All-Inclusive Flat Mileage Configuration
                  </div>
                  <p style={{ fontSize: '11px', color: '#047857', marginBottom: '14px', lineHeight: 1.4 }}>
                    All staging deadhead, fuel surcharges, airport access fees, and tolls are bundled directly into this single flat mileage rate.
                  </p>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <div>
                      <label style={{ fontSize: '11px', fontWeight: 800, color: '#065F46', display: 'block', marginBottom: '2px' }}>
                        FLAT ALL-INCLUSIVE PER MILE ({selectedRule.currency}) *
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        required
                        value={selectedRule.flat_per_mile_all_inclusive !== undefined ? selectedRule.flat_per_mile_all_inclusive : '5.50'}
                        onChange={(e) => updateRuleField('flat_per_mile_all_inclusive', e.target.value)}
                        style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', fontSize: '15px', fontWeight: 800, border: '1px solid #10B981' }}
                      />
                      <div style={{ marginTop: '3px' }}>
                        {renderInputDiff(activeBaselineRule?.flat_per_mile_all_inclusive || 5.50, selectedRule.flat_per_mile_all_inclusive || 5.50, '$', '/mi')}
                      </div>
                    </div>

                    <div>
                      <label style={{ fontSize: '11px', fontWeight: 800, color: '#065F46', display: 'block', marginBottom: '2px' }}>
                        MINIMUM TRIP FARE FLOOR ({selectedRule.currency}) *
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        required
                        value={selectedRule.minimum_fare_net !== undefined ? selectedRule.minimum_fare_net : ''}
                        onChange={(e) => updateRuleField('minimum_fare_net', e.target.value)}
                        style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', fontSize: '15px', fontWeight: 800, border: '1px solid #10B981' }}
                      />
                      <div style={{ marginTop: '3px' }}>
                        {renderInputDiff(activeBaselineRule?.minimum_fare_net, selectedRule.minimum_fare_net)}
                      </div>
                    </div>
                  </div>
                </div>
              ) : selectedRule.pricing_model_type === 'FLAT_HOURLY_CHARTER' ? (
                /* FLAT HOURLY CHARTER FIELDS */
                <div style={{ marginBottom: '18px', padding: '16px', background: '#F5F3FF', border: '1.5px solid #DDD6FE', borderRadius: '10px' }}>
                  <div style={{ fontSize: '12px', fontWeight: 800, color: '#5B21B6', marginBottom: '8px' }}>
                    ⏱️ Dedicated Hourly Charter Configuration
                  </div>
                  <p style={{ fontSize: '11px', color: '#6D28D9', marginBottom: '14px', lineHeight: 1.4 }}>
                    Trips for this tier will be priced as dedicated hourly charters by default, with fixed hourly rates and minimum booking durations.
                  </p>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <div>
                      <label style={{ fontSize: '11px', fontWeight: 800, color: '#5B21B6', display: 'block', marginBottom: '2px' }}>
                        HOURLY CHARTER RATE ({selectedRule.currency}/HR) *
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        required
                        value={selectedRule.hourly_rate_net !== undefined ? selectedRule.hourly_rate_net : ''}
                        onChange={(e) => updateRuleField('hourly_rate_net', e.target.value)}
                        style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', fontSize: '15px', fontWeight: 800, border: '1px solid #8B5CF6' }}
                      />
                      <div style={{ marginTop: '3px' }}>
                        {renderInputDiff(activeBaselineRule?.hourly_rate_net, selectedRule.hourly_rate_net, '$', '/hr')}
                      </div>
                    </div>

                    <div>
                      <label style={{ fontSize: '11px', fontWeight: 800, color: '#5B21B6', display: 'block', marginBottom: '2px' }}>
                        MINIMUM CHARTER DURATION (HOURS) *
                      </label>
                      <input
                        type="number"
                        min="1"
                        max="24"
                        required
                        value={selectedRule.hourly_minimum_hours !== undefined ? selectedRule.hourly_minimum_hours : 2}
                        onChange={(e) => updateRuleField('hourly_minimum_hours', e.target.value)}
                        style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', fontSize: '15px', fontWeight: 800, border: '1px solid #8B5CF6' }}
                      />
                    </div>
                  </div>
                </div>
              ) : selectedRule.pricing_model_type === 'VEHICLE_SPECIFIC_PREMIUM' ? (
                /* VEHICLE SPECIFIC ASSET PREMIUM FIELDS */
                <div style={{ marginBottom: '18px', padding: '16px', background: '#FFFBEB', border: '1.5px solid #FCD34D', borderRadius: '10px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <div style={{ fontSize: '12px', fontWeight: 800, color: '#92400E' }}>
                      💎 Asset-Specific Vehicle Rates & Showroom Roster
                    </div>
                    <span style={{ fontSize: '10px', background: '#FEF3C7', color: '#B45309', padding: '2px 8px', borderRadius: '4px', fontWeight: 700, border: '1px solid #FDE68A' }}>
                      PPA/TLC Fleet Integrated
                    </span>
                  </div>
                  <p style={{ fontSize: '11px', color: '#B45309', marginBottom: '14px', lineHeight: 1.4 }}>
                    Instead of a single uniform class tariff, quotes for vehicles in this class use the exact hourly and mileage rates configured on each specific vehicle profile in your <strong>Fleet & PPA/TLC Permits</strong> inventory.
                  </p>

                  {/* Matching Fleet Asset Roster */}
                  <div style={{ background: '#FFFFFF', borderRadius: '8px', border: '1px solid #FDE68A', padding: '10px', marginBottom: '14px' }}>
                    <div style={{ fontSize: '11px', fontWeight: 800, color: '#78350F', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      Registered Vehicles in {selectedRule.vehicle_class.replace(/_/g, ' ')} Tier ({inventory.filter(v => v.vehicle_class === selectedRule.vehicle_class).length}):
                    </div>
                    {inventory.filter(v => v.vehicle_class === selectedRule.vehicle_class).length > 0 ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {inventory.filter(v => v.vehicle_class === selectedRule.vehicle_class).map((v) => (
                          <div key={v.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', background: '#FDFBF7', borderRadius: '6px', border: '1px solid #FEF3C7' }}>
                            <div>
                              <div style={{ fontWeight: 800, fontSize: '13px', color: '#0F172A' }}>
                                {v.year} {v.make} {v.model}
                              </div>
                              <div style={{ fontSize: '10px', color: '#64748B', marginTop: '1px' }}>
                                Plate: <span style={{ fontFamily: 'monospace', fontWeight: 700, color: '#0F172A' }}>{v.license_plate}</span> · {v.passenger_capacity} Pass · {v.luggage_capacity} Bags · {v.exterior_color}
                              </div>
                            </div>
                            <div style={{ textAlign: 'right' }}>
                              <div style={{ fontSize: '14px', fontWeight: 800, color: '#B45309' }}>
                                ${Number(v.hourly_rate_usd || selectedRule.hourly_rate_net || 125).toFixed(2)} <span style={{ fontSize: '10px', fontWeight: 600, color: '#78350F' }}>/ hr</span>
                              </div>
                              <div style={{ fontSize: '10px', color: '#92400E' }}>
                                3-Hr Min · All-Inclusive
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div style={{ fontSize: '11px', color: '#92400E', fontStyle: 'italic', padding: '6px 0' }}>
                        No specific vehicles registered under this tier yet. Rates will default to the baseline values below.
                      </div>
                    )}
                  </div>

                  {/* Tier Baseline Default Inputs (for unassigned vehicles) */}
                  <div style={{ fontSize: '11px', fontWeight: 800, color: '#78350F', marginBottom: '8px' }}>
                    Default Fallback Baseline Rates:
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <div>
                      <label style={{ fontSize: '11px', fontWeight: 800, color: '#92400E', display: 'block', marginBottom: '2px' }}>
                        DEFAULT HOURLY RATE ({selectedRule.currency}/HR) *
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        required
                        value={selectedRule.hourly_rate_net !== undefined ? selectedRule.hourly_rate_net : ''}
                        onChange={(e) => updateRuleField('hourly_rate_net', e.target.value)}
                        style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', fontSize: '14px', fontWeight: 800, border: '1px solid #F59E0B' }}
                      />
                    </div>

                    <div>
                      <label style={{ fontSize: '11px', fontWeight: 800, color: '#92400E', display: 'block', marginBottom: '2px' }}>
                        MINIMUM CHARTER DURATION (HOURS) *
                      </label>
                      <input
                        type="number"
                        min="1"
                        max="24"
                        required
                        value={selectedRule.hourly_minimum_hours !== undefined ? selectedRule.hourly_minimum_hours : 3}
                        onChange={(e) => updateRuleField('hourly_minimum_hours', e.target.value)}
                        style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', fontSize: '14px', fontWeight: 800, border: '1px solid #F59E0B' }}
                      />
                    </div>
                  </div>
                </div>
              ) : (
                /* DYNAMIC 3-LEG ENTERPRISE MATRIX FIELDS */
                <>
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
                          value={selectedRule.base_rate_net !== undefined ? selectedRule.base_rate_net : ''}
                          onChange={(e) => updateRuleField('base_rate_net', e.target.value)}
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
                          value={selectedRule.per_mile_rate_net !== undefined ? selectedRule.per_mile_rate_net : ''}
                          onChange={(e) => handlePerMileChange(e.target.value)}
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
                          value={selectedRule.hourly_rate_net !== undefined ? selectedRule.hourly_rate_net : ''}
                          onChange={(e) => updateRuleField('hourly_rate_net', e.target.value)}
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
                          value={selectedRule.deadhead_rate_per_mile !== undefined ? selectedRule.deadhead_rate_per_mile : ''}
                          onChange={(e) => handleDeadheadChange(e.target.value)}
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
                          value={selectedRule.airport_surcharge_net !== undefined ? selectedRule.airport_surcharge_net : ''}
                          onChange={(e) => updateRuleField('airport_surcharge_net', e.target.value)}
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
                          value={selectedRule.meet_and_greet_fee_net !== undefined ? selectedRule.meet_and_greet_fee_net : ''}
                          onChange={(e) => updateRuleField('meet_and_greet_fee_net', e.target.value)}
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
                          value={selectedRule.rush_hour_surcharge_net !== undefined ? selectedRule.rush_hour_surcharge_net : ''}
                          onChange={(e) => updateRuleField('rush_hour_surcharge_net', e.target.value)}
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
                          value={selectedRule.late_night_surcharge_net !== undefined ? selectedRule.late_night_surcharge_net : ''}
                          onChange={(e) => updateRuleField('late_night_surcharge_net', e.target.value)}
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
                          value={selectedRule.minimum_fare_net !== undefined ? selectedRule.minimum_fare_net : ''}
                          onChange={(e) => updateRuleField('minimum_fare_net', e.target.value)}
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
                          value={selectedRule.wait_minute_rate_net !== undefined ? selectedRule.wait_minute_rate_net : ''}
                          onChange={(e) => updateRuleField('wait_minute_rate_net', e.target.value)}
                          style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', fontSize: '14px', fontWeight: 700, border: '1px solid var(--border-subtle)' }}
                        />
                        <div style={{ marginTop: '3px' }}>
                          {renderInputDiff(activeBaselineRule?.wait_minute_rate_net, selectedRule.wait_minute_rate_net, '$', '/min')}
                        </div>
                      </div>
                    </div>
                  </div>
                </>
              )}

              {/* OUT-OF-TOWN CHAUFFEUR STAY & SUSTENANCE POLICY (COMBINED HOTEL + MEALS) */}
              <div style={{
                marginBottom: '18px',
                padding: '16px',
                background: selectedRule.enable_out_of_town_stay ? '#EFF6FF' : '#F8FAFC',
                border: selectedRule.enable_out_of_town_stay ? '1.5px solid #3B82F6' : '1px solid var(--border-subtle)',
                borderRadius: '10px',
                transition: 'all 0.2s ease'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', flexWrap: 'wrap', gap: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '18px' }}>🌙</span>
                    <div>
                      <div style={{ fontSize: '13px', fontWeight: 800, color: '#0F172A' }}>
                        Out-of-Town Chauffeur Stay &amp; Sustenance Policy
                      </div>
                      <p style={{ fontSize: '11px', color: 'var(--text-secondary)', margin: '1px 0 0 0' }}>
                        When enabled, the pricing engine automatically calculates driver hotel lodging + meal per diem for long-distance multi-day roadshows.
                      </p>
                    </div>
                  </div>

                  {/* Master Toggle */}
                  <label style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={Boolean(selectedRule.enable_out_of_town_stay)}
                      onChange={(e) => updateRuleField('enable_out_of_town_stay', e.target.checked)}
                      style={{ width: '18px', height: '18px', accentColor: '#2563EB', cursor: 'pointer' }}
                    />
                    <span style={{ fontSize: '12px', fontWeight: 800, color: selectedRule.enable_out_of_town_stay ? '#1E40AF' : '#64748B' }}>
                      {selectedRule.enable_out_of_town_stay ? 'ACTIVE (CALCULATE STAY)' : 'INACTIVE (DISABLED)'}
                    </span>
                  </label>
                </div>

                {selectedRule.enable_out_of_town_stay && (
                  <div style={{ marginTop: '14px', paddingTop: '12px', borderTop: '1px solid #DBEAFE', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
                    <div>
                      <label style={{ fontSize: '11px', fontWeight: 800, color: '#1E40AF', display: 'block', marginBottom: '2px' }}>
                        COMBINED OVERNIGHT STAY &amp; MEALS RATE ({selectedRule.currency}/NIGHT) *
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        required
                        value={selectedRule.out_of_town_stay_rate_net !== undefined ? selectedRule.out_of_town_stay_rate_net : 300.0}
                        onChange={(e) => updateRuleField('out_of_town_stay_rate_net', e.target.value)}
                        style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', fontSize: '14px', fontWeight: 800, border: '1.5px solid #3B82F6', background: '#FFFFFF' }}
                      />
                      <span style={{ fontSize: '10px', color: '#64748B', display: 'block', marginTop: '2px' }}>
                        Standard market rate: $250.00 – $350.00 / night (Hotel + Meals)
                      </span>
                    </div>

                    <div>
                      <label style={{ fontSize: '11px', fontWeight: 800, color: '#1E40AF', display: 'block', marginBottom: '2px' }}>
                        OVERNIGHT DISTANCE TRIGGER THRESHOLD (MILES) *
                      </label>
                      <input
                        type="number"
                        step="1"
                        required
                        value={selectedRule.overnight_distance_threshold_miles !== undefined ? selectedRule.overnight_distance_threshold_miles : 250}
                        onChange={(e) => updateRuleField('overnight_distance_threshold_miles', e.target.value)}
                        style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', fontSize: '14px', fontWeight: 800, border: '1.5px solid #3B82F6', background: '#FFFFFF' }}
                      />
                      <span style={{ fontSize: '10px', color: '#64748B', display: 'block', marginTop: '2px' }}>
                        Trips exceeding this distance automatically trigger overnight stay billing
                      </span>
                    </div>

                    <div>
                      <label style={{ fontSize: '11px', fontWeight: 800, color: '#1E40AF', display: 'block', marginBottom: '2px' }}>
                        DAILY MINIMUM STANDBY CHARTER (HOURS) *
                      </label>
                      <input
                        type="number"
                        min="1"
                        max="24"
                        required
                        value={selectedRule.daily_standby_min_hours !== undefined ? selectedRule.daily_standby_min_hours : 6}
                        onChange={(e) => updateRuleField('daily_standby_min_hours', e.target.value)}
                        style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', fontSize: '14px', fontWeight: 800, border: '1.5px solid #3B82F6', background: '#FFFFFF' }}
                      />
                      <span style={{ fontSize: '10px', color: '#64748B', display: 'block', marginTop: '2px' }}>
                        Guaranteed billable hours per calendar day for out-of-town standby
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* LIVE DISPATCH IMPACT CONFIRMATION GATE */}
              {hasTariffChanges && (
                <div style={{
                  background: tariffImpactAcknowledged ? '#EFF6FF' : '#FFFBEB',
                  border: tariffImpactAcknowledged ? '1.5px solid #3B82F6' : '1.5px solid #F59E0B',
                  borderRadius: '8px',
                  padding: '12px 14px',
                  marginBottom: '12px',
                  boxShadow: '0 2px 6px rgba(0,0,0,0.03)'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
                    <span style={{ fontSize: '15px' }}>⚠️</span>
                    <span style={{ fontSize: '12px', fontWeight: 800, color: tariffImpactAcknowledged ? '#1E40AF' : '#92400E' }}>
                      Pending Rate Changes Detected
                    </span>
                  </div>
                  <p style={{ fontSize: '11px', color: '#475569', margin: '0 0 8px 0', lineHeight: 1.4 }}>
                    Modifications will immediately update live passenger quote calculations for <strong>{selectedRule.vehicle_class.replace('_', ' ')}</strong> upon saving.
                  </p>
                  <label style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', cursor: 'pointer', fontSize: '11px', fontWeight: 700, color: '#0F172A' }}>
                    <input
                      type="checkbox"
                      checked={tariffImpactAcknowledged}
                      onChange={(e) => setTariffImpactAcknowledged(e.target.checked)}
                      style={{ marginTop: '1px', width: '15px', height: '15px', accentColor: '#2563EB', cursor: 'pointer' }}
                    />
                    <span>I understand the quote impact and confirm these updated tariff rates are ready to deploy to live dispatch.</span>
                  </label>
                </div>
              )}

              {/* SAVE BUTTON */}
              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <button 
                  type="submit" 
                  disabled={loading || (hasTariffChanges && !tariffImpactAcknowledged)} 
                  className="btn-primary" 
                  style={{ 
                    width: '100%', 
                    padding: '12px', 
                    fontSize: '14px', 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center', 
                    gap: '8px',
                    opacity: (hasTariffChanges && !tariffImpactAcknowledged) ? 0.5 : 1,
                    cursor: (hasTariffChanges && !tariffImpactAcknowledged) ? 'not-allowed' : 'pointer'
                  }}
                >
                  <ShieldCheck size={18} /> {hasTariffChanges && !tariffImpactAcknowledged ? '🔒 Acknowledge Impact Checkbox Above to Save' : `Save & Apply ${selectedRule.vehicle_class.replace('_', ' ')} Tariff`}
                </button>
              </div>
            </form>
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

            {/* Rate Impact & Safety Confirmation Gate */}
            <div style={{
              background: aiImpactAcknowledged ? '#EFF6FF' : '#FFFBEB',
              border: aiImpactAcknowledged ? '1.5px solid #3B82F6' : '1.5px solid #F59E0B',
              borderRadius: '8px',
              padding: '14px',
              marginBottom: '16px',
              boxShadow: '0 2px 6px rgba(0,0,0,0.03)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                <span style={{ fontSize: '16px' }}>⚠️</span>
                <span style={{ fontSize: '12px', fontWeight: 800, color: aiImpactAcknowledged ? '#1E40AF' : '#92400E' }}>
                  Live Dispatch Impact Confirmation Gate
                </span>
              </div>
              <p style={{ fontSize: '11px', color: '#475569', lineHeight: 1.5, margin: '0 0 10px 0' }}>
                Applying these AI dynamic rates will immediately overwrite base fares and mileage rates across all fleet tiers in your database, updating real-time quote generation for upcoming passenger bookings.
              </p>
              <label style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', cursor: 'pointer', fontSize: '12px', fontWeight: 700, color: '#0F172A' }}>
                <input
                  type="checkbox"
                  checked={aiImpactAcknowledged}
                  onChange={(e) => setAiImpactAcknowledged(e.target.checked)}
                  style={{ marginTop: '2px', width: '16px', height: '16px', accentColor: '#2563EB', cursor: 'pointer' }}
                />
                <span>I understand and acknowledge the revenue & dispatch impact of applying these dynamic rates to my live catalog.</span>
              </label>
            </div>

            <button
              className="btn-gold"
              onClick={handleApplyAI}
              disabled={loading || !aiImpactAcknowledged}
              style={{
                width: '100%',
                padding: '12px',
                fontSize: '13px',
                fontWeight: 800,
                opacity: (!aiImpactAcknowledged || loading) ? 0.45 : 1,
                cursor: (!aiImpactAcknowledged || loading) ? 'not-allowed' : 'pointer',
                transition: 'all 0.2s ease'
              }}
            >
              {aiImpactAcknowledged ? '⚡ Apply AI Dynamic Rates to Catalog' : '🔒 Check Confirmation Box Above to Apply'}
            </button>
          </div>
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
