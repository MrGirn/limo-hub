import React, { useState, useEffect } from 'react';
import { 
  Radio, PhoneCall, Mail, Clock, AlertTriangle, CheckCircle2, 
  ExternalLink, Sparkles, Send, UserCheck, Plus, X, Globe, Users, Award
} from 'lucide-react';
import { 
  fetchSourcingOpportunities, triggerManualSourcingRfp, 
  submitVendorQuoteApi, managerPhoneOverrideApi, submitSourcingInquiry,
  fetchVendorExternalPartners, addVendorExternalPartner, sendNetworkInvitationApi
} from '../api';
import { AddressAutocompleteInput, PlacePrediction } from './AddressAutocompleteInput';

export const SourcingConciergeDesk: React.FC = () => {
  const [opportunities, setOpportunities] = useState<any[]>([]);
  const [partners, setPartners] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [mainView, setMainView] = useState<'QUEUE' | 'ROLODEX'>('QUEUE');
  const [activeTab, setActiveTab] = useState<'ALL' | 'ACTION_REQUIRED' | 'CONFIRMED'>('ALL');
  
  // Modals & Form State
  const [showOverrideModal, setShowOverrideModal] = useState<any | null>(null);
  const [overrideRate, setOverrideRate] = useState('');
  const [overrideContact, setOverrideContact] = useState('');
  const [overrideDriver, setOverrideDriver] = useState('');
  const [overrideNotes, setOverrideNotes] = useState('');
  const [submittingOverride, setSubmittingOverride] = useState(false);

  const [showNewRfpModal, setShowNewRfpModal] = useState(false);
  const [newCity, setNewCity] = useState('Aspen, CO');
  const [newPickup, setNewPickup] = useState('Aspen Pitkin County Airport (ASE) Private VIP FBO');
  const [newDropoff, setNewDropoff] = useState('The Little Nell, 675 E Durant Ave, Aspen, CO');
  const [newVehicleClass, setNewVehicleClass] = useState('LUXURY_SUV');
  const [newManagerCc, setNewManagerCc] = useState('dispatch@anblimo.com');
  const [launchingRfp, setLaunchingRfp] = useState(false);

  // Partner Rolodex State
  const [showAddPartnerModal, setShowAddPartnerModal] = useState(false);
  const [partnerCompany, setPartnerCompany] = useState('');
  const [partnerContact, setPartnerContact] = useState('');
  const [partnerEmail, setPartnerEmail] = useState('');
  const [partnerPhone, setPartnerPhone] = useState('');
  const [partnerCity, setPartnerCity] = useState('');
  const [partnerRate, setPartnerRate] = useState('195.00');
  const [partnerNotes, setPartnerNotes] = useState('');
  const [savingPartner, setSavingPartner] = useState(false);
  const [invitingPartnerId, setInvitingPartnerId] = useState<string | null>(null);

  const [notification, setNotification] = useState<string | null>(null);
  const [previewEmailModal, setPreviewEmailModal] = useState<any | null>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const [oppData, partnerData] = await Promise.all([
        fetchSourcingOpportunities().catch(() => []),
        fetchVendorExternalPartners('vendor-anb-philly').catch(() => [])
      ]);
      setOpportunities(oppData);
      setPartners(partnerData);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 6000);
    return () => clearInterval(interval);
  }, []);

  const handlePhoneOverrideSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!showOverrideModal || !overrideRate) return;
    setSubmittingOverride(true);
    try {
      const res = await managerPhoneOverrideApi({
        rfp_id: showOverrideModal.rfp_id,
        manager_name: 'Fleet Dispatcher (In-Charge)',
        vendor_contact_spoken_to: overrideContact || 'Lead Dispatcher',
        agreed_net_payout_usd: parseFloat(overrideRate),
        driver_name: overrideDriver || 'Assigned Lead Chauffeur',
        notes: overrideNotes || 'Confirmed via direct phone call with vendor.'
      });
      setNotification(`✓ Leg locked at $${res.passenger_final_total_usd} all-inclusive! Customer notified.`);
      setShowOverrideModal(null);
      setOverrideRate('');
      setOverrideContact('');
      setOverrideDriver('');
      loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to submit override');
    } finally {
      setSubmittingOverride(false);
    }
  };

  const handleSimulateVendorQuote = async (opp: any) => {
    try {
      const simRate = opp.suggested_benchmark_payout_usd + 15;
      const res = await submitVendorQuoteApi({
        quote_token: opp.quote_token,
        quoted_payout_usd: simRate,
        vendor_company_name: opp.target_vendor_name,
        dispatcher_or_driver_name: 'Alex Vance (Senior Dispatcher)',
        contact_phone: opp.target_vendor_phone || '+1-800-555-0199',
        vehicle_model: '2025 Cadillac Escalade ESV VIP'
      });
      setNotification(`✓ Vendor submitted $${simRate} quote! Leg locked at $${res.passenger_final_total_usd}.`);
      loadData();
    } catch (err: any) {
      alert(err.message || 'Simulation error');
    }
  };

  const handleLaunchNewRfp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLaunchingRfp(true);
    try {
      await submitSourcingInquiry({
        customer_name: 'Executive Concierge Request',
        customer_email: newManagerCc,
        customer_phone: '+1 (555) 019-9281',
        pickup_city: newCity,
        dropoff_city: newCity,
        pickup_time_utc: new Date(Date.now() + 86400000).toISOString(),
        requested_vehicle_class: newVehicleClass,
        tenant_id: 'tenant-us-east'
      }).catch(() => null);

      const res = await triggerManualSourcingRfp({
        city: newCity,
        pickup_address: newPickup,
        dropoff_address: newDropoff,
        vehicle_class: newVehicleClass,
        manager_cc_email: newManagerCc
      });
      setNotification(`🚀 AI Sourcing RFP dispatched to ${res.target_vendor_name}! CC sent to ${res.manager_cc_email}`);
      setShowNewRfpModal(false);
      loadData();
    } catch (err: any) {
      alert(err.message || 'Error launching RFP');
    } finally {
      setLaunchingRfp(false);
    }
  };

  const handleAddPartnerSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!partnerCompany || !partnerEmail || !partnerCity) return;
    setSavingPartner(true);
    try {
      const res = await addVendorExternalPartner('vendor-anb-philly', {
        company_name: partnerCompany,
        contact_name: partnerContact,
        email: partnerEmail,
        phone: partnerPhone,
        operating_city: partnerCity,
        preferred_payout_rate: parseFloat(partnerRate) || 195.0,
        notes: partnerNotes
      });
      setNotification(`✓ ${res.message}`);
      setShowAddPartnerModal(false);
      setPartnerCompany('');
      setPartnerContact('');
      setPartnerEmail('');
      setPartnerPhone('');
      setPartnerCity('');
      setPartnerNotes('');
      loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to add partner');
    } finally {
      setSavingPartner(false);
    }
  };

  const handleSendInvitation = async (partner: any) => {
    setInvitingPartnerId(partner.id);
    try {
      const res = await sendNetworkInvitationApi({
        company_name: partner.company_name,
        contact_name: partner.contact_name,
        email: partner.email,
        city: partner.operating_city,
        partner_id: partner.id
      });
      setNotification(`📧 Network Growth invitation dispatched to ${res.recipient_email}!`);
      loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to send invitation');
    } finally {
      setInvitingPartnerId(null);
    }
  };

  const filteredOpps = opportunities.filter(opp => {
    if (activeTab === 'ACTION_REQUIRED') return opp.status === 'MANAGER_FOLLOWUP_REQUIRED' || opp.status === 'AI_DISPATCHED';
    if (activeTab === 'CONFIRMED') return opp.status === 'PROVISIONALLY_CONFIRMED';
    return true;
  });

  return (
    <div style={{
      background: '#FFFFFF',
      border: '1px solid #E2E8F0',
      borderRadius: '16px',
      padding: '24px',
      boxShadow: '0 4px 20px -2px rgba(0, 0, 0, 0.05)',
      color: '#0F172A',
      fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      position: 'relative'
    }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '16px',
        paddingBottom: '20px',
        borderBottom: '1px solid #F1F5F9'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{
            width: '46px',
            height: '46px',
            borderRadius: '12px',
            background: 'linear-gradient(135deg, #EEF2FF 0%, #E0E7FF 100%)',
            border: '1px solid #C7D2FE',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#4F46E5'
          }}>
            <Sparkles size={24} />
          </div>
          <div>
            <h2 style={{
              fontSize: '20px',
              fontWeight: 800,
              color: '#0F172A',
              margin: 0,
              letterSpacing: '-0.02em',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              AI Autonomous Sourcing & Trusted Partner Desk
            </h2>
            <p style={{ fontSize: '13px', color: '#64748B', margin: '4px 0 0 0', fontWeight: 500 }}>
              Out-of-Market Vendor Discovery · Dual-Delivery RFP · Trusted Offline Partner Directory · 10-Min Phone Escalation
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          {/* Main View Switcher */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            background: '#F1F5F9',
            padding: '4px',
            borderRadius: '10px',
            border: '1px solid #E2E8F0'
          }}>
            <button
              onClick={() => setMainView('QUEUE')}
              style={{
                padding: '7px 14px',
                borderRadius: '8px',
                fontSize: '12px',
                fontWeight: mainView === 'QUEUE' ? 700 : 500,
                background: mainView === 'QUEUE' ? '#0F172A' : 'transparent',
                color: mainView === 'QUEUE' ? '#FFFFFF' : '#64748B',
                border: 'none',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                transition: 'all 0.15s ease'
              }}
            >
              <Radio size={14} /> Sourcing RFP Queue
            </button>
            <button
              onClick={() => setMainView('ROLODEX')}
              style={{
                padding: '7px 14px',
                borderRadius: '8px',
                fontSize: '12px',
                fontWeight: mainView === 'ROLODEX' ? 700 : 500,
                background: mainView === 'ROLODEX' ? '#0F172A' : 'transparent',
                color: mainView === 'ROLODEX' ? '#FFFFFF' : '#64748B',
                border: 'none',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                transition: 'all 0.15s ease'
              }}
            >
              <Users size={14} /> Partner Rolodex ({partners.length})
            </button>
          </div>

          <button
            onClick={loadData}
            disabled={loading}
            style={{
              padding: '8px 14px',
              background: '#FFFFFF',
              border: '1px solid #CBD5E1',
              borderRadius: '8px',
              fontSize: '12px',
              fontWeight: 600,
              color: '#334155',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <span style={{ display: 'inline-block', animation: loading ? 'spin 1s linear infinite' : 'none' }}>⟳</span>
            Refresh
          </button>

          {mainView === 'QUEUE' ? (
            <button
              onClick={() => setShowNewRfpModal(true)}
              style={{
                padding: '8px 16px',
                background: 'linear-gradient(135deg, #4F46E5 0%, #4338CA 100%)',
                color: '#FFFFFF',
                borderRadius: '8px',
                border: 'none',
                fontSize: '12px',
                fontWeight: 700,
                cursor: 'pointer',
                boxShadow: '0 2px 8px rgba(79, 70, 229, 0.3)',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <Plus size={14} /> Source New Corridor
            </button>
          ) : (
            <button
              onClick={() => setShowAddPartnerModal(true)}
              style={{
                padding: '8px 16px',
                background: 'linear-gradient(135deg, #059669 0%, #047857 100%)',
                color: '#FFFFFF',
                borderRadius: '8px',
                border: 'none',
                fontSize: '12px',
                fontWeight: 700,
                cursor: 'pointer',
                boxShadow: '0 2px 8px rgba(5, 150, 105, 0.3)',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <Plus size={14} /> Add Trusted Partner
            </button>
          )}
        </div>
      </div>

      {/* Alert Banner */}
      {notification && (
        <div style={{
          marginTop: '16px',
          padding: '12px 16px',
          background: '#ECFDF5',
          border: '1px solid #A7F3D0',
          borderRadius: '10px',
          color: '#065F46',
          fontSize: '13px',
          fontWeight: 600,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <span>{notification}</span>
          <button 
            onClick={() => setNotification(null)}
            style={{ background: 'transparent', border: 'none', color: '#065F46', cursor: 'pointer' }}
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* Key Metrics 4-Column Strip */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
        gap: '14px',
        margin: '20px 0'
      }}>
        <div style={{
          padding: '14px 18px',
          background: '#F8FAFC',
          border: '1px solid #E2E8F0',
          borderRadius: '12px'
        }}>
          <div style={{ fontSize: '11px', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Active Sourcing Tickets
          </div>
          <div style={{ fontSize: '22px', fontWeight: 800, color: '#0F172A', marginTop: '4px' }}>
            {opportunities.length} Live
          </div>
          <div style={{ fontSize: '11px', color: '#4F46E5', marginTop: '2px', fontWeight: 600 }}>
            Dual-RFP Sent with Owner CC
          </div>
        </div>

        <div style={{
          padding: '14px 18px',
          background: '#FFFBEB',
          border: '1px solid #FDE68A',
          borderRadius: '12px'
        }}>
          <div style={{ fontSize: '11px', fontWeight: 700, color: '#92400E', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Trusted Offline Partners
          </div>
          <div style={{ fontSize: '22px', fontWeight: 800, color: '#B45309', marginTop: '4px' }}>
            {partners.length} Directory
          </div>
          <div style={{ fontSize: '11px', color: '#92400E', marginTop: '2px', fontWeight: 600 }}>
            Verified non-network rolodex
          </div>
        </div>

        <div style={{
          padding: '14px 18px',
          background: '#ECFDF5',
          border: '1px solid #A7F3D0',
          borderRadius: '12px'
        }}>
          <div style={{ fontSize: '11px', fontWeight: 700, color: '#065F46', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Confirmed & Locked Legs
          </div>
          <div style={{ fontSize: '22px', fontWeight: 800, color: '#047857', marginTop: '4px' }}>
            {opportunities.filter(o => o.status === 'PROVISIONALLY_CONFIRMED').length} Secured
          </div>
          <div style={{ fontSize: '11px', color: '#047857', marginTop: '2px', fontWeight: 600 }}>
            Provisional affiliates auto-created
          </div>
        </div>

        <div style={{
          padding: '14px 18px',
          background: '#EEF2FF',
          border: '1px solid #C7D2FE',
          borderRadius: '12px'
        }}>
          <div style={{ fontSize: '11px', fontWeight: 700, color: '#3730A3', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Instant Settlement Option
          </div>
          <div style={{ fontSize: '22px', fontWeight: 800, color: '#4338CA', marginTop: '4px' }}>
            Stripe Connect
          </div>
          <div style={{ fontSize: '11px', color: '#4338CA', marginTop: '2px', fontWeight: 600 }}>
            80% Performer / 10% ANB / 10% Hub
          </div>
        </div>
      </div>

      {/* MAIN VIEW: ROLODEX vs QUEUE */}
      {mainView === 'ROLODEX' ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: '#F8FAFC',
            padding: '14px 18px',
            borderRadius: '12px',
            border: '1px solid #E2E8F0',
            flexWrap: 'wrap',
            gap: '10px'
          }}>
            <div style={{ fontSize: '13px', color: '#475569' }}>
              <strong style={{ color: '#0F172A' }}>Trusted Offline Partner Directory:</strong> When an out-of-market multi-leg booking arrives (e.g. Aspen, Miami, Los Angeles), farm out immediately or dispatch an automated B2B RFP.
            </div>
            <button
              onClick={() => setShowAddPartnerModal(true)}
              style={{
                padding: '7px 14px',
                background: '#059669',
                color: '#FFFFFF',
                borderRadius: '8px',
                border: 'none',
                fontSize: '12px',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <Plus size={14} /> Add Partner
            </button>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
            gap: '16px'
          }}>
            {partners.map((partner) => (
              <div
                key={partner.id}
                style={{
                  background: '#FFFFFF',
                  border: '1px solid #E2E8F0',
                  borderRadius: '12px',
                  padding: '16px',
                  boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  gap: '14px'
                }}
              >
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '8px' }}>
                    <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 800, color: '#0F172A' }}>
                      {partner.company_name}
                    </h3>
                    <span style={{
                      padding: '3px 8px',
                      borderRadius: '6px',
                      fontSize: '11px',
                      fontWeight: 700,
                      background: '#EEF2FF',
                      color: '#4338CA',
                      border: '1px solid #C7D2FE'
                    }}>
                      {partner.operating_city}
                    </span>
                  </div>

                  {partner.contact_name && (
                    <div style={{ fontSize: '12px', color: '#334155', display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 600 }}>
                      <UserCheck size={14} color="#4F46E5" />
                      <span>{partner.contact_name}</span>
                    </div>
                  )}

                  <div style={{ fontSize: '12px', color: '#64748B', display: 'flex', flexDirection: 'column', gap: '3px', fontFamily: 'monospace' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Mail size={13} color="#94A3B8" />
                      <span>{partner.email}</span>
                    </div>
                    {partner.phone && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <PhoneCall size={13} color="#94A3B8" />
                        <span>{partner.phone}</span>
                      </div>
                    )}
                  </div>

                  {partner.preferred_payout_rate && (
                    <div style={{ fontSize: '12px', color: '#047857', fontWeight: 700, paddingTop: '4px' }}>
                      Agreed Benchmark: ${partner.preferred_payout_rate} Net
                    </div>
                  )}

                  {partner.notes && (
                    <p style={{
                      fontSize: '12px',
                      color: '#64748B',
                      fontStyle: 'italic',
                      margin: '4px 0 0 0',
                      padding: '6px 8px',
                      background: '#F8FAFC',
                      borderRadius: '6px',
                      border: '1px solid #F1F5F9'
                    }}>
                      "{partner.notes}"
                    </p>
                  )}
                </div>

                <div style={{
                  paddingTop: '12px',
                  borderTop: '1px solid #F1F5F9',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}>
                  <button
                    onClick={() => {
                      const cityName = partner.operating_city.split(',')[0].trim();
                      setNewCity(partner.operating_city);
                      setNewPickup(`${cityName} Executive Airport (FBO)`);
                      setNewDropoff(`${cityName} Downtown Luxury Hotel`);
                      setShowNewRfpModal(true);
                    }}
                    style={{
                      flex: 1,
                      padding: '8px 12px',
                      background: '#4F46E5',
                      color: '#FFFFFF',
                      borderRadius: '8px',
                      border: 'none',
                      fontSize: '12px',
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px'
                    }}
                  >
                    <Send size={13} /> Dispatch RFP
                  </button>
                  <button
                    onClick={() => handleSendInvitation(partner)}
                    disabled={invitingPartnerId === partner.id}
                    style={{
                      padding: '8px 12px',
                      background: '#F8FAFC',
                      border: '1px solid #CBD5E1',
                      color: '#334155',
                      borderRadius: '8px',
                      fontSize: '12px',
                      fontWeight: 600,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}
                    title="Send B2B Recruitment Email to Join Global Network"
                  >
                    <Award size={14} color="#D97706" />
                    {invitingPartnerId === partner.id ? 'Sending...' : 'Invite to Join'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        /* QUEUE VIEW */
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {/* Tabs */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            borderBottom: '1px solid #E2E8F0',
            paddingBottom: '12px'
          }}>
            {(['ALL', 'ACTION_REQUIRED', 'CONFIRMED'] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                style={{
                  padding: '7px 14px',
                  borderRadius: '8px',
                  fontSize: '12px',
                  fontWeight: activeTab === tab ? 700 : 500,
                  background: activeTab === tab ? '#0F172A' : '#F1F5F9',
                  color: activeTab === tab ? '#FFFFFF' : '#64748B',
                  border: 'none',
                  cursor: 'pointer'
                }}
              >
                {tab === 'ALL' && 'All Corridors'}
                {tab === 'ACTION_REQUIRED' && '⚠️ Action Required (Call / Sourcing)'}
                {tab === 'CONFIRMED' && '✓ Confirmed & Locked'}
              </button>
            ))}
          </div>

          {filteredOpps.length === 0 ? (
            <div style={{
              padding: '36px',
              textAlign: 'center',
              background: '#F8FAFC',
              borderRadius: '12px',
              border: '1px solid #E2E8F0',
              color: '#64748B',
              fontSize: '13px'
            }}>
              No active sourcing opportunities found in this category. Click <strong>"Source New Corridor"</strong> to launch an autonomous RFP.
            </div>
          ) : (
            filteredOpps.map((opp) => {
              const isEscalated = opp.status === 'MANAGER_FOLLOWUP_REQUIRED';
              const isConfirmed = opp.status === 'PROVISIONALLY_CONFIRMED';
              const isAiDispatched = opp.status === 'AI_DISPATCHED';

              return (
                <div
                  key={opp.rfp_id}
                  style={{
                    padding: '18px',
                    borderRadius: '12px',
                    border: isEscalated ? '1.5px solid #F59E0B' : isConfirmed ? '1.5px solid #10B981' : '1px solid #E2E8F0',
                    background: isEscalated ? '#FFFBEB' : isConfirmed ? '#F0FDF4' : '#FFFFFF',
                    boxShadow: isEscalated ? '0 4px 12px rgba(245, 158, 11, 0.1)' : '0 2px 8px rgba(0,0,0,0.03)',
                    transition: 'all 0.2s ease'
                  }}
                >
                  <div style={{
                    display: 'flex',
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: '16px'
                  }}>
                    {/* Left Column: Vendor & Trip Details */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', flex: 1, minWidth: '280px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                        <span style={{ fontSize: '15px', fontWeight: 800, color: '#0F172A' }}>
                          {opp.target_city} Corridor
                        </span>
                        <span style={{ color: '#94A3B8' }}>·</span>
                        <span style={{ fontSize: '13px', fontWeight: 700, color: '#4F46E5' }}>
                          {opp.target_vendor_name}
                        </span>
                        
                        {/* Status Badges */}
                        {isEscalated && (
                          <span style={{
                            padding: '3px 9px',
                            background: '#FEE2E2',
                            border: '1px solid #FCA5A5',
                            color: '#B91C1C',
                            fontSize: '11px',
                            fontWeight: 800,
                            borderRadius: '20px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px'
                          }}>
                            <AlertTriangle size={12} />
                            CALL VENDOR NOW (10m SLA EXPIRING)
                          </span>
                        )}
                        {isAiDispatched && (
                          <span style={{
                            padding: '3px 9px',
                            background: '#EEF2FF',
                            border: '1px solid #C7D2FE',
                            color: '#4338CA',
                            fontSize: '11px',
                            fontWeight: 700,
                            borderRadius: '20px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px'
                          }}>
                            <Clock size={12} />
                            AI Sourcing Active (Awaiting Quote)
                          </span>
                        )}
                        {isConfirmed && (
                          <span style={{
                            padding: '3px 9px',
                            background: '#D1FAE5',
                            border: '1px solid #6EE7B7',
                            color: '#065F46',
                            fontSize: '11px',
                            fontWeight: 800,
                            borderRadius: '20px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px'
                          }}>
                            <CheckCircle2 size={12} />
                            Locked & Secured (${opp.quoted_rate_usd} Net)
                          </span>
                        )}
                      </div>

                      <div style={{ fontSize: '13px', color: '#334155' }}>
                        <span style={{ fontWeight: 600, color: '#64748B' }}>Pickup:</span> {opp.pickup_address} <span style={{ color: '#4F46E5', fontWeight: 800 }}>➔</span> <span style={{ fontWeight: 600, color: '#64748B' }}>Dropoff:</span> {opp.dropoff_address}
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '14px', fontSize: '12px', color: '#64748B', flexWrap: 'wrap', paddingTop: '4px' }}>
                        <span>Tier: <strong style={{ color: '#0F172A' }}>{opp.vehicle_class.replace('_', ' ')}</strong></span>
                        <span>Benchmark Net: <strong style={{ color: '#047857' }}>${opp.suggested_benchmark_payout_usd}</strong></span>
                        <span>Manager CC: <strong style={{ color: '#0F172A' }}>{opp.manager_cc_email}</strong></span>
                        {opp.target_vendor_phone && (
                          <span>Direct Phone: <strong style={{ color: '#B45309', fontFamily: 'monospace' }}>{opp.target_vendor_phone}</strong></span>
                        )}
                      </div>

                      {opp.manager_notes && (
                        <div style={{
                          fontSize: '12px',
                          background: '#F8FAFC',
                          padding: '8px 12px',
                          borderRadius: '8px',
                          border: '1px solid #E2E8F0',
                          color: '#334155',
                          marginTop: '6px',
                          fontFamily: 'monospace'
                        }}>
                          📝 {opp.manager_notes}
                        </div>
                      )}
                    </div>

                    {/* Right Column: Actions */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                      <button
                        onClick={() => setPreviewEmailModal(opp)}
                        style={{
                          padding: '8px 12px',
                          background: '#FFFFFF',
                          border: '1px solid #CBD5E1',
                          color: '#334155',
                          borderRadius: '8px',
                          fontSize: '12px',
                          fontWeight: 600,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px'
                        }}
                      >
                        <Mail size={14} color="#4F46E5" />
                        View Email (CC)
                      </button>

                      {opp.target_vendor_phone && (
                        <a
                          href={`tel:${opp.target_vendor_phone}`}
                          style={{
                            padding: '8px 12px',
                            background: '#FFFBEB',
                            color: '#B45309',
                            border: '1px solid #FDE68A',
                            borderRadius: '8px',
                            fontSize: '12px',
                            fontWeight: 700,
                            textDecoration: 'none',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px'
                          }}
                        >
                          <PhoneCall size={14} />
                          Call Vendor
                        </a>
                      )}

                      {!isConfirmed && (
                        <button
                          onClick={() => {
                            setShowOverrideModal(opp);
                            setOverrideRate(String(opp.suggested_benchmark_payout_usd));
                          }}
                          style={{
                            padding: '8px 14px',
                            background: '#059669',
                            color: '#FFFFFF',
                            borderRadius: '8px',
                            border: 'none',
                            fontSize: '12px',
                            fontWeight: 700,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            boxShadow: '0 2px 6px rgba(5, 150, 105, 0.25)'
                          }}
                        >
                          ✓ Log Agreed Rate
                        </button>
                      )}

                      {!isConfirmed && (
                        <button
                          onClick={async () => {
                            try {
                              const res = await fetch('/api/v1/sourcing/inbound-email-webhook', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({
                                  raw_text: `Hi Dispatch, We can cover this ${opp.target_city} transfer for $${opp.suggested_benchmark_payout_usd} net. Assigned driver is Klaus Vance (+1-970-555-0144) in a 2025 Cadillac Escalade ESV. Thanks!`,
                                  sender: opp.target_vendor_email,
                                  quote_token: opp.quote_token
                                })
                              });
                              const parsed = await res.json();
                              setNotification(`🤖 LLM Inbound Email Parsed: Extracted $${parsed.extracted_rate_usd} net by ${parsed.extracted_driver}! Leg locked.`);
                              loadData();
                            } catch (e: any) {
                              alert('Email parser error: ' + e.message);
                            }
                          }}
                          style={{
                            padding: '8px 12px',
                            background: '#FAF5FF',
                            border: '1px solid #E9D5FF',
                            color: '#7E22CE',
                            borderRadius: '8px',
                            fontSize: '12px',
                            fontWeight: 600,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px'
                          }}
                          title="Simulate vendor sending a free-text email reply (auto-parsed by LLM)"
                        >
                          <Sparkles size={14} />
                          Test Email LLM Parser
                        </button>
                      )}

                      {!isConfirmed && (
                        <button
                          onClick={() => handleSimulateVendorQuote(opp)}
                          style={{
                            padding: '8px 12px',
                            background: '#EEF2FF',
                            border: '1px solid #C7D2FE',
                            color: '#4338CA',
                            borderRadius: '8px',
                            fontSize: '12px',
                            fontWeight: 600,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px'
                          }}
                          title="Simulate vendor clicking the 1-click quote link in email"
                        >
                          <ExternalLink size={14} />
                          Simulate Link Click
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* MODAL 1: Log Manual Agreed Rate (Manager Phone Override) */}
      {showOverrideModal && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(15, 23, 42, 0.65)',
          backdropFilter: 'blur(4px)',
          zIndex: 9999,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '16px'
        }}>
          <div style={{
            background: '#FFFFFF',
            borderRadius: '16px',
            border: '1px solid #E2E8F0',
            maxWidth: '520px',
            width: '100%',
            padding: '24px',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: '14px', borderBottom: '1px solid #E2E8F0' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ padding: '8px', background: '#ECFDF5', borderRadius: '8px', color: '#047857' }}>
                  <PhoneCall size={20} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 800, color: '#0F172A' }}>Log Agreed Rate from Phone Call</h3>
                  <p style={{ margin: '2px 0 0 0', fontSize: '12px', color: '#64748B' }}>Lock the leg immediately so no job is lost.</p>
                </div>
              </div>
              <button 
                onClick={() => setShowOverrideModal(null)}
                style={{ background: 'transparent', border: 'none', color: '#64748B', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handlePhoneOverrideSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginTop: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>Target Vendor</label>
                <input
                  type="text"
                  disabled
                  value={`${showOverrideModal.target_vendor_name} (${showOverrideModal.target_city})`}
                  style={{ width: '100%', padding: '10px 12px', background: '#F8FAFC', border: '1px solid #CBD5E1', borderRadius: '8px', fontSize: '13px', color: '#334155', boxSizing: 'border-box' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>Agreed Net Payout ($ USD) *</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={overrideRate}
                    onChange={(e) => setOverrideRate(e.target.value)}
                    placeholder="e.g. 195.00"
                    style={{ width: '100%', padding: '10px 12px', background: '#FFFFFF', border: '1.5px solid #10B981', borderRadius: '8px', fontSize: '13px', fontWeight: 800, color: '#0F172A', boxSizing: 'border-box' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>Dispatcher Contact Spoken To</label>
                  <input
                    type="text"
                    value={overrideContact}
                    onChange={(e) => setOverrideContact(e.target.value)}
                    placeholder="e.g. Lead Dispatcher"
                    style={{ width: '100%', padding: '10px 12px', background: '#FFFFFF', border: '1px solid #CBD5E1', borderRadius: '8px', fontSize: '13px', color: '#0F172A', boxSizing: 'border-box' }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>Driver Name (Optional)</label>
                  <input
                    type="text"
                    value={overrideDriver}
                    onChange={(e) => setOverrideDriver(e.target.value)}
                    placeholder="e.g. Driver Mike"
                    style={{ width: '100%', padding: '10px 12px', background: '#FFFFFF', border: '1px solid #CBD5E1', borderRadius: '8px', fontSize: '13px', color: '#0F172A', boxSizing: 'border-box' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>Notes / Instructions</label>
                  <input
                    type="text"
                    value={overrideNotes}
                    onChange={(e) => setOverrideNotes(e.target.value)}
                    placeholder="e.g. VIP Meet & Greet"
                    style={{ width: '100%', padding: '10px 12px', background: '#FFFFFF', border: '1px solid #CBD5E1', borderRadius: '8px', fontSize: '13px', color: '#0F172A', boxSizing: 'border-box' }}
                  />
                </div>
              </div>

              <div style={{ padding: '12px', background: '#ECFDF5', border: '1px solid #A7F3D0', borderRadius: '10px', color: '#065F46', fontSize: '12px', lineHeight: '1.4' }}>
                ⚡ <strong>Instant Lock:</strong> Submitting will lock the leg in the itinerary, recalculate taxes/gratuity, provision the affiliate, and notify the client.
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '10px', paddingTop: '8px' }}>
                <button
                  type="button"
                  onClick={() => setShowOverrideModal(null)}
                  style={{ padding: '9px 16px', background: '#F1F5F9', border: 'none', borderRadius: '8px', color: '#475569', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingOverride}
                  style={{ padding: '9px 18px', background: '#059669', color: '#FFFFFF', border: 'none', borderRadius: '8px', fontSize: '13px', fontWeight: 700, cursor: 'pointer' }}
                >
                  {submittingOverride ? 'Locking Leg...' : 'Lock Leg & Confirm Job'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: Source New Out-of-Market Corridor (WITH GOOGLE PLACES AUTOCOMPLETE) */}
      {showNewRfpModal && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(15, 23, 42, 0.65)',
          backdropFilter: 'blur(4px)',
          zIndex: 9999,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '16px'
        }}>
          <div style={{
            background: '#FFFFFF',
            borderRadius: '16px',
            border: '1px solid #E2E8F0',
            maxWidth: '540px',
            width: '100%',
            padding: '24px',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: '14px', borderBottom: '1px solid #E2E8F0' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ padding: '8px', background: '#EEF2FF', borderRadius: '8px', color: '#4F46E5' }}>
                  <Globe size={20} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 800, color: '#0F172A' }}>Launch Autonomous Sourcing RFP</h3>
                  <p style={{ margin: '2px 0 0 0', fontSize: '12px', color: '#64748B' }}>Live Google Places autocompletion for destination, airport FBOs, and hotels.</p>
                </div>
              </div>
              <button 
                onClick={() => setShowNewRfpModal(false)}
                style={{ background: 'transparent', border: 'none', color: '#64748B', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleLaunchNewRfp} style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginTop: '16px' }}>
              {/* Target Destination / City with Autocomplete */}
              <div>
                <AddressAutocompleteInput
                  id="target-city-input"
                  label="Target Destination / City"
                  required
                  value={newCity}
                  onChange={(val) => setNewCity(val)}
                  onSelectPlace={(place: PlacePrediction) => {
                    const cityName = place.main_text || place.description.split(',')[0].trim();
                    setNewCity(place.description);
                    if (!newPickup || newPickup.includes('Aspen') || newPickup.includes('Airport')) {
                      setNewPickup(`${cityName} Executive Airport / Private VIP FBO`);
                    }
                    if (!newDropoff || newDropoff.includes('The Little Nell') || newDropoff.includes('Aspen')) {
                      setNewDropoff(`${cityName} Downtown Luxury Hotel & Suites`);
                    }
                  }}
                  placeholder="Search target city, e.g. Aspen, Miami, Los Angeles, Chicago..."
                />
              </div>

              {/* Pickup Address / Airport FBO with Google Autocomplete */}
              <div>
                <AddressAutocompleteInput
                  id="pickup-address-input"
                  label="Pickup Address / Airport FBO"
                  required
                  value={newPickup}
                  onChange={(val) => setNewPickup(val)}
                  onSelectPlace={(place: PlacePrediction) => {
                    setNewPickup(place.description);
                  }}
                  placeholder="Search airport (e.g. ASE, MIA, JFK, LAX), FBO, or address..."
                />
              </div>

              {/* Dropoff Address with Google Autocomplete */}
              <div>
                <AddressAutocompleteInput
                  id="dropoff-address-input"
                  label="Dropoff Address"
                  required
                  value={newDropoff}
                  onChange={(val) => setNewDropoff(val)}
                  onSelectPlace={(place: PlacePrediction) => {
                    setNewDropoff(place.description);
                  }}
                  placeholder="Search luxury hotel, private estate, or venue address..."
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 700, color: '#475569', marginBottom: '6px' }}>Vehicle Class</label>
                  <select
                    value={newVehicleClass}
                    onChange={(e) => setNewVehicleClass(e.target.value)}
                    style={{ width: '100%', padding: '10px 12px', background: '#FFFFFF', border: '1px solid #CBD5E1', borderRadius: '6px', fontSize: '13px', color: '#0F172A', boxSizing: 'border-box' }}
                  >
                    <option value="LUXURY_SUV">Luxury SUV (Escalade/Navigator)</option>
                    <option value="FIRST_CLASS">First Class (Mercedes S-Class)</option>
                    <option value="BUSINESS_VAN">Executive Sprinter VIP</option>
                    <option value="ULTRA_LUXURY">Ultra Luxury (Maybach)</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 700, color: '#475569', marginBottom: '6px' }}>Manager CC Email (Self) *</label>
                  <input
                    type="email"
                    required
                    value={newManagerCc}
                    onChange={(e) => setNewManagerCc(e.target.value)}
                    style={{ width: '100%', padding: '10px 12px', background: '#FFFFFF', border: '1px solid #CBD5E1', borderRadius: '6px', fontSize: '13px', color: '#0F172A', boxSizing: 'border-box' }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '10px', paddingTop: '10px' }}>
                <button
                  type="button"
                  onClick={() => setShowNewRfpModal(false)}
                  style={{ padding: '9px 16px', background: '#F1F5F9', border: 'none', borderRadius: '8px', color: '#475569', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={launchingRfp}
                  style={{ padding: '9px 18px', background: '#4F46E5', color: '#FFFFFF', border: 'none', borderRadius: '8px', fontSize: '13px', fontWeight: 700, cursor: 'pointer', boxShadow: '0 2px 8px rgba(79, 70, 229, 0.3)' }}
                >
                  {launchingRfp ? 'Discovering & Sending...' : 'Discover & Dispatch Dual-RFP'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: Add Trusted Partner (WITH GOOGLE PLACES CITY AUTOCOMPLETE) */}
      {showAddPartnerModal && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(15, 23, 42, 0.65)',
          backdropFilter: 'blur(4px)',
          zIndex: 9999,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '16px'
        }}>
          <div style={{
            background: '#FFFFFF',
            borderRadius: '16px',
            border: '1px solid #E2E8F0',
            maxWidth: '500px',
            width: '100%',
            padding: '24px',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: '14px', borderBottom: '1px solid #E2E8F0' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ padding: '8px', background: '#ECFDF5', borderRadius: '8px', color: '#047857' }}>
                  <Plus size={20} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 800, color: '#0F172A' }}>Add Trusted Offline Partner</h3>
                  <p style={{ margin: '2px 0 0 0', fontSize: '12px', color: '#64748B' }}>Save a trusted vendor to farm out out-of-market legs.</p>
                </div>
              </div>
              <button 
                onClick={() => setShowAddPartnerModal(false)}
                style={{ background: 'transparent', border: 'none', color: '#64748B', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleAddPartnerSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 700, color: '#475569', marginBottom: '6px' }}>Company Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Miami Executive Chauffeurs LLC"
                  value={partnerCompany}
                  onChange={(e) => setPartnerCompany(e.target.value)}
                  style={{ width: '100%', padding: '10px 12px', background: '#FFFFFF', border: '1px solid #CBD5E1', borderRadius: '6px', fontSize: '13px', color: '#0F172A', boxSizing: 'border-box' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 700, color: '#475569', marginBottom: '6px' }}>Contact Name</label>
                  <input
                    type="text"
                    placeholder="e.g. Carlos Mendez"
                    value={partnerContact}
                    onChange={(e) => setPartnerContact(e.target.value)}
                    style={{ width: '100%', padding: '10px 12px', background: '#FFFFFF', border: '1px solid #CBD5E1', borderRadius: '6px', fontSize: '13px', color: '#0F172A', boxSizing: 'border-box' }}
                  />
                </div>
                <div>
                  <AddressAutocompleteInput
                    id="partner-city-input"
                    label="Operating City"
                    required
                    placeholder="e.g. Miami, FL"
                    value={partnerCity}
                    onChange={(val) => setPartnerCity(val)}
                    onSelectPlace={(place) => setPartnerCity(place.description)}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 700, color: '#475569', marginBottom: '6px' }}>Direct Email *</label>
                  <input
                    type="email"
                    required
                    placeholder="dispatch@miamiexec.com"
                    value={partnerEmail}
                    onChange={(e) => setPartnerEmail(e.target.value)}
                    style={{ width: '100%', padding: '10px 12px', background: '#FFFFFF', border: '1px solid #CBD5E1', borderRadius: '6px', fontSize: '13px', color: '#0F172A', fontFamily: 'monospace', boxSizing: 'border-box' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 700, color: '#475569', marginBottom: '6px' }}>Direct Phone</label>
                  <input
                    type="text"
                    placeholder="+1-305-555-0199"
                    value={partnerPhone}
                    onChange={(e) => setPartnerPhone(e.target.value)}
                    style={{ width: '100%', padding: '10px 12px', background: '#FFFFFF', border: '1px solid #CBD5E1', borderRadius: '6px', fontSize: '13px', color: '#0F172A', fontFamily: 'monospace', boxSizing: 'border-box' }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 700, color: '#475569', marginBottom: '6px' }}>Preferred Net Rate ($ USD)</label>
                <input
                  type="number"
                  step="0.01"
                  value={partnerRate}
                  onChange={(e) => setPartnerRate(e.target.value)}
                  style={{ width: '100%', padding: '10px 12px', background: '#FFFFFF', border: '1px solid #CBD5E1', borderRadius: '6px', fontSize: '13px', fontWeight: 700, color: '#0F172A', boxSizing: 'border-box' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 700, color: '#475569', marginBottom: '6px' }}>Notes / Fleet Info</label>
                <textarea
                  rows={2}
                  placeholder="e.g. Cadillac Escalade ESV and Mercedes S580 fleet, highly reliable."
                  value={partnerNotes}
                  onChange={(e) => setPartnerNotes(e.target.value)}
                  style={{ width: '100%', padding: '10px 12px', background: '#FFFFFF', border: '1px solid #CBD5E1', borderRadius: '6px', fontSize: '13px', color: '#0F172A', boxSizing: 'border-box' }}
                />
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '10px', paddingTop: '10px' }}>
                <button
                  type="button"
                  onClick={() => setShowAddPartnerModal(false)}
                  style={{ padding: '9px 16px', background: '#F1F5F9', border: 'none', borderRadius: '8px', color: '#475569', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingPartner}
                  style={{ padding: '9px 18px', background: '#059669', color: '#FFFFFF', border: 'none', borderRadius: '8px', fontSize: '13px', fontWeight: 700, cursor: 'pointer', boxShadow: '0 2px 8px rgba(5, 150, 105, 0.3)' }}
                >
                  {savingPartner ? 'Saving...' : 'Save to Rolodex'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 4: View Dual-RFP Sent Email & CC Copy */}
      {previewEmailModal && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(15, 23, 42, 0.65)',
          backdropFilter: 'blur(4px)',
          zIndex: 9999,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '16px'
        }}>
          <div style={{
            background: '#FFFFFF',
            borderRadius: '16px',
            border: '1px solid #E2E8F0',
            maxWidth: '680px',
            width: '100%',
            padding: '24px',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: '14px', borderBottom: '1px solid #E2E8F0' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ padding: '8px', background: '#EEF2FF', borderRadius: '8px', color: '#4F46E5' }}>
                  <Mail size={20} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 800, color: '#0F172A' }}>Dual-Channel RFP Email Preview</h3>
                  <p style={{ margin: '2px 0 0 0', fontSize: '12px', color: '#64748B' }}>Option 1: 1-Click Mobile Web Portal · Option 2: Copy-Paste Quick Reply Template.</p>
                </div>
              </div>
              <button 
                onClick={() => setPreviewEmailModal(null)}
                style={{ background: 'transparent', border: 'none', color: '#64748B', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            <div style={{
              background: '#F8FAFC',
              padding: '16px',
              borderRadius: '12px',
              border: '1px solid #E2E8F0',
              fontFamily: 'monospace',
              fontSize: '12px',
              color: '#334155',
              display: 'flex',
              flexDirection: 'column',
              gap: '8px',
              maxHeight: '400px',
              overflowY: 'auto',
              marginTop: '16px'
            }}>
              <div><strong>From:</strong> ANB Philly Executive Fleet &lt;dispatch@anblimo.com&gt;</div>
              <div><strong>To:</strong> {previewEmailModal.target_vendor_name} &lt;{previewEmailModal.target_vendor_email}&gt;</div>
              <div style={{ color: '#B45309', fontWeight: 700 }}><strong>CC:</strong> {previewEmailModal.manager_cc_email}</div>
              <div style={{ color: '#4338CA', fontWeight: 700 }}><strong>Subject:</strong> 🚗 B2B VIP Trip Request: {previewEmailModal.target_city} — ${previewEmailModal.suggested_benchmark_payout_usd} USD Net Payout</div>
              
              <div style={{ height: '1px', background: '#E2E8F0', margin: '4px 0' }} />
              
              <div style={{ padding: '10px', background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: '8px', color: '#92400E' }}>
                ⚠️ <strong>[INTERNAL MANAGER DISPATCH BANNER]</strong><br />
                • Target Vendor: {previewEmailModal.target_vendor_name}<br />
                • Direct Phone: {previewEmailModal.target_vendor_phone || 'N/A'}<br />
                • Suggested Benchmark: ${previewEmailModal.suggested_benchmark_payout_usd} USD<br />
                • Escalation Window: 10 mins until 'Call Vendor' prompt
              </div>

              <p style={{ margin: '6px 0 0 0' }}>Dear Dispatch Team at {previewEmailModal.target_vendor_name},</p>
              <p style={{ margin: 0 }}>The Executive Chauffeur Network has an upcoming VIP client trip in your service corridor and is requesting your quote:</p>
              <ul style={{ margin: '4px 0', paddingLeft: '20px', color: '#0F172A' }}>
                <li>Pickup: {previewEmailModal.pickup_address}</li>
                <li>Destination: {previewEmailModal.dropoff_address}</li>
                <li>Tier: {previewEmailModal.vehicle_class.replace('_', ' ')}</li>
                <li>Suggested Net Payout: ${previewEmailModal.suggested_benchmark_payout_usd} USD</li>
              </ul>
              
              <div style={{ padding: '10px', background: '#EEF2FF', border: '1px solid #C7D2FE', borderRadius: '8px', color: '#3730A3', marginTop: '6px' }}>
                👉 <strong>OPTION 1 (1-Click Web Portal):</strong><br />
                🔗 http://localhost:8001/sourcing/quote/{previewEmailModal.quote_token}
              </div>

              <div style={{ padding: '10px', background: '#FFFFFF', border: '1px solid #CBD5E1', borderRadius: '8px', color: '#475569', marginTop: '6px', fontSize: '11px' }}>
                👉 <strong>OPTION 2 (Reply Directly to this Email):</strong><br />
                ---------------------- COPY &amp; PASTE BELOW ----------------------<br />
                STATUS: ACCEPTED<br />
                NET PAYOUT QUOTE: ${previewEmailModal.suggested_benchmark_payout_usd} USD<br />
                DRIVER FULL NAME: [Chauffeur Name]<br />
                DRIVER DIRECT CELL: [Chauffeur Phone]<br />
                VEHICLE MAKE/MODEL: [e.g. 2024 Cadillac Escalade ESV]<br />
                VEHICLE COLOR &amp; LICENSE PLATE: [e.g. Black / State-Plate]<br />
                ----------------------------------------------------------------
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', paddingTop: '14px' }}>
              <button
                onClick={() => setPreviewEmailModal(null)}
                style={{ padding: '8px 16px', background: '#0F172A', color: '#FFFFFF', border: 'none', borderRadius: '8px', fontSize: '12px', fontWeight: 700, cursor: 'pointer' }}
              >
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
