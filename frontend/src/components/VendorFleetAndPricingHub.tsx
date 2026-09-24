import React, { useState, useEffect } from 'react';
import { 
  Building2, DollarSign, TrendingUp, Cpu, Globe, Lock, 
  ShieldCheck, Plus, RefreshCw, CheckCircle2, Sliders, Mail, Phone, Zap
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

export const VendorFleetAndPricingHub: React.FC<VendorFleetAndPricingHubProps> = ({
  initialVendorId,
  hideVendorSelector = false
}) => {
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [selectedVendorId, setSelectedVendorId] = useState<string>(initialVendorId || 'vendor_anb_philly');
  const [activeTab, setActiveTab] = useState<'PRICING' | 'AI_YIELD' | 'INVENTORY' | 'COMM'>('PRICING');
  const [loading, setLoading] = useState<boolean>(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);


  // Data states
  const [rules, setRules] = useState<VendorPricingRule[]>([]);
  const [selectedRule, setSelectedRule] = useState<VendorPricingRule | null>(null);
  const [aiMetrics, setAiMetrics] = useState<VendorAIDynamicPricingMetrics | null>(null);
  const [inventory, setInventory] = useState<Vehicle[]>([]);
  const [commConfig, setCommConfig] = useState<VendorCommConfig | null>(null);

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
        fetchVendors(),
        fetchVendorPricingRules(vendorId),
        fetchVendorAIYield(vendorId),
        fetchVendorFleetInventory(vendorId),
        fetchVendorCommConfig(vendorId)
      ]);
      setVendors(vList);
      setRules(rList);
      if (rList.length > 0) setSelectedRule(rList[0]);
      setAiMetrics(ai);
      setInventory(inv);
      setCommConfig(comm);
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
      setSuccessMsg(`Pricing rule for ${selectedRule.vehicle_class} successfully updated!`);
      setTimeout(() => setSuccessMsg(null), 3500);
      const updatedRules = await fetchVendorPricingRules(selectedVendorId);
      setRules(updatedRules);
    } catch (err: any) {
      alert(err.message || 'Failed to save rule');
    } finally {
      setLoading(false);
    }
  };

  const handleTrainAI = async () => {
    setLoading(true);
    try {
      const updated = await trainVendorAIYield(selectedVendorId);
      setAiMetrics(updated);
      setSuccessMsg('AI Neural Dynamic Yield model re-trained successfully over recent booking conversion logs!');
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

  return (
    <div style={{ maxWidth: '1440px', margin: '0 auto', padding: '24px' }}>
      {/* Header Banner - Executive White Light Luxury */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <div className="gold-badge" style={{ marginBottom: '6px' }}>
            <Sliders size={12} /> Autonomous Vendor Operations Console
          </div>
          <h1 style={{ fontSize: '28px', fontWeight: 800, color: '#0F172A' }}>
            Vendor Pricing Rules, AI Yield & Fleet Inventory
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginTop: '4px' }}>
            Configure your custom pricing models, continuous AI dynamic yield learning, fleet inventory network sharing (Global vs Local), and AWS SES communication relays.
          </p>
        </div>

        {/* Vendor Selector Switcher */}
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
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
                <option value="vendor-ny-executive">New York Executive Chauffeur & Fleet LLC</option>
              )}
            </select>
          </div>

          <button className="btn-secondary" onClick={() => loadVendorData(selectedVendorId)} style={{ fontSize: '13px', padding: '10px 14px' }}>
            <RefreshCw size={14} className={loading ? 'pulse-live' : ''} />
          </button>
        </div>
      </div>

      {successMsg && (
        <div style={{ background: 'rgba(16, 185, 129, 0.1)', border: '1px solid #10B981', color: '#047857', padding: '12px 18px', borderRadius: '10px', marginBottom: '20px', fontSize: '14px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
          <CheckCircle2 size={16} color="#10B981" /> {successMsg}
        </div>
      )}

      {/* Navigation Sub-Tabs */}
      <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid var(--border-subtle)', marginBottom: '24px', overflowX: 'auto', paddingBottom: '4px' }}>
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
          <DollarSign size={15} /> Autonomous Pricing Matrix
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

      {/* TAB 1: PRICING RULES MATRIX */}
      {activeTab === 'PRICING' && (
        <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: '24px' }}>
          {/* Vehicle Tier Picker List */}
          <div className="glass-card" style={{ padding: '20px' }}>
            <h3 style={{ fontSize: '15px', fontWeight: 800, color: '#0F172A', marginBottom: '14px' }}>
              Vehicle Tiers & Rates
            </h3>
            <div style={{ display: 'grid', gap: '8px' }}>
              {rules.map(r => (
                <div
                  key={r.vehicle_class}
                  onClick={() => setSelectedRule(r)}
                  style={{
                    padding: '12px 14px',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    background: selectedRule?.vehicle_class === r.vehicle_class ? '#EFF6FF' : '#F8FAFC',
                    border: selectedRule?.vehicle_class === r.vehicle_class ? '1px solid #2563EB' : '1px solid var(--border-subtle)',
                    transition: 'all 0.15s'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                    <span style={{ fontWeight: 800, color: '#0F172A', fontSize: '13px' }}>{r.vehicle_class}</span>
                    <span style={{ fontSize: '12px', fontWeight: 700, color: '#2563EB' }}>
                      ${Number(r.base_rate_net).toFixed(2)} Base
                    </span>
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                    ${Number(r.per_mile_rate_net).toFixed(2)} / mi · ${Number(r.deadhead_rate_per_mile).toFixed(2)} staging deadhead
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Detailed Pricing Rule Editor Form */}
          {selectedRule && (
            <form onSubmit={handleSaveRule} className="glass-card" style={{ padding: '28px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <div>
                  <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#0F172A' }}>
                    Custom Pricing Tariff: {selectedRule.vehicle_class}
                  </h3>
                  <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                    Set your base fares, per-mile, per-km, deadhead staging rates, and surcharges.
                  </p>
                </div>

                <div className="gold-badge">
                  {selectedRule.currency} ({selectedRule.distance_unit})
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '24px' }}>
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
                    style={{ width: '100%', padding: '10px', borderRadius: '8px', fontSize: '14px' }}
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
                        per_km_rate_net: parseFloat((mi / 1.60934).toFixed(2))
                      });
                    }}
                    style={{ width: '100%', padding: '10px', borderRadius: '8px', fontSize: '14px' }}
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
                    style={{ width: '100%', padding: '10px', borderRadius: '8px', fontSize: '14px' }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                    HOURLY AS-DIRECTED RATE ({selectedRule.currency}/HR)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={selectedRule.hourly_rate_net}
                    onChange={(e) => setSelectedRule({ ...selectedRule, hourly_rate_net: parseFloat(e.target.value) || 0 })}
                    style={{ width: '100%', padding: '10px', borderRadius: '8px', fontSize: '14px' }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                    DEPOT DEADHEAD STAGING ({selectedRule.currency}/MILE)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={selectedRule.deadhead_rate_per_mile}
                    onChange={(e) => setSelectedRule({ ...selectedRule, deadhead_rate_per_mile: parseFloat(e.target.value) || 0 })}
                    style={{ width: '100%', padding: '10px', borderRadius: '8px', fontSize: '14px' }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                    AIRPORT / FBO SURCHARGE ({selectedRule.currency})
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={selectedRule.airport_surcharge_net}
                    onChange={(e) => setSelectedRule({ ...selectedRule, airport_surcharge_net: parseFloat(e.target.value) || 0 })}
                    style={{ width: '100%', padding: '10px', borderRadius: '8px', fontSize: '14px' }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                    DISTANCE MEASUREMENT SYSTEM
                  </label>
                  <select
                    value={selectedRule.distance_unit}
                    onChange={(e) => setSelectedRule({ ...selectedRule, distance_unit: e.target.value as DistanceUnit })}
                    style={{ width: '100%', padding: '10px', borderRadius: '8px', fontSize: '14px' }}
                  >
                    <option value="MILES">Imperial (Miles / mi)</option>
                    <option value="KILOMETERS">Metric (Kilometers / km)</option>
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                    SETTLEMENT CURRENCY
                  </label>
                  <input
                    type="text"
                    value={selectedRule.currency}
                    onChange={(e) => setSelectedRule({ ...selectedRule, currency: e.target.value.toUpperCase() })}
                    style={{ width: '100%', padding: '10px', borderRadius: '8px', fontSize: '14px' }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                    MINIMUM TRIP FARE FLOOR ({selectedRule.currency})
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={selectedRule.minimum_fare_net}
                    onChange={(e) => setSelectedRule({ ...selectedRule, minimum_fare_net: parseFloat(e.target.value) || 0 })}
                    style={{ width: '100%', padding: '10px', borderRadius: '8px', fontSize: '14px' }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                <button type="submit" disabled={loading} className="btn-primary" style={{ padding: '12px 24px', fontSize: '14px' }}>
                  <ShieldCheck size={16} /> Save Vendor Pricing Rule
                </button>
              </div>
            </form>
          )}
        </div>
      )}

      {/* TAB 2: AI DYNAMIC YIELD OPTIMIZER */}
      {activeTab === 'AI_YIELD' && aiMetrics && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: '24px' }}>
          <div className="glass-card" style={{ padding: '28px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <div>
                <div className="gold-badge" style={{ marginBottom: '6px' }}>
                  <TrendingUp size={12} /> Neural Booking Yield Optimizer
                </div>
                <h3 style={{ fontSize: '20px', fontWeight: 800, color: '#0F172A' }}>
                  Continuous Pricing Intelligence & Learning Engine
                </h3>
              </div>

              <button className="btn-primary" onClick={handleTrainAI} disabled={loading} style={{ fontSize: '13px' }}>
                <Zap size={14} /> Re-Train Model on Daily Bookings
              </button>
            </div>

            <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginBottom: '24px', lineHeight: 1.6 }}>
              The system analyzes historical quote acceptance rates, deadhead positioning recovery, driver idle times, and peak demand corridors for <strong>{activeVendor?.name}</strong> to compute optimal dynamic pricing multipliers that maximize gross margin without lowering conversion.
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '24px' }}>
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

            <div style={{ background: '#EFF6FF', border: '1px solid #BFDBFE', borderRadius: '12px', padding: '20px', marginBottom: '24px' }}>
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
          <div className="glass-card" style={{ padding: '24px' }}>
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
        <div className="glass-card" style={{ padding: '28px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
            <div>
              <h3 style={{ fontSize: '20px', fontWeight: 800, color: '#0F172A' }}>
                Executive Vehicle Fleet & Network Allocation
              </h3>
              <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                Select which executive vehicles connect to the <strong>Global Autonomous Network 🌐</strong> for cross-border multi-modal itineraries, and which stay dedicated to your <strong>Local Private Fleet 🔒</strong>.
              </p>
            </div>

            <button className="btn-primary" onClick={() => setShowAddVehModal(true)} style={{ fontSize: '13px' }}>
              <Plus size={15} /> Add Vehicle to Fleet
            </button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '16px' }}>
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
                    boxShadow: isGlobal ? '0 4px 12px rgba(37,99,235,0.08)' : '0 1px 3px rgba(0,0,0,0.03)'
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
        <form onSubmit={handleSaveComm} className="glass-card" style={{ padding: '28px', maxWidth: '800px', margin: '0 auto' }}>
          <div style={{ marginBottom: '20px' }}>
            <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#0F172A' }}>
              Communication Channels & AWS SES Infrastructure
            </h3>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
              Configure your inbound/outbound telephony (Twilio), WhatsApp business intake, and AWS Simple Email Service (SES) transactional delivery.
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

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px' }}>
            <div>
              <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                24/7 VOICE HOTLINE DISPATCH PHONE (TWILIO)
              </label>
              <input
                type="text"
                value={commConfig.custom_twilio_phone || ''}
                onChange={(e) => setCommConfig({ ...commConfig, custom_twilio_phone: e.target.value })}
                placeholder="+1 800 555 0199"
                style={{ width: '100%', padding: '10px', borderRadius: '8px', fontSize: '14px' }}
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
                style={{ width: '100%', padding: '10px', borderRadius: '8px', fontSize: '14px' }}
              />
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button type="submit" disabled={loading} className="btn-primary" style={{ padding: '12px 24px', fontSize: '14px' }}>
              <ShieldCheck size={16} /> Save Communication Settings
            </button>
          </div>
        </form>
      )}
    </div>
  );
};
