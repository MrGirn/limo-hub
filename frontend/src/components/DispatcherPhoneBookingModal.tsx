import React, { useState, useEffect } from 'react';
import { 
  PhoneCall, MapPin, Calendar, Clock, DollarSign, 
  Send, User, Car, Shield, Check, Copy, AlertCircle, X,
  ArrowRight, ShieldCheck, CheckCircle, Navigation, Layers,
  CreditCard, FileText, Mail, ExternalLink, RefreshCw
} from 'lucide-react';
import { Driver, Vehicle, QuickQuoteResponse, PhoneBookingResult } from '../types';
import { fetchQuickPhoneQuote, createManualPhoneBooking } from '../api';

interface DispatcherPhoneBookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  vendorId?: string;
  vendorName?: string;
  availableDrivers?: Driver[];
  availableVehicles?: Vehicle[];
  onBookingCreated?: (bookingId: string) => void;
}

export const DispatcherPhoneBookingModal: React.FC<DispatcherPhoneBookingModalProps> = ({
  isOpen,
  onClose,
  vendorId = 'vendor_anb_philly',
  vendorName = 'ANB Limo Executive Chauffeurs',
  availableDrivers = [],
  availableVehicles = [],
  onBookingCreated
}) => {
  // Form State
  const [callerName, setCallerName] = useState('Jonathan Vance');
  const [callerPhone, setCallerPhone] = useState('+1 (267) 555-0199');
  const [callerEmail, setCallerEmail] = useState('jvance@vanceholdings.com');
  const [isVip, setIsVip] = useState(true);
  const [sendEmailNotification, setSendEmailNotification] = useState(true);
  const [sendSmsNotification, setSendSmsNotification] = useState(true);
  const [corporateAccountName, setCorporateAccountName] = useState('');
  const [corporatePoNumber, setCorporatePoNumber] = useState('');
  
  const [serviceType, setServiceType] = useState<'AIRPORT_TRANSFER' | 'POINT_TO_POINT' | 'HOURLY_AS_DIRECTED' | 'MULTI_CITY_TOUR'>('POINT_TO_POINT');
  const [vehicleClass, setVehicleClass] = useState<'BUSINESS_SEDAN' | 'FIRST_CLASS' | 'LUXURY_SUV' | 'BUSINESS_VAN' | 'ULTRA_LUXURY'>('LUXURY_SUV');
  
  const [pickupAddress, setPickupAddress] = useState('30 S 17th St, Philadelphia, PA');
  const [dropoffAddress, setDropoffAddress] = useState('Philadelphia International Airport (PHL) Terminal D');
  const [pickupDate, setPickupDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().split('T')[0];
  });
  const [pickupTime, setPickupTime] = useState('08:30');
  
  const [flightNumber, setFlightNumber] = useState('AA 1842');
  const [airlineName, setAirlineName] = useState('American Airlines');
  const [meetAndGreet, setMeetAndGreet] = useState(false);
  const [hourlyHours, setHourlyHours] = useState(4);
  const [childSeat, setChildSeat] = useState(false);
  const [specialInstructions, setSpecialInstructions] = useState('');
  
  // Multi-Leg Stops
  const [multiLegStops, setMultiLegStops] = useState<any[]>([
    { leg: 1, pickup: '30 S 17th St, Philadelphia, PA', dropoff: 'Midtown Manhattan Legal Tower, 1221 6th Ave, NYC', layover_hours: 0, distance_km: 155 },
    { leg: 2, pickup: 'Midtown Manhattan Legal Tower, 1221 6th Ave, NYC', dropoff: '30 S 17th St, Philadelphia, PA', layover_hours: 2.5, distance_km: 155 }
  ]);

  // Adjustments & Payment
  const [manualDiscount, setManualDiscount] = useState<number>(0);
  const [customSurcharge, setCustomSurcharge] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState<'SMS_PAYMENT_LINK' | 'DIRECT_CARD_PREAUTH' | 'CORPORATE_INVOICE' | 'CASH_ON_BOARD'>('SMS_PAYMENT_LINK');
  const [cardNumber, setCardNumber] = useState('•••• •••• •••• 4242');
  
  // Dispatch Action
  const [dispatchAction, setDispatchAction] = useState<'AUTO_DISPATCH' | 'ASSIGN_SPECIFIC_DRIVER' | 'QUEUE_24H_DISPATCH' | 'FARM_OUT_AFFILIATE'>('AUTO_DISPATCH');
  const [selectedDriverId, setSelectedDriverId] = useState<string>('');
  const [selectedVehicleId, setSelectedVehicleId] = useState<string>('');

  // Quote calculation & loading
  const [quote, setQuote] = useState<QuickQuoteResponse | null>(null);
  const [isQuoting, setIsQuoting] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [bookingResult, setBookingResult] = useState<PhoneBookingResult | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);

  // Recalculate quote whenever ANY core parameter changes
  useEffect(() => {
    if (!isOpen) return;
    const timer = setTimeout(() => {
      calculateQuote();
    }, 150);
    return () => clearTimeout(timer);
  }, [
    serviceType, vehicleClass, pickupAddress, dropoffAddress, flightNumber, 
    hourlyHours, meetAndGreet, multiLegStops, manualDiscount, customSurcharge, isOpen
  ]);

  const calculateQuote = async () => {
    setIsQuoting(true);
    try {
      const q = await fetchQuickPhoneQuote({
        vendor_id: vendorId,
        service_type: serviceType,
        vehicle_class: vehicleClass,
        pickup_address: pickupAddress,
        dropoff_address: dropoffAddress,
        flight_number: serviceType === 'AIRPORT_TRANSFER' ? flightNumber : undefined,
        hourly_hours: serviceType === 'HOURLY_AS_DIRECTED' ? hourlyHours : undefined,
        meet_and_greet: serviceType === 'AIRPORT_TRANSFER' ? meetAndGreet : false,
        multi_leg_stops: serviceType === 'MULTI_CITY_TOUR' ? multiLegStops : undefined,
        manual_discount_usd: manualDiscount,
        custom_surcharge_usd: customSurcharge
      });
      setQuote(q);
    } catch (err) {
      console.error('Authoritative quote calculation error:', err);
    } finally {
      setIsQuoting(false);
    }
  };

  // Quick Preset Handlers
  const applyPreset = (presetName: string) => {
    if (presetName === 'PHL_AIRPORT') {
      setCallerName('Dr. Richard Sterling');
      setCallerPhone('+1 (215) 555-0144');
      setCallerEmail('rsterling@pennmedicine.org');
      setIsVip(true);
      setServiceType('AIRPORT_TRANSFER');
      setVehicleClass('FIRST_CLASS');
      setPickupAddress('Philadelphia International Airport (PHL) Terminal A');
      setDropoffAddress('The Ritz-Carlton, 10 Avenue of the Arts, Philadelphia, PA');
      setFlightNumber('AA 1842');
      setAirlineName('American Airlines');
      setMeetAndGreet(true);
      setPaymentMethod('SMS_PAYMENT_LINK');
    } else if (presetName === 'POINT_TO_POINT_EXEC') {
      setCallerName('Jonathan Vance');
      setCallerPhone('+1 (267) 555-0199');
      setCallerEmail('jvance@vanceholdings.com');
      setIsVip(true);
      setServiceType('POINT_TO_POINT');
      setVehicleClass('LUXURY_SUV');
      setPickupAddress('30 S 17th St, Philadelphia, PA');
      setDropoffAddress('Philadelphia International Airport (PHL) Terminal D');
      setMeetAndGreet(false);
      setPaymentMethod('SMS_PAYMENT_LINK');
    } else if (presetName === 'MULTI_LEG_NYC') {
      setCallerName('Victoria Vance, Esq.');
      setCallerPhone('+1 (610) 555-0188');
      setCallerEmail('vvance@dechert-law.com');
      setIsVip(true);
      setCorporateAccountName('Dechert LLP Legal Counsel');
      setCorporatePoNumber('PO-NY-8821');
      setServiceType('MULTI_CITY_TOUR');
      setVehicleClass('LUXURY_SUV');
      setPickupAddress('Cira Centre, 2929 Arch St, Philadelphia, PA');
      setDropoffAddress('Midtown Manhattan Legal Tower, 1221 6th Ave, NYC');
      setMultiLegStops([
        { leg: 1, pickup: 'Cira Centre, 2929 Arch St, Philadelphia, PA', dropoff: '1221 6th Ave, Manhattan, NYC', layover_hours: 0, distance_km: 155 },
        { leg: 2, pickup: '1221 6th Ave, Manhattan, NYC', dropoff: 'Cira Centre, 2929 Arch St, Philadelphia, PA', layover_hours: 2.5, distance_km: 155 }
      ]);
      setPaymentMethod('CORPORATE_INVOICE');
    } else if (presetName === 'HOURLY_ROADSHOW') {
      setCallerName('Marcus Holloway');
      setCallerPhone('+1 (201) 555-0177');
      setCallerEmail('mholloway@vanguard.com');
      setIsVip(false);
      setServiceType('HOURLY_AS_DIRECTED');
      setHourlyHours(5);
      setVehicleClass('LUXURY_SUV');
      setPickupAddress('Vanguard Campus, Malvern, PA');
      setDropoffAddress('Financial District & Center City Executive Roadshow');
      setPaymentMethod('DIRECT_CARD_PREAUTH');
    }
  };

  const handleSubmitBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!callerName || !callerPhone) {
      alert('Please enter Caller Name and Phone Number');
      return;
    }
    if (!pickupAddress) {
      alert('Please enter a valid Pickup Address');
      return;
    }

    setIsSubmitting(true);
    try {
      const pickupUtc = new Date(`${pickupDate}T${pickupTime}:00Z`).toISOString();
      const payload = {
        vendor_id: vendorId,
        dispatcher_user_id: 'disp-console-lead',
        caller_name: callerName,
        caller_phone: callerPhone,
        caller_email: callerEmail,
        is_vip: isVip,
        corporate_account_name: corporateAccountName,
        corporate_po_number: corporatePoNumber,
        service_type: serviceType,
        vehicle_class: vehicleClass,
        pickup_address: pickupAddress,
        dropoff_address: dropoffAddress,
        pickup_time_utc: pickupUtc,
        flight_number: serviceType === 'AIRPORT_TRANSFER' ? flightNumber : undefined,
        airline_name: serviceType === 'AIRPORT_TRANSFER' ? airlineName : undefined,
        hourly_hours: serviceType === 'HOURLY_AS_DIRECTED' ? hourlyHours : undefined,
        meet_and_greet_inside: serviceType === 'AIRPORT_TRANSFER' ? meetAndGreet : false,
        child_car_seat_requested: childSeat,
        special_instructions: specialInstructions,
        multi_leg_stops: serviceType === 'MULTI_CITY_TOUR' ? multiLegStops : undefined,
        manual_discount_usd: manualDiscount,
        custom_surcharge_usd: customSurcharge,
        payment_method: paymentMethod,
        card_number_masked: paymentMethod === 'DIRECT_CARD_PREAUTH' ? cardNumber : undefined,
        dispatch_action: dispatchAction,
        assigned_driver_id: selectedDriverId || undefined,
        assigned_vehicle_id: selectedVehicleId || undefined
      };

      const result = await createManualPhoneBooking(payload);
      setBookingResult(result);
      if (onBookingCreated) {
        onBookingCreated(result.booking_id);
      }
    } catch (err: any) {
      alert(`Booking creation failed: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCopyLink = () => {
    if (bookingResult?.payment_link_url) {
      navigator.clipboard.writeText(bookingResult.payment_link_url);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 3000);
    }
  };

  const resetForm = () => {
    setBookingResult(null);
    setCallerName('');
    setCallerPhone('');
    setCallerEmail('');
    setIsVip(false);
    setCorporateAccountName('');
  };

  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      backgroundColor: 'rgba(15, 23, 42, 0.45)',
      backdropFilter: 'blur(6px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 9999,
      padding: '16px'
    }}>
      <div style={{
        backgroundColor: '#FFFFFF',
        borderRadius: '16px',
        width: '100%',
        maxWidth: '1150px',
        maxHeight: '94vh',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.15)',
        overflow: 'hidden',
        border: '1px solid #E2E8F0'
      }}>
        
        {/* LIGHT LUXURY MODAL HEADER */}
        <div style={{
          backgroundColor: '#FFFFFF',
          color: '#0F172A',
          padding: '16px 24px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          borderBottom: '1px solid #E2E8F0'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div style={{
              width: '42px',
              height: '42px',
              borderRadius: '10px',
              backgroundColor: '#10B981',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 2px 10px rgba(16, 185, 129, 0.25)'
            }}>
              <PhoneCall size={22} color="#FFFFFF" />
            </div>
            <div>
              <div style={{ fontSize: '16px', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '10px', color: '#0F172A' }}>
                📞 Inbound Phone Booking & Dispatch Desk
                <span style={{ fontSize: '11px', background: '#E0F2FE', color: '#0369A1', padding: '3px 10px', borderRadius: '12px', border: '1px solid #BAE6FD', fontWeight: 700 }}>
                  {vendorName}
                </span>
              </div>
              <div style={{ fontSize: '12px', color: '#64748B' }}>
                Direct telephone intake with live sovereign pricing engine parity, customer payment email with pay button, instant SMS link, and driver dispatch.
              </div>
            </div>
          </div>

          <button
            onClick={onClose}
            style={{
              background: '#F1F5F9',
              border: '1px solid #E2E8F0',
              color: '#64748B',
              cursor: 'pointer',
              padding: '8px',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.15s'
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* BODY CONTAINER */}
        {bookingResult ? (
          /* SUCCESS SCREEN WITH EMAIL & SMS ACTIONS */
          <div style={{ padding: '36px', textAlign: 'center', overflowY: 'auto', backgroundColor: '#FAFAFA' }}>
            <div style={{
              width: '70px',
              height: '70px',
              borderRadius: '50%',
              backgroundColor: '#DCFCE7',
              color: '#16A34A',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px auto',
              boxShadow: '0 4px 14px rgba(22, 163, 74, 0.2)'
            }}>
              <CheckCircle size={40} />
            </div>

            <h2 style={{ fontSize: '22px', fontWeight: 800, color: '#0F172A', margin: '0 0 6px 0' }}>
              Reservation Successfully Booked!
            </h2>
            <div style={{ fontSize: '13px', color: '#64748B', marginBottom: '24px' }}>
              Booking Reference: <strong style={{ color: '#0284C7', fontSize: '16px' }}>#{bookingResult.booking_id}</strong> • Trip Ref: <strong>#{bookingResult.trip_id}</strong>
            </div>

            <div style={{
              maxWidth: '700px',
              margin: '0 auto 24px auto',
              backgroundColor: '#FFFFFF',
              border: '1px solid #E2E8F0',
              borderRadius: '12px',
              padding: '24px',
              textAlign: 'left',
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '16px',
              boxShadow: '0 4px 16px rgba(0,0,0,0.04)'
            }}>
              <div>
                <span style={{ fontSize: '11px', color: '#64748B', display: 'block', fontWeight: 600 }}>Lead Passenger / Booker</span>
                <strong style={{ fontSize: '13px', color: '#0F172A' }}>{callerName} ({callerPhone})</strong>
              </div>
              <div>
                <span style={{ fontSize: '11px', color: '#64748B', display: 'block', fontWeight: 600 }}>Total Guaranteed Fare</span>
                <strong style={{ fontSize: '15px', color: '#16A34A' }}>${bookingResult.total_amount_usd.toFixed(2)} USD</strong>
              </div>
              <div>
                <span style={{ fontSize: '11px', color: '#64748B', display: 'block', fontWeight: 600 }}>Assigned Chauffeur</span>
                <strong style={{ fontSize: '13px', color: '#0F172A' }}>{bookingResult.assigned_driver_name || 'Autonomous 24h Radar'}</strong>
              </div>
              <div>
                <span style={{ fontSize: '11px', color: '#64748B', display: 'block', fontWeight: 600 }}>Vehicle Allocated</span>
                <strong style={{ fontSize: '13px', color: '#0F172A' }}>{bookingResult.assigned_vehicle_details}</strong>
              </div>
              <div style={{ gridColumn: 'span 2', borderTop: '1px solid #E2E8F0', paddingTop: '12px', display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'center' }}>
                <span style={{ fontSize: '11px', color: '#64748B', display: 'block', width: '100%', fontWeight: 600, marginBottom: '4px' }}>Dispatched Notifications</span>
                
                <span style={{ fontSize: '12px', fontWeight: 700, color: '#0284C7', background: '#E0F2FE', padding: '4px 10px', borderRadius: '6px' }}>
                  💳 {bookingResult.payment_method} • {bookingResult.payment_status}
                </span>

                {bookingResult.sms_notification_sent && (
                  <span style={{ fontSize: '12px', fontWeight: 700, color: '#16A34A', background: '#DCFCE7', padding: '4px 10px', borderRadius: '6px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    📱 SMS Link Sent to {callerPhone}
                  </span>
                )}

                {bookingResult.email_notification_sent && (
                  <span style={{ fontSize: '12px', fontWeight: 700, color: '#7C3AED', background: '#EDE9FE', padding: '4px 10px', borderRadius: '6px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    ✉️ Payment Email with Pay Button Dispatched to {bookingResult.customer_email || callerEmail}
                  </span>
                )}
              </div>
            </div>

            {/* Instant Payment Link & Email Preview Box */}
            <div style={{
              maxWidth: '700px',
              margin: '0 auto 24px auto',
              backgroundColor: '#EFF6FF',
              border: '1px solid #BFDBFE',
              borderRadius: '10px',
              padding: '18px',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
                <div style={{ textAlign: 'left' }}>
                  <div style={{ fontSize: '12px', fontWeight: 800, color: '#1E40AF' }}>
                    🔗 Customer 1-Click Payment & Live Telemetry Link:
                  </div>
                  <div style={{ fontSize: '13px', color: '#2563EB', wordBreak: 'break-all', fontWeight: 600 }}>
                    {bookingResult.payment_link_url}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    type="button"
                    onClick={handleCopyLink}
                    style={{
                      padding: '8px 14px',
                      fontSize: '12px',
                      fontWeight: 700,
                      backgroundColor: copiedLink ? '#16A34A' : '#0284C7',
                      color: '#FFFFFF',
                      border: 'none',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      whiteSpace: 'nowrap'
                    }}
                  >
                    {copiedLink ? <Check size={14} /> : <Copy size={14} />}
                    {copiedLink ? 'Copied!' : 'Copy Link'}
                  </button>
                  <a
                    href={bookingResult.payment_link_url}
                    target="_blank"
                    rel="noreferrer"
                    style={{
                      padding: '8px 14px',
                      fontSize: '12px',
                      fontWeight: 700,
                      backgroundColor: '#10B981',
                      color: '#FFFFFF',
                      border: 'none',
                      borderRadius: '6px',
                      textDecoration: 'none',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      whiteSpace: 'nowrap'
                    }}
                  >
                    <ExternalLink size={14} /> Open Pay Page
                  </a>
                </div>
              </div>

              {/* Email Receipt Preview Button */}
              {bookingResult.email_preview_url && (
                <div style={{ borderTop: '1px solid #DBEAFE', paddingTop: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '12px', color: '#1E40AF' }}>
                    ✉️ Customer Payment Email has been generated with direct pay button.
                  </span>
                  <a
                    href={`http://localhost:8001${bookingResult.email_preview_url}`}
                    target="_blank"
                    rel="noreferrer"
                    style={{
                      padding: '6px 12px',
                      fontSize: '11px',
                      fontWeight: 700,
                      backgroundColor: '#7C3AED',
                      color: '#FFFFFF',
                      borderRadius: '6px',
                      textDecoration: 'none',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}
                  >
                    <Mail size={12} /> View Customer Payment Email
                  </a>
                </div>
              )}
            </div>

            <div style={{ display: 'flex', justifyContent: 'center', gap: '12px' }}>
              <button
                type="button"
                onClick={resetForm}
                style={{
                  padding: '10px 20px',
                  fontSize: '13px',
                  fontWeight: 700,
                  backgroundColor: '#FFFFFF',
                  color: '#334155',
                  border: '1px solid #CBD5E1',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
                }}
              >
                📞 Book Another Phone Call
              </button>
              <button
                type="button"
                onClick={onClose}
                style={{
                  padding: '10px 26px',
                  fontSize: '13px',
                  fontWeight: 700,
                  backgroundColor: '#0284C7',
                  color: '#FFFFFF',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  boxShadow: '0 2px 8px rgba(2, 132, 199, 0.3)'
                }}
              >
                Close & Return to Dispatch
              </button>
            </div>
          </div>
        ) : (
          /* MAIN INTAKE FORM — LIGHT LUXURY SHELL WITH CANONICAL ENGINE PARITY */
          <form onSubmit={handleSubmitBooking} style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
            
            {/* LEFT COLUMN: CALLER DETAILS & ROUTING */}
            <div style={{
              flex: 1,
              padding: '20px 24px',
              overflowY: 'auto',
              borderRight: '1px solid #E2E8F0',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
              backgroundColor: '#FAFAFA'
            }}>
              
              {/* QUICK PRESETS */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '11px', fontWeight: 800, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  ⚡ Quick Presets:
                </span>
                <button
                  type="button"
                  onClick={() => applyPreset('POINT_TO_POINT_EXEC')}
                  style={{
                    fontSize: '11px',
                    fontWeight: 700,
                    padding: '5px 12px',
                    borderRadius: '6px',
                    backgroundColor: '#FFFFFF',
                    border: '1px solid #CBD5E1',
                    color: '#0F172A',
                    cursor: 'pointer',
                    boxShadow: '0 1px 2px rgba(0,0,0,0.04)'
                  }}
                >
                  📍 Center City ➔ PHL (Point-to-Point)
                </button>
                <button
                  type="button"
                  onClick={() => applyPreset('PHL_AIRPORT')}
                  style={{
                    fontSize: '11px',
                    fontWeight: 700,
                    padding: '5px 12px',
                    borderRadius: '6px',
                    backgroundColor: '#FFFFFF',
                    border: '1px solid #CBD5E1',
                    color: '#0F172A',
                    cursor: 'pointer',
                    boxShadow: '0 1px 2px rgba(0,0,0,0.04)'
                  }}
                >
                  ✈️ PHL Airport VIP Transfer
                </button>
                <button
                  type="button"
                  onClick={() => applyPreset('MULTI_LEG_NYC')}
                  style={{
                    fontSize: '11px',
                    fontWeight: 700,
                    padding: '5px 12px',
                    borderRadius: '6px',
                    backgroundColor: '#FFFFFF',
                    border: '1px solid #CBD5E1',
                    color: '#0F172A',
                    cursor: 'pointer',
                    boxShadow: '0 1px 2px rgba(0,0,0,0.04)'
                  }}
                >
                  🏙️ Multi-Leg PHL ➔ NYC ➔ PHL
                </button>
                <button
                  type="button"
                  onClick={() => applyPreset('HOURLY_ROADSHOW')}
                  style={{
                    fontSize: '11px',
                    fontWeight: 700,
                    padding: '5px 12px',
                    borderRadius: '6px',
                    backgroundColor: '#FFFFFF',
                    border: '1px solid #CBD5E1',
                    color: '#0F172A',
                    cursor: 'pointer',
                    boxShadow: '0 1px 2px rgba(0,0,0,0.04)'
                  }}
                >
                  ⏱️ 5-Hour Executive Roadshow
                </button>
              </div>

              {/* 1. CALLER & PASSENGER DETAILS */}
              <div style={{
                backgroundColor: '#FFFFFF',
                border: '1px solid #E2E8F0',
                borderRadius: '10px',
                padding: '14px 18px',
                boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
              }}>
                <div style={{ display: 'flex', justifySelf: 'stretch', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                  <div style={{ fontSize: '13px', fontWeight: 800, color: '#0F172A', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <User size={15} color="#0284C7" /> 1. Caller & Client Details
                  </div>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', fontWeight: 700, color: '#D97706', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={isVip}
                      onChange={(e) => setIsVip(e.target.checked)}
                      style={{ accentColor: '#D97706' }}
                    />
                    👑 VIP / Executive Flag
                  </label>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1.2fr', gap: '10px' }}>
                  <div>
                    <label style={{ fontSize: '11px', color: '#64748B', display: 'block', fontWeight: 600, marginBottom: '2px' }}>Caller Full Name *</label>
                    <input
                      type="text"
                      value={callerName}
                      onChange={(e) => setCallerName(e.target.value)}
                      placeholder="e.g. Jonathan Vance"
                      required
                      style={{ width: '100%', padding: '7px 10px', fontSize: '12px', border: '1px solid #CBD5E1', borderRadius: '6px', backgroundColor: '#FFFFFF', color: '#0F172A' }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '11px', color: '#64748B', display: 'block', fontWeight: 600, marginBottom: '2px' }}>Phone Number (for SMS) *</label>
                    <input
                      type="text"
                      value={callerPhone}
                      onChange={(e) => setCallerPhone(e.target.value)}
                      placeholder="+1 (267) 555-0199"
                      required
                      style={{ width: '100%', padding: '7px 10px', fontSize: '12px', border: '1px solid #CBD5E1', borderRadius: '6px', backgroundColor: '#FFFFFF', color: '#0F172A' }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '11px', color: '#64748B', display: 'block', fontWeight: 600, marginBottom: '2px' }}>Email (Receipt & Pay Button)</label>
                    <input
                      type="email"
                      value={callerEmail}
                      onChange={(e) => setCallerEmail(e.target.value)}
                      placeholder="jvance@vanceholdings.com"
                      style={{ width: '100%', padding: '7px 10px', fontSize: '12px', border: '1px solid #CBD5E1', borderRadius: '6px', backgroundColor: '#FFFFFF', color: '#0F172A' }}
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginTop: '10px' }}>
                  <div>
                    <label style={{ fontSize: '11px', color: '#64748B', display: 'block', fontWeight: 600, marginBottom: '2px' }}>Corporate Account (Optional)</label>
                    <input
                      type="text"
                      value={corporateAccountName}
                      onChange={(e) => setCorporateAccountName(e.target.value)}
                      placeholder="e.g. Vance Holdings Executive Travel"
                      style={{ width: '100%', padding: '7px 10px', fontSize: '12px', border: '1px solid #CBD5E1', borderRadius: '6px', backgroundColor: '#FFFFFF', color: '#0F172A' }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '11px', color: '#64748B', display: 'block', fontWeight: 600, marginBottom: '2px' }}>PO / Cost Center #</label>
                    <input
                      type="text"
                      value={corporatePoNumber}
                      onChange={(e) => setCorporatePoNumber(e.target.value)}
                      placeholder="e.g. PO-8821"
                      style={{ width: '100%', padding: '7px 10px', fontSize: '12px', border: '1px solid #CBD5E1', borderRadius: '6px', backgroundColor: '#FFFFFF', color: '#0F172A' }}
                    />
                  </div>
                </div>
              </div>

              {/* 2. SERVICE & CANONICAL FLEET CATEGORY */}
              <div style={{
                backgroundColor: '#FFFFFF',
                border: '1px solid #E2E8F0',
                borderRadius: '10px',
                padding: '14px 18px',
                boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
              }}>
                <div style={{ fontSize: '13px', fontWeight: 800, color: '#0F172A', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '10px' }}>
                  <Car size={15} color="#0284C7" /> 2. Service & Fleet Class Selection
                </div>

                {/* Service Type Tabs */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '6px', marginBottom: '12px' }}>
                  {[
                    { id: 'POINT_TO_POINT', label: '📍 Point-to-Point', sub: 'Direct Transfer' },
                    { id: 'AIRPORT_TRANSFER', label: '✈️ Airport', sub: 'Flight Tracking' },
                    { id: 'HOURLY_AS_DIRECTED', label: '⏱️ Hourly Charter', sub: 'By the Hour' },
                    { id: 'MULTI_CITY_TOUR', label: '🏙️ Multi-Leg', sub: 'Corridor & Return' }
                  ].map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => {
                        setServiceType(s.id as any);
                        if (s.id !== 'AIRPORT_TRANSFER') {
                          setMeetAndGreet(false);
                        }
                      }}
                      style={{
                        padding: '8px 4px',
                        borderRadius: '8px',
                        border: serviceType === s.id ? '2px solid #0284C7' : '1px solid #CBD5E1',
                        backgroundColor: serviceType === s.id ? '#0284C7' : '#FFFFFF',
                        color: serviceType === s.id ? '#FFFFFF' : '#334155',
                        fontWeight: 700,
                        cursor: 'pointer',
                        textAlign: 'center',
                        boxShadow: serviceType === s.id ? '0 2px 6px rgba(2, 132, 199, 0.25)' : 'none'
                      }}
                    >
                      <div style={{ fontSize: '12px' }}>{s.label}</div>
                      <div style={{ fontSize: '10px', opacity: 0.85, fontWeight: 500 }}>{s.sub}</div>
                    </button>
                  ))}
                </div>

                {/* Canonical Vehicle Class Selector */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '6px' }}>
                  {[
                    { id: 'BUSINESS_SEDAN', label: 'Sedan', cap: '3 Pax' },
                    { id: 'FIRST_CLASS', label: 'First Class', cap: '3 Pax' },
                    { id: 'LUXURY_SUV', label: 'Exec SUV', cap: '6 Pax' },
                    { id: 'BUSINESS_VAN', label: 'Sprinter', cap: '14 Pax' },
                    { id: 'ULTRA_LUXURY', label: 'Prestige', cap: '3 Pax' }
                  ].map((v) => (
                    <button
                      key={v.id}
                      type="button"
                      onClick={() => setVehicleClass(v.id as any)}
                      style={{
                        padding: '6px 4px',
                        borderRadius: '6px',
                        border: vehicleClass === v.id ? '2px solid #0F172A' : '1px solid #CBD5E1',
                        backgroundColor: vehicleClass === v.id ? '#0F172A' : '#FFFFFF',
                        color: vehicleClass === v.id ? '#FFFFFF' : '#475569',
                        fontWeight: 700,
                        cursor: 'pointer',
                        textAlign: 'center'
                      }}
                    >
                      <div style={{ fontSize: '11px' }}>{v.label}</div>
                      <div style={{ fontSize: '9px', opacity: 0.8 }}>{v.cap}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* 3. SCHEDULE & ROUTING DETAILS */}
              <div style={{
                backgroundColor: '#FFFFFF',
                border: '1px solid #E2E8F0',
                borderRadius: '10px',
                padding: '14px 18px',
                boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
              }}>
                <div style={{ fontSize: '13px', fontWeight: 800, color: '#0F172A', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '10px' }}>
                  <MapPin size={15} color="#0284C7" /> 3. Schedule & Route
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '10px' }}>
                  <div>
                    <label style={{ fontSize: '11px', color: '#64748B', display: 'block', fontWeight: 600, marginBottom: '2px' }}>Pickup Date *</label>
                    <input
                      type="date"
                      value={pickupDate}
                      onChange={(e) => setPickupDate(e.target.value)}
                      required
                      style={{ width: '100%', padding: '7px 10px', fontSize: '12px', border: '1px solid #CBD5E1', borderRadius: '6px', backgroundColor: '#FFFFFF', color: '#0F172A' }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '11px', color: '#64748B', display: 'block', fontWeight: 600, marginBottom: '2px' }}>Pickup Time *</label>
                    <input
                      type="time"
                      value={pickupTime}
                      onChange={(e) => setPickupTime(e.target.value)}
                      required
                      style={{ width: '100%', padding: '7px 10px', fontSize: '12px', border: '1px solid #CBD5E1', borderRadius: '6px', backgroundColor: '#FFFFFF', color: '#0F172A' }}
                    />
                  </div>
                </div>

                <div style={{ marginBottom: '10px' }}>
                  <label style={{ fontSize: '11px', color: '#64748B', display: 'block', fontWeight: 600, marginBottom: '2px' }}>Pickup Address *</label>
                  <input
                    type="text"
                    value={pickupAddress}
                    onChange={(e) => setPickupAddress(e.target.value)}
                    placeholder="e.g. 30 S 17th St, Philadelphia, PA"
                    required
                    style={{ width: '100%', padding: '7px 10px', fontSize: '12px', border: '1px solid #CBD5E1', borderRadius: '6px', backgroundColor: '#FFFFFF', color: '#0F172A' }}
                  />
                </div>

                {serviceType !== 'HOURLY_AS_DIRECTED' && (
                  <div style={{ marginBottom: '10px' }}>
                    <label style={{ fontSize: '11px', color: '#64748B', display: 'block', fontWeight: 600, marginBottom: '2px' }}>Dropoff Destination</label>
                    <input
                      type="text"
                      value={dropoffAddress}
                      onChange={(e) => setDropoffAddress(e.target.value)}
                      placeholder="e.g. Philadelphia International Airport (PHL) Terminal D"
                      style={{ width: '100%', padding: '7px 10px', fontSize: '12px', border: '1px solid #CBD5E1', borderRadius: '6px', backgroundColor: '#FFFFFF', color: '#0F172A' }}
                    />
                  </div>
                )}

                {/* Airport Specifics */}
                {serviceType === 'AIRPORT_TRANSFER' && (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px', marginTop: '10px', padding: '10px', backgroundColor: '#F8FAFC', borderRadius: '6px', border: '1px solid #E2E8F0' }}>
                    <div>
                      <label style={{ fontSize: '11px', color: '#64748B', display: 'block', fontWeight: 600, marginBottom: '2px' }}>Flight Number</label>
                      <input
                        type="text"
                        value={flightNumber}
                        onChange={(e) => setFlightNumber(e.target.value)}
                        placeholder="e.g. AA 1842"
                        style={{ width: '100%', padding: '6px 8px', fontSize: '12px', border: '1px solid #CBD5E1', borderRadius: '4px', backgroundColor: '#FFFFFF' }}
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: '11px', color: '#64748B', display: 'block', fontWeight: 600, marginBottom: '2px' }}>Airline Name</label>
                      <input
                        type="text"
                        value={airlineName}
                        onChange={(e) => setAirlineName(e.target.value)}
                        placeholder="American Airlines"
                        style={{ width: '100%', padding: '6px 8px', fontSize: '12px', border: '1px solid #CBD5E1', borderRadius: '4px', backgroundColor: '#FFFFFF' }}
                      />
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', marginTop: '16px' }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', fontWeight: 700, color: '#0284C7', cursor: 'pointer' }}>
                        <input
                          type="checkbox"
                          checked={meetAndGreet}
                          onChange={(e) => setMeetAndGreet(e.target.checked)}
                          style={{ accentColor: '#0284C7' }}
                        />
                        ✈️ Meet & Greet (Inside)
                      </label>
                    </div>
                  </div>
                )}

                {/* Hourly Specifics */}
                {serviceType === 'HOURLY_AS_DIRECTED' && (
                  <div style={{ padding: '10px', backgroundColor: '#F8FAFC', borderRadius: '6px', border: '1px solid #E2E8F0', marginTop: '10px' }}>
                    <label style={{ fontSize: '11px', color: '#64748B', display: 'block', fontWeight: 600, marginBottom: '2px' }}>Charter Duration (Hours)</label>
                    <input
                      type="number"
                      min={2}
                      max={24}
                      value={hourlyHours}
                      onChange={(e) => setHourlyHours(parseInt(e.target.value) || 2)}
                      style={{ width: '120px', padding: '6px 8px', fontSize: '12px', border: '1px solid #CBD5E1', borderRadius: '4px', backgroundColor: '#FFFFFF' }}
                    />
                    <span style={{ fontSize: '11px', color: '#64748B', marginLeft: '10px' }}>Minimum 2 hours dedicated standby.</span>
                  </div>
                )}

                {/* Multi-Leg Stops Matrix */}
                {serviceType === 'MULTI_CITY_TOUR' && (
                  <div style={{ padding: '12px', backgroundColor: '#F8FAFC', borderRadius: '6px', border: '1px solid #E2E8F0', marginTop: '10px' }}>
                    <div style={{ fontSize: '11px', fontWeight: 700, color: '#0F172A', marginBottom: '8px' }}>
                      🏙️ Configured Multi-Leg Corridor:
                    </div>
                    {multiLegStops.map((st, idx) => (
                      <div key={idx} style={{ fontSize: '11px', color: '#334155', display: 'flex', justifyContent: 'space-between', padding: '4px 0', borderBottom: '1px dashed #CBD5E1' }}>
                        <span>Leg {st.leg}: {st.pickup} ➔ {st.dropoff}</span>
                        <span style={{ fontWeight: 700 }}>{st.layover_hours > 0 ? `+${st.layover_hours}h Standby` : 'Direct'}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* 4. DISPATCH & CHAUFFEUR ASSIGNMENT */}
              <div style={{
                backgroundColor: '#FFFFFF',
                border: '1px solid #E2E8F0',
                borderRadius: '10px',
                padding: '14px 18px',
                boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
              }}>
                <div style={{ fontSize: '13px', fontWeight: 800, color: '#0F172A', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '10px' }}>
                  <Navigation size={15} color="#0284C7" /> 4. Dispatch Action
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '10px' }}>
                  {[
                    { id: 'AUTO_DISPATCH', label: '⚡ Auto-Dispatch Immediate', sub: 'Best on-duty chauffeur' },
                    { id: 'ASSIGN_SPECIFIC_DRIVER', label: '👤 Specific Chauffeur', sub: 'Manual roster assignment' },
                    { id: 'QUEUE_24H_DISPATCH', label: '🕒 24h JIT Queue', sub: 'Broadcast closer to pickup' },
                    { id: 'FARM_OUT_AFFILIATE', label: '🤝 Farm-Out to Network', sub: 'Sovereign affiliate exchange' }
                  ].map((d) => (
                    <button
                      key={d.id}
                      type="button"
                      onClick={() => setDispatchAction(d.id as any)}
                      style={{
                        padding: '8px 10px',
                        borderRadius: '6px',
                        border: dispatchAction === d.id ? '2px solid #0284C7' : '1px solid #CBD5E1',
                        backgroundColor: dispatchAction === d.id ? '#EFF6FF' : '#FFFFFF',
                        color: dispatchAction === d.id ? '#1E40AF' : '#475569',
                        fontWeight: 700,
                        cursor: 'pointer',
                        textAlign: 'left'
                      }}
                    >
                      <div style={{ fontSize: '11px' }}>{d.label}</div>
                      <div style={{ fontSize: '10px', opacity: 0.8, fontWeight: 500 }}>{d.sub}</div>
                    </button>
                  ))}
                </div>

                {dispatchAction === 'ASSIGN_SPECIFIC_DRIVER' && (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', padding: '10px', backgroundColor: '#F8FAFC', borderRadius: '6px', border: '1px solid #E2E8F0' }}>
                    <div>
                      <label style={{ fontSize: '11px', color: '#64748B', display: 'block', fontWeight: 600, marginBottom: '2px' }}>Select Driver</label>
                      <select
                        value={selectedDriverId}
                        onChange={(e) => setSelectedDriverId(e.target.value)}
                        style={{ width: '100%', padding: '6px 8px', fontSize: '12px', border: '1px solid #CBD5E1', borderRadius: '4px', backgroundColor: '#FFFFFF' }}
                      >
                        <option value="">-- Choose On-Duty Driver --</option>
                        {availableDrivers.map((d) => (
                          <option key={d.id} value={d.id}>
                            {d.first_name} {d.last_name} ({d.is_on_duty ? '🟢 On Duty' : '⚪ Off Duty'})
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label style={{ fontSize: '11px', color: '#64748B', display: 'block', fontWeight: 600, marginBottom: '2px' }}>Select Vehicle</label>
                      <select
                        value={selectedVehicleId}
                        onChange={(e) => setSelectedVehicleId(e.target.value)}
                        style={{ width: '100%', padding: '6px 8px', fontSize: '12px', border: '1px solid #CBD5E1', borderRadius: '4px', backgroundColor: '#FFFFFF' }}
                      >
                        <option value="">-- Choose Fleet Vehicle --</option>
                        {availableVehicles.map((v) => (
                          <option key={v.id} value={v.id}>
                            {v.year} {v.make} {v.model} ({v.license_plate})
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                )}
              </div>

              {/* 5. PAYMENT & NOTIFICATION CHANNELS */}
              <div style={{
                backgroundColor: '#FFFFFF',
                border: '1px solid #E2E8F0',
                borderRadius: '10px',
                padding: '14px 18px',
                boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
              }}>
                <div style={{ fontSize: '13px', fontWeight: 800, color: '#0F172A', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '10px' }}>
                  <CreditCard size={15} color="#0284C7" /> 5. Payment & Customer Notification
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '6px', marginBottom: '12px' }}>
                  {[
                    { id: 'SMS_PAYMENT_LINK', label: '📱 SMS & Email Link', sub: 'Customer 1-Click Pay' },
                    { id: 'DIRECT_CARD_PREAUTH', label: '💳 Direct Phone Card', sub: 'Authorize Card Live' },
                    { id: 'CORPORATE_INVOICE', label: '📑 Net 30 Invoice', sub: 'Corporate PO billing' },
                    { id: 'CASH_ON_BOARD', label: '💵 Cash On-Board', sub: 'Collect upon dropoff' }
                  ].map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => setPaymentMethod(p.id as any)}
                      style={{
                        padding: '8px 4px',
                        borderRadius: '6px',
                        border: paymentMethod === p.id ? '2px solid #059669' : '1px solid #CBD5E1',
                        backgroundColor: paymentMethod === p.id ? '#ECFDF5' : '#FFFFFF',
                        color: paymentMethod === p.id ? '#065F46' : '#475569',
                        fontWeight: 700,
                        cursor: 'pointer',
                        textAlign: 'center'
                      }}
                    >
                      <div style={{ fontSize: '11px' }}>{p.label}</div>
                      <div style={{ fontSize: '9px', opacity: 0.8, fontWeight: 500 }}>{p.sub}</div>
                    </button>
                  ))}
                </div>

                {/* Notifications Toggles */}
                <div style={{ display: 'flex', gap: '16px', padding: '8px 12px', backgroundColor: '#F8FAFC', borderRadius: '6px', border: '1px solid #E2E8F0' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', fontWeight: 700, color: '#0284C7', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={sendSmsNotification}
                      onChange={(e) => setSendSmsNotification(e.target.checked)}
                      style={{ accentColor: '#0284C7' }}
                    />
                    📱 Twilio SMS Payment Link
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', fontWeight: 700, color: '#7C3AED', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={sendEmailNotification}
                      onChange={(e) => setSendEmailNotification(e.target.checked)}
                      style={{ accentColor: '#7C3AED' }}
                    />
                    ✉️ Customer Email with [Pay Now] Button
                  </label>
                </div>
              </div>

            </div>

            {/* RIGHT COLUMN: LIVE RATE CALCULATION & SUBMIT */}
            <div style={{
              width: '380px',
              backgroundColor: '#FFFFFF',
              padding: '24px 20px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between'
            }}>
              
              <div>
                <div style={{ fontSize: '15px', fontWeight: 800, color: '#0F172A', display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <DollarSign size={18} color="#059669" /> Live Rate Calculation
                  </div>
                  {isQuoting && (
                    <RefreshCw size={14} color="#0284C7" className="animate-spin" />
                  )}
                </div>

                {/* BREAKDOWN CARD */}
                <div style={{
                  backgroundColor: '#F8FAFC',
                  border: '1px solid #E2E8F0',
                  borderRadius: '10px',
                  padding: '16px',
                  marginBottom: '16px'
                }}>
                  {quote ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '12px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', color: '#475569' }}>
                        <span>Base Fare ({vehicleClass.replace('_', ' ')}):</span>
                        <strong style={{ color: '#0F172A' }}>${quote.base_fare_usd.toFixed(2)}</strong>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', color: '#475569' }}>
                        <span>Est. Distance ({quote.distance_km} km):</span>
                        <strong style={{ color: '#0F172A' }}>${quote.distance_fare_usd.toFixed(2)}</strong>
                      </div>
                      {quote.airport_fee_usd > 0 && (
                        <div style={{ display: 'flex', justifyContent: 'space-between', color: '#475569' }}>
                          <span>✈️ Airport & Meet/Greet:</span>
                          <strong style={{ color: '#0F172A' }}>${quote.airport_fee_usd.toFixed(2)}</strong>
                        </div>
                      )}
                      {quote.layover_standby_fee_usd > 0 && (
                        <div style={{ display: 'flex', justifyContent: 'space-between', color: '#475569' }}>
                          <span>⏱️ Layover Standby:</span>
                          <strong style={{ color: '#0F172A' }}>${quote.layover_standby_fee_usd.toFixed(2)}</strong>
                        </div>
                      )}
                      <div style={{ display: 'flex', justifyContent: 'space-between', color: '#475569' }}>
                        <span>Tolls & Regulatory Surcharge:</span>
                        <strong style={{ color: '#0F172A' }}>${quote.tolls_and_fees_usd.toFixed(2)}</strong>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', color: '#475569' }}>
                        <span>State & Local Tax (8%):</span>
                        <strong style={{ color: '#0F172A' }}>${quote.tax_amount_usd.toFixed(2)}</strong>
                      </div>

                      {quote.multi_leg_strategy && (
                        <div style={{ marginTop: '8px', padding: '8px', backgroundColor: '#EFF6FF', borderRadius: '6px', border: '1px solid #BFDBFE' }}>
                          <div style={{ fontSize: '11px', fontWeight: 800, color: '#1E40AF' }}>
                            🏙️ Strategy: {quote.multi_leg_strategy}
                          </div>
                          <div style={{ fontSize: '10px', color: '#3B82F6' }}>
                            {quote.strategy_recommendation}
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div style={{ textAlign: 'center', padding: '20px 0', color: '#94A3B8', fontSize: '12px' }}>
                      Calculating authoritative rate...
                    </div>
                  )}
                </div>

                {/* MANUAL DISCOUNTS & SURCHARGES */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '16px' }}>
                  <div>
                    <label style={{ fontSize: '11px', color: '#64748B', display: 'block', fontWeight: 600, marginBottom: '2px' }}>Discount ($)</label>
                    <input
                      type="number"
                      min={0}
                      value={manualDiscount}
                      onChange={(e) => setManualDiscount(parseFloat(e.target.value) || 0)}
                      style={{ width: '100%', padding: '6px 8px', fontSize: '12px', border: '1px solid #CBD5E1', borderRadius: '6px', backgroundColor: '#FFFFFF' }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '11px', color: '#64748B', display: 'block', fontWeight: 600, marginBottom: '2px' }}>Custom Extra ($)</label>
                    <input
                      type="number"
                      min={0}
                      value={customSurcharge}
                      onChange={(e) => setCustomSurcharge(parseFloat(e.target.value) || 0)}
                      style={{ width: '100%', padding: '6px 8px', fontSize: '12px', border: '1px solid #CBD5E1', borderRadius: '6px', backgroundColor: '#FFFFFF' }}
                    />
                  </div>
                </div>

                {/* TOTAL AMOUNT CARD */}
                <div style={{
                  backgroundColor: '#ECFDF5',
                  border: '1px solid #A7F3D0',
                  borderRadius: '12px',
                  padding: '20px',
                  textAlign: 'center',
                  marginBottom: '16px',
                  boxShadow: '0 2px 10px rgba(16, 185, 129, 0.1)'
                }}>
                  <div style={{ fontSize: '11px', fontWeight: 700, color: '#065F46', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    Authoritative Total Quote
                  </div>
                  <div style={{ fontSize: '32px', fontWeight: 900, color: '#059669', margin: '4px 0' }}>
                    ${quote ? quote.total_amount_usd.toFixed(2) : '0.00'} <span style={{ fontSize: '14px', fontWeight: 600 }}>USD</span>
                  </div>
                  <div style={{ fontSize: '10px', color: '#047857' }}>
                    Includes driver gratuity, live flight tracking & tolls
                  </div>
                </div>
              </div>

              {/* ACTION BUTTONS */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <button
                  type="submit"
                  disabled={isSubmitting || !quote}
                  style={{
                    width: '100%',
                    padding: '14px',
                    fontSize: '14px',
                    fontWeight: 800,
                    backgroundColor: isSubmitting ? '#94A3B8' : '#059669',
                    color: '#FFFFFF',
                    border: 'none',
                    borderRadius: '10px',
                    cursor: isSubmitting ? 'not-allowed' : 'pointer',
                    boxShadow: '0 4px 14px rgba(5, 150, 105, 0.35)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px'
                  }}
                >
                  {isSubmitting ? (
                    'Processing Intake...'
                  ) : (
                    <>⚡ Confirm & Dispatch Phone Booking</>
                  )}
                </button>

                <button
                  type="button"
                  onClick={onClose}
                  style={{
                    width: '100%',
                    padding: '10px',
                    fontSize: '12px',
                    fontWeight: 600,
                    backgroundColor: 'transparent',
                    color: '#64748B',
                    border: 'none',
                    cursor: 'pointer'
                  }}
                >
                  Cancel / Close Desk
                </button>
              </div>

            </div>

          </form>
        )}

      </div>
    </div>
  );
};
