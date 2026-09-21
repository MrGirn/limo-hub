import React, { useState, useEffect, useRef } from 'react';
import { 
  Plane, Train, MapPin, Clock, ShieldCheck, Car, Users, Briefcase, 
  Sparkles, CheckCircle2, ChevronRight, CreditCard, AlertCircle,
  FileText, Navigation, ArrowRight, Route, DollarSign, Compass,
  Plus, Trash2, Globe, Shield, Wifi, Droplets, VolumeX, Baby,
  Calendar, Edit3, ChevronDown, ChevronUp, User, X, Check,
  Award, Star, HeartHandshake, Phone, ArrowUpRight, HelpCircle,
  Snowflake, Zap, Layers, Info, Download
} from 'lucide-react';
import { ServiceType, VehicleClass, Quote, Booking, BookingParty, MasterItinerary, LegMode, FulfilmentType } from '../types';
import { 
  requestQuote, 
  bookQuote, 
  bookItinerary, 
  quoteMasterItinerary, 
  getBookingCalendarIcsUrl, 
  generateGoogleCalendarUrl, 
  generateOutlookCalendarUrl 
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
    photoUrl: 'https://images.dealer.com/autodata/us/colorized/2023/USC30CHS141A0/black.png',
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
    photoUrl: 'https://pngimg.com/d/mercedes_PNG80135.png',
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
    photoUrl: 'https://pngimg.com/d/tesla_car_PNG25.png',
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
    photoUrl: 'https://pngimg.com/d/mercedes_sprinter_PNG10.png',
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
    photoUrl: 'https://pngimg.com/d/toyota_camry_PNG27.png',
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

export const CustomerPortal: React.FC = () => {
  // Booking Mode: 'ITINERARY_PLANNER' (Option 3 Multi-Leg) vs 'GUIDED_SINGLE' (Option 1)
  const [bookingMode, setBookingMode] = useState<'GUIDED_SINGLE' | 'ITINERARY_PLANNER'>('ITINERARY_PLANNER');

  // Active Wizard Step: 1 = Details, 2 = Vehicles, 3 = Extras/Preferences, 4 = Review & Pre-Auth, 5 = Confirmed
  const [wizardStep, setWizardStep] = useState<1 | 2 | 3 | 4 | 5>(1);

  // Selected Service Type for Single Leg
  const [selectedRideType, setSelectedRideType] = useState<'AIRPORT' | 'POINT_TO_POINT' | 'HOURLY' | 'MULTI_CITY'>('AIRPORT');

  // Single Leg Inputs
  const [pickupAddress, setPickupAddress] = useState('');
  const [dropoffAddress, setDropoffAddress] = useState('');
  const [tripDate, setTripDate] = useState('');
  const [tripTime, setTripTime] = useState('10:00 AM');
  const [passengersCount, setPassengersCount] = useState(1);
  const [bagsCount, setBagsCount] = useState(1);
  const [flightNumber, setFlightNumber] = useState('');
  const [vehicleClass, setVehicleClass] = useState<VehicleClass>('LUXURY_SUV');
  const [hourlyHours, setHourlyHours] = useState(3);
  const [hasReturnTrip, setHasReturnTrip] = useState(false);
  const [returnDate, setReturnDate] = useState('');
  const [returnTime, setReturnTime] = useState('03:00 PM');

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
      date: '',
      time: '10:00 AM',
      passengers: 1,
      bags: 1,
      flight_number: '',
      vehicle_class: 'LUXURY_SUV',
      vehicle_title: 'Executive SUV',
      vehicle_desc: 'Spacious. Refined. Always professional.',
      is_expanded: true
    }
  ]);

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
        date: '',
        time: '10:00 AM',
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

  // Real-time automatic quote calculation with live recalculation on any field change
  const calculateLiveQuotes = async (advanceStep = false) => {
    const effPickup = pickupAddress || itineraryLegs[0]?.origin_address || 'Philadelphia International Airport (PHL)';
    const effDropoff = dropoffAddress || itineraryLegs[0]?.destination_address || 'The Ritz-Carlton Philadelphia';

    setLoadingQuote(true);
    setQuoteError(null);
    try {
      const classes: VehicleClass[] = ['LUXURY_SUV', 'FIRST_CLASS', 'ELECTRIC_VIP', 'BUSINESS_VAN', 'BUSINESS_SEDAN'];

      if (bookingMode === 'ITINERARY_PLANNER' || hasReturnTrip) {
        let legsToQuote: any[] = [];

        if (bookingMode === 'ITINERARY_PLANNER' && !hasReturnTrip) {
          legsToQuote = itineraryLegs.map(l => ({
            leg_mode: l.flight_number ? 'FLIGHT' : 'CHAUFFEUR_RIDE',
            title: l.title,
            origin_address: l.origin_address || effPickup,
            origin_city: l.origin_city || (effPickup.toLowerCase().includes('phl') ? 'Philadelphia' : 'New York'),
            destination_address: l.destination_address || effDropoff,
            destination_city: l.destination_city || (effDropoff.toLowerCase().includes('jfk') ? 'New York' : 'Philadelphia'),
            vehicle_class: l.vehicle_class || vehicleClass,
            flight_number: l.flight_number || undefined
          }));
        } else {
          // Roundtrip Mode: Outbound Leg (PHL -> JFK) + Return Leg (JFK -> PHL)
          const origCity = effPickup.toLowerCase().includes('philadelphia') || effPickup.toLowerCase().includes('phl') ? 'Philadelphia' : 'New York';
          const destCity = effDropoff.toLowerCase().includes('new york') || effDropoff.toLowerCase().includes('jfk') || effDropoff.toLowerCase().includes('lga') || effDropoff.toLowerCase().includes('ewr') ? 'New York' : 'Philadelphia';

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

        const qMap: Record<string, any> = {};
        await Promise.all(classes.map(async (vc) => {
          try {
            const itin = await quoteMasterItinerary(hasReturnTrip ? "Executive Round-Trip Itinerary" : "Executive Multi-City Itinerary", legsToQuote, vc);
            qMap[vc] = itin;
            if (vc === vehicleClass) setMasterItinerary(itin);
          } catch (e) {
            console.error(`Error quoting ${vc}:`, e);
          }
        }));
        setVehicleQuotes(qMap);
      } else {
        const qMap: Record<string, any> = {};
        await Promise.all(classes.map(async (vc) => {
          try {
            const q = await requestQuote({
              service_type: selectedRideType === 'AIRPORT' ? 'AIRPORT_TRANSFER' : selectedRideType === 'HOURLY' ? 'HOURLY_AS_DIRECTED' : 'POINT_TO_POINT',
              vehicle_class: vc,
              pickup_address: effPickup,
              dropoff_address: selectedRideType === 'HOURLY' ? undefined : effDropoff,
              flight_number: selectedRideType === 'AIRPORT' ? flightNumber : undefined,
              distance_miles: 18.5,
              hourly_hours: selectedRideType === 'HOURLY' ? hourlyHours : undefined,
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

      // For Multi-City itineraries where vehicles are configured per-leg, proceed directly to Extras
      if (advanceStep) {
        if (bookingMode === 'ITINERARY_PLANNER' && !hasReturnTrip) {
          setWizardStep(3);
        } else {
          setWizardStep(2);
        }
      }
    } catch (err: any) {
      setQuoteError(err.message || 'Error generating guaranteed quote');
    } finally {
      setLoadingQuote(false);
    }
  };

  // Debounced auto-recalculate live quote whenever any booking field or preference changes
  useEffect(() => {
    const timer = setTimeout(() => {
      calculateLiveQuotes(false);
    }, 350);
    return () => clearTimeout(timer);
  }, [
    pickupAddress, 
    dropoffAddress, 
    selectedRideType, 
    vehicleClass, 
    hourlyHours, 
    flightNumber, 
    hasReturnTrip, 
    returnDate, 
    returnTime, 
    tripDate, 
    tripTime, 
    bookingMode, 
    itineraryLegs, 
    amenities, 
    childSeats, 
    isWavNeeded, 
    fulfilmentType
  ]);

  const handleProceedToVehicles = () => {
    calculateLiveQuotes(true);
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

  const handleConfirmPreAuthBooking = async () => {
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
        const res = await bookItinerary(masterItinerary.itinerary_id, resolvedParty, 'tok_visa_4242');
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
        const pickupTime = new Date(`${tripDate || new Date().toISOString().split('T')[0]}T10:30:00Z`).toISOString();
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
      <div style={{ maxWidth: '1320px', margin: '0 auto', padding: '16px 24px 24px 24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', maxWidth: '640px' }}>
          
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
              fontWeight: 800
            }}>
              1
            </div>
            <span style={{ fontSize: '13px', fontWeight: wizardStep === 1 ? 800 : 600, color: wizardStep === 1 ? '#0A192F' : '#64748B' }}>
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
              fontWeight: 800
            }}>
              2
            </div>
            <span style={{ fontSize: '13px', fontWeight: wizardStep === 2 ? 800 : 600, color: wizardStep === 2 ? '#0A192F' : '#94A3B8' }}>
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
              fontWeight: 800
            }}>
              3
            </div>
            <span style={{ fontSize: '13px', fontWeight: wizardStep === 3 ? 800 : 600, color: wizardStep === 3 ? '#0A192F' : '#94A3B8' }}>
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
              fontWeight: 800
            }}>
              4
            </div>
            <span style={{ fontSize: '13px', fontWeight: wizardStep === 4 ? 800 : 600, color: wizardStep === 4 ? '#0A192F' : '#94A3B8' }}>
              Review
            </span>
          </div>

        </div>
      </div>

      {/* 4. MAIN CONTENT CONTAINER (2-COLUMN LUXURY GRID) */}
      <div style={{ maxWidth: '1320px', margin: '0 auto', padding: '0 24px 60px 24px' }}>
        
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
            
            <p style={{ color: '#64748B', fontSize: '15px', maxWidth: '580px', margin: '0 auto 28px auto', lineHeight: '1.6' }}>
              Confirmation reference <strong style={{ color: '#0078D4', fontFamily: 'monospace', fontSize: '16px' }}>#{booking.id}</strong>. Your dedicated chauffeur has been reserved with white-glove meet & greet.
            </p>

            {/* ITINERARY & SUMMARY CARD */}
            <div style={{ backgroundColor: '#F8FAFC', borderRadius: '12px', border: '1px solid #E2E8F0', padding: '24px', textAlign: 'left', marginBottom: '24px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                <div>
                  <div style={{ fontSize: '11px', fontWeight: 800, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>PICKUP LOCATION</div>
                  <div style={{ fontSize: '14px', fontWeight: 700, color: '#0F172A', marginTop: '4px' }}>{booking.pickup_address}</div>
                </div>
                <div>
                  <div style={{ fontSize: '11px', fontWeight: 800, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>DESTINATION</div>
                  <div style={{ fontSize: '14px', fontWeight: 700, color: '#0F172A', marginTop: '4px' }}>{booking.dropoff_address}</div>
                </div>
              </div>

              <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid #E2E8F0', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: '11px', color: '#64748B', fontWeight: 600 }}>PASSENGER</div>
                  <div style={{ fontSize: '13px', fontWeight: 700, color: '#0F172A' }}>{booking.party?.passenger_name}</div>
                  <div style={{ fontSize: '11px', color: '#94A3B8' }}>{booking.party?.passenger_phone}</div>
                </div>
                <div>
                  <div style={{ fontSize: '11px', color: '#64748B', fontWeight: 600 }}>SCHEDULED PICKUP</div>
                  <div style={{ fontSize: '13px', fontWeight: 700, color: '#0F172A' }}>
                    {booking.pickup_time_utc ? new Date(booking.pickup_time_utc).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'Scheduled'}
                  </div>
                  <div style={{ fontSize: '11px', color: '#94A3B8' }}>60-min complimentary wait</div>
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
                  <Download size={15} color="#0078D4" />
                  Apple / iCal (.ics)
                </a>

                {/* Outlook 365 Deeplink */}
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

            {/* DUAL NOTIFICATION DISPATCH STATUS */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '32px', textAlign: 'left' }}>
              {/* Booker Notification */}
              <div style={{ backgroundColor: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '10px', padding: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                  <div style={{ width: '22px', height: '22px', borderRadius: '50%', backgroundColor: '#EFF6FF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <FileText size={13} color="#2563EB" />
                  </div>
                  <span style={{ fontSize: '12px', fontWeight: 800, color: '#1E293B' }}>Booker Tax Invoice & Receipt</span>
                </div>
                <div style={{ fontSize: '11px', color: '#64748B', lineHeight: '1.5' }}>
                  Dispatched to <strong style={{ color: '#0F172A' }}>{booking.party?.booker_email || (booking.party as any)?.passenger_email || 'Executive Booker'}</strong> with PDF VAT receipt & calendar invite attached.
                </div>
              </div>

              {/* Passenger Notification */}
              <div style={{ backgroundColor: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '10px', padding: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                  <div style={{ width: '22px', height: '22px', borderRadius: '50%', backgroundColor: '#F0FDF4', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Phone size={13} color="#16A34A" />
                  </div>
                  <span style={{ fontSize: '12px', fontWeight: 800, color: '#1E293B' }}>Passenger Live Chauffeur Briefing</span>
                </div>
                <div style={{ fontSize: '11px', color: '#64748B', lineHeight: '1.5' }}>
                  SMS dispatched to <strong style={{ color: '#0F172A' }}>{booking.party?.passenger_phone || 'Passenger Phone'}</strong> with chauffeur details & real-time meet & greet PIN.
                </div>
              </div>
            </div>

            {/* ACTION BUTTONS */}
            <div style={{ display: 'flex', justifyContent: 'center', gap: '14px', flexWrap: 'wrap' }}>
              <button 
                onClick={() => setShowLookupModal(true)}
                style={{ 
                  padding: '12px 24px', 
                  backgroundColor: '#0A192F', 
                  color: '#FFFFFF', 
                  border: 'none', 
                  borderRadius: '8px', 
                  fontSize: '13px', 
                  fontWeight: 700, 
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}
              >
                <Calendar size={16} />
                View in My Bookings & Schedule
              </button>

              <button 
                onClick={() => { setWizardStep(1); setBooking(null); }}
                style={{ 
                  padding: '12px 24px', 
                  backgroundColor: '#FFFFFF', 
                  color: '#64748B', 
                  border: '1px solid #CBD5E1', 
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
          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 390px', gap: '32px', alignItems: 'start' }}>
            
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

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px' }}>
                      
                      {/* Card 1: Airport transfer */}
                      <div 
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
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
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
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
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
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1.4fr', gap: '16px', marginBottom: '20px' }}>
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

                        <div>
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
                          <div style={{ marginTop: '12px', padding: '16px', backgroundColor: '#FDFBF7', border: '1px solid #EAE6DF', borderRadius: '8px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
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
                              <label htmlFor="return-time-select" style={{ display: 'block', fontSize: '11.5px', fontWeight: 700, color: '#475569', marginBottom: '6px' }}>
                                Return Time
                              </label>
                              <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                                <Clock size={16} style={{ position: 'absolute', left: '12px', color: '#64748B', pointerEvents: 'none' }} />
                                <select
                                  id="return-time-select"
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

                      {/* Primary Gold CTA Button */}
                      <button
                        onClick={handleProceedToVehicles}
                        disabled={loadingQuote}
                        style={{
                          width: '100%',
                          padding: '14px 20px',
                          backgroundColor: '#9A7B4F',
                          color: '#FFFFFF',
                          border: 'none',
                          borderRadius: '6px',
                          fontSize: '14px',
                          fontWeight: 800,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '8px',
                          boxShadow: '0 2px 8px rgba(154, 123, 79, 0.3)',
                          transition: 'background-color 0.2s'
                        }}
                      >
                        <span>{loadingQuote ? 'Checking Fleet & Radar Availability...' : 'Continue to vehicles'}</span>
                        <ArrowRight size={16} />
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
                                    return (
                                      <button
                                        key={opt.type}
                                        type="button"
                                        onClick={() => {
                                          const updated = [...itineraryLegs];
                                          updated[idx].vehicle_class = opt.type;
                                          updated[idx].vehicle_title = opt.title;
                                          updated[idx].vehicle_desc = opt.models || opt.subtitle || 'Spacious. Refined. Always professional.';
                                          setItineraryLegs(updated);
                                        }}
                                        style={{
                                          padding: '8px 10px',
                                          borderRadius: '6px',
                                          border: isChosen ? '2px solid #9A7B4F' : '1px solid #CBD5E1',
                                          backgroundColor: isChosen ? '#FFFDF9' : '#FFFFFF',
                                          cursor: 'pointer',
                                          textAlign: 'left',
                                          display: 'flex',
                                          flexDirection: 'column',
                                          gap: '3px',
                                          transition: 'all 0.15s ease',
                                          boxShadow: isChosen ? '0 2px 6px rgba(154, 123, 79, 0.15)' : 'none'
                                        }}
                                      >
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                          <span style={{ fontSize: '11.5px', fontWeight: isChosen ? 800 : 700, color: isChosen ? '#9A7B4F' : '#0A192F' }}>
                                            {opt.title.replace('Mercedes-Benz ', '')}
                                          </span>
                                          {isChosen && <Check size={13} color="#9A7B4F" />}
                                        </div>
                                        <div style={{ fontSize: '10px', color: '#64748B' }}>
                                          {opt.pax} Pax · {opt.luggage} Bags
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
                          onClick={handleProceedToVehicles}
                          disabled={loadingQuote}
                          style={{
                            width: '100%',
                            padding: '14px 20px',
                            backgroundColor: '#9A7B4F',
                            color: '#FFFFFF',
                            border: 'none',
                            borderRadius: '6px',
                            fontSize: '14px',
                            fontWeight: 800,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '8px',
                            boxShadow: '0 2px 8px rgba(154, 123, 79, 0.3)'
                          }}
                        >
                          <span>{loadingQuote ? 'Pricing Master Itinerary...' : 'Continue →'}</span>
                          <ArrowRight size={16} />
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

                      return (
                        <div
                          key={veh.type}
                          onClick={() => handleSelectVehicleClass(veh.type)}
                          style={{
                            border: isSelected ? '1.5px solid #9A7B4F' : '1px solid #EAE6DF',
                            backgroundColor: isSelected ? '#FCFAF7' : '#FFFFFF',
                            borderRadius: '10px',
                            padding: '16px 20px',
                            cursor: 'pointer',
                            transition: 'all 0.15s ease',
                            boxShadow: isSelected ? '0 4px 14px rgba(154, 123, 79, 0.08)' : '0 1px 3px rgba(0,0,0,0.02)'
                          }}
                        >
                          {/* Main Flex Row */}
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px' }}>
                            
                            {/* Left: Radio & Render */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: '18px', minWidth: 0, flex: 1 }}>
                              
                              {/* Radio Button Checkmark */}
                              <div style={{
                                width: '22px',
                                height: '22px',
                                borderRadius: '50%',
                                backgroundColor: isSelected ? '#9A7B4F' : '#FFFFFF',
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
                              <div style={{ width: '135px', height: '65px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                <img
                                  src={veh.photoUrl}
                                  alt={veh.title}
                                  style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
                                  onError={(e) => {
                                    // Smooth graceful fallback
                                    (e.currentTarget as any).style.opacity = '0.3';
                                  }}
                                />
                              </div>

                              {/* Title, Subtitle, Capacity */}
                              <div style={{ minWidth: 0 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                  <span style={{ fontSize: '16px', fontWeight: 800, color: '#0A192F' }}>
                                    {veh.title}
                                  </span>
                                  {veh.badge && (
                                    <span style={{ fontSize: '9.5px', fontWeight: 800, color: '#9A7B4F', backgroundColor: '#F5EFE6', padding: '1px 6px', borderRadius: '3px' }}>
                                      {veh.badge}
                                    </span>
                                  )}
                                </div>

                                <div style={{ fontSize: '12px', color: '#64748B', marginTop: '2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
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
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', fontSize: '11.5px', color: '#475569', minWidth: '150px' }}>
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
                                <div style={{ fontFamily: '"Libre Baskerville", Georgia, serif', fontSize: '22px', fontWeight: 800, color: '#0A192F' }}>
                                  ${fareAmount}
                                </div>
                                <div style={{ fontSize: '10.5px', color: '#64748B', fontWeight: 600 }}>
                                  {hasReturnTrip ? 'roundtrip (2 rides)' : ((bookingMode === 'ITINERARY_PLANNER' && itineraryLegs.length > 1) ? `total (${itineraryLegs.length} rides)` : 'per ride')}
                                </div>
                              </div>

                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  toggleExpandVehicle(veh.type);
                                }}
                                style={{ background: 'none', border: 'none', color: '#0A192F', cursor: 'pointer', padding: '4px' }}
                              >
                                {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                              </button>
                            </div>

                          </div>

                          {/* Expandable Pricing Breakdown & Vendor Disclosure Drawer */}
                          {isExpanded && qData && (
                            <div style={{ marginTop: '14px', paddingTop: '12px', borderTop: '1px dashed #E2E8F0', display: 'grid', gridTemplateColumns: (hasReturnTrip || (qData.legs && qData.legs.length > 1)) ? 'repeat(2, 1fr)' : 'repeat(3, 1fr)', gap: '12px', fontSize: '11px', color: '#64748B' }}>
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
                      onClick={() => setWizardStep(3)}
                      style={{
                        padding: '12px 28px',
                        backgroundColor: '#9A7B4F',
                        color: '#FFFFFF',
                        border: 'none',
                        borderRadius: '6px',
                        fontSize: '13.5px',
                        fontWeight: 800,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        boxShadow: '0 2px 6px rgba(154, 123, 79, 0.25)'
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

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px', marginBottom: '24px' }}>
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

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '12px' }}>
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
                      <div style={{ marginTop: '14px', paddingTop: '14px', borderTop: '1px dashed #CBD5E1', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
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

                    <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr', gap: '12px' }}>
                      
                      {/* Card Number 4-Digit Chunk Input */}
                      <div>
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
                      <div>
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

                  {/* Primary Pre-Auth Hold CTA */}
                  <button
                    onClick={handleConfirmPreAuthBooking}
                    disabled={bookingLoading}
                    style={{
                      width: '100%',
                      padding: '14px 20px',
                      backgroundColor: '#16A34A',
                      color: '#FFFFFF',
                      border: 'none',
                      borderRadius: '6px',
                      fontSize: '14px',
                      fontWeight: 800,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                      boxShadow: '0 2px 8px rgba(22, 163, 74, 0.3)',
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

                {/* Route Map Preview Illustration */}
                <div style={{ 
                  borderRadius: '8px', 
                  overflow: 'hidden', 
                  border: '1px solid #E2E8F0', 
                  marginBottom: '18px',
                  backgroundColor: '#EBF4F6',
                  position: 'relative',
                  height: '140px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  {/* Stylized Map Canvas */}
                  <svg width="100%" height="100%" viewBox="0 0 400 140" style={{ position: 'absolute', inset: 0 }}>
                    {/* Water / Coastline shapes */}
                    <path d="M0,0 L180,0 C170,40 190,80 160,140 L0,140 Z" fill="#D9EBF0" />
                    <path d="M280,0 C300,50 310,90 400,100 L400,0 Z" fill="#D9EBF0" />
                    {/* Route Line */}
                    <path d="M330,100 Q240,60 180,30" fill="none" stroke="#0A192F" strokeWidth="3" strokeDasharray="6,4" />
                    {/* Destination Marker */}
                    <circle cx="180" cy="30" r="6" fill="#9A7B4F" />
                    <circle cx="180" cy="30" r="12" fill="none" stroke="#9A7B4F" strokeWidth="1.5" />
                    {/* Pickup Marker */}
                    <circle cx="330" cy="100" r="6" fill="#0A192F" />
                  </svg>

                  {/* Route Labels */}
                  <div style={{ position: 'absolute', top: '16px', left: '16px', backgroundColor: 'rgba(255,255,255,0.92)', padding: '2px 8px', borderRadius: '4px', fontSize: '10px', fontWeight: 800, color: '#0A192F' }}>
                    {dropoffAddress ? dropoffAddress.split(',')[0] : 'Destination'}
                  </div>
                  <div style={{ position: 'absolute', bottom: '16px', right: '16px', backgroundColor: 'rgba(255,255,255,0.92)', padding: '2px 8px', borderRadius: '4px', fontSize: '10px', fontWeight: 800, color: '#0A192F' }}>
                    {pickupAddress ? pickupAddress.split(',')[0] : 'Pickup Location'}
                  </div>

                  {/* Italic Motto */}
                  <div style={{ position: 'absolute', right: '20px', top: '24px', textAlign: 'right', pointerEvents: 'none' }}>
                    <div style={{ fontFamily: '"Libre Baskerville", Georgia, serif', fontStyle: 'italic', fontSize: '13px', color: '#0A192F', lineHeight: 1.2 }}>
                      From here to<br />what's next.
                    </div>
                    <div style={{ width: '28px', height: '1.5px', backgroundColor: '#9A7B4F', marginTop: '4px', marginLeft: 'auto' }} />
                  </div>
                </div>

                {/* Key-Value Breakdown List */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '12px', color: '#334155', borderBottom: '1px solid #F1F5F9', paddingBottom: '16px', marginBottom: '16px' }}>
                  
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                    <Plane size={15} color="#0A192F" style={{ marginTop: '2px', flexShrink: 0 }} />
                    <div style={{ flex: 1 }}>
                      <span style={{ color: '#64748B', fontWeight: 600 }}>Pickup</span>
                      <div style={{ fontWeight: 700, color: pickupAddress ? '#0F172A' : '#94A3B8' }}>
                        {pickupAddress ? pickupAddress.split(',')[0] : 'Enter pickup location'}
                      </div>
                    </div>
                  </div>

                  {selectedRideType === 'HOURLY' ? (
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                      <Clock size={15} color="#0A192F" style={{ marginTop: '2px', flexShrink: 0 }} />
                      <div style={{ flex: 1 }}>
                        <span style={{ color: '#64748B', fontWeight: 600 }}>Service Duration</span>
                        <div style={{ fontWeight: 700, color: '#0F172A' }}>{hourlyHours} Hours (As Directed)</div>
                        <div style={{ fontSize: '10px', color: '#94A3B8' }}>{flightNumber || 'Regional executive itinerary'}</div>
                      </div>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                      <MapPin size={15} color="#0A192F" style={{ marginTop: '2px', flexShrink: 0 }} />
                      <div style={{ flex: 1 }}>
                        <span style={{ color: '#64748B', fontWeight: 600 }}>Destination</span>
                        <div style={{ fontWeight: 700, color: dropoffAddress ? '#0F172A' : '#94A3B8' }}>
                          {dropoffAddress ? dropoffAddress.split(',')[0] : 'Enter destination'}
                        </div>
                        {dropoffAddress && <div style={{ fontSize: '10px', color: '#94A3B8' }}>{dropoffAddress}</div>}
                      </div>
                    </div>
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
                    onClick={handleProceedToVehicles}
                    style={{
                      marginTop: '16px',
                      width: '100%',
                      padding: '12px',
                      backgroundColor: '#9A7B4F',
                      color: '#FFFFFF',
                      border: 'none',
                      borderRadius: '6px',
                      fontSize: '13px',
                      fontWeight: 800,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px'
                    }}
                  >
                    <span>Continue to vehicles</span>
                    <ArrowRight size={14} />
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
        <div style={{ maxWidth: '1320px', margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '24px' }}>
          
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

    </div>
  );
};
