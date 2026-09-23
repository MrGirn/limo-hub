export type VehicleClass = 
  | 'LUXURY_SUV'
  | 'FIRST_CLASS'
  | 'BUSINESS_VAN'
  | 'ELECTRIC_VIP'
  | 'BUSINESS_SEDAN';

export type ServiceType = 
  | 'AIRPORT_TRANSFER'
  | 'TRAIN_STATION_TRANSFER'
  | 'POINT_TO_POINT'
  | 'HOURLY_AS_DIRECTED'
  | 'EVENT_DELEGATION';

export type BookingStatus = 
  | 'DRAFT'
  | 'QUOTED'
  | 'ACCEPTED'
  | 'RESERVING'
  | 'CONFIRMED'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'CANCELLED';

export type TripStatus = 
  | 'SCHEDULED'
  | 'OFFER_SENT'
  | 'DRIVER_ACCEPTED'
  | 'EN_ROUTE'
  | 'ARRIVED'
  | 'PASSENGER_ONBOARD'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'NO_SHOW'
  | 'CANCELLED'
  | 'RECOVERY_REQUIRED';

export interface TransitDetails {
  transit_type: 'FLIGHT' | 'TRAIN' | 'NONE';
  carrier_name?: string;
  identifier?: string;
  station_or_airport?: string;
  terminal_or_track?: string;
  scheduled_arrival?: string;
  estimated_arrival?: string;
  status_summary?: string;
}

export type DistanceUnit = 'MILES' | 'KILOMETERS';

export interface RouteMetrics {
  distance_unit?: DistanceUnit;
  outbound_positioning_miles: number;
  outbound_positioning_km?: number;
  passenger_trip_miles: number;
  passenger_trip_km?: number;
  return_deadhead_miles: number;
  return_deadhead_km?: number;
  total_operating_miles: number;
  total_operating_km?: number;
  vendor_depot_address: string;
}

export interface QuoteLineItem {
  description: string;
  quantity: number;
  unit_price_net: number;
  total_net: number;
  tax_rate: number;
  tax_amount: number;
  total_gross: number;
}

export interface Quote {
  id: string;
  tenant_id: string;
  vendor_id: string;
  service_type: ServiceType;
  vehicle_class: VehicleClass;
  pickup_address: string;
  dropoff_address?: string;
  transit_info?: TransitDetails;
  flight_number?: string;
  train_number?: string;
  
  route_metrics: RouteMetrics;
  distance_miles: number;
  distance_km?: number;
  distance_unit?: DistanceUnit;
  estimated_duration_min: number;
  hourly_hours?: number;
  wait_minutes: number;
  currency: string;
  
  base_net: number;
  passenger_distance_net: number;
  outbound_positioning_net: number;
  return_deadhead_net: number;
  estimated_tolls_net: number;
  airport_train_surcharge_net: number;
  wait_net: number;
  
  subtotal_net: number;
  tax_rate: number;
  tax_amount: number;
  gratuity_rate: number;
  gratuity_amount: number;
  total_gross: number;
  final_payable_amount: number;
  deposit_hold_amount: number;
  line_items: QuoteLineItem[];
  is_binding: boolean;
  expires_at: string;
  created_at: string;
}

export interface BookingParty {
  booker_name: string;
  booker_email: string;
  booker_phone: string;
  passenger_name: string;
  passenger_phone: string;
  passenger_count: number;
  luggage_count: number;
  special_instructions?: string;
}

export interface DriverOffer {
  id: string;
  booking_id: string;
  trip_id: string;
  driver_id: string;
  driver_name: string;
  driver_phone: string;
  vehicle_id: string;
  vehicle_details: string;
  offered_payout_net: number;
  payout_amount?: number;
  pickup_address?: string;
  dropoff_address?: string;
  deadhead_miles?: number;
  estimated_pickup_minutes?: number;
  status: 'PENDING' | 'ACCEPTED' | 'DECLINED' | 'EXPIRED';
  timeout_seconds: number;
  created_at: string;
  responded_at?: string;
}

export interface TripEvent {
  id: string;
  trip_id: string;
  event_type: string;
  description: string;
  actor: string;
  lat?: number;
  lng?: number;
  evidence_url?: string;
  timestamp: string;
}

export interface Trip {
  id: string;
  booking_id: string;
  tenant_id: string;
  vendor_id: string;
  driver_id?: string;
  vehicle_id?: string;
  status: TripStatus;
  pickup_time_utc: string;
  pickup_address: string;
  dropoff_address?: string;
  transit_info?: TransitDetails;
  flight_number?: string;
  train_number?: string;
  flight_delay_minutes: number;
  driver_current_lat?: number;
  driver_current_lng?: number;
  events: TripEvent[];
  active_offer?: DriverOffer;
}

export interface PaymentAttempt {
  id: string;
  booking_id: string;
  amount: number;
  currency: string;
  payment_method: string;
  status: string;
  card_last4?: string;
}

export interface Booking {
  id: string;
  tenant_id: string;
  vendor_id: string;
  quote_id: string;
  status: BookingStatus;
  service_type: ServiceType;
  vehicle_class: VehicleClass;
  pickup_time_utc: string;
  pickup_address: string;
  dropoff_address?: string;
  transit_info?: TransitDetails;
  flight_number?: string;
  train_number?: string;
  party: BookingParty;
  total_amount: number;
  currency: string;
  quote: Quote;
  trip?: Trip;
  payment?: PaymentAttempt;
  created_at: string;
}

export type NetworkParticipationMode = 'GLOBAL_NETWORK_CONNECTED' | 'LOCAL_PRIVATE_ONLY';

export interface Vehicle {
  id: string;
  tenant_id: string;
  vendor_id: string;
  make: string;
  model: string;
  year: number;
  license_plate: string;
  vehicle_class: VehicleClass;
  passenger_capacity: number;
  luggage_capacity: number;
  exterior_color: string;
  is_active: boolean;
  vin?: string;
  status?: string;
  is_network_shared?: boolean;
  image_url?: string;
  hourly_rate_usd?: number;
  per_km_usd?: number;
  inspection_due?: string;
  insurance_valid?: boolean;
  network_mode?: NetworkParticipationMode;
  current_lat?: number;
  current_lng?: number;
}

export interface Driver {
  id: string;
  tenant_id: string;
  vendor_id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  license_number: string;
  license_expiry: string;
  rating: number;
  trips_completed: number;
  is_on_duty: boolean;
  current_vehicle_id?: string;
  current_lat?: number;
  current_lng?: number;
}

export interface Incident {
  id: string;
  tenant_id: string;
  trip_id: string;
  incident_type: string;
  severity: string;
  description: string;
  autonomous_action_taken: string;
  status: string;
  created_at: string;
}

export interface SystemSummary {
  tenants_count: number;
  vendors_count: number;
  vehicles_count: number;
  drivers_on_duty: number;
  active_bookings: number;
  incidents_resolved_autonomously: number;
  system_status: string;
}

export interface Vendor {
  id: string;
  tenant_id: string;
  name: string;
  legal_name?: string;
  contact_email: string;
  contact_phone: string;
  country_code?: string;
  distance_unit?: DistanceUnit;
  city?: string;
  office_city?: string;
  office_address?: string;
  hq_address: string;
  depot_address: string;
  service_radius_miles: number;
  service_radius_km?: number;
  is_active: boolean;
  tier: string;
}

export type LegMode = 
  | 'CHAUFFEUR_RIDE'
  | 'FLIGHT'
  | 'TRAIN'
  | 'HELICOPTER_TRANSFER'
  | 'CROSS_BORDER_DRIVE'
  | 'DEPOT_STAGING'
  | 'DEPOT_DEADHEAD';

export interface ItineraryLeg {
  leg_id: string;
  leg_index: number;
  leg_mode: LegMode;
  title: string;
  origin_address: string;
  origin_city: string;
  origin_country: string;
  destination_address: string;
  destination_city: string;
  destination_country: string;
  scheduled_start_utc: string;
  estimated_duration_min: number;
  transit_info?: TransitDetails;
  assigned_vendor_id?: string;
  assigned_vendor_name?: string;
  vehicle_class: VehicleClass;
  distance_miles: number;
  distance_km?: number;
  distance_unit?: DistanceUnit;
  fare_net: number;
  tolls_and_fees_net: number;
  tax_rate: number;
  tax_amount: number;
  gratuity_amount: number;
  total_leg_amount: number;
  currency: string;
  price_status?: 'LOCKED_IN_NETWORK' | 'SOURCING_IN_PROGRESS' | 'QUOTED_BY_LOCAL_PARTNER';
  sourcing_inquiry_id?: string;
  sourcing_rfp_id?: string;
  pending_customer_message?: string;
  status: TripStatus;
  notes?: string;
}

export interface MasterItinerary {
  itinerary_id: string;
  tenant_id: string;
  title: string;
  legs: ItineraryLeg[];
  total_legs_count: number;
  total_distance_miles: number;
  total_distance_km?: number;
  distance_unit?: DistanceUnit;
  total_duration_minutes: number;
  countries_spanned: string[];
  cities_spanned: string[];
  subtotal_net: number;
  total_tolls_and_fees: number;
  total_tax_amount: number;
  total_gratuity_amount: number;
  all_inclusive_total: number;
  currency: string;
  is_partially_priced?: boolean;
  has_pending_sourcing_legs?: boolean;
  confirmed_subtotal_usd?: number;
  pending_legs_count?: number;
  sourcing_sla_summary?: string;
  is_binding: boolean;
  expires_at: string;
}

export interface VendorRegistrationForm {
  company_name: string;
  legal_name: string;
  tax_id: string;
  country_code: string;
  distance_unit?: DistanceUnit;
  city: string;
  state_province: string;
  depot_address: string;
  contact_email: string;
  contact_phone: string;
  operating_currency: string;
  fleet_count: number;
  tlc_or_operating_license: string;
  insurance_policy_number: string;
}

export interface VendorPricingRule {
  vendor_id: string;
  vehicle_class: VehicleClass;
  base_rate_net: number;
  per_mile_rate_net: number;
  per_km_rate_net: number;
  per_minute_rate_net: number;
  hourly_rate_net: number;
  hourly_minimum_hours?: number;
  minimum_fare_net: number;
  deadhead_rate_per_mile: number;
  deadhead_rate_per_km: number;
  deadhead_buffer_miles_outbound?: number;
  deadhead_buffer_miles_return?: number;
  fuel_surcharge_pct?: number;
  service_charge_pct?: number;
  credit_card_fee_pct?: number;
  airport_surcharge_net: number;
  meet_and_greet_fee_net: number;
  inside_baggage_meet_and_greet_fee_net?: number;
  rush_hour_surcharge_net?: number;
  late_night_surcharge_net?: number;
  free_wait_minutes: number;
  wait_minute_rate_net: number;
  tax_rate: number;
  include_gratuity_in_billing?: boolean;
  gratuity_rate: number;
  currency: string;
  distance_unit: DistanceUnit;
  updated_at?: string;
}

export interface VendorAIDynamicPricingMetrics {
  vendor_id: string;
  acceptance_rate_pct: number;
  fleet_utilization_pct: number;
  deadhead_recovery_efficiency: number;
  peak_demand_multiplier: number;
  suggested_base_rate: number;
  suggested_per_mile_rate: number;
  suggested_per_km_rate: number;
  historical_trips_analyzed: number;
  ai_optimization_notes: string;
  last_trained_at: string;
}

export interface VendorCommConfig {
  vendor_id: string;
  use_global_aws_ses: boolean;
  aws_ses_region: string;
  aws_ses_sender_email: string;
  custom_smtp_host?: string;
  custom_smtp_port?: number;
  custom_smtp_user?: string;
  custom_smtp_password?: string;
  custom_sender_email?: string;
  custom_inbound_email?: string;
  custom_twilio_phone?: string;
  custom_whatsapp_phone?: string;
  sms_enabled: boolean;
  whatsapp_enabled: boolean;
  voice_hotline_enabled: boolean;
  updated_at?: string;
}

export interface TransitRadarEvent {
  id: string;
  source: string;
  carrier: string;
  flight_or_train_number: string;
  origin: string;
  destination: string;
  scheduled_arrival: string;
  estimated_arrival: string;
  delay_minutes: number;
  gate_or_terminal?: string;
  status_summary: string;
  timestamp: string;
}

export interface PlanUpdateRequest {
  booking_id: string;
  update_source: string;
  raw_message_transcript: string;
  detected_delay_minutes?: number;
  new_pickup_time_utc?: string;
  new_dropoff_address?: string;
  new_flight_number?: string;
  special_passenger_request?: string;
}

export type UserRole = 
  | 'ROLE_CUSTOMER'
  | 'ROLE_CORPORATE_BOOKER'
  | 'ROLE_CHAUFFEUR'
  | 'ROLE_VENDOR_ADMIN'
  | 'ROLE_DISPATCHER'
  | 'ROLE_NETWORK_AFFILIATE'
  | 'ROLE_SUPER_ADMIN';

export interface UserSession {
  user_id: string;
  email: string;
  full_name: string;
  role: UserRole;
  tenant_id: string;
  vendor_id?: string;
  driver_id?: string;
  permissions: string[];
  created_at_epoch?: number;
  expires_at_epoch?: number;
}

export interface ActorPersonaOption {
  key: string;
  role: UserRole;
  full_name: string;
  email: string;
  tenant_id: string;
  vendor_id?: string;
  driver_id?: string;
  permissions: string[];
}

export type CoverageState = 'BOOKABLE' | 'REQUEST_ONLY' | 'TEMPORARILY_SUSPENDED' | 'NOT_SUPPORTED';

export interface CorridorCoverageRecord {
  corridor_id: string;
  city_name: string;
  airport_code?: string;
  country_code: string;
  coverage_state: CoverageState;
  sourcing_sla_minutes: number;
  anchor_vendor_id?: string;
  backup_vendor_id?: string;
  status_reason?: string;
}

export interface SourcingInquiry {
  inquiry_id: string;
  tenant_id: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  pickup_city: string;
  dropoff_city: string;
  pickup_time_utc: string;
  requested_vehicle_class: VehicleClass;
  status: string;
  response_deadline_utc: string;
}

export interface ChildSeatRequirement {
  infant_rear_facing: number;
  toddler_forward_facing: number;
  booster_seat: number;
}

export interface AccessibilityRequirement {
  wheelchair_accessible_vehicle_needed: boolean;
  requires_ramp_or_lift: boolean;
  trained_assistance_needed: boolean;
  folding_wheelchair_only: boolean;
}

export type FulfilmentType = 'HUMAN_CHAUFFEUR' | 'AUTONOMOUS_VEHICLE' | 'ASSISTED_AUTONOMOUS';

export interface ComplianceAlert {
  alert_id: string;
  tenant_id: string;
  vendor_id: string;
  vendor_name: string;
  target_entity_type: string;
  target_entity_id: string;
  target_name: string;
  document_type: string;
  severity: 'INFO' | 'WARNING' | 'CRITICAL';
  expiry_date: string;
  days_until_expiry: number;
  message: string;
  is_resolved: boolean;
}

export interface ServiceEligibilityRecord {
  evaluation_id: string;
  trip_id: string;
  driver_id: string;
  driver_name: string;
  vehicle_id: string;
  vehicle_model: string;
  scheduled_trip_date: string;
  is_eligible: boolean;
  driver_license_valid_on_trip_date: boolean;
  vehicle_insurance_valid_on_trip_date: boolean;
  vehicle_inspection_valid: boolean;
  airport_permit_active: boolean;
  disqualification_reasons: string[];
}

export interface AssignmentAuditRecord {
  audit_id: string;
  trip_id: string;
  leg_id: string;
  city_name: string;
  assigned_vendor_id: string;
  assigned_vendor_name: string;
  assigned_driver_id?: string;
  competing_candidates_count: number;
  proximity_score: number;
  quality_rating_score: number;
  preferred_partner_bonus: number;
  price_competitiveness_score: number;
  neutrality_load_balance_score: number;
  total_composite_score: number;
  justification_summary: string;
  evaluated_at?: string;
}

export interface ChauffeurDutyRecord {
  driver_id: string;
  vendor_id: string;
  driver_name: string;
  shift_start_utc?: string;
  hours_driven_today: number;
  max_permitted_driving_hours: number;
  is_rest_compliant: boolean;
  fatigue_status: string;
}

export type WebhookSource = 'FLIGHTAWARE' | 'STRIPE' | 'TWILIO_VOICE' | 'TWILIO_WHATSAPP' | 'TELEMETRY_GPS';

export interface WebhookEvent {
  id: string;
  source: WebhookSource;
  event_type: string;
  external_event_id?: string;
  payload: Record<string, any>;
  signature_verified: boolean;
  status: 'RECEIVED' | 'PROCESSED' | 'SIGNATURE_FAILED' | 'IGNORED' | 'FAILED';
  processed_at_utc: string;
  processing_notes?: string;
}

export interface FlightStatusUpdate {
  flight_number: string;
  airline_code?: string;
  departure_iata: string;
  arrival_iata: string;
  scheduled_arrival_utc: string;
  estimated_arrival_utc: string;
  actual_touchdown_utc?: string;
  terminal?: string;
  gate?: string;
  baggage_carousel?: string;
  delay_minutes: number;
  status: string;
  grace_period_minutes: number;
}

export interface SplitSettlementRecord {
  settlement_id: string;
  trip_id: string;
  booking_id: string;
  total_amount_gross: number;
  servicing_partner_id: string;
  servicing_partner_name: string;
  servicing_partner_payout_net: number;
  originating_vendor_id: string;
  originating_vendor_name: string;
  originating_commission_net: number;
  platform_clearing_fee_net: number;
  currency: string;
  stripe_transfer_ids: string[];
  settled_at_utc: string;
  status: string;
}

export interface GeofenceTelemetryUpdate {
  trip_id: string;
  driver_id: string;
  vehicle_id: string;
  lat: number;
  lng: number;
  speed_mph: number;
  heading_degrees: number;
  active_geofence_zone?: string;
  triggered_trip_status?: string;
  timestamp_utc: string;
}

export interface VendorBrandingProfile {
  company_tagline?: string;
  primary_color?: string;
  accent_color?: string;
  domain?: string;
  contact_phone?: string;
  office_address?: string;
  logo_url?: string;
}

export interface VendorPortalConfig {
  vendor_id: string;
  vendor_name: string;
  tier: string;
  operating_mode: string;
  country?: string;
  country_code?: string;
  state?: string;
  city?: string;
  currency: string;
  currency_symbol?: string;
  time_zone?: string;
  base_rate_usd: number;
  per_km_usd: number;
  encrypted_token?: string;
  secure_url?: string;
  branding: VendorBrandingProfile;
  telecom_compliance?: {
    legal_business_name?: string;
    ein_tax_id?: string;
    business_type?: string;
    vertical?: string;
    physical_address?: string;
    website_url?: string;
    contact_email?: string;
    contact_phone?: string;
    status?: string;
    trust_score?: number;
  };
  operational_stats?: {
    fleet_size?: number;
    active_drivers?: number;
    on_time_performance_pct?: number;
    monthly_revenue?: number;
    rides_completed_count?: number;
    customer_satisfaction_rating?: number;
    airport_transfers_pct?: number;
    corporate_accounts_count?: number;
    [key: string]: any;
  };
}

export interface SystemRuntimeMode {
  is_sovereign_cell: boolean;
  sovereign_vendor_id: string | null;
  is_prod_mode: boolean;
  hub_mode: boolean;
  node_hostname: string;
}

// --- VENDOR CELL TEAM & RBAC TYPES ---

export type TeamMemberStatus = 'ACTIVE' | 'INVITED' | 'SUSPENDED' | 'OFF_DUTY';

export interface TeamMember {
  id: string;
  vendor_id: string;
  email: string;
  full_name: string;
  phone?: string;
  role: string;
  status: TeamMemberStatus;
  driver_id?: string;
  assigned_vehicle_id?: string;
  permissions: string[];
  avatar_url?: string;
  last_active_at?: string;
  created_at: string;
}

export interface CreateTeamMemberPayload {
  vendor_id: string;
  email: string;
  full_name: string;
  phone?: string;
  role: string;
  permissions?: string[];
  driver_id?: string;
  assigned_vehicle_id?: string;
}

export interface UpdateTeamMemberPayload {
  full_name?: string;
  phone?: string;
  role?: string;
  status?: TeamMemberStatus;
  permissions?: string[];
  driver_id?: string;
  assigned_vehicle_id?: string;
}

export interface RoleDefinition {
  role: string;
  title: string;
  description: string;
  badge_color: string;
  is_administrative: boolean;
  default_permissions: string[];
}

export interface PermissionDefinition {
  key: string;
  label: string;
  category: string;
}

export interface RoleMatrixResponse {
  roles: RoleDefinition[];
  all_permissions: PermissionDefinition[];
}

export type EmailProviderType = 
  | 'CUSTOM_SMTP' 
  | 'AWS_SES' 
  | 'SENDGRID' 
  | 'POSTMARK' 
  | 'GOOGLE_WORKSPACE' 
  | 'OUTLOOK_365' 
  | 'GLOBAL_HUB_RELAY';

export interface VendorEmailConfig {
  vendor_id: string;
  provider: EmailProviderType;
  from_email: string;
  sender_display_name: string;
  reply_to_email?: string;
  
  // Outbound SMTP / Transport Settings
  smtp_host?: string;
  smtp_port: number;
  smtp_user?: string;
  smtp_password?: string;
  use_tls: boolean;
  api_key?: string;
  
  // Provider-Specific Credentials
  aws_access_key_id?: string;
  aws_secret_access_key?: string;
  aws_region?: string;
  sendgrid_api_key?: string;
  postmark_server_token?: string;
  oauth_client_id?: string;
  oauth_client_secret?: string;
  oauth_refresh_token?: string;
  oauth_tenant_id?: string;
  
  // Inbound Mailbox Settings (IMAP / POP3 / Webhook)
  inbound_protocol: 'IMAP' | 'POP3' | 'WEBHOOK';
  inbound_email?: string;
  imap_host?: string;
  imap_port: number;
  imap_user?: string;
  imap_password?: string;
  imap_use_ssl: boolean;
  imap_mailbox_folder: string;
  polling_interval_minutes: number;
  
  // Webhook & Fallback
  inbound_webhook_token: string;
  fallback_to_global_hub: boolean;
  
  // Verification & Statuses
  dkim_status: string;
  spf_status: string;
  mx_status: string;
  dmarc_status: string;
  
  // Automations
  auto_reply_quotes_enabled: boolean;
  auto_convert_corporate_bookings: boolean;
  notify_driver_on_dispatch: boolean;
  attach_pdf_invoices: boolean;
  updated_at?: string;
}

export interface CertifiedAffiliatePartner {
  partner_id: string;
  company_name: string;
  city: string;
  country: string;
  country_code: string;
  airports: string[];
  rating: number;
  trips_completed: number;
  compliance_badge: string;
  supported_classes: string[];
  primary_vehicle: string;
  base_rate_usd: number;
  per_km_rate_usd: number;
  escrow_trust_score: number;
  payout_account_verified: boolean;
}

export interface AffiliateRecommendation {
  partner: CertifiedAffiliatePartner;
  match_score: number;
  match_reasons: string[];
  policy_compliance_notes?: string[];
  estimated_gross_fare_usd: number;
  originator_commission_usd: number;
  performing_partner_net_usd: number;
  hub_clearing_fee_usd: number;
  estimated_chauffeur_eta_minutes: number;
  is_preferred_partner?: boolean;
  farm_in_status_open?: boolean;
}


export interface FarmOutPolicy {
  enabled: boolean;
  ai_natural_language_prompt?: string;
  ai_decision_mode?: 'AI_AGENT_AUTONOMOUS' | 'STRICT_DETERMINISTIC' | 'HYBRID';
  min_partner_rating: number;
  max_vehicle_age_years: number;
  min_referral_commission_pct: number;
  preferred_partner_ids: string[];
  blacklisted_partner_ids: string[];
  require_commercial_insurance: boolean;
  require_airport_fbo_permit: boolean;
  auto_farmout_on_overcapacity: boolean;
  auto_farmout_out_of_market: boolean;
  local_service_radius_km: number;
  require_owner_manual_approval: boolean;
}

export interface FarmInPolicy {
  open_for_farm_in: boolean;
  ai_natural_language_prompt?: string;
  ai_decision_mode?: 'AI_AGENT_AUTONOMOUS' | 'STRICT_DETERMINISTIC' | 'HYBRID';
  allowed_vehicle_classes: string[];
  min_net_payout_usd: number;
  min_lead_time_minutes: number;
  max_deadhead_from_depot_km: number;
  auto_accept_whitelisted: boolean;
  preferred_originator_ids: string[];
  blacklisted_originator_ids: string[];
  require_verified_passenger_phone: boolean;
}

export interface MultiLegRoutingRules {
  max_layover_hours_for_wait: number;
  hourly_wait_rate_usd: number;
  deadhead_rate_per_km_usd: number;
  max_driver_shift_hours: number;
  max_out_of_market_radius_km: number;
  inter_city_corridor_policy: 'SMART_SPLIT' | 'DEDICATED_WAIT_ONLY' | 'AUTO_FARM_FORWARD';
  auto_farm_out_long_layovers: boolean;
  affiliate_commission_target_pct: number;
  require_continuous_charter_for_local_stops: boolean;
  client_vip_override_enabled: boolean;
  overnight_hotel_allowance_usd: number;
  chauffeur_meal_per_diem_usd: number;
}

export interface VendorAffiliatePolicyRules {
  vendor_id: string;
  custom_owner_notes?: string;
  farm_out_policy: FarmOutPolicy;
  farm_in_policy: FarmInPolicy;
  multi_leg_rules?: MultiLegRoutingRules;
  ai_compiled_summary?: string;
  updated_at: number;
}

export interface CandidateChauffeur {
  driver_id: string;
  driver_name: string;
  driver_phone: string;
  vehicle_id: string;
  vehicle_name: string;
  license_plate: string;
  distance_miles: number;
  eta_minutes: number;
  rating: number;
  score: number;
}

export interface Dispatch24hAlert {
  trip_id: string;
  booking_id: string;
  vendor_id: string;
  pickup_address: string;
  dropoff_address?: string;
  pickup_time_utc: string;
  hours_until_pickup: number;
  urgency: 'CRITICAL' | 'URGENT' | 'WARNING';
  vehicle_class: string;
  flight_number?: string;
  status: string;
  recommended_candidates: CandidateChauffeur[];
}

export interface QuickQuoteRequest {
  vendor_id?: string;
  service_type: 'POINT_TO_POINT' | 'AIRPORT_TRANSFER' | 'HOURLY_AS_DIRECTED' | 'MULTI_CITY_TOUR' | string;
  vehicle_class: 'BUSINESS_SEDAN' | 'FIRST_CLASS' | 'LUXURY_SUV' | 'BUSINESS_VAN' | 'ULTRA_LUXURY' | 'ELECTRIC_VIP' | string;
  pickup_address: string;
  dropoff_address?: string;
  flight_number?: string;
  hourly_hours?: number;
  meet_and_greet?: boolean;
  multi_leg_stops?: any[];
  manual_discount_usd?: number;
  custom_surcharge_usd?: number;
}

export interface QuickQuoteResponse {
  base_fare_usd: number;
  distance_km: number;
  distance_fare_usd: number;
  airport_fee_usd: number;
  layover_standby_fee_usd: number;
  tolls_and_fees_usd: number;
  tax_amount_usd: number;
  discount_usd: number;
  surcharge_usd: number;
  total_amount_usd: number;
  currency: string;
  estimated_duration_minutes: number;
  multi_leg_strategy?: string;
  strategy_recommendation?: string;
}

export interface ManualPhoneBookingRequest {
  vendor_id: string;
  dispatcher_user_id?: string;
  caller_name: string;
  caller_phone: string;
  caller_email?: string;
  is_vip?: boolean;
  corporate_account_name?: string;
  corporate_po_number?: string;
  passenger_name?: string;
  passenger_phone?: string;
  passenger_count?: number;
  luggage_count?: number;
  service_type: 'POINT_TO_POINT' | 'AIRPORT_TRANSFER' | 'HOURLY_AS_DIRECTED' | 'MULTI_CITY_TOUR' | string;
  vehicle_class: 'BUSINESS_SEDAN' | 'FIRST_CLASS' | 'LUXURY_SUV' | 'BUSINESS_VAN' | 'ULTRA_LUXURY' | 'ELECTRIC_VIP' | string;
  pickup_address: string;
  dropoff_address?: string;
  pickup_time_utc: string;
  flight_number?: string;
  airline_name?: string;
  train_number?: string;
  hourly_hours?: number;
  meet_and_greet_inside?: boolean;
  child_car_seat_requested?: boolean;
  special_instructions?: string;
  multi_leg_stops?: any[];
  manual_discount_usd?: number;
  custom_surcharge_usd?: number;
  payment_method: 'SMS_PAYMENT_LINK' | 'DIRECT_CARD_PREAUTH' | 'CORPORATE_INVOICE' | 'CASH_ON_BOARD';
  card_number_masked?: string;
  card_token?: string;
  dispatch_action: 'AUTO_DISPATCH' | 'ASSIGN_SPECIFIC_DRIVER' | 'QUEUE_24H_DISPATCH' | 'FARM_OUT_AFFILIATE';
  assigned_driver_id?: string;
  assigned_vehicle_id?: string;
  target_affiliate_vendor_id?: string;
}

export interface PhoneBookingResult {
  success: boolean;
  booking_id: string;
  trip_id: string;
  status: string;
  total_amount_usd: number;
  payment_method: string;
  payment_status: string;
  sms_notification_sent: boolean;
  email_notification_sent?: boolean;
  customer_email?: string;
  email_preview_url?: string;
  payment_link_url?: string;
  assigned_driver_name?: string;
  assigned_vehicle_details?: string;
  calendar_invite_url: string;
  message: string;
}





