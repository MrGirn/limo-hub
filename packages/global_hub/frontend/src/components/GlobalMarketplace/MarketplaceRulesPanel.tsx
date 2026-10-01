import React, { useState, useEffect } from 'react';
import { Sliders, ShieldCheck, DollarSign, Percent, Clock, AlertTriangle, CheckCircle2, RotateCcw, Zap, Sparkles, TrendingUp, HelpCircle, Layers } from 'lucide-react';

export interface MarketplaceRules {
  config_id: string;
  servicing_affiliate_payout_pct: number;
  originating_booker_commission_pct: number;
  platform_clearing_fee_pct: number;
  escrow_hold_buffer_hours: number;
  intermediate_stop_fee_usd: number;
  airport_terminal_fee_usd: number;
  min_hourly_duration_hours: number;
  hourly_business_rate_usd: number;
  hourly_first_rate_usd: number;
  hourly_van_rate_usd: number;
  surge_multiplier: number;
  tax_percentage: number;
  free_cancellation_hours: number;
  stripe_connect_master_platform_id?: string | null;
  updated_at?: string | null;
}

export const MarketplaceRulesPanel: React.FC = () => {
  const [rules, setRules] = useState<MarketplaceRules>({
    config_id: 'global_clearinghouse_master',
    servicing_affiliate_payout_pct: 80.0,
    originating_booker_commission_pct: 10.0,
    platform_clearing_fee_pct: 10.0,
    escrow_hold_buffer_hours: 24,
    intermediate_stop_fee_usd: 15.0,
    airport_terminal_fee_usd: 20.0,
    min_hourly_duration_hours: 2,
    hourly_business_rate_usd: 45.0,
    hourly_first_rate_usd: 70.0,
    hourly_van_rate_usd: 60.0,
    surge_multiplier: 1.00,
    tax_percentage: 15.0,
    free_cancellation_hours: 24
  });

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Simulator state
  const [simBaseFare, setSimBaseFare] = useState<number>(125.0);
  const [simStops, setSimStops] = useState<number>(1);

  useEffect(() => {
    fetchRules();
  }, []);

  const fetchRules = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/v1/global-hub/marketplace/rules');
      if (res.ok) {
        const data = await res.json();
        setRules(data);
      }
    } catch (e) {
      console.error('Failed to fetch marketplace rules', e);
    } finally {
      setLoading(false);
    }
  };

  const handleFieldChange = (field: keyof MarketplaceRules, value: any) => {
    setRules(prev => ({
      ...prev,
      [field]: typeof value === 'number' && isNaN(value) ? 0 : value
    }));
    setSaveStatus(null);
  };

  const splitSum = 
    Number(rules.servicing_affiliate_payout_pct || 0) + 
    Number(rules.originating_booker_commission_pct || 0) + 
    Number(rules.platform_clearing_fee_pct || 0);

  const isSplitValid = Math.abs(splitSum - 100.0) < 0.01;

  const handleSave = async () => {
    if (!isSplitValid) {
      setSaveStatus({
        type: 'error',
        message: `Commission split must total exactly 100.0% (Current sum: ${splitSum.toFixed(1)}%). Please adjust.`
      });
      return;
    }

    setSaving(true);
    setSaveStatus(null);
    try {
      const res = await fetch('/api/v1/global-hub/marketplace/rules', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(rules)
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setRules(data.rules);
        setSaveStatus({
          type: 'success',
          message: 'Marketplace operational rules saved and deployed across the clearinghouse!'
        });
      } else {
        setSaveStatus({
          type: 'error',
          message: data.detail || 'Failed to update marketplace rules.'
        });
      }
    } catch (e) {
      setSaveStatus({
        type: 'error',
        message: 'Network error communicating with backend repository.'
      });
    } finally {
      setSaving(false);
    }
  };

  const handleResetBenchmark = async () => {
    if (!window.confirm('Reset all marketplace rules to the standard global benchmark (80/10/10 split, $15 stops, 1.0x surge, 15% tax)?')) {
      return;
    }
    const benchmark: Partial<MarketplaceRules> = {
      servicing_affiliate_payout_pct: 80.0,
      originating_booker_commission_pct: 10.0,
      platform_clearing_fee_pct: 10.0,
      escrow_hold_buffer_hours: 24,
      intermediate_stop_fee_usd: 15.0,
      airport_terminal_fee_usd: 20.0,
      min_hourly_duration_hours: 2,
      hourly_business_rate_usd: 45.0,
      hourly_first_rate_usd: 70.0,
      hourly_van_rate_usd: 60.0,
      surge_multiplier: 1.00,
      tax_percentage: 15.0,
      free_cancellation_hours: 24
    };

    setSaving(true);
    try {
      const res = await fetch('/api/v1/global-hub/marketplace/rules', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(benchmark)
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setRules(data.rules);
        setSaveStatus({
          type: 'success',
          message: 'Reset back to standard benchmark successfully.'
        });
      }
    } finally {
      setSaving(false);
    }
  };

  // Live simulation math
  const simEffectiveBase = simBaseFare * (rules.surge_multiplier || 1.0);
  const simStopFee = simStops * (rules.intermediate_stop_fee_usd || 15.0);
  const simTaxes = simEffectiveBase * ((rules.tax_percentage || 15.0) / 100.0);
  const simTotal = simEffectiveBase + simStopFee + simTaxes;
  const simServicingPayout = simTotal * ((rules.servicing_affiliate_payout_pct || 80) / 100.0);
  const simOriginatingComm = simTotal * ((rules.originating_booker_commission_pct || 10) / 100.0);
  const simPlatformFee = simTotal - simServicingPayout - simOriginatingComm;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '28px', maxWidth: '1200px', margin: '0 auto' }}>
      {/* Top Header Card */}
      <div style={{
        background: 'linear-gradient(135deg, #0F172A 0%, #1E293B 100%)',
        borderRadius: '16px',
        padding: '28px 32px',
        color: '#FFFFFF',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '20px',
        boxShadow: '0 8px 24px rgba(15, 23, 42, 0.15)'
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
            <span style={{
              background: '#0284C7',
              color: '#FFFFFF',
              padding: '3px 10px',
              borderRadius: '20px',
              fontSize: '11px',
              fontWeight: 800,
              letterSpacing: '0.04em'
            }}>
              MARKETPLACE RULES ENGINE
            </span>
            <span style={{ color: '#94A3B8', fontSize: '13px' }}>
              Authoritative Global Clearinghouse Config
            </span>
          </div>
          <h1 style={{ fontSize: '26px', fontWeight: 800, margin: 0, letterSpacing: '-0.02em' }}>
            Operational Rules & Surcharge Manager
          </h1>
          <p style={{ color: '#94A3B8', fontSize: '14px', margin: '6px 0 0 0' }}>
            Define and adjust revenue split ratios, stop fees, surge pricing multipliers, and cancellation terms.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button
            onClick={handleResetBenchmark}
            disabled={saving}
            style={{
              background: 'rgba(255, 255, 255, 0.1)',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              color: '#FFFFFF',
              borderRadius: '8px',
              padding: '10px 16px',
              fontSize: '13px',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <RotateCcw size={14} />
            Reset Defaults
          </button>

          <button
            onClick={handleSave}
            disabled={saving || !isSplitValid}
            style={{
              background: isSplitValid ? '#0284C7' : '#64748B',
              color: '#FFFFFF',
              border: 'none',
              borderRadius: '8px',
              padding: '10px 22px',
              fontSize: '13px',
              fontWeight: 800,
              cursor: isSplitValid ? 'pointer' : 'not-allowed',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              boxShadow: isSplitValid ? '0 4px 14px rgba(2, 132, 199, 0.4)' : 'none'
            }}
          >
            {saving ? (
              <span>Saving...</span>
            ) : (
              <>
                <CheckCircle2 size={16} />
                Save & Apply Rules
              </>
            )}
          </button>
        </div>
      </div>

      {/* Alert Banner if any */}
      {saveStatus && (
        <div style={{
          padding: '14px 20px',
          borderRadius: '10px',
          fontSize: '13px',
          fontWeight: 700,
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          background: saveStatus.type === 'success' ? '#DCFCE7' : '#FEE2E2',
          color: saveStatus.type === 'success' ? '#15803D' : '#B91C1C',
          border: `1px solid ${saveStatus.type === 'success' ? '#86EFAC' : '#FCA5A5'}`
        }}>
          {saveStatus.type === 'success' ? <CheckCircle2 size={18} /> : <AlertTriangle size={18} />}
          <span>{saveStatus.message}</span>
        </div>
      )}

      {/* Main Grid: Rules Form vs Live Simulation Card */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.25fr 0.75fr', gap: '24px', alignItems: 'start' }}>
        
        {/* Left Column: Config Groups */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          {/* Group 1: 80/10/10 Revenue Split Protocol */}
          <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '14px', padding: '24px', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div>
                <h3 style={{ fontSize: '16px', fontWeight: 800, color: '#0F172A', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <ShieldCheck size={18} color="#0078D4" />
                  Stripe Connect Revenue Split Ratio (100% Total)
                </h3>
                <p style={{ fontSize: '12px', color: '#64748B', margin: '4px 0 0 0' }}>
                  Multi-party automated escrow settlement split upon trip completion.
                </p>
              </div>
              <span style={{
                fontSize: '12px',
                fontWeight: 800,
                color: isSplitValid ? '#15803D' : '#B91C1C',
                background: isSplitValid ? '#DCFCE7' : '#FEE2E2',
                padding: '4px 10px',
                borderRadius: '8px'
              }}>
                Sum: {splitSum.toFixed(1)}% {isSplitValid ? '✓ Valid' : '⚠️ Invalid'}
              </span>
            </div>

            {/* Split Visual Progress Bar */}
            <div style={{ height: '10px', width: '100%', borderRadius: '5px', overflow: 'hidden', display: 'flex', marginBottom: '20px', background: '#F1F5F9' }}>
              <div style={{ width: `${Math.min(100, rules.servicing_affiliate_payout_pct)}%`, background: '#0284C7', transition: 'width 0.2s ease' }} title="Servicing Chauffeur" />
              <div style={{ width: `${Math.min(100, rules.originating_booker_commission_pct)}%`, background: '#10B981', transition: 'width 0.2s ease' }} title="Originating Booker" />
              <div style={{ width: `${Math.min(100, rules.platform_clearing_fee_pct)}%`, background: '#8B5CF6', transition: 'width 0.2s ease' }} title="Platform Fee" />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px' }}>
              <div>
                <label style={{ fontSize: '11px', fontWeight: 700, color: '#0284C7', display: 'block', marginBottom: '6px' }}>
                  SERVICING CHAUFFEUR (%)
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type="number"
                    step="0.5"
                    min="0"
                    max="100"
                    value={rules.servicing_affiliate_payout_pct}
                    onChange={e => handleFieldChange('servicing_affiliate_payout_pct', parseFloat(e.target.value))}
                    style={{
                      width: '100%',
                      padding: '10px 32px 10px 12px',
                      borderRadius: '8px',
                      border: '1.5px solid #CBD5E1',
                      fontSize: '14px',
                      fontWeight: 700,
                      color: '#0F172A',
                      boxSizing: 'border-box'
                    }}
                  />
                  <Percent size={14} color="#64748B" style={{ position: 'absolute', right: '10px', top: '13px' }} />
                </div>
                <span style={{ fontSize: '10px', color: '#64748B', marginTop: '4px', display: 'block' }}>Local affiliate driver payout</span>
              </div>

              <div>
                <label style={{ fontSize: '11px', fontWeight: 700, color: '#10B981', display: 'block', marginBottom: '6px' }}>
                  ORIGINATING BOOKER (%)
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type="number"
                    step="0.5"
                    min="0"
                    max="100"
                    value={rules.originating_booker_commission_pct}
                    onChange={e => handleFieldChange('originating_booker_commission_pct', parseFloat(e.target.value))}
                    style={{
                      width: '100%',
                      padding: '10px 32px 10px 12px',
                      borderRadius: '8px',
                      border: '1.5px solid #CBD5E1',
                      fontSize: '14px',
                      fontWeight: 700,
                      color: '#0F172A',
                      boxSizing: 'border-box'
                    }}
                  />
                  <Percent size={14} color="#64748B" style={{ position: 'absolute', right: '10px', top: '13px' }} />
                </div>
                <span style={{ fontSize: '10px', color: '#64748B', marginTop: '4px', display: 'block' }}>Referring travel agent / affiliate</span>
              </div>

              <div>
                <label style={{ fontSize: '11px', fontWeight: 700, color: '#8B5CF6', display: 'block', marginBottom: '6px' }}>
                  GLOBAL HUB PLATFORM (%)
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type="number"
                    step="0.5"
                    min="0"
                    max="100"
                    value={rules.platform_clearing_fee_pct}
                    onChange={e => handleFieldChange('platform_clearing_fee_pct', parseFloat(e.target.value))}
                    style={{
                      width: '100%',
                      padding: '10px 32px 10px 12px',
                      borderRadius: '8px',
                      border: '1.5px solid #CBD5E1',
                      fontSize: '14px',
                      fontWeight: 700,
                      color: '#0F172A',
                      boxSizing: 'border-box'
                    }}
                  />
                  <Percent size={14} color="#64748B" style={{ position: 'absolute', right: '10px', top: '13px' }} />
                </div>
                <span style={{ fontSize: '10px', color: '#64748B', marginTop: '4px', display: 'block' }}>Clearinghouse & gateway fee</span>
              </div>
            </div>
          </div>

          {/* Group 2: Surcharges & Ancillary Rules */}
          <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '14px', padding: '24px', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 800, color: '#0F172A', margin: '0 0 16px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Layers size={18} color="#0078D4" />
              Ancillary Surcharges & Operational Windows
            </h3>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
              <div>
                <label style={{ fontSize: '11px', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '6px' }}>
                  INTERMEDIATE STOP FEE ($ USD)
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type="number"
                    step="1"
                    min="0"
                    value={rules.intermediate_stop_fee_usd}
                    onChange={e => handleFieldChange('intermediate_stop_fee_usd', parseFloat(e.target.value))}
                    style={{
                      width: '100%',
                      padding: '10px 12px 10px 28px',
                      borderRadius: '8px',
                      border: '1.5px solid #CBD5E1',
                      fontSize: '14px',
                      fontWeight: 700,
                      color: '#0F172A',
                      boxSizing: 'border-box'
                    }}
                  />
                  <span style={{ position: 'absolute', left: '10px', top: '10px', color: '#64748B', fontWeight: 700 }}>$</span>
                </div>
                <span style={{ fontSize: '10px', color: '#64748B', marginTop: '4px', display: 'block' }}>Per added intermediate stop</span>
              </div>

              <div>
                <label style={{ fontSize: '11px', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '6px' }}>
                  AIRPORT TERMINAL GATE FEE ($ USD)
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type="number"
                    step="1"
                    min="0"
                    value={rules.airport_terminal_fee_usd}
                    onChange={e => handleFieldChange('airport_terminal_fee_usd', parseFloat(e.target.value))}
                    style={{
                      width: '100%',
                      padding: '10px 12px 10px 28px',
                      borderRadius: '8px',
                      border: '1.5px solid #CBD5E1',
                      fontSize: '14px',
                      fontWeight: 700,
                      color: '#0F172A',
                      boxSizing: 'border-box'
                    }}
                  />
                  <span style={{ position: 'absolute', left: '10px', top: '10px', color: '#64748B', fontWeight: 700 }}>$</span>
                </div>
                <span style={{ fontSize: '10px', color: '#64748B', marginTop: '4px', display: 'block' }}>Airport access & parking toll</span>
              </div>

              <div>
                <label style={{ fontSize: '11px', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '6px' }}>
                  ESCROW HOLD BUFFER (HOURS)
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type="number"
                    step="1"
                    min="1"
                    max="72"
                    value={rules.escrow_hold_buffer_hours}
                    onChange={e => handleFieldChange('escrow_hold_buffer_hours', parseInt(e.target.value, 10))}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      borderRadius: '8px',
                      border: '1.5px solid #CBD5E1',
                      fontSize: '14px',
                      fontWeight: 700,
                      color: '#0F172A',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>
                <span style={{ fontSize: '10px', color: '#64748B', marginTop: '4px', display: 'block' }}>Pre-auth hold duration</span>
              </div>

              <div>
                <label style={{ fontSize: '11px', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '6px' }}>
                  FREE CANCELLATION (HOURS)
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type="number"
                    step="1"
                    min="1"
                    max="72"
                    value={rules.free_cancellation_hours}
                    onChange={e => handleFieldChange('free_cancellation_hours', parseInt(e.target.value, 10))}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      borderRadius: '8px',
                      border: '1.5px solid #CBD5E1',
                      fontSize: '14px',
                      fontWeight: 700,
                      color: '#0F172A',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>
                <span style={{ fontSize: '10px', color: '#64748B', marginTop: '4px', display: 'block' }}>Hours before pickup</span>
              </div>
            </div>
          </div>

          {/* Group 3: Hourly Charter Service Rules */}
          <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '14px', padding: '24px', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 800, color: '#0F172A', margin: '0 0 16px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Clock size={18} color="#0078D4" />
              Hourly As-Directed Charter Rate Cards
            </h3>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px' }}>
              <div>
                <label style={{ fontSize: '11px', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '6px' }}>
                  MIN HOURLY DURATION (HRS)
                </label>
                <input
                  type="number"
                  step="1"
                  min="1"
                  max="12"
                  value={rules.min_hourly_duration_hours}
                  onChange={e => handleFieldChange('min_hourly_duration_hours', parseInt(e.target.value, 10))}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: '8px',
                    border: '1.5px solid #CBD5E1',
                    fontSize: '14px',
                    fontWeight: 700,
                    color: '#0F172A',
                    boxSizing: 'border-box'
                  }}
                />
                <span style={{ fontSize: '10px', color: '#64748B', marginTop: '4px', display: 'block' }}>Minimum booking threshold</span>
              </div>

              <div>
                <label style={{ fontSize: '11px', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '6px' }}>
                  BUSINESS CLASS ($/HR)
                </label>
                <input
                  type="number"
                  step="5"
                  min="20"
                  value={rules.hourly_business_rate_usd}
                  onChange={e => handleFieldChange('hourly_business_rate_usd', parseFloat(e.target.value))}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: '8px',
                    border: '1.5px solid #CBD5E1',
                    fontSize: '14px',
                    fontWeight: 700,
                    color: '#0F172A',
                    boxSizing: 'border-box'
                  }}
                />
                <span style={{ fontSize: '10px', color: '#64748B', marginTop: '4px', display: 'block' }}>Mercedes E/S-Class</span>
              </div>

              <div>
                <label style={{ fontSize: '11px', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '6px' }}>
                  FIRST CLASS ($/HR)
                </label>
                <input
                  type="number"
                  step="5"
                  min="30"
                  value={rules.hourly_first_rate_usd}
                  onChange={e => handleFieldChange('hourly_first_rate_usd', parseFloat(e.target.value))}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: '8px',
                    border: '1.5px solid #CBD5E1',
                    fontSize: '14px',
                    fontWeight: 700,
                    color: '#0F172A',
                    boxSizing: 'border-box'
                  }}
                />
                <span style={{ fontSize: '10px', color: '#64748B', marginTop: '4px', display: 'block' }}>Mercedes Maybach / 7-Series</span>
              </div>

              <div>
                <label style={{ fontSize: '11px', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '6px' }}>
                  BUSINESS VAN ($/HR)
                </label>
                <input
                  type="number"
                  step="5"
                  min="30"
                  value={rules.hourly_van_rate_usd}
                  onChange={e => handleFieldChange('hourly_van_rate_usd', parseFloat(e.target.value))}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: '8px',
                    border: '1.5px solid #CBD5E1',
                    fontSize: '14px',
                    fontWeight: 700,
                    color: '#0F172A',
                    boxSizing: 'border-box'
                  }}
                />
                <span style={{ fontSize: '10px', color: '#64748B', marginTop: '4px', display: 'block' }}>Cadillac Escalade / Sprinter</span>
              </div>
            </div>
          </div>

          {/* Group 4: Dynamic Surge & Tax Percentage */}
          <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '14px', padding: '24px', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 800, color: '#0F172A', margin: '0 0 16px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <TrendingUp size={18} color="#0078D4" />
              Dynamic Demand Surge & VAT / Sales Tax
            </h3>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                  <label style={{ fontSize: '11px', fontWeight: 700, color: '#334155' }}>
                    MARKETPLACE SURGE MULTIPLIER
                  </label>
                  <span style={{ fontSize: '12px', fontWeight: 800, color: rules.surge_multiplier > 1.0 ? '#D97706' : '#16A34A' }}>
                    {rules.surge_multiplier.toFixed(2)}x
                  </span>
                </div>
                <input
                  type="range"
                  min="1.0"
                  max="2.5"
                  step="0.05"
                  value={rules.surge_multiplier}
                  onChange={e => handleFieldChange('surge_multiplier', parseFloat(e.target.value))}
                  style={{ width: '100%', accentColor: '#0078D4' }}
                />
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: '#64748B', marginTop: '4px' }}>
                  <span>1.0x (Normal)</span>
                  <span>1.5x (High)</span>
                  <span>2.0x (Peak)</span>
                  <span>2.5x (Extreme)</span>
                </div>
              </div>

              <div>
                <label style={{ fontSize: '11px', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '6px' }}>
                  SALES / VAT TAX PERCENTAGE (%)
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type="number"
                    step="0.5"
                    min="0"
                    max="40"
                    value={rules.tax_percentage}
                    onChange={e => handleFieldChange('tax_percentage', parseFloat(e.target.value))}
                    style={{
                      width: '100%',
                      padding: '10px 32px 10px 12px',
                      borderRadius: '8px',
                      border: '1.5px solid #CBD5E1',
                      fontSize: '14px',
                      fontWeight: 700,
                      color: '#0F172A',
                      boxSizing: 'border-box'
                    }}
                  />
                  <Percent size={14} color="#64748B" style={{ position: 'absolute', right: '10px', top: '13px' }} />
                </div>
                <span style={{ fontSize: '10px', color: '#64748B', marginTop: '4px', display: 'block' }}>Mandatory jurisdiction tax pass-through</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Real-Time Quote & Settlement Simulator */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', position: 'sticky', top: '88px' }}>
          <div style={{
            background: '#FFFFFF',
            border: '2px solid #0078D4',
            borderRadius: '16px',
            padding: '24px',
            boxShadow: '0 4px 20px rgba(0, 120, 212, 0.08)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
              <div style={{ width: '28px', height: '28px', borderRadius: '8px', background: '#EFF6FF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Zap size={16} color="#0078D4" />
              </div>
              <div>
                <h3 style={{ fontSize: '15px', fontWeight: 800, color: '#0F172A', margin: 0 }}>
                  Real-Time Rules Impact Simulator
                </h3>
                <span style={{ fontSize: '11px', color: '#64748B' }}>
                  See live passenger quote & 80/10/10 escrow split
                </span>
              </div>
            </div>

            {/* Simulator Interactive Inputs */}
            <div style={{ background: '#F8FAFC', borderRadius: '10px', padding: '14px', border: '1px solid #E2E8F0', marginBottom: '16px' }}>
              <div style={{ marginBottom: '12px' }}>
                <label style={{ fontSize: '11px', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '4px' }}>
                  Sample Base Fare ($ USD)
                </label>
                <input
                  type="number"
                  step="5"
                  min="50"
                  value={simBaseFare}
                  onChange={e => setSimBaseFare(parseFloat(e.target.value) || 0)}
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    borderRadius: '6px',
                    border: '1px solid #CBD5E1',
                    fontSize: '13px',
                    fontWeight: 700,
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              <div>
                <label style={{ fontSize: '11px', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '4px' }}>
                  Intermediate Stops Count: {simStops}
                </label>
                <input
                  type="range"
                  min="0"
                  max="4"
                  step="1"
                  value={simStops}
                  onChange={e => setSimStops(parseInt(e.target.value, 10))}
                  style={{ width: '100%', accentColor: '#0078D4' }}
                />
              </div>
            </div>

            {/* Calculated Customer Invoice Receipt */}
            <div style={{ borderBottom: '1px dashed #CBD5E1', paddingBottom: '14px', marginBottom: '14px' }}>
              <div style={{ fontSize: '11px', fontWeight: 800, color: '#64748B', letterSpacing: '0.04em', marginBottom: '8px' }}>
                CUSTOMER INVOICE SUMMARY
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: '#334155', marginBottom: '4px' }}>
                <span>Base Fare ({rules.surge_multiplier.toFixed(2)}x surge):</span>
                <span style={{ fontWeight: 700 }}>${simEffectiveBase.toFixed(2)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: '#334155', marginBottom: '4px' }}>
                <span>{simStops} Intermediate Stop(s) (${rules.intermediate_stop_fee_usd}/stop):</span>
                <span style={{ fontWeight: 700 }}>${simStopFee.toFixed(2)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: '#334155', marginBottom: '4px' }}>
                <span>Jurisdiction Tax ({rules.tax_percentage}%):</span>
                <span style={{ fontWeight: 700 }}>${simTaxes.toFixed(2)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '16px', fontWeight: 800, color: '#0F172A', marginTop: '8px', paddingTop: '8px', borderTop: '1px solid #E2E8F0' }}>
                <span>Total Passenger Paid:</span>
                <span style={{ color: '#0078D4' }}>${simTotal.toFixed(2)} USD</span>
              </div>
            </div>

            {/* Calculated Escrow Ledger Split */}
            <div>
              <div style={{ fontSize: '11px', fontWeight: 800, color: '#64748B', letterSpacing: '0.04em', marginBottom: '8px' }}>
                ESCROW CLEARINGHOUSE LEDGER SPLIT
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#0284C7', marginBottom: '4px', fontWeight: 700 }}>
                <span>Servicing Affiliate ({rules.servicing_affiliate_payout_pct}%):</span>
                <span>${simServicingPayout.toFixed(2)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#10B981', marginBottom: '4px', fontWeight: 700 }}>
                <span>Originating Booker ({rules.originating_booker_commission_pct}%):</span>
                <span>${simOriginatingComm.toFixed(2)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#8B5CF6', marginBottom: '4px', fontWeight: 700 }}>
                <span>Platform Fee ({rules.platform_clearing_fee_pct}%):</span>
                <span>${simPlatformFee.toFixed(2)}</span>
              </div>
            </div>

            <div style={{ background: '#F1F5F9', borderRadius: '8px', padding: '10px', marginTop: '16px', fontSize: '11px', color: '#64748B', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <ShieldCheck size={14} color="#16A34A" />
              <span>SOC 1 double-entry balance guaranteed.</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
