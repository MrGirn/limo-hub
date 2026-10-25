import React, { useState, useEffect } from 'react';
import { 
  MessageSquare, 
  Phone, 
  Edit, 
  XCircle, 
  FileText, 
  Star, 
  Plane, 
  MapPin, 
  ChevronDown, 
  Plus, 
  Minus,
  Check,
  X,
  Send,
  Loader2,
  Calendar,
  Printer
} from 'lucide-react';
import { SharedBookingHeader } from './SharedBookingHeader';

interface Props {
  bookingRef?: string;
  onBackToMyBookings: () => void;
  onOpenHelp: () => void;
  onOpenSignIn: () => void;
  onHomeClick: () => void;
}

export const LiveRideTelemetryPage: React.FC<Props> = ({
  bookingRef = 'LM-20481',
  onBackToMyBookings,
  onOpenHelp,
  onOpenSignIn,
  onHomeClick
}) => {
  const [zoomLevel, setZoomLevel] = useState(1);
  const [telemetry, setTelemetry] = useState<any>({
    driver_name: 'Marcus Vance',
    driver_phone: '+1 (215) 555-0144',
    driver_rating: 4.95,
    vehicle_model: 'Lincoln Navigator L',
    vehicle_plate: 'PA 8492-LM',
    eta_minutes: 8,
    status: 'EN_ROUTE_PICKUP'
  });
  const [booking, setBooking] = useState<any>({
    pickup: 'Philadelphia International Airport (PHL)',
    dropoff: 'John F. Kennedy International Airport (JFK)',
    datetime: 'Oct 18, 2026 at 8:30 AM',
    vehicleClass: 'Business Class',
    passengers: 2,
    total: 145.0,
    baseFare: 125.0,
    feesAndTaxes: 20.0,
    passengerName: 'David Singh',
    passengerEmail: 'david.singh@phltest.com',
    vendorName: 'ANB Trans Inc (Philadelphia)',
    invoiceNumber: 'INV-GH-2026-9041'
  });

  const [showEditModal, setShowEditModal] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [showChatModal, setShowChatModal] = useState(false);
  const [showReceiptModal, setShowReceiptModal] = useState(false);

  const [cancelReason, setCancelReason] = useState('Travel plans changed');
  const [customCancelNote, setCustomCancelNote] = useState('');
  const [isCancelling, setIsCancelling] = useState(false);

  const [editDateTime, setEditDateTime] = useState('');
  const [editFlight, setEditFlight] = useState('');
  const [editNotes, setEditNotes] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);

  const [chatMessages, setChatMessages] = useState<any[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [isSendingMsg, setIsSendingMsg] = useState(false);

  const fetchRideData = async () => {
    try {
      const [telRes, bkgRes] = await Promise.all([
        fetch(`/api/v1/global-hub/telemetry/${bookingRef}`),
        fetch(`/api/v1/global-hub/public/booking/${bookingRef}`)
      ]);

      if (telRes.ok) {
        const telData = await telRes.json();
        setTelemetry((prev: any) => ({
          ...prev,
          driver_name: telData.chauffeur?.name || telData.driver_name || prev.driver_name,
          driver_phone: telData.chauffeur?.phone || telData.driver_phone || prev.driver_phone,
          driver_rating: telData.chauffeur?.rating || telData.driver_rating || prev.driver_rating,
          vehicle_model: telData.vehicle?.name || telData.vehicle_model || prev.vehicle_model,
          vehicle_plate: telData.vehicle?.plate || telData.vehicle_plate || prev.vehicle_plate,
          eta_minutes: telData.live_location?.eta_minutes ?? telData.eta_minutes ?? prev.eta_minutes,
          status: telData.status || prev.status
        }));
      }

      if (bkgRes.ok) {
        const bkgData = await bkgRes.json();
        setBooking({
          pickup: bkgData.pickup_address?.split(',')[0] || 'Origin',
          dropoff: bkgData.dropoff_address?.split(',')[0] || 'Destination',
          datetime: bkgData.pickup_datetime_str || 'Scheduled Date',
          vehicleClass: bkgData.vehicle_class === 'FIRST_CLASS' ? 'First Class' : bkgData.vehicle_class === 'BUSINESS_VAN' ? 'Business Van' : 'Business Class',
          passengers: bkgData.passengers_count || 2,
          total: bkgData.total_amount_usd || (bkgData.invoice ? bkgData.invoice.total_charged_usd : 0),
          baseFare: bkgData.base_fare_usd || (bkgData.invoice ? bkgData.invoice.subtotal_usd : 0),
          feesAndTaxes: bkgData.fees_and_taxes_usd || (bkgData.invoice ? bkgData.invoice.taxes_usd : 0),
          passengerName: bkgData.passenger_name || (bkgData.passenger_first_name ? `${bkgData.passenger_first_name} ${bkgData.passenger_last_name}` : ''),
          passengerEmail: bkgData.passenger_email || '',
          vendorName: bkgData.assigned_vendor?.vendor_name || bkgData.assigned_vendor_name || '',
          invoiceNumber: bkgData.invoice?.invoice_number || 'INV-GH-2026-9041'
        });
      }
    } catch (err) {
      console.warn('Telemetry polling notice:', err);
    }
  };

  useEffect(() => {
    fetchRideData();
    const interval = setInterval(fetchRideData, 8000);
    return () => clearInterval(interval);
  }, [bookingRef]);

  // Handle Cancel Booking
  const handleConfirmCancel = async () => {
    setIsCancelling(true);
    try {
      const fullReason = customCancelNote.trim() ? `${cancelReason}: ${customCancelNote.trim()}` : cancelReason;
      const res = await fetch(`/api/v1/global-hub/public/booking/${bookingRef}/cancel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cancellation_reason: fullReason })
      });
      if (res.ok) {
        setTelemetry((prev: any) => ({ ...prev, status: 'CANCELLED' }));
        setShowCancelModal(false);
        alert(`Booking ${bookingRef} has been cancelled and pre-auth escrow hold released.`);
      } else {
        const err = await res.json();
        alert(`Cancellation failed: ${err.detail || 'Error'}`);
      }
    } catch (e) {
      console.error(e);
      alert('Network error while cancelling booking.');
    } finally {
      setIsCancelling(false);
    }
  };

  // Handle Save Edit
  const handleSaveEdit = async () => {
    setIsUpdating(true);
    try {
      const res = await fetch(`/api/v1/global-hub/public/booking/${bookingRef}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pickup_datetime_str: editDateTime || undefined,
          flight_number: editFlight || undefined,
          special_requests: editNotes || undefined
        })
      });
      if (res.ok) {
        const data = await res.json();
        setBooking((prev: any) => ({
          ...prev,
          datetime: data.pickup_datetime_str || prev.datetime
        }));
        setShowEditModal(false);
        alert('Booking details updated successfully.');
      } else {
        alert('Failed to update booking.');
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsUpdating(false);
    }
  };

  // Handle Chat
  const openChatModal = async () => {
    setShowChatModal(true);
    try {
      const res = await fetch(`/api/v1/global-hub/chat/${bookingRef}/messages`);
      if (res.ok) {
        const data = await res.json();
        setChatMessages(data.messages || []);
      }
    } catch (err) {
      console.warn('Chat fetch error:', err);
    }
  };

  const handleSendMessage = async () => {
    if (!chatInput.trim()) return;
    setIsSendingMsg(true);
    try {
      const res = await fetch(`/api/v1/global-hub/chat/${bookingRef}/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sender_role: 'PASSENGER',
          sender_name: booking.passengerName || 'Passenger',
          message_text: chatInput.trim()
        })
      });
      if (res.ok) {
        const newMsg = await res.json();
        setChatMessages((prev) => [...prev, newMsg]);
        setChatInput('');
      }
    } catch (err) {
      console.error('Chat send error:', err);
    } finally {
      setIsSendingMsg(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: '#FFFFFF', color: '#111827', display: 'flex', flexDirection: 'column', fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>
      <SharedBookingHeader
        onOpenMyBookings={onBackToMyBookings}
        onOpenSignIn={onOpenSignIn}
        onHomeClick={onHomeClick}
      />

      <div style={{ maxWidth: '1180px', margin: '0 auto', width: '100%', padding: '36px 24px 60px 24px', flex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '12px', marginBottom: '24px' }}>
          <h1 style={{ fontSize: '32px', fontWeight: '900', color: '#000000', letterSpacing: '-0.03em', margin: 0 }}>
            Your ride
          </h1>
          <span style={{ fontSize: '14px', color: '#6B7280', fontWeight: '600' }}>
            Reference {bookingRef}
          </span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.25fr', gap: '32px', alignItems: 'start' }}>
          {/* Left Column: Chauffeur Details & Actions */}
          <div style={{
            background: '#FFFFFF',
            border: '1px solid #E5E7EB',
            borderRadius: '16px',
            padding: '24px',
            display: 'flex',
            flexDirection: 'column',
            gap: '18px',
            boxShadow: '0 2px 10px rgba(0,0,0,0.02)'
          }}>
            {/* Route & Schedule */}
            <div>
              <h3 style={{ fontSize: '18px', fontWeight: '800', color: '#000000', margin: '0 0 6px 0' }}>
                {booking.pickup} ➔ {booking.dropoff}
              </h3>
              <div style={{ fontSize: '12px', color: '#4B5563', display: 'flex', gap: '14px' }}>
                <span>📅 {booking.datetime}</span>
                <span>🚘 {booking.vehicleClass}</span>
                <span>👥 {booking.passengers} passengers</span>
                <span>💼 2 bags</span>
              </div>
            </div>

            {/* Chauffeur Assigned Green Banner */}
            <div style={{
              background: telemetry.status === 'CANCELLED' ? '#FEF2F2' : '#F0FDF4',
              border: telemetry.status === 'CANCELLED' ? '1px solid #FECACA' : '1px solid #BBF7D0',
              borderRadius: '8px',
              padding: '12px 14px',
              fontSize: '12px',
              color: telemetry.status === 'CANCELLED' ? '#DC2626' : '#15803D'
            }}>
              <div style={{ fontWeight: '800', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: telemetry.status === 'CANCELLED' ? '#DC2626' : '#16A34A' }} />
                {telemetry.status === 'CANCELLED' ? 'Booking Cancelled' : `Chauffeur Assigned (${telemetry.status})`}
              </div>
              <div style={{ color: telemetry.status === 'CANCELLED' ? '#991B1B' : '#166534', marginTop: '2px' }}>
                {telemetry.status === 'CANCELLED' ? 'This reservation has been cancelled. Escrow pre-auth hold refunded.' : `Your chauffeur ${telemetry.driver_name} is on the way (ETA: ${telemetry.eta_minutes} min).`}
              </div>
            </div>

            {/* Driver & Vehicle Card */}
            <div style={{
              background: '#F9FAFB',
              border: '1px solid #E5E7EB',
              borderRadius: '12px',
              padding: '16px',
              display: 'grid',
              gridTemplateColumns: '1.2fr 1fr',
              gap: '14px',
              alignItems: 'center'
            }}>
              {/* Driver Avatar */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{
                  width: '46px',
                  height: '46px',
                  borderRadius: '50%',
                  background: '#0F172A',
                  color: '#FFFFFF',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: '800',
                  fontSize: '16px'
                }}>
                  👨🏻‍✈️
                </div>
                <div>
                  <div style={{ fontSize: '14px', fontWeight: '800', color: '#000000' }}>{telemetry.driver_name}</div>
                  <div style={{ fontSize: '11px', color: '#6B7280' }}>Professional Chauffeur</div>
                  <div style={{ fontSize: '11px', color: '#B45309', fontWeight: '700', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '2px' }}>
                    <Star size={11} fill="#B45309" /> {telemetry.driver_rating} (320+ rides)
                  </div>
                </div>
              </div>

              {/* Vehicle Thumbnail & Plate */}
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '13px', fontWeight: '700', color: '#000000' }}>{telemetry.vehicle_model}</div>
                <div style={{ fontSize: '11px', color: '#6B7280', marginTop: '2px' }}>Plate: {telemetry.vehicle_plate}</div>
              </div>
            </div>

            {/* Driver Contact Buttons */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <button
                onClick={openChatModal}
                style={{
                  padding: '10px',
                  borderRadius: '8px',
                  border: '1px solid #D1D5DB',
                  background: '#FFFFFF',
                  color: '#111827',
                  fontSize: '13px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px'
                }}
              >
                <MessageSquare size={14} /> Message Chauffeur
              </button>

              <a
                href={`tel:${telemetry.driver_phone}`}
                style={{
                  padding: '10px',
                  borderRadius: '8px',
                  border: 'none',
                  background: '#1D68FE',
                  color: '#FFFFFF',
                  fontSize: '13px',
                  fontWeight: '700',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  textDecoration: 'none'
                }}
              >
                <Phone size={14} /> Call Driver
              </a>
            </div>

            {/* Total Price & Options */}
            <div style={{ paddingTop: '10px', borderTop: '1px solid #F3F4F6' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                <span style={{ fontSize: '13px', color: '#6B7280' }}>Total price</span>
                <span style={{ fontSize: '20px', fontWeight: '800', color: '#000000' }}>${typeof booking.total === 'number' ? booking.total.toFixed(2) : booking.total}</span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
                <button
                  onClick={() => {
                    setEditDateTime(booking.datetime);
                    setShowEditModal(true);
                  }}
                  style={{
                    padding: '8px',
                    borderRadius: '6px',
                    border: '1px solid #E5E7EB',
                    background: '#FFFFFF',
                    fontSize: '12px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '4px'
                  }}
                >
                  <Edit size={12} /> Change ride
                </button>

                <button
                  onClick={() => setShowCancelModal(true)}
                  style={{
                    padding: '8px',
                    borderRadius: '6px',
                    border: '1px solid #E5E7EB',
                    background: '#FFFFFF',
                    fontSize: '12px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '4px',
                    color: '#DC2626'
                  }}
                >
                  <XCircle size={12} /> Cancel ride
                </button>

                <button
                  onClick={() => {
                    window.open(`/api/v1/global-hub/public/booking/${bookingRef}/invoice-pdf`, '_blank');
                  }}
                  style={{
                    padding: '8px',
                    borderRadius: '6px',
                    border: '1px solid #E5E7EB',
                    background: '#FFFFFF',
                    fontSize: '12px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '4px'
                  }}
                >
                  <FileText size={12} /> PDF Receipt
                </button>
              </div>
            </div>
          </div>

          {/* Right Column: Live Radar / Map View */}
          <div style={{
            height: '480px',
            borderRadius: '16px',
            overflow: 'hidden',
            border: '1px solid #E5E7EB',
            position: 'relative',
            background: '#E2E8F0'
          }}>
            {/* Map Canvas with Visual Route */}
            <div style={{
              width: '100%',
              height: '100%',
              background: 'radial-gradient(circle at 50% 50%, #F1F5F9 0%, #CBD5E1 100%)',
              position: 'relative',
              overflow: 'hidden'
            }}>
              {/* Map SVG Route line */}
              <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}>
                <path
                  d="M 120 120 Q 240 200, 360 320"
                  fill="none"
                  stroke="#1D68FE"
                  strokeWidth="4"
                  strokeDasharray="6,6"
                />
              </svg>

              {/* Destination Point */}
              <div style={{
                position: 'absolute',
                top: '100px',
                left: '100px',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                background: '#000000',
                color: '#FFFFFF',
                padding: '4px 10px',
                borderRadius: '6px',
                fontSize: '11px',
                fontWeight: '800'
              }}>
                <MapPin size={12} /> {booking.dropoff || 'Destination'}
              </div>

              {/* Live Car Moving along Route */}
              <div style={{
                position: 'absolute',
                top: '220px',
                left: '240px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center'
              }}>
                <div style={{
                  background: '#FFFFFF',
                  border: '1.5px solid #1D68FE',
                  padding: '4px 10px',
                  borderRadius: '20px',
                  fontSize: '11px',
                  fontWeight: '800',
                  color: '#1D68FE',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                  marginBottom: '4px'
                }}>
                  {telemetry.status === 'CANCELLED' ? 'Trip Cancelled' : `Arriving in ${telemetry.eta_minutes || 8} min`}
                </div>
                <div style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  background: '#000000',
                  color: '#FFFFFF',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
                  border: '2px solid #FFFFFF'
                }}>
                  🚗
                </div>
              </div>

              {/* Pickup Point */}
              <div style={{
                position: 'absolute',
                bottom: '80px',
                right: '80px',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                background: '#FFFFFF',
                color: '#000000',
                border: '1px solid #CBD5E1',
                padding: '4px 10px',
                borderRadius: '6px',
                fontSize: '11px',
                fontWeight: '800'
              }}>
                <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#1D68FE' }} />
                {booking.pickup || 'Pickup Location'}
              </div>

              {/* Zoom controls */}
              <div style={{ position: 'absolute', right: '16px', bottom: '16px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <button onClick={() => setZoomLevel((z) => Math.min(z + 0.2, 2))} style={{ width: '32px', height: '32px', background: '#FFFFFF', border: '1px solid #D1D5DB', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}><Plus size={14} /></button>
                <button onClick={() => setZoomLevel((z) => Math.max(z - 0.2, 0.6))} style={{ width: '32px', height: '32px', background: '#FFFFFF', border: '1px solid #D1D5DB', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}><Minus size={14} /></button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Cancel Booking Modal */}
      {showCancelModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: '20px' }}>
          <div style={{ width: '100%', maxWidth: '460px', background: '#FFFFFF', padding: '28px', borderRadius: '16px', position: 'relative', boxShadow: '0 20px 40px rgba(0,0,0,0.2)' }}>
            <button onClick={() => setShowCancelModal(false)} style={{ position: 'absolute', top: '16px', right: '16px', background: 'none', border: 'none', cursor: 'pointer' }}><X size={18} /></button>
            
            <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: '#FEF2F2', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '14px' }}>
              <XCircle size={22} color="#DC2626" />
            </div>

            <h3 style={{ fontSize: '18px', fontWeight: '800', margin: '0 0 6px 0', color: '#111827' }}>
              Cancel Ride {bookingRef}?
            </h3>
            <p style={{ fontSize: '13px', color: '#6B7280', margin: '0 0 16px 0', lineHeight: '1.4' }}>
              Free cancellation applies. Your pre-authorized escrow hold will be released immediately.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '20px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#374151', marginBottom: '4px' }}>Reason</label>
                <select
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #D1D5DB', fontSize: '13px', boxSizing: 'border-box' }}
                >
                  <option value="Travel plans changed">Travel plans changed</option>
                  <option value="Flight rescheduled or cancelled">Flight rescheduled or cancelled</option>
                  <option value="Booked alternative transport">Booked alternative transport</option>
                  <option value="Other">Other reason</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#374151', marginBottom: '4px' }}>Optional note</label>
                <input
                  type="text"
                  placeholder="Additional note..."
                  value={customCancelNote}
                  onChange={(e) => setCustomCancelNote(e.target.value)}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #D1D5DB', fontSize: '13px', boxSizing: 'border-box' }}
                />
              </div>
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                onClick={() => setShowCancelModal(false)}
                disabled={isCancelling}
                style={{ flex: 1, padding: '11px', borderRadius: '8px', border: '1px solid #D1D5DB', background: '#FFFFFF', fontWeight: '600', fontSize: '13px', cursor: 'pointer' }}
              >
                Keep Booking
              </button>
              <button
                onClick={handleConfirmCancel}
                disabled={isCancelling}
                style={{ flex: 1, padding: '11px', borderRadius: '8px', border: 'none', background: '#DC2626', color: '#FFFFFF', fontWeight: '700', fontSize: '13px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
              >
                {isCancelling ? <Loader2 size={14} className="animate-spin" /> : null}
                Confirm Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Details Modal */}
      {showEditModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: '20px' }}>
          <div style={{ width: '100%', maxWidth: '440px', background: '#FFFFFF', padding: '28px', borderRadius: '16px', position: 'relative' }}>
            <button onClick={() => setShowEditModal(false)} style={{ position: 'absolute', top: '16px', right: '16px', background: 'none', border: 'none', cursor: 'pointer' }}><X size={18} /></button>
            <h3 style={{ fontSize: '18px', fontWeight: '800', margin: '0 0 6px 0' }}>Change Ride Details</h3>
            <p style={{ fontSize: '12px', color: '#6B7280', margin: '0 0 16px 0' }}>Update date, flight info, or special instructions.</p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '20px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#374151', marginBottom: '4px' }}>Pickup Date & Time</label>
                <input
                  type="text"
                  value={editDateTime}
                  onChange={(e) => setEditDateTime(e.target.value)}
                  placeholder="e.g. Oct 18, 2026 at 2:30 PM"
                  style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #D1D5DB', fontSize: '13px', boxSizing: 'border-box' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#374151', marginBottom: '4px' }}>Flight Number (Optional)</label>
                <input
                  type="text"
                  value={editFlight}
                  onChange={(e) => setEditFlight(e.target.value)}
                  placeholder="e.g. BA178"
                  style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #D1D5DB', fontSize: '13px', boxSizing: 'border-box' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#374151', marginBottom: '4px' }}>Special Chauffeur Instructions</label>
                <input
                  type="text"
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  placeholder="e.g. Child booster seat, VIP placard"
                  style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #D1D5DB', fontSize: '13px', boxSizing: 'border-box' }}
                />
              </div>
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={() => setShowEditModal(false)} style={{ flex: 1, padding: '10px', borderRadius: '8px', border: '1px solid #D1D5DB', background: '#FFFFFF', fontWeight: '600', fontSize: '13px', cursor: 'pointer' }}>
                Cancel
              </button>
              <button onClick={handleSaveEdit} disabled={isUpdating} style={{ flex: 1, padding: '10px', borderRadius: '8px', border: 'none', background: '#1D68FE', color: '#FFFFFF', fontWeight: '700', fontSize: '13px', cursor: 'pointer' }}>
                {isUpdating ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* In-App Chauffeur Chat Modal */}
      {showChatModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: '20px' }}>
          <div style={{ width: '100%', maxWidth: '480px', background: '#FFFFFF', borderRadius: '16px', position: 'relative', overflow: 'hidden', display: 'flex', flexDirection: 'column', height: '520px', boxShadow: '0 20px 40px rgba(0,0,0,0.2)' }}>
            <div style={{ background: '#0F172A', color: '#FFFFFF', padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontSize: '15px', fontWeight: '800' }}>Chauffeur {telemetry.driver_name}</div>
                <div style={{ fontSize: '11px', color: '#94A3B8' }}>Proxy Masked Relay • {bookingRef}</div>
              </div>
              <button onClick={() => setShowChatModal(false)} style={{ background: 'none', border: 'none', color: '#94A3B8', cursor: 'pointer' }}><X size={18} /></button>
            </div>

            <div style={{ flex: 1, padding: '16px', overflowY: 'auto', background: '#F8FAFC', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {chatMessages.length === 0 ? (
                <div style={{ textAlign: 'center', color: '#94A3B8', fontSize: '13px', margin: 'auto' }}>
                  No messages yet. Send a direct instruction to Chauffeur {telemetry.driver_name}.
                </div>
              ) : (
                chatMessages.map((msg, i) => {
                  const isMe = msg.sender_role === 'PASSENGER';
                  return (
                    <div key={i} style={{ alignSelf: isMe ? 'flex-end' : 'flex-start', maxWidth: '80%' }}>
                      <div style={{
                        background: isMe ? '#1D68FE' : '#FFFFFF',
                        color: isMe ? '#FFFFFF' : '#1E293B',
                        padding: '10px 14px',
                        borderRadius: isMe ? '14px 14px 2px 14px' : '14px 14px 14px 2px',
                        fontSize: '13px',
                        border: isMe ? 'none' : '1px solid #E2E8F0',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
                      }}>
                        {msg.message_text}
                      </div>
                      <div style={{ fontSize: '10px', color: '#94A3B8', marginTop: '2px', textAlign: isMe ? 'right' : 'left' }}>
                        {msg.sender_name}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <div style={{ padding: '12px 16px', background: '#FFFFFF', borderTop: '1px solid #E2E8F0', display: 'flex', gap: '8px' }}>
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                placeholder="Message your chauffeur..."
                style={{ flex: 1, padding: '10px 12px', borderRadius: '8px', border: '1px solid #D1D5DB', fontSize: '13px', outline: 'none' }}
              />
              <button
                onClick={handleSendMessage}
                disabled={isSendingMsg || !chatInput.trim()}
                style={{ background: '#1D68FE', color: '#FFFFFF', border: 'none', borderRadius: '8px', padding: '0 16px', cursor: 'pointer' }}
              >
                <Send size={16} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
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
          Live Ride Radar • Global Hub Fleet Clearinghouse
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
