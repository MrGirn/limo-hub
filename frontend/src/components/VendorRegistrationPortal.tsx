import React, { useState } from 'react';
import { 
  Building2, ShieldCheck, CheckCircle2, Award, 
  MapPin, Phone, Mail, FileText, ArrowRight, RefreshCw, Car
} from 'lucide-react';
import { registerVendor } from '../api';
import { AddressAutocompleteInput } from './AddressAutocompleteInput';

export const VendorRegistrationPortal: React.FC = () => {
  const [form, setForm] = useState({
    company_name: '',
    legal_name: '',
    tax_id: '',
    country_code: 'US',
    distance_unit: 'MILES' as 'MILES' | 'KILOMETERS',
    city: 'New York',
    state_province: 'NY',
    depot_address: '',
    contact_email: '',
    contact_phone: '',
    operating_currency: 'USD',
    fleet_count: 8,
    tlc_or_operating_license: '',
    insurance_policy_number: ''
  });

  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleCountryChange = (country: string) => {
    let currency = 'USD';
    let unit: 'MILES' | 'KILOMETERS' = 'MILES';
    let city = form.city;
    let state = form.state_province;

    if (country === 'US') {
      currency = 'USD';
      unit = 'MILES';
      city = 'New York';
      state = 'NY';
    } else if (country === 'UK') {
      currency = 'GBP';
      unit = 'MILES';
      city = 'London';
      state = 'Greater London';
    } else if (country === 'FR') {
      currency = 'EUR';
      unit = 'KILOMETERS';
      city = 'Paris';
      state = 'Île-de-France';
    } else if (country === 'AE') {
      currency = 'AED';
      unit = 'KILOMETERS';
      city = 'Dubai';
      state = 'Dubai';
    } else if (country === 'JP') {
      currency = 'JPY';
      unit = 'KILOMETERS';
      city = 'Tokyo';
      state = 'Kanto';
    }

    setForm({
      ...form,
      country_code: country,
      operating_currency: currency,
      distance_unit: unit,
      city,
      state_province: state
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await registerVendor(form);
      setResult(res);
    } catch (err: any) {
      setError(err.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  const loadDemoVendor = () => {
    setForm({
      company_name: 'Manhattan Prestige Chauffeurs LLC',
      legal_name: 'Manhattan Prestige Chauffeurs & Limousine Fleet LLC',
      tax_id: 'US-13-9821764',
      country_code: 'US',
      distance_unit: 'MILES',
      city: 'New York',
      state_province: 'NY',
      depot_address: '600 W 57th St, New York, NY 10019',
      contact_email: 'dispatch@manhattanprestige.com',
      contact_phone: '+1 212 555 0188',
      operating_currency: 'USD',
      fleet_count: 12,
      tlc_or_operating_license: 'NYC-TLC-B02914',
      insurance_policy_number: 'CHUBB-COMM-9812450'
    });
  };

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '24px' }}>
      <div style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <div className="gold-badge" style={{ marginBottom: '6px' }}>
            <Award size={12} /> Global Managed Vendor Network
          </div>
          <h1 style={{ fontSize: '28px', fontWeight: 800, color: '#0F172A' }}>
            Vendor Partner Self-Service Registration
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>
            Connect your executive fleet to the global autonomous dispatch network with instant compliance vetting.
          </p>
        </div>

        <button className="btn-secondary" onClick={loadDemoVendor} style={{ fontSize: '13px' }}>
          Auto-Fill Verified Depot Sample
        </button>
      </div>

      {result ? (
        <div className="glass-card" style={{ padding: '40px', textAlign: 'center', maxWidth: '800px', margin: '0 auto' }}>
          <div style={{
            width: '64px',
            height: '64px',
            borderRadius: '50%',
            background: 'rgba(16, 185, 129, 0.12)',
            border: '2px solid #10B981',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 20px auto'
          }}>
            <CheckCircle2 size={32} color="#10B981" />
          </div>

          <h2 style={{ fontSize: '24px', fontWeight: 800, color: '#0F172A', marginBottom: '8px' }}>
            Vendor Depot Activated & Connected!
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginBottom: '24px' }}>
            Your operating hub has been assigned ID: <strong style={{ color: '#2563EB' }}>{result.vendor_id}</strong>. Google Maps geocoding and autonomous compliance vetting have approved your network dispatch status.
          </p>

          <div style={{ background: '#F8FAFC', border: '1px solid var(--border-subtle)', borderRadius: '12px', padding: '20px', textAlign: 'left', marginBottom: '24px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', fontSize: '13px' }}>
              <div><strong>Company:</strong> {result.vendor?.name}</div>
              <div><strong>Depot Address:</strong> {result.vendor?.office_address}</div>
              <div><strong>Operating Currency:</strong> {result.vendor?.operating_currency}</div>
              <div><strong>Service Radius:</strong> {result.vendor?.service_radius_miles} mi ({result.vendor?.service_radius_km || Math.round(result.vendor?.service_radius_miles * 1.60934)} km)</div>
              <div><strong>Preferred Metric:</strong> {form.distance_unit === 'KILOMETERS' ? 'Kilometers (Metric)' : 'Miles (Imperial)'}</div>
              <div><strong>Network Status:</strong> <span style={{ color: '#10B981', fontWeight: 700 }}>VERIFIED TIER-1</span></div>
              <div><strong>GPS Centroid:</strong> {result.vendor?.office_lat}° N, {result.vendor?.office_lng}° W</div>
            </div>
          </div>

          <button className="btn-primary" onClick={() => setResult(null)}>
            Register Another Fleet Depot
          </button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="glass-card" style={{ padding: '32px' }}>
          {error && (
            <div style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid #EF4444', color: '#DC2626', padding: '12px 16px', borderRadius: '8px', marginBottom: '20px', fontSize: '13px' }}>
              {error}
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '24px' }}>
            {/* Company & Legal Name */}
            <div>
              <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>
                COMPANY OPERATING NAME *
              </label>
              <input
                type="text"
                required
                value={form.company_name}
                onChange={(e) => setForm({ ...form, company_name: e.target.value })}
                placeholder="e.g. London Imperial Chauffeur Ltd"
                style={{ width: '100%', padding: '12px', borderRadius: '8px', fontSize: '14px' }}
              />
            </div>

            <div>
              <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>
                LEGAL ENTITY NAME *
              </label>
              <input
                type="text"
                required
                value={form.legal_name}
                onChange={(e) => setForm({ ...form, legal_name: e.target.value })}
                placeholder="e.g. London Imperial Fleet Services Limited"
                style={{ width: '100%', padding: '12px', borderRadius: '8px', fontSize: '14px' }}
              />
            </div>

            {/* Tax ID & Country */}
            <div>
              <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>
                TAX ID / EIN / VAT NUMBER *
              </label>
              <input
                type="text"
                required
                value={form.tax_id}
                onChange={(e) => setForm({ ...form, tax_id: e.target.value })}
                placeholder="e.g. 13-9821764 or GB12345678"
                style={{ width: '100%', padding: '12px', borderRadius: '8px', fontSize: '14px' }}
              />
            </div>

            <div>
              <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>
                OPERATING COUNTRY *
              </label>
              <select
                value={form.country_code}
                onChange={(e) => handleCountryChange(e.target.value)}
                style={{ width: '100%', padding: '12px', borderRadius: '8px', fontSize: '14px' }}
              >
                <option value="US">🇺🇸 United States (USD / Miles)</option>
                <option value="UK">🇬🇧 United Kingdom (GBP / Miles)</option>
                <option value="FR">🇫🇷 France / EU (EUR / Kilometers)</option>
                <option value="AE">🇦🇪 United Arab Emirates (AED / Kilometers)</option>
                <option value="JP">🇯🇵 Japan (JPY / Kilometers)</option>
              </select>
            </div>

            {/* Distance Unit & Currency */}
            <div>
              <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>
                DISTANCE METRIC SYSTEM *
              </label>
              <select
                value={form.distance_unit}
                onChange={(e) => setForm({ ...form, distance_unit: e.target.value as any })}
                style={{ width: '100%', padding: '12px', borderRadius: '8px', fontSize: '14px' }}
              >
                <option value="MILES">Imperial (Miles / mi)</option>
                <option value="KILOMETERS">Metric (Kilometers / km)</option>
              </select>
            </div>

            <div>
              <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>
                SETTLEMENT CURRENCY *
              </label>
              <input
                type="text"
                required
                value={form.operating_currency}
                onChange={(e) => setForm({ ...form, operating_currency: e.target.value.toUpperCase() })}
                placeholder="USD, EUR, GBP, AED, JPY"
                style={{ width: '100%', padding: '12px', borderRadius: '8px', fontSize: '14px' }}
              />
            </div>

            {/* City & State */}
            <div>
              <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>
                BASE METROPOLITAN CITY *
              </label>
              <input
                type="text"
                required
                value={form.city}
                onChange={(e) => setForm({ ...form, city: e.target.value })}
                placeholder="e.g. New York, London, Paris, Miami"
                style={{ width: '100%', padding: '12px', borderRadius: '8px', fontSize: '14px' }}
              />
            </div>

            <div>
              <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>
                STATE / PROVINCE
              </label>
              <input
                type="text"
                value={form.state_province}
                onChange={(e) => setForm({ ...form, state_province: e.target.value })}
                placeholder="e.g. NY, CA, Greater London, Île-de-France"
                style={{ width: '100%', padding: '12px', borderRadius: '8px', fontSize: '14px' }}
              />
            </div>

            {/* Depot Address */}
            <div style={{ gridColumn: 'span 2' }}>
              <AddressAutocompleteInput
                label="PHYSICAL FLEET DEPOT & GARAGE ADDRESS * (Used for Google Maps 3-Leg Staging Calculations)"
                required
                value={form.depot_address}
                onChange={(val) => setForm({ ...form, depot_address: val })}
                onSelectPlace={(place) => {
                  setForm(prev => ({
                    ...prev,
                    depot_address: place.description,
                    city: place.secondary_text ? place.secondary_text.split(',')[0].trim() : prev.city
                  }));
                }}
                placeholder="Enter physical depot address (e.g. 550 W 54th St, New York, NY)"
              />
            </div>

            {/* Email & Phone */}
            <div>
              <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>
                DISPATCH CONTACT EMAIL *
              </label>
              <input
                type="email"
                required
                value={form.contact_email}
                onChange={(e) => setForm({ ...form, contact_email: e.target.value })}
                placeholder="dispatch@vendor.com"
                style={{ width: '100%', padding: '12px', borderRadius: '8px', fontSize: '14px' }}
              />
            </div>

            <div>
              <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>
                24/7 DISPATCH PHONE *
              </label>
              <input
                type="tel"
                required
                value={form.contact_phone}
                onChange={(e) => setForm({ ...form, contact_phone: e.target.value })}
                placeholder="+1 212 555 0199"
                style={{ width: '100%', padding: '12px', borderRadius: '8px', fontSize: '14px' }}
              />
            </div>

            {/* TLC License & Insurance */}
            <div>
              <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>
                TLC / DOT / TFL OPERATING LICENSE *
              </label>
              <input
                type="text"
                required
                value={form.tlc_or_operating_license}
                onChange={(e) => setForm({ ...form, tlc_or_operating_license: e.target.value })}
                placeholder="e.g. NYC-TLC-B02914 or CPUC-PSG-00124"
                style={{ width: '100%', padding: '12px', borderRadius: '8px', fontSize: '14px' }}
              />
            </div>

            <div>
              <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>
                COMMERCIAL AUTO LIABILITY POLICY # ($5M+ COVERAGE) *
              </label>
              <input
                type="text"
                required
                value={form.insurance_policy_number}
                onChange={(e) => setForm({ ...form, insurance_policy_number: e.target.value })}
                placeholder="e.g. CHUBB-COMM-9812450"
                style={{ width: '100%', padding: '12px', borderRadius: '8px', fontSize: '14px' }}
              />
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button
              type="submit"
              disabled={loading}
              className="btn-primary"
              style={{ padding: '14px 28px', fontSize: '15px' }}
            >
              {loading ? (
                <>
                  <RefreshCw size={16} className="pulse-live" /> Running Autonomous Compliance Vetting...
                </>
              ) : (
                <>
                  <ShieldCheck size={16} /> Submit & Activate Vendor Depot <ArrowRight size={16} />
                </>
              )}
            </button>
          </div>
        </form>
      )}
    </div>
  );
};
