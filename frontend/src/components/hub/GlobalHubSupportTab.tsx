import React, { useState, useEffect } from 'react';
import { 
  ShieldAlert, RefreshCw, AlertTriangle, CheckCircle2, 
  Clock, Search, Filter, MessageSquare, ArrowUpRight, 
  Send, User, Phone, Mail, Car, MapPin, Sparkles, Loader2,
  ExternalLink, Check, FileText
} from 'lucide-react';
import { 
  fetchGlobalHubSupportTicketsApi, 
  addTicketMessageApi, 
  resolveVendorTicketApi,
  SupportTicket 
} from '../../api';

export const GlobalHubSupportTab: React.FC = () => {
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [vendorFilter, setVendorFilter] = useState<string>('ALL');
  const [filterBreached, setFilterBreached] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);

  // Hub reply & takeover state
  const [hubReplyText, setHubReplyText] = useState('');
  const [isInternalNote, setIsInternalNote] = useState(false);
  const [isPosting, setIsPosting] = useState(false);

  // SLA Sweep status
  const [isSweeping, setIsSweeping] = useState(false);
  const [sweepResult, setSweepResult] = useState<string | null>(null);

  const loadHubTickets = async () => {
    setLoading(true);
    try {
      const data = await fetchGlobalHubSupportTicketsApi(statusFilter, filterBreached);
      setTickets(data);
      if (selectedTicket) {
        const updated = data.find(t => t.id === selectedTicket.id);
        if (updated) setSelectedTicket(updated);
      }
    } catch (err: any) {
      console.error('Error fetching global hub support tickets:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadHubTickets();
  }, [statusFilter, filterBreached]);

  const handleTriggerSlaSweep = async () => {
    setIsSweeping(true);
    setSweepResult(null);
    try {
      const res = await fetch('/api/v1/global-hub/support/sla-sweep', { method: 'POST' });
      const data = await res.json();
      setSweepResult(`SLA Sweep Completed: ${data.actions_count || 0} tickets evaluated/escalated.`);
      await loadHubTickets();
    } catch (err: any) {
      setSweepResult('SLA Sweep failed.');
    } finally {
      setIsSweeping(false);
    }
  };

  const handleSendHubReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTicket || !hubReplyText.trim()) return;

    setIsPosting(true);
    try {
      const newMsg = await addTicketMessageApi(selectedTicket.id, {
        sender_type: 'HUB_SUPERADMIN',
        sender_name: 'Global Hub Clearinghouse Support',
        message_body: hubReplyText.trim(),
        is_internal_note: isInternalNote
      });

      setSelectedTicket(prev => prev ? {
        ...prev,
        messages: [...prev.messages, newMsg]
      } : null);

      setTickets(prev => prev.map(t => t.id === selectedTicket.id ? {
        ...t,
        messages: [...t.messages, newMsg]
      } : t));

      setHubReplyText('');
    } catch (err: any) {
      alert(err.message || 'Failed to post hub message');
    } finally {
      setIsPosting(false);
    }
  };

  const handleResolveFromHub = async () => {
    if (!selectedTicket) return;
    const notes = prompt('Enter resolution summary from Global Hub:', 'Resolved centrally by Hub Clearinghouse dispatcher');
    if (!notes) return;

    try {
      const updated = await resolveVendorTicketApi(selectedTicket.vendor_id, selectedTicket.id, {
        resolution_notes: notes,
        resolved_by: 'Global Hub SuperAdmin'
      });
      setSelectedTicket(updated);
      setTickets(prev => prev.map(t => t.id === selectedTicket.id ? updated : t));
    } catch (err: any) {
      alert(err.message || 'Failed to resolve ticket');
    }
  };

  const totalTickets = tickets.length;
  const openEscalated = tickets.filter(t => t.status === 'ESCALATED_TO_HUB').length;
  const breachedCount = tickets.filter(t => t.is_sla_breached).length;
  const aiResolvedCount = tickets.filter(t => t.status === 'AI_RESOLVED').length;

  const filteredTickets = tickets.filter(t => {
    if (vendorFilter !== 'ALL' && t.vendor_id !== vendorFilter) return false;
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      t.ticket_number.toLowerCase().includes(q) ||
      t.customer_name.toLowerCase().includes(q) ||
      t.vendor_name.toLowerCase().includes(q) ||
      t.subject.toLowerCase().includes(q)
    );
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* HEADER & KPI METRICS */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '20px', fontWeight: 800, color: '#0F172A', letterSpacing: '-0.02em' }}>
            Global Hub Central Support & SLA Radar
          </h1>
          <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#64748B' }}>
            Multi-tenant network query monitoring, autonomous AI first-response telemetry, and SLA breach clearinghouse
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            onClick={handleTriggerSlaSweep}
            disabled={isSweeping}
            style={{
              padding: '8px 14px',
              backgroundColor: '#FEF2F2',
              color: '#DC2626',
              border: '1px solid #FECACA',
              borderRadius: '6px',
              fontSize: '12px',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <ShieldAlert size={14} />
            <span>{isSweeping ? 'Sweeping SLA...' : 'Run SLA Sweep'}</span>
          </button>

          <button
            onClick={loadHubTickets}
            style={{
              padding: '8px 14px',
              backgroundColor: '#FFFFFF',
              color: '#334155',
              border: '1px solid #CBD5E1',
              borderRadius: '6px',
              fontSize: '12px',
              fontWeight: 600,
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

      {sweepResult && (
        <div style={{ padding: '8px 14px', backgroundColor: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: '6px', fontSize: '12px', color: '#166534' }}>
          {sweepResult}
        </div>
      )}

      {/* KPI METRIC CARDS */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px' }}>
        <div style={{ backgroundColor: '#FFFFFF', padding: '16px', borderRadius: '10px', border: '1px solid #E2E8F0', borderLeft: '4px solid #0F172A' }}>
          <div style={{ fontSize: '11px', fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>Total Tickets Tracked</div>
          <div style={{ fontSize: '24px', fontWeight: 800, color: '#0F172A', marginTop: '4px' }}>{totalTickets}</div>
        </div>

        <div style={{ backgroundColor: '#FFFFFF', padding: '16px', borderRadius: '10px', border: '1px solid #E2E8F0', borderLeft: '4px solid #DC2626' }}>
          <div style={{ fontSize: '11px', fontWeight: 700, color: '#DC2626', textTransform: 'uppercase' }}>SLA Breaches</div>
          <div style={{ fontSize: '24px', fontWeight: 800, color: '#DC2626', marginTop: '4px' }}>{breachedCount}</div>
        </div>

        <div style={{ backgroundColor: '#FFFFFF', padding: '16px', borderRadius: '10px', border: '1px solid #E2E8F0', borderLeft: '4px solid #D97706' }}>
          <div style={{ fontSize: '11px', fontWeight: 700, color: '#D97706', textTransform: 'uppercase' }}>Escalated to Hub</div>
          <div style={{ fontSize: '24px', fontWeight: 800, color: '#D97706', marginTop: '4px' }}>{openEscalated}</div>
        </div>

        <div style={{ backgroundColor: '#FFFFFF', padding: '16px', borderRadius: '10px', border: '1px solid #E2E8F0', borderLeft: '4px solid #10B981' }}>
          <div style={{ fontSize: '11px', fontWeight: 700, color: '#10B981', textTransform: 'uppercase' }}>AI Instant Resolutions</div>
          <div style={{ fontSize: '24px', fontWeight: 800, color: '#10B981', marginTop: '4px' }}>{aiResolvedCount}</div>
        </div>
      </div>

      {/* FILTER & SEARCH BAR */}
      <div style={{
        backgroundColor: '#FFFFFF',
        borderRadius: '8px',
        border: '1px solid #E2E8F0',
        padding: '12px 16px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '12px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1, minWidth: '280px' }}>
          <div style={{ position: 'relative', flex: 1 }}>
            <Search size={14} color="#94A3B8" style={{ position: 'absolute', left: '10px', top: '10px' }} />
            <input
              type="text"
              placeholder="Search ticket #, passenger, vendor..."
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

          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            style={{
              padding: '8px 12px',
              borderRadius: '6px',
              border: '1px solid #CBD5E1',
              fontSize: '12px',
              backgroundColor: '#FFFFFF'
            }}
          >
            <option value="ALL">All Statuses</option>
            <option value="OPEN">Open</option>
            <option value="ASSIGNED_TO_VENDOR">Assigned to Vendor</option>
            <option value="ESCALATED_TO_HUB">Escalated to Hub</option>
            <option value="AI_RESOLVED">AI Resolved</option>
            <option value="RESOLVED">Resolved</option>
          </select>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <label style={{ fontSize: '12px', color: '#475569', display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={filterBreached}
              onChange={e => setFilterBreached(e.target.checked)}
            />
            <span style={{ fontWeight: filterBreached ? 700 : 500, color: filterBreached ? '#DC2626' : '#475569' }}>
              🚨 Show SLA Breaches Only
            </span>
          </label>
        </div>
      </div>

      {/* TICKETS TABLE */}
      <div style={{ backgroundColor: '#FFFFFF', borderRadius: '10px', border: '1px solid #E2E8F0', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '12px' }}>
          <thead>
            <tr style={{ backgroundColor: '#F8FAFC', borderBottom: '1px solid #E2E8F0', color: '#475569' }}>
              <th style={{ padding: '12px 16px', fontWeight: 700 }}>TICKET #</th>
              <th style={{ padding: '12px 16px', fontWeight: 700 }}>OPERATING CARRIER</th>
              <th style={{ padding: '12px 16px', fontWeight: 700 }}>PASSENGER / CONTACT</th>
              <th style={{ padding: '12px 16px', fontWeight: 700 }}>CATEGORY & SUBJECT</th>
              <th style={{ padding: '12px 16px', fontWeight: 700 }}>STATUS & SLA</th>
              <th style={{ padding: '12px 16px', fontWeight: 700 }}>CREATED</th>
              <th style={{ padding: '12px 16px', fontWeight: 700, textAlign: 'right' }}>ACTIONS</th>
            </tr>
          </thead>
          <tbody>
            {filteredTickets.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ padding: '32px', textAlign: 'center', color: '#94A3B8' }}>
                  No tickets found matching the specified filters.
                </td>
              </tr>
            ) : (
              filteredTickets.map(t => (
                <tr
                  key={t.id}
                  style={{
                    borderBottom: '1px solid #F1F5F9',
                    backgroundColor: t.is_sla_breached ? '#FFF5F5' : '#FFFFFF'
                  }}
                  className="hover:bg-slate-50"
                >
                  <td style={{ padding: '12px 16px', fontWeight: 800, color: '#0F172A' }}>
                    #{t.ticket_number}
                  </td>
                  <td style={{ padding: '12px 16px', fontWeight: 600, color: '#1E293B' }}>
                    {t.vendor_name}
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <div style={{ fontWeight: 700, color: '#0F172A' }}>{t.customer_name}</div>
                    <div style={{ fontSize: '11px', color: '#64748B' }}>{t.customer_phone}</div>
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <div style={{ fontWeight: 600, color: '#334155' }}>{t.subject}</div>
                    <div style={{ fontSize: '10px', color: '#94A3B8', textTransform: 'uppercase' }}>{t.category.replace(/_/g, ' ')}</div>
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{
                        padding: '2px 8px',
                        borderRadius: '4px',
                        fontSize: '10px',
                        fontWeight: 700,
                        backgroundColor: t.status === 'RESOLVED' || t.status === 'AI_RESOLVED' ? '#DCFCE7' : (t.status === 'ESCALATED_TO_HUB' ? '#FEE2E2' : '#FEF3C7'),
                        color: t.status === 'RESOLVED' || t.status === 'AI_RESOLVED' ? '#166534' : (t.status === 'ESCALATED_TO_HUB' ? '#991B1B' : '#92400E')
                      }}>
                        {t.status.replace(/_/g, ' ')}
                      </span>

                      {t.is_sla_breached && (
                        <span style={{ fontSize: '10px', fontWeight: 800, color: '#DC2626', backgroundColor: '#FEE2E2', padding: '2px 6px', borderRadius: '4px' }}>
                          BREACHED
                        </span>
                      )}
                    </div>
                  </td>
                  <td style={{ padding: '12px 16px', color: '#64748B', fontSize: '11px' }}>
                    {new Date(t.created_at).toLocaleDateString()}
                  </td>
                  <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                    <button
                      onClick={() => setSelectedTicket(t)}
                      style={{
                        padding: '6px 12px',
                        backgroundColor: '#0F172A',
                        color: '#FFFFFF',
                        border: 'none',
                        borderRadius: '6px',
                        fontSize: '11px',
                        fontWeight: 700,
                        cursor: 'pointer'
                      }}
                    >
                      View & Take Over
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* SLIDE-OVER DRAWER FOR HUB TAKEOVER */}
      {selectedTicket && (
        <div style={{
          position: 'fixed',
          top: 0,
          right: 0,
          bottom: 0,
          width: 'min(550px, 100vw)',
          backgroundColor: '#FFFFFF',
          boxShadow: '-10px 0 30px rgba(0,0,0,0.25)',
          zIndex: 99999,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden'
        }}>
          {/* DRAWER HEADER */}
          <div style={{
            padding: '16px 20px',
            backgroundColor: '#0F172A',
            color: '#FFFFFF',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}>
            <div>
              <div style={{ fontSize: '16px', fontWeight: 800 }}>
                Hub Intervention: #{selectedTicket.ticket_number}
              </div>
              <div style={{ fontSize: '12px', color: '#94A3B8' }}>
                Carrier: {selectedTicket.vendor_name}
              </div>
            </div>

            <button
              onClick={() => setSelectedTicket(null)}
              style={{
                backgroundColor: 'transparent',
                border: 'none',
                color: '#94A3B8',
                fontSize: '16px',
                cursor: 'pointer'
              }}
            >
              ✕
            </button>
          </div>

          {/* TICKET DETAILS BODY */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ backgroundColor: '#F8FAFC', padding: '12px 16px', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
              <div style={{ fontWeight: 700, fontSize: '14px', color: '#0F172A' }}>{selectedTicket.subject}</div>
              <div style={{ fontSize: '12px', color: '#64748B', marginTop: '4px' }}>
                Passenger: {selectedTicket.customer_name} ({selectedTicket.customer_phone})
              </div>
            </div>

            {/* MESSAGES THREAD */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <h4 style={{ margin: 0, fontSize: '12px', fontWeight: 700, color: '#475569', textTransform: 'uppercase' }}>
                Conversation History
              </h4>

              {selectedTicket.messages.map(m => (
                <div
                  key={m.id}
                  style={{
                    backgroundColor: m.is_internal_note ? '#FEF2F2' : '#F8FAFC',
                    border: m.is_internal_note ? '1px solid #FECACA' : '1px solid #E2E8F0',
                    borderRadius: '8px',
                    padding: '10px 14px'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#64748B', marginBottom: '4px' }}>
                    <strong>{m.sender_name} ({m.sender_type})</strong>
                    <span>{new Date(m.created_at).toLocaleTimeString()}</span>
                  </div>
                  <div style={{ fontSize: '13px', color: '#1E293B', whiteSpace: 'pre-line' }}>
                    {m.message_body}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* DRAWER FOOTER: HUB ACTIONS */}
          <div style={{ padding: '16px 20px', borderTop: '1px solid #E2E8F0', backgroundColor: '#F8FAFC', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                onClick={handleResolveFromHub}
                style={{
                  flex: 1,
                  padding: '8px',
                  backgroundColor: '#166534',
                  color: '#FFFFFF',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '12px',
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                ✅ Central Hub Resolve
              </button>
            </div>

            <form onSubmit={handleSendHubReply} style={{ display: 'flex', gap: '8px' }}>
              <input
                type="text"
                placeholder="Post central clearinghouse reply or note..."
                value={hubReplyText}
                onChange={e => setHubReplyText(e.target.value)}
                style={{
                  flex: 1,
                  padding: '8px 12px',
                  borderRadius: '6px',
                  border: '1px solid #CBD5E1',
                  fontSize: '12px'
                }}
              />
              <button
                type="submit"
                disabled={isPosting || !hubReplyText.trim()}
                style={{
                  padding: '8px 16px',
                  backgroundColor: '#0F172A',
                  color: '#FFFFFF',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '12px',
                  fontWeight: 700,
                  cursor: hubReplyText.trim() ? 'pointer' : 'not-allowed'
                }}
              >
                {isPosting ? 'Sending...' : 'Reply'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
