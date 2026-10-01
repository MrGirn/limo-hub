import React, { useState, useEffect } from 'react';
import { Calendar, Users, Briefcase, FileText, CheckCircle2, Search, ArrowRight, ShieldCheck, MapPin, X, Clock } from 'lucide-react';
import { BookingState } from '../types';

interface Props {
  userEmail: string;
  onNewBooking: () => void;
  onOpenReceipt: (booking: any) => void;
}

export const MyBookingsHubView: React.FC<Props> = ({ userEmail, onNewBooking, onOpenReceipt }) => {
  const [activeTab, setActiveTab] = useState<'upcoming' | 'past' | 'cancelled'>('upcoming');
  const [selectedBooking, setSelectedBooking] = useState<any>(null);
  const [bookingsList, setBookingsList] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  
  // Guest lookup modal
  const [showGuestLookup, setShowGuestLookup] = useState(false);
  const [guestRefInput, setGuestRefInput] = useState('');
  const [guestEmailInput, setGuestEmailInput] = useState('');
  const [guestLookupError, setGuestLookupError] = useState<string | null>(null);

  useEffect(() => {
    fetchCustomerBookings(userEmail);
  }, [userEmail]);

  const fetchCustomerBookings = async (email?: string) => {
    setLoading(true);
    try {
      const url = email && email.trim()
        ? `/api/v1/global-hub/public/customer-bookings?email=${encodeURIComponent(email.trim())}`
        : `/api/v1/global-hub/public/customer-bookings`;
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        const bookings = data.bookings || [];
        setBookingsList(bookings);
        if (bookings.length > 0) {
          setSelectedBooking(bookings[0]);
        }
      }
    } catch (e) {
      console.error('Error fetching bookings', e);
    } finally {
      setLoading(false);
    }
  };

  const handleGuestLookup = async () => {
    if (!guestRefInput.trim()) return;
    setGuestLookupError(null);
    try {
      const url = `/api/v1/global-hub/public/booking/${encodeURIComponent(guestRefInput.trim())}${guestEmailInput ? `?email=${encodeURIComponent(guestEmailInput.trim())}` : ''}`;
      const res = await fetch(url);
      if (!res.ok) {
        throw new Error('Booking reference not found. Please check and try again.');
      }
      const data = await res.json();
      setSelectedBooking(data);
      setShowGuestLookup(false);
    } catch (err: any) {
      setGuestLookupError(err.message || 'Lookup failed.');
    }
  };

  const displayBookings = bookingsList;
  const currentSelected = selectedBooking || (displayBookings.length > 0 ? displayBookings[0] : null);

  return (
    <div style={{ maxWidth: '1180px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '28px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '32px', fontWeight: '800', color: '#0F172A', letterSpacing: '-0.02em' }}>
            My bookings
          </h1>
          <p style={{ fontSize: '15px', color: '#64748B', marginTop: '4px' }}>
            View and manage your chauffeur bookings.
          </p>
        </div>

        <button
          onClick={onNewBooking}
          style={{
            background: '#0078D4',
            color: '#FFFFFF',
            border: 'none',
            borderRadius: '12px',
            padding: '12px 24px',
            fontSize: '14px',
            fontWeight: '700',
            cursor: 'pointer',
            boxShadow: '0 4px 12px rgba(0,120,212,0.25)'
          }}
        >
          Book a ride
        </button>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '24px', borderBottom: '1.5px solid #E2E8F0', paddingBottom: '12px' }}>
        <button
          onClick={() => setActiveTab('upcoming')}
          style={{
            background: 'none',
            border: 'none',
            fontSize: '14px',
            fontWeight: activeTab === 'upcoming' ? '800' : '600',
            color: activeTab === 'upcoming' ? '#0078D4' : '#64748B',
            cursor: 'pointer',
            position: 'relative',
            paddingBottom: '6px'
          }}
        >
          Upcoming ({displayBookings.length})
          {activeTab === 'upcoming' && <div style={{ position: 'absolute', bottom: '-13px', left: 0, right: 0, height: '3px', background: '#0078D4', borderRadius: '3px' }} />}
        </button>

        <button
          onClick={() => setActiveTab('past')}
          style={{
            background: 'none',
            border: 'none',
            fontSize: '14px',
            fontWeight: activeTab === 'past' ? '800' : '600',
            color: activeTab === 'past' ? '#0078D4' : '#64748B',
            cursor: 'pointer'
          }}
        >
          Past
        </button>

        <button
          onClick={() => setActiveTab('cancelled')}
          style={{
            background: 'none',
            border: 'none',
            fontSize: '14px',
            fontWeight: activeTab === 'cancelled' ? '800' : '600',
            color: activeTab === 'cancelled' ? '#0078D4' : '#64748B',
            cursor: 'pointer'
          }}
        >
          Cancelled
        </button>
      </div>

      {/* Main Grid: Left Bookings List + Right Selected Trip Summary */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '28px', alignItems: 'start' }}>
        {/* Left Bookings List */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {displayBookings.map((b) => {
            const isSelected = currentSelected?.booking_reference === b.booking_reference;
            return (
              <div
                key={b.booking_reference}
                onClick={() => setSelectedBooking(b)}
                className="glass-card"
                style={{
                  padding: '22px',
                  background: '#FFFFFF',
                  borderRadius: '16px',
                  border: isSelected ? '2px solid #0078D4' : '1.5px solid #E2E8F0',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: '#DCFCE7', color: '#15803D', padding: '3px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: '800' }}>
                    ● {b.status || 'Confirmed'}
                  </span>
                  <span style={{ fontSize: '12px', fontWeight: '700', color: '#64748B' }}>
                    Booking #{b.booking_reference}
                  </span>
                </div>

                <h3 style={{ fontSize: '17px', fontWeight: '800', color: '#0F172A', marginBottom: '6px' }}>
                  {b.pickup_address?.split(',')[0]} ➔ {b.dropoff_address?.split(',')[0]}
                </h3>

                <div style={{ fontSize: '13px', color: '#64748B', fontWeight: '600', marginBottom: '12px' }}>
                  📅 {b.pickup_datetime_str} • 👤 {b.passengers_count} passengers
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '12px', borderTop: '1px solid #F1F5F9' }}>
                  <div>
                    <div style={{ fontSize: '12px', fontWeight: '700', color: '#0F172A' }}>{b.vehicle_model_name || 'Business Class'}</div>
                    <div style={{ fontSize: '11px', color: '#64748B' }}>Assigned: {b.assigned_vendor_name || 'Manhattan Prestige'}</div>
                  </div>

                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '18px', fontWeight: '800', color: '#0078D4' }}>${b.total_amount_usd?.toFixed(2)}</div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedBooking(b);
                      }}
                      style={{
                        background: '#0078D4',
                        color: '#FFFFFF',
                        border: 'none',
                        borderRadius: '8px',
                        padding: '6px 14px',
                        fontSize: '12px',
                        fontWeight: '700',
                        cursor: 'pointer',
                        marginTop: '4px'
                      }}
                    >
                      View booking
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Right Active Selected Booking Detail */}
        {currentSelected && (
          <div className="glass-card" style={{ padding: '24px', background: '#FFFFFF', borderRadius: '16px', position: 'sticky', top: '80px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div>
                <div style={{ fontSize: '11px', fontWeight: '800', color: '#64748B' }}>YOUR NEXT RIDE</div>
                <div style={{ fontSize: '20px', fontWeight: '800', color: '#0F172A' }}>Booking reference</div>
                <div style={{ fontSize: '18px', fontWeight: '800', color: '#0078D4' }}>{currentSelected.booking_reference}</div>
              </div>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', background: '#DCFCE7', color: '#15803D', padding: '4px 10px', borderRadius: '20px', fontSize: '12px', fontWeight: '800' }}>
                ✓ {currentSelected.status || 'Confirmed'}
              </span>
            </div>

            {/* Route Milestones */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', padding: '16px', background: '#F8FAFC', borderRadius: '12px', border: '1px solid #E2E8F0', marginBottom: '16px', fontSize: '13px' }}>
              <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#0078D4', marginTop: '4px' }} />
                <div>
                  <div style={{ fontSize: '11px', color: '#64748B', fontWeight: '700' }}>PICKUP</div>
                  <strong style={{ color: '#0F172A' }}>{currentSelected.pickup_address}</strong>
                  <div style={{ color: '#64748B', fontSize: '12px' }}>{currentSelected.pickup_datetime_str}</div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#10B981', marginTop: '4px' }} />
                <div>
                  <div style={{ fontSize: '11px', color: '#64748B', fontWeight: '700' }}>DROP-OFF</div>
                  <strong style={{ color: '#0F172A' }}>{currentSelected.dropoff_address}</strong>
                </div>
              </div>
            </div>

            {/* Specs */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px', fontSize: '13px' }}>
              <div>
                <div style={{ fontSize: '11px', color: '#64748B', fontWeight: '700' }}>PASSENGERS</div>
                <div style={{ fontWeight: '700', color: '#0F172A' }}>👤 {currentSelected.passengers_count} passengers</div>
              </div>
              <div>
                <div style={{ fontSize: '11px', color: '#64748B', fontWeight: '700' }}>TOTAL AMOUNT</div>
                <div style={{ fontWeight: '800', color: '#0F172A', fontSize: '16px' }}>${currentSelected.total_amount_usd?.toFixed(2)} USD</div>
              </div>
            </div>

            {/* Action buttons */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <button
                onClick={() => alert('Booking management options: change passenger details, flight number, or special requests.')}
                style={{ width: '100%', background: '#0078D4', color: '#FFFFFF', border: 'none', borderRadius: '10px', padding: '12px', fontSize: '14px', fontWeight: '700', cursor: 'pointer' }}
              >
                Manage booking
              </button>

              <button
                onClick={() => alert('Calendar event (.ics) updated.')}
                style={{ width: '100%', background: '#FFFFFF', color: '#0F172A', border: '1.5px solid #CBD5E1', borderRadius: '10px', padding: '10px', fontSize: '13px', fontWeight: '700', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', cursor: 'pointer' }}
              >
                <Calendar size={15} /> Add to calendar
              </button>

              <button
                onClick={() => onOpenReceipt(currentSelected)}
                style={{ width: '100%', background: '#FFFFFF', color: '#0F172A', border: '1.5px solid #CBD5E1', borderRadius: '10px', padding: '10px', fontSize: '13px', fontWeight: '700', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', cursor: 'pointer' }}
              >
                <FileText size={15} /> Receipt (Single Invoice)
              </button>
            </div>

            <div style={{ marginTop: '14px', fontSize: '11px', color: '#64748B', textAlign: 'center' }}>
              ℹ️ Chauffeur details appear before pickup.
            </div>
          </div>
        )}
      </div>

      {/* Booked as a guest? Find a booking footer card */}
      <div
        onClick={() => setShowGuestLookup(true)}
        className="glass-card"
        style={{
          padding: '20px 28px',
          background: '#FFFFFF',
          borderRadius: '16px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          cursor: 'pointer',
          border: '1px solid #E2E8F0'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ width: '42px', height: '42px', borderRadius: '50%', background: '#F1F5F9', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Search size={20} color="#0078D4" />
          </div>
          <div>
            <h4 style={{ fontSize: '16px', fontWeight: '800', color: '#0F172A' }}>Booked as a guest?</h4>
            <p style={{ fontSize: '13px', color: '#64748B' }}>Find your booking using your email and reference number.</p>
          </div>
        </div>

        <div style={{ color: '#0078D4', fontSize: '14px', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '6px' }}>
          Find a booking
          <ArrowRight size={16} />
        </div>
      </div>

      {/* Guest Lookup Modal */}
      {showGuestLookup && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: '20px' }}>
          <div className="glass-card" style={{ width: '100%', maxWidth: '440px', background: '#FFFFFF', padding: '28px', borderRadius: '18px', position: 'relative' }}>
            <button
              onClick={() => setShowGuestLookup(false)}
              style={{ position: 'absolute', top: '18px', right: '18px', background: 'none', border: 'none', cursor: 'pointer', color: '#64748B' }}
            >
              <X size={20} />
            </button>

            <h3 style={{ fontSize: '20px', fontWeight: '800', color: '#0F172A', marginBottom: '8px' }}>
              Find your booking
            </h3>
            <p style={{ fontSize: '13px', color: '#64748B', marginBottom: '18px' }}>
              Enter the reference number from your confirmation email.
            </p>

            <div style={{ marginBottom: '14px' }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#334155', marginBottom: '4px' }}>
                Booking reference
              </label>
              <input
                type="text"
                placeholder="e.g. LM-20481"
                value={guestRefInput}
                onChange={(e) => setGuestRefInput(e.target.value)}
                style={{ width: '100%', padding: '12px', borderRadius: '10px', border: '1.5px solid #E2E8F0', fontSize: '14px' }}
              />
            </div>

            <div style={{ marginBottom: '18px' }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#334155', marginBottom: '4px' }}>
                Email address (optional)
              </label>
              <input
                type="email"
                placeholder="alex.chen@example.com"
                value={guestEmailInput}
                onChange={(e) => setGuestEmailInput(e.target.value)}
                style={{ width: '100%', padding: '12px', borderRadius: '10px', border: '1.5px solid #E2E8F0', fontSize: '14px' }}
              />
            </div>

            {guestLookupError && (
              <div style={{ marginBottom: '14px', padding: '8px 12px', background: '#FEE2E2', color: '#B91C1C', borderRadius: '8px', fontSize: '12px' }}>
                {guestLookupError}
              </div>
            )}

            <button
              onClick={handleGuestLookup}
              style={{ width: '100%', background: '#0078D4', color: '#FFFFFF', border: 'none', borderRadius: '10px', padding: '12px', fontSize: '14px', fontWeight: '700', cursor: 'pointer' }}
            >
              Search reservation
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
