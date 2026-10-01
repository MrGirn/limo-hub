import React from 'react';
import { BookingState } from '../types';
import { SharedBookingHeader } from './SharedBookingHeader';
import { SharedBookingFooter } from './SharedBookingFooter';
import { SharedStepper } from './SharedStepper';

interface Props {
  state: BookingState;
  onChange: (updates: Partial<BookingState>) => void;
  onContinueToPayment: () => void;
  onBackToRideDetails: () => void;
  onOpenMyBookings?: () => void;
  onOpenSignIn?: () => void;
}

export const Page06PassengerDetails: React.FC<Props> = ({
  state,
  onChange,
  onContinueToPayment,
  onBackToRideDetails,
  onOpenMyBookings,
  onOpenSignIn
}) => {
  return (
    <div style={{ minHeight: '100vh', background: '#FFFFFF', color: '#111827', display: 'flex', flexDirection: 'column', fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>
      <SharedBookingHeader
        onOpenMyBookings={onOpenMyBookings}
        onOpenSignIn={onOpenSignIn}
        onHomeClick={onBackToRideDetails}
      />

      <div style={{ maxWidth: '1040px', margin: '0 auto', width: '100%', padding: '0 24px', flex: 1 }}>
        <SharedStepper currentStep={2} onStepClick={(s) => { if (s === 1) onBackToRideDetails(); }} />

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: '40px', alignItems: 'start', paddingBottom: '60px' }}>
          {/* Left Column: Who's travelling? */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '22px' }}>
            <h1 style={{ fontSize: '36px', fontWeight: '800', color: '#000000', letterSpacing: '-0.03em', margin: 0 }}>
              Who’s travelling?
            </h1>

            {/* Radio options: Myself vs Someone else */}
            <div style={{ display: 'flex', gap: '32px', marginTop: '2px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '14px', fontWeight: '600', color: '#111827' }}>
                <input
                  type="radio"
                  name="whoIsTravelling"
                  checked={state.passengerType === 'MYSELF'}
                  onChange={() => onChange({ passengerType: 'MYSELF' })}
                  style={{ accentColor: '#1D68FE', width: '18px', height: '18px' }}
                />
                Myself
              </label>

              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '14px', fontWeight: '600', color: '#6B7280' }}>
                <input
                  type="radio"
                  name="whoIsTravelling"
                  checked={state.passengerType === 'SOMEONE_ELSE'}
                  onChange={() => onChange({ passengerType: 'SOMEONE_ELSE' })}
                  style={{ accentColor: '#1D68FE', width: '18px', height: '18px' }}
                />
                Someone else
              </label>
            </div>

            {/* First & Last name row */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#374151', marginBottom: '6px' }}>
                  First name
                </label>
                <input
                  type="text"
                  value={state.firstName}
                  onChange={(e) => onChange({ firstName: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '12px 14px',
                    borderRadius: '8px',
                    border: '1px solid #D1D5DB',
                    fontSize: '14px',
                    color: '#111827',
                    outline: 'none',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#374151', marginBottom: '6px' }}>
                  Last name
                </label>
                <input
                  type="text"
                  value={state.lastName}
                  onChange={(e) => onChange({ lastName: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '12px 14px',
                    borderRadius: '8px',
                    border: '1px solid #D1D5DB',
                    fontSize: '14px',
                    color: '#111827',
                    outline: 'none',
                    boxSizing: 'border-box'
                  }}
                />
              </div>
            </div>

            {/* Email */}
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#374151', marginBottom: '6px' }}>
                Email
              </label>
              <input
                type="email"
                value={state.email}
                onChange={(e) => onChange({ email: e.target.value })}
                style={{
                  width: '100%',
                  padding: '12px 14px',
                  borderRadius: '8px',
                  border: '1px solid #D1D5DB',
                  fontSize: '14px',
                  color: '#111827',
                  outline: 'none',
                  boxSizing: 'border-box'
                }}
              />
            </div>

            {/* Mobile number */}
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#374151', marginBottom: '6px' }}>
                Mobile number
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: '96px 1fr', gap: '10px' }}>
                <select style={{
                  padding: '12px 8px',
                  borderRadius: '8px',
                  border: '1px solid #D1D5DB',
                  fontSize: '14px',
                  background: '#FFFFFF',
                  fontWeight: '600',
                  color: '#111827',
                  boxSizing: 'border-box'
                }}>
                  <option value="+1">🇺🇸 +1</option>
                  <option value="+44">🇬🇧 +44</option>
                  <option value="+971">🇦🇪 +971</option>
                </select>
                <input
                  type="tel"
                  value={state.phone}
                  onChange={(e) => onChange({ phone: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '12px 14px',
                    borderRadius: '8px',
                    border: '1px solid #D1D5DB',
                    fontSize: '14px',
                    color: '#111827',
                    outline: 'none',
                    boxSizing: 'border-box'
                  }}
                />
              </div>
            </div>

            {/* Continue as guest */}
            <div style={{ fontSize: '12px', color: '#1D68FE', fontWeight: '600', cursor: 'pointer' }}>
              Continue as guest
            </div>
          </div>

          {/* Right Column: Trip summary Card */}
          <div style={{
            background: '#FFFFFF',
            border: '1px solid #E5E7EB',
            borderRadius: '12px',
            padding: '20px',
            position: 'sticky',
            top: '80px'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '14px', fontWeight: '700', color: '#000000', margin: 0 }}>Trip summary</h3>
              <span onClick={onBackToRideDetails} style={{ fontSize: '12px', fontWeight: '600', color: '#1D68FE', cursor: 'pointer' }}>Edit</span>
            </div>
            {/* Timeline */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', paddingBottom: '16px', borderBottom: '1px solid #F3F4F6', fontSize: '13px' }}>
              <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#0078D4', marginTop: '6px', flexShrink: 0 }} />
                <div>
                  <div style={{ fontWeight: '700', color: '#000000' }}>Pickup</div>
                  <div style={{ fontSize: '11px', color: '#6B7280', wordBreak: 'break-word' }}>{state.pickupAddress || 'Pickup address'}</div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#E11D48', marginTop: '6px', flexShrink: 0 }} />
                <div>
                  <div style={{ fontWeight: '700', color: '#000000' }}>Drop-off</div>
                  <div style={{ fontSize: '11px', color: '#6B7280', wordBreak: 'break-word' }}>{state.serviceType === 'HOURLY' ? `As Directed (${state.hourlyDuration || 3} Hours)` : (state.dropoffAddress || 'Drop-off address')}</div>
                </div>
              </div>

              <div style={{ fontSize: '12px', color: '#4B5563', marginTop: '4px' }}>
                📅 {state.dateStr} at {state.timeStr}
              </div>
              <div style={{ fontSize: '12px', color: '#4B5563' }}>
                👤 {state.passengers} {state.passengers === 1 ? 'passenger' : 'passengers'} &nbsp;|&nbsp; 🚘 {state.vehicleClass === 'FIRST_CLASS' ? 'First Class' : state.vehicleClass === 'BUSINESS_VAN' ? 'Business Van' : 'Business Class'}
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '18px 0' }}>
              <span style={{ fontSize: '13px', fontWeight: '500', color: '#4B5563' }}>Total</span>
              <span style={{ fontSize: '24px', fontWeight: '800', color: '#000000' }}>${state.totalFare.toFixed(2)}</span>
            </div>

            <button
              onClick={() => {
                if (!state.firstName.trim() || !state.lastName.trim() || !state.email.trim() || !state.phone.trim()) {
                  alert('Please fill in your first name, last name, email, and phone number to continue.');
                  return;
                }
                onContinueToPayment();
              }}
              style={{
                width: '100%',
                background: '#1D68FE',
                color: '#FFFFFF',
                border: 'none',
                borderRadius: '8px',
                padding: '14px',
                fontSize: '14px',
                fontWeight: '700',
                cursor: 'pointer'
              }}
            >
              Continue to payment
            </button>
          </div>
        </div>
      </div>

      <SharedBookingFooter />
    </div>
  );
};
