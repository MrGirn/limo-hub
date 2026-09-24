import React, { useState, useEffect } from 'react';
import {
  fetchHelicopterHubConfig,
  updateHelicopterHubConfig,
  fetchDomesticHeliports,
  validateHelicopterLeg
} from '../api';
import { HelicopterHubFeatureConfig, DomesticHeliportRecord, HelicopterValidationResult } from '../types';

export const HelicopterComplianceHubControl: React.FC = () => {
  const [config, setConfig] = useState<HelicopterHubFeatureConfig | null>(null);
  const [heliports, setHeliports] = useState<DomesticHeliportRecord[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Pre-flight Simulator State
  const [simOrigin, setSimOrigin] = useState<string>('Downtown Manhattan Heliport Pier 6 (JRB)');
  const [simOriginCountry, setSimOriginCountry] = useState<string>('US');
  const [simDest, setSimDest] = useState<string>('JFK Blade Lounge & Helipad (JFK_HELI)');
  const [simDestCountry, setSimDestCountry] = useState<string>('US');
  const [simTotalLegs, setSimTotalLegs] = useState<number>(3);
  const [simIsPlane, setSimIsPlane] = useState<boolean>(false);
  const [simResult, setSimResult] = useState<HelicopterValidationResult | null>(null);
  const [simLoading, setSimLoading] = useState<boolean>(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [cfg, ports] = await Promise.all([
        fetchHelicopterHubConfig(),
        fetchDomesticHeliports()
      ]);
      setConfig(cfg);
      setHeliports(ports);
    } catch (e: any) {
      setError(e.message || 'Failed to load Helicopter Hub Configuration');
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = async (key: keyof HelicopterHubFeatureConfig, value: boolean) => {
    if (!config) return;
    const updated = { ...config, [key]: value };
    setConfig(updated);
    await saveConfig(updated);
  };

  const handleNumberChange = (key: keyof HelicopterHubFeatureConfig, val: number) => {
    if (!config) return;
    setConfig({ ...config, [key]: val });
  };

  const saveConfig = async (overrideCfg?: HelicopterHubFeatureConfig) => {
    const target = overrideCfg || config;
    if (!target) return;
    setSaving(true);
    setSaveSuccess(false);
    setError(null);
    try {
      const res = await updateHelicopterHubConfig({
        is_enabled: target.is_enabled,
        allow_in_development: target.allow_in_development,
        domestic_only_enforced: target.domestic_only_enforced,
        multi_leg_only_enforced: target.multi_leg_only_enforced,
        require_faa_part135: target.require_faa_part135,
        rotorcraft_only_enforced: target.rotorcraft_only_enforced,
        default_hourly_rate_usd: target.default_hourly_rate_usd,
        default_heliport_fee_usd: target.default_heliport_fee_usd,
        max_payload_limit_lbs: target.max_payload_limit_lbs,
        compliance_audit_notes: target.compliance_audit_notes
      });
      setConfig(res);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3500);
    } catch (e: any) {
      setError(e.message || 'Failed to save configuration');
    } finally {
      setSaving(false);
    }
  };

  const runSimulation = async () => {
    setSimLoading(true);
    setSimResult(null);
    try {
      const res = await validateHelicopterLeg({
        origin_address: simOrigin,
        origin_country: simOriginCountry,
        destination_address: simDest,
        destination_country: simDestCountry,
        total_itinerary_legs: simTotalLegs,
        is_fixed_wing: simIsPlane
      });
      setSimResult(res);
    } catch (e: any) {
      setSimResult({
        allowed: false,
        status_code: 'ERROR',
        reason: e.message || 'Simulation call failed'
      });
    } finally {
      setSimLoading(false);
    }
  };

  if (loading) {
    return (
      <div style={{ padding: '32px', textAlign: 'center', color: '#64748B' }}>
        <div style={{ fontSize: '24px', marginBottom: '8px' }}>🚁</div>
        Loading Helicopter Governance & Hub Compliance Settings...
      </div>
    );
  }

  if (!config) return null;

  return (
    <div style={{ background: '#0F172A', color: '#F8FAFC', borderRadius: '16px', padding: '24px', border: '1px solid #334155' }}>
      {/* Header Banner */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid #1E293B', paddingBottom: '20px', marginBottom: '24px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '6px' }}>
            <span style={{ fontSize: '28px' }}>🚁</span>
            <h2 style={{ margin: 0, fontSize: '22px', fontWeight: '700', color: '#FFFFFF' }}>
              Domestic Helicopter & Rotorcraft Hub Governance
            </h2>
            <span style={{
              fontSize: '11px',
              fontWeight: '700',
              padding: '4px 10px',
              borderRadius: '20px',
              background: config.is_enabled ? '#059669' : '#D97706',
              color: '#FFFFFF',
              letterSpacing: '0.5px'
            }}>
              {config.is_enabled ? '● LIVE / ENABLED' : '🔒 STAGING / LEGAL REVIEW'}
            </span>
          </div>
          <p style={{ margin: 0, fontSize: '13px', color: '#94A3B8' }}>
            Hub-level control switch, domestic air corridor boundary enforcement, and FAA Part 135 operator governance.
          </p>
        </div>

        <button
          onClick={() => saveConfig()}
          disabled={saving}
          style={{
            background: saving ? '#475569' : '#2563EB',
            color: '#FFFFFF',
            border: 'none',
            padding: '10px 20px',
            borderRadius: '8px',
            fontWeight: '600',
            fontSize: '13px',
            cursor: saving ? 'not-allowed' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            boxShadow: '0 4px 12px rgba(37, 99, 235, 0.3)'
          }}
        >
          {saving ? 'Saving...' : 'Save Hub Settings'}
        </button>
      </div>

      {saveSuccess && (
        <div style={{ background: '#064E3B', color: '#6EE7B7', padding: '12px 16px', borderRadius: '8px', marginBottom: '20px', fontSize: '13px', border: '1px solid #059669' }}>
          ✓ Hub Helicopter Governance & Compliance Settings successfully synchronized.
        </div>
      )}

      {error && (
        <div style={{ background: '#7F1D1D', color: '#FCA5A5', padding: '12px 16px', borderRadius: '8px', marginBottom: '20px', fontSize: '13px', border: '1px solid #DC2626' }}>
          ⚠️ {error}
        </div>
      )}

      {/* Grid: Master Toggles + Regulatory Constraints */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px', marginBottom: '28px' }}>
        
        {/* Card 1: Hub Master Switch */}
        <div style={{ background: '#1E293B', padding: '20px', borderRadius: '12px', border: '1px solid #334155' }}>
          <h3 style={{ margin: '0 0 14px 0', fontSize: '15px', color: '#38BDF8', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>🎛️</span> Hub Production Master Switch
          </h3>
          <p style={{ fontSize: '12px', color: '#94A3B8', marginBottom: '16px', lineHeight: '1.5' }}>
            Controls whether Helicopter booking options and onboarding tabs are visible to vendors and corporate clients in production.
          </p>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px', background: '#0F172A', borderRadius: '8px', marginBottom: '12px' }}>
            <div>
              <div style={{ fontWeight: '600', fontSize: '13px', color: '#F8FAFC' }}>Show Helicopter in Production</div>
              <div style={{ fontSize: '11px', color: '#64748B' }}>Requires full legal & insurance compliance signoff</div>
            </div>
            <label style={{ position: 'relative', display: 'inline-block', width: '48px', height: '24px' }}>
              <input
                type="checkbox"
                checked={config.is_enabled}
                onChange={(e) => handleToggle('is_enabled', e.target.checked)}
                style={{ opacity: 0, width: 0, height: 0 }}
              />
              <span style={{
                position: 'absolute', cursor: 'pointer', top: 0, left: 0, right: 0, bottom: 0,
                backgroundColor: config.is_enabled ? '#10B981' : '#475569',
                borderRadius: '24px', transition: '0.3s'
              }}>
                <span style={{
                  position: 'absolute', height: '18px', width: '18px', left: config.is_enabled ? '26px' : '3px',
                  bottom: '3px', backgroundColor: 'white', borderRadius: '50%', transition: '0.3s'
                }} />
              </span>
            </label>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px', background: '#0F172A', borderRadius: '8px' }}>
            <div>
              <div style={{ fontWeight: '600', fontSize: '13px', color: '#F8FAFC' }}>Allow in Development Sandbox</div>
              <div style={{ fontSize: '11px', color: '#64748B' }}>Permits engineering & dispatch tests in dev mode</div>
            </div>
            <label style={{ position: 'relative', display: 'inline-block', width: '48px', height: '24px' }}>
              <input
                type="checkbox"
                checked={config.allow_in_development}
                onChange={(e) => handleToggle('allow_in_development', e.target.checked)}
                style={{ opacity: 0, width: 0, height: 0 }}
              />
              <span style={{
                position: 'absolute', cursor: 'pointer', top: 0, left: 0, right: 0, bottom: 0,
                backgroundColor: config.allow_in_development ? '#10B981' : '#475569',
                borderRadius: '24px', transition: '0.3s'
              }}>
                <span style={{
                  position: 'absolute', height: '18px', width: '18px', left: config.allow_in_development ? '26px' : '3px',
                  bottom: '3px', backgroundColor: 'white', borderRadius: '50%', transition: '0.3s'
                }} />
              </span>
            </label>
          </div>
        </div>

        {/* Card 2: Regulatory Guardrails */}
        <div style={{ background: '#1E293B', padding: '20px', borderRadius: '12px', border: '1px solid #334155' }}>
          <h3 style={{ margin: '0 0 14px 0', fontSize: '15px', color: '#A78BFA', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>⚖️</span> Strict Air Corridor Guardrails
          </h3>
          <p style={{ fontSize: '12px', color: '#94A3B8', marginBottom: '16px', lineHeight: '1.5' }}>
            Core business rules enforced automatically on every reservation and dispatch request.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 12px', background: '#0F172A', borderRadius: '8px' }}>
              <div>
                <span style={{ fontWeight: '600', fontSize: '12px', color: '#F8FAFC' }}>🇺🇸 Domestic Flights Strictly</span>
                <span style={{ display: 'block', fontSize: '10px', color: '#64748B' }}>Blocks cross-border / international flights</span>
              </div>
              <span style={{ background: '#064E3B', color: '#34D399', fontSize: '11px', fontWeight: '700', padding: '2px 8px', borderRadius: '4px' }}>
                LOCKED ACTIVE
              </span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 12px', background: '#0F172A', borderRadius: '8px' }}>
              <div>
                <span style={{ fontWeight: '600', fontSize: '12px', color: '#F8FAFC' }}>🔗 Multi-Leg Itineraries Only</span>
                <span style={{ display: 'block', fontSize: '10px', color: '#64748B' }}>Requires connecting chauffeur ground legs</span>
              </div>
              <span style={{ background: '#064E3B', color: '#34D399', fontSize: '11px', fontWeight: '700', padding: '2px 8px', borderRadius: '4px' }}>
                LOCKED ACTIVE
              </span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 12px', background: '#0F172A', borderRadius: '8px' }}>
              <div>
                <span style={{ fontWeight: '600', fontSize: '12px', color: '#F8FAFC' }}>🚁 Rotorcraft Only (No Fixed-Wing)</span>
                <span style={{ display: 'block', fontSize: '10px', color: '#64748B' }}>Strictly helicopters (Airbus, Bell, Sikorsky)</span>
              </div>
              <span style={{ background: '#064E3B', color: '#34D399', fontSize: '11px', fontWeight: '700', padding: '2px 8px', borderRadius: '4px' }}>
                LOCKED ACTIVE
              </span>
            </div>
          </div>
        </div>

        {/* Card 3: Default Tariffs & Payload */}
        <div style={{ background: '#1E293B', padding: '20px', borderRadius: '12px', border: '1px solid #334155' }}>
          <h3 style={{ margin: '0 0 14px 0', fontSize: '15px', color: '#34D399', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>💰</span> Default Tariffs & Payload Rules
          </h3>
          <p style={{ fontSize: '12px', color: '#94A3B8', marginBottom: '16px', lineHeight: '1.5' }}>
            Baseline pricing formulas and safety thresholds for newly onboarded rotorcraft operators.
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
            <div>
              <label style={{ fontSize: '11px', color: '#94A3B8', display: 'block', marginBottom: '4px' }}>
                Hourly Charter Rate ($)
              </label>
              <input
                type="number"
                value={config.default_hourly_rate_usd}
                onChange={(e) => handleNumberChange('default_hourly_rate_usd', parseFloat(e.target.value) || 0)}
                style={{ width: '100%', background: '#0F172A', border: '1px solid #475569', color: '#F8FAFC', padding: '8px 12px', borderRadius: '6px', fontSize: '13px' }}
              />
            </div>

            <div>
              <label style={{ fontSize: '11px', color: '#94A3B8', display: 'block', marginBottom: '4px' }}>
                Standard Heliport Fee ($)
              </label>
              <input
                type="number"
                value={config.default_heliport_fee_usd}
                onChange={(e) => handleNumberChange('default_heliport_fee_usd', parseFloat(e.target.value) || 0)}
                style={{ width: '100%', background: '#0F172A', border: '1px solid #475569', color: '#F8FAFC', padding: '8px 12px', borderRadius: '6px', fontSize: '13px' }}
              />
            </div>
          </div>

          <div>
            <label style={{ fontSize: '11px', color: '#94A3B8', display: 'block', marginBottom: '4px' }}>
              Max Passenger Payload (lbs)
            </label>
            <input
              type="number"
              value={config.max_payload_limit_lbs}
              onChange={(e) => handleNumberChange('max_payload_limit_lbs', parseInt(e.target.value, 10) || 1400)}
              style={{ width: '100%', background: '#0F172A', border: '1px solid #475569', color: '#F8FAFC', padding: '8px 12px', borderRadius: '6px', fontSize: '13px' }}
            />
          </div>
        </div>
      </div>

      {/* Pre-Flight Compliance Simulator */}
      <div style={{ background: '#1E293B', padding: '24px', borderRadius: '12px', border: '1px solid #334155', marginBottom: '28px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div>
            <h3 style={{ margin: '0 0 4px 0', fontSize: '16px', color: '#F8FAFC', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span>🧪</span> Interactive Pre-Flight Compliance & Air Corridor Simulator
            </h3>
            <p style={{ margin: 0, fontSize: '12px', color: '#94A3B8' }}>
              Test proposed flight routes against Hub governance rules to verify real-time acceptance or rejection.
            </p>
          </div>
          <button
            onClick={runSimulation}
            disabled={simLoading}
            style={{
              background: '#0284C7',
              color: '#FFFFFF',
              border: 'none',
              padding: '8px 16px',
              borderRadius: '6px',
              fontWeight: '600',
              fontSize: '12px',
              cursor: 'pointer'
            }}
          >
            {simLoading ? 'Evaluating...' : 'Run Compliance Scan'}
          </button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px', marginBottom: '16px' }}>
          <div>
            <label style={{ fontSize: '11px', color: '#94A3B8', display: 'block', marginBottom: '4px' }}>
              Origin Helipad / Airport
            </label>
            <input
              type="text"
              value={simOrigin}
              onChange={(e) => setSimOrigin(e.target.value)}
              style={{ width: '100%', background: '#0F172A', border: '1px solid #475569', color: '#F8FAFC', padding: '8px 10px', borderRadius: '6px', fontSize: '12px' }}
            />
          </div>

          <div>
            <label style={{ fontSize: '11px', color: '#94A3B8', display: 'block', marginBottom: '4px' }}>
              Origin Country
            </label>
            <select
              value={simOriginCountry}
              onChange={(e) => setSimOriginCountry(e.target.value)}
              style={{ width: '100%', background: '#0F172A', border: '1px solid #475569', color: '#F8FAFC', padding: '8px 10px', borderRadius: '6px', fontSize: '12px' }}
            >
              <option value="US">United States (US)</option>
              <option value="UK">United Kingdom (UK)</option>
              <option value="FR">France (FR)</option>
              <option value="CA">Canada (CA)</option>
            </select>
          </div>

          <div>
            <label style={{ fontSize: '11px', color: '#94A3B8', display: 'block', marginBottom: '4px' }}>
              Destination Helipad / Airport
            </label>
            <input
              type="text"
              value={simDest}
              onChange={(e) => setSimDest(e.target.value)}
              style={{ width: '100%', background: '#0F172A', border: '1px solid #475569', color: '#F8FAFC', padding: '8px 10px', borderRadius: '6px', fontSize: '12px' }}
            />
          </div>

          <div>
            <label style={{ fontSize: '11px', color: '#94A3B8', display: 'block', marginBottom: '4px' }}>
              Destination Country
            </label>
            <select
              value={simDestCountry}
              onChange={(e) => setSimDestCountry(e.target.value)}
              style={{ width: '100%', background: '#0F172A', border: '1px solid #475569', color: '#F8FAFC', padding: '8px 10px', borderRadius: '6px', fontSize: '12px' }}
            >
              <option value="US">United States (US)</option>
              <option value="UK">United Kingdom (UK)</option>
              <option value="FR">France (FR)</option>
              <option value="CA">Canada (CA)</option>
            </select>
          </div>

          <div>
            <label style={{ fontSize: '11px', color: '#94A3B8', display: 'block', marginBottom: '4px' }}>
              Total Itinerary Legs
            </label>
            <input
              type="number"
              min="1"
              max="5"
              value={simTotalLegs}
              onChange={(e) => setSimTotalLegs(parseInt(e.target.value, 10) || 1)}
              style={{ width: '100%', background: '#0F172A', border: '1px solid #475569', color: '#F8FAFC', padding: '8px 10px', borderRadius: '6px', fontSize: '12px' }}
            />
          </div>

          <div>
            <label style={{ fontSize: '11px', color: '#94A3B8', display: 'block', marginBottom: '4px' }}>
              Aircraft Type
            </label>
            <select
              value={simIsPlane ? 'plane' : 'heli'}
              onChange={(e) => setSimIsPlane(e.target.value === 'plane')}
              style={{ width: '100%', background: '#0F172A', border: '1px solid #475569', color: '#F8FAFC', padding: '8px 10px', borderRadius: '6px', fontSize: '12px' }}
            >
              <option value="heli">Rotorcraft / Helicopter (Airbus H130, Bell 407)</option>
              <option value="plane">Fixed-Wing Airplane (Gulfstream / Citation)</option>
            </select>
          </div>
        </div>

        {/* Simulator Result Output */}
        {simResult && (
          <div style={{
            padding: '14px 18px',
            borderRadius: '8px',
            background: simResult.allowed ? '#064E3B' : '#450A0A',
            border: simResult.allowed ? '1px solid #059669' : '1px solid #DC2626',
            color: '#FFFFFF'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
              <span style={{ fontSize: '16px' }}>{simResult.allowed ? '✅' : '🛑'}</span>
              <strong style={{ fontSize: '14px' }}>
                {simResult.allowed ? 'FLIGHT OPERATION APPROVED' : `BLOCKED: ${simResult.status_code}`}
              </strong>
            </div>
            <p style={{ margin: '0 0 4px 0', fontSize: '12px', color: simResult.allowed ? '#A7F3D0' : '#FECACA' }}>
              {simResult.reason}
            </p>
            {simResult.remediation && (
              <div style={{ fontSize: '11px', color: '#93C5FD', marginTop: '6px' }}>
                💡 <strong>Remediation:</strong> {simResult.remediation}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Domestic VIP Heliports Table */}
      <div style={{ background: '#1E293B', padding: '20px', borderRadius: '12px', border: '1px solid #334155' }}>
        <h3 style={{ margin: '0 0 14px 0', fontSize: '15px', color: '#F8FAFC', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span>📍</span> Integrated Domestic VIP Heliports & Vertiports ({heliports.length})
        </h3>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', textAlign: 'left' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #334155', color: '#94A3B8' }}>
                <th style={{ padding: '10px 12px' }}>Code / FAA</th>
                <th style={{ padding: '10px 12px' }}>Heliport Name</th>
                <th style={{ padding: '10px 12px' }}>City & Region</th>
                <th style={{ padding: '10px 12px' }}>Country</th>
                <th style={{ padding: '10px 12px' }}>Landing Fee</th>
                <th style={{ padding: '10px 12px' }}>Operator / FBO</th>
              </tr>
            </thead>
            <tbody>
              {heliports.map((h) => (
                <tr key={h.code} style={{ borderBottom: '1px solid #1E293B', color: '#E2E8F0' }}>
                  <td style={{ padding: '10px 12px', fontWeight: '700', color: '#38BDF8' }}>
                    {h.code} {h.faa_lid ? `(${h.faa_lid})` : ''}
                  </td>
                  <td style={{ padding: '10px 12px' }}>{h.name}</td>
                  <td style={{ padding: '10px 12px' }}>{h.city}, {h.state_or_region}</td>
                  <td style={{ padding: '10px 12px' }}>
                    <span style={{ background: '#0F172A', padding: '2px 6px', borderRadius: '4px', fontSize: '11px' }}>
                      {h.country}
                    </span>
                  </td>
                  <td style={{ padding: '10px 12px', color: '#34D399', fontWeight: '600' }}>
                    ${Number(h.standard_landing_fee_usd).toFixed(2)} USD
                  </td>
                  <td style={{ padding: '10px 12px', color: '#94A3B8' }}>{h.operator_name}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
