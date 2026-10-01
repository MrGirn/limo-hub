import React, { useState } from 'react';
import { Info, Calendar as CalendarIcon, CreditCard } from 'lucide-react';
import { BookingState } from '../types';
import { SharedBookingHeader } from './SharedBookingHeader';
import { SharedBookingFooter } from './SharedBookingFooter';
import { SharedStepper } from './SharedStepper';

interface Props {
  state: BookingState;
  onChange: (updates: Partial<BookingState>) => void;
  onPaySuccess: () => void;
  onEditTrip?: () => void;
  onEditPassenger?: () => void;
  onOpenMyBookings?: () => void;
  onOpenSignIn?: () => void;
}

export const ReviewAndCheckoutPage: React.FC<Props> = ({
  state,
  onChange,
  onPaySuccess,
  onEditTrip,
  onEditPassenger,
  onOpenMyBookings,
  onOpenSignIn
}) => {
  const [agreeTerms, setAgreeTerms] = useState(true);
  const [isPaying, setIsPaying] = useState(false);
  const [showBilling, setShowBilling] = useState(false);
  const [cardNumber, setCardNumber] = useState('1234 5678 9012 3456');
  const [expiry, setExpiry] = useState('MM / YY');
  const [cvc, setCvc] = useState('CVC');

  const handlePay = async () => {
    if (!agreeTerms) return;
    setIsPaying(true);
    try {
      const payload = {
        trip_type: state.serviceType,
        pickup_address: state.pickupAddress,
        dropoff_address: state.serviceType === 'HOURLY' ? 'As Directed / Hourly' : (state.dropoffAddress || 'As Directed'),
        pickup_datetime_str: `${state.dateStr} at ${state.timeStr}`,
        passengers_count: state.passengers,
        vehicle_class: state.vehicleClass,
        passenger_type: state.passengerType,
        passenger_first_name: state.firstName,
        passenger_last_name: state.lastName,
        passenger_email: state.email,
        passenger_phone: state.phone,
        flight_number: state.flightNumber,
        pickup_meeting_point: state.pickupMeetingPoint,
        child_seats_count: state.childSeatsCount,
        special_requests: state.specialRequests,
        sourcing_mode: state.sourcingMode,
        selected_vendor_id: state.assignedVendorId,
        base_fare_usd: state.baseFare,
        fees_and_taxes_usd: state.feesAndTaxes
      };

      const res = await fetch('/api/v1/global-hub/public/book', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        const data = await res.json();
        onChange({
          bookingReference: data.booking_reference,
          invoiceNumber: data.invoice_number,
          assignedChauffeur: data.assigned_chauffeur_name,
          assignedVendorName: data.assigned_vendor_name,
          totalFare: data.total_amount_usd || state.totalFare
        });
        onPaySuccess();
      } else {
        const err = await res.json();
        alert(`Booking submission error: ${err.detail || 'Could not complete booking'}`);
      }
    } catch (e: any) {
      console.error('Booking submission error:', e);
      alert('Network communication notice: Unable to contact Global Hub clearinghouse server.');
    } finally {
      setIsPaying(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: '#FFFFFF', color: '#111827', display: 'flex', flexDirection: 'column', fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>
      <SharedBookingHeader
        onOpenMyBookings={onOpenMyBookings}
        onOpenSignIn={onOpenSignIn}
        onHomeClick={onEditTrip}
      />

      <div style={{ maxWidth: '1040px', margin: '0 auto', width: '100%', padding: '0 24px', flex: 1 }}>
        <SharedStepper currentStep={3} onStepClick={(s) => { if (s === 1) onEditTrip?.(); if (s === 2) onEditPassenger?.(); }} />

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: '40px', alignItems: 'start', paddingBottom: '60px' }}>
          {/* Left Column */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <h1 style={{ fontSize: '36px', fontWeight: '800', color: '#000000', letterSpacing: '-0.03em', margin: 0 }}>
              Ready when you are.
            </h1>

            {/* Trip details box */}
            <div style={{ background: '#FFFFFF', border: '1px solid #E5E7EB', borderRadius: '12px', padding: '16px 20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <span style={{ fontSize: '13px', fontWeight: '700', color: '#000000' }}>Trip details</span>
                <span onClick={onEditTrip} style={{ fontSize: '12px', fontWeight: '600', color: '#1D68FE', cursor: 'pointer' }}>Edit</span>
              </div>
              <div style={{ fontSize: '13px', color: '#111827', fontWeight: '600' }}>
                ● <span style={{ color: '#0078D4' }}>{state.pickupAddress || 'Pickup location'}</span> &nbsp;→&nbsp; ● <span style={{ color: '#E11D48' }}>{state.serviceType === 'HOURLY' ? `As Directed (${state.hourlyDuration || 3} Hours)` : (state.dropoffAddress || 'Drop-off location')}</span>
              </div>
              <div style={{ fontSize: '12px', color: '#6B7280', marginTop: '4px' }}>
                📅 {state.dateStr} at {state.timeStr} &nbsp;|&nbsp; {state.vehicleClass === 'FIRST_CLASS' ? 'First Class' : state.vehicleClass === 'BUSINESS_VAN' ? 'Business Van' : 'Business Class'} &nbsp;|&nbsp; {state.passengers} {state.passengers === 1 ? 'passenger' : 'passengers'}
              </div>
            </div>

            {/* Passenger details box */}
            <div style={{ background: '#FFFFFF', border: '1px solid #E5E7EB', borderRadius: '12px', padding: '16px 20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <span style={{ fontSize: '13px', fontWeight: '700', color: '#000000' }}>Passenger details</span>
                <span onClick={onEditPassenger} style={{ fontSize: '12px', fontWeight: '600', color: '#1D68FE', cursor: 'pointer' }}>Edit</span>
              </div>
              <div style={{ fontSize: '13px', color: '#111827', fontWeight: '600' }}>
                {state.firstName} {state.lastName} &nbsp;|&nbsp; <span style={{ fontWeight: '400' }}>{state.email}</span> &nbsp;|&nbsp; <span style={{ fontWeight: '400' }}>{state.phone}</span>
              </div>
            </div>

            {/* Payment method */}
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#374151', marginBottom: '8px' }}>
                Payment method
              </label>
              <div style={{ display: 'flex', gap: '28px', marginBottom: '12px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '14px', fontWeight: '600', color: '#111827' }}>
                  <input
                    type="radio"
                    name="payModeScreen07"
                    checked={state.paymentMethod === 'CARD'}
                    onChange={() => onChange({ paymentMethod: 'CARD' })}
                    style={{ accentColor: '#1D68FE', width: '18px', height: '18px' }}
                  />
                  Card
                </label>

                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '14px', fontWeight: '600', color: '#6B7280' }}>
                  <input
                    type="radio"
                    name="payModeScreen07"
                    checked={state.paymentMethod === 'APPLE_PAY'}
                    onChange={() => onChange({ paymentMethod: 'APPLE_PAY' })}
                    style={{ accentColor: '#1D68FE', width: '18px', height: '18px' }}
                  />
                  Apple Pay
                </label>
              </div>

              {/* Card Inputs Box */}
              <div style={{ background: '#FFFFFF', border: '1px solid #E5E7EB', borderRadius: '12px', padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ position: 'relative' }}>
                  <input
                    type="text"
                    value={cardNumber}
                    onChange={(e) => setCardNumber(e.target.value)}
                    style={{ width: '100%', padding: '12px 14px', borderRadius: '8px', border: '1px solid #D1D5DB', fontSize: '14px', boxSizing: 'border-box' }}
                  />
                  <div style={{ position: 'absolute', right: '12px', top: '14px', display: 'flex', gap: '6px', fontSize: '10px', fontWeight: '800', color: '#6B7280' }}>
                    <span>VISA</span> <span>MC</span> <span>AMEX</span>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <input
                    type="text"
                    value={expiry}
                    onChange={(e) => setExpiry(e.target.value)}
                    style={{ width: '100%', padding: '12px 14px', borderRadius: '8px', border: '1px solid #D1D5DB', fontSize: '14px', boxSizing: 'border-box' }}
                  />
                  <div style={{ position: 'relative' }}>
                    <input
                      type="text"
                      value={cvc}
                      onChange={(e) => setCvc(e.target.value)}
                      style={{ width: '100%', padding: '12px 14px', borderRadius: '8px', border: '1px solid #D1D5DB', fontSize: '14px', boxSizing: 'border-box' }}
                    />
                    <Info size={14} color="#9CA3AF" style={{ position: 'absolute', right: '12px', top: '15px' }} />
                  </div>
                </div>

                <div
                  onClick={() => setShowBilling(!showBilling)}
                  style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', paddingTop: '6px', borderTop: '1px solid #F3F4F6', fontSize: '13px', fontWeight: '600', color: '#111827' }}
                >
                  <span>Billing details</span>
                  <span style={{ fontSize: '11px', color: '#6B7280' }}>▼</span>
                </div>
              </div>
            </div>

            {/* Terms checkbox */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <input
                type="checkbox"
                checked={agreeTerms}
                onChange={(e) => setAgreeTerms(e.target.checked)}
                style={{ width: '16px', height: '16px', accentColor: '#1D68FE' }}
              />
              <span style={{ fontSize: '12px', color: '#4B5563' }}>
                I agree to the <a href="#terms" style={{ color: '#1D68FE', textDecoration: 'none' }}>cancellation policy</a> and <a href="#terms" style={{ color: '#1D68FE', textDecoration: 'none' }}>booking terms</a>
              </span>
            </div>
          </div>

          {/* Right Column: Fare summary */}
          <div style={{
            background: '#FFFFFF',
            border: '1px solid #E5E7EB',
            borderRadius: '12px',
            padding: '20px',
            position: 'sticky',
            top: '80px'
          }}>
            <h3 style={{ fontSize: '14px', fontWeight: '700', color: '#000000', margin: '0 0 12px 0' }}>
              Fare summary
            </h3>

            {/* Servicing Affiliate Banner */}
            <div style={{
              background: '#F0FDF4',
              border: '1px solid #BBF7D0',
              borderRadius: '8px',
              padding: '10px 12px',
              marginBottom: '14px',
              fontSize: '12px',
              color: '#15803D'
            }}>
              <div style={{ fontWeight: '700' }}>🛡️ Servicing Affiliate:</div>
              <div style={{ fontWeight: '800', color: '#166534', marginTop: '2px' }}>
                {state.assignedVendorName || 'ANB Trans Inc Executive Chauffeurs'}
              </div>
              <div style={{ fontSize: '11px', color: '#15803D', marginTop: '2px' }}>
                Market: {state.marketCity || 'Philadelphia'} • Certified Chauffeur
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', paddingBottom: '16px', borderBottom: '1px solid #F3F4F6', fontSize: '13px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#4B5563' }}>Ride ({state.vehicleClass === 'FIRST_CLASS' ? 'First Class' : state.vehicleClass === 'BUSINESS_VAN' ? 'Business Van' : 'Business Class'})</span>
                <span style={{ fontWeight: '600', color: '#000000' }}>${(state.baseFare || (state.totalFare ? state.totalFare * 0.85 : 0)).toFixed(2)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#4B5563' }}>Fees & taxes</span>
                <span style={{ fontWeight: '600', color: '#000000' }}>${(state.feesAndTaxes || (state.totalFare ? state.totalFare * 0.15 : 0)).toFixed(2)}</span>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '18px 0' }}>
              <span style={{ fontSize: '13px', fontWeight: '600', color: '#4B5563' }}>Total (USD)</span>
              <span style={{ fontSize: '24px', fontWeight: '800', color: '#1D68FE' }}>${(state.totalFare || 0).toFixed(2)}</span>
            </div>

            <button
              disabled={isPaying || !agreeTerms}
              onClick={handlePay}
              style={{
                width: '100%',
                background: isPaying ? '#93C5FD' : '#1D68FE',
                color: '#FFFFFF',
                border: 'none',
                borderRadius: '8px',
                padding: '13px',
                fontSize: '14px',
                fontWeight: '700',
                cursor: isPaying ? 'wait' : 'pointer',
                marginBottom: '16px'
              }}
            >
              {isPaying ? 'Authorizing & Booking...' : `Authorize & Book ($${(state.totalFare || 0).toFixed(2)})`}
            </button>

            {/* Free cancellation box */}
            <div style={{
              background: '#F9FAFB',
              border: '1px solid #E5E7EB',
              borderRadius: '8px',
              padding: '12px 14px',
              fontSize: '12px',
              color: '#374151',
              lineHeight: '1.4'
            }}>
              <div style={{ fontWeight: '700', color: '#111827', marginBottom: '2px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <CalendarIcon size={14} color="#6B7280" /> Free cancellation
              </div>
              Cancel up to 24 hours before pickup for a full refund.
            </div>
          </div>
        </div>
      </div>

      <SharedBookingFooter />
    </div>
  );
};
