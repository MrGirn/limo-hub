import React, { useState } from 'react';
import { Check, Calendar, Printer, X, Plane } from 'lucide-react';
import { BookingState } from '../types';
import { SharedBookingHeader } from './SharedBookingHeader';
import { SharedBookingFooter } from './SharedBookingFooter';

interface Props {
  state: BookingState;
  onViewBooking: () => void;
  onNewBooking?: () => void;
  onOpenSignIn?: () => void;
}

export const Page08BookingConfirmed: React.FC<Props> = ({
  state,
  onViewBooking,
  onNewBooking,
  onOpenSignIn
}) => {
  const [showReceiptModal, setShowReceiptModal] = useState(false);

  return (
    <div style={{ minHeight: '100vh', background: '#FFFFFF', color: '#111827', display: 'flex', flexDirection: 'column', fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>
      <SharedBookingHeader
        onOpenMyBookings={onViewBooking}
        onOpenSignIn={onOpenSignIn}
        onHomeClick={onNewBooking}
      />

      <div style={{ maxWidth: '1120px', margin: '0 auto', width: '100%', padding: '40px 24px 60px 24px', flex: 1 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '48px', alignItems: 'center' }}>
          {/* Left Column: Confirmation & Itinerary */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '22px' }}>
            {/* Big Blue Circle Checkmark */}
            <div style={{
              width: '46px',
              height: '46px',
              borderRadius: '50%',
              background: '#1D68FE',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Check size={26} color="#FFFFFF" strokeWidth={3} />
            </div>

            <div>
              <h1 style={{ fontSize: '38px', fontWeight: '800', color: '#000000', letterSpacing: '-0.03em', margin: 0 }}>
                You’re booked.
              </h1>
              <div style={{ fontSize: '15px', color: '#4B5563', fontWeight: '600', marginTop: '6px' }}>
                Reference {state.bookingReference || 'LM-20481'}
              </div>
            </div>

            {/* Trip Overview Card */}
            <div style={{
              background: '#FFFFFF',
              border: '1px solid #E5E7EB',
              borderRadius: '12px',
              padding: '22px',
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '20px'
            }}>
              {/* Route */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                  <Plane size={16} color="#000000" style={{ marginTop: '2px', flexShrink: 0 }} />
                  <div>
                    <div style={{ fontWeight: '700', color: '#000000', fontSize: '14px' }}>Pickup</div>
                    <div style={{ fontSize: '12px', color: '#6B7280', wordBreak: 'break-word' }}>{state.pickupAddress || 'Pickup Location'}</div>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                  <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#000000', marginTop: '6px', marginLeft: '5px', flexShrink: 0 }} />
                  <div style={{ marginLeft: '5px' }}>
                    <div style={{ fontWeight: '700', color: '#000000', fontSize: '14px' }}>Drop-off</div>
                    <div style={{ fontSize: '12px', color: '#6B7280', wordBreak: 'break-word' }}>{state.dropoffAddress || (state.serviceType === 'HOURLY' ? `As Directed (${state.hourlyDuration || 3} Hours)` : 'Dropoff Location')}</div>
                  </div>
                </div>
              </div>

              {/* Specs & Total */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '13px', color: '#374151' }}>
                <div style={{ fontWeight: '500' }}>📅 {state.dateStr} at {state.timeStr}</div>
                <div style={{ fontWeight: '500' }}>🚘 {state.vehicleClass === 'FIRST_CLASS' ? 'First Class' : state.vehicleClass === 'BUSINESS_VAN' ? 'Business Van' : 'Business Class'}</div>
                <div style={{ fontWeight: '500' }}>👤 {state.passengers} {state.passengers === 1 ? 'passenger' : 'passengers'}</div>
                <div style={{ fontWeight: '700', color: '#16A34A', marginTop: '4px' }}>✓ Paid ${state.totalFare.toFixed(2)} USD</div>
              </div>
            </div>

            {/* Actions Row */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginTop: '4px' }}>
              <button
                onClick={onViewBooking}
                style={{
                  background: '#1D68FE',
                  color: '#FFFFFF',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '12px 22px',
                  fontSize: '13px',
                  fontWeight: '700',
                  cursor: 'pointer'
                }}
              >
                View booking
              </button>

              <button
                onClick={() => alert('Calendar invite (.ics) generated.')}
                style={{
                  background: '#FFFFFF',
                  color: '#111827',
                  border: '1px solid #D1D5DB',
                  borderRadius: '8px',
                  padding: '11px 18px',
                  fontSize: '13px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                <Calendar size={14} /> Add to calendar
              </button>

              <span
                onClick={() => setShowReceiptModal(true)}
                style={{ fontSize: '13px', fontWeight: '600', color: '#1D68FE', cursor: 'pointer', textDecoration: 'underline', marginLeft: '6px' }}
              >
                Receipt
              </span>
            </div>

            <div style={{ fontSize: '12px', color: '#6B7280', marginTop: '6px' }}>
              ℹ Chauffeur details will appear before pickup.
            </div>
          </div>

          {/* Right Column: Hero Chauffeur Image Banner (matching Concept) */}
          <div style={{
            height: '420px',
            borderRadius: '16px',
            overflow: 'hidden',
            position: 'relative',
            background: '#111827',
            boxShadow: '0 8px 30px rgba(0,0,0,0.08)'
          }}>
            <img
              src="https://images.unsplash.com/photo-1563720223185-11003d516935?w=900&auto=format&fit=crop&q=80"
              alt="Mercedes-Benz S-Class Airport Terminal"
              style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: 0.9 }}
            />
            <div style={{
              position: 'absolute',
              top: '24px',
              right: '24px',
              background: 'rgba(255,255,255,0.92)',
              padding: '10px 14px',
              borderRadius: '8px',
              fontSize: '11px',
              fontWeight: '800',
              color: '#000000',
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
              maxWidth: '120px',
              textAlign: 'center',
              lineHeight: '1.2'
            }}>
              A HIGHER STANDARD OF TRAVEL
            </div>
          </div>
        </div>
      </div>

      {/* Single Unified Invoice Receipt Modal */}
      {showReceiptModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: '20px' }}>
          <div style={{ width: '100%', maxWidth: '520px', background: '#FFFFFF', padding: '32px', borderRadius: '16px', position: 'relative' }}>
            <button onClick={() => setShowReceiptModal(false)} style={{ position: 'absolute', top: '16px', right: '16px', background: 'none', border: 'none', cursor: 'pointer' }}><X size={18} /></button>

            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '2px solid #000000', paddingBottom: '12px', marginBottom: '16px' }}>
              <div>
                <div style={{ fontSize: '20px', fontWeight: '900' }}>LIMO</div>
                <div style={{ fontSize: '11px', color: '#6B7280' }}>Global Hub Clearinghouse (Merchant of Record)</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '13px', fontWeight: '700', color: '#1D68FE' }}>{state.invoiceNumber || 'INV-GH-2026-9041'}</div>
                <div style={{ fontSize: '11px', color: '#6B7280' }}>{state.dateStr || new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</div>
              </div>
            </div>

            <div style={{ fontSize: '13px', marginBottom: '14px' }}>
              <strong>Billed To:</strong> {state.firstName ? `${state.firstName} ${state.lastName}` : 'Guest Passenger'} ({state.email || 'guest@limo-hub.com'}) • Ref: {state.bookingReference || 'LM-20481'}
            </div>

            {state.assignedVendorName && (
              <div style={{ fontSize: '12px', color: '#4B5563', marginBottom: '14px', background: '#F9FAFB', padding: '8px 12px', borderRadius: '6px' }}>
                <strong>Servicing Affiliate:</strong> {state.assignedVendorName}
              </div>
            )}

            <table style={{ width: '100%', fontSize: '13px', borderCollapse: 'collapse', marginBottom: '16px' }}>
              <tbody>
                <tr style={{ borderBottom: '1px solid #F3F4F6' }}>
                  <td style={{ padding: '8px 0' }}>Chauffeured Transfer ({state.pickupAddress || 'Origin'} ➔ {state.dropoffAddress || (state.serviceType === 'HOURLY' ? `As Directed (${state.hourlyDuration || 3}h)` : 'Destination')})</td>
                  <td style={{ textAlign: 'right', fontWeight: '600' }}>${(state.baseFare || (state.totalFare ? state.totalFare * 0.85 : 0)).toFixed(2)}</td>
                </tr>
                <tr style={{ borderBottom: '1px solid #F3F4F6' }}>
                  <td style={{ padding: '8px 0' }}>Taxes, Airport Fees & Surcharges</td>
                  <td style={{ textAlign: 'right', fontWeight: '600' }}>${(state.feesAndTaxes || (state.totalFare ? state.totalFare * 0.15 : 0)).toFixed(2)}</td>
                </tr>
                <tr style={{ borderTop: '2px solid #000000' }}>
                  <td style={{ padding: '10px 0', fontWeight: '800' }}>Total Paid (USD)</td>
                  <td style={{ textAlign: 'right', fontWeight: '800', fontSize: '16px', color: '#1D68FE' }}>${(state.totalFare || 0).toFixed(2)}</td>
                </tr>
              </tbody>
            </table>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={() => window.print()} style={{ flex: 1, padding: '10px', borderRadius: '8px', border: '1px solid #D1D5DB', background: '#FFFFFF', fontWeight: '600', fontSize: '13px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                <Printer size={14} /> Print
              </button>
              <button onClick={() => setShowReceiptModal(false)} style={{ flex: 1, padding: '10px', borderRadius: '8px', border: 'none', background: '#1D68FE', color: '#FFFFFF', fontWeight: '600', fontSize: '13px', cursor: 'pointer' }}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      <SharedBookingFooter />
    </div>
  );
};
