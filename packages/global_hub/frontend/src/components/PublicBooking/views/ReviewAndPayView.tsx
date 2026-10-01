import React, { useState } from 'react';
import { ShieldCheck, Lock, CreditCard, Apple, Check, AlertCircle, ArrowLeft } from 'lucide-react';
import { BookingState } from '../types';

interface Props {
  state: BookingState;
  onChange: (updates: Partial<BookingState>) => void;
  onSuccess: (bookingRef: string, invoiceNum: string, chauffeur: string) => void;
  onBack: () => void;
}

export const ReviewAndPayView: React.FC<Props> = ({ state, onChange, onSuccess, onBack }) => {
  const [agreeTerms, setAgreeTerms] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [cardNumber, setCardNumber] = useState('4242 •••• •••• 4242');
  const [expiry, setExpiry] = useState('12/28');
  const [cvc, setCvc] = useState('888');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handlePay = async () => {
    if (!agreeTerms) return;
    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      const payload = {
        trip_type: state.serviceType,
        pickup_address: state.pickupAddress,
        dropoff_address: state.dropoffAddress || (state.serviceType === 'HOURLY' ? `As Directed (${state.hourlyDuration || 3} Hours)` : ''),
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
        selected_vendor_id: state.selectedVendorId,
        base_fare_usd: state.baseFare,
        fees_and_taxes_usd: state.feesAndTaxes
      };

      const res = await fetch('/api/v1/global-hub/public/book', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        throw new Error(`Payment processing failed with status ${res.status}`);
      }

      const data = await res.json();
      onSuccess(data.booking_reference, data.invoice_number, data.assigned_chauffeur_name || 'Marcus Vance');
    } catch (err: any) {
      console.error('Booking submission failed', err);
      setErrorMsg(err.message || 'An error occurred during payment pre-authorization.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div style={{ maxWidth: '1180px', margin: '0 auto' }}>
      {/* Stepper */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '32px', marginBottom: '32px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: '#0078D4', color: '#FFFFFF', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px' }}>✓</div>
          <span style={{ fontSize: '14px', fontWeight: '700', color: '#0078D4' }}>Ride details</span>
        </div>
        <div style={{ width: '32px', height: '2px', background: '#0078D4' }} />
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: '#0078D4', color: '#FFFFFF', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px' }}>✓</div>
          <span style={{ fontSize: '14px', fontWeight: '700', color: '#0078D4' }}>Passenger details</span>
        </div>
        <div style={{ width: '32px', height: '2px', background: '#0078D4' }} />
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: '#0078D4', color: '#FFFFFF', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', fontWeight: '800' }}>3</div>
          <span style={{ fontSize: '14px', fontWeight: '700', color: '#0078D4' }}>Review & pay</span>
        </div>
        <div style={{ width: '32px', height: '2px', background: '#E2E8F0' }} />
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: '#F1F5F9', color: '#64748B', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', fontWeight: '800' }}>4</div>
          <span style={{ fontSize: '14px', fontWeight: '600', color: '#64748B' }}>Confirmation</span>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: '28px', alignItems: 'start' }}>
        {/* Review & Payment Details Column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div className="glass-card" style={{ padding: '28px', background: '#FFFFFF' }}>
            <h2 style={{ fontSize: '26px', fontWeight: '800', color: '#0F172A', marginBottom: '18px' }}>
              Ready when you are.
            </h2>

            {/* Trip details overview */}
            <div style={{ padding: '18px', background: '#F8FAFC', borderRadius: '14px', border: '1px solid #E2E8F0', marginBottom: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <span style={{ fontSize: '13px', fontWeight: '800', color: '#0F172A' }}>Trip details</span>
                <button onClick={onBack} style={{ background: 'none', border: 'none', color: '#0078D4', fontSize: '12px', fontWeight: '700', cursor: 'pointer' }}>Edit</button>
              </div>
              <div style={{ fontSize: '13px', color: '#0F172A', fontWeight: '600' }}>
                {state.pickupAddress || 'JFK Airport, Terminal 4'} ➔ {state.dropoffAddress || '350 Fifth Ave, Manhattan, NY'}
              </div>
              <div style={{ fontSize: '12px', color: '#64748B', marginTop: '4px' }}>
                {state.dateStr} at {state.timeStr} • {state.vehicleClass === 'BUSINESS_CLASS' ? 'Business Class' : state.vehicleClass === 'FIRST_CLASS' ? 'First Class' : 'Business Van'} • {state.passengers} passengers
              </div>
              {state.flightNumber && (
                <div style={{ fontSize: '12px', color: '#0369A1', marginTop: '4px', fontWeight: '700' }}>
                  ✈️ Flight Radar: {state.flightNumber} ({state.pickupMeetingPoint})
                </div>
              )}
            </div>

            {/* Passenger details overview */}
            <div style={{ padding: '18px', background: '#F8FAFC', borderRadius: '14px', border: '1px solid #E2E8F0', marginBottom: '22px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <span style={{ fontSize: '13px', fontWeight: '800', color: '#0F172A' }}>Passenger details</span>
                <button onClick={onBack} style={{ background: 'none', border: 'none', color: '#0078D4', fontSize: '12px', fontWeight: '700', cursor: 'pointer' }}>Edit</button>
              </div>
              <div style={{ fontSize: '13px', color: '#0F172A', fontWeight: '600' }}>
                {state.firstName || 'Alex'} {state.lastName || 'Chen'}
              </div>
              <div style={{ fontSize: '12px', color: '#64748B', marginTop: '2px' }}>
                {state.email || 'alex.chen@example.com'} • {state.phone || '+1 415 555 0123'}
              </div>
            </div>

            {/* Payment Method Selector */}
            <h3 style={{ fontSize: '16px', fontWeight: '800', color: '#0F172A', marginBottom: '12px' }}>
              Payment method
            </h3>
            <div style={{ display: 'flex', gap: '20px', marginBottom: '16px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '14px', fontWeight: '700', color: state.paymentMethod === 'CARD' ? '#0F172A' : '#64748B' }}>
                <input
                  type="radio"
                  name="payMethod"
                  checked={state.paymentMethod === 'CARD'}
                  onChange={() => onChange({ paymentMethod: 'CARD' })}
                  style={{ accentColor: '#0078D4', width: '18px', height: '18px' }}
                />
                <CreditCard size={18} color="#0078D4" />
                Credit Card
              </label>

              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '14px', fontWeight: '700', color: state.paymentMethod === 'APPLE_PAY' ? '#0F172A' : '#64748B' }}>
                <input
                  type="radio"
                  name="payMethod"
                  checked={state.paymentMethod === 'APPLE_PAY'}
                  onChange={() => onChange({ paymentMethod: 'APPLE_PAY' })}
                  style={{ accentColor: '#0078D4', width: '18px', height: '18px' }}
                />
                Apple Pay
              </label>
            </div>

            {/* Card Inputs */}
            {state.paymentMethod === 'CARD' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '20px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: '#334155', marginBottom: '4px' }}>Card number</label>
                  <input
                    type="text"
                    value={cardNumber}
                    onChange={(e) => setCardNumber(e.target.value)}
                    style={{ width: '100%', padding: '12px 14px', borderRadius: '10px', border: '1.5px solid #E2E8F0', fontSize: '14px' }}
                  />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: '#334155', marginBottom: '4px' }}>Expiry date</label>
                    <input
                      type="text"
                      value={expiry}
                      onChange={(e) => setExpiry(e.target.value)}
                      style={{ width: '100%', padding: '12px 14px', borderRadius: '10px', border: '1.5px solid #E2E8F0', fontSize: '14px' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: '#334155', marginBottom: '4px' }}>Security code (CVC)</label>
                    <input
                      type="text"
                      value={cvc}
                      onChange={(e) => setCvc(e.target.value)}
                      style={{ width: '100%', padding: '12px 14px', borderRadius: '10px', border: '1.5px solid #E2E8F0', fontSize: '14px' }}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Terms checkbox */}
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', marginTop: '10px' }}>
              <input
                type="checkbox"
                checked={agreeTerms}
                onChange={(e) => setAgreeTerms(e.target.checked)}
                style={{ width: '18px', height: '18px', accentColor: '#0078D4', marginTop: '2px' }}
              />
              <span style={{ fontSize: '12px', color: '#64748B' }}>
                I agree to the <a href="#terms" style={{ color: '#0078D4', textDecoration: 'none', fontWeight: '700' }}>cancellation policy</a> and <a href="#terms" style={{ color: '#0078D4', textDecoration: 'none', fontWeight: '700' }}>booking terms</a>. Global Hub is the merchant of record for this reservation.
              </span>
            </div>

            {errorMsg && (
              <div style={{ marginTop: '14px', padding: '10px 14px', background: '#FEE2E2', color: '#B91C1C', borderRadius: '8px', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <AlertCircle size={16} />
                {errorMsg}
              </div>
            )}
          </div>
        </div>

        {/* Sticky Fare Summary Column */}
        <div className="glass-card" style={{ padding: '22px', background: '#FFFFFF', position: 'sticky', top: '80px' }}>
          <h3 style={{ fontSize: '16px', fontWeight: '800', color: '#0F172A', marginBottom: '14px' }}>Fare summary</h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', paddingBottom: '14px', borderBottom: '1px solid #F1F5F9', fontSize: '13px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#64748B' }}>Ride ({state.vehicleClass === 'BUSINESS_CLASS' ? 'Business Class' : state.vehicleClass === 'FIRST_CLASS' ? 'First Class' : 'Business Van'})</span>
              <strong style={{ color: '#0F172A' }}>${state.baseFare.toFixed(2)}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#64748B' }}>Fees & taxes</span>
              <strong style={{ color: '#0F172A' }}>${state.feesAndTaxes.toFixed(2)}</strong>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '18px 0' }}>
            <span style={{ fontSize: '14px', fontWeight: '700', color: '#64748B' }}>Total</span>
            <span style={{ fontSize: '26px', fontWeight: '800', color: '#0F172A' }}>${state.totalFare.toFixed(2)}</span>
          </div>

          {/* Cancellation Policy Banner */}
          <div style={{ padding: '12px', background: '#F0FDF4', borderRadius: '10px', border: '1px solid #BBF7D0', marginBottom: '18px', fontSize: '12px', color: '#166534' }}>
            <strong style={{ display: 'block', marginBottom: '2px' }}>✓ Free cancellation</strong>
            Cancel up to 24 hours before pickup for a full refund.
          </div>

          <button
            disabled={isSubmitting || !agreeTerms}
            onClick={handlePay}
            style={{
              width: '100%',
              background: isSubmitting ? '#94A3B8' : '#0078D4',
              color: '#FFFFFF',
              border: 'none',
              borderRadius: '12px',
              padding: '16px',
              fontSize: '16px',
              fontWeight: '800',
              cursor: isSubmitting ? 'wait' : 'pointer',
              boxShadow: '0 4px 14px rgba(0,120,212,0.3)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px'
            }}
          >
            <Lock size={16} />
            {isSubmitting ? 'Authorizing Payment...' : `Pay $${state.totalFare}`}
          </button>
        </div>
      </div>
    </div>
  );
};
