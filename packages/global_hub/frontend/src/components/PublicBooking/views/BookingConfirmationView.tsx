import React, { useState } from 'react';
import { CheckCircle2, Calendar, FileText, ArrowRight, ShieldCheck, Download, Printer, X } from 'lucide-react';
import { BookingState } from '../types';

interface Props {
  state: BookingState;
  onGoToBookings: () => void;
  onNewBooking: () => void;
}

export const BookingConfirmationView: React.FC<Props> = ({ state, onGoToBookings, onNewBooking }) => {
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);

  return (
    <div style={{ maxWidth: '980px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Confirmation Hero Card */}
      <div className="glass-card" style={{ padding: '36px', background: '#FFFFFF', borderRadius: '20px', textAlign: 'left' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '14px' }}>
          <div style={{ width: '44px', height: '44px', borderRadius: '50%', background: '#0078D4', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <CheckCircle2 size={26} color="#FFFFFF" />
          </div>
          <div>
            <h1 style={{ fontSize: '32px', fontWeight: '800', color: '#0F172A', letterSpacing: '-0.02em' }}>
              You're booked.
            </h1>
            <div style={{ fontSize: '15px', color: '#64748B', fontWeight: '700' }}>
              Reference <span style={{ color: '#0078D4' }}>{state.bookingReference || 'LM-20481'}</span>
            </div>
          </div>
        </div>

        {/* Trip Overview Box */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px', padding: '24px', background: '#F8FAFC', borderRadius: '16px', border: '1px solid #E2E8F0', marginTop: '20px' }}>
          <div>
            <div style={{ fontSize: '12px', fontWeight: '800', color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Route & Itinerary</div>
            <div style={{ fontSize: '15px', fontWeight: '800', color: '#0F172A', marginTop: '6px' }}>
              ✈️ {state.pickupAddress || 'JFK International Airport, Terminal 4'}
            </div>
            <div style={{ fontSize: '15px', fontWeight: '800', color: '#0F172A', marginTop: '4px' }}>
              🏢 {state.dropoffAddress || '350 Fifth Avenue, Manhattan, NY 10118'}
            </div>
            <div style={{ fontSize: '13px', color: '#64748B', marginTop: '8px', fontWeight: '600' }}>
              📅 {state.dateStr} at {state.timeStr}
            </div>
          </div>

          <div>
            <div style={{ fontSize: '12px', fontWeight: '800', color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Service & Vehicle</div>
            <div style={{ fontSize: '15px', fontWeight: '800', color: '#0F172A', marginTop: '6px' }}>
              {state.vehicleClass === 'BUSINESS_CLASS' ? 'Business Class (Mercedes-Benz S-Class)' : state.vehicleClass === 'FIRST_CLASS' ? 'First Class (Mercedes-Maybach)' : 'Business Van (Mercedes V-Class)'}
            </div>
            <div style={{ fontSize: '13px', color: '#64748B', marginTop: '4px' }}>
              👤 {state.passengers} passengers • 💼 2 suitcases
            </div>
            <div style={{ fontSize: '15px', fontWeight: '800', color: '#16A34A', marginTop: '8px' }}>
              ✓ Paid ${state.totalFare}.00 USD (Authorized)
            </div>
          </div>
        </div>

        {/* Chauffeur Details Notice */}
        <div style={{ marginTop: '18px', padding: '14px 18px', background: '#EFF6FF', borderRadius: '12px', border: '1px solid #BFDBFE', fontSize: '13px', color: '#1E40AF', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <ShieldCheck size={20} color="#0078D4" />
          <span>Chauffeur details will appear before pickup. Assigned local affiliate: <strong>{state.selectedVendorName || 'Manhattan Prestige Chauffeur'}</strong></span>
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', gap: '14px', marginTop: '24px', flexWrap: 'wrap' }}>
          <button
            onClick={onGoToBookings}
            style={{
              background: '#0078D4',
              color: '#FFFFFF',
              border: 'none',
              borderRadius: '10px',
              padding: '12px 24px',
              fontSize: '14px',
              fontWeight: '700',
              cursor: 'pointer',
              boxShadow: '0 4px 12px rgba(0,120,212,0.25)'
            }}
          >
            View booking
          </button>

          <button
            onClick={() => alert('Calendar event (.ics) generated and added to schedule.')}
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
            <Calendar size={16} />
            Add to calendar
          </button>

          <button
            onClick={() => setShowInvoiceModal(true)}
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
            <FileText size={16} />
            Receipt (Single Invoice)
          </button>

          <button
            onClick={onNewBooking}
            style={{
              background: 'none',
              color: '#64748B',
              border: 'none',
              padding: '12px 16px',
              fontSize: '14px',
              fontWeight: '700',
              cursor: 'pointer',
              marginLeft: 'auto'
            }}
          >
            Book another ride ➔
          </button>
        </div>
      </div>

      {/* Unified Single Invoice Receipt Modal */}
      {showInvoiceModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: '20px' }}>
          <div className="glass-card" style={{ width: '100%', maxWidth: '580px', background: '#FFFFFF', padding: '32px', borderRadius: '18px', position: 'relative' }}>
            <button
              onClick={() => setShowInvoiceModal(false)}
              style={{ position: 'absolute', top: '20px', right: '20px', background: 'none', border: 'none', cursor: 'pointer', color: '#64748B' }}
            >
              <X size={20} />
            </button>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '2px solid #0F172A', paddingBottom: '16px', marginBottom: '20px' }}>
              <div>
                <h2 style={{ fontSize: '24px', fontWeight: '900', color: '#0F172A', letterSpacing: '-0.02em' }}>GLOBAL HUB</h2>
                <div style={{ fontSize: '11px', color: '#64748B', fontWeight: '700' }}>Global Ground Transportation Clearinghouse (Merchant of Record)</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '13px', fontWeight: '800', color: '#0078D4' }}>{state.invoiceNumber || 'INV-GH-2026-9041'}</div>
                <div style={{ fontSize: '11px', color: '#64748B' }}>Date: Oct 14, 2026</div>
              </div>
            </div>

            <div style={{ fontSize: '13px', marginBottom: '16px' }}>
              <strong style={{ display: 'block', color: '#0F172A' }}>Billed To:</strong>
              <div style={{ color: '#64748B' }}>{state.firstName ? `${state.firstName} ${state.lastName}` : 'Guest Passenger'} ({state.email || 'guest@limo-hub.com'})</div>
              <div style={{ color: '#64748B' }}>Reference: {state.bookingReference || 'LM-20481'}</div>
            </div>

            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', marginBottom: '20px' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #E2E8F0', textAlign: 'left', color: '#64748B' }}>
                  <th style={{ padding: '8px 0' }}>Description</th>
                  <th style={{ padding: '8px 0', textAlign: 'right' }}>Amount</th>
                </tr>
              </thead>
              <tbody>
                <tr style={{ borderBottom: '1px solid #F1F5F9' }}>
                  <td style={{ padding: '10px 0' }}>
                    Chauffeured Airport Transfer ({state.pickupAddress || 'JFK'} ➔ {state.dropoffAddress || 'Manhattan'})
                  </td>
                  <td style={{ padding: '10px 0', textAlign: 'right', fontWeight: '700' }}>${state.baseFare.toFixed(2)}</td>
                </tr>
                <tr style={{ borderBottom: '1px solid #F1F5F9' }}>
                  <td style={{ padding: '10px 0' }}>Taxes, Airport Fees & Flight Radar Surcharge</td>
                  <td style={{ padding: '10px 0', textAlign: 'right', fontWeight: '700' }}>${state.feesAndTaxes.toFixed(2)}</td>
                </tr>
                <tr style={{ borderTop: '2px solid #0F172A' }}>
                  <td style={{ padding: '12px 0', fontWeight: '800', fontSize: '15px' }}>Total Paid (USD)</td>
                  <td style={{ padding: '12px 0', textAlign: 'right', fontWeight: '800', fontSize: '18px', color: '#0078D4' }}>${state.totalFare.toFixed(2)}</td>
                </tr>
              </tbody>
            </table>

            <div style={{ padding: '12px', background: '#F8FAFC', borderRadius: '8px', fontSize: '11px', color: '#64748B', marginBottom: '20px' }}>
              Payment processed via Stripe Connect. Serviced by vetted partner affiliate under Global Hub Clearinghouse 80/10/10 Escrow Protocol.
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                onClick={() => window.print()}
                style={{ flex: 1, padding: '10px', borderRadius: '8px', border: '1px solid #CBD5E1', background: '#FFFFFF', fontWeight: '700', fontSize: '13px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', cursor: 'pointer' }}
              >
                <Printer size={16} /> Print Receipt
              </button>
              <button
                onClick={() => setShowInvoiceModal(false)}
                style={{ flex: 1, padding: '10px', borderRadius: '8px', border: 'none', background: '#0078D4', color: '#FFFFFF', fontWeight: '700', fontSize: '13px', cursor: 'pointer' }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
