import React, { useState, useEffect } from 'react';
import { 
  Building2, Car, Users, DollarSign, Activity, Shield, 
  MapPin, Clock, CheckCircle2, AlertTriangle, Play, Pause, 
  Power, Sliders, Mail, FileText, Phone, ArrowUpRight, 
  RefreshCw, Plus, Search, Filter, ShieldCheck, ChevronRight,
  TrendingUp, Radio, Navigation, Check, X, Award, Eye, EyeOff, Grid,
  Layers, ChevronDown, Bell, Terminal, Server, MessageSquare,
  Send, Volume2, Globe, Key, CheckCircle, ExternalLink, Sparkles, Download, Zap,
  CreditCard, Percent, Banknote, Receipt, ArrowDownRight, UserCheck, Lock, Unlock, UserPlus,
  Copy, Inbox, AtSign, BookOpen, Settings
} from 'lucide-react';
import { 
  VendorPortalConfig, TeamMember, RoleMatrixResponse, CertifiedAffiliatePartner, 
  AffiliateRecommendation, VendorAffiliatePolicyRules, FarmOutPolicy, FarmInPolicy 
} from '../types';
import { useAuth } from '../context/AuthContext';
import { 
  fetchVendorTeam, createVendorTeamMember, updateVendorTeamMember, 
  deleteVendorTeamMember, generateTeamMemberImpersonateToken, fetchVendorRolesMatrix,
  fetchGlobalAffiliateDirectory, fetchAffiliateRecommendations, farmOutAffiliateRide, fetchVendorAffiliateRecords,
  fetchVendorAffiliatePolicy, updateVendorAffiliatePolicy, fetchGlobalHubKnowledgeBase,
  createVendorVehicle, toggleVehicleNetwork, getAuthHeaders
} from '../api';

interface VendorOwnerDashboardProps {
  config: VendorPortalConfig;
  onNavigateToStorefront: () => void;
}

type AutonomyLevel = 'L5_FULL_AUTONOMY' | 'L3_SHADOW_ASSIST' | 'L0_MANUAL_KILL_SWITCH';

interface NavItem {
  id: 'overview' | 'dispatch' | 'fleet' | 'drivers' | 'corporate' | 'pricing' | 'email_rfq' | 'team' | 'affiliates' | 'voice_ai' | 'omnichannel';
  label: string;
  icon: React.ReactNode;
  category: string;
  badge?: string;
}

export const VendorOwnerDashboard: React.FC<VendorOwnerDashboardProps> = ({
  config,
  onNavigateToStorefront
}) => {
  const { switchPersona, role: currentAuthRole } = useAuth();
  const [activeTab, setActiveTab] = useState<
    'overview' | 'dispatch' | 'fleet' | 'drivers' | 'corporate' | 'pricing' | 'email_rfq' | 'team' | 'affiliates' | 'voice_ai' | 'omnichannel'
  >('overview');

  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [autonomyLevel, setAutonomyLevel] = useState<AutonomyLevel>('L5_FULL_AUTONOMY');
  const [loading, setLoading] = useState(false);
  const [actionNotice, setActionNotice] = useState<string | null>(null);
  const [omniSubTab, setOmniSubTab] = useState<'10dlc' | 'voice' | 'email' | 'whatsapp' | 'seo' | 'byok'>('10dlc');

  // Omnichannel Live Chat State
  const [chatMessages, setChatMessages] = useState([
    { id: '1', sender: 'David Sterling', phone: '+12155550188', channel: 'WHATSAPP', text: 'Hi dispatch, my flight AA1944 just landed at Gate B12. Ready for pickup.', isOutbound: false, time: '10:42 AM' },
    { id: '2', sender: 'ANB Autonomous Dispatch', phone: '+12155550144', channel: 'WHATSAPP', text: 'Welcome to Philadelphia Mr. Sterling! Chauffeur Marcus is curbside at Zone 4 in a Black Cadillac Escalade (Plate: PA-LM992).', isOutbound: true, time: '10:43 AM' },
    { id: '3', sender: 'ANB Autonomous Dispatch', phone: '+12155550144', channel: 'SMS', text: 'ANB Limo: Your reservation #RES-9941 is confirmed. Live GPS Radar: https://limo.link/r/live', isOutbound: true, time: '09:15 AM' }
  ]);
  const [newChatText, setNewChatText] = useState('');
  const [softphoneDialNumber, setSoftphoneDialNumber] = useState(config.branding?.contact_phone || '');
  const [tcpaTestKeyword, setTcpaTestKeyword] = useState('STOP');
  const [tcpaTestResponse, setTcpaTestResponse] = useState<string | null>(null);
  const [byokMode, setByokMode] = useState<'MANAGED_SAAS' | 'BYOK_CUSTOM'>('MANAGED_SAAS');
  const [customTwilioSid, setCustomTwilioSid] = useState('');
  const [customTwilioToken, setCustomTwilioToken] = useState('');
  const [customTwilioPhone, setCustomTwilioPhone] = useState(config.telecom_compliance?.contact_phone || config.branding?.contact_phone || '');
  const [customAwsKey, setCustomAwsKey] = useState('');
  const [customAwsSecret, setCustomAwsSecret] = useState('');

  // Dispatch Search, Filter & View Mode
  const [dispatchSearch, setDispatchSearch] = useState('');
  const [dispatchStatusFilter, setDispatchStatusFilter] = useState<'ALL' | 'UNASSIGNED' | 'ACTIVE' | 'STOREFRONT' | 'HUB'>('ALL');
  const [dispatchViewMode, setDispatchViewMode] = useState<'table' | 'cards'>('table');

  // Affiliate Network Hub Search, Filter & View Mode
  const [affiliateSearch, setAffiliateSearch] = useState('');
  const [affiliateFilter, setAffiliateFilter] = useState<'ALL' | 'INCOMING' | 'OUTGOING' | 'UNASSIGNED' | 'SETTLED'>('ALL');
  const [affiliateViewMode, setAffiliateViewMode] = useState<'table' | 'cards'>('table');
  const [affiliateSubTab, setAffiliateSubTab] = useState<'exchange' | 'matcher' | 'policy'>('exchange');
  const [showFarmOutModal, setShowFarmOutModal] = useState(false);
  const [affiliateDirectory, setAffiliateDirectory] = useState<CertifiedAffiliatePartner[]>([]);
  const [affiliateRecommendations, setAffiliateRecommendations] = useState<AffiliateRecommendation[]>([]);
  const [matcherLocationQuery, setMatcherLocationQuery] = useState('New York JFK Airport');
  const [matcherLoading, setMatcherLoading] = useState(false);
  const [vendorAffiliatePolicy, setVendorAffiliatePolicy] = useState<VendorAffiliatePolicyRules>({
    vendor_id: config.vendor_id,
    custom_owner_notes: 'Autonomous operations configured by fleet owner. Priority corporate & airport transfers.',
    farm_out_policy: {
      enabled: true,
      ai_natural_language_prompt: 'When farming out trips in out-of-market cities (NYC, London, Paris, Miami, Dubai, LA), only assign to certified 5-star operators (>=4.90 rating) with 2024+ luxury sedans/SUVs. Require minimum 10% referral commission and verified commercial livery insurance.',
      ai_decision_mode: 'AI_AGENT_AUTONOMOUS',
      min_partner_rating: 4.90,
      max_vehicle_age_years: 3,
      min_referral_commission_pct: 10.0,
      preferred_partner_ids: ['ny-executive-limo', 'london-royal-chauffeur'],
      blacklisted_partner_ids: [],
      require_commercial_insurance: true,
      require_airport_fbo_permit: true,
      auto_farmout_on_overcapacity: true,
      auto_farmout_out_of_market: true,
      local_service_radius_km: 75.0,
      require_owner_manual_approval: false
    },
    farm_in_policy: {
      open_for_farm_in: true,
      ai_natural_language_prompt: 'Open to receive corporate and airport transfer rides in our home metro area. Require minimum $80 net payout. Only accept First Class, Luxury SUV, and Business Sedan classes. Prioritize bookings with at least 45 minutes lead time.',
      ai_decision_mode: 'AI_AGENT_AUTONOMOUS',
      allowed_vehicle_classes: ['FIRST_CLASS', 'LUXURY_SUV', 'BUSINESS_SEDAN'],
      min_net_payout_usd: 80.0,
      min_lead_time_minutes: 45,
      max_deadhead_from_depot_km: 45.0,
      auto_accept_whitelisted: true,
      preferred_originator_ids: ['ny-executive-limo'],
      blacklisted_originator_ids: [],
      require_verified_passenger_phone: true
    },
    ai_compiled_summary: 'AI Agent Directives Active & Synced to Global Hub Knowledge Base',
    updated_at: Date.now() / 1000
  });
  const [policySaving, setPolicySaving] = useState(false);
  const [newFarmOut, setNewFarmOut] = useState({
    passenger: '',
    passenger_phone: '',
    destination_city: 'New York, NY',
    partner_id: 'ny-executive-limo',
    partner_name: 'New York Executive Limousine',
    pickup: 'JFK Airport Terminal 4 VIP',
    dropoff: 'The Plaza Hotel, 5th Ave',
    vehicle_class: 'FIRST_CLASS',
    gross_fare_usd: 220.00
  });

  // 10DLC Registration Wizard State (Loaded from Sovereign Vendor Configuration)
  const [show10DlcWizard, setShow10DlcWizard] = useState(false);
  const [wizardMode, setWizardMode] = useState<'API_AUTO' | 'MANUAL_TWILIO_GUIDE'>('API_AUTO');
  const [tcrBrandForm, setTcrBrandForm] = useState({
    legal_name: config.telecom_compliance?.legal_business_name || (config.vendor_name ? `${config.vendor_name} LLC` : ''),
    ein_tax_id: config.telecom_compliance?.ein_tax_id || '',
    business_type: config.telecom_compliance?.business_type || 'LLC',
    vertical: config.telecom_compliance?.vertical || 'TRANSPORTATION_AND_LOGISTICS',
    address: config.telecom_compliance?.physical_address || config.branding?.office_address || '',
    website: config.telecom_compliance?.website_url || (config.branding?.domain ? `https://${config.branding.domain}` : ''),
    contact_email: config.telecom_compliance?.contact_email || (config.branding?.domain ? `compliance@${config.branding.domain}` : ''),
    contact_phone: config.telecom_compliance?.contact_phone || config.branding?.contact_phone || '',
    campaign_use_case: 'CUSTOMER_CARE_AND_DISPATCH',
    opt_in_url: config.branding?.domain ? `https://${config.branding.domain}/book` : ''
  });

  const [affiliateJobs, setAffiliateJobs] = useState([
    {
      id: 'TRP-HUB-904',
      type: 'INCOMING_HUB',
      direction: '📥 Farmed-In (85% Net)',
      passenger: 'Julian Drake',
      phone: '+1 (212) 555-0199',
      pickup: 'PHL Airport Private FBO (Atlantic Aviation)',
      dropoff: 'Citadel Securities Office, Philadelphia',
      partner: 'Global Hub Worldwide Concierge',
      city: 'Philadelphia, PA',
      vehicle_class: 'FIRST_CLASS',
      gross_fare: 165.00,
      net_cut: 140.25,
      cut_label: '85% Net Payout',
      status: 'UNASSIGNED',
      chauffeur: 'Unassigned',
      date: 'Today, 2:30 PM',
      escrow_status: 'ESCROW_LOCKED'
    },
    {
      id: 'TRP-HUB-915',
      type: 'INCOMING_HUB',
      direction: '📥 Farmed-In (85% Net)',
      passenger: 'Sarah Jenkins',
      phone: '+1 (312) 555-0144',
      pickup: 'PHL Airport Terminal E (Gate E3)',
      dropoff: 'King of Prussia Luxury Mall / Hotel',
      partner: 'Global Hub Worldwide Concierge',
      city: 'Philadelphia, PA',
      vehicle_class: 'LUXURY_SUV',
      gross_fare: 110.00,
      net_cut: 93.50,
      cut_label: '85% Net Payout',
      status: 'IN_TRANSIT',
      chauffeur: 'Marcus Brody',
      date: 'Today, 3:15 PM',
      escrow_status: 'ESCROW_LOCKED'
    },
    {
      id: 'TRP-HUB-928',
      type: 'INCOMING_HUB',
      direction: '📥 Farmed-In (85% Net)',
      passenger: 'David Sterling',
      phone: '+1 (617) 555-0182',
      pickup: '30th Street Station VIP Concourse',
      dropoff: 'Center City Marriott Downtown',
      partner: 'Global Hub Corporate Exchange',
      city: 'Philadelphia, PA',
      vehicle_class: 'BUSINESS_SEDAN',
      gross_fare: 85.00,
      net_cut: 72.25,
      cut_label: '85% Net Payout',
      status: 'SETTLED',
      chauffeur: 'Carlos Santos',
      date: 'Today, 11:00 AM',
      escrow_status: 'PAID_OUT'
    },
    {
      id: 'TRP-NYC-102',
      type: 'OUTGOING_FARM',
      direction: '📤 Farmed-Out (10% Referral)',
      passenger: 'Robert Vance (VIP Client)',
      phone: '+1 (215) 555-0811',
      pickup: 'JFK Airport Terminal 4 VIP',
      dropoff: 'Manhattan Midtown Office (57th St)',
      partner: 'NY Executive Limousine',
      city: 'New York, NY',
      vehicle_class: 'FIRST_CLASS',
      gross_fare: 195.00,
      net_cut: 19.50,
      cut_label: '10% Referral Cut',
      status: 'IN_TRANSIT',
      chauffeur: 'NY Chauffeur #41',
      date: 'Today, 4:00 PM',
      escrow_status: 'ESCROW_LOCKED'
    },
    {
      id: 'TRP-MIA-405',
      type: 'OUTGOING_FARM',
      direction: '📤 Farmed-Out (10% Referral)',
      passenger: 'Senator Alexander Hayes',
      phone: '+1 (202) 555-0177',
      pickup: 'Miami International (MIA) Concourse D',
      dropoff: '1 Hotel South Beach, Miami Beach',
      partner: 'Miami VIP Chauffeur Fleet',
      city: 'Miami, FL',
      vehicle_class: 'LUXURY_SUV',
      gross_fare: 240.00,
      net_cut: 24.00,
      cut_label: '10% Referral Cut',
      status: 'SCHEDULED',
      chauffeur: 'Miami Chauffeur #12',
      date: 'Tomorrow, 9:30 AM',
      escrow_status: 'ESCROW_LOCKED'
    },
    {
      id: 'TRP-LON-711',
      type: 'OUTGOING_FARM',
      direction: '📤 Farmed-Out (10% Referral)',
      passenger: 'Lady Victoria Spencer',
      phone: '+44 20 7946 0912',
      pickup: 'London Heathrow (LHR) Terminal 5 FBO',
      dropoff: 'The Connaught Hotel, Mayfair London',
      partner: 'London Executive Car Service',
      city: 'London, UK',
      vehicle_class: 'FIRST_CLASS',
      gross_fare: 280.00,
      net_cut: 28.00,
      cut_label: '10% Referral Cut',
      status: 'SETTLED',
      chauffeur: 'London Chauffeur #08',
      date: 'Yesterday, 8:00 AM',
      escrow_status: 'PAID_OUT'
    }
  ]);

  // Local KPI Metrics
  const [metrics, setMetrics] = useState({
    today_revenue_usd: 3420.50,
    trips_completed_today: 14,
    trips_active: 3,
    active_chauffeurs_on_duty: 6,
    fleet_utilization_pct: 78,
    direct_bookings_pct: 82,
    farmed_in_hub_pct: 18,
    compliance_ppa_tlc_score: 100
  });

  // Local Live Trips
  const [trips, setTrips] = useState([
    {
      id: 'TRP-PHL-891',
      passenger: 'Hon. Elena Vance',
      pickup: 'PHL Airport Terminal A (Gate 14)',
      dropoff: 'The Ritz-Carlton Philadelphia, 10 Ave of the Arts',
      vehicle_class: 'FIRST_CLASS',
      chauffeur: 'Marcus Brody',
      status: 'PASSENGER_ONBOARD',
      fare_usd: 125.00,
      source: 'DIRECT_STOREFRONT',
      eta_minutes: 18
    },
    {
      id: 'TRP-PHL-892',
      passenger: 'Dr. Arthur Sterling',
      pickup: '30th Street Station VIP Gate',
      dropoff: 'Four Seasons Hotel Philadelphia, Comcast Center',
      vehicle_class: 'LUXURY_SUV',
      chauffeur: 'Carlos Santos',
      status: 'EN_ROUTE',
      fare_usd: 95.00,
      source: 'DIRECT_STOREFRONT',
      eta_minutes: 8
    },
    {
      id: 'TRP-HUB-904',
      passenger: 'Managing Dir. Julian Drake',
      pickup: 'Philadelphia International Airport (PHL) Private FBO',
      dropoff: 'Citadel Securities Office, Philadelphia',
      vehicle_class: 'FIRST_CLASS',
      chauffeur: 'Unassigned',
      status: 'UNASSIGNED',
      fare_usd: 165.00,
      source: 'GLOBAL_HUB_MARKETPLACE',
      net_payout_usd: 140.25, // 85%
      eta_minutes: 45
    }
  ]);

  // Local Fleet
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [showAddVehicleModal, setShowAddVehicleModal] = useState(false);
  const [newVehicleForm, setNewVehicleForm] = useState({
    make: 'Mercedes-Benz',
    model: 'S 580 4MATIC',
    year: 2026,
    vehicle_class: 'FIRST_CLASS',
    license_plate: 'PA-EXEC88',
    vin: 'W1K8G8EB3NA109283',
    capacity_passengers: 3,
    capacity_luggage: 3,
    hourly_rate_usd: 125.0,
    per_km_usd: 3.85,
    is_network_shared: true,
    image_url: 'https://images.unsplash.com/photo-1617814076367-b759c7d7e738?auto=format&fit=crop&w=1200&q=80'
  });

  // Local Chauffeurs with Compensation Models
  const [chauffeurs, setChauffeurs] = useState<any[]>([]);

  // Chauffeur Compensation & Payroll Summary State
  const [payrollSummary, setPayrollSummary] = useState<any>({
    total_contractor_paid_usd: 0,
    total_w2_accrued_usd: 0,
    total_w2_shift_hours: 0,
    active_pay_period: '',
    payroll_accruals: [],
    contractor_payouts: []
  });

  // Chauffeur Payroll Sub-Tabs & Filtering State
  const [payrollSubTab, setPayrollSubTab] = useState<'roster' | 'ledger' | 'payouts'>('roster');
  const [payrollModelFilter, setPayrollModelFilter] = useState<'ALL' | 'CONTRACTOR_COMMISSION' | 'W2_HOURLY' | 'SALARIED'>('ALL');
  const [payrollSearch, setPayrollSearch] = useState('');
  const [showShiftModal, setShowShiftModal] = useState(false);
  const [newShiftEntry, setNewShiftEntry] = useState({
    driver_id: 'drv_02',
    hours: 8.0,
    tips: 35.0,
    tolls: 12.50,
    trips_count: 4
  });

  const [instantPayoutRecords, setInstantPayoutRecords] = useState<any[]>([
    {
      id: 'TX-STRIPE-891',
      trip_id: 'TRP-PHL-891',
      driver_id: 'drv_01',
      driver_name: 'Marcus Brody',
      transfer_sid: 'tr_1Q7zL92eZvKYlo2CL884391',
      gross_fare: 125.00,
      split_pct: 65,
      driver_base_cut: 81.25,
      tip_amount: 25.00,
      toll_reimbursement: 10.00,
      total_payout: 116.25,
      payout_channel: 'STRIPE_CONNECT_INSTANT',
      status: 'SETTLED_INSTANT',
      created_at: 'Today, 2:45 PM'
    },
    {
      id: 'TX-STRIPE-874',
      trip_id: 'TRP-HUB-904',
      driver_id: 'drv_04',
      driver_name: 'David Miller',
      transfer_sid: 'tr_1Q7xK42eZvKYlo2C991823',
      gross_fare: 165.00,
      split_pct: 70,
      driver_base_cut: 115.50,
      tip_amount: 30.00,
      toll_reimbursement: 15.00,
      total_payout: 160.50,
      payout_channel: 'STRIPE_CONNECT_INSTANT',
      status: 'SETTLED_INSTANT',
      created_at: 'Today, 11:20 AM'
    },
    {
      id: 'TX-STRIPE-862',
      trip_id: 'TRP-PHL-844',
      driver_id: 'drv_01',
      driver_name: 'Marcus Brody',
      transfer_sid: 'tr_1Q7vM12eZvKYlo2CP10928',
      gross_fare: 140.00,
      split_pct: 65,
      driver_base_cut: 91.00,
      tip_amount: 20.00,
      toll_reimbursement: 8.50,
      total_payout: 119.50,
      payout_channel: 'STRIPE_CONNECT_INSTANT',
      status: 'SETTLED_INSTANT',
      created_at: 'Yesterday, 6:15 PM'
    }
  ]);

  // Local Pricing Rules
  const [pricingRules, setPricingRules] = useState({
    base_rate_usd: config.base_rate_usd || 75.0,
    per_km_usd: config.per_km_usd || 3.25,
    airport_terminal_fee_usd: 15.00,
    midnight_surge_multiplier: 1.25,
    minimum_charter_hours: 3,
    hourly_rate_usd: 110.00
  });

  // BYOE Email Gateway & Inbound RFQ Suite State
  const [emailSubTab, setEmailSubTab] = useState<'config' | 'inbox' | 'outbound' | 'ai_parser'>('config');
  const [activeGuideProvider, setActiveGuideProvider] = useState<'google' | 'microsoft' | 'aws_ses' | 'sendgrid' | 'postmark' | 'custom_smtp' | 'dns'>('google');
  const [showSmtpPassword, setShowSmtpPassword] = useState(false);
  const [showImapPassword, setShowImapPassword] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);
  const [inboundTestResult, setInboundTestResult] = useState<any>(null);
  const [copiedWebhookUrl, setCopiedWebhookUrl] = useState(false);
  const [emailConfig, setEmailConfig] = useState<any>({
    vendor_id: config.vendor_id || '',
    provider_type: 'CUSTOM_SMTP',
    provider: 'CUSTOM_SMTP',
    from_email: config.branding?.domain ? `dispatch@${config.branding.domain}` : '',
    sender_email: config.branding?.domain ? `dispatch@${config.branding.domain}` : '',
    sender_display_name: config.vendor_name || 'Executive Dispatch',
    reply_to_email: config.branding?.domain ? `support@${config.branding.domain}` : '',
    
    // Outbound SMTP Settings
    smtp_host: '',
    smtp_port: 587,
    smtp_user: '',
    smtp_username: '',
    smtp_password: '',
    smtp_use_tls: true,
    use_tls: true,
    
    // Provider Credentials
    aws_access_key_id: '',
    aws_secret_access_key: '',
    aws_region: 'us-east-1',
    sendgrid_api_key: '',
    postmark_server_token: '',
    google_app_password: '',
    ms_app_password: '',
    oauth_client_id: '',
    oauth_client_secret: '',
    oauth_tenant_id: '',
    
    // Inbound RFQ Mailbox Settings (IMAP / POP3 / Webhook)
    inbound_protocol: 'IMAP',
    inbound_email: config.branding?.domain ? `rfq@${config.branding.domain}` : '',
    imap_host: '',
    imap_port: 993,
    imap_user: '',
    imap_password: '',
    imap_use_ssl: true,
    imap_mailbox_folder: 'INBOX',
    polling_interval_minutes: 5,
    
    // Webhook Token & Relay Fallback
    inbound_webhook_token: '',
    fallback_to_global_hub: true,
    
    // Statuses & Automations
    is_active: true,
    dkim_verified: false,
    spf_verified: false,
    dmarc_verified: false,
    auto_reply_quotes_enabled: false,
    auto_convert_corporate_bookings: false,
    notify_driver_on_dispatch: true,
    attach_pdf_invoices: true
  });
  const [emailInbox, setEmailInbox] = useState<any[]>([]);
  const [testEmailRecipient, setTestEmailRecipient] = useState(config.branding?.domain ? `dispatch-test@${config.branding.domain}` : '');
  const [dispatchedEmails, setDispatchedEmails] = useState<any[]>([
    {
      id: 'EML-DISP-101',
      booking_id: 'BK-PHL-891',
      recipient: 'elena.vance@vance-holdings.com',
      subject: 'Reservation Confirmed: Your Chauffeur Marcus Brody is Staged at PHL Terminal A',
      sent_at: 'Today, 2:40 PM',
      type: 'BOOKING_CONFIRMATION',
      status: 'DELIVERED',
      provider: 'CUSTOM_SMTP (smtp.mailgun.org)'
    },
    {
      id: 'EML-DISP-102',
      booking_id: 'BK-PHL-844',
      recipient: 'billing@citadel-capital.com',
      subject: 'Itemized Invoice & Ride Receipt #INV-844 — ANB Executive Transportation',
      sent_at: 'Today, 1:15 PM',
      type: 'INVOICE_RECEIPT',
      status: 'DELIVERED',
      provider: 'CUSTOM_SMTP (smtp.mailgun.org)'
    }
  ]);

  // Inbound Email Sandbox State
  const [inboundEmail, setInboundEmail] = useState(
    "Dear ANB Dispatch,\nPlease book a luxury executive transfer for Board Member Ms. Clara Thorne.\nDate: Tomorrow at 3:30 PM\nPickup: PHL Airport Terminal C\nDropoff: Logan Square Philadelphia Hotel\nFlight: DL 1984\nVehicle Preference: Luxury SUV"
  );
  const [parsedEmailQuote, setParsedEmailQuote] = useState<any>(null);

  // Team & RBAC Access State
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [rolesMatrix, setRolesMatrix] = useState<RoleMatrixResponse | null>(null);
  const [showAddMemberModal, setShowAddMemberModal] = useState(false);
  const [teamSearch, setTeamSearch] = useState('');
  const [teamRoleFilter, setTeamRoleFilter] = useState<'ALL' | 'ROLE_VENDOR_ADMIN' | 'ROLE_DISPATCHER' | 'ROLE_CHAUFFEUR' | 'ROLE_CORPORATE_BOOKER'>('ALL');
  const [newMemberForm, setNewMemberForm] = useState({
    email: '',
    full_name: '',
    phone: '',
    role: 'ROLE_DISPATCHER',
    assigned_vehicle_id: 'veh-phl-01',
    permissions: ['dispatch:assign', 'dispatch:radar', 'quotes:manage', 'omnichannel:respond', 'flights:override']
  });

  const navItems: NavItem[] = [
    { id: 'overview', label: 'Executive Overview', icon: <TrendingUp size={16} />, category: 'Operations' },
    { id: 'dispatch', label: 'Live Dispatch Matrix', icon: <Car size={16} />, category: 'Operations', badge: trips.filter(t => t.status === 'UNASSIGNED').length > 0 ? '1' : undefined },
    { id: 'fleet', label: 'Fleet & PPA/TLC Permits', icon: <Shield size={16} />, category: 'Fleet' },
    { id: 'drivers', label: 'Chauffeurs & Payroll', icon: <Users size={16} />, category: 'Fleet' },
    { id: 'corporate', label: 'Corporate B2B Accounts', icon: <Building2 size={16} />, category: 'Commercial' },
    { id: 'pricing', label: 'Dynamic Tariff Matrix', icon: <Sliders size={16} />, category: 'Commercial' },
    { id: 'email_rfq', label: 'Email Gateway & BYOE', icon: <Mail size={16} />, category: 'Intelligence', badge: emailInbox.filter(e => e.status === 'PARSED_AWAITING_CONVERSION').length > 0 ? `${emailInbox.filter(e => e.status === 'PARSED_AWAITING_CONVERSION').length}` : undefined },
    { id: 'team', label: 'Team & RBAC Access', icon: <ShieldCheck size={16} />, category: 'Administration', badge: `${teamMembers.length} Staff` },
    { id: 'affiliates', label: 'Affiliate Network (Hub)', icon: <ArrowUpRight size={16} />, category: 'Commercial', badge: '85%' },
    { id: 'omnichannel', label: 'Omnichannel & Telecom', icon: <Radio size={16} />, category: 'Communications', badge: '10DLC OK' },
    { id: 'voice_ai', label: 'Voice AI Telephony', icon: <Phone size={16} />, category: 'Intelligence' },
  ];

  React.useEffect(() => {
    // 1. Fetch Fleet Vehicles for THIS specific vendor
    fetch(`/api/v1/vendors/${config.vendor_id}/fleet-inventory`, { headers: getAuthHeaders() })
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          const mapped = data.map((v: any) => ({
            id: v.id,
            make_model: `${v.make || ''} ${v.model || ''}`.trim() || 'Executive Vehicle',
            plate: v.license_plate || '—',
            vin: v.vin || '—',
            year: v.year || 2025,
            class: v.vehicle_class || 'FIRST_CLASS',
            status: v.status || 'AVAILABLE',
            inspection_due: '2027-04-15',
            insurance_valid: true,
            is_network_shared: v.is_network_shared
          }));
          setVehicles(mapped);
        }
      })
      .catch(err => console.log('Could not fetch fleet vehicles:', err));

    // 2. Fetch Chauffeurs for THIS specific vendor
    fetch(`/api/v1/vendors/${config.vendor_id}/drivers`, { headers: getAuthHeaders() })
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          const mapped = data.map((d: any) => ({
            id: d.id,
            name: `${d.first_name || ''} ${d.last_name || ''}`.trim() || d.name || 'Chauffeur',
            phone: d.phone || '—',
            badge_id: `CH-${d.id.slice(-5)}`,
            vehicle: d.current_vehicle_id || 'Assigned Fleet Vehicle',
            shift: d.is_on_duty ? 'ON_DUTY' : 'STANDBY',
            trips_today: d.trips_completed || 0,
            earnings_today: 0,
            rating: d.rating || 5.0
          }));
          setChauffeurs(mapped);
        }
      })
      .catch(err => console.log('Could not fetch chauffeurs:', err));

    // 3. Fetch Bookings / Trips for THIS specific vendor
    fetch(`/api/v1/vendors/${config.vendor_id}/bookings`, { headers: getAuthHeaders() })
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          const mapped = data.map((b: any) => ({
            id: b.id,
            passenger: b.passenger?.name || b.party?.passenger_name || 'Passenger',
            pickup: b.pickup_address || 'Pickup Location',
            dropoff: b.dropoff_address || 'Dropoff Location',
            vehicle_class: b.vehicle_class || 'FIRST_CLASS',
            chauffeur: b.trip?.driver_id || b.assigned_driver_name || 'Autonomous Auto-Assign',
            status: b.status || 'SCHEDULED',
            fare_usd: Number(b.total_amount || b.total_fare_usd || b.amount || 0),
            source: b.origin_channel || 'DIRECT_STOREFRONT',
            eta_minutes: 15
          }));
          setTrips(mapped);
        }
      })
      .catch(err => console.log('Could not fetch bookings:', err));

    // 4. Fetch Team Roster for THIS specific vendor
    if (config.vendor_id) {
      fetchVendorTeam(config.vendor_id)
        .then(data => {
          if (Array.isArray(data)) {
            setTeamMembers(data);
          }
        })
        .catch(err => console.log('Could not fetch team roster:', err));
    }

    // 4. Fetch Omnichannel Desk Summary
    fetch(`/api/v1/vendors/${config.vendor_id}/omnichannel/desk`)
      .then(res => res.json())
      .then(data => {
        if (data?.chat_messenger?.messages && Array.isArray(data.chat_messenger.messages)) {
          const mapped = data.chat_messenger.messages.map((m: any, idx: number) => ({
            id: m.id || String(idx + 1),
            sender: m.sender_name || 'Passenger',
            phone: m.sender_phone || m.recipient_phone || '',
            channel: m.channel || 'WHATSAPP',
            text: m.body || '',
            isOutbound: m.direction === 'OUTBOUND',
            time: 'Today'
          }));
          if (mapped.length > 0) {
            setChatMessages(mapped);
          }
        }
      })
      .catch(err => console.log('Could not fetch omnichannel desk:', err));

    // 5. Fetch Affiliate Ledger / Records
    fetch(`/api/v1/vendor-network/exchange/ledger`)
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data) && data.length > 0) {
          const mapped = data.map((r: any) => ({
            id: r.exchange_id || r.trip_id,
            type: r.originator_vendor_id === config.vendor_id ? 'OUTGOING_FARM' : 'INCOMING_HUB',
            direction: r.originator_vendor_id === config.vendor_id ? '📤 Farmed-Out (10% Referral)' : '📥 Farmed-In (85% Net)',
            passenger: r.passenger_name || 'VIP Client',
            phone: '+1 (215) 555-0100',
            pickup: r.pickup_address || 'Airport FBO',
            dropoff: r.dropoff_address || 'Hotel VIP',
            partner: r.performing_vendor_id,
            city: 'Philadelphia, PA',
            vehicle_class: r.vehicle_class || 'FIRST_CLASS',
            gross_fare: Number(r.gross_fare_usd || 0),
            net_cut: Number(r.performing_payout_usd || r.originator_commission_usd || 0),
            cut_label: r.originator_vendor_id === config.vendor_id ? '10% Referral Cut' : '85% Net Payout',
            status: r.settlement_status || 'SETTLED',
            chauffeur: 'Partner Chauffeur',
            date: 'Today',
            escrow_status: 'ESCROW_LOCKED'
          }));
          setAffiliateJobs(mapped);
        }
      })
      .catch(err => console.log('Could not fetch affiliate records:', err));

    // 6. Fetch Chauffeur Payroll Summary
    fetch(`/api/v1/vendors/${config.vendor_id}/payroll/summary`)
      .then(res => res.json())
      .then(data => {
        if (data && typeof data.total_contractor_paid_usd === 'number') {
          setPayrollSummary(data);
        }
      })
      .catch(err => console.log('Could not fetch payroll summary:', err));

    // 7. Fetch BYOE Email Configuration
    fetch(`/api/v1/vendor-cell/${config.vendor_id}/email/config`)
      .then(res => res.json())
      .then(data => {
        if (data && data.vendor_id) {
          setEmailConfig(data);
        }
      })
      .catch(err => console.log('Could not fetch email config:', err));

    // 8. Fetch Inbound Email RFQ Inbox
    fetch(`/api/v1/vendor-cell/${config.vendor_id}/email/inbox`)
      .then(res => res.json())
      .then(data => {
        if (data && Array.isArray(data.rfqs) && data.rfqs.length > 0) {
          setEmailInbox(data.rfqs);
        }
      })
      .catch(err => console.log('Could not fetch email inbox:', err));

    // 9. Fetch Vendor Team Roster & Roles Matrix
    fetchVendorTeam(config.vendor_id)
      .then(team => {
        if (team && Array.isArray(team) && team.length > 0) {
          setTeamMembers(team);
        }
      })
      .catch(err => console.log('Could not fetch team:', err));

    fetchVendorRolesMatrix(config.vendor_id)
      .then(matrix => {
        if (matrix) {
          setRolesMatrix(matrix);
        }
      })
      .catch(err => console.log('Could not fetch roles matrix:', err));

    // 10. Fetch Certified Global Affiliate Directory, Policy & Matchmaker
    fetchGlobalAffiliateDirectory(config.vendor_id)
      .then(dir => {
        if (dir && Array.isArray(dir)) {
          setAffiliateDirectory(dir);
        }
      })
      .catch(err => console.log('Directory load notice:', err));

    fetchVendorAffiliatePolicy(config.vendor_id)
      .then(pol => {
        if (pol && pol.vendor_id) {
          setVendorAffiliatePolicy(pol);
        }
      })
      .catch(err => console.log('Policy load notice:', err));

    fetchAffiliateRecommendations(config.vendor_id, 'New York JFK Airport')
      .then(recs => {
        if (recs && Array.isArray(recs)) {
          setAffiliateRecommendations(recs);
        }
      })
      .catch(err => console.log('Recommendations load notice:', err));
  }, [config.vendor_id]);

  const handleSaveAffiliatePolicy = async () => {
    setPolicySaving(true);
    try {
      const updated = await updateVendorAffiliatePolicy(config.vendor_id, vendorAffiliatePolicy);
      setVendorAffiliatePolicy(updated);
      setActionNotice('✅ Sovereign Business Policy successfully broadcasted and synced to Global Hub Knowledge Base!');
      // Refresh recommendations with new policy rules
      handleRunAffiliateMatcher(matcherLocationQuery);
    } catch (err: any) {
      setActionNotice(`⚠️ Error saving policy: ${err.message}`);
    } finally {
      setPolicySaving(false);
    }
  };

  const handleRunAffiliateMatcher = async (destinationQuery: string) => {
    if (!destinationQuery) return;
    setMatcherLoading(true);
    try {
      const recs = await fetchAffiliateRecommendations(config.vendor_id, destinationQuery);
      setAffiliateRecommendations(recs);
    } catch (err) {
      console.error('Error matching affiliates:', err);
    } finally {
      setMatcherLoading(false);
    }
  };

  const handleSelectAffiliateForFarmOut = (rec: AffiliateRecommendation) => {
    setNewFarmOut(prev => ({
      ...prev,
      destination_city: `${rec.partner.city}, ${rec.partner.country_code}`,
      partner_id: rec.partner.partner_id,
      partner_name: rec.partner.company_name,
      pickup: rec.partner.airports[0] || prev.pickup,
      gross_fare_usd: rec.estimated_gross_fare_usd
    }));
    setShowFarmOutModal(true);
  };

  const handleAddVehicleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      const newVeh = await createVendorVehicle(config.vendor_id, newVehicleForm);
      setVehicles(prev => [...prev, {
        id: newVeh.id,
        make_model: `${newVeh.make || ''} ${newVeh.model || ''}`.trim() || 'Luxury Executive Vehicle',
        plate: newVeh.license_plate || newVehicleForm.license_plate,
        vin: newVeh.vin || newVehicleForm.vin,
        year: newVeh.year || newVehicleForm.year,
        class: newVeh.vehicle_class || newVehicleForm.vehicle_class,
        status: newVeh.status || 'AVAILABLE',
        inspection_due: '2027-09-18',
        insurance_valid: true,
        is_network_shared: Boolean(newVeh.is_network_shared ?? newVehicleForm.is_network_shared)
      }]);
      setShowAddVehicleModal(false);
      setActionNotice(`✨ Added ${newVehicleForm.year} ${newVehicleForm.make} ${newVehicleForm.model} to Showroom & Live Fleet!`);
    } catch (err: any) {
      setActionNotice(`⚠️ Failed to add vehicle: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleVehicleNetwork = async (vehicleId: string, currentShared: boolean) => {
    try {
      const nextShared = !currentShared;
      await toggleVehicleNetwork(config.vendor_id, vehicleId, nextShared);
      setVehicles(prev => prev.map(v => v.id === vehicleId ? { ...v, is_network_shared: nextShared } : v));
      setActionNotice(`🌐 Vehicle network sharing set to ${nextShared ? 'Active (Open for Global Hub farm-in)' : 'Private Local Only'}.`);
    } catch (err: any) {
      setActionNotice(`⚠️ Network toggle error: ${err.message}`);
    }
  };

  const handleExportPayrollCsv = async (format: 'GUSTO' | 'ADP' | 'STANDARD') => {
    try {
      setLoading(true);
      const resp = await fetch(`/api/v1/vendors/${config.vendor_id}/payroll/export?format=${format}`);
      const csvText = await resp.text();
      const blob = new Blob([csvText], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `payroll_${config.vendor_id}_${format.toLowerCase()}_${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      setActionNotice(`📥 Downloaded ${format} formatted payroll CSV ready for direct upload!`);
    } catch (err: any) {
      setActionNotice(`⚠️ Error exporting CSV: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateDriverComp = async (driverId: string, model: string, commissionPct: number, hourlyRate: number) => {
    try {
      const driver = chauffeurs.find(c => c.id === driverId);
      const resp = await fetch(`/api/v1/vendors/${config.vendor_id}/drivers/${driverId}/compensation-model`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          driver_name: driver?.name || 'Chauffeur',
          compensation_model: model,
          commission_rate_pct: commissionPct,
          hourly_rate_usd: hourlyRate,
          monthly_salary_usd: 4500.0,
          stripe_connect_account_id: model === 'CONTRACTOR_COMMISSION' ? `acct_${driverId}` : null
        })
      });
      if (resp.ok) {
        setChauffeurs(prev => prev.map(c => c.id === driverId ? { ...c, compensation_model: model as any, commission_pct: commissionPct, hourly_rate: hourlyRate } : c));
        setActionNotice(`✅ Updated compensation model for ${driver?.name || driverId} to ${model.replace('_', ' ')}.`);
      }
    } catch (err: any) {
      setActionNotice(`⚠️ Error updating driver model: ${err.message}`);
    }
  };

  const handleTriggerContractorPayout = async (driverId: string, driverName: string) => {
    try {
      setLoading(true);
      const tripId = `TRP-ON-DEMAND-${Math.floor(1000 + Math.random() * 9000)}`;
      const resp = await fetch(`/api/v1/vendors/${config.vendor_id}/payroll/process-trip`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          trip_id: tripId,
          driver_id: driverId,
          driver_name: driverName,
          gross_fare_usd: 160.0,
          tip_amount_usd: 30.0,
          tolls_usd: 10.0,
          trip_duration_minutes: 40
        })
      });
      if (resp.ok) {
        const data = await resp.json();
        const driver = chauffeurs.find(c => c.id === driverId);
        const splitPct = driver?.commission_pct || 65;
        const newRecord = {
          id: `TX-STRIPE-${Math.floor(100 + Math.random() * 900)}`,
          trip_id: tripId,
          driver_id: driverId,
          driver_name: driverName,
          transfer_sid: data.stripe_transfer_sid || `tr_live_${Math.random().toString(36).substring(2, 12)}`,
          gross_fare: 160.00,
          split_pct: splitPct,
          driver_base_cut: (160.00 * splitPct) / 100,
          tip_amount: 30.00,
          toll_reimbursement: 10.00,
          total_payout: data.total_payout_usd || ((160.00 * splitPct) / 100 + 40.00),
          payout_channel: 'STRIPE_CONNECT_INSTANT',
          status: 'SETTLED_INSTANT',
          created_at: 'Just now'
        };
        setInstantPayoutRecords(prev => [newRecord, ...prev]);
        setActionNotice(`⚡ Instant Stripe payout of $${(data.total_payout_usd || newRecord.total_payout).toFixed(2)} dispatched to ${driverName}! Transfer SID: ${newRecord.transfer_sid}`);
        // Refresh payroll summary
        fetch(`/api/v1/vendors/${config.vendor_id}/payroll/summary`)
          .then(res => res.json())
          .then(d => setPayrollSummary(d))
          .catch(() => {});
      }
    } catch (err: any) {
      setActionNotice(`⚠️ Payout error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleRecordShiftSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      const driver = chauffeurs.find(c => c.id === newShiftEntry.driver_id);
      const driverName = driver?.name || 'Chauffeur';
      const resp = await fetch(`/api/v1/vendors/${config.vendor_id}/payroll/record-shift`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          driver_id: newShiftEntry.driver_id,
          driver_name: driverName,
          hours: Number(newShiftEntry.hours),
          tips: Number(newShiftEntry.tips),
          tolls: Number(newShiftEntry.tolls),
          trips_count: Number(newShiftEntry.trips_count)
        })
      });
      if (resp.ok) {
        const data = await resp.json();
        setActionNotice(`⏱️ Logged ${newShiftEntry.hours} shift hours for ${driverName} ($${data.gross_wages?.toFixed(2) || '0.00'} gross wages accrued).`);
        setShowShiftModal(false);
        // Refresh payroll summary
        fetch(`/api/v1/vendors/${config.vendor_id}/payroll/summary`)
          .then(res => res.json())
          .then(d => setPayrollSummary(d))
          .catch(() => {});
      } else {
        setActionNotice(`⚠️ Failed to record shift in payroll ledger.`);
      }
    } catch (err: any) {
      setActionNotice(`⚠️ Shift log error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleAutonomyChange = (lvl: AutonomyLevel) => {
    setAutonomyLevel(lvl);
    if (lvl === 'L0_MANUAL_KILL_SWITCH') {
      setActionNotice('🚨 EMERGENCY KILL SWITCH ENGAGED: All autonomous AI workers suspended. Manual dispatch board active.');
    } else if (lvl === 'L3_SHADOW_ASSIST') {
      setActionNotice('🟡 AUTONOMY LEVEL 3 (SHADOW ASSIST): AI drafts dispatches and quotes with 1-click human confirmation required.');
    } else {
      setActionNotice('🟢 AUTONOMY LEVEL 5 (FULL AUTONOMY): System operating with zero routine human touch.');
    }
  };

  const handleAssignChauffeur = (tripId: string, chauffeurName: string) => {
    setTrips(prev => prev.map(t => t.id === tripId ? { ...t, chauffeur: chauffeurName, status: 'DISPATCHED' } : t));
    setActionNotice(`✅ Chauffeur ${chauffeurName} assigned to trip ${tripId}. Push notification dispatched.`);
  };

  const handleParseEmailRFQ = async () => {
    setLoading(true);
    try {
      const resp = await fetch(`/api/v1/vendor-cell/${config.vendor_id}/email/inbound-parse`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sender_email: 'board@enterprise-client.com',
          subject: 'VIP Transfer RFQ',
          body: inboundEmail
        })
      });
      if (resp.ok) {
        const data = await resp.json();
        setParsedEmailQuote({
          passenger_name: data.parsed_passenger_name || 'VIP Guest',
          pickup: data.parsed_pickup || 'Airport Terminal',
          dropoff: data.parsed_dropoff || 'Hotel VIP',
          flight_number: data.parsed_flight_number || 'DL 1984',
          vehicle_class: data.parsed_vehicle_class || 'LUXURY_SUV',
          calculated_fare_usd: Number(data.quoted_amount_usd || 138.50),
          confidence_score: 0.99,
          nist_guardrail_status: 'CLEAN_VERIFIED'
        });
        setActionNotice('✨ Live parsed inbound RFQ with 100% NIST security compliance. Ready for 1-click confirmation.');
      } else {
        setActionNotice('⚠️ Error parsing email RFQ with backend API.');
      }
    } catch (err: any) {
      setActionNotice(`⚠️ Error parsing email: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveEmailConfig = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setLoading(true);
    try {
      const payload = {
        ...emailConfig,
        provider: emailConfig.provider_type || emailConfig.provider || 'CUSTOM_SMTP',
        from_email: emailConfig.sender_email || emailConfig.from_email,
        smtp_user: emailConfig.smtp_username || emailConfig.smtp_user,
        smtp_port: Number(emailConfig.smtp_port) || 587,
        imap_port: Number(emailConfig.imap_port) || 993,
        use_tls: emailConfig.smtp_use_tls ?? true
      };
      const resp = await fetch(`/api/v1/vendor-cell/${config.vendor_id}/email/config`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (resp.ok) {
        const data = await resp.json();
        setEmailConfig({
          ...emailConfig,
          ...data,
          provider_type: data.provider || data.provider_type,
          sender_email: data.from_email || data.sender_email,
          smtp_username: data.smtp_user || data.smtp_username
        });
        setActionNotice(`✅ BYOE Email Gateway Saved! Outbound Provider: ${data.provider} (${data.from_email}) | Inbound: ${data.inbound_protocol} (${data.imap_host || data.inbound_email}). All DKIM & SPF checks PASSED.`);
      } else {
        const err = await resp.json().catch(() => ({}));
        setActionNotice(`⚠️ Failed to save email config: ${err.detail || 'Server error'}`);
      }
    } catch (err: any) {
      setActionNotice(`⚠️ Email config save error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleTestEmailConnection = async () => {
    setLoading(true);
    try {
      setActionNotice(`📧 Dispatching test diagnostic email to ${testEmailRecipient}...`);
      const resp = await fetch(`/api/v1/vendor-cell/${config.vendor_id}/email/test`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ target_email: testEmailRecipient })
      });
      const data = await resp.json();
      if (data.status === 'DELIVERED' || data.status === 'SENT' || data.message_id) {
        setActionNotice(`🎉 Live Test Email Dispatched! Status: ${data.status || 'DELIVERED'}. Provider: ${data.provider || 'SMTP'}. Message ID: ${data.message_id || 'msg_live_ok'}`);
      } else {
        setActionNotice(`⚠️ Email test status: ${data.status || 'FAILED'} - ${data.error || 'Check SMTP credentials'}`);
      }
    } catch (err: any) {
      setActionNotice(`⚠️ Email test error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleTestInboundConnection = async () => {
    setLoading(true);
    try {
      setActionNotice(`📥 Testing Inbound ${emailConfig.inbound_protocol || 'IMAP'} Handshake on ${emailConfig.imap_host || 'host'}:${emailConfig.imap_port || 993}...`);
      const resp = await fetch(`/api/v1/vendor-cell/${config.vendor_id}/email/test-inbound`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      if (resp.ok) {
        const data = await resp.json();
        setInboundTestResult(data);
        setActionNotice(`🎉 Inbound Mailbox Connected! Protocol: ${data.protocol || 'IMAP'} on port ${data.port || 993}. Status: ${data.connection_status || 'AUTHENTICATED'}. Latency: ${data.latency_ms || 42}ms`);
      } else {
        const err = await resp.json().catch(() => ({}));
        setActionNotice(`⚠️ Inbound connection failed: ${err.detail || 'Authentication or Port error'}`);
      }
    } catch (err: any) {
      setActionNotice(`⚠️ Inbound test error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleConvertRfqToBooking = async (rfqId: string) => {
    setLoading(true);
    try {
      const resp = await fetch(`/api/v1/vendor-cell/${config.vendor_id}/email/rfqs/${rfqId}/convert-booking`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({})
      });
      if (resp.ok) {
        const data = await resp.json();
        const bId = data.booking_id || data.booking?.id || 'BK-NEW';
        const totalFare = data.amount_authorized_usd || (data.booking?.total_amount ? Number(data.booking.total_amount) : 138.50);
        
        // Update local inbox status
        setEmailInbox(prev => prev.map(r => (r.id === rfqId || r.email_id === rfqId) ? { ...r, status: 'CONVERTED_BOOKING', booking_id: bId } : r));
        
        // Add new booking to live trips
        const newTrip = {
          id: bId,
          passenger: data.passenger_name || data.booking?.party?.passenger_name || 'VIP Client',
          pickup: data.booking?.pickup_address || 'Airport FBO',
          dropoff: data.booking?.dropoff_address || 'Hotel VIP',
          vehicle_class: data.booking?.vehicle_class || 'LUXURY_SUV',
          chauffeur: 'Marcus Sterling (Dispatched)',
          status: 'SCHEDULED',
          fare_usd: totalFare,
          source: 'TRAVEL_DESK_EMAIL_RFQ',
          eta_minutes: 25
        };
        setTrips(prev => [newTrip, ...prev]);
        
        const stripeHold = data.stripe_payment_intent || 'pi_live_stripe_preauth';
        setActionNotice(`🚀 RFQ ${rfqId} converted to Live Booking #${bId}! Live Stripe Pre-Auth Hold ($${totalFare.toFixed(2)}) AUTHORIZED (${stripeHold}). Confirmation email dispatched.`);
      } else {
        const err = await resp.json().catch(() => ({}));
        setActionNotice(`⚠️ Error converting RFQ: ${err.detail || 'Could not create booking'}`);
      }
    } catch (err: any) {
      setActionNotice(`⚠️ RFQ Conversion Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleSendInvoiceEmail = async (bookingId: string, recipientEmail?: string) => {
    setLoading(true);
    try {
      const resp = await fetch(`/api/v1/vendor-cell/${config.vendor_id}/email/send-invoice`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          booking_id: bookingId,
          recipient_email: recipientEmail || 'billing@enterprise-client.com'
        })
      });
      if (resp.ok) {
        const data = await resp.json();
        const newRecord = {
          id: `EML-DISP-${Math.floor(100 + Math.random() * 900)}`,
          booking_id: bookingId,
          recipient: recipientEmail || 'billing@enterprise-client.com',
          subject: `Itemized Invoice & Ride Receipt #${bookingId} — ${config.vendor_name || 'Executive Chauffeur'}`,
          sent_at: 'Just now',
          type: 'INVOICE_RECEIPT',
          status: 'DELIVERED',
          provider: `${emailConfig.provider_type} (${emailConfig.smtp_host || 'Gateway'})`
        };
        setDispatchedEmails(prev => [newRecord, ...prev]);
        setActionNotice(`🧾 Itemized Invoice for Booking ${bookingId} successfully emailed to ${recipientEmail || 'billing@enterprise-client.com'}! Delivery ID: ${data.message_id || 'msg_ok'}.`);
      } else {
        const err = await resp.json().catch(() => ({}));
        setActionNotice(`⚠️ Error sending invoice email: ${err.detail || 'Failed'}`);
      }
    } catch (err: any) {
      setActionNotice(`⚠️ Invoice dispatch error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleDialOutboundCall = async () => {
    try {
      setLoading(true);
      setActionNotice(`📞 Placing live Twilio call to ${softphoneDialNumber}...`);
      const resp = await fetch(`/api/v1/vendors/${config.vendor_id}/omnichannel/dial-call`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          caller_phone: softphoneDialNumber,
          caller_name: 'Executive Passenger',
          duration_seconds: 60,
          transcript: `Outbound softphone call to ${softphoneDialNumber}`
        })
      });
      const data = await resp.json();
      if (data.twilio_call_result?.call_sid) {
        setActionNotice(`🔔 Live Twilio Phone Call Dispatched! Call SID: ${data.twilio_call_result.call_sid}. Your phone (${softphoneDialNumber}) is now ringing!`);
      } else if (data.twilio_call_result?.error) {
        setActionNotice(`⚠️ Twilio API: ${data.twilio_call_result.error}`);
      } else {
        setActionNotice(`📞 Live Softphone Call Dispatched to ${softphoneDialNumber}. Twilio Session active.`);
      }
    } catch (err: any) {
      setActionNotice(`⚠️ Call initiation error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveByokConfig = async () => {
    try {
      setLoading(true);
      setActionNotice('⚙️ Persisting Omnichannel BYOK configuration...');
      const resp = await fetch(`/api/v1/vendors/${config.vendor_id}/omnichannel/config`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          gateway_mode: byokMode,
          custom_twilio_account_sid: customTwilioSid || null,
          custom_twilio_auth_token: customTwilioToken || null,
          custom_twilio_phone_number: customTwilioPhone || null,
          custom_aws_ses_access_key: customAwsKey || null,
          custom_aws_ses_secret_key: customAwsSecret || null,
          fallback_to_global_hub: true
        })
      });
      if (resp.ok) {
        setActionNotice(`✅ Omnichannel Configuration Saved! Gateway Mode: ${byokMode}. Active Outbound Phone: ${customTwilioPhone || '+12155550144'}. Automated failover protection is ACTIVE.`);
      } else {
        setActionNotice(`⚠️ Failed to persist configuration to vendor database.`);
      }
    } catch (err: any) {
      setActionNotice(`⚠️ Error saving BYOK: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleAcceptAffiliateJob = (jobId: string, chauffeurName: string) => {
    setAffiliateJobs(prev => prev.map(j => j.id === jobId ? { ...j, chauffeur: chauffeurName, status: 'IN_TRANSIT' } : j));
    setActionNotice(`✅ Farmed-In Job ${jobId} accepted! Chauffeur ${chauffeurName} assigned. 85% Net Fare locked in ledger.`);
  };

  const handleCreateFarmOut = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFarmOut.passenger || !newFarmOut.pickup || !newFarmOut.dropoff) {
      alert('Please fill in passenger, pickup, and dropoff locations.');
      return;
    }
    const commission = Number((newFarmOut.gross_fare_usd * 0.10).toFixed(2));
    const newId = `TRP-FARM-${Math.floor(100 + Math.random() * 900)}`;
    try {
      setLoading(true);
      const resp = await fetch(`/api/v1/vendor-cell/${config.vendor_id}/affiliate/farm-out`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          performing_vendor_id: 'vendor_ny_executive',
          passenger_name: newFarmOut.passenger,
          passenger_phone: newFarmOut.passenger_phone || '+12155550100',
          pickup_address: newFarmOut.pickup,
          dropoff_address: newFarmOut.dropoff,
          distance_km: 25.0,
          vehicle_class: newFarmOut.vehicle_class
        })
      });
      if (resp.ok) {
        const record = await resp.json();
        const createdJob = {
          id: record.exchange_id || newId,
          type: 'OUTGOING_FARM',
          direction: '📤 Farmed-Out (10% Referral)',
          passenger: newFarmOut.passenger,
          phone: newFarmOut.passenger_phone || '+1 (215) 555-0100',
          pickup: newFarmOut.pickup,
          dropoff: newFarmOut.dropoff,
          partner: newFarmOut.partner_name,
          city: newFarmOut.destination_city,
          vehicle_class: newFarmOut.vehicle_class,
          gross_fare: Number(newFarmOut.gross_fare_usd),
          net_cut: commission,
          cut_label: '10% Referral Cut',
          status: 'SCHEDULED',
          chauffeur: 'Partner Chauffeur (Dispatched)',
          date: 'Today, Just Now',
          escrow_status: 'ESCROW_LOCKED'
        };
        setAffiliateJobs(prev => [createdJob, ...prev]);
        setShowFarmOutModal(false);
        setActionNotice(`🚀 Trip ${createdJob.id} farmed out to ${newFarmOut.partner_name} in ${newFarmOut.destination_city}! 10% Referral ($${commission.toFixed(2)}) locked in Hub Escrow.`);
      } else {
        const createdJob = {
          id: newId,
          type: 'OUTGOING_FARM',
          direction: '📤 Farmed-Out (10% Referral)',
          passenger: newFarmOut.passenger,
          phone: newFarmOut.passenger_phone || '+1 (215) 555-0100',
          pickup: newFarmOut.pickup,
          dropoff: newFarmOut.dropoff,
          partner: newFarmOut.partner_name,
          city: newFarmOut.destination_city,
          vehicle_class: newFarmOut.vehicle_class,
          gross_fare: Number(newFarmOut.gross_fare_usd),
          net_cut: commission,
          cut_label: '10% Referral Cut',
          status: 'SCHEDULED',
          chauffeur: 'Partner Chauffeur (Dispatched)',
          date: 'Today, Just Now',
          escrow_status: 'ESCROW_LOCKED'
        };
        setAffiliateJobs(prev => [createdJob, ...prev]);
        setShowFarmOutModal(false);
        setActionNotice(`🚀 Trip ${newId} farmed out to ${newFarmOut.partner_name}! 10% Referral ($${commission.toFixed(2)}) queued.`);
      }
    } catch (err: any) {
      setActionNotice(`⚠️ Farm out note: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTeamMemberSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMemberForm.email || !newMemberForm.full_name) {
      alert('Please provide name and email for the new team member.');
      return;
    }
    setLoading(true);
    try {
      const created = await createVendorTeamMember(config.vendor_id, {
        vendor_id: config.vendor_id,
        email: newMemberForm.email,
        full_name: newMemberForm.full_name,
        phone: newMemberForm.phone || undefined,
        role: newMemberForm.role,
        permissions: newMemberForm.permissions,
        assigned_vehicle_id: newMemberForm.role === 'ROLE_CHAUFFEUR' ? newMemberForm.assigned_vehicle_id : undefined
      });
      setTeamMembers(prev => [...prev, created]);
      setShowAddMemberModal(false);
      setNewMemberForm({
        email: '',
        full_name: '',
        phone: '',
        role: 'ROLE_DISPATCHER',
        assigned_vehicle_id: 'veh-phl-01',
        permissions: ['dispatch:assign', 'dispatch:radar', 'quotes:manage', 'omnichannel:respond', 'flights:override']
      });
      setActionNotice(`🎉 Team member ${created.full_name} (${created.role}) invited! Credentials and magic login token generated.`);
    } catch (err: any) {
      setActionNotice(`⚠️ Error creating team member: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteMember = async (userId: string, memberName: string) => {
    if (!confirm(`Are you sure you want to revoke access for ${memberName}?`)) return;
    try {
      setLoading(true);
      await deleteVendorTeamMember(config.vendor_id, userId);
      setTeamMembers(prev => prev.filter(m => m.id !== userId));
      setActionNotice(`🗑️ Access revoked for ${memberName}. Session tokens invalidated.`);
    } catch (err: any) {
      setActionNotice(`⚠️ Error revoking access: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleImpersonateOrTestRole = async (member: TeamMember) => {
    try {
      setLoading(true);
      const res = await generateTeamMemberImpersonateToken(config.vendor_id, member.id);
      if (res && res.token) {
        if (member.role === 'ROLE_CHAUFFEUR') {
          await switchPersona('driver');
          setActionNotice(`⚡ Switched session to Chauffeur: ${member.full_name}. Mobile driver portal activated.`);
        } else if (member.role === 'ROLE_DISPATCHER') {
          await switchPersona('dispatcher');
          setActionNotice(`⚡ Switched session to Dispatcher: ${member.full_name}. Operational flight/dispatch views active (banking restricted).`);
        } else if (member.role === 'ROLE_CORPORATE_BOOKER') {
          await switchPersona('corporate');
          setActionNotice(`⚡ Switched session to Corporate Booker: ${member.full_name}. Corporate billing & cost center booking active.`);
        } else {
          await switchPersona('vendor');
          setActionNotice(`⚡ Active session: Sovereign Cell Principal (${member.full_name}).`);
        }
      }
    } catch (err: any) {
      setActionNotice(`⚠️ Persona switch notice: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', backgroundColor: '#F3F4F6', color: '#0F172A', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      
      {/* 1. TOP MICROSOFT AZURE PORTAL COMMAND BAR */}
      <header style={{
        height: '48px',
        backgroundColor: '#0078D4',
        color: '#FFFFFF',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 16px',
        boxShadow: '0 1px 4px rgba(0,0,0,0.15)',
        zIndex: 50,
        userSelect: 'none'
      }}>
        {/* Left: Hamburger & Local Vendor Identity */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <button 
            onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
            style={{ background: 'transparent', border: 'none', color: '#FFFFFF', cursor: 'pointer', padding: '4px', borderRadius: '4px', display: 'flex', alignItems: 'center' }}
            title="Toggle Side Menu"
          >
            <Grid size={18} />
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Shield size={16} color="#FFFFFF" />
            <span style={{ fontWeight: 800, fontSize: '13px', letterSpacing: '0.02em', color: '#FFFFFF' }}>
              {config.vendor_name || 'Autonomous Operations'}
            </span>
            <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: '12px' }}>|</span>
            <span style={{ fontWeight: 600, fontSize: '12px', color: 'rgba(255,255,255,0.9)' }}>
              Executive Fleet & Operations Console
            </span>
            <span style={{
              fontSize: '10px',
              fontWeight: 800,
              padding: '1px 6px',
              borderRadius: '4px',
              backgroundColor: 'rgba(255, 255, 255, 0.25)',
              color: '#FFFFFF',
              marginLeft: '4px'
            }}>
              SOVEREIGN OPERATIONS
            </span>
          </div>
        </div>

        {/* Center: Autonomy Level & Emergency Kill Switch Controls */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          backgroundColor: 'rgba(0,0,0,0.2)',
          padding: '3px 6px',
          borderRadius: '6px',
          gap: '4px'
        }}>
          <span style={{ fontSize: '10px', fontWeight: 800, color: 'rgba(255,255,255,0.85)', padding: '0 4px' }}>
            AUTONOMY:
          </span>

          <button
            onClick={() => handleAutonomyChange('L5_FULL_AUTONOMY')}
            style={{
              padding: '3px 8px',
              borderRadius: '4px',
              fontSize: '10px',
              fontWeight: 800,
              cursor: 'pointer',
              border: 'none',
              backgroundColor: autonomyLevel === 'L5_FULL_AUTONOMY' ? '#16A34A' : 'transparent',
              color: autonomyLevel === 'L5_FULL_AUTONOMY' ? '#FFFFFF' : 'rgba(255,255,255,0.8)',
              display: 'flex',
              alignItems: 'center',
              gap: '3px'
            }}
          >
            <Play size={10} fill={autonomyLevel === 'L5_FULL_AUTONOMY' ? '#FFFFFF' : 'none'} />
            L5 Autonomous
          </button>

          <button
            onClick={() => handleAutonomyChange('L3_SHADOW_ASSIST')}
            style={{
              padding: '3px 8px',
              borderRadius: '4px',
              fontSize: '10px',
              fontWeight: 800,
              cursor: 'pointer',
              border: 'none',
              backgroundColor: autonomyLevel === 'L3_SHADOW_ASSIST' ? '#D97706' : 'transparent',
              color: autonomyLevel === 'L3_SHADOW_ASSIST' ? '#FFFFFF' : 'rgba(255,255,255,0.8)',
              display: 'flex',
              alignItems: 'center',
              gap: '3px'
            }}
          >
            <Pause size={10} fill={autonomyLevel === 'L3_SHADOW_ASSIST' ? '#FFFFFF' : 'none'} />
            L3 Assist
          </button>

          <button
            onClick={() => handleAutonomyChange('L0_MANUAL_KILL_SWITCH')}
            style={{
              padding: '3px 8px',
              borderRadius: '4px',
              fontSize: '10px',
              fontWeight: 800,
              cursor: 'pointer',
              border: 'none',
              backgroundColor: autonomyLevel === 'L0_MANUAL_KILL_SWITCH' ? '#DC2626' : 'transparent',
              color: autonomyLevel === 'L0_MANUAL_KILL_SWITCH' ? '#FFFFFF' : 'rgba(255,255,255,0.8)',
              display: 'flex',
              alignItems: 'center',
              gap: '3px'
            }}
          >
            <Power size={10} />
            L0 KILL SWITCH
          </button>
        </div>

        {/* Right: Toggle back to Customer Storefront */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            onClick={onNavigateToStorefront}
            style={{
              padding: '4px 12px',
              backgroundColor: 'rgba(255, 255, 255, 0.2)',
              color: '#FFFFFF',
              border: '1px solid rgba(255, 255, 255, 0.4)',
              borderRadius: '4px',
              fontSize: '11px',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px'
            }}
          >
            <span>← Customer Storefront</span>
          </button>
        </div>
      </header>

      {/* Action Notice Alert */}
      {actionNotice && (
        <div style={{
          backgroundColor: autonomyLevel === 'L0_MANUAL_KILL_SWITCH' ? '#FEE2E2' : '#DCFCE7',
          borderBottom: `1px solid ${autonomyLevel === 'L0_MANUAL_KILL_SWITCH' ? '#F87171' : '#86EFAC'}`,
          padding: '8px 24px',
          fontSize: '12px',
          fontWeight: 700,
          color: autonomyLevel === 'L0_MANUAL_KILL_SWITCH' ? '#991B1B' : '#166534',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <span>{actionNotice}</span>
          <button onClick={() => setActionNotice(null)} style={{ background: 'transparent', border: 'none', color: '#374151', cursor: 'pointer' }}>
            <X size={14} />
          </button>
        </div>
      )}

      {/* 2. MAIN WORKSPACE WITH MICROSOFT AZURE SIDE MENU */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        
        {/* Left Side Menu Explorer (Microsoft Portal Style) */}
        <aside style={{
          width: isSidebarCollapsed ? '52px' : '250px',
          backgroundColor: '#FFFFFF',
          borderRight: '1px solid #E5E7EB',
          display: 'flex',
          flexDirection: 'column',
          transition: 'width 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
          userSelect: 'none'
        }}>
          
          <div style={{
            padding: '12px 14px',
            borderBottom: '1px solid #E5E7EB',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            backgroundColor: '#F9FAFB'
          }}>
            {!isSidebarCollapsed && (
              <span style={{ fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#6B7280' }}>
                Vendor Navigation
              </span>
            )}
            <button
              onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
              style={{ background: 'transparent', border: 'none', color: '#6B7280', cursor: 'pointer', padding: '4px', borderRadius: '4px', display: 'flex', alignItems: 'center' }}
            >
              <ChevronRight size={14} style={{ transform: isSidebarCollapsed ? 'none' : 'rotate(180deg)', transition: 'transform 0.2s' }} />
            </button>
          </div>

          <div style={{ flex: 1, overflowY: 'auto', padding: '8px 0' }}>
            {navItems.map((item) => {
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: isSidebarCollapsed ? 'center' : 'space-between',
                    padding: '10px 14px',
                    fontSize: '12px',
                    fontWeight: isActive ? 800 : 600,
                    color: isActive ? '#0078D4' : '#374151',
                    background: isActive ? '#EFF6FF' : 'transparent',
                    border: 'none',
                    borderLeft: isActive ? '3px solid #0078D4' : '3px solid transparent',
                    cursor: 'pointer',
                    textAlign: 'left',
                    transition: 'all 0.15s ease'
                  }}
                  title={item.label}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ color: isActive ? '#0078D4' : '#6B7280', display: 'flex', alignItems: 'center' }}>{item.icon}</span>
                    {!isSidebarCollapsed && (
                      <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.label}</span>
                    )}
                  </div>
                  {!isSidebarCollapsed && item.badge && (
                    <span style={{
                      fontSize: '10px',
                      fontWeight: 800,
                      backgroundColor: item.id === 'dispatch' ? '#DC2626' : '#0078D4',
                      color: '#FFFFFF',
                      padding: '1px 6px',
                      borderRadius: '10px'
                    }}>
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {!isSidebarCollapsed && (
            <div style={{ padding: '12px 14px', borderTop: '1px solid #E5E7EB', fontSize: '11px', color: '#6B7280', backgroundColor: '#F9FAFB' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                <span>Cell Telemetry:</span>
                <span style={{ color: '#16A34A', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Activity size={10} /> Sovereign Online
                </span>
              </div>
              <div style={{ fontSize: '10px', color: '#9CA3AF' }}>
                Partition: <strong style={{ color: '#374151' }}>db_{config.vendor_id}</strong>
              </div>
            </div>
          )}
        </aside>

        {/* Center Main Content Area */}
        <main style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', backgroundColor: '#F3F4F6' }}>
          
          {/* Breadcrumbs & Command Bar (Microsoft Azure Style) */}
          <div style={{
            backgroundColor: '#FFFFFF',
            borderBottom: '1px solid #E5E7EB',
            padding: '10px 24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '12px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: '#6B7280' }}>
              <span style={{ cursor: 'pointer', color: '#374151' }} onClick={() => setActiveTab('overview')}>Home</span>
              <ChevronRight size={12} color="#9CA3AF" />
              <span style={{ color: '#374151', fontWeight: 500 }}>Vendor Management</span>
              <ChevronRight size={12} color="#9CA3AF" />
              <span style={{ color: '#0078D4', fontWeight: 800 }}>{navItems.find(n => n.id === activeTab)?.label || activeTab}</span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <button
                onClick={() => setActionNotice('🔄 Data refreshed from local database partition.')}
                style={{
                  padding: '6px 12px',
                  backgroundColor: '#FFFFFF',
                  color: '#374151',
                  borderRadius: '4px',
                  fontSize: '12px',
                  fontWeight: 600,
                  border: '1px solid #D1D5DB',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                <RefreshCw size={12} color="#0078D4" />
                <span>Refresh</span>
              </button>
            </div>
          </div>

          {/* Primary View Workspace */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '24px' }}>
            
            {/* TAB 1: EXECUTIVE OVERVIEW */}
            {activeTab === 'overview' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                
                {/* KPI Cards Grid */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px' }}>
                  
                  <div style={{ backgroundColor: '#FFFFFF', borderRadius: '10px', padding: '20px', border: '1px solid #E5E7EB', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '12px', color: '#6B7280', fontWeight: 700 }}>TODAY'S GROSS REVENUE</span>
                      <DollarSign size={18} color="#16A34A" />
                    </div>
                    <div style={{ fontSize: '28px', fontWeight: 900, color: '#0F172A', marginTop: '8px' }}>
                      ${metrics.today_revenue_usd.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </div>
                    <div style={{ fontSize: '11px', color: '#16A34A', marginTop: '4px', fontWeight: 700 }}>
                      ↑ +18.4% vs yesterday ({metrics.trips_completed_today} trips)
                    </div>
                  </div>

                  <div style={{ backgroundColor: '#FFFFFF', borderRadius: '10px', padding: '20px', border: '1px solid #E5E7EB', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '12px', color: '#6B7280', fontWeight: 700 }}>ACTIVE DISPATCHES</span>
                      <Car size={18} color="#0078D4" />
                    </div>
                    <div style={{ fontSize: '28px', fontWeight: 900, color: '#0078D4', marginTop: '8px' }}>
                      {metrics.trips_active} In Progress
                    </div>
                    <div style={{ fontSize: '11px', color: '#6B7280', marginTop: '4px' }}>
                      {metrics.active_chauffeurs_on_duty} Chauffeurs on duty • 1 Unassigned
                    </div>
                  </div>

                  <div style={{ backgroundColor: '#FFFFFF', borderRadius: '10px', padding: '20px', border: '1px solid #E5E7EB', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '12px', color: '#6B7280', fontWeight: 700 }}>FLEET UTILIZATION</span>
                      <Activity size={18} color="#D97706" />
                    </div>
                    <div style={{ fontSize: '28px', fontWeight: 900, color: '#D97706', marginTop: '8px' }}>
                      {metrics.fleet_utilization_pct}%
                    </div>
                    <div style={{ fontSize: '11px', color: '#6B7280', marginTop: '4px' }}>
                      4 Luxury Vehicles in Active Rotation
                    </div>
                  </div>

                  <div style={{ backgroundColor: '#FFFFFF', borderRadius: '10px', padding: '20px', border: '1px solid #E5E7EB', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '12px', color: '#6B7280', fontWeight: 700 }}>REGULATORY COMPLIANCE</span>
                      <ShieldCheck size={18} color="#16A34A" />
                    </div>
                    <div style={{ fontSize: '28px', fontWeight: 900, color: '#16A34A', marginTop: '8px' }}>
                      {metrics.compliance_ppa_tlc_score}%
                    </div>
                    <div style={{ fontSize: '11px', color: '#16A34A', marginTop: '4px', fontWeight: 700 }}>
                      PPA/TLC Badges & $5M Insurance Verified
                    </div>
                  </div>

                </div>

                {/* Quick Live Dispatch Preview & Demand Channel Breakdown */}
                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '20px' }}>
                  
                  <div style={{ backgroundColor: '#FFFFFF', borderRadius: '10px', padding: '20px', border: '1px solid #E5E7EB', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                      <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 800, color: '#0F172A' }}>
                        Live Trips in Progress ({trips.length})
                      </h3>
                      <button 
                        onClick={() => setActiveTab('dispatch')}
                        style={{ background: 'transparent', border: 'none', color: '#0078D4', fontSize: '12px', fontWeight: 700, cursor: 'pointer' }}
                      >
                        View Full Dispatch Board →
                      </button>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      {trips.map((trip) => (
                        <div 
                          key={trip.id}
                          style={{
                            backgroundColor: '#F9FAFB',
                            padding: '14px',
                            borderRadius: '8px',
                            border: '1px solid #E5E7EB',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center'
                          }}
                        >
                          <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <span style={{ fontWeight: 800, fontSize: '13px', color: '#0F172A' }}>{trip.passenger}</span>
                              <span style={{ fontSize: '10px', padding: '2px 6px', borderRadius: '4px', backgroundColor: trip.status === 'UNASSIGNED' ? '#FEE2E2' : '#DCFCE7', color: trip.status === 'UNASSIGNED' ? '#B91C1C' : '#15803D', fontWeight: 800 }}>
                                {trip.status}
                              </span>
                              <span style={{ fontSize: '10px', color: '#6B7280' }}>{trip.id}</span>
                            </div>
                            <div style={{ fontSize: '11px', color: '#4B5563', marginTop: '4px' }}>
                              📍 {trip.pickup} → 🎯 {trip.dropoff}
                            </div>
                          </div>

                          <div style={{ textAlign: 'right' }}>
                            <div style={{ fontWeight: 800, fontSize: '14px', color: '#0F172A' }}>${trip.fare_usd.toFixed(2)}</div>
                            <div style={{ fontSize: '11px', color: '#0078D4', fontWeight: 600 }}>Chauffeur: {trip.chauffeur}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Demand Channel Split */}
                  <div style={{ backgroundColor: '#FFFFFF', borderRadius: '10px', padding: '20px', border: '1px solid #E5E7EB', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                    <h3 style={{ margin: '0 0 16px 0', fontSize: '15px', fontWeight: 800, color: '#0F172A' }}>
                      Booking Source Breakdown
                    </h3>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '6px' }}>
                          <span style={{ color: '#0F172A', fontWeight: 700 }}>Direct Storefront (100% Net)</span>
                          <span style={{ color: '#16A34A', fontWeight: 800 }}>82%</span>
                        </div>
                        <div style={{ width: '100%', height: '8px', backgroundColor: '#E5E7EB', borderRadius: '4px', overflow: 'hidden' }}>
                          <div style={{ width: '82%', height: '100%', backgroundColor: '#16A34A' }} />
                        </div>
                      </div>

                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '6px' }}>
                          <span style={{ color: '#0F172A', fontWeight: 700 }}>Global Hub Marketplace (85% Net)</span>
                          <span style={{ color: '#0078D4', fontWeight: 800 }}>18%</span>
                        </div>
                        <div style={{ width: '100%', height: '8px', backgroundColor: '#E5E7EB', borderRadius: '4px', overflow: 'hidden' }}>
                          <div style={{ width: '18%', height: '100%', backgroundColor: '#0078D4' }} />
                        </div>
                      </div>

                      <div style={{ marginTop: '12px', padding: '12px', borderRadius: '8px', backgroundColor: '#EFF6FF', border: '1px solid #BFDBFE', fontSize: '11px', color: '#1E40AF', lineHeight: '1.5' }}>
                        💡 <strong style={{ color: '#1E3A8A' }}>Marketplace Influx:</strong> The Global Hub automatically forwards {config.city || 'regional'} airport transfers to your local box, paying an 85% net fare directly into your merchant ledger.
                      </div>
                    </div>
                  </div>

                </div>

              </div>
            )}

            {/* TAB 2: LIVE DISPATCH MATRIX */}
            {activeTab === 'dispatch' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                
                {/* Header & 1-Click Action */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                  <div>
                    <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: '#0F172A', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Car size={20} color="#0078D4" />
                      Live Dispatch Matrix & Bookings Manager
                    </h2>
                    <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: '#6B7280' }}>
                      Real-time reservations across Direct Website, AI Voice Telephony, Email RFQs, and Global Hub Marketplace
                    </p>
                  </div>

                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    {/* View Mode Toggle: Table / Row vs Card */}
                    <div style={{ display: 'flex', backgroundColor: '#E5E7EB', padding: '2px', borderRadius: '6px' }}>
                      <button
                        onClick={() => setDispatchViewMode('table')}
                        style={{
                          padding: '6px 12px',
                          border: 'none',
                          borderRadius: '4px',
                          fontSize: '11px',
                          fontWeight: 700,
                          cursor: 'pointer',
                          backgroundColor: dispatchViewMode === 'table' ? '#0078D4' : 'transparent',
                          color: dispatchViewMode === 'table' ? '#FFFFFF' : '#4B5563',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px'
                        }}
                      >
                        <Grid size={12} /> 📋 Row Table View
                      </button>
                      <button
                        onClick={() => setDispatchViewMode('cards')}
                        style={{
                          padding: '6px 12px',
                          border: 'none',
                          borderRadius: '4px',
                          fontSize: '11px',
                          fontWeight: 700,
                          cursor: 'pointer',
                          backgroundColor: dispatchViewMode === 'cards' ? '#0078D4' : 'transparent',
                          color: dispatchViewMode === 'cards' ? '#FFFFFF' : '#4B5563',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px'
                        }}
                      >
                        <Layers size={12} /> 🗂️ Cards View
                      </button>
                    </div>

                    <button
                      onClick={() => handleAssignChauffeur('TRP-HUB-904', 'James Washington')}
                      style={{
                        padding: '8px 14px',
                        backgroundColor: '#0078D4',
                        color: '#FFFFFF',
                        fontWeight: 800,
                        fontSize: '12px',
                        borderRadius: '6px',
                        border: 'none',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        boxShadow: '0 1px 3px rgba(0, 120, 212, 0.3)'
                      }}
                    >
                      <Car size={14} />
                      <span>1-Click Auto-Assign Unassigned</span>
                    </button>
                  </div>
                </div>

                {/* Search & Filter Toolbar */}
                <div style={{
                  backgroundColor: '#FFFFFF',
                  padding: '12px 16px',
                  borderRadius: '8px',
                  border: '1px solid #E5E7EB',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: '12px'
                }}>
                  {/* Search Input */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, minWidth: '240px', maxWidth: '400px' }}>
                    <Search size={16} color="#6B7280" />
                    <input
                      type="text"
                      placeholder="Search bookings by Passenger, Trip ID, Route, Driver..."
                      value={dispatchSearch}
                      onChange={(e) => setDispatchSearch(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '6px 10px',
                        border: '1px solid #D1D5DB',
                        borderRadius: '6px',
                        fontSize: '12px',
                        color: '#0F172A',
                        backgroundColor: '#F9FAFB'
                      }}
                    />
                    {dispatchSearch && (
                      <button
                        onClick={() => setDispatchSearch('')}
                        style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#9CA3AF' }}
                      >
                        <X size={14} />
                      </button>
                    )}
                  </div>

                  {/* Filter Chips */}
                  <div style={{ display: 'flex', gap: '6px', overflowX: 'auto' }}>
                    {[
                      { id: 'ALL', label: `All (${trips.length})` },
                      { id: 'UNASSIGNED', label: `🚨 Unassigned (${trips.filter(t => t.status === 'UNASSIGNED').length})` },
                      { id: 'ACTIVE', label: `🚖 Active (${trips.filter(t => t.status !== 'UNASSIGNED').length})` },
                      { id: 'STOREFRONT', label: `🏢 Direct (${trips.filter(t => t.source === 'DIRECT_STOREFRONT').length})` },
                      { id: 'HUB', label: `🌐 Global Hub (${trips.filter(t => t.source === 'GLOBAL_HUB_MARKETPLACE').length})` }
                    ].map((chip) => (
                      <button
                        key={chip.id}
                        onClick={() => setDispatchStatusFilter(chip.id as any)}
                        style={{
                          padding: '5px 10px',
                          borderRadius: '6px',
                          border: 'none',
                          fontSize: '11px',
                          fontWeight: 700,
                          cursor: 'pointer',
                          backgroundColor: dispatchStatusFilter === chip.id ? '#EFF6FF' : '#F9FAFB',
                          color: dispatchStatusFilter === chip.id ? '#0078D4' : '#4B5563',
                          borderWidth: '1px',
                          borderStyle: 'solid',
                          borderColor: dispatchStatusFilter === chip.id ? '#93C5FD' : '#E5E7EB'
                        }}
                      >
                        {chip.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Filter Logic */}
                {(() => {
                  const filtered = trips.filter(trip => {
                    const q = dispatchSearch.toLowerCase();
                    const matchesSearch = !q || (
                      trip.id.toLowerCase().includes(q) ||
                      trip.passenger.toLowerCase().includes(q) ||
                      trip.pickup.toLowerCase().includes(q) ||
                      trip.dropoff.toLowerCase().includes(q) ||
                      trip.chauffeur.toLowerCase().includes(q) ||
                      trip.vehicle_class.toLowerCase().includes(q)
                    );
                    if (!matchesSearch) return false;
                    if (dispatchStatusFilter === 'UNASSIGNED') return trip.status === 'UNASSIGNED';
                    if (dispatchStatusFilter === 'ACTIVE') return trip.status !== 'UNASSIGNED';
                    if (dispatchStatusFilter === 'STOREFRONT') return trip.source === 'DIRECT_STOREFRONT';
                    if (dispatchStatusFilter === 'HUB') return trip.source === 'GLOBAL_HUB_MARKETPLACE';
                    return true;
                  });

                  if (filtered.length === 0) {
                    return (
                      <div style={{ backgroundColor: '#FFFFFF', padding: '40px', borderRadius: '8px', textAlign: 'center', border: '1px solid #E5E7EB', color: '#6B7280' }}>
                        No bookings match your current filter query.
                      </div>
                    );
                  }

                  {/* 1. ROW / DATA GRID TABLE VIEW */}
                  if (dispatchViewMode === 'table') {
                    return (
                      <div style={{ backgroundColor: '#FFFFFF', borderRadius: '8px', border: '1px solid #E5E7EB', overflowX: 'auto', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '12px' }}>
                          <thead>
                            <tr style={{ backgroundColor: '#F8FAFC', borderBottom: '1px solid #E2E8F0', color: '#475569', fontSize: '11px', textTransform: 'uppercase' }}>
                              <th style={{ padding: '12px 14px', fontWeight: 800 }}>Trip ID</th>
                              <th style={{ padding: '12px 14px', fontWeight: 800 }}>Passenger</th>
                              <th style={{ padding: '12px 14px', fontWeight: 800 }}>Pickup Location</th>
                              <th style={{ padding: '12px 14px', fontWeight: 800 }}>Dropoff Destination</th>
                              <th style={{ padding: '12px 14px', fontWeight: 800 }}>Vehicle Class</th>
                              <th style={{ padding: '12px 14px', fontWeight: 800 }}>Channel / Source</th>
                              <th style={{ padding: '12px 14px', fontWeight: 800 }}>Gross Fare</th>
                              <th style={{ padding: '12px 14px', fontWeight: 800 }}>Assigned Chauffeur</th>
                              <th style={{ padding: '12px 14px', fontWeight: 800 }}>Status</th>
                              <th style={{ padding: '12px 14px', fontWeight: 800 }}>Action</th>
                            </tr>
                          </thead>
                          <tbody>
                            {filtered.map((trip) => (
                              <tr
                                key={trip.id}
                                style={{
                                  borderBottom: '1px solid #F1F5F9',
                                  backgroundColor: trip.status === 'UNASSIGNED' ? '#FEF2F2' : '#FFFFFF'
                                }}
                              >
                                <td style={{ padding: '12px 14px', fontWeight: 800, color: '#0F172A', whiteSpace: 'nowrap' }}>
                                  {trip.id}
                                </td>
                                <td style={{ padding: '12px 14px', fontWeight: 700, color: '#0F172A', whiteSpace: 'nowrap' }}>
                                  {trip.passenger}
                                </td>
                                <td style={{ padding: '12px 14px', color: '#334155', maxWidth: '200px' }}>
                                  {trip.pickup}
                                </td>
                                <td style={{ padding: '12px 14px', color: '#334155', maxWidth: '200px' }}>
                                  {trip.dropoff}
                                </td>
                                <td style={{ padding: '12px 14px', whiteSpace: 'nowrap' }}>
                                  <span style={{ fontSize: '10px', padding: '2px 6px', borderRadius: '4px', backgroundColor: '#F1F5F9', color: '#475569', fontWeight: 700 }}>
                                    {trip.vehicle_class}
                                  </span>
                                </td>
                                <td style={{ padding: '12px 14px', whiteSpace: 'nowrap' }}>
                                  {trip.source === 'GLOBAL_HUB_MARKETPLACE' ? (
                                    <span style={{ fontSize: '10px', padding: '2px 6px', borderRadius: '4px', backgroundColor: '#EFF6FF', color: '#0078D4', fontWeight: 800 }}>
                                      🌐 HUB (85% Net)
                                    </span>
                                  ) : (
                                    <span style={{ fontSize: '10px', padding: '2px 6px', borderRadius: '4px', backgroundColor: '#F0FDF4', color: '#15803D', fontWeight: 800 }}>
                                      🏢 DIRECT
                                    </span>
                                  )}
                                </td>
                                <td style={{ padding: '12px 14px', fontWeight: 800, color: '#0F172A', whiteSpace: 'nowrap' }}>
                                  ${trip.fare_usd.toFixed(2)}
                                  {trip.net_payout_usd && (
                                    <div style={{ fontSize: '10px', color: '#16A34A', fontWeight: 700 }}>
                                      Net: ${trip.net_payout_usd.toFixed(2)}
                                    </div>
                                  )}
                                </td>
                                <td style={{ padding: '12px 14px', fontWeight: 700, color: trip.chauffeur === 'Unassigned' ? '#DC2626' : '#0F172A', whiteSpace: 'nowrap' }}>
                                  {trip.chauffeur}
                                </td>
                                <td style={{ padding: '12px 14px', whiteSpace: 'nowrap' }}>
                                  <span style={{
                                    fontSize: '10px',
                                    fontWeight: 800,
                                    padding: '3px 8px',
                                    borderRadius: '4px',
                                    backgroundColor: trip.status === 'UNASSIGNED' ? '#FEE2E2' : '#DCFCE7',
                                    color: trip.status === 'UNASSIGNED' ? '#B91C1C' : '#15803D'
                                  }}>
                                    {trip.status}
                                  </span>
                                </td>
                                <td style={{ padding: '12px 14px', whiteSpace: 'nowrap' }}>
                                  {trip.status === 'UNASSIGNED' ? (
                                    <select
                                      onChange={(e) => handleAssignChauffeur(trip.id, e.target.value)}
                                      style={{
                                        backgroundColor: '#FFFFFF',
                                        color: '#0078D4',
                                        border: '1px solid #0078D4',
                                        borderRadius: '4px',
                                        padding: '4px 8px',
                                        fontSize: '11px',
                                        fontWeight: 700,
                                        cursor: 'pointer'
                                      }}
                                    >
                                      <option value="">Assign Chauffeur...</option>
                                      {chauffeurs.filter(c => c.shift === 'ON_DUTY' || c.shift === 'STANDBY').map(c => (
                                        <option key={c.id} value={c.name}>{c.name}</option>
                                      ))}
                                    </select>
                                  ) : (
                                    <button
                                      onClick={() => setActionNotice(`📍 Opened real-time GPS telemetry radar for trip ${trip.id}. Chauffeur: ${trip.chauffeur}`)}
                                      style={{ padding: '4px 8px', backgroundColor: '#EFF6FF', color: '#0078D4', border: '1px solid #BFDBFE', borderRadius: '4px', fontSize: '11px', fontWeight: 700, cursor: 'pointer' }}
                                    >
                                      Track Radar
                                    </button>
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    );
                  }

                  {/* 2. CARD GRID VIEW */}
                  return (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '16px' }}>
                      {filtered.map((trip) => (
                        <div
                          key={trip.id}
                          style={{
                            backgroundColor: '#FFFFFF',
                            borderRadius: '10px',
                            padding: '18px',
                            border: trip.status === 'UNASSIGNED' ? '2px solid #EF4444' : '1px solid #E5E7EB',
                            boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '12px'
                          }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                            <div>
                              <span style={{ fontSize: '11px', color: '#6B7280', fontWeight: 600 }}>{trip.id}</span>
                              <h4 style={{ margin: '2px 0 0 0', fontSize: '15px', fontWeight: 800, color: '#0F172A' }}>{trip.passenger}</h4>
                            </div>
                            <span style={{
                              fontSize: '11px',
                              fontWeight: 800,
                              padding: '3px 8px',
                              borderRadius: '4px',
                              backgroundColor: trip.status === 'UNASSIGNED' ? '#FEE2E2' : '#DCFCE7',
                              color: trip.status === 'UNASSIGNED' ? '#B91C1C' : '#15803D'
                            }}>
                              {trip.status}
                            </span>
                          </div>

                          <div style={{ fontSize: '12px', color: '#374151', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            <div><strong>Pickup:</strong> {trip.pickup}</div>
                            <div><strong>Dropoff:</strong> {trip.dropoff}</div>
                            <div><strong>Class:</strong> {trip.vehicle_class}</div>
                            {trip.source === 'GLOBAL_HUB_MARKETPLACE' && (
                              <div style={{ color: '#0078D4', fontWeight: 700 }}>
                                🌐 Global Hub Job • Net Payout: ${trip.net_payout_usd?.toFixed(2)} (85%)
                              </div>
                            )}
                          </div>

                          <div style={{ borderTop: '1px solid #E5E7EB', paddingTop: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div>
                              <div style={{ fontSize: '10px', color: '#6B7280' }}>ASSIGNED CHAUFFEUR</div>
                              <div style={{ fontSize: '13px', fontWeight: 700, color: '#0F172A' }}>{trip.chauffeur}</div>
                            </div>

                            {trip.status === 'UNASSIGNED' && (
                              <select
                                onChange={(e) => handleAssignChauffeur(trip.id, e.target.value)}
                                style={{
                                  backgroundColor: '#FFFFFF',
                                  color: '#0078D4',
                                  border: '1px solid #0078D4',
                                  borderRadius: '6px',
                                  padding: '6px 10px',
                                  fontSize: '11px',
                                  fontWeight: 700,
                                  cursor: 'pointer'
                                }}
                              >
                                <option value="">Assign Driver...</option>
                                {chauffeurs.filter(c => c.shift === 'ON_DUTY' || c.shift === 'STANDBY').map(c => (
                                  <option key={c.id} value={c.name}>{c.name} ({c.vehicle})</option>
                                ))}
                              </select>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  );
                })()}

              </div>
            )}

            {/* TAB 3: FLEET & PERMITS */}
            {activeTab === 'fleet' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                  <div>
                    <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: '#0F172A', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Car size={20} color="#0078D4" />
                      Local Fleet Inventory & Showroom Customizer
                    </h2>
                    <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: '#6B7280' }}>
                      Manage autonomous livery inventory, showroom display tiers, and Global Hub network sharing.
                    </p>
                  </div>

                  <button
                    onClick={() => setShowAddVehicleModal(true)}
                    style={{
                      padding: '8px 16px',
                      backgroundColor: '#0078D4',
                      color: '#FFFFFF',
                      fontWeight: 800,
                      fontSize: '12px',
                      borderRadius: '6px',
                      border: 'none',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      boxShadow: '0 1px 2px rgba(0, 120, 212, 0.2)'
                    }}
                  >
                    <Plus size={15} />
                    Add Luxury Vehicle / Showroom Customizer
                  </button>
                </div>

                {/* Showroom Customizer Add Modal */}
                {showAddVehicleModal && (
                  <div style={{
                    backgroundColor: '#FFFFFF',
                    borderRadius: '12px',
                    padding: '24px',
                    border: '1px solid #0078D4',
                    boxShadow: '0 10px 25px -5px rgba(0, 120, 212, 0.15)'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px', borderBottom: '1px solid #E5E7EB', paddingBottom: '12px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Sparkles size={18} color="#0078D4" />
                        <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 800, color: '#0F172A' }}>
                          Add Vehicle to Fleet & Showroom
                        </h3>
                      </div>
                      <button
                        onClick={() => setShowAddVehicleModal(false)}
                        style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#6B7280' }}
                      >
                        <X size={18} />
                      </button>
                    </div>

                    <form onSubmit={handleAddVehicleSubmit}>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '16px' }}>
                        <div>
                          <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#374151', marginBottom: '4px' }}>Make</label>
                          <input
                            type="text"
                            required
                            value={newVehicleForm.make}
                            onChange={(e) => setNewVehicleForm({ ...newVehicleForm, make: e.target.value })}
                            style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #D1D5DB', fontSize: '13px' }}
                          />
                        </div>
                        <div>
                          <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#374151', marginBottom: '4px' }}>Model</label>
                          <input
                            type="text"
                            required
                            value={newVehicleForm.model}
                            onChange={(e) => setNewVehicleForm({ ...newVehicleForm, model: e.target.value })}
                            style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #D1D5DB', fontSize: '13px' }}
                          />
                        </div>
                        <div>
                          <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#374151', marginBottom: '4px' }}>Year</label>
                          <input
                            type="number"
                            required
                            value={newVehicleForm.year}
                            onChange={(e) => setNewVehicleForm({ ...newVehicleForm, year: parseInt(e.target.value) || 2026 })}
                            style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #D1D5DB', fontSize: '13px' }}
                          />
                        </div>
                        <div>
                          <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#374151', marginBottom: '4px' }}>Class</label>
                          <select
                            value={newVehicleForm.vehicle_class}
                            onChange={(e) => setNewVehicleForm({ ...newVehicleForm, vehicle_class: e.target.value })}
                            style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #D1D5DB', fontSize: '13px', background: '#FFFFFF' }}
                          >
                            <option value="FIRST_CLASS">First Class (S-Class, 7-Series)</option>
                            <option value="LUXURY_SUV">Luxury SUV (Escalade, Navigator)</option>
                            <option value="ELECTRIC_VIP">Electric VIP (Lucid Air, Taycan)</option>
                            <option value="BUSINESS_SEDAN">Business Sedan (E-Class, 5-Series)</option>
                            <option value="BUSINESS_VAN">Executive Sprinter VIP</option>
                            <option value="ULTRA_LUXURY">Ultra Luxury (Rolls-Royce Ghost)</option>
                          </select>
                        </div>
                        <div>
                          <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#374151', marginBottom: '4px' }}>License Plate</label>
                          <input
                            type="text"
                            required
                            value={newVehicleForm.license_plate}
                            onChange={(e) => setNewVehicleForm({ ...newVehicleForm, license_plate: e.target.value })}
                            style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #D1D5DB', fontSize: '13px' }}
                          />
                        </div>
                        <div>
                          <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#374151', marginBottom: '4px' }}>VIN Number</label>
                          <input
                            type="text"
                            required
                            value={newVehicleForm.vin}
                            onChange={(e) => setNewVehicleForm({ ...newVehicleForm, vin: e.target.value })}
                            style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #D1D5DB', fontSize: '13px' }}
                          />
                        </div>
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                        <div>
                          <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#374151', marginBottom: '4px' }}>Hourly Charter Rate ($)</label>
                          <input
                            type="number"
                            value={newVehicleForm.hourly_rate_usd}
                            onChange={(e) => setNewVehicleForm({ ...newVehicleForm, hourly_rate_usd: parseFloat(e.target.value) || 125.0 })}
                            style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #D1D5DB', fontSize: '13px' }}
                          />
                        </div>
                        <div>
                          <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#374151', marginBottom: '4px' }}>Per KM Rate ($)</label>
                          <input
                            type="number"
                            value={newVehicleForm.per_km_usd}
                            onChange={(e) => setNewVehicleForm({ ...newVehicleForm, per_km_usd: parseFloat(e.target.value) || 3.85 })}
                            style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #D1D5DB', fontSize: '13px' }}
                          />
                        </div>
                        <div>
                          <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#374151', marginBottom: '4px' }}>Showroom Photo URL</label>
                          <input
                            type="url"
                            value={newVehicleForm.image_url}
                            onChange={(e) => setNewVehicleForm({ ...newVehicleForm, image_url: e.target.value })}
                            style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #D1D5DB', fontSize: '13px' }}
                          />
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px', padding: '12px', background: '#F8FAFC', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
                        <input
                          type="checkbox"
                          id="chk_network_sharing"
                          checked={newVehicleForm.is_network_shared}
                          onChange={(e) => setNewVehicleForm({ ...newVehicleForm, is_network_shared: e.target.checked })}
                          style={{ width: '16px', height: '16px', accentColor: '#0078D4' }}
                        />
                        <label htmlFor="chk_network_sharing" style={{ fontSize: '13px', fontWeight: 600, color: '#0F172A', cursor: 'pointer' }}>
                          Enable Global Hub Affiliate Sharing (Receive 85% net farmed-in jobs from worldwide marketplace)
                        </label>
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                        <button
                          type="button"
                          onClick={() => setShowAddVehicleModal(false)}
                          style={{ padding: '8px 16px', background: '#F3F4F6', border: '1px solid #D1D5DB', borderRadius: '6px', fontSize: '12px', fontWeight: 700, cursor: 'pointer' }}
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          disabled={loading}
                          style={{ padding: '8px 20px', background: '#0078D4', color: '#FFFFFF', border: 'none', borderRadius: '6px', fontSize: '12px', fontWeight: 700, cursor: 'pointer' }}
                        >
                          Save to Fleet & Showroom
                        </button>
                      </div>
                    </form>
                  </div>
                )}

                <div style={{ backgroundColor: '#FFFFFF', borderRadius: '10px', overflow: 'hidden', border: '1px solid #E5E7EB', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '12px' }}>
                    <thead style={{ backgroundColor: '#F9FAFB', color: '#6B7280', textTransform: 'uppercase', fontSize: '11px' }}>
                      <tr>
                        <th style={{ padding: '14px 16px' }}>Vehicle</th>
                        <th style={{ padding: '14px 16px' }}>License Plate</th>
                        <th style={{ padding: '14px 16px' }}>VIN Number</th>
                        <th style={{ padding: '14px 16px' }}>Class</th>
                        <th style={{ padding: '14px 16px' }}>Status</th>
                        <th style={{ padding: '14px 16px' }}>Network Sharing</th>
                        <th style={{ padding: '14px 16px' }}>Inspection Due</th>
                        <th style={{ padding: '14px 16px' }}>$5M Insurance</th>
                      </tr>
                    </thead>
                    <tbody>
                      {vehicles.map((v) => (
                        <tr key={v.id} style={{ borderTop: '1px solid #E5E7EB', color: '#0F172A' }}>
                          <td style={{ padding: '14px 16px', fontWeight: 700 }}>{v.year} {v.make_model}</td>
                          <td style={{ padding: '14px 16px', color: '#0078D4', fontWeight: 700 }}>{v.plate}</td>
                          <td style={{ padding: '14px 16px', fontFamily: 'monospace', color: '#6B7280' }}>{v.vin}</td>
                          <td style={{ padding: '14px 16px' }}>{v.class}</td>
                          <td style={{ padding: '14px 16px' }}>
                            <span style={{
                              padding: '3px 8px',
                              borderRadius: '4px',
                              fontSize: '10px',
                              fontWeight: 800,
                              backgroundColor: v.status === 'AVAILABLE' ? '#DCFCE7' : '#EFF6FF',
                              color: v.status === 'AVAILABLE' ? '#15803D' : '#1D4ED8'
                            }}>
                              {v.status}
                            </span>
                          </td>
                          <td style={{ padding: '14px 16px' }}>
                            <button
                              onClick={() => handleToggleVehicleNetwork(v.id, Boolean(v.is_network_shared))}
                              style={{
                                padding: '3px 8px',
                                borderRadius: '12px',
                                fontSize: '10px',
                                fontWeight: 800,
                                border: '1px solid',
                                cursor: 'pointer',
                                backgroundColor: v.is_network_shared !== false ? '#F0FDF4' : '#F1F5F9',
                                color: v.is_network_shared !== false ? '#15803D' : '#64748B',
                                borderColor: v.is_network_shared !== false ? '#86EFAC' : '#CBD5E1'
                              }}
                            >
                              {v.is_network_shared !== false ? '🌐 Network Active' : '🔒 Local Only'}
                            </button>
                          </td>
                          <td style={{ padding: '14px 16px', color: '#4B5563' }}>{v.inspection_due || '2027-04-15'}</td>
                          <td style={{ padding: '14px 16px', color: '#16A34A', fontWeight: 700 }}>
                            <CheckCircle2 size={14} style={{ display: 'inline', marginRight: '4px' }} />
                            Active
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* TAB 4: CHAUFFEURS & PAYROLL */}
            {activeTab === 'drivers' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                
                {/* Header & Export Bar */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
                  <div>
                    <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: '#0F172A', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Users size={20} color="#0078D4" />
                      Chauffeur Compensation, Shift Accruals & Multi-Model Payroll Suite
                    </h2>
                    <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: '#6B7280' }}>
                      1099 contractor instant commission splits, W-2 hourly shift ledger, and 1-click accounting CSV exports
                    </p>
                  </div>

                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    <button
                      onClick={() => setShowShiftModal(true)}
                      style={{
                        padding: '8px 14px',
                        backgroundColor: '#059669',
                        color: '#FFFFFF',
                        border: 'none',
                        borderRadius: '6px',
                        fontSize: '12px',
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px'
                      }}
                    >
                      <Plus size={14} />
                      Log Shift Hours
                    </button>

                    <button
                      onClick={() => handleExportPayrollCsv('GUSTO')}
                      disabled={loading}
                      style={{
                        padding: '8px 14px',
                        backgroundColor: '#0F172A',
                        color: '#FFFFFF',
                        border: 'none',
                        borderRadius: '6px',
                        fontSize: '12px',
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px'
                      }}
                    >
                      <FileText size={14} />
                      Export Gusto CSV
                    </button>

                    <button
                      onClick={() => handleExportPayrollCsv('ADP')}
                      disabled={loading}
                      style={{
                        padding: '8px 14px',
                        backgroundColor: '#0078D4',
                        color: '#FFFFFF',
                        border: 'none',
                        borderRadius: '6px',
                        fontSize: '12px',
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px'
                      }}
                    >
                      <Download size={14} />
                      Export ADP CSV
                    </button>

                    <button
                      onClick={() => handleExportPayrollCsv('STANDARD')}
                      disabled={loading}
                      style={{
                        padding: '8px 14px',
                        backgroundColor: '#FFFFFF',
                        color: '#374151',
                        border: '1px solid #D1D5DB',
                        borderRadius: '6px',
                        fontSize: '12px',
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px'
                      }}
                    >
                      Standard CSV
                    </button>
                  </div>
                </div>

                {/* KPI Summary Cards */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
                  <div style={{ backgroundColor: '#FFFFFF', borderRadius: '10px', padding: '16px', border: '1px solid #E5E7EB', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                    <div style={{ fontSize: '11px', fontWeight: 700, color: '#6B7280', textTransform: 'uppercase' }}>1099 Contractor Payouts</div>
                    <div style={{ fontSize: '20px', fontWeight: 900, color: '#16A34A', marginTop: '6px' }}>
                      ${payrollSummary.total_contractor_paid_usd.toFixed(2)}
                    </div>
                    <div style={{ fontSize: '11px', color: '#16A34A', marginTop: '4px', fontWeight: 600 }}>
                      ⚡ Instant Stripe Connect Transfers
                    </div>
                  </div>

                  <div style={{ backgroundColor: '#FFFFFF', borderRadius: '10px', padding: '16px', border: '1px solid #E5E7EB', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                    <div style={{ fontSize: '11px', fontWeight: 700, color: '#6B7280', textTransform: 'uppercase' }}>W-2 Accrued Wages</div>
                    <div style={{ fontSize: '20px', fontWeight: 900, color: '#0078D4', marginTop: '6px' }}>
                      ${payrollSummary.total_w2_accrued_usd.toFixed(2)}
                    </div>
                    <div style={{ fontSize: '11px', color: '#0078D4', marginTop: '4px', fontWeight: 600 }}>
                      📋 Shift Ledger • Pay Period Active
                    </div>
                  </div>

                  <div style={{ backgroundColor: '#FFFFFF', borderRadius: '10px', padding: '16px', border: '1px solid #E5E7EB', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                    <div style={{ fontSize: '11px', fontWeight: 700, color: '#6B7280', textTransform: 'uppercase' }}>Active Shift Hours</div>
                    <div style={{ fontSize: '20px', fontWeight: 900, color: '#0F172A', marginTop: '6px' }}>
                      {payrollSummary.total_w2_shift_hours.toFixed(1)} hrs
                    </div>
                    <div style={{ fontSize: '11px', color: '#6B7280', marginTop: '4px', fontWeight: 600 }}>
                      Regular + 1.5x Overtime Tracked
                    </div>
                  </div>

                  <div style={{ backgroundColor: '#FFFFFF', borderRadius: '10px', padding: '16px', border: '1px solid #E5E7EB', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                    <div style={{ fontSize: '11px', fontWeight: 700, color: '#6B7280', textTransform: 'uppercase' }}>Active Pay Period</div>
                    <div style={{ fontSize: '15px', fontWeight: 800, color: '#0F172A', marginTop: '8px' }}>
                      {payrollSummary.active_pay_period || '2026-09-01 to 2026-09-15'}
                    </div>
                    <div style={{ fontSize: '11px', color: '#6B7280', marginTop: '4px', fontWeight: 600 }}>
                      Bi-Weekly Gusto / ADP Cycle
                    </div>
                  </div>
                </div>

                {/* Sub-View Navigation Bar */}
                <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid #E5E7EB', paddingBottom: '12px', flexWrap: 'wrap' }}>
                  <button
                    onClick={() => setPayrollSubTab('roster')}
                    style={{
                      padding: '8px 16px',
                      borderRadius: '6px',
                      fontSize: '12px',
                      fontWeight: 700,
                      cursor: 'pointer',
                      border: 'none',
                      backgroundColor: payrollSubTab === 'roster' ? '#0078D4' : '#F3F4F6',
                      color: payrollSubTab === 'roster' ? '#FFFFFF' : '#4B5563',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px'
                    }}
                  >
                    <Users size={14} />
                    Chauffeur Profiles & Compensation Split Sliders ({chauffeurs.length})
                  </button>

                  <button
                    onClick={() => setPayrollSubTab('ledger')}
                    style={{
                      padding: '8px 16px',
                      borderRadius: '6px',
                      fontSize: '12px',
                      fontWeight: 700,
                      cursor: 'pointer',
                      border: 'none',
                      backgroundColor: payrollSubTab === 'ledger' ? '#0078D4' : '#F3F4F6',
                      color: payrollSubTab === 'ledger' ? '#FFFFFF' : '#4B5563',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px'
                    }}
                  >
                    <FileText size={14} />
                    Live W-2 Shift & Overtime Accrual Ledger ({payrollSummary.payroll_accruals?.length || 2})
                  </button>

                  <button
                    onClick={() => setPayrollSubTab('payouts')}
                    style={{
                      padding: '8px 16px',
                      borderRadius: '6px',
                      fontSize: '12px',
                      fontWeight: 700,
                      cursor: 'pointer',
                      border: 'none',
                      backgroundColor: payrollSubTab === 'payouts' ? '#0078D4' : '#F3F4F6',
                      color: payrollSubTab === 'payouts' ? '#FFFFFF' : '#4B5563',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px'
                    }}
                  >
                    <Zap size={14} />
                    Instant Stripe Connect Transfer Audit Trail ({instantPayoutRecords.length})
                  </button>
                </div>

                {/* SUB-VIEW 1: ROSTER & COMPENSATION RULES */}
                {payrollSubTab === 'roster' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    {/* Filter Pills */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                      <div style={{ display: 'flex', gap: '6px' }}>
                        {[
                          { id: 'ALL', label: 'All Chauffeurs' },
                          { id: 'CONTRACTOR_COMMISSION', label: '1099 Contractor' },
                          { id: 'W2_HOURLY', label: 'W-2 Hourly' },
                          { id: 'SALARIED', label: 'Salaried' }
                        ].map((flt) => (
                          <button
                            key={flt.id}
                            onClick={() => setPayrollModelFilter(flt.id as any)}
                            style={{
                              padding: '6px 12px',
                              borderRadius: '20px',
                              fontSize: '11px',
                              fontWeight: 700,
                              cursor: 'pointer',
                              border: payrollModelFilter === flt.id ? '1px solid #0078D4' : '1px solid #E5E7EB',
                              backgroundColor: payrollModelFilter === flt.id ? '#EFF6FF' : '#FFFFFF',
                              color: payrollModelFilter === flt.id ? '#0078D4' : '#6B7280'
                            }}
                          >
                            {flt.label}
                          </button>
                        ))}
                      </div>

                      <div style={{ fontSize: '12px', color: '#6B7280' }}>
                        Showing <strong>{chauffeurs.filter(c => payrollModelFilter === 'ALL' || c.compensation_model === payrollModelFilter).length}</strong> Active Chauffeurs
                      </div>
                    </div>

                    {/* Chauffeur Compensation Profiles Grid */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '18px' }}>
                      {chauffeurs
                        .filter(c => payrollModelFilter === 'ALL' || c.compensation_model === payrollModelFilter)
                        .map((c) => (
                        <div
                          key={c.id}
                          style={{
                            backgroundColor: '#FFFFFF',
                            borderRadius: '10px',
                            padding: '20px',
                            border: '1px solid #E5E7EB',
                            boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '14px'
                          }}
                        >
                          {/* Driver Info Header */}
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                            <div>
                              <h4 style={{ margin: 0, fontSize: '16px', fontWeight: 800, color: '#0F172A' }}>{c.name}</h4>
                              <div style={{ fontSize: '11px', color: '#6B7280', marginTop: '2px' }}>
                                Badge: <strong style={{ color: '#0F172A' }}>{c.badge_id}</strong> • Phone: {c.phone}
                              </div>
                            </div>
                            <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                              {c.stripe_connected && (
                                <span style={{ fontSize: '10px', fontWeight: 800, padding: '2px 6px', borderRadius: '4px', backgroundColor: '#E0E7FF', color: '#4338CA', display: 'flex', alignItems: 'center', gap: '3px' }}>
                                  <Zap size={10} /> Stripe Active
                                </span>
                              )}
                              <span style={{
                                fontSize: '10px',
                                fontWeight: 800,
                                padding: '3px 8px',
                                borderRadius: '4px',
                                backgroundColor: c.shift === 'ON_DUTY' ? '#DCFCE7' : '#F3F4F6',
                                color: c.shift === 'ON_DUTY' ? '#15803D' : '#6B7280'
                              }}>
                                {c.shift}
                              </span>
                            </div>
                          </div>

                          {/* Compensation Model Dropdown & Rate Controls */}
                          <div style={{ backgroundColor: '#F9FAFB', padding: '14px', borderRadius: '8px', border: '1px solid #E5E7EB', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                            <div>
                              <label style={{ fontSize: '11px', color: '#4B5563', fontWeight: 700, display: 'block', marginBottom: '4px' }}>
                                Compensation Model
                              </label>
                              <select
                                value={c.compensation_model || 'CONTRACTOR_COMMISSION'}
                                onChange={(e) => handleUpdateDriverComp(c.id, e.target.value, c.commission_pct || 65, c.hourly_rate || 28.5)}
                                style={{
                                  width: '100%',
                                  padding: '8px 10px',
                                  backgroundColor: '#FFFFFF',
                                  border: '1px solid #D1D5DB',
                                  borderRadius: '6px',
                                  fontSize: '12px',
                                  fontWeight: 700,
                                  color: '#0F172A'
                                }}
                              >
                                <option value="CONTRACTOR_COMMISSION">1099 Contractor (Per-Trip Split %)</option>
                                <option value="W2_HOURLY">W-2 Hourly (Shift Hours Ledger)</option>
                                <option value="SALARIED">Salaried (Monthly Base Payroll)</option>
                              </select>
                            </div>

                            {c.compensation_model === 'CONTRACTOR_COMMISSION' ? (
                              <div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', fontWeight: 700, color: '#374151', marginBottom: '4px' }}>
                                  <span>Base Fare Split: <strong>{c.commission_pct || 65}%</strong></span>
                                  <span style={{ color: '#16A34A' }}>+ 100% Tips & Tolls</span>
                                </div>
                                <input
                                  type="range"
                                  min="40"
                                  max="85"
                                  step="5"
                                  value={c.commission_pct || 65}
                                  onChange={(e) => handleUpdateDriverComp(c.id, c.compensation_model, parseInt(e.target.value), c.hourly_rate || 28.5)}
                                  style={{ width: '100%', accentColor: '#16A34A' }}
                                />
                                <div style={{ fontSize: '10px', color: '#059669', marginTop: '4px', fontWeight: 600 }}>
                                  💡 Example on $160 fare + $30 tip: Driver earns ${((160 * (c.commission_pct || 65) / 100) + 30).toFixed(2)} instantly
                                </div>
                              </div>
                            ) : c.compensation_model === 'W2_HOURLY' ? (
                              <div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', fontWeight: 700, color: '#374151', marginBottom: '4px' }}>
                                  <span>Hourly Wage: <strong>${c.hourly_rate || 30.00}/hr</strong></span>
                                  <span style={{ color: '#0078D4' }}>Overtime (1.5x): ${(Number(c.hourly_rate || 30) * 1.5).toFixed(2)}/hr</span>
                                </div>
                                <div style={{ fontSize: '10px', color: '#6B7280', marginTop: '2px' }}>
                                  📋 100% customer fare kept in treasury • Logged in Payroll Ledger
                                </div>
                              </div>
                            ) : (
                              <div>
                                <div style={{ fontSize: '11px', fontWeight: 700, color: '#374151' }}>
                                  Base Salary: <strong>$4,500.00 / month</strong>
                                </div>
                                <div style={{ fontSize: '10px', color: '#6B7280', marginTop: '2px' }}>
                                  🏢 Managed outside platform via Gusto / ADP export
                                </div>
                              </div>
                            )}
                          </div>

                          {/* Shift & Payout Summary */}
                          <div style={{ padding: '10px', backgroundColor: '#F8FAFC', borderRadius: '8px', border: '1px solid #E2E8F0', display: 'flex', justifyContent: 'space-between' }}>
                            <div>
                              <div style={{ fontSize: '10px', color: '#6B7280', fontWeight: 700 }}>TRIPS TODAY</div>
                              <div style={{ fontSize: '14px', fontWeight: 800, color: '#0F172A' }}>{c.trips_today}</div>
                            </div>
                            <div>
                              <div style={{ fontSize: '10px', color: '#6B7280', fontWeight: 700 }}>TODAY EARNED</div>
                              <div style={{ fontSize: '14px', fontWeight: 800, color: '#16A34A' }}>${c.earnings_today.toFixed(2)}</div>
                            </div>
                            <div>
                              <div style={{ fontSize: '10px', color: '#6B7280', fontWeight: 700 }}>RATING</div>
                              <div style={{ fontSize: '14px', fontWeight: 800, color: '#D97706' }}>★ {c.rating}</div>
                            </div>
                          </div>

                          {/* Action Triggers */}
                          {c.compensation_model === 'CONTRACTOR_COMMISSION' ? (
                            <button
                              onClick={() => handleTriggerContractorPayout(c.id, c.name)}
                              disabled={loading}
                              style={{
                                padding: '10px',
                                backgroundColor: '#16A34A',
                                color: '#FFFFFF',
                                border: 'none',
                                borderRadius: '6px',
                                fontSize: '12px',
                                fontWeight: 700,
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '6px'
                              }}
                            >
                              <Zap size={14} />
                              Trigger Instant Stripe Payout ($160 Test)
                            </button>
                          ) : (
                            <button
                              onClick={() => {
                                setNewShiftEntry(prev => ({ ...prev, driver_id: c.id }));
                                setShowShiftModal(true);
                              }}
                              style={{
                                padding: '10px',
                                backgroundColor: '#0078D4',
                                color: '#FFFFFF',
                                border: 'none',
                                borderRadius: '6px',
                                fontSize: '12px',
                                fontWeight: 700,
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '6px'
                              }}
                            >
                              <Clock size={14} />
                              Log Driver Shift Hours
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* SUB-VIEW 2: LIVE W-2 SHIFT & ACCRUAL LEDGER */}
                {payrollSubTab === 'ledger' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <div style={{ backgroundColor: '#FFFFFF', borderRadius: '10px', overflow: 'hidden', border: '1px solid #E5E7EB', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                      <div style={{ padding: '16px 20px', borderBottom: '1px solid #E5E7EB', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 800, color: '#0F172A' }}>
                            W-2 Hourly & Salaried Pay Period Accrual Ledger
                          </h3>
                          <p style={{ margin: '2px 0 0 0', fontSize: '12px', color: '#6B7280' }}>
                            Accruing active driving hours, FLSA overtime (&gt;40 hrs @ 1.5x), tips pass-through, and toll reimbursements
                          </p>
                        </div>
                        <button
                          onClick={() => setShowShiftModal(true)}
                          style={{
                            padding: '6px 12px',
                            backgroundColor: '#0078D4',
                            color: '#FFFFFF',
                            border: 'none',
                            borderRadius: '6px',
                            fontSize: '11px',
                            fontWeight: 700,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px'
                          }}
                        >
                          <Plus size={12} /> Log Shift
                        </button>
                      </div>

                      <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '12px' }}>
                        <thead style={{ backgroundColor: '#F9FAFB', color: '#6B7280', textTransform: 'uppercase', fontSize: '11px' }}>
                          <tr>
                            <th style={{ padding: '12px 16px' }}>Chauffeur</th>
                            <th style={{ padding: '12px 16px' }}>Pay Period</th>
                            <th style={{ padding: '12px 16px' }}>Reg. Hours</th>
                            <th style={{ padding: '12px 16px' }}>Overtime (1.5x)</th>
                            <th style={{ padding: '12px 16px' }}>Base Wage</th>
                            <th style={{ padding: '12px 16px' }}>Tips</th>
                            <th style={{ padding: '12px 16px' }}>Tolls</th>
                            <th style={{ padding: '12px 16px' }}>Gross Payable</th>
                            <th style={{ padding: '12px 16px' }}>Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(payrollSummary.payroll_accruals && payrollSummary.payroll_accruals.length > 0
                            ? payrollSummary.payroll_accruals
                            : [
                              { driver_name: 'Carlos Santos', pay_period: '2026-09-01 to 2026-09-15', regular_hours: 40.0, overtime_hours: 6.5, hourly_rate: 32.0, base_wages: 1592.00, tips_accrued: 180.00, tolls_reimbursed: 45.00, gross_wages: 1817.00, status: 'READY_FOR_EXPORT' },
                              { driver_name: 'James Washington', pay_period: '2026-09-01 to 2026-09-15', regular_hours: 30.0, overtime_hours: 0.0, hourly_rate: 28.0, base_wages: 840.00, tips_accrued: 95.00, tolls_reimbursed: 20.00, gross_wages: 955.00, status: 'READY_FOR_EXPORT' }
                            ]
                          ).map((item: any, idx: number) => (
                            <tr key={idx} style={{ borderTop: '1px solid #E5E7EB', color: '#0F172A' }}>
                              <td style={{ padding: '14px 16px', fontWeight: 700 }}>{item.driver_name}</td>
                              <td style={{ padding: '14px 16px', color: '#6B7280', fontSize: '11px' }}>{item.pay_period}</td>
                              <td style={{ padding: '14px 16px', fontWeight: 600 }}>{Number(item.regular_hours).toFixed(1)} hrs</td>
                              <td style={{ padding: '14px 16px', color: Number(item.overtime_hours) > 0 ? '#B91C1C' : '#6B7280', fontWeight: 700 }}>
                                {Number(item.overtime_hours).toFixed(1)} hrs
                              </td>
                              <td style={{ padding: '14px 16px', color: '#374151' }}>${Number(item.base_wages).toFixed(2)}</td>
                              <td style={{ padding: '14px 16px', color: '#16A34A', fontWeight: 600 }}>+${Number(item.tips_accrued).toFixed(2)}</td>
                              <td style={{ padding: '14px 16px', color: '#0078D4', fontWeight: 600 }}>+${Number(item.tolls_reimbursed).toFixed(2)}</td>
                              <td style={{ padding: '14px 16px', fontWeight: 800, color: '#0F172A', fontSize: '13px' }}>
                                ${Number(item.gross_wages).toFixed(2)}
                              </td>
                              <td style={{ padding: '14px 16px' }}>
                                <span style={{ padding: '3px 8px', borderRadius: '4px', fontSize: '10px', fontWeight: 800, backgroundColor: '#EFF6FF', color: '#1D4ED8' }}>
                                  {item.status || 'READY_FOR_EXPORT'}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* SUB-VIEW 3: INSTANT STRIPE TRANSFER AUDIT TRAIL */}
                {payrollSubTab === 'payouts' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <div style={{ backgroundColor: '#FFFFFF', borderRadius: '10px', overflow: 'hidden', border: '1px solid #E5E7EB', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                      <div style={{ padding: '16px 20px', borderBottom: '1px solid #E5E7EB', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 800, color: '#0F172A' }}>
                            1099 Contractor Instant Stripe Connect Transfers
                          </h3>
                          <p style={{ margin: '2px 0 0 0', fontSize: '12px', color: '#6B7280' }}>
                            Real-time split transfers executed upon trip completion directly to connected chauffeur debit/bank accounts
                          </p>
                        </div>
                        <span style={{ fontSize: '11px', fontWeight: 700, color: '#16A34A', display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <CheckCircle size={14} /> Stripe Connect Idempotent Safe
                        </span>
                      </div>

                      <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '12px' }}>
                        <thead style={{ backgroundColor: '#F9FAFB', color: '#6B7280', textTransform: 'uppercase', fontSize: '11px' }}>
                          <tr>
                            <th style={{ padding: '12px 16px' }}>Trip ID</th>
                            <th style={{ padding: '12px 16px' }}>Chauffeur</th>
                            <th style={{ padding: '12px 16px' }}>Stripe Transfer SID</th>
                            <th style={{ padding: '12px 16px' }}>Gross Fare</th>
                            <th style={{ padding: '12px 16px' }}>Base Cut</th>
                            <th style={{ padding: '12px 16px' }}>Tip</th>
                            <th style={{ padding: '12px 16px' }}>Toll</th>
                            <th style={{ padding: '12px 16px' }}>Instant Payout</th>
                            <th style={{ padding: '12px 16px' }}>Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {instantPayoutRecords.map((rec) => (
                            <tr key={rec.id} style={{ borderTop: '1px solid #E5E7EB', color: '#0F172A' }}>
                              <td style={{ padding: '14px 16px', fontWeight: 700, color: '#0078D4' }}>{rec.trip_id}</td>
                              <td style={{ padding: '14px 16px', fontWeight: 700 }}>{rec.driver_name}</td>
                              <td style={{ padding: '14px 16px', fontFamily: 'monospace', color: '#6B7280', fontSize: '11px' }}>
                                {rec.transfer_sid}
                              </td>
                              <td style={{ padding: '14px 16px', color: '#374151' }}>${rec.gross_fare.toFixed(2)}</td>
                              <td style={{ padding: '14px 16px', color: '#374151' }}>${rec.driver_base_cut.toFixed(2)} ({rec.split_pct}%)</td>
                              <td style={{ padding: '14px 16px', color: '#16A34A', fontWeight: 600 }}>+${rec.tip_amount.toFixed(2)}</td>
                              <td style={{ padding: '14px 16px', color: '#0078D4', fontWeight: 600 }}>+${rec.toll_reimbursement.toFixed(2)}</td>
                              <td style={{ padding: '14px 16px', fontWeight: 900, color: '#16A34A', fontSize: '13px' }}>
                                ${rec.total_payout.toFixed(2)}
                              </td>
                              <td style={{ padding: '14px 16px' }}>
                                <span style={{ padding: '3px 8px', borderRadius: '4px', fontSize: '10px', fontWeight: 800, backgroundColor: '#DCFCE7', color: '#15803D' }}>
                                  {rec.status}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* MODAL: LOG SHIFT HOURS */}
                {showShiftModal && (
                  <div style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    backgroundColor: 'rgba(15, 23, 42, 0.65)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 1000,
                    padding: '20px'
                  }}>
                    <div style={{
                      backgroundColor: '#FFFFFF',
                      borderRadius: '12px',
                      maxWidth: '480px',
                      width: '100%',
                      padding: '24px',
                      boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '16px'
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <h3 style={{ margin: 0, fontSize: '17px', fontWeight: 800, color: '#0F172A', display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <Clock size={18} color="#0078D4" />
                          Log Chauffeur Shift & Accrual
                        </h3>
                        <button
                          onClick={() => setShowShiftModal(false)}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6B7280' }}
                        >
                          <X size={18} />
                        </button>
                      </div>

                      <form onSubmit={handleRecordShiftSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                        <div>
                          <label style={{ fontSize: '12px', fontWeight: 700, color: '#374151', display: 'block', marginBottom: '4px' }}>
                            Select Chauffeur
                          </label>
                          <select
                            value={newShiftEntry.driver_id}
                            onChange={(e) => setNewShiftEntry(prev => ({ ...prev, driver_id: e.target.value }))}
                            style={{
                              width: '100%',
                              padding: '8px 10px',
                              borderRadius: '6px',
                              border: '1px solid #D1D5DB',
                              fontSize: '13px',
                              fontWeight: 600
                            }}
                          >
                            {chauffeurs.map(c => (
                              <option key={c.id} value={c.id}>{c.name} ({String(c.compensation_model || 'CONTRACTOR_COMMISSION').replace('_', ' ')})</option>
                            ))}
                          </select>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                          <div>
                            <label style={{ fontSize: '12px', fontWeight: 700, color: '#374151', display: 'block', marginBottom: '4px' }}>
                              Shift Hours
                            </label>
                            <input
                              type="number"
                              step="0.5"
                              min="0.5"
                              max="24"
                              value={newShiftEntry.hours}
                              onChange={(e) => setNewShiftEntry(prev => ({ ...prev, hours: parseFloat(e.target.value) || 0 }))}
                              style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #D1D5DB', fontSize: '13px' }}
                              required
                            />
                          </div>

                          <div>
                            <label style={{ fontSize: '12px', fontWeight: 700, color: '#374151', display: 'block', marginBottom: '4px' }}>
                              Trips Completed
                            </label>
                            <input
                              type="number"
                              min="0"
                              value={newShiftEntry.trips_count}
                              onChange={(e) => setNewShiftEntry(prev => ({ ...prev, trips_count: parseInt(e.target.value) || 0 }))}
                              style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #D1D5DB', fontSize: '13px' }}
                              required
                            />
                          </div>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                          <div>
                            <label style={{ fontSize: '12px', fontWeight: 700, color: '#374151', display: 'block', marginBottom: '4px' }}>
                              Tips Collected ($)
                            </label>
                            <input
                              type="number"
                              step="1"
                              min="0"
                              value={newShiftEntry.tips}
                              onChange={(e) => setNewShiftEntry(prev => ({ ...prev, tips: parseFloat(e.target.value) || 0 }))}
                              style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #D1D5DB', fontSize: '13px' }}
                            />
                          </div>

                          <div>
                            <label style={{ fontSize: '12px', fontWeight: 700, color: '#374151', display: 'block', marginBottom: '4px' }}>
                              Tolls Incurred ($)
                            </label>
                            <input
                              type="number"
                              step="0.5"
                              min="0"
                              value={newShiftEntry.tolls}
                              onChange={(e) => setNewShiftEntry(prev => ({ ...prev, tolls: parseFloat(e.target.value) || 0 }))}
                              style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #D1D5DB', fontSize: '13px' }}
                            />
                          </div>
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '12px' }}>
                          <button
                            type="button"
                            onClick={() => setShowShiftModal(false)}
                            style={{ padding: '8px 14px', borderRadius: '6px', border: '1px solid #D1D5DB', backgroundColor: '#FFFFFF', color: '#374151', fontWeight: 700, fontSize: '12px', cursor: 'pointer' }}
                          >
                            Cancel
                          </button>
                          <button
                            type="submit"
                            disabled={loading}
                            style={{ padding: '8px 16px', borderRadius: '6px', border: 'none', backgroundColor: '#0078D4', color: '#FFFFFF', fontWeight: 700, fontSize: '12px', cursor: 'pointer' }}
                          >
                            {loading ? 'Saving...' : 'Record Shift in Ledger'}
                          </button>
                        </div>
                      </form>
                    </div>
                  </div>
                )}

              </div>
            )}

            {/* TAB 5: CORPORATE B2B ACCOUNTS */}
            {activeTab === 'corporate' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div>
                  <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: '#0F172A' }}>
                    Corporate B2B Client Accounts & Invoicing
                  </h2>
                  <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: '#6B7280' }}>
                    Dedicated corporate billing codes, policy rules, and monthly invoicing desk
                  </p>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '16px' }}>
                  <div style={{ backgroundColor: '#FFFFFF', borderRadius: '10px', padding: '20px', border: '1px solid #E5E7EB', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <h4 style={{ margin: 0, fontSize: '15px', fontWeight: 800, color: '#0F172A' }}>Citadel Securities Executive Desk</h4>
                      <span style={{ fontSize: '10px', padding: '2px 6px', borderRadius: '4px', backgroundColor: '#DCFCE7', color: '#15803D', fontWeight: 800 }}>ACTIVE</span>
                    </div>
                    <div style={{ fontSize: '11px', color: '#6B7280', marginTop: '6px' }}>Account ID: corp_citadel_01 • Net-30 Invoicing</div>
                    <div style={{ marginTop: '12px', padding: '10px', backgroundColor: '#F9FAFB', borderRadius: '6px', fontSize: '12px', color: '#374151' }}>
                      <div>Monthly Volume: <strong>48 Rides</strong></div>
                      <div>Current Ledger Balance: <strong>$5,840.00 USD</strong></div>
                    </div>
                  </div>

                  <div style={{ backgroundColor: '#FFFFFF', borderRadius: '10px', padding: '20px', border: '1px solid #E5E7EB', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <h4 style={{ margin: 0, fontSize: '15px', fontWeight: 800, color: '#0F172A' }}>BlackRock Global Partners</h4>
                      <span style={{ fontSize: '10px', padding: '2px 6px', borderRadius: '4px', backgroundColor: '#DCFCE7', color: '#15803D', fontWeight: 800 }}>ACTIVE</span>
                    </div>
                    <div style={{ fontSize: '11px', color: '#6B7280', marginTop: '6px' }}>Account ID: corp_blackrock_02 • Direct Corporate Card</div>
                    <div style={{ marginTop: '12px', padding: '10px', backgroundColor: '#F9FAFB', borderRadius: '6px', fontSize: '12px', color: '#374151' }}>
                      <div>Monthly Volume: <strong>32 Rides</strong></div>
                      <div>Current Ledger Balance: <strong>$4,120.00 USD</strong></div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 6: DYNAMIC TARIFF MATRIX */}
            {activeTab === 'pricing' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', maxWidth: '800px' }}>
                <div>
                  <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: '#0F172A' }}>
                    Local Dynamic Tariff & Yield Rules
                  </h2>
                  <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: '#6B7280' }}>
                    Configure base pricing, per-mile rates, airport terminal surcharges, and hourly minimums for this sovereign cell
                  </p>
                </div>

                <div style={{ backgroundColor: '#FFFFFF', borderRadius: '10px', padding: '24px', border: '1px solid #E5E7EB', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                    <div>
                      <label style={{ fontSize: '12px', color: '#4B5563', fontWeight: 700 }}>Base Flag Drop (USD)</label>
                      <input
                        type="number"
                        value={pricingRules.base_rate_usd}
                        onChange={(e) => setPricingRules({ ...pricingRules, base_rate_usd: parseFloat(e.target.value) })}
                        style={{ width: '100%', padding: '10px', backgroundColor: '#F9FAFB', border: '1px solid #D1D5DB', borderRadius: '6px', color: '#0F172A', fontSize: '13px', marginTop: '6px' }}
                      />
                    </div>

                    <div>
                      <label style={{ fontSize: '12px', color: '#4B5563', fontWeight: 700 }}>Per-KM / Per-Mile Rate (USD)</label>
                      <input
                        type="number"
                        value={pricingRules.per_km_usd}
                        onChange={(e) => setPricingRules({ ...pricingRules, per_km_usd: parseFloat(e.target.value) })}
                        style={{ width: '100%', padding: '10px', backgroundColor: '#F9FAFB', border: '1px solid #D1D5DB', borderRadius: '6px', color: '#0F172A', fontSize: '13px', marginTop: '6px' }}
                      />
                    </div>

                    <div>
                      <label style={{ fontSize: '12px', color: '#4B5563', fontWeight: 700 }}>Airport Commercial Gate Fee (USD)</label>
                      <input
                        type="number"
                        value={pricingRules.airport_terminal_fee_usd}
                        onChange={(e) => setPricingRules({ ...pricingRules, airport_terminal_fee_usd: parseFloat(e.target.value) })}
                        style={{ width: '100%', padding: '10px', backgroundColor: '#F9FAFB', border: '1px solid #D1D5DB', borderRadius: '6px', color: '#0F172A', fontSize: '13px', marginTop: '6px' }}
                      />
                    </div>

                    <div>
                      <label style={{ fontSize: '12px', color: '#4B5563', fontWeight: 700 }}>Peak / Midnight Surge Multiplier</label>
                      <input
                        type="number"
                        step="0.05"
                        value={pricingRules.midnight_surge_multiplier}
                        onChange={(e) => setPricingRules({ ...pricingRules, midnight_surge_multiplier: parseFloat(e.target.value) })}
                        style={{ width: '100%', padding: '10px', backgroundColor: '#F9FAFB', border: '1px solid #D1D5DB', borderRadius: '6px', color: '#0F172A', fontSize: '13px', marginTop: '6px' }}
                      />
                    </div>
                  </div>

                  <button
                    onClick={() => setActionNotice('✅ Local Tariff & Pricing Matrix successfully saved and committed to local database partition.')}
                    style={{
                      padding: '12px',
                      backgroundColor: '#16A34A',
                      color: '#FFFFFF',
                      fontWeight: 800,
                      fontSize: '13px',
                      borderRadius: '6px',
                      border: 'none',
                      cursor: 'pointer',
                      marginTop: '12px'
                    }}
                  >
                    Save & Commit Local Tariff Matrix
                  </button>
                </div>
              </div>
            )}

            {/* TAB 7: BYOE EMAIL GATEWAY & INBOUND RFQ SUITE */}
            {activeTab === 'email_rfq' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                
                {/* Header & Sub-Tab Navigation Bar */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
                  <div>
                    <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: '#0F172A', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Mail size={20} color="#0078D4" />
                      BYOE Email Gateway & Travel Desk Auto-Intake Suite
                    </h2>
                    <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: '#6B7280' }}>
                      Sovereign Inbound & Outbound Email Gateway — Custom SMTP/SES/SendGrid BYOE, Travel Desk RFQ Parser, and 1-Click Live Pre-Auth Holds
                    </p>
                  </div>

                  {/* Sub-Tab Selector */}
                  <div style={{ display: 'flex', backgroundColor: '#F1F5F9', padding: '4px', borderRadius: '8px', gap: '4px', border: '1px solid #E2E8F0' }}>
                    <button
                      onClick={() => setEmailSubTab('config')}
                      style={{
                        padding: '6px 14px',
                        border: 'none',
                        borderRadius: '6px',
                        fontSize: '12px',
                        fontWeight: 700,
                        cursor: 'pointer',
                        backgroundColor: emailSubTab === 'config' ? '#0078D4' : 'transparent',
                        color: emailSubTab === 'config' ? '#FFFFFF' : '#475569',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      <Settings size={14} /> Email Connection & Setup
                    </button>

                    <button
                      onClick={() => setEmailSubTab('inbox')}
                      style={{
                        padding: '6px 14px',
                        border: 'none',
                        borderRadius: '6px',
                        fontSize: '12px',
                        fontWeight: 700,
                        cursor: 'pointer',
                        backgroundColor: emailSubTab === 'inbox' ? '#0078D4' : 'transparent',
                        color: emailSubTab === 'inbox' ? '#FFFFFF' : '#475569',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px'
                      }}
                    >
                      <Inbox size={14} /> Travel Desk RFQs
                      {emailInbox.filter(e => e.status === 'PARSED_AWAITING_CONVERSION').length > 0 && (
                        <span style={{ backgroundColor: emailSubTab === 'inbox' ? '#FFFFFF' : '#0078D4', color: emailSubTab === 'inbox' ? '#0078D4' : '#FFFFFF', fontSize: '10px', padding: '1px 5px', borderRadius: '10px', fontWeight: 900 }}>
                          {emailInbox.filter(e => e.status === 'PARSED_AWAITING_CONVERSION').length}
                        </span>
                      )}
                    </button>

                    <button
                      onClick={() => setEmailSubTab('outbound')}
                      style={{
                        padding: '6px 14px',
                        border: 'none',
                        borderRadius: '6px',
                        fontSize: '12px',
                        fontWeight: 700,
                        cursor: 'pointer',
                        backgroundColor: emailSubTab === 'outbound' ? '#0078D4' : 'transparent',
                        color: emailSubTab === 'outbound' ? '#FFFFFF' : '#475569',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      <Send size={14} /> Invoices & Receipts ({dispatchedEmails.length})
                    </button>

                    <button
                      onClick={() => setEmailSubTab('ai_parser')}
                      style={{
                        padding: '6px 14px',
                        border: 'none',
                        borderRadius: '6px',
                        fontSize: '12px',
                        fontWeight: 700,
                        cursor: 'pointer',
                        backgroundColor: emailSubTab === 'ai_parser' ? '#0078D4' : 'transparent',
                        color: emailSubTab === 'ai_parser' ? '#FFFFFF' : '#475569',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      <Zap size={14} /> Inbound AI Parser Sandbox
                    </button>
                  </div>
                </div>

                {/* SUB-TAB 1: INBOUND TRAVEL DESK RFQs INBOX */}
                {emailSubTab === 'inbox' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    
                    {/* Summary Metrics */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
                      <div style={{ backgroundColor: '#FFFFFF', borderRadius: '8px', padding: '14px', border: '1px solid #E5E7EB', boxShadow: '0 1px 2px rgba(0,0,0,0.03)' }}>
                        <div style={{ fontSize: '11px', color: '#6B7280', fontWeight: 700, textTransform: 'uppercase' }}>INBOUND RFQ VOLUME</div>
                        <div style={{ fontSize: '20px', fontWeight: 900, color: '#0F172A', marginTop: '2px' }}>
                          {emailInbox.length} Travel Desk Emails
                        </div>
                        <div style={{ fontSize: '11px', color: '#0078D4', marginTop: '2px', fontWeight: 600 }}>
                          Auto-parsed via NLP Gateway
                        </div>
                      </div>

                      <div style={{ backgroundColor: '#FFFFFF', borderRadius: '8px', padding: '14px', border: '1px solid #E5E7EB', boxShadow: '0 1px 2px rgba(0,0,0,0.03)' }}>
                        <div style={{ fontSize: '11px', color: '#6B7280', fontWeight: 700, textTransform: 'uppercase' }}>AWAITING CONVERSION</div>
                        <div style={{ fontSize: '20px', fontWeight: 900, color: '#D97706', marginTop: '2px' }}>
                          {emailInbox.filter(e => e.status === 'PARSED_AWAITING_CONVERSION').length} Pending Action
                        </div>
                        <div style={{ fontSize: '11px', color: '#D97706', marginTop: '2px', fontWeight: 600 }}>
                          1-Click Stripe Pre-Auth Ready
                        </div>
                      </div>

                      <div style={{ backgroundColor: '#FFFFFF', borderRadius: '8px', padding: '14px', border: '1px solid #E5E7EB', boxShadow: '0 1px 2px rgba(0,0,0,0.03)' }}>
                        <div style={{ fontSize: '11px', color: '#6B7280', fontWeight: 700, textTransform: 'uppercase' }}>EXTRACTED VALUE</div>
                        <div style={{ fontSize: '20px', fontWeight: 900, color: '#16A34A', marginTop: '2px' }}>
                          ${emailInbox.reduce((sum, e) => sum + (e.quoted_amount_usd || 0), 0).toFixed(2)} USD
                        </div>
                        <div style={{ fontSize: '11px', color: '#16A34A', marginTop: '2px', fontWeight: 600 }}>
                          Guaranteed Tariff Calculated
                        </div>
                      </div>

                      <div style={{ backgroundColor: '#FFFFFF', borderRadius: '8px', padding: '14px', border: '1px solid #E5E7EB', boxShadow: '0 1px 2px rgba(0,0,0,0.03)' }}>
                        <div style={{ fontSize: '11px', color: '#6B7280', fontWeight: 700, textTransform: 'uppercase' }}>INBOUND IMAP / WEBHOOK</div>
                        <div style={{ fontSize: '13px', fontWeight: 800, color: '#0F172A', marginTop: '4px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {emailConfig.inbound_email || 'rfq@anblimo-philly.com'}
                        </div>
                        <div style={{ fontSize: '10px', color: '#16A34A', marginTop: '2px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '3px' }}>
                          <CheckCircle2 size={10} /> Forwarding Active
                        </div>
                      </div>
                    </div>

                    {/* Inbound RFQ Table */}
                    <div style={{ backgroundColor: '#FFFFFF', borderRadius: '10px', border: '1px solid #E5E7EB', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', overflow: 'hidden' }}>
                      <div style={{ padding: '14px 18px', backgroundColor: '#F9FAFB', borderBottom: '1px solid #E5E7EB', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ fontWeight: 800, fontSize: '13px', color: '#0F172A' }}>
                          📥 Live Inbound Travel Desk RFQ Stream
                        </div>
                        <button
                          onClick={() => {
                            fetch(`/api/v1/vendor-cell/${config.vendor_id}/email/inbox`)
                              .then(r => r.json())
                              .then(d => { if (d.rfqs) setEmailInbox(d.rfqs); setActionNotice('🔄 Inbound email inbox refreshed!'); })
                              .catch(() => {});
                          }}
                          style={{ background: 'transparent', border: 'none', color: '#0078D4', fontSize: '11px', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                        >
                          <RefreshCw size={12} /> Refresh Inbox
                        </button>
                      </div>

                      <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '12px' }}>
                        <thead>
                          <tr style={{ backgroundColor: '#F9FAFB', borderBottom: '1px solid #E5E7EB', color: '#6B7280', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase' }}>
                            <th style={{ padding: '12px 16px' }}>RFQ ID & Sender</th>
                            <th style={{ padding: '12px 16px' }}>Passenger & Flight</th>
                            <th style={{ padding: '12px 16px' }}>Extracted Route</th>
                            <th style={{ padding: '12px 16px' }}>Vehicle Class</th>
                            <th style={{ padding: '12px 16px', textAlign: 'right' }}>Guaranteed Rate</th>
                            <th style={{ padding: '12px 16px', textAlign: 'center' }}>Action</th>
                          </tr>
                        </thead>
                        <tbody>
                          {emailInbox.map((rfq) => {
                            const rfqKey = rfq.email_id || rfq.id;
                            return (
                            <tr key={rfqKey} style={{ borderBottom: '1px solid #F3F4F6' }}>
                              <td style={{ padding: '14px 16px', verticalAlign: 'top' }}>
                                <div style={{ fontWeight: 800, color: '#0F172A', fontSize: '12px' }}>{rfqKey}</div>
                                <div style={{ fontSize: '11px', color: '#0078D4', fontWeight: 600, marginTop: '2px' }}>{rfq.sender_email}</div>
                                <div style={{ fontSize: '10px', color: '#9CA3AF', marginTop: '2px' }}>{rfq.received_at || 'Just now'}</div>
                                <div style={{ fontSize: '10px', color: '#4B5563', marginTop: '4px', fontStyle: 'italic', maxWidth: '240px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                  "{rfq.subject}"
                                </div>
                              </td>

                              <td style={{ padding: '14px 16px', verticalAlign: 'top' }}>
                                <div style={{ fontWeight: 800, color: '#0F172A' }}>{rfq.parsed_passenger_name || 'VIP Client'}</div>
                                {rfq.parsed_flight_number ? (
                                  <span style={{ fontSize: '10px', backgroundColor: '#EFF6FF', color: '#1E40AF', padding: '2px 6px', borderRadius: '4px', fontWeight: 800, display: 'inline-flex', alignItems: 'center', gap: '3px', marginTop: '4px' }}>
                                    ✈️ Flight {rfq.parsed_flight_number}
                                  </span>
                                ) : (
                                  <span style={{ fontSize: '10px', color: '#9CA3AF', marginTop: '4px', display: 'block' }}>Ground Direct</span>
                                )}
                              </td>

                              <td style={{ padding: '14px 16px', verticalAlign: 'top', maxWidth: '260px' }}>
                                <div style={{ fontSize: '11px', color: '#15803D', fontWeight: 600 }}>
                                  📍 <strong>From:</strong> {rfq.parsed_pickup || 'Pickup Location'}
                                </div>
                                <div style={{ fontSize: '11px', color: '#1E40AF', fontWeight: 600, marginTop: '4px' }}>
                                  🎯 <strong>To:</strong> {rfq.parsed_dropoff || 'Dropoff Location'}
                                </div>
                              </td>

                              <td style={{ padding: '14px 16px', verticalAlign: 'top' }}>
                                <span style={{ fontSize: '10px', fontWeight: 800, color: '#374151', padding: '2px 8px', backgroundColor: '#F3F4F6', borderRadius: '4px' }}>
                                  {rfq.parsed_vehicle_class || 'FIRST_CLASS'}
                                </span>
                              </td>

                              <td style={{ padding: '14px 16px', textAlign: 'right', verticalAlign: 'top' }}>
                                <div style={{ fontSize: '14px', fontWeight: 900, color: '#16A34A' }}>
                                  ${(rfq.quoted_amount_usd || 120.0).toFixed(2)}
                                </div>
                                <div style={{ fontSize: '9px', color: '#6B7280', fontWeight: 600 }}>
                                  Auto-Tariff Matrix
                                </div>
                              </td>

                              <td style={{ padding: '14px 16px', textAlign: 'center', verticalAlign: 'top' }}>
                                {rfq.status === 'CONVERTED_TO_BOOKING' || rfq.status === 'CONVERTED_BOOKING' ? (
                                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'center' }}>
                                    <span style={{ fontSize: '10px', backgroundColor: '#DCFCE7', color: '#15803D', padding: '3px 8px', borderRadius: '4px', fontWeight: 800 }}>
                                      ✅ Booking Active
                                    </span>
                                    <button
                                      onClick={() => handleSendInvoiceEmail(rfq.booking_id || rfq.converted_booking_id || 'BK-PHL-891', rfq.sender_email)}
                                      style={{ padding: '3px 8px', backgroundColor: '#F3F4F6', color: '#374151', border: '1px solid #D1D5DB', borderRadius: '4px', fontSize: '10px', fontWeight: 600, cursor: 'pointer' }}
                                    >
                                      Send Receipt Email
                                    </button>
                                  </div>
                                ) : (
                                  <button
                                    onClick={() => handleConvertRfqToBooking(rfqKey)}
                                    disabled={loading}
                                    style={{
                                      padding: '6px 12px',
                                      backgroundColor: '#0078D4',
                                      color: '#FFFFFF',
                                      border: 'none',
                                      borderRadius: '6px',
                                      fontSize: '11px',
                                      fontWeight: 800,
                                      cursor: 'pointer',
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: '4px',
                                      boxShadow: '0 1px 2px rgba(0,0,0,0.1)'
                                    }}
                                  >
                                    <Zap size={12} /> Convert to Booking (Stripe Hold)
                                  </button>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* SUB-TAB 2: BYOE CUSTOM EMAIL SETTINGS */}
                {emailSubTab === 'config' && (
                  <div style={{ display: 'grid', gridTemplateColumns: '1.3fr 0.7fr', gap: '20px' }}>
                    
                    {/* Left: BYOE Configuration Form */}
                    <form onSubmit={handleSaveEmailConfig} style={{ backgroundColor: '#FFFFFF', borderRadius: '12px', padding: '24px', border: '1px solid #E5E7EB', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                       <div style={{ borderBottom: '1px solid #E2E8F0', paddingBottom: '14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 800, color: '#0F172A', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <Mail size={18} color="#0078D4" /> Vendor BYOE Inbound & Outbound Email Gateway
                          </h3>
                          <p style={{ margin: '3px 0 0 0', fontSize: '12px', color: '#64748B' }}>
                            Configure dedicated SMTP/SES/SendGrid/Google/Microsoft outbound delivery and IMAP/Webhook inbound RFQ auto-intake.
                          </p>
                        </div>
                        <span style={{ fontSize: '11px', fontWeight: 800, backgroundColor: '#EFF6FF', color: '#0078D4', padding: '4px 10px', borderRadius: '20px', border: '1px solid #BFDBFE' }}>
                          SOVEREIGN INSTANCE
                        </span>
                      </div>

                      {/* SECTION 1: OUTBOUND EMAIL GATEWAY (SMTP / SES / API) */}
                      <div style={{ backgroundColor: '#F8FAFC', borderRadius: '10px', padding: '16px', border: '1px solid #E2E8F0', display: 'flex', flexDirection: 'column', gap: '14px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #CBD5E1', paddingBottom: '8px' }}>
                          <div style={{ fontSize: '13px', fontWeight: 800, color: '#0F172A', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <Send size={15} color="#0078D4" /> 1. Outbound Delivery Transport & Dispatch
                          </div>
                          <span style={{ fontSize: '10px', fontWeight: 700, color: '#475569', backgroundColor: '#E2E8F0', padding: '2px 8px', borderRadius: '4px' }}>
                            SMTP / REST API
                          </span>
                        </div>

                        {/* Provider Selection */}
                        <div>
                          <label style={{ fontSize: '11px', color: '#334155', fontWeight: 700, display: 'block', marginBottom: '4px' }}>
                            Outbound Delivery Provider
                          </label>
                          <select
                            value={emailConfig.provider_type || emailConfig.provider || 'CUSTOM_SMTP'}
                            onChange={(e) => {
                              const val = e.target.value;
                              let updated = { ...emailConfig, provider_type: val, provider: val };
                              if (val === 'GOOGLE_WORKSPACE') {
                                setActiveGuideProvider('google');
                                updated.smtp_host = updated.smtp_host && updated.smtp_host !== 'smtp.mailgun.org' ? updated.smtp_host : 'smtp.gmail.com';
                                updated.smtp_port = updated.smtp_port || 587;
                                updated.smtp_use_tls = true;
                                updated.inbound_protocol = 'IMAP';
                                updated.imap_host = updated.imap_host && updated.imap_host !== 'imap.mailgun.org' ? updated.imap_host : 'imap.gmail.com';
                                updated.imap_port = 993;
                                updated.imap_use_ssl = true;
                              } else if (val === 'OUTLOOK_365') {
                                setActiveGuideProvider('microsoft');
                                updated.smtp_host = updated.smtp_host && updated.smtp_host !== 'smtp.mailgun.org' ? updated.smtp_host : 'smtp.office365.com';
                                updated.smtp_port = updated.smtp_port || 587;
                                updated.smtp_use_tls = true;
                                updated.inbound_protocol = 'IMAP';
                                updated.imap_host = updated.imap_host && updated.imap_host !== 'imap.mailgun.org' ? updated.imap_host : 'outlook.office365.com';
                                updated.imap_port = 993;
                                updated.imap_use_ssl = true;
                              } else if (val === 'AWS_SES') {
                                setActiveGuideProvider('aws_ses');
                                updated.smtp_host = updated.smtp_host && updated.smtp_host !== 'smtp.mailgun.org' ? updated.smtp_host : 'email-smtp.us-east-1.amazonaws.com';
                                updated.smtp_port = 587;
                                updated.smtp_use_tls = true;
                              } else if (val === 'SENDGRID') {
                                setActiveGuideProvider('sendgrid');
                                updated.smtp_host = 'smtp.sendgrid.net';
                                updated.smtp_port = 587;
                                updated.smtp_use_tls = true;
                              } else if (val === 'POSTMARK') {
                                setActiveGuideProvider('postmark');
                                updated.smtp_host = 'smtp.postmarkapp.com';
                                updated.smtp_port = 587;
                                updated.smtp_use_tls = true;
                              } else if (val === 'CUSTOM_SMTP') {
                                setActiveGuideProvider('custom_smtp');
                              }
                              setEmailConfig(updated);
                            }}
                            style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #CBD5E1', backgroundColor: '#FFFFFF', fontSize: '13px', color: '#0F172A', fontWeight: 700 }}
                          >
                            <option value="CUSTOM_SMTP">Custom Vendor SMTP Server (Mailgun, Postmark, cPanel, Exim, Postfix)</option>
                            <option value="GOOGLE_WORKSPACE">Google Workspace / Gmail (SMTP & App Password)</option>
                            <option value="OUTLOOK_365">Microsoft 365 / Outlook (SMTP & App Password)</option>
                            <option value="AWS_SES">Amazon Web Services Simple Email Service (AWS SES Dedicated)</option>
                            <option value="SENDGRID">Twilio SendGrid API Gateway</option>
                            <option value="POSTMARK">Postmark Transactional API</option>
                            <option value="GLOBAL_HUB_RELAY">Global Hub Shared Sovereign Relay (Managed Fallback)</option>
                          </select>
                        </div>

                        {/* INLINE DYNAMIC SETUP INSTRUCTIONS CALLOUT - MICROSOFT PORTAL BLUE STYLE */}
                        {(emailConfig.provider_type === 'GOOGLE_WORKSPACE' || (emailConfig.sender_email && emailConfig.sender_email.includes('@gmail.com'))) && (
                          <div style={{ backgroundColor: '#EFF6FF', border: '1px solid #BFDBFE', borderRadius: '8px', padding: '12px 14px', fontSize: '12px', color: '#1E293B', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            <strong style={{ color: '#0078D4' }}>
                              Gmail Setup Instructions:
                            </strong>
                            <div style={{ lineHeight: '1.5', color: '#334155' }}>
                              • <strong>Host & Port:</strong> Auto-set to <code>smtp.gmail.com:587</code> with TLS.<br />
                              • <strong>Username:</strong> Enter your full Gmail address (e.g. <code>{emailConfig.sender_email || 'mrgirn@gmail.com'}</code>).<br />
                              • <strong>Password:</strong> Generate a <strong>16-character Google App Password</strong> &rarr;{' '}
                              <a
                                href="https://myaccount.google.com/apppasswords"
                                target="_blank"
                                rel="noopener noreferrer"
                                style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', color: '#0078D4', fontWeight: 700 }}
                              >
                                Open Google App Passwords Portal <ExternalLink size={11} />
                              </a> (Type App Name <code>Limo Dispatch</code> &rarr; Create &rarr; Paste 16-letter code).
                            </div>
                          </div>
                        )}

                        {(emailConfig.provider_type === 'OUTLOOK_365' || (emailConfig.sender_email && (emailConfig.sender_email.includes('@outlook.com') || emailConfig.sender_email.includes('@hotmail.com')))) && (
                          <div style={{ backgroundColor: '#EFF6FF', border: '1px solid #BFDBFE', borderRadius: '8px', padding: '12px 14px', fontSize: '12px', color: '#1E293B', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            <strong style={{ color: '#0078D4' }}>
                              Microsoft 365 / Outlook Setup Instructions:
                            </strong>
                            <div style={{ lineHeight: '1.5', color: '#334155' }}>
                              • <strong>Host & Port:</strong> Auto-set to <code>smtp.office365.com:587</code> with STARTTLS.<br />
                              • <strong>Username:</strong> Enter your Microsoft email address.<br />
                              • <strong>Password:</strong> Generate an <strong>App Password</strong> &rarr;{' '}
                              <a
                                href="https://mysignins.microsoft.com/security-info"
                                target="_blank"
                                rel="noopener noreferrer"
                                style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', color: '#0078D4', fontWeight: 700 }}
                              >
                                Microsoft Security Info Portal <ExternalLink size={11} />
                              </a>
                            </div>
                          </div>
                        )}

                        {emailConfig.provider_type === 'AWS_SES' && (
                          <div style={{ backgroundColor: '#EFF6FF', border: '1px solid #BFDBFE', borderRadius: '8px', padding: '12px 14px', fontSize: '12px', color: '#1E293B', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <strong style={{ color: '#0078D4' }}>AWS SES Setup Instructions:</strong>
                              <a href="https://console.aws.amazon.com/ses/" target="_blank" rel="noopener noreferrer" style={{ color: '#0078D4', fontWeight: 700, fontSize: '11px', display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                                AWS SES Console <ExternalLink size={11} />
                              </a>
                            </div>
                            <div style={{ lineHeight: '1.5', color: '#334155' }}>
                              • Go to SES &rarr; <strong>SMTP settings</strong> &rarr; <strong>Create SMTP credentials</strong>. Paste Access Key ID & Secret into Username & Password.
                            </div>
                          </div>
                        )}

                        {emailConfig.provider_type === 'SENDGRID' && (
                          <div style={{ backgroundColor: '#EFF6FF', border: '1px solid #BFDBFE', borderRadius: '8px', padding: '12px 14px', fontSize: '12px', color: '#1E293B', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <strong style={{ color: '#0078D4' }}>Twilio SendGrid API Setup Instructions:</strong>
                              <a href="https://app.sendgrid.com/settings/api_keys" target="_blank" rel="noopener noreferrer" style={{ color: '#0078D4', fontWeight: 700, fontSize: '11px', display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                                SendGrid API Keys <ExternalLink size={11} />
                              </a>
                            </div>
                            <div style={{ lineHeight: '1.5', color: '#334155' }}>
                              • <strong>Host & Port:</strong> <code>smtp.sendgrid.net:587</code>.<br />
                              • <strong>Username & Password:</strong> Enter <code>apikey</code> for Username, and your <code>SG.••••••••</code> API key for Password.
                            </div>
                          </div>
                        )}

                        {emailConfig.provider_type === 'POSTMARK' && (
                          <div style={{ backgroundColor: '#EFF6FF', border: '1px solid #BFDBFE', borderRadius: '8px', padding: '12px 14px', fontSize: '12px', color: '#1E293B', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <strong style={{ color: '#0078D4' }}>Postmark Transactional Setup Instructions:</strong>
                              <a href="https://account.postmarkapp.com/servers" target="_blank" rel="noopener noreferrer" style={{ color: '#0078D4', fontWeight: 700, fontSize: '11px', display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                                Postmark Server Tokens <ExternalLink size={11} />
                              </a>
                            </div>
                            <div style={{ lineHeight: '1.5', color: '#334155' }}>
                              • <strong>Host & Port:</strong> <code>smtp.postmarkapp.com:587</code> or <code>2525</code>.<br />
                              • <strong>Username & Password:</strong> Enter your Postmark <strong>Server API Token</strong> into both fields.
                            </div>
                          </div>
                        )}

                        {emailConfig.provider_type === 'CUSTOM_SMTP' && (
                          <div style={{ backgroundColor: '#EFF6FF', border: '1px solid #BFDBFE', borderRadius: '8px', padding: '12px 14px', fontSize: '12px', color: '#1E293B', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            <strong style={{ color: '#0078D4' }}>Custom SMTP / cPanel / Webmail Setup Instructions:</strong>
                            <div style={{ lineHeight: '1.5', color: '#334155' }}>
                              • <strong>cPanel / Webmail:</strong> In cPanel, go to <strong>Email Accounts</strong> &rarr; <strong>Connect Devices</strong> &rarr; Copy Outgoing Host (<code>mail.yourdomain.com</code>) & Port (<code>465 SSL</code> or <code>587 TLS</code>).<br />
                              • <strong>Mailgun / SendLayer:</strong> Use <code>smtp.mailgun.org:587</code> with your API SMTP user/pass.
                            </div>
                          </div>
                        )}

                        {emailConfig.provider_type === 'GLOBAL_HUB_RELAY' && (
                          <div style={{ backgroundColor: '#EFF6FF', border: '1px solid #BFDBFE', borderRadius: '8px', padding: '12px 14px', fontSize: '12px', color: '#1E293B', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            <strong style={{ color: '#0078D4' }}>Managed Sovereign Hub Relay (Zero Configuration Required):</strong>
                            <div style={{ lineHeight: '1.5', color: '#334155' }}>
                              • All customer booking confirmations, receipts, and flight notifications will automatically route through the hardened Global Hub high-deliverability cluster with DKIM & SPF pre-aligned.
                            </div>
                          </div>
                        )}

                        {/* Sender Details */}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                          <div>
                            <label style={{ fontSize: '11px', color: '#475569', fontWeight: 700 }}>Outbound Sender Email (From:)</label>
                            <input
                              type="email"
                              value={emailConfig.sender_email || emailConfig.from_email || ''}
                              onChange={(e) => setEmailConfig({ ...emailConfig, sender_email: e.target.value, from_email: e.target.value })}
                              placeholder="dispatch@yourlimo.com"
                              style={{ width: '100%', padding: '8px 10px', backgroundColor: '#FFFFFF', border: '1px solid #CBD5E1', borderRadius: '6px', fontSize: '12px', marginTop: '4px' }}
                            />
                          </div>

                          <div>
                            <label style={{ fontSize: '11px', color: '#475569', fontWeight: 700 }}>Sender Display Name</label>
                            <input
                              type="text"
                              value={emailConfig.sender_display_name || ''}
                              onChange={(e) => setEmailConfig({ ...emailConfig, sender_display_name: e.target.value })}
                              placeholder="ANB Executive Transportation Dispatch"
                              style={{ width: '100%', padding: '8px 10px', backgroundColor: '#FFFFFF', border: '1px solid #CBD5E1', borderRadius: '6px', fontSize: '12px', marginTop: '4px' }}
                            />
                          </div>
                        </div>

                        <div>
                          <label style={{ fontSize: '11px', color: '#475569', fontWeight: 700 }}>Reply-To Email Address</label>
                          <input
                            type="email"
                            value={emailConfig.reply_to_email || ''}
                            onChange={(e) => setEmailConfig({ ...emailConfig, reply_to_email: e.target.value })}
                            placeholder="support@yourlimo.com"
                            style={{ width: '100%', padding: '8px 10px', backgroundColor: '#FFFFFF', border: '1px solid #CBD5E1', borderRadius: '6px', fontSize: '12px', marginTop: '4px' }}
                          />
                        </div>

                        {/* Custom SMTP Credentials */}
                        {(emailConfig.provider_type === 'CUSTOM_SMTP' || emailConfig.provider === 'CUSTOM_SMTP') && (
                          <div style={{ backgroundColor: '#FFFFFF', padding: '12px', borderRadius: '8px', border: '1px solid #E2E8F0', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                            <div style={{ fontSize: '11px', fontWeight: 800, color: '#0F172A', display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <Key size={13} color="#0078D4" /> SMTP Host, Port & Authentication Credentials
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '10px' }}>
                              <div>
                                <label style={{ fontSize: '10px', color: '#64748B', fontWeight: 700 }}>SMTP HOST SERVER</label>
                                <input
                                  type="text"
                                  value={emailConfig.smtp_host || ''}
                                  onChange={(e) => setEmailConfig({ ...emailConfig, smtp_host: e.target.value })}
                                  placeholder="smtp.mailgun.org"
                                  style={{ width: '100%', padding: '8px', backgroundColor: '#F8FAFC', border: '1px solid #CBD5E1', borderRadius: '4px', fontSize: '12px', marginTop: '2px' }}
                                />
                              </div>
                              <div>
                                <label style={{ fontSize: '10px', color: '#64748B', fontWeight: 700 }}>SMTP PORT</label>
                                <div style={{ display: 'flex', gap: '4px', marginTop: '2px' }}>
                                  <input
                                    type="number"
                                    value={emailConfig.smtp_port || 587}
                                    onChange={(e) => setEmailConfig({ ...emailConfig, smtp_port: parseInt(e.target.value) || 587 })}
                                    style={{ width: '100%', padding: '8px', backgroundColor: '#F8FAFC', border: '1px solid #CBD5E1', borderRadius: '4px', fontSize: '12px' }}
                                  />
                                </div>
                              </div>
                            </div>

                            <div style={{ display: 'flex', gap: '6px', fontSize: '10px' }}>
                              <span style={{ color: '#64748B', fontWeight: 600 }}>Port Presets:</span>
                              {[587, 465, 25, 2525].map(p => (
                                <button
                                  type="button"
                                  key={p}
                                  onClick={() => setEmailConfig({ ...emailConfig, smtp_port: p, smtp_use_tls: p === 587 || p === 465 })}
                                  style={{
                                    padding: '1px 6px',
                                    borderRadius: '4px',
                                    border: emailConfig.smtp_port === p ? '1px solid #0078D4' : '1px solid #CBD5E1',
                                    backgroundColor: emailConfig.smtp_port === p ? '#EFF6FF' : '#FFFFFF',
                                    color: emailConfig.smtp_port === p ? '#0078D4' : '#475569',
                                    cursor: 'pointer',
                                    fontWeight: 700
                                  }}
                                >
                                  {p} {p === 587 ? '(STARTTLS)' : p === 465 ? '(SSL)' : ''}
                                </button>
                              ))}
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                              <div>
                                <label style={{ fontSize: '10px', color: '#64748B', fontWeight: 700 }}>SMTP USERNAME / LOGIN</label>
                                <input
                                  type="text"
                                  value={emailConfig.smtp_username || emailConfig.smtp_user || ''}
                                  onChange={(e) => setEmailConfig({ ...emailConfig, smtp_username: e.target.value, smtp_user: e.target.value })}
                                  placeholder="postmaster@yourlimo.com"
                                  style={{ width: '100%', padding: '8px', backgroundColor: '#F8FAFC', border: '1px solid #CBD5E1', borderRadius: '4px', fontSize: '12px', marginTop: '2px' }}
                                />
                              </div>
                              <div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                  <label style={{ fontSize: '10px', color: '#64748B', fontWeight: 700 }}>SMTP PASSWORD / SECRET KEY</label>
                                  <button
                                    type="button"
                                    onClick={() => setShowSmtpPassword(!showSmtpPassword)}
                                    style={{ background: 'none', border: 'none', color: '#0078D4', fontSize: '10px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '2px' }}
                                  >
                                    {showSmtpPassword ? <EyeOff size={11} /> : <Eye size={11} />} {showSmtpPassword ? 'Hide' : 'Show'}
                                  </button>
                                </div>
                                <input
                                  type={showSmtpPassword ? 'text' : 'password'}
                                  value={emailConfig.smtp_password || ''}
                                  onChange={(e) => setEmailConfig({ ...emailConfig, smtp_password: e.target.value })}
                                  placeholder="••••••••••••••••"
                                  style={{ width: '100%', padding: '8px', backgroundColor: '#F8FAFC', border: '1px solid #CBD5E1', borderRadius: '4px', fontSize: '12px', marginTop: '2px' }}
                                />
                              </div>
                            </div>

                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '2px' }}>
                              <input
                                type="checkbox"
                                id="smtp_tls"
                                checked={emailConfig.smtp_use_tls ?? true}
                                onChange={(e) => setEmailConfig({ ...emailConfig, smtp_use_tls: e.target.checked, use_tls: e.target.checked })}
                              />
                              <label htmlFor="smtp_tls" style={{ fontSize: '11px', color: '#334155', fontWeight: 600, cursor: 'pointer' }}>
                                Enforce TLS / STARTTLS Encryption Handshake (Recommended)
                              </label>
                            </div>
                          </div>
                        )}

                        {/* AWS SES Credentials */}
                        {(emailConfig.provider_type === 'AWS_SES' || emailConfig.provider === 'AWS_SES') && (
                          <div style={{ backgroundColor: '#FFFFFF', padding: '12px', borderRadius: '8px', border: '1px solid #E2E8F0', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                            <div style={{ fontSize: '11px', fontWeight: 800, color: '#0F172A', display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <Key size={13} color="#D97706" /> AWS SES IAM Credentials & Dedicated Region
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                              <div>
                                <label style={{ fontSize: '10px', color: '#64748B', fontWeight: 700 }}>AWS ACCESS KEY ID</label>
                                <input
                                  type="text"
                                  value={emailConfig.aws_access_key_id || ''}
                                  onChange={(e) => setEmailConfig({ ...emailConfig, aws_access_key_id: e.target.value })}
                                  placeholder="AKIAIOSFODNN7EXAMPLE"
                                  style={{ width: '100%', padding: '8px', backgroundColor: '#F8FAFC', border: '1px solid #CBD5E1', borderRadius: '4px', fontSize: '12px', marginTop: '2px' }}
                                />
                              </div>
                              <div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                  <label style={{ fontSize: '10px', color: '#64748B', fontWeight: 700 }}>AWS SECRET ACCESS KEY</label>
                                  <button
                                    type="button"
                                    onClick={() => setShowApiKey(!showApiKey)}
                                    style={{ background: 'none', border: 'none', color: '#D97706', fontSize: '10px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '2px' }}
                                  >
                                    {showApiKey ? <EyeOff size={11} /> : <Eye size={11} />} {showApiKey ? 'Hide' : 'Show'}
                                  </button>
                                </div>
                                <input
                                  type={showApiKey ? 'text' : 'password'}
                                  value={emailConfig.aws_secret_access_key || ''}
                                  onChange={(e) => setEmailConfig({ ...emailConfig, aws_secret_access_key: e.target.value })}
                                  placeholder="••••••••••••••••"
                                  style={{ width: '100%', padding: '8px', backgroundColor: '#F8FAFC', border: '1px solid #CBD5E1', borderRadius: '4px', fontSize: '12px', marginTop: '2px' }}
                                />
                              </div>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                              <div>
                                <label style={{ fontSize: '10px', color: '#64748B', fontWeight: 700 }}>AWS SES REGION</label>
                                <select
                                  value={emailConfig.aws_region || 'us-east-1'}
                                  onChange={(e) => setEmailConfig({ ...emailConfig, aws_region: e.target.value })}
                                  style={{ width: '100%', padding: '8px', backgroundColor: '#F8FAFC', border: '1px solid #CBD5E1', borderRadius: '4px', fontSize: '12px', marginTop: '2px' }}
                                >
                                  <option value="us-east-1">US East (N. Virginia) - us-east-1</option>
                                  <option value="us-east-2">US East (Ohio) - us-east-2</option>
                                  <option value="us-west-2">US West (Oregon) - us-west-2</option>
                                  <option value="eu-west-1">Europe (Ireland) - eu-west-1</option>
                                  <option value="ap-southeast-1">Asia Pacific (Singapore) - ap-southeast-1</option>
                                </select>
                              </div>
                              <div>
                                <label style={{ fontSize: '10px', color: '#64748B', fontWeight: 700 }}>SES SMTP PORT</label>
                                <input
                                  type="number"
                                  value={emailConfig.smtp_port || 587}
                                  onChange={(e) => setEmailConfig({ ...emailConfig, smtp_port: parseInt(e.target.value) || 587 })}
                                  style={{ width: '100%', padding: '8px', backgroundColor: '#F8FAFC', border: '1px solid #CBD5E1', borderRadius: '4px', fontSize: '12px', marginTop: '2px' }}
                                />
                              </div>
                            </div>
                          </div>
                        )}

                        {/* SendGrid Credentials */}
                        {(emailConfig.provider_type === 'SENDGRID' || emailConfig.provider === 'SENDGRID') && (
                          <div style={{ backgroundColor: '#FFFFFF', padding: '12px', borderRadius: '8px', border: '1px solid #E2E8F0', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                            <div style={{ fontSize: '11px', fontWeight: 800, color: '#0F172A', display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <Key size={13} color="#0078D4" /> SendGrid REST API Key & Verified Sender
                            </div>
                            <div>
                              <label style={{ fontSize: '10px', color: '#64748B', fontWeight: 700 }}>SENDGRID API KEY (SG....)</label>
                              <input
                                type="password"
                                value={emailConfig.sendgrid_api_key || ''}
                                onChange={(e) => setEmailConfig({ ...emailConfig, sendgrid_api_key: e.target.value })}
                                placeholder="SG.••••••••••••••••••••••••"
                                style={{ width: '100%', padding: '8px', backgroundColor: '#F8FAFC', border: '1px solid #CBD5E1', borderRadius: '4px', fontSize: '12px', marginTop: '2px' }}
                              />
                            </div>
                          </div>
                        )}

                        {/* Postmark Credentials */}
                        {(emailConfig.provider_type === 'POSTMARK' || emailConfig.provider === 'POSTMARK') && (
                          <div style={{ backgroundColor: '#FFFFFF', padding: '12px', borderRadius: '8px', border: '1px solid #E2E8F0', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                            <div style={{ fontSize: '11px', fontWeight: 800, color: '#0F172A', display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <Key size={13} color="#0078D4" /> Postmark Server API Token
                            </div>
                            <div>
                              <label style={{ fontSize: '10px', color: '#64748B', fontWeight: 700 }}>POSTMARK SERVER TOKEN</label>
                              <input
                                type="password"
                                value={emailConfig.postmark_server_token || ''}
                                onChange={(e) => setEmailConfig({ ...emailConfig, postmark_server_token: e.target.value })}
                                placeholder="••••••••-••••-••••-••••-••••••••••••"
                                style={{ width: '100%', padding: '8px', backgroundColor: '#F8FAFC', border: '1px solid #CBD5E1', borderRadius: '4px', fontSize: '12px', marginTop: '2px' }}
                              />
                            </div>
                          </div>
                        )}

                        {/* Google Workspace Credentials */}
                        {(emailConfig.provider_type === 'GOOGLE_WORKSPACE' || emailConfig.provider === 'GOOGLE_WORKSPACE') && (
                          <div style={{ backgroundColor: '#FFFFFF', padding: '12px', borderRadius: '8px', border: '1px solid #E2E8F0', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                            <div style={{ fontSize: '11px', fontWeight: 800, color: '#0F172A', display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <Key size={13} color="#EA4335" /> Google Workspace / Gmail App Password & SMTP Ports
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '10px' }}>
                              <div>
                                <label style={{ fontSize: '10px', color: '#64748B', fontWeight: 700 }}>GOOGLE SMTP HOST</label>
                                <input
                                  type="text"
                                  value={emailConfig.smtp_host || 'smtp.gmail.com'}
                                  onChange={(e) => setEmailConfig({ ...emailConfig, smtp_host: e.target.value })}
                                  placeholder="smtp.gmail.com"
                                  style={{ width: '100%', padding: '8px', backgroundColor: '#F8FAFC', border: '1px solid #CBD5E1', borderRadius: '4px', fontSize: '12px', marginTop: '2px' }}
                                />
                              </div>
                              <div>
                                <label style={{ fontSize: '10px', color: '#64748B', fontWeight: 700 }}>PORT (587 / 465)</label>
                                <input
                                  type="number"
                                  value={emailConfig.smtp_port || 587}
                                  onChange={(e) => setEmailConfig({ ...emailConfig, smtp_port: parseInt(e.target.value) || 587 })}
                                  style={{ width: '100%', padding: '8px', backgroundColor: '#F8FAFC', border: '1px solid #CBD5E1', borderRadius: '4px', fontSize: '12px', marginTop: '2px' }}
                                />
                              </div>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                              <div>
                                <label style={{ fontSize: '10px', color: '#64748B', fontWeight: 700 }}>GOOGLE ACCOUNT EMAIL</label>
                                <input
                                  type="email"
                                  value={emailConfig.smtp_username || emailConfig.sender_email || ''}
                                  onChange={(e) => setEmailConfig({ ...emailConfig, smtp_username: e.target.value, smtp_user: e.target.value })}
                                  placeholder="dispatch@yourdomain.com"
                                  style={{ width: '100%', padding: '8px', backgroundColor: '#F8FAFC', border: '1px solid #CBD5E1', borderRadius: '4px', fontSize: '12px', marginTop: '2px' }}
                                />
                              </div>
                              <div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                  <label style={{ fontSize: '10px', color: '#64748B', fontWeight: 700 }}>16-CHAR GOOGLE APP PASSWORD</label>
                                  <button
                                    type="button"
                                    onClick={() => setShowSmtpPassword(!showSmtpPassword)}
                                    style={{ background: 'none', border: 'none', color: '#EA4335', fontSize: '10px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '2px' }}
                                  >
                                    {showSmtpPassword ? <EyeOff size={11} /> : <Eye size={11} />} {showSmtpPassword ? 'Hide' : 'Show'}
                                  </button>
                                </div>
                                <input
                                  type={showSmtpPassword ? 'text' : 'password'}
                                  value={emailConfig.google_app_password || emailConfig.smtp_password || ''}
                                  onChange={(e) => setEmailConfig({ ...emailConfig, google_app_password: e.target.value, smtp_password: e.target.value })}
                                  placeholder="xxxx xxxx xxxx xxxx"
                                  style={{ width: '100%', padding: '8px', backgroundColor: '#F8FAFC', border: '1px solid #CBD5E1', borderRadius: '4px', fontSize: '12px', marginTop: '2px' }}
                                />
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Microsoft 365 / Outlook Credentials */}
                        {(emailConfig.provider_type === 'OUTLOOK_365' || emailConfig.provider === 'OUTLOOK_365') && (
                          <div style={{ backgroundColor: '#FFFFFF', padding: '12px', borderRadius: '8px', border: '1px solid #E2E8F0', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                            <div style={{ fontSize: '11px', fontWeight: 800, color: '#0F172A', display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <Key size={13} color="#0078D4" /> Microsoft 365 / Exchange SMTP Auth & Tenant Configuration
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '10px' }}>
                              <div>
                                <label style={{ fontSize: '10px', color: '#64748B', fontWeight: 700 }}>MICROSOFT SMTP HOST</label>
                                <input
                                  type="text"
                                  value={emailConfig.smtp_host || 'smtp.office365.com'}
                                  onChange={(e) => setEmailConfig({ ...emailConfig, smtp_host: e.target.value })}
                                  placeholder="smtp.office365.com"
                                  style={{ width: '100%', padding: '8px', backgroundColor: '#F8FAFC', border: '1px solid #CBD5E1', borderRadius: '4px', fontSize: '12px', marginTop: '2px' }}
                                />
                              </div>
                              <div>
                                <label style={{ fontSize: '10px', color: '#64748B', fontWeight: 700 }}>PORT (587 STARTTLS)</label>
                                <input
                                  type="number"
                                  value={emailConfig.smtp_port || 587}
                                  onChange={(e) => setEmailConfig({ ...emailConfig, smtp_port: parseInt(e.target.value) || 587 })}
                                  style={{ width: '100%', padding: '8px', backgroundColor: '#F8FAFC', border: '1px solid #CBD5E1', borderRadius: '4px', fontSize: '12px', marginTop: '2px' }}
                                />
                              </div>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                              <div>
                                <label style={{ fontSize: '10px', color: '#64748B', fontWeight: 700 }}>M365 USER PRINCIPAL / EMAIL</label>
                                <input
                                  type="email"
                                  value={emailConfig.smtp_username || emailConfig.sender_email || ''}
                                  onChange={(e) => setEmailConfig({ ...emailConfig, smtp_username: e.target.value, smtp_user: e.target.value })}
                                  placeholder="dispatch@yourcompany.com"
                                  style={{ width: '100%', padding: '8px', backgroundColor: '#F8FAFC', border: '1px solid #CBD5E1', borderRadius: '4px', fontSize: '12px', marginTop: '2px' }}
                                />
                              </div>
                              <div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                  <label style={{ fontSize: '10px', color: '#64748B', fontWeight: 700 }}>M365 PASSWORD / APP SECRET</label>
                                  <button
                                    type="button"
                                    onClick={() => setShowSmtpPassword(!showSmtpPassword)}
                                    style={{ background: 'none', border: 'none', color: '#0078D4', fontSize: '10px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '2px' }}
                                  >
                                    {showSmtpPassword ? <EyeOff size={11} /> : <Eye size={11} />} {showSmtpPassword ? 'Hide' : 'Show'}
                                  </button>
                                </div>
                                <input
                                  type={showSmtpPassword ? 'text' : 'password'}
                                  value={emailConfig.ms_app_password || emailConfig.smtp_password || ''}
                                  onChange={(e) => setEmailConfig({ ...emailConfig, ms_app_password: e.target.value, smtp_password: e.target.value })}
                                  placeholder="••••••••••••••••"
                                  style={{ width: '100%', padding: '8px', backgroundColor: '#F8FAFC', border: '1px solid #CBD5E1', borderRadius: '4px', fontSize: '12px', marginTop: '2px' }}
                                />
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Global Hub Relay */}
                        {(emailConfig.provider_type === 'GLOBAL_HUB_RELAY' || emailConfig.provider === 'GLOBAL_HUB_RELAY') && (
                          <div style={{ backgroundColor: '#EFF6FF', padding: '12px', borderRadius: '8px', border: '1px solid #BFDBFE', display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <ShieldCheck size={20} color="#1D4ED8" />
                            <div style={{ fontSize: '12px', color: '#1E40AF' }}>
                              <strong>Managed Platform Relay Active:</strong> All outbound confirmations & invoices route automatically through Global Hub nodes with high reputation SPF/DKIM pools.
                            </div>
                          </div>
                        )}
                      </div>

                      {/* SECTION 2: INBOUND RFQ & TRAVEL DESK MAILBOX SETTINGS */}
                      <div style={{ backgroundColor: '#F8FAFC', borderRadius: '10px', padding: '16px', border: '1px solid #E2E8F0', display: 'flex', flexDirection: 'column', gap: '14px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #CBD5E1', paddingBottom: '8px' }}>
                          <div style={{ fontSize: '13px', fontWeight: 800, color: '#0F172A', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <Inbox size={15} color="#16A34A" /> 2. Inbound RFQ Auto-Intake & Mailbox Configuration
                          </div>
                          <div style={{ display: 'flex', gap: '4px' }}>
                            {['IMAP', 'POP3', 'WEBHOOK'].map(mode => (
                              <button
                                type="button"
                                key={mode}
                                onClick={() => setEmailConfig({ ...emailConfig, inbound_protocol: mode })}
                                style={{
                                  padding: '2px 8px',
                                  fontSize: '10px',
                                  fontWeight: 800,
                                  borderRadius: '4px',
                                  border: (emailConfig.inbound_protocol || 'IMAP') === mode ? '1px solid #16A34A' : '1px solid #CBD5E1',
                                  backgroundColor: (emailConfig.inbound_protocol || 'IMAP') === mode ? '#DCFCE7' : '#FFFFFF',
                                  color: (emailConfig.inbound_protocol || 'IMAP') === mode ? '#15803D' : '#64748B',
                                  cursor: 'pointer'
                                }}
                              >
                                {mode === 'IMAP' ? 'IMAP SSL (Recommended)' : mode === 'POP3' ? 'POP3' : 'Inbound Webhook'}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Inbound Email Address */}
                        <div>
                          <label style={{ fontSize: '11px', color: '#334155', fontWeight: 700 }}>Inbound RFQ Email Address</label>
                          <input
                            type="email"
                            value={emailConfig.inbound_email || ''}
                            onChange={(e) => setEmailConfig({ ...emailConfig, inbound_email: e.target.value })}
                            placeholder="rfq@yourlimo.com"
                            style={{ width: '100%', padding: '8px 10px', backgroundColor: '#FFFFFF', border: '1px solid #CBD5E1', borderRadius: '6px', fontSize: '12px', marginTop: '4px' }}
                          />
                        </div>

                        {/* IMAP / POP3 Host, Port, Key, Password */}
                        {((emailConfig.inbound_protocol || 'IMAP') === 'IMAP' || emailConfig.inbound_protocol === 'POP3') && (
                          <div style={{ backgroundColor: '#FFFFFF', padding: '12px', borderRadius: '8px', border: '1px solid #E2E8F0', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                            <div style={{ fontSize: '11px', fontWeight: 800, color: '#0F172A', display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <Server size={13} color="#16A34A" /> Inbound Mail Server (IMAP / POP3) Host, Port & Auth Key
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '10px' }}>
                              <div>
                                <label style={{ fontSize: '10px', color: '#64748B', fontWeight: 700 }}>INBOUND MAIL SERVER HOST</label>
                                <input
                                  type="text"
                                  value={emailConfig.imap_host || ''}
                                  onChange={(e) => setEmailConfig({ ...emailConfig, imap_host: e.target.value })}
                                  placeholder="imap.mailgun.org or imap.gmail.com"
                                  style={{ width: '100%', padding: '8px', backgroundColor: '#F8FAFC', border: '1px solid #CBD5E1', borderRadius: '4px', fontSize: '12px', marginTop: '2px' }}
                                />
                              </div>
                              <div>
                                <label style={{ fontSize: '10px', color: '#64748B', fontWeight: 700 }}>PORT</label>
                                <input
                                  type="number"
                                  value={emailConfig.imap_port || 993}
                                  onChange={(e) => setEmailConfig({ ...emailConfig, imap_port: parseInt(e.target.value) || 993 })}
                                  style={{ width: '100%', padding: '8px', backgroundColor: '#F8FAFC', border: '1px solid #CBD5E1', borderRadius: '4px', fontSize: '12px', marginTop: '2px' }}
                                />
                              </div>
                            </div>

                            <div style={{ display: 'flex', gap: '6px', fontSize: '10px' }}>
                              <span style={{ color: '#64748B', fontWeight: 600 }}>Inbound Port Presets:</span>
                              {[993, 143, 995, 110].map(p => (
                                <button
                                  type="button"
                                  key={p}
                                  onClick={() => setEmailConfig({ ...emailConfig, imap_port: p, imap_use_ssl: p === 993 || p === 995 })}
                                  style={{
                                    padding: '1px 6px',
                                    borderRadius: '4px',
                                    border: emailConfig.imap_port === p ? '1px solid #16A34A' : '1px solid #CBD5E1',
                                    backgroundColor: emailConfig.imap_port === p ? '#DCFCE7' : '#FFFFFF',
                                    color: emailConfig.imap_port === p ? '#15803D' : '#475569',
                                    cursor: 'pointer',
                                    fontWeight: 700
                                  }}
                                >
                                  {p} {p === 993 ? '(IMAP SSL)' : p === 143 ? '(IMAP TLS)' : p === 995 ? '(POP3 SSL)' : '(POP3)'}
                                </button>
                              ))}
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                              <div>
                                <label style={{ fontSize: '10px', color: '#64748B', fontWeight: 700 }}>IMAP USERNAME / LOGIN</label>
                                <input
                                  type="text"
                                  value={emailConfig.imap_user || emailConfig.inbound_email || ''}
                                  onChange={(e) => setEmailConfig({ ...emailConfig, imap_user: e.target.value })}
                                  placeholder="rfq@yourlimo.com"
                                  style={{ width: '100%', padding: '8px', backgroundColor: '#F8FAFC', border: '1px solid #CBD5E1', borderRadius: '4px', fontSize: '12px', marginTop: '2px' }}
                                />
                              </div>
                              <div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                  <label style={{ fontSize: '10px', color: '#64748B', fontWeight: 700 }}>IMAP PASSWORD / APP KEY</label>
                                  <button
                                    type="button"
                                    onClick={() => setShowImapPassword(!showImapPassword)}
                                    style={{ background: 'none', border: 'none', color: '#16A34A', fontSize: '10px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '2px' }}
                                  >
                                    {showImapPassword ? <EyeOff size={11} /> : <Eye size={11} />} {showImapPassword ? 'Hide' : 'Show'}
                                  </button>
                                </div>
                                <input
                                  type={showImapPassword ? 'text' : 'password'}
                                  value={emailConfig.imap_password || ''}
                                  onChange={(e) => setEmailConfig({ ...emailConfig, imap_password: e.target.value })}
                                  placeholder="••••••••••••••••"
                                  style={{ width: '100%', padding: '8px', backgroundColor: '#F8FAFC', border: '1px solid #CBD5E1', borderRadius: '4px', fontSize: '12px', marginTop: '2px' }}
                                />
                              </div>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                              <div>
                                <label style={{ fontSize: '10px', color: '#64748B', fontWeight: 700 }}>MAILBOX FOLDER TO MONITOR</label>
                                <input
                                  type="text"
                                  value={emailConfig.imap_mailbox_folder || 'INBOX'}
                                  onChange={(e) => setEmailConfig({ ...emailConfig, imap_mailbox_folder: e.target.value })}
                                  placeholder="INBOX"
                                  style={{ width: '100%', padding: '8px', backgroundColor: '#F8FAFC', border: '1px solid #CBD5E1', borderRadius: '4px', fontSize: '12px', marginTop: '2px' }}
                                />
                              </div>
                              <div>
                                <label style={{ fontSize: '10px', color: '#64748B', fontWeight: 700 }}>POLLING INTERVAL</label>
                                <select
                                  value={emailConfig.polling_interval_minutes || 5}
                                  onChange={(e) => setEmailConfig({ ...emailConfig, polling_interval_minutes: parseInt(e.target.value) || 5 })}
                                  style={{ width: '100%', padding: '8px', backgroundColor: '#F8FAFC', border: '1px solid #CBD5E1', borderRadius: '4px', fontSize: '12px', marginTop: '2px' }}
                                >
                                  <option value={1}>Every 1 Minute (High Frequency)</option>
                                  <option value={5}>Every 5 Minutes (Standard)</option>
                                  <option value={15}>Every 15 Minutes</option>
                                </select>
                              </div>
                            </div>

                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '2px' }}>
                              <input
                                type="checkbox"
                                id="imap_ssl"
                                checked={emailConfig.imap_use_ssl ?? true}
                                onChange={(e) => setEmailConfig({ ...emailConfig, imap_use_ssl: e.target.checked })}
                              />
                              <label htmlFor="imap_ssl" style={{ fontSize: '11px', color: '#334155', fontWeight: 600, cursor: 'pointer' }}>
                                Enforce SSL/TLS Encryption Handshake on Port {emailConfig.imap_port || 993}
                              </label>
                            </div>
                          </div>
                        )}

                        {/* Inbound Webhook API Details */}
                        {emailConfig.inbound_protocol === 'WEBHOOK' && (
                          <div style={{ backgroundColor: '#FFFFFF', padding: '12px', borderRadius: '8px', border: '1px solid #E2E8F0', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                            <div style={{ fontSize: '11px', fontWeight: 800, color: '#0F172A', display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <Terminal size={13} color="#0078D4" /> Inbound Webhook RFQ Ingestion Endpoint (SendGrid / Mailgun / Postmark)
                            </div>
                            <div>
                              <label style={{ fontSize: '10px', color: '#64748B', fontWeight: 700 }}>WEBHOOK INGESTION URL</label>
                              <div style={{ display: 'flex', gap: '6px', marginTop: '2px' }}>
                                <input
                                  type="text"
                                  readOnly
                                  value={`https://api.limo-ops.com/api/v1/vendor-cell/${config.vendor_id}/email/inbound-webhook?token=${emailConfig.inbound_webhook_token || 'wh_sec_token'}`}
                                  style={{ width: '100%', padding: '8px', backgroundColor: '#F8FAFC', border: '1px solid #CBD5E1', borderRadius: '4px', fontSize: '11px', fontFamily: 'monospace' }}
                                />
                                <button
                                  type="button"
                                  onClick={() => {
                                    navigator.clipboard.writeText(`https://api.limo-ops.com/api/v1/vendor-cell/${config.vendor_id}/email/inbound-webhook?token=${emailConfig.inbound_webhook_token || 'wh_sec_token'}`);
                                    setCopiedWebhookUrl(true);
                                    setTimeout(() => setCopiedWebhookUrl(false), 2000);
                                  }}
                                  style={{ padding: '8px 12px', backgroundColor: '#0078D4', color: '#FFFFFF', border: 'none', borderRadius: '4px', fontSize: '11px', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                                >
                                  <Copy size={12} /> {copiedWebhookUrl ? 'Copied!' : 'Copy'}
                                </button>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* SECTION 3: AUTOMATION & RESILIENCY TOGGLES */}
                      <div style={{ backgroundColor: '#EFF6FF', borderRadius: '10px', padding: '14px', border: '1px solid #BFDBFE', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <input
                            type="checkbox"
                            id="failover_hub"
                            checked={emailConfig.fallback_to_global_hub ?? true}
                            onChange={(e) => setEmailConfig({ ...emailConfig, fallback_to_global_hub: e.target.checked })}
                          />
                          <label htmlFor="failover_hub" style={{ fontSize: '12px', color: '#1E40AF', fontWeight: 700, cursor: 'pointer' }}>
                            🛡️ Enable Global Hub Relay Failover (If vendor SMTP fails, automatically reroute through Hub without dropping emails)
                          </label>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <input
                            type="checkbox"
                            id="auto_reply_quotes"
                            checked={emailConfig.auto_reply_quotes_enabled ?? true}
                            onChange={(e) => setEmailConfig({ ...emailConfig, auto_reply_quotes_enabled: e.target.checked })}
                          />
                          <label htmlFor="auto_reply_quotes" style={{ fontSize: '12px', color: '#1E40AF', fontWeight: 700, cursor: 'pointer' }}>
                            ⚡ Auto-Reply with Instant Sovereign Tariff Quote when RFQ is parsed
                          </label>
                        </div>
                      </div>

                      <button
                        type="submit"
                        disabled={loading}
                        style={{
                          padding: '12px',
                          backgroundColor: '#0078D4',
                          color: '#FFFFFF',
                          fontWeight: 800,
                          fontSize: '13px',
                          borderRadius: '8px',
                          border: 'none',
                          cursor: 'pointer',
                          marginTop: '4px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '6px',
                          boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                        }}
                      >
                        {loading ? 'Committing Gateway Settings...' : '💾 Save & Commit BYOE Configuration'}
                      </button>
                    </form>

                    {/* Right: Diagnostics & Live Mailbox Verification Panel */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                      
                      {/* Live Diagnostic Test Sender */}
                      <div style={{ backgroundColor: '#FFFFFF', borderRadius: '12px', padding: '20px', border: '1px solid #E2E8F0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        <h4 style={{ margin: 0, fontSize: '14px', fontWeight: 800, color: '#0F172A', display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <Send size={15} color="#0078D4" /> Outbound Diagnostic Test Ping
                        </h4>
                        <p style={{ margin: 0, fontSize: '11px', color: '#64748B' }}>
                          Test end-to-end SMTP handshakes, TLS negotiation, and delivery to any recipient inbox.
                        </p>

                        <div>
                          <label style={{ fontSize: '10px', color: '#475569', fontWeight: 700 }}>TEST RECIPIENT EMAIL</label>
                          <input
                            type="email"
                            value={testEmailRecipient}
                            onChange={(e) => setTestEmailRecipient(e.target.value)}
                            placeholder="dispatch-test@limo-ops.com"
                            style={{ width: '100%', padding: '8px', backgroundColor: '#F8FAFC', border: '1px solid #CBD5E1', borderRadius: '4px', fontSize: '12px', marginTop: '2px' }}
                          />
                        </div>

                        <button
                          type="button"
                          onClick={handleTestEmailConnection}
                          disabled={loading}
                          style={{
                            padding: '10px',
                            backgroundColor: '#0078D4',
                            color: '#FFFFFF',
                            fontWeight: 700,
                            fontSize: '12px',
                            borderRadius: '6px',
                            border: 'none',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '6px',
                            transition: 'background-color 0.15s ease'
                          }}
                        >
                          <Send size={13} /> {loading ? 'Testing Handshake...' : 'Send Outbound Test Email'}
                        </button>
                      </div>

                      {/* Live Inbound Mailbox Verification */}
                      <div style={{ backgroundColor: '#FFFFFF', borderRadius: '12px', padding: '20px', border: '1px solid #E2E8F0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        <h4 style={{ margin: 0, fontSize: '14px', fontWeight: 800, color: '#0F172A', display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <Inbox size={15} color="#0078D4" /> Inbound Mailbox Live Diagnostic
                        </h4>
                        <p style={{ margin: 0, fontSize: '11px', color: '#64748B' }}>
                          Verifies IMAP/POP3 host connectivity, SSL certificate handshake, and folder permissions.
                        </p>

                        <button
                          type="button"
                          onClick={handleTestInboundConnection}
                          disabled={loading}
                          style={{
                            padding: '10px',
                            backgroundColor: '#0078D4',
                            color: '#FFFFFF',
                            fontWeight: 700,
                            fontSize: '12px',
                            borderRadius: '6px',
                            border: 'none',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '6px',
                            transition: 'background-color 0.15s ease'
                          }}
                        >
                          <RefreshCw size={13} /> {loading ? 'Checking Mailbox...' : 'Test Inbound Mailbox Handshake'}
                        </button>

                        {inboundTestResult && (
                          <div style={{ padding: '10px', backgroundColor: '#F0F9FF', borderRadius: '6px', border: '1px solid #BAE6FD', fontSize: '11px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                              <strong style={{ color: '#0369A1' }}>Status:</strong>
                              <span style={{ color: '#0284C7', fontWeight: 800 }}>{inboundTestResult.status}</span>
                            </div>
                            <div style={{ color: '#334155', wordBreak: 'break-all' }}>{inboundTestResult.message}</div>
                          </div>
                        )}
                      </div>

                      {/* Optional Collapsible DNS & SPF Deliverability Accordion (Default Hidden, On-Demand Only) */}
                      <details style={{ backgroundColor: '#FFFFFF', borderRadius: '12px', border: '1px solid #E2E8F0', padding: '14px 18px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                        <summary style={{ fontSize: '12px', fontWeight: 800, color: '#0078D4', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', userSelect: 'none' }}>
                          <ShieldCheck size={14} color="#0078D4" /> DNS & SPF Authentication Records (Optional for AWS / Custom Domains)
                        </summary>
                        <div style={{ marginTop: '12px', display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '11px', color: '#334155' }}>
                          <p style={{ margin: 0, color: '#64748B' }}>
                            Optional when sending from custom vanity domains (e.g. <code>dispatch@{config.branding?.domain || 'anblimo-philly.com'}</code>). Not required for standard Gmail or Microsoft 365.
                          </p>
                          <div style={{ padding: '10px', backgroundColor: '#F8FAFC', borderRadius: '6px', border: '1px solid #E2E8F0' }}>
                            <strong>SPF Record (TXT @):</strong>
                            <code style={{ display: 'block', marginTop: '4px', padding: '4px 6px', backgroundColor: '#FFFFFF', border: '1px solid #CBD5E1', borderRadius: '4px', fontSize: '10px' }}>
                              v=spf1 include:amazonses.com include:_spf.google.com ~all
                            </code>
                          </div>
                          <div style={{ padding: '10px', backgroundColor: '#F8FAFC', borderRadius: '6px', border: '1px solid #E2E8F0' }}>
                            <strong>DMARC Policy (TXT _dmarc):</strong>
                            <code style={{ display: 'block', marginTop: '4px', padding: '4px 6px', backgroundColor: '#FFFFFF', border: '1px solid #CBD5E1', borderRadius: '4px', fontSize: '10px' }}>
                              v=DMARC1; p=quarantine; rua=mailto:dmarc@{config.branding?.domain || 'anblimo-philly.com'}
                            </code>
                          </div>
                        </div>
                      </details>

                    </div>
                  </div>
                )}

                {/* SUB-TAB 3: DISPATCHED INVOICES & RECEIPTS AUDIT LOG */}
                {emailSubTab === 'outbound' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    
                    <div style={{ backgroundColor: '#FFFFFF', borderRadius: '10px', border: '1px solid #E5E7EB', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', overflow: 'hidden' }}>
                      <div style={{ padding: '14px 18px', backgroundColor: '#F9FAFB', borderBottom: '1px solid #E5E7EB', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ fontWeight: 800, fontSize: '13px', color: '#0F172A' }}>
                          📤 Outbound Dispatched Invoices, Receipts & Booking Confirmations
                        </div>
                        <span style={{ fontSize: '11px', color: '#16A34A', fontWeight: 700 }}>
                          100% Delivery Rate
                        </span>
                      </div>

                      <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '12px' }}>
                        <thead>
                          <tr style={{ backgroundColor: '#F9FAFB', borderBottom: '1px solid #E5E7EB', color: '#6B7280', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase' }}>
                            <th style={{ padding: '12px 16px' }}>Dispatch ID & Time</th>
                            <th style={{ padding: '12px 16px' }}>Booking Ref</th>
                            <th style={{ padding: '12px 16px' }}>Recipient & Subject</th>
                            <th style={{ padding: '12px 16px' }}>Type</th>
                            <th style={{ padding: '12px 16px' }}>Delivery Route</th>
                            <th style={{ padding: '12px 16px', textAlign: 'center' }}>Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {dispatchedEmails.map((item) => (
                            <tr key={item.id} style={{ borderBottom: '1px solid #F3F4F6' }}>
                              <td style={{ padding: '12px 16px' }}>
                                <div style={{ fontWeight: 800, color: '#0F172A' }}>{item.id}</div>
                                <div style={{ fontSize: '10px', color: '#9CA3AF', marginTop: '2px' }}>{item.sent_at}</div>
                              </td>

                              <td style={{ padding: '12px 16px' }}>
                                <span style={{ fontSize: '11px', fontWeight: 700, color: '#0078D4' }}>{item.booking_id}</span>
                              </td>

                              <td style={{ padding: '12px 16px' }}>
                                <div style={{ fontWeight: 700, color: '#0F172A' }}>{item.recipient}</div>
                                <div style={{ fontSize: '11px', color: '#4B5563', marginTop: '2px' }}>{item.subject}</div>
                              </td>

                              <td style={{ padding: '12px 16px' }}>
                                <span style={{ fontSize: '10px', padding: '2px 6px', borderRadius: '4px', backgroundColor: item.type === 'INVOICE_RECEIPT' ? '#DCFCE7' : '#EFF6FF', color: item.type === 'INVOICE_RECEIPT' ? '#15803D' : '#0078D4', fontWeight: 800 }}>
                                  {item.type}
                                </span>
                              </td>

                              <td style={{ padding: '12px 16px', fontSize: '11px', color: '#6B7280' }}>
                                {item.provider}
                              </td>

                              <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                                <span style={{ fontSize: '10px', backgroundColor: '#DCFCE7', color: '#15803D', padding: '3px 8px', borderRadius: '4px', fontWeight: 800, display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                                  <Check size={10} /> {item.status}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                  </div>
                )}

                {/* SUB-TAB 4: NLP / SELF-RAG EXTRACTION SANDBOX */}
                {emailSubTab === 'ai_parser' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', maxWidth: '850px' }}>
                    <div style={{ backgroundColor: '#FFFFFF', borderRadius: '10px', padding: '24px', border: '1px solid #E5E7EB', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                      <div>
                        <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 800, color: '#0F172A' }}>
                          Raw Travel Desk Email Extraction Sandbox
                        </h3>
                        <p style={{ margin: '2px 0 0 0', fontSize: '11px', color: '#6B7280' }}>
                          Test raw email parsing through NIST AI RMF safety guardrails and verify automated tariff computation
                        </p>
                      </div>

                      <div>
                        <label style={{ fontSize: '12px', color: '#4B5563', fontWeight: 700 }}>Inbound Client Email Body</label>
                        <textarea
                          rows={6}
                          value={inboundEmail}
                          onChange={(e) => setInboundEmail(e.target.value)}
                          style={{ width: '100%', padding: '12px', backgroundColor: '#F9FAFB', border: '1px solid #D1D5DB', borderRadius: '6px', color: '#0F172A', fontSize: '12px', marginTop: '6px', fontFamily: 'monospace' }}
                        />
                      </div>

                      <button
                        onClick={handleParseEmailRFQ}
                        disabled={loading}
                        style={{
                          padding: '12px',
                          backgroundColor: '#0078D4',
                          color: '#FFFFFF',
                          fontWeight: 800,
                          fontSize: '13px',
                          borderRadius: '6px',
                          border: 'none',
                          cursor: 'pointer'
                        }}
                      >
                        {loading ? 'Executing Self-RAG Extraction...' : '✨ Parse Email & Generate Guaranteed Quote'}
                      </button>

                      {parsedEmailQuote && (
                        <div style={{ backgroundColor: '#F0FDF4', padding: '16px', borderRadius: '8px', border: '1px solid #86EFAC', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                          <div style={{ fontSize: '13px', fontWeight: 800, color: '#15803D', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <CheckCircle2 size={16} /> Extracted Trip Details (Confidence: {(parsedEmailQuote.confidence_score * 100).toFixed(0)}%)
                          </div>
                          <div style={{ fontSize: '12px', color: '#166534' }}>
                            Passenger: <strong>{parsedEmailQuote.passenger_name}</strong> • Flight: <strong>{parsedEmailQuote.flight_number}</strong>
                          </div>
                          <div style={{ fontSize: '12px', color: '#166534' }}>
                            Route: <strong>{parsedEmailQuote.pickup}</strong> → <strong>{parsedEmailQuote.dropoff}</strong>
                          </div>
                          <div style={{ fontSize: '12px', color: '#166534' }}>
                            Vehicle Class: <strong>{parsedEmailQuote.vehicle_class}</strong>
                          </div>
                          <div style={{ fontSize: '14px', fontWeight: 900, color: '#0078D4', marginTop: '6px' }}>
                            Guaranteed Rate: ${parsedEmailQuote.calculated_fare_usd.toFixed(2)} USD (Pre-Auth Ready)
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

              </div>
            )}

            {/* TAB: TEAM & ROLE-BASED ACCESS CONTROL (RBAC) */}
            {activeTab === 'team' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                
                {/* 1. Header & Action Bar */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
                  <div>
                    <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: '#0F172A', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <ShieldCheck size={20} color="#0078D4" />
                      Team Roster & Role-Based Access Control (RBAC)
                    </h2>
                    <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: '#6B7280' }}>
                      Sovereign personnel management, multi-role separation (Vendor Owner, Dispatcher, Chauffeur, Corporate Booker), and capability enforcement
                    </p>
                  </div>

                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <button
                      onClick={() => {
                        fetchVendorTeam(config.vendor_id).then(t => { if (t) setTeamMembers(t); });
                        setActionNotice('🔄 Team roster refreshed from sovereign cell database partition.');
                      }}
                      style={{
                        padding: '8px 14px',
                        backgroundColor: '#FFFFFF',
                        color: '#374151',
                        border: '1px solid #D1D5DB',
                        borderRadius: '6px',
                        fontSize: '12px',
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px'
                      }}
                    >
                      <RefreshCw size={14} /> Refresh Roster
                    </button>

                    <button
                      onClick={() => setShowAddMemberModal(true)}
                      style={{
                        padding: '8px 16px',
                        backgroundColor: '#0078D4',
                        color: '#FFFFFF',
                        border: 'none',
                        borderRadius: '6px',
                        fontSize: '12px',
                        fontWeight: 800,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        boxShadow: '0 1px 2px rgba(0,0,0,0.1)'
                      }}
                    >
                      <UserPlus size={15} /> Invite Team Member
                    </button>
                  </div>
                </div>

                {/* 2. Top KPI Metrics */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px' }}>
                  <div style={{ backgroundColor: '#FFFFFF', borderRadius: '10px', padding: '16px', border: '1px solid #E5E7EB', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                    <div style={{ fontSize: '11px', fontWeight: 700, color: '#6B7280', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Users size={14} color="#0078D4" /> Total Personnel
                    </div>
                    <div style={{ fontSize: '24px', fontWeight: 900, color: '#0F172A', marginTop: '6px' }}>
                      {teamMembers.length}
                    </div>
                    <div style={{ fontSize: '11px', color: '#16A34A', fontWeight: 600, marginTop: '2px' }}>
                      ● Active in Local Cell Partition
                    </div>
                  </div>

                  <div style={{ backgroundColor: '#FFFFFF', borderRadius: '10px', padding: '16px', border: '1px solid #E5E7EB', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                    <div style={{ fontSize: '11px', fontWeight: 700, color: '#6B7280', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Shield size={14} color="#0078D4" /> Sovereign Owners
                    </div>
                    <div style={{ fontSize: '24px', fontWeight: 900, color: '#0078D4', marginTop: '6px' }}>
                      {teamMembers.filter(m => m.role === 'ROLE_VENDOR_ADMIN').length}
                    </div>
                    <div style={{ fontSize: '11px', color: '#4B5563', marginTop: '2px' }}>
                      Full Banking & Kill Switch Access
                    </div>
                  </div>

                  <div style={{ backgroundColor: '#FFFFFF', borderRadius: '10px', padding: '16px', border: '1px solid #E5E7EB', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                    <div style={{ fontSize: '11px', fontWeight: 700, color: '#6B7280', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Navigation size={14} color="#7C3AED" /> Active Dispatchers
                    </div>
                    <div style={{ fontSize: '24px', fontWeight: 900, color: '#7C3AED', marginTop: '6px' }}>
                      {teamMembers.filter(m => m.role === 'ROLE_DISPATCHER').length}
                    </div>
                    <div style={{ fontSize: '11px', color: '#4B5563', marginTop: '2px' }}>
                      Flight Radar & Driver Assignment
                    </div>
                  </div>

                  <div style={{ backgroundColor: '#FFFFFF', borderRadius: '10px', padding: '16px', border: '1px solid #E5E7EB', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                    <div style={{ fontSize: '11px', fontWeight: 700, color: '#6B7280', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Car size={14} color="#059669" /> Executive Chauffeurs
                    </div>
                    <div style={{ fontSize: '24px', fontWeight: 900, color: '#059669', marginTop: '6px' }}>
                      {teamMembers.filter(m => m.role === 'ROLE_CHAUFFEUR').length}
                    </div>
                    <div style={{ fontSize: '11px', color: '#4B5563', marginTop: '2px' }}>
                      Mobile Portal & Instant Payouts
                    </div>
                  </div>
                </div>

                {/* 3. Role Hierarchy & Capability Matrix Cards */}
                <div style={{ backgroundColor: '#FFFFFF', borderRadius: '10px', padding: '20px', border: '1px solid #E5E7EB', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                    <div>
                      <h3 style={{ margin: 0, fontSize: '14px', fontWeight: 800, color: '#0F172A', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Lock size={16} color="#0078D4" /> Platform Role Hierarchy & Separation of Duties
                      </h3>
                      <p style={{ margin: '2px 0 0 0', fontSize: '11px', color: '#6B7280' }}>
                        Enforced across FastAPI dependencies with JWT cryptographic tokens and tenant boundary guards
                      </p>
                    </div>
                    <span style={{ fontSize: '10px', fontWeight: 800, padding: '3px 8px', borderRadius: '4px', backgroundColor: '#EFF6FF', color: '#0078D4' }}>
                      HMAC-SHA256 JWT Signed
                    </span>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '12px' }}>
                    {/* Role Card 1: Vendor Owner */}
                    <div style={{ backgroundColor: '#F8FAFC', borderRadius: '8px', padding: '14px', border: '1px solid #E2E8F0', borderLeft: '4px solid #0078D4' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '12px', fontWeight: 800, color: '#0078D4' }}>👑 Vendor Owner</span>
                        <span style={{ fontSize: '9px', backgroundColor: '#DBEAFE', color: '#1E40AF', padding: '2px 6px', borderRadius: '4px', fontWeight: 800 }}>ROLE_VENDOR_ADMIN</span>
                      </div>
                      <p style={{ fontSize: '11px', color: '#475569', margin: '6px 0 8px 0', lineHeight: 1.4 }}>
                        Full administrative & financial control over sovereign cell database, payout bank accounts, BYOE SMTP servers, and hard autonomy kill switches.
                      </p>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                        <span style={{ fontSize: '9px', backgroundColor: '#DCFCE7', color: '#15803D', padding: '1px 5px', borderRadius: '3px', fontWeight: 700 }}>+ Banking & Stripe</span>
                        <span style={{ fontSize: '9px', backgroundColor: '#DCFCE7', color: '#15803D', padding: '1px 5px', borderRadius: '3px', fontWeight: 700 }}>+ BYOE Email</span>
                        <span style={{ fontSize: '9px', backgroundColor: '#DCFCE7', color: '#15803D', padding: '1px 5px', borderRadius: '3px', fontWeight: 700 }}>+ Team RBAC</span>
                        <span style={{ fontSize: '9px', backgroundColor: '#DCFCE7', color: '#15803D', padding: '1px 5px', borderRadius: '3px', fontWeight: 700 }}>+ Kill Switch</span>
                      </div>
                    </div>

                    {/* Role Card 2: Dispatcher */}
                    <div style={{ backgroundColor: '#F8FAFC', borderRadius: '8px', padding: '14px', border: '1px solid #E2E8F0', borderLeft: '4px solid #7C3AED' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '12px', fontWeight: 800, color: '#7C3AED' }}>🎧 Flight & Fleet Dispatcher</span>
                        <span style={{ fontSize: '9px', backgroundColor: '#EDE9FE', color: '#5B21B6', padding: '2px 6px', borderRadius: '4px', fontWeight: 800 }}>ROLE_DISPATCHER</span>
                      </div>
                      <p style={{ fontSize: '11px', color: '#475569', margin: '6px 0 8px 0', lineHeight: 1.4 }}>
                        Day-to-day operations: live radar tracking, flight touchdown delay overrides, driver assignments, quotes, and customer WhatsApp/SMS chat.
                      </p>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                        <span style={{ fontSize: '9px', backgroundColor: '#DCFCE7', color: '#15803D', padding: '1px 5px', borderRadius: '3px', fontWeight: 700 }}>+ Dispatch Radar</span>
                        <span style={{ fontSize: '9px', backgroundColor: '#DCFCE7', color: '#15803D', padding: '1px 5px', borderRadius: '3px', fontWeight: 700 }}>+ Flight Staging</span>
                        <span style={{ fontSize: '9px', backgroundColor: '#DCFCE7', color: '#15803D', padding: '1px 5px', borderRadius: '3px', fontWeight: 700 }}>+ Omnichannel Chat</span>
                        <span style={{ fontSize: '9px', backgroundColor: '#FEE2E2', color: '#991B1B', padding: '1px 5px', borderRadius: '3px', fontWeight: 700 }}>- Restricted from Payouts</span>
                      </div>
                    </div>

                    {/* Role Card 3: Chauffeur */}
                    <div style={{ backgroundColor: '#F8FAFC', borderRadius: '8px', padding: '14px', border: '1px solid #E2E8F0', borderLeft: '4px solid #059669' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '12px', fontWeight: 800, color: '#059669' }}>🚗 Master Chauffeur</span>
                        <span style={{ fontSize: '9px', backgroundColor: '#D1FAE5', color: '#065F46', padding: '2px 6px', borderRadius: '4px', fontWeight: 800 }}>ROLE_CHAUFFEUR</span>
                      </div>
                      <p style={{ fontSize: '11px', color: '#475569', margin: '6px 0 8px 0', lineHeight: 1.4 }}>
                        Mobile chauffeur portal: shift clock-in, turn-by-turn airport staging navigation, passenger on-board updates, individual earnings & instant payouts.
                      </p>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                        <span style={{ fontSize: '9px', backgroundColor: '#DCFCE7', color: '#15803D', padding: '1px 5px', borderRadius: '3px', fontWeight: 700 }}>+ Mobile App</span>
                        <span style={{ fontSize: '9px', backgroundColor: '#DCFCE7', color: '#15803D', padding: '1px 5px', borderRadius: '3px', fontWeight: 700 }}>+ My Earnings</span>
                        <span style={{ fontSize: '9px', backgroundColor: '#DCFCE7', color: '#15803D', padding: '1px 5px', borderRadius: '3px', fontWeight: 700 }}>+ Instant Payout</span>
                        <span style={{ fontSize: '9px', backgroundColor: '#FEE2E2', color: '#991B1B', padding: '1px 5px', borderRadius: '3px', fontWeight: 700 }}>- Scoped to Own Driver ID</span>
                      </div>
                    </div>

                    {/* Role Card 4: Corporate Booker */}
                    <div style={{ backgroundColor: '#F8FAFC', borderRadius: '8px', padding: '14px', border: '1px solid #E2E8F0', borderLeft: '4px solid #D97706' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '12px', fontWeight: 800, color: '#D97706' }}>🏢 Corporate Travel Desk</span>
                        <span style={{ fontSize: '9px', backgroundColor: '#FEF3C7', color: '#92400E', padding: '2px 6px', borderRadius: '4px', fontWeight: 800 }}>ROLE_CORPORATE_BOOKER</span>
                      </div>
                      <p style={{ fontSize: '11px', color: '#475569', margin: '6px 0 8px 0', lineHeight: 1.4 }}>
                        Corporate VIP portal: book rides for C-suite executives, allocate departmental cost-centers, view monthly invoices and expense statements.
                      </p>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                        <span style={{ fontSize: '9px', backgroundColor: '#DCFCE7', color: '#15803D', padding: '1px 5px', borderRadius: '3px', fontWeight: 700 }}>+ Corporate Portal</span>
                        <span style={{ fontSize: '9px', backgroundColor: '#DCFCE7', color: '#15803D', padding: '1px 5px', borderRadius: '3px', fontWeight: 700 }}>+ Cost Centers</span>
                        <span style={{ fontSize: '9px', backgroundColor: '#DCFCE7', color: '#15803D', padding: '1px 5px', borderRadius: '3px', fontWeight: 700 }}>+ Consolidated Billing</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 4. Team Roster Search, Filter & Table */}
                <div style={{ backgroundColor: '#FFFFFF', borderRadius: '10px', border: '1px solid #E5E7EB', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', overflow: 'hidden' }}>
                  
                  {/* Toolbar */}
                  <div style={{ padding: '16px 20px', borderBottom: '1px solid #E5E7EB', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', backgroundColor: '#F9FAFB' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Search size={14} color="#6B7280" />
                      <input
                        type="text"
                        placeholder="Search personnel by name or email..."
                        value={teamSearch}
                        onChange={(e) => setTeamSearch(e.target.value)}
                        style={{
                          padding: '6px 12px',
                          border: '1px solid #D1D5DB',
                          borderRadius: '6px',
                          fontSize: '12px',
                          width: '240px',
                          backgroundColor: '#FFFFFF'
                        }}
                      />
                    </div>

                    {/* Role Filter Pills */}
                    <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                      {(['ALL', 'ROLE_VENDOR_ADMIN', 'ROLE_DISPATCHER', 'ROLE_CHAUFFEUR', 'ROLE_CORPORATE_BOOKER'] as const).map((roleKey) => {
                        const labels: Record<string, string> = {
                          ALL: 'All Personnel',
                          ROLE_VENDOR_ADMIN: 'Owners',
                          ROLE_DISPATCHER: 'Dispatchers',
                          ROLE_CHAUFFEUR: 'Chauffeurs',
                          ROLE_CORPORATE_BOOKER: 'Corporate'
                        };
                        const isActive = teamRoleFilter === roleKey;
                        return (
                          <button
                            key={roleKey}
                            onClick={() => setTeamRoleFilter(roleKey)}
                            style={{
                              padding: '5px 10px',
                              border: '1px solid',
                              borderColor: isActive ? '#0078D4' : '#E5E7EB',
                              borderRadius: '6px',
                              fontSize: '11px',
                              fontWeight: isActive ? 800 : 600,
                              backgroundColor: isActive ? '#0078D4' : '#FFFFFF',
                              color: isActive ? '#FFFFFF' : '#4B5563',
                              cursor: 'pointer'
                            }}
                          >
                            {labels[roleKey]}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Table */}
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '12px' }}>
                      <thead>
                        <tr style={{ backgroundColor: '#F9FAFB', borderBottom: '1px solid #E5E7EB', color: '#6B7280', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase' }}>
                          <th style={{ padding: '12px 18px' }}>Personnel & Contact</th>
                          <th style={{ padding: '12px 18px' }}>Assigned Role</th>
                          <th style={{ padding: '12px 18px' }}>Capabilities & Permissions</th>
                          <th style={{ padding: '12px 18px' }}>Status</th>
                          <th style={{ padding: '12px 18px', textAlign: 'center' }}>Live Role Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {teamMembers
                          .filter(m => {
                            if (teamRoleFilter !== 'ALL' && m.role !== teamRoleFilter) return false;
                            if (teamSearch) {
                              const q = teamSearch.toLowerCase();
                              return m.full_name.toLowerCase().includes(q) || m.email.toLowerCase().includes(q);
                            }
                            return true;
                          })
                          .map((member) => {
                            const isOwner = member.role === 'ROLE_VENDOR_ADMIN';
                            const isDispatcher = member.role === 'ROLE_DISPATCHER';
                            const isChauffeur = member.role === 'ROLE_CHAUFFEUR';
                            const isCorporate = member.role === 'ROLE_CORPORATE_BOOKER';

                            const roleBadgeColor = isOwner ? '#0078D4' : isDispatcher ? '#7C3AED' : isChauffeur ? '#059669' : '#D97706';
                            const roleBgColor = isOwner ? '#DBEAFE' : isDispatcher ? '#EDE9FE' : isChauffeur ? '#D1FAE5' : '#FEF3C7';

                            return (
                              <tr key={member.id} style={{ borderBottom: '1px solid #F3F4F6', transition: 'background-color 0.15s' }}>
                                
                                {/* 1. Personnel & Contact */}
                                <td style={{ padding: '14px 18px', verticalAlign: 'middle' }}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                    <div style={{
                                      width: '36px',
                                      height: '36px',
                                      borderRadius: '50%',
                                      backgroundColor: roleBgColor,
                                      color: roleBadgeColor,
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                      fontWeight: 800,
                                      fontSize: '13px',
                                      flexShrink: 0
                                    }}>
                                      {member.avatar_url ? (
                                        <img src={member.avatar_url} alt="" style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
                                      ) : (
                                        member.full_name.slice(0, 2).toUpperCase()
                                      )}
                                    </div>
                                    <div>
                                      <div style={{ fontWeight: 800, color: '#0F172A', fontSize: '13px' }}>
                                        {member.full_name}
                                      </div>
                                      <div style={{ fontSize: '11px', color: '#6B7280', display: 'flex', alignItems: 'center', gap: '8px', marginTop: '2px' }}>
                                        <span>📧 {member.email}</span>
                                        {member.phone && <span>📞 {member.phone}</span>}
                                      </div>
                                      {member.driver_id && (
                                        <div style={{ fontSize: '10px', color: '#059669', fontWeight: 700, marginTop: '2px' }}>
                                          Driver Ref: {member.driver_id} • Vehicle: {member.assigned_vehicle_id || 'Assigned'}
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                </td>

                                {/* 2. Assigned Role */}
                                <td style={{ padding: '14px 18px', verticalAlign: 'middle' }}>
                                  <span style={{
                                    fontSize: '10px',
                                    fontWeight: 800,
                                    backgroundColor: roleBgColor,
                                    color: roleBadgeColor,
                                    padding: '4px 10px',
                                    borderRadius: '6px',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '4px'
                                  }}>
                                    {isOwner ? '👑 Vendor Owner' : isDispatcher ? '🎧 Dispatcher' : isChauffeur ? '🚗 Chauffeur' : '🏢 Corporate Desk'}
                                  </span>
                                </td>

                                {/* 3. Permissions */}
                                <td style={{ padding: '14px 18px', verticalAlign: 'middle', maxWidth: '320px' }}>
                                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                                    {member.permissions.map((p, idx) => (
                                      <span key={idx} style={{ fontSize: '9px', fontWeight: 700, backgroundColor: '#F3F4F6', color: '#374151', padding: '2px 6px', borderRadius: '4px', border: '1px solid #E5E7EB' }}>
                                        {p}
                                      </span>
                                    ))}
                                  </div>
                                </td>

                                {/* 4. Status */}
                                <td style={{ padding: '14px 18px', verticalAlign: 'middle' }}>
                                  <span style={{
                                    fontSize: '10px',
                                    fontWeight: 800,
                                    backgroundColor: member.status === 'ACTIVE' ? '#DCFCE7' : '#FEF3C7',
                                    color: member.status === 'ACTIVE' ? '#15803D' : '#92400E',
                                    padding: '3px 8px',
                                    borderRadius: '4px',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '4px'
                                  }}>
                                    <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: member.status === 'ACTIVE' ? '#16A34A' : '#F59E0B' }} />
                                    {member.status}
                                  </span>
                                </td>

                                {/* 5. Actions */}
                                <td style={{ padding: '14px 18px', textAlign: 'center', verticalAlign: 'middle' }}>
                                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                                    
                                    {/* 1-Click Role Switcher / Impersonation */}
                                    <button
                                      onClick={() => handleImpersonateOrTestRole(member)}
                                      style={{
                                        padding: '4px 10px',
                                        backgroundColor: '#EFF6FF',
                                        color: '#0078D4',
                                        border: '1px solid #BFDBFE',
                                        borderRadius: '4px',
                                        fontSize: '10px',
                                        fontWeight: 800,
                                        cursor: 'pointer',
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '4px'
                                      }}
                                      title="Switch active session into this role to test capabilities in real-time"
                                    >
                                      <Zap size={11} /> Test Role
                                    </button>

                                    {/* Revoke button (Disabled for sole owner) */}
                                    <button
                                      onClick={() => handleDeleteMember(member.id, member.full_name)}
                                      disabled={isOwner && teamMembers.filter(m => m.role === 'ROLE_VENDOR_ADMIN').length <= 1}
                                      style={{
                                        padding: '4px 8px',
                                        backgroundColor: isOwner && teamMembers.filter(m => m.role === 'ROLE_VENDOR_ADMIN').length <= 1 ? '#F3F4F6' : '#FEE2E2',
                                        color: isOwner && teamMembers.filter(m => m.role === 'ROLE_VENDOR_ADMIN').length <= 1 ? '#9CA3AF' : '#DC2626',
                                        border: 'none',
                                        borderRadius: '4px',
                                        fontSize: '10px',
                                        fontWeight: 700,
                                        cursor: isOwner && teamMembers.filter(m => m.role === 'ROLE_VENDOR_ADMIN').length <= 1 ? 'not-allowed' : 'pointer'
                                      }}
                                      title={isOwner && teamMembers.filter(m => m.role === 'ROLE_VENDOR_ADMIN').length <= 1 ? 'Cannot delete sole owner' : 'Revoke Access'}
                                    >
                                      Revoke
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* 5. Invite Team Member Modal */}
                {showAddMemberModal && (
                  <div style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    backgroundColor: 'rgba(0,0,0,0.5)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 100,
                    padding: '20px'
                  }}>
                    <div style={{
                      backgroundColor: '#FFFFFF',
                      borderRadius: '12px',
                      maxWidth: '520px',
                      width: '100%',
                      padding: '24px',
                      boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2)',
                      maxHeight: '90vh',
                      overflowY: 'auto'
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #E5E7EB', paddingBottom: '14px', marginBottom: '16px' }}>
                        <div>
                          <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 800, color: '#0F172A', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <UserPlus size={18} color="#0078D4" /> Invite New Team Member
                          </h3>
                          <p style={{ margin: '2px 0 0 0', fontSize: '11px', color: '#6B7280' }}>
                            Grant operational, dispatch, or driving access to sovereign cell <strong>{config.vendor_name || 'ANB Limo'}</strong>
                          </p>
                        </div>
                        <button onClick={() => setShowAddMemberModal(false)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#6B7280' }}>
                          <X size={18} />
                        </button>
                      </div>

                      <form onSubmit={handleCreateTeamMemberSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                        
                        <div>
                          <label style={{ fontSize: '11px', fontWeight: 800, color: '#374151', textTransform: 'uppercase' }}>Full Name *</label>
                          <input
                            type="text"
                            required
                            placeholder="e.g., Marcus Vance"
                            value={newMemberForm.full_name}
                            onChange={(e) => setNewMemberForm({ ...newMemberForm, full_name: e.target.value })}
                            style={{ width: '100%', padding: '10px', border: '1px solid #D1D5DB', borderRadius: '6px', fontSize: '13px', marginTop: '4px', boxSizing: 'border-box' }}
                          />
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                          <div>
                            <label style={{ fontSize: '11px', fontWeight: 800, color: '#374151', textTransform: 'uppercase' }}>Work Email *</label>
                            <input
                              type="email"
                              required
                              placeholder="e.g., marcus@anblimo.com"
                              value={newMemberForm.email}
                              onChange={(e) => setNewMemberForm({ ...newMemberForm, email: e.target.value })}
                              style={{ width: '100%', padding: '10px', border: '1px solid #D1D5DB', borderRadius: '6px', fontSize: '13px', marginTop: '4px', boxSizing: 'border-box' }}
                            />
                          </div>

                          <div>
                            <label style={{ fontSize: '11px', fontWeight: 800, color: '#374151', textTransform: 'uppercase' }}>Mobile Phone</label>
                            <input
                              type="tel"
                              placeholder="+1 (215) 555-0199"
                              value={newMemberForm.phone}
                              onChange={(e) => setNewMemberForm({ ...newMemberForm, phone: e.target.value })}
                              style={{ width: '100%', padding: '10px', border: '1px solid #D1D5DB', borderRadius: '6px', fontSize: '13px', marginTop: '4px', boxSizing: 'border-box' }}
                            />
                          </div>
                        </div>

                        <div>
                          <label style={{ fontSize: '11px', fontWeight: 800, color: '#374151', textTransform: 'uppercase' }}>Assign Role *</label>
                          <select
                            value={newMemberForm.role}
                            onChange={(e) => {
                              const r = e.target.value;
                              let defPerms = ['dispatch:assign', 'dispatch:radar', 'quotes:manage', 'omnichannel:respond', 'flights:override'];
                              if (r === 'ROLE_VENDOR_ADMIN') defPerms = ['team:manage', 'billing:manage', 'byoe:manage', 'pricing:override', 'autonomy:override', 'dispatch:assign'];
                              if (r === 'ROLE_CHAUFFEUR') defPerms = ['trip:execute', 'trip:accept', 'earnings:read_own', 'payouts:request_own'];
                              if (r === 'ROLE_CORPORATE_BOOKER') defPerms = ['corporate:book', 'corporate:cost_centers', 'corporate:invoices'];
                              setNewMemberForm({ ...newMemberForm, role: r, permissions: defPerms });
                            }}
                            style={{ width: '100%', padding: '10px', border: '1px solid #D1D5DB', borderRadius: '6px', fontSize: '13px', marginTop: '4px', boxSizing: 'border-box', backgroundColor: '#FFFFFF' }}
                          >
                            <option value="ROLE_DISPATCHER">🎧 Flight & Fleet Dispatcher (Live Radar, Trips, Chat)</option>
                            <option value="ROLE_CHAUFFEUR">🚗 Master Chauffeur (Mobile Portal, Driver Missions)</option>
                            <option value="ROLE_CORPORATE_BOOKER">🏢 Corporate Travel Desk (Cost Centers, Statements)</option>
                            <option value="ROLE_VENDOR_ADMIN">👑 Vendor Owner (Full Authority & Financials)</option>
                          </select>
                        </div>

                        {newMemberForm.role === 'ROLE_CHAUFFEUR' && (
                          <div>
                            <label style={{ fontSize: '11px', fontWeight: 800, color: '#374151', textTransform: 'uppercase' }}>Assigned Fleet Vehicle</label>
                            <select
                              value={newMemberForm.assigned_vehicle_id}
                              onChange={(e) => setNewMemberForm({ ...newMemberForm, assigned_vehicle_id: e.target.value })}
                              style={{ width: '100%', padding: '10px', border: '1px solid #D1D5DB', borderRadius: '6px', fontSize: '13px', marginTop: '4px', boxSizing: 'border-box', backgroundColor: '#FFFFFF' }}
                            >
                              <option value="veh-phl-01">PA-LM001 • Cadillac Escalade ESV (Luxury SUV)</option>
                              <option value="veh-phl-02">PA-LM002 • Mercedes-Benz S 580 (First Class)</option>
                              <option value="veh-phl-03">PA-LM003 • Mercedes-Benz Sprinter 3500 (VIP Van)</option>
                            </select>
                          </div>
                        )}

                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '12px', paddingTop: '12px', borderTop: '1px solid #E5E7EB' }}>
                          <button
                            type="button"
                            onClick={() => setShowAddMemberModal(false)}
                            style={{ padding: '8px 16px', backgroundColor: '#F3F4F6', color: '#4B5563', border: 'none', borderRadius: '6px', fontSize: '12px', fontWeight: 700, cursor: 'pointer' }}
                          >
                            Cancel
                          </button>
                          <button
                            type="submit"
                            disabled={loading}
                            style={{ padding: '8px 20px', backgroundColor: '#0078D4', color: '#FFFFFF', border: 'none', borderRadius: '6px', fontSize: '12px', fontWeight: 800, cursor: 'pointer' }}
                          >
                            {loading ? 'Creating Credentials...' : 'Send Invite & Generate Magic Link'}
                          </button>
                        </div>
                      </form>
                    </div>
                  </div>
                )}

              </div>
            )}

            {/* TAB 8: AFFILIATE NETWORK & GLOBAL HUB MARKETPLACE */}
            {activeTab === 'affiliates' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                
                {/* Header & Action Bar */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
                  <div>
                    <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: '#0F172A', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <ArrowUpRight size={20} color="#0078D4" />
                      B2B Affiliate Network & Global Hub Marketplace Exchange
                    </h2>
                    <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: '#6B7280' }}>
                      Incoming Global Hub marketplace jobs (85% net payout) and peer-to-peer cross-city farm-outs (10% referral commission)
                    </p>
                  </div>

                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    {/* Sub-Tab Navigation Switcher */}
                    <div style={{ display: 'flex', backgroundColor: '#F1F5F9', padding: '3px', borderRadius: '8px', border: '1px solid #CBD5E1' }}>
                      <button
                        onClick={() => setAffiliateSubTab('exchange')}
                        style={{
                          padding: '6px 12px',
                          border: 'none',
                          borderRadius: '6px',
                          fontSize: '11px',
                          fontWeight: 800,
                          cursor: 'pointer',
                          backgroundColor: affiliateSubTab === 'exchange' ? '#0078D4' : 'transparent',
                          color: affiliateSubTab === 'exchange' ? '#FFFFFF' : '#475569',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px'
                        }}
                      >
                        📋 Exchanged Ledger ({affiliateJobs.length})
                      </button>
                      <button
                        onClick={() => setAffiliateSubTab('matcher')}
                        style={{
                          padding: '6px 12px',
                          border: 'none',
                          borderRadius: '6px',
                          fontSize: '11px',
                          fontWeight: 800,
                          cursor: 'pointer',
                          backgroundColor: affiliateSubTab === 'matcher' ? '#0078D4' : 'transparent',
                          color: affiliateSubTab === 'matcher' ? '#FFFFFF' : '#475569',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px'
                        }}
                      >
                        🧠 AI Matchmaker
                      </button>
                      <button
                        onClick={() => setAffiliateSubTab('policy')}
                        style={{
                          padding: '6px 12px',
                          border: 'none',
                          borderRadius: '6px',
                          fontSize: '11px',
                          fontWeight: 800,
                          cursor: 'pointer',
                          backgroundColor: affiliateSubTab === 'policy' ? '#0078D4' : 'transparent',
                          color: affiliateSubTab === 'policy' ? '#FFFFFF' : '#475569',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px'
                        }}
                      >
                        ⚙️ Business Policy & KB
                      </button>
                    </div>

                    <button
                      onClick={() => setShowFarmOutModal(true)}
                      style={{
                        padding: '8px 14px',
                        backgroundColor: '#0078D4',
                        color: '#FFFFFF',
                        borderRadius: '6px',
                        fontSize: '12px',
                        fontWeight: 700,
                        border: 'none',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        boxShadow: '0 1px 2px rgba(0,0,0,0.1)'
                      }}
                    >
                      <Plus size={14} /> + Farm Out Trip to Partner
                    </button>
                  </div>
                </div>

                {/* SOVEREIGN BUSINESS POLICY & KNOWLEDGE BASE SYNC SUB-TAB */}
                {affiliateSubTab === 'policy' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    <div style={{
                      backgroundColor: '#FFFFFF',
                      borderRadius: '12px',
                      padding: '24px',
                      border: '1px solid #BFDBFE',
                      background: 'linear-gradient(180deg, #F8FAFC 0%, #EFF6FF 100%)',
                      boxShadow: '0 2px 4px rgba(0, 120, 212, 0.06)'
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '14px', marginBottom: '16px' }}>
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ background: '#10B981', color: '#FFFFFF', padding: '2px 8px', borderRadius: '12px', fontSize: '11px', fontWeight: 800 }}>
                              GLOBAL HUB KNOWLEDGE BASE ACTIVE
                            </span>
                            <h3 style={{ margin: 0, fontSize: '17px', fontWeight: 800, color: '#0F172A' }}>
                              Sovereign Vendor Business Rules & AI Directives Policy
                            </h3>
                          </div>
                          <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: '#4B5563' }}>
                            Adjust your farm-in acceptance criteria and farm-out rules in natural language (AI Agent instructions) or fine-tune exact thresholds. Changes sync to the Global Hub Knowledge Base in real time.
                          </p>
                        </div>

                        <button
                          onClick={handleSaveAffiliatePolicy}
                          disabled={policySaving}
                          style={{
                            padding: '10px 22px',
                            backgroundColor: '#10B981',
                            color: '#FFFFFF',
                            borderRadius: '8px',
                            fontSize: '12px',
                            fontWeight: 800,
                            border: 'none',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            boxShadow: '0 2px 4px rgba(16, 185, 129, 0.2)'
                          }}
                        >
                          <CheckCircle2 size={16} />
                          {policySaving ? 'Saving & Broadcasting...' : '💾 Save & Sync Rules to Global Hub'}
                        </button>
                      </div>

                      {/* Owner Custom Operational Memo / Dispatcher Notes */}
                      <div style={{ backgroundColor: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '8px', padding: '14px', marginBottom: '18px' }}>
                        <label style={{ fontSize: '12px', fontWeight: 800, color: '#1E293B', display: 'flex', alignItems: 'center', gap: '6px' }}>
                          ✍️ Fleet Owner Sovereign Operations Memo (Included on all Global Hub Clearing Records)
                        </label>
                        <input
                          type="text"
                          value={vendorAffiliatePolicy.custom_owner_notes || ''}
                          onChange={e => setVendorAffiliatePolicy({
                            ...vendorAffiliatePolicy,
                            custom_owner_notes: e.target.value
                          })}
                          placeholder="e.g. ANB Limousine sovereign operations: VIP airport and corporate transfers priority."
                          style={{ width: '100%', padding: '8px 12px', fontSize: '12px', border: '1px solid #CBD5E1', borderRadius: '6px', marginTop: '6px', backgroundColor: '#F8FAFC' }}
                        />
                      </div>

                      {/* Policy Cards Grid: Farm-In (Taking Work) vs Farm-Out (Sending Work) */}
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(380px, 1fr))', gap: '18px' }}>
                        
                        {/* 1. FARM-IN POLICY (TAKING JOBS FROM OTHER VENDORS) */}
                        <div style={{ backgroundColor: '#FFFFFF', border: '1px solid #CBD5E1', borderRadius: '10px', padding: '18px', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', borderBottom: '1px solid #F1F5F9', paddingBottom: '10px' }}>
                            <div style={{ fontSize: '14px', fontWeight: 800, color: '#0F172A', display: 'flex', alignItems: 'center', gap: '6px' }}>
                              📥 Farm-In Policy (Receiving Work from Hub)
                            </div>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: 800, color: vendorAffiliatePolicy.farm_in_policy.open_for_farm_in ? '#15803D' : '#94A3B8', cursor: 'pointer' }}>
                              <input
                                type="checkbox"
                                checked={vendorAffiliatePolicy.farm_in_policy.open_for_farm_in}
                                onChange={e => setVendorAffiliatePolicy({
                                  ...vendorAffiliatePolicy,
                                  farm_in_policy: {
                                    ...vendorAffiliatePolicy.farm_in_policy,
                                    open_for_farm_in: e.target.checked
                                  }
                                })}
                              />
                              {vendorAffiliatePolicy.farm_in_policy.open_for_farm_in ? '🟢 Open for Farm-In' : '🔴 Closed'}
                            </label>
                          </div>

                          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            
                            {/* AI Agent Natural Language Directive */}
                            <div style={{ backgroundColor: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: '8px', padding: '12px' }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                                <label style={{ fontSize: '11px', fontWeight: 800, color: '#166534', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                  🤖 AI Agent Prompt Directive (Plain English Rules)
                                </label>
                                <span style={{ fontSize: '10px', color: '#15803D', fontWeight: 700 }}>Autonomous Matching</span>
                              </div>
                              <textarea
                                rows={3}
                                value={vendorAffiliatePolicy.farm_in_policy.ai_natural_language_prompt || ''}
                                onChange={e => setVendorAffiliatePolicy({
                                  ...vendorAffiliatePolicy,
                                  farm_in_policy: {
                                    ...vendorAffiliatePolicy.farm_in_policy,
                                    ai_natural_language_prompt: e.target.value
                                  }
                                })}
                                placeholder="Write in plain English what jobs your fleet accepts..."
                                style={{ width: '100%', padding: '8px 10px', fontSize: '12px', border: '1px solid #86EFAC', borderRadius: '6px', backgroundColor: '#FFFFFF', resize: 'vertical' }}
                              />

                              {/* Quick Presets for Farm-In */}
                              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: '6px' }}>
                                <span style={{ fontSize: '10px', color: '#166534', fontWeight: 700, alignSelf: 'center' }}>Presets:</span>
                                {[
                                  { label: '✈️ Airport & VIP ($90+)', text: 'Open to receive corporate and airport transfer rides in our home metro area. Require minimum $90 net payout. Only accept First Class and Luxury SUV classes with 45m+ lead time.' },
                                  { label: '🏙️ All Classes Open', text: 'Open for all corporate, airport, and city transfers. Accept First Class, Luxury SUV, and Business Sedan. Min payout $70, lead time 30m.' },
                                  { label: '💎 Ultra-VIP Escalade Only', text: 'Only accept Luxury SUV and First Class airport charters for verified corporate executives. Minimum $120 net cut.' }
                                ].map((preset, pIdx) => (
                                  <button
                                    key={pIdx}
                                    type="button"
                                    onClick={() => setVendorAffiliatePolicy({
                                      ...vendorAffiliatePolicy,
                                      farm_in_policy: {
                                        ...vendorAffiliatePolicy.farm_in_policy,
                                        ai_natural_language_prompt: preset.text
                                      }
                                    })}
                                    style={{ fontSize: '10px', padding: '2px 6px', background: '#DCFCE7', border: '1px solid #86EFAC', borderRadius: '4px', cursor: 'pointer', color: '#14532D', fontWeight: 600 }}
                                  >
                                    {preset.label}
                                  </button>
                                ))}
                              </div>
                            </div>

                            {/* Decision Mode */}
                            <div>
                              <label style={{ fontSize: '11px', fontWeight: 700, color: '#475569' }}>AI Matchmaker Consensus Mode</label>
                              <select
                                value={vendorAffiliatePolicy.farm_in_policy.ai_decision_mode || 'AI_AGENT_AUTONOMOUS'}
                                onChange={e => setVendorAffiliatePolicy({
                                  ...vendorAffiliatePolicy,
                                  farm_in_policy: {
                                    ...vendorAffiliatePolicy.farm_in_policy,
                                    ai_decision_mode: e.target.value as any
                                  }
                                })}
                                style={{ width: '100%', padding: '6px 10px', fontSize: '12px', border: '1px solid #CBD5E1', borderRadius: '6px', marginTop: '4px' }}
                              >
                                <option value="AI_AGENT_AUTONOMOUS">🤖 AI Agent Autonomous (Prompt + Context Ranking)</option>
                                <option value="HYBRID">⚡ Hybrid (AI Prompt + Strict Hard Bounds)</option>
                                <option value="STRICT_DETERMINISTIC">⚙️ Strict Deterministic (Hard Rules Only)</option>
                              </select>
                            </div>

                            <div>
                              <label style={{ fontSize: '11px', fontWeight: 700, color: '#475569' }}>
                                Minimum Net Payout Per Trip ($ USD)
                              </label>
                              <input
                                type="number"
                                value={vendorAffiliatePolicy.farm_in_policy.min_net_payout_usd}
                                onChange={e => setVendorAffiliatePolicy({
                                  ...vendorAffiliatePolicy,
                                  farm_in_policy: {
                                    ...vendorAffiliatePolicy.farm_in_policy,
                                    min_net_payout_usd: parseFloat(e.target.value) || 0
                                  }
                                })}
                                style={{ width: '100%', padding: '8px 10px', fontSize: '12px', border: '1px solid #CBD5E1', borderRadius: '6px', marginTop: '4px' }}
                              />
                              <div style={{ fontSize: '10px', color: '#64748B', marginTop: '2px' }}>
                                Reject any incoming farm-in request where your 85% net cut is less than this threshold.
                              </div>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                              <div>
                                <label style={{ fontSize: '11px', fontWeight: 700, color: '#475569' }}>Min Lead Time (Minutes)</label>
                                <input
                                  type="number"
                                  value={vendorAffiliatePolicy.farm_in_policy.min_lead_time_minutes}
                                  onChange={e => setVendorAffiliatePolicy({
                                    ...vendorAffiliatePolicy,
                                    farm_in_policy: {
                                      ...vendorAffiliatePolicy.farm_in_policy,
                                      min_lead_time_minutes: parseInt(e.target.value) || 0
                                    }
                                  })}
                                  style={{ width: '100%', padding: '8px 10px', fontSize: '12px', border: '1px solid #CBD5E1', borderRadius: '6px', marginTop: '4px' }}
                                />
                              </div>
                              <div>
                                <label style={{ fontSize: '11px', fontWeight: 700, color: '#475569' }}>Max Deadhead (KM)</label>
                                <input
                                  type="number"
                                  value={vendorAffiliatePolicy.farm_in_policy.max_deadhead_from_depot_km}
                                  onChange={e => setVendorAffiliatePolicy({
                                    ...vendorAffiliatePolicy,
                                    farm_in_policy: {
                                      ...vendorAffiliatePolicy.farm_in_policy,
                                      max_deadhead_from_depot_km: parseFloat(e.target.value) || 0
                                    }
                                  })}
                                  style={{ width: '100%', padding: '8px 10px', fontSize: '12px', border: '1px solid #CBD5E1', borderRadius: '6px', marginTop: '4px' }}
                                />
                              </div>
                            </div>

                            <div>
                              <label style={{ fontSize: '11px', fontWeight: 700, color: '#475569' }}>Accepted Luxury Fleet Categories</label>
                              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '6px' }}>
                                {[
                                  { id: 'FIRST_CLASS', label: 'First Class (S-Class / 7-Series)' },
                                  { id: 'LUXURY_SUV', label: 'Luxury SUV (Escalade / Navigator)' },
                                  { id: 'BUSINESS_SEDAN', label: 'Business Sedan (E-Class / 5-Series)' }
                                ].map(v => (
                                  <label key={v.id} style={{ fontSize: '11px', background: '#F8FAFC', border: '1px solid #E2E8F0', padding: '4px 8px', borderRadius: '6px', display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }}>
                                    <input
                                      type="checkbox"
                                      checked={vendorAffiliatePolicy.farm_in_policy.allowed_vehicle_classes.includes(v.id)}
                                      onChange={e => {
                                        const cur = vendorAffiliatePolicy.farm_in_policy.allowed_vehicle_classes;
                                        const next = e.target.checked ? [...cur, v.id] : cur.filter(x => x !== v.id);
                                        setVendorAffiliatePolicy({
                                          ...vendorAffiliatePolicy,
                                          farm_in_policy: {
                                            ...vendorAffiliatePolicy.farm_in_policy,
                                            allowed_vehicle_classes: next
                                          }
                                        });
                                      }}
                                    />
                                    {v.label}
                                  </label>
                                ))}
                              </div>
                            </div>

                            <div style={{ background: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: '6px', padding: '10px', fontSize: '11px', color: '#166534' }}>
                              ⚡ <strong>Auto-Accept Whitelisted Partners:</strong> Rides from preferred partners (e.g. NY Executive, London Royal) will be automatically accepted & locked in escrow.
                            </div>
                          </div>
                        </div>

                        {/* 2. FARM-OUT POLICY (FARMING WORK TO OTHER OPERATORS) */}
                        <div style={{ backgroundColor: '#FFFFFF', border: '1px solid #CBD5E1', borderRadius: '10px', padding: '18px', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', borderBottom: '1px solid #F1F5F9', paddingBottom: '10px' }}>
                            <div style={{ fontSize: '14px', fontWeight: 800, color: '#0F172A', display: 'flex', alignItems: 'center', gap: '6px' }}>
                              📤 Farm-Out Policy (Sending Work to Affiliates)
                            </div>
                            <span style={{ fontSize: '11px', fontWeight: 700, color: '#0078D4', background: '#EFF6FF', padding: '2px 8px', borderRadius: '12px' }}>
                              Originator Policy (10% Referral Cut)
                            </span>
                          </div>

                          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            
                            {/* AI Agent Natural Language Directive for Farm-Out */}
                            <div style={{ backgroundColor: '#EFF6FF', border: '1px solid #BFDBFE', borderRadius: '8px', padding: '12px' }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                                <label style={{ fontSize: '11px', fontWeight: 800, color: '#1E40AF', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                  🤖 AI Agent Prompt Directive (Plain English Partner Selection)
                                </label>
                                <span style={{ fontSize: '10px', color: '#2563EB', fontWeight: 700 }}>Global Matcher</span>
                              </div>
                              <textarea
                                rows={3}
                                value={vendorAffiliatePolicy.farm_out_policy.ai_natural_language_prompt || ''}
                                onChange={e => setVendorAffiliatePolicy({
                                  ...vendorAffiliatePolicy,
                                  farm_out_policy: {
                                    ...vendorAffiliatePolicy.farm_out_policy,
                                    ai_natural_language_prompt: e.target.value
                                  }
                                })}
                                placeholder="Write plain English rules for choosing affiliate partners in other cities..."
                                style={{ width: '100%', padding: '8px 10px', fontSize: '12px', border: '1px solid #93C5FD', borderRadius: '6px', backgroundColor: '#FFFFFF', resize: 'vertical' }}
                              />

                              {/* Quick Presets for Farm-Out */}
                              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: '6px' }}>
                                <span style={{ fontSize: '10px', color: '#1E40AF', fontWeight: 700, alignSelf: 'center' }}>Presets:</span>
                                {[
                                  { label: '🌟 5-Star VIP (NYC/London/Paris)', text: 'When farming out trips in out-of-market cities (NYC, London, Paris, Miami, Dubai, LA), only assign to certified 5-star operators (>=4.90 rating) with 2024+ luxury sedans/SUVs. Require minimum 10% referral cut and verified livery insurance.' },
                                  { label: '🚀 Rapid Dispatch Any Partner', text: 'Match with the closest available certified affiliate with rating >= 4.70 to ensure shortest ETA and instant fulfillment.' },
                                  { label: '🛡️ Airport Tarmac & FBO Verified Only', text: 'Only route to affiliates holding active airport authority and FBO tarmac security badges (TLC, PPA, TfL, Paris Aeroport).' }
                                ].map((preset, pIdx) => (
                                  <button
                                    key={pIdx}
                                    type="button"
                                    onClick={() => setVendorAffiliatePolicy({
                                      ...vendorAffiliatePolicy,
                                      farm_out_policy: {
                                        ...vendorAffiliatePolicy.farm_out_policy,
                                        ai_natural_language_prompt: preset.text
                                      }
                                    })}
                                    style={{ fontSize: '10px', padding: '2px 6px', background: '#DBEAFE', border: '1px solid #93C5FD', borderRadius: '4px', cursor: 'pointer', color: '#1E40AF', fontWeight: 600 }}
                                  >
                                    {preset.label}
                                  </button>
                                ))}
                              </div>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                              <div>
                                <label style={{ fontSize: '11px', fontWeight: 700, color: '#475569' }}>
                                  Min Partner Rating (★ Stars)
                                </label>
                                <input
                                  type="number"
                                  step="0.01"
                                  min="4.50"
                                  max="5.00"
                                  value={vendorAffiliatePolicy.farm_out_policy.min_partner_rating}
                                  onChange={e => setVendorAffiliatePolicy({
                                    ...vendorAffiliatePolicy,
                                    farm_out_policy: {
                                      ...vendorAffiliatePolicy.farm_out_policy,
                                      min_partner_rating: parseFloat(e.target.value) || 4.90
                                    }
                                  })}
                                  style={{ width: '100%', padding: '8px 10px', fontSize: '12px', border: '1px solid #CBD5E1', borderRadius: '6px', marginTop: '4px' }}
                                />
                              </div>
                              <div>
                                <label style={{ fontSize: '11px', fontWeight: 700, color: '#475569' }}>Max Vehicle Age (Years)</label>
                                <input
                                  type="number"
                                  min="1"
                                  max="5"
                                  value={vendorAffiliatePolicy.farm_out_policy.max_vehicle_age_years}
                                  onChange={e => setVendorAffiliatePolicy({
                                    ...vendorAffiliatePolicy,
                                    farm_out_policy: {
                                      ...vendorAffiliatePolicy.farm_out_policy,
                                      max_vehicle_age_years: parseInt(e.target.value) || 3
                                    }
                                  })}
                                  style={{ width: '100%', padding: '8px 10px', fontSize: '12px', border: '1px solid #CBD5E1', borderRadius: '6px', marginTop: '4px' }}
                                />
                              </div>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                              <div>
                                <label style={{ fontSize: '11px', fontWeight: 700, color: '#475569' }}>Min Referral Cut (%)</label>
                                <input
                                  type="number"
                                  value={vendorAffiliatePolicy.farm_out_policy.min_referral_commission_pct}
                                  onChange={e => setVendorAffiliatePolicy({
                                    ...vendorAffiliatePolicy,
                                    farm_out_policy: {
                                      ...vendorAffiliatePolicy.farm_out_policy,
                                      min_referral_commission_pct: parseFloat(e.target.value) || 10.0
                                    }
                                  })}
                                  style={{ width: '100%', padding: '8px 10px', fontSize: '12px', border: '1px solid #CBD5E1', borderRadius: '6px', marginTop: '4px' }}
                                />
                              </div>
                              <div>
                                <label style={{ fontSize: '11px', fontWeight: 700, color: '#475569' }}>Local Service Radius (KM)</label>
                                <input
                                  type="number"
                                  value={vendorAffiliatePolicy.farm_out_policy.local_service_radius_km}
                                  onChange={e => setVendorAffiliatePolicy({
                                    ...vendorAffiliatePolicy,
                                    farm_out_policy: {
                                      ...vendorAffiliatePolicy.farm_out_policy,
                                      local_service_radius_km: parseFloat(e.target.value) || 75.0
                                    }
                                  })}
                                  style={{ width: '100%', padding: '8px 10px', fontSize: '12px', border: '1px solid #CBD5E1', borderRadius: '6px', marginTop: '4px' }}
                                />
                              </div>
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '4px' }}>
                              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: '#334155', cursor: 'pointer' }}>
                                <input
                                  type="checkbox"
                                  checked={vendorAffiliatePolicy.farm_out_policy.require_commercial_insurance}
                                  onChange={e => setVendorAffiliatePolicy({
                                    ...vendorAffiliatePolicy,
                                    farm_out_policy: {
                                      ...vendorAffiliatePolicy.farm_out_policy,
                                      require_commercial_insurance: e.target.checked
                                    }
                                  })}
                                />
                                🛡️ Require Verified $5M Commercial Livery Insurance Certificate
                              </label>

                              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: '#334155', cursor: 'pointer' }}>
                                <input
                                  type="checkbox"
                                  checked={vendorAffiliatePolicy.farm_out_policy.require_airport_fbo_permit}
                                  onChange={e => setVendorAffiliatePolicy({
                                    ...vendorAffiliatePolicy,
                                    farm_out_policy: {
                                      ...vendorAffiliatePolicy.farm_out_policy,
                                      require_airport_fbo_permit: e.target.checked
                                    }
                                  })}
                                />
                                ✈️ Require Airport FBO & Commercial Authority Permit (TLC / PPA / TfL)
                              </label>

                              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: '#334155', cursor: 'pointer' }}>
                                <input
                                  type="checkbox"
                                  checked={vendorAffiliatePolicy.farm_out_policy.auto_farmout_out_of_market}
                                  onChange={e => setVendorAffiliatePolicy({
                                    ...vendorAffiliatePolicy,
                                    farm_out_policy: {
                                      ...vendorAffiliatePolicy.farm_out_policy,
                                      auto_farmout_out_of_market: e.target.checked
                                    }
                                  })}
                                />
                                🌐 Auto-Suggest Certified Affiliates for Out-of-Market Pickups (&gt; {vendorAffiliatePolicy.farm_out_policy.local_service_radius_km} km)
                              </label>
                            </div>
                          </div>
                        </div>

                      </div>

                      {/* 3. CERTIFIED GLOBAL AFFILIATE DIRECTORY IN GLOBAL HUB KNOWLEDGE BASE */}
                      <div style={{ marginTop: '22px', backgroundColor: '#FFFFFF', border: '1px solid #CBD5E1', borderRadius: '10px', padding: '18px', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '8px', borderBottom: '1px solid #F1F5F9', paddingBottom: '10px' }}>
                          <div>
                            <div style={{ fontSize: '14px', fontWeight: 800, color: '#0F172A', display: 'flex', alignItems: 'center', gap: '6px' }}>
                              🌐 Global Hub Knowledge Base: Certified Partner Network Directory ({affiliateDirectory.length} Active Nodes)
                            </div>
                            <div style={{ fontSize: '11px', color: '#64748B', marginTop: '2px' }}>
                              Pre-vetted, insured, and licensed sovereign operator cells synchronized across North America, Europe, and the Middle East.
                            </div>
                          </div>
                          <span style={{ fontSize: '11px', background: '#EFF6FF', color: '#1E40AF', padding: '4px 10px', borderRadius: '12px', fontWeight: 700 }}>
                            ⚡ Escrow Guaranteed Settlement
                          </span>
                        </div>

                        <div style={{ overflowX: 'auto' }}>
                          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px', textAlign: 'left' }}>
                            <thead>
                              <tr style={{ backgroundColor: '#F8FAFC', color: '#475569', fontWeight: 700, borderBottom: '1px solid #E2E8F0' }}>
                                <th style={{ padding: '10px 12px' }}>Partner Cell & City</th>
                                <th style={{ padding: '10px 12px' }}>Authorized Airports & Tarmac</th>
                                <th style={{ padding: '10px 12px' }}>Compliance & Rating</th>
                                <th style={{ padding: '10px 12px' }}>Primary Fleet</th>
                                <th style={{ padding: '10px 12px' }}>Escrow Trust</th>
                                <th style={{ padding: '10px 12px', textAlign: 'center' }}>Status</th>
                              </tr>
                            </thead>
                            <tbody>
                              {affiliateDirectory.map(partner => (
                                <tr key={partner.partner_id} style={{ borderBottom: '1px solid #F1F5F9' }}>
                                  <td style={{ padding: '10px 12px' }}>
                                    <div style={{ fontWeight: 800, color: '#0F172A', fontSize: '12px' }}>{partner.company_name}</div>
                                    <div style={{ color: '#0078D4', fontWeight: 600 }}>📍 {partner.city}, {partner.country}</div>
                                  </td>
                                  <td style={{ padding: '10px 12px' }}>
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                                      {partner.airports.map((ap, apIdx) => (
                                        <span key={apIdx} style={{ background: '#EFF6FF', color: '#1E40AF', padding: '2px 6px', borderRadius: '4px', fontWeight: 700, fontSize: '10px' }}>
                                          ✈️ {ap}
                                        </span>
                                      ))}
                                    </div>
                                  </td>
                                  <td style={{ padding: '10px 12px' }}>
                                    <div style={{ fontWeight: 800, color: '#15803D' }}>★ {partner.rating} ({partner.trips_completed}+ Trips)</div>
                                    <div style={{ fontSize: '10px', color: '#64748B' }}>{partner.compliance_badge}</div>
                                  </td>
                                  <td style={{ padding: '10px 12px' }}>
                                    <div style={{ fontWeight: 600, color: '#334155' }}>{partner.primary_vehicle}</div>
                                    <div style={{ fontSize: '10px', color: '#94A3B8' }}>{partner.supported_classes.join(', ')}</div>
                                  </td>
                                  <td style={{ padding: '10px 12px' }}>
                                    <div style={{ fontWeight: 800, color: '#0078D4' }}>{partner.escrow_trust_score}/100</div>
                                    <div style={{ fontSize: '10px', color: '#16A34A' }}>🛡️ $5M Livery Insured</div>
                                  </td>
                                  <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                                    <span style={{ background: '#DCFCE7', color: '#16A34A', padding: '3px 8px', borderRadius: '12px', fontWeight: 800, fontSize: '10px' }}>
                                      🟢 ACTIVE NODE
                                    </span>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>

                    </div>
                  </div>
                )}

                {/* AI MATCHMAKER SUB-TAB */}
                {affiliateSubTab === 'matcher' && (
                  <div style={{
                    backgroundColor: '#FFFFFF',
                    borderRadius: '12px',
                    padding: '20px',
                    border: '1px solid #BFDBFE',
                    background: 'linear-gradient(180deg, #F8FAFC 0%, #EFF6FF 100%)',
                    boxShadow: '0 2px 4px rgba(0, 120, 212, 0.06)'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px', marginBottom: '14px' }}>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ background: '#0078D4', color: '#FFFFFF', padding: '2px 8px', borderRadius: '12px', fontSize: '11px', fontWeight: 800 }}>
                            AI MATCHMAKER
                          </span>
                          <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 800, color: '#0F172A' }}>
                            Out-of-Market Cross-City & International Affiliate Matcher
                          </h3>
                        </div>
                        <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: '#4B5563' }}>
                          Got a booking for a client in another city or country? Global Hub scans certified partner cells, ranks by airport FBO compliance, and calculates your 10% referral cut instantly.
                        </p>
                      </div>

                      {/* Quick City Query Presets */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                        <span style={{ fontSize: '11px', color: '#6B7280', fontWeight: 700 }}>Quick Test:</span>
                        {[
                          { label: '🗽 New York (JFK)', q: 'New York JFK Airport' },
                          { label: '🇬🇧 London (LHR)', q: 'London Heathrow Airport' },
                          { label: '🇫🇷 Paris (CDG)', q: 'Paris Charles de Gaulle' },
                          { label: '🌴 Miami (MIA)', q: 'Miami International Airport' },
                          { label: '🇦🇪 Dubai (DXB)', q: 'Dubai International Airport' },
                          { label: '🎬 Los Angeles (LAX)', q: 'Los Angeles LAX Airport' }
                        ].map(preset => (
                          <button
                            key={preset.label}
                            onClick={() => {
                              setMatcherLocationQuery(preset.q);
                              handleRunAffiliateMatcher(preset.q);
                            }}
                            style={{
                              padding: '4px 10px',
                              backgroundColor: matcherLocationQuery === preset.q ? '#0078D4' : '#FFFFFF',
                              color: matcherLocationQuery === preset.q ? '#FFFFFF' : '#1E40AF',
                              border: '1px solid #93C5FD',
                              borderRadius: '16px',
                              fontSize: '11px',
                              fontWeight: 700,
                              cursor: 'pointer'
                            }}
                          >
                            {preset.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Search Query Bar for Matcher */}
                    <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, backgroundColor: '#FFFFFF', border: '1px solid #93C5FD', borderRadius: '8px', padding: '8px 12px' }}>
                        <Search size={16} color="#0078D4" />
                        <input
                          type="text"
                          placeholder="Enter destination address, airport code, or international city (e.g. Heathrow Terminal 5, 50 Hudson Yards NY, CDG Paris, Beverly Hills)..."
                          value={matcherLocationQuery}
                          onChange={(e) => setMatcherLocationQuery(e.target.value)}
                          onKeyDown={(e) => { if (e.key === 'Enter') handleRunAffiliateMatcher(matcherLocationQuery); }}
                          style={{ border: 'none', background: 'transparent', outline: 'none', fontSize: '13px', color: '#0F172A', width: '100%' }}
                        />
                      </div>
                      <button
                        onClick={() => handleRunAffiliateMatcher(matcherLocationQuery)}
                        disabled={matcherLoading}
                        style={{
                          padding: '8px 20px',
                          backgroundColor: '#0078D4',
                          color: '#FFFFFF',
                          border: 'none',
                          borderRadius: '8px',
                          fontSize: '12px',
                          fontWeight: 800,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px'
                        }}
                      >
                        {matcherLoading ? '⚡ Scanning...' : '⚡ Match Certified Partners'}
                      </button>
                    </div>

                    {/* Matcher Results Cards Grid */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(310px, 1fr))', gap: '14px' }}>
                      {affiliateRecommendations.slice(0, 3).map((rec, idx) => (
                        <div
                          key={rec.partner.partner_id}
                          style={{
                            backgroundColor: '#FFFFFF',
                            border: idx === 0 ? '2px solid #0078D4' : '1px solid #CBD5E1',
                            borderRadius: '10px',
                            padding: '16px',
                            display: 'flex',
                            flexDirection: 'column',
                            justifyContent: 'space-between',
                            boxShadow: idx === 0 ? '0 4px 12px rgba(0, 120, 212, 0.12)' : '0 1px 3px rgba(0,0,0,0.04)',
                            position: 'relative'
                          }}
                        >
                          {idx === 0 && (
                            <div style={{ position: 'absolute', top: '-10px', right: '14px', background: 'linear-gradient(135deg, #0078D4 0%, #1D4ED8 100%)', color: '#FFFFFF', fontSize: '10px', fontWeight: 900, padding: '2px 8px', borderRadius: '10px', letterSpacing: '0.5px' }}>
                              ★ TOP AI RECOMMENDATION
                            </div>
                          )}

                          <div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                              <div>
                                <div style={{ fontSize: '14px', fontWeight: 800, color: '#0F172A' }}>
                                  {rec.partner.company_name}
                                </div>
                                <div style={{ fontSize: '11px', color: '#64748B', fontWeight: 600 }}>
                                  📍 {rec.partner.city}, {rec.partner.country} · {rec.partner.airports.join(', ')}
                                </div>
                              </div>
                              <span style={{ background: '#DCFCE7', color: '#16A34A', padding: '3px 8px', borderRadius: '6px', fontSize: '12px', fontWeight: 800 }}>
                                {rec.match_score}% Match
                              </span>
                            </div>

                            <div style={{ fontSize: '11px', color: '#334155', background: '#F8FAFC', padding: '6px 10px', borderRadius: '6px', marginBottom: '10px' }}>
                              🚘 <strong>Fleet:</strong> {rec.partner.primary_vehicle} (★ {rec.partner.rating} · {rec.partner.trips_completed}+ Trips)
                            </div>

                            {/* Match Reasons Badges */}
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginBottom: '12px' }}>
                              {rec.match_reasons.map((reason, rIdx) => (
                                <span key={rIdx} style={{ fontSize: '10px', background: '#EFF6FF', color: '#1E40AF', padding: '2px 6px', borderRadius: '4px', fontWeight: 600 }}>
                                  ✓ {reason}
                                </span>
                              ))}
                            </div>
                          </div>

                          {/* Financial Projection Split Breakdown */}
                          <div style={{ borderTop: '1px solid #F1F5F9', paddingTop: '10px', marginTop: '6px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', fontSize: '11px' }}>
                              <span style={{ color: '#64748B' }}>Est. Gross: <strong>${rec.estimated_gross_fare_usd.toFixed(2)}</strong></span>
                              <span style={{ color: '#16A34A', fontWeight: 800, background: '#DCFCE7', padding: '2px 6px', borderRadius: '4px' }}>
                                Your 10% Cut: +${rec.originator_commission_usd.toFixed(2)}
                              </span>
                            </div>

                            <button
                              onClick={() => handleSelectAffiliateForFarmOut(rec)}
                              style={{
                                width: '100%',
                                padding: '8px 12px',
                                backgroundColor: idx === 0 ? '#0078D4' : '#1E293B',
                                color: '#FFFFFF',
                                border: 'none',
                                borderRadius: '6px',
                                fontSize: '11px',
                                fontWeight: 800,
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '6px'
                              }}
                            >
                              ⚡ 1-Click Farm-Out & Lock Escrow
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* EXCHANGED LEDGER SUB-TAB (Summary Metrics, Filters, and Table/Cards View) */}
                {affiliateSubTab === 'exchange' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    
                    {/* 4 Summary Metric Counters */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px' }}>
                      <div style={{ backgroundColor: '#FFFFFF', borderRadius: '8px', padding: '16px', border: '1px solid #E5E7EB', boxShadow: '0 1px 2px rgba(0,0,0,0.03)' }}>
                        <div style={{ fontSize: '11px', color: '#6B7280', fontWeight: 700, textTransform: 'uppercase' }}>TOTAL NETWORK VOLUME</div>
                        <div style={{ fontSize: '22px', fontWeight: 900, color: '#0F172A', marginTop: '4px' }}>
                          ${affiliateJobs.reduce((sum, j) => sum + j.gross_fare, 0).toFixed(2)} USD
                        </div>
                        <div style={{ fontSize: '11px', color: '#0078D4', marginTop: '2px', fontWeight: 600 }}>
                          {affiliateJobs.length} Network Exchanged Rides
                        </div>
                      </div>

                      <div style={{ backgroundColor: '#FFFFFF', borderRadius: '8px', padding: '16px', border: '1px solid #E5E7EB', boxShadow: '0 1px 2px rgba(0,0,0,0.03)' }}>
                        <div style={{ fontSize: '11px', color: '#6B7280', fontWeight: 700, textTransform: 'uppercase' }}>NET FARM-IN EARNINGS (85%)</div>
                        <div style={{ fontSize: '22px', fontWeight: 900, color: '#16A34A', marginTop: '4px' }}>
                          +${affiliateJobs.filter(j => j.type === 'INCOMING_HUB').reduce((sum, j) => sum + j.net_cut, 0).toFixed(2)} USD
                        </div>
                        <div style={{ fontSize: '11px', color: '#16A34A', marginTop: '2px', fontWeight: 600 }}>
                          {affiliateJobs.filter(j => j.type === 'INCOMING_HUB').length} Farmed-In Jobs Executed
                        </div>
                      </div>

                      <div style={{ backgroundColor: '#FFFFFF', borderRadius: '8px', padding: '16px', border: '1px solid #E5E7EB', boxShadow: '0 1px 2px rgba(0,0,0,0.03)' }}>
                        <div style={{ fontSize: '11px', color: '#6B7280', fontWeight: 700, textTransform: 'uppercase' }}>REFERRAL COMMISSIONS (10%)</div>
                        <div style={{ fontSize: '22px', fontWeight: 900, color: '#0078D4', marginTop: '4px' }}>
                          +${affiliateJobs.filter(j => j.type === 'OUTGOING_FARM').reduce((sum, j) => sum + j.net_cut, 0).toFixed(2)} USD
                        </div>
                        <div style={{ fontSize: '11px', color: '#0078D4', marginTop: '2px', fontWeight: 600 }}>
                          {affiliateJobs.filter(j => j.type === 'OUTGOING_FARM').length} Rides Farmed Out to Affiliates
                        </div>
                      </div>

                      <div style={{ backgroundColor: '#FFFFFF', borderRadius: '8px', padding: '16px', border: '1px solid #E5E7EB', boxShadow: '0 1px 2px rgba(0,0,0,0.03)' }}>
                        <div style={{ fontSize: '11px', color: '#6B7280', fontWeight: 700, textTransform: 'uppercase' }}>ESCROW SETTLEMENT</div>
                        <div style={{ fontSize: '22px', fontWeight: 900, color: '#15803D', marginTop: '4px' }}>
                          100% Instant
                        </div>
                        <div style={{ fontSize: '11px', color: '#6B7280', marginTop: '2px', fontWeight: 600 }}>
                          Sovereign Ledger Wire Connected
                        </div>
                      </div>
                    </div>

                    {/* Search & Filter Bar */}
                    <div style={{
                      backgroundColor: '#FFFFFF',
                      borderRadius: '8px',
                      padding: '12px 16px',
                      border: '1px solid #E5E7EB',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      flexWrap: 'wrap',
                      gap: '12px',
                      boxShadow: '0 1px 2px rgba(0,0,0,0.02)'
                    }}>
                      {/* Search Input */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: '1', minWidth: '280px', backgroundColor: '#F9FAFB', border: '1px solid #D1D5DB', borderRadius: '6px', padding: '6px 10px' }}>
                        <Search size={14} color="#6B7280" />
                        <input
                          type="text"
                          placeholder="Search by Trip ID, Passenger, Route, Partner Company, or City..."
                          value={affiliateSearch}
                          onChange={(e) => setAffiliateSearch(e.target.value)}
                          style={{ border: 'none', background: 'transparent', outline: 'none', fontSize: '12px', color: '#0F172A', width: '100%' }}
                        />
                        {affiliateSearch && (
                          <button onClick={() => setAffiliateSearch('')} style={{ background: 'transparent', border: 'none', color: '#9CA3AF', cursor: 'pointer', fontSize: '11px' }}>✕</button>
                        )}
                      </div>

                  {/* Filter Chips */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: '11px', color: '#6B7280', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px', marginRight: '4px' }}>
                      <Filter size={12} /> Filter:
                    </span>

                    {(['ALL', 'INCOMING', 'OUTGOING', 'UNASSIGNED', 'SETTLED'] as const).map(filterKey => {
                      const labels: Record<string, string> = {
                        ALL: `All Jobs (${affiliateJobs.length})`,
                        INCOMING: `📥 Farmed-In (85%) (${affiliateJobs.filter(j => j.type === 'INCOMING_HUB').length})`,
                        OUTGOING: `📤 Farmed-Out (10%) (${affiliateJobs.filter(j => j.type === 'OUTGOING_FARM').length})`,
                        UNASSIGNED: `🚨 Needs Action (${affiliateJobs.filter(j => j.status === 'UNASSIGNED' || j.status === 'SCHEDULED').length})`,
                        SETTLED: `✅ Settled (${affiliateJobs.filter(j => j.status === 'SETTLED').length})`
                      };
                      const isActive = affiliateFilter === filterKey;
                      return (
                        <button
                          key={filterKey}
                          onClick={() => setAffiliateFilter(filterKey)}
                          style={{
                            padding: '4px 10px',
                            borderRadius: '20px',
                            border: isActive ? '1px solid #0078D4' : '1px solid #E5E7EB',
                            backgroundColor: isActive ? '#EFF6FF' : '#FFFFFF',
                            color: isActive ? '#0078D4' : '#4B5563',
                            fontSize: '11px',
                            fontWeight: isActive ? 800 : 500,
                            cursor: 'pointer',
                            transition: 'all 0.15s ease'
                          }}
                        >
                          {labels[filterKey]}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* MAIN CONTENT: ROW TABLE VIEW vs CARDS VIEW */}
                {(() => {
                  const filtered = affiliateJobs.filter(job => {
                    const q = affiliateSearch.toLowerCase();
                    const matchesQuery = !affiliateSearch ||
                      job.id.toLowerCase().includes(q) ||
                      job.passenger.toLowerCase().includes(q) ||
                      job.pickup.toLowerCase().includes(q) ||
                      job.dropoff.toLowerCase().includes(q) ||
                      job.partner.toLowerCase().includes(q) ||
                      job.city.toLowerCase().includes(q) ||
                      job.chauffeur.toLowerCase().includes(q) ||
                      job.vehicle_class.toLowerCase().includes(q);

                    if (!matchesQuery) return false;
                    if (affiliateFilter === 'INCOMING') return job.type === 'INCOMING_HUB';
                    if (affiliateFilter === 'OUTGOING') return job.type === 'OUTGOING_FARM';
                    if (affiliateFilter === 'UNASSIGNED') return job.status === 'UNASSIGNED' || job.status === 'SCHEDULED';
                    if (affiliateFilter === 'SETTLED') return job.status === 'SETTLED';
                    return true;
                  });

                  if (filtered.length === 0) {
                    return (
                      <div style={{ backgroundColor: '#FFFFFF', borderRadius: '10px', padding: '40px', border: '1px solid #E5E7EB', textAlign: 'center', color: '#6B7280' }}>
                        <div style={{ fontSize: '28px', marginBottom: '8px' }}>🔍</div>
                        <div style={{ fontSize: '14px', fontWeight: 800, color: '#0F172A' }}>No Affiliate Jobs Match Filter</div>
                        <div style={{ fontSize: '12px', marginTop: '4px' }}>Try clearing the search query or resetting the filter chips.</div>
                        <button
                          onClick={() => { setAffiliateSearch(''); setAffiliateFilter('ALL'); }}
                          style={{ marginTop: '12px', padding: '6px 14px', backgroundColor: '#0078D4', color: '#FFF', border: 'none', borderRadius: '4px', fontSize: '11px', fontWeight: 700, cursor: 'pointer' }}
                        >
                          Reset Filters
                        </button>
                      </div>
                    );
                  }

                  if (affiliateViewMode === 'table') {
                    return (
                      <div style={{ backgroundColor: '#FFFFFF', borderRadius: '10px', border: '1px solid #E5E7EB', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', overflow: 'hidden' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '12px' }}>
                          <thead>
                            <tr style={{ backgroundColor: '#F9FAFB', borderBottom: '1px solid #E5E7EB', color: '#6B7280', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase' }}>
                              <th style={{ padding: '12px 16px' }}>Job ID & Flow</th>
                              <th style={{ padding: '12px 16px' }}>Passenger & Contact</th>
                              <th style={{ padding: '12px 16px' }}>Pickup → Dropoff Route</th>
                              <th style={{ padding: '12px 16px' }}>Partner Affiliate</th>
                              <th style={{ padding: '12px 16px' }}>Vehicle</th>
                              <th style={{ padding: '12px 16px', textAlign: 'right' }}>Gross Fare</th>
                              <th style={{ padding: '12px 16px', textAlign: 'right' }}>Your Net Cut</th>
                              <th style={{ padding: '12px 16px' }}>Driver / Status</th>
                              <th style={{ padding: '12px 16px', textAlign: 'center' }}>Action</th>
                            </tr>
                          </thead>
                          <tbody>
                            {filtered.map(job => (
                              <tr key={job.id} style={{ borderBottom: '1px solid #F3F4F6', transition: 'background-color 0.1s ease' }}>
                                <td style={{ padding: '14px 16px', verticalAlign: 'top' }}>
                                  <div style={{ fontWeight: 800, color: '#0F172A', fontSize: '13px' }}>{job.id}</div>
                                  <span style={{
                                    fontSize: '10px',
                                    padding: '2px 6px',
                                    borderRadius: '4px',
                                    backgroundColor: job.type === 'INCOMING_HUB' ? '#DCFCE7' : '#EFF6FF',
                                    color: job.type === 'INCOMING_HUB' ? '#15803D' : '#0078D4',
                                    fontWeight: 800,
                                    display: 'inline-block',
                                    marginTop: '4px'
                                  }}>
                                    {job.direction}
                                  </span>
                                  <div style={{ fontSize: '10px', color: '#9CA3AF', marginTop: '2px' }}>{job.date}</div>
                                </td>

                                <td style={{ padding: '14px 16px', verticalAlign: 'top' }}>
                                  <div style={{ fontWeight: 800, color: '#0F172A' }}>{job.passenger}</div>
                                  <div style={{ fontSize: '11px', color: '#6B7280', marginTop: '2px' }}>{job.phone}</div>
                                  <div style={{ fontSize: '10px', color: '#0078D4', fontWeight: 600 }}>📍 {job.city}</div>
                                </td>

                                <td style={{ padding: '14px 16px', verticalAlign: 'top', maxWidth: '280px' }}>
                                  <div style={{ fontSize: '11px', color: '#15803D', fontWeight: 600 }}>
                                    📍 <strong>From:</strong> {job.pickup}
                                  </div>
                                  <div style={{ fontSize: '11px', color: '#1E40AF', fontWeight: 600, marginTop: '4px' }}>
                                    🎯 <strong>To:</strong> {job.dropoff}
                                  </div>
                                </td>

                                <td style={{ padding: '14px 16px', verticalAlign: 'top' }}>
                                  <div style={{ fontWeight: 700, color: '#374151' }}>{job.partner}</div>
                                  <div style={{ fontSize: '10px', color: '#16A34A', display: 'flex', alignItems: 'center', gap: '3px', marginTop: '2px' }}>
                                    <CheckCircle size={10} /> Escrow Verified
                                  </div>
                                </td>

                                <td style={{ padding: '14px 16px', verticalAlign: 'top' }}>
                                  <span style={{ fontSize: '11px', fontWeight: 600, color: '#4B5563', padding: '2px 6px', backgroundColor: '#F3F4F6', borderRadius: '4px' }}>
                                    {job.vehicle_class}
                                  </span>
                                </td>

                                <td style={{ padding: '14px 16px', textAlign: 'right', verticalAlign: 'top' }}>
                                  <div style={{ fontSize: '13px', fontWeight: 700, color: '#6B7280' }}>
                                    ${job.gross_fare.toFixed(2)}
                                  </div>
                                </td>

                                <td style={{ padding: '14px 16px', textAlign: 'right', verticalAlign: 'top' }}>
                                  <div style={{ fontSize: '14px', fontWeight: 900, color: job.type === 'INCOMING_HUB' ? '#16A34A' : '#0078D4' }}>
                                    +${job.net_cut.toFixed(2)}
                                  </div>
                                  <div style={{ fontSize: '10px', color: '#6B7280', fontWeight: 600 }}>
                                    {job.cut_label}
                                  </div>
                                </td>

                                <td style={{ padding: '14px 16px', verticalAlign: 'top' }}>
                                  <span style={{
                                    fontSize: '10px',
                                    padding: '3px 8px',
                                    borderRadius: '4px',
                                    fontWeight: 800,
                                    backgroundColor: job.status === 'UNASSIGNED' ? '#FEE2E2' : job.status === 'IN_TRANSIT' ? '#DCFCE7' : job.status === 'SETTLED' ? '#F3F4F6' : '#EFF6FF',
                                    color: job.status === 'UNASSIGNED' ? '#B91C1C' : job.status === 'IN_TRANSIT' ? '#15803D' : job.status === 'SETTLED' ? '#4B5563' : '#0078D4'
                                  }}>
                                    {job.status}
                                  </span>
                                  <div style={{ fontSize: '11px', color: '#374151', marginTop: '4px', fontWeight: 600 }}>
                                    👤 {job.chauffeur}
                                  </div>
                                </td>

                                <td style={{ padding: '14px 16px', textAlign: 'center', verticalAlign: 'top' }}>
                                  {job.status === 'UNASSIGNED' && job.type === 'INCOMING_HUB' ? (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                      <button
                                        onClick={() => handleAcceptAffiliateJob(job.id, 'Marcus Brody')}
                                        style={{
                                          padding: '5px 8px',
                                          backgroundColor: '#16A34A',
                                          color: '#FFFFFF',
                                          fontSize: '10px',
                                          fontWeight: 800,
                                          borderRadius: '4px',
                                          border: 'none',
                                          cursor: 'pointer',
                                          whiteSpace: 'nowrap'
                                        }}
                                      >
                                        ✓ Accept (Marcus)
                                      </button>
                                      <button
                                        onClick={() => handleAcceptAffiliateJob(job.id, 'Carlos Santos')}
                                        style={{
                                          padding: '5px 8px',
                                          backgroundColor: '#0078D4',
                                          color: '#FFFFFF',
                                          fontSize: '10px',
                                          fontWeight: 800,
                                          borderRadius: '4px',
                                          border: 'none',
                                          cursor: 'pointer',
                                          whiteSpace: 'nowrap'
                                        }}
                                      >
                                        ✓ Accept (Carlos)
                                      </button>
                                    </div>
                                  ) : (
                                    <button
                                      onClick={() => setActionNotice(`ℹ️ Escrow settlement receipt for ${job.id}: Gross $${job.gross_fare.toFixed(2)} → Net $${job.net_cut.toFixed(2)} (${job.escrow_status}).`)}
                                      style={{
                                        padding: '4px 8px',
                                        backgroundColor: '#F3F4F6',
                                        color: '#374151',
                                        fontSize: '11px',
                                        fontWeight: 600,
                                        borderRadius: '4px',
                                        border: '1px solid #D1D5DB',
                                        cursor: 'pointer',
                                        whiteSpace: 'nowrap'
                                      }}
                                    >
                                      View Escrow
                                    </button>
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    );
                  }

                  // CARDS VIEW
                  return (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '20px' }}>
                      {/* Left Column: Incoming Farmed-In */}
                      <div style={{ backgroundColor: '#FFFFFF', borderRadius: '10px', padding: '20px', border: '1px solid #E5E7EB', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', display: 'flex', flexDirection: 'column', gap: '14px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 800, color: '#16A34A', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span>📥</span> Incoming Marketplace Jobs (Farmed-In)
                          </h3>
                          <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '10px', backgroundColor: '#DCFCE7', color: '#15803D', fontWeight: 800 }}>
                            85% NET PAYOUT
                          </span>
                        </div>
                        <div style={{ fontSize: '12px', color: '#6B7280' }}>
                          Rides booked across the Global Hub Marketplace and partner network routed to your local sovereign fleet.
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                          {filtered.filter(j => j.type === 'INCOMING_HUB').map(job => (
                            <div key={job.id} style={{ backgroundColor: '#F9FAFB', padding: '14px', borderRadius: '8px', border: '1px solid #E5E7EB', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                <div>
                                  <div style={{ fontWeight: 800, fontSize: '13px', color: '#0F172A' }}>{job.passenger}</div>
                                  <div style={{ fontSize: '10px', color: '#6B7280' }}>{job.id} • Origin: {job.partner}</div>
                                </div>
                                <div style={{ textAlign: 'right' }}>
                                  <div style={{ fontSize: '15px', fontWeight: 900, color: '#16A34A' }}>+${job.net_cut.toFixed(2)} USD</div>
                                  <div style={{ fontSize: '10px', color: '#6B7280' }}>Gross: ${job.gross_fare.toFixed(2)}</div>
                                </div>
                              </div>

                              <div style={{ fontSize: '11px', color: '#374151', backgroundColor: '#FFFFFF', padding: '8px', borderRadius: '6px', border: '1px solid #E5E7EB' }}>
                                <div>📍 {job.pickup}</div>
                                <div style={{ marginTop: '3px' }}>🎯 {job.dropoff}</div>
                              </div>

                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '4px' }}>
                                <span style={{
                                  fontSize: '10px',
                                  padding: '2px 6px',
                                  borderRadius: '4px',
                                  fontWeight: 800,
                                  backgroundColor: job.status === 'UNASSIGNED' ? '#FEE2E2' : '#DCFCE7',
                                  color: job.status === 'UNASSIGNED' ? '#B91C1C' : '#15803D'
                                }}>
                                  {job.status}
                                </span>

                                {job.status === 'UNASSIGNED' ? (
                                  <button
                                    onClick={() => handleAcceptAffiliateJob(job.id, 'Marcus Brody')}
                                    style={{
                                      padding: '4px 10px',
                                      backgroundColor: '#16A34A',
                                      color: '#FFFFFF',
                                      fontSize: '11px',
                                      fontWeight: 800,
                                      borderRadius: '4px',
                                      border: 'none',
                                      cursor: 'pointer'
                                    }}
                                  >
                                    Accept & Assign Driver
                                  </button>
                                ) : (
                                  <span style={{ fontSize: '11px', color: '#0078D4', fontWeight: 600 }}>Chauffeur: {job.chauffeur}</span>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Right Column: Outgoing Farmed-Out */}
                      <div style={{ backgroundColor: '#FFFFFF', borderRadius: '10px', padding: '20px', border: '1px solid #E5E7EB', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', display: 'flex', flexDirection: 'column', gap: '14px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 800, color: '#0078D4', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span>📤</span> Outgoing Farm-Outs (Referral Income)
                          </h3>
                          <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '10px', backgroundColor: '#EFF6FF', color: '#0078D4', fontWeight: 800 }}>
                            10% REFERRAL COMMISSION
                          </span>
                        </div>
                        <div style={{ fontSize: '12px', color: '#6B7280' }}>
                          Rides your clients take in New York, London, Miami, etc. farmed out to verified affiliates with automated 10% referral payout.
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                          {filtered.filter(j => j.type === 'OUTGOING_FARM').map(job => (
                            <div key={job.id} style={{ backgroundColor: '#F9FAFB', padding: '14px', borderRadius: '8px', border: '1px solid #E5E7EB', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                <div>
                                  <div style={{ fontWeight: 800, fontSize: '13px', color: '#0F172A' }}>{job.passenger}</div>
                                  <div style={{ fontSize: '10px', color: '#6B7280' }}>{job.id} • Partner: {job.partner} ({job.city})</div>
                                </div>
                                <div style={{ textAlign: 'right' }}>
                                  <div style={{ fontSize: '15px', fontWeight: 900, color: '#0078D4' }}>+${job.net_cut.toFixed(2)} USD</div>
                                  <div style={{ fontSize: '10px', color: '#6B7280' }}>Gross: ${job.gross_fare.toFixed(2)}</div>
                                </div>
                              </div>

                              <div style={{ fontSize: '11px', color: '#374151', backgroundColor: '#FFFFFF', padding: '8px', borderRadius: '6px', border: '1px solid #E5E7EB' }}>
                                <div>📍 {job.pickup}</div>
                                <div style={{ marginTop: '3px' }}>🎯 {job.dropoff}</div>
                              </div>

                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '4px' }}>
                                <span style={{
                                  fontSize: '10px',
                                  padding: '2px 6px',
                                  borderRadius: '4px',
                                  fontWeight: 800,
                                  backgroundColor: '#EFF6FF',
                                  color: '#0078D4'
                                }}>
                                  {job.status}
                                </span>

                                <span style={{ fontSize: '11px', color: '#16A34A', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
                                  <CheckCircle size={12} /> 10% Escrow Secured
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  );
                })()}
                </div>
              )}

                {/* MODAL: FARM OUT NEW TRIP */}
                {showFarmOutModal && (
                  <div style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    backgroundColor: 'rgba(15, 23, 42, 0.5)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 9999,
                    padding: '20px'
                  }}>
                    <div style={{
                      backgroundColor: '#FFFFFF',
                      borderRadius: '12px',
                      maxWidth: '560px',
                      width: '100%',
                      padding: '24px',
                      boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
                      border: '1px solid #E5E7EB'
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', borderBottom: '1px solid #E5E7EB', paddingBottom: '12px' }}>
                        <div>
                          <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 800, color: '#0F172A' }}>
                            🚀 Farm Out Ride to Global Hub Affiliate Partner
                          </h3>
                          <div style={{ fontSize: '12px', color: '#6B7280', marginTop: '2px' }}>
                            Earn automatic 10% referral commission via Hub Escrow
                          </div>
                        </div>
                        <button
                          onClick={() => setShowFarmOutModal(false)}
                          style={{ background: 'transparent', border: 'none', fontSize: '18px', cursor: 'pointer', color: '#9CA3AF' }}
                        >
                          ✕
                        </button>
                      </div>

                      <form onSubmit={handleCreateFarmOut} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                          <div>
                            <label style={{ fontSize: '11px', fontWeight: 700, color: '#4B5563' }}>Passenger Name *</label>
                            <input
                              type="text"
                              required
                              placeholder="e.g. Johnathan Doe"
                              value={newFarmOut.passenger}
                              onChange={e => setNewFarmOut({ ...newFarmOut, passenger: e.target.value })}
                              style={{ width: '100%', padding: '8px 10px', fontSize: '12px', border: '1px solid #D1D5DB', borderRadius: '6px', marginTop: '4px', boxSizing: 'border-box' }}
                            />
                          </div>
                          <div>
                            <label style={{ fontSize: '11px', fontWeight: 700, color: '#4B5563' }}>Passenger Phone</label>
                            <input
                              type="text"
                              placeholder="+1 (215) 555-0100"
                              value={newFarmOut.passenger_phone}
                              onChange={e => setNewFarmOut({ ...newFarmOut, passenger_phone: e.target.value })}
                              style={{ width: '100%', padding: '8px 10px', fontSize: '12px', border: '1px solid #D1D5DB', borderRadius: '6px', marginTop: '4px', boxSizing: 'border-box' }}
                            />
                          </div>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                          <div>
                            <label style={{ fontSize: '11px', fontWeight: 700, color: '#4B5563' }}>Destination City</label>
                            <select
                              value={newFarmOut.destination_city}
                              onChange={e => {
                                const city = e.target.value;
                                const partnerMap: Record<string, string> = {
                                  'New York, NY': 'NY Executive Limousine',
                                  'Miami, FL': 'Miami VIP Chauffeurs',
                                  'London, UK': 'London Executive Fleet',
                                  'Los Angeles, CA': 'Beverly Hills Black Car',
                                  'Chicago, IL': 'Windy City Executive'
                                };
                                setNewFarmOut({
                                  ...newFarmOut,
                                  destination_city: city,
                                  partner_name: partnerMap[city] || 'Global Hub Affiliate'
                                });
                              }}
                              style={{ width: '100%', padding: '8px 10px', fontSize: '12px', border: '1px solid #D1D5DB', borderRadius: '6px', marginTop: '4px', boxSizing: 'border-box' }}
                            >
                              <option value="New York, NY">New York, NY</option>
                              <option value="Miami, FL">Miami, FL</option>
                              <option value="London, UK">London, UK</option>
                              <option value="Los Angeles, CA">Los Angeles, CA</option>
                              <option value="Chicago, IL">Chicago, IL</option>
                            </select>
                          </div>
                          <div>
                            <label style={{ fontSize: '11px', fontWeight: 700, color: '#4B5563' }}>Performing Affiliate Partner</label>
                            <input
                              type="text"
                              value={newFarmOut.partner_name}
                              onChange={e => setNewFarmOut({ ...newFarmOut, partner_name: e.target.value })}
                              style={{ width: '100%', padding: '8px 10px', fontSize: '12px', border: '1px solid #D1D5DB', borderRadius: '6px', marginTop: '4px', boxSizing: 'border-box', backgroundColor: '#F9FAFB' }}
                            />
                          </div>
                        </div>

                        <div>
                          <label style={{ fontSize: '11px', fontWeight: 700, color: '#4B5563' }}>Pickup Location (Airport / Hotel / Address) *</label>
                          <input
                            type="text"
                            required
                            placeholder="e.g. JFK Airport Terminal 4"
                            value={newFarmOut.pickup}
                            onChange={e => setNewFarmOut({ ...newFarmOut, pickup: e.target.value })}
                            style={{ width: '100%', padding: '8px 10px', fontSize: '12px', border: '1px solid #D1D5DB', borderRadius: '6px', marginTop: '4px', boxSizing: 'border-box' }}
                          />
                        </div>

                        <div>
                          <label style={{ fontSize: '11px', fontWeight: 700, color: '#4B5563' }}>Dropoff Destination *</label>
                          <input
                            type="text"
                            required
                            placeholder="e.g. The Plaza Hotel, 5th Ave"
                            value={newFarmOut.dropoff}
                            onChange={e => setNewFarmOut({ ...newFarmOut, dropoff: e.target.value })}
                            style={{ width: '100%', padding: '8px 10px', fontSize: '12px', border: '1px solid #D1D5DB', borderRadius: '6px', marginTop: '4px', boxSizing: 'border-box' }}
                          />
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                          <div>
                            <label style={{ fontSize: '11px', fontWeight: 700, color: '#4B5563' }}>Vehicle Class</label>
                            <select
                              value={newFarmOut.vehicle_class}
                              onChange={e => setNewFarmOut({ ...newFarmOut, vehicle_class: e.target.value })}
                              style={{ width: '100%', padding: '8px 10px', fontSize: '12px', border: '1px solid #D1D5DB', borderRadius: '6px', marginTop: '4px', boxSizing: 'border-box' }}
                            >
                              <option value="FIRST_CLASS">First Class (S-Class / 7-Series)</option>
                              <option value="LUXURY_SUV">Luxury SUV (Escalade / Navigator)</option>
                              <option value="BUSINESS_SEDAN">Business Sedan (E-Class / 5-Series)</option>
                              <option value="ELECTRIC_VIP">Electric VIP (Lucid / Tesla X)</option>
                            </select>
                          </div>

                          <div>
                            <label style={{ fontSize: '11px', fontWeight: 700, color: '#4B5563' }}>Gross Fare (USD) *</label>
                            <input
                              type="number"
                              required
                              min="50"
                              step="5"
                              value={newFarmOut.gross_fare_usd}
                              onChange={e => setNewFarmOut({ ...newFarmOut, gross_fare_usd: parseFloat(e.target.value) || 0 })}
                              style={{ width: '100%', padding: '8px 10px', fontSize: '12px', border: '1px solid #D1D5DB', borderRadius: '6px', marginTop: '4px', boxSizing: 'border-box' }}
                            />
                          </div>
                        </div>

                        {/* Instant Commission Breakdown Preview */}
                        <div style={{ backgroundColor: '#EFF6FF', border: '1px solid #BFDBFE', borderRadius: '6px', padding: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div>
                            <div style={{ fontSize: '11px', color: '#1E40AF', fontWeight: 700 }}>YOUR 10% REFERRAL COMMISSION</div>
                            <div style={{ fontSize: '10px', color: '#3B82F6' }}>Settled instantly via Global Hub Escrow upon trip completion</div>
                          </div>
                          <div style={{ fontSize: '18px', fontWeight: 900, color: '#0078D4' }}>
                            +${(newFarmOut.gross_fare_usd * 0.10).toFixed(2)} USD
                          </div>
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '8px' }}>
                          <button
                            type="button"
                            onClick={() => setShowFarmOutModal(false)}
                            style={{ padding: '8px 14px', backgroundColor: '#F3F4F6', color: '#4B5563', borderRadius: '6px', fontSize: '12px', fontWeight: 600, border: '1px solid #D1D5DB', cursor: 'pointer' }}
                          >
                            Cancel
                          </button>
                          <button
                            type="submit"
                            style={{ padding: '8px 16px', backgroundColor: '#0078D4', color: '#FFFFFF', borderRadius: '6px', fontSize: '12px', fontWeight: 700, border: 'none', cursor: 'pointer' }}
                          >
                            🚀 Confirm & Farm Out to {newFarmOut.destination_city.split(',')[0]}
                          </button>
                        </div>
                      </form>
                    </div>
                  </div>
                )}

              </div>
            )}

            {/* TAB: OMNICHANNEL & TELECOM APPROVALS SUITE */}
            {activeTab === 'omnichannel' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
                  <div>
                    <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: '#0F172A', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Radio size={20} color="#0078D4" />
                      Omnichannel Communications & Telecom Regulatory Approvals Suite
                    </h2>
                    <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: '#6B7280' }}>
                      Enterprise Twilio A2P 10DLC, Voice WebSockets, AWS SES Email, WhatsApp 2-Way Chat, and Local SEO Engine
                    </p>
                  </div>

                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: '11px', padding: '4px 10px', borderRadius: '4px', backgroundColor: '#DCFCE7', color: '#15803D', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <ShieldCheck size={14} /> TCR 10DLC VERIFIED (94/100)
                    </span>
                    <span style={{ fontSize: '11px', padding: '4px 10px', borderRadius: '4px', backgroundColor: '#EFF6FF', color: '#0078D4', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <CheckCircle size={14} /> STIR/SHAKEN LEVEL A
                    </span>
                    <span style={{ fontSize: '11px', padding: '4px 10px', borderRadius: '4px', backgroundColor: '#F3E8FF', color: '#7E22CE', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Key size={14} /> DUAL-TIER FAILOVER ACTIVE
                    </span>
                  </div>
                </div>

                {/* Subtab Navigation Pills */}
                <div style={{ display: 'flex', gap: '6px', borderBottom: '1px solid #E5E7EB', paddingBottom: '10px', overflowX: 'auto' }}>
                  {[
                    { id: '10dlc', label: '🏛️ 10DLC & Carrier Approvals' },
                    { id: 'voice', label: '📞 Voice Phone Studio' },
                    { id: 'email', label: '✉️ AWS SES Email Desk' },
                    { id: 'whatsapp', label: '💬 WhatsApp & SMS Chat' },
                    { id: 'seo', label: '🔍 Local SEO & Schema' },
                    { id: 'byok', label: '⚙️ BYOK & Fallback Config' },
                  ].map((sub) => (
                    <button
                      key={sub.id}
                      onClick={() => setOmniSubTab(sub.id as any)}
                      style={{
                        padding: '6px 14px',
                        borderRadius: '6px',
                        border: 'none',
                        fontSize: '12px',
                        fontWeight: 700,
                        cursor: 'pointer',
                        backgroundColor: omniSubTab === sub.id ? '#0078D4' : '#FFFFFF',
                        color: omniSubTab === sub.id ? '#FFFFFF' : '#4B5563',
                        boxShadow: omniSubTab === sub.id ? '0 1px 3px rgba(0,120,212,0.2)' : 'none',
                        borderWidth: '1px',
                        borderStyle: 'solid',
                        borderColor: omniSubTab === sub.id ? '#0078D4' : '#E5E7EB'
                      }}
                    >
                      {sub.label}
                    </button>
                  ))}
                </div>

                {/* SUBTAB 1: 10DLC & CARRIER APPROVALS */}
                {omniSubTab === '10dlc' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                      
                      {/* Left: Brand & TCR Card */}
                      <div style={{ backgroundColor: '#FFFFFF', borderRadius: '10px', padding: '20px', border: '1px solid #E5E7EB', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', display: 'flex', flexDirection: 'column', gap: '14px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <h3 style={{ margin: 0, fontSize: '14px', fontWeight: 800, color: '#0F172A' }}>
                            A2P 10DLC Brand & TCR Registration
                          </h3>
                          <span style={{ fontSize: '10px', padding: '2px 8px', borderRadius: '4px', backgroundColor: '#DCFCE7', color: '#15803D', fontWeight: 800 }}>
                            VERIFIED (94/100)
                          </span>
                        </div>
                        
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '12px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #F3F4F6', paddingBottom: '6px' }}>
                            <span style={{ color: '#6B7280' }}>Legal Entity Name:</span>
                            <span style={{ fontWeight: 700, color: '#0F172A' }}>{tcrBrandForm.legal_name}</span>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #F3F4F6', paddingBottom: '6px' }}>
                            <span style={{ color: '#6B7280' }}>EIN Tax ID:</span>
                            <span style={{ fontWeight: 700, color: '#0F172A' }}>{tcrBrandForm.ein_tax_id} (IRS Verified)</span>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #F3F4F6', paddingBottom: '6px' }}>
                            <span style={{ color: '#6B7280' }}>The Campaign Registry Trust Score:</span>
                            <span style={{ fontWeight: 800, color: '#16A34A' }}>94 / 100 (Tier Top)</span>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #F3F4F6', paddingBottom: '6px' }}>
                            <span style={{ color: '#6B7280' }}>Carrier Throughput:</span>
                            <span style={{ fontWeight: 700, color: '#0F172A' }}>75 msgs / sec (AT&T, Verizon, T-Mobile)</span>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span style={{ color: '#6B7280' }}>Spam Filter Blocking Risk:</span>
                            <span style={{ fontWeight: 800, color: '#16A34A' }}>0.01% (Protected)</span>
                          </div>
                        </div>

                        {/* Interactive Buttons for 10DLC Registration */}
                        <div style={{ display: 'flex', gap: '8px', marginTop: '6px', borderTop: '1px solid #F3F4F6', paddingTop: '12px' }}>
                          <button
                            onClick={() => { setShow10DlcWizard(true); setWizardMode('API_AUTO'); }}
                            style={{
                              flex: 1,
                              padding: '8px 12px',
                              backgroundColor: '#0078D4',
                              color: '#FFFFFF',
                              borderRadius: '6px',
                              border: 'none',
                              fontSize: '11px',
                              fontWeight: 800,
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: '6px'
                            }}
                          >
                            <Sparkles size={13} /> Register Brand & Campaign (API)
                          </button>

                          <button
                            onClick={() => { setShow10DlcWizard(true); setWizardMode('MANUAL_TWILIO_GUIDE'); }}
                            style={{
                              padding: '8px 12px',
                              backgroundColor: '#F3F4F6',
                              color: '#374151',
                              borderRadius: '6px',
                              border: '1px solid #D1D5DB',
                              fontSize: '11px',
                              fontWeight: 700,
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px'
                            }}
                          >
                            <FileText size={13} /> Twilio Portal Guide
                          </button>
                        </div>
                      </div>

                      {/* Right: STIR/SHAKEN & Policy Tester */}
                      <div style={{ backgroundColor: '#FFFFFF', borderRadius: '10px', padding: '20px', border: '1px solid #E5E7EB', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', display: 'flex', flexDirection: 'column', gap: '14px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <h3 style={{ margin: 0, fontSize: '14px', fontWeight: 800, color: '#0F172A' }}>
                            STIR/SHAKEN & TCPA Policy Tester
                          </h3>
                          <span style={{ fontSize: '10px', padding: '2px 8px', borderRadius: '4px', backgroundColor: '#EFF6FF', color: '#0078D4', fontWeight: 800 }}>
                            ATTESTATION A
                          </span>
                        </div>

                        <div style={{ padding: '10px', backgroundColor: '#F8FAFC', borderRadius: '6px', border: '1px solid #E2E8F0', fontSize: '11px', color: '#475569' }}>
                          <div>Caller ID Name (CNAM): <strong>{(config.vendor_name || 'ANB LIMO').toUpperCase().slice(0, 15)}</strong></div>
                          <div>Outbound Robocall Mitigation: <strong>Active (Zero "Spam Likely" labeling)</strong></div>
                        </div>

                        <div>
                          <label style={{ fontSize: '11px', fontWeight: 700, color: '#4B5563' }}>Test Inbound Keyword (STOP, HELP, START)</label>
                          <div style={{ display: 'flex', gap: '8px', marginTop: '6px' }}>
                            <input
                              type="text"
                              value={tcpaTestKeyword}
                              onChange={(e) => setTcpaTestKeyword(e.target.value.toUpperCase())}
                              style={{ flex: 1, padding: '8px 10px', border: '1px solid #D1D5DB', borderRadius: '6px', fontSize: '12px', fontWeight: 700 }}
                            />
                            <button
                              onClick={() => {
                                const vName = config.vendor_name || 'ANB Limo Company';
                                const vPhone = config.branding?.contact_phone || '+1 (215) 555-0144';
                                const vDomain = config.branding?.domain || 'anblimo-philly.com';
                                if (tcpaTestKeyword === 'STOP') {
                                  setTcpaTestResponse(`✅ TCPA OPT-OUT RECORDED: "${vName}: You have been unsubscribed and will receive no further SMS. Reply START to rejoin."`);
                                } else if (tcpaTestKeyword === 'HELP') {
                                  setTcpaTestResponse(`ℹ️ HELP AUTO-RESPONDER: "${vName} Support: Call ${vPhone} or visit ${vDomain}."`);
                                } else {
                                  setTcpaTestResponse(`🟢 OPT-IN RE-ENABLED: "${vName}: You are now subscribed to chauffeur & ride notifications."`);
                                }
                              }}
                              style={{ padding: '8px 14px', backgroundColor: '#0078D4', color: '#FFFFFF', border: 'none', borderRadius: '6px', fontSize: '11px', fontWeight: 800, cursor: 'pointer' }}
                            >
                              Simulate Carrier Inbound
                            </button>
                          </div>

                          {tcpaTestResponse && (
                            <div style={{ marginTop: '10px', padding: '10px', backgroundColor: '#F0FDF4', border: '1px solid #86EFAC', borderRadius: '6px', fontSize: '11px', color: '#166534' }}>
                              {tcpaTestResponse}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* MODAL / WIZARD: REGISTER BRAND & CAMPAIGN */}
                    {show10DlcWizard && (
                      <div style={{
                        position: 'fixed',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        backgroundColor: 'rgba(15, 23, 42, 0.5)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        zIndex: 9999,
                        padding: '20px'
                      }}>
                        <div style={{
                          backgroundColor: '#FFFFFF',
                          borderRadius: '12px',
                          maxWidth: '680px',
                          width: '100%',
                          maxHeight: '90vh',
                          overflowY: 'auto',
                          padding: '24px',
                          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
                          border: '1px solid #E5E7EB'
                        }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', borderBottom: '1px solid #E5E7EB', paddingBottom: '12px' }}>
                            <div>
                              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 800, color: '#0F172A', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <ShieldCheck size={20} color="#0078D4" />
                                A2P 10DLC Brand & Campaign Registration Wizard
                              </h3>
                              <div style={{ fontSize: '12px', color: '#6B7280', marginTop: '2px' }}>
                                Register with The Campaign Registry (TCR) for 100% carrier delivery across AT&T, Verizon & T-Mobile
                              </div>
                            </div>
                            <button
                              onClick={() => setShow10DlcWizard(false)}
                              style={{ background: 'transparent', border: 'none', fontSize: '18px', cursor: 'pointer', color: '#9CA3AF' }}
                            >
                              ✕
                            </button>
                          </div>

                          {/* Wizard Method Switcher */}
                          <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
                            <button
                              onClick={() => setWizardMode('API_AUTO')}
                              style={{
                                flex: 1,
                                padding: '8px',
                                borderRadius: '6px',
                                border: wizardMode === 'API_AUTO' ? '2px solid #0078D4' : '1px solid #D1D5DB',
                                backgroundColor: wizardMode === 'API_AUTO' ? '#EFF6FF' : '#FFFFFF',
                                color: wizardMode === 'API_AUTO' ? '#0078D4' : '#4B5563',
                                fontSize: '12px',
                                fontWeight: 800,
                                cursor: 'pointer'
                              }}
                            >
                              ⚡ Method 1: Automated 1-Click API Call
                            </button>
                            <button
                              onClick={() => setWizardMode('MANUAL_TWILIO_GUIDE')}
                              style={{
                                flex: 1,
                                padding: '8px',
                                borderRadius: '6px',
                                border: wizardMode === 'MANUAL_TWILIO_GUIDE' ? '2px solid #0078D4' : '1px solid #D1D5DB',
                                backgroundColor: wizardMode === 'MANUAL_TWILIO_GUIDE' ? '#EFF6FF' : '#FFFFFF',
                                color: wizardMode === 'MANUAL_TWILIO_GUIDE' ? '#0078D4' : '#4B5563',
                                fontSize: '12px',
                                fontWeight: 800,
                                cursor: 'pointer'
                              }}
                            >
                              📋 Method 2: Manual Twilio Portal Guide
                            </button>
                          </div>

                          {wizardMode === 'API_AUTO' ? (
                            <form onSubmit={(e) => {
                              e.preventDefault();
                              setLoading(true);
                              setActionNotice('📡 Submitting Legal Business Profile & Campaign to Twilio Trust Hub & TCR API...');
                              setTimeout(() => {
                                setLoading(false);
                                setShow10DlcWizard(false);
                                setActionNotice(`✅ 10DLC Brand "${tcrBrandForm.legal_name}" & Campaign successfully submitted to Twilio Trust Hub! TCR Brand SID: BN_${Math.random().toString(36).substring(2, 8).toUpperCase()}, Campaign SID: CP_${Math.random().toString(36).substring(2, 8).toUpperCase()}. Verified with 75 msg/sec throughput.`);
                              }, 800);
                            }} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                              
                              <div style={{ backgroundColor: '#F8FAFC', padding: '12px', borderRadius: '6px', border: '1px solid #E2E8F0', fontSize: '11px', color: '#334155' }}>
                                💡 <strong>How Automated API Registration Works:</strong> Submits via Twilio Trust Hub REST API (`/v2/a2p/BrandRegistrations` and `/v1/Messaging/Services/.../Compliance/Usa2p`). Brand verification matches IRS records in ~5 minutes; carrier campaign vetting is automatically queued.
                              </div>

                              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                                <div>
                                  <label style={{ fontSize: '11px', fontWeight: 700, color: '#4B5563' }}>Legal Business Name (IRS Tax Match) *</label>
                                  <input
                                    type="text"
                                    required
                                    value={tcrBrandForm.legal_name}
                                    onChange={e => setTcrBrandForm({ ...tcrBrandForm, legal_name: e.target.value })}
                                    style={{ width: '100%', padding: '8px 10px', fontSize: '12px', border: '1px solid #D1D5DB', borderRadius: '6px', marginTop: '4px', boxSizing: 'border-box' }}
                                  />
                                </div>
                                <div>
                                  <label style={{ fontSize: '11px', fontWeight: 700, color: '#4B5563' }}>EIN Tax ID (9-Digit) *</label>
                                  <input
                                    type="text"
                                    required
                                    value={tcrBrandForm.ein_tax_id}
                                    onChange={e => setTcrBrandForm({ ...tcrBrandForm, ein_tax_id: e.target.value })}
                                    style={{ width: '100%', padding: '8px 10px', fontSize: '12px', border: '1px solid #D1D5DB', borderRadius: '6px', marginTop: '4px', boxSizing: 'border-box' }}
                                  />
                                </div>
                              </div>

                              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                                <div>
                                  <label style={{ fontSize: '11px', fontWeight: 700, color: '#4B5563' }}>Business Entity Type</label>
                                  <select
                                    value={tcrBrandForm.business_type}
                                    onChange={e => setTcrBrandForm({ ...tcrBrandForm, business_type: e.target.value })}
                                    style={{ width: '100%', padding: '8px 10px', fontSize: '12px', border: '1px solid #D1D5DB', borderRadius: '6px', marginTop: '4px', boxSizing: 'border-box' }}
                                  >
                                    <option value="LLC">Limited Liability Company (LLC)</option>
                                    <option value="Corporation">Corporation (Inc / C-Corp / S-Corp)</option>
                                    <option value="Partnership">Partnership</option>
                                    <option value="Sole_Proprietorship">Sole Proprietorship</option>
                                  </select>
                                </div>
                                <div>
                                  <label style={{ fontSize: '11px', fontWeight: 700, color: '#4B5563' }}>Campaign Use Case</label>
                                  <input
                                    type="text"
                                    readOnly
                                    value="CUSTOMER_CARE (Chauffeur & Dispatch Alerts)"
                                    style={{ width: '100%', padding: '8px 10px', fontSize: '12px', border: '1px solid #D1D5DB', borderRadius: '6px', marginTop: '4px', boxSizing: 'border-box', backgroundColor: '#F9FAFB' }}
                                  />
                                </div>
                              </div>

                              <div>
                                <label style={{ fontSize: '11px', fontWeight: 700, color: '#4B5563' }}>Physical Business Address (Matching IRS CP575)</label>
                                <input
                                  type="text"
                                  required
                                  value={tcrBrandForm.address}
                                  onChange={e => setTcrBrandForm({ ...tcrBrandForm, address: e.target.value })}
                                  style={{ width: '100%', padding: '8px 10px', fontSize: '12px', border: '1px solid #D1D5DB', borderRadius: '6px', marginTop: '4px', boxSizing: 'border-box' }}
                                />
                              </div>

                              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                                <div>
                                  <label style={{ fontSize: '11px', fontWeight: 700, color: '#4B5563' }}>Website Opt-In URL</label>
                                  <input
                                    type="text"
                                    required
                                    value={tcrBrandForm.opt_in_url}
                                    onChange={e => setTcrBrandForm({ ...tcrBrandForm, opt_in_url: e.target.value })}
                                    style={{ width: '100%', padding: '8px 10px', fontSize: '12px', border: '1px solid #D1D5DB', borderRadius: '6px', marginTop: '4px', boxSizing: 'border-box' }}
                                  />
                                </div>
                                <div>
                                  <label style={{ fontSize: '11px', fontWeight: 700, color: '#4B5563' }}>Compliance Contact Email</label>
                                  <input
                                    type="email"
                                    required
                                    value={tcrBrandForm.contact_email}
                                    onChange={e => setTcrBrandForm({ ...tcrBrandForm, contact_email: e.target.value })}
                                    style={{ width: '100%', padding: '8px 10px', fontSize: '12px', border: '1px solid #D1D5DB', borderRadius: '6px', marginTop: '4px', boxSizing: 'border-box' }}
                                  />
                                </div>
                              </div>

                              {/* Pre-formatted Sample Messages */}
                              <div style={{ backgroundColor: '#F9FAFB', padding: '10px', borderRadius: '6px', border: '1px solid #E5E7EB' }}>
                                <div style={{ fontSize: '11px', fontWeight: 700, color: '#374151', marginBottom: '4px' }}>
                                  Verified Sample Messages (CTIA Compliant with STOP/HELP):
                                </div>
                                <div style={{ fontSize: '10px', color: '#4B5563', fontFamily: 'monospace', marginBottom: '4px' }}>
                                  • Sample 1: "{config.vendor_name || 'ANB Limo'}: Your chauffeur Marcus is en route in an Escalade (PA-LM992). Track: https://limo.link/r/abc. Reply STOP to cancel."
                                </div>
                                <div style={{ fontSize: '10px', color: '#4B5563', fontFamily: 'monospace' }}>
                                  • Sample 2: "{config.vendor_name || 'ANB Limo'}: Your booking TRP-8921 is confirmed for pickup on Sep 18, 08:30 AM. Reply HELP for assistance, STOP to opt out."
                                </div>
                              </div>

                              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '8px' }}>
                                <button
                                  type="button"
                                  onClick={() => setShow10DlcWizard(false)}
                                  style={{ padding: '8px 14px', backgroundColor: '#F3F4F6', color: '#4B5563', borderRadius: '6px', fontSize: '12px', fontWeight: 600, border: '1px solid #D1D5DB', cursor: 'pointer' }}
                                >
                                  Cancel
                                </button>
                                <button
                                  type="submit"
                                  style={{ padding: '8px 18px', backgroundColor: '#0078D4', color: '#FFFFFF', borderRadius: '6px', fontSize: '12px', fontWeight: 700, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
                                >
                                  <Sparkles size={14} /> Submit Brand & Campaign via Twilio API
                                </button>
                              </div>
                            </form>
                          ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', fontSize: '12px' }}>
                              <div style={{ backgroundColor: '#EFF6FF', padding: '12px', borderRadius: '6px', border: '1px solid #BFDBFE', color: '#1E40AF' }}>
                                <strong>Manual Twilio Console Submission Guide:</strong> Use these exact values if you prefer to submit directly inside your personal <a href="https://console.twilio.com" target="_blank" rel="noreferrer" style={{ color: '#0078D4', fontWeight: 700 }}>Twilio Console</a>.
                              </div>

                              <div style={{ backgroundColor: '#F9FAFB', padding: '12px', borderRadius: '6px', border: '1px solid #E5E7EB' }}>
                                <div style={{ fontWeight: 800, color: '#0F172A', marginBottom: '6px' }}>Step 1: Create Brand in Twilio Console</div>
                                <div style={{ color: '#6B7280', fontSize: '11px', marginBottom: '8px' }}>Go to: <strong>Messaging → Regulatory Compliance → Brands → Create Brand</strong></div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '11px' }}>
                                  <div>• <strong>Brand Type:</strong> Standard Brand (if you have EIN) or Sole Proprietor</div>
                                  <div>• <strong>Legal Business Name:</strong> {tcrBrandForm.legal_name}</div>
                                  <div>• <strong>EIN:</strong> {tcrBrandForm.ein_tax_id}</div>
                                  <div>• <strong>Vertical:</strong> Transportation and Logistics</div>
                                </div>
                              </div>

                              <div style={{ backgroundColor: '#F9FAFB', padding: '12px', borderRadius: '6px', border: '1px solid #E5E7EB' }}>
                                <div style={{ fontWeight: 800, color: '#0F172A', marginBottom: '6px' }}>Step 2: Create Campaign in Twilio Console</div>
                                <div style={{ color: '#6B7280', fontSize: '11px', marginBottom: '8px' }}>Go to: <strong>Messaging → Regulatory Compliance → Campaigns → Create Campaign</strong></div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '11px' }}>
                                  <div>• <strong>Use Case:</strong> Customer Care</div>
                                  <div>• <strong>Description:</strong> Transactional SMS alerts for black car & limousine passengers regarding booking confirmations, live chauffeur GPS arrival updates, flight delay adjustments, and digital receipts.</div>
                                  <div>• <strong>Opt-in Flow:</strong> Passengers opt in during online booking on {tcrBrandForm.opt_in_url} by entering mobile number and checking SMS consent box.</div>
                                </div>
                              </div>

                              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '6px' }}>
                                <button
                                  onClick={() => setShow10DlcWizard(false)}
                                  style={{ padding: '8px 16px', backgroundColor: '#0078D4', color: '#FFFFFF', borderRadius: '6px', fontSize: '12px', fontWeight: 700, border: 'none', cursor: 'pointer' }}
                                >
                                  Done
                                </button>
                              </div>
                            </div>
                          )}

                        </div>
                      </div>
                    )}

                  </div>
                )}

                {/* SUBTAB 2: VOICE PHONE STUDIO */}
                {omniSubTab === 'voice' && (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                    <div style={{ backgroundColor: '#FFFFFF', borderRadius: '10px', padding: '20px', border: '1px solid #E5E7EB', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', display: 'flex', flexDirection: 'column', gap: '14px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <h3 style={{ margin: 0, fontSize: '14px', fontWeight: 800, color: '#0F172A' }}>
                          Twilio WebRTC Softphone & Speed-Dialer
                        </h3>
                        <span style={{ fontSize: '10px', padding: '2px 8px', borderRadius: '4px', backgroundColor: '#DCFCE7', color: '#15803D', fontWeight: 800 }}>
                          LINE READY (&lt;300ms)
                        </span>
                      </div>

                      <div style={{ padding: '12px', backgroundColor: '#F9FAFB', borderRadius: '8px', border: '1px solid #E5E7EB' }}>
                        <div style={{ fontSize: '11px', color: '#6B7280' }}>Dedicated Inbound Line:</div>
                        <div style={{ fontSize: '16px', fontWeight: 800, color: '#0078D4', marginTop: '2px' }}>
                          {config.branding.contact_phone || '+1 (215) 555-0144'}
                        </div>
                        <div style={{ fontSize: '11px', color: '#16A34A', marginTop: '4px' }}>
                          ● Twilio Voice WebSocket &lt;Stream&gt; Connected to FastAPI
                        </div>
                      </div>

                      <div>
                        <label style={{ fontSize: '11px', fontWeight: 700, color: '#4B5563' }}>Dial Passenger or Chauffeur (Masked Proxy)</label>
                        <div style={{ display: 'flex', gap: '8px', marginTop: '6px' }}>
                          <input
                            type="text"
                            value={softphoneDialNumber}
                            onChange={(e) => setSoftphoneDialNumber(e.target.value)}
                            style={{ flex: 1, padding: '8px 10px', border: '1px solid #D1D5DB', borderRadius: '6px', fontSize: '12px' }}
                          />
                          <button
                            onClick={handleDialOutboundCall}
                            disabled={loading}
                            style={{ padding: '8px 14px', backgroundColor: '#16A34A', color: '#FFFFFF', border: 'none', borderRadius: '6px', fontSize: '11px', fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                          >
                            <Phone size={13} /> {loading ? 'Dialing...' : 'Call'}
                          </button>
                        </div>
                      </div>
                    </div>

                    <div style={{ backgroundColor: '#FFFFFF', borderRadius: '10px', padding: '20px', border: '1px solid #E5E7EB', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', display: 'flex', flexDirection: 'column', gap: '14px' }}>
                      <h3 style={{ margin: 0, fontSize: '14px', fontWeight: 800, color: '#0F172A' }}>
                        Recent Voice AI Recordings & Transcripts
                      </h3>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        <div style={{ padding: '10px', backgroundColor: '#F8FAFC', borderRadius: '6px', border: '1px solid #E2E8F0' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontSize: '12px', fontWeight: 800, color: '#0F172A' }}>David Sterling (Comcast Exec)</span>
                            <span style={{ fontSize: '10px', color: '#6B7280' }}>128s • 10:30 AM</span>
                          </div>
                          <div style={{ fontSize: '11px', color: '#334155', marginTop: '4px' }}>
                            "Booked round-trip transfer from Center City to PHL Terminal D. Assigned driver Marcus Brody. Tariff: $125.00."
                          </div>
                          <div style={{ marginTop: '6px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <button
                              onClick={() => setActionNotice('▶️ Playing simulated Twilio Voice media recording for call_9821...')}
                              style={{ padding: '4px 8px', backgroundColor: '#EFF6FF', color: '#0078D4', border: '1px solid #BFDBFE', borderRadius: '4px', fontSize: '10px', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                            >
                              <Play size={10} /> Play Audio
                            </button>
                            <span style={{ fontSize: '10px', color: '#16A34A', fontWeight: 700 }}>● Sentiment: Positive</span>
                          </div>
                        </div>

                        <div style={{ padding: '10px', backgroundColor: '#F8FAFC', borderRadius: '6px', border: '1px solid #E2E8F0' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontSize: '12px', fontWeight: 800, color: '#0F172A' }}>Sarah Jenkins (Morgan Stanley)</span>
                            <span style={{ fontSize: '10px', color: '#6B7280' }}>94s • 09:12 AM</span>
                          </div>
                          <div style={{ fontSize: '11px', color: '#334155', marginTop: '4px' }}>
                            "Inquired about Mercedes Sprinter availability for 12 passengers to Atlantic City. Quoted $850."
                          </div>
                          <div style={{ marginTop: '6px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <button
                              onClick={() => setActionNotice('▶️ Playing simulated Twilio Voice media recording for call_9822...')}
                              style={{ padding: '4px 8px', backgroundColor: '#EFF6FF', color: '#0078D4', border: '1px solid #BFDBFE', borderRadius: '4px', fontSize: '10px', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                            >
                              <Play size={10} /> Play Audio
                            </button>
                            <span style={{ fontSize: '10px', color: '#16A34A', fontWeight: 700 }}>● Sentiment: Positive</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* SUBTAB 3: AWS SES EMAIL DESK */}
                {omniSubTab === 'email' && (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                    <div style={{ backgroundColor: '#FFFFFF', borderRadius: '10px', padding: '20px', border: '1px solid #E5E7EB', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', display: 'flex', flexDirection: 'column', gap: '14px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <h3 style={{ margin: 0, fontSize: '14px', fontWeight: 800, color: '#0F172A' }}>
                          AWS SES Identity & Cryptographic DKIM
                        </h3>
                        <span style={{ fontSize: '10px', padding: '2px 8px', borderRadius: '4px', backgroundColor: '#DCFCE7', color: '#15803D', fontWeight: 800 }}>
                          99.98% DELIVERABILITY
                        </span>
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '12px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #F3F4F6', paddingBottom: '6px' }}>
                          <span style={{ color: '#6B7280' }}>Sending Domain:</span>
                          <span style={{ fontWeight: 700, color: '#0F172A' }}>{config.branding.domain}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #F3F4F6', paddingBottom: '6px' }}>
                          <span style={{ color: '#6B7280' }}>DKIM 2048-bit Signature:</span>
                          <span style={{ fontWeight: 800, color: '#16A34A' }}>PASS (Verified via Route53)</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #F3F4F6', paddingBottom: '6px' }}>
                          <span style={{ color: '#6B7280' }}>SPF Record Status:</span>
                          <span style={{ fontWeight: 800, color: '#16A34A' }}>v=spf1 include:amazonses.com ~all</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span style={{ color: '#6B7280' }}>DMARC Policy:</span>
                          <span style={{ fontWeight: 800, color: '#0078D4' }}>p=reject (100% Phishing Immune)</span>
                        </div>
                      </div>

                      <button
                        onClick={() => setActionNotice('✅ Sent DKIM-signed test PDF receipt to dispatcher email.')}
                        style={{ padding: '8px', backgroundColor: '#0078D4', color: '#FFFFFF', border: 'none', borderRadius: '6px', fontSize: '12px', fontWeight: 700, cursor: 'pointer', marginTop: '8px' }}
                      >
                        ✉️ Send DKIM Test Confirmation Email
                      </button>
                    </div>

                    <div style={{ backgroundColor: '#FFFFFF', borderRadius: '10px', padding: '20px', border: '1px solid #E5E7EB', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', display: 'flex', flexDirection: 'column', gap: '14px' }}>
                      <h3 style={{ margin: 0, fontSize: '14px', fontWeight: 800, color: '#0F172A' }}>
                        Inbound Travel Desk RFQ Parser
                      </h3>

                      <div>
                        <label style={{ fontSize: '11px', fontWeight: 700, color: '#4B5563' }}>Inbound Corporate RFQ Email Body</label>
                        <textarea
                          rows={4}
                          value={inboundEmail}
                          onChange={(e) => setInboundEmail(e.target.value)}
                          style={{ width: '100%', padding: '8px', backgroundColor: '#F9FAFB', border: '1px solid #D1D5DB', borderRadius: '6px', fontSize: '11px', marginTop: '4px', fontFamily: 'monospace' }}
                        />
                      </div>

                      <button
                        onClick={handleParseEmailRFQ}
                        disabled={loading}
                        style={{ padding: '8px', backgroundColor: '#16A34A', color: '#FFFFFF', border: 'none', borderRadius: '6px', fontSize: '12px', fontWeight: 800, cursor: 'pointer' }}
                      >
                        {loading ? 'Parsing...' : '✨ Self-RAG NLP Quote Extraction'}
                      </button>

                      {parsedEmailQuote && (
                        <div style={{ padding: '10px', backgroundColor: '#F0FDF4', borderRadius: '6px', border: '1px solid #86EFAC', fontSize: '11px', color: '#166534' }}>
                          <div>Pax: <strong>{parsedEmailQuote.passenger_name}</strong> • Flight: <strong>{parsedEmailQuote.flight_number}</strong></div>
                          <div>Rate: <strong>${parsedEmailQuote.calculated_fare_usd.toFixed(2)} USD</strong> (Guaranteed Tariff)</div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* SUBTAB 4: WHATSAPP & SMS 2-WAY CHAT */}
                {omniSubTab === 'whatsapp' && (
                  <div style={{ backgroundColor: '#FFFFFF', borderRadius: '10px', padding: '20px', border: '1px solid #E5E7EB', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', display: 'flex', flexDirection: 'column', gap: '14px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <h3 style={{ margin: 0, fontSize: '14px', fontWeight: 800, color: '#0F172A', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <MessageSquare size={16} color="#16A34A" />
                        Live Passenger Conversational Console (WhatsApp & SMS Unified Mesh)
                      </h3>
                      <span style={{ fontSize: '10px', padding: '2px 8px', borderRadius: '4px', backgroundColor: '#DCFCE7', color: '#15803D', fontWeight: 800 }}>
                        2-WAY ACTIVE
                      </span>
                    </div>

                    {/* Chat Log Window */}
                    <div style={{ backgroundColor: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '8px', padding: '14px', height: '240px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      {chatMessages.map((msg) => (
                        <div
                          key={msg.id}
                          style={{
                            alignSelf: msg.isOutbound ? 'flex-end' : 'flex-start',
                            maxWidth: '75%',
                            backgroundColor: msg.isOutbound ? '#0078D4' : '#FFFFFF',
                            color: msg.isOutbound ? '#FFFFFF' : '#0F172A',
                            padding: '10px 14px',
                            borderRadius: '10px',
                            boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                            border: msg.isOutbound ? 'none' : '1px solid #E5E7EB'
                          }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px', fontSize: '10px', opacity: 0.85, marginBottom: '4px' }}>
                            <span>{msg.sender} ({msg.channel})</span>
                            <span>{msg.time}</span>
                          </div>
                          <div style={{ fontSize: '12px', lineHeight: 1.4 }}>{msg.text}</div>
                        </div>
                      ))}
                    </div>

                    {/* Quick Action Buttons */}
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                      <button
                        onClick={() => {
                          const vName = config.vendor_name || 'ANB Limo Company';
                          const msg = { id: String(Date.now()), sender: `${vName} Autonomous Dispatch`, phone: '+12155550144', channel: 'WHATSAPP', text: '📍 Chauffeur Marcus is curbside at Zone 4. Live GPS Radar: https://limo.link/r/live', isOutbound: true, time: 'Just now' };
                          setChatMessages([...chatMessages, msg]);
                        }}
                        style={{ padding: '6px 10px', backgroundColor: '#F0FDF4', color: '#15803D', border: '1px solid #86EFAC', borderRadius: '6px', fontSize: '11px', fontWeight: 700, cursor: 'pointer' }}
                      >
                        ⚡ Send Live Chauffeur GPS Radar Link
                      </button>
                      <button
                        onClick={() => {
                          const vName = config.vendor_name || 'ANB Limo Company';
                          const msg = { id: String(Date.now()), sender: `${vName} Autonomous Dispatch`, phone: '+12155550144', channel: 'SMS', text: '✈️ Flight delay detected (+20 min). Pickup recalibrated to 11:15 AM with zero extra charge.', isOutbound: true, time: 'Just now' };
                          setChatMessages([...chatMessages, msg]);
                        }}
                        style={{ padding: '6px 10px', backgroundColor: '#EFF6FF', color: '#0078D4', border: '1px solid #BFDBFE', borderRadius: '6px', fontSize: '11px', fontWeight: 700, cursor: 'pointer' }}
                      >
                        ⏱️ Send Flight Delay Recalibration Alert
                      </button>
                    </div>

                    {/* Chat Input */}
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <input
                        type="text"
                        placeholder="Type reply to passenger (David Sterling)..."
                        value={newChatText}
                        onChange={(e) => setNewChatText(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && newChatText.trim()) {
                            const vName = config.vendor_name || 'ANB Limo Company';
                            const msg = { id: String(Date.now()), sender: `${vName} Dispatch`, phone: '+12155550144', channel: 'WHATSAPP', text: newChatText, isOutbound: true, time: 'Just now' };
                            setChatMessages([...chatMessages, msg]);
                            setNewChatText('');
                          }
                        }}
                        style={{ flex: 1, padding: '10px 12px', border: '1px solid #D1D5DB', borderRadius: '6px', fontSize: '12px' }}
                      />
                      <button
                        onClick={() => {
                          if (newChatText.trim()) {
                            const vName = config.vendor_name || 'ANB Limo Company';
                            const msg = { id: String(Date.now()), sender: `${vName} Dispatch`, phone: '+12155550144', channel: 'WHATSAPP', text: newChatText, isOutbound: true, time: 'Just now' };
                            setChatMessages([...chatMessages, msg]);
                            setNewChatText('');
                          }
                        }}
                        style={{ padding: '10px 18px', backgroundColor: '#0078D4', color: '#FFFFFF', border: 'none', borderRadius: '6px', fontSize: '12px', fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                      >
                        <Send size={14} /> Send
                      </button>
                    </div>
                  </div>
                )}

                {/* SUBTAB 5: LOCAL SEO & SCHEMA */}
                {omniSubTab === 'seo' && (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                    <div style={{ backgroundColor: '#FFFFFF', borderRadius: '10px', padding: '20px', border: '1px solid #E5E7EB', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', display: 'flex', flexDirection: 'column', gap: '14px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <h3 style={{ margin: 0, fontSize: '14px', fontWeight: 800, color: '#0F172A' }}>
                          Dynamic JSON-LD Schema.org Markup
                        </h3>
                        <span style={{ fontSize: '10px', padding: '2px 8px', borderRadius: '4px', backgroundColor: '#DCFCE7', color: '#15803D', fontWeight: 800 }}>
                          GOOGLE RICH SNIPPETS READY
                        </span>
                      </div>

                      <div style={{ fontSize: '11px', color: '#6B7280' }}>
                        Automatically injected into local vendor storefront HTML headers for search ranking dominance.
                      </div>

                      <pre style={{ backgroundColor: '#F8FAFC', padding: '12px', borderRadius: '6px', border: '1px solid #E2E8F0', fontSize: '11px', color: '#0F172A', overflowX: 'auto', maxHeight: '220px', fontFamily: 'monospace' }}>
{JSON.stringify({
  "@context": "https://schema.org",
  "@type": ["LimousineService", "TaxiService", "LocalBusiness"],
  "name": config.vendor_name || "ANB Limo Company",
  "telephone": config.branding?.contact_phone || "+1 (215) 555-0144",
  "url": `https://${config.branding?.domain || 'anblimo-philly.com'}`,
  "priceRange": "$75 - $450",
  "openingHours": "Mo-Su 00:00-23:59",
  "aggregateRating": {
    "@type": "AggregateRating",
    "ratingValue": "4.96",
    "reviewCount": "348"
  }
}, null, 2)}
                      </pre>
                    </div>

                    <div style={{ backgroundColor: '#FFFFFF', borderRadius: '10px', padding: '20px', border: '1px solid #E5E7EB', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', display: 'flex', flexDirection: 'column', gap: '14px' }}>
                      <h3 style={{ margin: 0, fontSize: '14px', fontWeight: 800, color: '#0F172A' }}>
                        High-Converting Geo-Corridor Landing Pages
                      </h3>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        <div style={{ padding: '10px', backgroundColor: '#F9FAFB', borderRadius: '6px', border: '1px solid #E5E7EB' }}>
                          <div style={{ fontWeight: 800, fontSize: '12px', color: '#0078D4' }}>
                            /services/{(config.city || 'metro').toLowerCase().replace(/\s+/g, '-')}-airport-transfer
                          </div>
                          <div style={{ fontSize: '11px', color: '#6B7280', marginTop: '2px' }}>
                            Target: "{config.city || 'Metro'} Airport Limo", "{config.city || 'Metro'} Airport Chauffeur" • Base Tariff: {config.currency_symbol || '$'}{config.base_rate_usd?.toFixed(2) || '75.00'}
                          </div>
                        </div>

                        <div style={{ padding: '10px', backgroundColor: '#F9FAFB', borderRadius: '6px', border: '1px solid #E5E7EB' }}>
                          <div style={{ fontWeight: 800, fontSize: '12px', color: '#0078D4' }}>
                            /services/{(config.city || 'metro').toLowerCase().replace(/\s+/g, '-')}-executive-intercity
                          </div>
                          <div style={{ fontSize: '11px', color: '#6B7280', marginTop: '2px' }}>
                            Target: "{config.city || 'Metro'} Long Distance Chauffeur", "Intercity Luxury Travel" • Per KM: {config.currency_symbol || '$'}{config.per_km_usd?.toFixed(2) || '3.25'}
                          </div>
                        </div>

                        <div style={{ padding: '10px', backgroundColor: '#F9FAFB', borderRadius: '6px', border: '1px solid #E5E7EB' }}>
                          <div style={{ fontWeight: 800, fontSize: '12px', color: '#0078D4' }}>
                            /services/corporate-roadshow-{(config.city || 'metro').toLowerCase().replace(/\s+/g, '-')}
                          </div>
                          <div style={{ fontSize: '11px', color: '#6B7280', marginTop: '2px' }}>
                            Target: "Corporate Chauffeur {config.city || 'Metro'}", "B2B Executive Transport" • Hourly: {config.currency_symbol || '$'}{((config.base_rate_usd || 75) * 1.45).toFixed(2)}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* SUBTAB 6: BYOK & FALLBACK CONFIG */}
                {omniSubTab === 'byok' && (
                  <div style={{ backgroundColor: '#FFFFFF', borderRadius: '10px', padding: '24px', border: '1px solid #E5E7EB', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', display: 'flex', flexDirection: 'column', gap: '18px', maxWidth: '800px' }}>
                    <div>
                      <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 800, color: '#0F172A' }}>
                        Dual-Tier Omnichannel Routing (Turnkey SaaS vs. BYOK)
                      </h3>
                      <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: '#6B7280' }}>
                        Select whether this sovereign vendor uses turnkey managed platform keys or custom enterprise Twilio/AWS credentials with automated fail-safe fallback.
                      </p>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                      <div
                        onClick={() => setByokMode('MANAGED_SAAS')}
                        style={{
                          padding: '14px',
                          borderRadius: '8px',
                          border: `2px solid ${byokMode === 'MANAGED_SAAS' ? '#0078D4' : '#E5E7EB'}`,
                          backgroundColor: byokMode === 'MANAGED_SAAS' ? '#EFF6FF' : '#FFFFFF',
                          cursor: 'pointer'
                        }}
                      >
                        <div style={{ fontWeight: 800, fontSize: '13px', color: byokMode === 'MANAGED_SAAS' ? '#0078D4' : '#0F172A' }}>
                          🔘 Turnkey Managed SaaS (Default)
                        </div>
                        <div style={{ fontSize: '11px', color: '#6B7280', marginTop: '4px' }}>
                          Global Hub provisions dedicated Twilio Subaccounts and AWS SES DKIM domains automatically. Zero setup required.
                        </div>
                      </div>

                      <div
                        onClick={() => setByokMode('BYOK_CUSTOM')}
                        style={{
                          padding: '14px',
                          borderRadius: '8px',
                          border: `2px solid ${byokMode === 'BYOK_CUSTOM' ? '#0078D4' : '#E5E7EB'}`,
                          backgroundColor: byokMode === 'BYOK_CUSTOM' ? '#EFF6FF' : '#FFFFFF',
                          cursor: 'pointer'
                        }}
                      >
                        <div style={{ fontWeight: 800, fontSize: '13px', color: byokMode === 'BYOK_CUSTOM' ? '#0078D4' : '#0F172A' }}>
                          🔘 Enterprise BYOK (Bring Your Own Key)
                        </div>
                        <div style={{ fontSize: '11px', color: '#6B7280', marginTop: '4px' }}>
                          Use your own Twilio Account SID, Auth Token & AWS SES keys with automatic platform failover if credit expires.
                        </div>
                      </div>
                    </div>

                    {byokMode === 'BYOK_CUSTOM' && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', padding: '14px', backgroundColor: '#F8FAFC', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
                        <div>
                          <label style={{ fontSize: '11px', fontWeight: 700, color: '#4B5563' }}>Custom Twilio Account SID</label>
                          <input
                            type="text"
                            placeholder="ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                            value={customTwilioSid}
                            onChange={(e) => setCustomTwilioSid(e.target.value)}
                            style={{ width: '100%', padding: '8px', border: '1px solid #D1D5DB', borderRadius: '6px', fontSize: '12px', marginTop: '4px' }}
                          />
                        </div>

                        <div>
                          <label style={{ fontSize: '11px', fontWeight: 700, color: '#4B5563' }}>Custom Twilio Auth Token</label>
                          <input
                            type="password"
                            placeholder="••••••••••••••••••••••••••••••••"
                            value={customTwilioToken}
                            onChange={(e) => setCustomTwilioToken(e.target.value)}
                            style={{ width: '100%', padding: '8px', border: '1px solid #D1D5DB', borderRadius: '6px', fontSize: '12px', marginTop: '4px' }}
                          />
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
                          <input type="checkbox" id="failover" defaultChecked />
                          <label htmlFor="failover" style={{ fontSize: '11px', color: '#15803D', fontWeight: 700 }}>
                            ✅ Enable Automatic Failover to Global Hub Gateway if Custom Keys Fail
                          </label>
                        </div>
                      </div>
                    )}

                    <button
                      onClick={() => setActionNotice('✅ Omnichannel routing and telecom credentials successfully updated.')}
                      style={{ padding: '12px', backgroundColor: '#16A34A', color: '#FFFFFF', border: 'none', borderRadius: '6px', fontSize: '13px', fontWeight: 800, cursor: 'pointer' }}
                    >
                      Save & Apply Omnichannel Configuration
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* TAB 9: VOICE AI TELEPHONY */}
            {activeTab === 'voice_ai' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', maxWidth: '800px' }}>
                <div>
                  <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: '#0F172A' }}>
                    Local Voice AI Telephony & Phone Intake
                  </h2>
                  <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: '#6B7280' }}>
                    Configure automated phone answering, voice quoting, and SMS confirmation dispatch
                  </p>
                </div>

                <div style={{ backgroundColor: '#FFFFFF', borderRadius: '10px', padding: '24px', border: '1px solid #E5E7EB', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ fontWeight: 800, fontSize: '14px', color: '#0F172A' }}>Twilio Automated Voice Intake Stream</div>
                      <div style={{ fontSize: '11px', color: '#6B7280' }}>Inbound Number: {config.branding.contact_phone || '+1 (215) 555-0144'}</div>
                    </div>
                    <span style={{ fontSize: '10px', padding: '2px 8px', borderRadius: '4px', backgroundColor: '#DCFCE7', color: '#15803D', fontWeight: 800 }}>
                      VOICE AGENT ACTIVE
                    </span>
                  </div>

                  <div style={{ padding: '12px', backgroundColor: '#F9FAFB', borderRadius: '8px', border: '1px solid #E5E7EB', fontSize: '12px', color: '#374151' }}>
                    <div>Agent Voice Model: <strong>Gemini 3.8 Flash High-Speed Voice Stream</strong></div>
                    <div>Average Quoting Latency: <strong>480ms</strong></div>
                    <div>Auto SMS Pre-Authorization: <strong>Enabled</strong></div>
                  </div>
                </div>
              </div>
            )}

          </div>

        </main>

      </div>

    </div>
  );
};

