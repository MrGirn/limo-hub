import {
  Quote, Booking, Vehicle, Driver, Trip, Incident, SystemSummary,
  ServiceType, VehicleClass, BookingParty, TripStatus, Vendor,
  UserSession, ActorPersonaOption, VendorPortalConfig, SystemRuntimeMode,
  TeamMember, CreateTeamMemberPayload, UpdateTeamMemberPayload, RoleMatrixResponse,
  CertifiedAffiliatePartner, AffiliateRecommendation, Dispatch24hAlert,
  RegionalStaffingPod, InboundVoiceCallResolution, VehicleOption
} from './types';


export const BASE_URL = '';

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

export function clearAuthToken() {
  setAuthToken(null, null);
  localStorage.removeItem('limo_auth_token');
  localStorage.removeItem('limo_actor_role');
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

export async function loginApi(email: string, password?: string, role?: string, vendor_id?: string): Promise<{ user: UserSession; token: string }> {
  const res = await fetch(`${BASE_URL}/api/v1/auth/login`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({
      email,
      password,
      role: role || 'ROLE_CUSTOMER',
      vendor_id
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

export async function registerApi(params: {
  email: string;
  full_name: string;
  password?: string;
  phone?: string;
  role?: string;
  vendor_id?: string;
  company_name?: string;
}): Promise<{ user: UserSession; token: string }> {
  const res = await fetch(`${BASE_URL}/api/v1/auth/register`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(params)
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(extractErrorMessage(err, 'Registration failed'));
  }
  const data = await res.json();
  setAuthToken(data.token, data.user.role);
  return data;
}

export async function logoutApi(): Promise<{ success: boolean; message: string }> {
  try {
    const res = await fetch(`${BASE_URL}/api/v1/auth/logout`, {
      method: 'POST',
      headers: getAuthHeaders()
    });
    if (res.ok) {
      const data = await res.json();
      clearAuthToken();
      return data;
    }
  } catch (err) {
    console.warn('Logout API error:', err);
  }
  clearAuthToken();
  return { success: true, message: 'Logged out successfully' };
}

export async function oauthLoginApi(params: {
  provider: 'apple' | 'google' | 'email' | 'magic-link' | 'corporate' | 'passkey' | 'password' | string;
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
    throw new Error(extractErrorMessage(err, `${params.provider} authentication failed`));
  }
  const data = await res.json();
  setAuthToken(data.token, data.user.role);
  return data;
}

export async function passkeyRegisterChallengeApi(params: {
  email: string;
  full_name?: string;
  role?: string;
  vendor_id?: string;
}): Promise<any> {
  const res = await fetch(`${BASE_URL}/api/v1/auth/passkey/register-challenge`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(params)
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(extractErrorMessage(err, 'Failed to generate Passkey registration challenge'));
  }
  return res.json();
}

export async function passkeyVerifyRegistrationApi(params: {
  email: string;
  full_name?: string;
  role?: string;
  vendor_id?: string;
  credential_id: string;
  raw_id?: string;
  client_data_json?: string;
  attestation_object?: string;
}): Promise<{ user: UserSession; token: string }> {
  const res = await fetch(`${BASE_URL}/api/v1/auth/passkey/verify-registration`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(params)
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(extractErrorMessage(err, 'Passkey registration verification failed'));
  }
  const data = await res.json();
  setAuthToken(data.token, data.user.role);
  return data;
}

export async function passkeyAuthChallengeApi(params: {
  email?: string;
  vendor_id?: string;
}): Promise<any> {
  const res = await fetch(`${BASE_URL}/api/v1/auth/passkey/auth-challenge`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(params)
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(extractErrorMessage(err, 'Failed to generate Passkey auth challenge'));
  }
  return res.json();
}

export async function passkeyVerifyAuthApi(params: {
  email: string;
  credential_id: string;
  authenticator_data?: string;
  client_data_json?: string;
  signature?: string;
  user_handle?: string;
  role?: string;
  vendor_id?: string;
}): Promise<{ user: UserSession; token: string }> {
  const res = await fetch(`${BASE_URL}/api/v1/auth/passkey/verify-auth`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(params)
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(extractErrorMessage(err, 'Biometric Passkey sign-in verification failed'));
  }
  const data = await res.json();
  setAuthToken(data.token, data.user.role);
  return data;
}

export async function triggerInquiryDripApi(inquiryId: string, params?: { drip_action?: string; custom_note?: string }): Promise<any> {
  const res = await fetch(`${BASE_URL}/api/v1/inquiries/${inquiryId}/trigger-drip`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(params || {})
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(extractErrorMessage(err, 'Failed to trigger follow-up drip'));
  }
  return res.json();
}

export async function convertInquiryToBookingApi(inquiryId: string, params?: any): Promise<any> {
  const res = await fetch(`${BASE_URL}/api/v1/inquiries/${inquiryId}/convert-booking`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(params || {})
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(extractErrorMessage(err, 'Failed to convert inquiry to booking'));
  }
  return res.json();
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

export async function cancelBookingApi(bookingId: string, payload: string | {
  reason?: string;
  cancelled_by?: string;
  refund_requested?: boolean;
} = 'Customer requested cancellation'): Promise<any> {
  const bodyPayload = typeof payload === 'string' ? { reason: payload } : payload;
  const res = await fetch(`${BASE_URL}/api/v1/bookings/${bookingId}/cancel`, {
    method: 'POST',
    headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify(bodyPayload)
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

export async function fetchSimulationScenarios(vendorId?: string): Promise<any[]> {
  const url = vendorId 
    ? `${BASE_URL}/api/v1/vendors/${vendorId}/simulation-scenarios`
    : `${BASE_URL}/api/v1/pricing/simulation-scenarios`;
  const res = await fetch(url, {
    headers: getAuthHeaders()
  });
  if (!res.ok) {
    // Fallback to global scenarios
    const fallbackRes = await fetch(`${BASE_URL}/api/v1/pricing/simulation-scenarios`, { headers: getAuthHeaders() }).catch(() => null);
    if (fallbackRes && fallbackRes.ok) return fallbackRes.json();
    return [];
  }
  return res.json();
}

export async function saveSimulationScenario(scenario: any): Promise<any> {
  const res = await fetch(`${BASE_URL}/api/v1/pricing/simulation-scenarios`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(scenario)
  });
  if (!res.ok) throw new Error('Failed to save simulation scenario');
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
  const res = await fetch(`${BASE_URL}/api/v1/system/runtime-mode`, {
    headers: getAuthHeaders()
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(extractErrorMessage(err, 'Failed to fetch runtime mode'));
  }
  return res.json();
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

export async function fetchVehicleOptions(vendorId?: string): Promise<VehicleOption[]> {
  const url = vendorId 
    ? `${BASE_URL}/api/v1/fleet/vehicle-options?vendor_id=${encodeURIComponent(vendorId)}` 
    : `${BASE_URL}/api/v1/fleet/vehicle-options`;
  const res = await fetch(url, {
    method: 'GET',
    headers: getAuthHeaders()
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(extractErrorMessage(err, 'Failed to load vehicle options from database'));
  }
  const data = await res.json();
  return data.map((item: any) => ({
    id: item.id,
    tenant_id: item.tenant_id,
    vendor_id: item.vendor_id,
    type: item.type as VehicleClass,
    categoryName: item.categoryName || 'SEDAN',
    title: item.title,
    subtitle: item.subtitle,
    models: item.models,
    makeModel: item.makeModel || `${item.title} (${item.models})`,
    year: item.year || '2025 Fleet Model',
    tagline: item.tagline || '',
    pax: item.pax,
    luggage: item.luggage,
    multiplier: item.multiplier || 1.0,
    features: item.features || [],
    badge: item.badge,
    badgeColor: item.badgeColor || '#10253F',
    desc: item.desc || '',
    specs: item.specs || {},
    amenities: item.amenities || [],
    photoUrl: item.photo_url || item.photoUrl,
    photos: item.photos || (item.photo_url ? [{ url: item.photo_url, caption: item.title, viewType: 'EXTERIOR' }] : []),
    fallbackIcon: item.fallback_icon || item.fallbackIcon || 'SEDAN',
    sort_order: item.sort_order || 0,
    is_active: item.is_active !== undefined ? item.is_active : true
  }));
}

// ==============================================================================
// CENTRAL SUPPORT, TICKETING & 2-TIER AI RESOLUTION API
// ==============================================================================

export interface TicketMessage {
  id: string;
  ticket_id: string;
  sender_type: 'CUSTOMER' | 'AI_ASSISTANT' | 'VENDOR_DISPATCH' | 'HUB_SUPERADMIN';
  sender_name: string;
  sender_id?: string;
  message_body: string;
  is_internal_note: boolean;
  attachments_json?: string;
  created_at: string;
}

export interface SupportTicket {
  id: string;
  ticket_number: string;
  tenant_id: string;
  vendor_id: string;
  vendor_name: string;
  category: string;
  customer_id?: string;
  customer_name: string;
  customer_phone: string;
  customer_email?: string;
  booking_id?: string;
  channel: string;
  priority: 'URGENT_LIVE_RIDE' | 'HIGH' | 'NORMAL' | 'LOW';
  status: 'OPEN' | 'AI_RESOLVED' | 'ASSIGNED_TO_VENDOR' | 'ESCALATED_TO_HUB' | 'PENDING_CUSTOMER' | 'RESOLVED' | 'CLOSED';
  subject: string;
  description: string;
  assigned_agent?: string;
  assigned_to: string;
  sla_minutes: number;
  sla_deadline_utc?: string;
  is_sla_breached: boolean;
  time_remaining_minutes?: number;
  resolution_notes?: string;
  flight_number?: string;
  created_at: string;
  updated_at?: string;
  resolved_at?: string;
  messages: TicketMessage[];
  booking_context?: {
    id: string;
    status: string;
    pickup_address?: string;
    dropoff_address?: string;
    pickup_time_utc?: string;
    vehicle_class?: string;
    total_amount?: number;
    flight_number?: string;
  };
}

export async function createSupportTicketApi(payload: {
  vendor_id?: string;
  customer_name: string;
  customer_phone: string;
  customer_email?: string;
  booking_id?: string;
  category: string;
  priority?: string;
  subject: string;
  message: string;
  channel?: string;
}): Promise<SupportTicket> {
  const res = await fetch(`${BASE_URL}/api/v1/support/tickets`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.detail || errorData.message || 'Failed to submit support ticket');
  }
  return res.json();
}

export async function lookupSupportTicketsApi(query: string): Promise<SupportTicket[]> {
  const res = await fetch(`${BASE_URL}/api/v1/support/tickets/lookup?query=${encodeURIComponent(query)}`);
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.detail || errorData.message || 'Failed to lookup support tickets');
  }
  return res.json();
}

export async function fetchSupportTicketApi(ticketId: string): Promise<SupportTicket> {
  const res = await fetch(`${BASE_URL}/api/v1/support/tickets/${encodeURIComponent(ticketId)}`);
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.detail || errorData.message || 'Ticket not found');
  }
  return res.json();
}

export async function addTicketMessageApi(ticketId: string, payload: {
  sender_type: string;
  sender_name: string;
  sender_id?: string;
  message_body: string;
  is_internal_note?: boolean;
}): Promise<TicketMessage> {
  const res = await fetch(`${BASE_URL}/api/v1/support/tickets/${ticketId}/messages`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.detail || errorData.message || 'Failed to send message');
  }
  return res.json();
}

export async function fetchVendorSupportTicketsApi(vendorId: string, status?: string): Promise<SupportTicket[]> {
  const q = status && status !== 'ALL' ? `?status=${encodeURIComponent(status)}` : '';
  const res = await fetch(`${BASE_URL}/api/v1/vendors/${vendorId}/support/tickets${q}`);
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.detail || errorData.message || 'Failed to fetch vendor support tickets');
  }
  return res.json();
}

export async function replyVendorTicketApi(vendorId: string, ticketId: string, payload: {
  sender_name: string;
  message_body: string;
  is_internal_note?: boolean;
}): Promise<TicketMessage> {
  const res = await fetch(`${BASE_URL}/api/v1/vendors/${vendorId}/support/tickets/${ticketId}/reply`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.detail || errorData.message || 'Failed to post reply');
  }
  return res.json();
}

export async function resolveVendorTicketApi(vendorId: string, ticketId: string, payload: {
  resolution_notes: string;
  resolved_by: string;
}): Promise<SupportTicket> {
  const res = await fetch(`${BASE_URL}/api/v1/vendors/${vendorId}/support/tickets/${ticketId}/resolve`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.detail || errorData.message || 'Failed to resolve ticket');
  }
  return res.json();
}

export async function fetchGlobalHubSupportTicketsApi(status?: string, filterBreached?: boolean): Promise<SupportTicket[]> {
  const params = new URLSearchParams();
  if (status && status !== 'ALL') params.append('status', status);
  if (filterBreached) params.append('filter_breached', 'true');
  const qs = params.toString() ? `?${params.toString()}` : '';

  const res = await fetch(`${BASE_URL}/api/v1/global-hub/support/tickets${qs}`);
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.detail || errorData.message || 'Failed to fetch hub support tickets');
  }
  return res.json();
}

export async function escalateTicketToGlobalHubApi(ticketId: string, reason: string): Promise<SupportTicket> {
  const res = await fetch(`${BASE_URL}/api/v1/global-hub/support/tickets/${ticketId}/escalate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ reason, escalated_by: 'Dispatcher' })
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.detail || errorData.message || 'Failed to escalate ticket');
  }
  return res.json();
}

// --- LIVE CHAUFFEUR GPS TELEMETRY & TRACKING API ---

export interface LiveTrackingTelemetry {
  lat: number;
  lng: number;
  speed_mph: number;
  heading: number;
  dist_miles: number;
  eta_minutes: number;
  updated_at: string;
}

export interface LiveTrackingResponse {
  success: boolean;
  trip_id: string;
  booking_id: string;
  status: string;
  driver: {
    id: string;
    name: string;
    phone: string;
    badge_id: string;
    rating: number;
    photo_url?: string;
  };
  vehicle: {
    model: string;
    license_plate: string;
    color: string;
    class: string;
  };
  telemetry: LiveTrackingTelemetry;
  route: {
    pickup_address: string;
    dropoff_address: string;
    pickup_lat?: number;
    pickup_lng?: number;
    flight_number?: string;
  };
}

export async function fetchTripLiveTrackingApi(tripId: string): Promise<LiveTrackingResponse> {
  const res = await fetch(`${BASE_URL}/api/v1/trips/${tripId}/live-tracking`);
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.detail || errorData.message || 'Failed to fetch live trip tracking');
  }
  return res.json();
}

export async function fetchBookingLiveTrackingApi(bookingId: string): Promise<LiveTrackingResponse> {
  const res = await fetch(`${BASE_URL}/api/v1/bookings/${bookingId}/live-tracking`);
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.detail || errorData.message || 'Failed to fetch live booking tracking');
  }
  return res.json();
}

export async function sendDriverLocationPingApi(payload: {
  driver_id: string;
  trip_id?: string;
  vehicle_id?: string;
  latitude: number;
  longitude: number;
  speed_mph?: number;
  heading_degrees?: number;
}): Promise<any> {
  const res = await fetch(`${BASE_URL}/api/v1/telemetry/driver-location`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.detail || errorData.message || 'Failed to stream driver telemetry');
  }
  return res.json();
}

export async function fetchBookingMasterInvoiceHtml(bookingId: string): Promise<string> {
  const res = await fetch(`${BASE_URL}/api/v1/bookings/${bookingId}/master-invoice/html`, {
    headers: getAuthHeaders()
  });
  if (!res.ok) throw new Error('Failed to fetch master invoice HTML');
  return res.text();
}

export async function fetchBookingMasterReceiptHtml(bookingId: string): Promise<string> {
  const res = await fetch(`${BASE_URL}/api/v1/bookings/${bookingId}/master-receipt/html`, {
    headers: getAuthHeaders()
  });
  if (!res.ok) throw new Error('Failed to fetch master receipt HTML');
  return res.text();
}

export async function fetchBookingPodApi(bookingId: string): Promise<any> {
  const res = await fetch(`${BASE_URL}/api/v1/dispatch/bookings/${bookingId}/pod`, {
    headers: getAuthHeaders()
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.detail || errorData.message || 'Failed to fetch Proof of Delivery');
  }
  return res.json();
}

export async function requestBookingIncidentalsApi(bookingId: string, payload: {
  wait_minutes?: number;
  tolls_usd?: number;
  stops_count?: number;
  notes?: string;
}): Promise<any> {
  const res = await fetch(`${BASE_URL}/api/v1/dispatch/bookings/${bookingId}/pod/incidentals/request`, {
    method: 'POST',
    headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.detail || errorData.message || 'Failed to request incidentals');
  }
  return res.json();
}

export async function approveBookingIncidentalsApi(bookingId: string, payload?: {
  approved_amount_usd?: number;
  approval_notes?: string;
}): Promise<any> {
  const res = await fetch(`${BASE_URL}/api/v1/dispatch/bookings/${bookingId}/pod/incidentals/approve`, {
    method: 'POST',
    headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify(payload || {})
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.detail || errorData.message || 'Failed to approve incidentals');
  }
  return res.json();
}

export async function disputeBookingDeliveryApi(bookingId: string, payload: {
  dispute_reason: string;
  requested_remedy?: string;
}): Promise<any> {
  const res = await fetch(`${BASE_URL}/api/v1/dispatch/bookings/${bookingId}/pod/dispute`, {
    method: 'POST',
    headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.detail || errorData.message || 'Failed to submit delivery dispute');
  }
  return res.json();
}

export async function processBookingPaymentOperationsApi(bookingId: string, payload?: {
  tip_amount_usd?: number;
  dispatcher_notes?: string;
}): Promise<any> {
  const res = await fetch(`${BASE_URL}/api/v1/dispatch/bookings/${bookingId}/process-payment`, {
    method: 'POST',
    headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify(payload || {})
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.detail || errorData.message || 'Failed to process payment capture');
  }
  return res.json();
}

export async function processBookingRefundOperationsApi(bookingId: string, payload: {
  refund_amount_usd: number;
  reason: string;
  is_full_refund?: boolean;
}): Promise<any> {
  const res = await fetch(`${BASE_URL}/api/v1/dispatch/bookings/${bookingId}/refund`, {
    method: 'POST',
    headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.detail || errorData.message || 'Failed to process refund');
  }
  return res.json();
}

export async function acceptDriverOfferApi(offerId: string, driverId: string): Promise<any> {
  const res = await fetch(`${BASE_URL}/api/v1/driver/offers/${offerId}/accept`, {
    method: 'POST',
    headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify({ driver_id: driverId })
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.detail || errorData.message || 'Failed to accept driver offer');
  }
  return res.json();
}

export async function uploadDriverDocumentApi(driverId: string, payload: {
  document_type: string;
  document_name: string;
  expiry_date?: string;
  file_base64: string;
}): Promise<any> {
  const res = await fetch(`${BASE_URL}/api/v1/drivers/${driverId}/documents/upload`, {
    method: 'POST',
    headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.detail || errorData.message || 'Failed to upload driver credential');
  }
  return res.json();
}

export async function updateDriverCompensationModelApi(vendorId: string, driverId: string, payload: {
  model_type: 'HOURLY' | 'SPLIT_PERCENTAGE' | 'COMMISSION_FLAT';
  hourly_rate_usd?: number;
  split_percentage?: number;
  minimum_trip_payout_usd?: number;
}): Promise<any> {
  const res = await fetch(`${BASE_URL}/api/v1/vendors/${vendorId}/drivers/${driverId}/compensation-model`, {
    method: 'POST',
    headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.detail || errorData.message || 'Failed to update compensation model');
  }
  return res.json();
}

// =========================================================================
// SPRINT 1: CUSTOMER SUPPORT, TICKETING & 2-TIER RESOLUTION ENGINE API
// =========================================================================

export async function createCustomerSupportTicketApi(payload: {
  customer_name: string;
  phone: string;
  email?: string;
  category: string;
  subject: string;
  message: string;
  booking_id?: string;
  flight_number?: string;
  vendor_id?: string;
}): Promise<any> {
  const res = await fetch(`${BASE_URL}/api/v1/support/tickets`, {
    method: 'POST',
    headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || 'Failed to submit customer support ticket');
  }
  return res.json();
}

export async function lookupCustomerSupportTicketsApi(query: string): Promise<any[]> {
  const res = await fetch(`${BASE_URL}/api/v1/support/tickets/lookup?query=${encodeURIComponent(query)}`, {
    headers: getAuthHeaders()
  });
  if (!res.ok) throw new Error('Failed to lookup customer support tickets');
  return res.json();
}

export async function getSupportTicketDetailsApi(ticketId: string): Promise<any> {
  const res = await fetch(`${BASE_URL}/api/v1/support/tickets/${ticketId}`, {
    headers: getAuthHeaders()
  });
  if (!res.ok) throw new Error('Failed to fetch support ticket details');
  return res.json();
}

export async function addSupportTicketMessageApi(ticketId: string, payload: {
  sender_type: string;
  sender_name: string;
  message_body: string;
  sender_id?: string;
  is_internal_note?: boolean;
}): Promise<any> {
  const res = await fetch(`${BASE_URL}/api/v1/support/tickets/${ticketId}/messages`, {
    method: 'POST',
    headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || 'Failed to send message');
  }
  return res.json();
}



export async function updateSupportDeskPlanApi(planId: string, payload: {
  monthly_price_usd?: number;
  included_minutes?: number;
  overage_rate_per_min?: number;
  features?: string[];
}): Promise<any> {
  const res = await fetch(`${BASE_URL}/api/v1/support-desk/plans/${planId}`, {
    method: 'PUT',
    headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || 'Failed to update support desk plan');
  }
  return res.json();
}

export async function evaluateSlaTriggersApi(): Promise<any> {
  const res = await fetch(`${BASE_URL}/api/v1/support-desk/sla/evaluate-triggers`, {
    method: 'POST',
    headers: getAuthHeaders()
  });
  if (!res.ok) throw new Error('Failed to evaluate SLA triggers');
  return res.json();
}

export async function mutateTicketBookingActionApi(ticketId: string, payload: {
  action: 'RESCHEDULE_PICKUP' | 'CANCEL_AND_RELEASE_ESCROW' | 'SEND_MASKED_DRIVER_SMS';
  params?: Record<string, any>;
}): Promise<any> {
  const res = await fetch(`${BASE_URL}/api/v1/support-desk/tickets/${ticketId}/mutate`, {
    method: 'POST',
    headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || 'Failed to execute ticket booking mutation');
  }
  return res.json();
}

// =========================================================================
// SPRINT 1: STRIPE CONNECT, SUBSCRIPTION & BILLING PORTAL API
// =========================================================================

export async function fetchVendorStripeConnectStatusApi(vendorId: string): Promise<any> {
  const res = await fetch(`${BASE_URL}/api/v1/vendors/${vendorId}/stripe/connect-status`, {
    headers: getAuthHeaders()
  });
  if (!res.ok) throw new Error('Failed to fetch Stripe connect status');
  return res.json();
}

export async function switchVendorPayAsYouGoApi(vendorId: string): Promise<any> {
  const res = await fetch(`${BASE_URL}/api/v1/vendors/${vendorId}/subscription/pay-as-you-go`, {
    method: 'POST',
    headers: getAuthHeaders()
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || 'Failed to switch to pay-as-you-go');
  }
  return res.json();
}

export async function upgradeVendorSubscriptionApi(vendorId: string, planTier: string): Promise<any> {
  const res = await fetch(`${BASE_URL}/api/v1/vendors/${vendorId}/subscription/upgrade`, {
    method: 'POST',
    headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify({ tier: planTier })
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || 'Failed to upgrade subscription');
  }
  return res.json();
}

export async function cancelVendorSubscriptionApi(vendorId: string, reason?: string): Promise<any> {
  const res = await fetch(`${BASE_URL}/api/v1/vendors/${vendorId}/subscription/cancel`, {
    method: 'POST',
    headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify({ reason: reason || 'Vendor requested subscription termination' })
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || 'Failed to cancel subscription');
  }
  return res.json();
}

export async function simulateVendorDunningAlertApi(vendorId: string): Promise<any> {
  const res = await fetch(`${BASE_URL}/api/v1/vendors/${vendorId}/subscription/simulate-dunning`, {
    method: 'POST',
    headers: getAuthHeaders()
  });
  if (!res.ok) throw new Error('Failed to simulate dunning alert');
  return res.json();
}

export async function clearVendorDunningAlertApi(vendorId: string): Promise<any> {
  const res = await fetch(`${BASE_URL}/api/v1/vendors/${vendorId}/subscription/clear-dunning`, {
    method: 'POST',
    headers: getAuthHeaders()
  });
  if (!res.ok) throw new Error('Failed to clear dunning alert');
  return res.json();
}

// =========================================================================
// SPRINT 2: VOICE AI TELEPHONY, 10DLC COMPLIANCE & BRANDING STUDIO API
// =========================================================================

export async function simulateVoiceCallApi(payload: {
  caller_phone?: string;
  dialed_number?: string;
  prompt_override?: string;
}): Promise<any> {
  const res = await fetch(`${BASE_URL}/api/v1/voice/simulate-call`, {
    method: 'POST',
    headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || 'Failed to simulate voice call');
  }
  return res.json();
}

export async function fetchVoiceSessionApi(sessionId: string): Promise<any> {
  const res = await fetch(`${BASE_URL}/api/v1/voice/session/${sessionId}`, {
    headers: getAuthHeaders()
  });
  if (!res.ok) throw new Error('Failed to fetch voice session');
  return res.json();
}

export async function executeVoiceCallIntakeApi(vendorId: string, payload: any): Promise<any> {
  const res = await fetch(`${BASE_URL}/api/v1/vendors/${vendorId}/voice-call-intake`, {
    method: 'POST',
    headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || 'Failed to execute voice call intake');
  }
  return res.json();
}

export async function processInboundSmsComplianceApi(vendorId: string, payload: {
  from_number?: string;
  sender_phone?: string;
  body?: string;
  text_body?: string;
}): Promise<any> {
  const dto = {
    sender_phone: payload.sender_phone || payload.from_number || '',
    text_body: payload.text_body || payload.body || ''
  };
  const res = await fetch(`${BASE_URL}/api/v1/vendors/${vendorId}/telecom-compliance/inbound-sms`, {
    method: 'POST',
    headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify(dto)
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || 'Failed to process compliance SMS');
  }
  return res.json();
}

export async function exportCorporateInvoiceCsvApi(invoiceId: string): Promise<string> {
  const res = await fetch(`${BASE_URL}/api/v1/corporate/invoices/${invoiceId}/csv`, {
    headers: getAuthHeaders()
  });
  if (!res.ok) throw new Error('Failed to export invoice CSV');
  return res.text();
}

export async function sendVendorInvoiceFromHubApi(vendorId: string, payload: {
  recipient_email: string;
  invoice_id: string;
  amount_usd: number;
}): Promise<any> {
  const res = await fetch(`${BASE_URL}/api/v1/hub/vendors/${vendorId}/send-invoice`, {
    method: 'POST',
    headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || 'Failed to send vendor invoice from Hub');
  }
  return res.json();
}

export async function sendVendorTripInvoiceEmailApi(vendorId: string, payload: {
  recipient_email: string;
  booking_id: string;
}): Promise<any> {
  const res = await fetch(`${BASE_URL}/api/v1/vendor-cell/${vendorId}/email/send-invoice`, {
    method: 'POST',
    headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || 'Failed to send trip invoice email');
  }
  return res.json();
}

export async function fetchHubHelicopterConfigApi(): Promise<any> {
  const res = await fetch(`${BASE_URL}/api/v1/hub/helicopter-config`, {
    headers: getAuthHeaders()
  });
  if (!res.ok) throw new Error('Failed to fetch helicopter config');
  return res.json();
}

export async function updateHubHelicopterConfigApi(config: any): Promise<any> {
  const res = await fetch(`${BASE_URL}/api/v1/hub/helicopter-config`, {
    method: 'PUT',
    headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify(config)
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || 'Failed to update helicopter config');
  }
  return res.json();
}

export async function listVendorCellsApi(): Promise<any[]> {
  const res = await fetch(`${BASE_URL}/api/v1/vendor-cell/cells`, {
    headers: getAuthHeaders()
  });
  if (!res.ok) throw new Error('Failed to list vendor cells');
  return res.json();
}

export async function toggleVendorCellCircuitBreakerApi(vendorId: string, tripBreaker: boolean, reason?: string): Promise<any> {
  const res = await fetch(`${BASE_URL}/api/v1/vendor-cell/${vendorId}/circuit-breaker`, {
    method: 'POST',
    headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify({ trip_breaker: tripBreaker, reason })
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || 'Failed to toggle cell circuit breaker');
  }
  return res.json();
}

export async function syncVendorOutboxToGlobalHubApi(vendorId: string): Promise<any> {
  const res = await fetch(`${BASE_URL}/api/v1/vendor-cell/${vendorId}/outbox/sync`, {
    method: 'POST',
    headers: getAuthHeaders()
  });
  if (!res.ok) throw new Error('Failed to sync vendor outbox');
  return res.json();
}

export async function fetchVendorCellStatusApi(vendorId: string): Promise<any> {
  const res = await fetch(`${BASE_URL}/api/v1/vendor-cell/${vendorId}/status`, {
    headers: getAuthHeaders()
  });
  if (!res.ok) throw new Error('Failed to fetch cell status');
  return res.json();
}

export async function generateVendorPortalTokenApi(vendorId: string): Promise<{ token: string; expires_at: string }> {
  const res = await fetch(`${BASE_URL}/api/v1/vendor-portal/token/${vendorId}`, {
    headers: getAuthHeaders()
  });
  if (!res.ok) throw new Error('Failed to generate vendor token');
  return res.json();
}

export async function resolveVendorPortalTokenApi(token: string): Promise<any> {
  const res = await fetch(`${BASE_URL}/api/v1/vendor-portal/resolve-token?token=${encodeURIComponent(token)}`);
  if (!res.ok) throw new Error('Failed to resolve vendor token');
  return res.json();
}

export async function fetchVendorBrandingSettingsApi(vendorId: string): Promise<any> {
  const res = await fetch(`${BASE_URL}/api/v1/vendors/${vendorId}/branding`, {
    headers: getAuthHeaders()
  });
  if (!res.ok) throw new Error('Failed to fetch vendor branding');
  return res.json();
}

export async function updateVendorBrandingSettingsApi(vendorId: string, payload: any): Promise<any> {
  const res = await fetch(`${BASE_URL}/api/v1/vendors/${vendorId}/branding`, {
    method: 'PUT',
    headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || 'Failed to update vendor branding');
  }
  return res.json();
}

export async function fetchVendorIntakeConfigApi(vendorId: string): Promise<any> {
  const res = await fetch(`${BASE_URL}/api/v1/vendors/${vendorId}/config`, {
    headers: getAuthHeaders()
  });
  if (!res.ok) throw new Error('Failed to fetch vendor config');
  return res.json();
}

export async function updateVendorIntakeConfigApi(vendorId: string, payload: any): Promise<any> {
  const res = await fetch(`${BASE_URL}/api/v1/vendors/${vendorId}/config`, {
    method: 'PUT',
    headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || 'Failed to update vendor config');
  }
  return res.json();
}

export async function fetchVendorOperatingScheduleApi(vendorId: string): Promise<any> {
  const res = await fetch(`${BASE_URL}/api/v1/vendors/${vendorId}/schedule`, {
    headers: getAuthHeaders()
  });
  if (!res.ok) throw new Error('Failed to fetch operating schedule');
  return res.json();
}

export async function updateVendorOperatingScheduleApi(vendorId: string, payload: any): Promise<any> {
  const res = await fetch(`${BASE_URL}/api/v1/vendors/${vendorId}/schedule`, {
    method: 'PUT',
    headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || 'Failed to update operating schedule');
  }
  return res.json();
}

export async function fetchVendorSeoSchemaApi(vendorId: string): Promise<any> {
  const res = await fetch(`${BASE_URL}/api/v1/vendors/${vendorId}/seo-schema`, {
    headers: getAuthHeaders()
  });
  if (!res.ok) throw new Error('Failed to fetch SEO schema');
  return res.json();
}

export async function fetchVendorEmailConfigApi(vendorId: string): Promise<any> {
  const res = await fetch(`${BASE_URL}/api/v1/vendor-cell/${vendorId}/email/config`, {
    headers: getAuthHeaders()
  });
  if (!res.ok) throw new Error('Failed to fetch email gateway config');
  return res.json();
}

export async function updateVendorEmailConfigApi(vendorId: string, config: any): Promise<any> {
  const res = await fetch(`${BASE_URL}/api/v1/vendor-cell/${vendorId}/email/config`, {
    method: 'PUT',
    headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify(config)
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || 'Failed to update email gateway config');
  }
  return res.json();
}

export async function testVendorEmailConnectionApi(vendorId: string, targetEmail: string): Promise<any> {
  const res = await fetch(`${BASE_URL}/api/v1/vendor-cell/${vendorId}/email/test`, {
    method: 'POST',
    headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify({ target_email: targetEmail })
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || 'Email connection test failed');
  }
  return res.json();
}

export async function testVendorInboundEmailConnectionApi(vendorId: string): Promise<any> {
  const res = await fetch(`${BASE_URL}/api/v1/vendor-cell/${vendorId}/email/test-inbound`, {
    method: 'POST',
    headers: getAuthHeaders()
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || 'Inbound email test failed');
  }
  return res.json();
}

export async function fetchVendorEmailInboxApi(vendorId: string): Promise<any> {
  const res = await fetch(`${BASE_URL}/api/v1/vendor-cell/${vendorId}/email/inbox`, {
    headers: getAuthHeaders()
  });
  if (!res.ok) throw new Error('Failed to fetch email inbox');
  return res.json();
}

export async function convertEmailRfqToBookingApi(vendorId: string, rfqId: string): Promise<any> {
  const res = await fetch(`${BASE_URL}/api/v1/vendor-cell/${vendorId}/email/rfqs/${rfqId}/convert-booking`, {
    method: 'POST',
    headers: getAuthHeaders()
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || 'Failed to convert RFQ to booking');
  }
  return res.json();
}

export async function parseVendorInboundEmailApi(vendorId: string, payload: { sender_email: string; subject: string; body: string }): Promise<any> {
  const res = await fetch(`${BASE_URL}/api/v1/vendor-cell/${vendorId}/email/inbound-parse`, {
    method: 'POST',
    headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || 'Inbound email parsing failed');
  }
  return res.json();
}

export async function dispatchVendorOutboundEmailApi(vendorId: string, payload: any): Promise<any> {
  const res = await fetch(`${BASE_URL}/api/v1/vendor-cell/${vendorId}/email/outbound-dispatch`, {
    method: 'POST',
    headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || 'Failed to dispatch outbound email');
  }
  return res.json();
}

export async function fetchVendorManifestTemplateApi(): Promise<{ template_yaml: string }> {
  const res = await fetch(`${BASE_URL}/api/v1/vendor-cell/manifest-template`, {
    headers: getAuthHeaders()
  });
  if (!res.ok) throw new Error('Failed to fetch manifest template');
  return res.json();
}

export async function validateVendorYamlApi(yamlContent: string): Promise<any> {
  const res = await fetch(`${BASE_URL}/api/v1/vendor-cell/validate-yaml`, {
    method: 'POST',
    headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify({ yaml_content: yamlContent })
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || 'YAML validation failed');
  }
  return res.json();
}

export async function spinUpVendorCellApi(payload: any): Promise<any> {
  const res = await fetch(`${BASE_URL}/api/v1/vendor-cell/spin-up`, {
    method: 'POST',
    headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || 'Spin up vendor cell failed');
  }
  return res.json();
}

export async function fetchGlobalHubAnalyticsApi(): Promise<any> {
  const res = await fetch(`${BASE_URL}/api/v1/global-hub/analytics`, {
    headers: getAuthHeaders()
  });
  if (!res.ok) throw new Error('Failed to fetch Global Hub analytics');
  return res.json();
}

export async function fetchSystemRuntimeModeApi(): Promise<{
  is_sovereign_cell: boolean;
  sovereign_vendor_id: string | null;
  is_prod_mode: boolean;
  hub_mode: boolean;
  node_hostname: string;
}> {
  const res = await fetch(`${BASE_URL}/api/v1/system/runtime-mode`, {
    headers: getAuthHeaders()
  });
  if (!res.ok) throw new Error('Failed to fetch system runtime mode');
  return res.json();
}

export async function executeDirectCellBookingApi(vendorId: string, payload: any): Promise<any> {
  const res = await fetch(`${BASE_URL}/api/v1/vendor-cell/${vendorId}/booking/direct`, {
    method: 'POST',
    headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || 'Direct cell booking failed');
  }
  return res.json();
}

export async function resolveVendorDomainApi(domain: string): Promise<any> {
  const res = await fetch(`${BASE_URL}/api/v1/vendor-portal/resolve-domain?domain=${encodeURIComponent(domain)}`, {
    headers: getAuthHeaders()
  });
  if (!res.ok) throw new Error('Failed to resolve vendor domain');
  return res.json();
}

export async function fetchOmnichannelWorkspaceApi(vendorId: string): Promise<any> {
  const res = await fetch(`${BASE_URL}/api/v1/vendors/${vendorId}/omnichannel/desk`, {
    headers: getAuthHeaders()
  });
  if (!res.ok) throw new Error('Failed to fetch omnichannel workspace');
  return res.json();
}

export async function sendOmnichannelMessageApi(vendorId: string, payload: {
  recipient_phone: string;
  body: string;
  channel: 'SMS' | 'WHATSAPP';
  quick_action_type?: string;
}): Promise<any> {
  const res = await fetch(`${BASE_URL}/api/v1/vendors/${vendorId}/omnichannel/send-message`, {
    method: 'POST',
    headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || 'Failed to dispatch omnichannel message');
  }
  return res.json();
}

export async function recordVoiceStudioCallApi(vendorId: string, payload: {
  caller_phone: string;
  caller_name?: string;
  duration_seconds?: number;
  transcript?: string;
}): Promise<any> {
  const res = await fetch(`${BASE_URL}/api/v1/vendors/${vendorId}/omnichannel/dial-call`, {
    method: 'POST',
    headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || 'Failed to trigger voice call');
  }
  return res.json();
}

export async function updateVendorOmnichannelConfigApi(vendorId: string, payload: any): Promise<any> {
  const res = await fetch(`${BASE_URL}/api/v1/vendors/${vendorId}/omnichannel/config`, {
    method: 'POST',
    headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || 'Failed to update omnichannel config');
  }
  return res.json();
}

// --- Sprint 3: Autonomous Recovery, FlightAware & Mission Control APIs ---

export async function fetchVendorAiYieldApi(vendorId: string): Promise<any> {
  const res = await fetch(`${BASE_URL}/api/v1/vendors/${vendorId}/ai-yield`, {
    headers: getAuthHeaders()
  });
  if (!res.ok) throw new Error('Failed to fetch AI yield metrics');
  return res.json();
}

export async function trainVendorAiYieldApi(vendorId: string): Promise<any> {
  const res = await fetch(`${BASE_URL}/api/v1/vendors/${vendorId}/ai-yield/train`, {
    method: 'POST',
    headers: getAuthHeaders()
  });
  if (!res.ok) throw new Error('Failed to train AI dynamic yield');
  return res.json();
}

export async function applyVendorAiYieldApi(vendorId: string): Promise<any> {
  const res = await fetch(`${BASE_URL}/api/v1/vendors/${vendorId}/ai-yield/apply`, {
    method: 'POST',
    headers: getAuthHeaders()
  });
  if (!res.ok) throw new Error('Failed to apply AI yield pricing rules');
  return res.json();
}

export async function checkFleetAvailabilityApi(vendorId: string, payload: {
  vehicle_class?: string;
  pickup_time_utc: string;
  estimated_duration_minutes?: number;
  service_type?: string;
  hourly_hours?: number;
  origin_address?: string;
  destination_address?: string;
}): Promise<any> {
  const res = await fetch(`${BASE_URL}/api/v1/vendors/${vendorId}/availability/check`, {
    method: 'POST',
    headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || 'Fleet availability check failed');
  }
  return res.json();
}

export async function fetchVendorSimulationScenariosApi(vendorId?: string): Promise<any[]> {
  const url = vendorId 
    ? `${BASE_URL}/api/v1/vendors/${vendorId}/simulation-scenarios`
    : `${BASE_URL}/api/v1/pricing/simulation-scenarios`;
  const res = await fetch(url, { headers: getAuthHeaders() });
  if (!res.ok) throw new Error('Failed to fetch simulation scenarios');
  return res.json();
}

export async function savePricingSimulationScenarioApi(scenario: any): Promise<any> {
  const res = await fetch(`${BASE_URL}/api/v1/pricing/simulation-scenarios`, {
    method: 'POST',
    headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify(scenario)
  });
  if (!res.ok) throw new Error('Failed to save simulation scenario');
  return res.json();
}

export async function fetchCellDomainMappingApi(vendorId: string): Promise<any> {
  const res = await fetch(`${BASE_URL}/api/v1/infrastructure/cells/${vendorId}/domain-mapping`, {
    headers: getAuthHeaders()
  });
  if (!res.ok) throw new Error('Failed to fetch cell domain mapping');
  return res.json();
}

export async function updateCellDomainMappingApi(vendorId: string, payload: {
  custom_domain: string;
  waf_enabled?: boolean;
}): Promise<any> {
  const res = await fetch(`${BASE_URL}/api/v1/infrastructure/cells/${vendorId}/domain-mapping`, {
    method: 'PUT',
    headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || 'Failed to update cell domain mapping');
  }
  return res.json();
}

export async function invokeSharedAiGatewayApi(payload: {
  vendor_id?: string;
  system_prompt: string;
  user_prompt: string;
  max_tokens?: number;
  temperature?: number;
}): Promise<any> {
  const res = await fetch(`${BASE_URL}/api/v1/global-hub/shared-ai/invoke`, {
    method: 'POST',
    headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || 'Shared AI Gateway invocation failed');
  }
  return res.json();
}

export async function broadcastFlightRadarEventApi(payload: {
  flight_number: string;
  carrier: string;
  origin_airport: string;
  destination_airport: string;
  delay_minutes: number;
  updated_eta_utc: string;
}): Promise<any> {
  const res = await fetch(`${BASE_URL}/api/v1/global-hub/radar/broadcast`, {
    method: 'POST',
    headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || 'Flight radar broadcast failed');
  }
  return res.json();
}

export async function ingestFlightAwareWebhookApi(payload: any): Promise<any> {
  const res = await fetch(`${BASE_URL}/api/v1/webhooks/flightaware`, {
    method: 'POST',
    headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || 'FlightAware webhook ingestion failed');
  }
  return res.json();
}

export async function addAiDocumentApi(payload: {
  document_name: string;
  content: string;
  category?: string;
  metadata?: any;
}): Promise<any> {
  const res = await fetch(`${BASE_URL}/api/ai/documents`, {
    method: 'POST',
    headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  if (!res.ok) throw new Error('Failed to add AI document');
  return res.json();
}

export async function addAiGraphEdgeApi(payload: {
  source_id: string;
  target_id: string;
  relation_type: string;
  properties?: any;
}): Promise<any> {
  const res = await fetch(`${BASE_URL}/api/ai/graph/edges`, {
    method: 'POST',
    headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  if (!res.ok) throw new Error('Failed to create AI graph edge');
  return res.json();
}

// --- Sprint 4: Bookings, Inbound Leads, Reservations & Chauffeur Operations ---

export async function fetchVendorBookingsApi(vendorId: string): Promise<Booking[]> {
  const res = await fetch(`${BASE_URL}/api/v1/vendors/${vendorId}/bookings`, {
    headers: getAuthHeaders()
  });
  if (!res.ok) throw new Error('Failed to fetch vendor bookings');
  return res.json();
}

export async function fetchVendorInquiriesApi(vendorId: string): Promise<any> {
  const res = await fetch(`${BASE_URL}/api/v1/vendors/${vendorId}/inquiries`, {
    headers: getAuthHeaders()
  });
  if (!res.ok) throw new Error('Failed to fetch vendor inquiries');
  return res.json();
}

export async function fetchChauffeurDutyStatusApi(driverId: string): Promise<any> {
  const res = await fetch(`${BASE_URL}/api/v1/chauffeur/${driverId}/duty-status`, {
    headers: getAuthHeaders()
  });
  if (!res.ok) throw new Error('Failed to fetch chauffeur duty status');
  return res.json();
}

export async function fetchVendorDriversApi(vendorId: string): Promise<Driver[]> {
  const res = await fetch(`${BASE_URL}/api/v1/vendors/${vendorId}/drivers`, {
    headers: getAuthHeaders()
  });
  if (!res.ok) throw new Error('Failed to fetch vendor drivers');
  return res.json();
}

export async function createVendorDriverApi(vendorId: string, payload: any): Promise<any> {
  const res = await fetch(`${BASE_URL}/api/v1/vendors/${vendorId}/drivers`, {
    method: 'POST',
    headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || 'Failed to create vendor driver');
  }
  return res.json();
}

export async function fetchRegionalStaffingPodsApi(): Promise<any> {
  const res = await fetch(`${BASE_URL}/api/v1/support-desk/pods`, {
    headers: getAuthHeaders()
  });
  if (!res.ok) throw new Error('Failed to fetch regional staffing pods');
  return res.json();
}

// --- Sprint 5: Dynamic Pricing, Regional Tax Rules & AI Price Validation ---

export const quoteItineraryMatrix = quoteMasterItineraryMatrix;

export async function fetchRegionalTaxRulesApi(): Promise<any[]> {
  const res = await fetch(`${BASE_URL}/api/v1/pricing/tax-rules`, {
    headers: getAuthHeaders()
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(extractErrorMessage(err, 'Failed to fetch regional tax rules'));
  }
  return res.json();
}

export const fetchTaxRulesApi = fetchRegionalTaxRulesApi;

export async function aiValidatePricingQuoteApi(payload: {
  vendor_id?: string;
  service_type?: string;
  vehicle_class?: string;
  pickup_address: string;
  dropoff_address?: string;
  hourly_hours?: number;
  proposed_quote_amount?: number;
  currency?: string;
}): Promise<any> {
  const res = await fetch(`${BASE_URL}/api/v1/quotes/ai-validate-pricing`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(payload)
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(extractErrorMessage(err, 'AI pricing validation failed'));
  }
  return res.json();
}

export async function aiValidateVendorPricingApi(vendorId: string, payload: {
  service_type?: string;
  vehicle_class?: string;
  pickup_address: string;
  dropoff_address?: string;
  hourly_hours?: number;
  proposed_quote_amount?: number;
  currency?: string;
}): Promise<any> {
  const res = await fetch(`${BASE_URL}/api/v1/vendors/${encodeURIComponent(vendorId)}/ai-validate-pricing`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(payload)
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(extractErrorMessage(err, 'Vendor AI pricing validation failed'));
  }
  return res.json();
}

// --- Sprint 6: Fleet Assets & Vehicle Inventory + Payroll, Shifts & Settlements ---

export async function fetchVendorVehicleDetail(vendorId: string, vehicleId: string): Promise<any> {
  const res = await fetch(`${BASE_URL}/api/v1/vendors/${encodeURIComponent(vendorId)}/fleet-inventory/${encodeURIComponent(vehicleId)}`, {
    headers: getAuthHeaders()
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(extractErrorMessage(err, 'Failed to fetch vehicle detail'));
  }
  return res.json();
}

export async function fetchVendorPayrollSummaryApi(vendorId: string): Promise<any> {
  const res = await fetch(`${BASE_URL}/api/v1/vendors/${encodeURIComponent(vendorId)}/payroll/summary`, {
    headers: getAuthHeaders()
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(extractErrorMessage(err, 'Failed to fetch vendor payroll summary'));
  }
  return res.json();
}

export async function processTripPayoutApi(vendorId: string, payload: {
  trip_id: string;
  driver_id: string;
  driver_name: string;
  gross_fare_usd: number;
  tip_amount_usd?: number;
  tolls_usd?: number;
  trip_duration_minutes?: number;
  currency?: string;
}): Promise<any> {
  const res = await fetch(`${BASE_URL}/api/v1/vendors/${encodeURIComponent(vendorId)}/payroll/process-trip`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(payload)
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(extractErrorMessage(err, 'Failed to process driver trip payout'));
  }
  return res.json();
}

export async function recordDriverShiftApi(vendorId: string, payload: {
  driver_id: string;
  driver_name: string;
  hours: number;
  tips?: number;
  tolls?: number;
  trips_count?: number;
}): Promise<any> {
  const res = await fetch(`${BASE_URL}/api/v1/vendors/${encodeURIComponent(vendorId)}/payroll/record-shift`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(payload)
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(extractErrorMessage(err, 'Failed to record driver shift'));
  }
  return res.json();
}

export const exportVendorPayrollCsv = exportPayrollCsvApi;
export const fetchVehicles = fetchAllVehicles;

export async function simulateStripeWebhookApi(payload?: {
  id?: string;
  type?: string;
  data?: any;
  booking_id?: string;
}): Promise<any> {
  const res = await fetch(`${BASE_URL}/api/v1/webhooks/stripe`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(payload || {
      id: `evt_test_${Date.now()}`,
      type: 'payment_intent.succeeded',
      data: {
        object: {
          id: `pi_test_${Date.now()}`,
          amount: 18500,
          currency: 'usd',
          status: 'succeeded'
        }
      }
    })
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(extractErrorMessage(err, 'Failed to process Stripe webhook event'));
  }
  return res.json();
}

export const triggerStripeWebhookApi = simulateStripeWebhookApi;


