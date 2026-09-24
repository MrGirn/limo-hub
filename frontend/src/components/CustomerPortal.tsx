import React, { useState, useEffect, useRef } from 'react';
import { 
  Plane, Train, MapPin, Clock, ShieldCheck, Car, Users, Briefcase, 
  Sparkles, CheckCircle2, ChevronRight, CreditCard, AlertCircle,
  FileText, Navigation, ArrowRight, Route, DollarSign, Compass,
  Plus, Trash2, Globe, Shield, Wifi, Droplets, VolumeX, Baby,
  Calendar, Edit3, ChevronDown, ChevronUp, User, X, Check,
  Award, Star, HeartHandshake, Phone, ArrowUpRight, HelpCircle,
  Snowflake, Zap, Layers, Info, Download, Loader2
} from 'lucide-react';
import { ServiceType, VehicleClass, Quote, Booking, BookingParty, MasterItinerary, LegMode, FulfilmentType } from '../types';
import { 
  requestQuote, 
  requestQuoteMatrix,
  bookQuote, 
  bookItinerary, 
  quoteMasterItinerary, 
  quoteMasterItineraryMatrix,
  getBookingCalendarIcsUrl, 
  generateGoogleCalendarUrl, 
  generateOutlookCalendarUrl,
  cancelBookingApi,
  fetchBookingTermsVoucher
} from '../api';
import { AddressAutocompleteInput } from './AddressAutocompleteInput';
import { CustomerBookingsLookupModal } from './public/CustomerBookingsLookupModal';

const US_VEHICLE_OPTIONS = [
  {
    type: 'LUXURY_SUV' as VehicleClass,
    title: 'Executive SUV',
    subtitle: 'Luxury Full-Size SUV',
    models: 'Chevrolet Suburban, Cadillac Escalade or similar',
    pax: 6,
    luggage: 6,
    features: ['Spacious leather interior', 'Climate control'],
    badge: 'Most Popular',
    photoUrl: 'https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?auto=format&fit=crop&w=400&q=80',
    fallbackIcon: 'SUV'
  },
  {
    type: 'FIRST_CLASS' as VehicleClass,
    title: 'First Class Sedan',
    subtitle: 'Diplomatic Flagship Sedan',
    models: 'Mercedes-Benz S-Class, BMW 7 Series or similar',
    pax: 3,
    luggage: 3,
    features: ['Executive legroom', 'Active air suspension'],
    badge: 'Flagship Luxury',
    photoUrl: 'https://images.unsplash.com/photo-1618843479313-40f8afb4b4d8?auto=format&fit=crop&w=400&q=80',
    fallbackIcon: 'SEDAN'
  },
  {
    type: 'ELECTRIC_VIP' as VehicleClass,
    title: 'Electric VIP Lounge',
    subtitle: 'Zero-Emission Executive Cabin',
    models: 'Tesla Model X, Mercedes EQS or similar',
    pax: 3,
    luggage: 3,
    features: ['Zero emissions', 'Whisper quiet cabin'],
    badge: 'Zero Emission',
    photoUrl: 'https://images.unsplash.com/photo-1560958089-b8a1929cea89?auto=format&fit=crop&w=400&q=80',
    fallbackIcon: 'EV'
  },
  {
    type: 'BUSINESS_VAN' as VehicleClass,
    title: 'Executive Sprinter VIP',
    subtitle: 'High-Roof Jet Class Van',
    models: 'Mercedes-Benz Sprinter or similar',
    pax: 12,
    luggage: 14,
    features: ['High-roof walk-in', 'Conference seating'],
    badge: 'Group & Delegation',
    photoUrl: 'https://images.unsplash.com/photo-1570125909232-eb263c188f7e?auto=format&fit=crop&w=400&q=80',
    fallbackIcon: 'VAN'
  },
  {
    type: 'BUSINESS_SEDAN' as VehicleClass,
    title: 'Business Sedan',
    subtitle: 'Corporate Executive Sedan',
    models: 'Toyota Camry, Hyundai Sonata or similar',
    pax: 3,
    luggage: 3,
    features: ['Corporate reliability', 'Clean interior'],
    badge: 'Corporate Standard',
    photoUrl: 'https://images.unsplash.com/photo-1550355291-bbee04a92027?auto=format&fit=crop&w=400&q=80',
    fallbackIcon: 'SEDAN'
  }
];

const TIME_SLOTS = [
  '12:00 AM', '12:30 AM', '01:00 AM', '01:30 AM', '02:00 AM', '02:30 AM',
  '03:00 AM', '03:30 AM', '04:00 AM', '04:30 AM', '05:00 AM', '05:30 AM',
  '06:00 AM', '06:30 AM', '07:00 AM', '07:30 AM', '08:00 AM', '08:30 AM',
  '09:00 AM', '09:30 AM', '10:00 AM', '10:30 AM', '11:00 AM', '11:30 AM',
  '12:00 PM', '12:30 PM', '01:00 PM', '01:30 PM', '02:00 PM', '02:30 PM',
  '03:00 PM', '03:30 PM', '04:00 PM', '04:30 PM', '05:00 PM', '05:30 PM',
  '06:00 PM', '06:30 PM', '07:00 PM', '07:30 PM', '08:00 PM', '08:30 PM',
  '09:00 PM', '09:30 PM', '10:00 PM', '10:30 PM', '11:00 PM', '11:30 PM'
];

const getDynamicUpcomingTimeSlot = (hoursAhead = 2): string => {
  const d = new Date();
  d.setHours(d.getHours() + hoursAhead);
  const m = d.getMinutes();
  const roundedM = m < 30 ? (m === 0 ? 0 : 30) : 0;
  if (m >= 30) d.setHours(d.getHours() + 1);
  d.setMinutes(roundedM);
  
  let h = d.getHours();
  const ampm = h >= 12 ? 'PM' : 'AM';
  h = h % 12;
  if (h === 0) h = 12;
  const hStr = String(h).padStart(2, '0');
  const mStr = String(roundedM).padStart(2, '0');
  return `${hStr}:${mStr} ${ampm}`;
};

const getDynamicTodayDate = (): string => {
  return new Date().toISOString().split('T')[0];
};

const extractCityFromAddress = (address?: string): string => {
  if (!address || !address.trim()) return '';
  const parts = address.split(',').map(p => p.trim());
  if (parts.length >= 2) {
    return parts[1] || parts[0];
  }
  return parts[0] || '';
};

export interface CustomerPortalProps {
  config?: any;
  initialDetails?: {
    serviceType?: string;
    vehicleClass?: VehicleClass;
    pickupLocation?: string;
    dropoffLocation?: string;
    flightNumber?: string;
    pickupDate?: string;
    pickupTime?: string;
    passengers?: number;
  };
  isStandalonePublicSite?: boolean;
}

export const CustomerPortal: React.FC<CustomerPortalProps> = ({ config, initialDetails, isStandalonePublicSite }) => {
  // Booking Mode: 'GUIDED_SINGLE' (Option 1 Default) vs 'ITINERARY_PLANNER' (Option 3 Multi-Leg)
  const [bookingMode, setBookingMode] = useState<'GUIDED_SINGLE' | 'ITINERARY_PLANNER'>('GUIDED_SINGLE');

  // Active Wizard Step: 1 = Details, 2 = Vehicles, 3 = Extras/Preferences, 4 = Review & Pre-Auth, 5 = Confirmed
  const [wizardStep, setWizardStep] = useState<1 | 2 | 3 | 4 | 5>(1);

  // Selected Service Type for Single Leg - Airport Transfer by default
  const [selectedRideType, setSelectedRideType] = useState<'AIRPORT' | 'POINT_TO_POINT' | 'HOURLY' | 'MULTI_CITY'>('AIRPORT');

  // Single Leg Inputs
  const [pickupAddress, setPickupAddress] = useState('');
  const [dropoffAddress, setDropoffAddress] = useState('');
  const [tripDate, setTripDate] = useState(() => getDynamicTodayDate());
  const [tripTime, setTripTime] = useState(() => getDynamicUpcomingTimeSlot(2));
  const [passengersCount, setPassengersCount] = useState(1);
  const [bagsCount, setBagsCount] = useState(1);
  const [flightNumber, setFlightNumber] = useState('');
  const [vehicleClass, setVehicleClass] = useState<VehicleClass>('LUXURY_SUV');
  const [hourlyHours, setHourlyHours] = useState(3);
  const [hasReturnTrip, setHasReturnTrip] = useState(false);
  const [returnDate, setReturnDate] = useState(() => getDynamicTodayDate());
  const [returnTime, setReturnTime] = useState(() => getDynamicUpcomingTimeSlot(6));

  // Multi-Leg Itinerary Planner Legs (Option 3)
  const [itineraryLegs, setItineraryLegs] = useState<any[]>([
    {
      id: 'leg-1',
      type: 'AIRPORT',
      title: 'Leg 1 · Airport Transfer',
      origin_address: '',
      origin_city: '',
      destination_address: '',
      destination_city: '',
      date: getDynamicTodayDate(),
      time: getDynamicUpcomingTimeSlot(2),
      passengers: 1,
      bags: 1,
      flight_number: '',
      vehicle_class: 'LUXURY_SUV',
      vehicle_title: 'Executive SUV',
      vehicle_desc: 'Spacious. Refined. Always professional.',
      is_expanded: true
    }
  ]);

  // Sync initial details if navigated from Quick Quote Widget or Fleet page
  useEffect(() => {
    if (initialDetails) {
      if (initialDetails.serviceType) {
        if (initialDetails.serviceType === 'HOURLY' || initialDetails.serviceType === 'AS_DIRECTED') {
          setSelectedRideType('HOURLY');
          setBookingMode('GUIDED_SINGLE');
        } else if (initialDetails.serviceType === 'AIRPORT_TRANSFER' || initialDetails.serviceType === 'AIRPORT') {
          setSelectedRideType('AIRPORT');
          setBookingMode('GUIDED_SINGLE');
        } else if (initialDetails.serviceType === 'MULTI_CITY') {
          setSelectedRideType('MULTI_CITY');
          setBookingMode('ITINERARY_PLANNER');
        } else {
          setSelectedRideType('POINT_TO_POINT');
          setBookingMode('GUIDED_SINGLE');
        }
      }
      if (initialDetails.vehicleClass) setVehicleClass(initialDetails.vehicleClass);
      if (initialDetails.pickupLocation) setPickupAddress(initialDetails.pickupLocation);
      if (initialDetails.dropoffLocation) setDropoffAddress(initialDetails.dropoffLocation);
      if (initialDetails.flightNumber) setFlightNumber(initialDetails.flightNumber);
      if (initialDetails.pickupDate) setTripDate(initialDetails.pickupDate);
      if (initialDetails.pickupTime) setTripTime(initialDetails.pickupTime);
      if (initialDetails.passengers) setPassengersCount(initialDetails.passengers);

      setItineraryLegs(prev => [{
        ...prev[0],
        origin_address: initialDetails.pickupLocation || prev[0]?.origin_address || '',
        destination_address: initialDetails.dropoffLocation || prev[0]?.destination_address || '',
        flight_number: initialDetails.flightNumber || prev[0]?.flight_number || '',
        vehicle_class: initialDetails.vehicleClass || prev[0]?.vehicle_class || 'LUXURY_SUV',
        date: initialDetails.pickupDate || prev[0]?.date || getDynamicTodayDate(),
        time: initialDetails.pickupTime || prev[0]?.time || getDynamicUpcomingTimeSlot(2),
        passengers: initialDetails.passengers || prev[0]?.passengers || 1,
      }]);
    }
  }, [initialDetails]);

  // Vehicle Selection & Live API Quotes
  const [vehicleQuotes, setVehicleQuotes] = useState<Record<string, any>>({});
  const [expandedVehicles, setExpandedVehicles] = useState<Record<string, boolean>>({ LUXURY_SUV: true });
  const [selectedLegIndex, setSelectedLegIndex] = useState(0);

  // Preferences & Amenities
  const [showPreferencesDrawer, setShowPreferencesDrawer] = useState(false);
  const [amenities, setAmenities] = useState({
    freeWait60Min: true,
    meetAndGreet: true,
    quietRide: false,
    bottledWater: true,
    carbonOffset: true
  });
  const [childSeats, setChildSeats] = useState({ infant: 0, toddler: 0, booster: 0 });
  const [isWavNeeded, setIsWavNeeded] = useState(false);
  const [fulfilmentType, setFulfilmentType] = useState<'HUMAN_CHAUFFEUR' | 'ASSISTED_AUTONOMOUS'>('HUMAN_CHAUFFEUR');

  // Flow State
  const [loadingQuote, setLoadingQuote] = useState(false);
  const [quote, setQuote] = useState<Quote | null>(null);
  const [masterItinerary, setMasterItinerary] = useState<MasterItinerary | null>(null);
  const [quoteError, setQuoteError] = useState<string | null>(null);

  // Booking & Passenger Details
  const [party, setParty] = useState<BookingParty>({
    booker_name: '',
    booker_email: '',
    booker_phone: '',
    passenger_name: '',
    passenger_phone: '',
    passenger_count: 1,
    luggage_count: 1,
    special_instructions: ''
  });

  const [booking, setBooking] = useState<Booking | null>(null);
  const [bookingLoading, setBookingLoading] = useState(false);

  // Card Payment Details
  const [cardDetails, setCardDetails] = useState({
    cardNumber: '',
    cardHolder: '',
    cardExpiry: '',
    cardCvc: '',
    cardZip: '',
    saveCard: true
  });

  const [isBookerDifferentFromPassenger, setIsBookerDifferentFromPassenger] = useState(false);
  const [showLookupModal, setShowLookupModal] = useState(false);
  const [activeFleetClasses, setActiveFleetClasses] = useState<Record<string, boolean>>({});

  // Terms & Conditions and Self-Service Cancellation States
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [showTermsModal, setShowTermsModal] = useState(false);
  const [termsError, setTermsError] = useState<string | null>(null);
  const [cancellingBooking, setCancellingBooking] = useState(false);
  const [cancellationResult, setCancellationResult] = useState<any>(null);
  const [downloadingVoucher, setDownloadingVoucher] = useState(false);

  useEffect(() => {
    // Fetch active fleet inventory to determine vehicle availability and maintenance status
    fetch('/api/v1/vendors/vendor_anb_philly/fleet-inventory')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          const avail: Record<string, boolean> = {};
          data.forEach((v: any) => {
            const vCls = v.vehicle_class || 'FIRST_CLASS';
            const isRentable = v.is_active !== false && v.status !== 'MAINTENANCE' && v.status !== 'DISABLED';
            if (isRentable) {
              avail[vCls] = true;
            } else if (avail[vCls] === undefined) {
              avail[vCls] = false;
            }
          });
          setActiveFleetClasses(avail);
        }
      })
      .catch(() => {});
  }, []);

  // Formatter utilities for 4-char card input and MM / YY expiry
  const formatCardNumber = (value: string) => {
    const digits = value.replace(/\D/g, '').slice(0, 16);
    const parts = digits.match(/.{1,4}/g) || [];
    return parts.join(' ');
  };

  const formatExpiry = (value: string) => {
    const digits = value.replace(/\D/g, '').slice(0, 4);
    if (digits.length > 2) {
      return `${digits.slice(0, 2)} / ${digits.slice(2)}`;
    }
    return digits;
  };

  const formatCvc = (value: string) => {
    return value.replace(/\D/g, '').slice(0, 4);
  };

  const getCardBrand = (cardNumber: string) => {
    const raw = cardNumber.replace(/\D/g, '');
    if (raw.startsWith('4')) return 'VISA';
    if (raw.startsWith('51') || raw.startsWith('52') || raw.startsWith('53') || raw.startsWith('54') || raw.startsWith('55') || (parseInt(raw.slice(0, 4), 10) >= 2221 && parseInt(raw.slice(0, 4), 10) <= 2720)) return 'MASTERCARD';
    if (raw.startsWith('34') || raw.startsWith('37')) return 'AMEX';
    if (raw.startsWith('6011') || raw.startsWith('65')) return 'DISCOVER';
    return null;
  };

  const parseTimeTo24Hour = (timeStr?: string): string => {
    if (!timeStr || !timeStr.trim()) {
      const now = new Date();
      return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:00`;
    }
    const clean = timeStr.trim();
    const isPM = clean.toUpperCase().includes('PM');
    const isAM = clean.toUpperCase().includes('AM');
    const numbersOnly = clean.replace(/[^0-9:]/g, '').trim();
    const parts = numbersOnly.split(':');
    let h = parseInt(parts[0] || '0', 10);
    const m = parseInt(parts[1] || '0', 10);
    if (isPM && h < 12) h += 12;
    if (isAM && h === 12) h = 0;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:00`;
  };

  const safeFormatIsoDateTime = (dateStr?: string, timeStr?: string): string | undefined => {
    if (!dateStr || !dateStr.trim()) return undefined;
    try {
      const time24 = parseTimeTo24Hour(timeStr);
      const d = new Date(`${dateStr.trim()}T${time24}Z`);
      if (isNaN(d.getTime())) return undefined;
      return d.toISOString();
    } catch (_) {
      return undefined;
    }
  };

  const getGoogleMapsEmbedUrl = (): string | null => {
    let origin = pickupAddress?.trim();
    let destination = dropoffAddress?.trim();

    if (bookingMode === 'ITINERARY_PLANNER' && itineraryLegs.length > 0) {
      origin = itineraryLegs[0]?.origin_address?.trim() || origin;
      destination = itineraryLegs[itineraryLegs.length - 1]?.destination_address?.trim() || destination;
    }

    if (selectedRideType !== 'HOURLY') {
      // 2-address category: require both origin and destination to be entered
      if (origin && destination && origin.length >= 3 && destination.length >= 3) {
        return `https://maps.google.com/maps?saddr=${encodeURIComponent(origin)}&daddr=${encodeURIComponent(destination)}&output=embed`;
      }
      return null;
    } else {
      // 1-address category (Hourly): require origin
      if (origin && origin.length >= 3) {
        return `https://maps.google.com/maps?q=${encodeURIComponent(origin)}&output=embed`;
      }
      return null;
    }
  };

  const getGoogleMapsDirectionsUrl = (): string | null => {
    let origin = pickupAddress?.trim();
    let destination = dropoffAddress?.trim();

    if (bookingMode === 'ITINERARY_PLANNER' && itineraryLegs.length > 0) {
      origin = itineraryLegs[0]?.origin_address?.trim() || origin;
      destination = itineraryLegs[itineraryLegs.length - 1]?.destination_address?.trim() || destination;
    }

    if (selectedRideType !== 'HOURLY') {
      if (origin && destination && origin.length >= 3 && destination.length >= 3) {
        return `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(origin)}&destination=${encodeURIComponent(destination)}`;
      }
      return null;
    } else {
      if (origin && origin.length >= 3) {
        return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(origin)}`;
      }
      return null;
    }
  };

  const handleAddItineraryLeg = () => {
    const newLegNumber = itineraryLegs.length + 1;
    setItineraryLegs([
      ...itineraryLegs,
      {
        id: `leg-${newLegNumber}`,
        type: 'POINT_TO_POINT',
        title: `Leg ${newLegNumber} · Point to Point Transfer`,
        origin_address: '',
        origin_city: '',
        destination_address: '',
        destination_city: '',
        date: getDynamicTodayDate(),
        time: getDynamicUpcomingTimeSlot(2),
        passengers: 1,
        bags: 1,
        flight_number: '',
        vehicle_class: 'FIRST_CLASS',
        vehicle_title: 'First Class Sedan',
        vehicle_desc: 'Spacious. Refined. Always professional.',
        is_expanded: true
      }
    ]);
  };

  const handleRemoveItineraryLeg = (index: number) => {
    if (itineraryLegs.length > 1) {
      setItineraryLegs(itineraryLegs.filter((_, i) => i !== index));
    }
  };

  const handleToggleLegExpanded = (index: number) => {
    const updated = [...itineraryLegs];
    updated[index].is_expanded = !updated[index].is_expanded;
    setItineraryLegs(updated);
  };

  // On-demand quote calculation triggered exclusively upon proceeding to vehicles
  const calculateLiveQuotes = async (advanceStep = false) => {
    const effPickup = pickupAddress.trim() || (bookingMode === 'ITINERARY_PLANNER' ? itineraryLegs[0]?.origin_address?.trim() : '');
    const effDropoff = dropoffAddress.trim() || (bookingMode === 'ITINERARY_PLANNER' ? itineraryLegs[0]?.destination_address?.trim() : '');

    if (!effPickup && bookingMode !== 'ITINERARY_PLANNER') {
      setQuoteError("Please enter your pickup location.");
      return;
    }
    if (selectedRideType !== 'HOURLY' && !effDropoff && bookingMode !== 'ITINERARY_PLANNER') {
      setQuoteError("Please enter your destination location.");
      return;
    }

    setLoadingQuote(true);
    setQuoteError(null);
    try {
      const classes: VehicleClass[] = ['LUXURY_SUV', 'FIRST_CLASS', 'ELECTRIC_VIP', 'BUSINESS_VAN', 'BUSINESS_SEDAN'];

      if (bookingMode === 'ITINERARY_PLANNER' || hasReturnTrip) {
        let legsToQuote: any[] = [];

        if (bookingMode === 'ITINERARY_PLANNER' && !hasReturnTrip) {
          legsToQuote = itineraryLegs.map(l => ({
            leg_mode: 'CHAUFFEUR_RIDE',
            title: l.title || `Transfer: ${(l.origin_address || effPickup).split(',')[0]} → ${(l.destination_address || effDropoff).split(',')[0]}`,
            origin_address: l.origin_address || effPickup,
            origin_city: l.origin_city || extractCityFromAddress(l.origin_address || effPickup),
            destination_address: l.destination_address || effDropoff,
            destination_city: l.destination_city || extractCityFromAddress(l.destination_address || effDropoff),
            vehicle_class: l.vehicle_class || vehicleClass,
            flight_number: l.flight_number || flightNumber || undefined
          }));
        } else {
          // Roundtrip Mode: Outbound Leg + Return Leg
          const origCity = extractCityFromAddress(effPickup);
          const destCity = extractCityFromAddress(effDropoff);

          legsToQuote = [
            {
              leg_mode: selectedRideType === 'AIRPORT' ? 'AIRPORT_TRANSFER' : 'CHAUFFEUR_RIDE',
              title: `Outbound: ${effPickup.split(',')[0]} → ${effDropoff.split(',')[0]}`,
              origin_address: effPickup,
              origin_city: origCity,
              destination_address: effDropoff,
              destination_city: destCity,
              vehicle_class: vehicleClass,
              flight_number: flightNumber || undefined
            },
            {
              leg_mode: 'CHAUFFEUR_RIDE',
              title: `Return: ${effDropoff.split(',')[0]} → ${effPickup.split(',')[0]}`,
              origin_address: effDropoff,
              origin_city: destCity,
              destination_address: effPickup,
              destination_city: origCity,
              vehicle_class: vehicleClass,
              flight_number: undefined
            }
          ];
        }

        try {
          const itinMatrix = await quoteMasterItineraryMatrix(
            hasReturnTrip ? "Executive Round-Trip Itinerary" : "Executive Multi-City Itinerary",
            legsToQuote
          );
          setVehicleQuotes(itinMatrix);
          if (itinMatrix[vehicleClass]) {
            setMasterItinerary(itinMatrix[vehicleClass]);
          }
        } catch (itinErr) {
          console.error('Itinerary matrix quote error, fallback to single:', itinErr);
          const qMap: Record<string, any> = {};
          await Promise.all(classes.map(async (vc) => {
            try {
              const mappedLegs = legsToQuote.map(l => ({
                ...l,
                vehicle_class: vc
              }));
              const itin = await quoteMasterItinerary(hasReturnTrip ? "Executive Round-Trip Itinerary" : "Executive Multi-City Itinerary", mappedLegs, vc);
              qMap[vc] = itin;
              if (vc === vehicleClass) setMasterItinerary(itin);
            } catch (e) {
              console.error(`Error quoting ${vc}:`, e);
            }
          }));
          setVehicleQuotes(qMap);
        }
      } else {
        const combinedIso = safeFormatIsoDateTime(tripDate, tripTime);
        try {
          // Lightning-Fast Single-Pass Multi-Class Matrix (<50ms)
          const matrix = await requestQuoteMatrix({
            service_type: selectedRideType === 'AIRPORT' ? 'AIRPORT_TRANSFER' : selectedRideType === 'HOURLY' ? 'HOURLY_AS_DIRECTED' : 'POINT_TO_POINT',
            pickup_address: effPickup,
            dropoff_address: selectedRideType === 'HOURLY' ? undefined : effDropoff,
            vendor_id: config?.vendor_id || undefined,
            flight_number: selectedRideType === 'AIRPORT' ? flightNumber : undefined,
            hourly_hours: selectedRideType === 'HOURLY' ? hourlyHours : undefined,
            pickup_time_utc: combinedIso,
            wait_minutes: 0
          });
          setVehicleQuotes(matrix);
          if (matrix[vehicleClass]) {
            setQuote(matrix[vehicleClass]);
          }
        } catch (matrixErr) {
          console.error('Matrix quote error, fallback to individual:', matrixErr);
          const qMap: Record<string, any> = {};
          await Promise.all(classes.map(async (vc) => {
            try {
              const q = await requestQuote({
                service_type: selectedRideType === 'AIRPORT' ? 'AIRPORT_TRANSFER' : selectedRideType === 'HOURLY' ? 'HOURLY_AS_DIRECTED' : 'POINT_TO_POINT',
                vehicle_class: vc,
                pickup_address: effPickup,
                dropoff_address: selectedRideType === 'HOURLY' ? undefined : effDropoff,
                vendor_id: config?.vendor_id || undefined,
                flight_number: selectedRideType === 'AIRPORT' ? flightNumber : undefined,
                hourly_hours: selectedRideType === 'HOURLY' ? hourlyHours : undefined,
                pickup_time_utc: combinedIso,
                wait_minutes: 0
              });
              qMap[vc] = q;
              if (vc === vehicleClass) setQuote(q);
            } catch (e) {
              console.error(`Error quoting ${vc}:`, e);
            }
          }));
          setVehicleQuotes(qMap);
        }
      }

      // Advance to Step 2 (Select your vehicle) once guaranteed fares have computed
      if (advanceStep) {
        setWizardStep(2);
      }
    } catch (err: any) {
      setQuoteError(err.message || 'Error generating guaranteed quote');
    } finally {
      setLoadingQuote(false);
    }
  };

  const handleProceedToVehicles = async () => {
    setQuoteError(null);
    if (bookingMode === 'ITINERARY_PLANNER') {
      for (let i = 0; i < itineraryLegs.length; i++) {
        const leg = itineraryLegs[i];
        if (!leg.origin_address?.trim()) {
          setQuoteError(`Please enter a pickup location for Leg ${i + 1}.`);
          return;
        }
        if (!leg.destination_address?.trim()) {
          setQuoteError(`Please enter a destination location for Leg ${i + 1}.`);
          return;
        }
      }
    } else {
      if (!pickupAddress.trim()) {
        setQuoteError("Please enter your pickup address or airport location.");
        return;
      }
      if (selectedRideType !== 'HOURLY' && !dropoffAddress.trim()) {
        setQuoteError("Please enter your destination address.");
        return;
      }
    }

    await calculateLiveQuotes(true);
  };

  const handleSelectVehicleClass = (vc: VehicleClass) => {
    setVehicleClass(vc);
    if (bookingMode === 'ITINERARY_PLANNER' || hasReturnTrip) {
      if (vehicleQuotes[vc]) {
        setMasterItinerary(vehicleQuotes[vc]);
      }
      const updated = [...itineraryLegs];
      if (updated[selectedLegIndex]) {
        updated[selectedLegIndex].vehicle_class = vc;
        const opt = US_VEHICLE_OPTIONS.find(o => o.type === vc);
        updated[selectedLegIndex].vehicle_title = opt?.title || vc;
        setItineraryLegs(updated);
      }
    } else {
      if (vehicleQuotes[vc]) {
        setQuote(vehicleQuotes[vc]);
      }
    }
  };

  const handleApplyVehicleToAllLegs = (vc: VehicleClass) => {
    setVehicleClass(vc);
    const opt = US_VEHICLE_OPTIONS.find(o => o.type === vc);
    const updated = itineraryLegs.map(l => ({
      ...l,
      vehicle_class: vc,
      vehicle_title: opt?.title || vc
    }));
    setItineraryLegs(updated);
    if (vehicleQuotes[vc]) {
      setMasterItinerary(vehicleQuotes[vc]);
    }
  };

  const toggleExpandVehicle = (vc: string) => {
    setExpandedVehicles(prev => ({
      ...prev,
      [vc]: !prev[vc]
    }));
  };

  const handleDownloadTermsVoucher = async (bookingId: string) => {
    setDownloadingVoucher(true);
    try {
      const data = await fetchBookingTermsVoucher(bookingId);
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(`
          <!DOCTYPE html>
          <html>
            <head>
              <title>Terms of Carriage & Booking Voucher #${data.booking_id}</title>
              <style>
                body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; padding: 40px; color: #0F172A; max-width: 800px; margin: 0 auto; line-height: 1.5; }
                .header { border-bottom: 2px solid #0A192F; padding-bottom: 20px; margin-bottom: 24px; display: flex; justify-content: space-between; align-items: flex-start; }
                .title { font-size: 24px; font-weight: 800; color: #0A192F; margin: 0; }
                .vendor-meta { font-size: 13px; color: #64748B; margin-top: 4px; }
                .ref-badge { background: #F1F5F9; border: 1px solid #CBD5E1; padding: 8px 16px; border-radius: 8px; font-family: monospace; font-size: 16px; font-weight: 800; color: #0078D4; }
                .section { margin-bottom: 24px; background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 10px; padding: 20px; }
                .section-title { font-size: 14px; font-weight: 800; color: #9A7B4F; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 12px; }
                .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; font-size: 13px; }
                .term-card { margin-bottom: 14px; padding-bottom: 14px; border-bottom: 1px solid #E2E8F0; }
                .term-card:last-child { border-bottom: none; margin-bottom: 0; padding-bottom: 0; }
                .term-title { font-weight: 700; color: #0F172A; font-size: 13px; margin-bottom: 2px; }
                .term-text { font-size: 12px; color: #475569; }
                .footer { font-size: 11px; color: #94A3B8; text-align: center; margin-top: 36px; border-top: 1px solid #E2E8F0; padding-top: 16px; }
                @media print { .no-print { display: none; } }
              </style>
            </head>
            <body>
              <div class="header">
                <div>
                  <h1 class="title">${data.vendor_name}</h1>
                  <div class="vendor-meta">${data.vendor_address} · ${data.vendor_phone} · ${data.vendor_email}</div>
                  <div style="font-size: 13px; color: #16A34A; font-weight: 700; margin-top: 6px;">✓ Authorized Sovereign Chauffeur Service Voucher</div>
                </div>
                <div class="ref-badge">#${data.booking_id}</div>
              </div>

              <div class="section">
                <div class="section-title">Itinerary & Schedule</div>
                <div class="grid-2">
                  <div><strong>Pickup:</strong> ${data.pickup_address}</div>
                  <div><strong>Destination:</strong> ${data.dropoff_address}</div>
                  <div><strong>Lead Passenger:</strong> ${data.passenger_name} (${data.passenger_phone})</div>
                  <div><strong>Date & Time (UTC):</strong> ${new Date(data.pickup_time_utc).toLocaleString()}</div>
                  <div><strong>Guaranteed Total:</strong> $${data.total_amount_usd.toFixed(2)} USD</div>
                  <div><strong>Pre-Auth Escrow Status:</strong> ${data.preauth_status} (Card ending in ${data.card_last4})</div>
                </div>
              </div>

              <div class="section">
                <div class="section-title">Authoritative Terms of Carriage & Cancellation Policies</div>
                ${data.terms_and_conditions.map((t: any) => `
                  <div class="term-card">
                    <div class="term-title">✓ ${t.title}</div>
                    <div class="term-text">${t.text}</div>
                  </div>
                `).join('')}
              </div>

              <div class="footer">
                This document serves as an authoritative booking contract and terms agreement under the Global Limo Autonomous Operations Network.
              </div>
              <script>window.onload = function() { window.print(); }<\/script>
            </body>
          </html>
        `);
        printWindow.document.close();
      }
    } catch (err: any) {
      alert(err.message || 'Error generating voucher PDF');
    } finally {
      setDownloadingVoucher(false);
    }
  };

  const handleCancelBooking = async (bookingId: string) => {
    if (!window.confirm(`Are you sure you want to cancel reservation #${bookingId}? Your Pre-Auth escrow hold will be immediately released in full.`)) {
      return;
    }
    setCancellingBooking(true);
    try {
      const res = await cancelBookingApi(bookingId, 'Customer self-cancellation via confirmation portal');
      setCancellationResult(res);
      if (booking) {
        setBooking({
          ...booking,
          status: 'CANCELLED' as any,
          trip: { ...booking.trip, status: 'CANCELLED' as any }
        });
      }
    } catch (err: any) {
      alert(err.message || 'Error cancelling booking');
    } finally {
      setCancellingBooking(false);
    }
  };

  const handleConfirmPreAuthBooking = async () => {
    if (!acceptedTerms) {
      setTermsError('Please agree to the Terms of Service & Cancellation Policy before confirming your reservation.');
      return;
    }
    setTermsError(null);
    setBookingLoading(true);
    try {
      const cardDigits = cardDetails.cardNumber.replace(/\D/g, '');
      const last4 = cardDigits.slice(-4) || '4242';

      const resolvedParty: BookingParty = {
        ...party,
        booker_name: isBookerDifferentFromPassenger ? (party.booker_name || cardDetails.cardHolder || 'Corporate Booker') : (party.passenger_name || cardDetails.cardHolder || 'Lead Guest'),
        booker_email: isBookerDifferentFromPassenger ? (party.booker_email || 'billing@client.com') : (party.booker_email || 'passenger@client.com'),
        booker_phone: isBookerDifferentFromPassenger ? (party.booker_phone || party.passenger_phone) : party.passenger_phone,
        passenger_name: party.passenger_name || cardDetails.cardHolder || 'Executive Guest',
        passenger_phone: party.passenger_phone || '+14848006629'
      };

      if ((bookingMode === 'ITINERARY_PLANNER' || hasReturnTrip) && masterItinerary) {
        const pickupDateResolved = tripDate || new Date().toISOString().split('T')[0];
        const pickupTimeResolved = safeFormatIsoDateTime(pickupDateResolved, tripTime) || new Date().toISOString();
        const res = await bookItinerary(
          masterItinerary.itinerary_id,
          resolvedParty,
          'tok_visa_4242',
          {
            itinerary: masterItinerary,
            legs: itineraryLegs.length > 0 ? itineraryLegs : masterItinerary.legs,
            pickup_address: itineraryLegs[0]?.origin_address || pickupAddress || 'Philadelphia International Airport (PHL)',
            dropoff_address: itineraryLegs[itineraryLegs.length - 1]?.destination_address || dropoffAddress || 'The Ritz-Carlton, Philadelphia',
            pickup_time: pickupTimeResolved,
            flight_details: { flightNumber: flightNumber || itineraryLegs[0]?.flight_number || '' },
            flight_number: flightNumber || itineraryLegs[0]?.flight_number || 'DL1234',
            vehicle_class: vehicleClass,
            total_amount: Number(activeTotalFormatted)
          }
        );
        setBooking(res.booking || {
          id: res.booking_id,
          pickup_address: itineraryLegs[0]?.origin_address || pickupAddress,
          dropoff_address: itineraryLegs[itineraryLegs.length - 1]?.destination_address || dropoffAddress,
          total_amount: res.estimated_hold_total_usd || masterItinerary.all_inclusive_total,
          party: resolvedParty,
          trip: { status: res.status || 'SCHEDULED' },
          payment: { card_last4: last4 }
        });
      } else if (quote) {
        const pickupDateResolved = tripDate || new Date().toISOString().split('T')[0];
        const pickupTime = safeFormatIsoDateTime(pickupDateResolved, tripTime) || new Date().toISOString();
        const b = await bookQuote(quote.id, resolvedParty, pickupTime);
        setBooking(b);
      }
      setWizardStep(5);
    } catch (err: any) {
      alert(err.message || 'Booking confirmation error');
    } finally {
      setBookingLoading(false);
    }
  };

  const activeQuoteObj = (bookingMode === 'ITINERARY_PLANNER' ? masterItinerary : quote) || vehicleQuotes[vehicleClass];

  // Dynamic real-time calculation for user extras
  const childSeatCost = (childSeats.infant + childSeats.toddler + childSeats.booster) * 20;
  const carbonOffsetCost = amenities.carbonOffset ? 5.00 : 0.00;
  const fulfilmentMultiplier = fulfilmentType === 'ASSISTED_AUTONOMOUS' ? 0.90 : 1.00;

  const baseQuoteNumber = activeQuoteObj ? Number(
    activeQuoteObj.all_inclusive_total ||
    activeQuoteObj.total_gross ||
    activeQuoteObj.final_payable_amount ||
    activeQuoteObj.total_amount_usd ||
    activeQuoteObj.subtotal_net ||
    0
  ) : 0;

  const resolvedTotalNumber = baseQuoteNumber > 0 ? (baseQuoteNumber + childSeatCost + carbonOffsetCost) * fulfilmentMultiplier : 0;
  const activeTotalFormatted = resolvedTotalNumber > 0 ? resolvedTotalNumber.toFixed(2) : '0.00';

  // Strict backend-derived line items from active vendor pricing rules
  const gratuityVal = Number(activeQuoteObj?.gratuity_amount || (activeQuoteObj as any)?.total_gratuity_amount || 0);
  const gratuityFormatted = gratuityVal.toFixed(2);

  const tollsVal = Number((activeQuoteObj?.airport_train_surcharge_net || 0) + (activeQuoteObj?.estimated_tolls_net || 0));
  const tollsAndFeesFormatted = tollsVal.toFixed(2);

  const taxVal = Number(activeQuoteObj?.tax_amount || (activeQuoteObj as any)?.total_tax_amount || 0);
  const taxesFormatted = taxVal.toFixed(2);

  const baseTariffFormatted = activeQuoteObj?.subtotal_net ? 
    Number(activeQuoteObj.subtotal_net).toFixed(2) : 
    (resolvedTotalNumber > 0 ? Math.max(0, resolvedTotalNumber - gratuityVal - tollsVal - taxVal).toFixed(2) : '0.00');

  const selectedVehicleObj = US_VEHICLE_OPTIONS.find(v => v.type === vehicleClass) || US_VEHICLE_OPTIONS[0];

  return (
    <div style={{ backgroundColor: '#FBF9F5', minHeight: '100vh', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>
      
      {/* 1. STEP PROGRESS WIZARD BAR */}
      <div className="wizard-progress-bar-wrapper">
        <div className="wizard-steps-container">
          
          {/* Step 1 */}
          <div 
            onClick={() => setWizardStep(1)}
            style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}
          >
            <div style={{ 
              width: '26px', 
              height: '26px', 
              borderRadius: '50%', 
              backgroundColor: wizardStep >= 1 ? '#0A192F' : '#E2E8F0', 
              color: wizardStep >= 1 ? '#FFFFFF' : '#64748B',
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              fontSize: '12px',
              fontWeight: 800,
              flexShrink: 0
            }}>
              1
            </div>
            <span className="wizard-step-label" style={{ fontSize: '13px', fontWeight: wizardStep === 1 ? 800 : 600, color: wizardStep === 1 ? '#0A192F' : '#64748B', whiteSpace: 'nowrap' }}>
              Trip details
            </span>
          </div>

          <div style={{ flex: 1, height: '1px', backgroundColor: wizardStep >= 2 ? '#0A192F' : '#CBD5E1' }} />

          {/* Step 2 */}
          <div 
            onClick={() => { if (wizardStep >= 2) setWizardStep(2); }}
            style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: wizardStep >= 2 ? 'pointer' : 'default' }}
          >
            <div style={{ 
              width: '26px', 
              height: '26px', 
              borderRadius: '50%', 
              backgroundColor: wizardStep >= 2 ? '#0A192F' : '#F1F5F9', 
              color: wizardStep >= 2 ? '#FFFFFF' : '#94A3B8',
              border: wizardStep < 2 ? '1px solid #CBD5E1' : 'none',
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              fontSize: '12px',
              fontWeight: 800,
              flexShrink: 0
            }}>
              2
            </div>
            <span className="wizard-step-label" style={{ fontSize: '13px', fontWeight: wizardStep === 2 ? 800 : 600, color: wizardStep === 2 ? '#0A192F' : '#94A3B8', whiteSpace: 'nowrap' }}>
              Vehicle
            </span>
          </div>

          <div style={{ flex: 1, height: '1px', backgroundColor: wizardStep >= 3 ? '#0A192F' : '#CBD5E1' }} />

          {/* Step 3 */}
          <div 
            onClick={() => { if (wizardStep >= 3) setWizardStep(3); }}
            style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: wizardStep >= 3 ? 'pointer' : 'default' }}
          >
            <div style={{ 
              width: '26px', 
              height: '26px', 
              borderRadius: '50%', 
              backgroundColor: wizardStep >= 3 ? '#0A192F' : '#F1F5F9', 
              color: wizardStep >= 3 ? '#FFFFFF' : '#94A3B8',
              border: wizardStep < 3 ? '1px solid #CBD5E1' : 'none',
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              fontSize: '12px',
              fontWeight: 800,
              flexShrink: 0
            }}>
              3
            </div>
            <span className="wizard-step-label" style={{ fontSize: '13px', fontWeight: wizardStep === 3 ? 800 : 600, color: wizardStep === 3 ? '#0A192F' : '#94A3B8', whiteSpace: 'nowrap' }}>
              Extras
            </span>
          </div>

          <div style={{ flex: 1, height: '1px', backgroundColor: wizardStep >= 4 ? '#0A192F' : '#CBD5E1' }} />

          {/* Step 4 */}
          <div 
            onClick={() => { if (wizardStep >= 4) setWizardStep(4); }}
            style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: wizardStep >= 4 ? 'pointer' : 'default' }}
          >
            <div style={{ 
              width: '26px', 
              height: '26px', 
              borderRadius: '50%', 
              backgroundColor: wizardStep >= 4 ? '#0A192F' : '#F1F5F9', 
              color: wizardStep >= 4 ? '#FFFFFF' : '#94A3B8',
              border: wizardStep < 4 ? '1px solid #CBD5E1' : 'none',
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              fontSize: '12px',
              fontWeight: 800,
              flexShrink: 0
            }}>
              4
            </div>
            <span className="wizard-step-label" style={{ fontSize: '13px', fontWeight: wizardStep === 4 ? 800 : 600, color: wizardStep === 4 ? '#0A192F' : '#94A3B8', whiteSpace: 'nowrap' }}>
              Review
            </span>
          </div>

        </div>
      </div>

      {/* 4. MAIN CONTENT CONTAINER (2-COLUMN LUXURY GRID) */}
      <div className="customer-portal-main-container">
        
        {wizardStep === 5 && booking ? (
          /* STEP 5: CONFIRMED CARD ESCROW MISSION WITH CALENDAR & DUAL NOTIFICATION */
          <div style={{ 
            backgroundColor: '#FFFFFF', 
            borderRadius: '16px', 
            border: '1px solid #E2E8F0', 
            padding: '48px 36px', 
            textAlign: 'center', 
            maxWidth: '880px', 
            margin: '0 auto',
            boxShadow: '0 10px 30px rgba(0,0,0,0.06)' 
          }}>
            <div style={{ width: '68px', height: '68px', borderRadius: '50%', backgroundColor: '#DCFCE7', color: '#16A34A', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px auto', boxShadow: '0 4px 12px rgba(22,163,74,0.15)' }}>
              <CheckCircle2 size={40} />
            </div>
            
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '4px 12px', backgroundColor: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '20px', fontSize: '11px', fontWeight: 800, color: '#9A7B4F', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: '12px' }}>
              <ShieldCheck size={14} color="#16A34A" />
              CONFIRMED · ESCROW PRE-AUTH ACTIVE
            </div>

            <h2 style={{ fontFamily: '"Libre Baskerville", Georgia, serif', fontSize: '32px', fontWeight: 700, color: '#0A192F', margin: '4px 0 10px 0' }}>
              Your Chauffeur Mission is Secured
            </h2>
            
            <p style={{ color: '#64748B', fontSize: '15px', maxWidth: '580px', margin: '0 auto 24px auto', lineHeight: '1.6' }}>
              Confirmation reference <strong style={{ color: '#0078D4', fontFamily: 'monospace', fontSize: '16px' }}>#{booking.id}</strong>. Your dedicated chauffeur has been reserved with white-glove meet & greet.
            </p>

            {/* DYNAMIC VENDOR-GOVERNED CANCELLATION POLICY & COUNTDOWN BANNER */}
            {(() => {
              const policy = booking.cancellation_policy;
              const cutoffHours = policy?.cutoff_hours || 2;
              const vendorName = policy?.vendor_name || 'Operating Carrier';
              const pickupDate = booking.pickup_time_utc ? new Date(booking.pickup_time_utc) : new Date(Date.now() + 24 * 3600 * 1000);
              const deadlineDate = policy?.deadline_utc ? new Date(policy.deadline_utc) : new Date(pickupDate.getTime() - cutoffHours * 3600 * 1000);
              const now = new Date();
              const diffMs = deadlineDate.getTime() - now.getTime();
              const isFreeActive = diffMs > 0;
              const totalHours = Math.floor(diffMs / (1000 * 60 * 60));
              const remainingMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
              const timeRemainingStr = totalHours > 0 ? `${totalHours}h ${remainingMinutes}m remaining` : `${remainingMinutes}m remaining`;
              const isUrgent = totalHours === 0 && isFreeActive;

              return (
                <div style={{
                  backgroundColor: isFreeActive ? (isUrgent ? '#FEF3C7' : '#F0FDF4') : '#F8FAFC',
                  border: `1px solid ${isFreeActive ? (isUrgent ? '#FDE68A' : '#BBF7D0') : '#E2E8F0'}`,
                  borderRadius: '12px',
                  padding: '16px 20px',
                  marginBottom: '24px',
                  textAlign: 'left',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '14px',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.02)'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{
                      width: '36px',
                      height: '36px',
                      borderRadius: '50%',
                      backgroundColor: isFreeActive ? (isUrgent ? '#FDE68A' : '#DCFCE7') : '#E2E8F0',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0
                    }}>
                      <Clock size={18} color={isFreeActive ? (isUrgent ? '#92400E' : '#166534') : '#64748B'} />
                    </div>
                    <div>
                      <div style={{ fontSize: '13px', fontWeight: 800, color: isFreeActive ? (isUrgent ? '#92400E' : '#166534') : '#0F172A' }}>
                        {isFreeActive 
                          ? (isUrgent ? `Free Cancellation Ending Soon · ${timeRemainingStr}` : `Complimentary Cancellation Active · ${timeRemainingStr}`)
                          : 'Free Cancellation Window Closed'}
                      </div>
                      <div style={{ fontSize: '11.5px', color: isFreeActive ? (isUrgent ? '#78350F' : '#14532D') : '#64748B', marginTop: '2px' }}>
                        {isFreeActive 
                          ? `Cancel free of charge until ${deadlineDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} at ${deadlineDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })} under ${vendorName}'s ${cutoffHours}-hour business rule (100% Pre-Auth Escrow Release).`
                          : `Chauffeur has been dispatched. Cancellations are subject to standard late policy under ${vendorName}.`}
                      </div>
                    </div>
                  </div>

                  {isFreeActive && booking.trip?.status !== 'CANCELLED' && (
                    <button
                      onClick={() => handleCancelBooking(booking.id)}
                      disabled={cancellingBooking}
                      style={{
                        padding: '8px 14px',
                        backgroundColor: '#FFFFFF',
                        border: `1px solid ${isUrgent ? '#F59E0B' : '#86EFAC'}`,
                        borderRadius: '6px',
                        color: isUrgent ? '#92400E' : '#166534',
                        fontSize: '12px',
                        fontWeight: 800,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        whiteSpace: 'nowrap'
                      }}
                    >
                      <Trash2 size={13} />
                      <span>{cancellingBooking ? 'Releasing...' : 'Cancel Ride (0 Fees)'}</span>
                    </button>
                  )}
                </div>
              );
            })()}

            {/* ITINERARY & SUMMARY CARD */}
            <div style={{ backgroundColor: '#F8FAFC', borderRadius: '12px', border: '1px solid #E2E8F0', padding: '24px', textAlign: 'left', marginBottom: '24px' }}>
              <div className="mission-pickup-dest-grid" style={{ gap: '20px' }}>
                <div>
                  <div style={{ fontSize: '11px', fontWeight: 800, color: '#9A7B4F', textTransform: 'uppercase', letterSpacing: '0.05em' }}>PICKUP LOCATION</div>
                  <div style={{ fontSize: '14px', fontWeight: 700, color: '#0F172A', marginTop: '4px' }}>{booking.pickup_address}</div>
                </div>
                <div>
                  <div style={{ fontSize: '11px', fontWeight: 800, color: '#9A7B4F', textTransform: 'uppercase', letterSpacing: '0.05em' }}>DESTINATION</div>
                  <div style={{ fontSize: '14px', fontWeight: 700, color: '#0F172A', marginTop: '4px' }}>{booking.dropoff_address}</div>
                </div>
              </div>

              <div className="mission-details-3col" style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid #E2E8F0', gap: '16px', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: '11px', color: '#64748B', fontWeight: 600 }}>PASSENGER</div>
                  <div style={{ fontSize: '13px', fontWeight: 700, color: '#0F172A' }}>{booking.party?.passenger_name}</div>
                  <div style={{ fontSize: '11px', color: '#9A7B4F' }}>{booking.party?.passenger_phone}</div>
                </div>
                <div>
                  <div style={{ fontSize: '11px', color: '#64748B', fontWeight: 600 }}>SCHEDULED PICKUP</div>
                  <div style={{ fontSize: '13px', fontWeight: 700, color: '#0F172A' }}>
                    {booking.pickup_time_utc ? new Date(booking.pickup_time_utc).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'Scheduled'}
                  </div>
                  <div style={{ fontSize: '11px', color: '#9A7B4F' }}>60-min complimentary wait</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '11px', color: '#64748B', fontWeight: 600 }}>GUARANTEED ESCROW</div>
                  <div style={{ fontSize: '22px', fontWeight: 900, color: '#166534' }}>${Number(booking.total_amount || 0).toFixed(2)} USD</div>
                  <div style={{ fontSize: '10px', color: '#16A34A', fontWeight: 700 }}>Zero Pre-Ride Charge</div>
                </div>
              </div>
            </div>

            {/* 1-CLICK CALENDAR INTEGRATION TOOLBAR */}
            <div style={{ backgroundColor: '#F1F5F9', borderRadius: '12px', padding: '20px', marginBottom: '24px', border: '1px solid #E2E8F0', textAlign: 'left' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px', flexWrap: 'wrap', gap: '10px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Calendar size={18} color="#0A192F" />
                  <span style={{ fontSize: '13px', fontWeight: 800, color: '#0A192F' }}>Add Journey to Your Calendar</span>
                </div>
                <span style={{ fontSize: '11px', color: '#64748B' }}>Includes 60-min departure alarm & chauffeur notes</span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '10px' }}>
                {/* Google Calendar */}
                <a
                  href={generateGoogleCalendarUrl(booking)}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    padding: '10px 14px',
                    backgroundColor: '#FFFFFF',
                    border: '1px solid #CBD5E1',
                    borderRadius: '8px',
                    color: '#1E293B',
                    fontSize: '12px',
                    fontWeight: 700,
                    textDecoration: 'none',
                    transition: 'all 0.15s'
                  }}
                >
                  <img src="https://upload.wikimedia.org/wikipedia/commons/a/a5/Google_Calendar_icon_%282020%29.svg" alt="Google" style={{ width: '16px', height: '16px' }} />
                  Google Calendar
                </a>

                {/* Apple / Outlook .ICS Download */}
                <a
                  href={getBookingCalendarIcsUrl(booking.id)}
                  download={`Executive-Mission-${booking.id}.ics`}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    padding: '10px 14px',
                    backgroundColor: '#FFFFFF',
                    border: '1px solid #CBD5E1',
                    borderRadius: '8px',
                    color: '#1E293B',
                    fontSize: '12px',
                    fontWeight: 700,
                    textDecoration: 'none',
                    transition: 'all 0.15s'
                  }}
                >
                  <Download size={15} color="#0A192F" />
                  Apple / Outlook .ICS
                </a>

                {/* Office 365 Web Calendar */}
                <a
                  href={generateOutlookCalendarUrl(booking)}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    padding: '10px 14px',
                    backgroundColor: '#FFFFFF',
                    border: '1px solid #CBD5E1',
                    borderRadius: '8px',
                    color: '#1E293B',
                    fontSize: '12px',
                    fontWeight: 700,
                    textDecoration: 'none',
                    transition: 'all 0.15s'
                  }}
                >
                  <img src="https://upload.wikimedia.org/wikipedia/commons/d/df/Microsoft_Office_Outlook_%282018%E2%80%93present%29.svg" alt="Outlook" style={{ width: '16px', height: '16px' }} />
                  Outlook Web / 365
                </a>
              </div>
            </div>

            {/* CANCELLATION SUCCESS BANNER */}
            {cancellationResult && (
              <div style={{
                backgroundColor: '#FEF2F2',
                border: '1px solid #FECACA',
                borderRadius: '12px',
                padding: '18px 24px',
                marginBottom: '24px',
                textAlign: 'left',
                display: 'flex',
                alignItems: 'center',
                gap: '14px'
              }}>
                <div style={{ width: '36px', height: '36px', borderRadius: '50%', backgroundColor: '#FEE2E2', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <CheckCircle2 size={20} color="#DC2626" />
                </div>
                <div>
                  <div style={{ fontSize: '14px', fontWeight: 800, color: '#991B1B' }}>
                    Reservation #{cancellationResult.booking_id} Cancelled
                  </div>
                  <div style={{ fontSize: '12.5px', color: '#7F1D1D', marginTop: '2px' }}>
                    {cancellationResult.message || '100% Pre-Authorization escrow hold has been released back to your card. No cancellation fees applied.'}
                  </div>
                </div>
              </div>
            )}

            {/* DUAL NOTIFICATION & DELIVERY SUMMARY */}
            <div className="mission-pickup-dest-grid" style={{ gap: '14px', marginBottom: '24px', textAlign: 'left' }}>
              {/* Booker Notification */}
              <div style={{ backgroundColor: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '10px', padding: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                  <div style={{ width: '22px', height: '22px', borderRadius: '50%', backgroundColor: '#EFF6FF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <FileText size={13} color="#2563EB" />
                  </div>
                  <span style={{ fontSize: '12px', fontWeight: 800, color: '#1E293B' }}>Booker Terms PDF &amp; Receipt</span>
                </div>
                <div style={{ fontSize: '11px', color: '#64748B', lineHeight: '1.5' }}>
                  Dispatched to <strong style={{ color: '#0F172A' }}>{booking.party?.booker_email || (booking.party as any)?.passenger_email || 'Executive Booker'}</strong> with carrier terms PDF, cancellation link, and calendar invite attached.
                </div>
              </div>

              {/* Passenger Notification */}
              <div style={{ backgroundColor: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '10px', padding: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                  <div style={{ width: '22px', height: '22px', borderRadius: '50%', backgroundColor: '#F0FDF4', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Phone size={13} color="#16A34A" />
                  </div>
                  <span style={{ fontSize: '12px', fontWeight: 800, color: '#1E293B' }}>Passenger Mobile SMS &amp; Radar Link</span>
                </div>
                <div style={{ fontSize: '11px', color: '#64748B', lineHeight: '1.5' }}>
                  SMS dispatched to <strong style={{ color: '#0F172A' }}>{booking.party?.passenger_phone || 'Passenger Phone'}</strong> with meet &amp; greet PIN and 1-click self-service cancellation link.
                </div>
              </div>
            </div>

            {/* ACTION BUTTONS & DOCUMENT CENTER */}
            <div style={{ display: 'flex', justifyContent: 'center', gap: '12px', flexWrap: 'wrap', marginBottom: '12px' }}>
              {/* Download Terms & Voucher PDF */}
              <button 
                onClick={() => handleDownloadTermsVoucher(booking.id)}
                disabled={downloadingVoucher}
                style={{ 
                  padding: '12px 20px', 
                  backgroundColor: '#0A192F', 
                  color: '#FFFFFF', 
                  border: 'none', 
                  borderRadius: '8px', 
                  fontSize: '13px', 
                  fontWeight: 700, 
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  boxShadow: '0 2px 8px rgba(10,25,47,0.2)'
                }}
              >
                <Download size={15} />
                <span>{downloadingVoucher ? 'Generating Document...' : 'Download Terms & Voucher PDF'}</span>
              </button>

              {/* View in My Bookings */}
              <button 
                onClick={() => setShowLookupModal(true)}
                style={{ 
                  padding: '12px 20px', 
                  backgroundColor: '#FFFFFF', 
                  color: '#0A192F', 
                  border: '1px solid #CBD5E1', 
                  borderRadius: '8px', 
                  fontSize: '13px', 
                  fontWeight: 700, 
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}
              >
                <Calendar size={15} />
                My Bookings &amp; Schedule
              </button>

              {/* Self-Service Cancellation */}
              {booking.trip?.status !== 'CANCELLED' && (
                <button 
                  onClick={() => handleCancelBooking(booking.id)}
                  disabled={cancellingBooking}
                  style={{ 
                    padding: '12px 20px', 
                    backgroundColor: '#FEF2F2', 
                    color: '#991B1B', 
                    border: '1px solid #FECACA', 
                    borderRadius: '8px', 
                    fontSize: '13px', 
                    fontWeight: 700, 
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}
                >
                  <Trash2 size={15} color="#DC2626" />
                  <span>{cancellingBooking ? 'Releasing Hold...' : 'Manage / Cancel Booking'}</span>
                </button>
              )}

              {/* Book Another */}
              <button 
                onClick={() => { setWizardStep(1); setBooking(null); setAcceptedTerms(false); setCancellationResult(null); }}
                style={{ 
                  padding: '12px 20px', 
                  backgroundColor: '#F8FAFC', 
                  color: '#64748B', 
                  border: '1px solid #E2E8F0', 
                  borderRadius: '8px', 
                  fontSize: '13px', 
                  fontWeight: 700, 
                  cursor: 'pointer' 
                }}
              >
                Book Another Journey
              </button>
            </div>
          </div>
        ) : (
          <div className="customer-portal-grid">
            
            {/* ========================================================================= */}
            {/* LEFT COLUMN: GUIDED TRIP DETAILS & MULTI-LEG BUILDER                       */}
            {/* ========================================================================= */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              
              {/* STEP 1: TRIP DETAILS FORM */}
              {wizardStep === 1 && (
                <div style={{ backgroundColor: '#FFFFFF', borderRadius: '12px', border: '1px solid #EAE6DF', padding: '28px', boxShadow: '0 2px 10px rgba(0,0,0,0.03)' }}>
                  
                  {/* Option 1: What type of ride do you need? (4 Cards) */}
                  <div style={{ marginBottom: '28px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                      <h2 style={{ fontFamily: '"Libre Baskerville", Georgia, serif', fontSize: '20px', fontWeight: 700, color: '#0A192F', margin: 0 }}>
                        What type of ride do you need?
                      </h2>
                      {bookingMode === 'ITINERARY_PLANNER' && (
                        <button 
                          onClick={() => { setBookingMode('GUIDED_SINGLE'); setSelectedRideType('AIRPORT'); }}
                          style={{ background: 'none', border: 'none', color: '#9A7B4F', fontSize: '12px', fontWeight: 700, cursor: 'pointer', textDecoration: 'underline' }}
                        >
                          Switch to Single Ride
                        </button>
                      )}
                    </div>

                    <div className="ride-type-selector-grid">
                      
                      {/* Card 1: Airport transfer */}
                      <div 
                        className="ride-type-card"
                        onClick={() => { setSelectedRideType('AIRPORT'); setBookingMode('GUIDED_SINGLE'); }}
                        style={{
                          padding: '16px 14px',
                          borderRadius: '8px',
                          border: selectedRideType === 'AIRPORT' && bookingMode === 'GUIDED_SINGLE' ? '2px solid #9A7B4F' : '1px solid #E2E8F0',
                          backgroundColor: selectedRideType === 'AIRPORT' && bookingMode === 'GUIDED_SINGLE' ? '#FDFBF7' : '#FFFFFF',
                          cursor: 'pointer',
                          transition: 'all 0.15s ease',
                          position: 'relative'
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                          <Plane size={20} color={selectedRideType === 'AIRPORT' && bookingMode === 'GUIDED_SINGLE' ? '#0A192F' : '#64748B'} />
                          <div style={{ 
                            width: '14px', 
                            height: '14px', 
                            borderRadius: '50%', 
                            border: selectedRideType === 'AIRPORT' && bookingMode === 'GUIDED_SINGLE' ? '4px solid #9A7B4F' : '1px solid #CBD5E1',
                            backgroundColor: '#FFFFFF'
                          }} />
                        </div>
                        <div style={{ fontSize: '13px', fontWeight: 800, color: '#0A192F' }}>Airport transfer</div>
                        <div style={{ fontSize: '11px', color: '#64748B', marginTop: '2px' }}>To or from any airport</div>
                      </div>

                      {/* Card 2: Point to point */}
                      <div 
                        className="ride-type-card"
                        onClick={() => { setSelectedRideType('POINT_TO_POINT'); setBookingMode('GUIDED_SINGLE'); }}
                        style={{
                          padding: '16px 14px',
                          borderRadius: '8px',
                          border: selectedRideType === 'POINT_TO_POINT' && bookingMode === 'GUIDED_SINGLE' ? '2px solid #9A7B4F' : '1px solid #E2E8F0',
                          backgroundColor: selectedRideType === 'POINT_TO_POINT' && bookingMode === 'GUIDED_SINGLE' ? '#FDFBF7' : '#FFFFFF',
                          cursor: 'pointer',
                          transition: 'all 0.15s ease',
                          position: 'relative'
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                          <Car size={20} color={selectedRideType === 'POINT_TO_POINT' && bookingMode === 'GUIDED_SINGLE' ? '#0A192F' : '#64748B'} />
                          <div style={{ 
                            width: '14px', 
                            height: '14px', 
                            borderRadius: '50%', 
                            border: selectedRideType === 'POINT_TO_POINT' && bookingMode === 'GUIDED_SINGLE' ? '4px solid #9A7B4F' : '1px solid #CBD5E1',
                            backgroundColor: '#FFFFFF'
                          }} />
                        </div>
                        <div style={{ fontSize: '13px', fontWeight: 800, color: '#0A192F' }}>Point to point</div>
                        <div style={{ fontSize: '11px', color: '#64748B', marginTop: '2px' }}>Direct. Door to door.</div>
                      </div>

                      {/* Card 3: Hourly service */}
                      <div 
                        className="ride-type-card"
                        onClick={() => { setSelectedRideType('HOURLY'); setBookingMode('GUIDED_SINGLE'); }}
                        style={{
                          padding: '16px 14px',
                          borderRadius: '8px',
                          border: selectedRideType === 'HOURLY' && bookingMode === 'GUIDED_SINGLE' ? '2px solid #9A7B4F' : '1px solid #E2E8F0',
                          backgroundColor: selectedRideType === 'HOURLY' && bookingMode === 'GUIDED_SINGLE' ? '#FDFBF7' : '#FFFFFF',
                          cursor: 'pointer',
                          transition: 'all 0.15s ease',
                          position: 'relative'
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                          <Clock size={20} color={selectedRideType === 'HOURLY' && bookingMode === 'GUIDED_SINGLE' ? '#0A192F' : '#64748B'} />
                          <div style={{ 
                            width: '14px', 
                            height: '14px', 
                            borderRadius: '50%', 
                            border: selectedRideType === 'HOURLY' && bookingMode === 'GUIDED_SINGLE' ? '4px solid #9A7B4F' : '1px solid #CBD5E1',
                            backgroundColor: '#FFFFFF'
                          }} />
                        </div>
                        <div style={{ fontSize: '13px', fontWeight: 800, color: '#0A192F' }}>Hourly service</div>
                        <div style={{ fontSize: '11px', color: '#64748B', marginTop: '2px' }}>On your schedule</div>
                      </div>

                      {/* Card 4: Multi-city / Itinerary Planner */}
                      <div 
                        className="ride-type-card"
                        onClick={() => { setSelectedRideType('MULTI_CITY'); setBookingMode('ITINERARY_PLANNER'); }}
                        style={{
                          padding: '16px 14px',
                          borderRadius: '8px',
                          border: bookingMode === 'ITINERARY_PLANNER' ? '2px solid #9A7B4F' : '1px solid #E2E8F0',
                          backgroundColor: bookingMode === 'ITINERARY_PLANNER' ? '#FDFBF7' : '#FFFFFF',
                          cursor: 'pointer',
                          transition: 'all 0.15s ease',
                          position: 'relative'
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                          <Route size={20} color={bookingMode === 'ITINERARY_PLANNER' ? '#0A192F' : '#64748B'} />
                          <div style={{ 
                            width: '14px', 
                            height: '14px', 
                            borderRadius: '50%', 
                            border: bookingMode === 'ITINERARY_PLANNER' ? '4px solid #9A7B4F' : '1px solid #CBD5E1',
                            backgroundColor: '#FFFFFF'
                          }} />
                        </div>
                        <div style={{ fontSize: '13px', fontWeight: 800, color: '#0A192F' }}>Multi-city</div>
                        <div style={{ fontSize: '11px', color: '#64748B', marginTop: '2px' }}>Multiple stops, simplified</div>
                      </div>

                    </div>
                  </div>

                  {/* BRANCH A: GUIDED SINGLE-LEG FORM (Option 1) */}
                  {bookingMode === 'GUIDED_SINGLE' ? (
                    <div>
                      <h3 style={{ fontFamily: '"Libre Baskerville", Georgia, serif', fontSize: '18px', fontWeight: 700, color: '#0A192F', marginBottom: '16px' }}>
                        Trip details
                      </h3>

                      {/* 1. Pickup & Destination / Duration 2-Column Row with Google Autocomplete */}
                      <div className="trip-datetime-grid">
                        <div>
                          <AddressAutocompleteInput
                            label={selectedRideType === 'AIRPORT' ? 'Pickup location (Airport or Address)' : 'Pickup location'}
                            placeholder={selectedRideType === 'AIRPORT' ? 'Enter airport (e.g. JFK, PHL, EWR) or address' : 'Enter pickup address or landmark'}
                            value={pickupAddress}
                            onChange={(val) => setPickupAddress(val)}
                            required
                          />
                        </div>

                        {selectedRideType === 'HOURLY' ? (
                          <div style={{ position: 'relative' }}>
                            <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#1E293B', marginBottom: '6px' }}>
                              Duration (Hours As Directed) *
                            </label>
                            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                              <Clock size={16} style={{ position: 'absolute', left: '12px', color: '#0A192F', pointerEvents: 'none' }} />
                              <select
                                value={hourlyHours}
                                onChange={(e) => setHourlyHours(Number(e.target.value))}
                                style={{
                                  width: '100%',
                                  padding: '12px 12px 12px 36px',
                                  borderRadius: '8px',
                                  border: '1px solid #CBD5E1',
                                  fontSize: '13px',
                                  color: '#0F172A',
                                  outline: 'none',
                                  backgroundColor: '#FFFFFF',
                                  cursor: 'pointer'
                                }}
                              >
                                <option value={2}>2 Hours (Minimum)</option>
                                <option value={3}>3 Hours</option>
                                <option value={4}>4 Hours (Standard)</option>
                                <option value={5}>5 Hours</option>
                                <option value={6}>6 Hours (Half Day)</option>
                                <option value={8}>8 Hours (Full Day Executive)</option>
                                <option value={10}>10 Hours</option>
                                <option value={12}>12 Hours (All-Day Roadshow)</option>
                              </select>
                            </div>
                          </div>
                        ) : (
                          <div>
                            <AddressAutocompleteInput
                              label={selectedRideType === 'AIRPORT' ? 'Destination (Hotel, Office, or Airport)' : 'Destination'}
                              placeholder="Enter hotel, landmark, or street"
                              value={dropoffAddress}
                              onChange={(val) => setDropoffAddress(val)}
                              required
                            />
                          </div>
                        )}
                      </div>

                      {/* 2. Date & Time 2-Column Row */}
                      <div className="trip-datetime-grid">
                        <div>
                          <label htmlFor="trip-date-input" style={{ display: 'block', fontSize: '11.5px', fontWeight: 700, color: '#475569', marginBottom: '6px' }}>
                            Date
                          </label>
                          <div 
                            onClick={() => {
                              const el = document.getElementById('trip-date-input') as HTMLInputElement | null;
                              try { el?.showPicker?.(); el?.focus(); } catch (_) {}
                            }}
                            style={{ position: 'relative', display: 'flex', alignItems: 'center', cursor: 'pointer' }}
                          >
                            <Calendar size={16} style={{ position: 'absolute', left: '12px', color: '#64748B', pointerEvents: 'none' }} />
                            <input
                              id="trip-date-input"
                              type="date"
                              value={tripDate}
                              min={new Date().toISOString().split('T')[0]}
                              onChange={(e) => setTripDate(e.target.value)}
                              onFocus={(e) => {
                                try {
                                  (e.currentTarget as any).showPicker?.();
                                } catch (_) {}
                              }}
                              onClick={(e) => {
                                try {
                                  (e.currentTarget as any).showPicker?.();
                                } catch (_) {}
                              }}
                              style={{
                                width: '100%',
                                padding: '10px 12px 10px 36px',
                                borderRadius: '6px',
                                border: '1px solid #CBD5E1',
                                fontSize: '13px',
                                color: '#0F172A',
                                outline: 'none',
                                backgroundColor: '#FFFFFF',
                                cursor: 'pointer'
                              }}
                            />
                          </div>
                        </div>

                        <div>
                          <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 700, color: '#475569', marginBottom: '6px' }}>
                            Time
                          </label>
                          <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                            <Clock size={16} style={{ position: 'absolute', left: '12px', color: '#64748B', pointerEvents: 'none' }} />
                            <select
                              value={tripTime}
                              onChange={(e) => setTripTime(e.target.value)}
                              style={{
                                width: '100%',
                                padding: '10px 12px 10px 36px',
                                borderRadius: '6px',
                                border: '1px solid #CBD5E1',
                                fontSize: '13px',
                                color: '#0F172A',
                                outline: 'none',
                                backgroundColor: '#FFFFFF',
                                cursor: 'pointer'
                              }}
                            >
                              {TIME_SLOTS.map(t => (
                                <option key={t} value={t}>{t}</option>
                              ))}
                            </select>
                          </div>
                        </div>
                      </div>

                      {/* 3. Passengers, Bags & Context 3-Column Row */}
                      <div className="pax-bags-notes-grid" style={{ marginBottom: '20px' }}>
                        <div>
                          <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 700, color: '#475569', marginBottom: '6px' }}>
                            Passengers
                          </label>
                          <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                            <Users size={16} style={{ position: 'absolute', left: '12px', color: '#64748B', pointerEvents: 'none' }} />
                            <select
                              value={passengersCount}
                              onChange={(e) => setPassengersCount(Number(e.target.value))}
                              style={{ width: '100%', padding: '10px 12px 10px 36px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '13px', outline: 'none', backgroundColor: '#FFFFFF', cursor: 'pointer' }}
                            >
                              <option value={1}>1</option>
                              <option value={2}>2</option>
                              <option value={3}>3</option>
                              <option value={4}>4</option>
                              <option value={6}>6</option>
                              <option value={10}>10+</option>
                            </select>
                          </div>
                        </div>

                        <div>
                          <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 700, color: '#475569', marginBottom: '6px' }}>
                            Bags
                          </label>
                          <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                            <Briefcase size={16} style={{ position: 'absolute', left: '12px', color: '#64748B', pointerEvents: 'none' }} />
                            <select
                              value={bagsCount}
                              onChange={(e) => setBagsCount(Number(e.target.value))}
                              style={{ width: '100%', padding: '10px 12px 10px 36px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '13px', outline: 'none', backgroundColor: '#FFFFFF', cursor: 'pointer' }}
                            >
                              <option value={1}>1</option>
                              <option value={2}>2</option>
                              <option value={3}>3</option>
                              <option value={4}>4</option>
                              <option value={6}>6</option>
                              <option value={10}>10+</option>
                            </select>
                          </div>
                        </div>

                        <div className="pax-notes-col">
                          <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 700, color: '#475569', marginBottom: '6px' }}>
                            {selectedRideType === 'AIRPORT' ? 'Flight number (optional)' : selectedRideType === 'HOURLY' ? 'Service Area / Itinerary note' : 'Trip notes (optional)'}
                          </label>
                          <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                            {selectedRideType === 'AIRPORT' ? (
                              <Plane size={16} style={{ position: 'absolute', left: '12px', color: '#64748B', pointerEvents: 'none' }} />
                            ) : (
                              <FileText size={16} style={{ position: 'absolute', left: '12px', color: '#64748B', pointerEvents: 'none' }} />
                            )}
                            <input
                              type="text"
                              value={flightNumber}
                              onChange={(e) => setFlightNumber(e.target.value)}
                              placeholder={selectedRideType === 'AIRPORT' ? 'e.g. BA 177' : selectedRideType === 'HOURLY' ? 'e.g. Manhattan Financial District & Midtown' : 'e.g. Building lobby or gate code'}
                              style={{ width: '100%', padding: '10px 32px 10px 36px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '13px', outline: 'none' }}
                            />
                            {flightNumber && (
                              <button onClick={() => setFlightNumber('')} style={{ position: 'absolute', right: '10px', border: 'none', background: 'none', cursor: 'pointer', color: '#94A3B8' }}>
                                <X size={14} />
                              </button>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Return Trip Link & Form */}
                      {selectedRideType !== 'HOURLY' && (
                        <div style={{ marginBottom: '24px' }}>
                          <button
                            type="button"
                            onClick={() => setHasReturnTrip(!hasReturnTrip)}
                            style={{
                              background: 'none',
                              border: 'none',
                              color: '#9A7B4F',
                              fontSize: '13px',
                              fontWeight: 700,
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '6px',
                              padding: 0
                            }}
                          >
                            <Plus size={15} />
                            <span>{hasReturnTrip ? 'Remove return trip' : 'Add a return trip'}</span>
                          </button>

                          {hasReturnTrip && (
                            <div className="return-trip-grid" style={{ marginTop: '12px', padding: '16px', backgroundColor: '#FDFBF7', border: '1px solid #EAE6DF', borderRadius: '8px' }}>
                              <div>
                                <label htmlFor="return-date-input" style={{ display: 'block', fontSize: '11.5px', fontWeight: 700, color: '#475569', marginBottom: '6px' }}>
                                  Return Date
                                </label>
                                <div 
                                  onClick={() => {
                                    const el = document.getElementById('return-date-input') as HTMLInputElement | null;
                                    try { el?.showPicker?.(); el?.focus(); } catch (_) {}
                                  }}
                                  style={{ position: 'relative', display: 'flex', alignItems: 'center', cursor: 'pointer' }}
                                >
                                  <Calendar size={16} style={{ position: 'absolute', left: '12px', color: '#64748B', pointerEvents: 'none' }} />
                                  <input
                                    id="return-date-input"
                                    type="date"
                                    value={returnDate}
                                    min={tripDate || new Date().toISOString().split('T')[0]}
                                    onChange={e => setReturnDate(e.target.value)}
                                    onFocus={(e) => {
                                      try {
                                        (e.currentTarget as any).showPicker?.();
                                      } catch (_) {}
                                    }}
                                    onClick={(e) => {
                                      try {
                                        (e.currentTarget as any).showPicker?.();
                                      } catch (_) {}
                                    }}
                                    style={{
                                      width: '100%',
                                      padding: '10px 12px 10px 36px',
                                      borderRadius: '6px',
                                      border: '1px solid #CBD5E1',
                                      fontSize: '13px',
                                      color: '#0F172A',
                                      outline: 'none',
                                      backgroundColor: '#FFFFFF',
                                      cursor: 'pointer'
                                    }}
                                  />
                                </div>
                              </div>

                              <div>
                                <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 700, color: '#475569', marginBottom: '6px' }}>
                                  Return Time
                                </label>
                                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                                  <Clock size={16} style={{ position: 'absolute', left: '12px', color: '#64748B', pointerEvents: 'none' }} />
                                  <select
                                    value={returnTime}
                                    onChange={e => setReturnTime(e.target.value)}
                                    style={{
                                      width: '100%',
                                      padding: '10px 12px 10px 36px',
                                      borderRadius: '6px',
                                      border: '1px solid #CBD5E1',
                                      fontSize: '13px',
                                      color: '#0F172A',
                                      outline: 'none',
                                      backgroundColor: '#FFFFFF',
                                      cursor: 'pointer'
                                    }}
                                  >
                                    {TIME_SLOTS.map(t => (
                                      <option key={t} value={t}>{t}</option>
                                    ))}
                                  </select>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      )}

                      {quoteError && (
                        <div style={{
                          backgroundColor: '#FEF2F2',
                          border: '1px solid #FECACA',
                          borderRadius: '8px',
                          padding: '12px 14px',
                          color: '#DC2626',
                          fontSize: '12.5px',
                          fontWeight: 600,
                          marginBottom: '16px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '10px'
                        }}>
                          <AlertCircle size={18} color="#DC2626" style={{ flexShrink: 0 }} />
                          <span>{quoteError}</span>
                        </div>
                      )}

                      {/* Primary Gold CTA Button */}
                      <button
                        type="button"
                        onClick={handleProceedToVehicles}
                        disabled={loadingQuote}
                        style={{
                          width: '100%',
                          padding: '14px 20px',
                          backgroundColor: loadingQuote ? '#8C6D3F' : '#9A7B4F',
                          backgroundImage: loadingQuote 
                            ? 'linear-gradient(135deg, #8C6D3F 0%, #6E532E 100%)' 
                            : 'linear-gradient(135deg, #9A7B4F 0%, #7D5E30 100%)',
                          color: '#FFFFFF',
                          border: '1px solid #7D5E30',
                          borderRadius: '8px',
                          fontSize: '14.5px',
                          fontWeight: 800,
                          cursor: loadingQuote ? 'wait' : 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '10px',
                          boxShadow: '0 4px 14px rgba(154, 123, 79, 0.4)',
                          transition: 'all 0.2s ease',
                          letterSpacing: '0.01em'
                        }}
                      >
                        {loadingQuote ? (
                          <>
                            <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} />
                            <span>Calculating Guaranteed Fares...</span>
                          </>
                        ) : (
                          <>
                            <span>Continue to vehicles</span>
                            <ArrowRight size={16} />
                          </>
                        )}
                      </button>

                    </div>
                  ) : (
                    /* BRANCH B: ITINERARY PLANNER MULTI-LEG BUILDER (Option 3) */
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                        <div>
                          <h3 style={{ fontFamily: '"Libre Baskerville", Georgia, serif', fontSize: '18px', fontWeight: 700, color: '#0A192F', margin: 0 }}>
                            Multi-city itinerary
                          </h3>
                          <p style={{ margin: '2px 0 0 0', fontSize: '12px', color: '#64748B' }}>
                            Multiple stops, one seamless experience.
                          </p>
                        </div>

                        <button 
                          onClick={() => { setBookingMode('GUIDED_SINGLE'); setSelectedRideType('AIRPORT'); }}
                          style={{ background: 'none', border: 'none', color: '#9A7B4F', fontSize: '12px', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                        >
                          <span>Change trip type</span>
                          <ChevronDown size={14} />
                        </button>
                      </div>

                      {/* Multi-Leg Stepper Timeline */}
                      <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        
                        {/* Connecting Vertical Line */}
                        <div style={{ position: 'absolute', left: '16px', top: '24px', bottom: '24px', width: '2px', backgroundColor: '#CBD5E1', zIndex: 1 }} />

                        {itineraryLegs.map((leg, idx) => (
                          <div key={leg.id} style={{ display: 'flex', gap: '16px', alignItems: 'flex-start', position: 'relative', zIndex: 2 }}>
                            
                            {/* Step Bubble Number */}
                            <div style={{
                              width: '32px',
                              height: '32px',
                              borderRadius: '50%',
                              backgroundColor: '#0A192F',
                              color: '#FFFFFF',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: '13px',
                              fontWeight: 800,
                              flexShrink: 0,
                              marginTop: '8px'
                            }}>
                              {idx + 1}
                            </div>

                            {/* Leg Card Container */}
                            <div style={{
                              flex: 1,
                              backgroundColor: '#FFFFFF',
                              border: '1px solid #E2E8F0',
                              borderRadius: '8px',
                              padding: '18px',
                              boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
                            }}>
                              
                              {/* Leg Card Header */}
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', borderBottom: '1px solid #F1F5F9', paddingBottom: '10px' }}>
                                <div style={{ fontSize: '14px', fontWeight: 800, color: '#0A192F' }}>
                                  {leg.title}
                                </div>
                                
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                  <button
                                    onClick={() => handleToggleLegExpanded(idx)}
                                    style={{ background: 'none', border: 'none', color: '#9A7B4F', fontSize: '12px', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                                  >
                                    <Edit3 size={13} />
                                    <span>{leg.is_expanded ? 'Close' : 'Edit'}</span>
                                    {leg.is_expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                                  </button>

                                  {itineraryLegs.length > 1 && (
                                    <button
                                      onClick={() => handleRemoveItineraryLeg(idx)}
                                      style={{ background: 'none', border: 'none', color: '#EF4444', cursor: 'pointer', padding: '2px' }}
                                      title="Remove Leg"
                                    >
                                      <Trash2 size={13} />
                                    </button>
                                  )}
                                </div>
                              </div>

                              {/* Route Direction: Origin -> Destination / Expanded Editor */}
                              {leg.is_expanded ? (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginBottom: '16px' }}>
                                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                                    <AddressAutocompleteInput
                                      label="Leg Pickup Location"
                                      placeholder="Enter airport, hotel, or street address"
                                      value={leg.origin_address}
                                      onChange={(val) => {
                                        const updated = [...itineraryLegs];
                                        updated[idx].origin_address = val;
                                        setItineraryLegs(updated);
                                      }}
                                    />
                                    <AddressAutocompleteInput
                                      label="Leg Destination Location"
                                      placeholder="Enter destination hotel, landmark, or airport"
                                      value={leg.destination_address}
                                      onChange={(val) => {
                                        const updated = [...itineraryLegs];
                                        updated[idx].destination_address = val;
                                        setItineraryLegs(updated);
                                      }}
                                    />
                                  </div>

                                  <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr 1fr 1fr 1.2fr', gap: '10px' }}>
                                    <div>
                                      <label style={{ fontSize: '10.5px', fontWeight: 700, color: '#64748B', display: 'block', marginBottom: '4px' }}>Date</label>
                                      <input
                                        type="date"
                                        value={leg.date}
                                        min={new Date().toISOString().split('T')[0]}
                                        onFocus={(e) => {
                                          try {
                                            (e.currentTarget as any).showPicker?.();
                                          } catch (_) {}
                                        }}
                                        onClick={(e) => {
                                          try {
                                            (e.currentTarget as any).showPicker?.();
                                          } catch (_) {}
                                        }}
                                        onChange={(e) => {
                                          const updated = [...itineraryLegs];
                                          updated[idx].date = e.target.value;
                                          setItineraryLegs(updated);
                                        }}
                                        style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '12px', outline: 'none', backgroundColor: '#FFFFFF', cursor: 'pointer' }}
                                      />
                                    </div>
                                    <div>
                                      <label style={{ fontSize: '10.5px', fontWeight: 700, color: '#64748B', display: 'block', marginBottom: '4px' }}>Time</label>
                                      <select
                                        value={leg.time}
                                        onChange={(e) => {
                                          const updated = [...itineraryLegs];
                                          updated[idx].time = e.target.value;
                                          setItineraryLegs(updated);
                                        }}
                                        style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '12px', outline: 'none', backgroundColor: '#FFFFFF', cursor: 'pointer' }}
                                      >
                                        {TIME_SLOTS.map(t => (
                                          <option key={t} value={t}>{t}</option>
                                        ))}
                                      </select>
                                    </div>
                                    <div>
                                      <label style={{ fontSize: '10.5px', fontWeight: 700, color: '#64748B', display: 'block', marginBottom: '4px' }}>Passengers</label>
                                      <select
                                        value={leg.passengers}
                                        onChange={(e) => {
                                          const updated = [...itineraryLegs];
                                          updated[idx].passengers = Number(e.target.value);
                                          setItineraryLegs(updated);
                                        }}
                                        style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '12px', outline: 'none', backgroundColor: '#FFFFFF' }}
                                      >
                                        <option value={1}>1 Pax</option>
                                        <option value={2}>2 Pax</option>
                                        <option value={3}>3 Pax</option>
                                        <option value={4}>4 Pax</option>
                                        <option value={6}>6 Pax</option>
                                      </select>
                                    </div>
                                    <div>
                                      <label style={{ fontSize: '10.5px', fontWeight: 700, color: '#64748B', display: 'block', marginBottom: '4px' }}>Bags</label>
                                      <select
                                        value={leg.bags}
                                        onChange={(e) => {
                                          const updated = [...itineraryLegs];
                                          updated[idx].bags = Number(e.target.value);
                                          setItineraryLegs(updated);
                                        }}
                                        style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '12px', outline: 'none', backgroundColor: '#FFFFFF' }}
                                      >
                                        <option value={1}>1 Bag</option>
                                        <option value={2}>2 Bags</option>
                                        <option value={3}>3 Bags</option>
                                        <option value={4}>4 Bags</option>
                                        <option value={6}>6 Bags</option>
                                      </select>
                                    </div>
                                    <div>
                                      <label style={{ fontSize: '10.5px', fontWeight: 700, color: '#64748B', display: 'block', marginBottom: '4px' }}>Flight # (optional)</label>
                                      <input
                                        type="text"
                                        value={leg.flight_number || ''}
                                        placeholder="e.g. BA 177"
                                        onChange={(e) => {
                                          const updated = [...itineraryLegs];
                                          updated[idx].flight_number = e.target.value;
                                          setItineraryLegs(updated);
                                        }}
                                        style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '12px', outline: 'none' }}
                                      />
                                    </div>
                                  </div>
                                </div>
                              ) : (
                                <div>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '14px' }}>
                                    <div style={{ flex: 1 }}>
                                      <div style={{ fontSize: '10px', fontWeight: 800, color: '#94A3B8', textTransform: 'uppercase' }}>PICKUP</div>
                                      <div style={{ fontSize: '13px', fontWeight: 800, color: '#0F172A', marginTop: '2px' }}>{leg.origin_address.split(',')[0]}</div>
                                      <div style={{ fontSize: '11px', color: '#64748B' }}>{leg.origin_city}</div>
                                    </div>

                                    <span style={{ color: '#94A3B8', fontWeight: 800, fontSize: '18px' }}>→</span>

                                    <div style={{ flex: 1 }}>
                                      <div style={{ fontSize: '10px', fontWeight: 800, color: '#94A3B8', textTransform: 'uppercase' }}>DESTINATION</div>
                                      <div style={{ fontSize: '13px', fontWeight: 800, color: '#0F172A', marginTop: '2px' }}>{leg.destination_address.split(',')[0]}</div>
                                      <div style={{ fontSize: '11px', color: '#64748B' }}>{leg.destination_city}</div>
                                    </div>
                                  </div>

                                  {/* Parameters Pills Row */}
                                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '14px', fontSize: '11.5px', color: '#475569', backgroundColor: '#F8FAFC', padding: '10px 12px', borderRadius: '6px', marginBottom: '14px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                                      <Calendar size={13} color="#9A7B4F" />
                                      <span>{leg.date}</span>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                                      <Clock size={13} color="#9A7B4F" />
                                      <span>{leg.time}</span>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                                      <Users size={13} color="#9A7B4F" />
                                      <span>{leg.passengers} Passengers</span>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                                      <Briefcase size={13} color="#9A7B4F" />
                                      <span>{leg.bags} Bags</span>
                                    </div>
                                    {leg.flight_number && (
                                      <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                                        <Plane size={13} color="#0078D4" />
                                        <span>Flight {leg.flight_number}</span>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              )}

                              {/* Interactive Inline Vehicle Class Selector */}
                              <div style={{ padding: '12px 14px', backgroundColor: '#F8FAFC', border: '1.5px solid #E2E8F0', borderRadius: '8px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', flexWrap: 'wrap', gap: '6px' }}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    <Car size={15} color="#9A7B4F" />
                                    <span style={{ fontSize: '11px', fontWeight: 800, color: '#0A192F', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                      Vehicle Class for Leg {idx + 1}
                                    </span>
                                  </div>
                                  <span style={{ fontSize: '11px', color: '#64748B' }}>
                                    Active: <strong style={{ color: '#0A192F' }}>{leg.vehicle_title || 'First Class Sedan'}</strong>
                                  </span>
                                </div>

                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '8px' }}>
                                  {US_VEHICLE_OPTIONS.map((opt) => {
                                    const isChosen = (leg.vehicle_class || 'FIRST_CLASS') === opt.type;
                                    const isOptUnderMaint = activeFleetClasses[opt.type] === false;
                                    return (
                                      <button
                                        key={opt.type}
                                        type="button"
                                        disabled={isOptUnderMaint}
                                        onClick={() => {
                                          if (isOptUnderMaint) return;
                                          const updated = [...itineraryLegs];
                                          updated[idx].vehicle_class = opt.type;
                                          updated[idx].vehicle_title = opt.title;
                                          updated[idx].vehicle_desc = opt.models || opt.subtitle || 'Spacious. Refined. Always professional.';
                                          setItineraryLegs(updated);
                                        }}
                                        style={{
                                          padding: '8px 10px',
                                          borderRadius: '6px',
                                          border: isChosen ? '2px solid #9A7B4F' : isOptUnderMaint ? '1px dashed #CBD5E1' : '1px solid #CBD5E1',
                                          backgroundColor: isOptUnderMaint ? '#F1F5F9' : isChosen ? '#FFFDF9' : '#FFFFFF',
                                          cursor: isOptUnderMaint ? 'not-allowed' : 'pointer',
                                          opacity: isOptUnderMaint ? 0.55 : 1,
                                          textAlign: 'left',
                                          display: 'flex',
                                          flexDirection: 'column',
                                          gap: '3px',
                                          transition: 'all 0.15s ease',
                                          boxShadow: isChosen ? '0 2px 6px rgba(154, 123, 79, 0.15)' : 'none'
                                        }}
                                      >
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                          <span style={{ fontSize: '11.5px', fontWeight: isChosen ? 800 : 700, color: isOptUnderMaint ? '#94A3B8' : isChosen ? '#9A7B4F' : '#0A192F' }}>
                                            {opt.title.replace('Mercedes-Benz ', '')}
                                          </span>
                                          {isChosen && !isOptUnderMaint && <Check size={13} color="#9A7B4F" />}
                                        </div>
                                        <div style={{ fontSize: '10px', color: isOptUnderMaint ? '#EF4444' : '#64748B', fontWeight: isOptUnderMaint ? 700 : 500 }}>
                                          {isOptUnderMaint ? '🛠️ Under Repair' : `${opt.pax} Pax · ${opt.luggage} Bags`}
                                        </div>
                                      </button>
                                    );
                                  })}
                                </div>
                              </div>

                            </div>

                          </div>
                        ))}

                        {/* Add Another Ride Button */}
                        <div style={{ marginLeft: '48px' }}>
                          <button
                            onClick={handleAddItineraryLeg}
                            style={{
                              padding: '10px 18px',
                              backgroundColor: '#FFFFFF',
                              border: '1px dashed #9A7B4F',
                              color: '#9A7B4F',
                              borderRadius: '6px',
                              fontSize: '12.5px',
                              fontWeight: 700,
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '6px'
                            }}
                          >
                            <Plus size={15} />
                            <span>Add another ride</span>
                          </button>
                        </div>

                      </div>

                      {/* Multi-Leg Continue CTA */}
                      <div style={{ marginTop: '24px', paddingTop: '16px', borderTop: '1px solid #EAE6DF' }}>
                        <button
                          type="button"
                          onClick={handleProceedToVehicles}
                          disabled={loadingQuote}
                          style={{
                            width: '100%',
                            padding: '14px 20px',
                            backgroundColor: loadingQuote ? '#8C6D3F' : '#9A7B4F',
                            backgroundImage: loadingQuote 
                              ? 'linear-gradient(135deg, #8C6D3F 0%, #6E532E 100%)' 
                              : 'linear-gradient(135deg, #9A7B4F 0%, #7D5E30 100%)',
                            color: '#FFFFFF',
                            border: '1px solid #7D5E30',
                            borderRadius: '8px',
                            fontSize: '14.5px',
                            fontWeight: 800,
                            cursor: loadingQuote ? 'wait' : 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '10px',
                            boxShadow: '0 4px 14px rgba(154, 123, 79, 0.4)',
                            transition: 'all 0.2s ease',
                            letterSpacing: '0.01em'
                          }}
                        >
                          {loadingQuote ? (
                            <>
                              <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} />
                              <span>Pricing Master Itinerary...</span>
                            </>
                          ) : (
                            <>
                              <span>Continue to vehicles</span>
                              <ArrowRight size={16} />
                            </>
                          )}
                        </button>
                      </div>

                    </div>
                  )}

                </div>
              )}

              {/* STEP 2: VEHICLE FLEET SELECTION (Option 1 & Option 3) */}
              {wizardStep === 2 && (
                <div style={{ backgroundColor: '#FFFFFF', borderRadius: '12px', border: '1px solid #EAE6DF', padding: '28px', boxShadow: '0 2px 10px rgba(0,0,0,0.03)' }}>
                  
                  {/* Header Row Matching Reference */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                      <div style={{
                        width: '42px',
                        height: '42px',
                        borderRadius: '50%',
                        backgroundColor: '#F5EFE6',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0
                      }}>
                        <Car size={22} color="#9A7B4F" />
                      </div>
                      <div>
                        <h2 style={{ fontFamily: '"Libre Baskerville", Georgia, serif', fontSize: '24px', fontWeight: 700, color: '#0A192F', margin: 0 }}>
                          Select your vehicle
                        </h2>
                        <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#64748B' }}>
                          Choose the vehicle that fits your group and travel needs.
                        </p>
                      </div>
                    </div>

                    <button 
                      onClick={() => setWizardStep(1)} 
                      style={{ background: 'none', border: 'none', color: '#9A7B4F', fontSize: '12.5px', fontWeight: 700, cursor: 'pointer', padding: '6px 10px' }}
                    >
                      ← Back to Details
                    </button>
                  </div>

                  {/* Multi-Leg Itinerary Switcher Tabs (If N-Legs or Round-Trip) */}
                  {(hasReturnTrip || (bookingMode === 'ITINERARY_PLANNER' && itineraryLegs.length > 1)) && (
                    <div style={{ backgroundColor: '#F8FAFC', padding: '12px 16px', borderRadius: '8px', border: '1px solid #E2E8F0', marginBottom: '20px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                        <span style={{ fontSize: '11px', fontWeight: 800, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                          {hasReturnTrip ? 'Round-Trip Corridor Selection (Outbound & Return)' : `Select vehicle per itinerary leg (${itineraryLegs.length} stops)`}
                        </span>
                        <button
                          onClick={() => handleApplyVehicleToAllLegs(vehicleClass)}
                          style={{ background: 'none', border: 'none', color: '#9A7B4F', fontSize: '11.5px', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                        >
                          <span>Apply selected class to all {itineraryLegs.length} legs</span>
                        </button>
                      </div>

                      <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '4px' }}>
                        {itineraryLegs.map((leg, idx) => {
                          const isActive = selectedLegIndex === idx;
                          return (
                            <button
                              key={leg.id || idx}
                              onClick={() => setSelectedLegIndex(idx)}
                              style={{
                                padding: '8px 14px',
                                borderRadius: '6px',
                                border: isActive ? '1.5px solid #9A7B4F' : '1px solid #CBD5E1',
                                backgroundColor: isActive ? '#FFFFFF' : '#F1F5F9',
                                color: isActive ? '#0A192F' : '#64748B',
                                fontSize: '12px',
                                fontWeight: isActive ? 800 : 600,
                                cursor: 'pointer',
                                whiteSpace: 'nowrap',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px'
                              }}
                            >
                              <span>{idx === 0 ? 'Leg 1 · Outbound' : idx === 1 ? 'Leg 2 · Return' : `Leg ${idx + 1}`}: {leg.origin_address ? leg.origin_address.split(',')[0] : 'Origin'} → {leg.destination_address ? leg.destination_address.split(',')[0] : 'Dest'}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Vehicle Cards List */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                    {US_VEHICLE_OPTIONS.map((veh) => {
                      const isSelected = vehicleClass === veh.type;
                      const isExpanded = Boolean(expandedVehicles[veh.type] ?? isSelected);
                      const qData = vehicleQuotes[veh.type];
                      
                      // Authoritative live API price
                      const fareAmount = qData ? (
                        Number(
                          (qData as any).all_inclusive_total ||
                          qData.total_gross ||
                          qData.final_payable_amount ||
                          (qData as any).total_amount_usd ||
                          qData.subtotal_net ||
                          0
                        )
                      ).toFixed(0) : '...';

                      const isUnderMaintenance = activeFleetClasses[veh.type] === false;

                      return (
                        <div
                          key={veh.type}
                          className="vehicle-card-container"
                          onClick={() => {
                            if (isUnderMaintenance) {
                              setQuoteError(`The ${veh.title} is currently under maintenance / repair and unavailable for booking. Please select another active fleet class.`);
                              return;
                            }
                            handleSelectVehicleClass(veh.type);
                          }}
                          style={{
                            border: isSelected ? '1.5px solid #9A7B4F' : isUnderMaintenance ? '1px dashed #CBD5E1' : '1px solid #EAE6DF',
                            backgroundColor: isUnderMaintenance ? '#F8FAFC' : isSelected ? '#FCFAF7' : '#FFFFFF',
                            cursor: isUnderMaintenance ? 'not-allowed' : 'pointer',
                            opacity: isUnderMaintenance ? 0.6 : 1,
                            boxShadow: isSelected ? '0 4px 14px rgba(154, 123, 79, 0.08)' : '0 1px 3px rgba(0,0,0,0.02)'
                          }}
                        >
                          {/* Main Flex Row */}
                          <div className="vehicle-card-main-row">
                            
                            {/* Left: Radio & Render */}
                            <div className="vehicle-card-left-block">
                              
                              {/* Radio Button Checkmark */}
                              <div style={{
                                width: '22px',
                                height: '22px',
                                borderRadius: '50%',
                                backgroundColor: isSelected ? '#9A7B4F' : isUnderMaintenance ? '#E2E8F0' : '#FFFFFF',
                                border: isSelected ? 'none' : '1.5px solid #CBD5E1',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: '#FFFFFF',
                                flexShrink: 0
                              }}>
                                {isSelected && <Check size={13} strokeWidth={3} />}
                              </div>

                              {/* Realistic Cutout Vehicle Render */}
                              <div className="vehicle-card-img-wrapper">
                                <img
                                  src={veh.photoUrl}
                                  alt={veh.title}
                                  style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', filter: isUnderMaintenance ? 'grayscale(80%)' : 'none' }}
                                  onError={(e) => {
                                    // Smooth graceful fallback
                                    (e.currentTarget as any).style.opacity = '0.3';
                                  }}
                                />
                              </div>

                              {/* Title, Subtitle, Capacity */}
                              <div style={{ minWidth: 0 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                                  <span className="vehicle-card-title" style={{ fontSize: '16px', fontWeight: 800, color: isUnderMaintenance ? '#64748B' : '#0A192F' }}>
                                    {veh.title}
                                  </span>
                                  {isUnderMaintenance ? (
                                    <span style={{ fontSize: '10px', fontWeight: 800, color: '#DC2626', backgroundColor: '#FEF2F2', border: '1px solid #FECACA', padding: '1px 7px', borderRadius: '4px' }}>
                                      🛠️ Under Maintenance (Unavailable)
                                    </span>
                                  ) : veh.badge ? (
                                    <span style={{ fontSize: '9.5px', fontWeight: 800, color: '#9A7B4F', backgroundColor: '#F5EFE6', padding: '1px 6px', borderRadius: '3px' }}>
                                      {veh.badge}
                                    </span>
                                  ) : null}
                                </div>

                                <div className="vehicle-card-models" style={{ fontSize: '12px', color: '#64748B', marginTop: '2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                  {veh.models}
                                </div>

                                <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginTop: '6px', fontSize: '11.5px', color: '#475569', fontWeight: 600 }}>
                                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                    <User size={13} color="#0A192F" />
                                    <span>{veh.pax} passengers</span>
                                  </span>
                                  <span style={{ color: '#E2E8F0' }}>|</span>
                                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                    <Briefcase size={13} color="#0A192F" />
                                    <span>{veh.luggage} bags</span>
                                  </span>
                                </div>
                              </div>

                            </div>

                            {/* Middle Right: Feature Callouts */}
                            <div className="vehicle-features-callout">
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <Layers size={13} color="#9A7B4F" />
                                <span>{veh.features[0]}</span>
                              </div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <Snowflake size={13} color="#9A7B4F" />
                                <span>{veh.features[1]}</span>
                              </div>
                            </div>

                            {/* Far Right: Pricing & Chevron */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexShrink: 0 }}>
                              <div style={{ textAlign: 'right' }}>
                                {isUnderMaintenance ? (
                                  <div style={{ fontSize: '13px', fontWeight: 800, color: '#94A3B8' }}>
                                    Unavailable
                                  </div>
                                ) : (
                                  <>
                                    <div className="vehicle-card-price" style={{ fontFamily: '"Libre Baskerville", Georgia, serif', fontSize: '22px', fontWeight: 800, color: '#0A192F' }}>
                                      ${fareAmount}
                                    </div>
                                    <div style={{ fontSize: '10.5px', color: '#64748B', fontWeight: 600 }}>
                                      {hasReturnTrip ? 'roundtrip (2 rides)' : ((bookingMode === 'ITINERARY_PLANNER' && itineraryLegs.length > 1) ? `total (${itineraryLegs.length} rides)` : 'per ride')}
                                    </div>
                                  </>
                                )}
                              </div>

                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (!isUnderMaintenance) toggleExpandVehicle(veh.type);
                                }}
                                disabled={isUnderMaintenance}
                                style={{ background: 'none', border: 'none', color: isUnderMaintenance ? '#CBD5E1' : '#0A192F', cursor: isUnderMaintenance ? 'not-allowed' : 'pointer', padding: '4px' }}
                              >
                                {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                              </button>
                            </div>

                          </div>

                          {/* Expandable Pricing Breakdown & Vendor Disclosure Drawer */}
                          {isExpanded && qData && (
                            <div className="vehicle-drawer-grid" style={{ gridTemplateColumns: (hasReturnTrip || (qData.legs && qData.legs.length > 1)) ? 'repeat(2, 1fr)' : 'repeat(3, 1fr)' }}>
                              {(hasReturnTrip || (qData.legs && qData.legs.length > 1)) ? (
                                <>
                                  <div style={{ backgroundColor: '#FFFFFF', padding: '8px 10px', borderRadius: '6px', border: '1px solid #E2E8F0' }}>
                                    <div style={{ fontWeight: 800, color: '#0A192F', marginBottom: '2px' }}>
                                      Outbound Leg: ${Number(qData.legs?.[0]?.total_gross || qData.legs?.[0]?.total_leg_amt || (Number(fareAmount) / 2)).toFixed(2)}
                                    </div>
                                    <div>{qData.legs?.[0]?.assigned_vendor_name || 'ANB Limo Philadelphia (PA)'}</div>
                                  </div>
                                  <div style={{ backgroundColor: '#FFFFFF', padding: '8px 10px', borderRadius: '6px', border: '1px solid #E2E8F0' }}>
                                    <div style={{ fontWeight: 800, color: '#0A192F', marginBottom: '2px' }}>
                                      Return Leg: ${Number(qData.legs?.[1]?.total_gross || qData.legs?.[1]?.total_leg_amt || (Number(fareAmount) / 2)).toFixed(2)}
                                    </div>
                                    <div>{qData.legs?.[1]?.assigned_vendor_name || 'New York Executive Fleet (NY)'}</div>
                                  </div>
                                </>
                              ) : (
                                <>
                                  <div>
                                    <span style={{ fontWeight: 700, color: '#0A192F' }}>Base Fleet Tariff: </span>
                                    <span>${qData.base_net ? Number(qData.base_net).toFixed(2) : ((Number(fareAmount) * 0.45).toFixed(2))}</span>
                                  </div>
                                  <div>
                                    <span style={{ fontWeight: 700, color: '#0A192F' }}>Tolls & Port Authority: </span>
                                    <span>${qData.estimated_tolls_net ? Number(qData.estimated_tolls_net).toFixed(2) : 'Included'}</span>
                                  </div>
                                  <div>
                                    <span style={{ fontWeight: 700, color: '#0A192F' }}>Sales Tax: </span>
                                    <span>${qData.tax_amount ? Number(qData.tax_amount).toFixed(2) : 'Included'}</span>
                                  </div>
                                </>
                              )}
                            </div>
                          )}

                        </div>
                      );
                    })}
                  </div>

                  {/* Footer Row Matching Reference */}
                  <div style={{ marginTop: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #F1F5F9', paddingTop: '18px' }}>
                    <div style={{ fontSize: '11.5px', color: '#64748B' }}>
                      Illustrative fares • Vehicle models may vary.
                    </div>

                    <button
                      type="button"
                      onClick={() => setWizardStep(3)}
                      style={{
                        padding: '13px 30px',
                        backgroundColor: '#9A7B4F',
                        backgroundImage: 'linear-gradient(135deg, #9A7B4F 0%, #7D5E30 100%)',
                        color: '#FFFFFF',
                        border: '1px solid #7D5E30',
                        borderRadius: '8px',
                        fontSize: '13.5px',
                        fontWeight: 800,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        boxShadow: '0 3px 10px rgba(154, 123, 79, 0.35)',
                        transition: 'all 0.2s ease'
                      }}
                    >
                      <span>Continue to Extras</span>
                      <ArrowRight size={15} />
                    </button>
                  </div>

                </div>
              )}

              {/* STEP 3: EXTRAS & TRAVEL PREFERENCES */}
              {wizardStep === 3 && (
                <div style={{ backgroundColor: '#FFFFFF', borderRadius: '12px', border: '1px solid #EAE6DF', padding: '28px', boxShadow: '0 2px 10px rgba(0,0,0,0.03)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                    <div>
                      <h2 style={{ fontFamily: '"Libre Baskerville", Georgia, serif', fontSize: '22px', fontWeight: 700, color: '#0A192F', margin: 0 }}>
                        Travel preferences & extras
                      </h2>
                      <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#64748B' }}>
                        Customize your chauffeur ride for maximum comfort and VIP staging.
                      </p>
                    </div>

                    <button 
                      onClick={() => setWizardStep(bookingMode === 'ITINERARY_PLANNER' && !hasReturnTrip ? 1 : 2)} 
                      style={{ background: 'none', border: 'none', color: '#9A7B4F', fontSize: '12px', fontWeight: 700, cursor: 'pointer' }}
                    >
                      ← {bookingMode === 'ITINERARY_PLANNER' && !hasReturnTrip ? 'Back to Itinerary' : 'Back to Vehicles'}
                    </button>
                  </div>

                  <div className="extras-selection-grid" style={{ marginBottom: '24px' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '12px', backgroundColor: '#F8FAFC', borderRadius: '6px', border: '1px solid #E2E8F0', cursor: 'pointer' }}>
                      <input type="checkbox" checked={amenities.freeWait60Min} onChange={e => setAmenities({ ...amenities, freeWait60Min: e.target.checked })} />
                      <div>
                        <div style={{ fontSize: '12.5px', fontWeight: 700, color: '#0F172A' }}>60 Min Free Airport Waiting</div>
                        <div style={{ fontSize: '10.5px', color: '#64748B' }}>Automated radar wheels-down tracking</div>
                      </div>
                    </label>

                    <label style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '12px', backgroundColor: '#F8FAFC', borderRadius: '6px', border: '1px solid #E2E8F0', cursor: 'pointer' }}>
                      <input type="checkbox" checked={amenities.meetAndGreet} onChange={e => setAmenities({ ...amenities, meetAndGreet: e.target.checked })} />
                      <div>
                        <div style={{ fontSize: '12.5px', fontWeight: 700, color: '#0F172A' }}>Chauffeur Meet & Greet</div>
                        <div style={{ fontSize: '10.5px', color: '#64748B' }}>Name-board at baggage claim/FBO</div>
                      </div>
                    </label>

                    <label style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '12px', backgroundColor: '#F8FAFC', borderRadius: '6px', border: '1px solid #E2E8F0', cursor: 'pointer' }}>
                      <input type="checkbox" checked={amenities.quietRide} onChange={e => setAmenities({ ...amenities, quietRide: e.target.checked })} />
                      <div>
                        <div style={{ fontSize: '12.5px', fontWeight: 700, color: '#0F172A' }}>Quiet Ride Mode</div>
                        <div style={{ fontSize: '10.5px', color: '#64748B' }}>Conference call privacy</div>
                      </div>
                    </label>

                    <label style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '12px', backgroundColor: '#F8FAFC', borderRadius: '6px', border: '1px solid #E2E8F0', cursor: 'pointer' }}>
                      <input type="checkbox" checked={amenities.bottledWater} onChange={e => setAmenities({ ...amenities, bottledWater: e.target.checked })} />
                      <div>
                        <div style={{ fontSize: '12.5px', fontWeight: 700, color: '#0F172A' }}>Chilled Water & Mints</div>
                        <div style={{ fontSize: '10.5px', color: '#64748B' }}>Complimentary Fiji / San Pellegrino</div>
                      </div>
                    </label>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                    <button
                      onClick={() => setWizardStep(4)}
                      style={{ padding: '12px 28px', backgroundColor: '#9A7B4F', color: '#FFFFFF', border: 'none', borderRadius: '6px', fontSize: '13px', fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
                    >
                      <span>Review & Pre-Auth</span>
                      <ArrowRight size={15} />
                    </button>
                  </div>
                </div>
              )}

              {/* STEP 4: PASSENGER DETAILS & CARD PRE-AUTH */}
              {wizardStep === 4 && (
                <div style={{ backgroundColor: '#FFFFFF', borderRadius: '12px', border: '1px solid #EAE6DF', padding: '28px', boxShadow: '0 2px 10px rgba(0,0,0,0.03)' }}>
                  
                  {/* Step Header */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
                    <div>
                      <h2 style={{ fontFamily: '"Libre Baskerville", Georgia, serif', fontSize: '22px', fontWeight: 700, color: '#0A192F', margin: 0 }}>
                        Passenger & Card Pre-Auth Hold
                      </h2>
                      <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#64748B' }}>
                        Your card will be authorized and held in escrow until chauffeur completion.
                      </p>
                    </div>

                    <button onClick={() => setWizardStep(3)} style={{ background: 'none', border: 'none', color: '#9A7B4F', fontSize: '12px', fontWeight: 700, cursor: 'pointer' }}>
                      ← Back to Extras
                    </button>
                  </div>

                  {/* Guaranteed Escrow Cost Summary Banner */}
                  <div style={{
                    backgroundColor: '#FDFBF7',
                    border: '1.5px solid #9A7B4F',
                    borderRadius: '8px',
                    padding: '16px 20px',
                    marginBottom: '22px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    boxShadow: '0 2px 6px rgba(154, 123, 79, 0.08)'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div style={{ width: '38px', height: '38px', borderRadius: '50%', backgroundColor: '#F5EFE6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Car size={18} color="#9A7B4F" />
                      </div>
                      <div>
                        <div style={{ fontSize: '14px', fontWeight: 800, color: '#0A192F' }}>
                          {US_VEHICLE_OPTIONS.find(v => v.type === vehicleClass)?.title || 'Executive Vehicle'}
                        </div>
                        <div style={{ fontSize: '11.5px', color: '#64748B' }}>
                          All-inclusive guaranteed rate (includes all tolls, airport fees & applicable taxes)
                        </div>
                      </div>
                    </div>

                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '10px', fontWeight: 800, color: '#8C6D3F', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                        Total Pre-Auth Hold
                      </div>
                      <div style={{ fontFamily: '"Libre Baskerville", Georgia, serif', fontSize: '24px', fontWeight: 800, color: '#0A192F', marginTop: '2px' }}>
                        ${activeTotalFormatted} <span style={{ fontSize: '12px', fontWeight: 700, color: '#64748B' }}>USD</span>
                      </div>
                    </div>
                  </div>

                  {/* 1. Primary Passenger Details */}
                  <div style={{ marginBottom: '18px' }}>
                    <div style={{ fontSize: '12.5px', fontWeight: 800, color: '#0A192F', marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
                      1. Lead Passenger Information
                    </div>

                    <div className="passenger-inputs-grid" style={{ marginBottom: '12px' }}>
                      <div>
                        <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>
                          Passenger Full Name *
                        </label>
                        <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                          <User size={15} style={{ position: 'absolute', left: '12px', color: '#64748B', pointerEvents: 'none' }} />
                          <input
                            type="text"
                            placeholder="e.g. Eleanor Vance"
                            value={party.passenger_name}
                            onChange={e => setParty({ ...party, passenger_name: e.target.value })}
                            style={{ width: '100%', padding: '10px 12px 10px 36px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '13px', outline: 'none' }}
                          />
                        </div>
                      </div>

                      <div>
                        <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>
                          Passenger Mobile Phone (for Chauffeur SMS) *
                        </label>
                        <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                          <Phone size={15} style={{ position: 'absolute', left: '12px', color: '#64748B', pointerEvents: 'none' }} />
                          <input
                            type="tel"
                            placeholder="e.g. +1 (555) 234-5678"
                            value={party.passenger_phone}
                            onChange={e => setParty({ ...party, passenger_phone: e.target.value })}
                            style={{ width: '100%', padding: '10px 12px 10px 36px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '13px', outline: 'none' }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* 2. Different Cardholder / Corporate Booker Toggle */}
                  <div style={{ backgroundColor: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '8px', padding: '14px 16px', marginBottom: '22px' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', fontSize: '13px', fontWeight: 700, color: '#0F172A' }}>
                      <input
                        type="checkbox"
                        checked={isBookerDifferentFromPassenger}
                        onChange={e => setIsBookerDifferentFromPassenger(e.target.checked)}
                        style={{ width: '16px', height: '16px', accentColor: '#9A7B4F', cursor: 'pointer' }}
                      />
                      <span>Cardholder / Booker is different from the passenger (Executive Assistant / Corporate Account)</span>
                    </label>

                    {isBookerDifferentFromPassenger && (
                      <div className="booker-inputs-grid" style={{ marginTop: '14px', paddingTop: '14px', borderTop: '1px dashed #CBD5E1' }}>
                        <div>
                          <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>
                            Cardholder Full Name *
                          </label>
                          <input
                            type="text"
                            placeholder="e.g. Arthur Davies"
                            value={cardDetails.cardHolder || party.booker_name}
                            onChange={e => {
                              setCardDetails({ ...cardDetails, cardHolder: e.target.value });
                              setParty({ ...party, booker_name: e.target.value });
                            }}
                            style={{ width: '100%', padding: '9px 12px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '13px', outline: 'none', backgroundColor: '#FFFFFF' }}
                          />
                        </div>

                        <div>
                          <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>
                            Booker / Billing Email (for Invoice & Receipt) *
                          </label>
                          <input
                            type="email"
                            placeholder="e.g. billing@executive-corp.com"
                            value={party.booker_email}
                            onChange={e => setParty({ ...party, booker_email: e.target.value })}
                            style={{ width: '100%', padding: '9px 12px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '13px', outline: 'none', backgroundColor: '#FFFFFF' }}
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* 3. Secure Card Details Form with 4-digit formatting */}
                  <div style={{ backgroundColor: '#FDFBF7', padding: '20px', borderRadius: '8px', border: '1px solid #EAE6DF', marginBottom: '24px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13.5px', fontWeight: 800, color: '#0A192F', marginBottom: '14px' }}>
                      <CreditCard size={18} color="#9A7B4F" />
                      <span>Secure Card Pre-Authorization</span>
                    </div>

                    <div className="card-details-form-grid">
                      
                      {/* Card Number 4-Digit Chunk Input */}
                      <div className="card-number-wrapper">
                        <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>
                          Card Number
                        </label>
                        <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                          <CreditCard size={16} style={{ position: 'absolute', left: '10px', color: '#94A3B8', pointerEvents: 'none' }} />
                          <input
                            type="text"
                            placeholder="4242  4242  4242  4242"
                            value={cardDetails.cardNumber}
                            maxLength={19}
                            onChange={e => setCardDetails({ ...cardDetails, cardNumber: formatCardNumber(e.target.value) })}
                            style={{
                              width: '100%',
                              padding: '10px 42px 10px 34px',
                              borderRadius: '6px',
                              border: '1px solid #CBD5E1',
                              fontFamily: 'SFMono-Regular, Menlo, Monaco, Consolas, monospace',
                              fontSize: '13.5px',
                              fontWeight: 700,
                              letterSpacing: '1px',
                              outline: 'none',
                              backgroundColor: '#FFFFFF'
                            }}
                          />
                          {getCardBrand(cardDetails.cardNumber) && (
                            <span style={{
                              position: 'absolute',
                              right: '8px',
                              fontSize: '9px',
                              fontWeight: 900,
                              backgroundColor: '#0A192F',
                              color: '#FFFFFF',
                              padding: '2px 6px',
                              borderRadius: '3px'
                            }}>
                              {getCardBrand(cardDetails.cardNumber)}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Expiration Date */}
                      <div>
                        <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>
                          Expires
                        </label>
                        <input
                          type="text"
                          placeholder="MM / YY"
                          value={cardDetails.cardExpiry}
                          maxLength={7}
                          onChange={e => setCardDetails({ ...cardDetails, cardExpiry: formatExpiry(e.target.value) })}
                          style={{
                            width: '100%',
                            padding: '10px 12px',
                            borderRadius: '6px',
                            border: '1px solid #CBD5E1',
                            fontFamily: 'SFMono-Regular, Menlo, Monaco, Consolas, monospace',
                            fontSize: '13px',
                            fontWeight: 700,
                            letterSpacing: '0.5px',
                            textAlign: 'center',
                            outline: 'none',
                            backgroundColor: '#FFFFFF'
                          }}
                        />
                      </div>

                      {/* Security Code CVC */}
                      <div>
                        <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>
                          CVC
                        </label>
                        <input
                          type="text"
                          placeholder="CVC"
                          value={cardDetails.cardCvc}
                          maxLength={4}
                          onChange={e => setCardDetails({ ...cardDetails, cardCvc: formatCvc(e.target.value) })}
                          style={{
                            width: '100%',
                            padding: '10px 12px',
                            borderRadius: '6px',
                            border: '1px solid #CBD5E1',
                            fontFamily: 'SFMono-Regular, Menlo, Monaco, Consolas, monospace',
                            fontSize: '13px',
                            fontWeight: 700,
                            textAlign: 'center',
                            outline: 'none',
                            backgroundColor: '#FFFFFF'
                          }}
                        />
                      </div>

                      {/* Billing ZIP Code */}
                      <div className="card-zip-wrapper">
                        <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>
                          Billing ZIP
                        </label>
                        <input
                          type="text"
                          placeholder="ZIP"
                          value={cardDetails.cardZip}
                          maxLength={6}
                          onChange={e => setCardDetails({ ...cardDetails, cardZip: e.target.value.replace(/\D/g, '').slice(0, 5) })}
                          style={{
                            width: '100%',
                            padding: '10px 12px',
                            borderRadius: '6px',
                            border: '1px solid #CBD5E1',
                            fontFamily: 'SFMono-Regular, Menlo, Monaco, Consolas, monospace',
                            fontSize: '13px',
                            fontWeight: 700,
                            textAlign: 'center',
                            outline: 'none',
                            backgroundColor: '#FFFFFF'
                          }}
                        />
                      </div>

                    </div>
                  </div>

                  {/* TERMS OF SERVICE & CANCELLATION POLICY AGREEMENT */}
                  <div style={{
                    backgroundColor: acceptedTerms ? '#F0FDF4' : '#F8FAFC',
                    border: acceptedTerms ? '1px solid #86EFAC' : '1px solid #E2E8F0',
                    borderRadius: '10px',
                    padding: '16px',
                    marginBottom: '20px',
                    transition: 'all 0.2s'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                      <input
                        type="checkbox"
                        id="terms_agree_checkbox"
                        checked={acceptedTerms}
                        onChange={(e) => {
                          setAcceptedTerms(e.target.checked);
                          if (e.target.checked) setTermsError(null);
                        }}
                        style={{
                          width: '18px',
                          height: '18px',
                          marginTop: '2px',
                          accentColor: '#16A34A',
                          cursor: 'pointer',
                          flexShrink: 0
                        }}
                      />
                      <div style={{ flex: 1 }}>
                        <label 
                          htmlFor="terms_agree_checkbox"
                          style={{ 
                            fontSize: '12.5px', 
                            fontWeight: 700, 
                            color: '#0F172A', 
                            cursor: 'pointer', 
                            lineHeight: '1.5',
                            display: 'block'
                          }}
                        >
                          I have read and agree to the <span style={{ color: '#0078D4', textDecoration: 'underline' }} onClick={(e) => { e.preventDefault(); setShowTermsModal(true); }}>Terms of Service &amp; Carriage</span>, the <span style={{ color: '#16A34A', fontWeight: 800 }}>Complimentary 2-Hour Free Cancellation Policy</span>, and Authorize the Pre-Auth Escrow Hold on my card.
                        </label>
                        
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '10px' }}>
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '11px', fontWeight: 700, color: '#166534', backgroundColor: '#DCFCE7', padding: '2px 8px', borderRadius: '4px' }}>
                            <ShieldCheck size={12} /> Free Cancel up to 2 hrs
                          </span>
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '11px', fontWeight: 700, color: '#1E40AF', backgroundColor: '#DBEAFE', padding: '2px 8px', borderRadius: '4px' }}>
                            <Plane size={12} /> Flight Radar Delay Auto-Adjust
                          </span>
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '11px', fontWeight: 700, color: '#854D0E', backgroundColor: '#FEF9C3', padding: '2px 8px', borderRadius: '4px' }}>
                            <CreditCard size={12} /> $0 Charged Until Completed
                          </span>
                        </div>
                      </div>
                    </div>

                    <div style={{ marginTop: '12px', paddingTop: '10px', borderTop: '1px dashed #E2E8F0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '11px', color: '#64748B' }}>Authoritative Sovereign Carrier Contract</span>
                      <button
                        type="button"
                        onClick={() => setShowTermsModal(true)}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: '#0078D4',
                          fontSize: '11.5px',
                          fontWeight: 700,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                          padding: 0
                        }}
                      >
                        <FileText size={13} />
                        View Complete Policy Details
                      </button>
                    </div>
                  </div>

                  {/* Terms Validation Error Banner */}
                  {termsError && (
                    <div style={{
                      backgroundColor: '#FEF2F2',
                      border: '1px solid #FECACA',
                      color: '#991B1B',
                      padding: '10px 14px',
                      borderRadius: '8px',
                      fontSize: '12px',
                      fontWeight: 700,
                      marginBottom: '16px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px'
                    }}>
                      <AlertCircle size={16} />
                      <span>{termsError}</span>
                    </div>
                  )}

                  {/* Primary Pre-Auth Hold CTA */}
                  <button
                    onClick={handleConfirmPreAuthBooking}
                    disabled={bookingLoading}
                    style={{
                      width: '100%',
                      padding: '14px 20px',
                      backgroundColor: acceptedTerms ? '#16A34A' : '#94A3B8',
                      color: '#FFFFFF',
                      border: 'none',
                      borderRadius: '6px',
                      fontSize: '14px',
                      fontWeight: 800,
                      cursor: acceptedTerms ? 'pointer' : 'not-allowed',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                      boxShadow: acceptedTerms ? '0 2px 8px rgba(22, 163, 74, 0.3)' : 'none',
                      transition: 'background-color 0.2s'
                    }}
                  >
                    <span>{bookingLoading ? 'Authorizing Card Pre-Auth Hold in Escrow...' : `Authorize $${activeTotalFormatted} Pre-Auth Hold & Confirm Reservation`}</span>
                    <ShieldCheck size={16} />
                  </button>
                </div>
              )}

            </div>

            {/* ========================================================================= */}
            {/* RIGHT COLUMN: LIVE TRIP SUMMARY & ROUTE PREVIEW CARD                      */}
            {/* ========================================================================= */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', position: 'sticky', top: '24px' }}>
              
              <div style={{ backgroundColor: '#FFFFFF', borderRadius: '12px', border: '1px solid #EAE6DF', padding: '24px', boxShadow: '0 2px 10px rgba(0,0,0,0.03)' }}>
                
                {/* Header with Edit Later */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                  <h3 style={{ fontFamily: '"Libre Baskerville", Georgia, serif', fontSize: '18px', fontWeight: 700, color: '#0A192F', margin: 0, whiteSpace: 'nowrap' }}>
                    {bookingMode === 'ITINERARY_PLANNER' ? 'Itinerary summary' : 'Trip summary'}
                  </h3>
                  <span style={{ fontSize: '11px', color: '#9A7B4F', fontWeight: 700, whiteSpace: 'nowrap', backgroundColor: '#FDFBF7', border: '1px solid #EAE6DF', padding: '3px 8px', borderRadius: '4px' }}>
                    {bookingMode === 'ITINERARY_PLANNER' ? `${itineraryLegs.length} ${itineraryLegs.length === 1 ? 'ride' : 'rides'}` : 'Live Preview'}
                  </span>
                </div>

                {/* Live Real Google Map Route Container or Route Preview Placeholder */}
                {(() => {
                  const embedUrl = getGoogleMapsEmbedUrl();
                  const dirUrl = getGoogleMapsDirectionsUrl();

                  if (embedUrl) {
                    return (
                      <div style={{ 
                        borderRadius: '10px', 
                        overflow: 'hidden', 
                        border: '1px solid #CBD5E1', 
                        marginBottom: '18px',
                        backgroundColor: '#E2E8F0',
                        position: 'relative',
                        height: '165px',
                        boxShadow: '0 2px 8px rgba(15, 23, 42, 0.08)'
                      }}>
                        <iframe
                          title="Live Google Map Route"
                          src={embedUrl}
                          width="100%"
                          height="100%"
                          style={{
                            border: 0,
                            display: 'block',
                            width: '100%',
                            height: '100%'
                          }}
                          loading="lazy"
                          referrerPolicy="no-referrer-when-downgrade"
                        />

                        {/* Floating Live Radar Badge Overlay */}
                        <div style={{
                          position: 'absolute',
                          top: '8px',
                          left: '8px',
                          backgroundColor: 'rgba(10, 25, 47, 0.88)',
                          backdropFilter: 'blur(6px)',
                          border: '1px solid rgba(255,255,255,0.15)',
                          borderRadius: '6px',
                          padding: '3px 8px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          pointerEvents: 'none',
                          zIndex: 2
                        }}>
                          <span style={{
                            width: '6px',
                            height: '6px',
                            borderRadius: '50%',
                            backgroundColor: '#10B981',
                            boxShadow: '0 0 6px #10B981'
                          }} />
                          <span style={{
                            fontSize: '9.5px',
                            fontWeight: 800,
                            color: '#FFFFFF',
                            letterSpacing: '0.04em',
                            textTransform: 'uppercase'
                          }}>
                            Live Google Map
                          </span>
                        </div>

                        {/* External Full Map Link */}
                        {dirUrl && (
                          <a
                            href={dirUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{
                              position: 'absolute',
                              top: '8px',
                              right: '8px',
                              backgroundColor: 'rgba(255, 255, 255, 0.94)',
                              backdropFilter: 'blur(4px)',
                              border: '1px solid #CBD5E1',
                              borderRadius: '5px',
                              padding: '3px 7px',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px',
                              fontSize: '10px',
                              fontWeight: 700,
                              color: '#0A192F',
                              textDecoration: 'none',
                              boxShadow: '0 1px 4px rgba(0,0,0,0.12)',
                              zIndex: 2
                            }}
                            title="Open live route in Google Maps"
                          >
                            <span>Full Map</span>
                            <ArrowUpRight size={11} color="#9A7B4F" />
                          </a>
                        )}
                      </div>
                    );
                  }

                  return (
                    <div style={{
                      borderRadius: '10px',
                      border: '1px dashed #CBD5E1',
                      marginBottom: '18px',
                      backgroundColor: '#F8FAFC',
                      height: '145px',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      padding: '16px',
                      textAlign: 'center',
                      boxShadow: '0 1px 4px rgba(15, 23, 42, 0.03)'
                    }}>
                      <div style={{
                        width: '36px',
                        height: '36px',
                        borderRadius: '50%',
                        backgroundColor: '#FDFBF7',
                        border: '1px solid #EAE6DF',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        marginBottom: '8px'
                      }}>
                        <Route size={18} color="#9A7B4F" />
                      </div>
                      <div style={{ fontSize: '12px', fontWeight: 700, color: '#0F172A' }}>
                        Live Route &amp; Map Preview
                      </div>
                      <div style={{ fontSize: '11px', color: '#64748B', marginTop: '3px', maxWidth: '240px', lineHeight: '1.4' }}>
                        {selectedRideType === 'HOURLY'
                          ? 'Enter pickup location to preview on map'
                          : 'Enter both pickup & destination addresses to preview live route'}
                      </div>
                    </div>
                  );
                })()}

                {/* Key-Value Breakdown List */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '12px', color: '#334155', borderBottom: '1px solid #F1F5F9', paddingBottom: '16px', marginBottom: '16px' }}>
                  
                  {selectedRideType === 'HOURLY' ? (
                    <>
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                        <Plane size={15} color="#0A192F" style={{ marginTop: '2px', flexShrink: 0 }} />
                        <div style={{ flex: 1 }}>
                          <span style={{ color: '#64748B', fontWeight: 600 }}>Pickup</span>
                          <div style={{ fontWeight: 700, color: pickupAddress?.trim() ? '#0F172A' : '#94A3B8' }}>
                            {pickupAddress?.trim() ? pickupAddress.split(',')[0] : 'Enter pickup location'}
                          </div>
                          {pickupAddress?.trim() && <div style={{ fontSize: '10px', color: '#94A3B8' }}>{pickupAddress}</div>}
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                        <Clock size={15} color="#0A192F" style={{ marginTop: '2px', flexShrink: 0 }} />
                        <div style={{ flex: 1 }}>
                          <span style={{ color: '#64748B', fontWeight: 600 }}>Service Duration</span>
                          <div style={{ fontWeight: 700, color: '#0F172A' }}>{hourlyHours} Hours (As Directed)</div>
                          <div style={{ fontSize: '10px', color: '#94A3B8' }}>{flightNumber || 'Regional executive itinerary'}</div>
                        </div>
                      </div>
                    </>
                  ) : (
                    (() => {
                      const effPickupDisp = pickupAddress?.trim() || (bookingMode === 'ITINERARY_PLANNER' ? itineraryLegs[0]?.origin_address?.trim() : '') || '';
                      const effDropoffDisp = dropoffAddress?.trim() || (bookingMode === 'ITINERARY_PLANNER' ? itineraryLegs[itineraryLegs.length - 1]?.destination_address?.trim() : '') || '';
                      const hasBoth = Boolean(
                        effPickupDisp && 
                        effDropoffDisp && 
                        effPickupDisp.length >= 3 && 
                        effDropoffDisp.length >= 3
                      );

                      return (
                        <>
                          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                            <Plane size={15} color="#0A192F" style={{ marginTop: '2px', flexShrink: 0 }} />
                            <div style={{ flex: 1 }}>
                              <span style={{ color: '#64748B', fontWeight: 600 }}>Pickup</span>
                              <div style={{ fontWeight: 700, color: hasBoth ? '#0F172A' : (effPickupDisp ? '#475569' : '#94A3B8') }}>
                                {hasBoth 
                                  ? effPickupDisp.split(',')[0] 
                                  : (effPickupDisp ? `${effPickupDisp.split(',')[0]} (Awaiting destination)` : 'Enter pickup location')}
                              </div>
                              {hasBoth && <div style={{ fontSize: '10px', color: '#94A3B8' }}>{effPickupDisp}</div>}
                            </div>
                          </div>

                          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                            <MapPin size={15} color="#0A192F" style={{ marginTop: '2px', flexShrink: 0 }} />
                            <div style={{ flex: 1 }}>
                              <span style={{ color: '#64748B', fontWeight: 600 }}>Destination</span>
                              <div style={{ fontWeight: 700, color: hasBoth ? '#0F172A' : (effDropoffDisp ? '#475569' : '#94A3B8') }}>
                                {hasBoth 
                                  ? effDropoffDisp.split(',')[0] 
                                  : (effDropoffDisp ? `${effDropoffDisp.split(',')[0]} (Awaiting pickup)` : 'Enter destination')}
                              </div>
                              {hasBoth && <div style={{ fontSize: '10px', color: '#94A3B8' }}>{effDropoffDisp}</div>}
                            </div>
                          </div>
                        </>
                      );
                    })()
                  )}

                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                    <Calendar size={15} color="#0A192F" style={{ marginTop: '2px', flexShrink: 0 }} />
                    <div style={{ flex: 1 }}>
                      <span style={{ color: '#64748B', fontWeight: 600 }}>Date & time</span>
                      <div style={{ fontWeight: 700, color: tripDate ? '#0F172A' : '#94A3B8' }}>
                        {tripDate ? `${tripDate} at ${tripTime}` : 'Select date & time'}
                      </div>
                    </div>
                  </div>

                  {hasReturnTrip && (
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                      <Calendar size={15} color="#9A7B4F" style={{ marginTop: '2px', flexShrink: 0 }} />
                      <div style={{ flex: 1 }}>
                        <span style={{ color: '#64748B', fontWeight: 600 }}>Return trip</span>
                        <div style={{ fontWeight: 700, color: returnDate ? '#0F172A' : '#94A3B8' }}>
                          {returnDate ? `${returnDate} at ${returnTime}` : 'Select return date'}
                        </div>
                      </div>
                    </div>
                  )}

                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                    <Users size={15} color="#0A192F" style={{ marginTop: '2px', flexShrink: 0 }} />
                    <div style={{ flex: 1 }}>
                      <span style={{ color: '#64748B', fontWeight: 600 }}>Passengers</span>
                      <div style={{ fontWeight: 700, color: '#0F172A' }}>{passengersCount}</div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                    <Briefcase size={15} color="#0A192F" style={{ marginTop: '2px', flexShrink: 0 }} />
                    <div style={{ flex: 1 }}>
                      <span style={{ color: '#64748B', fontWeight: 600 }}>Bags</span>
                      <div style={{ fontWeight: 700, color: '#0F172A' }}>{bagsCount}</div>
                    </div>
                  </div>

                  {selectedRideType === 'AIRPORT' && flightNumber && (
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                      <Plane size={15} color="#0078D4" style={{ marginTop: '2px', flexShrink: 0 }} />
                      <div style={{ flex: 1 }}>
                        <span style={{ color: '#64748B', fontWeight: 600 }}>Flight number</span>
                        <div style={{ fontWeight: 700, color: '#0078D4' }}>{flightNumber} (optional)</div>
                      </div>
                    </div>
                  )}

                </div>

                {/* Selected Vehicle Card if in Step >= 2 */}
                {wizardStep >= 2 && (
                  <div style={{
                    backgroundColor: '#F8FAFC',
                    borderRadius: '8px',
                    border: '1px solid #E2E8F0',
                    padding: '12px 14px',
                    marginBottom: '14px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px'
                  }}>
                    <div style={{ width: '52px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      {selectedVehicleObj?.photoUrl ? (
                        <img
                          src={selectedVehicleObj.photoUrl}
                          alt={selectedVehicleObj.title}
                          style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
                        />
                      ) : (
                        <Car size={22} color="#0A192F" />
                      )}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: '13px', fontWeight: 800, color: '#0A192F', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {selectedVehicleObj.title}
                      </div>
                      <div style={{ fontSize: '10.5px', color: '#64748B', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {selectedVehicleObj.models}
                      </div>
                    </div>
                  </div>
                )}

                {/* Itemized Price Breakdown & Total Guaranteed Fare if in Step >= 2 */}
                {wizardStep >= 2 && (
                  <div style={{
                    backgroundColor: '#FAF8F5',
                    border: '1px solid #EAE6DF',
                    borderRadius: '8px',
                    padding: '14px 16px',
                    marginBottom: '14px'
                  }}>
                    <div style={{ fontSize: '11px', fontWeight: 800, color: '#8C6D3F', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span>Guaranteed Pricing Breakdown</span>
                      <span style={{ fontSize: '9.5px', color: '#166534', backgroundColor: '#DCFCE7', padding: '1px 6px', borderRadius: '3px' }}>ALL-INCLUSIVE</span>
                    </div>
                    
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '12px', color: '#475569' }}>
                      {(hasReturnTrip || (activeQuoteObj?.legs && activeQuoteObj.legs.length > 1)) && (
                        <div style={{ backgroundColor: '#FFFFFF', padding: '10px', borderRadius: '6px', border: '1px solid #E2E8F0', marginBottom: '6px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px' }}>
                            <span style={{ fontWeight: 700, color: '#0A192F' }}>Leg 1 · Outbound:</span>
                            <span style={{ fontWeight: 800, color: '#0A192F' }}>${Number(activeQuoteObj?.legs?.[0]?.total_gross || activeQuoteObj?.legs?.[0]?.total_leg_amt || (Number(activeTotalFormatted) / 2)).toFixed(2)}</span>
                          </div>
                          <div style={{ fontSize: '9.5px', color: '#64748B' }}>
                            {activeQuoteObj?.legs?.[0]?.assigned_vendor_name || 'ANB Limo Philadelphia (PA)'}
                          </div>

                          <div style={{ height: '1px', backgroundColor: '#F1F5F9', margin: '2px 0' }} />

                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px' }}>
                            <span style={{ fontWeight: 700, color: '#0A192F' }}>Leg 2 · Return:</span>
                            <span style={{ fontWeight: 800, color: '#0A192F' }}>${Number(activeQuoteObj?.legs?.[1]?.total_gross || activeQuoteObj?.legs?.[1]?.total_leg_amt || (Number(activeTotalFormatted) / 2)).toFixed(2)}</span>
                          </div>
                          <div style={{ fontSize: '9.5px', color: '#64748B' }}>
                            {activeQuoteObj?.legs?.[1]?.assigned_vendor_name || 'New York Executive Fleet (NY)'}
                          </div>
                        </div>
                      )}

                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span>Base Fleet Tariff</span>
                        <span style={{ fontWeight: 600, color: '#0F172A' }}>${baseTariffFormatted}</span>
                      </div>

                      {Number(tollsAndFeesFormatted) > 0 && (
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span>Tolls & Corridor Fees</span>
                          <span style={{ fontWeight: 600, color: '#0F172A' }}>${tollsAndFeesFormatted}</span>
                        </div>
                      )}

                      {/* Only show Chauffeur Gratuity if vendor business rule includes it */}
                      {gratuityVal > 0 && (
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span>Chauffeur Gratuity {activeQuoteObj?.gratuity_rate ? `(${(Number(activeQuoteObj.gratuity_rate) * 100).toFixed(0)}%)` : ''}</span>
                          <span style={{ fontWeight: 600, color: '#0F172A' }}>${gratuityFormatted}</span>
                        </div>
                      )}

                      {Number(taxesFormatted) > 0 && (
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span>State Taxes & Surcharges</span>
                          <span style={{ fontWeight: 600, color: '#0F172A' }}>${taxesFormatted}</span>
                        </div>
                      )}

                      <div style={{ height: '1px', backgroundColor: '#EAE6DF', margin: '4px 0' }} />

                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                        <div>
                          <div style={{ fontSize: '13px', fontWeight: 800, color: '#0A192F' }}>Total Guaranteed Fare</div>
                          <div style={{ fontSize: '10px', color: '#64748B' }}>Pre-Auth Escrow Hold</div>
                        </div>
                        <div style={{ fontFamily: '"Libre Baskerville", Georgia, serif', fontSize: '22px', fontWeight: 800, color: '#0A192F' }}>
                          ${activeTotalFormatted} <span style={{ fontSize: '11px', fontWeight: 700, color: '#64748B', fontFamily: 'sans-serif' }}>USD</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Callout Box: Choose a vehicle to see pricing */}
                <div style={{ backgroundColor: '#FDFBF7', border: '1px solid #EAE6DF', borderRadius: '8px', padding: '14px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <Car size={20} color="#9A7B4F" />
                  <div>
                    <div style={{ fontSize: '12.5px', fontWeight: 800, color: '#0A192F' }}>
                      {wizardStep === 1 ? 'Choose a vehicle to see pricing' : 'Guaranteed All-Inclusive Fare'}
                    </div>
                    <div style={{ fontSize: '11px', color: '#64748B' }}>
                      {wizardStep === 1 ? 'Select from our premium fleet on the next step.' : 'No surge pricing, hidden tolls, or waiting surcharges.'}
                    </div>
                  </div>
                </div>

                {/* Step Action Button if in details mode */}
                {wizardStep === 1 && (
                  <button
                    type="button"
                    onClick={handleProceedToVehicles}
                    disabled={loadingQuote}
                    style={{
                      marginTop: '16px',
                      width: '100%',
                      padding: '13px 18px',
                      backgroundColor: loadingQuote ? '#8C6D3F' : '#9A7B4F',
                      backgroundImage: loadingQuote 
                        ? 'linear-gradient(135deg, #8C6D3F 0%, #6E532E 100%)' 
                        : 'linear-gradient(135deg, #9A7B4F 0%, #7D5E30 100%)',
                      color: '#FFFFFF',
                      border: '1px solid #7D5E30',
                      borderRadius: '8px',
                      fontSize: '13.5px',
                      fontWeight: 800,
                      cursor: loadingQuote ? 'wait' : 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                      boxShadow: '0 3px 10px rgba(154, 123, 79, 0.35)',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    {loadingQuote ? (
                      <>
                        <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />
                        <span>Calculating Fares...</span>
                      </>
                    ) : (
                      <>
                        <span>Continue to vehicles</span>
                        <ArrowRight size={14} />
                      </>
                    )}
                  </button>
                )}

              </div>

              {/* Watermark Motto */}
              <div style={{ textAlign: 'center', padding: '16px', color: '#94A3B8' }}>
                <div style={{ fontFamily: '"Libre Baskerville", Georgia, serif', fontStyle: 'italic', fontSize: '13px', color: '#64748B' }}>
                  Exceptional executive service, precision &amp; discretion.
                </div>
                <div style={{ width: '40px', height: '1.5px', backgroundColor: '#9A7B4F', margin: '6px auto 0 auto' }} />
              </div>

            </div>

          </div>
        )}

      </div>

      {/* 5. FOOTER TRUST BADGES (4 COLUMNS) */}
      <div style={{ backgroundColor: '#FFFFFF', borderTop: '1px solid #EAE6DF', padding: '32px 24px' }}>
        <div className="footer-trust-badges-grid" style={{ maxWidth: '1320px', margin: '0 auto' }}>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <ShieldCheck size={26} color="#9A7B4F" />
            <div>
              <div style={{ fontSize: '13px', fontWeight: 800, color: '#0A192F' }}>Professional Chauffeurs</div>
              <div style={{ fontSize: '10px', fontWeight: 700, color: '#8C6D3F', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                SAFE, COURTEOUS, DEPENDABLE.
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <Award size={26} color="#9A7B4F" />
            <div>
              <div style={{ fontSize: '13px', fontWeight: 800, color: '#0A192F' }}>Premium Fleet</div>
              <div style={{ fontSize: '10px', fontWeight: 700, color: '#8C6D3F', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                LUXURY FOR EVERY OCCASION.
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <Clock size={26} color="#9A7B4F" />
            <div>
              <div style={{ fontSize: '13px', fontWeight: 800, color: '#0A192F' }}>On Time, Every Time</div>
              <div style={{ fontSize: '10px', fontWeight: 700, color: '#8C6D3F', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                YOUR SCHEDULE MATTERS.
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <Star size={26} color="#9A7B4F" />
            <div>
              <div style={{ fontSize: '13px', fontWeight: 800, color: '#0A192F' }}>Executive Standards</div>
              <div style={{ fontSize: '10px', fontWeight: 700, color: '#8C6D3F', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                A HIGHER STANDARD OF SERVICE.
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* LUXURY CUSTOMER BOOKINGS & SCHEDULE MODAL */}
      <CustomerBookingsLookupModal
        isOpen={showLookupModal}
        onClose={() => setShowLookupModal(false)}
        initialQuery={booking?.id || ''}
      />

      {/* TERMS OF SERVICE & CANCELLATION POLICIES MODAL */}
      {showTermsModal && (
        <div 
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(10, 25, 47, 0.75)',
            backdropFilter: 'blur(4px)',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px'
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowTermsModal(false);
          }}
        >
          <div style={{
            backgroundColor: '#FFFFFF',
            borderRadius: '16px',
            maxWidth: '680px',
            width: '100%',
            maxHeight: '85vh',
            overflowY: 'auto',
            boxShadow: '0 20px 40px rgba(0,0,0,0.25)',
            border: '1px solid #E2E8F0',
            display: 'flex',
            flexDirection: 'column'
          }}>
            {/* Modal Header */}
            <div style={{
              padding: '20px 24px',
              borderBottom: '1px solid #E2E8F0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              backgroundColor: '#F8FAFC',
              borderRadius: '16px 16px 0 0'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ width: '32px', height: '32px', borderRadius: '8px', backgroundColor: '#0A192F', color: '#FFFFFF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <ShieldCheck size={18} color="#C5A880" />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 800, color: '#0A192F' }}>
                    Authoritative Terms of Carriage &amp; Policies
                  </h3>
                  <div style={{ fontSize: '11px', color: '#64748B' }}>
                    Standard operating contract for passenger safety, guaranteed escrow, and cancellations
                  </div>
                </div>
              </div>
              <button 
                onClick={() => setShowTermsModal(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748B', padding: '4px' }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Content */}
            <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '18px' }}>
              {/* 1. Cancellation Policy */}
              <div style={{ backgroundColor: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: '10px', padding: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                  <CheckCircle2 size={16} color="#16A34A" />
                  <span style={{ fontSize: '13px', fontWeight: 800, color: '#166534' }}>
                    1. Complimentary Cancellation &amp; Refund Policy
                  </span>
                </div>
                <p style={{ margin: 0, fontSize: '12px', color: '#14532D', lineHeight: '1.6' }}>
                  Standard airport transfers and point-to-point bookings may be cancelled free of charge up to <strong>2 hours prior</strong> to the scheduled pickup time with an immediate, full release of the Pre-Authorization hold. Hourly charters and executive Sprinter van bookings require 24 hours advance notice.
                </p>
              </div>

              {/* 2. Flight Delay Guarantee */}
              <div style={{ backgroundColor: '#EFF6FF', border: '1px solid #BFDBFE', borderRadius: '10px', padding: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                  <Plane size={16} color="#2563EB" />
                  <span style={{ fontSize: '13px', fontWeight: 800, color: '#1E40AF' }}>
                    2. Automated Flight Tracking &amp; Wait Time
                  </span>
                </div>
                <p style={{ margin: 0, fontSize: '12px', color: '#1E3A8A', lineHeight: '1.6' }}>
                  Airport arrivals include real-time transponder radar monitoring. Chauffeur dispatch automatically recalibrates to actual wheels-down time. Commercial flights receive <strong>45 minutes of complimentary wait time</strong> domestic and <strong>60 minutes international</strong> after gate arrival.
                </p>
              </div>

              {/* 3. Escrow Pre-Auth Hold */}
              <div style={{ backgroundColor: '#FAF5FF', border: '1px solid #E9D5FF', borderRadius: '10px', padding: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                  <CreditCard size={16} color="#9333EA" />
                  <span style={{ fontSize: '13px', fontWeight: 800, color: '#6B21A8' }}>
                    3. Secure Pre-Authorization Escrow Hold
                  </span>
                </div>
                <p style={{ margin: 0, fontSize: '12px', color: '#581C87', lineHeight: '1.6' }}>
                  Your credit card is verified via a temporary pre-authorization hold. Funds remain in secure escrow until your chauffeur mission is successfully completed. Zero charges are settled prior to service delivery.
                </p>
              </div>

              {/* 4. Zero Hidden Fees */}
              <div style={{ backgroundColor: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: '10px', padding: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                  <DollarSign size={16} color="#D97706" />
                  <span style={{ fontSize: '13px', fontWeight: 800, color: '#92400E' }}>
                    4. Guaranteed All-Inclusive Pricing
                  </span>
                </div>
                <p style={{ margin: 0, fontSize: '12px', color: '#78350F', lineHeight: '1.6' }}>
                  Your calculated fare includes statutory livery sales taxes, standard 20% chauffeur gratuity, and estimated tolls. No surprise charges will be added at destination.
                </p>
              </div>
            </div>

            {/* Modal Footer */}
            <div style={{
              padding: '16px 24px',
              borderTop: '1px solid #E2E8F0',
              display: 'flex',
              justifyContent: 'flex-end',
              gap: '10px',
              backgroundColor: '#F8FAFC',
              borderRadius: '0 0 16px 16px'
            }}>
              <button
                type="button"
                onClick={() => setShowTermsModal(false)}
                style={{
                  padding: '10px 18px',
                  backgroundColor: '#FFFFFF',
                  color: '#64748B',
                  border: '1px solid #CBD5E1',
                  borderRadius: '8px',
                  fontSize: '12.5px',
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => {
                  setAcceptedTerms(true);
                  setTermsError(null);
                  setShowTermsModal(false);
                }}
                style={{
                  padding: '10px 20px',
                  backgroundColor: '#16A34A',
                  color: '#FFFFFF',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '12.5px',
                  fontWeight: 800,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                <Check size={15} />
                I Agree &amp; Accept Terms
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
