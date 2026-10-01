export type ServiceType = 'ONE_WAY' | 'HOURLY' | 'MULTI_CITY';

export type VehicleClassType = 'LUXURY_SUV' | 'FIRST_CLASS' | 'BUSINESS_SEDAN' | 'BUSINESS_CLASS' | 'BUSINESS_VAN';

export type BookingStep = 'HOME' | 'CHOOSE_RIDE' | 'PASSENGER_DETAILS' | 'REVIEW_AND_PAY' | 'CONFIRMATION' | 'MY_BOOKINGS';

export interface VendorOption {
  vendor_id: string;
  company_name: string;
  market_city: string;
  rating_score: number;
  total_reviews_count: number;
  fleet_size: number;
  vehicle_makes: string;
  amenities: string;
  cancellation_policy: string;
  rates: {
    LUXURY_SUV?: number;
    FIRST_CLASS: number;
    BUSINESS_SEDAN?: number;
    BUSINESS_CLASS: number;
    BUSINESS_VAN: number;
  };
}

export interface ItineraryLeg {
  id: string;
  pickup: string;
  dropoff: string;
  dateStr: string;
  timeStr: string;
}

export interface BookingState {
  serviceType: ServiceType;
  pickupAddress: string;
  dropoffAddress: string;
  dateStr: string;
  timeStr: string;
  passengers: number;
  hourlyDuration: number;
  stops: string[];
  multiCityLegs?: ItineraryLeg[];

  // Ride Choice
  vehicleClass: VehicleClassType;
  sourcingMode: 'AUTO_ROUTED' | 'EXPLICIT_VENDOR';
  selectedVendorId?: string;
  selectedVendorName?: string;
  flightNumber?: string;
  pickupMeetingPoint: string;
  childSeatsCount: number;
  specialRequests?: string;

  // Passenger Info
  passengerType: 'MYSELF' | 'SOMEONE_ELSE';
  firstName: string;
  lastName: string;
  email: string;
  phone: string;

  // Payment & Totals
  baseFare: number;
  feesAndTaxes: number;
  totalFare: number;
  paymentMethod: 'CARD' | 'APPLE_PAY';

  // Result & Dispatch
  bookingReference?: string;
  invoiceNumber?: string;
  assignedVendorId?: string;
  assignedVendorName?: string;
  assignedChauffeur?: string;
  assignedChauffeurPhone?: string;
  assignedVehiclePlate?: string;
  marketCity?: string;
}

