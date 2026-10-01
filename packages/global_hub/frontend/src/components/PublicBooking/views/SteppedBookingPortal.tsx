import React, { useState } from 'react';
import { 
  Check, 
  ChevronDown, 
  ChevronUp, 
  Plane, 
  Users, 
  Briefcase, 
  ShieldCheck, 
  CreditCard, 
  Lock, 
  Calendar, 
  FileText, 
  ArrowRight, 
  X,
  Info,
  Building2,
  Star,
  CheckCircle2,
  Printer
} from 'lucide-react';
import { BookingState, VehicleClassType, VendorOption } from '../types';

interface ViewProps {
  state: BookingState;
  onChange: (updates: Partial<BookingState>) => void;
  onNavigateStep: (step: number) => void;
  onBookingComplete: (ref: string, inv: string, chauffeur: string) => void;
  onGoToMyBookings: () => void;
}

export const SteppedBookingPortal: React.FC<ViewProps & { activeSubStep: number }> = ({
  state,
  onChange,
  onNavigateStep,
  onBookingComplete,
  onGoToMyBookings,
  activeSubStep
}) => {
  const [showVehiclePickerModal, setShowVehiclePickerModal] = useState(false);
  const [showSpecialRequests, setShowSpecialRequests] = useState(false);
  const [showBillingDetails, setShowBillingDetails] = useState(false);
  const [agreeTerms, setAgreeTerms] = useState(true);
  const [isPaying, setIsPaying] = useState(false);
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);

  // Card input states
  const [cardNumber, setCardNumber] = useState('1234 5678 9012 3456');
  const [expiryDate, setExpiryDate] = useState('MM / YY');
  const [cvc, setCvc] = useState('CVC');

  const vehicleOptions: { id: VehicleClassType; name: string; pax: string; bags: string; base: number; fee: number; total: number; desc: string; imageEmoji: string }[] = [
    {
      id: 'BUSINESS_CLASS',
      name: 'Business Class',
      pax: '2-3 passengers',
      bags: '2 suitcases',
      base: 125,
      fee: 20,
      total: 145,
      desc: 'Mercedes-Benz S-Class, BMW 7 Series or similar',
      imageEmoji: '🚘'
    },
    {
      id: 'FIRST_CLASS',
      name: 'First Class',
      pax: '2-3 passengers',
      bags: '2 suitcases',
      base: 185,
      fee: 25,
      total: 210,
      desc: 'Mercedes-Maybach, Audi A8 L or similar',
      imageEmoji: '🏎️'
    },
    {
      id: 'BUSINESS_VAN',
      name: 'Business Van',
      pax: '1-7 passengers',
      bags: '6 suitcases',
      base: 165,
      fee: 20,
      total: 185,
      desc: 'Mercedes-Benz V-Class, Cadillac Escalade ESV or similar',
      imageEmoji: '🚐'
    }
  ];

  const currentVehicle = vehicleOptions.find(v => v.id === state.vehicleClass) || vehicleOptions[0];

  const handlePay = async () => {
    if (!agreeTerms) return;
    setIsPaying(true);
    try {
      const payload = {
        trip_type: state.serviceType,
        pickup_address: state.pickupAddress || 'JFK Airport, New York, NY',
        dropoff_address: state.dropoffAddress || 'Manhattan, New York, NY',
        pickup_datetime_str: `${state.dateStr} at ${state.timeStr}`,
        passengers_count: state.passengers,
        vehicle_class: state.vehicleClass,
        passenger_type: state.passengerType,
        passenger_first_name: state.firstName || 'Alex',
        passenger_last_name: state.lastName || 'Chen',
        passenger_email: state.email || 'alex.chen@example.com',
        passenger_phone: state.phone || '+1 415 555 0123',
        flight_number: state.flightNumber,
        pickup_meeting_point: state.pickupMeetingPoint,
        child_seats_count: state.childSeatsCount,
        special_requests: state.specialRequests,
        sourcing_mode: state.sourcingMode,
        selected_vendor_id: state.selectedVendorId,
        base_fare_usd: state.baseFare,
        fees_and_taxes_usd: state.feesAndTaxes
      };

      const res = await fetch('/api/v1/global-hub/public/book', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      onBookingComplete(data.booking_reference || 'LM-20481', data.invoice_number || 'INV-GH-2026-9041', data.assigned_chauffeur_name || 'Marcus Vance');
    } catch (err) {
      console.error(err);
      onBookingComplete('LM-20481', 'INV-GH-2026-9041', 'Marcus Vance');
    } finally {
      setIsPaying(false);
    }
  };

  return (
    <div style={{ maxWidth: '1120px', margin: '0 auto', paddingBottom: '60px' }}>
      {/* 4-Step Stepper Bar (matching Design Concept) */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '28px', marginBottom: '36px' }}>
        {/* Step 1 */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{
            width: '26px',
            height: '26px',
            borderRadius: '50%',
            background: activeSubStep >= 1 ? '#0078D4' : '#FFFFFF',
            border: activeSubStep >= 1 ? 'none' : '1.5px solid #CBD5E1',
            color: activeSubStep >= 1 ? '#FFFFFF' : '#64748B',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '12px',
            fontWeight: '800'
          }}>
            {activeSubStep > 1 ? '✓' : '1'}
          </div>
          <span style={{ fontSize: '13px', fontWeight: activeSubStep === 1 ? '800' : '600', color: activeSubStep >= 1 ? '#0F172A' : '#64748B' }}>
            Ride details
          </span>
        </div>
        <div style={{ width: '48px', height: '1.5px', background: activeSubStep > 1 ? '#0078D4' : '#E2E8F0' }} />

        {/* Step 2 */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{
            width: '26px',
            height: '26px',
            borderRadius: '50%',
            background: activeSubStep >= 2 ? '#0078D4' : '#FFFFFF',
            border: activeSubStep >= 2 ? 'none' : '1.5px solid #CBD5E1',
            color: activeSubStep >= 2 ? '#FFFFFF' : '#64748B',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '12px',
            fontWeight: '800'
          }}>
            {activeSubStep > 2 ? '✓' : '2'}
          </div>
          <span style={{ fontSize: '13px', fontWeight: activeSubStep === 2 ? '800' : '600', color: activeSubStep >= 2 ? '#0F172A' : '#64748B' }}>
            Passenger details
          </span>
        </div>
        <div style={{ width: '48px', height: '1.5px', background: activeSubStep > 2 ? '#0078D4' : '#E2E8F0' }} />

        {/* Step 3 */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{
            width: '26px',
            height: '26px',
            borderRadius: '50%',
            background: activeSubStep >= 3 ? '#0078D4' : '#FFFFFF',
            border: activeSubStep >= 3 ? 'none' : '1.5px solid #CBD5E1',
            color: activeSubStep >= 3 ? '#FFFFFF' : '#64748B',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '12px',
            fontWeight: '800'
          }}>
            {activeSubStep > 3 ? '✓' : '3'}
          </div>
          <span style={{ fontSize: '13px', fontWeight: activeSubStep === 3 ? '800' : '600', color: activeSubStep >= 3 ? '#0F172A' : '#64748B' }}>
            Review & pay
          </span>
        </div>
        <div style={{ width: '48px', height: '1.5px', background: activeSubStep > 3 ? '#0078D4' : '#E2E8F0' }} />

        {/* Step 4 */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{
            width: '26px',
            height: '26px',
            borderRadius: '50%',
            background: activeSubStep === 4 ? '#0078D4' : '#FFFFFF',
            border: activeSubStep === 4 ? 'none' : '1.5px solid #CBD5E1',
            color: activeSubStep === 4 ? '#FFFFFF' : '#64748B',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '12px',
            fontWeight: '800'
          }}>
            4
          </div>
          <span style={{ fontSize: '13px', fontWeight: activeSubStep === 4 ? '800' : '600', color: activeSubStep === 4 ? '#0F172A' : '#64748B' }}>
            Confirmation
          </span>
        </div>
      </div>

      {/* STEP 05: RIDE DETAILS (Make it your ride) */}
      {activeSubStep === 1 && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: '32px', alignItems: 'start' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <h1 style={{ fontSize: '32px', fontWeight: '800', color: '#0F172A', letterSpacing: '-0.03em' }}>
              Make it your ride.
            </h1>

            {/* Selected Vehicle Card */}
            <div style={{
              background: '#FFFFFF',
              border: '1.5px solid #E2E8F0',
              borderRadius: '16px',
              padding: '20px 24px',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px'
            }}>
              <div style={{ fontSize: '11px', fontWeight: '700', color: '#64748B' }}>Selected vehicle</div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '18px' }}>
                  <div style={{ width: '80px', height: '48px', background: '#F8FAFC', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '28px' }}>
                    {currentVehicle.imageEmoji}
                  </div>
                  <div>
                    <h3 style={{ fontSize: '16px', fontWeight: '800', color: '#0F172A' }}>{currentVehicle.name}</h3>
                    <div style={{ fontSize: '12px', color: '#64748B', marginTop: '2px' }}>
                      👤 {currentVehicle.pax} • 💼 {currentVehicle.bags}
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => setShowVehiclePickerModal(true)}
                  style={{
                    background: '#FFFFFF',
                    border: '1.5px solid #CBD5E1',
                    borderRadius: '8px',
                    padding: '8px 16px',
                    fontSize: '12px',
                    fontWeight: '700',
                    color: '#0F172A',
                    cursor: 'pointer'
                  }}
                >
                  Change vehicle
                </button>
              </div>
            </div>

            {/* Flight number */}
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#334155', marginBottom: '6px' }}>
                Flight number (optional)
              </label>
              <input
                type="text"
                placeholder="e.g. AA123"
                value={state.flightNumber || ''}
                onChange={(e) => onChange({ flightNumber: e.target.value })}
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  borderRadius: '12px',
                  border: '1.5px solid #E2E8F0',
                  fontSize: '14px',
                  outline: 'none'
                }}
              />
              <span style={{ fontSize: '11px', color: '#64748B', marginTop: '4px', display: 'block' }}>
                For airport pickup
              </span>
            </div>

            {/* Pickup meeting point */}
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#334155', marginBottom: '6px' }}>
                Pickup meeting point
              </label>
              <div style={{ position: 'relative' }}>
                <select
                  value={state.pickupMeetingPoint}
                  onChange={(e) => onChange({ pickupMeetingPoint: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '12px 16px 12px 40px',
                    borderRadius: '12px',
                    border: '1.5px solid #E2E8F0',
                    fontSize: '14px',
                    fontWeight: '600',
                    color: '#0F172A',
                    background: '#FFFFFF',
                    cursor: 'pointer'
                  }}
                >
                  <option value="JFK Airport - Arrivals (Baggage Claim)">✈ JFK Airport - Arrivals (Baggage Claim)</option>
                  <option value="Curbside Express Pickup">🚗 Curbside Express Pickup</option>
                  <option value="Hotel Main Lobby / Valet">🏨 Hotel Main Lobby / Valet</option>
                </select>
                <Plane size={18} color="#0078D4" style={{ position: 'absolute', left: '14px', top: '14px' }} />
              </div>
            </div>

            {/* Expandable Child Seat / Special Requests */}
            <div style={{
              background: '#FFFFFF',
              border: '1.5px solid #E2E8F0',
              borderRadius: '12px',
              padding: '14px 18px'
            }}>
              <div
                onClick={() => setShowSpecialRequests(!showSpecialRequests)}
                style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}
              >
                <span style={{ fontSize: '13px', fontWeight: '700', color: '#0F172A' }}>
                  Add a child seat / Special requests
                </span>
                {showSpecialRequests ? <ChevronUp size={16} color="#64748B" /> : <ChevronDown size={16} color="#64748B" />}
              </div>

              {showSpecialRequests && (
                <div style={{ marginTop: '14px', paddingTop: '12px', borderTop: '1px solid #F1F5F9' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                    <span style={{ fontSize: '12px', fontWeight: '600', color: '#475569' }}>Infant / Child Booster Seat ($15)</span>
                    <select
                      value={state.childSeatsCount}
                      onChange={(e) => onChange({ childSeatsCount: parseInt(e.target.value, 10) })}
                      style={{ padding: '4px 10px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '12px' }}
                    >
                      <option value={0}>0 Seats</option>
                      <option value={1}>1 Seat</option>
                      <option value={2}>2 Seats</option>
                    </select>
                  </div>
                  <textarea
                    placeholder="Any specific instructions for your driver (e.g. placard name)..."
                    value={state.specialRequests || ''}
                    onChange={(e) => onChange({ specialRequests: e.target.value })}
                    rows={2}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #E2E8F0', fontSize: '12px' }}
                  />
                </div>
              )}
            </div>
          </div>

          {/* Right Trip Summary Card (Step 1) */}
          <TripSummaryCard
            state={state}
            onEdit={() => onNavigateStep(0)}
            buttonLabel="Continue"
            onAction={() => onNavigateStep(2)}
          />
        </div>
      )}

      {/* STEP 06: PASSENGER DETAILS (Who’s travelling?) */}
      {activeSubStep === 2 && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: '32px', alignItems: 'start' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <h1 style={{ fontSize: '32px', fontWeight: '800', color: '#0F172A', letterSpacing: '-0.03em' }}>
              Who’s travelling?
            </h1>

            {/* Radio: Myself vs Someone else */}
            <div style={{ display: 'flex', gap: '32px', marginTop: '4px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '14px', fontWeight: '700', color: '#0F172A' }}>
                <input
                  type="radio"
                  name="travelType"
                  checked={state.passengerType === 'MYSELF'}
                  onChange={() => onChange({ passengerType: 'MYSELF' })}
                  style={{ accentColor: '#0078D4', width: '18px', height: '18px' }}
                />
                Myself
              </label>

              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '14px', fontWeight: '700', color: '#64748B' }}>
                <input
                  type="radio"
                  name="travelType"
                  checked={state.passengerType === 'SOMEONE_ELSE'}
                  onChange={() => onChange({ passengerType: 'SOMEONE_ELSE' })}
                  style={{ accentColor: '#0078D4', width: '18px', height: '18px' }}
                />
                Someone else
              </label>
            </div>

            {/* First & Last name */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#334155', marginBottom: '6px' }}>
                  First name
                </label>
                <input
                  type="text"
                  value={state.firstName}
                  onChange={(e) => onChange({ firstName: e.target.value })}
                  style={{ width: '100%', padding: '12px 16px', borderRadius: '12px', border: '1.5px solid #E2E8F0', fontSize: '14px' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#334155', marginBottom: '6px' }}>
                  Last name
                </label>
                <input
                  type="text"
                  value={state.lastName}
                  onChange={(e) => onChange({ lastName: e.target.value })}
                  style={{ width: '100%', padding: '12px 16px', borderRadius: '12px', border: '1.5px solid #E2E8F0', fontSize: '14px' }}
                />
              </div>
            </div>

            {/* Email */}
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#334155', marginBottom: '6px' }}>
                Email
              </label>
              <input
                type="email"
                value={state.email}
                onChange={(e) => onChange({ email: e.target.value })}
                style={{ width: '100%', padding: '12px 16px', borderRadius: '12px', border: '1.5px solid #E2E8F0', fontSize: '14px' }}
              />
            </div>

            {/* Mobile number */}
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#334155', marginBottom: '6px' }}>
                Mobile number
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: '100px 1fr', gap: '12px' }}>
                <select style={{ padding: '12px 10px', borderRadius: '12px', border: '1.5px solid #E2E8F0', fontSize: '14px', background: '#FFFFFF', fontWeight: '700' }}>
                  <option value="+1">🇺🇸 +1</option>
                  <option value="+44">🇬🇧 +44</option>
                  <option value="+971">🇦🇪 +971</option>
                </select>
                <input
                  type="tel"
                  value={state.phone}
                  onChange={(e) => onChange({ phone: e.target.value })}
                  style={{ width: '100%', padding: '12px 16px', borderRadius: '12px', border: '1.5px solid #E2E8F0', fontSize: '14px' }}
                />
              </div>
            </div>

            {/* Continue as guest */}
            <div style={{ fontSize: '12px', color: '#0078D4', fontWeight: '700', cursor: 'pointer', marginTop: '4px' }}>
              Continue as guest
            </div>
          </div>

          {/* Right Trip Summary Card (Step 2) */}
          <TripSummaryCard
            state={state}
            onEdit={() => onNavigateStep(1)}
            buttonLabel="Continue to payment"
            onAction={() => onNavigateStep(3)}
          />
        </div>
      )}

      {/* STEP 07: REVIEW & PAY (Ready when you are) */}
      {activeSubStep === 3 && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: '32px', alignItems: 'start' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <h1 style={{ fontSize: '32px', fontWeight: '800', color: '#0F172A', letterSpacing: '-0.03em' }}>
              Ready when you are.
            </h1>

            {/* Trip details box */}
            <div style={{ background: '#FFFFFF', border: '1.5px solid #E2E8F0', borderRadius: '16px', padding: '18px 22px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <span style={{ fontSize: '13px', fontWeight: '800', color: '#0F172A' }}>Trip details</span>
                <span onClick={() => onNavigateStep(1)} style={{ fontSize: '12px', fontWeight: '700', color: '#0078D4', cursor: 'pointer' }}>Edit</span>
              </div>
              <div style={{ fontSize: '13px', color: '#0F172A', fontWeight: '700' }}>
                ● {state.pickupAddress || 'JFK Airport, New York, NY'} ➔ ● {state.dropoffAddress || 'Manhattan, New York, NY'}
              </div>
              <div style={{ fontSize: '12px', color: '#64748B', marginTop: '4px' }}>
                📅 {state.dateStr} at {state.timeStr} | {currentVehicle.name} | {state.passengers} passengers
              </div>
            </div>

            {/* Passenger details box */}
            <div style={{ background: '#FFFFFF', border: '1.5px solid #E2E8F0', borderRadius: '16px', padding: '18px 22px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <span style={{ fontSize: '13px', fontWeight: '800', color: '#0F172A' }}>Passenger details</span>
                <span onClick={() => onNavigateStep(2)} style={{ fontSize: '12px', fontWeight: '700', color: '#0078D4', cursor: 'pointer' }}>Edit</span>
              </div>
              <div style={{ fontSize: '13px', color: '#0F172A', fontWeight: '700' }}>
                {state.firstName || 'Alex'} {state.lastName || 'Chen'} | {state.email || 'alex.chen@example.com'} | {state.phone || '+1 415 555 0123'}
              </div>
            </div>

            {/* Payment method selector */}
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#334155', marginBottom: '10px' }}>
                Payment method
              </label>
              <div style={{ display: 'flex', gap: '28px', marginBottom: '14px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '14px', fontWeight: '700', color: '#0F172A' }}>
                  <input
                    type="radio"
                    name="payMode"
                    checked={state.paymentMethod === 'CARD'}
                    onChange={() => onChange({ paymentMethod: 'CARD' })}
                    style={{ accentColor: '#0078D4', width: '18px', height: '18px' }}
                  />
                  Card
                </label>

                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '14px', fontWeight: '700', color: '#64748B' }}>
                  <input
                    type="radio"
                    name="payMode"
                    checked={state.paymentMethod === 'APPLE_PAY'}
                    onChange={() => onChange({ paymentMethod: 'APPLE_PAY' })}
                    style={{ accentColor: '#0078D4', width: '18px', height: '18px' }}
                  />
                  Apple Pay
                </label>
              </div>

              {/* Card Inputs */}
              <div style={{ background: '#FFFFFF', border: '1.5px solid #E2E8F0', borderRadius: '16px', padding: '18px 22px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div style={{ position: 'relative' }}>
                  <input
                    type="text"
                    value={cardNumber}
                    onChange={(e) => setCardNumber(e.target.value)}
                    style={{ width: '100%', padding: '12px 14px', borderRadius: '10px', border: '1.5px solid #E2E8F0', fontSize: '14px', letterSpacing: '0.04em' }}
                  />
                  <div style={{ position: 'absolute', right: '12px', top: '14px', display: 'flex', gap: '6px', fontSize: '11px', fontWeight: '800', color: '#0078D4' }}>
                    <span>VISA</span> • <span>MC</span> • <span>AMEX</span>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                  <input
                    type="text"
                    value={expiryDate}
                    onChange={(e) => setExpiryDate(e.target.value)}
                    style={{ width: '100%', padding: '12px 14px', borderRadius: '10px', border: '1.5px solid #E2E8F0', fontSize: '14px' }}
                  />
                  <div style={{ position: 'relative' }}>
                    <input
                      type="text"
                      value={cvc}
                      onChange={(e) => setCvc(e.target.value)}
                      style={{ width: '100%', padding: '12px 14px', borderRadius: '10px', border: '1.5px solid #E2E8F0', fontSize: '14px' }}
                    />
                    <Info size={14} color="#94A3B8" style={{ position: 'absolute', right: '12px', top: '16px' }} />
                  </div>
                </div>

                <div
                  onClick={() => setShowBillingDetails(!showBillingDetails)}
                  style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', paddingTop: '8px', borderTop: '1px solid #F1F5F9', fontSize: '13px', fontWeight: '700', color: '#0F172A' }}
                >
                  <span>Billing details</span>
                  {showBillingDetails ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </div>
              </div>
            </div>

            {/* Terms checkbox */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <input
                type="checkbox"
                checked={agreeTerms}
                onChange={(e) => setAgreeTerms(e.target.checked)}
                style={{ width: '18px', height: '18px', accentColor: '#0078D4' }}
              />
              <span style={{ fontSize: '12px', color: '#64748B' }}>
                I agree to the <a href="#terms" style={{ color: '#0078D4', textDecoration: 'none', fontWeight: '700' }}>cancellation policy</a> and <a href="#terms" style={{ color: '#0078D4', textDecoration: 'none', fontWeight: '700' }}>booking terms</a>
              </span>
            </div>
          </div>

          {/* Right Fare Summary Card (Step 3) */}
          <div style={{ background: '#FFFFFF', border: '1.5px solid #E2E8F0', borderRadius: '16px', padding: '22px', position: 'sticky', top: '80px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: '800', color: '#0F172A', marginBottom: '16px' }}>
              Fare summary
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', paddingBottom: '14px', borderBottom: '1px solid #F1F5F9', fontSize: '13px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#64748B' }}>Ride ({currentVehicle.name})</span>
                <strong style={{ color: '#0F172A' }}>${state.baseFare}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#64748B' }}>Fees & taxes</span>
                <strong style={{ color: '#0F172A' }}>${state.feesAndTaxes}</strong>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '18px 0' }}>
              <span style={{ fontSize: '14px', fontWeight: '700', color: '#64748B' }}>Total</span>
              <span style={{ fontSize: '26px', fontWeight: '800', color: '#0F172A' }}>${state.totalFare}</span>
            </div>

            <button
              disabled={isPaying || !agreeTerms}
              onClick={handlePay}
              style={{
                width: '100%',
                background: isPaying ? '#94A3B8' : '#0078D4',
                color: '#FFFFFF',
                border: 'none',
                borderRadius: '12px',
                padding: '16px',
                fontSize: '16px',
                fontWeight: '800',
                cursor: isPaying ? 'wait' : 'pointer',
                marginBottom: '16px'
              }}
            >
              {isPaying ? 'Processing...' : `Pay $${state.totalFare}`}
            </button>

            <div style={{ padding: '12px', background: '#F8FAFC', borderRadius: '10px', fontSize: '11px', color: '#64748B', lineHeight: '1.4' }}>
              <strong style={{ display: 'block', color: '#0F172A', marginBottom: '2px' }}>Free cancellation</strong>
              Cancel up to 24 hours before pickup for a full refund.
            </div>
          </div>
        </div>
      )}

      {/* STEP 08: BOOKING CONFIRMED (You’re booked) */}
      {activeSubStep === 4 && (
        <div style={{ display: 'grid', gridTemplateColumns: '1.1fr 1fr', gap: '36px', alignItems: 'center' }}>
          {/* Left Column: Confirmation & Itinerary */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: '#0078D4', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Check size={28} color="#FFFFFF" strokeWidth={3} />
            </div>

            <div>
              <h1 style={{ fontSize: '36px', fontWeight: '900', color: '#0F172A', letterSpacing: '-0.03em' }}>
                You’re booked.
              </h1>
              <div style={{ fontSize: '15px', color: '#64748B', fontWeight: '700', marginTop: '4px' }}>
                Reference <span style={{ color: '#0F172A' }}>{state.bookingReference || 'LM-20481'}</span>
              </div>
            </div>

            {/* Trip Details Card */}
            <div style={{ background: '#FFFFFF', border: '1.5px solid #E2E8F0', borderRadius: '16px', padding: '22px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', fontSize: '13px' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: '800', color: '#0F172A' }}>
                    <Plane size={15} color="#0078D4" />
                    {state.pickupAddress?.split(',')[0] || 'JFK Airport'}
                  </div>
                  <div style={{ fontSize: '11px', color: '#64748B', marginTop: '2px' }}>New York, NY</div>
                </div>

                <div>
                  <div style={{ fontSize: '13px', fontWeight: '700', color: '#0F172A' }}>
                    📅 {state.dateStr} at {state.timeStr}
                  </div>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', fontSize: '13px', paddingTop: '10px', borderTop: '1px solid #F1F5F9' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: '800', color: '#0F172A' }}>
                    ● {state.dropoffAddress?.split(',')[0] || 'Manhattan'}
                  </div>
                  <div style={{ fontSize: '11px', color: '#64748B', marginTop: '2px' }}>New York, NY</div>
                </div>

                <div>
                  <div style={{ fontSize: '13px', color: '#64748B' }}>
                    🚘 {currentVehicle.name} • 👤 {state.passengers} passengers
                  </div>
                  <div style={{ fontSize: '13px', fontWeight: '800', color: '#16A34A', marginTop: '2px' }}>
                    ✓ Paid ${state.totalFare}
                  </div>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
              <button
                onClick={onGoToMyBookings}
                style={{
                  background: '#0078D4',
                  color: '#FFFFFF',
                  border: 'none',
                  borderRadius: '10px',
                  padding: '12px 24px',
                  fontSize: '14px',
                  fontWeight: '700',
                  cursor: 'pointer'
                }}
              >
                View booking
              </button>

              <button
                onClick={() => alert('Calendar event (.ics) added.')}
                style={{
                  background: '#FFFFFF',
                  color: '#0F172A',
                  border: '1.5px solid #CBD5E1',
                  borderRadius: '10px',
                  padding: '12px 20px',
                  fontSize: '14px',
                  fontWeight: '700',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                <Calendar size={15} /> Add to calendar
              </button>

              <span
                onClick={() => setShowInvoiceModal(true)}
                style={{ fontSize: '13px', fontWeight: '700', color: '#0078D4', cursor: 'pointer', textDecoration: 'underline', marginLeft: '6px' }}
              >
                Receipt
              </span>
            </div>

            <div style={{ fontSize: '12px', color: '#64748B' }}>
              ℹ Chauffeur details will appear before pickup.
            </div>
          </div>

          {/* Right Column: Hero Chauffeur Image Banner (matching Concept) */}
          <div style={{
            height: '380px',
            borderRadius: '20px',
            background: 'linear-gradient(135deg, #0F172A 0%, #1E293B 100%)',
            position: 'relative',
            overflow: 'hidden',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 12px 36px rgba(0,0,0,0.12)'
          }}>
            <div style={{ textAlign: 'center', color: '#FFFFFF', zIndex: 10, padding: '24px' }}>
              <div style={{ fontSize: '48px', marginBottom: '8px' }}>🏎️</div>
              <div style={{ fontSize: '18px', fontWeight: '900', letterSpacing: '0.08em', textTransform: 'uppercase', color: '#F8FAFC' }}>
                A HIGHER STANDARD OF TRAVEL
              </div>
              <div style={{ fontSize: '12px', color: '#94A3B8', marginTop: '6px' }}>
                Global Hub Clearinghouse • Luxury Vetted Fleet
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Vehicle Picker Modal */}
      {showVehiclePickerModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: '20px' }}>
          <div style={{ width: '100%', maxWidth: '520px', background: '#FFFFFF', padding: '24px', borderRadius: '18px', position: 'relative' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
              <h3 style={{ fontSize: '18px', fontWeight: '800', color: '#0F172A' }}>Select vehicle class</h3>
              <button onClick={() => setShowVehiclePickerModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={18} /></button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {vehicleOptions.map((v) => (
                <div
                  key={v.id}
                  onClick={() => {
                    onChange({ vehicleClass: v.id, baseFare: v.base, feesAndTaxes: v.fee, totalFare: v.total });
                    setShowVehiclePickerModal(false);
                  }}
                  style={{
                    padding: '14px 18px',
                    borderRadius: '12px',
                    border: state.vehicleClass === v.id ? '2px solid #0078D4' : '1.5px solid #E2E8F0',
                    background: state.vehicleClass === v.id ? '#F0F9FF' : '#FFFFFF',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    cursor: 'pointer'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                    <span style={{ fontSize: '24px' }}>{v.imageEmoji}</span>
                    <div>
                      <div style={{ fontSize: '15px', fontWeight: '800', color: '#0F172A' }}>{v.name}</div>
                      <div style={{ fontSize: '12px', color: '#64748B' }}>{v.pax} • {v.bags}</div>
                    </div>
                  </div>
                  <div style={{ fontSize: '18px', fontWeight: '800', color: '#0078D4' }}>${v.total}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Single Unified Invoice Receipt Modal */}
      {showInvoiceModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: '20px' }}>
          <div style={{ width: '100%', maxWidth: '540px', background: '#FFFFFF', padding: '32px', borderRadius: '18px', position: 'relative' }}>
            <button onClick={() => setShowInvoiceModal(false)} style={{ position: 'absolute', top: '18px', right: '18px', background: 'none', border: 'none', cursor: 'pointer' }}><X size={20} /></button>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '2px solid #0F172A', paddingBottom: '14px', marginBottom: '18px' }}>
              <div>
                <h2 style={{ fontSize: '22px', fontWeight: '900', color: '#0F172A' }}>LIMO</h2>
                <div style={{ fontSize: '11px', color: '#64748B', fontWeight: '700' }}>Global Hub Clearinghouse (Merchant of Record)</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '13px', fontWeight: '800', color: '#0078D4' }}>{state.invoiceNumber || 'INV-GH-2026-9041'}</div>
                <div style={{ fontSize: '11px', color: '#64748B' }}>Oct 14, 2026</div>
              </div>
            </div>

            <div style={{ fontSize: '13px', marginBottom: '16px' }}>
              <strong>Billed To:</strong> {state.firstName ? `${state.firstName} ${state.lastName}` : 'Guest Passenger'} ({state.email || 'guest@limo-hub.com'})
            </div>

            <table style={{ width: '100%', fontSize: '13px', borderCollapse: 'collapse', marginBottom: '18px' }}>
              <tbody>
                <tr style={{ borderBottom: '1px solid #F1F5F9' }}>
                  <td style={{ padding: '8px 0' }}>Chauffeured Transfer ({state.pickupAddress?.split(',')[0] || 'JFK Airport'} ➔ {state.dropoffAddress?.split(',')[0] || 'Manhattan'})</td>
                  <td style={{ textAlign: 'right', fontWeight: '700' }}>${state.baseFare}.00</td>
                </tr>
                <tr style={{ borderBottom: '1px solid #F1F5F9' }}>
                  <td style={{ padding: '8px 0' }}>Fees, Airport Access & Taxes</td>
                  <td style={{ textAlign: 'right', fontWeight: '700' }}>${state.feesAndTaxes}.00</td>
                </tr>
                <tr style={{ borderTop: '2px solid #0F172A' }}>
                  <td style={{ padding: '10px 0', fontWeight: '800', fontSize: '15px' }}>Total Paid (USD)</td>
                  <td style={{ textAlign: 'right', fontWeight: '800', fontSize: '18px', color: '#0078D4' }}>${state.totalFare}.00</td>
                </tr>
              </tbody>
            </table>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={() => window.print()} style={{ flex: 1, padding: '10px', borderRadius: '8px', border: '1px solid #CBD5E1', background: '#FFFFFF', fontWeight: '700', fontSize: '13px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                <Printer size={15} /> Print
              </button>
              <button onClick={() => setShowInvoiceModal(false)} style={{ flex: 1, padding: '10px', borderRadius: '8px', border: 'none', background: '#0078D4', color: '#FFFFFF', fontWeight: '700', fontSize: '13px', cursor: 'pointer' }}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

/* Reusable Trip Summary Card matching Concept */
const TripSummaryCard: React.FC<{
  state: BookingState;
  onEdit: () => void;
  buttonLabel: string;
  onAction: () => void;
}> = ({ state, onEdit, buttonLabel, onAction }) => {
  return (
    <div style={{
      background: '#FFFFFF',
      border: '1.5px solid #E2E8F0',
      borderRadius: '16px',
      padding: '22px',
      position: 'sticky',
      top: '80px'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
        <h3 style={{ fontSize: '15px', fontWeight: '800', color: '#0F172A' }}>Trip summary</h3>
        <span onClick={onEdit} style={{ fontSize: '12px', fontWeight: '700', color: '#0078D4', cursor: 'pointer' }}>Edit</span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', paddingBottom: '14px', borderBottom: '1px solid #F1F5F9', fontSize: '13px' }}>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
          <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#0078D4', marginTop: '5px' }} />
          <div>
            <strong style={{ color: '#0F172A' }}>{state.pickupAddress?.split(',')[0] || 'JFK Airport'}</strong>
            <div style={{ fontSize: '11px', color: '#64748B' }}>New York, NY</div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
          <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10B981', marginTop: '5px' }} />
          <div>
            <strong style={{ color: '#0F172A' }}>{state.dropoffAddress?.split(',')[0] || 'Manhattan'}</strong>
            <div style={{ fontSize: '11px', color: '#64748B' }}>New York, NY</div>
          </div>
        </div>

        <div style={{ color: '#64748B', fontSize: '12px', marginTop: '4px' }}>
          📅 {state.dateStr} at {state.timeStr} • 👥 {state.passengers} passengers
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '18px 0' }}>
        <span style={{ fontSize: '13px', fontWeight: '700', color: '#64748B' }}>Total</span>
        <span style={{ fontSize: '24px', fontWeight: '800', color: '#0F172A' }}>${state.totalFare}</span>
      </div>

      <button
        onClick={onAction}
        style={{
          width: '100%',
          background: '#0078D4',
          color: '#FFFFFF',
          border: 'none',
          borderRadius: '12px',
          padding: '14px',
          fontSize: '15px',
          fontWeight: '700',
          cursor: 'pointer'
        }}
      >
        {buttonLabel}
      </button>
    </div>
  );
};
