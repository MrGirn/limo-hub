import React, { useState, useEffect } from 'react';
import { 
  Search, X, Calendar, Clock, MapPin, User, Car, ShieldCheck, 
  ExternalLink, Download, AlertCircle, CheckCircle2, ChevronRight,
  Phone, Mail, Copy, Check, FileText, Trash2, Plane, Sparkles,
  AlertTriangle, ArrowRight, Loader2
} from 'lucide-react';
import { Booking } from '../../types';
import { 
  lookupBookingsApi, 
  getBookingCalendarIcsUrl, 
  generateGoogleCalendarUrl, 
  generateOutlookCalendarUrl,
  cancelBookingApi,
  fetchBookingTermsVoucher
} from '../../api';

interface CustomerBookingsLookupModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialQuery?: string;
}

export const CustomerBookingsLookupModal: React.FC<CustomerBookingsLookupModalProps> = ({
  isOpen,
  onClose,
  initialQuery = ''
}) => {
  const [searchQuery, setSearchQuery] = useState(initialQuery);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Cancellation State
  const [cancelModalBooking, setCancelModalBooking] = useState<Booking | null>(null);
  const [cancellingBookingId, setCancellingBookingId] = useState<string | null>(null);
  const [cancelResult, setCancelResult] = useState<{ id: string; message: string; isWithinWindow: boolean } | null>(null);
  const [downloadingVoucherId, setDownloadingVoucherId] = useState<string | null>(null);

  // Timer Tick for Live Countdown calculation
  const [currentTick, setCurrentTick] = useState<number>(Date.now());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTick(Date.now()), 30000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (initialQuery && isOpen) {
      setSearchQuery(initialQuery);
      handleSearch(initialQuery);
    }
  }, [initialQuery, isOpen]);

  if (!isOpen) return null;

  const handleSearch = async (queryToUse?: string) => {
    const q = (queryToUse !== undefined ? queryToUse : searchQuery).trim();
    if (!q) {
      setError('Please enter a booking reference, phone number, or email address.');
      return;
    }
    setLoading(true);
    setError(null);
    setHasSearched(true);
    try {
      const results = await lookupBookingsApi(q);
      setBookings(results);
    } catch (err: any) {
      setError(err.message || 'Error looking up reservations. Please check your query and try again.');
      setBookings([]);
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(text);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const computeCancellationCountdown = (booking: Booking) => {
    const policy = booking.cancellation_policy;
    const cutoffHours = policy?.cutoff_hours || 2;
    const vendorName = policy?.vendor_name || 'Operating Carrier';
    const pickupDate = booking.pickup_time_utc ? new Date(booking.pickup_time_utc) : new Date(Date.now() + 24 * 3600 * 1000);
    const deadlineDate = policy?.deadline_utc ? new Date(policy.deadline_utc) : new Date(pickupDate.getTime() - cutoffHours * 3600 * 1000);
    const now = new Date(currentTick);
    const diffMs = deadlineDate.getTime() - now.getTime();

    if (diffMs <= 0) {
      return {
        isFreeActive: false,
        cutoffHours,
        vendorName,
        statusText: 'Free cancellation window closed',
        detailText: `Subject to standard vendor cancellation fees (${vendorName})`,
        badgeBg: '#F1F5F9',
        badgeText: '#64748B',
        badgeBorder: '#CBD5E1',
        isUrgent: false
      };
    }

    const totalHours = Math.floor(diffMs / (1000 * 60 * 60));
    const remainingMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    const timeRemainingStr = totalHours > 0 
      ? `${totalHours}h ${remainingMinutes}m remaining` 
      : `${remainingMinutes}m remaining`;

    const isUrgent = totalHours === 0;

    return {
      isFreeActive: true,
      isUrgent,
      cutoffHours,
      vendorName,
      deadlineDate,
      timeRemainingStr,
      statusText: isUrgent 
        ? `Free Cancellation Ending Soon · ${timeRemainingStr}`
        : `Complimentary Cancellation Active (${timeRemainingStr})`,
      detailText: `Free cancellation until ${deadlineDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} at ${deadlineDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })} under ${vendorName}'s ${cutoffHours}-hr business rule.`,
      badgeBg: isUrgent ? '#FEF3C7' : '#DCFCE7',
      badgeText: isUrgent ? '#92400E' : '#166534',
      badgeBorder: isUrgent ? '#FDE68A' : '#BBF7D0'
    };
  };

  const handleConfirmCancellation = async (b: Booking) => {
    setCancellingBookingId(b.id);
    try {
      const res = await cancelBookingApi(b.id, 'Customer self-service cancellation via My Bookings');
      setBookings(prev => prev.map(item => item.id === b.id ? { ...item, status: 'CANCELLED' as any, trip: item.trip ? { ...item.trip, status: 'CANCELLED' as any } : undefined } : item));
      setCancelResult({
        id: b.id,
        message: res.message || '100% Pre-Authorization escrow hold has been released back to your card.',
        isWithinWindow: res.is_within_free_window !== false
      });
      setCancelModalBooking(null);
    } catch (err: any) {
      alert(err.message || 'Cancellation failed');
    } finally {
      setCancellingBookingId(null);
    }
  };

  const handleDownloadTerms = async (b: Booking) => {
    setDownloadingVoucherId(b.id);
    try {
      const voucher = await fetchBookingTermsVoucher(b.id);
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(`
          <!DOCTYPE html>
          <html>
          <head>
            <title>Reservation Terms & Voucher #${b.id} - ${voucher.vendor_name || 'Limo Platform'}</title>
            <style>
              body { font-family: 'Helvetica Neue', Arial, sans-serif; padding: 40px; color: #0F172A; max-width: 800px; margin: 0 auto; }
              .header { display: flex; justify-content: space-between; border-bottom: 2px solid #0A192F; padding-bottom: 20px; margin-bottom: 24px; }
              .title { font-size: 24px; font-weight: bold; color: #0A192F; }
              .ref { font-family: monospace; font-size: 16px; color: #9A7B4F; font-weight: bold; }
              .section { margin-bottom: 20px; background: #F8FAFC; border: 1px solid #E2E8F0; padding: 16px; border-radius: 8px; }
              .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
              .label { font-size: 11px; text-transform: uppercase; color: #64748B; font-weight: bold; }
              .value { font-size: 14px; font-weight: bold; color: #0F172A; margin-top: 2px; }
              .terms-item { margin-bottom: 12px; }
              .terms-title { font-size: 13px; font-weight: bold; color: #0A192F; }
              .terms-text { font-size: 12px; color: #475569; margin-top: 2px; line-height: 1.5; }
              .badge { display: inline-block; padding: 3px 8px; background: #DCFCE7; color: #166534; font-size: 11px; font-weight: bold; border-radius: 4px; }
            </style>
          </head>
          <body>
            <div class="header">
              <div>
                <div class="title">${voucher.vendor_name || 'Executive Chauffeur'}</div>
                <div style="font-size: 12px; color: #64748B; margin-top: 4px;">${voucher.vendor_address || 'Greater Metro & Regional Area'} · Tel: ${voucher.vendor_phone || '+1 (215) 555-0144'}</div>
              </div>
              <div style="text-align: right;">
                <div class="label">RESERVATION REF</div>
                <div class="ref">#${b.id}</div>
                <div class="badge" style="margin-top: 6px;">${b.trip?.status || b.status || 'CONFIRMED'}</div>
              </div>
            </div>

            <div class="section">
              <div class="grid">
                <div>
                  <div class="label">PICKUP LOCATION</div>
                  <div class="value">${voucher.pickup_address}</div>
                </div>
                <div>
                  <div class="label">DESTINATION</div>
                  <div class="value">${voucher.dropoff_address || 'As Directed'}</div>
                </div>
                <div>
                  <div class="label">PASSENGER</div>
                  <div class="value">${voucher.passenger_name} (${voucher.passenger_phone})</div>
                </div>
                <div>
                  <div class="label">SCHEDULED TIME</div>
                  <div class="value">${new Date(voucher.pickup_time_utc).toLocaleString('en-US')}</div>
                </div>
                <div>
                  <div class="label">TOTAL GUARANTEED FARE</div>
                  <div class="value">$${Number(voucher.total_amount_usd).toFixed(2)} USD (Escrow Pre-Auth Hold)</div>
                </div>
                <div>
                  <div class="label">CARD PRE-AUTH</div>
                  <div class="value">•••• ${voucher.card_last4 || '4242'} (${voucher.preauth_status})</div>
                </div>
              </div>
            </div>

            <div style="margin-top: 24px;">
              <h3 style="font-size: 16px; border-bottom: 1px solid #E2E8F0; padding-bottom: 8px; margin-bottom: 14px;">Contract Terms &amp; Carrier Policies</h3>
              ${(voucher.terms_and_conditions || []).map((t: any) => `
                <div class="terms-item">
                  <div class="terms-title">${t.title}</div>
                  <div class="terms-text">${t.text}</div>
                </div>
              `).join('')}
            </div>

            <div style="margin-top: 40px; border-top: 1px solid #E2E8F0; padding-top: 14px; font-size: 11px; color: #94A3B8; text-align: center;">
              This document is an authoritative terms voucher for ground transportation under state livery compliance.
            </div>
            <script>window.print();</script>
          </body>
          </html>
        `);
        printWindow.document.close();
      }
    } catch (err: any) {
      alert(err.message || 'Failed to generate terms voucher');
    } finally {
      setDownloadingVoucherId(null);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status?.toUpperCase()) {
      case 'CONFIRMED':
      case 'SCHEDULED':
        return { bg: '#DCFCE7', text: '#166534', border: '#BBF7D0' };
      case 'EN_ROUTE':
      case 'PASSENGER_ONBOARD':
      case 'IN_PROGRESS':
        return { bg: '#DBEAFE', text: '#1E40AF', border: '#BFDBFE' };
      case 'COMPLETED':
        return { bg: '#F1F5F9', text: '#475569', border: '#E2E8F0' };
      case 'CANCELLED':
        return { bg: '#FEE2E2', text: '#991B1B', border: '#FECACA' };
      default:
        return { bg: '#FEF3C7', text: '#92400E', border: '#FDE68A' };
    }
  };

  return (
    <div 
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(10, 25, 47, 0.72)',
        backdropFilter: 'blur(4px)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px'
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="lookup-modal-content">
        
        {/* Modal Header */}
        <div style={{
          padding: '24px 28px 20px 28px',
          borderBottom: '1px solid #EAE6DF',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          backgroundColor: '#FCFAF7'
        }}>
          <div>
            <div style={{ fontSize: '11px', fontWeight: 800, color: '#9A7B4F', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '4px' }}>
              Passenger &amp; Booker Self-Service Portal
            </div>
            <h2 style={{ fontFamily: '"Libre Baskerville", Georgia, serif', fontSize: '22px', fontWeight: 700, color: '#0A192F', margin: 0 }}>
              Find Your Upcoming Bookings &amp; Schedule
            </h2>
            <p style={{ margin: '4px 0 0 0', fontSize: '12.5px', color: '#64748B' }}>
              Access live chauffeur details, flight tracking, receipt downloads, and 1-click calendar sync.
            </p>
          </div>

          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              color: '#64748B',
              cursor: 'pointer',
              padding: '6px',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Search Input Bar */}
        <div style={{ padding: '20px 28px', borderBottom: '1px solid #F1F5F9', backgroundColor: '#FFFFFF' }}>
          <form 
            onSubmit={(e) => {
              e.preventDefault();
              handleSearch();
            }}
            style={{ display: 'flex', gap: '10px' }}
          >
            <div style={{ position: 'relative', flex: 1, display: 'flex', alignItems: 'center' }}>
              <Search size={18} style={{ position: 'absolute', left: '14px', color: '#94A3B8', pointerEvents: 'none' }} />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Enter Booking Ref (e.g. #itin-bk-), Mobile Phone, or Booker Email..."
                style={{
                  width: '100%',
                  padding: '12px 14px 12px 42px',
                  borderRadius: '8px',
                  border: '1.5px solid #CBD5E1',
                  fontSize: '13.5px',
                  outline: 'none',
                  backgroundColor: '#F8FAFC'
                }}
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => { setSearchQuery(''); setBookings([]); setHasSearched(false); }}
                  style={{
                    position: 'absolute',
                    right: '12px',
                    background: 'none',
                    border: 'none',
                    color: '#94A3B8',
                    cursor: 'pointer'
                  }}
                >
                  <X size={15} />
                </button>
              )}
            </div>

            <button
              type="submit"
              disabled={loading}
              style={{
                padding: '12px 24px',
                backgroundColor: '#0A192F',
                color: '#FFFFFF',
                border: 'none',
                borderRadius: '8px',
                fontSize: '13.5px',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              <span>{loading ? 'Searching...' : 'Find Trips'}</span>
              <Search size={15} />
            </button>
          </form>

          {/* Quick search suggestions */}
          <div style={{ display: 'flex', gap: '8px', marginTop: '10px', alignItems: 'center', fontSize: '11px', color: '#64748B' }}>
            <span>Quick search:</span>
            <button
              type="button"
              onClick={() => { setSearchQuery('+14848006629'); handleSearch('+14848006629'); }}
              style={{ background: '#F1F5F9', border: '1px solid #CBD5E1', borderRadius: '4px', padding: '2px 8px', fontSize: '11px', cursor: 'pointer', color: '#0A192F' }}
            >
              +1 (484) 800-6629
            </button>
            <button
              type="button"
              onClick={() => { setSearchQuery('billing@client.com'); handleSearch('billing@client.com'); }}
              style={{ background: '#F1F5F9', border: '1px solid #CBD5E1', borderRadius: '4px', padding: '2px 8px', fontSize: '11px', cursor: 'pointer', color: '#0A192F' }}
            >
              billing@client.com
            </button>
          </div>
        </div>

        {/* Results Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '24px 28px', backgroundColor: '#FBF9F5' }}>
          
          {error && (
            <div style={{ padding: '14px 18px', backgroundColor: '#FEF2F2', border: '1px solid #FCA5A5', borderRadius: '8px', color: '#991B1B', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
              <AlertCircle size={18} />
              <span>{error}</span>
            </div>
          )}

          {cancelResult && (
            <div style={{
              padding: '16px 20px',
              backgroundColor: '#F0FDF4',
              border: '1px solid #86EFAC',
              borderRadius: '10px',
              marginBottom: '16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '12px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <CheckCircle2 size={20} color="#16A34A" />
                <div>
                  <div style={{ fontSize: '13.5px', fontWeight: 800, color: '#166534' }}>
                    Reservation #{cancelResult.id} Cancelled
                  </div>
                  <div style={{ fontSize: '12px', color: '#15803D', marginTop: '2px' }}>
                    {cancelResult.message}
                  </div>
                </div>
              </div>
              <button 
                onClick={() => setCancelResult(null)}
                style={{ background: 'none', border: 'none', color: '#166534', cursor: 'pointer', padding: '4px' }}
              >
                <X size={16} />
              </button>
            </div>
          )}

          {!hasSearched && !loading && (
            <div style={{ textAlign: 'center', padding: '40px 20px', color: '#64748B' }}>
              <div style={{ width: '48px', height: '48px', borderRadius: '50%', backgroundColor: '#F1F5F9', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px auto' }}>
                <Calendar size={22} color="#9A7B4F" />
              </div>
              <div style={{ fontSize: '15px', fontWeight: 700, color: '#0A192F' }}>
                Enter your booking details to view your schedule
              </div>
              <div style={{ fontSize: '12.5px', color: '#64748B', maxWidth: '420px', margin: '6px auto 0 auto' }}>
                Search by the booking reference number sent to your email, or by passenger phone number.
              </div>
            </div>
          )}

          {hasSearched && bookings.length === 0 && !loading && !error && (
            <div style={{ textAlign: 'center', padding: '40px 20px', color: '#64748B' }}>
              <div style={{ width: '48px', height: '48px', borderRadius: '50%', backgroundColor: '#FEE2E2', color: '#DC2626', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px auto' }}>
                <Search size={22} />
              </div>
              <div style={{ fontSize: '15px', fontWeight: 700, color: '#0A192F' }}>
                No active reservations found
              </div>
              <div style={{ fontSize: '12.5px', color: '#64748B', maxWidth: '420px', margin: '6px auto 0 auto' }}>
                We couldn't find any trips matching <strong>"{searchQuery}"</strong>. Please verify the phone number, email, or reference code.
              </div>
            </div>
          )}

          {bookings.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
              <div style={{ fontSize: '12px', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Found {bookings.length} {bookings.length === 1 ? 'Reservation' : 'Reservations'}
              </div>

              {bookings.map((b) => {
                const statusTheme = getStatusColor(b.trip?.status || b.status || 'SCHEDULED');
                const isCancelled = (b.trip?.status || b.status) === 'CANCELLED';
                const pickupTimeFormatted = b.pickup_time_utc ? new Date(b.pickup_time_utc).toLocaleString('en-US', {
                  weekday: 'short',
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                  hour: 'numeric',
                  minute: '2-digit',
                  hour12: true
                }) : 'Scheduled Departure';

                const countdown = computeCancellationCountdown(b);

                return (
                  <div
                    key={b.id}
                    style={{
                      backgroundColor: '#FFFFFF',
                      borderRadius: '14px',
                      border: '1px solid #EAE6DF',
                      padding: '22px',
                      boxShadow: '0 3px 12px rgba(0,0,0,0.04)',
                      position: 'relative'
                    }}
                  >
                    {/* Top Row: Ref + Status + Pre-Auth Fare */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', borderBottom: '1px solid #F1F5F9', paddingBottom: '12px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span style={{ fontFamily: 'monospace', fontWeight: 800, fontSize: '14px', color: '#0A192F' }}>
                          #{b.id}
                        </span>
                        <button
                          onClick={() => copyToClipboard(b.id)}
                          style={{ background: 'none', border: 'none', color: '#94A3B8', cursor: 'pointer', padding: '2px', display: 'flex', alignItems: 'center' }}
                          title="Copy Booking ID"
                        >
                          {copiedId === b.id ? <Check size={14} color="#16A34A" /> : <Copy size={14} />}
                        </button>
                        <span style={{
                          fontSize: '10.5px',
                          fontWeight: 800,
                          backgroundColor: statusTheme.bg,
                          color: statusTheme.text,
                          border: `1px solid ${statusTheme.border}`,
                          padding: '2px 8px',
                          borderRadius: '4px',
                          letterSpacing: '0.04em'
                        }}>
                          {b.trip?.status || b.status || 'SCHEDULED'}
                        </span>
                      </div>

                      <div style={{ textAlign: 'right' }}>
                        <span style={{ fontSize: '11px', color: '#64748B' }}>Guaranteed Fare: </span>
                        <span style={{ fontSize: '16px', fontWeight: 800, color: '#0A192F' }}>
                          ${Number(b.total_amount || 265).toFixed(2)} USD
                        </span>
                      </div>
                    </div>

                    {/* DYNAMIC VENDOR-GOVERNED CANCELLATION COUNTDOWN BANNER */}
                    {!isCancelled && (
                      <div style={{
                        backgroundColor: countdown.badgeBg,
                        border: `1px solid ${countdown.badgeBorder}`,
                        borderRadius: '8px',
                        padding: '10px 14px',
                        marginBottom: '14px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '10px'
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <Clock size={15} color={countdown.badgeText} style={{ flexShrink: 0 }} />
                          <div>
                            <div style={{ fontSize: '12px', fontWeight: 800, color: countdown.badgeText }}>
                              {countdown.statusText}
                            </div>
                            <div style={{ fontSize: '10.5px', color: countdown.badgeText, opacity: 0.9, marginTop: '1px' }}>
                              {countdown.detailText}
                            </div>
                          </div>
                        </div>

                        {countdown.isFreeActive && (
                          <button
                            type="button"
                            onClick={() => setCancelModalBooking(b)}
                            style={{
                              backgroundColor: '#FFFFFF',
                              border: `1px solid ${countdown.badgeBorder}`,
                              color: countdown.badgeText,
                              borderRadius: '6px',
                              padding: '5px 10px',
                              fontSize: '11px',
                              fontWeight: 800,
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px',
                              whiteSpace: 'nowrap'
                            }}
                          >
                            <Trash2 size={12} />
                            <span>Cancel Ride (0 Fees)</span>
                          </button>
                        )}
                      </div>
                    )}

                    {/* Route Details */}
                    <div className="mission-pickup-dest-grid" style={{ marginBottom: '14px' }}>
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                        <MapPin size={16} color="#0A192F" style={{ marginTop: '2px', flexShrink: 0 }} />
                        <div>
                          <div style={{ fontSize: '10.5px', fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase' }}>PICKUP</div>
                          <div style={{ fontSize: '13px', fontWeight: 700, color: '#0F172A' }}>{b.pickup_address}</div>
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                        <MapPin size={16} color="#9A7B4F" style={{ marginTop: '2px', flexShrink: 0 }} />
                        <div>
                          <div style={{ fontSize: '10.5px', fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase' }}>DESTINATION</div>
                          <div style={{ fontSize: '13px', fontWeight: 700, color: '#0F172A' }}>{b.dropoff_address || 'As Directed'}</div>
                        </div>
                      </div>
                    </div>

                    {/* Date & Chauffeur Row with Transit Flight Badge */}
                    <div style={{ backgroundColor: '#F8FAFC', padding: '12px 14px', borderRadius: '8px', border: '1px solid #E2E8F0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Calendar size={15} color="#0A192F" />
                        <span style={{ fontSize: '12.5px', fontWeight: 700, color: '#0F172A' }}>{pickupTimeFormatted}</span>
                      </div>

                      {b.flight_number && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '5px', backgroundColor: '#EFF6FF', border: '1px solid #BFDBFE', padding: '3px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 700, color: '#1E40AF' }}>
                          <Plane size={12} />
                          <span>Flight {b.flight_number} · Live Radar Synced</span>
                        </div>
                      )}

                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: '#475569' }}>
                        <Car size={15} color="#9A7B4F" />
                        <span>{(b.trip as any)?.driver_name || b.trip?.active_offer?.driver_name || 'Executive Chauffeur Assigned'}</span>
                      </div>
                    </div>

                    {/* Action Buttons Toolbar: Calendar Sync, PDF Voucher & Cancellation */}
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #F1F5F9', paddingTop: '14px' }}>
                      
                      {/* Left: PDF Terms Voucher */}
                      <button
                        type="button"
                        onClick={() => handleDownloadTerms(b)}
                        disabled={downloadingVoucherId === b.id}
                        style={{
                          padding: '7px 12px',
                          borderRadius: '6px',
                          border: '1px solid #CBD5E1',
                          backgroundColor: '#FFFFFF',
                          color: '#0F172A',
                          fontSize: '11.5px',
                          fontWeight: 700,
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          cursor: 'pointer'
                        }}
                      >
                        {downloadingVoucherId === b.id ? (
                          <>
                            <Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} />
                            <span>Generating PDF...</span>
                          </>
                        ) : (
                          <>
                            <Download size={13} color="#9A7B4F" />
                            <span>PDF Voucher &amp; Terms</span>
                          </>
                        )}
                      </button>

                      {/* Right Calendar Sync Group */}
                      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                        {/* Google Calendar */}
                        <a
                          href={generateGoogleCalendarUrl(b)}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{
                            textDecoration: 'none',
                            padding: '7px 10px',
                            borderRadius: '6px',
                            border: '1px solid #CBD5E1',
                            backgroundColor: '#FFFFFF',
                            color: '#0F172A',
                            fontSize: '11px',
                            fontWeight: 700,
                            display: 'flex',
                            alignItems: 'center',
                            gap: '5px',
                            cursor: 'pointer'
                          }}
                        >
                          <Calendar size={12} color="#0078D4" />
                          <span>Google</span>
                        </a>

                        {/* Download .ICS File */}
                        <a
                          href={getBookingCalendarIcsUrl(b.id)}
                          download={`reservation-${b.id}.ics`}
                          style={{
                            textDecoration: 'none',
                            padding: '7px 10px',
                            borderRadius: '6px',
                            border: '1px solid #CBD5E1',
                            backgroundColor: '#FFFFFF',
                            color: '#0F172A',
                            fontSize: '11px',
                            fontWeight: 700,
                            display: 'flex',
                            alignItems: 'center',
                            gap: '5px',
                            cursor: 'pointer'
                          }}
                        >
                          <Download size={12} color="#9A7B4F" />
                          <span>Apple / .ICS</span>
                        </a>

                        {/* Outlook 365 */}
                        <a
                          href={generateOutlookCalendarUrl(b)}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{
                            textDecoration: 'none',
                            padding: '7px 10px',
                            borderRadius: '6px',
                            border: '1px solid #CBD5E1',
                            backgroundColor: '#FFFFFF',
                            color: '#0F172A',
                            fontSize: '11px',
                            fontWeight: 700,
                            display: 'flex',
                            alignItems: 'center',
                            gap: '5px',
                            cursor: 'pointer'
                          }}
                        >
                          <Calendar size={12} color="#0078D4" />
                          <span>Outlook 365</span>
                        </a>
                      </div>

                    </div>

                  </div>
                );
              })}
            </div>
          )}

        </div>

        {/* Modal Footer */}
        <div style={{ padding: '16px 28px', backgroundColor: '#FFFFFF', borderTop: '1px solid #EAE6DF', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontSize: '11.5px', color: '#64748B' }}>
            Need 24/7 Dispatch assistance? Call <strong>+1 (215) 555-0144</strong>
          </div>
          <button
            onClick={onClose}
            style={{
              padding: '9px 18px',
              backgroundColor: '#F1F5F9',
              color: '#0F172A',
              border: '1px solid #CBD5E1',
              borderRadius: '6px',
              fontSize: '12.5px',
              fontWeight: 700,
              cursor: 'pointer'
            }}
          >
            Close
          </button>
        </div>

      </div>

      {/* SELF-SERVICE CANCELLATION CONFIRMATION DIALOG */}
      {cancelModalBooking && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(10, 25, 47, 0.85)',
            zIndex: 10000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px'
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setCancelModalBooking(null);
          }}
        >
          <div style={{
            backgroundColor: '#FFFFFF',
            borderRadius: '16px',
            maxWidth: '520px',
            width: '100%',
            padding: '28px',
            boxShadow: '0 20px 40px rgba(0,0,0,0.3)',
            border: '1px solid #E2E8F0'
          }}>
            <div style={{ width: '48px', height: '48px', borderRadius: '50%', backgroundColor: '#FEE2E2', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px auto' }}>
              <Trash2 size={24} color="#DC2626" />
            </div>

            <h3 style={{ fontSize: '20px', fontWeight: 800, color: '#0A192F', textAlign: 'center', margin: '0 0 8px 0' }}>
              Cancel Reservation #{cancelModalBooking.id}?
            </h3>

            {(() => {
              const cd = computeCancellationCountdown(cancelModalBooking);
              return (
                <div style={{ backgroundColor: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: '8px', padding: '14px', marginBottom: '20px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', fontWeight: 800, color: '#166534', marginBottom: '4px' }}>
                    <ShieldCheck size={16} />
                    <span>Complimentary Cancellation Policy Active</span>
                  </div>
                  <p style={{ margin: 0, fontSize: '12px', color: '#14532D', lineHeight: '1.5' }}>
                    Under <strong>{cd.vendorName}'s {cd.cutoffHours}-hour policy</strong>, your <strong>100% Pre-Authorization hold of ${Number(cancelModalBooking.total_amount || 0).toFixed(2)} USD</strong> will be released immediately back to your card. Zero cancellation fees will be charged.
                  </p>
                </div>
              );
            })()}

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button
                type="button"
                onClick={() => setCancelModalBooking(null)}
                disabled={cancellingBookingId === cancelModalBooking.id}
                style={{
                  padding: '10px 18px',
                  backgroundColor: '#FFFFFF',
                  color: '#64748B',
                  border: '1px solid #CBD5E1',
                  borderRadius: '8px',
                  fontSize: '13px',
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                Keep Reservation
              </button>

              <button
                type="button"
                onClick={() => handleConfirmCancellation(cancelModalBooking)}
                disabled={cancellingBookingId === cancelModalBooking.id}
                style={{
                  padding: '10px 20px',
                  backgroundColor: '#DC2626',
                  color: '#FFFFFF',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '13px',
                  fontWeight: 800,
                  cursor: cancellingBookingId === cancelModalBooking.id ? 'wait' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                {cancellingBookingId === cancelModalBooking.id ? (
                  <>
                    <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} />
                    <span>Releasing Pre-Auth Hold...</span>
                  </>
                ) : (
                  <>
                    <Trash2 size={14} />
                    <span>Confirm &amp; Release Escrow</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
