import React, { useState, useEffect } from 'react';
import { 
  Headphones, DollarSign, Settings, Users, Phone, MessageSquare, 
  Mail, AlertTriangle, CheckCircle2, Clock, ShieldCheck, Search, 
  Filter, Plus, Edit3, Trash2, ChevronRight, X, ExternalLink, 
  Plane, Car, RefreshCw, Save, ToggleLeft, ToggleRight, Sparkles,
  AlertCircle, Check, Loader2, ArrowUpRight, HelpCircle, Layers,
  PhoneCall, MessageCircle, Send, FileText, UserCheck, Shield,
  Globe, Radio, Volume2, Key, Sliders, Bell
} from 'lucide-react';
import { 
  SupportDeskPlan, SupportDeskGlobalConfig, VendorSupportSubscription, 
  SupportTicket, SupportOverviewMetrics, RegionalStaffingPod,
  InboundVoiceCallResolution
} from '../types';
import { 
  fetchSupportDeskPlans, updateSupportDeskPlan, fetchSupportDeskConfig, 
  updateSupportDeskConfig, subscribeVendorSupportDesk, fetchSupportDeskSubscriptions, 
  fetchSupportTickets, createSupportTicket, updateSupportTicket, 
  mutateSupportTicketBooking, fetchSupportDeskOverview,
  fetchRegionalStaffingPods, resolveInboundVoiceCall, evaluateAutomatedSlaTriggers
} from '../api';

export const GlobalSupportDeskHub: React.FC = () => {
  const [activeSubTab, setActiveSubTab] = useState<
    'cockpit' | 'regional_pods' | 'voice_router' | 'sla_matrix' | 'pricing_manager' | 'subscriptions'
  >('cockpit');
  
  // Data States
  const [overview, setOverview] = useState<SupportOverviewMetrics | null>(null);
  const [plans, setPlans] = useState<SupportDeskPlan[]>([]);
  const [globalConfig, setGlobalConfig] = useState<SupportDeskGlobalConfig | null>(null);
  const [subscriptions, setSubscriptions] = useState<VendorSupportSubscription[]>([]);
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [regionalPods, setRegionalPods] = useState<RegionalStaffingPod[]>([]);
  
  // Filters & Search
  const [ticketSearch, setTicketSearch] = useState('');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>('ALL');
  const [selectedChannelFilter, setSelectedChannelFilter] = useState<string>('ALL');
  const [selectedPodFilter, setSelectedPodFilter] = useState<string>('ALL');
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);

  // Modals & Forms
  const [editingPlan, setEditingPlan] = useState<SupportDeskPlan | null>(null);
  const [planForm, setPlanForm] = useState({
    name: '',
    monthly_price_usd: 0,
    included_voice_minutes: 0,
    per_minute_overage_usd: 0.35,
    description: '',
    highlight_badge: '',
    is_active: true
  });
  const [isSavingPlan, setIsSavingPlan] = useState(false);
  const [isTogglingPayment, setIsTogglingPayment] = useState(false);
  const [isExecutingMutation, setIsExecutingMutation] = useState<string | null>(null);
  const [mutationSuccessNotice, setMutationSuccessNotice] = useState<string | null>(null);

  // Inbound Voice Simulator State
  const [testCallerPhone, setTestCallerPhone] = useState('+1 (215) 555-0199');
  const [testDialedNumber, setTestDialedNumber] = useState('+1 (800) 555-LIMO');
  const [testExtensionPin, setTestExtensionPin] = useState('1044');
  const [voiceResolutionResult, setVoiceResolutionResult] = useState<InboundVoiceCallResolution | null>(null);
  const [isResolvingVoice, setIsResolvingVoice] = useState(false);

  // SLA Escalation Live Scanner State
  const [slaEscalations, setSlaEscalations] = useState<any[]>([]);
  const [isScanningSla, setIsScanningSla] = useState(false);
  const [slaNotice, setSlaNotice] = useState<string | null>(null);

  // SLA Thresholds Form State
  const [slaForm, setSlaForm] = useState({
    driver_unconfirmed_warning_minutes: 25,
    driver_emergency_recovery_minutes: 15,
    flight_delay_recalibration_threshold_minutes: 90,
    breakdown_immediate_escalation: true,
    owner_overnight_sms_enabled: true
  });
  const [isSavingSla, setIsSavingSla] = useState(false);

  // New Ticket Modal State
  const [showNewTicketModal, setShowNewTicketModal] = useState(false);
  const [newTicketForm, setNewTicketForm] = useState({
    vendor_id: 'vendor_anb_philly',
    ticket_type: 'CUSTOMER_CONCIERGE',
    customer_name: '',
    customer_phone: '',
    customer_email: '',
    booking_id: '',
    channel: 'VOICE_CALL',
    priority: 'MEDIUM',
    subject: '',
    description: '',
    flight_number: '',
    pickup_address: '',
    dropoff_address: '',
    total_amount_usd: 265.0
  });
  const [isCreatingTicket, setIsCreatingTicket] = useState(false);

  // Loading & Error
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadAllData();
  }, []);

  const loadAllData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [plansData, configData, subsData, ticketsData, overviewData, podsData] = await Promise.all([
        fetchSupportDeskPlans(),
        fetchSupportDeskConfig(),
        fetchSupportDeskSubscriptions(),
        fetchSupportTickets(),
        fetchSupportDeskOverview(),
        fetchRegionalStaffingPods().catch(() => [])
      ]);

      setPlans(plansData.plans || []);
      const cfg = configData || plansData.global_config;
      setGlobalConfig(cfg);
      if (cfg) {
        setSlaForm({
          driver_unconfirmed_warning_minutes: cfg.driver_unconfirmed_warning_minutes || 25,
          driver_emergency_recovery_minutes: cfg.driver_emergency_recovery_minutes || 15,
          flight_delay_recalibration_threshold_minutes: cfg.flight_delay_recalibration_threshold_minutes || 90,
          breakdown_immediate_escalation: cfg.breakdown_immediate_escalation !== false,
          owner_overnight_sms_enabled: cfg.owner_overnight_sms_enabled !== false
        });
      }
      setSubscriptions(subsData || []);
      setTickets(ticketsData || []);
      setRegionalPods(podsData || []);
      setOverview(overviewData || null);
      if (ticketsData && ticketsData.length > 0 && !selectedTicket) {
        setSelectedTicket(ticketsData[0]);
      }
    } catch (err: any) {
      setError(err.message || 'Error loading support desk data');
    } finally {
      setLoading(false);
    }
  };

  const handleTogglePaymentMode = async () => {
    if (!globalConfig) return;
    setIsTogglingPayment(true);
    const newMode = !globalConfig.is_payment_required;
    try {
      const res = await updateSupportDeskConfig({
        is_payment_required: newMode,
        billing_mode: newMode ? 'LIVE_STRIPE_BILLING' : 'FREE_PREVIEW',
        announcement_banner: newMode
          ? 'Live Stripe Billing is currently active for all vendor support desk plans.'
          : 'Global Support Desk is currently in Free Preview Mode for all certified vendors ($0/mo charge active).'
      });
      setGlobalConfig(res.config);
      await loadAllData();
    } catch (err: any) {
      alert(err.message || 'Failed to update payment requirement');
    } finally {
      setIsTogglingPayment(false);
    }
  };

  const handleOpenPlanEdit = (plan: SupportDeskPlan) => {
    setEditingPlan(plan);
    setPlanForm({
      name: plan.name,
      monthly_price_usd: plan.monthly_price_usd,
      included_voice_minutes: plan.included_voice_minutes,
      per_minute_overage_usd: plan.per_minute_overage_usd,
      description: plan.description,
      highlight_badge: plan.highlight_badge || '',
      is_active: plan.is_active
    });
  };

  const handleSavePlanPrice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPlan) return;
    setIsSavingPlan(true);
    try {
      await updateSupportDeskPlan(editingPlan.id, planForm);
      setEditingPlan(null);
      await loadAllData();
    } catch (err: any) {
      alert(err.message || 'Failed to save plan pricing');
    } finally {
      setIsSavingPlan(false);
    }
  };

  const handleSaveSlaConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingSla(true);
    try {
      const res = await updateSupportDeskConfig(slaForm);
      setGlobalConfig(res.config);
      setSlaNotice('✓ SLA Escalation Thresholds successfully updated and applied across all pods.');
      setTimeout(() => setSlaNotice(null), 4000);
    } catch (err: any) {
      alert(err.message || 'Failed to save SLA settings');
    } finally {
      setIsSavingSla(false);
    }
  };

  const handleRunVoiceSimulation = async () => {
    setIsResolvingVoice(true);
    try {
      const res = await resolveInboundVoiceCall({
        caller_phone: testCallerPhone,
        dialed_number: testDialedNumber,
        extension_pin: testExtensionPin
      });
      setVoiceResolutionResult(res);
    } catch (err: any) {
      alert(err.message || 'Voice resolution failed');
    } finally {
      setIsResolvingVoice(false);
    }
  };

  const handleRunSlaEscalationScan = async () => {
    setIsScanningSla(true);
    try {
      const res = await evaluateAutomatedSlaTriggers();
      setSlaEscalations(res.escalations || []);
      setSlaNotice(`⚡ SLA Scan Complete: ${res.escalations_count} high-priority threshold triggers evaluated.`);
      setTimeout(() => setSlaNotice(null), 5000);
    } catch (err: any) {
      alert(err.message || 'SLA scan failed');
    } finally {
      setIsScanningSla(false);
    }
  };

  const handleExecuteTicketMutation = async (action: string, params: any = {}) => {
    if (!selectedTicket) return;
    setIsExecutingMutation(action);
    setMutationSuccessNotice(null);
    try {
      const res = await mutateSupportTicketBooking(selectedTicket.id, action, params);
      setMutationSuccessNotice(`✓ ${res.message || 'Action executed successfully.'}`);
      await loadAllData();
    } catch (err: any) {
      alert(err.message || 'Failed to execute booking mutation');
    } finally {
      setIsExecutingMutation(null);
    }
  };

  const handleCreateTicketSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsCreatingTicket(true);
    try {
      const created = await createSupportTicket(newTicketForm);
      setShowNewTicketModal(false);
      setNewTicketForm({
        vendor_id: 'vendor_anb_philly',
        ticket_type: 'CUSTOMER_CONCIERGE',
        customer_name: '',
        customer_phone: '',
        customer_email: '',
        booking_id: '',
        channel: 'VOICE_CALL',
        priority: 'MEDIUM',
        subject: '',
        description: '',
        flight_number: '',
        pickup_address: '',
        dropoff_address: '',
        total_amount_usd: 265.0
      });
      await loadAllData();
      setSelectedTicket(created);
    } catch (err: any) {
      alert(err.message || 'Failed to create support ticket');
    } finally {
      setIsCreatingTicket(false);
    }
  };

  const filteredTickets = tickets.filter(t => {
    const matchesSearch = 
      t.customer_name.toLowerCase().includes(ticketSearch.toLowerCase()) ||
      t.subject.toLowerCase().includes(ticketSearch.toLowerCase()) ||
      t.vendor_name.toLowerCase().includes(ticketSearch.toLowerCase()) ||
      (t.booking_id && t.booking_id.toLowerCase().includes(ticketSearch.toLowerCase())) ||
      (t.flight_number && t.flight_number.toLowerCase().includes(ticketSearch.toLowerCase()));
    
    const matchesStatus = selectedStatusFilter === 'ALL' || t.status === selectedStatusFilter;
    const matchesChannel = selectedChannelFilter === 'ALL' || t.channel === selectedChannelFilter;
    const matchesPod = selectedPodFilter === 'ALL' || t.pod_id === selectedPodFilter;

    return matchesSearch && matchesStatus && matchesChannel && matchesPod;
  });

  return (
    <div style={{ padding: '24px 32px', backgroundColor: '#F8FAFC', minHeight: '100%', color: '#0F172A', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      
      {/* 1. TOP STATS BAR & CONTROLS */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '24px' }}>
        
        {/* Banner Alert for Free Preview vs Live Stripe */}
        <div style={{
          backgroundColor: globalConfig?.is_payment_required ? '#EFF6FF' : '#F0FDF4',
          border: `1px solid ${globalConfig?.is_payment_required ? '#BFDBFE' : '#BBF7D0'}`,
          borderRadius: '10px',
          padding: '14px 20px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '12px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '32px',
              height: '32px',
              borderRadius: '8px',
              backgroundColor: globalConfig?.is_payment_required ? '#0078D4' : '#16A34A',
              color: '#FFFFFF'
            }}>
              {globalConfig?.is_payment_required ? <DollarSign size={18} /> : <Sparkles size={18} />}
            </span>
            <div>
              <div style={{ fontWeight: 800, fontSize: '13px', color: globalConfig?.is_payment_required ? '#1E40AF' : '#166534' }}>
                {globalConfig?.is_payment_required ? 'LIVE STRIPE BILLING ACTIVE' : 'FREE PREVIEW MODE ACTIVE ($0.00 COST TO VENDORS)'}
              </div>
              <div style={{ fontSize: '12px', color: '#475569', marginTop: '2px' }}>
                {globalConfig?.announcement_banner}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <button
              type="button"
              onClick={handleTogglePaymentMode}
              disabled={isTogglingPayment}
              style={{
                backgroundColor: globalConfig?.is_payment_required ? '#0078D4' : '#16A34A',
                color: '#FFFFFF',
                border: 'none',
                borderRadius: '6px',
                padding: '8px 14px',
                fontSize: '12px',
                fontWeight: 800,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
              }}
            >
              {isTogglingPayment ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <ToggleRight size={16} />}
              <span>{globalConfig?.is_payment_required ? 'Switch to Free Preview' : 'Enable Live Stripe Payments'}</span>
            </button>
          </div>
        </div>

        {/* Global Hub Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{
                width: '38px',
                height: '38px',
                borderRadius: '8px',
                backgroundColor: '#0A192F',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#C5A880'
              }}>
                <Headphones size={22} />
              </div>
              <div>
                <h1 style={{ fontSize: '22px', fontWeight: 900, color: '#0A192F', margin: 0, letterSpacing: '-0.02em' }}>
                  Global 24/7 Support Desk as a Service
                </h1>
                <div style={{ fontSize: '12.5px', color: '#64748B', marginTop: '2px' }}>
                  Dual-Layer Operations: B2C Chauffeur/Passenger Concierge + B2B Fleet Tech &amp; Escrow Mediation
                </div>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <button
              type="button"
              onClick={() => setShowNewTicketModal(true)}
              style={{
                backgroundColor: '#0A192F',
                color: '#FFFFFF',
                border: 'none',
                borderRadius: '8px',
                padding: '10px 16px',
                fontSize: '13px',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                boxShadow: '0 2px 8px rgba(10,25,47,0.2)'
              }}
            >
              <Plus size={16} color="#C5A880" />
              <span>Create Ticket</span>
            </button>

            <button
              type="button"
              onClick={loadAllData}
              disabled={loading}
              style={{
                backgroundColor: '#FFFFFF',
                border: '1px solid #CBD5E1',
                borderRadius: '8px',
                padding: '10px',
                cursor: 'pointer',
                color: '#475569'
              }}
              title="Refresh Data"
            >
              <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            </button>
          </div>
        </div>

        {/* Real-time KPI Cards Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '14px' }}>
          
          <div style={{ backgroundColor: '#FFFFFF', borderRadius: '12px', padding: '16px 20px', border: '1px solid #E2E8F0', boxShadow: '0 1px 4px rgba(0,0,0,0.02)' }}>
            <div style={{ fontSize: '11.5px', color: '#64748B', fontWeight: 600 }}>ACTIVE SUPPORT TICKETS</div>
            <div style={{ fontSize: '24px', fontWeight: 800, color: '#0A192F', marginTop: '4px' }}>
              {overview?.open_tickets || filteredTickets.length} <span style={{ fontSize: '12px', fontWeight: 600, color: '#DC2626' }}>({overview?.urgent_tickets || 2} Urgent)</span>
            </div>
            <div style={{ fontSize: '11px', color: '#16A34A', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Sparkles size={12} />
              <span>Avg response: {overview?.avg_response_time_seconds || 18}s</span>
            </div>
          </div>

          <div style={{ backgroundColor: '#FFFFFF', borderRadius: '12px', padding: '16px 20px', border: '1px solid #E2E8F0', boxShadow: '0 1px 4px rgba(0,0,0,0.02)' }}>
            <div style={{ fontSize: '11.5px', color: '#64748B', fontWeight: 600 }}>REGIONAL PODS ON DUTY</div>
            <div style={{ fontSize: '24px', fontWeight: 800, color: '#0078D4', marginTop: '4px' }}>
              {regionalPods.length} <span style={{ fontSize: '12px', fontWeight: 600, color: '#64748B' }}>Specialist Pods</span>
            </div>
            <div style={{ fontSize: '11px', color: '#16A34A', marginTop: '4px', fontWeight: 700 }}>
              ● US East, West &amp; EMEA Active
            </div>
          </div>

          <div style={{ backgroundColor: '#FFFFFF', borderRadius: '12px', padding: '16px 20px', border: '1px solid #E2E8F0', boxShadow: '0 1px 4px rgba(0,0,0,0.02)' }}>
            <div style={{ fontSize: '11.5px', color: '#64748B', fontWeight: 600 }}>INBOUND HOTLINE</div>
            <div style={{ fontSize: '20px', fontWeight: 800, color: '#0A192F', marginTop: '4px', fontFamily: 'monospace' }}>
              {globalConfig?.global_toll_free_hotline || '+1 (800) 555-LIMO'}
            </div>
            <div style={{ fontSize: '11px', color: '#9A7B4F', marginTop: '4px', fontWeight: 700 }}>
              Dedicated Local DIDs + 4-Digit PIN
            </div>
          </div>

          <div style={{ backgroundColor: '#FFFFFF', borderRadius: '12px', padding: '16px 20px', border: '1px solid #E2E8F0', boxShadow: '0 1px 4px rgba(0,0,0,0.02)' }}>
            <div style={{ fontSize: '11.5px', color: '#64748B', fontWeight: 600 }}>FIRST-CALL RESOLUTION</div>
            <div style={{ fontSize: '24px', fontWeight: 800, color: '#16A34A', marginTop: '4px' }}>
              {overview?.first_contact_resolution_rate_pct || 98.2}%
            </div>
            <div style={{ fontSize: '11px', color: '#64748B', marginTop: '4px' }}>
              1-Click Escrow &amp; Flight Reschedule
            </div>
          </div>

        </div>
      </div>

      {/* 2. SUB-TAB NAVIGATION */}
      <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid #CBD5E1', marginBottom: '24px', overflowX: 'auto' }}>
        {[
          { id: 'cockpit', label: 'Live Support Cockpit', icon: <Headphones size={16} />, badge: filteredTickets.length },
          { id: 'regional_pods', label: 'Regional Staffing Pods', icon: <Globe size={16} />, badge: `${regionalPods.length} Pods` },
          { id: 'voice_router', label: 'Hybrid Voice Router & DID Simulator', icon: <PhoneCall size={16} />, badge: '1-800 PIN' },
          { id: 'sla_matrix', label: '3-Tier Overnight SLA Matrix', icon: <Shield size={16} />, badge: 'T-25m / T-15m' },
          { id: 'pricing_manager', label: 'Pricing & Tier Manager', icon: <DollarSign size={16} />, badge: 'No-Code' },
          { id: 'subscriptions', label: 'Enrolled Fleets & DIDs', icon: <Users size={16} />, badge: subscriptions.length }
        ].map(tab => {
          const isActive = activeSubTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveSubTab(tab.id as any)}
              style={{
                padding: '12px 18px',
                background: 'none',
                border: 'none',
                borderBottom: isActive ? '3px solid #0A192F' : '3px solid transparent',
                color: isActive ? '#0A192F' : '#64748B',
                fontSize: '13px',
                fontWeight: isActive ? 800 : 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                whiteSpace: 'nowrap'
              }}
            >
              <span>{tab.icon}</span>
              <span>{tab.label}</span>
              {tab.badge !== undefined && (
                <span style={{
                  fontSize: '10.5px',
                  backgroundColor: isActive ? '#0A192F' : '#F1F5F9',
                  color: isActive ? '#FFFFFF' : '#64748B',
                  padding: '2px 7px',
                  borderRadius: '10px',
                  fontWeight: 800
                }}>
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* 3. SUB-TAB 1: LIVE SUPPORT COCKPIT */}
      {activeSubTab === 'cockpit' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.4fr', gap: '20px' }}>
          
          {/* LEFT: INCOMING TICKETS QUEUE */}
          <div style={{ backgroundColor: '#FFFFFF', borderRadius: '12px', border: '1px solid #E2E8F0', padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontSize: '15px', fontWeight: 800, color: '#0A192F', margin: 0 }}>
                Incoming Support Queue
              </h3>
              <span style={{ fontSize: '11px', color: '#16A34A', fontWeight: 700 }}>
                ● Real-Time Feed Active
              </span>
            </div>

            {/* Filter Bar */}
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <div style={{ position: 'relative', flex: 1, minWidth: '160px' }}>
                <Search size={14} color="#94A3B8" style={{ position: 'absolute', left: '10px', top: '9px' }} />
                <input
                  type="text"
                  placeholder="Search passenger, booking #, flight..."
                  value={ticketSearch}
                  onChange={e => setTicketSearch(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '7px 10px 7px 30px',
                    fontSize: '12px',
                    borderRadius: '6px',
                    border: '1px solid #CBD5E1',
                    outline: 'none'
                  }}
                />
              </div>

              <select
                value={selectedPodFilter}
                onChange={e => setSelectedPodFilter(e.target.value)}
                style={{ padding: '7px 10px', fontSize: '12px', borderRadius: '6px', border: '1px solid #CBD5E1', backgroundColor: '#FFFFFF' }}
              >
                <option value="ALL">All Pods</option>
                <option value="pod_us_east">🗽 Pod 1: US East</option>
                <option value="pod_us_west">🌴 Pod 2: US West</option>
                <option value="pod_emea">🏰 Pod 3: EMEA</option>
              </select>

              <select
                value={selectedStatusFilter}
                onChange={e => setSelectedStatusFilter(e.target.value)}
                style={{ padding: '7px 10px', fontSize: '12px', borderRadius: '6px', border: '1px solid #CBD5E1', backgroundColor: '#FFFFFF' }}
              >
                <option value="ALL">All Statuses</option>
                <option value="OPEN">Open</option>
                <option value="IN_PROGRESS">In Progress</option>
                <option value="RESOLVED">Resolved</option>
              </select>
            </div>

            {/* Tickets List */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '620px', overflowY: 'auto' }}>
              {filteredTickets.map(t => {
                const isSelected = selectedTicket?.id === t.id;
                const isUrgent = t.priority.includes('CRITICAL') || t.priority === 'HIGH';
                return (
                  <div
                    key={t.id}
                    onClick={() => setSelectedTicket(t)}
                    style={{
                      padding: '14px',
                      borderRadius: '8px',
                      border: isSelected ? '2px solid #0078D4' : '1px solid #E2E8F0',
                      backgroundColor: isSelected ? '#EFF6FF' : isUrgent ? '#FFFBEB' : '#FFFFFF',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                      boxShadow: isSelected ? '0 2px 8px rgba(0, 120, 212, 0.15)' : 'none'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                      <span style={{ fontSize: '11px', fontWeight: 800, color: '#0078D4' }}>
                        {t.vendor_name}
                      </span>
                      <span style={{
                        fontSize: '9.5px',
                        fontWeight: 800,
                        padding: '2px 6px',
                        borderRadius: '4px',
                        backgroundColor: t.status === 'RESOLVED' ? '#DCFCE7' : isUrgent ? '#FEE2E2' : '#F1F5F9',
                        color: t.status === 'RESOLVED' ? '#15803D' : isUrgent ? '#B91C1C' : '#475569'
                      }}>
                        {t.status}
                      </span>
                    </div>

                    <div style={{ fontWeight: 800, fontSize: '13px', color: '#0F172A', marginBottom: '4px' }}>
                      {t.subject}
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '11.5px', color: '#64748B' }}>
                      <span>👤 {t.customer_name}</span>
                      {t.flight_number && (
                        <span style={{ color: '#0078D4', fontWeight: 700 }}>✈️ {t.flight_number}</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* RIGHT: AGENT DETAIL & 1-CLICK ACTIONS COCKPIT */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {selectedTicket ? (
              <div style={{ backgroundColor: '#FFFFFF', borderRadius: '12px', border: '1px solid #E2E8F0', padding: '24px', display: 'flex', flexDirection: 'column', gap: '18px' }}>
                
                {/* Header with Priority Badge */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '12px', fontWeight: 800, color: '#9A7B4F', textTransform: 'uppercase' }}>
                        Ticket #{selectedTicket.id}
                      </span>
                      <span style={{
                        fontSize: '10px',
                        fontWeight: 800,
                        padding: '2px 8px',
                        borderRadius: '10px',
                        backgroundColor: selectedTicket.priority.includes('CRITICAL') ? '#FEE2E2' : '#EFF6FF',
                        color: selectedTicket.priority.includes('CRITICAL') ? '#B91C1C' : '#1D4ED8'
                      }}>
                        {selectedTicket.priority}
                      </span>
                    </div>
                    <h2 style={{ fontSize: '18px', fontWeight: 900, color: '#0A192F', margin: '4px 0 0 0' }}>
                      {selectedTicket.subject}
                    </h2>
                  </div>

                  <span style={{ fontSize: '12px', color: '#64748B', fontWeight: 600 }}>
                    Channel: <strong>{selectedTicket.channel}</strong>
                  </span>
                </div>

                {mutationSuccessNotice && (
                  <div style={{ backgroundColor: '#DCFCE7', border: '1px solid #86EFAC', borderRadius: '6px', padding: '10px 14px', fontSize: '12px', fontWeight: 700, color: '#166534' }}>
                    {mutationSuccessNotice}
                  </div>
                )}

                {/* Context Hydration Card */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div style={{ backgroundColor: '#F8FAFC', padding: '16px', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
                    <div style={{ fontSize: '11px', fontWeight: 800, color: '#64748B', textTransform: 'uppercase', marginBottom: '6px' }}>
                      Caller Identity &amp; Fleet
                    </div>
                    <div style={{ fontSize: '14px', fontWeight: 800, color: '#0F172A' }}>
                      {selectedTicket.customer_name}
                    </div>
                    <div style={{ fontSize: '12px', color: '#475569', marginTop: '2px' }}>
                      Phone: <strong>{selectedTicket.customer_phone}</strong>
                    </div>
                    <div style={{ fontSize: '12px', color: '#0078D4', fontWeight: 700, marginTop: '4px' }}>
                      🏢 Fleet: {selectedTicket.vendor_name}
                    </div>
                  </div>

                  <div style={{ backgroundColor: '#F8FAFC', padding: '16px', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
                    <div style={{ fontSize: '11px', fontWeight: 800, color: '#64748B', textTransform: 'uppercase', marginBottom: '6px' }}>
                      Associated Booking &amp; Escrow
                    </div>
                    <div style={{ fontSize: '14px', fontWeight: 800, color: '#0F172A' }}>
                      Booking #{selectedTicket.booking_id || 'DIRECT_HOTLINE'}
                    </div>
                    {selectedTicket.flight_number && (
                      <div style={{ fontSize: '12px', color: '#1E40AF', fontWeight: 700, marginTop: '2px' }}>
                        ✈️ Flight: {selectedTicket.flight_number} (Radar Synced)
                      </div>
                    )}
                    {selectedTicket.total_amount_usd && (
                      <div style={{ fontSize: '12px', color: '#16A34A', fontWeight: 800, marginTop: '2px' }}>
                        💰 Guaranteed Escrow: ${selectedTicket.total_amount_usd.toFixed(2)} USD
                      </div>
                    )}
                  </div>
                </div>

                {/* Ticket Details & Request Body */}
                <div style={{ backgroundColor: '#F8FAFC', padding: '16px', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
                  <div style={{ fontSize: '11px', fontWeight: 800, color: '#64748B', textTransform: 'uppercase', marginBottom: '6px' }}>
                    Request Notes &amp; Caller Transcript
                  </div>
                  <div style={{ fontSize: '13px', color: '#334155', lineHeight: '1.5' }}>
                    {selectedTicket.description}
                  </div>
                </div>

                {/* 1-CLICK AGENT MUTATION SUPERPOWERS */}
                <div style={{ borderTop: '1px solid #E2E8F0', paddingTop: '18px' }}>
                  <div style={{ fontSize: '12px', fontWeight: 800, color: '#0A192F', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '12px' }}>
                    ⚡ 1-Click Concierge Mutations (Instant Telemetry &amp; Escrow Actions)
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '10px' }}>
                    
                    {/* Mutation 1: Reschedule Pickup */}
                    <button
                      type="button"
                      disabled={isExecutingMutation !== null}
                      onClick={() => handleExecuteTicketMutation('RESCHEDULE_PICKUP', { new_pickup_time_utc: new Date(Date.now() + 3600000).toISOString() })}
                      style={{
                        padding: '12px 14px',
                        backgroundColor: '#EFF6FF',
                        border: '1px solid #BFDBFE',
                        borderRadius: '8px',
                        color: '#1E40AF',
                        fontSize: '12px',
                        fontWeight: 800,
                        cursor: 'pointer',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '4px',
                        textAlign: 'left'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Clock size={15} />
                        <span>Push Pickup +1 Hour</span>
                      </div>
                      <div style={{ fontSize: '10.5px', color: '#3B82F6', fontWeight: 600 }}>
                        Recalibrates chauffeur staging
                      </div>
                    </button>

                    {/* Mutation 2: Masked Driver SMS */}
                    <button
                      type="button"
                      disabled={isExecutingMutation !== null}
                      onClick={() => handleExecuteTicketMutation('SEND_MASKED_DRIVER_SMS', { message: 'Passenger is at baggage carousel 4. Staging confirmed.' })}
                      style={{
                        padding: '12px 14px',
                        backgroundColor: '#FAF5FF',
                        border: '1px solid #E9D5FF',
                        borderRadius: '8px',
                        color: '#6B21A8',
                        fontSize: '12px',
                        fontWeight: 800,
                        cursor: 'pointer',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '4px',
                        textAlign: 'left'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <MessageSquare size={15} />
                        <span>Send Driver SMS Bridge</span>
                      </div>
                      <div style={{ fontSize: '10.5px', color: '#8B5CF6', fontWeight: 600 }}>
                        Masked privacy telephony
                      </div>
                    </button>

                    {/* Mutation 3: Cancel & Release Pre-Auth Escrow */}
                    <button
                      type="button"
                      disabled={isExecutingMutation !== null}
                      onClick={() => {
                        if (confirm(`Execute 100% Pre-Authorization Hold cancellation and release escrow back to customer card for #${selectedTicket.booking_id || selectedTicket.id}?`)) {
                          handleExecuteTicketMutation('CANCEL_AND_RELEASE_ESCROW', { reason: 'Customer requested cancellation via Support Desk.' });
                        }
                      }}
                      style={{
                        padding: '12px 14px',
                        backgroundColor: '#FEF2F2',
                        border: '1px solid #FECACA',
                        borderRadius: '8px',
                        color: '#991B1B',
                        fontSize: '12px',
                        fontWeight: 800,
                        cursor: 'pointer',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '4px',
                        textAlign: 'left'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <DollarSign size={15} />
                        <span>Cancel &amp; Release Escrow</span>
                      </div>
                      <div style={{ fontSize: '10.5px', color: '#EF4444', fontWeight: 600 }}>
                        100% card hold returned
                      </div>
                    </button>

                  </div>
                </div>

              </div>
            ) : (
              <div style={{ backgroundColor: '#FFFFFF', borderRadius: '12px', border: '1px solid #E2E8F0', padding: '48px', textAlign: 'center', color: '#64748B' }}>
                <Headphones size={36} color="#CBD5E1" style={{ margin: '0 auto 12px auto' }} />
                <div style={{ fontWeight: 800, color: '#334155', fontSize: '14px' }}>No Support Ticket Selected</div>
                <div style={{ fontSize: '12px', marginTop: '4px' }}>Click any ticket on the left queue to open context hydration and 1-click mutation actions.</div>
              </div>
            )}
          </div>

        </div>
      )}

      {/* 4. SUB-TAB 2: REGIONAL STAFFING PODS */}
      {activeSubTab === 'regional_pods' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          <div style={{ backgroundColor: '#FFFFFF', borderRadius: '12px', border: '1px solid #E2E8F0', padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div>
                <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#0A192F', margin: 0 }}>
                  Geographical Staffing Pods &amp; Airport Familiarity Matrix
                </h3>
                <p style={{ fontSize: '12.5px', color: '#64748B', margin: '4px 0 0 0' }}>
                  Support specialists clustered by region to ensure localized airport procedures (FBO gates, cell phone lots, meet &amp; greet protocols) and multilingual fluency.
                </p>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '18px' }}>
              {regionalPods.map(pod => (
                <div
                  key={pod.id}
                  style={{
                    backgroundColor: '#F8FAFC',
                    borderRadius: '10px',
                    border: '1px solid #E2E8F0',
                    padding: '20px',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between'
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '11px', fontWeight: 800, color: '#0078D4', textTransform: 'uppercase' }}>
                        {pod.code}
                      </span>
                      <span style={{ fontSize: '10px', fontWeight: 800, backgroundColor: '#DCFCE7', color: '#166534', padding: '2px 8px', borderRadius: '10px' }}>
                        ● {pod.radar_feed_status}
                      </span>
                    </div>

                    <div style={{ fontSize: '16px', fontWeight: 800, color: '#0F172A', marginTop: '6px' }}>
                      {pod.name}
                    </div>

                    <div style={{ fontSize: '12px', color: '#475569', marginTop: '6px', lineHeight: '1.4' }}>
                      {pod.territory_description}
                    </div>

                    {/* Airport Chips */}
                    <div style={{ marginTop: '12px' }}>
                      <div style={{ fontSize: '10.5px', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', marginBottom: '4px' }}>
                        Specialized Airports
                      </div>
                      <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                        {pod.covered_airports.map(apt => (
                          <span key={apt} style={{ fontSize: '10px', fontWeight: 800, backgroundColor: '#EFF6FF', border: '1px solid #BFDBFE', color: '#1E40AF', padding: '2px 6px', borderRadius: '4px' }}>
                            ✈️ {apt}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Languages */}
                    <div style={{ marginTop: '10px' }}>
                      <div style={{ fontSize: '10.5px', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', marginBottom: '4px' }}>
                        Languages Supported
                      </div>
                      <div style={{ fontSize: '11.5px', color: '#334155', fontWeight: 600 }}>
                        {pod.languages.join(' • ')}
                      </div>
                    </div>
                  </div>

                  {/* Pod Footer Stats */}
                  <div style={{ marginTop: '18px', paddingTop: '14px', borderTop: '1px solid #E2E8F0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '11.5px' }}>
                    <div>
                      <span style={{ color: '#64748B' }}>Supervisor:</span> <strong>{pod.supervisor_name}</strong>
                    </div>
                    <div style={{ color: '#16A34A', fontWeight: 800 }}>
                      ⚡ {pod.active_agents_count} Agents ({pod.avg_pickup_sla_seconds}s SLA)
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>
      )}

      {/* 5. SUB-TAB 3: HYBRID VOICE ROUTER & INTERACTIVE DID SIMULATOR */}
      {activeSubTab === 'voice_router' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
          
          {/* Left: Interactive Telephony Resolver Simulator */}
          <div style={{ backgroundColor: '#FFFFFF', borderRadius: '12px', border: '1px solid #E2E8F0', padding: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
              <PhoneCall size={20} color="#0078D4" />
              <div>
                <h3 style={{ fontSize: '16px', fontWeight: 800, color: '#0A192F', margin: 0 }}>
                  Hybrid Inbound Telephony Simulator
                </h3>
                <div style={{ fontSize: '12px', color: '#64748B' }}>
                  Test incoming calls via Dedicated Local DIDs vs. Central 1-800 PIN Extension
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>
                  Caller Incoming Phone Number
                </label>
                <input
                  type="text"
                  value={testCallerPhone}
                  onChange={e => setTestCallerPhone(e.target.value)}
                  style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '13px' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>
                  Dialed Inbound Number (Local DID or 1-800 Central)
                </label>
                <select
                  value={testDialedNumber}
                  onChange={e => setTestDialedNumber(e.target.value)}
                  style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '13px' }}
                >
                  <option value="+1 (800) 555-LIMO">Global Central Toll-Free: +1 (800) 555-LIMO</option>
                  <option value="+1 (215) 555-0144">Philadelphia Dedicated DID: +1 (215) 555-0144</option>
                  <option value="+1 (212) 555-0199">New York Dedicated DID: +1 (212) 555-0199</option>
                  <option value="+33 1 40 55 01 99">Paris Dedicated DID: +33 1 40 55 01 99</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>
                  4-Digit Vendor Extension PIN (For 1-800 Central routing)
                </label>
                <input
                  type="text"
                  placeholder="e.g. 1044 for ANB Philly, 1099 for NY Exec"
                  value={testExtensionPin}
                  onChange={e => setTestExtensionPin(e.target.value)}
                  style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '13px', fontFamily: 'monospace' }}
                />
              </div>

              <button
                type="button"
                onClick={handleRunVoiceSimulation}
                disabled={isResolvingVoice}
                style={{
                  padding: '10px 18px',
                  backgroundColor: '#0078D4',
                  color: '#FFFFFF',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '13px',
                  fontWeight: 800,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px'
                }}
              >
                {isResolvingVoice ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> : <PhoneCall size={16} />}
                <span>Simulate Inbound Call &amp; Pop Context</span>
              </button>
            </div>
          </div>

          {/* Right: Live Resolution Cockpit Result */}
          <div style={{ backgroundColor: '#FFFFFF', borderRadius: '12px', border: '1px solid #E2E8F0', padding: '24px' }}>
            <div style={{ fontSize: '13px', fontWeight: 800, color: '#0A192F', marginBottom: '14px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              🎯 Live Telephony Resolution &amp; Chauffeur Context
            </div>

            {voiceResolutionResult ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ padding: '14px', backgroundColor: '#EFF6FF', borderRadius: '8px', border: '1px solid #BFDBFE' }}>
                  <div style={{ fontSize: '11px', fontWeight: 700, color: '#1E40AF' }}>RESOLVED ROUTING STRATEGY</div>
                  <div style={{ fontSize: '16px', fontWeight: 900, color: '#1D4ED8', marginTop: '2px' }}>
                    {voiceResolutionResult.routing_strategy}
                  </div>
                  <div style={{ fontSize: '12px', color: '#1E40AF', marginTop: '2px' }}>
                    Matched Fleet: <strong>{voiceResolutionResult.matched_vendor_name}</strong> ({voiceResolutionResult.matched_vendor_id})
                  </div>
                </div>

                <div style={{ padding: '14px', backgroundColor: '#F8FAFC', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
                  <div style={{ fontSize: '11px', fontWeight: 700, color: '#64748B' }}>ASSIGNED REGIONAL POD</div>
                  <div style={{ fontSize: '14px', fontWeight: 800, color: '#0F172A', marginTop: '2px' }}>
                    {voiceResolutionResult.matched_pod_name}
                  </div>
                </div>

                <div style={{ padding: '14px', backgroundColor: '#F8FAFC', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
                  <div style={{ fontSize: '11px', fontWeight: 700, color: '#64748B' }}>AUTOMATED BRAND VOICE GREETING</div>
                  <div style={{ fontSize: '12px', color: '#334155', fontStyle: 'italic', marginTop: '4px' }}>
                    "{voiceResolutionResult.voice_greeting_script}"
                  </div>
                </div>

                <div style={{ padding: '14px', backgroundColor: '#F0FDF4', borderRadius: '8px', border: '1px solid #BBF7D0' }}>
                  <div style={{ fontSize: '11px', fontWeight: 700, color: '#166534' }}>HYDRATED PASSENGER &amp; CHAUFFEUR RADAR</div>
                  <div style={{ fontSize: '13px', color: '#15803D', fontWeight: 800, marginTop: '2px' }}>
                    Passenger: {voiceResolutionResult.passenger_name} • Booking #{voiceResolutionResult.active_booking_id || 'DIRECT_HOTLINE'}
                  </div>
                  <div style={{ fontSize: '12px', color: '#166534', marginTop: '2px' }}>
                    Chauffeur: <strong>{voiceResolutionResult.assigned_chauffeur}</strong> ({voiceResolutionResult.assigned_chauffeur_phone})
                  </div>
                </div>
              </div>
            ) : (
              <div style={{ padding: '40px', textAlign: 'center', color: '#64748B', backgroundColor: '#F8FAFC', borderRadius: '8px', border: '1px dashed #CBD5E1' }}>
                <Phone size={32} color="#94A3B8" style={{ margin: '0 auto 8px auto' }} />
                <div style={{ fontWeight: 700, fontSize: '13px' }}>No Call Simulation Run Yet</div>
                <div style={{ fontSize: '11.5px', marginTop: '4px' }}>Run the simulator to view real-time PBX resolution, custom voice greeting, and driver context pop.</div>
              </div>
            )}
          </div>

        </div>
      )}

      {/* 6. SUB-TAB 4: 3-TIER OVERNIGHT SLA MATRIX */}
      {activeSubTab === 'sla_matrix' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '20px' }}>
          
          {/* Left: 3-Tier Escalation Thresholds & Scanner */}
          <div style={{ backgroundColor: '#FFFFFF', borderRadius: '12px', border: '1px solid #E2E8F0', padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div>
                <h3 style={{ fontSize: '16px', fontWeight: 800, color: '#0A192F', margin: 0 }}>
                  3-Tier Overnight Escalation Rules
                </h3>
                <div style={{ fontSize: '12px', color: '#64748B' }}>
                  Configurable threshold parameters that trigger autonomous driver recovery and fleet owner mobile alerts.
                </div>
              </div>

              <button
                type="button"
                onClick={handleRunSlaEscalationScan}
                disabled={isScanningSla}
                style={{
                  padding: '8px 14px',
                  backgroundColor: '#DC2626',
                  color: '#FFFFFF',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '12px',
                  fontWeight: 800,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                {isScanningSla ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <AlertTriangle size={14} />}
                <span>Scan Escalation Triggers</span>
              </button>
            </div>

            {slaNotice && (
              <div style={{ backgroundColor: '#DCFCE7', border: '1px solid #86EFAC', borderRadius: '6px', padding: '10px 14px', fontSize: '12px', fontWeight: 700, color: '#166534', marginBottom: '14px' }}>
                {slaNotice}
              </div>
            )}

            <form onSubmit={handleSaveSlaConfig} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              
              <div style={{ backgroundColor: '#F8FAFC', padding: '14px', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
                <div style={{ fontWeight: 800, fontSize: '13px', color: '#0F172A' }}>
                  1. Critical: Chauffeur Inactivity Warning (T-Minus)
                </div>
                <div style={{ fontSize: '11.5px', color: '#64748B', marginTop: '2px' }}>
                  Triggers high-priority SMS and push notification to the fleet owner if driver is stationary or unconfirmed.
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '8px' }}>
                  <input
                    type="number"
                    value={slaForm.driver_unconfirmed_warning_minutes}
                    onChange={e => setSlaForm({ ...slaForm, driver_unconfirmed_warning_minutes: parseInt(e.target.value) || 25 })}
                    style={{ width: '80px', padding: '6px 10px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '13px', fontWeight: 800 }}
                  />
                  <span style={{ fontSize: '12.5px', color: '#475569', fontWeight: 600 }}>Minutes Prior to Pickup (Default: T-25m)</span>
                </div>
              </div>

              <div style={{ backgroundColor: '#F8FAFC', padding: '14px', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
                <div style={{ fontWeight: 800, fontSize: '13px', color: '#0F172A' }}>
                  2. Critical: Autonomous Affiliate Rescue Reassignment
                </div>
                <div style={{ fontSize: '11.5px', color: '#64748B', marginTop: '2px' }}>
                  Auto-dispatches ride recovery to certified 5-star affiliate partner within 15km if unresolved.
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '8px' }}>
                  <input
                    type="number"
                    value={slaForm.driver_emergency_recovery_minutes}
                    onChange={e => setSlaForm({ ...slaForm, driver_emergency_recovery_minutes: parseInt(e.target.value) || 15 })}
                    style={{ width: '80px', padding: '6px 10px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '13px', fontWeight: 800 }}
                  />
                  <span style={{ fontSize: '12.5px', color: '#475569', fontWeight: 600 }}>Minutes Prior to Pickup (Default: T-15m)</span>
                </div>
              </div>

              <div style={{ backgroundColor: '#F8FAFC', padding: '14px', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
                <div style={{ fontWeight: 800, fontSize: '13px', color: '#0F172A' }}>
                  3. Flight Diversion &amp; Severe Delay Recalibration
                </div>
                <div style={{ fontSize: '11.5px', color: '#64748B', marginTop: '2px' }}>
                  Auto-recalibrates chauffeur staging time without waking fleet owner when flight delay exceeds threshold.
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '8px' }}>
                  <input
                    type="number"
                    value={slaForm.flight_delay_recalibration_threshold_minutes}
                    onChange={e => setSlaForm({ ...slaForm, flight_delay_recalibration_threshold_minutes: parseInt(e.target.value) || 90 })}
                    style={{ width: '80px', padding: '6px 10px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '13px', fontWeight: 800 }}
                  />
                  <span style={{ fontSize: '12.5px', color: '#475569', fontWeight: 600 }}>Minutes Delay Threshold (Default: 90m)</span>
                </div>
              </div>

              <button
                type="submit"
                disabled={isSavingSla}
                style={{
                  padding: '10px 18px',
                  backgroundColor: '#0A192F',
                  color: '#FFFFFF',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '12.5px',
                  fontWeight: 800,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px'
                }}
              >
                {isSavingSla ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <Save size={14} color="#C5A880" />}
                <span>Save SLA Thresholds</span>
              </button>
            </form>
          </div>

          {/* Right: Live Escalation Events Feed */}
          <div style={{ backgroundColor: '#FFFFFF', borderRadius: '12px', border: '1px solid #E2E8F0', padding: '24px' }}>
            <div style={{ fontSize: '13px', fontWeight: 800, color: '#0A192F', marginBottom: '14px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              📡 Live SLA Escalation Triggers
            </div>

            {slaEscalations.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {slaEscalations.map((esc, idx) => (
                  <div key={idx} style={{ padding: '14px', backgroundColor: '#FEF2F2', borderRadius: '8px', border: '1px solid #FECACA' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '11px', fontWeight: 800, color: '#991B1B' }}>
                        ⚠️ {esc.severity}
                      </span>
                      <span style={{ fontSize: '10px', color: '#64748B' }}>
                        {new Date(esc.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                    <div style={{ fontSize: '12.5px', color: '#7F1D1D', fontWeight: 700, marginTop: '4px' }}>
                      {esc.message}
                    </div>
                    <div style={{ fontSize: '11px', color: '#991B1B', marginTop: '4px' }}>
                      Action: <strong>{esc.action_executed}</strong>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ padding: '40px', textAlign: 'center', color: '#64748B', backgroundColor: '#F8FAFC', borderRadius: '8px', border: '1px dashed #CBD5E1' }}>
                <CheckCircle2 size={32} color="#16A34A" style={{ margin: '0 auto 8px auto' }} />
                <div style={{ fontWeight: 700, fontSize: '13px', color: '#166534' }}>All Chauffeurs On Schedule</div>
                <div style={{ fontSize: '11.5px', marginTop: '4px' }}>No active SLA violations or T-25m driver inactivity alerts detected across the fleet.</div>
              </div>
            )}
          </div>

        </div>
      )}

      {/* 7. SUB-TAB 5: PRICING & TIER MANAGER */}
      {activeSubTab === 'pricing_manager' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          <div style={{ backgroundColor: '#FFFFFF', borderRadius: '12px', border: '1px solid #E2E8F0', padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div>
                <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#0A192F', margin: 0 }}>
                  No-Code Dynamic Support Desk Tier Pricing
                </h3>
                <p style={{ fontSize: '12.5px', color: '#64748B', margin: '4px 0 0 0' }}>
                  Adjust plan pricing (e.g. $99, $199, $299, $499) and included minutes in real-time. Changes immediately update all vendor dashboards without code rebuilds.
                </p>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '16px' }}>
              {plans.map(plan => (
                <div
                  key={plan.id}
                  style={{
                    backgroundColor: '#FFFFFF',
                    borderRadius: '10px',
                    border: '1px solid #CBD5E1',
                    padding: '20px',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    boxShadow: '0 2px 6px rgba(0,0,0,0.03)'
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '11px', fontWeight: 800, color: '#0078D4', textTransform: 'uppercase' }}>
                        {plan.tier_code}
                      </span>
                      {plan.highlight_badge && (
                        <span style={{ fontSize: '10px', fontWeight: 800, backgroundColor: '#EFF6FF', color: '#0078D4', padding: '2px 6px', borderRadius: '4px', border: '1px solid #BFDBFE' }}>
                          {plan.highlight_badge}
                        </span>
                      )}
                    </div>

                    <div style={{ fontSize: '16px', fontWeight: 800, color: '#0F172A', marginTop: '6px' }}>
                      {plan.name}
                    </div>

                    <div style={{ fontSize: '12px', color: '#64748B', marginTop: '4px', minHeight: '36px' }}>
                      {plan.description}
                    </div>

                    <div style={{ marginTop: '14px', display: 'flex', alignItems: 'baseline', gap: '4px' }}>
                      <span style={{ fontSize: '28px', fontWeight: 900, color: '#0A192F' }}>
                        ${plan.monthly_price_usd}
                      </span>
                      <span style={{ fontSize: '12px', color: '#64748B' }}>/ month</span>
                    </div>

                    <div style={{ fontSize: '11.5px', color: '#16A34A', fontWeight: 700, marginTop: '2px' }}>
                      Included: {plan.included_voice_minutes} voice minutes (${plan.per_minute_overage_usd}/min overage)
                    </div>

                    <div style={{ marginTop: '14px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      {plan.features.map((f, fIdx) => (
                        <div key={fIdx} style={{ fontSize: '11.5px', color: '#475569', display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <Check size={12} color="#16A34A" />
                          <span>{f}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleOpenPlanEdit(plan)}
                    style={{
                      marginTop: '20px',
                      padding: '9px',
                      backgroundColor: '#0A192F',
                      color: '#FFFFFF',
                      border: 'none',
                      borderRadius: '6px',
                      fontSize: '12.5px',
                      fontWeight: 800,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px'
                    }}
                  >
                    <Edit3 size={14} />
                    <span>Edit Pricing &amp; Minutes</span>
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 8. SUB-TAB 6: ENROLLED FLEETS & SUBSCRIPTIONS */}
      {activeSubTab === 'subscriptions' && (
        <div style={{ backgroundColor: '#FFFFFF', borderRadius: '12px', border: '1px solid #E2E8F0', padding: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <div>
              <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#0A192F', margin: 0 }}>
                Enrolled Vendor Fleets &amp; Dedicated DIDs
              </h3>
              <p style={{ fontSize: '12.5px', color: '#64748B', margin: '4px 0 0 0' }}>
                All sovereign vendors currently routed through the Global Support Desk.
              </p>
            </div>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
              <thead>
                <tr style={{ backgroundColor: '#F8FAFC', borderBottom: '1px solid #CBD5E1', textAlign: 'left' }}>
                  <th style={{ padding: '12px 14px', color: '#475569', fontWeight: 700 }}>VENDOR FLEET</th>
                  <th style={{ padding: '12px 14px', color: '#475569', fontWeight: 700 }}>ACTIVE PLAN</th>
                  <th style={{ padding: '12px 14px', color: '#475569', fontWeight: 700 }}>FORWARDING DID</th>
                  <th style={{ padding: '12px 14px', color: '#475569', fontWeight: 700 }}>4-DIGIT PIN</th>
                  <th style={{ padding: '12px 14px', color: '#475569', fontWeight: 700 }}>VOICE USAGE</th>
                  <th style={{ padding: '12px 14px', color: '#475569', fontWeight: 700 }}>STATUS</th>
                </tr>
              </thead>
              <tbody>
                {subscriptions.map(s => (
                  <tr key={s.id} style={{ borderBottom: '1px solid #F1F5F9' }}>
                    <td style={{ padding: '12px 14px' }}>
                      <div style={{ fontWeight: 800, color: '#0F172A' }}>{s.vendor_name}</div>
                      <div style={{ fontSize: '11px', color: '#94A3B8', fontFamily: 'monospace' }}>{s.vendor_id}</div>
                    </td>
                    <td style={{ padding: '12px 14px' }}>
                      <span style={{ fontWeight: 700, color: '#0078D4' }}>{s.plan_name}</span>
                      <div style={{ fontSize: '11px', color: '#64748B' }}>${s.monthly_price_usd.toFixed(0)}/mo</div>
                    </td>
                    <td style={{ padding: '12px 14px', fontFamily: 'monospace', fontSize: '12px', color: '#0F172A' }}>
                      {s.forwarding_did || '+1 (215) 555-0144'}
                    </td>
                    <td style={{ padding: '12px 14px', fontFamily: 'monospace', fontSize: '12px', color: '#0078D4', fontWeight: 800 }}>
                      PIN: {s.vendor_extension_pin || '1044'}
                    </td>
                    <td style={{ padding: '12px 14px' }}>
                      <div style={{ fontSize: '12px', fontWeight: 700, color: '#0F172A' }}>
                        {s.used_voice_minutes} / {s.included_voice_minutes} mins
                      </div>
                      <div style={{ fontSize: '11px', color: '#16A34A' }}>{s.total_tickets_handled} tickets handled</div>
                    </td>
                    <td style={{ padding: '12px 14px' }}>
                      <span style={{ backgroundColor: '#DCFCE7', color: '#166534', fontSize: '11px', fontWeight: 800, padding: '2px 8px', borderRadius: '4px' }}>
                        {s.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* EDIT PLAN MODAL */}
      {editingPlan && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(10, 25, 47, 0.75)',
            zIndex: 10000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px'
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setEditingPlan(null);
          }}
        >
          <div style={{
            backgroundColor: '#FFFFFF',
            borderRadius: '16px',
            maxWidth: '520px',
            width: '100%',
            padding: '28px',
            boxShadow: '0 20px 40px rgba(0,0,0,0.3)',
            border: '1px solid #E2E8F0'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
              <div>
                <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#0A192F', margin: 0 }}>
                  Edit Plan: {editingPlan.name}
                </h3>
                <div style={{ fontSize: '12px', color: '#64748B' }}>
                  Update live price and minute allowances without code deployments
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditingPlan(null)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748B' }}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSavePlanPrice} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>
                  Monthly Subscription Price ($ USD) *
                </label>
                <input
                  type="number"
                  step="1"
                  required
                  value={planForm.monthly_price_usd}
                  onChange={e => setPlanForm({ ...planForm, monthly_price_usd: parseFloat(e.target.value) || 0 })}
                  style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '14px', fontWeight: 800, color: '#0A192F' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>
                  Included Inbound/Outbound Voice Minutes *
                </label>
                <input
                  type="number"
                  required
                  value={planForm.included_voice_minutes}
                  onChange={e => setPlanForm({ ...planForm, included_voice_minutes: parseInt(e.target.value) || 0 })}
                  style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '13px' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>
                  Highlight Badge Text (e.g. "Most Popular")
                </label>
                <input
                  type="text"
                  value={planForm.highlight_badge}
                  onChange={e => setPlanForm({ ...planForm, highlight_badge: e.target.value })}
                  style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '13px' }}
                />
              </div>

              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '12px' }}>
                <button
                  type="button"
                  onClick={() => setEditingPlan(null)}
                  style={{ padding: '10px 16px', backgroundColor: '#FFFFFF', border: '1px solid #CBD5E1', borderRadius: '6px', fontSize: '12.5px', fontWeight: 700, cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingPlan}
                  style={{ padding: '10px 20px', backgroundColor: '#0A192F', color: '#FFFFFF', border: 'none', borderRadius: '6px', fontSize: '12.5px', fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
                >
                  {isSavingPlan ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <Save size={14} color="#C5A880" />}
                  <span>Save Plan Pricing</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CREATE TICKET MODAL */}
      {showNewTicketModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(10, 25, 47, 0.75)',
            zIndex: 10000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px'
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowNewTicketModal(false);
          }}
        >
          <div style={{
            backgroundColor: '#FFFFFF',
            borderRadius: '16px',
            maxWidth: '560px',
            width: '100%',
            padding: '28px',
            boxShadow: '0 20px 40px rgba(0,0,0,0.3)',
            border: '1px solid #E2E8F0'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
              <div>
                <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#0A192F', margin: 0 }}>
                  Create Support Ticket
                </h3>
                <div style={{ fontSize: '12px', color: '#64748B' }}>
                  Log a passenger concierge request or vendor technical issue
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowNewTicketModal(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748B' }}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateTicketSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#475569', marginBottom: '3px' }}>
                  Performing Vendor *
                </label>
                <select
                  value={newTicketForm.vendor_id}
                  onChange={e => setNewTicketForm({ ...newTicketForm, vendor_id: e.target.value })}
                  style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '13px' }}
                >
                  <option value="vendor_anb_philly">ANB Limo Executive Chauffeur (Philadelphia)</option>
                  <option value="vendor_new_york_exec">New York Executive Fleet (New York)</option>
                  <option value="vendor_paris_etoile">Chauffeurs de l'Étoile (Paris)</option>
                  <option value="vendor_london_mayfair">Mayfair Diplomatic Chauffeur (London)</option>
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#475569', marginBottom: '3px' }}>
                    Customer / Caller Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Jonathan Vance"
                    value={newTicketForm.customer_name}
                    onChange={e => setNewTicketForm({ ...newTicketForm, customer_name: e.target.value })}
                    style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '13px' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#475569', marginBottom: '3px' }}>
                    Customer Phone *
                  </label>
                  <input
                    type="tel"
                    required
                    placeholder="e.g. +1 (215) 555-0199"
                    value={newTicketForm.customer_phone}
                    onChange={e => setNewTicketForm({ ...newTicketForm, customer_phone: e.target.value })}
                    style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '13px' }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#475569', marginBottom: '3px' }}>
                  Subject *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Flight DL 1842 delayed 45m · Push Chauffeur Staging"
                  value={newTicketForm.subject}
                  onChange={e => setNewTicketForm({ ...newTicketForm, subject: e.target.value })}
                  style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '13px' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#475569', marginBottom: '3px' }}>
                  Description &amp; Request Details *
                </label>
                <textarea
                  required
                  rows={3}
                  placeholder="Enter detailed caller request or operational notes..."
                  value={newTicketForm.description}
                  onChange={e => setNewTicketForm({ ...newTicketForm, description: e.target.value })}
                  style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '13px' }}
                />
              </div>

              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '10px' }}>
                <button
                  type="button"
                  onClick={() => setShowNewTicketModal(false)}
                  style={{ padding: '9px 16px', backgroundColor: '#FFFFFF', border: '1px solid #CBD5E1', borderRadius: '6px', fontSize: '12.5px', fontWeight: 700, cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isCreatingTicket}
                  style={{ padding: '9px 18px', backgroundColor: '#0A192F', color: '#FFFFFF', border: 'none', borderRadius: '6px', fontSize: '12.5px', fontWeight: 800, cursor: 'pointer' }}
                >
                  {isCreatingTicket ? 'Logging Ticket...' : 'Create Ticket'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
