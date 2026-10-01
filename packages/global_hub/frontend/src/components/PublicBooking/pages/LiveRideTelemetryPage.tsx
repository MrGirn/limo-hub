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
  Check
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
    pickup: 'Origin',
    dropoff: 'Destination',
    datetime: 'Scheduled Date',
    vehicleClass: 'Business Class',
    passengers: 2,
    total: 0,
    baseFare: 0,
    feesAndTaxes: 0,
    passengerName: '',
    passengerEmail: '',
    vendorName: '',
    invoiceNumber: ''
  });

  useEffect(() => {
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

    fetchRideData();
    const interval = setInterval(fetchRideData, 10000);
    return () => clearInterval(interval);
  }, [bookingRef]);


  const [showEditModal, setShowEditModal] = useState(false);
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [editDateTime, setEditDateTime] = useState('');
  const [editFlight, setEditFlight] = useState('');
  const [editNotes, setEditNotes] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);

  const handleCancelRide = async () => {
    if (!window.confirm('Are you sure you want to cancel this booking? Free cancellation applies.')) return;
    try {
      const res = await fetch(`/api/v1/global-hub/public/booking/${bookingRef}/cancel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cancellation_reason: 'Passenger requested cancellation' })
      });
      if (res.ok) {
        setTelemetry((prev: any) => ({ ...prev, status: 'CANCELLED' }));
        alert('Booking successfully cancelled. Escrow pre-auth hold released.');
      }
    } catch (e) {
      console.error(e);
    }
  };

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
        alert('Booking details successfully updated.');
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsUpdating(false);
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
                {telemetry.status === 'CANCELLED' ? 'Booking Cancelled' : `Chauffeur assigned (${telemetry.status})`}
              </div>
              <div style={{ color: telemetry.status === 'CANCELLED' ? '#991B1B' : '#166534', marginTop: '2px' }}>
                {telemetry.status === 'CANCELLED' ? 'This ride has been cancelled. Escrow funds refunded.' : `Your chauffeur ${telemetry.driver_name} is on the way (ETA: ${telemetry.eta_minutes} min).`}
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
                onClick={() => alert(`Live messaging channel opened with Chauffeur ${telemetry.driver_name}.`)}
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
                <MessageSquare size={14} /> Message
              </button>

              <button
                onClick={() => alert(`Direct dispatch phone connected: ${telemetry.driver_phone}`)}
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
                  gap: '6px'
                }}
              >
                <Phone size={14} /> Call
              </button>
            </div>

            {/* Total Price & Options */}
            <div style={{ paddingTop: '10px', borderTop: '1px solid #F3F4F6' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                <span style={{ fontSize: '13px', color: '#6B7280' }}>Total price</span>
                <span style={{ fontSize: '20px', fontWeight: '800', color: '#000000' }}>${booking.total}</span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
                <button
                  onClick={() => setShowEditModal(true)}
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
                  onClick={handleCancelRide}
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
                  onClick={() => setShowReceiptModal(true)}
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
                  <FileText size={12} /> Receipt
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
                  fontSize: '16px',
                  boxShadow: '0 4px 10px rgba(0,0,0,0.3)'
                }}>
                  🚘
                </div>
              </div>

              {/* Pickup Point */}
              <div style={{
                position: 'absolute',
                bottom: '80px',
                right: '120px',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                background: '#1D68FE',
                color: '#FFFFFF',
                padding: '5px 12px',
                borderRadius: '6px',
                fontSize: '11px',
                fontWeight: '800'
              }}>
                <Plane size={12} /> Pickup: {booking.pickup || 'Origin'}
              </div>

              {/* Map Zoom Controls */}
              <div style={{
                position: 'absolute',
                bottom: '24px',
                right: '24px',
                display: 'flex',
                flexDirection: 'column',
                background: '#FFFFFF',
                borderRadius: '8px',
                border: '1px solid #CBD5E1',
                overflow: 'hidden',
                boxShadow: '0 2px 6px rgba(0,0,0,0.1)'
              }}>
                <button
                  onClick={() => setZoomLevel(z => z + 0.1)}
                  style={{ width: '32px', height: '32px', border: 'none', background: '#FFFFFF', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                >
                  <Plus size={14} />
                </button>
                <div style={{ height: '1px', background: '#E5E7EB' }} />
                <button
                  onClick={() => setZoomLevel(z => Math.max(0.8, z - 0.1))}
                  style={{ width: '32px', height: '32px', border: 'none', background: '#FFFFFF', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                >
                  <Minus size={14} />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Change / Edit Ride Modal */}
      {showEditModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: '20px' }}>
          <div style={{ width: '100%', maxWidth: '440px', background: '#FFFFFF', padding: '28px', borderRadius: '16px', position: 'relative' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '18px', fontWeight: '800', margin: 0 }}>Change ride details</h3>
              <button onClick={() => setShowEditModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '16px' }}>✕</button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', marginBottom: '4px' }}>Reschedule Pickup Time</label>
                <input
                  type="text"
                  placeholder={booking.datetime}
                  value={editDateTime}
                  onChange={(e) => setEditDateTime(e.target.value)}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #D1D5DB', fontSize: '13px', boxSizing: 'border-box' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', marginBottom: '4px' }}>Flight Number (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. AA123"
                  value={editFlight}
                  onChange={(e) => setEditFlight(e.target.value)}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #D1D5DB', fontSize: '13px', boxSizing: 'border-box' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', marginBottom: '4px' }}>Special Instructions / Placard</label>
                <textarea
                  rows={2}
                  placeholder="Notes for chauffeur..."
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #D1D5DB', fontSize: '13px', boxSizing: 'border-box' }}
                />
              </div>
              <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                <button
                  onClick={() => setShowEditModal(false)}
                  style={{ flex: 1, padding: '10px', borderRadius: '8px', border: '1px solid #D1D5DB', background: '#FFFFFF', fontWeight: '600', fontSize: '13px', cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  disabled={isUpdating}
                  onClick={handleSaveEdit}
                  style={{ flex: 1, padding: '10px', borderRadius: '8px', border: 'none', background: '#1D68FE', color: '#FFFFFF', fontWeight: '700', fontSize: '13px', cursor: 'pointer' }}
                >
                  {isUpdating ? 'Saving...' : 'Save changes'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Single Invoice Receipt Modal */}
      {showReceiptModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: '20px' }}>
          <div style={{ width: '100%', maxWidth: '500px', background: '#FFFFFF', padding: '32px', borderRadius: '16px', position: 'relative' }}>
            <button onClick={() => setShowReceiptModal(false)} style={{ position: 'absolute', top: '16px', right: '16px', background: 'none', border: 'none', cursor: 'pointer', fontSize: '16px' }}>✕</button>
            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '2px solid #000000', paddingBottom: '12px', marginBottom: '16px' }}>
              <div>
                <div style={{ fontSize: '20px', fontWeight: '900' }}>LIMO</div>
                <div style={{ fontSize: '11px', color: '#6B7280' }}>Merchant of Record • Global Hub Clearinghouse</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '13px', fontWeight: '700', color: '#1D68FE' }}>{booking.invoiceNumber || 'INV-GH-2026-9041'}</div>
                <div style={{ fontSize: '11px', color: '#6B7280' }}>Ref: {bookingRef}</div>
              </div>
            </div>

            {booking.passengerName && (
              <div style={{ fontSize: '13px', marginBottom: '8px' }}>
                <strong>Billed To:</strong> {booking.passengerName} {booking.passengerEmail ? `(${booking.passengerEmail})` : ''}
              </div>
            )}

            {booking.vendorName && (
              <div style={{ fontSize: '12px', color: '#4B5563', marginBottom: '14px', background: '#F9FAFB', padding: '6px 10px', borderRadius: '6px' }}>
                <strong>Servicing Affiliate:</strong> {booking.vendorName}
              </div>
            )}

            <table style={{ width: '100%', fontSize: '13px', borderCollapse: 'collapse', marginBottom: '16px' }}>
              <tbody>
                <tr style={{ borderBottom: '1px solid #F3F4F6' }}>
                  <td style={{ padding: '8px 0' }}>Chauffeured Transfer ({booking.pickup} ➔ {booking.dropoff})</td>
                  <td style={{ textAlign: 'right', fontWeight: '600' }}>${(booking.baseFare || (booking.total ? booking.total * 0.85 : 0)).toFixed(2)}</td>
                </tr>
                <tr style={{ borderBottom: '1px solid #F3F4F6' }}>
                  <td style={{ padding: '8px 0' }}>Taxes & Airport Surcharges</td>
                  <td style={{ textAlign: 'right', fontWeight: '600' }}>${(booking.feesAndTaxes || (booking.total ? booking.total * 0.15 : 0)).toFixed(2)}</td>
                </tr>
                <tr style={{ borderTop: '2px solid #000000' }}>
                  <td style={{ padding: '10px 0', fontWeight: '800' }}>Total Paid (USD)</td>
                  <td style={{ textAlign: 'right', fontWeight: '800', fontSize: '16px', color: '#1D68FE' }}>${(booking.total || 0).toFixed(2)}</td>
                </tr>
              </tbody>
            </table>
            <button onClick={() => setShowReceiptModal(false)} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: 'none', background: '#1D68FE', color: '#FFFFFF', fontWeight: '600', fontSize: '13px', cursor: 'pointer' }}>
              Close
            </button>
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
        <div style={{ display: 'flex', gap: '20px' }}>
          <a href="#help" onClick={onOpenHelp} style={{ color: '#6B7280', textDecoration: 'none' }}>Help</a>
          <a href="#contact" onClick={onOpenHelp} style={{ color: '#6B7280', textDecoration: 'none' }}>Contact</a>
          <a href="#terms" style={{ color: '#6B7280', textDecoration: 'none' }}>Terms</a>
          <a href="#privacy" style={{ color: '#6B7280', textDecoration: 'none' }}>Privacy</a>
        </div>
        <div style={{ fontSize: '11px', fontWeight: '800', letterSpacing: '0.08em', color: '#111827' }}>
          RIDE FURTHER
        </div>
      </footer>
    </div>
  );
};
