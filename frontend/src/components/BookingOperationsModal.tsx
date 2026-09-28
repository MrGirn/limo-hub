import React, { useState, useEffect } from 'react';
import { 
  X, FileText, Receipt, ShieldCheck, AlertTriangle, DollarSign, 
  CheckCircle, Clock, Ban, RefreshCw, Printer, AlertCircle, Sparkles, Scale
} from 'lucide-react';
import { 
  fetchBookingMasterInvoiceHtml, 
  fetchBookingMasterReceiptHtml, 
  cancelBookingApi, 
  fetchBookingPodApi, 
  requestBookingIncidentalsApi, 
  approveBookingIncidentalsApi, 
  disputeBookingDeliveryApi, 
  processBookingPaymentOperationsApi, 
  processBookingRefundOperationsApi 
} from '../api';

interface BookingOperationsModalProps {
  bookingId: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  initialTab?: 'invoice' | 'receipt' | 'pod' | 'cancel' | 'payment' | 'refund';
}

export const BookingOperationsModal: React.FC<BookingOperationsModalProps> = ({
  bookingId,
  isOpen,
  onClose,
  onSuccess,
  initialTab = 'invoice'
}) => {
  const [activeTab, setActiveTab] = useState<'invoice' | 'receipt' | 'pod' | 'cancel' | 'payment' | 'refund'>(initialTab);
  const [htmlContent, setHtmlContent] = useState<string>('');
  const [podData, setPodData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Cancellation Form
  const [cancelReason, setCancelReason] = useState('CUSTOMER_REQUEST');
  const [cancelNotes, setCancelNotes] = useState('');

  // Refund Form
  const [refundAmount, setRefundAmount] = useState('50.00');
  const [refundReason, setRefundReason] = useState('COURTESY_DELAY');
  const [isFullRefund, setIsFullRefund] = useState(false);

  // Incidental Request Form
  const [incidentalWaitMinutes, setIncidentalWaitMinutes] = useState(15);
  const [incidentalTolls, setIncidentalTolls] = useState('18.50');
  const [incidentalNotes, setIncidentalNotes] = useState('');

  // Dispute Form
  const [disputeReason, setDisputeReason] = useState('');

  useEffect(() => {
    if (!isOpen || !bookingId) return;
    loadTabData(activeTab);
  }, [isOpen, bookingId, activeTab]);

  const loadTabData = async (tab: typeof activeTab) => {
    setLoading(true);
    setError(null);
    setSuccessMsg(null);
    try {
      if (tab === 'invoice') {
        const html = await fetchBookingMasterInvoiceHtml(bookingId);
        setHtmlContent(html);
      } else if (tab === 'receipt') {
        const html = await fetchBookingMasterReceiptHtml(bookingId);
        setHtmlContent(html);
      } else if (tab === 'pod') {
        const pod = await fetchBookingPodApi(bookingId);
        setPodData(pod);
      }
    } catch (e: any) {
      setError(e.message || 'Failed to load booking operational data');
    } finally {
      setLoading(false);
    }
  };

  const handleExecuteCancel = async () => {
    setActionLoading(true);
    setError(null);
    try {
      const res = await cancelBookingApi(bookingId, {
        reason: `${cancelReason}: ${cancelNotes}`.trim(),
        cancelled_by: 'DISPATCHER_CONSOLE',
        refund_requested: true
      });
      setSuccessMsg(res.message || 'Booking successfully cancelled and pre-auth released.');
      setTimeout(() => {
        onSuccess();
        onClose();
      }, 2000);
    } catch (e: any) {
      setError(e.message || 'Failed to cancel booking');
    } finally {
      setActionLoading(false);
    }
  };

  const handleExecuteRefund = async () => {
    setActionLoading(true);
    setError(null);
    try {
      const res = await processBookingRefundOperationsApi(bookingId, {
        refund_amount_usd: parseFloat(refundAmount) || 0,
        reason: refundReason,
        is_full_refund: isFullRefund
      });
      setSuccessMsg(res.message || 'Refund successfully processed via Stripe.');
      setTimeout(() => {
        onSuccess();
        onClose();
      }, 2000);
    } catch (e: any) {
      setError(e.message || 'Failed to process refund');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCapturePayment = async () => {
    setActionLoading(true);
    setError(null);
    try {
      const res = await processBookingPaymentOperationsApi(bookingId, {
        dispatcher_notes: 'Operations manual capture and driver payroll ledger settlement.'
      });
      setSuccessMsg(res.message || 'Payment hold captured & trip settled.');
      setTimeout(() => {
        onSuccess();
        onClose();
      }, 2000);
    } catch (e: any) {
      setError(e.message || 'Failed to capture payment');
    } finally {
      setActionLoading(false);
    }
  };

  const handleRequestIncidentals = async () => {
    setActionLoading(true);
    setError(null);
    try {
      const res = await requestBookingIncidentalsApi(bookingId, {
        wait_minutes: incidentalWaitMinutes,
        tolls_usd: parseFloat(incidentalTolls) || 0,
        notes: incidentalNotes
      });
      setSuccessMsg(res.message || 'Incidentals request submitted.');
      loadTabData('pod');
    } catch (e: any) {
      setError(e.message || 'Failed to request incidentals');
    } finally {
      setActionLoading(false);
    }
  };

  const handleApproveIncidentals = async () => {
    setActionLoading(true);
    setError(null);
    try {
      const res = await approveBookingIncidentalsApi(bookingId);
      setSuccessMsg(res.message || 'Incidentals approved and billed.');
      loadTabData('pod');
    } catch (e: any) {
      setError(e.message || 'Failed to approve incidentals');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDisputeDelivery = async () => {
    if (!disputeReason.trim()) {
      setError('Please provide a dispute justification reason.');
      return;
    }
    setActionLoading(true);
    setError(null);
    try {
      const res = await disputeBookingDeliveryApi(bookingId, {
        dispute_reason: disputeReason
      });
      setSuccessMsg(res.message || 'Escrow settlement paused pending dispute review.');
      loadTabData('pod');
    } catch (e: any) {
      setError(e.message || 'Failed to dispute delivery');
    } finally {
      setActionLoading(false);
    }
  };

  const handlePrint = () => {
    const printWin = window.open('', '_blank');
    if (printWin) {
      printWin.document.write(htmlContent);
      printWin.document.close();
      printWin.focus();
      setTimeout(() => printWin.print(), 300);
    }
  };

  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(15, 23, 42, 0.7)',
      backdropFilter: 'blur(5px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 10000,
      padding: '20px'
    }}>
      <div style={{
        background: '#FFFFFF',
        borderRadius: '16px',
        maxWidth: '900px',
        width: '100%',
        maxHeight: '90vh',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
        border: '1px solid #E2E8F0',
        overflow: 'hidden'
      }}>
        {/* Modal Top Bar */}
        <div style={{
          background: '#0F172A',
          color: '#FFFFFF',
          padding: '16px 24px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          borderBottom: '1px solid #1E293B'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <FileText size={20} color="#38BDF8" />
            <div>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 800, letterSpacing: '0.02em' }}>
                Booking Operations & Settlement Console
              </h3>
              <p style={{ margin: 0, fontSize: '12px', color: '#94A3B8' }}>
                Booking ID: <span style={{ color: '#F1F5F9', fontWeight: 700 }}>{bookingId}</span>
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            style={{ background: 'transparent', border: 'none', color: '#94A3B8', cursor: 'pointer', padding: '4px' }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Modal Navigation Tabs */}
        <div style={{
          display: 'flex',
          background: '#F8FAFC',
          borderBottom: '1px solid #E2E8F0',
          padding: '0 16px',
          overflowX: 'auto',
          gap: '4px'
        }}>
          {[
            { id: 'invoice', label: '📄 Master Invoice', icon: <FileText size={13} /> },
            { id: 'receipt', label: '💳 Payment Receipt', icon: <Receipt size={13} /> },
            { id: 'pod', label: '🛡️ Proof of Delivery (POD)', icon: <ShieldCheck size={13} /> },
            { id: 'payment', label: '⚡ Capture / Settle', icon: <DollarSign size={13} /> },
            { id: 'refund', label: '↩️ Issue Courtesy Refund', icon: <Sparkles size={13} /> },
            { id: 'cancel', label: '🚫 Cancel Reservation', icon: <Ban size={13} /> }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '12px 16px',
                border: 'none',
                background: 'transparent',
                borderBottom: activeTab === tab.id ? '2px solid #0078D4' : '2px solid transparent',
                color: activeTab === tab.id ? '#0078D4' : '#64748B',
                fontWeight: activeTab === tab.id ? 800 : 600,
                fontSize: '12.5px',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                transition: 'all 0.15s ease'
              }}
            >
              {tab.icon} {tab.label}
            </button>
          ))}
        </div>

        {/* Notices */}
        {error && (
          <div style={{ background: '#FEF2F2', borderBottom: '1px solid #FCA5A5', color: '#991B1B', padding: '10px 20px', fontSize: '12.5px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <AlertCircle size={15} color="#DC2626" />
            <span>{error}</span>
          </div>
        )}
        {successMsg && (
          <div style={{ background: '#ECFDF5', borderBottom: '1px solid #6EE7B7', color: '#065F46', padding: '10px 20px', fontSize: '12.5px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <CheckCircle size={15} color="#059669" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Modal Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '24px' }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '60px 20px' }}>
              <RefreshCw size={28} color="#0078D4" className="pulse-live" style={{ margin: '0 auto 12px auto' }} />
              <div style={{ fontSize: '14px', fontWeight: 700, color: '#0F172A' }}>Loading Document Data...</div>
            </div>
          ) : (
            <>
              {/* --- TAB 1 & 2: MASTER INVOICE & RECEIPT HTML PREVIEW --- */}
              {(activeTab === 'invoice' || activeTab === 'receipt') && (
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                    <div style={{ fontSize: '13px', color: '#475569' }}>
                      Official legal tax document rendered dynamically with authentic regulatory signatures.
                    </div>
                    <button
                      onClick={handlePrint}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        background: '#0F172A',
                        color: '#FFFFFF',
                        border: 'none',
                        padding: '8px 16px',
                        borderRadius: '6px',
                        fontSize: '12px',
                        fontWeight: 700,
                        cursor: 'pointer'
                      }}
                    >
                      <Printer size={14} /> Print / Save PDF
                    </button>
                  </div>

                  <div 
                    style={{
                      border: '1px solid #E2E8F0',
                      borderRadius: '8px',
                      padding: '24px',
                      background: '#FFFFFF',
                      minHeight: '400px',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
                    }}
                    dangerouslySetInnerHTML={{ __html: htmlContent }}
                  />
                </div>
              )}

              {/* --- TAB 3: PROOF OF DELIVERY (POD) & DISPUTE / INCIDENTALS --- */}
              {activeTab === 'pod' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  <div style={{
                    background: '#F8FAFC',
                    border: '1px solid #E2E8F0',
                    borderRadius: '12px',
                    padding: '20px',
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                    gap: '16px'
                  }}>
                    <div>
                      <div style={{ fontSize: '11px', color: '#64748B', fontWeight: 800, textTransform: 'uppercase' }}>ESCROW STATUS</div>
                      <div style={{ fontSize: '15px', fontWeight: 800, color: '#059669', marginTop: '2px' }}>
                        {podData?.escrow_status || '24H_ESCROW_HELD'}
                      </div>
                    </div>
                    <div>
                      <div style={{ fontSize: '11px', color: '#64748B', fontWeight: 800, textTransform: 'uppercase' }}>DELIVERY VERIFICATION</div>
                      <div style={{ fontSize: '14px', fontWeight: 700, color: '#0F172A', marginTop: '2px' }}>
                        {podData?.gps_verified ? '✅ GPS Geofence Verified' : '📍 Manual Chauffeur Release'}
                      </div>
                    </div>
                    <div>
                      <div style={{ fontSize: '11px', color: '#64748B', fontWeight: 800, textTransform: 'uppercase' }}>CHAUFFEUR RATING</div>
                      <div style={{ fontSize: '14px', fontWeight: 700, color: '#D97706', marginTop: '2px' }}>
                        ★ {podData?.driver_rating || '5.00'} / 5.00
                      </div>
                    </div>
                  </div>

                  {/* Incidentals Request / Approval Box */}
                  <div style={{ border: '1px solid #E2E8F0', borderRadius: '12px', padding: '20px', background: '#FFFFFF' }}>
                    <h4 style={{ margin: '0 0 12px 0', fontSize: '14px', fontWeight: 800, color: '#0F172A' }}>
                      Additional Incidentals & Extra Charges
                    </h4>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 2fr', gap: '12px', marginBottom: '12px' }}>
                      <div>
                        <label style={{ fontSize: '11px', fontWeight: 700, color: '#475569' }}>Extra Wait (Mins)</label>
                        <input
                          type="number"
                          value={incidentalWaitMinutes}
                          onChange={(e) => setIncidentalWaitMinutes(parseInt(e.target.value) || 0)}
                          style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '13px', marginTop: '4px' }}
                        />
                      </div>
                      <div>
                        <label style={{ fontSize: '11px', fontWeight: 700, color: '#475569' }}>Tolls & Parking ($)</label>
                        <input
                          type="text"
                          value={incidentalTolls}
                          onChange={(e) => setIncidentalTolls(e.target.value)}
                          style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '13px', marginTop: '4px' }}
                        />
                      </div>
                      <div>
                        <label style={{ fontSize: '11px', fontWeight: 700, color: '#475569' }}>Itemized Notes</label>
                        <input
                          type="text"
                          value={incidentalNotes}
                          placeholder="e.g. Triboro bridge toll + 15 min curbside wait"
                          onChange={(e) => setIncidentalNotes(e.target.value)}
                          style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '13px', marginTop: '4px' }}
                        />
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: '10px' }}>
                      <button
                        onClick={handleRequestIncidentals}
                        disabled={actionLoading}
                        style={{
                          background: '#0F172A',
                          color: '#FFFFFF',
                          border: 'none',
                          padding: '8px 16px',
                          borderRadius: '6px',
                          fontSize: '12px',
                          fontWeight: 700,
                          cursor: 'pointer'
                        }}
                      >
                        {actionLoading ? 'Submitting...' : '➕ Request Incidentals'}
                      </button>
                      <button
                        onClick={handleApproveIncidentals}
                        disabled={actionLoading}
                        style={{
                          background: '#059669',
                          color: '#FFFFFF',
                          border: 'none',
                          padding: '8px 16px',
                          borderRadius: '6px',
                          fontSize: '12px',
                          fontWeight: 700,
                          cursor: 'pointer'
                        }}
                      >
                        {actionLoading ? 'Approving...' : '✅ Approve & Capture Extra Fare'}
                      </button>
                    </div>
                  </div>

                  {/* Dispute Delivery Section */}
                  <div style={{ border: '1px solid #FECACA', borderRadius: '12px', padding: '20px', background: '#FEF2F2' }}>
                    <h4 style={{ margin: '0 0 8px 0', fontSize: '14px', fontWeight: 800, color: '#991B1B', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Scale size={16} /> Dispute Service Quality & Hold Escrow
                    </h4>
                    <p style={{ fontSize: '12px', color: '#7F1D1D', margin: '0 0 12px 0' }}>
                      Temporarily freezes automated 24-hour partner payout to allow investigation of customer complaints.
                    </p>
                    <textarea
                      rows={2}
                      value={disputeReason}
                      placeholder="Specify passenger complaint or service shortfall details..."
                      onChange={(e) => setDisputeReason(e.target.value)}
                      style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #FCA5A5', fontSize: '12.5px', marginBottom: '10px' }}
                    />
                    <button
                      onClick={handleDisputeDelivery}
                      disabled={actionLoading}
                      style={{
                        background: '#DC2626',
                        color: '#FFFFFF',
                        border: 'none',
                        padding: '8px 16px',
                        borderRadius: '6px',
                        fontSize: '12px',
                        fontWeight: 700,
                        cursor: 'pointer'
                      }}
                    >
                      {actionLoading ? 'Submitting...' : '⚠️ Submit Quality Dispute'}
                    </button>
                  </div>
                </div>
              )}

              {/* --- TAB 4: MANUAL PAYMENT CAPTURE --- */}
              {activeTab === 'payment' && (
                <div style={{ maxWidth: '560px', margin: '0 auto', textAlign: 'center', padding: '20px 0' }}>
                  <DollarSign size={40} color="#059669" style={{ margin: '0 auto 12px auto' }} />
                  <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#0F172A', margin: '0 0 8px 0' }}>
                    Capture Pre-Authorization & Settle Driver Ledger
                  </h3>
                  <p style={{ fontSize: '13px', color: '#64748B', lineHeight: '1.5', margin: '0 0 24px 0' }}>
                    Executes immediate capture of the customer's Stripe pre-authorization hold, transitions trip to COMPLETED, and credits the chauffeur's payout ledger with base split and tips.
                  </p>
                  <button
                    onClick={handleCapturePayment}
                    disabled={actionLoading}
                    style={{
                      background: '#059669',
                      color: '#FFFFFF',
                      border: 'none',
                      padding: '12px 28px',
                      borderRadius: '8px',
                      fontSize: '14px',
                      fontWeight: 800,
                      cursor: 'pointer',
                      boxShadow: '0 4px 12px rgba(5, 150, 105, 0.25)'
                    }}
                  >
                    {actionLoading ? 'Capturing...' : '⚡ Capture Pre-Auth & Settle Trip Now'}
                  </button>
                </div>
              )}

              {/* --- TAB 5: COURTESY REFUND / PARTIAL CREDIT --- */}
              {activeTab === 'refund' && (
                <div style={{ maxWidth: '560px', margin: '0 auto' }}>
                  <h3 style={{ fontSize: '16px', fontWeight: 800, color: '#0F172A', marginBottom: '8px' }}>
                    Issue Direct Courtesy Refund or Partial Credit
                  </h3>
                  <p style={{ fontSize: '12.5px', color: '#64748B', marginBottom: '20px' }}>
                    Issues real Stripe refund back to passenger card for minor flight delays, traffic courtesies, or satisfaction guarantees.
                  </p>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                    <div>
                      <label style={{ fontSize: '12px', fontWeight: 700, color: '#334155' }}>Refund Amount ($ USD)</label>
                      <input
                        type="text"
                        value={refundAmount}
                        disabled={isFullRefund}
                        onChange={(e) => setRefundAmount(e.target.value)}
                        style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '14px', fontWeight: 700, marginTop: '4px' }}
                      />
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <input
                        type="checkbox"
                        id="fullRefundCheck"
                        checked={isFullRefund}
                        onChange={(e) => setIsFullRefund(e.target.checked)}
                      />
                      <label htmlFor="fullRefundCheck" style={{ fontSize: '13px', fontWeight: 600, color: '#0F172A', cursor: 'pointer' }}>
                        Issue 100% Full Return & Cancellation
                      </label>
                    </div>

                    <div>
                      <label style={{ fontSize: '12px', fontWeight: 700, color: '#334155' }}>Reason for Courtesy</label>
                      <select
                        value={refundReason}
                        onChange={(e) => setRefundReason(e.target.value)}
                        style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '13px', marginTop: '4px' }}
                      >
                        <option value="COURTESY_DELAY">Traffic / Airport Delay Courtesy</option>
                        <option value="VEHICLE_SUBSTITUTION">Vehicle Substitution Adjustment</option>
                        <option value="CUSTOMER_SATISFACTION">VIP Customer Satisfaction Guarantee</option>
                        <option value="ROUTE_SHORTENING">Trip Finished Earlier Than Estimated</option>
                      </select>
                    </div>

                    <button
                      onClick={handleExecuteRefund}
                      disabled={actionLoading}
                      style={{
                        background: '#0F172A',
                        color: '#FFFFFF',
                        border: 'none',
                        padding: '12px',
                        borderRadius: '8px',
                        fontSize: '13px',
                        fontWeight: 800,
                        cursor: 'pointer',
                        marginTop: '10px'
                      }}
                    >
                      {actionLoading ? 'Processing Refund...' : `↩️ Issue $${isFullRefund ? 'Full' : refundAmount} Courtesy Refund`}
                    </button>
                  </div>
                </div>
              )}

              {/* --- TAB 6: CANCELLATION --- */}
              {activeTab === 'cancel' && (
                <div style={{ maxWidth: '560px', margin: '0 auto' }}>
                  <div style={{ background: '#FEF2F2', border: '1px solid #FCA5A5', borderRadius: '10px', padding: '14px', marginBottom: '20px' }}>
                    <div style={{ fontSize: '13px', fontWeight: 800, color: '#991B1B', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <AlertTriangle size={16} /> Official Booking Cancellation
                    </div>
                    <p style={{ fontSize: '12px', color: '#7F1D1D', margin: '4px 0 0 0' }}>
                      Releases Stripe pre-authorization hold back to passenger's account and transmits policy cancellation SMS & email.
                    </p>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                    <div>
                      <label style={{ fontSize: '12px', fontWeight: 700, color: '#334155' }}>Cancellation Cause</label>
                      <select
                        value={cancelReason}
                        onChange={(e) => setCancelReason(e.target.value)}
                        style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '13px', marginTop: '4px' }}
                      >
                        <option value="CUSTOMER_REQUEST">Passenger Requested Cancellation</option>
                        <option value="FLIGHT_CANCELLED">Flight Cancelled by Airline (Force Majeure)</option>
                        <option value="NO_SHOW">Passenger No-Show after Grace Period</option>
                        <option value="VEHICLE_BREAKDOWN">Fleet Operational Shortage</option>
                      </select>
                    </div>

                    <div>
                      <label style={{ fontSize: '12px', fontWeight: 700, color: '#334155' }}>Internal Dispatch Notes</label>
                      <textarea
                        rows={3}
                        value={cancelNotes}
                        placeholder="Add reason details for audit logs..."
                        onChange={(e) => setCancelNotes(e.target.value)}
                        style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '13px', marginTop: '4px' }}
                      />
                    </div>

                    <button
                      onClick={handleExecuteCancel}
                      disabled={actionLoading}
                      style={{
                        background: '#DC2626',
                        color: '#FFFFFF',
                        border: 'none',
                        padding: '12px',
                        borderRadius: '8px',
                        fontSize: '13px',
                        fontWeight: 800,
                        cursor: 'pointer',
                        marginTop: '10px'
                      }}
                    >
                      {actionLoading ? 'Cancelling...' : '🚫 Confirm Full Cancellation & Release Hold'}
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};
