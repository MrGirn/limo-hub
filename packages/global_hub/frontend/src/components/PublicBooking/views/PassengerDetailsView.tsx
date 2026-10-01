import React from 'react';
import { Check, ArrowLeft } from 'lucide-react';
import { BookingState } from '../types';

interface Props {
  state: BookingState;
  onChange: (updates: Partial<BookingState>) => void;
  onNext: () => void;
  onBack: () => void;
}

export const PassengerDetailsView: React.FC<Props> = ({ state, onChange, onNext, onBack }) => {
  const isFormValid = state.firstName.trim().length > 0 && 
                      state.lastName.trim().length > 0 && 
                      state.email.includes('@') && 
                      state.phone.trim().length >= 7;

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
          <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: '#0078D4', color: '#FFFFFF', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', fontWeight: '800' }}>2</div>
          <span style={{ fontSize: '14px', fontWeight: '700', color: '#0078D4' }}>Passenger details</span>
        </div>
        <div style={{ width: '32px', height: '2px', background: '#E2E8F0' }} />
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: '#F1F5F9', color: '#64748B', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', fontWeight: '800' }}>3</div>
          <span style={{ fontSize: '14px', fontWeight: '600', color: '#64748B' }}>Review & pay</span>
        </div>
        <div style={{ width: '32px', height: '2px', background: '#E2E8F0' }} />
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: '#F1F5F9', color: '#64748B', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', fontWeight: '800' }}>4</div>
          <span style={{ fontSize: '14px', fontWeight: '600', color: '#64748B' }}>Confirmation</span>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: '28px', alignItems: 'start' }}>
        {/* Form Column */}
        <div className="glass-card" style={{ padding: '28px', background: '#FFFFFF' }}>
          <h2 style={{ fontSize: '26px', fontWeight: '800', color: '#0F172A', marginBottom: '18px' }}>
            Who's travelling?
          </h2>

          {/* Myself / Someone Else Radio */}
          <div style={{ display: 'flex', gap: '28px', marginBottom: '24px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '14px', fontWeight: '700', color: state.passengerType === 'MYSELF' ? '#0F172A' : '#64748B' }}>
              <input
                type="radio"
                name="passengerType"
                checked={state.passengerType === 'MYSELF'}
                onChange={() => onChange({ passengerType: 'MYSELF' })}
                style={{ accentColor: '#0078D4', width: '18px', height: '18px' }}
              />
              Myself
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '14px', fontWeight: '700', color: state.passengerType === 'SOMEONE_ELSE' ? '#0F172A' : '#64748B' }}>
              <input
                type="radio"
                name="passengerType"
                checked={state.passengerType === 'SOMEONE_ELSE'}
                onChange={() => onChange({ passengerType: 'SOMEONE_ELSE' })}
                style={{ accentColor: '#0078D4', width: '18px', height: '18px' }}
              />
              Someone else
            </label>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#334155', marginBottom: '6px' }}>
                First name
              </label>
              <input
                type="text"
                placeholder="e.g. John"
                value={state.firstName}
                onChange={(e) => onChange({ firstName: e.target.value })}
                style={{ width: '100%', padding: '12px 14px', borderRadius: '10px', border: '1.5px solid #E2E8F0', fontSize: '14px' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#334155', marginBottom: '6px' }}>
                Last name
              </label>
              <input
                type="text"
                placeholder="e.g. Smith"
                value={state.lastName}
                onChange={(e) => onChange({ lastName: e.target.value })}
                style={{ width: '100%', padding: '12px 14px', borderRadius: '10px', border: '1.5px solid #E2E8F0', fontSize: '14px' }}
              />
            </div>
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#334155', marginBottom: '6px' }}>
              Email
            </label>
            <input
              type="email"
              placeholder="e.g. passenger@example.com"
              value={state.email}
              onChange={(e) => onChange({ email: e.target.value })}
              style={{ width: '100%', padding: '12px 14px', borderRadius: '10px', border: '1.5px solid #E2E8F0', fontSize: '14px' }}
            />
          </div>

          <div style={{ marginBottom: '24px' }}>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#334155', marginBottom: '6px' }}>
              Mobile number
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: '110px 1fr', gap: '10px' }}>
              <select style={{ padding: '12px 10px', borderRadius: '10px', border: '1.5px solid #E2E8F0', fontSize: '14px', background: '#FFFFFF' }}>
                <option value="+1">🇺🇸 +1</option>
                <option value="+44">🇬🇧 +44</option>
                <option value="+971">🇦🇪 +971</option>
                <option value="+33">🇫🇷 +33</option>
              </select>
              <input
                type="tel"
                placeholder="415 555 0123"
                value={state.phone}
                onChange={(e) => onChange({ phone: e.target.value })}
                style={{ width: '100%', padding: '12px 14px', borderRadius: '10px', border: '1.5px solid #E2E8F0', fontSize: '14px' }}
              />
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '10px', borderTop: '1px solid #F1F5F9' }}>
            <button
              onClick={onBack}
              style={{ background: 'none', border: 'none', color: '#64748B', fontSize: '14px', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}
            >
              <ArrowLeft size={16} />
              Back
            </button>
            <span style={{ fontSize: '12px', color: '#64748B' }}>Continue as guest • No account required</span>
          </div>
        </div>

        {/* Sticky Trip Summary */}
        <div className="glass-card" style={{ padding: '22px', background: '#FFFFFF', position: 'sticky', top: '80px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: '800', color: '#0F172A' }}>Trip summary</h3>
            <button onClick={onBack} style={{ background: 'none', border: 'none', color: '#0078D4', fontSize: '12px', fontWeight: '700', cursor: 'pointer' }}>Edit</button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', paddingBottom: '14px', borderBottom: '1px solid #F1F5F9', fontSize: '13px' }}>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
              <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#0078D4', marginTop: '5px' }} />
              <div>
                <strong style={{ color: '#0F172A' }}>{state.pickupAddress || 'JFK Airport, New York, NY'}</strong>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
              <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10B981', marginTop: '5px' }} />
              <div>
                <strong style={{ color: '#0F172A' }}>{state.dropoffAddress || 'Manhattan, New York, NY'}</strong>
              </div>
            </div>
            <div style={{ color: '#64748B', fontSize: '12px', marginTop: '4px' }}>
              {state.dateStr} at {state.timeStr} • {state.passengers} passengers
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '18px 0' }}>
            <span style={{ fontSize: '14px', fontWeight: '700', color: '#64748B' }}>Total</span>
            <span style={{ fontSize: '24px', fontWeight: '800', color: '#0F172A' }}>${state.totalFare}</span>
          </div>

          <button
            disabled={!isFormValid}
            onClick={onNext}
            style={{
              width: '100%',
              background: isFormValid ? '#0078D4' : '#CBD5E1',
              color: '#FFFFFF',
              border: 'none',
              borderRadius: '12px',
              padding: '14px',
              fontSize: '15px',
              fontWeight: '700',
              cursor: isFormValid ? 'pointer' : 'not-allowed',
              boxShadow: isFormValid ? '0 4px 14px rgba(0,120,212,0.3)' : 'none'
            }}
          >
            Continue to payment
          </button>
        </div>
      </div>
    </div>
  );
};
