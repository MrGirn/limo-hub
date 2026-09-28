import React, { useState, useEffect } from 'react';
import { 
  Inbox, Search, Filter, Clock, AlertTriangle, CheckCircle2, 
  Send, User, Phone, Mail, Car, MapPin, Plane, Shield, 
  FileText, ArrowUpRight, MessageSquare, Sparkles, Loader2, 
  RefreshCw, Check
} from 'lucide-react';
import { 
  fetchVendorSupportTicketsApi, 
  replyVendorTicketApi, 
  resolveVendorTicketApi, 
  escalateTicketToGlobalHubApi,
  SupportTicket, 
  TicketMessage 
} from '../../api';

interface VendorSupportInboxTabProps {
  vendorId: string;
  vendorName?: string;
}

export const VendorSupportInboxTab: React.FC<VendorSupportInboxTabProps> = ({
  vendorId,
  vendorName = 'Vendor Operations'
}) => {
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Reply Form State
  const [replyText, setReplyText] = useState('');
  const [isInternalNote, setIsInternalNote] = useState(false);
  const [isPostingReply, setIsPostingReply] = useState(false);

  // Resolve Modal State
  const [isResolveModalOpen, setIsResolveModalOpen] = useState(false);
  const [resolutionNotes, setResolutionNotes] = useState('');
  const [isResolving, setIsResolving] = useState(false);

  // Escalate State
  const [isEscalating, setIsEscalating] = useState(false);

  const loadTickets = async () => {
    setLoading(true);
    try {
      const data = await fetchVendorSupportTicketsApi(vendorId, statusFilter);
      setTickets(data);
      if (data.length > 0 && !selectedTicketId) {
        setSelectedTicketId(data[0].id);
      }
    } catch (err: any) {
      console.error('Error fetching vendor tickets:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTickets();
    const interval = setInterval(loadTickets, 20000); // auto-refresh every 20s
    return () => clearInterval(interval);
  }, [vendorId, statusFilter]);

  const selectedTicket = tickets.find(t => t.id === selectedTicketId) || null;

  const handleSendReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTicket || !replyText.trim()) return;

    setIsPostingReply(true);
    try {
      const newMsg = await replyVendorTicketApi(vendorId, selectedTicket.id, {
        sender_name: `${vendorName} Dispatch`,
        message_body: replyText.trim(),
        is_internal_note: isInternalNote
      });

      setTickets(prev => prev.map(t => t.id === selectedTicket.id ? {
        ...t,
        status: isInternalNote ? t.status : 'PENDING_CUSTOMER',
        messages: [...t.messages, newMsg]
      } : t));

      setReplyText('');
    } catch (err: any) {
      alert(err.message || 'Failed to send reply');
    } finally {
      setIsPostingReply(false);
    }
  };

  const handleResolveTicket = async () => {
    if (!selectedTicket || !resolutionNotes.trim()) return;

    setIsResolving(true);
    try {
      const updated = await resolveVendorTicketApi(vendorId, selectedTicket.id, {
        resolution_notes: resolutionNotes.trim(),
        resolved_by: `${vendorName} Dispatcher`
      });

      setTickets(prev => prev.map(t => t.id === selectedTicket.id ? updated : t));
      setIsResolveModalOpen(false);
      setResolutionNotes('');
    } catch (err: any) {
      alert(err.message || 'Failed to resolve ticket');
    } finally {
      setIsResolving(false);
    }
  };

  const handleEscalateToHub = async () => {
    if (!selectedTicket) return;
    const reason = prompt('Please enter the reason for escalating to Global Hub Clearinghouse:', 'Requires multi-city affiliate re-assignment or billing adjustment');
    if (!reason) return;

    setIsEscalating(true);
    try {
      const updated = await escalateTicketToGlobalHubApi(selectedTicket.id, reason);
      setTickets(prev => prev.map(t => t.id === selectedTicket.id ? updated : t));
      alert('Ticket successfully escalated to Global Hub Central Dispatch.');
    } catch (err: any) {
      alert(err.message || 'Escalation failed');
    } finally {
      setIsEscalating(false);
    }
  };

  const applyCannedResponse = (text: string) => {
    setReplyText(text);
  };

  const filteredTickets = tickets.filter(t => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      t.ticket_number.toLowerCase().includes(q) ||
      t.customer_name.toLowerCase().includes(q) ||
      t.customer_phone.includes(q) ||
      t.subject.toLowerCase().includes(q) ||
      (t.booking_id && t.booking_id.toLowerCase().includes(q))
    );
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: '16px' }}>
      {/* TOP STATS & COMMAND BAR */}
      <div style={{
        backgroundColor: '#FFFFFF',
        borderRadius: '12px',
        border: '1px solid #E2E8F0',
        padding: '16px 20px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '12px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            width: '42px',
            height: '42px',
            borderRadius: '10px',
            backgroundColor: '#0F172A',
            color: '#F59E0B',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <Inbox size={22} />
          </div>
          <div>
            <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: '#0F172A' }}>
              Carrier Support & Concierge Inquiries
            </h2>
            <p style={{ margin: '2px 0 0 0', fontSize: '12px', color: '#64748B' }}>
              Real-time customer inquiries, live SLA countdown timers, and automated Hub escalation
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            onClick={loadTickets}
            style={{
              padding: '8px 14px',
              backgroundColor: '#F8FAFC',
              border: '1px solid #CBD5E1',
              borderRadius: '6px',
              fontSize: '12px',
              fontWeight: 600,
              color: '#334155',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            <span>Refresh Feed</span>
          </button>
        </div>
      </div>

      {/* MAIN TWO-PANE LAYOUT */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'minmax(320px, 380px) 1fr',
        gap: '16px',
        flex: 1,
        minHeight: '600px',
        maxHeight: 'calc(100vh - 240px)'
      }}>
        {/* LEFT PANE: TICKET ROSTER */}
        <div style={{
          backgroundColor: '#FFFFFF',
          borderRadius: '12px',
          border: '1px solid #E2E8F0',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden'
        }}>
          {/* SEARCH & FILTER CONTROLS */}
          <div style={{ padding: '12px', borderBottom: '1px solid #E2E8F0', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ position: 'relative' }}>
              <Search size={14} color="#94A3B8" style={{ position: 'absolute', left: '10px', top: '10px' }} />
              <input
                type="text"
                placeholder="Search ticket #, passenger, phone..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 10px 8px 32px',
                  borderRadius: '6px',
                  border: '1px solid #CBD5E1',
                  fontSize: '12px',
                  boxSizing: 'border-box'
                }}
              />
            </div>

            <div style={{ display: 'flex', gap: '4px', overflowX: 'auto', paddingBottom: '2px' }}>
              {['ALL', 'ASSIGNED_TO_VENDOR', 'OPEN', 'AI_RESOLVED', 'RESOLVED'].map(st => (
                <button
                  key={st}
                  onClick={() => setStatusFilter(st)}
                  style={{
                    padding: '4px 8px',
                    fontSize: '11px',
                    fontWeight: statusFilter === st ? 700 : 500,
                    borderRadius: '4px',
                    border: 'none',
                    backgroundColor: statusFilter === st ? '#0F172A' : '#F1F5F9',
                    color: statusFilter === st ? '#FFFFFF' : '#475569',
                    cursor: 'pointer',
                    whiteSpace: 'nowrap'
                  }}
                >
                  {st === 'ALL' ? 'All' : st.replace(/_/g, ' ')}
                </button>
              ))}
            </div>
          </div>

          {/* LIST */}
          <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
            {filteredTickets.length === 0 ? (
              <div style={{ padding: '32px 16px', textAlign: 'center', color: '#94A3B8', fontSize: '13px' }}>
                No tickets matching current filters.
              </div>
            ) : (
              filteredTickets.map(t => {
                const isSelected = t.id === selectedTicketId;
                const isBreached = t.is_sla_breached;
                const isUrgent = t.priority === 'URGENT_LIVE_RIDE';

                return (
                  <div
                    key={t.id}
                    onClick={() => setSelectedTicketId(t.id)}
                    style={{
                      padding: '12px 16px',
                      borderBottom: '1px solid #F1F5F9',
                      backgroundColor: isSelected ? '#F8FAFC' : '#FFFFFF',
                      borderLeft: isSelected ? '4px solid #0078D4' : '4px solid transparent',
                      cursor: 'pointer',
                      transition: 'background-color 0.15s ease'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                      <span style={{ fontWeight: 800, fontSize: '12px', color: '#0F172A' }}>#{t.ticket_number}</span>
                      
                      {/* SLA BADGE */}
                      {t.status !== 'RESOLVED' && t.status !== 'AI_RESOLVED' && t.status !== 'CLOSED' && (
                        <span style={{
                          fontSize: '10px',
                          fontWeight: 700,
                          padding: '2px 6px',
                          borderRadius: '4px',
                          backgroundColor: isBreached ? '#FEE2E2' : (isUrgent ? '#FEF3C7' : '#DCFCE7'),
                          color: isBreached ? '#DC2626' : (isUrgent ? '#92400E' : '#166534'),
                          display: 'flex',
                          alignItems: 'center',
                          gap: '3px'
                        }}>
                          <Clock size={10} />
                          {isBreached ? 'SLA BREACHED' : `${Math.max(0, t.time_remaining_minutes || 0)}m`}
                        </span>
                      )}
                    </div>

                    <div style={{ fontSize: '13px', fontWeight: 700, color: '#1E293B', marginBottom: '2px' }}>
                      {t.customer_name}
                    </div>

                    <div style={{ fontSize: '11px', color: '#64748B', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {t.subject}
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '6px' }}>
                      <span style={{
                        fontSize: '9px',
                        fontWeight: 700,
                        padding: '1px 5px',
                        borderRadius: '3px',
                        backgroundColor: '#F1F5F9',
                        color: '#475569'
                      }}>
                        {t.category.replace(/_/g, ' ')}
                      </span>
                      {t.booking_id && (
                        <span style={{ fontSize: '9px', color: '#0078D4', fontWeight: 600 }}>
                          {t.booking_id}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* RIGHT PANE: ACTIVE TICKET WORKSPACE */}
        <div style={{
          backgroundColor: '#FFFFFF',
          borderRadius: '12px',
          border: '1px solid #E2E8F0',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden'
        }}>
          {selectedTicket ? (
            <>
              {/* TICKET HEADER */}
              <div style={{
                padding: '16px 20px',
                borderBottom: '1px solid #E2E8F0',
                backgroundColor: '#F8FAFC',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '12px'
              }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 800, color: '#0F172A' }}>
                      #{selectedTicket.ticket_number} — {selectedTicket.subject}
                    </h3>
                    <span style={{
                      padding: '2px 8px',
                      borderRadius: '4px',
                      fontSize: '11px',
                      fontWeight: 700,
                      backgroundColor: selectedTicket.status === 'RESOLVED' ? '#DCFCE7' : '#FEF3C7',
                      color: selectedTicket.status === 'RESOLVED' ? '#166534' : '#92400E'
                    }}>
                      {selectedTicket.status.replace(/_/g, ' ')}
                    </span>
                  </div>
                  <div style={{ fontSize: '12px', color: '#64748B', marginTop: '4px', display: 'flex', gap: '12px' }}>
                    <span>👤 {selectedTicket.customer_name}</span>
                    <span>📞 {selectedTicket.customer_phone}</span>
                    {selectedTicket.customer_email && <span>✉️ {selectedTicket.customer_email}</span>}
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {selectedTicket.status !== 'RESOLVED' && (
                    <>
                      <button
                        onClick={handleEscalateToHub}
                        disabled={isEscalating}
                        style={{
                          padding: '6px 12px',
                          backgroundColor: '#FFFBEB',
                          border: '1px solid #FCD34D',
                          borderRadius: '6px',
                          fontSize: '11px',
                          fontWeight: 700,
                          color: '#B45309',
                          cursor: 'pointer'
                        }}
                      >
                        ⚠️ Escalate to Hub
                      </button>
                      <button
                        onClick={() => setIsResolveModalOpen(true)}
                        style={{
                          padding: '6px 12px',
                          backgroundColor: '#166534',
                          border: 'none',
                          borderRadius: '6px',
                          fontSize: '11px',
                          fontWeight: 700,
                          color: '#FFFFFF',
                          cursor: 'pointer'
                        }}
                      >
                        ✅ Resolve Ticket
                      </button>
                    </>
                  )}
                </div>
              </div>

              {/* BOOKING CONTEXT BAR IF PRESENT */}
              {selectedTicket.booking_context && (
                <div style={{
                  padding: '10px 20px',
                  backgroundColor: '#EFF6FF',
                  borderBottom: '1px solid #BFDBFE',
                  fontSize: '12px',
                  color: '#1E40AF',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: '8px'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <span>📍 <strong>Pickup:</strong> {selectedTicket.booking_context.pickup_address}</span>
                    <span>⏰ <strong>Time:</strong> {selectedTicket.booking_context.pickup_time_utc}</span>
                  </div>
                  <div>
                    <span>🚘 {selectedTicket.booking_context.vehicle_class} · ${selectedTicket.booking_context.total_amount?.toFixed(2)}</span>
                  </div>
                </div>
              )}

              {/* MESSAGE THREAD */}
              <div style={{ flex: 1, overflowY: 'auto', padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
                {selectedTicket.messages.map(m => {
                  const isCust = m.sender_type === 'CUSTOMER';
                  const isAi = m.sender_type === 'AI_ASSISTANT';
                  const isInternal = m.is_internal_note;

                  return (
                    <div
                      key={m.id}
                      style={{
                        alignSelf: isCust ? 'flex-start' : 'flex-end',
                        maxWidth: '80%',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: isCust ? 'flex-start' : 'flex-end'
                      }}
                    >
                      <div style={{ fontSize: '11px', color: '#64748B', marginBottom: '2px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        {isAi && <Sparkles size={11} color="#D97706" />}
                        <strong>{m.sender_name}</strong>
                        {isInternal && <span style={{ color: '#DC2626', fontWeight: 700 }}>[INTERNAL NOTE]</span>}
                        <span>· {new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>

                      <div style={{
                        backgroundColor: isInternal ? '#FEF2F2' : (isCust ? '#F1F5F9' : (isAi ? '#F8FAFC' : '#0F172A')),
                        color: isInternal ? '#991B1B' : (isCust ? '#0F172A' : (isAi ? '#334155' : '#FFFFFF')),
                        border: isInternal ? '1px solid #FECACA' : (isAi ? '1px solid #E2E8F0' : 'none'),
                        borderRadius: '10px',
                        padding: '12px 16px',
                        fontSize: '13px',
                        lineHeight: '1.4',
                        whiteSpace: 'pre-line'
                      }}>
                        {m.message_body}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* CANNED RESPONSES ROW */}
              <div style={{ padding: '6px 20px', backgroundColor: '#F8FAFC', borderTop: '1px solid #E2E8F0', display: 'flex', gap: '6px', overflowX: 'auto' }}>
                <span style={{ fontSize: '11px', color: '#64748B', alignSelf: 'center', marginRight: '4px' }}>Quick Canned:</span>
                {[
                  'Chauffeur is on the way (ETA 10 mins)',
                  'Flight delay monitored & pickup adjusted',
                  'Itinerary modification confirmed'
                ].map(txt => (
                  <button
                    key={txt}
                    onClick={() => applyCannedResponse(txt)}
                    style={{
                      padding: '4px 8px',
                      fontSize: '11px',
                      backgroundColor: '#FFFFFF',
                      border: '1px solid #CBD5E1',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      whiteSpace: 'nowrap',
                      color: '#334155'
                    }}
                  >
                    {txt}
                  </button>
                ))}
              </div>

              {/* REPLY BAR */}
              <form onSubmit={handleSendReply} style={{ padding: '12px 20px', borderTop: '1px solid #E2E8F0', backgroundColor: '#FFFFFF', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <label style={{ fontSize: '11px', color: '#475569', display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={isInternalNote}
                      onChange={e => setIsInternalNote(e.target.checked)}
                    />
                    <span>Post as <strong>Private Internal Note</strong> (Hidden from customer)</span>
                  </label>
                </div>

                <div style={{ display: 'flex', gap: '8px' }}>
                  <input
                    type="text"
                    placeholder={isInternalNote ? 'Type internal dispatcher note...' : 'Reply to passenger...'}
                    value={replyText}
                    onChange={e => setReplyText(e.target.value)}
                    style={{
                      flex: 1,
                      padding: '10px 14px',
                      borderRadius: '8px',
                      border: isInternalNote ? '1px solid #FCA5A5' : '1px solid #CBD5E1',
                      fontSize: '13px',
                      backgroundColor: isInternalNote ? '#FFF5F5' : '#FFFFFF'
                    }}
                  />
                  <button
                    type="submit"
                    disabled={isPostingReply || !replyText.trim()}
                    style={{
                      padding: '10px 18px',
                      backgroundColor: isInternalNote ? '#DC2626' : '#0F172A',
                      color: '#FFFFFF',
                      border: 'none',
                      borderRadius: '8px',
                      fontSize: '13px',
                      fontWeight: 700,
                      cursor: replyText.trim() ? 'pointer' : 'not-allowed',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px'
                    }}
                  >
                    {isPostingReply ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                    <span>{isInternalNote ? 'Save Note' : 'Send'}</span>
                  </button>
                </div>
              </form>
            </>
          ) : (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94A3B8' }}>
              Select a ticket to view thread and respond.
            </div>
          )}
        </div>
      </div>

      {/* RESOLVE MODAL */}
      {isResolveModalOpen && selectedTicket && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 99999
        }}>
          <div style={{
            backgroundColor: '#FFFFFF',
            borderRadius: '12px',
            padding: '24px',
            width: '450px',
            boxShadow: '0 20px 25px -5px rgba(0,0,0,0.2)'
          }}>
            <h3 style={{ margin: '0 0 8px 0', fontSize: '16px', fontWeight: 800, color: '#0F172A' }}>
              Resolve Ticket #{selectedTicket.ticket_number}
            </h3>
            <p style={{ margin: '0 0 16px 0', fontSize: '13px', color: '#64748B' }}>
              Please enter a brief summary of how this customer inquiry was resolved.
            </p>

            <textarea
              rows={3}
              required
              placeholder="e.g. Chauffeur confirmed pickup time shifted to 6:30 PM. Passenger notified."
              value={resolutionNotes}
              onChange={e => setResolutionNotes(e.target.value)}
              style={{
                width: '100%',
                padding: '10px',
                borderRadius: '6px',
                border: '1px solid #CBD5E1',
                fontSize: '13px',
                boxSizing: 'border-box',
                resize: 'none'
              }}
            />

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '16px' }}>
              <button
                onClick={() => setIsResolveModalOpen(false)}
                style={{
                  padding: '8px 14px',
                  backgroundColor: '#F1F5F9',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleResolveTicket}
                disabled={isResolving || !resolutionNotes.trim()}
                style={{
                  padding: '8px 16px',
                  backgroundColor: '#166534',
                  color: '#FFFFFF',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '12px',
                  fontWeight: 700,
                  cursor: resolutionNotes.trim() ? 'pointer' : 'not-allowed'
                }}
              >
                {isResolving ? 'Resolving...' : 'Confirm Resolution'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
