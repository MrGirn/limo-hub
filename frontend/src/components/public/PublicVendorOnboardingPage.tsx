import React, { useState } from 'react';
import {
  Building2,
  Palette,
  DollarSign,
  Car,
  Radio,
  CreditCard,
  CheckCircle2,
  ChevronRight,
  ChevronLeft,
  ShieldCheck,
  AlertCircle,
  Code2,
  Plus,
  Trash2,
  Sparkles,
  ArrowRight,
  Lock,
  Globe,
  FileText
} from 'lucide-react';
import { validatePublicVendorOnboarding, submitPublicVendorOnboarding, extractErrorMessage } from '../../api';

interface PublicVendorOnboardingPageProps {
  onSuccessRedirect: (vendorId: string, secureUrl: string) => void;
  onNavigateHome: () => void;
}

export const PublicVendorOnboardingPage: React.FC<PublicVendorOnboardingPageProps> = ({
  onSuccessRedirect,
  onNavigateHome
}) => {
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [yamlPreview, setYamlPreview] = useState<string>('');
  const [showYamlDrawer, setShowYamlDrawer] = useState<boolean>(false);
  const [deployedResult, setDeployedResult] = useState<any>(null);

  // Form State
  const [formData, setFormData] = useState({
    // Step 1: Legal & Identity
    legal_business_name: '',
    brand_display_name: '',
    vendor_slug: '',
    ein_tax_id: '',
    business_type: 'LLC',
    operating_authority_license: '',
    physical_address: '',
    city: '',
    state: '',
    country: 'United States',
    country_code: 'US',
    time_zone: 'America/New_York',
    compliance_email: '',
    contact_phone: '',

    // Step 2: Branding
    domain: '',
    company_tagline: '',
    primary_color: '#0B1B2D',
    accent_color: '#967B42',
    logo_url: '',

    // Step 3: Sovereign Tariffs
    currency: 'USD',
    currency_symbol: '$',
    base_rate_usd: 85.00,
    per_km_usd: 3.50,
    tax_rate_pct: 8.00,
    airport_meet_and_greet_usd: 45.00,
    tolls_bridge_tunnel_usd: 15.00,

    // Step 4: Fleet Drivers
    fleet_drivers: [
      {
        name: '',
        phone: '',
        vehicle: 'Cadillac Escalade ESV',
        license_plate: ''
      }
    ],

    // Step 5: Communications
    inbound_email: '',
    outbound_sender: '',
    twilio_sms_number: '',
    enable_federation: true,
    clearing_split_pct: 85.0,

    // Step 6: Payment
    onboarding_fee_usd: 299.00,
    stripe_payment_method_id: 'pm_card_visa',
    card_number: '',
    card_expiry: '',
    card_cvc: '',
    cardholder_name: ''
  });

  const updateField = (field: string, val: any) => {
    setFormData(prev => ({ ...prev, [field]: val }));
    setErrorMessage(null);
  };

  const handleAddDriver = () => {
    setFormData(prev => ({
      ...prev,
      fleet_drivers: [
        ...prev.fleet_drivers,
        {
          name: '',
          phone: '',
          vehicle: 'Cadillac Escalade ESV',
          license_plate: ''
        }
      ]
    }));
  };

  const handleRemoveDriver = (index: number) => {
    setFormData(prev => ({
      ...prev,
      fleet_drivers: prev.fleet_drivers.filter((_, i) => i !== index)
    }));
  };

  const updateDriver = (index: number, field: string, val: string) => {
    const updated = [...formData.fleet_drivers];
    updated[index] = { ...updated[index], [field]: val };
    setFormData(prev => ({ ...prev, fleet_drivers: updated }));
  };

  const validateStep = (step: number): string | null => {
    if (step === 1) {
      if (!formData.legal_business_name.trim()) return 'Please enter your Legal Business Name in Step 1.';
      if (!formData.brand_display_name.trim()) return 'Please enter your Brand Display Name in Step 1.';
      const cleanEin = formData.ein_tax_id.trim();
      if (!cleanEin) return 'Please enter your EIN Tax ID in Step 1.';
      if (!/^\d{2}-\d{7}$/.test(cleanEin)) return 'EIN Tax ID must match IRS format XX-XXXXXXX (e.g. 12-3456789) in Step 1.';
      if (!formData.physical_address.trim() || !formData.city.trim() || !formData.state.trim()) {
        return 'Please enter your Physical Address, City, and State in Step 1.';
      }
      if (!formData.compliance_email.trim() || !formData.compliance_email.includes('@')) {
        return 'Please enter a valid Compliance Email Address in Step 1.';
      }
      if (!formData.contact_phone.trim()) return 'Please enter your Executive Hotline Phone in Step 1.';
    } else if (step === 2) {
      if (!formData.domain.trim()) return 'Please enter your Custom Domain / Subdomain in Step 2.';
    } else if (step === 3) {
      if (!formData.base_rate_usd || formData.base_rate_usd <= 0) return 'Base pickup fare must be greater than 0 in Step 3.';
      if (!formData.per_km_usd || formData.per_km_usd <= 0) return 'Per-KM rate must be greater than 0 in Step 3.';
    } else if (step === 5) {
      if (!formData.inbound_email.trim() || !formData.inbound_email.includes('@')) {
        return 'Please enter your Inbound Dispatch Email in Step 5.';
      }
    }
    return null;
  };

  const goToStep = (targetStep: number) => {
    if (targetStep < currentStep) {
      setErrorMessage(null);
      setCurrentStep(targetStep);
      return;
    }
    for (let s = 1; s < targetStep; s++) {
      const err = validateStep(s);
      if (err) {
        setErrorMessage(err);
        setCurrentStep(s);
        return;
      }
    }
    setErrorMessage(null);
    if (targetStep === 6) {
      handleValidateAndPreview();
    } else {
      setCurrentStep(targetStep);
    }
  };

  // Step 6 Pre-flight validation & YAML preview generator
  const handleValidateAndPreview = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      for (let s = 1; s <= 5; s++) {
        const err = validateStep(s);
        if (err) {
          setCurrentStep(s);
          throw new Error(err);
        }
      }

      const cleanDrivers = formData.fleet_drivers
        .filter(d => d.name.trim() || d.phone.trim() || d.license_plate.trim())
        .map(d => ({
          name: d.name.trim() || 'Principal Chauffeur',
          phone: d.phone.trim() || '+12155550199',
          vehicle: d.vehicle.trim() || 'Cadillac Escalade ESV',
          license_plate: d.license_plate.trim() || 'PA-LIMO88'
        }));

      const payload = {
        ...formData,
        vendor_slug: formData.vendor_slug.trim() || undefined,
        contact_phone: formData.contact_phone.replace(/[^\d+]/g, '') || '+12155550199',
        ein_tax_id: formData.ein_tax_id.trim(),
        fleet_drivers: cleanDrivers
      };

      const res = await validatePublicVendorOnboarding(payload);
      setYamlPreview(res.yaml_preview);
      setCurrentStep(6);
    } catch (err: any) {
      setErrorMessage(extractErrorMessage(err, 'Validation failed. Please verify form details.'));
    } finally {
      setIsLoading(false);
    }
  };

  // End-to-end Onboarding Submission & Stripe Payment
  const handleSubmitPaymentAndProvision = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const cleanDrivers = formData.fleet_drivers
        .filter(d => d.name.trim() || d.phone.trim() || d.license_plate.trim())
        .map(d => ({
          name: d.name.trim() || 'Principal Chauffeur',
          phone: d.phone.trim() || '+12155550199',
          vehicle: d.vehicle.trim() || 'Cadillac Escalade ESV',
          license_plate: d.license_plate.trim() || 'PA-LIMO88'
        }));

      const payload = {
        ...formData,
        vendor_slug: formData.vendor_slug.trim() || undefined,
        contact_phone: formData.contact_phone.replace(/[^\d+]/g, '') || '+12155550199',
        ein_tax_id: formData.ein_tax_id.trim(),
        fleet_drivers: cleanDrivers
      };

      const res = await submitPublicVendorOnboarding(payload);
      setDeployedResult(res);
      setCurrentStep(7); // Success Step
    } catch (err: any) {
      setErrorMessage(extractErrorMessage(err, 'Payment & Provisioning failed. Please verify payment method.'));
    } finally {
      setIsLoading(false);
    }
  };

  const steps = [
    { num: 1, title: 'Legal & Identity', icon: <Building2 size={16} /> },
    { num: 2, title: 'Branding & Domain', icon: <Palette size={16} /> },
    { num: 3, title: 'Tariff Matrix', icon: <DollarSign size={16} /> },
    { num: 4, title: 'Fleet & Chauffeurs', icon: <Car size={16} /> },
    { num: 5, title: 'Comms & Telecom', icon: <Radio size={16} /> },
    { num: 6, title: 'Review & Pay', icon: <CreditCard size={16} /> }
  ];

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#F8FAFC', display: 'flex', flexDirection: 'column', fontFamily: 'Segoe UI, system-ui, sans-serif' }}>
      
      {/* Top Header */}
      <header style={{ backgroundColor: '#FFFFFF', borderBottom: '1px solid #E2E8F0', padding: '16px 32px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button
            onClick={onNavigateHome}
            style={{ background: 'transparent', border: 'none', color: '#64748B', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '13px', fontWeight: 600 }}
          >
            ← Back to Marketplace
          </button>
          <span style={{ color: '#CBD5E1' }}>|</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ width: '28px', height: '28px', borderRadius: '6px', backgroundColor: '#0078D4', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#FFFFFF', fontWeight: 900, fontSize: '14px' }}>
              L
            </div>
            <span style={{ fontWeight: 800, fontSize: '16px', color: '#0F172A' }}>Limo Global Federation</span>
            <span style={{ backgroundColor: '#EFF6FF', color: '#0078D4', fontSize: '11px', fontWeight: 800, padding: '2px 8px', borderRadius: '12px' }}>
              OPERATOR ONBOARDING
            </span>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', fontSize: '12px', color: '#64748B' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#16A34A', fontWeight: 700 }}>
            <ShieldCheck size={14} /> 256-Bit Encrypted Sovereign Isolation
          </span>
        </div>
      </header>

      {/* Stepper Bar */}
      {currentStep <= 6 && (
        <div style={{ backgroundColor: '#FFFFFF', borderBottom: '1px solid #E2E8F0', padding: '12px 32px' }}>
          <div style={{ maxWidth: '1000px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            {steps.map((s, idx) => {
              const isActive = currentStep === s.num;
              const isPast = currentStep > s.num;
              return (
                <div key={s.num} style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }} onClick={() => goToStep(s.num)}>
                  <div style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '50%',
                    backgroundColor: isActive ? '#0078D4' : isPast ? '#16A34A' : '#E2E8F0',
                    color: isActive || isPast ? '#FFFFFF' : '#64748B',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '13px',
                    fontWeight: 800,
                    transition: 'all 0.2s'
                  }}>
                    {isPast ? '✓' : s.icon}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <span style={{ fontSize: '11px', color: '#94A3B8', fontWeight: 700, textTransform: 'uppercase' }}>STEP {s.num}</span>
                    <span style={{ fontSize: '13px', fontWeight: isActive ? 800 : 600, color: isActive ? '#0F172A' : '#64748B' }}>{s.title}</span>
                  </div>
                  {idx < steps.length - 1 && (
                    <div style={{ width: '40px', height: '2px', backgroundColor: isPast ? '#16A34A' : '#E2E8F0', margin: '0 8px' }} />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <main style={{ flex: 1, maxWidth: '900px', width: '100%', margin: '32px auto', padding: '0 20px' }}>
        
        {/* Error Notice */}
        {errorMessage && (
          <div style={{ marginBottom: '20px', padding: '14px 18px', backgroundColor: '#FEF2F2', border: '1px solid #F87171', borderRadius: '8px', color: '#991B1B', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <AlertCircle size={18} />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* STEP 1: LEGAL & IDENTITY */}
        {currentStep === 1 && (
          <div style={{ backgroundColor: '#FFFFFF', borderRadius: '12px', padding: '32px', border: '1px solid #E2E8F0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
              <Building2 size={24} color="#0078D4" />
              <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 800, color: '#0F172A' }}>
                Legal Entity & TCR Regulatory Registration
              </h2>
            </div>
            <p style={{ margin: '0 0 24px 0', fontSize: '13px', color: '#64748B' }}>
              Provide authoritative legal information for IRS identification, 10DLC TCR telecom verification, and merchant clearing.
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '18px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>Legal Business Name (with LLC/Inc)</label>
                <input
                  type="text"
                  value={formData.legal_business_name}
                  onChange={e => updateField('legal_business_name', e.target.value)}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '13px', outline: 'none' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>Brand / DBA Display Name</label>
                <input
                  type="text"
                  value={formData.brand_display_name}
                  onChange={e => updateField('brand_display_name', e.target.value)}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '13px', outline: 'none' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>IRS EIN / Tax ID Number (XX-XXXXXXX)</label>
                <input
                  type="text"
                  value={formData.ein_tax_id}
                  onChange={e => updateField('ein_tax_id', e.target.value)}
                  placeholder="12-3456789"
                  style={{ width: '100%', padding: '10px 12px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '13px', outline: 'none' }}
                />
                <span style={{ fontSize: '11px', color: '#64748B', marginTop: '2px', display: 'block' }}>Required for Carrier A2P 10DLC trust scoring</span>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>Business Entity Structure</label>
                <select
                  value={formData.business_type}
                  onChange={e => updateField('business_type', e.target.value)}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '13px', outline: 'none', backgroundColor: '#FFFFFF' }}
                >
                  <option value="LLC">Limited Liability Company (LLC)</option>
                  <option value="C_CORP">Corporation (C-Corp)</option>
                  <option value="S_CORP">S-Corporation (S-Corp)</option>
                  <option value="PARTNERSHIP">Partnership</option>
                  <option value="SOLE_PROPRIETORSHIP">Sole Proprietorship</option>
                </select>
              </div>

              <div style={{ gridColumn: 'span 2' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>Physical HQ Office Address</label>
                <input
                  type="text"
                  value={formData.physical_address}
                  onChange={e => updateField('physical_address', e.target.value)}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '13px', outline: 'none' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>City</label>
                <input
                  type="text"
                  value={formData.city}
                  onChange={e => updateField('city', e.target.value)}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '13px', outline: 'none' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>State / Province (e.g. CA, NY, PA)</label>
                <input
                  type="text"
                  value={formData.state}
                  onChange={e => updateField('state', e.target.value)}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '13px', outline: 'none' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>Compliance Email</label>
                <input
                  type="email"
                  value={formData.compliance_email}
                  onChange={e => updateField('compliance_email', e.target.value)}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '13px', outline: 'none' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>Executive Hotline Phone</label>
                <input
                  type="text"
                  value={formData.contact_phone}
                  onChange={e => updateField('contact_phone', e.target.value)}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '13px', outline: 'none' }}
                />
              </div>
            </div>

            <div style={{ marginTop: '28px', display: 'flex', justifyContent: 'flex-end' }}>
              <button
                onClick={() => goToStep(2)}
                style={{ backgroundColor: '#0078D4', color: '#FFFFFF', border: 'none', padding: '10px 24px', borderRadius: '6px', fontWeight: 700, fontSize: '13px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                Continue to Branding →
              </button>
            </div>
          </div>
        )}

        {/* STEP 2: BRANDING & DOMAIN */}
        {currentStep === 2 && (
          <div style={{ backgroundColor: '#FFFFFF', borderRadius: '12px', padding: '32px', border: '1px solid #E2E8F0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
              <Palette size={24} color="#0078D4" />
              <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 800, color: '#0F172A' }}>
                White-Label Branding & Custom Apex Domain
              </h2>
            </div>
            <p style={{ margin: '0 0 24px 0', fontSize: '13px', color: '#64748B' }}>
              Configure how your private client booking storefront and chauffeur dispatch system renders to VIP travelers.
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '18px' }}>
              <div style={{ gridColumn: 'span 2' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>Apex Custom Domain / Subdomain</label>
                <div style={{ display: 'flex', alignItems: 'center', border: '1px solid #CBD5E1', borderRadius: '6px', overflow: 'hidden' }}>
                  <span style={{ padding: '10px 12px', backgroundColor: '#F1F5F9', color: '#64748B', fontSize: '13px', borderRight: '1px solid #CBD5E1' }}>https://</span>
                  <input
                    type="text"
                    value={formData.domain}
                    onChange={e => updateField('domain', e.target.value)}
                    style={{ flex: 1, padding: '10px 12px', border: 'none', fontSize: '13px', outline: 'none' }}
                  />
                </div>
                <span style={{ fontSize: '11px', color: '#64748B', marginTop: '4px', display: 'block' }}>You will receive DNS CNAME delegation instructions upon deployment</span>
              </div>

              <div style={{ gridColumn: 'span 2' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>Marketing Tagline</label>
                <input
                  type="text"
                  value={formData.company_tagline}
                  onChange={e => updateField('company_tagline', e.target.value)}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '13px', outline: 'none' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>Primary Brand Theme Color</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <input
                    type="color"
                    value={formData.primary_color}
                    onChange={e => updateField('primary_color', e.target.value)}
                    style={{ width: '40px', height: '40px', padding: 0, border: 'none', borderRadius: '6px', cursor: 'pointer' }}
                  />
                  <input
                    type="text"
                    value={formData.primary_color}
                    onChange={e => updateField('primary_color', e.target.value)}
                    style={{ flex: 1, padding: '10px 12px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '13px', outline: 'none' }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>Accent Highlight Color</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <input
                    type="color"
                    value={formData.accent_color}
                    onChange={e => updateField('accent_color', e.target.value)}
                    style={{ width: '40px', height: '40px', padding: 0, border: 'none', borderRadius: '6px', cursor: 'pointer' }}
                  />
                  <input
                    type="text"
                    value={formData.accent_color}
                    onChange={e => updateField('accent_color', e.target.value)}
                    style={{ flex: 1, padding: '10px 12px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '13px', outline: 'none' }}
                  />
                </div>
              </div>
            </div>

            {/* Live Visual Preview */}
            <div style={{ marginTop: '24px', padding: '16px', borderRadius: '8px', backgroundColor: formData.primary_color, color: '#FFFFFF' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontWeight: 800, fontSize: '16px' }}>{formData.brand_display_name}</span>
                <span style={{ backgroundColor: formData.accent_color, color: '#0F172A', padding: '4px 12px', borderRadius: '4px', fontWeight: 800, fontSize: '11px' }}>
                  BOOK NOW
                </span>
              </div>
              <p style={{ margin: '8px 0 0 0', fontSize: '12px', opacity: 0.9 }}>{formData.company_tagline}</p>
            </div>

            <div style={{ marginTop: '28px', display: 'flex', justifyContent: 'space-between' }}>
              <button
                onClick={() => goToStep(1)}
                style={{ backgroundColor: '#F1F5F9', color: '#475569', border: '1px solid #CBD5E1', padding: '10px 20px', borderRadius: '6px', fontWeight: 700, fontSize: '13px', cursor: 'pointer' }}
              >
                ← Back
              </button>
              <button
                onClick={() => goToStep(3)}
                style={{ backgroundColor: '#0078D4', color: '#FFFFFF', border: 'none', padding: '10px 24px', borderRadius: '6px', fontWeight: 700, fontSize: '13px', cursor: 'pointer' }}
              >
                Continue to Pricing Matrix →
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: TARIFF MATRIX */}
        {currentStep === 3 && (
          <div style={{ backgroundColor: '#FFFFFF', borderRadius: '12px', padding: '32px', border: '1px solid #E2E8F0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
              <DollarSign size={24} color="#0078D4" />
              <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 800, color: '#0F172A' }}>
                Sovereign Tariff Matrix & Local Currency
              </h2>
            </div>
            <p style={{ margin: '0 0 24px 0', fontSize: '13px', color: '#64748B' }}>
              Establish your autonomous quoting engine rules. The system automatically computes real-time routing quotes.
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '18px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>Local Currency</label>
                <select
                  value={formData.currency}
                  onChange={e => updateField('currency', e.target.value)}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '13px', outline: 'none', backgroundColor: '#FFFFFF' }}
                >
                  <option value="USD">USD ($) - US Dollar</option>
                  <option value="EUR">EUR (€) - Euro</option>
                  <option value="GBP">GBP (£) - British Pound</option>
                  <option value="CAD">CAD ($) - Canadian Dollar</option>
                  <option value="AED">AED (د.إ) - UAE Dirham</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>Base Pickup Fare ($)</label>
                <input
                  type="number"
                  step="0.50"
                  value={formData.base_rate_usd}
                  onChange={e => updateField('base_rate_usd', parseFloat(e.target.value) || 0)}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '13px', outline: 'none' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>Per-KM Rate ($)</label>
                <input
                  type="number"
                  step="0.05"
                  value={formData.per_km_usd}
                  onChange={e => updateField('per_km_usd', parseFloat(e.target.value) || 0)}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '13px', outline: 'none' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>Local Sales Tax %</label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.tax_rate_pct}
                  onChange={e => updateField('tax_rate_pct', parseFloat(e.target.value) || 0)}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '13px', outline: 'none' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>Airport Meet & Greet Fee ($)</label>
                <input
                  type="number"
                  step="1.00"
                  value={formData.airport_meet_and_greet_usd}
                  onChange={e => updateField('airport_meet_and_greet_usd', parseFloat(e.target.value) || 0)}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '13px', outline: 'none' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>Bridge & Tunnel Tolls ($)</label>
                <input
                  type="number"
                  step="0.50"
                  value={formData.tolls_bridge_tunnel_usd}
                  onChange={e => updateField('tolls_bridge_tunnel_usd', parseFloat(e.target.value) || 0)}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '13px', outline: 'none' }}
                />
              </div>
            </div>

            <div style={{ marginTop: '28px', display: 'flex', justifyContent: 'space-between' }}>
              <button
                onClick={() => goToStep(2)}
                style={{ backgroundColor: '#F1F5F9', color: '#475569', border: '1px solid #CBD5E1', padding: '10px 20px', borderRadius: '6px', fontWeight: 700, fontSize: '13px', cursor: 'pointer' }}
              >
                ← Back
              </button>
              <button
                onClick={() => goToStep(4)}
                style={{ backgroundColor: '#0078D4', color: '#FFFFFF', border: 'none', padding: '10px 24px', borderRadius: '6px', fontWeight: 700, fontSize: '13px', cursor: 'pointer' }}
              >
                Continue to Chauffeurs →
              </button>
            </div>
          </div>
        )}

        {/* STEP 4: FLEET & CHAUFFEURS */}
        {currentStep === 4 && (
          <div style={{ backgroundColor: '#FFFFFF', borderRadius: '12px', padding: '32px', border: '1px solid #E2E8F0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Car size={24} color="#0078D4" />
                <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 800, color: '#0F172A' }}>
                  Initial Chauffeurs & Luxury Fleet
                </h2>
              </div>
              <button
                onClick={handleAddDriver}
                style={{ backgroundColor: '#EFF6FF', color: '#0078D4', border: '1px solid #BFDBFE', padding: '6px 14px', borderRadius: '6px', fontWeight: 700, fontSize: '12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                <Plus size={14} /> Add Chauffeur
              </button>
            </div>
            <p style={{ margin: '0 0 24px 0', fontSize: '13px', color: '#64748B' }}>
              Register the active drivers and vehicles that will be immediately seeded into your private MySQL database partition.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {formData.fleet_drivers.map((drv, idx) => (
                <div key={idx} style={{ display: 'grid', gridTemplateColumns: '2fr 2fr 2fr 1.5fr 40px', gap: '10px', alignItems: 'center', padding: '12px', backgroundColor: '#F8FAFC', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#64748B', marginBottom: '4px' }}>Chauffeur Name</label>
                    <input
                      type="text"
                      value={drv.name}
                      onChange={e => updateDriver(idx, 'name', e.target.value)}
                      placeholder="e.g. Jean-Pierre Laurent"
                      style={{ width: '100%', padding: '8px 10px', borderRadius: '4px', border: '1px solid #CBD5E1', fontSize: '12px' }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#64748B', marginBottom: '4px' }}>Mobile Phone (SMS)</label>
                    <input
                      type="text"
                      value={drv.phone}
                      onChange={e => updateDriver(idx, 'phone', e.target.value)}
                      placeholder="+1 (310) 555-0991"
                      style={{ width: '100%', padding: '8px 10px', borderRadius: '4px', border: '1px solid #CBD5E1', fontSize: '12px' }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#64748B', marginBottom: '4px' }}>Assigned Vehicle</label>
                    <input
                      type="text"
                      value={drv.vehicle}
                      onChange={e => updateDriver(idx, 'vehicle', e.target.value)}
                      placeholder="e.g. Rolls-Royce Ghost"
                      style={{ width: '100%', padding: '8px 10px', borderRadius: '4px', border: '1px solid #CBD5E1', fontSize: '12px' }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#64748B', marginBottom: '4px' }}>License Plate</label>
                    <input
                      type="text"
                      value={drv.license_plate}
                      onChange={e => updateDriver(idx, 'license_plate', e.target.value)}
                      placeholder="e.g. CA-ROYAL1"
                      style={{ width: '100%', padding: '8px 10px', borderRadius: '4px', border: '1px solid #CBD5E1', fontSize: '12px' }}
                    />
                  </div>

                  <button
                    onClick={() => handleRemoveDriver(idx)}
                    disabled={formData.fleet_drivers.length <= 1}
                    style={{ background: 'transparent', border: 'none', color: '#EF4444', cursor: formData.fleet_drivers.length > 1 ? 'pointer' : 'not-allowed', padding: '6px', opacity: formData.fleet_drivers.length > 1 ? 1 : 0.4 }}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>

            <div style={{ marginTop: '28px', display: 'flex', justifyContent: 'space-between' }}>
              <button
                onClick={() => goToStep(3)}
                style={{ backgroundColor: '#F1F5F9', color: '#475569', border: '1px solid #CBD5E1', padding: '10px 20px', borderRadius: '6px', fontWeight: 700, fontSize: '13px', cursor: 'pointer' }}
              >
                ← Back
              </button>
              <button
                onClick={() => goToStep(5)}
                style={{ backgroundColor: '#0078D4', color: '#FFFFFF', border: 'none', padding: '10px 24px', borderRadius: '6px', fontWeight: 700, fontSize: '13px', cursor: 'pointer' }}
              >
                Continue to Communications →
              </button>
            </div>
          </div>
        )}

        {/* STEP 5: COMMUNICATIONS & BYOK */}
        {currentStep === 5 && (
          <div style={{ backgroundColor: '#FFFFFF', borderRadius: '12px', padding: '32px', border: '1px solid #E2E8F0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
              <Radio size={24} color="#0078D4" />
              <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 800, color: '#0F172A' }}>
                Omnichannel Communications & Federation Policy
              </h2>
            </div>
            <p style={{ margin: '0 0 24px 0', fontSize: '13px', color: '#64748B' }}>
              Configure AI email intake parser and inter-operator clearing parameters.
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '18px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>Inbound Dispatch Email (RFQ Parsing)</label>
                <input
                  type="email"
                  value={formData.inbound_email}
                  onChange={e => updateField('inbound_email', e.target.value)}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '13px', outline: 'none' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>Outbound Sender Name & Address</label>
                <input
                  type="text"
                  value={formData.outbound_sender}
                  onChange={e => updateField('outbound_sender', e.target.value)}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '13px', outline: 'none' }}
                />
              </div>

              <div style={{ gridColumn: 'span 2', padding: '16px', backgroundColor: '#EFF6FF', borderRadius: '8px', border: '1px solid #BFDBFE' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <span style={{ fontWeight: 800, fontSize: '13px', color: '#1E40AF' }}>Global Network Federation Participation</span>
                    <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: '#3B82F6' }}>
                      Automatically receive matching overflow airport transfers from other verified operators at 85% net fare payout.
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={formData.enable_federation}
                    onChange={e => updateField('enable_federation', e.target.checked)}
                    style={{ width: '20px', height: '20px', cursor: 'pointer' }}
                  />
                </div>
              </div>
            </div>

            <div style={{ marginTop: '28px', display: 'flex', justifyContent: 'space-between' }}>
              <button
                onClick={() => goToStep(4)}
                style={{ backgroundColor: '#F1F5F9', color: '#475569', border: '1px solid #CBD5E1', padding: '10px 20px', borderRadius: '6px', fontWeight: 700, fontSize: '13px', cursor: 'pointer' }}
              >
                ← Back
              </button>
              <button
                onClick={() => goToStep(6)}
                disabled={isLoading}
                style={{ backgroundColor: '#0078D4', color: '#FFFFFF', border: 'none', padding: '10px 24px', borderRadius: '6px', fontWeight: 700, fontSize: '13px', cursor: isLoading ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}
              >
                {isLoading ? 'Validating...' : 'Review & Proceed to Payment →'}
              </button>
            </div>
          </div>
        )}

        {/* STEP 6: REVIEW, LIVE YAML PREVIEW & STRIPE PAYMENT */}
        {currentStep === 6 && (
          <div style={{ backgroundColor: '#FFFFFF', borderRadius: '12px', padding: '32px', border: '1px solid #E2E8F0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
              <CreditCard size={24} color="#0078D4" />
              <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 800, color: '#0F172A' }}>
                Review, Declarative YAML Spec & Card Checkout
              </h2>
            </div>
            <p style={{ margin: '0 0 24px 0', fontSize: '13px', color: '#64748B' }}>
              Review your compiled declarative specification and complete the one-time platform onboarding and regulatory vetting fee.
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '24px' }}>
              
              {/* Left Column: Order Summary & YAML Preview */}
              <div>
                <div style={{ padding: '16px', backgroundColor: '#F8FAFC', borderRadius: '8px', border: '1px solid #E2E8F0', marginBottom: '16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '13px' }}>
                    <span style={{ color: '#64748B' }}>Operator:</span>
                    <strong style={{ color: '#0F172A' }}>{formData.brand_display_name}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '13px' }}>
                    <span style={{ color: '#64748B' }}>IRS EIN Tax ID:</span>
                    <strong style={{ color: '#0F172A' }}>{formData.ein_tax_id}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '13px' }}>
                    <span style={{ color: '#64748B' }}>Operating Hub:</span>
                    <strong style={{ color: '#0F172A' }}>{formData.city}, {formData.state}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '13px' }}>
                    <span style={{ color: '#64748B' }}>Active Fleet Size:</span>
                    <strong style={{ color: '#0F172A' }}>{formData.fleet_drivers.length} Vehicles</strong>
                  </div>
                  <div style={{ height: '1px', backgroundColor: '#E2E8F0', margin: '12px 0' }} />
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '16px' }}>
                    <span style={{ fontWeight: 800, color: '#0F172A' }}>Onboarding & Vetting Fee:</span>
                    <strong style={{ fontWeight: 900, color: '#16A34A' }}>${formData.onboarding_fee_usd.toFixed(2)} USD</strong>
                  </div>
                </div>

                {/* Declarative Spec Preview Toggle */}
                <div style={{ border: '1px solid #E2E8F0', borderRadius: '8px', overflow: 'hidden' }}>
                  <div
                    onClick={() => setShowYamlDrawer(!showYamlDrawer)}
                    style={{ padding: '10px 14px', backgroundColor: '#F1F5F9', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', fontSize: '12px', fontWeight: 700, color: '#0078D4' }}
                  >
                    <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Code2 size={14} /> View Declarative YAML Spec ({formData.vendor_slug}.yaml)
                    </span>
                    <span>{showYamlDrawer ? '▲ Hide' : '▼ Show'}</span>
                  </div>
                  {showYamlDrawer && (
                    <pre style={{ margin: 0, padding: '14px', backgroundColor: '#0F172A', color: '#38BDF8', fontSize: '11px', maxHeight: '220px', overflowY: 'auto', fontFamily: 'Courier New, monospace' }}>
                      {yamlPreview}
                    </pre>
                  )}
                </div>
              </div>

              {/* Right Column: Card Payment Form */}
              <div style={{ padding: '20px', backgroundColor: '#FFFFFF', borderRadius: '8px', border: '1px solid #CBD5E1', display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                  <Lock size={16} color="#16A34A" />
                  <span style={{ fontWeight: 800, fontSize: '13px', color: '#0F172A' }}>Secure Card Payment</span>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>Cardholder Name</label>
                  <input
                    type="text"
                    value={formData.cardholder_name}
                    onChange={e => updateField('cardholder_name', e.target.value)}
                    style={{ width: '100%', padding: '8px 10px', borderRadius: '4px', border: '1px solid #CBD5E1', fontSize: '13px' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>Credit Card Number</label>
                  <input
                    type="text"
                    value={formData.card_number}
                    onChange={e => updateField('card_number', e.target.value)}
                    style={{ width: '100%', padding: '8px 10px', borderRadius: '4px', border: '1px solid #CBD5E1', fontSize: '13px' }}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>Exp Date</label>
                    <input
                      type="text"
                      value={formData.card_expiry}
                      onChange={e => updateField('card_expiry', e.target.value)}
                      style={{ width: '100%', padding: '8px 10px', borderRadius: '4px', border: '1px solid #CBD5E1', fontSize: '13px' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>CVC</label>
                    <input
                      type="text"
                      value={formData.card_cvc}
                      onChange={e => updateField('card_cvc', e.target.value)}
                      style={{ width: '100%', padding: '8px 10px', borderRadius: '4px', border: '1px solid #CBD5E1', fontSize: '13px' }}
                    />
                  </div>
                </div>

                <button
                  onClick={handleSubmitPaymentAndProvision}
                  disabled={isLoading}
                  style={{
                    marginTop: '8px',
                    backgroundColor: '#16A34A',
                    color: '#FFFFFF',
                    border: 'none',
                    padding: '12px',
                    borderRadius: '6px',
                    fontWeight: 800,
                    fontSize: '14px',
                    cursor: isLoading ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    boxShadow: '0 2px 4px rgba(22,163,74,0.3)'
                  }}
                >
                  {isLoading ? 'Processing Payment & Booting Cell...' : `Pay $${formData.onboarding_fee_usd.toFixed(2)} & Launch Cell 🚀`}
                </button>
              </div>

            </div>

            <div style={{ marginTop: '28px', display: 'flex', justifyContent: 'flex-start' }}>
              <button
                onClick={() => goToStep(5)}
                style={{ backgroundColor: '#F1F5F9', color: '#475569', border: '1px solid #CBD5E1', padding: '10px 20px', borderRadius: '6px', fontWeight: 700, fontSize: '13px', cursor: 'pointer' }}
              >
                ← Back to Comms
              </button>
            </div>
          </div>
        )}

        {/* STEP 7: PROVISIONING SUCCESS & INSTANT HANDOVER */}
        {currentStep === 7 && deployedResult && (
          <div style={{ backgroundColor: '#FFFFFF', borderRadius: '12px', padding: '40px', border: '1px solid #86EFAC', boxShadow: '0 10px 25px -5px rgba(22,163,74,0.1)', textAlign: 'center' }}>
            <div style={{ width: '64px', height: '64px', borderRadius: '50%', backgroundColor: '#DCFCE7', color: '#16A34A', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px auto' }}>
              <CheckCircle2 size={36} />
            </div>

            <h2 style={{ margin: '0 0 8px 0', fontSize: '24px', fontWeight: 900, color: '#0F172A' }}>
              Congratulations! Your Sovereign Cell is Live
            </h2>
            <p style={{ margin: '0 0 24px 0', fontSize: '14px', color: '#475569', maxWidth: '600px', marginInline: 'auto' }}>
              {deployedResult.message}
            </p>

            {/* Quick Credentials & Deployment Dossier */}
            <div style={{ maxWidth: '650px', margin: '0 auto 28px auto', textAlign: 'left', backgroundColor: '#F8FAFC', borderRadius: '8px', padding: '20px', border: '1px solid #E2E8F0' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', fontSize: '13px' }}>
                <div>
                  <span style={{ color: '#64748B', display: 'block', fontSize: '11px', fontWeight: 700 }}>SOVEREIGN VENDOR ID</span>
                  <strong style={{ color: '#0F172A' }}>{deployedResult.vendor_id}</strong>
                </div>
                <div>
                  <span style={{ color: '#64748B', display: 'block', fontSize: '11px', fontWeight: 700 }}>PAYMENT RECEIPT</span>
                  <strong style={{ color: '#16A34A' }}>${deployedResult.payment_receipt?.amount_usd?.toFixed(2)} (PAID)</strong>
                </div>
                <div style={{ gridColumn: 'span 2' }}>
                  <span style={{ color: '#64748B', display: 'block', fontSize: '11px', fontWeight: 700 }}>DNS CNAME DELEGATION</span>
                  <code style={{ display: 'block', padding: '6px 10px', backgroundColor: '#0F172A', color: '#38BDF8', borderRadius: '4px', fontSize: '12px', marginTop: '4px' }}>
                    {deployedResult.dns_instructions?.cname_record} ➔ {deployedResult.dns_instructions?.cname_target}
                  </code>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div style={{ display: 'flex', justifyContent: 'center', gap: '16px' }}>
              <button
                onClick={() => onSuccessRedirect(deployedResult.vendor_id, deployedResult.secure_portal_url)}
                style={{
                  backgroundColor: '#0078D4',
                  color: '#FFFFFF',
                  border: 'none',
                  padding: '14px 28px',
                  borderRadius: '6px',
                  fontWeight: 800,
                  fontSize: '15px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  boxShadow: '0 4px 6px -1px rgba(0,120,212,0.3)'
                }}
              >
                <span>Enter Your Owner Dashboard</span>
                <ArrowRight size={18} />
              </button>
            </div>
          </div>
        )}

      </main>
    </div>
  );
};
