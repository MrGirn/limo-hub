import React, { useState, useEffect } from 'react';
import { 
  Search, X, Calendar, Clock, MapPin, User, Car, ShieldCheck, 
  ExternalLink, Download, AlertCircle, CheckCircle2, ChevronRight,
  ChevronDown, Phone, Mail, Copy, Check, FileText, Trash2, Plane, Sparkles,
  AlertTriangle, ArrowRight, Loader2, CreditCard, MessageSquare
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
import { CustomerSupportChatWidget } from './CustomerSupportChatWidget';
import { LiveRideTrackingModal } from './LiveRideTrackingModal';
import { BookingOperationsModal } from '../BookingOperationsModal';

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

  // Live Tracking Modal State
  const [liveTrackingBookingId, setLiveTrackingBookingId] = useState<string | null>(null);

  // Calendar Dropdown state
  const [activeCalendarDropdownId, setActiveCalendarDropdownId] = useState<string | null>(null);

  // Cancellation State
  const [cancelModalBooking, setCancelModalBooking] = useState<Booking | null>(null);
  const [cancellingBookingId, setCancellingBookingId] = useState<string | null>(null);
  const [cancelResult, setCancelResult] = useState<{ id: string; message: string; isWithinWindow: boolean } | null>(null);
  const [downloadingVoucherId, setDownloadingVoucherId] = useState<string | null>(null);
  const [supportModalBooking, setSupportModalBooking] = useState<Booking | null>(null);
  const [viewingDocBookingId, setViewingDocBookingId] = useState<string | null>(null);
  const [viewingDocType, setViewingDocType] = useState<'invoice' | 'receipt'>('invoice');

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
        deadlineDate,
        statusText: 'Free cancellation window closed',
        detailText: `Subject to standard vendor cancellation policy (${vendorName})`,
        badgeBg: '#F8FAFC',
        badgeText: '#64748B',
        badgeBorder: '#E2E8F0',
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
      statusText: `Free cancellation until ${deadlineDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}, ${deadlineDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`,
      detailText: `${timeRemainingStr} · ${cutoffHours}-hour business rule`,
      badgeBg: '#F0FDF4',
      badgeText: '#166534',
      badgeBorder: '#DCFCE7'
    };
  };

  const handleConfirmCancellation = async (booking: Booking) => {
    setCancellingBookingId(booking.id);
    try {
      const response = await cancelBookingApi(booking.id, {
        reason: 'Customer initiated self-service cancellation via web portal',
        cancelled_by: 'passenger'
      });
      
      setCancelResult({
        id: booking.id,
        message: response.message || 'Your booking has been cancelled and any hold has been released.',
        isWithinWindow: response.cancellation_result?.is_within_free_window ?? true
      });
      
      setCancelModalBooking(null);
      await handleSearch();
    } catch (err: any) {
      alert(`Failed to cancel booking: ${err.message || 'Unknown error'}`);
    } finally {
      setCancellingBookingId(null);
    }
  };

  const handleDownloadTerms = async (booking: Booking) => {
    setDownloadingVoucherId(booking.id);
    try {
      const voucherData = await fetchBookingTermsVoucher(booking.id);
      
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        const vendor = voucherData.vendor || {};
        const policy = voucherData.policy || {};
        const pickupStr = booking.pickup_time_utc ? new Date(booking.pickup_time_utc).toLocaleString('en-US', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          hour: 'numeric',
          minute: '2-digit',
          timeZoneName: 'short'
        }) : 'Scheduled Departure';

        printWindow.document.write(`
          <!DOCTYPE html>
          <html>
          <head>
            <title>Executive Chauffeur Terms &amp; Confirmation - #${booking.id}</title>
            <style>
              body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; color: #0f172a; margin: 40px; }
              .header { border-bottom: 2px solid #0a192f; padding-bottom: 16px; margin-bottom: 24px; display: flex; justify-content: space-between; align-items: flex-end; }
              .title { font-size: 24px; font-weight: 800; color: #0a192f; margin: 0; }
              .subtitle { font-size: 13px; color: #9a7b4f; font-weight: 700; margin-top: 4px; text-transform: uppercase; letter-spacing: 1px; }
              .card { border: 1px solid #e2e8f0; border-radius: 8px; padding: 20px; margin-bottom: 20px; }
              .section-title { font-size: 14px; font-weight: 700; color: #0a192f; margin-top: 0; margin-bottom: 12px; border-bottom: 1px solid #f1f5f9; padding-bottom: 6px; }
              .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; font-size: 13px; }
              .label { color: #64748b; font-weight: 600; }
              .value { font-weight: 700; color: #0f172a; margin-top: 2px; }
              .badge-free { background: #dcfce7; color: #166534; padding: 4px 10px; border-radius: 4px; font-weight: 700; display: inline-block; }
              .legal-text { font-size: 11px; color: #475569; line-height: 1.6; }
              .footer { margin-top: 30px; font-size: 11px; color: #94a3b8; text-align: center; border-top: 1px solid #e2e8f0; padding-top: 16px; }
              @media print { body { margin: 0; } }
            </style>
          </head>
          <body>
            <div class="header">
              <div>
                <div class="subtitle">Official Travel Voucher &amp; Commercial Terms</div>
                <h1 class="title">${vendor.name || 'Executive Chauffeur Service'}</h1>
                <div style="font-size: 12px; color: #64748b; margin-top: 4px;">Cell/License: ${vendor.license_number || 'PUC-A-00119284'} · Dispatch: ${vendor.support_phone || '610-653-0033'}</div>
              </div>
              <div style="text-align: right;">
                <div style="font-size: 12px; color: #64748b;">Booking Reference</div>
                <div style="font-size: 18px; font-weight: 800; font-family: monospace;">#${booking.id}</div>
                <div style="font-size: 11px; color: #16a34a; font-weight: 700; margin-top: 2px;">STATUS: ${booking.trip?.status || booking.status || 'CONFIRMED'}</div>
              </div>
            </div>

            <div class="card">
              <div class="section-title">Mission &amp; Itinerary Specification</div>
              <div class="grid">
                <div>
                  <div class="label">Pickup Time</div>
                  <div class="value">${pickupStr}</div>
                </div>
                <div>
                  <div class="label">Guaranteed Total Fare</div>
                  <div class="value">$${Number(booking.total_amount || 0).toFixed(2)} USD (Pre-Authorized)</div>
                </div>
                <div>
                  <div class="label">Pickup Address</div>
                  <div class="value">${booking.pickup_address}</div>
                </div>
                <div>
                  <div class="label">Dropoff Destination</div>
                  <div class="value">${booking.dropoff_address || 'As Directed'}</div>
                </div>
                <div>
                  <div class="label">Passenger</div>
                  <div class="value">${booking.party?.passenger_name || 'VIP Client'} (${booking.party?.passenger_phone || 'N/A'})</div>
                </div>
                <div>
                  <div class="label">Flight Reference</div>
                  <div class="value">${booking.flight_number ? `Flight ${booking.flight_number} (Live Radar Synchronized)` : 'Direct Ground Route'}</div>
                </div>
              </div>
            </div>

            <div class="card">
              <div class="section-title">Governing Cancellation &amp; Refund Policy</div>
              <div style="margin-bottom: 12px;">
                <span class="badge-free">Vendor Policy: ${policy.cutoff_hours || 2}-Hour Business Cutoff</span>
              </div>
              <div class="legal-text">
                <p><strong>1. Complimentary Window:</strong> You may cancel this booking with a 100% refund / release of pre-authorized funds until <strong>${policy.deadline_utc ? new Date(policy.deadline_utc).toLocaleString() : '2 hours prior to departure'}</strong>.</p>
                <p><strong>2. Late Cancellation Fee:</strong> Cancellations made within ${policy.cutoff_hours || 2} hours of scheduled departure are subject to a late fee of ${policy.fee_percentage || 100}% of the guaranteed trip fare.</p>
                <p><strong>3. Chauffeur Wait Time:</strong> Airport pickups include 60 minutes complimentary wait time from actual flight touchdown. Non-airport pickups include 15 minutes complimentary wait time.</p>
              </div>
            </div>

            <div class="footer">
              Generated by Limo Sovereign Cloud · Encrypted Authority Snapshot · Contact dispatch at ${vendor.support_phone || '610-653-0033'} or ${vendor.support_email || 'dispatch@anbtrans.com'}
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
        backgroundColor: 'rgba(10, 25, 47, 0.75)',
        backdropFilter: 'blur(5px)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px'
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          setActiveCalendarDropdownId(null);
          onClose();
        }
      }}
    >
      <style>{`
        .chauffeur-trip-grid {
          display: grid;
          grid-template-columns: 1.1fr 1.5fr 1.1fr;
          gap: 20px;
          align-items: start;
        }
        .chauffeur-docs-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 10px;
        }
        @media (max-width: 768px) {
          .chauffeur-trip-grid {
            grid-template-columns: 1fr;
            gap: 16px;
          }
          .chauffeur-docs-grid {
            grid-template-columns: 1fr;
            gap: 8px;
          }
          .lookup-card-top-row {
            flex-direction: column;
            align-items: flex-start !important;
            gap: 10px !important;
          }
          .lookup-search-form {
            flex-direction: column;
          }
          .lookup-submit-btn {
            width: 100%;
          }
        }
      `}</style>

      <div 
        className="lookup-modal-content"
        style={{
          width: '100%',
          maxWidth: '860px',
          maxHeight: '90vh',
          backgroundColor: '#FFFFFF',
          borderRadius: '16px',
          boxShadow: '0 25px 50px -12px rgba(10, 25, 47, 0.25)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          border: '1px solid #E2E8F0'
        }}
        onClick={() => {
          if (activeCalendarDropdownId) setActiveCalendarDropdownId(null);
        }}
      >
        
        {/* Modal Header: Simpler Heading */}
        <div style={{
          padding: '28px 32px 20px 32px',
          borderBottom: '1px solid #F1F5F9',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          backgroundColor: '#FFFFFF'
        }}>
          <div>
            <div style={{ fontSize: '11px', fontWeight: 800, color: '#9A7B4F', textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: '6px' }}>
              PASSENGER &amp; BOOKER PORTAL
            </div>
            <h2 style={{ fontFamily: '"Libre Baskerville", Georgia, serif', fontSize: '26px', fontWeight: 700, color: '#0A192F', margin: 0, letterSpacing: '-0.01em' }}>
              Your bookings
            </h2>
            <p style={{ margin: '6px 0 0 0', fontSize: '13.5px', color: '#64748B' }}>
              View your trip, documents and travel updates.
            </p>
          </div>

          <button
            onClick={onClose}
            aria-label="Close"
            style={{
              background: '#F8FAFC',
              border: '1px solid #E2E8F0',
              color: '#64748B',
              cursor: 'pointer',
              padding: '8px',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'background-color 0.15s'
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Search Input Bar */}
        <div style={{ padding: '20px 32px', borderBottom: '1px solid #F1F5F9', backgroundColor: '#FAFBFD' }}>
          <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 600, color: '#334155', marginBottom: '8px' }}>
            Booking reference, email or phone
          </label>
          <form 
            onSubmit={(e) => {
              e.preventDefault();
              handleSearch();
            }}
            className="lookup-search-form"
            style={{ display: 'flex', gap: '10px' }}
          >
            <div style={{ position: 'relative', flex: 1, display: 'flex', alignItems: 'center' }}>
              <Search size={18} style={{ position: 'absolute', left: '14px', color: '#94A3B8', pointerEvents: 'none' }} />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="e.g. bk-0a36ddbf, +1 (484) 800-6629, or billing@client.com"
                style={{
                  width: '100%',
                  padding: '12px 14px 12px 42px',
                  borderRadius: '8px',
                  border: '1.5px solid #CBD5E1',
                  fontSize: '14px',
                  outline: 'none',
                  backgroundColor: '#FFFFFF',
                  color: '#0F172A',
                  boxSizing: 'border-box'
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
                    cursor: 'pointer',
                    padding: '4px'
                  }}
                >
                  <X size={15} />
                </button>
              )}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="lookup-submit-btn"
              style={{
                padding: '12px 26px',
                backgroundColor: '#0A192F',
                color: '#FFFFFF',
                border: 'none',
                borderRadius: '8px',
                fontSize: '13.5px',
                fontWeight: 700,
                cursor: loading ? 'wait' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                whiteSpace: 'nowrap'
              }}
            >
              <span>{loading ? 'Searching...' : 'Find trips'}</span>
              <Search size={15} />
            </button>
          </form>

          {/* Quick search suggestions */}
          <div style={{ display: 'flex', gap: '8px', marginTop: '10px', alignItems: 'center', fontSize: '11.5px', color: '#64748B', flexWrap: 'wrap' }}>
            <span>Quick search:</span>
            <button
              type="button"
              onClick={() => { setSearchQuery('+14848006629'); handleSearch('+14848006629'); }}
              style={{ background: '#FFFFFF', border: '1px solid #CBD5E1', borderRadius: '4px', padding: '3px 8px', fontSize: '11px', fontWeight: 600, cursor: 'pointer', color: '#0A192F' }}
            >
              +1 (484) 800-6629
            </button>
            <button
              type="button"
              onClick={() => { setSearchQuery('billing@client.com'); handleSearch('billing@client.com'); }}
              style={{ background: '#FFFFFF', border: '1px solid #CBD5E1', borderRadius: '4px', padding: '3px 8px', fontSize: '11px', fontWeight: 600, cursor: 'pointer', color: '#0A192F' }}
            >
              billing@client.com
            </button>
          </div>
        </div>

        {/* Results Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '24px 32px', backgroundColor: '#F8FAFC' }}>
          
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
            <div style={{ textAlign: 'center', padding: '48px 20px', color: '#64748B' }}>
              <div style={{ width: '48px', height: '48px', borderRadius: '50%', backgroundColor: '#FFFFFF', border: '1px solid #E2E8F0', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px auto' }}>
                <Calendar size={22} color="#0A192F" />
              </div>
              <div style={{ fontSize: '15px', fontWeight: 700, color: '#0A192F' }}>
                Enter your booking details to view your schedule
              </div>
              <div style={{ fontSize: '12.5px', color: '#64748B', maxWidth: '420px', margin: '6px auto 0 auto' }}>
                Search by your booking reference code, passenger phone number, or booker email.
              </div>
            </div>
          )}

          {hasSearched && bookings.length === 0 && !loading && !error && (
            <div style={{ textAlign: 'center', padding: '48px 20px', color: '#64748B' }}>
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
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {bookings.map((b) => {
                const statusTheme = getStatusColor(b.trip?.status || b.status || 'SCHEDULED');
                const isCancelled = (b.trip?.status || b.status) === 'CANCELLED';
                
                const pickupDateObj = b.pickup_time_utc ? new Date(b.pickup_time_utc) : new Date();
                const departureDateFormatted = pickupDateObj.toLocaleDateString('en-US', {
                  weekday: 'long',
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric'
                });
                const departureTimeFormatted = pickupDateObj.toLocaleTimeString('en-US', {
                  hour: 'numeric',
                  minute: '2-digit',
                  hour12: true
                });

                const countdown = computeCancellationCountdown(b);
                const isCalDropdownOpen = activeCalendarDropdownId === b.id;

                return (
                  <div
                    key={b.id}
                    style={{
                      backgroundColor: '#FFFFFF',
                      borderRadius: '12px',
                      border: '1px solid #E2E8F0',
                      padding: '24px',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
                      position: 'relative'
                    }}
                  >
                    {/* Top Row: Ref + Status + Guaranteed Fare */}
                    <div className="lookup-card-top-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '18px', borderBottom: '1px solid #F1F5F9', paddingBottom: '14px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
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
                          fontWeight: 700,
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

                      {/* Clear Fare: guaranteed price and currency together */}
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '11px', color: '#64748B', fontWeight: 500 }}>Guaranteed fare</div>
                        <div style={{ fontSize: '20px', fontWeight: 800, color: '#0A192F', lineHeight: '1.2' }}>
                          ${Number(b.total_amount || 265).toFixed(2)} <span style={{ fontSize: '12.5px', fontWeight: 600, color: '#64748B' }}>USD</span>
                        </div>
                      </div>
                    </div>

                    {/* Trip Details First: 3-column scan */}
                    <div className="chauffeur-trip-grid" style={{ marginBottom: '18px' }}>
                      
                      {/* Col 1: Date & Departure Time */}
                      <div>
                        <div style={{ fontSize: '13px', color: '#475569', fontWeight: 500 }}>
                          {departureDateFormatted}
                        </div>
                        <div style={{ fontSize: '28px', fontWeight: 800, color: '#0A192F', margin: '4px 0 2px 0', lineHeight: 1.1 }}>
                          {departureTimeFormatted}
                        </div>
                        <div style={{ fontSize: '10px', fontWeight: 800, color: '#94A3B8', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                          DEPARTURE TIME
                        </div>

                        {b.flight_number && (
                          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', backgroundColor: '#EFF6FF', border: '1px solid #BFDBFE', padding: '3px 7px', borderRadius: '4px', fontSize: '11px', fontWeight: 600, color: '#1E40AF', marginTop: '8px' }}>
                            <Plane size={11} />
                            <span>Flight {b.flight_number}</span>
                          </div>
                        )}
                      </div>

                      {/* Col 2: Pickup & Destination Route */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', position: 'relative' }}>
                        
                        {/* Pickup */}
                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                          <div style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: '#0A192F', marginTop: '4px', flexShrink: 0 }} />
                          <div>
                            <div style={{ fontSize: '10px', fontWeight: 800, color: '#94A3B8', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                              PICKUP
                            </div>
                            <div style={{ fontSize: '13.5px', fontWeight: 700, color: '#0F172A', marginTop: '1px' }}>
                              {b.pickup_address}
                            </div>
                          </div>
                        </div>

                        {/* Dropoff */}
                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                          <div style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: '#9A7B4F', marginTop: '4px', flexShrink: 0 }} />
                          <div>
                            <div style={{ fontSize: '10px', fontWeight: 800, color: '#94A3B8', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                              DESTINATION
                            </div>
                            <div style={{ fontSize: '13.5px', fontWeight: 700, color: '#0F172A', marginTop: '1px' }}>
                              {b.dropoff_address || 'As Directed'}
                            </div>
                          </div>
                        </div>

                      </div>

                      {/* Col 3: Chauffeur Status */}
                      <div>
                        <div style={{ fontSize: '10px', fontWeight: 800, color: '#94A3B8', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                          CHAUFFEUR
                        </div>
                        <div style={{ fontSize: '13.5px', fontWeight: 700, color: '#0F172A', marginTop: '2px' }}>
                          {(b.trip as any)?.driver_name || b.trip?.active_offer?.driver_name || 'Executive Chauffeur Assigned'}
                        </div>
                        <div style={{ fontSize: '12px', color: '#64748B', marginTop: '2px' }}>
                          {(b as any).vehicle_category || (b as any).tier || 'Executive Class'}
                        </div>

                        <button
                          type="button"
                          onClick={() => setLiveTrackingBookingId(b.id)}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px',
                            padding: '7px 12px',
                            borderRadius: '6px',
                            border: '1.5px solid #0A192F',
                            backgroundColor: '#FFFFFF',
                            color: '#0A192F',
                            fontSize: '12px',
                            fontWeight: 700,
                            cursor: 'pointer',
                            marginTop: '10px',
                            transition: 'all 0.15s ease'
                          }}
                        >
                          <MapPin size={13} color="#0A192F" />
                          <span>View live tracking</span>
                        </button>
                      </div>

                    </div>

                    {/* Quieter Cancellation Notice: Deadline clearly shown, cancellation as secondary action */}
                    {!isCancelled && (
                      <div style={{
                        backgroundColor: countdown.badgeBg,
                        border: `1px solid ${countdown.badgeBorder}`,
                        borderRadius: '8px',
                        padding: '10px 14px',
                        marginBottom: '18px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '12px',
                        flexWrap: 'wrap'
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, minWidth: '220px' }}>
                          <CheckCircle2 size={16} color={countdown.badgeText} style={{ flexShrink: 0 }} />
                          <div style={{ fontSize: '12.5px', color: countdown.badgeText }}>
                            <span style={{ fontWeight: 700 }}>{countdown.statusText}</span>
                            <span style={{ opacity: 0.85, marginLeft: '6px' }}>· {countdown.detailText}</span>
                          </div>
                        </div>

                        {countdown.isFreeActive && (
                          <button
                            type="button"
                            onClick={() => setCancelModalBooking(b)}
                            style={{
                              background: 'none',
                              border: 'none',
                              color: '#64748B',
                              fontSize: '12px',
                              fontWeight: 600,
                              textDecoration: 'underline',
                              cursor: 'pointer',
                              padding: '2px 4px',
                              whiteSpace: 'nowrap'
                            }}
                          >
                            Cancel ride
                          </button>
                        )}
                      </div>
                    )}

                    {/* Grouped Documents Section */}
                    <div style={{ borderTop: '1px solid #F1F5F9', paddingTop: '16px', marginBottom: '16px' }}>
                      <div style={{ fontSize: '11px', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '10px' }}>
                        Trip documents
                      </div>

                      <div className="chauffeur-docs-grid">
                        
                        {/* PDF Voucher & Terms */}
                        <button
                          type="button"
                          onClick={() => handleDownloadTerms(b)}
                          disabled={downloadingVoucherId === b.id}
                          style={{
                            padding: '10px 14px',
                            borderRadius: '8px',
                            border: '1px solid #CBD5E1',
                            backgroundColor: '#FFFFFF',
                            color: '#0F172A',
                            fontSize: '12px',
                            fontWeight: 700,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '7px',
                            cursor: 'pointer'
                          }}
                        >
                          {downloadingVoucherId === b.id ? (
                            <>
                              <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} />
                              <span>Generating PDF...</span>
                            </>
                          ) : (
                            <>
                              <Download size={14} color="#9A7B4F" />
                              <span>PDF Voucher &amp; Terms</span>
                            </>
                          )}
                        </button>

                        {/* Master Invoice */}
                        <button
                          type="button"
                          onClick={() => {
                            setViewingDocBookingId(b.id);
                            setViewingDocType('invoice');
                          }}
                          style={{
                            padding: '10px 14px',
                            borderRadius: '8px',
                            border: '1px solid #CBD5E1',
                            backgroundColor: '#FFFFFF',
                            color: '#0F172A',
                            fontSize: '12px',
                            fontWeight: 700,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '7px',
                            cursor: 'pointer'
                          }}
                        >
                          <FileText size={14} color="#0A192F" />
                          <span>Master Invoice</span>
                        </button>

                        {/* Receipt */}
                        <button
                          type="button"
                          onClick={() => {
                            setViewingDocBookingId(b.id);
                            setViewingDocType('receipt');
                          }}
                          style={{
                            padding: '10px 14px',
                            borderRadius: '8px',
                            border: '1px solid #CBD5E1',
                            backgroundColor: '#FFFFFF',
                            color: '#0F172A',
                            fontSize: '12px',
                            fontWeight: 700,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '7px',
                            cursor: 'pointer'
                          }}
                        >
                          <CreditCard size={14} color="#0A192F" />
                          <span>Receipt</span>
                        </button>

                      </div>
                    </div>

                    {/* Bottom Action Controls: One Calendar Dropdown & Support */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #F1F5F9', paddingTop: '14px', flexWrap: 'wrap', gap: '10px' }}>
                      
                      {/* One Calendar Control: Google, Apple, Outlook in Dropdown */}
                      <div style={{ position: 'relative' }}>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveCalendarDropdownId(isCalDropdownOpen ? null : b.id);
                          }}
                          style={{
                            padding: '8px 14px',
                            borderRadius: '6px',
                            border: '1px solid #CBD5E1',
                            backgroundColor: '#FFFFFF',
                            color: '#0A192F',
                            fontSize: '12px',
                            fontWeight: 700,
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            cursor: 'pointer'
                          }}
                        >
                          <Calendar size={14} color="#0A192F" />
                          <span>Add to calendar</span>
                          <ChevronDown size={14} color="#64748B" />
                        </button>

                        {isCalDropdownOpen && (
                          <div 
                            style={{
                              position: 'absolute',
                              bottom: 'calc(100% + 6px)',
                              left: 0,
                              backgroundColor: '#FFFFFF',
                              border: '1px solid #CBD5E1',
                              borderRadius: '8px',
                              boxShadow: '0 10px 25px rgba(0,0,0,0.12)',
                              zIndex: 100,
                              minWidth: '180px',
                              padding: '4px 0',
                              display: 'flex',
                              flexDirection: 'column'
                            }}
                            onClick={(e) => e.stopPropagation()}
                          >
                            <a
                              href={generateGoogleCalendarUrl(b)}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={() => setActiveCalendarDropdownId(null)}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                padding: '9px 14px',
                                color: '#0F172A',
                                fontSize: '12px',
                                fontWeight: 600,
                                textDecoration: 'none',
                                transition: 'background-color 0.15s'
                              }}
                              onMouseOver={(e) => (e.currentTarget.style.backgroundColor = '#F8FAFC')}
                              onMouseOut={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                            >
                              <Calendar size={13} color="#0A192F" />
                              <span>Google Calendar</span>
                            </a>

                            <a
                              href={getBookingCalendarIcsUrl(b.id)}
                              download={`reservation-${b.id}.ics`}
                              onClick={() => setActiveCalendarDropdownId(null)}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                padding: '9px 14px',
                                color: '#0F172A',
                                fontSize: '12px',
                                fontWeight: 600,
                                textDecoration: 'none',
                                transition: 'background-color 0.15s'
                              }}
                              onMouseOver={(e) => (e.currentTarget.style.backgroundColor = '#F8FAFC')}
                              onMouseOut={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                            >
                              <Download size={13} color="#9A7B4F" />
                              <span>Apple / .ICS</span>
                            </a>

                            <a
                              href={generateOutlookCalendarUrl(b)}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={() => setActiveCalendarDropdownId(null)}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                padding: '9px 14px',
                                color: '#0F172A',
                                fontSize: '12px',
                                fontWeight: 600,
                                textDecoration: 'none',
                                transition: 'background-color 0.15s'
                              }}
                              onMouseOver={(e) => (e.currentTarget.style.backgroundColor = '#F8FAFC')}
                              onMouseOut={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                            >
                              <Calendar size={13} color="#0A192F" />
                              <span>Outlook 365</span>
                            </a>
                          </div>
                        )}
                      </div>

                      {/* Contact Support Button */}
                      <button
                        type="button"
                        onClick={() => setSupportModalBooking(b)}
                        style={{
                          padding: '8px 14px',
                          borderRadius: '6px',
                          border: '1px solid #CBD5E1',
                          backgroundColor: '#0A192F',
                          color: '#FFFFFF',
                          fontSize: '12px',
                          fontWeight: 700,
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          cursor: 'pointer'
                        }}
                      >
                        <MessageSquare size={13} color="#9A7B4F" />
                        <span>Contact support</span>
                      </button>

                    </div>

                  </div>
                );
              })}
            </div>
          )}

        </div>

        {/* Modal Footer */}
        <div style={{ padding: '16px 32px', backgroundColor: '#FFFFFF', borderTop: '1px solid #F1F5F9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontSize: '12px', color: '#64748B' }}>
            Need 24/7 Dispatch assistance? Call <strong style={{ color: '#0A192F' }}>610-653-0033</strong>
          </div>
          <button
            onClick={onClose}
            style={{
              padding: '9px 20px',
              backgroundColor: '#F8FAFC',
              color: '#0F172A',
              border: '1px solid #CBD5E1',
              borderRadius: '6px',
              fontSize: '13px',
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

      {/* RIDE-SPECIFIC CUSTOMER SUPPORT CHAT WIDGET */}
      {supportModalBooking && (
        <CustomerSupportChatWidget
          initialBookingId={supportModalBooking.id}
          initialCustomerName={supportModalBooking.party?.passenger_name || ''}
          initialCustomerPhone={supportModalBooking.party?.passenger_phone || ''}
          initialCustomerEmail={(supportModalBooking.party as any)?.passenger_email || (supportModalBooking.party as any)?.email || ''}
          vendorId={supportModalBooking.vendor_id || 'vendor_anb_philly'}
          vendorName="Executive Concierge"
          isOpenExternal={true}
          onCloseExternal={() => setSupportModalBooking(null)}
        />
      )}

      {/* LIVE CHAUFFEUR RADAR & TELEMETRY TRACKING MODAL */}
      {liveTrackingBookingId && (
        <LiveRideTrackingModal
          bookingId={liveTrackingBookingId}
          isOpen={!!liveTrackingBookingId}
          onClose={() => setLiveTrackingBookingId(null)}
        />
      )}

      {/* CUSTOMER INVOICE & RECEIPT MODAL */}
      {viewingDocBookingId && (
        <BookingOperationsModal
          bookingId={viewingDocBookingId}
          isOpen={!!viewingDocBookingId}
          initialTab={viewingDocType}
          onClose={() => setViewingDocBookingId(null)}
          onSuccess={() => {}}
        />
      )}

    </div>
  );
};
