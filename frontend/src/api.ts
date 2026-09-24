import {
  Quote, Booking, Vehicle, Driver, Trip, Incident, SystemSummary,
  ServiceType, VehicleClass, BookingParty, TripStatus, Vendor,
  UserSession, ActorPersonaOption, VendorPortalConfig, SystemRuntimeMode,
  TeamMember, CreateTeamMemberPayload, UpdateTeamMemberPayload, RoleMatrixResponse,
  CertifiedAffiliatePartner, AffiliateRecommendation, Dispatch24hAlert,
  RegionalStaffingPod, InboundVoiceCallResolution
} from './types';


const BASE_URL = '';

let currentAuthToken: string | null = localStorage.getItem('limo_auth_token');
let currentActorRole: string | null = localStorage.getItem('limo_actor_role') || 'ROLE_VENDOR_ADMIN';

export function setAuthToken(token: string | null, role?: string | null) {
  currentAuthToken = token;
  if (token) {
    localStorage.setItem('limo_auth_token', token);
  } else {
    localStorage.removeItem('limo_auth_token');
  }
  if (role) {
    currentActorRole = role;
    localStorage.setItem('limo_actor_role', role);
  }
}

export function getAuthHeaders(): HeadersInit {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json'
  };
  if (currentAuthToken) {
    headers['Authorization'] = `Bearer ${currentAuthToken}`;
  }
  if (currentActorRole) {
    headers['X-Actor-Role'] = currentActorRole;
  }
  return headers;
}

export function extractErrorMessage(err: any, fallback: string = 'An error occurred'): string {
  if (!err) return fallback;
  if (typeof err === 'string') return err;
  if (typeof err.detail === 'string') return err.detail;
  if (Array.isArray(err.detail)) {
    return err.detail.map((e: any) => {
      const field = e.loc ? e.loc[e.loc.length - 1] : '';
      const cleanField = field && field !== 'body' ? `Field "${field}": ` : '';
      return `${cleanField}${e.msg || JSON.stringify(e)}`;
    }).join('; ');
  }
  if (err.detail && typeof err.detail === 'object') {
    return JSON.stringify(err.detail);
  }
  if (typeof err.message === 'string') return err.message;
  return fallback;
}

// --- AUTHENTICATION & RBAC ---

export async function fetchCurrentSession(): Promise<{ user: UserSession; token: string }> {
  const res = await fetch(`${BASE_URL}/api/v1/auth/me`, {
    headers: getAuthHeaders()
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(extractErrorMessage(err, 'Failed to fetch session'));
  }
  return res.json();
}

export async function fetchPersonas(): Promise<Record<string, ActorPersonaOption>> {
  const res = await fetch(`${BASE_URL}/api/v1/auth/personas`, {
    headers: getAuthHeaders()
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(extractErrorMessage(err, 'Failed to fetch personas'));
  }
  return res.json();
}

export async function switchPersonaApi(personaKey: string): Promise<{ user: UserSession; token: string }> {
  const res = await fetch(`${BASE_URL}/api/v1/auth/switch-persona`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ persona_key: personaKey })
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(extractErrorMessage(err, 'Failed to switch persona'));
  }
  const data = await res.json();
  setAuthToken(data.token, data.user.role);
  return data;
}

export async function loginApi(email: string, password?: string, role?: string): Promise<{ user: UserSession; token: string }> {
  const res = await fetch(`${BASE_URL}/api/v1/auth/oauth-login`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({
      provider: 'google',
      email,
      full_name: email.split('@')[0],
      role: role || 'ROLE_CUSTOMER'
    })
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(extractErrorMessage(err, 'Login failed'));
  }
  const data = await res.json();
  setAuthToken(data.token, data.user.role);
  return data;
}

export async function oauthLoginApi(params: {
  provider: 'apple' | 'google';
  email: string;
  full_name?: string;
  id_token?: string;
  role?: string;
  vendor_id?: string;
}): Promise<{ user: UserSession; token: string }> {
  const res = await fetch(`${BASE_URL}/api/v1/auth/oauth-login`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(params)
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(extractErrorMessage(err, `${params.provider} OAuth authentication failed`));
  }
  const data = await res.json();
  setAuthToken(data.token, data.user.role);
  return data;
}

export async function fetchSystemSummary(): Promise<SystemSummary> {
  const res = await fetch(`${BASE_URL}/api/v1/system-summary`, {
    headers: getAuthHeaders()
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(extractErrorMessage(err, 'Failed to fetch summary'));
  }
  return res.json();
}

export async function requestQuote(params: {
  service_type: ServiceType;
  vehicle_class: VehicleClass;
  pickup_address: string;
  dropoff_address?: string;
  vendor_id?: string;
  tenant_id?: string;
  flight_number?: string;
  train_number?: string;
  distance_miles?: number;
  hourly_hours?: number;
  wait_minutes?: number;
  currency?: string;
  pickup_time_utc?: string;
  meet_and_greet_inside?: boolean;
}): Promise<Quote> {
  const res = await fetch(`${BASE_URL}/api/v1/quotes`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({
      tenant_id: params.tenant_id || 'tenant-us-east',
      vendor_id: params.vendor_id || undefined,
      ...params
    })
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(extractErrorMessage(err, 'Failed to compute quote'));
  }
  return res.json();
}

export async function requestQuoteMatrix(params: {
  service_type: ServiceType;
  pickup_address: string;
  dropoff_address?: string;
  vendor_id?: string;
  tenant_id?: string;
  flight_number?: string;
  train_number?: string;
  distance_miles?: number;
  hourly_hours?: number;
  wait_minutes?: number;
  currency?: string;
  pickup_time_utc?: string;
  meet_and_greet_inside?: boolean;
}): Promise<Record<string, Quote>> {
  const res = await fetch(`${BASE_URL}/api/v1/quotes/matrix`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({
      tenant_id: params.tenant_id || 'tenant-us-east',
      vendor_id: params.vendor_id || undefined,
      ...params
    })
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(extractErrorMessage(err, 'Failed to compute quotes matrix'));
  }
  return res.json();
}

export async function compareQuotes(params: {
  service_type: ServiceType;
  vehicle_class: VehicleClass;
  pickup_address: string;
  dropoff_address?: string;
  flight_number?: string;
  train_number?: string;
  hourly_hours?: number;
  wait_minutes?: number;
  currency?: string;
  pickup_time_utc?: string;
  meet_and_greet_inside?: boolean;
}): Promise<any> {
  const res = await fetch(`${BASE_URL}/api/v1/quotes/compare`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({
      tenant_id: 'tenant-us-east',
      ...params
    })
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(extractErrorMessage(err, 'Failed to compare market quotes'));
  }
  return res.json();
}

export async function bookQuote(quote_id: string, party: BookingParty, pickup_time_utc: string): Promise<Booking> {
  const res = await fetch(`${BASE_URL}/api/v1/quotes/${quote_id}/book`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      quote_id,
      party,
      pickup_time_utc,
      payment_token: 'tok_visa_4242'
    })
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(extractErrorMessage(err, 'Failed to confirm booking'));
  }
  return res.json();
}

export async function fetchBookings(): Promise<Booking[]> {
  const res = await fetch(`${BASE_URL}/api/v1/bookings`, {
    headers: getAuthHeaders()
  });
  if (!res.ok) throw new Error('Failed to fetch bookings');
  return res.json();
}

export async function lookupBookingsApi(query: string): Promise<Booking[]> {
  const res = await fetch(`${BASE_URL}/api/v1/bookings/lookup?query=${encodeURIComponent(query)}`);
  if (!res.ok) throw new Error('Failed to search bookings');
  return res.json();
}

export async function cancelBookingApi(bookingId: string, reason: string = 'Customer requested cancellation'): Promise<any> {
  const res = await fetch(`${BASE_URL}/api/v1/bookings/${bookingId}/cancel`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ reason })
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.detail || errorData.message || 'Failed to cancel booking');
  }
  return res.json();
}

export async function fetchBookingTermsVoucher(bookingId: string): Promise<any> {
  const res = await fetch(`${BASE_URL}/api/v1/bookings/${bookingId}/terms-voucher`);
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.detail || errorData.message || 'Failed to fetch booking terms voucher');
  }
  return res.json();
}

export function getBookingCalendarIcsUrl(bookingId: string): string {
  return `${BASE_URL}/api/v1/bookings/${bookingId}/calendar.ics`;
}

export function generateGoogleCalendarUrl(booking: Booking): string {
  const title = encodeURIComponent(`Executive Chauffeur: ${booking.pickup_address?.split(',')[0]} ➔ ${booking.dropoff_address?.split(',')[0]}`);
  const location = encodeURIComponent(booking.pickup_address || '');
  const driverName = (booking.trip as any)?.driver_name || booking.trip?.active_offer?.driver_name || 'Executive Chauffeur (En Route)';
  const details = encodeURIComponent(
    `Booking Ref: #${booking.id}\nPassenger: ${booking.party?.passenger_name} (${booking.party?.passenger_phone})\nPickup: ${booking.pickup_address}\nDestination: ${booking.dropoff_address}\nGuaranteed Escrow: $${Number(booking.total_amount || 0).toFixed(2)} USD\nDriver: ${driverName}`
  );
  
  const startTime = booking.pickup_time_utc ? new Date(booking.pickup_time_utc) : new Date(Date.now() + 86400000);
  const endTime = new Date(startTime.getTime() + 7200000);
  const startIso = startTime.toISOString().replace(/-|:|\.\d\d\d/g, '');
  const endIso = endTime.toISOString().replace(/-|:|\.\d\d\d/g, '');
  
  return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${startIso}/${endIso}&details=${details}&location=${location}`;
}

export function generateOutlookCalendarUrl(booking: Booking): string {
  const title = encodeURIComponent(`Executive Chauffeur: ${booking.pickup_address?.split(',')[0]} ➔ ${booking.dropoff_address?.split(',')[0]}`);
  const location = encodeURIComponent(booking.pickup_address || '');
  const driverName = (booking.trip as any)?.driver_name || booking.trip?.active_offer?.driver_name || 'Executive Chauffeur (En Route)';
  const details = encodeURIComponent(
    `Booking Ref: #${booking.id}\nPassenger: ${booking.party?.passenger_name} (${booking.party?.passenger_phone})\nPickup: ${booking.pickup_address}\nDestination: ${booking.dropoff_address}\nGuaranteed Escrow: $${Number(booking.total_amount || 0).toFixed(2)} USD\nDriver: ${driverName}`
  );
  
  const startTime = booking.pickup_time_utc ? new Date(booking.pickup_time_utc) : new Date(Date.now() + 86400000);
  const endTime = new Date(startTime.getTime() + 7200000);
  
  return `https://outlook.live.com/calendar/0/deeplink/compose?subject=${title}&body=${details}&location=${location}&startdt=${startTime.toISOString()}&enddt=${endTime.toISOString()}`;
}

export async function fetchBooking(id: string): Promise<Booking> {
  const res = await fetch(`${BASE_URL}/api/v1/bookings/${id}`, {
    headers: getAuthHeaders()
  });
  if (!res.ok) throw new Error('Failed to fetch booking');
  return res.json();
}

export async function fetchFleetVehicles(): Promise<Vehicle[]> {
  const res = await fetch(`${BASE_URL}/api/v1/fleet/vehicles`, {
    headers: getAuthHeaders()
  });
  if (!res.ok) throw new Error('Failed to fetch vehicles');
  return res.json();
}

export async function fetchDrivers(): Promise<Driver[]> {
  const res = await fetch(`${BASE_URL}/api/v1/fleet/drivers`, {
    headers: getAuthHeaders()
  });
  if (!res.ok) throw new Error('Failed to fetch drivers');
  return res.json();
}

export async function fetchVendors(): Promise<Vendor[]> {
  const res = await fetch(`${BASE_URL}/api/v1/vendors`, {
    headers: getAuthHeaders()
  });
  if (!res.ok) throw new Error('Failed to fetch vendors');
  return res.json();
}

export async function fetchDriverOffers(driverId?: string): Promise<any[]> {
  const url = driverId ? `${BASE_URL}/api/v1/driver/my-offers?driver_id=${driverId}` : `${BASE_URL}/api/v1/driver/my-offers`;
  const res = await fetch(url, {
    headers: getAuthHeaders()
  });
  if (!res.ok) throw new Error('Failed to fetch driver offers');
  return res.json();
}

export async function acceptDriverOffer(offerId: string): Promise<Trip> {
  const res = await fetch(`${BASE_URL}/api/v1/driver/offers/${offerId}/accept`, {
    method: 'POST',
    headers: getAuthHeaders()
  });
  if (!res.ok) throw new Error('Failed to accept driver offer');
  return res.json();
}

export async function updateTripStatus(tripId: string, status: TripStatus, note?: string): Promise<Trip> {
  const res = await fetch(`${BASE_URL}/api/v1/driver/trips/${tripId}/events`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({
      status,
      actor: 'CHAUFFEUR_APP',
      note
    })
  });
  if (!res.ok) throw new Error('Failed to update trip status');
  return res.json();
}

export async function simulateFlightDelay(tripId: string, delayMinutes: number): Promise<any> {
  const res = await fetch(`${BASE_URL}/api/v1/recovery/simulate-flight-delay`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({
      trip_id: tripId,
      delay_minutes: delayMinutes
    })
  });
  if (!res.ok) throw new Error('Failed to simulate flight delay');
  return res.json();
}

export async function registerVendor(data: any): Promise<any> {
  const res = await fetch(`${BASE_URL}/api/v1/vendors/register`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(data)
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(extractErrorMessage(err, 'Registration failed'));
  }
  return res.json();
}

export async function parseInboundEmail(formData: FormData): Promise<any> {
  const headers: Record<string, string> = {};
  if (currentAuthToken) headers['Authorization'] = `Bearer ${currentAuthToken}`;
  if (currentActorRole) headers['X-Actor-Role'] = currentActorRole;
  const res = await fetch(`${BASE_URL}/api/v1/omnichannel/email`, {
    method: 'POST',
    headers,
    body: formData
  });
  if (!res.ok) throw new Error('Email processing failed');
  return res.json();
}

export async function parseInboundWhatsApp(data: { from_phone: string; message_body: string }): Promise<any> {
  const res = await fetch(`${BASE_URL}/api/v1/omnichannel/whatsapp`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(data)
  });
  if (!res.ok) throw new Error('WhatsApp processing failed');
  return res.json();
}

export async function fetchIncidents(): Promise<Incident[]> {
  const res = await fetch(`${BASE_URL}/api/v1/incidents`, {
    headers: getAuthHeaders()
  });
  if (!res.ok) throw new Error('Failed to fetch incidents');
  return res.json();
}

export async function quoteItinerary(itineraryRequest: any): Promise<any> {
  const res = await fetch(`${BASE_URL}/api/v1/itineraries/quote`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(itineraryRequest)
  });
  if (!res.ok) throw new Error('Failed to compute multi-modal itinerary quote');
  return res.json();
}

export async function bookItinerary(
  masterItineraryId: string,
  party: BookingParty,
  paymentToken: string = 'tok_visa_4242',
  extraDetails?: {
    itinerary?: any;
    legs?: any[];
    pickup_address?: string;
    dropoff_address?: string;
    pickup_time?: string;
    flight_details?: any;
    flight_number?: string;
    vehicle_class?: string;
    total_amount?: number;
  }
): Promise<any> {
  const res = await fetch(`${BASE_URL}/api/v1/itineraries/${masterItineraryId}/book`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({
      party,
      payment_token: paymentToken,
      ...(extraDetails || {})
    })
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.detail || errorData.message || 'Failed to book itinerary');
  }
  return res.json();
}

export async function fetchVendorPricingRules(vendorId: string): Promise<any[]> {
  const res = await fetch(`${BASE_URL}/api/v1/vendors/${vendorId}/pricing-rules`, {
    headers: getAuthHeaders()
  });
  if (!res.ok) throw new Error('Failed to fetch vendor pricing rules');
  return res.json();
}

export async function saveVendorPricingRule(vendorId: string, rule: any): Promise<any> {
  const res = await fetch(`${BASE_URL}/api/v1/vendors/${vendorId}/pricing-rules`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(rule)
  });
  if (!res.ok) throw new Error('Failed to save vendor pricing rule');
  return res.json();
}

export async function fetchVendorDynamicYieldMetrics(vendorId: string): Promise<any> {
  const res = await fetch(`${BASE_URL}/api/v1/vendors/${vendorId}/dynamic-pricing-metrics`, {
    headers: getAuthHeaders()
  });
  if (!res.ok) throw new Error('Failed to fetch vendor dynamic pricing metrics');
  return res.json();
}

export async function simulateDriverTimeout(offerId: string): Promise<any> {
  const res = await fetch(`${BASE_URL}/api/v1/recovery/simulate-driver-timeout`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({
      offer_id: offerId,
      reason: 'OFFER_TIMEOUT_180S'
    })
  });
  if (!res.ok) throw new Error('Failed to simulate driver timeout');
  return res.json();
}

export async function fetchPlacesAutocomplete(query: string): Promise<any[]> {
  if (!query || query.length < 2) return [];
  const res = await fetch(`${BASE_URL}/api/v1/maps/places-autocomplete?q=${encodeURIComponent(query)}`, {
    headers: getAuthHeaders()
  });
  if (!res.ok) return [];
  return res.json();
}

export async function validateAddress(address: string): Promise<any> {
  const res = await fetch(`${BASE_URL}/api/v1/maps/validate-address?address=${encodeURIComponent(address)}`, {
    headers: getAuthHeaders()
  });
  if (!res.ok) return { valid: false };
  return res.json();
}

export async function quoteMasterItinerary(title: string, legs: any[], vehicleClass: string = 'LUXURY_SUV'): Promise<any> {
  const res = await fetch(`${BASE_URL}/api/v1/itineraries/quote`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({
      title,
      vehicle_class: vehicleClass,
      legs
    })
  });
  if (!res.ok) throw new Error('Failed to quote multi-modal itinerary');
  return res.json();
}

export async function quoteMasterItineraryMatrix(title: string, legs: any[]): Promise<Record<string, any>> {
  const res = await fetch(`${BASE_URL}/api/v1/itineraries/quote-matrix`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({
      title,
      legs
    })
  });
  if (!res.ok) throw new Error('Failed to quote multi-modal itinerary matrix');
  return res.json();
}

export async function parseOmnichannelEnquiry(channel: string, sender: string, rawText: string): Promise<any> {
  const res = await fetch(`${BASE_URL}/api/v1/intake/parse-enquiry`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({
      channel,
      sender,
      raw_text: rawText
    })
  });
  if (!res.ok) throw new Error('Failed to parse enquiry');
  return res.json();
}

// --- VENDOR AUTONOMOUS PRICING & AI YIELD ---

export async function fetchVendorAIYield(vendorId: string): Promise<any> {
  const res = await fetch(`${BASE_URL}/api/v1/vendors/${vendorId}/dynamic-pricing-metrics`, {
    headers: getAuthHeaders()
  });
  if (!res.ok) throw new Error('Failed to fetch AI yield metrics');
  return res.json();
}

export async function trainVendorAIYield(vendorId: string): Promise<any> {
  const res = await fetch(`${BASE_URL}/api/v1/vendors/${vendorId}/ai-yield/train`, {
    method: 'POST',
    headers: getAuthHeaders()
  });
  if (!res.ok) throw new Error('Failed to train AI yield');
  return res.json();
}

export async function applyVendorAIYield(vendorId: string): Promise<any> {
  const res = await fetch(`${BASE_URL}/api/v1/vendors/${vendorId}/ai-yield/apply`, {
    method: 'POST',
    headers: getAuthHeaders()
  });
  if (!res.ok) throw new Error('Failed to apply AI yield suggestions');
  return res.json();
}

// --- VENDOR FLEET INVENTORY & NETWORK MODE ---

export async function fetchVendorFleetInventory(vendorId: string): Promise<any[]> {
  const res = await fetch(`${BASE_URL}/api/v1/vendors/${vendorId}/fleet-inventory`, {
    headers: getAuthHeaders()
  });
  if (!res.ok) throw new Error('Failed to fetch fleet inventory');
  return res.json();
}

export async function addVehicleToInventory(vendorId: string, data: any): Promise<any> {
  const res = await fetch(`${BASE_URL}/api/v1/vendors/${vendorId}/fleet-inventory`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(data)
  });
  if (!res.ok) throw new Error('Failed to add vehicle');
  return res.json();
}

export async function toggleVehicleNetworkMode(vendorIdOrVehicleId: string, vehicleId?: string): Promise<any> {
  const vId = vehicleId || vendorIdOrVehicleId;
  const res = await fetch(`${BASE_URL}/api/v1/vehicles/${vId}/toggle-network-mode`, {
    method: 'POST',
    headers: getAuthHeaders()
  });
  if (!res.ok) throw new Error('Failed to toggle network mode');
  return res.json();
}


// --- VENDOR AWS SES & COMM CONFIG ---

export async function fetchVendorCommConfig(vendorId: string): Promise<any> {
  const res = await fetch(`${BASE_URL}/api/v1/vendors/${vendorId}/comm-config`, {
    headers: getAuthHeaders()
  });
  if (!res.ok) throw new Error('Failed to fetch comm config');
  return res.json();
}

export async function saveVendorCommConfig(vendorId: string, config: any): Promise<any> {
  const res = await fetch(`${BASE_URL}/api/v1/vendors/${vendorId}/comm-config`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(config)
  });
  if (!res.ok) throw new Error('Failed to save comm config');
  return res.json();
}

// --- TRANSIT RADAR & OMNICHANNEL PLAN UPDATER ---

export async function fetchTransitRadarStream(): Promise<any[]> {
  const res = await fetch(`${BASE_URL}/api/v1/transit/radar-stream`, {
    headers: getAuthHeaders()
  });
  if (!res.ok) throw new Error('Failed to fetch radar stream');
  return res.json();
}

export async function simulateRadarDelay(data: { flight_or_train_number: string; delay_minutes: number; new_estimated_arrival: string; reason?: string }): Promise<any> {
  const res = await fetch(`${BASE_URL}/api/v1/transit/simulate-radar-delay`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(data)
  });
  if (!res.ok) throw new Error('Failed to simulate radar delay');
  return res.json();
}

export async function executeInboundPlanUpdate(request: any): Promise<any> {
  const res = await fetch(`${BASE_URL}/api/v1/transit/inbound-plan-update`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(request)
  });
  if (!res.ok) throw new Error('Failed to execute plan update');
  return res.json();
}

// --- STRATEGIC RESEARCH & GOVERNANCE APIS ---

export async function evaluateCorridorCoverage(cityOrAddress: string, countryCode?: string): Promise<any> {
  const res = await fetch(`${BASE_URL}/api/v1/coverage/evaluate`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ city_or_address: cityOrAddress, country_code: countryCode })
  });
  if (!res.ok) throw new Error('Failed to evaluate corridor coverage');
  return res.json();
}

export async function submitSourcingInquiry(dto: any): Promise<any> {
  const res = await fetch(`${BASE_URL}/api/v1/coverage/inquiry`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(dto)
  });
  if (!res.ok) throw new Error('Failed to submit sourcing inquiry');
  return res.json();
}

export async function fetchComplianceAlerts(): Promise<any> {
  const res = await fetch(`${BASE_URL}/api/v1/compliance/alerts`, {
    headers: getAuthHeaders()
  });
  if (!res.ok) throw new Error('Failed to fetch compliance alerts');
  return res.json();
}

export async function triggerComplianceScan(): Promise<any> {
  const res = await fetch(`${BASE_URL}/api/v1/compliance/scan`, {
    method: 'POST',
    headers: getAuthHeaders()
  });
  if (!res.ok) throw new Error('Failed to trigger compliance scan');
  return res.json();
}

export async function verifyPreDispatchEligibility(dto: any): Promise<any> {
  const res = await fetch(`${BASE_URL}/api/v1/dispatch/verify-eligibility`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(dto)
  });
  if (!res.ok) throw new Error('Failed to verify pre-dispatch eligibility');
  return res.json();
}

export async function fetchAssignmentAudit(tripId: string): Promise<any> {
  const res = await fetch(`${BASE_URL}/api/v1/dispatch/assignment-audits/${tripId}`, {
    headers: getAuthHeaders()
  });
  if (!res.ok) throw new Error('Failed to fetch assignment audit');
  return res.json();
}

export async function fetchChauffeurDutyStatus(driverId: string): Promise<any> {
  const res = await fetch(`${BASE_URL}/api/v1/chauffeur/${driverId}/duty-status`, {
    headers: getAuthHeaders()
  });
  if (!res.ok) throw new Error('Failed to fetch chauffeur duty status');
  return res.json();
}

export async function fetchWebhookEvents(limit = 50): Promise<any> {
  const res = await fetch(`${BASE_URL}/api/v1/webhooks/events?limit=${limit}`, {
    headers: getAuthHeaders()
  });
  if (!res.ok) throw new Error('Failed to fetch webhook events');
  return res.json();
}

export async function fetchSplitSettlements(): Promise<any> {
  const res = await fetch(`${BASE_URL}/api/v1/settlements/split-records`, {
    headers: getAuthHeaders()
  });
  if (!res.ok) throw new Error('Failed to fetch split settlements');
  return res.json();
}

export async function simulateWebhookEvent(dto: any): Promise<any> {
  const res = await fetch(`${BASE_URL}/api/v1/webhooks/simulate`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(dto)
  });
  if (!res.ok) throw new Error('Failed to simulate webhook');
  return res.json();
}

export async function fetchVendorPortalConfig(vendorId: string): Promise<VendorPortalConfig> {
  const res = await fetch(`${BASE_URL}/api/v1/vendor-cell/${vendorId}/portal-config`, {
    headers: getAuthHeaders()
  });
  if (!res.ok) throw new Error('Failed to fetch vendor portal config');
  return res.json();
}

export async function resolveVendorByDomain(domainOrToken: string): Promise<VendorPortalConfig> {
  const res = await fetch(`${BASE_URL}/api/v1/vendor-portal/resolve-domain?domain=${encodeURIComponent(domainOrToken)}`, {
    headers: getAuthHeaders()
  });
  if (!res.ok) throw new Error('Failed to resolve vendor by domain or token');
  return res.json();
}

export async function resolveVendorByToken(token: string): Promise<VendorPortalConfig> {
  const res = await fetch(`${BASE_URL}/api/v1/vendor-portal/resolve-token?token=${encodeURIComponent(token)}`, {
    headers: getAuthHeaders()
  });
  if (!res.ok) throw new Error('Failed to resolve vendor token');
  return res.json();
}

export async function fetchVendorToken(vendorId: string): Promise<{ vendor_id: string; encrypted_token: string; secure_url: string }> {
  const res = await fetch(`${BASE_URL}/api/v1/vendor-portal/token/${vendorId}`, {
    headers: getAuthHeaders()
  });
  if (!res.ok) throw new Error('Failed to generate vendor token');
  return res.json();
}

export async function fetchSystemRuntimeMode(): Promise<SystemRuntimeMode> {
  try {
    const res = await fetch(`${BASE_URL}/api/v1/system/runtime-mode`, {
      headers: getAuthHeaders()
    });
    if (!res.ok) throw new Error('Failed to fetch runtime mode');
    return res.json();
  } catch {
    return {
      is_sovereign_cell: false,
      sovereign_vendor_id: null,
      is_prod_mode: false,
      hub_mode: true,
      node_hostname: 'limo-local'
    };
  }
}




export async function fetchAvailableVendors(): Promise<{ id: string; name: string }[]> {
  try {
    const res = await fetch(`${BASE_URL}/api/v1/vendor-cell/all-cells`, {
      headers: getAuthHeaders()
    });
    if (!res.ok) {
      return [];
    }
    const data = await res.json();
    return data.map((c: any) => ({
      id: c.config?.vendor_id || c.vendor_id,
      name: c.config?.vendor_name || c.vendor_name || c.vendor_id
    }));
  } catch {
    return [];
  }
}


export async function sendTelemetryPing(dto: any): Promise<any> {
  const res = await fetch(`${BASE_URL}/api/v1/telemetry/location`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(dto)
  });
  if (!res.ok) throw new Error('Failed to send telemetry ping');
  return res.json();
}

export async function fetchVendorTelecomCompliance(vendorId: string): Promise<any> {
  const res = await fetch(`${BASE_URL}/api/v1/vendors/${vendorId}/telecom-compliance`, {
    headers: getAuthHeaders()
  });
  if (!res.ok) throw new Error('Failed to fetch telecom compliance status');
  return res.json();
}

export async function registerVendor10DlcBrand(vendorId: string, filingData: any): Promise<any> {
  const res = await fetch(`${BASE_URL}/api/v1/vendors/${vendorId}/telecom-compliance/register-brand`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(filingData)
  });
  if (!res.ok) throw new Error('Failed to register 10DLC brand');
  return res.json();
}

export async function sendOmnichannelChatMessage(vendorId: string, dto: any): Promise<any> {
  const res = await fetch(`${BASE_URL}/api/v1/vendors/${vendorId}/omnichannel/send-message`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(dto)
  });
  if (!res.ok) throw new Error('Failed to send omnichannel message');
  return res.json();
}

export async function dialVoiceStudioCall(vendorId: string, dto: any): Promise<any> {
  const res = await fetch(`${BASE_URL}/api/v1/vendors/${vendorId}/omnichannel/dial-call`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(dto)
  });
  if (!res.ok) throw new Error('Failed to dial voice call');
  return res.json();
}

export async function updateOmnichannelBYOKConfig(vendorId: string, dto: any): Promise<any> {
  const res = await fetch(`${BASE_URL}/api/v1/vendors/${vendorId}/omnichannel/config`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(dto)
  });
  if (!res.ok) throw new Error('Failed to update BYOK config');
  return res.json();
}

export async function validatePublicVendorOnboarding(payload: any): Promise<any> {
  const res = await fetch(`${BASE_URL}/api/v1/public/vendor-onboarding/validate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(extractErrorMessage(err, 'Validation failed. Please verify your legal entity & pricing details.'));
  }
  return res.json();
}

export async function submitPublicVendorOnboarding(payload: any): Promise<any> {
  const res = await fetch(`${BASE_URL}/api/v1/public/vendor-onboarding/submit`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(extractErrorMessage(err, 'Onboarding submission failed. Please check payment method or contact support.'));
  }
    return res.json();
}

export async function fetchVendorOnboardingStatus(vendorId: string): Promise<any> {
  const res = await fetch(`${BASE_URL}/api/v1/vendor-cell/${vendorId}/onboarding-status`, {
    headers: getAuthHeaders()
  });
  if (!res.ok) throw new Error('Failed to fetch vendor onboarding status');
  return res.json();
}

export async function sendVendorOnboardingInvite(vendorId: string): Promise<any> {
  const res = await fetch(`${BASE_URL}/api/v1/vendor-cell/${vendorId}/onboarding-invite`, {
    method: 'POST',
    headers: getAuthHeaders()
  });
  if (!res.ok) throw new Error('Failed to send vendor onboarding invite');
  return res.json();
}

// --- VENDOR BYOE EMAIL GATEWAY & TRAVEL DESK RFQs ---

export async function fetchVendorEmailConfig(vendorId: string): Promise<any> {
  const res = await fetch(`${BASE_URL}/api/v1/vendor-cell/${vendorId}/email/config`, {
    headers: getAuthHeaders()
  });
  if (!res.ok) throw new Error('Failed to fetch vendor email config');
  return res.json();
}

export async function updateVendorEmailConfig(vendorId: string, config: any): Promise<any> {
  const res = await fetch(`${BASE_URL}/api/v1/vendor-cell/${vendorId}/email/config`, {
    method: 'PUT',
    headers: getAuthHeaders(),
    body: JSON.stringify(config)
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || 'Failed to update email config');
  }
  return res.json();
}

export async function testVendorEmailConnection(vendorId: string, testRecipient?: string): Promise<any> {
  const res = await fetch(`${BASE_URL}/api/v1/vendor-cell/${vendorId}/email/test`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ target_email: testRecipient || 'dispatch-test@limo-ops.com' })
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || 'Failed to dispatch test email');
  }
  return res.json();
}

export async function testVendorInboundEmailConnection(vendorId: string): Promise<any> {
  const res = await fetch(`${BASE_URL}/api/v1/vendor-cell/${vendorId}/email/test-inbound`, {
    method: 'POST',
    headers: getAuthHeaders()
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || 'Failed to verify inbound mail connection');
  }
  return res.json();
}

export async function fetchVendorEmailInbox(vendorId: string): Promise<any> {
  const res = await fetch(`${BASE_URL}/api/v1/vendor-cell/${vendorId}/email/inbox`, {
    headers: getAuthHeaders()
  });
  if (!res.ok) throw new Error('Failed to fetch vendor email inbox');
  return res.json();
}

export async function convertEmailRfqToBooking(vendorId: string, rfqId: string, customOptions?: any): Promise<any> {
  const res = await fetch(`${BASE_URL}/api/v1/vendor-cell/${vendorId}/email/rfqs/${rfqId}/convert-booking`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(customOptions || {})
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || 'Failed to convert RFQ to booking');
  }
  return res.json();
}

export async function sendVendorEmailInvoice(vendorId: string, payload: any): Promise<any> {
  const res = await fetch(`${BASE_URL}/api/v1/vendor-cell/${vendorId}/email/send-invoice`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(payload)
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || 'Failed to send invoice email');
  }
  return res.json();
}

// --- VENDOR CELL TEAM & RBAC ACCESS API ---

export async function fetchVendorTeam(vendorId: string): Promise<TeamMember[]> {
  const res = await fetch(`${BASE_URL}/api/v1/vendor-cell/${vendorId}/team`, {
    headers: getAuthHeaders()
  });
  if (!res.ok) throw new Error('Failed to fetch vendor team roster');
  return res.json();
}

export async function createVendorTeamMember(vendorId: string, payload: CreateTeamMemberPayload): Promise<TeamMember> {
  const res = await fetch(`${BASE_URL}/api/v1/vendor-cell/${vendorId}/team`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(payload)
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || 'Failed to create team member');
  }
  return res.json();
}

export async function updateVendorTeamMember(vendorId: string, userId: string, payload: UpdateTeamMemberPayload): Promise<TeamMember> {
  const res = await fetch(`${BASE_URL}/api/v1/vendor-cell/${vendorId}/team/${userId}`, {
    method: 'PUT',
    headers: getAuthHeaders(),
    body: JSON.stringify(payload)
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || 'Failed to update team member');
  }
  return res.json();
}

export async function deleteVendorTeamMember(vendorId: string, userId: string): Promise<any> {
  const res = await fetch(`${BASE_URL}/api/v1/vendor-cell/${vendorId}/team/${userId}`, {
    method: 'DELETE',
    headers: getAuthHeaders()
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || 'Failed to delete team member');
  }
  return res.json();
}

export async function generateTeamMemberImpersonateToken(vendorId: string, userId: string): Promise<{ token: string; user: any; role: string }> {
  const res = await fetch(`${BASE_URL}/api/v1/vendor-cell/${vendorId}/team/${userId}/impersonate-token`, {
    method: 'POST',
    headers: getAuthHeaders()
  });
  if (!res.ok) throw new Error('Failed to generate member login token');
  return res.json();
}

export async function fetchVendorRolesMatrix(vendorId: string): Promise<RoleMatrixResponse> {
  const res = await fetch(`${BASE_URL}/api/v1/vendor-cell/${vendorId}/team/roles-matrix`, {
    headers: getAuthHeaders()
  });
  if (!res.ok) throw new Error('Failed to fetch RBAC roles matrix');
  return res.json();
}

// --- GLOBAL HUB AFFILIATE DISCOVERY & FARMOUT EXCHANGE API ---

export async function fetchGlobalAffiliateDirectory(vendorId: string): Promise<CertifiedAffiliatePartner[]> {
  const res = await fetch(`${BASE_URL}/api/v1/vendors/${vendorId}/affiliates/directory`, {
    headers: getAuthHeaders()
  });
  if (!res.ok) throw new Error('Failed to fetch global affiliate directory');
  return res.json();
}

export async function fetchAffiliateRecommendations(
  vendorId: string, 
  destination: string, 
  vehicleClass: string = 'FIRST_CLASS', 
  distanceKm: number = 25.0
): Promise<AffiliateRecommendation[]> {
  const params = new URLSearchParams({
    destination,
    vehicle_class: vehicleClass,
    distance_km: distanceKm.toString()
  });
  const res = await fetch(`${BASE_URL}/api/v1/vendors/${vendorId}/affiliates/recommendations?${params.toString()}`, {
    headers: getAuthHeaders()
  });
  if (!res.ok) throw new Error('Failed to match affiliate partners');
  return res.json();
}

export async function farmOutAffiliateRide(vendorId: string, payload: {
  performing_vendor_id: string;
  passenger_name: string;
  passenger_phone: string;
  pickup_address: string;
  dropoff_address: string;
  distance_km?: number;
  vehicle_class?: string;
}): Promise<any> {
  const res = await fetch(`${BASE_URL}/api/v1/vendors/${vendorId}/affiliates/farm-out`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(payload)
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || 'Failed to farm out ride to affiliate');
  }
  return res.json();
}

export async function fetchVendorAffiliateRecords(vendorId: string): Promise<any> {
  const res = await fetch(`${BASE_URL}/api/v1/vendors/${vendorId}/affiliates/records`, {
    headers: getAuthHeaders()
  });
  if (!res.ok) throw new Error('Failed to fetch affiliate records');
  return res.json();
}

export async function fetchVendorAffiliatePolicy(vendorId: string): Promise<any> {
  const res = await fetch(`${BASE_URL}/api/v1/vendors/${vendorId}/affiliates/policy`, {
    headers: getAuthHeaders()
  });
  if (!res.ok) throw new Error('Failed to fetch vendor affiliate policy');
  return res.json();
}

export async function updateVendorAffiliatePolicy(vendorId: string, policyPayload: any): Promise<any> {
  const res = await fetch(`${BASE_URL}/api/v1/vendors/${vendorId}/affiliates/policy`, {
    method: 'PUT',
    headers: getAuthHeaders(),
    body: JSON.stringify(policyPayload)
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || 'Failed to update vendor affiliate policy');
  }
  return res.json();
}

export async function evaluateVendorMultilegStrategy(vendorId: string, legs: any[], isVip: boolean = false): Promise<any> {
  const res = await fetch(`${BASE_URL}/api/v1/vendors/${vendorId}/evaluate-multileg-strategy`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ legs, is_vip: isVip })
  });
  if (!res.ok) throw new Error('Failed to evaluate multi-leg strategy');
  return res.json();
}

export async function fetchGlobalHubKnowledgeBase(): Promise<any> {
  const res = await fetch(`${BASE_URL}/api/v1/global-hub/affiliates/knowledge-base`, {
    headers: getAuthHeaders()
  });
  if (!res.ok) throw new Error('Failed to fetch Global Hub Knowledge Base');
  return res.json();
}

// --- DISPATCHER INBOUND PHONE INTAKE DESK API ---

export async function fetchQuickPhoneQuote(payload: any): Promise<any> {
  const res = await fetch(`${BASE_URL}/api/v1/dispatch/pricing/quick-quote`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(payload)
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || 'Failed to calculate quick quote');
  }
  return res.json();
}

export async function createManualPhoneBooking(payload: any): Promise<any> {
  const res = await fetch(`${BASE_URL}/api/v1/dispatch/bookings/phone-intake`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(payload)
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || 'Failed to create manual phone booking');
  }
  return res.json();
}

// --- AUTONOMOUS SOURCING & NEVER-MISS-A-JOB CONCIERGE API ---

export async function fetchSourcingOpportunities(): Promise<any[]> {
  const res = await fetch(`${BASE_URL}/api/v1/sourcing/opportunities`, {
    headers: getAuthHeaders()
  });
  if (!res.ok) throw new Error('Failed to fetch sourcing opportunities');
  return res.json();
}

export async function triggerManualSourcingRfp(payload: {
  city: string;
  pickup_address?: string;
  dropoff_address?: string;
  vehicle_class?: string;
  manager_cc_email?: string;
  manager_alert_phone?: string;
}): Promise<any> {
  const res = await fetch(`${BASE_URL}/api/v1/sourcing/trigger-rfp`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(payload)
  });
  if (!res.ok) throw new Error('Failed to trigger manual sourcing RFP');
  return res.json();
}

export async function fetchRfpDetailsByToken(token: string): Promise<any> {
  const res = await fetch(`${BASE_URL}/api/v1/sourcing/rfp-details/${token}`, {
    headers: getAuthHeaders()
  });
  if (!res.ok) throw new Error('Failed to fetch RFP details');
  return res.json();
}

export async function submitVendorQuoteApi(payload: {
  quote_token: string;
  quoted_payout_usd: number;
  vendor_company_name: string;
  dispatcher_or_driver_name: string;
  contact_phone: string;
  vehicle_model?: string;
  accepts_network_terms?: boolean;
}): Promise<any> {
  const res = await fetch(`${BASE_URL}/api/v1/sourcing/submit-quote`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(payload)
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || 'Failed to submit quote');
  }
  return res.json();
}

export async function managerPhoneOverrideApi(payload: {
  rfp_id: string;
  manager_name: string;
  vendor_contact_spoken_to: string;
  agreed_net_payout_usd: number;
  driver_name?: string;
  driver_phone?: string;
  notes?: string;
}): Promise<any> {
  const res = await fetch(`${BASE_URL}/api/v1/sourcing/manager-override`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(payload)
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || 'Failed to log manager phone override');
  }
  return res.json();
}

// --- ADDITIONAL FLEET HELPERS ---

export async function updateVendorVehicle(vendorId: string, vehicleId: string, payload: any): Promise<Vehicle> {
  const res = await fetch(`${BASE_URL}/api/v1/vendors/${vendorId}/fleet-inventory/${vehicleId}`, {
    method: 'PUT',
    headers: getAuthHeaders(),
    body: JSON.stringify(payload)
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || 'Failed to update vehicle in fleet');
  }
  return res.json();
}

export async function deleteVendorVehicle(vendorId: string, vehicleId: string): Promise<{ success: boolean; deleted_vehicle_id: string }> {
  const res = await fetch(`${BASE_URL}/api/v1/vendors/${vendorId}/fleet-inventory/${vehicleId}`, {
    method: 'DELETE',
    headers: getAuthHeaders()
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || 'Failed to delete vehicle from fleet');
  }
  return res.json();
}

export async function fetchAllVehicles(): Promise<Vehicle[]> {
  const res = await fetch(`${BASE_URL}/api/v1/fleet/vehicles`, {
    headers: getAuthHeaders()
  });
  if (!res.ok) throw new Error('Failed to fetch fleet vehicles');
  return res.json();
}

export async function fetchAllDrivers(): Promise<Driver[]> {
  const res = await fetch(`${BASE_URL}/api/v1/fleet/drivers`, {
    headers: getAuthHeaders()
  });
  if (!res.ok) throw new Error('Failed to fetch drivers');
  return res.json();
}

export async function uploadVehiclePhotoToS3(vendorId: string, payload: {
  base64_data: string;
  photo_type?: string;
  caption?: string;
  is_primary?: boolean;
  display_order?: number;
  ai_enhanced?: boolean;
  vehicle_id?: string;
}): Promise<any> {
  const res = await fetch(`${BASE_URL}/api/v1/vendors/${vendorId}/media/upload-s3`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(payload)
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || 'Failed to upload photo to S3');
  }
  return res.json();
}

export async function createVendorVehicle(vendorId: string, payload: any): Promise<Vehicle> {
  const res = await fetch(`${BASE_URL}/api/v1/vendors/${vendorId}/fleet-inventory`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(payload)
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(extractErrorMessage(err, 'Failed to add vehicle to fleet'));
  }
  return res.json();
}

export async function toggleVehicleNetwork(vendorId: string, vehicleId: string, participate: boolean): Promise<any> {
  const res = await fetch(`${BASE_URL}/api/v1/vendors/${vendorId}/fleet-inventory/${vehicleId}/toggle-network?participate=${participate}`, {
    method: 'PATCH',
    headers: getAuthHeaders()
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(extractErrorMessage(err, 'Failed to toggle network participation'));
  }
  return res.json();
}

export async function toggleVehicleActive(vendorId: string, vehicleId: string, isActive: boolean, reason?: string): Promise<any> {
  const query = reason ? `?is_active=${isActive}&reason=${encodeURIComponent(reason)}` : `?is_active=${isActive}`;
  const res = await fetch(`${BASE_URL}/api/v1/vendors/${vendorId}/fleet-inventory/${vehicleId}/toggle-active${query}`, {
    method: 'PATCH',
    headers: getAuthHeaders()
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(extractErrorMessage(err, 'Failed to update vehicle operational status'));
  }
  return res.json();
}

export async function exportPayrollCsvApi(vendorId: string, format: 'GUSTO' | 'ADP' | 'STANDARD' = 'GUSTO'): Promise<string> {
  const res = await fetch(`${BASE_URL}/api/v1/vendors/${vendorId}/payroll/export?format=${format}`, {
    headers: getAuthHeaders()
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(extractErrorMessage(err, 'Failed to export payroll CSV'));
  }
  return res.text();
}

export async function fetchPending24hDispatchAlerts(vendorId?: string): Promise<Dispatch24hAlert[]> {
  const url = vendorId 
    ? `${BASE_URL}/api/v1/dispatch/pending-24h-alerts?vendor_id=${encodeURIComponent(vendorId)}`
    : `${BASE_URL}/api/v1/dispatch/pending-24h-alerts`;
  const res = await fetch(url, {
    headers: getAuthHeaders()
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(extractErrorMessage(err, 'Failed to fetch 24h dispatch alerts'));
  }
  return res.json();
}

export async function assign24hChauffeur(tripId: string, driverId?: string, vehicleId?: string): Promise<any> {
  const res = await fetch(`${BASE_URL}/api/v1/dispatch/assign-24h-driver`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({
      trip_id: tripId,
      driver_id: driverId || null,
      vehicle_id: vehicleId || null
    })
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(extractErrorMessage(err, 'Failed to assign chauffeur in 24h window'));
  }
  return res.json();
}

export interface VendorStripeConnectStatus {
  vendor_id: string;
  vendor_name: string;
  stripe_account_id: string;
  payouts_enabled: boolean;
  charges_enabled: boolean;
  status: string;
  default_currency: string;
  bank_name?: string;
  bank_last4?: string;
  payout_frequency?: string;
  settlement_network?: string;
  legal_business_name?: string;
  ein_tax_id?: string;
  surety_policy?: string;
  requirements: string[];
}

export interface VendorPayoutLedgerRecord {
  id: string;
  desc: string;
  gross: number;
  net: number;
  bank: string;
  date: string;
  status: string;
  type: 'STOREFRONT' | 'FARM_IN' | 'FARM_OUT';
  timestamp?: number;
}

export interface VendorPayoutLedgerResponse {
  vendor_id: string;
  bank_name: string;
  bank_last4: string;
  currency: string;
  total_cleared_payouts_count: number;
  total_cleared_payouts_net: number;
  records: VendorPayoutLedgerRecord[];
}

export async function fetchVendorStripeStatus(vendorId: string): Promise<VendorStripeConnectStatus> {
  const res = await fetch(`${BASE_URL}/api/v1/vendors/${encodeURIComponent(vendorId)}/stripe/connect-status`, {
    headers: getAuthHeaders()
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(extractErrorMessage(err, 'Failed to fetch Stripe connect status'));
  }
  return res.json();
}

export async function fetchVendorPayoutsLedger(vendorId: string): Promise<VendorPayoutLedgerResponse> {
  const res = await fetch(`${BASE_URL}/api/v1/vendors/${encodeURIComponent(vendorId)}/payouts/ledger`, {
    headers: getAuthHeaders()
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(extractErrorMessage(err, 'Failed to fetch vendor payouts ledger'));
  }
  return res.json();
}

export async function createVendorStripeConnectLink(vendorId: string, returnUrl?: string): Promise<{
  success: boolean;
  vendor_id: string;
  stripe_account_id: string;
  onboarding_url: string;
  expires_at: number;
}> {
  const res = await fetch(`${BASE_URL}/api/v1/vendors/${encodeURIComponent(vendorId)}/stripe/connect-link`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ return_url: returnUrl })
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(extractErrorMessage(err, 'Failed to generate Stripe onboarding link'));
  }
  return res.json();
}

export async function createVendorStripeLoginLink(vendorId: string): Promise<{
  success: boolean;
  vendor_id: string;
  stripe_account_id: string;
  url: string;
}> {
  const res = await fetch(`${BASE_URL}/api/v1/vendors/${encodeURIComponent(vendorId)}/stripe/login-link`, {
    method: 'POST',
    headers: getAuthHeaders()
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(extractErrorMessage(err, 'Failed to generate Stripe dashboard login link'));
  }
  return res.json();
}

export const fetchVendorStripeLoginLink = createVendorStripeLoginLink;

// --- VENDOR SAAS SUBSCRIPTION & DUNNING ---

export async function fetchHubSubscriptionsOverview(): Promise<{
  total_mrr: number;
  active_subscribers: number;
  delinquent_subscribers: number;
  tiers_breakdown: Record<string, number>;
  subscriptions: Array<{
    vendor_id: string;
    vendor_name: string;
    tier: string;
    tier_name: string;
    monthly_fee: number;
    billing_status: string;
    dunning_stage: number;
    grace_period_expires_at: string | null;
    auto_cell_suspension: boolean;
    renews_at: string | null;
    pay_as_you_go_rate: number;
  }>;
}> {
  const res = await fetch(`${BASE_URL}/api/v1/hub/subscriptions/overview`, {
    headers: getAuthHeaders()
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(extractErrorMessage(err, 'Failed to fetch hub subscriptions overview'));
  }
  return res.json();
}

export async function fetchVendorSubscription(vendorId: string): Promise<{
  vendor_id: string;
  vendor_name: string;
  tier: string;
  tier_name: string;
  monthly_fee: number;
  billing_status: string;
  dunning_stage: number;
  grace_period_expires_at: string | null;
  auto_cell_suspension: boolean;
  renews_at: string | null;
  pay_as_you_go_rate: number;
  is_grace_period_active: boolean;
}> {
  const res = await fetch(`${BASE_URL}/api/v1/vendors/${encodeURIComponent(vendorId)}/subscription`, {
    headers: getAuthHeaders()
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(extractErrorMessage(err, 'Failed to fetch vendor subscription'));
  }
  return res.json();
}

export async function upgradeVendorSubscription(vendorId: string, planId: string, billingCycle: string = 'monthly'): Promise<any> {
  const res = await fetch(`${BASE_URL}/api/v1/vendors/${encodeURIComponent(vendorId)}/subscription/upgrade`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ plan_id: planId, billing_cycle: billingCycle })
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(extractErrorMessage(err, 'Failed to update subscription tier'));
  }
  return res.json();
}

export async function switchVendorToPayAsYouGo(vendorId: string): Promise<any> {
  const res = await fetch(`${BASE_URL}/api/v1/vendors/${encodeURIComponent(vendorId)}/subscription/pay-as-you-go`, {
    method: 'POST',
    headers: getAuthHeaders()
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(extractErrorMessage(err, 'Failed to switch to Pay-As-You-Go'));
  }
  return res.json();
}

export async function cancelVendorSubscription(vendorId: string, reason?: string): Promise<any> {
  const res = await fetch(`${BASE_URL}/api/v1/vendors/${encodeURIComponent(vendorId)}/subscription/cancel`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ reason: reason || 'Vendor canceled via dashboard' })
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(extractErrorMessage(err, 'Failed to cancel subscription'));
  }
  return res.json();
}

export async function requestVendorAccountDeletion(vendorId: string, reason?: string, confirmDeletion: boolean = true): Promise<any> {
  const res = await fetch(`${BASE_URL}/api/v1/vendors/${encodeURIComponent(vendorId)}/account/delete-request`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ reason: reason || 'Vendor requested account deletion', confirm_deletion: confirmDeletion })
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(extractErrorMessage(err, 'Failed to request account deletion'));
  }
  return res.json();
}

export async function createVendorBillingPortalSession(vendorId: string): Promise<{
  success: boolean;
  url: string;
  source?: string;
  message?: string;
}> {
  const res = await fetch(`${BASE_URL}/api/v1/vendors/${encodeURIComponent(vendorId)}/subscription/billing-portal`, {
    method: 'POST',
    headers: getAuthHeaders()
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(extractErrorMessage(err, 'Failed to create billing portal session'));
  }
  return res.json();
}

export async function triggerVendorDunningSimulation(vendorId: string): Promise<any> {
  const res = await fetch(`${BASE_URL}/api/v1/vendors/${encodeURIComponent(vendorId)}/subscription/simulate-dunning`, {
    method: 'POST',
    headers: getAuthHeaders()
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(extractErrorMessage(err, 'Failed to simulate dunning alert'));
  }
  return res.json();
}

export async function clearVendorDunning(vendorId: string): Promise<any> {
  const res = await fetch(`${BASE_URL}/api/v1/vendors/${encodeURIComponent(vendorId)}/subscription/clear-dunning`, {
    method: 'POST',
    headers: getAuthHeaders()
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(extractErrorMessage(err, 'Failed to clear dunning'));
  }
  return res.json();
}

export async function updateVendorChargingProfile(vendorId: string, profileData: {
  plan_name?: string;
  monthly_price_usd?: number;
  per_ride_commission_pct?: number;
  billing_terms?: string;
  contract_reference?: string;
  status?: string;
}): Promise<any> {
  const res = await fetch(`${BASE_URL}/api/v1/hub/vendors/${encodeURIComponent(vendorId)}/charging-profile`, {
    method: 'PUT',
    headers: getAuthHeaders(),
    body: JSON.stringify(profileData)
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(extractErrorMessage(err, 'Failed to update vendor charging profile'));
  }
  return res.json();
}

export async function sendVendorInvoice(vendorId: string, customAmountUsd?: number, note?: string): Promise<any> {
  const res = await fetch(`${BASE_URL}/api/v1/hub/vendors/${encodeURIComponent(vendorId)}/send-invoice`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ custom_amount_usd: customAmountUsd, note })
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(extractErrorMessage(err, 'Failed to send vendor invoice'));
  }
  return res.json();
}

export async function chargeVendorAutoPay(vendorId: string, amountUsd?: number): Promise<any> {
  const res = await fetch(`${BASE_URL}/api/v1/hub/vendors/${encodeURIComponent(vendorId)}/charge-auto-pay`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ amount_usd: amountUsd })
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(extractErrorMessage(err, 'Failed to charge vendor auto-pay'));
  }
  return res.json();
}

// --- SOVEREIGN CELL INFRASTRUCTURE CONTROLS ---

export async function stopSovereignCell(vendorId: string, reason?: string): Promise<any> {
  const res = await fetch(`${BASE_URL}/api/v1/infrastructure/cells/${encodeURIComponent(vendorId)}/stop`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ reason: reason || 'Hub admin paused sovereign cell' })
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(extractErrorMessage(err, 'Failed to stop sovereign cell'));
  }
  return res.json();
}

export async function startSovereignCell(vendorId: string): Promise<any> {
  const res = await fetch(`${BASE_URL}/api/v1/infrastructure/cells/${encodeURIComponent(vendorId)}/start`, {
    method: 'POST',
    headers: getAuthHeaders()
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(extractErrorMessage(err, 'Failed to start sovereign cell'));
  }
  return res.json();
}

export async function terminateSovereignCell(vendorId: string, reason?: string, deallocateDatabase: boolean = true): Promise<any> {
  const res = await fetch(`${BASE_URL}/api/v1/infrastructure/cells/${encodeURIComponent(vendorId)}/terminate`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ reason: reason || 'Hub admin terminated cell', deallocate_database: deallocateDatabase })
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(extractErrorMessage(err, 'Failed to terminate sovereign cell'));
  }
  return res.json();
}

// --- GLOBAL SUPPORT DESK AS A SERVICE (SUPPORT-AS-A-SERVICE) ---

export async function fetchSupportDeskPlans(): Promise<{ plans: any[]; global_config: any }> {
  const res = await fetch(`${BASE_URL}/api/v1/support-desk/plans`, {
    headers: getAuthHeaders()
  });
  if (!res.ok) throw new Error('Failed to fetch support desk plans');
  return res.json();
}

export async function updateSupportDeskPlan(planId: string, updates: any): Promise<any> {
  const res = await fetch(`${BASE_URL}/api/v1/support-desk/plans/${encodeURIComponent(planId)}`, {
    method: 'PUT',
    headers: getAuthHeaders(),
    body: JSON.stringify(updates)
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(extractErrorMessage(err, 'Failed to update support desk plan'));
  }
  return res.json();
}

export async function fetchSupportDeskConfig(): Promise<any> {
  const res = await fetch(`${BASE_URL}/api/v1/support-desk/config`, {
    headers: getAuthHeaders()
  });
  if (!res.ok) throw new Error('Failed to fetch support desk config');
  return res.json();
}

export async function updateSupportDeskConfig(updates: any): Promise<any> {
  const res = await fetch(`${BASE_URL}/api/v1/support-desk/config`, {
    method: 'PUT',
    headers: getAuthHeaders(),
    body: JSON.stringify(updates)
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(extractErrorMessage(err, 'Failed to update support desk payment config'));
  }
  return res.json();
}

export async function subscribeVendorSupportDesk(payload: { vendor_id: string; plan_id: string; custom_greeting_script?: string; forwarding_did?: string }): Promise<any> {
  const res = await fetch(`${BASE_URL}/api/v1/support-desk/subscribe`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(payload)
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(extractErrorMessage(err, 'Failed to subscribe to support desk'));
  }
  return res.json();
}

export async function fetchSupportDeskSubscriptions(): Promise<any[]> {
  const res = await fetch(`${BASE_URL}/api/v1/support-desk/subscriptions`, {
    headers: getAuthHeaders()
  });
  if (!res.ok) throw new Error('Failed to fetch support desk subscriptions');
  return res.json();
}

export async function fetchSupportTickets(filters?: { vendor_id?: string; status?: string; channel?: string }): Promise<any[]> {
  const params = new URLSearchParams();
  if (filters?.vendor_id) params.append('vendor_id', filters.vendor_id);
  if (filters?.status) params.append('status', filters.status);
  if (filters?.channel) params.append('channel', filters.channel);

  const res = await fetch(`${BASE_URL}/api/v1/support-desk/tickets?${params.toString()}`, {
    headers: getAuthHeaders()
  });
  if (!res.ok) throw new Error('Failed to fetch support tickets');
  return res.json();
}

export async function createSupportTicket(ticketData: any): Promise<any> {
  const res = await fetch(`${BASE_URL}/api/v1/support-desk/tickets`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(ticketData)
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(extractErrorMessage(err, 'Failed to create support ticket'));
  }
  return res.json();
}

export async function updateSupportTicket(ticketId: string, updates: any): Promise<any> {
  const res = await fetch(`${BASE_URL}/api/v1/support-desk/tickets/${encodeURIComponent(ticketId)}`, {
    method: 'PUT',
    headers: getAuthHeaders(),
    body: JSON.stringify(updates)
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(extractErrorMessage(err, 'Failed to update support ticket'));
  }
  return res.json();
}

export async function mutateSupportTicketBooking(ticketId: string, action: string, params: any = {}): Promise<any> {
  const res = await fetch(`${BASE_URL}/api/v1/support-desk/tickets/${encodeURIComponent(ticketId)}/mutate`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ action, params })
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(extractErrorMessage(err, 'Failed to execute support desk mutation'));
  }
  return res.json();
}

export async function fetchSupportDeskOverview(): Promise<any> {
  const res = await fetch(`${BASE_URL}/api/v1/support-desk/overview`, {
    headers: getAuthHeaders()
  });
  if (!res.ok) throw new Error('Failed to fetch support desk overview');
  return res.json();
}

export async function fetchRegionalStaffingPods(): Promise<RegionalStaffingPod[]> {
  const res = await fetch(`${BASE_URL}/api/v1/support-desk/pods`, {
    headers: getAuthHeaders()
  });
  if (!res.ok) throw new Error('Failed to fetch regional staffing pods');
  return res.json();
}

export async function resolveInboundVoiceCall(payload: { caller_phone: string; dialed_number: string; extension_pin?: string }): Promise<InboundVoiceCallResolution> {
  const res = await fetch(`${BASE_URL}/api/v1/support-desk/voice/resolve-inbound`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(payload)
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(extractErrorMessage(err, 'Failed to resolve inbound voice call'));
  }
  return res.json();
}

export async function evaluateAutomatedSlaTriggers(): Promise<{ success: boolean; escalations_count: number; escalations: any[] }> {
  const res = await fetch(`${BASE_URL}/api/v1/support-desk/sla/evaluate-triggers`, {
    method: 'POST',
    headers: getAuthHeaders()
  });
  if (!res.ok) throw new Error('Failed to evaluate SLA escalation triggers');
  return res.json();
}

// --- HUB HELICOPTER GOVERNANCE & COMPLIANCE APIS ---

export async function fetchHelicopterHubConfig(): Promise<any> {
  const res = await fetch(`${BASE_URL}/api/v1/hub/helicopter-config`, {
    headers: getAuthHeaders()
  });
  if (!res.ok) throw new Error('Failed to fetch Helicopter Hub config');
  return res.json();
}

export async function updateHelicopterHubConfig(dto: any): Promise<any> {
  const res = await fetch(`${BASE_URL}/api/v1/hub/helicopter-config`, {
    method: 'PUT',
    headers: getAuthHeaders(),
    body: JSON.stringify(dto)
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(extractErrorMessage(err, 'Failed to update Helicopter Hub config'));
  }
  return res.json();
}

export async function fetchDomesticHeliports(country?: string): Promise<any[]> {
  const url = country ? `${BASE_URL}/api/v1/hub/heliports?country=${country}` : `${BASE_URL}/api/v1/hub/heliports`;
  const res = await fetch(url, {
    headers: getAuthHeaders()
  });
  if (!res.ok) throw new Error('Failed to fetch domestic heliports');
  return res.json();
}

export async function validateHelicopterLeg(payload: {
  origin_address: string;
  origin_country?: string;
  destination_address: string;
  destination_country?: string;
  total_itinerary_legs?: number;
  is_fixed_wing?: boolean;
}): Promise<any> {
  const res = await fetch(`${BASE_URL}/api/v1/hub/helicopter/validate`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(payload)
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(extractErrorMessage(err, 'Failed to validate helicopter leg'));
  }
  return res.json();
}

// --- CHAUFFEUR CREDENTIAL VAULT (GAP-D1) ---

export async function fetchDriverDocuments(driverId: string): Promise<any> {
  const res = await fetch(`${BASE_URL}/api/v1/drivers/${driverId}/documents`, {
    headers: getAuthHeaders()
  });
  if (!res.ok) throw new Error('Failed to fetch driver credentials');
  return res.json();
}

export async function uploadDriverDocument(
  driverId: string,
  payload: {
    vendor_id: string;
    document_type: string;
    document_name: string;
    base64_data: string;
    expiry_date?: string;
    notes?: string;
  }
): Promise<any> {
  const res = await fetch(`${BASE_URL}/api/v1/drivers/${driverId}/documents/upload`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(payload)
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(extractErrorMessage(err, 'Failed to upload driver credential document'));
  }
  return res.json();
}












