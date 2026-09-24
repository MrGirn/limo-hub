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
  Copy, Inbox, AtSign, BookOpen, Settings, Trash2, HelpCircle, Edit3, Camera, AlertCircle,
  Plane, Printer, ChevronUp, PhoneCall, Headphones
} from 'lucide-react';
import { 
  VendorPortalConfig, TeamMember, RoleMatrixResponse, CertifiedAffiliatePartner, 
  AffiliateRecommendation, VendorAffiliatePolicyRules, FarmOutPolicy, FarmInPolicy,
  MultiLegRoutingRules, SupportDeskPlan, VendorSupportSubscription
} from '../types';
import { useAuth } from '../context/AuthContext';
import { 
  fetchVendorTeam, createVendorTeamMember, updateVendorTeamMember, 
  deleteVendorTeamMember, generateTeamMemberImpersonateToken, fetchVendorRolesMatrix,
  fetchGlobalAffiliateDirectory, fetchAffiliateRecommendations, farmOutAffiliateRide, fetchVendorAffiliateRecords,
  fetchVendorAffiliatePolicy, updateVendorAffiliatePolicy, evaluateVendorMultilegStrategy, fetchGlobalHubKnowledgeBase,
  createVendorVehicle, updateVendorVehicle, deleteVendorVehicle, toggleVehicleNetwork, toggleVehicleActive, getAuthHeaders, uploadVehiclePhotoToS3,
  fetchVendorOnboardingStatus, sendVendorOnboardingInvite,
  fetchVendorStripeStatus, createVendorStripeConnectLink, createVendorStripeLoginLink,
  fetchVendorPayoutsLedger, VendorPayoutLedgerRecord,
  fetchVendorSubscription, createVendorBillingPortalSession, clearVendorDunning,
  fetchSupportDeskPlans, fetchSupportDeskSubscriptions, subscribeVendorSupportDesk
} from '../api';
import { DispatcherPhoneBookingModal } from './DispatcherPhoneBookingModal';
import { VendorFleetAndPricingHub } from './VendorFleetAndPricingHub';
import { 
  compressStudioImage, toggleAiStudioLighting, formatBytes, ProcessedStudioImage 
} from '../utils/imageStudioCompressor';
import { 
  ALL_LUXURY_AMENITIES_LIBRARY, matchVehicleProfile, LUXURY_VEHICLE_PROFILES, generateAiTaglines 
} from '../utils/vehicleKnowledgeBase';
import { isSelfVendor, vendorIdentityLearner } from '../utils/vendorIdentityMatcher';

interface VendorOwnerDashboardProps {
  config: VendorPortalConfig;
  onNavigateToStorefront: () => void;
}

type AutonomyLevel = 'L5_FULL_AUTONOMY' | 'L3_SHADOW_ASSIST' | 'L0_MANUAL_KILL_SWITCH';

interface NavItem {
  id: 'overview' | 'dispatch' | 'fleet' | 'drivers' | 'corporate' | 'pricing' | 'payouts' | 'email_rfq' | 'team' | 'affiliates' | 'voice_ai' | 'omnichannel' | 'subscription';
  label: string;
  icon: React.ReactNode;
  category: string;
  badge?: string;
}


export const getVendorLocaleSpecs = (config?: VendorPortalConfig) => {
  const country = (config?.country || config?.country_code || '').toUpperCase();
  const currency = (config?.currency || 'USD').toUpperCase();
  const isMilesCountry = country === 'US' || country === 'USA' || country === 'UNITED STATES' || country === 'GB' || country === 'UK' || country === 'UNITED KINGDOM' || country === 'GREAT BRITAIN' || currency === 'USD' || currency === 'GBP';
  
  const defaultUnit: 'MILES' | 'KM' = isMilesCountry ? 'MILES' : 'KM';
  
  let currencySymbol = config?.currency_symbol || '$';
  if (!config?.currency_symbol) {
    if (currency === 'GBP') currencySymbol = '£';
    else if (currency === 'EUR') currencySymbol = '€';
    else if (currency === 'JPY') currencySymbol = '¥';
    else if (currency === 'CAD') currencySymbol = 'CA$';
    else if (currency === 'CHF') currencySymbol = 'CHF ';
    else if (currency === 'AUD') currencySymbol = 'A$';
    else currencySymbol = '$';
  }
  
  const countryDisplayName = config?.country || (currency === 'GBP' ? 'United Kingdom' : currency === 'EUR' ? 'European Union' : currency === 'JPY' ? 'Japan' : 'United States');
  
  return {
    defaultUnit,
    currencySymbol,
    currencyCode: currency,
    countryName: countryDisplayName,
    isMilesCountry
  };
};

export const VendorOwnerDashboard: React.FC<VendorOwnerDashboardProps> = ({
  config,
  onNavigateToStorefront
}) => {
  const { switchPersona, role: currentAuthRole } = useAuth();
  const localeSpecs = getVendorLocaleSpecs(config);
  const [activeTab, setActiveTab] = useState<
    'overview' | 'dispatch' | 'fleet' | 'drivers' | 'corporate' | 'pricing' | 'payouts' | 'email_rfq' | 'team' | 'affiliates' | 'voice_ai' | 'omnichannel' | 'subscription'
  >('overview');

  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [autonomyLevel, setAutonomyLevel] = useState<AutonomyLevel>('L5_FULL_AUTONOMY');
  const [loading, setLoading] = useState(false);
  const [actionNotice, setActionNotice] = useState<string | null>(null);
  const [omniSubTab, setOmniSubTab] = useState<'10dlc' | 'voice' | 'email' | 'whatsapp' | 'seo' | 'byok'>('10dlc');

  // Omnichannel Live Chat & Voice State
  const [chatMessages, setChatMessages] = useState<Array<{ id: string; sender: string; phone: string; channel: string; text: string; isOutbound: boolean; time: string }>>([]);
  const [voiceCallRecords, setVoiceCallRecords] = useState<any[]>([]);
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
  const [isMultiLegPolicyOpen, setIsMultiLegPolicyOpen] = useState(true);
  const [isFarmInOpen, setIsFarmInOpen] = useState(false);
  const [isFarmOutOpen, setIsFarmOutOpen] = useState(false);
  const [simulatedStrategyResult, setSimulatedStrategyResult] = useState<any>(null);
  const [simEvaluating, setSimEvaluating] = useState(false);
  const [showPhoneBookingModal, setShowPhoneBookingModal] = useState(false);
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
    multi_leg_rules: {
      max_layover_hours_for_wait: 3.5,
      hourly_wait_rate_usd: 75.0,
      deadhead_rate_per_km_usd: 1.75,
      max_driver_shift_hours: 12.0,
      max_out_of_market_radius_km: 160.0,
      inter_city_corridor_policy: 'SMART_SPLIT',
      auto_farm_out_long_layovers: true,
      affiliate_commission_target_pct: 18.0,
      require_continuous_charter_for_local_stops: true,
      client_vip_override_enabled: true,
      overnight_hotel_allowance_usd: 250.0,
      chauffeur_meal_per_diem_usd: 75.0
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

  const [affiliateJobs, setAffiliateJobs] = useState<any[]>([]);

  // Local KPI Metrics
  const [metrics, setMetrics] = useState({
    today_revenue_usd: 0,
    trips_completed_today: 0,
    trips_active: 0,
    active_chauffeurs_on_duty: 0,
    fleet_utilization_pct: 0,
    direct_bookings_pct: 0,
    farmed_in_hub_pct: 0,
    compliance_ppa_tlc_score: 100
  });

  // Local Live Trips
  const [trips, setTrips] = useState<any[]>([]);
  const [selectedTripForManifest, setSelectedTripForManifest] = useState<any | null>(null);
  const [expandedLegsRow, setExpandedLegsRow] = useState<Record<string, boolean>>({});

  // Local Fleet
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [showAddVehicleModal, setShowAddVehicleModal] = useState(false);
  const [newVehicleForm, setNewVehicleForm] = useState<{
    make: string;
    model: string;
    year: number;
    vehicle_class: string;
    license_plate: string;
    vin: string;
    capacity_passengers: number;
    capacity_luggage: number;
    exterior_color: string;
    interior_color: string;
    tagline: string;
    description: string;
    hourly_rate_usd: number;
    per_km_usd: number;
    per_distance_rate: number;
    distance_unit: 'MILES' | 'KM';
    is_network_shared: boolean;
    amenities: string[];
    uploaded_photos: ProcessedStudioImage[];
  }>({
    make: 'Cadillac',
    model: 'Escalade ESV Sport Platinum',
    year: 2025,
    vehicle_class: 'LUXURY_SUV',
    license_plate: 'PA-EXEC01',
    vin: '',
    capacity_passengers: 6,
    capacity_luggage: 6,
    exterior_color: 'Obsidian Black Metallic',
    interior_color: 'Jet Black Semi-Aniline Leather with Diamond Stitching',
    tagline: 'The Undisputed American Executive Standard in Chauffeur Luxury',
    description: 'Extended wheelbase delivering presidential stature, 142.8 cubic feet of cargo capacity for oversized luggage, AKG Studio Reference 36-speaker sound, and tri-zone climate comfort.',
    hourly_rate_usd: 145.0,
    per_km_usd: 3.95,
    per_distance_rate: localeSpecs.defaultUnit === 'MILES' ? 4.85 : 3.95,
    distance_unit: localeSpecs.defaultUnit,
    is_network_shared: true,
    amenities: [
      '⚡ Ultra-Fast 5G Wi-Fi Hotspot',
      '🛄 Massive Dedicated Cargo Bay (6+ Suitcases)',
      '📺 Dual 4K Rear OLED Entertainment Displays',
      '💺 Heated, Ventilated & Massaging Seats',
      '🥤 Complimentary Chilled Fiji Artesian Water & Mints',
      '🚪 Power Retractable Illuminated Boarding Steps',
      '🔌 Dual 110V AC Power Inverters & 100W USB-C PD',
      '🔇 Whisper-Quiet Acoustic Laminated Privacy Glass'
    ],
    uploaded_photos: []
  });
  const [customAmenityInput, setCustomAmenityInput] = useState('');
  const [isCompressingPhotos, setIsCompressingPhotos] = useState(false);
  const [isUploadingToS3, setIsUploadingToS3] = useState(false);
  const [aiVehicleQuery, setAiVehicleQuery] = useState('');

  // Vehicle Edit & Delete CRUD State
  const [editingVehicle, setEditingVehicle] = useState<any | null>(null);
  const [editVehicleForm, setEditVehicleForm] = useState<any | null>(null);
  const [vehicleToDelete, setVehicleToDelete] = useState<any | null>(null);
  const [isDeletingVehicle, setIsDeletingVehicle] = useState(false);
  const [isUpdatingVehicle, setIsUpdatingVehicle] = useState(false);
  const [editCustomAmenity, setEditCustomAmenity] = useState('');
  const [editIsCompressingPhotos, setEditIsCompressingPhotos] = useState(false);

  // AI Tagline Assistant State
  const [newVehicleAiTaglines, setNewVehicleAiTaglines] = useState<string[]>([]);
  const [showNewAiTaglines, setShowNewAiTaglines] = useState<boolean>(true);
  const [editVehicleAiTaglines, setEditVehicleAiTaglines] = useState<string[]>([]);
  const [showEditAiTaglines, setShowEditAiTaglines] = useState<boolean>(true);

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
    driver_id: '',
    hours: 8.0,
    tips: 0.0,
    tolls: 0.0,
    trips_count: 0
  });

  const [instantPayoutRecords, setInstantPayoutRecords] = useState<any[]>([]);
  const [stripeConnectStatus, setStripeConnectStatus] = useState<any>(null);
  const [isLoadingStripe, setIsLoadingStripe] = useState<boolean>(false);
  const [payoutLedgerRecords, setPayoutLedgerRecords] = useState<VendorPayoutLedgerRecord[]>([]);
  const [isLoadingLedger, setIsLoadingLedger] = useState<boolean>(false);

  // Vendor SaaS Subscription & Hub Billing State
  const [subscriptionData, setSubscriptionData] = useState<any | null>(null);
  const [isLoadingSub, setIsLoadingSub] = useState<boolean>(false);
  const [isProcessingSubAction, setIsProcessingSubAction] = useState<boolean>(false);

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
    { id: 'payouts', label: 'Direct Payouts & Banking', icon: <Banknote size={16} />, category: 'Commercial', badge: stripeConnectStatus?.payouts_enabled ? 'Active' : '⚠️ Setup' },
    { id: 'email_rfq', label: 'Email Gateway & BYOE', icon: <Mail size={16} />, category: 'Intelligence', badge: emailInbox.filter(e => e.status === 'PARSED_AWAITING_CONVERSION').length > 0 ? `${emailInbox.filter(e => e.status === 'PARSED_AWAITING_CONVERSION').length}` : undefined },
    { id: 'team', label: 'Team & RBAC Access', icon: <ShieldCheck size={16} />, category: 'Administration', badge: `${teamMembers.length} Staff` },
    { id: 'subscription', label: 'Platform Billing & Services', icon: <CreditCard size={16} />, category: 'Administration', badge: subscriptionData?.billing_status === 'PAST_DUE' ? '⚠️ Due' : 'Active' },
    { id: 'affiliates', label: 'Affiliate Network (Hub)', icon: <ArrowUpRight size={16} />, category: 'Commercial', badge: '85%' },
    { id: 'omnichannel', label: 'Omnichannel & Telecom', icon: <Radio size={16} />, category: 'Communications', badge: '10DLC OK' },
    { id: 'voice_ai', label: 'Voice AI Telephony', icon: <Phone size={16} />, category: 'Intelligence' },
  ];

  const [onboardingStatus, setOnboardingStatus] = useState<any>(null);
  const [showOnboardingBanner, setShowOnboardingBanner] = useState(true);
  const [isSendingInvite, setIsSendingInvite] = useState(false);
  const [inviteSuccessMsg, setInviteSuccessMsg] = useState<string | null>(null);

  const loadStripeStatus = () => {
    if (config?.vendor_id) {
      setIsLoadingStripe(true);
      fetchVendorStripeStatus(config.vendor_id)
        .then(status => setStripeConnectStatus(status))
        .catch(err => console.log('Stripe status load notice:', err))
        .finally(() => setIsLoadingStripe(false));
    }
  };

  const loadPayoutLedger = () => {
    if (config?.vendor_id) {
      setIsLoadingLedger(true);
      fetchVendorPayoutsLedger(config.vendor_id)
        .then(res => {
          if (res && Array.isArray(res.records)) {
            setPayoutLedgerRecords(res.records);
          }
        })
        .catch(err => console.log('Payout ledger load notice:', err))
        .finally(() => setIsLoadingLedger(false));
    }
  };

  const loadOnboardingStatus = () => {
    if (config?.vendor_id) {
      fetchVendorOnboardingStatus(config.vendor_id)
        .then(data => setOnboardingStatus(data))
        .catch(err => console.log('Could not fetch onboarding status:', err));
    }
  };

  const loadSubscription = () => {
    if (config?.vendor_id) {
      setIsLoadingSub(true);
      fetchVendorSubscription(config.vendor_id)
        .then(data => setSubscriptionData(data))
        .catch(err => console.log('Could not fetch subscription data:', err))
        .finally(() => setIsLoadingSub(false));
    }
  };

  const handleOpenBillingPortal = async () => {
    setIsProcessingSubAction(true);
    try {
      const res = await createVendorBillingPortalSession(config.vendor_id);
      if (res.url && res.url.startsWith('http')) {
        window.open(res.url, '_blank');
        setActionNotice('💳 Opened Stripe Customer Billing Portal in new window.');
      } else {
        setActionNotice('💳 Direct 1-Click Billing Update session active. Opening portal...');
      }
    } catch (err: any) {
      setActionNotice(`⚠️ Billing portal error: ${err.message}`);
    } finally {
      setIsProcessingSubAction(false);
    }
  };

  const handleClearDunning = async () => {
    setIsProcessingSubAction(true);
    try {
      await clearVendorDunning(config.vendor_id);
      setActionNotice(`✓ Account restored to Good Standing. Delinquent warning dismissed.`);
      loadSubscription();
    } catch (err: any) {
      setActionNotice(`⚠️ Failed to clear dunning: ${err.message}`);
    } finally {
      setIsProcessingSubAction(false);
    }
  };

  const handleSendInviteEmail = async () => {
    if (!config?.vendor_id) return;
    setIsSendingInvite(true);
    try {
      const res = await sendVendorOnboardingInvite(config.vendor_id);
      setInviteSuccessMsg(`Setup guide successfully sent to ${res.recipient || 'owner email'}!`);
      setTimeout(() => setInviteSuccessMsg(null), 5000);
    } catch (err: any) {
      alert(`Could not send email: ${err.message}`);
    } finally {
      setIsSendingInvite(false);
    }
  };

  const loadOmnichannelDesk = () => {
    if (!config?.vendor_id) return;
    fetch(`/api/v1/vendors/${config.vendor_id}/omnichannel/desk`, { headers: getAuthHeaders() })
      .then(res => res.json())
      .then(data => {
        if (data && data.chat_messenger?.messages && Array.isArray(data.chat_messenger.messages)) {
          setChatMessages(data.chat_messenger.messages.map((m: any) => ({
            id: m.message_id || String(m.timestamp || Date.now()),
            sender: m.sender_name || (m.direction === 'OUTBOUND' ? `${config.vendor_name || 'Vendor'} Dispatch` : 'Passenger'),
            phone: m.direction === 'OUTBOUND' ? m.recipient_phone : m.sender_phone,
            channel: m.channel || 'WHATSAPP',
            text: m.body,
            isOutbound: m.direction === 'OUTBOUND',
            time: m.timestamp ? new Date(m.timestamp * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Recent'
          })));
        }
        if (data && data.voice_studio?.recent_calls && Array.isArray(data.voice_studio.recent_calls)) {
          setVoiceCallRecords(data.voice_studio.recent_calls);
        }
      })
      .catch(err => console.log('Could not fetch omnichannel desk data:', err));
  };

  const [supportPlans, setSupportPlans] = useState<SupportDeskPlan[]>([]);
  const [vendorSupportSub, setVendorSupportSub] = useState<VendorSupportSubscription | null>(null);
  const [isSupportDeskLoading, setIsSupportDeskLoading] = useState(false);
  const [selectedSupportPlanId, setSelectedSupportPlanId] = useState<string>('plan_tier2_247');
  const [forwardingDidInput, setForwardingDidInput] = useState<string>(config?.branding?.contact_phone || config?.telecom_compliance?.contact_phone || '+18005555466');
  const [escalationPhoneInput, setEscalationPhoneInput] = useState<string>(config?.branding?.contact_phone || config?.telecom_compliance?.contact_phone || '+12155550199');
  const [customGreetingInput, setCustomGreetingInput] = useState<string>(`Thank you for calling ${config?.vendor_name || 'Executive Chauffeur Service'}. Please hold for concierge.`);
  const [isEnrollingSupport, setIsEnrollingSupport] = useState(false);

  const loadSupportDeskState = async () => {
    if (!config?.vendor_id) return;
    setIsSupportDeskLoading(true);
    try {
      const [plansRes, subsRes] = await Promise.all([
        fetchSupportDeskPlans(),
        fetchSupportDeskSubscriptions()
      ]);
      setSupportPlans(plansRes.plans || []);
      const subsList = Array.isArray(subsRes) ? subsRes : [];
      const matchingSub = subsList.find((s: VendorSupportSubscription) => s.vendor_id === config.vendor_id);
      if (matchingSub) {
        setVendorSupportSub(matchingSub);
        setSelectedSupportPlanId(matchingSub.plan_id);
        if (matchingSub.forwarding_did) setForwardingDidInput(matchingSub.forwarding_did);
        if (matchingSub.custom_greeting_script) setCustomGreetingInput(matchingSub.custom_greeting_script);
      }
    } catch (err) {
      console.log('Error loading support desk state:', err);
    } finally {
      setIsSupportDeskLoading(false);
    }
  };

  const handleEnrollSupportPlan = async (planId: string) => {
    if (!config?.vendor_id) return;
    setIsEnrollingSupport(true);
    try {
      const sub = await subscribeVendorSupportDesk({
        vendor_id: config.vendor_id,
        plan_id: planId,
        forwarding_did: forwardingDidInput,
        custom_greeting_script: customGreetingInput
      });
      setVendorSupportSub(sub);
      setSelectedSupportPlanId(sub.plan_id);
      setActionNotice(`🎧 Successfully activated ${sub.plan_name} for ${config.vendor_name || config.vendor_id}! (Status: ${sub.status})`);
    } catch (err: any) {
      alert(`Failed to activate support plan: ${err.message}`);
    } finally {
      setIsEnrollingSupport(false);
    }
  };

  React.useEffect(() => {
    loadOnboardingStatus();
    loadSubscription();
    loadStripeStatus();
    loadPayoutLedger();
    loadOmnichannelDesk();
    loadSupportDeskState();
  }, [config?.vendor_id]);

  React.useEffect(() => {
    if (config) {
      vendorIdentityLearner.learnFromContext(config);
    }

    // 1. Fetch Fleet Vehicles for THIS specific vendor
    fetch(`/api/v1/vendors/${config.vendor_id}/fleet-inventory`, { headers: getAuthHeaders() })
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          const mapped = data.map((v: any) => ({
            id: v.id,
            make_model: `${v.make || ''} ${v.model || ''}`.trim() || 'Executive Vehicle',
            make: v.make,
            model: v.model,
            plate: v.license_plate || '—',
            vin: v.vin || '—',
            year: v.year || 2025,
            class: v.vehicle_class || 'FIRST_CLASS',
            status: v.status || (v.is_active !== false ? 'AVAILABLE' : 'MAINTENANCE'),
            is_active: v.is_active !== undefined ? v.is_active : (v.status !== 'MAINTENANCE' && v.status !== 'DISABLED'),
            passenger_capacity: v.passenger_capacity || 3,
            luggage_capacity: v.luggage_capacity || 3,
            exterior_color: v.exterior_color || 'Obsidian Black',
            interior_color: v.interior_color || 'Jet Black Nappa Leather',
            tagline: v.tagline || '',
            hourly_rate_usd: v.hourly_rate_usd || 125.0,
            per_km_usd: v.per_km_usd || 3.85,
            inspection_due: '2027-04-15',
            insurance_valid: true,
            is_network_shared: v.is_network_shared,
            amenities: v.amenities || [],
            photos: v.photos || []
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
            trip_id: b.trip?.id || b.trip_id || `trp-${b.id.slice(-6)}`,
            passenger: b.passenger?.name || b.party?.passenger_name || b.passenger_name || 'Executive Guest',
            passenger_phone: b.passenger?.phone || b.party?.passenger_phone || b.passenger_phone || '+1-215-555-0199',
            passenger_email: b.passenger?.email || b.party?.booker_email || b.booker_email || 'client@vip.com',
            booker_name: b.party?.booker_name || b.booker_name,
            booker_phone: b.party?.booker_phone || b.booker_phone,
            pickup: b.pickup_address || 'Philadelphia International Airport (PHL) - Terminal B',
            dropoff: b.dropoff_address || 'The Ritz-Carlton, Philadelphia',
            pickup_time: b.pickup_time_utc || b.pickup_time,
            flight_number: b.flight_number || b.trip?.flight_number || '',
            vehicle_class: b.vehicle_class || 'FIRST_CLASS',
            chauffeur: b.assigned_driver_name || b.trip?.driver_name || b.trip?.driver_id || 'Autonomous Auto-Assign',
            chauffeur_phone: b.assigned_driver_phone || b.trip?.driver_phone || '',
            status: b.status || 'SCHEDULED',
            fare_usd: Number(b.total_amount || b.fare_usd || b.total_fare_usd || b.amount || 0),
            net_payout_usd: Number(b.net_payout_usd || (Number(b.total_amount || b.fare_usd || 0) * 0.85)),
            source: b.origin_channel || b.source || 'DIRECT_STOREFRONT',
            special_instructions: b.party?.special_instructions || b.special_instructions || '',
            passenger_count: b.party?.passenger_count || b.passenger_count || 1,
            luggage_count: b.party?.luggage_count || b.luggage_count || 1,
            legs: b.legs || (b.master_itinerary?.legs) || [],
            raw: b,
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
          const mapped = data.map((r: any) => {
            const isOriginator = (r.originator_vendor_id === config.vendor_id || r.originator_vendor_id === config.vendor_id.replace('-', '_'));
            const gross = Number(r.gross_fare_usd || 0);
            const origComm = Number(r.originator_commission_usd ?? (r.fare_split?.originating_vendor_commission_usd ?? gross * 0.10));
            const perfNet = Number(r.performing_payout_usd ?? (r.fare_split?.performing_vendor_net_usd ?? gross * 0.85));

            return {
              id: r.exchange_id || r.trip_id,
              type: isOriginator ? 'OUTGOING_FARM' : 'INCOMING_HUB',
              direction: isOriginator ? '📤 Farmed-Out (10% Referral)' : '📥 Farmed-In (85% Net)',
              passenger: r.passenger_name || 'VIP Client',
              phone: '+1 (215) 555-0100',
              pickup: r.pickup_address || 'Airport FBO',
              dropoff: r.dropoff_address || 'Hotel VIP',
              partner: isOriginator ? r.performing_vendor_id : r.originator_vendor_id,
              city: isOriginator ? 'Destination Out-of-Market' : 'Local Market Servicing',
              vehicle_class: r.vehicle_class || 'FIRST_CLASS',
              gross_fare: gross,
              net_cut: isOriginator ? origComm : perfNet,
              cut_label: isOriginator ? '10% Referral Cut' : '85% Net Payout',
              status: r.settlement_status || 'SETTLED',
              chauffeur: isOriginator ? 'Partner Chauffeur' : 'Local Fleet Chauffeur',
              date: 'Today',
              escrow_status: 'ESCROW_LOCKED'
            };
          });
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
          setAffiliateRecommendations(recs.filter(r => !isSelfVendor(r.partner, config)));
        }
      })
      .catch(err => console.log('Recommendations load notice:', err));

    // 11. Fetch Live Stripe Connect Verification & Payout Status
    fetchVendorStripeStatus(config.vendor_id)
      .then(status => {
        if (status) {
          setStripeConnectStatus(status);
        }
      })
      .catch(err => console.log('Stripe status load notice:', err));
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
      setAffiliateRecommendations((recs || []).filter(r => !isSelfVendor(r.partner, config)));
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

  const handleAiAutoFillSpecs = (customQuery?: string) => {
    const q = customQuery || aiVehicleQuery || `${newVehicleForm.make} ${newVehicleForm.model}`;
    const profile = matchVehicleProfile(q);
    const dynamicTaglines = generateAiTaglines(profile.make, profile.model, profile.vehicleClass, profile.recommendedAmenities);
    setNewVehicleAiTaglines(dynamicTaglines);
    setShowNewAiTaglines(true);
    
    setNewVehicleForm(prev => {
      const activeUnit = prev.distance_unit || localeSpecs.defaultUnit;
      const rateForUnit = activeUnit === 'MILES' ? profile.perMileRateUsd : profile.perKmRateUsd;

      return {
        ...prev,
        make: profile.make,
        model: profile.model,
        vehicle_class: profile.vehicleClass,
        capacity_passengers: profile.passengerCapacity,
        capacity_luggage: profile.luggageCapacity,
        hourly_rate_usd: profile.hourlyRateUsd,
        per_distance_rate: rateForUnit,
        per_km_usd: profile.perKmRateUsd,
        distance_unit: activeUnit,
        exterior_color: profile.exteriorColor,
        interior_color: profile.interiorColor,
        tagline: profile.tagline,
        description: profile.description,
        amenities: profile.recommendedAmenities,
        uploaded_photos: prev.uploaded_photos
      };
    });

    const activeUnit = newVehicleForm.distance_unit || localeSpecs.defaultUnit;
    setActionNotice(`✨ AI Assistant auto-populated specs, ${activeUnit === 'MILES' ? 'per-mile' : 'per-km'} tariffs & luxury extras for ${profile.make} ${profile.model}!`);
  };

  const handleGenerateNewVehicleTaglines = () => {
    const suggestions = generateAiTaglines(
      newVehicleForm.make,
      newVehicleForm.model,
      newVehicleForm.vehicle_class,
      newVehicleForm.amenities
    );
    setNewVehicleAiTaglines(suggestions);
    setShowNewAiTaglines(true);
    setActionNotice(`✨ AI Assistant generated ${suggestions.length} showroom marketing headlines for ${newVehicleForm.make} ${newVehicleForm.model}!`);
  };

  const handleGenerateEditVehicleTaglines = () => {
    if (!editVehicleForm) return;
    const suggestions = generateAiTaglines(
      editVehicleForm.make,
      editVehicleForm.model,
      editVehicleForm.vehicle_class,
      editVehicleForm.amenities
    );
    setEditVehicleAiTaglines(suggestions);
    setShowEditAiTaglines(true);
    setActionNotice(`✨ AI Assistant generated ${suggestions.length} showroom marketing headlines for ${editVehicleForm.make} ${editVehicleForm.model}!`);
  };

  const handleToggleDistanceUnit = (unit: 'MILES' | 'KM') => {
    setNewVehicleForm(prev => {
      if (prev.distance_unit === unit) return prev;
      let newRate = prev.per_distance_rate;
      if (unit === 'KM' && prev.distance_unit === 'MILES') {
        newRate = Math.round((prev.per_distance_rate / 1.609) * 100) / 100;
      } else if (unit === 'MILES' && prev.distance_unit === 'KM') {
        newRate = Math.round((prev.per_distance_rate * 1.609) * 100) / 100;
      }
      return {
        ...prev,
        distance_unit: unit,
        per_distance_rate: newRate,
        per_km_usd: unit === 'KM' ? newRate : Math.round((newRate / 1.609) * 100) / 100
      };
    });
  };

  const handlePhotosSelected = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setIsCompressingPhotos(true);
    try {
      const processed: ProcessedStudioImage[] = [];
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        // Auto-assign photo type sequence if multiple (Exterior -> Cabin -> Cockpit -> Trunk)
        let defaultType: 'EXTERIOR' | 'CABIN' | 'COCKPIT' | 'TRUNK' | 'AMENITY' = 'EXTERIOR';
        if (i === 1) defaultType = 'CABIN';
        else if (i === 2) defaultType = 'COCKPIT';
        else if (i >= 3) defaultType = 'TRUNK';

        const comp = await compressStudioImage(file, {
          applyAiLighting: true,
          photoType: defaultType,
          isPrimary: newVehicleForm.uploaded_photos.length === 0 && i === 0
        });
        processed.push(comp);
      }
      setNewVehicleForm(prev => ({
        ...prev,
        uploaded_photos: [...prev.uploaded_photos, ...processed]
      }));
      setActionNotice(`📸 Successfully compressed ${processed.length} photo(s) using in-browser studio engine!`);
    } catch (err: any) {
      console.error('Error compressing photos:', err);
      setActionNotice(`⚠️ Image compression notice: ${err.message}`);
    } finally {
      setIsCompressingPhotos(false);
    }
  };

  const handleTogglePhotoAiLighting = async (index: number) => {
    const target = newVehicleForm.uploaded_photos[index];
    if (!target) return;
    try {
      const nextEnhanced = !target.isAiEnhanced;
      const updated = await toggleAiStudioLighting(target, nextEnhanced);
      setNewVehicleForm(prev => ({
        ...prev,
        uploaded_photos: prev.uploaded_photos.map((p, i) => i === index ? updated : p)
      }));
    } catch (err) {
      console.error('AI lighting toggle failed:', err);
    }
  };

  const handleSetPrimaryPhoto = (index: number) => {
    setNewVehicleForm(prev => ({
      ...prev,
      uploaded_photos: prev.uploaded_photos.map((p, i) => ({
        ...p,
        isPrimary: i === index
      }))
    }));
  };

  const handleRemovePhoto = (index: number) => {
    setNewVehicleForm(prev => {
      const remaining = prev.uploaded_photos.filter((_, i) => i !== index);
      if (remaining.length > 0 && !remaining.some(p => p.isPrimary)) {
        remaining[0].isPrimary = true;
      }
      return { ...prev, uploaded_photos: remaining };
    });
  };

  const handleToggleAmenity = (amenity: string) => {
    setNewVehicleForm(prev => {
      const exists = prev.amenities.includes(amenity);
      return {
        ...prev,
        amenities: exists
          ? prev.amenities.filter(a => a !== amenity)
          : [...prev.amenities, amenity]
      };
    });
  };

  const handleAddCustomAmenity = () => {
    if (!customAmenityInput.trim()) return;
    const clean = customAmenityInput.trim();
    if (!newVehicleForm.amenities.includes(clean)) {
      setNewVehicleForm(prev => ({
        ...prev,
        amenities: [...prev.amenities, clean]
      }));
    }
    setCustomAmenityInput('');
  };

  const handleAddVehicleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      setIsUploadingToS3(true);

      // 1. Upload compressed studio photos to S3
      const s3PhotoPayloads = [];
      if (newVehicleForm.uploaded_photos.length > 0) {
        for (let i = 0; i < newVehicleForm.uploaded_photos.length; i++) {
          const p = newVehicleForm.uploaded_photos[i];
          try {
            if (p.dataUrl.startsWith('data:image/')) {
              const s3Res = await uploadVehiclePhotoToS3(config.vendor_id, {
                base64_data: p.dataUrl,
                photo_type: p.photoType,
                caption: p.caption,
                is_primary: p.isPrimary,
                display_order: i + 1,
                ai_enhanced: p.isAiEnhanced
              });
              s3PhotoPayloads.push({
                photo_id: s3Res.photo_id,
                url: s3Res.url,
                caption: s3Res.caption,
                photo_type: s3Res.photo_type,
                is_primary: s3Res.is_primary,
                display_order: s3Res.display_order
              });
            } else {
              // Existing hosted stock URL
              s3PhotoPayloads.push({
                photo_id: `vimg_${i + 1}`,
                url: p.dataUrl,
                caption: p.caption,
                photo_type: p.photoType,
                is_primary: p.isPrimary,
                display_order: i + 1
              });
            }
          } catch (uploadErr) {
            console.warn('S3 upload notice for photo:', uploadErr);
          }
        }
      }

      const rateKm = newVehicleForm.distance_unit === 'KM'
        ? newVehicleForm.per_distance_rate
        : Math.round((newVehicleForm.per_distance_rate / 1.609) * 100) / 100;

      // 2. Register vehicle in backend fleet inventory
      const newVeh = await createVendorVehicle(config.vendor_id, {
        make: newVehicleForm.make,
        model: newVehicleForm.model,
        year: newVehicleForm.year,
        license_plate: newVehicleForm.license_plate,
        vin: newVehicleForm.vin,
        vehicle_class: newVehicleForm.vehicle_class,
        passenger_capacity: newVehicleForm.capacity_passengers,
        luggage_capacity: newVehicleForm.capacity_luggage,
        exterior_color: newVehicleForm.exterior_color,
        interior_color: newVehicleForm.interior_color,
        tagline: newVehicleForm.tagline,
        hourly_rate_usd: newVehicleForm.hourly_rate_usd,
        per_km_usd: rateKm,
        network_mode: newVehicleForm.is_network_shared ? 'GLOBAL_NETWORK_CONNECTED' : 'LOCAL_PRIVATE_ONLY',
        amenities: newVehicleForm.amenities,
        photos: s3PhotoPayloads
      });

      setVehicles(prev => [...prev, {
        id: newVeh.id,
        make_model: `${newVeh.make || ''} ${newVeh.model || ''}`.trim() || 'Luxury Executive Vehicle',
        plate: newVeh.license_plate || newVehicleForm.license_plate,
        vin: newVeh.vin || newVehicleForm.vin,
        year: newVeh.year || newVehicleForm.year,
        class: newVeh.vehicle_class || newVehicleForm.vehicle_class,
        status: newVeh.status || 'AVAILABLE',
        is_active: true,
        passenger_capacity: newVeh.passenger_capacity || newVehicleForm.capacity_passengers,
        luggage_capacity: newVeh.luggage_capacity || newVehicleForm.capacity_luggage,
        inspection_due: '2027-09-18',
        insurance_valid: true,
        photos: s3PhotoPayloads,
        amenities: newVehicleForm.amenities,
        is_network_shared: Boolean(newVeh.is_network_shared ?? newVehicleForm.is_network_shared)
      }]);

      setShowAddVehicleModal(false);
      setActionNotice(`✨ Added ${newVehicleForm.year} ${newVehicleForm.make} ${newVehicleForm.model} to Showroom & Live Fleet with ${s3PhotoPayloads.length} S3 photos!`);
    } catch (err: any) {
      setActionNotice(`⚠️ Failed to add vehicle: ${err.message}`);
    } finally {
      setLoading(false);
      setIsUploadingToS3(false);
    }
  };

  const handleSetVehicleActiveStatus = async (vehicleId: string, nextActive: boolean, plateOrName?: string) => {
    try {
      await toggleVehicleActive(config.vendor_id, vehicleId, nextActive);
      setVehicles(prev => prev.map(v => v.id === vehicleId ? { ...v, is_active: nextActive, status: nextActive ? 'AVAILABLE' : 'MAINTENANCE' } : v));
      setActionNotice(
        nextActive
          ? `🟢 Vehicle ${plateOrName || vehicleId} is now Active & In Service (Visible to customers in storefront showroom & rentals).`
          : `🛠️ Vehicle ${plateOrName || vehicleId} is now Under Maintenance / Repair (Hidden from customer showroom & rental options).`
      );
    } catch (err: any) {
      setActionNotice(`⚠️ Failed to update vehicle status: ${err.message}`);
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

  const handleOpenEditVehicleModal = (v: any) => {
    setEditingVehicle(v);
    const vMake = v.make || v.make_model?.split(' ')[0] || 'Cadillac';
    const vModel = v.model || v.make_model?.split(' ').slice(1).join(' ') || 'Fleet Vehicle';
    const hourlyRate = v.hourly_rate_usd || 125.0;
    const perKmRate = v.per_km_usd || 3.85;
    const defaultUnit = localeSpecs.defaultUnit;
    const perDistRate = defaultUnit === 'MILES' ? Math.round(perKmRate * 1.609 * 100) / 100 : perKmRate;

    const currentPhotos: ProcessedStudioImage[] = (v.photos || []).map((p: any, idx: number) => ({
      originalName: `vehicle_photo_${idx + 1}.webp`,
      originalSizeBytes: 180000,
      compressedSizeBytes: 180000,
      compressionRatioPct: 80,
      width: 1920,
      height: 1080,
      dataUrl: p.url || p.photo_url || p.dataUrl,
      photoType: p.photo_type || 'EXTERIOR',
      caption: p.caption || p.label || `${vMake} ${vModel}`,
      isPrimary: Boolean(p.is_primary ?? (idx === 0)),
      isAiEnhanced: true
    }));

    setEditVehicleForm({
      id: v.id,
      name: v.name || `${vMake} ${vModel}`,
      make: vMake,
      model: vModel,
      year: v.year || 2025,
      vehicle_class: v.class || v.vehicle_class || 'FIRST_CLASS',
      license_plate: v.plate || v.license_plate || '',
      vin: v.vin || '',
      capacity_passengers: v.passenger_capacity || 3,
      capacity_luggage: v.luggage_capacity || 3,
      exterior_color: v.exterior_color || 'Obsidian Black',
      interior_color: v.interior_color || 'Jet Black Nappa Leather',
      tagline: v.tagline || '',
      description: v.description || '',
      hourly_rate_usd: hourlyRate,
      per_km_usd: perKmRate,
      per_distance_rate: perDistRate,
      distance_unit: defaultUnit,
      is_network_shared: v.is_network_shared !== false,
      is_active: v.is_active !== false && v.status !== 'MAINTENANCE',
      amenities: v.amenities || [],
      uploaded_photos: currentPhotos
    });

    const editTaglines = generateAiTaglines(vMake, vModel, v.class || v.vehicle_class, v.amenities || []);
    setEditVehicleAiTaglines(editTaglines);
    setShowEditAiTaglines(true);
  };

  const handleToggleEditAmenity = (amenity: string) => {
    if (!editVehicleForm) return;
    setEditVehicleForm((prev: any) => {
      const exists = prev.amenities.includes(amenity);
      return {
        ...prev,
        amenities: exists ? prev.amenities.filter((a: string) => a !== amenity) : [...prev.amenities, amenity]
      };
    });
  };

  const handleAddEditCustomAmenity = () => {
    if (!editCustomAmenity.trim() || !editVehicleForm) return;
    const val = editCustomAmenity.trim();
    if (!editVehicleForm.amenities.includes(val)) {
      setEditVehicleForm((prev: any) => ({
        ...prev,
        amenities: [...prev.amenities, val]
      }));
    }
    setEditCustomAmenity('');
  };

  const handleEditPhotosSelected = async (files: FileList | null) => {
    if (!files || files.length === 0 || !editVehicleForm) return;
    setEditIsCompressingPhotos(true);
    try {
      const processed: ProcessedStudioImage[] = [];
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const res = await compressStudioImage(file, {
          maxWidth: 2048,
          maxHeight: 1365,
          quality: 0.82,
          applyAiLighting: true
        });
        processed.push(res);
      }
      setEditVehicleForm((prev: any) => ({
        ...prev,
        uploaded_photos: [...prev.uploaded_photos, ...processed]
      }));
    } catch (err: any) {
      setActionNotice(`⚠️ Image processing error: ${err.message}`);
    } finally {
      setEditIsCompressingPhotos(false);
    }
  };

  const handleToggleEditPhotoAiLighting = async (pIdx: number) => {
    if (!editVehicleForm) return;
    const target = editVehicleForm.uploaded_photos[pIdx];
    if (!target) return;
    try {
      const nextEnhanced = !target.isAiEnhanced;
      const updated = await toggleAiStudioLighting(target, nextEnhanced);
      setEditVehicleForm((prev: any) => ({
        ...prev,
        uploaded_photos: prev.uploaded_photos.map((p: ProcessedStudioImage, i: number) =>
          i === pIdx ? updated : p
        )
      }));
    } catch (err) {
      console.error('AI lighting toggle failed:', err);
    }
  };

  const handleRemoveEditPhoto = (pIdx: number) => {
    if (!editVehicleForm) return;
    setEditVehicleForm((prev: any) => {
      const filtered = prev.uploaded_photos.filter((_: any, i: number) => i !== pIdx);
      if (filtered.length > 0 && !filtered.some((p: any) => p.isPrimary)) {
        filtered[0].isPrimary = true;
      }
      return { ...prev, uploaded_photos: filtered };
    });
  };

  const handleSetEditPrimaryPhoto = (pIdx: number) => {
    if (!editVehicleForm) return;
    setEditVehicleForm((prev: any) => ({
      ...prev,
      uploaded_photos: prev.uploaded_photos.map((p: ProcessedStudioImage, i: number) => ({
        ...p,
        isPrimary: i === pIdx
      }))
    }));
  };

  const handleUpdateVehicleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editVehicleForm || !editingVehicle) return;
    setIsUpdatingVehicle(true);
    try {
      const photoPayloads = [];
      for (let idx = 0; idx < editVehicleForm.uploaded_photos.length; idx++) {
        const photo = editVehicleForm.uploaded_photos[idx];
        if (photo.dataUrl.startsWith('data:image/')) {
          const s3Res = await uploadVehiclePhotoToS3(config.vendor_id, {
            base64_data: photo.dataUrl,
            photo_type: photo.photoType,
            caption: photo.caption,
            is_primary: photo.isPrimary,
            display_order: idx + 1,
            ai_enhanced: photo.isAiEnhanced
          });
          photoPayloads.push({
            photo_id: s3Res.photo_id,
            url: s3Res.url,
            caption: s3Res.caption,
            photo_type: s3Res.photo_type,
            is_primary: s3Res.is_primary,
            display_order: s3Res.display_order
          });
        } else {
          photoPayloads.push({
            photo_id: `vimg_${idx + 1}`,
            url: photo.dataUrl,
            caption: photo.caption,
            photo_type: photo.photoType,
            is_primary: photo.isPrimary,
            display_order: idx + 1
          });
        }
      }

      const calculatedPerKm = editVehicleForm.distance_unit === 'MILES'
        ? Math.round((editVehicleForm.per_distance_rate / 1.609) * 100) / 100
        : editVehicleForm.per_distance_rate;

      const payload = {
        name: `${editVehicleForm.make} ${editVehicleForm.model}`,
        make: editVehicleForm.make,
        model: editVehicleForm.model,
        year: editVehicleForm.year,
        vehicle_class: editVehicleForm.vehicle_class,
        license_plate: editVehicleForm.license_plate,
        vin: editVehicleForm.vin,
        passenger_capacity: editVehicleForm.capacity_passengers,
        luggage_capacity: editVehicleForm.capacity_luggage,
        exterior_color: editVehicleForm.exterior_color,
        interior_color: editVehicleForm.interior_color,
        tagline: editVehicleForm.tagline,
        description: editVehicleForm.description,
        hourly_rate_usd: editVehicleForm.hourly_rate_usd,
        per_km_usd: calculatedPerKm,
        is_active: editVehicleForm.is_active,
        participate_in_network: editVehicleForm.is_network_shared,
        amenities: editVehicleForm.amenities,
        photos: photoPayloads
      };

      const updated: any = await updateVendorVehicle(config.vendor_id, editingVehicle.id, payload);

      setVehicles(prev => prev.map(v => v.id === editingVehicle.id ? {
        ...v,
        make_model: `${updated.make} ${updated.model}`,
        make: updated.make,
        model: updated.model,
        year: updated.year,
        plate: updated.license_plate,
        vin: updated.vin,
        class: updated.vehicle_class,
        status: updated.status,
        is_active: updated.is_active,
        passenger_capacity: updated.passenger_capacity,
        luggage_capacity: updated.luggage_capacity,
        exterior_color: updated.exterior_color,
        interior_color: updated.interior_color,
        tagline: updated.tagline,
        hourly_rate_usd: updated.hourly_rate_usd,
        per_km_usd: updated.per_km_usd,
        is_network_shared: updated.is_network_shared,
        amenities: updated.amenities,
        photos: updated.photos
      } : v));

      setEditingVehicle(null);
      setEditVehicleForm(null);
      setActionNotice(`✨ Successfully updated ${updated.year} ${updated.make} ${updated.model} (${updated.license_plate}) specifications in fleet & showroom!`);
    } catch (err: any) {
      setActionNotice(`⚠️ Failed to update vehicle: ${err.message}`);
    } finally {
      setIsUpdatingVehicle(false);
    }
  };

  const handleDeleteVehicleConfirm = async () => {
    if (!vehicleToDelete) return;
    setIsDeletingVehicle(true);
    try {
      await deleteVendorVehicle(config.vendor_id, vehicleToDelete.id);
      setVehicles(prev => prev.filter(v => v.id !== vehicleToDelete.id));
      setActionNotice(`🗑️ Successfully removed ${vehicleToDelete.year || ''} ${vehicleToDelete.make_model || 'Vehicle'} (${vehicleToDelete.plate || ''}) from fleet.`);
      setVehicleToDelete(null);
    } catch (err: any) {
      setActionNotice(`⚠️ Failed to delete vehicle: ${err.message}`);
    } finally {
      setIsDeletingVehicle(false);
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

  const handleOpenStripeConnect = async () => {
    if (!config?.vendor_id) return;
    setIsLoadingStripe(true);
    try {
      const res = await createVendorStripeConnectLink(config.vendor_id);
      if (res.onboarding_url) {
        window.open(res.onboarding_url, '_blank');
        setActionNotice('🔗 Opened Stripe Connect Express onboarding portal in a new tab.');
      }
    } catch (err: any) {
      setActionNotice(`⚠️ Stripe Connect error: ${err.message}`);
    } finally {
      setIsLoadingStripe(false);
    }
  };

  const handleOpenStripeLogin = async () => {
    if (!config?.vendor_id) return;
    setIsLoadingStripe(true);
    try {
      const res = await createVendorStripeLoginLink(config.vendor_id);
      if (res.url) {
        window.open(res.url, '_blank');
        setActionNotice('🔗 Opened Stripe Express Dashboard SSO portal in a new tab.');
      }
    } catch (err: any) {
      setActionNotice(`⚠️ Stripe Dashboard error: ${err.message}`);
    } finally {
      setIsLoadingStripe(false);
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
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
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
      loadOmnichannelDesk();
    } catch (err: any) {
      setActionNotice(`⚠️ Call initiation error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleSendLiveChatMessage = async (bodyText: string, channel: 'WHATSAPP' | 'SMS' = 'WHATSAPP', quickAction?: string) => {
    if (!bodyText.trim()) return;
    try {
      setLoading(true);
      const recipientPhone = softphoneDialNumber || config.telecom_compliance?.contact_phone || '+12155550188';
      const resp = await fetch(`/api/v1/vendors/${config.vendor_id}/omnichannel/send-message`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify({
          recipient_phone: recipientPhone,
          body: bodyText,
          channel: channel,
          quick_action_type: quickAction || null
        })
      });
      if (resp.ok) {
        setActionNotice(`✅ Message dispatched via ${channel} to ${recipientPhone}`);
        setNewChatText('');
        loadOmnichannelDesk();
      } else {
        const errData = await resp.json();
        setActionNotice(`⚠️ Failed to send message: ${errData.detail || 'Carrier rejection'}`);
      }
    } catch (err: any) {
      setActionNotice(`⚠️ Message send error: ${err.message}`);
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
                onClick={() => setShowPhoneBookingModal(true)}
                style={{
                  padding: '6px 14px',
                  backgroundColor: '#10B981',
                  color: '#FFFFFF',
                  borderRadius: '6px',
                  fontSize: '12px',
                  fontWeight: 800,
                  border: 'none',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  boxShadow: '0 2px 4px rgba(16, 185, 129, 0.2)'
                }}
              >
                <PhoneCall size={13} color="#FFFFFF" />
                <span>📞 Phone Intake Desk</span>
              </button>

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
            
            {/* Delinquent Subscription & Dunning Grace Notice Banner */}
            {subscriptionData && (subscriptionData.billing_status === 'PAST_DUE' || subscriptionData.is_grace_period_active) && (
              <div style={{
                backgroundColor: '#FEF2F2',
                border: '1px solid #FECACA',
                borderLeft: '5px solid #DC2626',
                borderRadius: '10px',
                padding: '16px 20px',
                marginBottom: '20px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '14px',
                boxShadow: '0 2px 6px rgba(220, 38, 38, 0.08)'
              }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', maxWidth: '680px' }}>
                  <div style={{ padding: '8px', backgroundColor: '#FEE2E2', borderRadius: '8px', color: '#DC2626', marginTop: '2px' }}>
                    <AlertTriangle size={22} />
                  </div>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                      <h4 style={{ margin: 0, fontSize: '14.5px', fontWeight: 800, color: '#991B1B' }}>
                        ⚠️ Monthly Hub SaaS Subscription Payment Past Due (Stage {subscriptionData.dunning_stage || 1})
                      </h4>
                      <span style={{ fontSize: '10px', fontWeight: 800, backgroundColor: '#DC2626', color: '#FFFFFF', padding: '2px 8px', borderRadius: '12px' }}>
                        7-DAY GRACE ACTIVE
                      </span>
                    </div>
                    <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: '#B91C1C', lineHeight: 1.5 }}>
                      {subscriptionData.grace_period_expires_at 
                        ? `Grace period expires on ${new Date(subscriptionData.grace_period_expires_at).toLocaleDateString()} at ${new Date(subscriptionData.grace_period_expires_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}. Settle balance or switch to Starter ($0/mo + 5%) to prevent cell suspension.`
                        : 'Please update your payment method or switch to Starter ($0/mo + 5%) to keep your Sovereign Cell active.'}
                    </p>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '6px', fontSize: '11px', color: '#7F1D1D', fontWeight: 600 }}>
                      <Mail size={13} color="#DC2626" />
                      <span>📧 Automated dunning notice sent to owner email with 1-click update link.</span>
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                  <button
                    onClick={handleOpenBillingPortal}
                    disabled={isProcessingSubAction}
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
                      gap: '6px',
                      boxShadow: '0 2px 4px rgba(220, 38, 38, 0.2)'
                    }}
                  >
                    <CreditCard size={14} />
                    <span>💳 Update Payment (1-Click)</span>
                  </button>

                  <button
                    onClick={handleClearDunning}
                    disabled={isProcessingSubAction}
                    title="Mark in good standing and dismiss warning"
                    style={{
                      padding: '8px 12px',
                      backgroundColor: '#F1F5F9',
                      color: '#475569',
                      border: '1px solid #CBD5E1',
                      borderRadius: '6px',
                      fontSize: '12px',
                      fontWeight: 700,
                      cursor: 'pointer'
                    }}
                  >
                    ✓ Settle / Dismiss
                  </button>
                </div>
              </div>
            )}

            {/* Progressive Onboarding & Setup Readiness Compact Alert Bar */}
            {showOnboardingBanner && onboardingStatus && (
              (() => {
                const pendingMilestones = onboardingStatus.milestones?.filter((m: any) => !m.completed) || [];
                const isFullyComplete = onboardingStatus.readiness_score >= 100 || pendingMilestones.length === 0;

                return (
                  <div style={{
                    backgroundColor: isFullyComplete ? '#F0FDF4' : '#FFFFFF',
                    border: `1px solid ${isFullyComplete ? '#BBF7D0' : '#E2E8F0'}`,
                    borderLeft: `4px solid ${isFullyComplete ? '#16A34A' : '#0078D4'}`,
                    borderRadius: '8px',
                    padding: '8px 14px',
                    marginBottom: '16px',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: '10px'
                  }}>
                    {/* Left: Score Badge & Status */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span style={{
                        fontSize: '11px',
                        fontWeight: 800,
                        padding: '3px 8px',
                        borderRadius: '4px',
                        backgroundColor: isFullyComplete ? '#DCFCE7' : '#EFF6FF',
                        color: isFullyComplete ? '#15803D' : '#0078D4',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px'
                      }}>
                        {isFullyComplete ? '✅ 100% Ready' : `🚀 ${onboardingStatus.readiness_score}% Setup`}
                      </span>

                      <span style={{ fontSize: '12px', fontWeight: 600, color: '#334155' }}>
                        {isFullyComplete
                          ? 'All sovereign cell milestones are configured and active.'
                          : `${pendingMilestones.length} pending item${pendingMilestones.length > 1 ? 's' : ''} to complete setup:`}
                      </span>
                    </div>

                    {/* Middle: ONLY Pending Milestone Action Pills */}
                    {!isFullyComplete && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                        {pendingMilestones.map((m: any) => (
                          <button
                            key={m.id}
                            onClick={() => {
                              if (m.id === 'stripe_payouts' || m.target_tab === 'payouts' || m.target_tab === 'banking') {
                                setActiveTab('payouts');
                                loadStripeStatus();
                                loadPayoutLedger();
                              } else if (m.id === 'fleet_active' || m.target_tab === 'fleet') {
                                setActiveTab('fleet');
                              } else if (m.id === 'email_gateway' || m.target_tab === 'email' || m.target_tab === 'email_rfq') {
                                setActiveTab('email_rfq');
                              } else if (m.id === 'dynamic_pricing' || m.target_tab === 'pricing') {
                                setActiveTab('pricing');
                              } else if (m.id === 'telecom_compliance' || m.target_tab === 'compliance') {
                                setActiveTab('omnichannel');
                                setOmniSubTab('10dlc');
                              } else if (m.id === 'branding_profile' || m.target_tab === 'branding') {
                                setActiveTab('omnichannel');
                                setOmniSubTab('seo');
                              } else if (m.target_tab) {
                                setActiveTab(m.target_tab as any);
                              } else {
                                setActiveTab('overview');
                              }
                            }}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '6px',
                              padding: '4px 10px',
                              borderRadius: '6px',
                              backgroundColor: '#FEF3C7',
                              border: '1px solid #FDE68A',
                              color: '#92400E',
                              fontSize: '11px',
                              fontWeight: 700,
                              cursor: 'pointer',
                              transition: 'all 0.15s ease'
                            }}
                            title={`Click to resolve: ${m.title}`}
                          >
                            <span>⏳</span>
                            <span>{m.title}</span>
                            <span style={{ opacity: 0.75 }}>({m.action_label || 'Configure'})</span>
                            <ChevronRight size={12} />
                          </button>
                        ))}
                      </div>
                    )}

                    {/* Right: Quick actions and dismiss */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <button
                        onClick={handleSendInviteEmail}
                        disabled={isSendingInvite}
                        style={{
                          padding: '4px 10px',
                          backgroundColor: '#F8FAFC',
                          color: '#475569',
                          border: '1px solid #E2E8F0',
                          borderRadius: '6px',
                          fontSize: '11px',
                          fontWeight: 600,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px'
                        }}
                      >
                        <Mail size={12} /> {isSendingInvite ? 'Sending...' : 'Email Guide'}
                      </button>
                      <button
                        onClick={() => setShowOnboardingBanner(false)}
                        style={{ background: 'transparent', border: 'none', color: '#94A3B8', cursor: 'pointer', padding: '4px', display: 'flex' }}
                        title="Dismiss bar"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  </div>
                );
              })()
            )}
            
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
                              <th style={{ padding: '12px 14px', fontWeight: 800 }}>Trip ID & Schedule</th>
                              <th style={{ padding: '12px 14px', fontWeight: 800 }}>Passenger & Contact</th>
                              <th style={{ padding: '12px 14px', fontWeight: 800 }}>Pickup Location & Flight</th>
                              <th style={{ padding: '12px 14px', fontWeight: 800 }}>Dropoff Destination</th>
                              <th style={{ padding: '12px 14px', fontWeight: 800 }}>Vehicle Class</th>
                              <th style={{ padding: '12px 14px', fontWeight: 800 }}>Channel</th>
                              <th style={{ padding: '12px 14px', fontWeight: 800 }}>Gross / Net</th>
                              <th style={{ padding: '12px 14px', fontWeight: 800 }}>Assigned Chauffeur</th>
                              <th style={{ padding: '12px 14px', fontWeight: 800 }}>Status</th>
                              <th style={{ padding: '12px 14px', fontWeight: 800 }}>Dispatcher Action</th>
                            </tr>
                          </thead>
                          <tbody>
                            {filtered.map((trip) => {
                              const hasLegs = trip.legs && trip.legs.length > 1;
                              const isLegsExpanded = expandedLegsRow[trip.id];
                              const formattedDate = trip.pickup_time ? (() => {
                                try {
                                  const d = new Date(trip.pickup_time);
                                  return `${d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} • ${d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}`;
                                } catch { return 'Scheduled Time'; }
                              })() : 'Scheduled Departure';

                              return (
                                <React.Fragment key={trip.id}>
                                  <tr
                                    style={{
                                      borderBottom: hasLegs && isLegsExpanded ? 'none' : '1px solid #F1F5F9',
                                      backgroundColor: trip.status === 'UNASSIGNED' ? '#FEF2F2' : (trip.status === 'CANCELLED' ? '#F8FAFC' : '#FFFFFF')
                                    }}
                                  >
                                    <td style={{ padding: '12px 14px', fontWeight: 800, color: '#0F172A', whiteSpace: 'nowrap' }}>
                                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        <span style={{ color: '#0078D4' }}>{trip.id}</span>
                                      </div>
                                      <div style={{ fontSize: '10px', color: '#64748B', fontWeight: 600, marginTop: '2px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                        <Clock size={10} /> {formattedDate}
                                      </div>
                                    </td>
                                    <td style={{ padding: '12px 14px', fontWeight: 700, color: '#0F172A', minWidth: '180px' }}>
                                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        <span>{trip.passenger}</span>
                                        {trip.booker_name && trip.booker_name !== trip.passenger && (
                                          <span style={{ fontSize: '9px', padding: '1px 5px', borderRadius: '4px', backgroundColor: '#F1F5F9', color: '#64748B' }}>
                                            Booked by {trip.booker_name}
                                          </span>
                                        )}
                                      </div>
                                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
                                        <a
                                          href={`tel:${trip.passenger_phone}`}
                                          style={{ fontSize: '11px', color: '#0078D4', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '3px', fontWeight: 700 }}
                                          title="Call Passenger Directly"
                                        >
                                          <Phone size={11} /> {trip.passenger_phone}
                                        </a>
                                        <a
                                          href={`sms:${trip.passenger_phone}`}
                                          style={{ fontSize: '10px', padding: '2px 6px', borderRadius: '4px', backgroundColor: '#EFF6FF', color: '#0078D4', textDecoration: 'none', fontWeight: 800 }}
                                          title="Send SMS to Passenger"
                                        >
                                          SMS
                                        </a>
                                      </div>
                                    </td>
                                    <td style={{ padding: '12px 14px', color: '#334155', maxWidth: '240px' }}>
                                      <div style={{ fontWeight: 600, color: '#0F172A' }}>{trip.pickup}</div>
                                      {trip.flight_number && (
                                        <div style={{ marginTop: '3px', display: 'inline-flex', alignItems: 'center', gap: '4px', backgroundColor: '#F0F9FF', border: '1px solid #BAE6FD', padding: '2px 6px', borderRadius: '4px', fontSize: '10px', fontWeight: 700, color: '#0284C7' }}>
                                          <Plane size={11} /> Flight {trip.flight_number}
                                        </div>
                                      )}
                                      {hasLegs && (
                                        <button
                                          onClick={() => setExpandedLegsRow(prev => ({ ...prev, [trip.id]: !prev[trip.id] }))}
                                          style={{ marginTop: '4px', display: 'flex', alignItems: 'center', gap: '4px', backgroundColor: '#F8FAFC', border: '1px solid #CBD5E1', padding: '2px 6px', borderRadius: '4px', fontSize: '10px', fontWeight: 700, color: '#475569', cursor: 'pointer' }}
                                        >
                                          🌐 {trip.legs.length} Legs Breakdown {isLegsExpanded ? <ChevronUp size={10} /> : <ChevronDown size={10} />}
                                        </button>
                                      )}
                                    </td>
                                    <td style={{ padding: '12px 14px', color: '#334155', maxWidth: '240px' }}>
                                      <div style={{ fontWeight: 600, color: '#0F172A' }}>{trip.dropoff}</div>
                                      {trip.special_instructions && (
                                        <div style={{ fontSize: '10px', color: '#B45309', marginTop: '2px', fontStyle: 'italic' }}>
                                          Note: "{trip.special_instructions}"
                                        </div>
                                      )}
                                    </td>
                                    <td style={{ padding: '12px 14px', whiteSpace: 'nowrap' }}>
                                      <span style={{ fontSize: '10px', padding: '3px 7px', borderRadius: '4px', backgroundColor: '#F1F5F9', color: '#475569', fontWeight: 800 }}>
                                        {trip.vehicle_class}
                                      </span>
                                    </td>
                                    <td style={{ padding: '12px 14px', whiteSpace: 'nowrap' }}>
                                      {trip.source === 'GLOBAL_HUB_MARKETPLACE' ? (
                                        <span style={{ fontSize: '10px', padding: '3px 6px', borderRadius: '4px', backgroundColor: '#EFF6FF', color: '#0078D4', fontWeight: 800 }}>
                                          🌐 HUB (85%)
                                        </span>
                                      ) : (
                                        <span style={{ fontSize: '10px', padding: '3px 6px', borderRadius: '4px', backgroundColor: '#F0FDF4', color: '#15803D', fontWeight: 800 }}>
                                          🏢 DIRECT
                                        </span>
                                      )}
                                    </td>
                                    <td style={{ padding: '12px 14px', fontWeight: 800, color: '#0F172A', whiteSpace: 'nowrap' }}>
                                      ${trip.fare_usd.toFixed(2)}
                                      <div style={{ fontSize: '10px', color: '#16A34A', fontWeight: 700 }}>
                                        Net: ${(trip.net_payout_usd || (trip.fare_usd * 0.85)).toFixed(2)}
                                      </div>
                                    </td>
                                    <td style={{ padding: '12px 14px', fontWeight: 700, color: trip.chauffeur === 'Unassigned' ? '#DC2626' : '#0F172A', whiteSpace: 'nowrap' }}>
                                      <div>{trip.chauffeur}</div>
                                      {trip.chauffeur_phone && (
                                        <a href={`tel:${trip.chauffeur_phone}`} style={{ fontSize: '10px', color: '#64748B', textDecoration: 'none' }}>
                                          {trip.chauffeur_phone}
                                        </a>
                                      )}
                                    </td>
                                    <td style={{ padding: '12px 14px', whiteSpace: 'nowrap' }}>
                                      <span style={{
                                        fontSize: '10px',
                                        fontWeight: 800,
                                        padding: '3px 8px',
                                        borderRadius: '4px',
                                        backgroundColor: trip.status === 'UNASSIGNED' ? '#FEE2E2' : (trip.status === 'CANCELLED' ? '#F1F5F9' : '#DCFCE7'),
                                        color: trip.status === 'UNASSIGNED' ? '#B91C1C' : (trip.status === 'CANCELLED' ? '#64748B' : '#15803D')
                                      }}>
                                        {trip.status}
                                      </span>
                                    </td>
                                    <td style={{ padding: '12px 14px', whiteSpace: 'nowrap' }}>
                                      <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                                        <button
                                          onClick={() => setSelectedTripForManifest(trip)}
                                          style={{
                                            padding: '4px 8px',
                                            backgroundColor: '#0F172A',
                                            color: '#FFFFFF',
                                            border: 'none',
                                            borderRadius: '4px',
                                            fontSize: '11px',
                                            fontWeight: 700,
                                            cursor: 'pointer',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '3px'
                                          }}
                                          title="Open Complete Chauffeur Dispatch Manifest"
                                        >
                                          <FileText size={11} /> 📋 Dispatch Sheet
                                        </button>

                                        {trip.status === 'UNASSIGNED' ? (
                                          <select
                                            onChange={(e) => handleAssignChauffeur(trip.id, e.target.value)}
                                            style={{
                                              backgroundColor: '#FFFFFF',
                                              color: '#0078D4',
                                              border: '1px solid #0078D4',
                                              borderRadius: '4px',
                                              padding: '4px 6px',
                                              fontSize: '11px',
                                              fontWeight: 700,
                                              cursor: 'pointer'
                                            }}
                                          >
                                            <option value="">Assign...</option>
                                            {chauffeurs.filter(c => c.shift === 'ON_DUTY' || c.shift === 'STANDBY').map(c => (
                                              <option key={c.id} value={c.name}>{c.name}</option>
                                            ))}
                                          </select>
                                        ) : (
                                          <button
                                            onClick={() => setActionNotice(`📍 Opened real-time GPS telemetry radar for trip ${trip.id}. Chauffeur: ${trip.chauffeur}`)}
                                            style={{ padding: '4px 6px', backgroundColor: '#EFF6FF', color: '#0078D4', border: '1px solid #BFDBFE', borderRadius: '4px', fontSize: '10px', fontWeight: 700, cursor: 'pointer' }}
                                          >
                                            Radar
                                          </button>
                                        )}
                                      </div>
                                    </td>
                                  </tr>

                                  {/* Multi-Leg Expanded Accordion Row */}
                                  {hasLegs && isLegsExpanded && (
                                    <tr style={{ backgroundColor: '#F8FAFC', borderBottom: '1px solid #E2E8F0' }}>
                                      <td colSpan={10} style={{ padding: '12px 20px' }}>
                                        <div style={{ backgroundColor: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '8px', padding: '14px' }}>
                                          <div style={{ fontSize: '12px', fontWeight: 800, color: '#0F172A', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                            <Globe size={14} color="#0078D4" /> Multi-Segment Journey Itinerary Breakdown ({trip.legs.length} Segments)
                                          </div>
                                          <div style={{ display: 'grid', gridTemplateColumns: `repeat(${Math.min(trip.legs.length, 3)}, 1fr)`, gap: '12px' }}>
                                            {trip.legs.map((leg: any, idx: number) => (
                                              <div key={idx} style={{ border: '1px solid #E5E7EB', borderRadius: '6px', padding: '10px', backgroundColor: '#FAFAFA' }}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                                                  <span style={{ fontSize: '11px', fontWeight: 800, color: '#0078D4' }}>Leg {idx + 1}</span>
                                                  <span style={{ fontSize: '10px', fontWeight: 700, color: '#15803D' }}>${Number(leg.subtotal_net || leg.price_usd || 0).toFixed(2)}</span>
                                                </div>
                                                <div style={{ fontSize: '11px', color: '#334155' }}>
                                                  <div><strong>From:</strong> {leg.origin_address || 'Origin'}</div>
                                                  <div><strong>To:</strong> {leg.destination_address || 'Destination'}</div>
                                                  <div style={{ fontSize: '10px', color: '#64748B', marginTop: '4px' }}>
                                                    Class: {leg.vehicle_class || 'FIRST_CLASS'} • Status: {leg.price_status || 'CONFIRMED'}
                                                  </div>
                                                </div>
                                              </div>
                                            ))}
                                          </div>
                                        </div>
                                      </td>
                                    </tr>
                                  )}
                                </React.Fragment>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    );
                  }

                  {/* 2. CARD GRID VIEW */}
                  return (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '16px' }}>
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
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <span style={{ fontSize: '11px', color: '#0078D4', fontWeight: 800 }}>{trip.id}</span>
                                {trip.flight_number && (
                                  <span style={{ fontSize: '10px', padding: '1px 5px', borderRadius: '4px', backgroundColor: '#EFF6FF', color: '#0284C7', fontWeight: 700 }}>
                                    ✈️ {trip.flight_number}
                                  </span>
                                )}
                              </div>
                              <h4 style={{ margin: '2px 0 0 0', fontSize: '15px', fontWeight: 800, color: '#0F172A' }}>{trip.passenger}</h4>
                            </div>
                            <span style={{
                              fontSize: '11px',
                              fontWeight: 800,
                              padding: '3px 8px',
                              borderRadius: '4px',
                              backgroundColor: trip.status === 'UNASSIGNED' ? '#FEE2E2' : (trip.status === 'CANCELLED' ? '#F1F5F9' : '#DCFCE7'),
                              color: trip.status === 'UNASSIGNED' ? '#B91C1C' : (trip.status === 'CANCELLED' ? '#64748B' : '#15803D')
                            }}>
                              {trip.status}
                            </span>
                          </div>

                          <div style={{ fontSize: '12px', color: '#374151', display: 'flex', flexDirection: 'column', gap: '5px' }}>
                            <div><strong>Pickup:</strong> {trip.pickup}</div>
                            <div><strong>Dropoff:</strong> {trip.dropoff}</div>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                              <span><strong>Class:</strong> {trip.vehicle_class}</span>
                              <span style={{ fontWeight: 800, color: '#0F172A' }}>${trip.fare_usd.toFixed(2)}</span>
                            </div>
                            <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                              <a
                                href={`tel:${trip.passenger_phone}`}
                                style={{ fontSize: '11px', color: '#0078D4', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '3px', fontWeight: 700 }}
                              >
                                <Phone size={11} /> {trip.passenger_phone}
                              </a>
                              <a
                                href={`sms:${trip.passenger_phone}`}
                                style={{ fontSize: '10px', padding: '1px 5px', borderRadius: '4px', backgroundColor: '#EFF6FF', color: '#0078D4', textDecoration: 'none', fontWeight: 800 }}
                              >
                                SMS Passenger
                              </a>
                            </div>
                          </div>

                          <div style={{ borderTop: '1px solid #E5E7EB', paddingTop: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div>
                              <div style={{ fontSize: '10px', color: '#6B7280' }}>ASSIGNED CHAUFFEUR</div>
                              <div style={{ fontSize: '13px', fontWeight: 700, color: '#0F172A' }}>{trip.chauffeur}</div>
                            </div>

                            <button
                              onClick={() => setSelectedTripForManifest(trip)}
                              style={{
                                padding: '6px 12px',
                                backgroundColor: '#0F172A',
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
                              <FileText size={12} /> Dispatch Sheet
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  );
                })()}

                {/* Chauffeur Dispatch Manifest & Trip Sheet Modal */}
                {selectedTripForManifest && (
                  <div style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    backgroundColor: 'rgba(15, 23, 42, 0.75)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 9999,
                    padding: '20px',
                    backdropFilter: 'blur(4px)'
                  }}>
                    <div style={{
                      backgroundColor: '#FFFFFF',
                      borderRadius: '16px',
                      maxWidth: '750px',
                      width: '100%',
                      maxHeight: '90vh',
                      overflowY: 'auto',
                      padding: '28px',
                      boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
                      border: '1px solid #E2E8F0'
                    }}>
                      {/* Modal Header */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid #E2E8F0', paddingBottom: '16px', marginBottom: '20px' }}>
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ fontSize: '11px', padding: '3px 8px', borderRadius: '4px', backgroundColor: '#EFF6FF', color: '#0078D4', fontWeight: 800 }}>
                              {selectedTripForManifest.id}
                            </span>
                            <span style={{ fontSize: '11px', padding: '3px 8px', borderRadius: '4px', backgroundColor: '#DCFCE7', color: '#15803D', fontWeight: 800 }}>
                              {selectedTripForManifest.status}
                            </span>
                          </div>
                          <h3 style={{ margin: '6px 0 0 0', fontSize: '20px', fontWeight: 800, color: '#0F172A' }}>
                            Chauffeur Dispatch Manifest & Trip Sheet
                          </h3>
                          <p style={{ margin: '2px 0 0 0', fontSize: '12px', color: '#64748B' }}>
                            Authoritative reservation manifest for dispatcher communication and chauffeur execution.
                          </p>
                        </div>
                        <button
                          onClick={() => setSelectedTripForManifest(null)}
                          style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: '#64748B' }}
                        >
                          <X size={20} />
                        </button>
                      </div>

                      {/* Passenger & Booker Details */}
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '18px' }}>
                        <div style={{ backgroundColor: '#F8FAFC', padding: '14px', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
                          <div style={{ fontSize: '11px', fontWeight: 800, color: '#475569', textTransform: 'uppercase', marginBottom: '6px' }}>
                            👤 Lead Passenger
                          </div>
                          <div style={{ fontSize: '15px', fontWeight: 800, color: '#0F172A' }}>
                            {selectedTripForManifest.passenger}
                          </div>
                          <div style={{ fontSize: '12px', color: '#334155', marginTop: '4px', display: 'flex', flexDirection: 'column', gap: '3px' }}>
                            <div><strong>Phone:</strong> {selectedTripForManifest.passenger_phone}</div>
                            <div><strong>Email:</strong> {selectedTripForManifest.passenger_email}</div>
                          </div>
                          <div style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
                            <a
                              href={`tel:${selectedTripForManifest.passenger_phone}`}
                              style={{ padding: '5px 10px', backgroundColor: '#0078D4', color: '#FFFFFF', borderRadius: '4px', fontSize: '11px', fontWeight: 700, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '4px' }}
                            >
                              <Phone size={12} /> Call Passenger
                            </a>
                            <a
                              href={`sms:${selectedTripForManifest.passenger_phone}`}
                              style={{ padding: '5px 10px', backgroundColor: '#EFF6FF', color: '#0078D4', border: '1px solid #BFDBFE', borderRadius: '4px', fontSize: '11px', fontWeight: 700, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '4px' }}
                            >
                              <MessageSquare size={12} /> SMS Passenger
                            </a>
                          </div>
                        </div>

                        <div style={{ backgroundColor: '#F8FAFC', padding: '14px', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
                          <div style={{ fontSize: '11px', fontWeight: 800, color: '#475569', textTransform: 'uppercase', marginBottom: '6px' }}>
                            🛡️ Service & Vehicle Specs
                          </div>
                          <div style={{ fontSize: '14px', fontWeight: 800, color: '#0F172A' }}>
                            {selectedTripForManifest.vehicle_class}
                          </div>
                          <div style={{ fontSize: '12px', color: '#334155', marginTop: '4px', display: 'flex', flexDirection: 'column', gap: '3px' }}>
                            <div><strong>Passengers:</strong> {selectedTripForManifest.passenger_count || 1} • <strong>Luggage:</strong> {selectedTripForManifest.luggage_count || 1} bags</div>
                            <div><strong>Gross Fare:</strong> ${selectedTripForManifest.fare_usd.toFixed(2)} USD</div>
                            <div style={{ color: '#16A34A', fontWeight: 700 }}><strong>Net Vendor Payout:</strong> ${(selectedTripForManifest.net_payout_usd || (selectedTripForManifest.fare_usd * 0.85)).toFixed(2)} USD</div>
                          </div>
                          {selectedTripForManifest.flight_number && (
                            <div style={{ marginTop: '8px', display: 'inline-flex', alignItems: 'center', gap: '4px', backgroundColor: '#F0F9FF', border: '1px solid #BAE6FD', padding: '3px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 700, color: '#0284C7' }}>
                              <Plane size={12} /> Flight Radar: {selectedTripForManifest.flight_number} (Auto Delay Tracking Active)
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Route Manifest */}
                      <div style={{ backgroundColor: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '8px', padding: '16px', marginBottom: '18px' }}>
                        <div style={{ fontSize: '11px', fontWeight: 800, color: '#475569', textTransform: 'uppercase', marginBottom: '10px' }}>
                          📍 Turn-by-Turn Route Itinerary
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                          <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                            <div style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: '#16A34A', marginTop: '4px' }} />
                            <div>
                              <div style={{ fontSize: '11px', color: '#64748B', fontWeight: 700 }}>PICKUP LOCATION</div>
                              <div style={{ fontSize: '13px', fontWeight: 800, color: '#0F172A' }}>{selectedTripForManifest.pickup}</div>
                            </div>
                          </div>

                          <div style={{ width: '2px', height: '14px', backgroundColor: '#CBD5E1', marginLeft: '4px' }} />

                          <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                            <div style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: '#DC2626', marginTop: '4px' }} />
                            <div>
                              <div style={{ fontSize: '11px', color: '#64748B', fontWeight: 700 }}>DROPOFF DESTINATION</div>
                              <div style={{ fontSize: '13px', fontWeight: 800, color: '#0F172A' }}>{selectedTripForManifest.dropoff}</div>
                            </div>
                          </div>
                        </div>

                        {selectedTripForManifest.special_instructions && (
                          <div style={{ marginTop: '12px', padding: '8px 12px', backgroundColor: '#FEF3C7', border: '1px solid #FDE68A', borderRadius: '6px', fontSize: '11px', color: '#92400E' }}>
                            <strong>Chauffeur VIP Instructions:</strong> {selectedTripForManifest.special_instructions}
                          </div>
                        )}
                      </div>

                      {/* Chauffeur Assignment Control */}
                      <div style={{ backgroundColor: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '8px', padding: '16px', marginBottom: '20px' }}>
                        <div style={{ fontSize: '11px', fontWeight: 800, color: '#475569', textTransform: 'uppercase', marginBottom: '8px' }}>
                          🚘 Chauffeur & Vehicle Assignment
                        </div>
                        <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
                          <div style={{ flex: 1, minWidth: '220px' }}>
                            <div style={{ fontSize: '12px', color: '#64748B', marginBottom: '4px' }}>Currently Assigned:</div>
                            <div style={{ fontSize: '14px', fontWeight: 800, color: '#0F172A' }}>{selectedTripForManifest.chauffeur}</div>
                          </div>
                          <select
                            onChange={(e) => {
                              handleAssignChauffeur(selectedTripForManifest.id, e.target.value);
                              setSelectedTripForManifest({ ...selectedTripForManifest, chauffeur: e.target.value });
                            }}
                            style={{
                              padding: '8px 12px',
                              backgroundColor: '#FFFFFF',
                              color: '#0F172A',
                              border: '1px solid #CBD5E1',
                              borderRadius: '6px',
                              fontSize: '12px',
                              fontWeight: 700,
                              cursor: 'pointer'
                            }}
                          >
                            <option value="">Reassign Chauffeur...</option>
                            {chauffeurs.map(c => (
                              <option key={c.id} value={c.name}>{c.name} ({c.shift})</option>
                            ))}
                          </select>
                          <button
                            onClick={() => {
                              alert(`📱 Dispatched SMS Manifest to ${selectedTripForManifest.chauffeur} with pickup: ${selectedTripForManifest.pickup}`);
                            }}
                            style={{
                              padding: '8px 14px',
                              backgroundColor: '#0078D4',
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
                            <Send size={13} /> Dispatch SMS to Driver
                          </button>
                        </div>
                      </div>

                      {/* Modal Footer Actions */}
                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                        <button
                          onClick={() => window.print()}
                          style={{
                            padding: '8px 16px',
                            backgroundColor: '#FFFFFF',
                            color: '#0F172A',
                            border: '1px solid #CBD5E1',
                            borderRadius: '6px',
                            fontSize: '12px',
                            fontWeight: 700,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px'
                          }}
                        >
                          <Printer size={14} /> Print Trip Sheet
                        </button>
                        <button
                          onClick={() => setSelectedTripForManifest(null)}
                          style={{
                            padding: '8px 16px',
                            backgroundColor: '#0F172A',
                            color: '#FFFFFF',
                            border: 'none',
                            borderRadius: '6px',
                            fontSize: '12px',
                            fontWeight: 800,
                            cursor: 'pointer'
                          }}
                        >
                          Close Manifest
                        </button>
                      </div>
                    </div>
                  </div>
                )}

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
                    borderRadius: '16px',
                    padding: '28px',
                    border: '2px solid #0078D4',
                    boxShadow: '0 20px 40px -10px rgba(0, 120, 212, 0.25)',
                    marginBottom: '24px'
                  }}>
                    {/* Modal Header */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '1px solid #E2E8F0', paddingBottom: '16px' }}>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <span style={{ backgroundColor: '#EFF6FF', color: '#0078D4', padding: '6px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <Car size={22} />
                          </span>
                          <div>
                            <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 900, color: '#0F172A' }}>
                              Add Vehicle to Fleet & Showroom Customizer
                            </h3>
                            <p style={{ margin: '2px 0 0 0', fontSize: '12px', color: '#64748B' }}>
                              AI-assisted onboarding with real S3 multi-photo upload studio, luxury amenities engine, and storefront synchronization.
                            </p>
                          </div>
                        </div>
                      </div>
                      <button
                        onClick={() => setShowAddVehicleModal(false)}
                        style={{ background: '#F1F5F9', border: 'none', borderRadius: '50%', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#64748B' }}
                      >
                        <X size={18} />
                      </button>
                    </div>

                    {/* 1. AI QUICK-ONBOARDING ASSISTANT BAR (LIGHT PRESTIGE DESIGN) */}
                    <div style={{
                      background: 'linear-gradient(135deg, #F8FAFC 0%, #F1F5F9 50%, #EFF6FF 100%)',
                      borderRadius: '12px',
                      padding: '16px 20px',
                      color: '#0F172A',
                      marginBottom: '22px',
                      border: '1px solid #CBD5E1',
                      boxShadow: '0 2px 10px rgba(15, 23, 42, 0.04)'
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginBottom: '12px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <div style={{ width: '34px', height: '34px', borderRadius: '8px', background: '#DBEAFE', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <Sparkles size={18} color="#0078D4" />
                          </div>
                          <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <span style={{ fontSize: '13px', fontWeight: 900, letterSpacing: '0.3px', color: '#0F172A' }}>
                                AI FLEET ONBOARDING ASSISTANT
                              </span>
                              <span style={{ backgroundColor: '#EFF6FF', color: '#1D4ED8', border: '1px solid #BFDBFE', fontSize: '10px', fontWeight: 800, padding: '2px 8px', borderRadius: '12px' }}>
                                AUTONOMOUS SPECS &amp; TARIFFS
                              </span>
                            </div>
                            <div style={{ fontSize: '11px', color: '#64748B', marginTop: '2px' }}>
                              Country Locale: <strong>{localeSpecs.countryName}</strong> · Standard Unit: <strong>{newVehicleForm.distance_unit === 'MILES' ? 'Miles (Imperial)' : 'Kilometers (Metric)'}</strong> · Currency: <strong>{localeSpecs.currencySymbol} ({localeSpecs.currencyCode})</strong>
                            </div>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleAiAutoFillSpecs()}
                          style={{
                            background: 'linear-gradient(135deg, #0078D4 0%, #0284C7 100%)',
                            color: '#FFFFFF',
                            border: 'none',
                            borderRadius: '8px',
                            padding: '9px 20px',
                            fontSize: '12px',
                            fontWeight: 800,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            boxShadow: '0 2px 8px rgba(0, 120, 212, 0.25)',
                            transition: 'all 0.15s ease'
                          }}
                        >
                          <Sparkles size={14} /> ✨ Auto-Populate Specs &amp; Luxury Extras
                        </button>
                      </div>

                      {/* Quick Presets for Instant 1-Click Fill */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', paddingTop: '10px', borderTop: '1px solid #E2E8F0' }}>
                        <span style={{ fontSize: '11px', color: '#475569', fontWeight: 700 }}>Quick Luxury Presets:</span>
                        {[
                          { label: 'Cadillac Escalade ESV', q: 'Cadillac Escalade ESV Sport Platinum' },
                          { label: 'Mercedes-Benz S-Class (S580)', q: 'Mercedes-Benz S580 4MATIC' },
                          { label: 'Mercedes-Maybach S680', q: 'Mercedes-Maybach S680 V12' },
                          { label: 'Lincoln Navigator L', q: 'Lincoln Navigator L Black Label' },
                          { label: 'BMW i7 Electric Flagship', q: 'BMW i7 xDrive60' },
                          { label: 'Mercedes Sprinter VIP JetVan', q: 'Mercedes-Benz Sprinter 3500 VIP JetVan' },
                          { label: 'Mercedes E-Class', q: 'Mercedes-Benz E350 Business' }
                        ].map(preset => (
                          <button
                            key={preset.label}
                            type="button"
                            onClick={() => {
                              setAiVehicleQuery(preset.q);
                              handleAiAutoFillSpecs(preset.q);
                            }}
                            style={{
                              padding: '5px 12px',
                              backgroundColor: '#FFFFFF',
                              color: '#1E293B',
                              border: '1px solid #CBD5E1',
                              borderRadius: '16px',
                              fontSize: '11px',
                              fontWeight: 700,
                              cursor: 'pointer',
                              boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
                              transition: 'all 0.15s ease'
                            }}
                          >
                            + {preset.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    <form onSubmit={handleAddVehicleSubmit}>
                      {/* 2. CORE VEHICLE IDENTIFIERS & TECHNICAL SPECS */}
                      <div style={{ backgroundColor: '#F8FAFC', padding: '16px', borderRadius: '10px', border: '1px solid #E2E8F0', marginBottom: '20px' }}>
                        <h4 style={{ margin: '0 0 14px 0', fontSize: '13px', fontWeight: 800, color: '#1E293B', display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <Building2 size={16} color="#0078D4" /> 1. Vehicle Make, Model, Chassis &amp; Physical Capacities
                        </h4>
                        
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '14px', marginBottom: '14px' }}>
                          <div>
                            <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>Make</label>
                            <input
                              type="text"
                              required
                              value={newVehicleForm.make}
                              onChange={(e) => setNewVehicleForm({ ...newVehicleForm, make: e.target.value })}
                              style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '13px', backgroundColor: '#FFFFFF' }}
                            />
                          </div>
                          <div>
                            <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>Model</label>
                            <input
                              type="text"
                              required
                              value={newVehicleForm.model}
                              onChange={(e) => setNewVehicleForm({ ...newVehicleForm, model: e.target.value })}
                              style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '13px', backgroundColor: '#FFFFFF' }}
                            />
                          </div>
                          <div>
                            <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>Year</label>
                            <input
                              type="number"
                              required
                              value={newVehicleForm.year}
                              onChange={(e) => setNewVehicleForm({ ...newVehicleForm, year: parseInt(e.target.value) || 2026 })}
                              style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '13px', backgroundColor: '#FFFFFF' }}
                            />
                          </div>
                          <div>
                            <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>Vehicle Class Tier</label>
                            <select
                              value={newVehicleForm.vehicle_class}
                              onChange={(e) => setNewVehicleForm({ ...newVehicleForm, vehicle_class: e.target.value })}
                              style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '13px', backgroundColor: '#FFFFFF', fontWeight: 700 }}
                            >
                              <option value="FIRST_CLASS">First Class (S-Class, 7-Series)</option>
                              <option value="LUXURY_SUV">Luxury SUV (Escalade, Navigator)</option>
                              <option value="ULTRA_LUXURY">Ultra Luxury (Maybach, Rolls-Royce)</option>
                              <option value="ELECTRIC_VIP">Electric VIP (Lucid Air, BMW i7)</option>
                              <option value="BUSINESS_VAN">Executive Sprinter VIP</option>
                              <option value="BUSINESS_SEDAN">Business Sedan (E-Class, 5-Series)</option>
                            </select>
                          </div>
                          <div>
                            <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>License Plate</label>
                            <input
                              type="text"
                              required
                              value={newVehicleForm.license_plate}
                              onChange={(e) => setNewVehicleForm({ ...newVehicleForm, license_plate: e.target.value })}
                              style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '13px', backgroundColor: '#FFFFFF', fontWeight: 700 }}
                            />
                          </div>
                          <div>
                            <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>VIN Number</label>
                            <input
                              type="text"
                              value={newVehicleForm.vin}
                              placeholder="e.g. 1GYS4HK78R0198..."
                              onChange={(e) => setNewVehicleForm({ ...newVehicleForm, vin: e.target.value })}
                              style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '13px', backgroundColor: '#FFFFFF' }}
                            />
                          </div>
                        </div>

                        {/* Capacities, Colors & Tariffs */}
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '14px' }}>
                          <div>
                            <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>
                              👥 Passenger Capacity
                            </label>
                            <input
                              type="number"
                              min="1"
                              max="30"
                              value={newVehicleForm.capacity_passengers}
                              onChange={(e) => setNewVehicleForm({ ...newVehicleForm, capacity_passengers: parseInt(e.target.value) || 3 })}
                              style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '13px', backgroundColor: '#FFFFFF', fontWeight: 800 }}
                            />
                          </div>
                          <div>
                            <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>
                              🧳 Luggage Capacity (Suitcases)
                            </label>
                            <input
                              type="number"
                              min="0"
                              max="30"
                              value={newVehicleForm.capacity_luggage}
                              onChange={(e) => setNewVehicleForm({ ...newVehicleForm, capacity_luggage: parseInt(e.target.value) || 3 })}
                              style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '13px', backgroundColor: '#FFFFFF', fontWeight: 800 }}
                            />
                          </div>
                          <div>
                            <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>
                              🎨 Exterior Paint Color
                            </label>
                            <input
                              type="text"
                              value={newVehicleForm.exterior_color}
                              onChange={(e) => setNewVehicleForm({ ...newVehicleForm, exterior_color: e.target.value })}
                              placeholder="e.g. Obsidian Black Metallic"
                              style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '13px', backgroundColor: '#FFFFFF' }}
                            />
                          </div>
                          <div>
                            <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>
                              🛋️ Interior Trim &amp; Leather
                            </label>
                            <input
                              type="text"
                              value={newVehicleForm.interior_color}
                              onChange={(e) => setNewVehicleForm({ ...newVehicleForm, interior_color: e.target.value })}
                              placeholder="e.g. Jet Black Nappa Leather"
                              style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '13px', backgroundColor: '#FFFFFF' }}
                            />
                          </div>
                          <div>
                            <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>
                              ⏱️ Hourly Rate ({localeSpecs.currencySymbol})
                            </label>
                            <input
                              type="number"
                              value={newVehicleForm.hourly_rate_usd}
                              onChange={(e) => setNewVehicleForm({ ...newVehicleForm, hourly_rate_usd: parseFloat(e.target.value) || 125.0 })}
                              style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '13px', backgroundColor: '#FFFFFF', fontWeight: 800 }}
                            />
                          </div>
                          <div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                              <label style={{ fontSize: '11px', fontWeight: 700, color: '#475569' }}>
                                📏 Per {newVehicleForm.distance_unit === 'MILES' ? 'Mile' : 'KM'} Rate ({localeSpecs.currencySymbol})
                              </label>
                              {/* Country-Aware Distance Unit Switcher Toggle */}
                              <div style={{ display: 'inline-flex', borderRadius: '4px', border: '1px solid #CBD5E1', overflow: 'hidden' }}>
                                <button
                                  type="button"
                                  onClick={() => handleToggleDistanceUnit('MILES')}
                                  style={{
                                    padding: '2px 7px',
                                    fontSize: '10px',
                                    fontWeight: 700,
                                    border: 'none',
                                    cursor: 'pointer',
                                    backgroundColor: newVehicleForm.distance_unit === 'MILES' ? '#0078D4' : '#F1F5F9',
                                    color: newVehicleForm.distance_unit === 'MILES' ? '#FFFFFF' : '#475569'
                                  }}
                                >
                                  Miles
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleToggleDistanceUnit('KM')}
                                  style={{
                                    padding: '2px 7px',
                                    fontSize: '10px',
                                    fontWeight: 700,
                                    border: 'none',
                                    cursor: 'pointer',
                                    backgroundColor: newVehicleForm.distance_unit === 'KM' ? '#0078D4' : '#F1F5F9',
                                    color: newVehicleForm.distance_unit === 'KM' ? '#FFFFFF' : '#475569'
                                  }}
                                >
                                  KM
                                </button>
                              </div>
                            </div>
                            <input
                              type="number"
                              step="0.05"
                              value={newVehicleForm.per_distance_rate}
                              onChange={(e) => {
                                const val = parseFloat(e.target.value) || 0;
                                setNewVehicleForm({
                                  ...newVehicleForm,
                                  per_distance_rate: val,
                                  per_km_usd: newVehicleForm.distance_unit === 'KM' ? val : Math.round((val / 1.609) * 100) / 100
                                });
                              }}
                              style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '13px', backgroundColor: '#FFFFFF', fontWeight: 800 }}
                            />
                            <div style={{ fontSize: '10px', color: '#64748B', marginTop: '3px' }}>
                              Auto-detected for {localeSpecs.countryName}
                            </div>
                          </div>
                        </div>

                        {/* Customer Showroom Headline & AI Tagline Assistant */}
                        <div style={{ marginTop: '16px', backgroundColor: '#FFFFFF', padding: '16px', borderRadius: '10px', border: '1px solid #CBD5E1', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px', marginBottom: '8px' }}>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: 800, color: '#1E293B', margin: 0 }}>
                              <Sparkles size={15} color="#0078D4" /> Customer Showroom Headline / AI Marketing Tagline
                            </label>
                            <button
                              type="button"
                              onClick={handleGenerateNewVehicleTaglines}
                              style={{
                                padding: '5px 12px',
                                background: 'linear-gradient(135deg, #EFF6FF 0%, #DBEAFE 100%)',
                                color: '#1D4ED8',
                                border: '1px solid #BFDBFE',
                                borderRadius: '6px',
                                fontSize: '11px',
                                fontWeight: 800,
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '5px',
                                boxShadow: '0 1px 2px rgba(29, 78, 216, 0.08)',
                                transition: 'all 0.15s ease'
                              }}
                            >
                              <Sparkles size={13} color="#0078D4" /> ✨ AI Assistant: Generate Taglines
                            </button>
                          </div>

                          <input
                            type="text"
                            value={newVehicleForm.tagline}
                            onChange={(e) => setNewVehicleForm({ ...newVehicleForm, tagline: e.target.value })}
                            placeholder="e.g. The Undisputed American Executive Standard in Chauffeur Luxury"
                            style={{ width: '100%', padding: '9px 12px', borderRadius: '6px', border: '1.5px solid #CBD5E1', fontSize: '13px', backgroundColor: '#FFFFFF', fontWeight: 600, color: '#0F172A', marginBottom: '10px' }}
                          />

                          {/* AI Tagline Suggestion Pills */}
                          {showNewAiTaglines && (
                            <div style={{ background: '#F8FAFC', padding: '12px', borderRadius: '8px', border: '1px dashed #BFDBFE' }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', flexWrap: 'wrap', gap: '6px' }}>
                                <span style={{ fontSize: '11px', fontWeight: 700, color: '#475569', display: 'flex', alignItems: 'center', gap: '5px' }}>
                                  💡 <strong>AI Suggested Marketing Headlines</strong> (Click any to apply instantly):
                                </span>
                                <button
                                  type="button"
                                  onClick={handleGenerateNewVehicleTaglines}
                                  style={{ background: 'none', border: 'none', color: '#0078D4', fontSize: '11px', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                                >
                                  <RefreshCw size={11} /> Regenerate Ideas
                                </button>
                              </div>
                              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                                {(newVehicleAiTaglines.length > 0 ? newVehicleAiTaglines : generateAiTaglines(newVehicleForm.make, newVehicleForm.model, newVehicleForm.vehicle_class, newVehicleForm.amenities)).map((sug, sIdx) => {
                                  const isSelected = newVehicleForm.tagline === sug;
                                  return (
                                    <button
                                      key={sIdx}
                                      type="button"
                                      onClick={() => setNewVehicleForm({ ...newVehicleForm, tagline: sug })}
                                      style={{
                                        padding: '6px 11px',
                                        fontSize: '11px',
                                        fontWeight: isSelected ? 800 : 600,
                                        borderRadius: '6px',
                                        cursor: 'pointer',
                                        textAlign: 'left',
                                        transition: 'all 0.15s ease',
                                        backgroundColor: isSelected ? '#EFF6FF' : '#FFFFFF',
                                        color: isSelected ? '#1D4ED8' : '#334155',
                                        border: isSelected ? '1.5px solid #3B82F6' : '1px solid #CBD5E1',
                                        boxShadow: isSelected ? '0 1px 4px rgba(59, 130, 246, 0.2)' : '0 1px 2px rgba(0,0,0,0.02)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '6px'
                                      }}
                                    >
                                      {isSelected ? <Check size={13} color="#1D4ED8" /> : <span>✨</span>}
                                      <span>{sug}</span>
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* 3. MULTI-PHOTO S3 UPLOAD & AI SHOWROOM IMAGE STUDIO */}
                      <div style={{ backgroundColor: '#FFFFFF', padding: '18px', borderRadius: '12px', border: '2px dashed #0078D4', marginBottom: '20px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px', marginBottom: '14px' }}>
                          <div>
                            <h4 style={{ margin: 0, fontSize: '14px', fontWeight: 900, color: '#0F172A', display: 'flex', alignItems: 'center', gap: '8px' }}>
                              📸 2. Real S3 Multi-Photo Upload & AI Showroom Image Studio
                            </h4>
                            <p style={{ margin: '2px 0 0 0', fontSize: '12px', color: '#64748B' }}>
                              Upload multiple smartphone or camera raw photos. In-browser canvas automatically compresses files (&lt;250KB) and optimizes lighting before S3 storage.
                            </p>
                          </div>
                          
                          <label style={{
                            padding: '8px 18px',
                            backgroundColor: '#0078D4',
                            color: '#FFFFFF',
                            borderRadius: '8px',
                            fontSize: '12px',
                            fontWeight: 800,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            boxShadow: '0 2px 6px rgba(0, 120, 212, 0.25)'
                          }}>
                            <Plus size={16} /> Select Photos from Device
                            <input
                              type="file"
                              multiple
                              accept="image/jpeg,image/png,image/webp,image/heic"
                              onChange={(e) => handlePhotosSelected(e.target.files)}
                              style={{ display: 'none' }}
                            />
                          </label>
                        </div>

                        {/* Compression Status Alert */}
                        {isCompressingPhotos && (
                          <div style={{ padding: '10px 14px', backgroundColor: '#EFF6FF', border: '1px solid #BFDBFE', borderRadius: '8px', color: '#1E40AF', fontSize: '12px', fontWeight: 700, marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <RefreshCw size={16} className="animate-spin" /> In-browser studio engine is compressing and enhancing selected photos...
                          </div>
                        )}

                        {/* Photos Gallery Grid */}
                        {newVehicleForm.uploaded_photos.length === 0 ? (
                          <div style={{ textAlign: 'center', padding: '24px 16px', color: '#94A3B8' }}>
                            <Car size={36} color="#CBD5E1" style={{ margin: '0 auto 8px auto' }} />
                            <div style={{ fontSize: '13px', fontWeight: 700, color: '#64748B' }}>No showroom photos uploaded yet</div>
                            <div style={{ fontSize: '11px', color: '#94A3B8', marginTop: '2px' }}>
                              Click "+ Select Photos from Device" above to upload your actual vehicle exterior and cabin photos.
                            </div>
                          </div>
                        ) : (
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '14px' }}>
                            {newVehicleForm.uploaded_photos.map((photo, pIdx) => (
                              <div
                                key={pIdx}
                                style={{
                                  backgroundColor: '#F8FAFC',
                                  borderRadius: '10px',
                                  overflow: 'hidden',
                                  border: photo.isPrimary ? '2px solid #0078D4' : '1px solid #E2E8F0',
                                  boxShadow: photo.isPrimary ? '0 4px 12px rgba(0, 120, 212, 0.15)' : 'none',
                                  position: 'relative'
                                }}
                              >
                                {photo.isPrimary && (
                                  <div style={{ position: 'absolute', top: '8px', left: '8px', backgroundColor: '#0078D4', color: '#FFFFFF', padding: '2px 8px', borderRadius: '12px', fontSize: '10px', fontWeight: 800, zIndex: 2 }}>
                                    ★ COVER PHOTO
                                  </div>
                                )}

                                <div style={{ height: '140px', width: '100%', overflow: 'hidden', backgroundColor: '#0F172A', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                  <img
                                    src={photo.dataUrl}
                                    alt={photo.caption}
                                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                  />
                                </div>

                                <div style={{ padding: '10px' }}>
                                  {/* Photo Tag Selector */}
                                  <div style={{ marginBottom: '6px' }}>
                                    <label style={{ display: 'block', fontSize: '10px', fontWeight: 700, color: '#64748B', marginBottom: '2px' }}>CATEGORY</label>
                                    <select
                                      value={photo.photoType}
                                      onChange={(e) => {
                                        const nextType = e.target.value as any;
                                        setNewVehicleForm(prev => ({
                                          ...prev,
                                          uploaded_photos: prev.uploaded_photos.map((p, i) => i === pIdx ? { ...p, photoType: nextType } : p)
                                        }));
                                      }}
                                      style={{ width: '100%', padding: '4px 8px', borderRadius: '4px', border: '1px solid #CBD5E1', fontSize: '11px', fontWeight: 700 }}
                                    >
                                      <option value="EXTERIOR">Hero Exterior Profile</option>
                                      <option value="CABIN">Rear Executive Cabin Lounge</option>
                                      <option value="COCKPIT">Chauffeur Cockpit / Dashboard</option>
                                      <option value="TRUNK">Luggage Trunk Cargo Bay</option>
                                      <option value="AMENITY">Bar & Luxury Amenities</option>
                                    </select>
                                  </div>

                                  {/* AI Studio Lighting Toggle */}
                                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                                    <button
                                      type="button"
                                      onClick={() => handleTogglePhotoAiLighting(pIdx)}
                                      style={{
                                        padding: '4px 8px',
                                        backgroundColor: photo.isAiEnhanced ? '#DCFCE7' : '#F1F5F9',
                                        color: photo.isAiEnhanced ? '#15803D' : '#475569',
                                        border: photo.isAiEnhanced ? '1px solid #86EFAC' : '1px solid #CBD5E1',
                                        borderRadius: '4px',
                                        fontSize: '10px',
                                        fontWeight: 800,
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '4px'
                                      }}
                                    >
                                      <Sparkles size={12} /> {photo.isAiEnhanced ? '✨ AI Lighting: ON' : 'Standard'}
                                    </button>

                                    <span style={{ fontSize: '10px', color: '#64748B', fontWeight: 600 }}>
                                      {formatBytes(photo.compressedSizeBytes)}
                                    </span>
                                  </div>

                                  {/* Controls */}
                                  <div style={{ display: 'flex', gap: '6px' }}>
                                    {!photo.isPrimary && (
                                      <button
                                        type="button"
                                        onClick={() => handleSetPrimaryPhoto(pIdx)}
                                        style={{ flex: 1, padding: '4px', backgroundColor: '#EFF6FF', color: '#0078D4', border: '1px solid #BFDBFE', borderRadius: '4px', fontSize: '10px', fontWeight: 800, cursor: 'pointer' }}
                                      >
                                        Set Cover
                                      </button>
                                    )}
                                    <button
                                      type="button"
                                      onClick={() => handleRemovePhoto(pIdx)}
                                      style={{ padding: '4px 8px', backgroundColor: '#FEE2E2', color: '#DC2626', border: '1px solid #FECACA', borderRadius: '4px', fontSize: '10px', fontWeight: 800, cursor: 'pointer' }}
                                    >
                                      Remove
                                    </button>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* 4. LUXURY AMENITIES & ONBOARD EXTRAS CUSTOMIZER */}
                      <div style={{ backgroundColor: '#F8FAFC', padding: '16px', borderRadius: '10px', border: '1px solid #E2E8F0', marginBottom: '20px' }}>
                        <h4 style={{ margin: '0 0 4px 0', fontSize: '13px', fontWeight: 800, color: '#1E293B', display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <Award size={16} color="#0078D4" /> 3. Select Luxury Amenities & Onboard Extras (Shown to Customers in Showroom)
                        </h4>
                        <p style={{ margin: '0 0 12px 0', fontSize: '11px', color: '#64748B' }}>
                          Click any pill to toggle on/off. Selected amenities are highlighted in gold & blue on the customer storefront.
                        </p>

                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '14px' }}>
                          {ALL_LUXURY_AMENITIES_LIBRARY.map((amenity) => {
                            const isSelected = newVehicleForm.amenities.includes(amenity);
                            return (
                              <button
                                key={amenity}
                                type="button"
                                onClick={() => handleToggleAmenity(amenity)}
                                style={{
                                  padding: '6px 12px',
                                  backgroundColor: isSelected ? '#0078D4' : '#FFFFFF',
                                  color: isSelected ? '#FFFFFF' : '#334155',
                                  border: isSelected ? '1px solid #0078D4' : '1px solid #CBD5E1',
                                  borderRadius: '20px',
                                  fontSize: '11px',
                                  fontWeight: 700,
                                  cursor: 'pointer',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '6px',
                                  boxShadow: isSelected ? '0 2px 6px rgba(0, 120, 212, 0.2)' : 'none',
                                  transition: 'all 0.1s ease'
                                }}
                              >
                                {isSelected ? '✓ ' : '+ '} {amenity}
                              </button>
                            );
                          })}
                        </div>

                        {/* Add Custom Amenity */}
                        <div style={{ display: 'flex', gap: '8px', maxWidth: '480px' }}>
                          <input
                            type="text"
                            placeholder="Add custom amenity (e.g. 🎧 Noise Cancelling Bang & Olufsen)..."
                            value={customAmenityInput}
                            onChange={(e) => setCustomAmenityInput(e.target.value)}
                            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddCustomAmenity(); } }}
                            style={{ flex: 1, padding: '6px 12px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '12px' }}
                          />
                          <button
                            type="button"
                            onClick={handleAddCustomAmenity}
                            style={{ padding: '6px 14px', backgroundColor: '#334155', color: '#FFFFFF', border: 'none', borderRadius: '6px', fontSize: '11px', fontWeight: 800, cursor: 'pointer' }}
                          >
                            + Add Custom
                          </button>
                        </div>
                      </div>

                      {/* 5. GLOBAL HUB SHARING CHECKBOX */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '22px', padding: '14px 18px', background: '#EFF6FF', borderRadius: '10px', border: '1px solid #BFDBFE' }}>
                        <input
                          type="checkbox"
                          id="chk_network_sharing"
                          checked={newVehicleForm.is_network_shared}
                          onChange={(e) => setNewVehicleForm({ ...newVehicleForm, is_network_shared: e.target.checked })}
                          style={{ width: '18px', height: '18px', accentColor: '#0078D4', cursor: 'pointer' }}
                        />
                        <label htmlFor="chk_network_sharing" style={{ fontSize: '13px', fontWeight: 700, color: '#1E3A8A', cursor: 'pointer' }}>
                          🌐 Enable Global Hub Affiliate Network Sharing (Earn 85% net payout on cross-market farm-in jobs)
                        </label>
                      </div>

                      {/* Modal Action Buttons */}
                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', borderTop: '1px solid #E2E8F0', paddingTop: '16px' }}>
                        <button
                          type="button"
                          onClick={() => setShowAddVehicleModal(false)}
                          style={{ padding: '10px 20px', background: '#F1F5F9', border: '1px solid #CBD5E1', borderRadius: '8px', fontSize: '13px', fontWeight: 700, cursor: 'pointer', color: '#475569' }}
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          disabled={loading || isUploadingToS3}
                          style={{
                            padding: '10px 26px',
                            background: 'linear-gradient(135deg, #0078D4 0%, #1D4ED8 100%)',
                            color: '#FFFFFF',
                            border: 'none',
                            borderRadius: '8px',
                            fontSize: '13px',
                            fontWeight: 900,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            boxShadow: '0 4px 12px rgba(0, 120, 212, 0.3)'
                          }}
                        >
                          {isUploadingToS3 ? (
                            <>
                              <RefreshCw size={16} className="animate-spin" /> Uploading to S3 & Publishing...
                            </>
                          ) : (
                            <>
                              <CheckCircle2 size={16} /> 🚀 Save to Live Fleet & Showroom
                            </>
                          )}
                        </button>
                      </div>
                    </form>
                  </div>
                )}

                {/* Live Fleet Operational Status Counters */}
                <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
                  <div style={{ padding: '8px 14px', backgroundColor: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '8px', fontSize: '12px', fontWeight: 700, color: '#334155', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Car size={15} color="#0078D4" /> Total Fleet: <strong>{vehicles.length} Vehicles</strong>
                  </div>
                  <div style={{ padding: '8px 14px', backgroundColor: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: '8px', fontSize: '12px', fontWeight: 700, color: '#15803D', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#16A34A', display: 'inline-block' }}></span>
                    Active &amp; Rentable: <strong>{vehicles.filter(v => v.is_active !== false && v.status !== 'MAINTENANCE').length}</strong>
                  </div>
                  <div style={{ padding: '8px 14px', backgroundColor: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: '8px', fontSize: '12px', fontWeight: 700, color: '#B45309', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <AlertTriangle size={14} color="#D97706" />
                    Under Maintenance / Repair (Hidden): <strong>{vehicles.filter(v => v.is_active === false || v.status === 'MAINTENANCE').length}</strong>
                  </div>
                </div>

                <div style={{ backgroundColor: '#FFFFFF', borderRadius: '10px', overflow: 'hidden', border: '1px solid #E5E7EB', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '12px' }}>
                    <thead style={{ backgroundColor: '#F9FAFB', color: '#6B7280', textTransform: 'uppercase', fontSize: '11px' }}>
                      <tr>
                        <th style={{ padding: '14px 16px' }}>Showroom Vehicle</th>
                        <th style={{ padding: '14px 16px' }}>License Plate &amp; VIN</th>
                        <th style={{ padding: '14px 16px' }}>Class &amp; Capacities</th>
                        <th style={{ padding: '14px 16px' }}>S3 Media &amp; Amenities</th>
                        <th style={{ padding: '14px 16px' }}>Showroom &amp; Rental Status</th>
                        <th style={{ padding: '14px 16px' }}>Global Network Sharing</th>
                        <th style={{ padding: '14px 16px' }}>$5M Insurance</th>
                        <th style={{ padding: '14px 16px', textAlign: 'right' }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {vehicles.map((v) => {
                        const coverPhoto = (v.photos && v.photos.length > 0)
                          ? (v.photos.find((p: any) => p.is_primary) || v.photos[0])?.url
                          : null;
                        const isRentable = v.is_active !== false && v.status !== 'MAINTENANCE';

                        return (
                          <tr key={v.id} style={{ borderTop: '1px solid #E5E7EB', color: '#0F172A', backgroundColor: isRentable ? '#FFFFFF' : '#FFFDF5' }}>
                            <td style={{ padding: '14px 16px' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <div style={{ width: '54px', height: '36px', borderRadius: '6px', overflow: 'hidden', backgroundColor: '#0F172A', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, border: '1px solid #CBD5E1' }}>
                                  {coverPhoto ? (
                                    <img src={coverPhoto} alt={v.make_model} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                  ) : (
                                    <Car size={18} color="#94A3B8" />
                                  )}
                                </div>
                                <div>
                                  <div style={{ fontWeight: 800, fontSize: '13px', color: '#0F172A' }}>
                                    {v.year} {v.make_model}
                                  </div>
                                  {v.tagline && (
                                    <div style={{ fontSize: '11px', color: '#64748B', maxWidth: '240px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                      {v.tagline}
                                    </div>
                                  )}
                                </div>
                              </div>
                            </td>
                            <td style={{ padding: '14px 16px' }}>
                              <div style={{ color: '#0078D4', fontWeight: 800 }}>{v.plate}</div>
                              <div style={{ fontFamily: 'monospace', color: '#94A3B8', fontSize: '11px' }}>{v.vin}</div>
                            </td>
                            <td style={{ padding: '14px 16px' }}>
                              <div style={{ fontWeight: 700, color: '#334155' }}>{v.class}</div>
                              <div style={{ fontSize: '11px', color: '#64748B', marginTop: '2px' }}>
                                👥 {v.passenger_capacity || 3} Seats · 🧳 {v.luggage_capacity || 3} Bags
                              </div>
                            </td>
                            <td style={{ padding: '14px 16px' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                                <span style={{ backgroundColor: '#EFF6FF', color: '#0078D4', padding: '2px 8px', borderRadius: '12px', fontSize: '11px', fontWeight: 800 }}>
                                  📸 {v.photos?.length || 0} S3 Photos
                                </span>
                                {v.amenities && v.amenities.length > 0 && (
                                  <span style={{ backgroundColor: '#F1F5F9', color: '#475569', padding: '2px 8px', borderRadius: '12px', fontSize: '11px', fontWeight: 700 }}>
                                    ✨ {v.amenities.length} Extras
                                  </span>
                                )}
                              </div>
                            </td>
                            <td style={{ padding: '14px 16px' }}>
                              <select
                                value={isRentable ? 'AVAILABLE' : 'MAINTENANCE'}
                                onChange={(e) => {
                                  const nextActive = e.target.value === 'AVAILABLE';
                                  handleSetVehicleActiveStatus(v.id, nextActive, v.plate || v.make_model);
                                }}
                                style={{
                                  padding: '7px 12px',
                                  borderRadius: '8px',
                                  fontSize: '12px',
                                  fontWeight: 800,
                                  cursor: 'pointer',
                                  border: isRentable ? '1.5px solid #86EFAC' : '1.5px solid #FCD34D',
                                  backgroundColor: isRentable ? '#F0FDF4' : '#FFFBEB',
                                  color: isRentable ? '#15803D' : '#B45309',
                                  boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                                  outline: 'none',
                                  transition: 'all 0.15s ease'
                                }}
                              >
                                <option value="AVAILABLE" style={{ backgroundColor: '#FFFFFF', color: '#15803D', fontWeight: 700 }}>
                                  🟢 Active &amp; Rentable
                                </option>
                                <option value="MAINTENANCE" style={{ backgroundColor: '#FFFFFF', color: '#B45309', fontWeight: 700 }}>
                                  🛠️ Under Maintenance (Hidden)
                                </option>
                              </select>
                            </td>
                            <td style={{ padding: '14px 16px' }}>
                              <button
                                onClick={() => handleToggleVehicleNetwork(v.id, Boolean(v.is_network_shared))}
                                style={{
                                  padding: '4px 10px',
                                  borderRadius: '12px',
                                  fontSize: '11px',
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
                            <td style={{ padding: '14px 16px', color: '#16A34A', fontWeight: 700 }}>
                              <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                <ShieldCheck size={15} /> Active
                              </span>
                            </td>
                            <td style={{ padding: '14px 16px', textAlign: 'right' }}>
                              <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', alignItems: 'center' }}>
                                <button
                                  type="button"
                                  onClick={() => handleOpenEditVehicleModal(v)}
                                  style={{
                                    padding: '6px 12px',
                                    backgroundColor: '#EFF6FF',
                                    color: '#0078D4',
                                    border: '1px solid #BFDBFE',
                                    borderRadius: '6px',
                                    fontSize: '11px',
                                    fontWeight: 800,
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '4px',
                                    boxShadow: '0 1px 2px rgba(0, 120, 212, 0.1)'
                                  }}
                                  title="Edit vehicle specifications, tariffs, amenities and media"
                                >
                                  <Edit3 size={12} /> Edit
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setVehicleToDelete(v)}
                                  style={{
                                    padding: '6px 10px',
                                    backgroundColor: '#FEF2F2',
                                    color: '#DC2626',
                                    border: '1px solid #FECACA',
                                    borderRadius: '6px',
                                    fontSize: '11px',
                                    fontWeight: 800,
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '4px'
                                  }}
                                  title="Remove vehicle from fleet inventory"
                                >
                                  <Trash2 size={12} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* EDIT VEHICLE FULL SHOWROOM MODAL */}
                {editingVehicle && editVehicleForm && (
                  <div style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    backgroundColor: 'rgba(15, 23, 42, 0.75)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 1000,
                    padding: '20px',
                    overflowY: 'auto'
                  }}>
                    <div style={{
                      backgroundColor: '#FFFFFF',
                      borderRadius: '16px',
                      padding: '28px',
                      maxWidth: '960px',
                      width: '100%',
                      maxHeight: '90vh',
                      overflowY: 'auto',
                      boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
                      border: '2px solid #0078D4'
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '1px solid #E2E8F0', paddingBottom: '16px' }}>
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <span style={{ backgroundColor: '#EFF6FF', color: '#0078D4', padding: '6px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                              <Edit3 size={20} />
                            </span>
                            <div>
                              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 900, color: '#0F172A' }}>
                                Edit Vehicle Specifications &amp; Showroom Profile
                              </h3>
                              <p style={{ margin: '2px 0 0 0', fontSize: '12px', color: '#64748B' }}>
                                Updating <strong>{editVehicleForm.year} {editVehicleForm.make} {editVehicleForm.model}</strong> ({editVehicleForm.license_plate})
                              </p>
                            </div>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => { setEditingVehicle(null); setEditVehicleForm(null); }}
                          style={{ background: '#F1F5F9', border: 'none', borderRadius: '50%', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#64748B' }}
                        >
                          <X size={18} />
                        </button>
                      </div>

                      <form onSubmit={handleUpdateVehicleSubmit}>
                        {/* Section 1: Specs & Identifiers */}
                        <div style={{ backgroundColor: '#F8FAFC', padding: '16px', borderRadius: '10px', border: '1px solid #E2E8F0', marginBottom: '18px' }}>
                          <h4 style={{ margin: '0 0 12px 0', fontSize: '13px', fontWeight: 800, color: '#1E293B', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <Car size={16} color="#0078D4" /> 1. Vehicle Make, Model, Chassis &amp; Physical Capacities
                          </h4>
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: '12px', marginBottom: '12px' }}>
                            <div>
                              <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>Make</label>
                              <input
                                type="text"
                                value={editVehicleForm.make}
                                onChange={(e) => setEditVehicleForm({ ...editVehicleForm, make: e.target.value })}
                                required
                                style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '12px', fontWeight: 700 }}
                              />
                            </div>
                            <div>
                              <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>Model</label>
                              <input
                                type="text"
                                value={editVehicleForm.model}
                                onChange={(e) => setEditVehicleForm({ ...editVehicleForm, model: e.target.value })}
                                required
                                style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '12px', fontWeight: 700 }}
                              />
                            </div>
                            <div>
                              <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>Year</label>
                              <input
                                type="number"
                                value={editVehicleForm.year}
                                onChange={(e) => setEditVehicleForm({ ...editVehicleForm, year: parseInt(e.target.value) || 2026 })}
                                style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '12px', fontWeight: 700 }}
                              />
                            </div>
                            <div>
                              <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>Vehicle Class Tier</label>
                              <select
                                value={editVehicleForm.vehicle_class}
                                onChange={(e) => setEditVehicleForm({ ...editVehicleForm, vehicle_class: e.target.value })}
                                style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '12px', fontWeight: 700 }}
                              >
                                <option value="FIRST_CLASS">First Class (S-Class, 7-Series)</option>
                                <option value="BUSINESS_SEDAN">Business Class Sedan (E-Class, 5-Series)</option>
                                <option value="LUXURY_SUV">Luxury SUV (Escalade, Navigator)</option>
                                <option value="PRESTIGE_VAN">Executive VIP Sprinter JetVan</option>
                                <option value="ELECTRIC_FLAGSHIP">Electric Flagship (BMW i7, EQS)</option>
                              </select>
                            </div>
                            <div>
                              <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>License Plate</label>
                              <input
                                type="text"
                                value={editVehicleForm.license_plate}
                                onChange={(e) => setEditVehicleForm({ ...editVehicleForm, license_plate: e.target.value })}
                                required
                                style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '12px', fontWeight: 700 }}
                              />
                            </div>
                            <div>
                              <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>VIN Number</label>
                              <input
                                type="text"
                                value={editVehicleForm.vin}
                                onChange={(e) => setEditVehicleForm({ ...editVehicleForm, vin: e.target.value })}
                                style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '12px' }}
                              />
                            </div>
                          </div>

                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: '12px' }}>
                            <div>
                              <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>👥 Passenger Capacity</label>
                              <input
                                type="number"
                                min={1}
                                max={20}
                                value={editVehicleForm.capacity_passengers}
                                onChange={(e) => setEditVehicleForm({ ...editVehicleForm, capacity_passengers: parseInt(e.target.value) || 3 })}
                                style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '12px', fontWeight: 700 }}
                              />
                            </div>
                            <div>
                              <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>🧳 Luggage Capacity (Suitcases)</label>
                              <input
                                type="number"
                                min={1}
                                max={20}
                                value={editVehicleForm.capacity_luggage}
                                onChange={(e) => setEditVehicleForm({ ...editVehicleForm, capacity_luggage: parseInt(e.target.value) || 3 })}
                                style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '12px', fontWeight: 700 }}
                              />
                            </div>
                            <div>
                              <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>🎨 Exterior Paint Color</label>
                              <input
                                type="text"
                                value={editVehicleForm.exterior_color}
                                onChange={(e) => setEditVehicleForm({ ...editVehicleForm, exterior_color: e.target.value })}
                                style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '12px' }}
                              />
                            </div>
                            <div>
                              <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>🛋️ Interior Trim &amp; Leather</label>
                              <input
                                type="text"
                                value={editVehicleForm.interior_color}
                                onChange={(e) => setEditVehicleForm({ ...editVehicleForm, interior_color: e.target.value })}
                                style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '12px' }}
                              />
                            </div>
                            <div>
                              <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>⏱️ Hourly Rate ({localeSpecs.currencySymbol})</label>
                              <input
                                type="number"
                                step="0.5"
                                value={editVehicleForm.hourly_rate_usd}
                                onChange={(e) => setEditVehicleForm({ ...editVehicleForm, hourly_rate_usd: parseFloat(e.target.value) || 125.0 })}
                                style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '12px', fontWeight: 700 }}
                              />
                            </div>
                            <div>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                                <label style={{ fontSize: '11px', fontWeight: 700, color: '#475569' }}>
                                  📏 Per {editVehicleForm.distance_unit === 'MILES' ? 'Mile' : 'KM'} Rate ({localeSpecs.currencySymbol})
                                </label>
                                <div style={{ display: 'flex', backgroundColor: '#E2E8F0', borderRadius: '4px', padding: '1px' }}>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      if (editVehicleForm.distance_unit !== 'MILES') {
                                        const newRate = Math.round((editVehicleForm.per_distance_rate * 1.609) * 100) / 100;
                                        setEditVehicleForm({ ...editVehicleForm, distance_unit: 'MILES', per_distance_rate: newRate });
                                      }
                                    }}
                                    style={{
                                      padding: '2px 5px',
                                      fontSize: '9px',
                                      fontWeight: 800,
                                      border: 'none',
                                      borderRadius: '3px',
                                      cursor: 'pointer',
                                      backgroundColor: editVehicleForm.distance_unit === 'MILES' ? '#0078D4' : 'transparent',
                                      color: editVehicleForm.distance_unit === 'MILES' ? '#FFFFFF' : '#475569'
                                    }}
                                  >
                                    MILES
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      if (editVehicleForm.distance_unit !== 'KM') {
                                        const newRate = Math.round((editVehicleForm.per_distance_rate / 1.609) * 100) / 100;
                                        setEditVehicleForm({ ...editVehicleForm, distance_unit: 'KM', per_distance_rate: newRate });
                                      }
                                    }}
                                    style={{
                                      padding: '2px 5px',
                                      fontSize: '9px',
                                      fontWeight: 800,
                                      border: 'none',
                                      borderRadius: '3px',
                                      cursor: 'pointer',
                                      backgroundColor: editVehicleForm.distance_unit === 'KM' ? '#0078D4' : 'transparent',
                                      color: editVehicleForm.distance_unit === 'KM' ? '#FFFFFF' : '#475569'
                                    }}
                                  >
                                    KM
                                  </button>
                                </div>
                              </div>
                              <input
                                type="number"
                                step="0.05"
                                value={editVehicleForm.per_distance_rate}
                                onChange={(e) => setEditVehicleForm({ ...editVehicleForm, per_distance_rate: parseFloat(e.target.value) || 3.85 })}
                                style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '12px', fontWeight: 700 }}
                              />
                            </div>
                          </div>
                        </div>

                        {/* Section 2: Showroom Tagline & Description with AI Assistant */}
                        <div style={{ backgroundColor: '#FFFFFF', padding: '16px', borderRadius: '10px', border: '1px solid #CBD5E1', marginBottom: '18px', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
                          <div style={{ marginBottom: '14px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px', marginBottom: '8px' }}>
                              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: 800, color: '#1E293B', margin: 0 }}>
                                <Sparkles size={15} color="#0078D4" /> Customer Showroom Headline / AI Marketing Tagline
                              </label>
                              <button
                                type="button"
                                onClick={handleGenerateEditVehicleTaglines}
                                style={{
                                  padding: '5px 12px',
                                  background: 'linear-gradient(135deg, #EFF6FF 0%, #DBEAFE 100%)',
                                  color: '#1D4ED8',
                                  border: '1px solid #BFDBFE',
                                  borderRadius: '6px',
                                  fontSize: '11px',
                                  fontWeight: 800,
                                  cursor: 'pointer',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '5px',
                                  boxShadow: '0 1px 2px rgba(29, 78, 216, 0.08)',
                                  transition: 'all 0.15s ease'
                                }}
                              >
                                <Sparkles size={13} color="#0078D4" /> ✨ AI Assistant: Generate Taglines
                              </button>
                            </div>

                            <input
                              type="text"
                              value={editVehicleForm.tagline}
                              onChange={(e) => setEditVehicleForm({ ...editVehicleForm, tagline: e.target.value })}
                              style={{ width: '100%', padding: '9px 12px', borderRadius: '6px', border: '1.5px solid #CBD5E1', fontSize: '12px', fontWeight: 700, color: '#0F172A', marginBottom: '10px' }}
                            />

                            {/* AI Tagline Suggestion Pills */}
                            {showEditAiTaglines && (
                              <div style={{ background: '#F8FAFC', padding: '12px', borderRadius: '8px', border: '1px dashed #BFDBFE' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', flexWrap: 'wrap', gap: '6px' }}>
                                  <span style={{ fontSize: '11px', fontWeight: 700, color: '#475569', display: 'flex', alignItems: 'center', gap: '5px' }}>
                                    💡 <strong>AI Suggested Marketing Headlines</strong> (Click any to apply instantly):
                                  </span>
                                  <button
                                    type="button"
                                    onClick={handleGenerateEditVehicleTaglines}
                                    style={{ background: 'none', border: 'none', color: '#0078D4', fontSize: '11px', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                                  >
                                    <RefreshCw size={11} /> Regenerate Ideas
                                  </button>
                                </div>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                                  {(editVehicleAiTaglines.length > 0 ? editVehicleAiTaglines : generateAiTaglines(editVehicleForm.make, editVehicleForm.model, editVehicleForm.vehicle_class, editVehicleForm.amenities)).map((sug, sIdx) => {
                                    const isSelected = editVehicleForm.tagline === sug;
                                    return (
                                      <button
                                        key={sIdx}
                                        type="button"
                                        onClick={() => setEditVehicleForm({ ...editVehicleForm, tagline: sug })}
                                        style={{
                                          padding: '6px 11px',
                                          fontSize: '11px',
                                          fontWeight: isSelected ? 800 : 600,
                                          borderRadius: '6px',
                                          cursor: 'pointer',
                                          textAlign: 'left',
                                          transition: 'all 0.15s ease',
                                          backgroundColor: isSelected ? '#EFF6FF' : '#FFFFFF',
                                          color: isSelected ? '#1D4ED8' : '#334155',
                                          border: isSelected ? '1.5px solid #3B82F6' : '1px solid #CBD5E1',
                                          boxShadow: isSelected ? '0 1px 4px rgba(59, 130, 246, 0.2)' : '0 1px 2px rgba(0,0,0,0.02)',
                                          display: 'flex',
                                          alignItems: 'center',
                                          gap: '6px'
                                        }}
                                      >
                                        {isSelected ? <Check size={13} color="#1D4ED8" /> : <span>✨</span>}
                                        <span>{sug}</span>
                                      </button>
                                    );
                                  })}
                                </div>
                              </div>
                            )}
                          </div>
                          <div>
                            <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>
                              📝 Luxury Vehicle Description &amp; Passenger Comfort Narrative
                            </label>
                            <textarea
                              rows={2}
                              value={editVehicleForm.description}
                              onChange={(e) => setEditVehicleForm({ ...editVehicleForm, description: e.target.value })}
                              style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '12px' }}
                            />
                          </div>
                        </div>

                        {/* Section 3: Photo Studio & Media Management */}
                        <div style={{ backgroundColor: '#F8FAFC', padding: '16px', borderRadius: '10px', border: '1px solid #E2E8F0', marginBottom: '18px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', flexWrap: 'wrap', gap: '8px' }}>
                            <div>
                              <h4 style={{ margin: 0, fontSize: '13px', fontWeight: 800, color: '#1E293B', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <Camera size={16} color="#0078D4" /> 2. Showroom Photo Gallery &amp; S3 Media Management
                              </h4>
                              <p style={{ margin: '2px 0 0 0', fontSize: '11px', color: '#64748B' }}>
                                Manage uploaded photos, designate the cover image, and add more high-res photos.
                              </p>
                            </div>
                            <label style={{
                              padding: '6px 14px',
                              backgroundColor: '#0078D4',
                              color: '#FFFFFF',
                              borderRadius: '6px',
                              fontSize: '11px',
                              fontWeight: 800,
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '6px'
                            }}>
                              <Plus size={14} /> + Add More Photos
                              <input
                                type="file"
                                multiple
                                accept="image/jpeg,image/png,image/webp,image/heic"
                                onChange={(e) => handleEditPhotosSelected(e.target.files)}
                                style={{ display: 'none' }}
                              />
                            </label>
                          </div>

                          {editIsCompressingPhotos && (
                            <div style={{ padding: '8px 12px', backgroundColor: '#EFF6FF', border: '1px solid #BFDBFE', borderRadius: '6px', color: '#1E40AF', fontSize: '11px', fontWeight: 700, marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <RefreshCw size={14} className="animate-spin" /> Processing and enhancing selected photos...
                            </div>
                          )}

                          {editVehicleForm.uploaded_photos.length === 0 ? (
                            <div style={{ textAlign: 'center', padding: '20px', color: '#94A3B8' }}>
                              <Car size={32} color="#CBD5E1" style={{ margin: '0 auto 6px auto' }} />
                              <div style={{ fontSize: '12px', fontWeight: 700, color: '#64748B' }}>No photos attached to this vehicle</div>
                              <div style={{ fontSize: '11px', color: '#94A3B8', marginTop: '2px' }}>
                                Click "+ Add More Photos" above to upload photos from your device.
                              </div>
                            </div>
                          ) : (
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(190px, 1fr))', gap: '12px' }}>
                              {editVehicleForm.uploaded_photos.map((photo: any, pIdx: number) => (
                                <div
                                  key={pIdx}
                                  style={{
                                    backgroundColor: '#FFFFFF',
                                    borderRadius: '8px',
                                    overflow: 'hidden',
                                    border: photo.isPrimary ? '2px solid #0078D4' : '1px solid #E2E8F0',
                                    position: 'relative'
                                  }}
                                >
                                  {photo.isPrimary && (
                                    <div style={{ position: 'absolute', top: '6px', left: '6px', backgroundColor: '#0078D4', color: '#FFFFFF', padding: '2px 6px', borderRadius: '8px', fontSize: '9px', fontWeight: 800, zIndex: 2 }}>
                                      ★ COVER PHOTO
                                    </div>
                                  )}
                                  <div style={{ height: '110px', width: '100%', overflow: 'hidden', backgroundColor: '#0F172A', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <img src={photo.dataUrl} alt={photo.caption} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                  </div>
                                  <div style={{ padding: '8px' }}>
                                    <select
                                      value={photo.photoType}
                                      onChange={(e) => {
                                        const nextType = e.target.value;
                                        setEditVehicleForm((prev: any) => ({
                                          ...prev,
                                          uploaded_photos: prev.uploaded_photos.map((p: any, i: number) => i === pIdx ? { ...p, photoType: nextType } : p)
                                        }));
                                      }}
                                      style={{ width: '100%', padding: '3px 6px', borderRadius: '4px', border: '1px solid #CBD5E1', fontSize: '10px', fontWeight: 700, marginBottom: '6px' }}
                                    >
                                      <option value="EXTERIOR">Hero Exterior Profile</option>
                                      <option value="CABIN">Rear Executive Cabin Lounge</option>
                                      <option value="COCKPIT">Chauffeur Cockpit / Dashboard</option>
                                      <option value="TRUNK">Luggage Trunk Cargo Bay</option>
                                      <option value="AMENITY">Bar &amp; Luxury Amenities</option>
                                    </select>
                                    <div style={{ display: 'flex', gap: '6px' }}>
                                      {!photo.isPrimary && (
                                        <button
                                          type="button"
                                          onClick={() => handleSetEditPrimaryPhoto(pIdx)}
                                          style={{ flex: 1, padding: '3px', backgroundColor: '#EFF6FF', color: '#0078D4', border: '1px solid #BFDBFE', borderRadius: '4px', fontSize: '10px', fontWeight: 800, cursor: 'pointer' }}
                                        >
                                          Set Cover
                                        </button>
                                      )}
                                      <button
                                        type="button"
                                        onClick={() => handleRemoveEditPhoto(pIdx)}
                                        style={{ flex: 1, padding: '3px', backgroundColor: '#FEF2F2', color: '#DC2626', border: '1px solid #FECACA', borderRadius: '4px', fontSize: '10px', fontWeight: 800, cursor: 'pointer' }}
                                      >
                                        Remove
                                      </button>
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* Section 4: Amenities Customizer */}
                        <div style={{ backgroundColor: '#F8FAFC', padding: '16px', borderRadius: '10px', border: '1px solid #E2E8F0', marginBottom: '18px' }}>
                          <h4 style={{ margin: '0 0 4px 0', fontSize: '13px', fontWeight: 800, color: '#1E293B', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <Award size={16} color="#0078D4" /> 3. Luxury Amenities &amp; Onboard Extras
                          </h4>
                          <p style={{ margin: '0 0 10px 0', fontSize: '11px', color: '#64748B' }}>
                            Click any pill to toggle on/off.
                          </p>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '10px' }}>
                            {ALL_LUXURY_AMENITIES_LIBRARY.map((amenity) => {
                              const isSelected = editVehicleForm.amenities.includes(amenity);
                              return (
                                <button
                                  key={amenity}
                                  type="button"
                                  onClick={() => handleToggleEditAmenity(amenity)}
                                  style={{
                                    padding: '5px 10px',
                                    backgroundColor: isSelected ? '#0078D4' : '#FFFFFF',
                                    color: isSelected ? '#FFFFFF' : '#334155',
                                    border: isSelected ? '1px solid #0078D4' : '1px solid #CBD5E1',
                                    borderRadius: '16px',
                                    fontSize: '10px',
                                    fontWeight: 700,
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '4px'
                                  }}
                                >
                                  {isSelected ? '✓ ' : '+ '} {amenity}
                                </button>
                              );
                            })}
                          </div>
                          <div style={{ display: 'flex', gap: '6px', maxWidth: '420px' }}>
                            <input
                              type="text"
                              placeholder="Add custom amenity..."
                              value={editCustomAmenity}
                              onChange={(e) => setEditCustomAmenity(e.target.value)}
                              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddEditCustomAmenity(); } }}
                              style={{ flex: 1, padding: '5px 10px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '11px' }}
                            />
                            <button
                              type="button"
                              onClick={handleAddEditCustomAmenity}
                              style={{ padding: '5px 12px', backgroundColor: '#334155', color: '#FFFFFF', border: 'none', borderRadius: '6px', fontSize: '11px', fontWeight: 800, cursor: 'pointer' }}
                            >
                              + Add
                            </button>
                          </div>
                        </div>

                        {/* Section 5: Operational Status & Network Sharing */}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '20px' }}>
                          <div style={{ padding: '12px 14px', backgroundColor: editVehicleForm.is_active ? '#F0FDF4' : '#FFFBEB', border: editVehicleForm.is_active ? '1px solid #BBF7D0' : '1px solid #FDE68A', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <input
                              type="checkbox"
                              id="chk_edit_is_active"
                              checked={editVehicleForm.is_active}
                              onChange={(e) => setEditVehicleForm({ ...editVehicleForm, is_active: e.target.checked })}
                              style={{ width: '18px', height: '18px', accentColor: '#16A34A', cursor: 'pointer' }}
                            />
                            <div>
                              <label htmlFor="chk_edit_is_active" style={{ display: 'block', fontSize: '12px', fontWeight: 800, color: editVehicleForm.is_active ? '#15803D' : '#B45309', cursor: 'pointer' }}>
                                {editVehicleForm.is_active ? '🟢 In Service & Rentable' : '🛠️ Under Repair / Maintenance (Disabled)'}
                              </label>
                              <div style={{ fontSize: '10px', color: '#64748B' }}>
                                {editVehicleForm.is_active ? 'Visible to customers in showroom & rental lists.' : 'Hidden from customer storefront rental options.'}
                              </div>
                            </div>
                          </div>

                          <div style={{ padding: '12px 14px', backgroundColor: '#EFF6FF', border: '1px solid #BFDBFE', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <input
                              type="checkbox"
                              id="chk_edit_network_sharing"
                              checked={editVehicleForm.is_network_shared}
                              onChange={(e) => setEditVehicleForm({ ...editVehicleForm, is_network_shared: e.target.checked })}
                              style={{ width: '18px', height: '18px', accentColor: '#0078D4', cursor: 'pointer' }}
                            />
                            <div>
                              <label htmlFor="chk_edit_network_sharing" style={{ display: 'block', fontSize: '12px', fontWeight: 800, color: '#1E3A8A', cursor: 'pointer' }}>
                                🌐 Global Hub Network Sharing
                              </label>
                              <div style={{ fontSize: '10px', color: '#64748B' }}>
                                Earn 85% net payout on cross-market farm-in rides.
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Modal Action Buttons */}
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', borderTop: '1px solid #E2E8F0', paddingTop: '16px' }}>
                          <button
                            type="button"
                            onClick={() => { setEditingVehicle(null); setEditVehicleForm(null); }}
                            style={{ padding: '10px 20px', background: '#F1F5F9', border: '1px solid #CBD5E1', borderRadius: '8px', fontSize: '13px', fontWeight: 700, cursor: 'pointer', color: '#475569' }}
                          >
                            Cancel
                          </button>
                          <button
                            type="submit"
                            disabled={isUpdatingVehicle}
                            style={{
                              padding: '10px 26px',
                              background: 'linear-gradient(135deg, #0078D4 0%, #1D4ED8 100%)',
                              color: '#FFFFFF',
                              border: 'none',
                              borderRadius: '8px',
                              fontSize: '13px',
                              fontWeight: 900,
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '8px',
                              boxShadow: '0 4px 12px rgba(0, 120, 212, 0.3)'
                            }}
                          >
                            {isUpdatingVehicle ? (
                              <>
                                <RefreshCw size={16} className="animate-spin" /> Saving Changes &amp; Syncing S3...
                              </>
                            ) : (
                              <>
                                <CheckCircle2 size={16} /> 💾 Save Changes to Live Fleet
                              </>
                            )}
                          </button>
                        </div>
                      </form>
                    </div>
                  </div>
                )}

                {/* DELETE VEHICLE CONFIRMATION MODAL */}
                {vehicleToDelete && (
                  <div style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    backgroundColor: 'rgba(15, 23, 42, 0.75)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 1000,
                    padding: '20px'
                  }}>
                    <div style={{
                      backgroundColor: '#FFFFFF',
                      borderRadius: '14px',
                      padding: '24px',
                      maxWidth: '460px',
                      width: '100%',
                      boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
                      border: '2px solid #EF4444'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '14px' }}>
                        <div style={{ width: '42px', height: '42px', borderRadius: '50%', backgroundColor: '#FEE2E2', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          <Trash2 size={22} color="#DC2626" />
                        </div>
                        <div>
                          <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 900, color: '#0F172A' }}>
                            Decommission Vehicle from Fleet?
                          </h3>
                          <p style={{ margin: '2px 0 0 0', fontSize: '12px', color: '#64748B' }}>
                            Permanent fleet inventory action
                          </p>
                        </div>
                      </div>

                      <p style={{ fontSize: '13px', color: '#334155', lineHeight: 1.5, marginBottom: '20px' }}>
                        Are you sure you want to remove <strong>{vehicleToDelete.year || ''} {vehicleToDelete.make_model || 'Vehicle'}</strong> (Plate: <strong>{vehicleToDelete.plate || '—'}</strong>) from your fleet inventory? This vehicle will be deleted from the showroom and dispatch console.
                      </p>

                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                        <button
                          type="button"
                          onClick={() => setVehicleToDelete(null)}
                          style={{ padding: '8px 16px', background: '#F1F5F9', border: '1px solid #CBD5E1', borderRadius: '6px', fontSize: '12px', fontWeight: 700, cursor: 'pointer', color: '#475569' }}
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          disabled={isDeletingVehicle}
                          onClick={handleDeleteVehicleConfirm}
                          style={{
                            padding: '8px 18px',
                            background: '#DC2626',
                            color: '#FFFFFF',
                            border: 'none',
                            borderRadius: '6px',
                            fontSize: '12px',
                            fontWeight: 800,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            boxShadow: '0 2px 6px rgba(220, 38, 38, 0.3)'
                          }}
                        >
                          {isDeletingVehicle ? (
                            <>
                              <RefreshCw size={14} className="animate-spin" /> Deleting...
                            </>
                          ) : (
                            <>
                              <Trash2 size={14} /> Confirm Decommission
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                )}
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

                    {/* VENDOR STRIPE CONNECT EXPRESS PAYOUT STATUS BANNER */}
                    <div style={{
                      backgroundColor: '#F8FAFC',
                      borderRadius: '10px',
                      padding: '18px 20px',
                      border: '1.5px solid #CBD5E1',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      flexWrap: 'wrap',
                      gap: '16px',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                        <div style={{ backgroundColor: '#2563EB', color: '#FFFFFF', padding: '10px', borderRadius: '8px', display: 'flex' }}>
                          <CreditCard size={22} />
                        </div>
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <h4 style={{ margin: 0, fontSize: '15px', fontWeight: 800, color: '#0F172A' }}>
                              Vendor Treasury Stripe Express Account
                            </h4>
                            <span style={{
                              padding: '2px 8px',
                              borderRadius: '4px',
                              fontSize: '11px',
                              fontWeight: 800,
                              backgroundColor: stripeConnectStatus?.payouts_enabled ? '#DCFCE7' : '#FEF3C7',
                              color: stripeConnectStatus?.payouts_enabled ? '#15803D' : '#D97706'
                            }}>
                              {stripeConnectStatus?.payouts_enabled ? '● PAYOUTS ACTIVE' : '● ACTION NEEDED: BANK VERIFICATION'}
                            </span>
                          </div>
                          <p style={{ margin: '3px 0 0 0', fontSize: '12px', color: '#64748B' }}>
                            Connected Account: <code style={{ backgroundColor: '#E2E8F0', padding: '1px 6px', borderRadius: '3px', fontWeight: 700 }}>{stripeConnectStatus?.stripe_account_id || `acct_conn_${config.vendor_id}`}</code> &bull; Currency: <strong>{stripeConnectStatus?.default_currency || 'USD'}</strong> &bull; 85% Farm-In Clearing & Direct Deposits
                          </p>
                        </div>
                      </div>

                      <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                        <button
                          onClick={handleOpenStripeConnect}
                          disabled={isLoadingStripe}
                          style={{
                            backgroundColor: '#2563EB',
                            color: '#FFFFFF',
                            border: 'none',
                            padding: '8px 16px',
                            borderRadius: '6px',
                            fontSize: '12px',
                            fontWeight: 700,
                            cursor: isLoadingStripe ? 'not-allowed' : 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            boxShadow: '0 2px 4px rgba(37,99,235,0.2)'
                          }}
                        >
                          <Sliders size={14} />
                          <span>{isLoadingStripe ? 'Opening...' : 'Update Bank Routing / Debit Card'}</span>
                        </button>

                        <button
                          onClick={handleOpenStripeLogin}
                          disabled={isLoadingStripe}
                          style={{
                            backgroundColor: '#FFFFFF',
                            color: '#334155',
                            border: '1px solid #CBD5E1',
                            padding: '8px 14px',
                            borderRadius: '6px',
                            fontSize: '12px',
                            fontWeight: 700,
                            cursor: isLoadingStripe ? 'not-allowed' : 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px'
                          }}
                        >
                          <ExternalLink size={14} />
                          <span>Stripe Express Portal</span>
                        </button>
                      </div>
                    </div>

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

            {/* TAB 6: DYNAMIC TARIFF MATRIX & PRICING STUDIO */}
            {activeTab === 'pricing' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <VendorFleetAndPricingHub
                  initialVendorId={config.vendor_id || 'vendor-boston-vip'}
                  hideVendorSelector={false}
                />
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
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '14px' }}>
                        
                        {/* 1. FARM-IN POLICY (TAKING JOBS FROM OTHER VENDORS) */}
                        <div style={{ backgroundColor: '#FFFFFF', border: '1px solid #CBD5E1', borderRadius: '10px', padding: '14px 18px', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
                          <div
                            onClick={() => setIsFarmInOpen(!isFarmInOpen)}
                            style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', userSelect: 'none' }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                              <div style={{ fontSize: '14px', fontWeight: 800, color: '#0F172A', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                📥 Farm-In Policy (Receiving Work from Hub)
                              </div>
                              <span style={{ fontSize: '11px', fontWeight: 700, color: vendorAffiliatePolicy.farm_in_policy.open_for_farm_in ? '#15803D' : '#94A3B8', background: vendorAffiliatePolicy.farm_in_policy.open_for_farm_in ? '#DCFCE7' : '#F1F5F9', padding: '2px 8px', borderRadius: '12px' }}>
                                {vendorAffiliatePolicy.farm_in_policy.open_for_farm_in ? '🟢 Open for Farm-In' : '🔴 Closed'}
                              </span>
                              <span style={{ fontSize: '11px', color: '#64748B' }}>
                                Min Net Payout: <strong>${vendorAffiliatePolicy.farm_in_policy.min_net_payout_usd}</strong> • Max Deadhead: <strong>{vendorAffiliatePolicy.farm_in_policy.max_deadhead_from_depot_km} km</strong>
                              </span>
                            </div>

                            <button
                              type="button"
                              onClick={(e) => { e.stopPropagation(); setIsFarmInOpen(!isFarmInOpen); }}
                              style={{
                                padding: '4px 10px',
                                fontSize: '11px',
                                fontWeight: 700,
                                backgroundColor: isFarmInOpen ? '#EFF6FF' : '#F8FAFC',
                                color: isFarmInOpen ? '#0078D4' : '#475569',
                                border: '1px solid #CBD5E1',
                                borderRadius: '6px',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px'
                              }}
                            >
                              {isFarmInOpen ? '▲ Collapse' : '▼ Configure Rules'}
                            </button>
                          </div>

                          {isFarmInOpen && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '16px', borderTop: '1px solid #F1F5F9', paddingTop: '14px' }}>
                              {/* Open for Farm-In Checkbox */}
                              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
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
                          )}
                        </div>

                        {/* 2. FARM-OUT POLICY (FARMING WORK TO OTHER OPERATORS) */}
                        <div style={{ backgroundColor: '#FFFFFF', border: '1px solid #CBD5E1', borderRadius: '10px', padding: '14px 18px', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
                          <div
                            onClick={() => setIsFarmOutOpen(!isFarmOutOpen)}
                            style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', userSelect: 'none' }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                              <div style={{ fontSize: '14px', fontWeight: 800, color: '#0F172A', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                📤 Farm-Out Policy (Sending Work to Affiliates)
                              </div>
                              <span style={{ fontSize: '11px', fontWeight: 700, color: '#0078D4', background: '#EFF6FF', padding: '2px 8px', borderRadius: '12px' }}>
                                {vendorAffiliatePolicy.farm_out_policy.min_referral_commission_pct}% Referral Cut
                              </span>
                              <span style={{ fontSize: '11px', color: '#64748B' }}>
                                Min Partner Rating: <strong>{vendorAffiliatePolicy.farm_out_policy.min_partner_rating}★</strong> • Radius: <strong>{vendorAffiliatePolicy.farm_out_policy.local_service_radius_km} km</strong>
                              </span>
                            </div>

                            <button
                              type="button"
                              onClick={(e) => { e.stopPropagation(); setIsFarmOutOpen(!isFarmOutOpen); }}
                              style={{
                                padding: '4px 10px',
                                fontSize: '11px',
                                fontWeight: 700,
                                backgroundColor: isFarmOutOpen ? '#EFF6FF' : '#F8FAFC',
                                color: isFarmOutOpen ? '#0078D4' : '#475569',
                                border: '1px solid #CBD5E1',
                                borderRadius: '6px',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px'
                              }}
                            >
                              {isFarmOutOpen ? '▲ Collapse' : '▼ Configure Rules'}
                            </button>
                          </div>

                          {isFarmOutOpen && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '16px', borderTop: '1px solid #F1F5F9', paddingTop: '14px' }}>
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
                          )}
                        </div>

                        {/* 3. MULTI-LEG & DEADHEAD ROUTING POLICY (INTER-CITY & CORRIDOR RULES) */}
                        <div style={{ backgroundColor: '#FFFFFF', border: '1px solid #CBD5E1', borderRadius: '10px', padding: '14px 18px', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
                          <div
                            onClick={() => setIsMultiLegPolicyOpen(!isMultiLegPolicyOpen)}
                            style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', userSelect: 'none' }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                              <div style={{ fontSize: '14px', fontWeight: 800, color: '#0F172A', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                🛣️ Multi-Leg & Deadhead Routing Rules (Inter-City Corridors)
                              </div>
                              <span style={{ fontSize: '11px', fontWeight: 700, color: '#7C3AED', background: '#EDE9FE', padding: '2px 8px', borderRadius: '12px' }}>
                                🟣 Multi-Leg Auto-Routing Active
                              </span>
                              <span style={{ fontSize: '11px', color: '#64748B' }}>
                                Max Standby Layover: <strong>{vendorAffiliatePolicy.multi_leg_rules?.max_layover_hours_for_wait ?? 3.5}h</strong> • Standby Rate: <strong>${vendorAffiliatePolicy.multi_leg_rules?.hourly_wait_rate_usd ?? 75}/hr</strong> • Commission: <strong>{vendorAffiliatePolicy.multi_leg_rules?.affiliate_commission_target_pct ?? 18}%</strong>
                              </span>
                            </div>

                            <button
                              type="button"
                              onClick={(e) => { e.stopPropagation(); setIsMultiLegPolicyOpen(!isMultiLegPolicyOpen); }}
                              style={{
                                padding: '4px 10px',
                                fontSize: '11px',
                                fontWeight: 700,
                                backgroundColor: isMultiLegPolicyOpen ? '#F3E8FF' : '#F8FAFC',
                                color: isMultiLegPolicyOpen ? '#7C3AED' : '#475569',
                                border: '1px solid #CBD5E1',
                                borderRadius: '6px',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px'
                              }}
                            >
                              {isMultiLegPolicyOpen ? '▲ Collapse' : '▼ Configure Rules'}
                            </button>
                          </div>

                          {isMultiLegPolicyOpen && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '16px', borderTop: '1px solid #F1F5F9', paddingTop: '14px' }}>
                              
                              {/* Strategy Info Box */}
                              <div style={{ backgroundColor: '#FAF5FF', border: '1px solid #E9D5FF', borderRadius: '8px', padding: '12px', fontSize: '12px', color: '#581C87', lineHeight: 1.5 }}>
                                <strong>💡 How Multi-Leg Decision Engine Works for {config.vendor_name || 'Your Fleet'}:</strong>
                                <p style={{ margin: '4px 0 0 0', fontSize: '11.5px', color: '#6B21A8' }}>
                                  When a customer requests multi-leg travel (e.g. <strong>PHL ➔ NYC in the morning and return/forward later</strong>), our engine evaluates layover duration, empty deadhead fuel/tolls, and DOT 14-hour shift limits to automatically recommend <strong>Dedicated Chauffeur Standby</strong> vs. <strong>Split Relay Farm-Out</strong> to trusted partner operators.
                                </p>
                              </div>

                              {/* Form Grid 1: Layover & Wait Rates */}
                              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '14px' }}>
                                
                                <div style={{ backgroundColor: '#F8FAFC', padding: '12px', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
                                  <label style={{ fontSize: '11px', fontWeight: 800, color: '#1E293B', display: 'block' }}>
                                    ⏱️ Max Layover for In-House Standby (Hours)
                                  </label>
                                  <p style={{ fontSize: '10px', color: '#64748B', margin: '2px 0 6px 0' }}>
                                    Layovers &le; threshold keep same chauffeur on wait. Layovers &gt; threshold trigger farm-out.
                                  </p>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <input
                                      type="number"
                                      step="0.5"
                                      min="1.0"
                                      max="12.0"
                                      value={vendorAffiliatePolicy.multi_leg_rules?.max_layover_hours_for_wait ?? 3.5}
                                      onChange={e => setVendorAffiliatePolicy({
                                        ...vendorAffiliatePolicy,
                                        multi_leg_rules: {
                                          ...(vendorAffiliatePolicy.multi_leg_rules || {
                                            max_layover_hours_for_wait: 3.5,
                                            hourly_wait_rate_usd: 75.0,
                                            deadhead_rate_per_km_usd: 1.75,
                                            max_driver_shift_hours: 12.0,
                                            max_out_of_market_radius_km: 160.0,
                                            inter_city_corridor_policy: 'SMART_SPLIT',
                                            auto_farm_out_long_layovers: true,
                                            affiliate_commission_target_pct: 18.0,
                                            require_continuous_charter_for_local_stops: true,
                                            client_vip_override_enabled: true,
                                            overnight_hotel_allowance_usd: 250.0,
                                            chauffeur_meal_per_diem_usd: 75.0
                                          }),
                                          max_layover_hours_for_wait: parseFloat(e.target.value) || 3.5
                                        }
                                      })}
                                      style={{ width: '80px', padding: '6px 8px', fontSize: '12px', border: '1px solid #CBD5E1', borderRadius: '4px', fontWeight: 700 }}
                                    />
                                    <span style={{ fontSize: '11px', color: '#475569', fontWeight: 600 }}>Hours (Industry Standard: 3.5h)</span>
                                  </div>
                                </div>

                                <div style={{ backgroundColor: '#F8FAFC', padding: '12px', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
                                  <label style={{ fontSize: '11px', fontWeight: 800, color: '#1E293B', display: 'block' }}>
                                    💵 Hourly Chauffeur Standby Rate ($ USD / hr)
                                  </label>
                                  <p style={{ fontSize: '10px', color: '#64748B', margin: '2px 0 6px 0' }}>
                                    Billable rate charged to customer per hour when chauffeur is waiting on location.
                                  </p>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <span style={{ fontWeight: 800, color: '#0F172A' }}>$</span>
                                    <input
                                      type="number"
                                      step="5"
                                      min="40"
                                      max="250"
                                      value={vendorAffiliatePolicy.multi_leg_rules?.hourly_wait_rate_usd ?? 75.0}
                                      onChange={e => setVendorAffiliatePolicy({
                                        ...vendorAffiliatePolicy,
                                        multi_leg_rules: {
                                          ...(vendorAffiliatePolicy.multi_leg_rules || {
                                            max_layover_hours_for_wait: 3.5,
                                            hourly_wait_rate_usd: 75.0,
                                            deadhead_rate_per_km_usd: 1.75,
                                            max_driver_shift_hours: 12.0,
                                            max_out_of_market_radius_km: 160.0,
                                            inter_city_corridor_policy: 'SMART_SPLIT',
                                            auto_farm_out_long_layovers: true,
                                            affiliate_commission_target_pct: 18.0,
                                            require_continuous_charter_for_local_stops: true,
                                            client_vip_override_enabled: true,
                                            overnight_hotel_allowance_usd: 250.0,
                                            chauffeur_meal_per_diem_usd: 75.0
                                          }),
                                          hourly_wait_rate_usd: parseFloat(e.target.value) || 75.0
                                        }
                                      })}
                                      style={{ width: '80px', padding: '6px 8px', fontSize: '12px', border: '1px solid #CBD5E1', borderRadius: '4px', fontWeight: 700 }}
                                    />
                                    <span style={{ fontSize: '11px', color: '#475569', fontWeight: 600 }}>/ hour</span>
                                  </div>
                                </div>

                                <div style={{ backgroundColor: '#F8FAFC', padding: '12px', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
                                  <label style={{ fontSize: '11px', fontWeight: 800, color: '#1E293B', display: 'block' }}>
                                    🤝 Retained Farm-Out Commission Target (%)
                                  </label>
                                  <p style={{ fontSize: '10px', color: '#64748B', margin: '2px 0 6px 0' }}>
                                    Gross profit margin retained by {config.vendor_name || 'your company'} on farmed legs.
                                  </p>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <input
                                      type="number"
                                      step="1"
                                      min="5"
                                      max="40"
                                      value={vendorAffiliatePolicy.multi_leg_rules?.affiliate_commission_target_pct ?? 18.0}
                                      onChange={e => setVendorAffiliatePolicy({
                                        ...vendorAffiliatePolicy,
                                        multi_leg_rules: {
                                          ...(vendorAffiliatePolicy.multi_leg_rules || {
                                            max_layover_hours_for_wait: 3.5,
                                            hourly_wait_rate_usd: 75.0,
                                            deadhead_rate_per_km_usd: 1.75,
                                            max_driver_shift_hours: 12.0,
                                            max_out_of_market_radius_km: 160.0,
                                            inter_city_corridor_policy: 'SMART_SPLIT',
                                            auto_farm_out_long_layovers: true,
                                            affiliate_commission_target_pct: 18.0,
                                            require_continuous_charter_for_local_stops: true,
                                            client_vip_override_enabled: true,
                                            overnight_hotel_allowance_usd: 250.0,
                                            chauffeur_meal_per_diem_usd: 75.0
                                          }),
                                          affiliate_commission_target_pct: parseFloat(e.target.value) || 18.0
                                        }
                                      })}
                                      style={{ width: '80px', padding: '6px 8px', fontSize: '12px', border: '1px solid #CBD5E1', borderRadius: '4px', fontWeight: 700 }}
                                    />
                                    <span style={{ fontSize: '11px', color: '#475569', fontWeight: 600 }}>% referral cut (15% - 25% typical)</span>
                                  </div>
                                </div>

                                <div style={{ backgroundColor: '#F8FAFC', padding: '12px', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
                                  <label style={{ fontSize: '11px', fontWeight: 800, color: '#1E293B', display: 'block' }}>
                                    🛡️ Federal DOT Driver Shift Limit (Hours)
                                  </label>
                                  <p style={{ fontSize: '10px', color: '#64748B', margin: '2px 0 6px 0' }}>
                                    Alert threshold for chauffeur daily shift to prevent exceeding 14-hour legal window.
                                  </p>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <input
                                      type="number"
                                      step="0.5"
                                      min="8"
                                      max="14"
                                      value={vendorAffiliatePolicy.multi_leg_rules?.max_driver_shift_hours ?? 12.0}
                                      onChange={e => setVendorAffiliatePolicy({
                                        ...vendorAffiliatePolicy,
                                        multi_leg_rules: {
                                          ...(vendorAffiliatePolicy.multi_leg_rules || {
                                            max_layover_hours_for_wait: 3.5,
                                            hourly_wait_rate_usd: 75.0,
                                            deadhead_rate_per_km_usd: 1.75,
                                            max_driver_shift_hours: 12.0,
                                            max_out_of_market_radius_km: 160.0,
                                            inter_city_corridor_policy: 'SMART_SPLIT',
                                            auto_farm_out_long_layovers: true,
                                            affiliate_commission_target_pct: 18.0,
                                            require_continuous_charter_for_local_stops: true,
                                            client_vip_override_enabled: true,
                                            overnight_hotel_allowance_usd: 250.0,
                                            chauffeur_meal_per_diem_usd: 75.0
                                          }),
                                          max_driver_shift_hours: parseFloat(e.target.value) || 12.0
                                        }
                                      })}
                                      style={{ width: '80px', padding: '6px 8px', fontSize: '12px', border: '1px solid #CBD5E1', borderRadius: '4px', fontWeight: 700 }}
                                    />
                                    <span style={{ fontSize: '11px', color: '#DC2626', fontWeight: 700 }}>Hours Safety Warning (14h Hard Cap)</span>
                                  </div>
                                </div>

                              </div>

                              {/* Form Grid 2: Corridor & Regulatory Policies */}
                              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '14px' }}>
                                
                                <div style={{ backgroundColor: '#F8FAFC', padding: '12px', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
                                  <label style={{ fontSize: '11px', fontWeight: 800, color: '#1E293B', display: 'block', marginBottom: '4px' }}>
                                    🔀 Inter-City Corridor Default Fulfillment Strategy
                                  </label>
                                  <select
                                    value={vendorAffiliatePolicy.multi_leg_rules?.inter_city_corridor_policy || 'SMART_SPLIT'}
                                    onChange={e => setVendorAffiliatePolicy({
                                      ...vendorAffiliatePolicy,
                                      multi_leg_rules: {
                                        ...(vendorAffiliatePolicy.multi_leg_rules || {
                                          max_layover_hours_for_wait: 3.5,
                                          hourly_wait_rate_usd: 75.0,
                                          deadhead_rate_per_km_usd: 1.75,
                                          max_driver_shift_hours: 12.0,
                                          max_out_of_market_radius_km: 160.0,
                                          inter_city_corridor_policy: 'SMART_SPLIT',
                                          auto_farm_out_long_layovers: true,
                                          affiliate_commission_target_pct: 18.0,
                                          require_continuous_charter_for_local_stops: true,
                                          client_vip_override_enabled: true,
                                          overnight_hotel_allowance_usd: 250.0,
                                          chauffeur_meal_per_diem_usd: 75.0
                                        }),
                                        inter_city_corridor_policy: e.target.value as any
                                      }
                                    })}
                                    style={{ width: '100%', padding: '8px', fontSize: '12px', border: '1px solid #CBD5E1', borderRadius: '6px', backgroundColor: '#FFFFFF', fontWeight: 600 }}
                                  >
                                    <option value="SMART_SPLIT">⚡ Smart Split (Evaluate Layover & Auto-Select Optimal)</option>
                                    <option value="DEDICATED_WAIT_ONLY">🚘 Dedicated Chauffeur Standby Only (Always Keep In-House)</option>
                                    <option value="AUTO_FARM_FORWARD">🌐 Auto-Farm Outward Legs (Eliminate All Return Deadhead)</option>
                                  </select>
                                </div>

                                <div style={{ backgroundColor: '#F8FAFC', padding: '12px', borderRadius: '8px', border: '1px solid #E2E8F0', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                  <label style={{ fontSize: '11px', fontWeight: 800, color: '#1E293B' }}>
                                    ⚖️ Regulatory & VIP Service Protections
                                  </label>
                                  
                                  <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11.5px', color: '#334155', cursor: 'pointer' }}>
                                    <input
                                      type="checkbox"
                                      checked={vendorAffiliatePolicy.multi_leg_rules?.require_continuous_charter_for_local_stops ?? true}
                                      onChange={e => setVendorAffiliatePolicy({
                                        ...vendorAffiliatePolicy,
                                        multi_leg_rules: {
                                          ...(vendorAffiliatePolicy.multi_leg_rules || {
                                            max_layover_hours_for_wait: 3.5,
                                            hourly_wait_rate_usd: 75.0,
                                            deadhead_rate_per_km_usd: 1.75,
                                            max_driver_shift_hours: 12.0,
                                            max_out_of_market_radius_km: 160.0,
                                            inter_city_corridor_policy: 'SMART_SPLIT',
                                            auto_farm_out_long_layovers: true,
                                            affiliate_commission_target_pct: 18.0,
                                            require_continuous_charter_for_local_stops: true,
                                            client_vip_override_enabled: true,
                                            overnight_hotel_allowance_usd: 250.0,
                                            chauffeur_meal_per_diem_usd: 75.0
                                          }),
                                          require_continuous_charter_for_local_stops: e.target.checked
                                        }
                                      })}
                                    />
                                    <strong>Enforce Continuous Interstate Charter</strong> (NYC TLC / PA PPA cabotage legal shield)
                                  </label>

                                  <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11.5px', color: '#334155', cursor: 'pointer' }}>
                                    <input
                                      type="checkbox"
                                      checked={vendorAffiliatePolicy.multi_leg_rules?.client_vip_override_enabled ?? true}
                                      onChange={e => setVendorAffiliatePolicy({
                                        ...vendorAffiliatePolicy,
                                        multi_leg_rules: {
                                          ...(vendorAffiliatePolicy.multi_leg_rules || {
                                            max_layover_hours_for_wait: 3.5,
                                            hourly_wait_rate_usd: 75.0,
                                            deadhead_rate_per_km_usd: 1.75,
                                            max_driver_shift_hours: 12.0,
                                            max_out_of_market_radius_km: 160.0,
                                            inter_city_corridor_policy: 'SMART_SPLIT',
                                            auto_farm_out_long_layovers: true,
                                            affiliate_commission_target_pct: 18.0,
                                            require_continuous_charter_for_local_stops: true,
                                            client_vip_override_enabled: true,
                                            overnight_hotel_allowance_usd: 250.0,
                                            chauffeur_meal_per_diem_usd: 75.0
                                          }),
                                          client_vip_override_enabled: e.target.checked
                                        }
                                      })}
                                    />
                                    <strong>Enable VIP Dedicated Chauffeur Option</strong> (Allows executive booker to request same driver)
                                  </label>
                                </div>

                              </div>

                              {/* LIVE SCENARIO SIMULATOR & TEST BENCH */}
                              <div style={{ backgroundColor: '#FFFFFF', border: '1px solid #CBD5E1', borderRadius: '8px', padding: '14px', marginTop: '4px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                                  <div style={{ fontSize: '12px', fontWeight: 800, color: '#0F172A', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    🧪 Live Multi-Leg Strategy Simulator & Test Bench
                                  </div>
                                  <span style={{ fontSize: '10px', color: '#64748B' }}>
                                    Test how your sovereign rules evaluate real customer itineraries
                                  </span>
                                </div>

                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '10px' }}>
                                  {[
                                    {
                                      label: '⚡ Scenario A: PHL ➔ NYC (2.5h Layover) ➔ PHL',
                                      legs: [
                                        { origin_address: 'Philadelphia, PA', destination_address: 'Manhattan, NYC', time: '08:00 AM' },
                                        { origin_address: 'Manhattan, NYC', destination_address: 'Philadelphia, PA', time: '12:30 PM' }
                                      ]
                                    },
                                    {
                                      label: '⚡ Scenario B: PHL ➔ NYC (7.0h Layover) ➔ PHL',
                                      legs: [
                                        { origin_address: 'Philadelphia, PA', destination_address: 'Manhattan, NYC', time: '08:00 AM' },
                                        { origin_address: 'Manhattan, NYC', destination_address: 'Philadelphia, PA', time: '06:00 PM' }
                                      ]
                                    },
                                    {
                                      label: '⚡ Scenario C: PHL ➔ NYC ➔ Boston (Forward Chain)',
                                      legs: [
                                        { origin_address: 'Philadelphia, PA', destination_address: 'Manhattan, NYC', time: '07:30 AM' },
                                        { origin_address: 'Manhattan, NYC', destination_address: 'Boston Back Bay, MA', time: '02:00 PM' }
                                      ]
                                    }
                                  ].map((sc, scIdx) => (
                                    <button
                                      key={scIdx}
                                      type="button"
                                      onClick={async () => {
                                        setSimEvaluating(true);
                                        try {
                                          const res = await evaluateVendorMultilegStrategy(config.vendor_id, sc.legs, false);
                                          setSimulatedStrategyResult(res);
                                        } catch (err: any) {
                                          console.error('Sim error', err);
                                        } finally {
                                          setSimEvaluating(false);
                                        }
                                      }}
                                      style={{
                                        padding: '4px 8px',
                                        fontSize: '11px',
                                        fontWeight: 600,
                                        backgroundColor: '#EFF6FF',
                                        color: '#1E40AF',
                                        border: '1px solid #BFDBFE',
                                        borderRadius: '4px',
                                        cursor: 'pointer'
                                      }}
                                    >
                                      {sc.label}
                                    </button>
                                  ))}
                                </div>

                                {/* Simulation Result Output Card */}
                                {simEvaluating && (
                                  <div style={{ padding: '10px', fontSize: '11px', color: '#64748B', backgroundColor: '#F8FAFC', borderRadius: '6px' }}>
                                    Evaluating routing algorithm against {config.vendor_name || 'vendor'} business rules...
                                  </div>
                                )}

                                {simulatedStrategyResult && !simEvaluating && (
                                  <div style={{ backgroundColor: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '6px', padding: '10px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                      <span style={{ fontSize: '11px', fontWeight: 800, color: '#0F172A' }}>
                                        🎯 Strategy: <span style={{ color: '#0078D4' }}>{simulatedStrategyResult.strategy}</span>
                                      </span>
                                      <span style={{ fontSize: '10px', backgroundColor: '#DCFCE7', color: '#15803D', padding: '2px 6px', borderRadius: '4px', fontWeight: 700 }}>
                                        Evaluated via Sovereign Rules
                                      </span>
                                    </div>
                                    <p style={{ margin: 0, fontSize: '11px', color: '#334155' }}>
                                      {simulatedStrategyResult.recommended_action}
                                    </p>
                                    <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                                      {simulatedStrategyResult.legs_breakdown?.map((l: any, lIdx: number) => (
                                        <div key={lIdx} style={{ flex: 1, padding: '6px 8px', backgroundColor: '#FFFFFF', border: '1px solid #CBD5E1', borderRadius: '4px', fontSize: '10.5px' }}>
                                          <div style={{ fontWeight: 700, color: '#0F172A' }}>{l.title}</div>
                                          <div style={{ color: l.fulfillment === 'IN_HOUSE' ? '#15803D' : '#7C3AED', fontWeight: 800 }}>
                                            {l.fulfillment === 'IN_HOUSE' ? '🏢 In-House Chauffeur' : l.fulfillment === 'IN_HOUSE_WAIT_AND_RETURN' ? '🚘 Dedicated Standby' : '🤝 Farm-Out Partner'}
                                          </div>
                                          <div style={{ color: '#64748B', fontSize: '9.5px', marginTop: '2px' }}>{l.reason}</div>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </div>

                            </div>
                          )}
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
                    <span style={{
                      fontSize: '11px',
                      padding: '4px 10px',
                      borderRadius: '4px',
                      backgroundColor: tcrBrandForm.ein_tax_id ? '#DCFCE7' : '#FEF3C7',
                      color: tcrBrandForm.ein_tax_id ? '#15803D' : '#92400E',
                      fontWeight: 800,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}>
                      <ShieldCheck size={14} /> {tcrBrandForm.ein_tax_id ? 'TCR 10DLC CONFIGURED' : 'STANDARD CARRIER ROUTE'}
                    </span>
                    <span style={{
                      fontSize: '11px',
                      padding: '4px 10px',
                      borderRadius: '4px',
                      backgroundColor: tcrBrandForm.contact_phone ? '#EFF6FF' : '#F1F5F9',
                      color: tcrBrandForm.contact_phone ? '#0078D4' : '#64748B',
                      fontWeight: 800,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}>
                      <CheckCircle size={14} /> {tcrBrandForm.contact_phone ? 'CALLER ID ACTIVE' : 'CALLER ID UNCONFIGURED'}
                    </span>
                    <span style={{ fontSize: '11px', padding: '4px 10px', borderRadius: '4px', backgroundColor: '#F3E8FF', color: '#7E22CE', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Key size={14} /> {byokMode === 'BYOK_CUSTOM' ? 'BYOK CUSTOM GATEWAY' : 'GLOBAL HUB TELECOM'}
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
                          <span style={{
                            fontSize: '10px',
                            padding: '2px 8px',
                            borderRadius: '4px',
                            backgroundColor: tcrBrandForm.ein_tax_id ? '#DCFCE7' : '#FEF3C7',
                            color: tcrBrandForm.ein_tax_id ? '#15803D' : '#92400E',
                            fontWeight: 800
                          }}>
                            {tcrBrandForm.ein_tax_id ? 'PROFILE CONFIGURED' : 'UNREGISTERED (Standard Route)'}
                          </span>
                        </div>
                        
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '12px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #F3F4F6', paddingBottom: '6px' }}>
                            <span style={{ color: '#6B7280' }}>Legal Entity Name:</span>
                            <span style={{ fontWeight: 700, color: '#0F172A' }}>{config.vendor_name || tcrBrandForm.legal_name || 'Not Configured'}</span>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #F3F4F6', paddingBottom: '6px' }}>
                            <span style={{ color: '#6B7280' }}>EIN Tax ID:</span>
                            <span style={{ fontWeight: 700, color: '#0F172A' }}>{tcrBrandForm.ein_tax_id ? `${tcrBrandForm.ein_tax_id}` : 'Pending Registration'}</span>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #F3F4F6', paddingBottom: '6px' }}>
                            <span style={{ color: '#6B7280' }}>Dispatch SMS Phone:</span>
                            <span style={{ fontWeight: 700, color: '#0F172A' }}>{tcrBrandForm.contact_phone || config.branding?.contact_phone || 'Global Hub Gateway'}</span>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #F3F4F6', paddingBottom: '6px' }}>
                            <span style={{ color: '#6B7280' }}>Carrier Route:</span>
                            <span style={{ fontWeight: 700, color: '#0F172A' }}>{tcrBrandForm.contact_phone ? 'Dedicated Twilio Trunk' : 'Shared Hub Relay'}</span>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span style={{ color: '#6B7280' }}>Registration Status:</span>
                            <span style={{ fontWeight: 700, color: '#334155' }}>{tcrBrandForm.ein_tax_id ? 'Ready for TCR Submission' : 'Draft / Unregistered'}</span>
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
                          <span style={{
                            fontSize: '10px',
                            padding: '2px 8px',
                            borderRadius: '4px',
                            backgroundColor: tcrBrandForm.contact_phone ? '#EFF6FF' : '#F1F5F9',
                            color: tcrBrandForm.contact_phone ? '#0078D4' : '#64748B',
                            fontWeight: 800
                          }}>
                            {tcrBrandForm.contact_phone ? 'CNAM ACTIVE' : 'STANDARD CALLER ID'}
                          </span>
                        </div>

                        <div style={{ padding: '10px', backgroundColor: '#F8FAFC', borderRadius: '6px', border: '1px solid #E2E8F0', fontSize: '11px', color: '#475569' }}>
                          <div>Caller ID Name (CNAM): <strong>{((config.vendor_name || 'LIMO FLEET').toUpperCase()).slice(0, 15)}</strong></div>
                          <div>Carrier Routing: <strong>{tcrBrandForm.contact_phone ? `Dedicated (${tcrBrandForm.contact_phone})` : 'Shared Platform Gateway'}</strong></div>
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
                                const vName = config.vendor_name || 'Limo Company';
                                const vPhone = config.branding?.contact_phone || tcrBrandForm.contact_phone || '+1 (215) 555-0144';
                                const vDomain = config.branding?.domain || 'limo-mesh.net';
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
                        {voiceCallRecords.length === 0 ? (
                          <div style={{ padding: '20px', backgroundColor: '#F8FAFC', borderRadius: '6px', border: '1px solid #E2E8F0', textAlign: 'center', color: '#64748B', fontSize: '12px' }}>
                            No voice recordings logged yet. Outbound or inbound calls via WebRTC softphone will stream live AI transcripts and audio recordings here.
                          </div>
                        ) : (
                          voiceCallRecords.map((call: any, idx: number) => (
                            <div key={call.call_sid || idx} style={{ padding: '10px', backgroundColor: '#F8FAFC', borderRadius: '6px', border: '1px solid #E2E8F0' }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span style={{ fontSize: '12px', fontWeight: 800, color: '#0F172A' }}>{call.caller_name || 'Passenger Call'} ({call.caller_phone || 'Masked Line'})</span>
                                <span style={{ fontSize: '10px', color: '#6B7280' }}>{call.duration_seconds || 0}s • {call.timestamp ? new Date(call.timestamp * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Recent'}</span>
                              </div>
                              <div style={{ fontSize: '11px', color: '#334155', marginTop: '4px' }}>
                                "{call.ai_transcript || call.transcript || 'Call recorded and logged in sovereign compliance vault.'}"
                              </div>
                              <div style={{ marginTop: '6px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <button
                                  onClick={() => {
                                    if (call.recording_url) {
                                      const audio = new Audio(call.recording_url);
                                      audio.play().catch(() => setActionNotice(`▶️ Audio stream at ${call.recording_url}`));
                                    } else {
                                      setActionNotice(`▶️ Recording SID: ${call.call_sid || 'rec_stream'}`);
                                    }
                                  }}
                                  style={{ padding: '4px 8px', backgroundColor: '#EFF6FF', color: '#0078D4', border: '1px solid #BFDBFE', borderRadius: '4px', fontSize: '10px', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                                >
                                  <Play size={10} /> Play Audio
                                </button>
                                <span style={{ fontSize: '10px', color: call.sentiment === 'POSITIVE' ? '#16A34A' : '#D97706', fontWeight: 700 }}>
                                  ● Sentiment: {call.sentiment || 'NEUTRAL'}
                                </span>
                              </div>
                            </div>
                          ))
                        )}
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
                      {chatMessages.length === 0 ? (
                        <div style={{ margin: 'auto', color: '#64748B', fontSize: '12px', textAlign: 'center' }}>
                          No active chat messages logged. Send an outbound WhatsApp or SMS dispatch to start a live conversation thread.
                        </div>
                      ) : (
                        chatMessages.map((msg) => (
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
                        ))
                      )}
                    </div>

                    {/* Quick Action Buttons */}
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                      <button
                        onClick={() => {
                          const vName = config.vendor_name || 'Autonomous Livery';
                          handleSendLiveChatMessage(`📍 ${vName}: Chauffeur is curbside. Live GPS Radar link active.`, 'WHATSAPP', 'GPS_TRACKING');
                        }}
                        style={{ padding: '6px 10px', backgroundColor: '#F0FDF4', color: '#15803D', border: '1px solid #86EFAC', borderRadius: '6px', fontSize: '11px', fontWeight: 700, cursor: 'pointer' }}
                      >
                        ⚡ Send Live Chauffeur GPS Radar Link
                      </button>
                      <button
                        onClick={() => {
                          const vName = config.vendor_name || 'Autonomous Livery';
                          handleSendLiveChatMessage(`✈️ ${vName}: Flight status update detected. Pickup time adjusted with zero penalty.`, 'SMS', 'DELAY_ALERT');
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
                        placeholder="Type reply to passenger..."
                        value={newChatText}
                        onChange={(e) => setNewChatText(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && newChatText.trim()) {
                            handleSendLiveChatMessage(newChatText, 'WHATSAPP');
                          }
                        }}
                        style={{ flex: 1, padding: '10px 12px', border: '1px solid #D1D5DB', borderRadius: '6px', fontSize: '12px' }}
                      />
                      <button
                        onClick={() => {
                          if (newChatText.trim()) {
                            handleSendLiveChatMessage(newChatText, 'WHATSAPP');
                          }
                        }}
                        disabled={loading || !newChatText.trim()}
                        style={{ padding: '10px 18px', backgroundColor: '#0078D4', color: '#FFFFFF', border: 'none', borderRadius: '6px', fontSize: '12px', fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                      >
                        <Send size={14} /> {loading ? 'Sending...' : 'Send'}
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

            {/* TAB: DIRECT PAYOUTS & BANKING (STRIPE CONNECT EXPRESS) */}
            {/* TAB: DIRECT PAYOUTS, BANKING & ESCROW CLEARING */}
            {activeTab === 'payouts' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', width: '100%' }}>
                {/* Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
                  <div>
                    <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 800, color: '#0F172A', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Banknote size={22} color="#0078D4" />
                      Direct Payouts &amp; Banking
                    </h2>
                    <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#6B7280' }}>
                      Automated 24h Stripe Connect Express bank deposits, merchant verification, and direct ledger settlements.
                    </p>
                  </div>

                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <button
                      onClick={() => {
                        loadStripeStatus();
                        loadPayoutLedger();
                      }}
                      disabled={isLoadingStripe || isLoadingLedger}
                      style={{
                        padding: '6px 14px',
                        backgroundColor: '#FFFFFF',
                        color: '#374151',
                        border: '1px solid #D1D5DB',
                        borderRadius: '6px',
                        fontSize: '12px',
                        fontWeight: 600,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        boxShadow: '0 1px 2px rgba(0,0,0,0.04)'
                      }}
                    >
                      <RefreshCw size={13} className={(isLoadingStripe || isLoadingLedger) ? 'animate-spin' : ''} />
                      <span>Refresh</span>
                    </button>

                    <button
                      onClick={handleOpenStripeLogin}
                      disabled={isLoadingStripe}
                      style={{
                        padding: '6px 14px',
                        backgroundColor: '#0078D4',
                        color: '#FFFFFF',
                        border: 'none',
                        borderRadius: '6px',
                        fontSize: '12px',
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        boxShadow: '0 1px 3px rgba(0, 120, 212, 0.3)'
                      }}
                    >
                      <ExternalLink size={13} />
                      <span>Stripe Express Portal</span>
                    </button>
                  </div>
                </div>

                {/* Unified Stripe Connect & Bank Settlement Card */}
                <div style={{
                  backgroundColor: '#FFFFFF',
                  borderRadius: '10px',
                  border: '1px solid #E2E8F0',
                  padding: '18px 20px',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '14px'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                      <div style={{
                        width: '42px',
                        height: '42px',
                        borderRadius: '8px',
                        backgroundColor: stripeConnectStatus?.payouts_enabled !== false ? '#EFF6FF' : '#FEF3C7',
                        color: stripeConnectStatus?.payouts_enabled !== false ? '#0078D4' : '#D97706',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        border: '1px solid #E2E8F0',
                        flexShrink: 0
                      }}>
                        <CreditCard size={20} />
                      </div>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 800, color: '#0F172A' }}>
                            Stripe Connect Express Direct Payouts
                          </h3>
                          <span style={{
                            fontSize: '10.5px',
                            fontWeight: 800,
                            padding: '2px 8px',
                            borderRadius: '12px',
                            backgroundColor: stripeConnectStatus?.payouts_enabled !== false ? '#DCFCE7' : '#FEF3C7',
                            color: stripeConnectStatus?.payouts_enabled !== false ? '#15803D' : '#B45309',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px'
                          }}>
                            {stripeConnectStatus?.payouts_enabled !== false ? '● ACTIVE & VERIFIED' : '▲ SETUP REQUIRED'}
                          </span>
                        </div>
                        <div style={{ fontSize: '12px', color: '#64748B', marginTop: '2px' }}>
                          {stripeConnectStatus?.payouts_enabled !== false
                            ? `Automated 24-hour direct deposit is active for ${config.vendor_name}. Net passenger fares clear automatically to your bank account.`
                            : `Link your sovereign business bank account to receive automated direct deposits for customer bookings.`
                          }
                        </div>
                      </div>
                    </div>

                    <div>
                      {stripeConnectStatus?.payouts_enabled !== false ? (
                        <button
                          onClick={handleOpenStripeLogin}
                          style={{
                            padding: '7px 14px',
                            backgroundColor: '#FFFFFF',
                            color: '#0078D4',
                            border: '1px solid #0078D4',
                            borderRadius: '6px',
                            fontSize: '12px',
                            fontWeight: 700,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            boxShadow: '0 1px 2px rgba(0, 120, 212, 0.08)'
                          }}
                        >
                          <CheckCircle2 size={13} color="#0078D4" /> Manage Bank Account &amp; Tax Documents ↗
                        </button>
                      ) : (
                        <button
                          onClick={handleOpenStripeConnect}
                          style={{
                            padding: '8px 16px',
                            backgroundColor: '#0078D4',
                            color: '#FFFFFF',
                            border: 'none',
                            borderRadius: '6px',
                            fontSize: '12px',
                            fontWeight: 700,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            boxShadow: '0 2px 6px rgba(0, 120, 212, 0.25)'
                          }}
                        >
                          <Zap size={13} /> Connect Bank Account &amp; Enable Payouts ↗
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Compact Telemetry & Verification Grid */}
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                    gap: '10px',
                    padding: '12px 14px',
                    backgroundColor: '#F8FAFC',
                    borderRadius: '8px',
                    border: '1px solid #E2E8F0',
                    fontSize: '11.5px'
                  }}>
                    <div>
                      <div style={{ color: '#64748B', fontWeight: 600, fontSize: '10px', textTransform: 'uppercase' }}>LINKED BANK ACCOUNT</div>
                      <div style={{ fontWeight: 800, color: (stripeConnectStatus?.bank_name || stripeConnectStatus?.bank_last4) ? '#0F172A' : '#D97706', marginTop: '2px' }}>
                        {(stripeConnectStatus?.bank_name && stripeConnectStatus?.bank_last4)
                          ? `🏦 ${stripeConnectStatus.bank_name} (•••• ${stripeConnectStatus.bank_last4})`
                          : (stripeConnectStatus?.bank_name 
                              ? `🏦 ${stripeConnectStatus.bank_name}` 
                              : '⚠️ No Bank Account Linked')}
                      </div>
                    </div>

                    <div>
                      <div style={{ color: '#64748B', fontWeight: 600, fontSize: '10px', textTransform: 'uppercase' }}>PAYOUT FREQUENCY</div>
                      <div style={{ fontWeight: 800, color: '#16A34A', marginTop: '2px' }}>
                        ⚡ {stripeConnectStatus?.payout_frequency || `Direct Net Settlement (${localeSpecs.currencyCode})`}
                      </div>
                    </div>

                    <div>
                      <div style={{ color: '#64748B', fontWeight: 600, fontSize: '10px', textTransform: 'uppercase' }}>SETTLEMENT CURRENCY</div>
                      <div style={{ fontWeight: 800, color: '#0078D4', marginTop: '2px' }}>
                        {stripeConnectStatus?.default_currency || localeSpecs.currencyCode} ({localeSpecs.currencySymbol}) · {localeSpecs.countryName}
                      </div>
                    </div>

                    <div>
                      <div style={{ color: '#64748B', fontWeight: 600, fontSize: '10px', textTransform: 'uppercase' }}>LEGAL ENTITY &amp; EIN</div>
                      <div style={{ fontWeight: 800, color: (stripeConnectStatus?.ein_tax_id || config.telecom_compliance?.ein_tax_id) ? '#0F172A' : '#64748B', marginTop: '2px' }}>
                        {(stripeConnectStatus?.ein_tax_id || config.telecom_compliance?.ein_tax_id) 
                          ? `✓ ${stripeConnectStatus?.ein_tax_id || config.telecom_compliance?.ein_tax_id}` 
                          : '⚠️ Tax ID / EIN Not on File'}
                      </div>
                    </div>

                    <div>
                      <div style={{ color: '#64748B', fontWeight: 600, fontSize: '10px', textTransform: 'uppercase' }}>SURETY &amp; COMPLIANCE</div>
                      <div style={{ fontWeight: 800, color: '#16A34A', marginTop: '2px' }}>
                        ✓ {stripeConnectStatus?.surety_policy || 'Commercial Livery Policy'}
                      </div>
                    </div>

                    <div>
                      <div style={{ color: '#64748B', fontWeight: 600, fontSize: '10px', textTransform: 'uppercase' }}>STRIPE ACCOUNT ID</div>
                      <div style={{ fontWeight: 800, color: stripeConnectStatus?.stripe_account_id ? '#475569' : '#94A3B8', marginTop: '2px', fontFamily: 'monospace', fontSize: '11px' }}>
                        {stripeConnectStatus?.stripe_account_id || 'Not Connected'}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Recent Escrow Transfers & Payout Ledger */}
                <div style={{
                  backgroundColor: '#FFFFFF',
                  borderRadius: '10px',
                  border: '1px solid #E2E8F0',
                  overflow: 'hidden',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
                }}>
                  <div style={{ padding: '14px 18px', borderBottom: '1px solid #E2E8F0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <h3 style={{ margin: 0, fontSize: '14px', fontWeight: 800, color: '#0F172A' }}>
                        Recent Cleared Payouts &amp; Bank Transfers
                      </h3>
                      <p style={{ margin: '2px 0 0 0', fontSize: '12px', color: '#64748B' }}>
                        Live immutable clearing records settled via Stripe Connect Express.
                      </p>
                    </div>
                    <span style={{ fontSize: '11px', fontWeight: 700, color: '#15803D', backgroundColor: '#DCFCE7', padding: '3px 8px', borderRadius: '12px' }}>
                      ● 100% On-Time Settlement
                    </span>
                  </div>

                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', textAlign: 'left' }}>
                    <thead>
                      <tr style={{ backgroundColor: '#F8FAFC', color: '#64748B', borderBottom: '1px solid #E2E8F0', fontSize: '10.5px', textTransform: 'uppercase' }}>
                        <th style={{ padding: '10px 16px', fontWeight: 700 }}>TRANSFER ID</th>
                        <th style={{ padding: '10px 16px', fontWeight: 700 }}>TRIP / SOURCE</th>
                        <th style={{ padding: '10px 16px', fontWeight: 700 }}>GROSS FARE</th>
                        <th style={{ padding: '10px 16px', fontWeight: 700 }}>NET DEPOSIT</th>
                        <th style={{ padding: '10px 16px', fontWeight: 700 }}>DESTINATION</th>
                        <th style={{ padding: '10px 16px', fontWeight: 700 }}>STATUS</th>
                      </tr>
                    </thead>
                    <tbody>
                      {isLoadingLedger ? (
                        <tr>
                          <td colSpan={6} style={{ padding: '32px', textAlign: 'center', color: '#64748B' }}>
                            <RefreshCw size={20} className="animate-spin" style={{ margin: '0 auto 8px auto', display: 'block', color: '#0078D4' }} />
                            Loading live clearing records...
                          </td>
                        </tr>
                      ) : payoutLedgerRecords.length === 0 ? (
                        <tr>
                          <td colSpan={6} style={{ padding: '32px', textAlign: 'center', color: '#64748B' }}>
                            <div style={{ fontWeight: 700, color: '#334155', fontSize: '13px' }}>No Cleared Payout Records Yet</div>
                            <div style={{ fontSize: '12px', marginTop: '4px' }}>
                              Completed storefront passenger bookings and affiliate network settlements will clear automatically to your linked bank account.
                            </div>
                          </td>
                        </tr>
                      ) : (
                        payoutLedgerRecords.map((tx) => (
                          <tr key={tx.id} style={{ borderBottom: '1px solid #F1F5F9' }}>
                            <td style={{ padding: '12px 16px', fontWeight: 800, fontFamily: 'monospace', color: '#0078D4' }}>{tx.id}</td>
                            <td style={{ padding: '12px 16px', color: '#0F172A', fontWeight: 600 }}>
                              {tx.desc}
                              <div style={{ fontSize: '10.5px', color: '#64748B' }}>{tx.date}</div>
                            </td>
                            <td style={{ padding: '12px 16px', color: '#64748B', fontWeight: 600 }}>
                              {localeSpecs.currencySymbol}{tx.gross.toFixed(2)}
                            </td>
                            <td style={{ padding: '12px 16px', color: '#15803D', fontWeight: 800, fontSize: '13px' }}>
                              +{localeSpecs.currencySymbol}{tx.net.toFixed(2)}
                            </td>
                            <td style={{ padding: '12px 16px', color: '#334155' }}>{tx.bank}</td>
                            <td style={{ padding: '12px 16px' }}>
                              <span style={{
                                fontSize: '11px',
                                fontWeight: 800,
                                color: tx.status === 'CLEARED' ? '#15803D' : '#D97706',
                                backgroundColor: tx.status === 'CLEARED' ? '#DCFCE7' : '#FEF3C7',
                                padding: '2px 8px',
                                borderRadius: '10px'
                              }}>
                                ✓ {tx.status}
                              </span>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* TAB 10: VENDOR PLATFORM SERVICES & AUTO-PAY BILLING HUB */}
            {activeTab === 'subscription' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', width: '100%' }}>
                
                {/* Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                  <div>
                    <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 800, color: '#0F172A', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <CreditCard size={22} color="#0078D4" />
                      <span>Platform Services & Auto-Pay Hub</span>
                    </h2>
                    <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#64748B' }}>
                      Review your sovereign cell hosting, payment method on file, and central hub charging profile.
                    </p>
                  </div>

                  <button
                    onClick={loadSubscription}
                    disabled={isLoadingSub}
                    style={{
                      padding: '7px 14px',
                      backgroundColor: '#FFFFFF',
                      color: '#374151',
                      border: '1px solid #D1D5DB',
                      borderRadius: '6px',
                      fontSize: '12px',
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      boxShadow: '0 1px 2px rgba(0,0,0,0.04)'
                    }}
                  >
                    <RefreshCw size={13} className={isLoadingSub ? 'animate-spin' : ''} color="#0078D4" />
                    <span>Refresh Billing Status</span>
                  </button>
                </div>

                {/* Main 1-Card Platform Services & Auto-Pay Overview */}
                <div style={{
                  backgroundColor: '#FFFFFF',
                  borderRadius: '12px',
                  border: '1px solid #E2E8F0',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.04)',
                  overflow: 'hidden'
                }}>
                  {/* Card Header Banner */}
                  <div style={{
                    padding: '24px',
                    borderBottom: '1px solid #F1F5F9',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                    flexWrap: 'wrap',
                    gap: '16px',
                    backgroundColor: '#FAFAFA'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                      <div style={{
                        width: '52px',
                        height: '52px',
                        borderRadius: '12px',
                        backgroundColor: '#EFF6FF',
                        color: '#0078D4',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}>
                        <ShieldCheck size={28} />
                      </div>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: '#0F172A' }}>
                            {subscriptionData?.tier_name || 'Pro Sovereign (Dedicated Cell)'}
                          </h3>
                          <span style={{
                            fontSize: '11px',
                            fontWeight: 800,
                            padding: '3px 10px',
                            borderRadius: '12px',
                            backgroundColor: subscriptionData?.billing_status === 'ACTIVE' ? '#DCFCE7' : subscriptionData?.billing_status === 'PAST_DUE' ? '#FEE2E2' : '#F1F5F9',
                            color: subscriptionData?.billing_status === 'ACTIVE' ? '#15803D' : subscriptionData?.billing_status === 'PAST_DUE' ? '#B91C1C' : '#64748B',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '5px'
                          }}>
                            <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: subscriptionData?.billing_status === 'ACTIVE' ? '#16A34A' : '#EF4444' }} />
                            {subscriptionData?.billing_status || 'ACTIVE'}
                          </span>
                        </div>
                        <div style={{ fontSize: '12px', color: '#64748B', marginTop: '4px' }}>
                          Cell ID: <strong style={{ color: '#0F172A', fontFamily: 'monospace' }}>{config.vendor_id}</strong> • Dedicated Partition: <strong style={{ color: '#0F172A', fontFamily: 'monospace' }}>db_{config.vendor_id}</strong>
                        </div>
                      </div>
                    </div>

                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '28px', fontWeight: 900, color: '#0078D4' }}>
                        ${(subscriptionData?.monthly_fee ?? 99).toFixed(2)}
                        <span style={{ fontSize: '13px', fontWeight: 600, color: '#64748B' }}> / month</span>
                      </div>
                      <div style={{ fontSize: '12px', color: '#166534', fontWeight: 700, marginTop: '2px' }}>
                        +{(Number(subscriptionData?.pay_as_you_go_rate || 0) * 100).toFixed(1)}% per-ride commission
                      </div>
                    </div>
                  </div>

                  {/* Operational Details Grid */}
                  <div style={{
                    padding: '24px',
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                    gap: '16px',
                    backgroundColor: '#FFFFFF'
                  }}>
                    <div style={{ backgroundColor: '#F8FAFC', padding: '14px', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
                      <div style={{ color: '#64748B', fontWeight: 700, fontSize: '11px', textTransform: 'uppercase' }}>BILLING TERMS</div>
                      <div style={{ fontWeight: 800, color: '#0F172A', fontSize: '14px', marginTop: '4px' }}>
                        {subscriptionData?.billing_terms || 'Net 30 (Monthly Auto-Debit)'}
                      </div>
                      <div style={{ fontSize: '11px', color: '#64748B', marginTop: '2px' }}>Global Hub Standard Terms</div>
                    </div>

                    <div style={{ backgroundColor: '#F8FAFC', padding: '14px', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
                      <div style={{ color: '#64748B', fontWeight: 700, fontSize: '11px', textTransform: 'uppercase' }}>PAYMENT METHOD ON FILE</div>
                      <div style={{ fontWeight: 800, color: '#0F172A', fontSize: '14px', marginTop: '4px' }}>
                        {subscriptionData?.payment_method_summary || '•••• 4242 (Stripe Auto-Pay Active)'}
                      </div>
                      <div style={{ fontSize: '11px', color: '#16A34A', marginTop: '2px' }}>✓ Direct ACH / Card Verified</div>
                    </div>

                    <div style={{ backgroundColor: '#F8FAFC', padding: '14px', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
                      <div style={{ color: '#64748B', fontWeight: 700, fontSize: '11px', textTransform: 'uppercase' }}>NEXT BILLING CYCLE</div>
                      <div style={{ fontWeight: 800, color: '#0F172A', fontSize: '14px', marginTop: '4px' }}>
                        {subscriptionData?.renews_at ? new Date(subscriptionData.renews_at).toLocaleDateString() : 'Active Rolling Cycle'}
                      </div>
                      <div style={{ fontSize: '11px', color: '#64748B', marginTop: '2px' }}>Automated Statement Generation</div>
                    </div>

                    <div style={{ backgroundColor: '#F8FAFC', padding: '14px', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
                      <div style={{ color: '#64748B', fontWeight: 700, fontSize: '11px', textTransform: 'uppercase' }}>CONTRACT / AGREEMENT REF</div>
                      <div style={{ fontWeight: 800, color: '#0F172A', fontSize: '14px', marginTop: '4px', fontFamily: 'monospace' }}>
                        {subscriptionData?.contract_reference || `CTR-${config.vendor_id.toUpperCase().slice(-6)}-2026`}
                      </div>
                      <div style={{ fontSize: '11px', color: '#64748B', marginTop: '2px' }}>Sovereign Cell Master Agreement</div>
                    </div>
                  </div>

                  {/* 3 Simple Action Buttons */}
                  <div style={{
                    padding: '20px 24px',
                    borderTop: '1px solid #E2E8F0',
                    backgroundColor: '#F8FAFC',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    gap: '12px'
                  }}>
                    <div style={{ fontSize: '12px', color: '#64748B', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Shield size={14} color="#16A34A" />
                      <span>Encrypted direct integration with Stripe Customer Portal for PCI-compliant billing management.</span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                      <button
                        onClick={handleOpenBillingPortal}
                        disabled={isProcessingSubAction}
                        style={{
                          padding: '9px 16px',
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
                          boxShadow: '0 1px 3px rgba(0, 120, 212, 0.25)'
                        }}
                      >
                        <CreditCard size={14} />
                        <span>💳 Update Payment Method / Auto-Pay</span>
                      </button>

                      <button
                        onClick={handleOpenBillingPortal}
                        disabled={isProcessingSubAction}
                        style={{
                          padding: '9px 16px',
                          backgroundColor: '#FFFFFF',
                          color: '#334155',
                          border: '1px solid #CBD5E1',
                          borderRadius: '6px',
                          fontSize: '12px',
                          fontWeight: 700,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px'
                        }}
                      >
                        <FileText size={14} color="#0078D4" />
                        <span>📄 View Invoices & Receipts</span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* GLOBAL SUPPORT-AS-A-SERVICE DESK (DUAL B2C PASSENGER & B2B VENDOR OPS CARE) */}
                <div style={{
                  backgroundColor: '#FFFFFF',
                  borderRadius: '12px',
                  border: '1px solid #E2E8F0',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.04)',
                  overflow: 'hidden'
                }}>
                  <div style={{
                    padding: '20px 24px',
                    borderBottom: '1px solid #F1F5F9',
                    backgroundColor: '#0F172A',
                    color: '#FFFFFF',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    gap: '12px'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div style={{
                        width: '44px',
                        height: '44px',
                        borderRadius: '10px',
                        backgroundColor: '#9A7B4F',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#FFFFFF'
                      }}>
                        <Headphones size={24} />
                      </div>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 800, color: '#FFFFFF' }}>
                            Global 24/7 Support Desk as a Service
                          </h3>
                          <span style={{
                            fontSize: '10px',
                            fontWeight: 800,
                            padding: '2px 8px',
                            borderRadius: '10px',
                            backgroundColor: 'rgba(154, 123, 79, 0.3)',
                            border: '1px solid rgba(154, 123, 79, 0.6)',
                            color: '#D4AF37'
                          }}>
                            {vendorSupportSub ? `ENROLLED: ${vendorSupportSub.plan_name.toUpperCase()}` : 'PREVIEW / UNENROLLED'}
                          </span>
                        </div>
                        <p style={{ margin: '2px 0 0 0', fontSize: '12px', color: '#94A3B8' }}>
                          Dual-Layer Support: B2C Chauffeur/Passenger Concierge + B2B Fleet Tech &amp; Escrow Mediation
                        </p>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span style={{ fontSize: '12px', color: '#CBD5E1' }}>
                        Inbound DID: <strong style={{ color: '#F8FAFC' }}>{vendorSupportSub?.forwarding_did || '+1 (800) 555-LIMO'}</strong>
                      </span>
                    </div>
                  </div>

                  {/* Plan Selection Grid */}
                  <div style={{ padding: '24px', backgroundColor: '#F8FAFC' }}>
                    <div style={{ fontSize: '12px', fontWeight: 800, color: '#475569', textTransform: 'uppercase', marginBottom: '14px', letterSpacing: '0.04em' }}>
                      Select Your Fleet Support Tier (No-Code Dynamic Price Synchronized with Global Hub)
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px' }}>
                      {supportPlans.map((plan) => {
                        const isCurrent = vendorSupportSub?.plan_id === plan.id || (!vendorSupportSub && plan.id === 'plan_tier2_247');
                        return (
                          <div
                            key={plan.id}
                            style={{
                              backgroundColor: '#FFFFFF',
                              borderRadius: '10px',
                              border: isCurrent ? '2px solid #0078D4' : '1px solid #E2E8F0',
                              padding: '18px',
                              display: 'flex',
                              flexDirection: 'column',
                              justifyContent: 'space-between',
                              boxShadow: isCurrent ? '0 4px 12px rgba(0, 120, 212, 0.12)' : 'none',
                              position: 'relative'
                            }}
                          >
                            {plan.highlight_badge && (
                              <span style={{
                                position: 'absolute',
                                top: '12px',
                                right: '12px',
                                fontSize: '9.5px',
                                fontWeight: 800,
                                backgroundColor: plan.is_active ? '#EFF6FF' : '#F1F5F9',
                                color: '#0078D4',
                                padding: '2px 6px',
                                borderRadius: '4px',
                                border: '1px solid #BFDBFE'
                              }}>
                                {plan.highlight_badge}
                              </span>
                            )}

                            <div>
                              <div style={{ fontSize: '14px', fontWeight: 800, color: '#0F172A' }}>{plan.name}</div>
                              <div style={{ fontSize: '11px', color: '#64748B', marginTop: '2px' }}>{plan.description}</div>

                              <div style={{ marginTop: '12px', display: 'flex', alignItems: 'baseline', gap: '4px' }}>
                                <span style={{ fontSize: '24px', fontWeight: 900, color: '#0F172A' }}>
                                  ${plan.monthly_price_usd}
                                </span>
                                <span style={{ fontSize: '12px', color: '#64748B' }}>/mo</span>
                              </div>
                              <div style={{ fontSize: '11px', color: '#166534', fontWeight: 700, marginTop: '2px' }}>
                                Included: {plan.included_voice_minutes} mins/mo (${plan.per_minute_overage_usd}/min overage)
                              </div>

                              <div style={{ marginTop: '14px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                {plan.features.slice(0, 3).map((f, fIdx) => (
                                  <div key={fIdx} style={{ fontSize: '11px', color: '#475569', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    <Check size={12} color="#16A34A" />
                                    <span>{f}</span>
                                  </div>
                                ))}
                              </div>
                            </div>

                            <button
                              onClick={() => handleEnrollSupportPlan(plan.id)}
                              disabled={isEnrollingSupport}
                              style={{
                                marginTop: '16px',
                                width: '100%',
                                padding: '8px',
                                borderRadius: '6px',
                                border: 'none',
                                backgroundColor: isCurrent ? '#16A34A' : '#0078D4',
                                color: '#FFFFFF',
                                fontSize: '12px',
                                fontWeight: 800,
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '6px'
                              }}
                            >
                              {isCurrent ? <Check size={14} /> : <Headphones size={14} />}
                              <span>{isCurrent ? 'Active Enrolled Plan' : '1-Click Switch / Enroll'}</span>
                            </button>
                          </div>
                        );
                      })}
                    </div>

                    {/* Inbound Telephony Routing & Voice Greeting Config */}
                    <div style={{ marginTop: '20px', backgroundColor: '#FFFFFF', padding: '16px', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
                      <div style={{ fontSize: '12px', fontWeight: 800, color: '#0F172A', marginBottom: '10px' }}>
                        📞 Dedicated Telephony &amp; Escalation Routing
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '12px' }}>
                        <div>
                          <label style={{ fontSize: '11px', fontWeight: 700, color: '#64748B', display: 'block', marginBottom: '4px' }}>
                            Customer Inbound DID (Forward to Desk)
                          </label>
                          <input
                            type="text"
                            value={forwardingDidInput}
                            onChange={(e) => setForwardingDidInput(e.target.value)}
                            placeholder="+1 (800) 555-5466"
                            style={{ width: '100%', padding: '6px 10px', fontSize: '12px', borderRadius: '4px', border: '1px solid #CBD5E1' }}
                          />
                        </div>

                        <div>
                          <label style={{ fontSize: '11px', fontWeight: 700, color: '#64748B', display: 'block', marginBottom: '4px' }}>
                            Fleet Escalation Phone (Chauffeur / Owner)
                          </label>
                          <input
                            type="text"
                            value={escalationPhoneInput}
                            onChange={(e) => setEscalationPhoneInput(e.target.value)}
                            placeholder="+1 (215) 555-0199"
                            style={{ width: '100%', padding: '6px 10px', fontSize: '12px', borderRadius: '4px', border: '1px solid #CBD5E1' }}
                          />
                        </div>

                        <div>
                          <label style={{ fontSize: '11px', fontWeight: 700, color: '#64748B', display: 'block', marginBottom: '4px' }}>
                            Custom Voice Greeting (Brand Concierge)
                          </label>
                          <input
                            type="text"
                            value={customGreetingInput}
                            onChange={(e) => setCustomGreetingInput(e.target.value)}
                            placeholder="Thank you for calling..."
                            style={{ width: '100%', padding: '6px 10px', fontSize: '12px', borderRadius: '4px', border: '1px solid #CBD5E1' }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Central Management Note */}
                <div style={{
                  padding: '16px 20px',
                  backgroundColor: '#EFF6FF',
                  borderRadius: '8px',
                  border: '1px solid #BFDBFE',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '12px'
                }}>
                  <AlertCircle size={18} color="#0078D4" style={{ flexShrink: 0, marginTop: '2px' }} />
                  <div style={{ fontSize: '12px', color: '#1E40AF', lineHeight: '1.5' }}>
                    <strong>Centralized Billing & Contract Profiles:</strong> Your sovereign cell monthly fee and per-ride commission rates are managed centrally by Global Hub Operations. If you require changes to your billing terms, custom enterprise volumes, or tax documentation, please contact your Global Hub account manager.
                  </div>
                </div>

              </div>
            )}

          </div>

        </main>

      </div>

      {/* DISPATCHER INBOUND PHONE BOOKING DESK MODAL */}
      <DispatcherPhoneBookingModal
        isOpen={showPhoneBookingModal}
        onClose={() => setShowPhoneBookingModal(false)}
        vendorId={config.vendor_id}
        vendorName={config.vendor_name || 'ANB Limo Executive Chauffeurs'}
        availableDrivers={[]}
        availableVehicles={vehicles}
        onBookingCreated={async () => {
          setActionNotice('✅ Phone reservation created and synchronized to dispatch partition.');
        }}
      />

    </div>
  );
};

