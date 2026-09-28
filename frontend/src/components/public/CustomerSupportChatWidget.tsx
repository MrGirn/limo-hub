import React, { useState, useEffect, useRef } from 'react';
import { 
  MessageSquare, X, Send, Bot, User, Clock, AlertTriangle, 
  CheckCircle2, ChevronDown, ChevronUp, Search, Phone, Mail, 
  FileText, Sparkles, Shield, ArrowRight, Loader2, ExternalLink
} from 'lucide-react';
import { 
  createSupportTicketApi, 
  lookupSupportTicketsApi, 
  addTicketMessageApi,
  SupportTicket, 
  TicketMessage 
} from '../../api';

interface CustomerSupportChatWidgetProps {
  initialBookingId?: string;
  initialCustomerName?: string;
  initialCustomerPhone?: string;
  initialCustomerEmail?: string;
  vendorId?: string;
  vendorName?: string;
  isOpenExternal?: boolean;
  onCloseExternal?: () => void;
}

export const CustomerSupportChatWidget: React.FC<CustomerSupportChatWidgetProps> = ({
  initialBookingId = '',
  initialCustomerName = '',
  initialCustomerPhone = '',
  initialCustomerEmail = '',
  vendorId = 'vendor_anb_philly',
  vendorName = 'Executive Concierge',
  isOpenExternal,
  onCloseExternal
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'chat' | 'lookup'>('chat');

  // Form inputs for new ticket
  const [customerName, setCustomerName] = useState(initialCustomerName);
  const [customerPhone, setCustomerPhone] = useState(initialCustomerPhone);
  const [customerEmail, setCustomerEmail] = useState(initialCustomerEmail);
  const [bookingId, setBookingId] = useState(initialBookingId);
  const [category, setCategory] = useState<string>('CHAUFFEUR_ETA');
  const [messageInput, setMessageInput] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeTicket, setActiveTicket] = useState<SupportTicket | null>(null);

  // Lookup existing tickets
  const [lookupQuery, setLookupQuery] = useState(initialCustomerPhone || initialBookingId || '');
  const [lookupResults, setLookupResults] = useState<SupportTicket[]>([]);
  const [isLookingUp, setIsLookingUp] = useState(false);
  const [lookupError, setLookupError] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpenExternal !== undefined) {
      setIsOpen(isOpenExternal);
    }
  }, [isOpenExternal]);

  useEffect(() => {
    if (initialBookingId) setBookingId(initialBookingId);
    if (initialCustomerName) setCustomerName(initialCustomerName);
    if (initialCustomerPhone) setCustomerPhone(initialCustomerPhone);
    if (initialCustomerEmail) setCustomerEmail(initialCustomerEmail);
  }, [initialBookingId, initialCustomerName, initialCustomerPhone, initialCustomerEmail]);

  useEffect(() => {
    if (activeTicket) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [activeTicket?.messages]);

  const handleClose = () => {
    setIsOpen(false);
    if (onCloseExternal) onCloseExternal();
  };

  const handleCreateTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerName.trim() || !customerPhone.trim() || !messageInput.trim()) {
      alert('Please fill in your name, phone number, and message.');
      return;
    }

    setIsSubmitting(true);
    try {
      const ticket = await createSupportTicketApi({
        vendor_id: vendorId,
        customer_name: customerName.trim(),
        customer_phone: customerPhone.trim(),
        customer_email: customerEmail.trim() || undefined,
        booking_id: bookingId.trim() || undefined,
        category,
        subject: `${category.replace('_', ' ')} - ${customerName}`,
        message: messageInput.trim()
      });
      setActiveTicket(ticket);
      setMessageInput('');
    } catch (err: any) {
      alert(err.message || 'Failed to submit inquiry. Please check your details.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSendReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeTicket || !messageInput.trim()) return;

    const text = messageInput.trim();
    setMessageInput('');

    try {
      const newMsg = await addTicketMessageApi(activeTicket.id, {
        sender_type: 'CUSTOMER',
        sender_name: customerName || activeTicket.customer_name,
        message_body: text
      });
      setActiveTicket(prev => prev ? {
        ...prev,
        status: prev.status === 'AI_RESOLVED' ? 'ASSIGNED_TO_VENDOR' : prev.status,
        messages: [...prev.messages, newMsg]
      } : null);
    } catch (err: any) {
      alert(err.message || 'Failed to send message');
    }
  };

  const handleLookup = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!lookupQuery.trim()) return;

    setIsLookingUp(true);
    setLookupError(null);
    try {
      const results = await lookupSupportTicketsApi(lookupQuery.trim());
      setLookupResults(results);
      if (results.length === 0) {
        setLookupError('No existing support tickets found for this query.');
      }
    } catch (err: any) {
      setLookupError(err.message || 'Lookup failed.');
      setLookupResults([]);
    } finally {
      setIsLookingUp(false);
    }
  };

  return (
    <>
      {/* FLOATING ACTION PILL (BOTTOM RIGHT) */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          style={{
            position: 'fixed',
            bottom: '24px',
            right: '24px',
            zIndex: 9990,
            backgroundColor: '#0F172A',
            color: '#FFFFFF',
            border: '1.5px solid #D97706',
            borderRadius: '50px',
            padding: '12px 20px',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            boxShadow: '0 10px 25px -5px rgba(0,0,0,0.5), 0 0 15px rgba(217,119,6,0.25)',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: 700,
            letterSpacing: '0.01em',
            transition: 'all 0.2s ease',
          }}
          className="hover:scale-105"
        >
          <div style={{ position: 'relative' }}>
            <MessageSquare size={18} color="#F59E0B" />
            <span style={{
              position: 'absolute',
              top: '-3px',
              right: '-3px',
              width: '8px',
              height: '8px',
              backgroundColor: '#10B981',
              borderRadius: '50%',
              border: '2px solid #0F172A'
            }} />
          </div>
          <span>Support & Live Help</span>
        </button>
      )}

      {/* SUPPORT MODAL / EXPANDED CHAT DRAWER */}
      {isOpen && (
        <div style={{
          position: 'fixed',
          bottom: '20px',
          right: '20px',
          width: 'min(450px, calc(100vw - 32px))',
          height: 'min(640px, calc(100vh - 40px))',
          backgroundColor: '#FFFFFF',
          borderRadius: '16px',
          boxShadow: '0 25px 50px -12px rgba(0,0,0,0.35), 0 0 0 1px rgba(0,0,0,0.08)',
          zIndex: 9999,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          fontFamily: 'inherit'
        }}>
          {/* HEADER */}
          <div style={{
            backgroundColor: '#0F172A',
            color: '#FFFFFF',
            padding: '16px 20px',
            borderBottom: '2px solid #D97706',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{
                width: '36px',
                height: '36px',
                borderRadius: '50%',
                backgroundColor: 'rgba(217,119,6,0.15)',
                border: '1px solid #D97706',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#F59E0B'
              }}>
                <Sparkles size={18} />
              </div>
              <div>
                <div style={{ fontSize: '15px', fontWeight: 800, color: '#F8FAFC', letterSpacing: '-0.01em' }}>
                  {vendorName} Concierge
                </div>
                <div style={{ fontSize: '11px', color: '#94A3B8', display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <span style={{ width: '6px', height: '6px', backgroundColor: '#10B981', borderRadius: '50%' }} />
                  24/7 AI First-Responder & Live Dispatch
                </div>
              </div>
            </div>

            <button
              onClick={handleClose}
              style={{
                backgroundColor: 'transparent',
                border: 'none',
                color: '#94A3B8',
                cursor: 'pointer',
                padding: '4px',
                borderRadius: '6px'
              }}
            >
              <X size={20} />
            </button>
          </div>

          {/* TOP TABS */}
          <div style={{
            display: 'flex',
            backgroundColor: '#F8FAFC',
            borderBottom: '1px solid #E2E8F0',
            padding: '4px 8px'
          }}>
            <button
              onClick={() => setActiveTab('chat')}
              style={{
                flex: 1,
                padding: '8px 12px',
                border: 'none',
                backgroundColor: activeTab === 'chat' ? '#FFFFFF' : 'transparent',
                color: activeTab === 'chat' ? '#0F172A' : '#64748B',
                fontWeight: activeTab === 'chat' ? 700 : 500,
                fontSize: '12px',
                borderRadius: '6px',
                cursor: 'pointer',
                boxShadow: activeTab === 'chat' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none'
              }}
            >
              💬 Live Chat & Inquiries
            </button>
            <button
              onClick={() => setActiveTab('lookup')}
              style={{
                flex: 1,
                padding: '8px 12px',
                border: 'none',
                backgroundColor: activeTab === 'lookup' ? '#FFFFFF' : 'transparent',
                color: activeTab === 'lookup' ? '#0F172A' : '#64748B',
                fontWeight: activeTab === 'lookup' ? 700 : 500,
                fontSize: '12px',
                borderRadius: '6px',
                cursor: 'pointer',
                boxShadow: activeTab === 'lookup' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none'
              }}
            >
              🔍 Track Existing Ticket
            </button>
          </div>

          {/* BODY: TAB 1 (CHAT / NEW TICKET) */}
          {activeTab === 'chat' && (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
              {!activeTicket ? (
                /* INTAKE FORM */
                <form onSubmit={handleCreateTicket} style={{ flex: 1, overflowY: 'auto', padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div style={{
                    backgroundColor: '#FEF3C7',
                    border: '1px solid #FDE68A',
                    borderRadius: '8px',
                    padding: '10px 12px',
                    fontSize: '12px',
                    color: '#92400E',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}>
                    <Bot size={16} />
                    <span>Instant AI answers for ETA, receipts, and flight delay adjustments.</span>
                  </div>

                  <div>
                    <label style={{ fontSize: '11px', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      Topic / Category
                    </label>
                    <select
                      value={category}
                      onChange={e => setCategory(e.target.value)}
                      style={{
                        width: '100%',
                        marginTop: '4px',
                        padding: '8px 10px',
                        borderRadius: '6px',
                        border: '1px solid #CBD5E1',
                        fontSize: '13px',
                        color: '#0F172A',
                        backgroundColor: '#FFFFFF'
                      }}
                    >
                      <option value="CHAUFFEUR_ETA">📍 Chauffeur ETA & Live Status</option>
                      <option value="BOOKING_MODIFICATION">✏️ Change Pickup Time or Address</option>
                      <option value="FLIGHT_DELAY">✈️ Flight Delay / Gate Update</option>
                      <option value="BILLING_RECEIPT">📄 Tax Receipt & Invoice Request</option>
                      <option value="LOST_ITEM">💼 Lost & Found Item In Vehicle</option>
                      <option value="CANCELLATION">❌ Cancellation & Escrow Policy</option>
                      <option value="GENERAL_INQUIRY">❓ General Question</option>
                    </select>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                    <div>
                      <label style={{ fontSize: '11px', fontWeight: 700, color: '#475569', textTransform: 'uppercase' }}>
                        Your Name *
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="John Doe"
                        value={customerName}
                        onChange={e => setCustomerName(e.target.value)}
                        style={{
                          width: '100%',
                          marginTop: '4px',
                          padding: '8px 10px',
                          borderRadius: '6px',
                          border: '1px solid #CBD5E1',
                          fontSize: '13px',
                          boxSizing: 'border-box'
                        }}
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: '11px', fontWeight: 700, color: '#475569', textTransform: 'uppercase' }}>
                        Phone Number *
                      </label>
                      <input
                        type="tel"
                        required
                        placeholder="(215) 555-0199"
                        value={customerPhone}
                        onChange={e => setCustomerPhone(e.target.value)}
                        style={{
                          width: '100%',
                          marginTop: '4px',
                          padding: '8px 10px',
                          borderRadius: '6px',
                          border: '1px solid #CBD5E1',
                          fontSize: '13px',
                          boxSizing: 'border-box'
                        }}
                      />
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                    <div>
                      <label style={{ fontSize: '11px', fontWeight: 700, color: '#475569', textTransform: 'uppercase' }}>
                        Booking Ref (Optional)
                      </label>
                      <input
                        type="text"
                        placeholder="bk-74fc6670"
                        value={bookingId}
                        onChange={e => setBookingId(e.target.value)}
                        style={{
                          width: '100%',
                          marginTop: '4px',
                          padding: '8px 10px',
                          borderRadius: '6px',
                          border: '1px solid #CBD5E1',
                          fontSize: '13px',
                          boxSizing: 'border-box'
                        }}
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: '11px', fontWeight: 700, color: '#475569', textTransform: 'uppercase' }}>
                        Email (Optional)
                      </label>
                      <input
                        type="email"
                        placeholder="name@acme.com"
                        value={customerEmail}
                        onChange={e => setCustomerEmail(e.target.value)}
                        style={{
                          width: '100%',
                          marginTop: '4px',
                          padding: '8px 10px',
                          borderRadius: '6px',
                          border: '1px solid #CBD5E1',
                          fontSize: '13px',
                          boxSizing: 'border-box'
                        }}
                      />
                    </div>
                  </div>

                  <div>
                    <label style={{ fontSize: '11px', fontWeight: 700, color: '#475569', textTransform: 'uppercase' }}>
                      How can we assist you? *
                    </label>
                    <textarea
                      required
                      rows={3}
                      placeholder="e.g. Where is my driver? Or please change pickup to 6:30 PM."
                      value={messageInput}
                      onChange={e => setMessageInput(e.target.value)}
                      style={{
                        width: '100%',
                        marginTop: '4px',
                        padding: '8px 10px',
                        borderRadius: '6px',
                        border: '1px solid #CBD5E1',
                        fontSize: '13px',
                        boxSizing: 'border-box',
                        resize: 'none'
                      }}
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    style={{
                      marginTop: '8px',
                      backgroundColor: '#0F172A',
                      color: '#FFFFFF',
                      border: '1px solid #D97706',
                      borderRadius: '8px',
                      padding: '12px',
                      fontSize: '13px',
                      fontWeight: 700,
                      cursor: isSubmitting ? 'not-allowed' : 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px'
                    }}
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 size={16} className="animate-spin" />
                        <span>Evaluating Inquiry...</span>
                      </>
                    ) : (
                      <>
                        <Send size={16} color="#F59E0B" />
                        <span>Start Live Conversation</span>
                      </>
                    )}
                  </button>
                </form>
              ) : (
                /* LIVE CHAT THREAD */
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                  {/* TICKET STATUS BAR */}
                  <div style={{
                    backgroundColor: '#F1F5F9',
                    padding: '8px 16px',
                    borderBottom: '1px solid #E2E8F0',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    fontSize: '11px'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ fontWeight: 700, color: '#0F172A' }}>#{activeTicket.ticket_number}</span>
                      <span style={{
                        padding: '2px 6px',
                        borderRadius: '4px',
                        backgroundColor: activeTicket.status === 'RESOLVED' || activeTicket.status === 'AI_RESOLVED' ? '#DCFCE7' : '#FEF3C7',
                        color: activeTicket.status === 'RESOLVED' || activeTicket.status === 'AI_RESOLVED' ? '#166534' : '#92400E',
                        fontWeight: 700
                      }}>
                        {activeTicket.status.replace(/_/g, ' ')}
                      </span>
                    </div>

                    {activeTicket.time_remaining_minutes !== undefined && activeTicket.status !== 'RESOLVED' && activeTicket.status !== 'AI_RESOLVED' && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#D97706', fontWeight: 700 }}>
                        <Clock size={12} />
                        <span>SLA: {Math.max(0, activeTicket.time_remaining_minutes)}m</span>
                      </div>
                    )}

                    <button
                      onClick={() => setActiveTicket(null)}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: '#64748B',
                        fontSize: '11px',
                        cursor: 'pointer',
                        textDecoration: 'underline'
                      }}
                    >
                      New Query
                    </button>
                  </div>

                  {/* MESSAGES LIST */}
                  <div style={{ flex: 1, overflowY: 'auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {activeTicket.messages.map((m) => {
                      const isMe = m.sender_type === 'CUSTOMER';
                      const isAi = m.sender_type === 'AI_ASSISTANT';

                      return (
                        <div
                          key={m.id}
                          style={{
                            alignSelf: isMe ? 'flex-end' : 'flex-start',
                            maxWidth: '85%',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: isMe ? 'flex-end' : 'flex-start'
                          }}
                        >
                          <div style={{ fontSize: '10px', color: '#94A3B8', marginBottom: '2px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                            {isAi && <Sparkles size={10} color="#D97706" />}
                            <span>{m.sender_name}</span>
                          </div>
                          <div style={{
                            backgroundColor: isMe ? '#0F172A' : (isAi ? '#F8FAFC' : '#EFF6FF'),
                            color: isMe ? '#FFFFFF' : '#0F172A',
                            border: isMe ? 'none' : `1px solid ${isAi ? '#E2E8F0' : '#BFDBFE'}`,
                            borderRadius: '12px',
                            padding: '10px 14px',
                            fontSize: '13px',
                            lineHeight: '1.4',
                            whiteSpace: 'pre-line'
                          }}>
                            {m.message_body}
                          </div>
                        </div>
                      );
                    })}
                    <div ref={messagesEndRef} />
                  </div>

                  {/* CHAT INPUT FORM */}
                  <form onSubmit={handleSendReply} style={{ padding: '10px 12px', borderTop: '1px solid #E2E8F0', display: 'flex', gap: '8px', backgroundColor: '#FFFFFF' }}>
                    <input
                      type="text"
                      placeholder="Type your message..."
                      value={messageInput}
                      onChange={e => setMessageInput(e.target.value)}
                      style={{
                        flex: 1,
                        padding: '10px 12px',
                        borderRadius: '8px',
                        border: '1px solid #CBD5E1',
                        fontSize: '13px'
                      }}
                    />
                    <button
                      type="submit"
                      disabled={!messageInput.trim()}
                      style={{
                        backgroundColor: '#0F172A',
                        color: '#FFFFFF',
                        border: 'none',
                        borderRadius: '8px',
                        padding: '10px 16px',
                        cursor: messageInput.trim() ? 'pointer' : 'not-allowed',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}
                    >
                      <Send size={16} color="#F59E0B" />
                    </button>
                  </form>
                </div>
              )}
            </div>
          )}

          {/* BODY: TAB 2 (LOOKUP) */}
          {activeTab === 'lookup' && (
            <div style={{ flex: 1, overflowY: 'auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <form onSubmit={handleLookup} style={{ display: 'flex', gap: '8px' }}>
                <input
                  type="text"
                  placeholder="Enter Phone, Email, or #SUP-..."
                  value={lookupQuery}
                  onChange={e => setLookupQuery(e.target.value)}
                  style={{
                    flex: 1,
                    padding: '8px 12px',
                    borderRadius: '6px',
                    border: '1px solid #CBD5E1',
                    fontSize: '13px'
                  }}
                />
                <button
                  type="submit"
                  disabled={isLookingUp}
                  style={{
                    backgroundColor: '#0F172A',
                    color: '#FFFFFF',
                    border: 'none',
                    borderRadius: '6px',
                    padding: '8px 14px',
                    fontSize: '12px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}
                >
                  {isLookingUp ? <Loader2 size={14} className="animate-spin" /> : <Search size={14} />}
                  <span>Search</span>
                </button>
              </form>

              {lookupError && (
                <div style={{ fontSize: '12px', color: '#DC2626', backgroundColor: '#FEE2E2', padding: '8px 12px', borderRadius: '6px' }}>
                  {lookupError}
                </div>
              )}

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {lookupResults.map(tkt => (
                  <div
                    key={tkt.id}
                    onClick={() => {
                      setActiveTicket(tkt);
                      setActiveTab('chat');
                    }}
                    style={{
                      border: '1px solid #E2E8F0',
                      borderRadius: '8px',
                      padding: '12px',
                      backgroundColor: '#F8FAFC',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease'
                    }}
                    className="hover:border-amber-500 hover:bg-amber-50/20"
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                      <span style={{ fontWeight: 700, fontSize: '13px', color: '#0F172A' }}>#{tkt.ticket_number}</span>
                      <span style={{
                        fontSize: '10px',
                        fontWeight: 700,
                        padding: '2px 6px',
                        borderRadius: '4px',
                        backgroundColor: tkt.status === 'RESOLVED' || tkt.status === 'AI_RESOLVED' ? '#DCFCE7' : '#FEF3C7',
                        color: tkt.status === 'RESOLVED' || tkt.status === 'AI_RESOLVED' ? '#166534' : '#92400E'
                      }}>
                        {tkt.status}
                      </span>
                    </div>
                    <div style={{ fontSize: '12px', color: '#334155', fontWeight: 600 }}>{tkt.subject}</div>
                    <div style={{ fontSize: '11px', color: '#64748B', marginTop: '4px' }}>
                      {tkt.messages.length} message(s) · {new Date(tkt.created_at).toLocaleDateString()}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </>
  );
};
