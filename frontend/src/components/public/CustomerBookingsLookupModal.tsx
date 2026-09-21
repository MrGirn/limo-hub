import React, { useState, useEffect } from 'react';
import { 
  Search, X, Calendar, Clock, MapPin, User, Car, ShieldCheck, 
  ExternalLink, Download, AlertCircle, CheckCircle2, ChevronRight,
  Phone, Mail, Copy, Check, FileText
} from 'lucide-react';
import { Booking } from '../../types';
import { 
  lookupBookingsApi, 
  getBookingCalendarIcsUrl, 
  generateGoogleCalendarUrl, 
  generateOutlookCalendarUrl 
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
              Passenger & Booker Self-Service Portal
            </div>
            <h2 style={{ fontFamily: '"Libre Baskerville", Georgia, serif', fontSize: '22px', fontWeight: 700, color: '#0A192F', margin: 0 }}>
              Find Your Upcoming Bookings & Schedule
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
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ fontSize: '12px', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Found {bookings.length} {bookings.length === 1 ? 'Reservation' : 'Reservations'}
              </div>

              {bookings.map((b) => {
                const statusTheme = getStatusColor(b.trip?.status || b.status || 'SCHEDULED');
                const pickupTimeFormatted = b.pickup_time_utc ? new Date(b.pickup_time_utc).toLocaleString('en-US', {
                  weekday: 'short',
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                  hour: 'numeric',
                  minute: '2-digit',
                  hour12: true
                }) : 'Scheduled Departure';

                return (
                  <div
                    key={b.id}
                    style={{
                      backgroundColor: '#FFFFFF',
                      borderRadius: '12px',
                      border: '1px solid #EAE6DF',
                      padding: '20px',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.03)'
                    }}
                  >
                    {/* Top Row: Ref + Status + Pre-Auth */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', borderBottom: '1px solid #F1F5F9', paddingBottom: '12px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span style={{ fontFamily: 'monospace', fontWeight: 800, fontSize: '13.5px', color: '#0A192F' }}>
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
                          borderRadius: '4px'
                        }}>
                          {b.trip?.status || b.status || 'SCHEDULED'}
                        </span>
                      </div>

                      <div style={{ textAlign: 'right' }}>
                        <span style={{ fontSize: '11px', color: '#64748B' }}>Guaranteed Fare: </span>
                        <span style={{ fontSize: '15px', fontWeight: 800, color: '#0A192F' }}>
                          ${Number(b.total_amount || 265).toFixed(2)} USD
                        </span>
                      </div>
                    </div>

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

                    {/* Date & Chauffeur Row */}
                    <div style={{ backgroundColor: '#F8FAFC', padding: '12px 14px', borderRadius: '8px', border: '1px solid #E2E8F0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Calendar size={15} color="#0A192F" />
                        <span style={{ fontSize: '12.5px', fontWeight: 700, color: '#0F172A' }}>{pickupTimeFormatted}</span>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: '#475569' }}>
                        <Car size={15} color="#9A7B4F" />
                        <span>{(b.trip as any)?.driver_name || b.trip?.active_offer?.driver_name || 'Executive Chauffeur Assigned'}</span>
                      </div>
                    </div>

                    {/* 1-Click Action Buttons: Calendar Sync, ICS Download & Receipt */}
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', justifyContent: 'flex-end', borderTop: '1px solid #F1F5F9', paddingTop: '14px' }}>
                      
                      {/* Add to Google Calendar */}
                      <a
                        href={generateGoogleCalendarUrl(b)}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          textDecoration: 'none',
                          padding: '7px 12px',
                          borderRadius: '6px',
                          border: '1px solid #CBD5E1',
                          backgroundColor: '#FFFFFF',
                          color: '#0F172A',
                          fontSize: '11.5px',
                          fontWeight: 700,
                          display: 'flex',
                          alignItems: 'center',
                          gap: '5px',
                          cursor: 'pointer'
                        }}
                      >
                        <Calendar size={13} color="#0078D4" />
                        <span>Add to Google Calendar</span>
                        <ExternalLink size={11} color="#64748B" />
                      </a>

                      {/* Download .ICS File for Apple Calendar / Outlook */}
                      <a
                        href={getBookingCalendarIcsUrl(b.id)}
                        download={`reservation-${b.id}.ics`}
                        style={{
                          textDecoration: 'none',
                          padding: '7px 12px',
                          borderRadius: '6px',
                          border: '1px solid #CBD5E1',
                          backgroundColor: '#FFFFFF',
                          color: '#0F172A',
                          fontSize: '11.5px',
                          fontWeight: 700,
                          display: 'flex',
                          alignItems: 'center',
                          gap: '5px',
                          cursor: 'pointer'
                        }}
                      >
                        <Download size={13} color="#9A7B4F" />
                        <span>Download .ICS (Apple / Outlook)</span>
                      </a>

                      {/* Add to Outlook Web */}
                      <a
                        href={generateOutlookCalendarUrl(b)}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          textDecoration: 'none',
                          padding: '7px 12px',
                          borderRadius: '6px',
                          border: '1px solid #CBD5E1',
                          backgroundColor: '#FFFFFF',
                          color: '#0F172A',
                          fontSize: '11.5px',
                          fontWeight: 700,
                          display: 'flex',
                          alignItems: 'center',
                          gap: '5px',
                          cursor: 'pointer'
                        }}
                      >
                        <Calendar size={13} color="#0078D4" />
                        <span>Outlook 365</span>
                        <ExternalLink size={11} color="#64748B" />
                      </a>

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
    </div>
  );
};
