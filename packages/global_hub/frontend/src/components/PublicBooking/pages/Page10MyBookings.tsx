import React, { useState, useEffect } from 'react';
import { 
  Calendar as CalendarIcon, 
  Users, 
  Briefcase, 
  Search, 
  ArrowRight, 
  FileText, 
  ChevronDown, 
  Check, 
  Printer, 
  X,
  MapPin,
  Car
} from 'lucide-react';
import { BookingState } from '../types';

interface Props {
  userEmail?: string;
  onNewBookingClick: () => void;
  onTrackRideClick: (bookingRef: string) => void;
  onOpenSignIn?: () => void;
  onOpenHelp?: () => void;
  onHomeClick?: () => void;
}

export const Page10MyBookings: React.FC<Props> = ({
  userEmail = '',
  onNewBookingClick,
  onTrackRideClick,
  onOpenSignIn,
  onOpenHelp,
  onHomeClick
}) => {
  const [activeTab, setActiveTab] = useState<'upcoming' | 'past' | 'cancelled'>('upcoming');
  const [selectedBookingIndex, setSelectedBookingIndex] = useState<number>(0);
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [showFindBookingModal, setShowFindBookingModal] = useState(false);
  const [searchRef, setSearchRef] = useState('');
  const [searchEmail, setSearchEmail] = useState('');
  const [liveBookings, setLiveBookings] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    const fetchLiveBookings = async () => {
      setIsLoading(true);
      try {
        const url = userEmail && userEmail.trim() 
          ? `/api/v1/global-hub/public/customer-bookings?email=${encodeURIComponent(userEmail.trim())}`
          : `/api/v1/global-hub/public/customer-bookings`;
        const res = await fetch(url);
        if (res.ok) {
          const data = await res.json();
          if (data.bookings && Array.isArray(data.bookings)) {
            setLiveBookings(data.bookings.map((b: any) => ({
              reference: b.booking_reference,
              status: b.status,
              passengerName: b.passenger_name || 'Passenger',
              passengerEmail: b.passenger_email || userEmail,
              pickup: b.pickup_address.split(',')[0],
              pickupSub: b.pickup_address,
              dropoff: b.dropoff_address.split(',')[0],
              dropoffSub: b.dropoff_address,
              dateTime: b.pickup_datetime_str,
              dateTimeShort: b.pickup_datetime_str,
              vehicleClass: b.vehicle_class === 'BUSINESS_CLASS' ? 'Business Class' : b.vehicle_class === 'FIRST_CLASS' ? 'First Class' : 'Business Van',
              vehicleModel: b.vehicle_model_name || (b.vehicle_class === 'BUSINESS_VAN' ? 'Mercedes-Benz V-Class' : b.vehicle_class === 'FIRST_CLASS' ? 'Cadillac Escalade ESV' : 'Mercedes-Benz S-Class'),
              passengers: b.passengers_count || 2,
              bags: b.vehicle_class === 'BUSINESS_VAN' ? 6 : 2,
              total: b.total_amount_usd,
              baseFare: b.base_fare_usd || (b.total_amount_usd * 0.85),
              feesAndTaxes: b.fees_and_taxes_usd || (b.total_amount_usd * 0.15),
              assignedVendorName: b.assigned_vendor_name,
              assignedChauffeurName: b.assigned_chauffeur_name,
              assignedChauffeurPhone: b.assigned_chauffeur_phone,
              assignedVehiclePlate: b.assigned_vehicle_plate,
              image: b.vehicle_class === 'BUSINESS_VAN' 
                ? 'https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?w=600&auto=format&fit=crop&q=80'
                : 'https://images.unsplash.com/photo-1563720223185-11003d516935?w=600&auto=format&fit=crop&q=80',
              invoiceNumber: b.invoice_number || 'INV-GH-2026-9041'
            })));
          }
        }
      } catch (err) {
        console.warn('Live bookings fetch error:', err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchLiveBookings();
  }, [userEmail]);

  const allBookings = liveBookings;

  const filteredBookings = allBookings.filter((b) => {
    const isCancelled = b.status?.toUpperCase() === 'CANCELLED';
    const isCompleted = b.status?.toUpperCase() === 'COMPLETED';
    if (activeTab === 'cancelled') return isCancelled;
    if (activeTab === 'past') return isCompleted;
    return !isCancelled && !isCompleted;
  });

  const upcomingCount = allBookings.filter((b) => b.status?.toUpperCase() !== 'CANCELLED' && b.status?.toUpperCase() !== 'COMPLETED').length;
  const currentBooking = filteredBookings[selectedBookingIndex] || filteredBookings[0] || null;



  return (
    <div style={{ minHeight: '100vh', background: '#FFFFFF', color: '#111827', display: 'flex', flexDirection: 'column', fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>
      {/* Header with blue active indicator on 'My bookings' */}
      <header style={{
        height: '64px',
        background: '#FFFFFF',
        borderBottom: '1px solid #E5E7EB',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 40px',
        position: 'sticky',
        top: 0,
        zIndex: 50
      }}>
        <div
          onClick={onHomeClick}
          style={{ fontSize: '24px', fontWeight: '900', letterSpacing: '-0.04em', color: '#000000', cursor: 'pointer' }}
        >
          LIMO
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '28px', fontSize: '13px', fontWeight: '600' }}>
          <span style={{ color: '#1D68FE', position: 'relative', cursor: 'pointer', paddingBottom: '4px' }}>
            My bookings
            <div style={{ position: 'absolute', bottom: '-22px', left: 0, right: 0, height: '2.5px', background: '#1D68FE' }} />
          </span>

          <span onClick={onOpenHelp} style={{ color: '#4B5563', cursor: 'pointer' }}>
            Help
          </span>

          <span onClick={onOpenSignIn} style={{ color: '#4B5563', cursor: 'pointer' }}>
            Sign in
          </span>

          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer', color: '#4B5563' }}>
            <span>EN / USD</span>
            <ChevronDown size={14} />
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main style={{ maxWidth: '1180px', margin: '0 auto', width: '100%', padding: '36px 24px 60px 24px', flex: 1 }}>
        {/* Title Header with 'Book a ride' CTA */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
          <div>
            <h1 style={{ fontSize: '38px', fontWeight: '900', color: '#000000', letterSpacing: '-0.03em', margin: 0 }}>
              My bookings
            </h1>
            <p style={{ fontSize: '15px', color: '#6B7280', margin: '6px 0 0 0' }}>
              View and manage your chauffeur bookings.
            </p>
          </div>

          <button
            onClick={onNewBookingClick}
            style={{
              background: '#1D68FE',
              color: '#FFFFFF',
              border: 'none',
              borderRadius: '8px',
              padding: '12px 24px',
              fontSize: '14px',
              fontWeight: '700',
              cursor: 'pointer',
              boxShadow: '0 2px 8px rgba(29, 104, 254, 0.25)'
            }}
          >
            Book a ride
          </button>
        </div>

        {/* Tabs: Upcoming (2), Past, Cancelled */}
        <div style={{ display: 'flex', gap: '28px', borderBottom: '1px solid #E5E7EB', paddingBottom: '12px', marginBottom: '28px' }}>
          <button
            onClick={() => { setActiveTab('upcoming'); setSelectedBookingIndex(0); }}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '14px',
              fontWeight: activeTab === 'upcoming' ? '700' : '500',
              color: activeTab === 'upcoming' ? '#1D68FE' : '#6B7280',
              cursor: 'pointer',
              position: 'relative',
              paddingBottom: '8px'
            }}
          >
            Upcoming ({upcomingCount})
            {activeTab === 'upcoming' && <div style={{ position: 'absolute', bottom: '-13px', left: 0, right: 0, height: '2.5px', background: '#1D68FE' }} />}
          </button>

          <button
            onClick={() => { setActiveTab('past'); setSelectedBookingIndex(0); }}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '14px',
              fontWeight: activeTab === 'past' ? '700' : '500',
              color: activeTab === 'past' ? '#1D68FE' : '#6B7280',
              cursor: 'pointer',
              paddingBottom: '8px'
            }}
          >
            Past
          </button>

          <button
            onClick={() => { setActiveTab('cancelled'); setSelectedBookingIndex(0); }}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '14px',
              fontWeight: activeTab === 'cancelled' ? '700' : '500',
              color: activeTab === 'cancelled' ? '#1D68FE' : '#6B7280',
              cursor: 'pointer',
              paddingBottom: '8px'
            }}
          >
            Cancelled
          </button>
        </div>

        {/* Grid Layout: Left List + Right Detail Sidebar */}
        <div style={{ display: 'grid', gridTemplateColumns: '1.45fr 1fr', gap: '32px', alignItems: 'start' }}>
          {/* Left Column: Booking Cards */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {filteredBookings.length === 0 ? (
              <div style={{ padding: '32px', textAlign: 'center', background: '#F9FAFB', borderRadius: '12px', color: '#6B7280', fontSize: '14px' }}>
                No {activeTab} bookings found.
              </div>
            ) : (
              filteredBookings.map((b, idx) => {
                const isSelected = selectedBookingIndex === idx;

              return (
                <div
                  key={b.reference}
                  onClick={() => setSelectedBookingIndex(idx)}
                  style={{
                    border: isSelected ? '2px solid #1D68FE' : '1px solid #E5E7EB',
                    borderRadius: '12px',
                    background: '#FFFFFF',
                    padding: '20px',
                    cursor: 'pointer',
                    display: 'grid',
                    gridTemplateColumns: '200px 1fr',
                    gap: '20px',
                    transition: 'all 0.15s ease',
                    boxShadow: isSelected ? '0 4px 16px rgba(29, 104, 254, 0.08)' : 'none'
                  }}
                >
                  {/* Left Vehicle Image */}
                  <div style={{
                    height: '140px',
                    borderRadius: '8px',
                    overflow: 'hidden',
                    background: '#F3F4F6'
                  }}>
                    <img
                      src={b.image}
                      alt={b.vehicleClass}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                  </div>

                  {/* Right Content */}
                  <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                    <div>
                      {/* Top status + booking ref */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                        <span style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          background: '#DCFCE7',
                          color: '#15803D',
                          fontSize: '11px',
                          fontWeight: '700',
                          padding: '3px 8px',
                          borderRadius: '6px'
                        }}>
                          <Check size={12} strokeWidth={3} /> {b.status}
                        </span>
                        <span style={{ fontSize: '12px', color: '#6B7280', fontWeight: '500' }}>
                          Booking #{b.reference}
                        </span>
                      </div>

                      {/* Route Title */}
                      <h3 style={{ fontSize: '18px', fontWeight: '800', color: '#000000', margin: '0 0 6px 0' }}>
                        {b.pickup} ➔ {b.dropoff}
                      </h3>

                      {/* Date & Passengers */}
                      <div style={{ display: 'flex', gap: '16px', fontSize: '12px', color: '#4B5563' }}>
                        <span>📅 {b.dateTimeShort}</span>
                        <span>👥 {b.passengers} passengers</span>
                        <span>💼 {b.bags} bags</span>
                      </div>
                    </div>

                    {/* Bottom Row: Vehicle class + Total + View Booking */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: '14px', paddingTop: '10px', borderTop: '1px solid #F3F4F6' }}>
                      <div>
                        <div style={{ fontSize: '13px', fontWeight: '700', color: '#000000' }}>{b.vehicleClass}</div>
                        <div style={{ fontSize: '11px', color: '#6B7280' }}>{b.vehicleModel}</div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                        <div>
                          <div style={{ fontSize: '10px', color: '#6B7280', fontWeight: '500' }}>Total</div>
                          <div style={{ fontSize: '20px', fontWeight: '800', color: '#000000' }}>${b.total}</div>
                        </div>

                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onTrackRideClick(b.reference);
                          }}
                          style={{
                            background: '#1D68FE',
                            color: '#FFFFFF',
                            border: 'none',
                            borderRadius: '8px',
                            padding: '9px 18px',
                            fontSize: '13px',
                            fontWeight: '700',
                            cursor: 'pointer'
                          }}
                        >
                          View booking
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            }))}

            {/* Booked as a guest banner */}
            <div
              onClick={() => setShowFindBookingModal(true)}
              style={{
                background: '#F9FAFB',
                border: '1px solid #E5E7EB',
                borderRadius: '12px',
                padding: '18px 22px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                cursor: 'pointer'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                <div style={{ width: '38px', height: '38px', borderRadius: '50%', background: '#FFFFFF', border: '1px solid #E5E7EB', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Search size={18} color="#000000" />
                </div>
                <div>
                  <h4 style={{ fontSize: '14px', fontWeight: '700', color: '#000000', margin: 0 }}>Booked as a guest?</h4>
                  <p style={{ fontSize: '12px', color: '#6B7280', margin: '2px 0 0 0' }}>Find your booking using your email and reference number.</p>
                </div>
              </div>

              <div style={{ color: '#1D68FE', fontSize: '13px', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '4px' }}>
                Find a booking <ArrowRight size={14} />
              </div>
            </div>
          </div>

          {/* Right Column: "Your next ride" Sticky Summary Card */}
          {currentBooking ? (
            <div style={{
              background: '#FFFFFF',
              border: '1px solid #E5E7EB',
              borderRadius: '12px',
              padding: '24px',
              position: 'sticky',
              top: '84px',
              boxShadow: '0 4px 16px rgba(0,0,0,0.03)'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <h3 style={{ fontSize: '18px', fontWeight: '800', color: '#000000', margin: 0 }}>Your ride</h3>
                <span style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  background: currentBooking.status === 'CONFIRMED' ? '#DCFCE7' : '#F1F5F9',
                  color: currentBooking.status === 'CONFIRMED' ? '#15803D' : '#475569',
                  fontSize: '11px',
                  fontWeight: '700',
                  padding: '3px 8px',
                  borderRadius: '6px'
                }}>
                  <Check size={12} strokeWidth={3} /> {currentBooking.status}
                </span>
              </div>

              <div style={{ fontSize: '12px', color: '#6B7280', marginBottom: '2px' }}>Booking reference</div>
              <div style={{ fontSize: '20px', fontWeight: '900', color: '#000000', letterSpacing: '-0.02em', marginBottom: '20px' }}>
                {currentBooking.reference}
              </div>

              {/* Detailed Route Milestones */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', paddingBottom: '18px', borderBottom: '1px solid #F3F4F6' }}>
                {/* Pickup */}
                <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                  <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#1D68FE', marginTop: '4px' }} />
                  <div>
                    <div style={{ fontSize: '14px', fontWeight: '800', color: '#000000' }}>{currentBooking.pickup}</div>
                    <div style={{ fontSize: '11px', color: '#6B7280', whiteSpace: 'pre-line', lineHeight: '1.3', marginTop: '2px' }}>
                      {currentBooking.pickupSub}
                    </div>
                    <div style={{ fontSize: '11px', color: '#4B5563', fontWeight: '600', marginTop: '4px' }}>
                      {currentBooking.dateTime}
                    </div>
                  </div>
                </div>

                {/* Dropoff */}
                <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                  <div style={{ width: '8px', height: '8px', borderRadius: '50%', border: '2px solid #000000', background: '#FFFFFF', marginTop: '4px' }} />
                  <div>
                    <div style={{ fontSize: '14px', fontWeight: '800', color: '#000000' }}>{currentBooking.dropoff}</div>
                    <div style={{ fontSize: '11px', color: '#6B7280', whiteSpace: 'pre-line', lineHeight: '1.3', marginTop: '2px' }}>
                      {currentBooking.dropoffSub}
                    </div>
                  </div>
                </div>
              </div>

              {/* Meta specs */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', padding: '16px 0', borderBottom: '1px solid #F3F4F6', fontSize: '13px', color: '#374151' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <Users size={15} color="#6B7280" />
                  <span>{currentBooking.passengers} passengers</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <Briefcase size={15} color="#6B7280" />
                  <span>{currentBooking.bags} bags</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <Car size={15} color="#6B7280" />
                  <div>
                    <div style={{ fontWeight: '700', color: '#000000' }}>{currentBooking.vehicleClass}</div>
                    <div style={{ fontSize: '11px', color: '#6B7280' }}>{currentBooking.vehicleModel}</div>
                  </div>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '6px' }}>
                  <span style={{ fontSize: '13px', fontWeight: '500', color: '#6B7280' }}>Total</span>
                  <span style={{ fontSize: '20px', fontWeight: '800', color: '#000000' }}>${typeof currentBooking.total === 'number' ? currentBooking.total.toFixed(2) : currentBooking.total}</span>
                </div>
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '18px' }}>
                <button
                  onClick={() => onTrackRideClick(currentBooking.reference)}
                  style={{
                    width: '100%',
                    background: '#1D68FE',
                    color: '#FFFFFF',
                    border: 'none',
                    borderRadius: '8px',
                    padding: '12px',
                    fontSize: '14px',
                    fontWeight: '700',
                    cursor: 'pointer'
                  }}
                >
                  Manage booking
                </button>

                <button
                  onClick={() => alert('Calendar invite added.')}
                  style={{
                    width: '100%',
                    background: '#FFFFFF',
                    color: '#111827',
                    border: '1px solid #D1D5DB',
                    borderRadius: '8px',
                    padding: '11px',
                    fontSize: '13px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px'
                  }}
                >
                  <CalendarIcon size={14} /> Add to calendar
                </button>

                <button
                  onClick={() => setShowReceiptModal(true)}
                  style={{
                    width: '100%',
                    background: '#FFFFFF',
                    color: '#111827',
                    border: '1px solid #D1D5DB',
                    borderRadius: '8px',
                    padding: '11px',
                    fontSize: '13px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px'
                  }}
                >
                  <FileText size={14} /> Receipt
                </button>
              </div>

              <div style={{ fontSize: '11px', color: '#6B7280', marginTop: '14px', textAlign: 'center' }}>
                ℹ Certified chauffeur details dispatched before departure.
              </div>
            </div>
          ) : (
            <div style={{
              background: '#F9FAFB',
              border: '1px dashed #D1D5DB',
              borderRadius: '12px',
              padding: '32px 24px',
              textAlign: 'center',
              color: '#6B7280'
            }}>
              <Car size={32} style={{ margin: '0 auto 12px auto', color: '#9CA3AF' }} />
              <div style={{ fontWeight: '700', color: '#111827', marginBottom: '4px' }}>No booking selected</div>
              <div style={{ fontSize: '12px', marginBottom: '16px' }}>Book a new chauffeured transfer or find an existing reservation.</div>
              <button
                onClick={onNewBookingClick}
                style={{
                  background: '#1D68FE',
                  color: '#FFFFFF',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '10px 18px',
                  fontSize: '13px',
                  fontWeight: '700',
                  cursor: 'pointer'
                }}
              >
                Book a ride
              </button>
            </div>
          )}
        </div>
      </main>

      {/* Find Booking Guest Modal */}
      {showFindBookingModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: '20px' }}>
          <div style={{ width: '100%', maxWidth: '420px', background: '#FFFFFF', padding: '28px', borderRadius: '16px', position: 'relative' }}>
            <button onClick={() => setShowFindBookingModal(false)} style={{ position: 'absolute', top: '16px', right: '16px', background: 'none', border: 'none', cursor: 'pointer' }}><X size={18} /></button>
            <h3 style={{ fontSize: '18px', fontWeight: '800', margin: '0 0 6px 0' }}>Find a booking</h3>
            <p style={{ fontSize: '12px', color: '#6B7280', margin: '0 0 16px 0' }}>Enter reference and email from confirmation message.</p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <input
                type="text"
                placeholder="Booking reference (e.g. LM-20481)"
                value={searchRef}
                onChange={(e) => setSearchRef(e.target.value)}
                style={{ width: '100%', padding: '11px 12px', borderRadius: '8px', border: '1px solid #D1D5DB', fontSize: '13px', boxSizing: 'border-box' }}
              />
              <input
                type="email"
                placeholder="Email address"
                value={searchEmail}
                onChange={(e) => setSearchEmail(e.target.value)}
                style={{ width: '100%', padding: '11px 12px', borderRadius: '8px', border: '1px solid #D1D5DB', fontSize: '13px', boxSizing: 'border-box' }}
              />
              <button
                onClick={() => {
                  setShowFindBookingModal(false);
                  if (searchRef.trim()) {
                    onTrackRideClick(searchRef.trim());
                  }
                }}
                style={{ width: '100%', padding: '12px', borderRadius: '8px', border: 'none', background: '#1D68FE', color: '#FFFFFF', fontWeight: '700', fontSize: '13px', cursor: 'pointer' }}
              >
                Find ride
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Single Invoice Receipt Modal */}
      {showReceiptModal && currentBooking && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: '20px' }}>
          <div style={{ width: '100%', maxWidth: '520px', background: '#FFFFFF', padding: '32px', borderRadius: '16px', position: 'relative' }}>
            <button onClick={() => setShowReceiptModal(false)} style={{ position: 'absolute', top: '16px', right: '16px', background: 'none', border: 'none', cursor: 'pointer' }}><X size={18} /></button>

            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '2px solid #000000', paddingBottom: '12px', marginBottom: '16px' }}>
              <div>
                <div style={{ fontSize: '20px', fontWeight: '900' }}>LIMO</div>
                <div style={{ fontSize: '11px', color: '#6B7280' }}>Global Hub Clearinghouse (Merchant of Record)</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '13px', fontWeight: '700', color: '#1D68FE' }}>{currentBooking.invoiceNumber || 'INV-GH-2026-9041'}</div>
                <div style={{ fontSize: '11px', color: '#6B7280' }}>{currentBooking.dateTimeShort || 'Oct 14, 2026'}</div>
              </div>
            </div>

            <div style={{ fontSize: '13px', marginBottom: '14px' }}>
              <strong>Billed To:</strong> {currentBooking.passengerName || 'Passenger'} ({currentBooking.passengerEmail || userEmail || 'guest@limo-hub.com'}) • Ref: {currentBooking.reference}
            </div>

            {currentBooking.assignedVendorName && (
              <div style={{ fontSize: '12px', color: '#4B5563', marginBottom: '14px', background: '#F9FAFB', padding: '8px 12px', borderRadius: '6px' }}>
                <strong>Servicing Affiliate:</strong> {currentBooking.assignedVendorName}
              </div>
            )}

            <table style={{ width: '100%', fontSize: '13px', borderCollapse: 'collapse', marginBottom: '16px' }}>
              <tbody>
                <tr style={{ borderBottom: '1px solid #F3F4F6' }}>
                  <td style={{ padding: '8px 0' }}>Chauffeured Transfer ({currentBooking.pickup} ➔ {currentBooking.dropoff})</td>
                  <td style={{ textAlign: 'right', fontWeight: '600' }}>${typeof currentBooking.baseFare === 'number' ? currentBooking.baseFare.toFixed(2) : (currentBooking.total * 0.85).toFixed(2)}</td>
                </tr>
                <tr style={{ borderBottom: '1px solid #F3F4F6' }}>
                  <td style={{ padding: '8px 0' }}>Taxes, Airport Fees & Surcharges</td>
                  <td style={{ textAlign: 'right', fontWeight: '600' }}>${typeof currentBooking.feesAndTaxes === 'number' ? currentBooking.feesAndTaxes.toFixed(2) : (currentBooking.total * 0.15).toFixed(2)}</td>
                </tr>
                <tr style={{ borderTop: '2px solid #000000' }}>
                  <td style={{ padding: '10px 0', fontWeight: '800' }}>Total Paid (USD)</td>
                  <td style={{ textAlign: 'right', fontWeight: '800', fontSize: '16px', color: '#1D68FE' }}>${typeof currentBooking.total === 'number' ? currentBooking.total.toFixed(2) : currentBooking.total}</td>
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

      {/* Footer matching Desktop Concept */}
      <footer style={{
        height: '60px',
        background: '#FFFFFF',
        borderTop: '1px solid #E5E7EB',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 40px',
        fontSize: '12px',
        color: '#6B7280',
        marginTop: 'auto'
      }}>
        <div style={{ fontSize: '16px', fontWeight: '900', color: '#000000', letterSpacing: '-0.04em' }}>
          LIMO
        </div>

        <div style={{ color: '#9CA3AF', fontSize: '11px' }}>
          My bookings • Desktop concept • Illustrative details
        </div>

        <div style={{ display: 'flex', gap: '20px' }}>
          <a href="#help" onClick={onOpenHelp} style={{ color: '#6B7280', textDecoration: 'none' }}>Help</a>
          <a href="#contact" onClick={onOpenHelp} style={{ color: '#6B7280', textDecoration: 'none' }}>Contact</a>
          <a href="#terms" style={{ color: '#6B7280', textDecoration: 'none' }}>Terms</a>
          <a href="#privacy" style={{ color: '#6B7280', textDecoration: 'none' }}>Privacy</a>
        </div>
      </footer>
    </div>
  );
};
