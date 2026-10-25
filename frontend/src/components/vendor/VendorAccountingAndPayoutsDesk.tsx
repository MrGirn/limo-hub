import React, { useState, useEffect } from 'react';
import { 
  DollarSign, TrendingUp, ShieldCheck, Download, CreditCard, 
  Building, RefreshCw, CheckCircle2, ArrowUpRight, AlertCircle, 
  Users, Receipt, FileText, ChevronRight, Landmark, Clock, ArrowRight,
  ShieldAlert, Printer
} from 'lucide-react';

interface SettlementItem {
  settlement_id: string;
  booking_id: string;
  booking_reference: string;
  role: string;
  passenger_name: string;
  route: string;
  vehicle_class: string;
  total_fare_usd: number;
  vendor_net_earnings_usd: number;
  platform_fee_usd: number;
  status: string;
  stripe_transfer_id: string;
  created_at: string;
}

interface DriverPayrollItem {
  driver_name: string;
  phone: string;
  completed_trips: number;
  gross_fares_usd: number;
  gratuities_usd: number;
  commission_rate_pct: number;
  driver_earnings_usd: number;
  payout_status: string;
}

interface VendorAccountingSummary {
  vendor_id: string;
  company_name: string;
  market_city: string;
  currency: string;
  financial_kpis: {
    gross_servicing_revenue_usd: number;
    net_servicing_payout_usd: number;
    originating_commissions_usd: number;
    clearing_fees_paid_usd: number;
    available_balance_usd: number;
    pending_escrow_usd: number;
    dispute_locked_usd: number;
    total_settlements_count: number;
  };
  tax_and_surcharges: {
    total_tax_collected_usd: number;
    total_airport_fees_usd: number;
    total_tolls_usd: number;
    tax_jurisdiction: string;
  };
  stripe_connect: {
    account_id: string;
    status: string;
    payouts_enabled: boolean;
    charges_enabled: boolean;
    currency: string;
  };
  settlement_transactions: SettlementItem[];
  driver_payroll: DriverPayrollItem[];
}

interface VendorAccountingAndPayoutsDeskProps {
  vendorId: string;
  vendorName?: string;
}

export const VendorAccountingAndPayoutsDesk: React.FC<VendorAccountingAndPayoutsDeskProps> = ({
  vendorId,
  vendorName
}) => {
  const [data, setData] = useState<VendorAccountingSummary | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'settlements' | 'payroll' | 'taxes' | 'stripe'>('settlements');
  
  // Instant Payout Action State
  const [payoutInProgress, setPayoutInProgress] = useState<boolean>(false);
  const [payoutNotice, setPayoutNotice] = useState<string | null>(null);

  // Driver Pay Slip Modal State
  const [selectedDriverForSlip, setSelectedDriverForSlip] = useState<DriverPayrollItem | null>(null);

  const fetchAccountingData = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/v1/global-hub/vendors/${vendorId}/accounting/summary`);
      if (!res.ok) {
        throw new Error(`Failed to load accounting ledger (HTTP ${res.status})`);
      }
      const json = await res.json();
      setData(json);
    } catch (err: any) {
      setError(err.message || 'Error fetching sovereign accounting data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAccountingData();
  }, [vendorId]);

  const handleRequestInstantPayout = async () => {
    if (!data || data.financial_kpis.available_balance_usd <= 0) {
      alert("No cleared available balance for instant payout transfer.");
      return;
    }
    setPayoutInProgress(true);
    setPayoutNotice(null);
    try {
      const res = await fetch(`/api/v1/global-hub/vendors/${vendorId}/accounting/request-payout`, {
        method: 'POST'
      });
      const result = await res.json();
      if (result.success) {
        setPayoutNotice(`✓ Successfully transferred $${result.transferred_amount_usd.toFixed(2)} to Stripe Connect (${result.payout_transfer_id})`);
        fetchAccountingData();
      } else {
        setPayoutNotice(`⚠️ ${result.message || 'Payout transfer failed'}`);
      }
    } catch (err: any) {
      setPayoutNotice(`⚠️ Payout request failed: ${err.message}`);
    } finally {
      setPayoutInProgress(false);
    }
  };

  const handleDownloadCsv = () => {
    window.open(`/api/v1/global-hub/vendors/${vendorId}/accounting/statement-export`, '_blank');
  };

  if (loading && !data) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '60px 0', gap: '16px' }}>
        <RefreshCw size={32} className="spin" color="#0078D4" />
        <span style={{ fontSize: '14px', color: '#64748B', fontWeight: '600' }}>
          Loading authoritative sovereign financial ledger from MySQL...
        </span>
      </div>
    );
  }

  if (error && !data) {
    return (
      <div style={{ background: '#FEF2F2', border: '1px solid #FCA5A5', borderRadius: '12px', padding: '24px', textAlign: 'center' }}>
        <AlertCircle size={32} color="#DC2626" style={{ margin: '0 auto 8px auto' }} />
        <h3 style={{ fontSize: '16px', fontWeight: '800', color: '#991B1B', margin: 0 }}>Failed to Load Sovereign Accounting</h3>
        <p style={{ fontSize: '13px', color: '#B91C1C', margin: '8px 0 16px 0' }}>{error}</p>
        <button
          onClick={fetchAccountingData}
          style={{ background: '#DC2626', color: '#FFFFFF', border: 'none', borderRadius: '8px', padding: '8px 16px', fontSize: '13px', fontWeight: '700', cursor: 'pointer' }}
        >
          Retry
        </button>
      </div>
    );
  }

  const kpis = data?.financial_kpis;
  const isStripeConnected = data?.stripe_connect.status === 'CONNECTED';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Top Banner / Actions */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <h2 style={{ fontSize: '24px', fontWeight: '900', color: '#0F172A', margin: 0, letterSpacing: '-0.03em' }}>
              Sovereign Accounting & Clearinghouse Payout Desk
            </h2>
            <span style={{
              background: '#0F172A',
              color: '#38BDF8',
              fontSize: '11px',
              fontWeight: '800',
              padding: '3px 8px',
              borderRadius: '6px',
              fontFamily: 'monospace'
            }}>
              {data?.company_name || vendorName || vendorId}
            </span>
          </div>
          <p style={{ fontSize: '13px', color: '#64748B', margin: '4px 0 0 0' }}>
            Authoritative double-entry ledger • 80% Servicing Disbursals • 10% Booker Commissions • Chauffeur Payroll
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            onClick={handleDownloadCsv}
            style={{
              background: '#FFFFFF',
              border: '1px solid #CBD5E1',
              borderRadius: '8px',
              padding: '8px 16px',
              fontSize: '13px',
              fontWeight: '700',
              color: '#0F172A',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
            }}
          >
            <Download size={15} color="#0F172A" /> Export Statement (.csv)
          </button>

          <button
            onClick={handleRequestInstantPayout}
            disabled={payoutInProgress || !kpis || kpis.available_balance_usd <= 0}
            style={{
              background: kpis && kpis.available_balance_usd > 0 ? '#16A34A' : '#94A3B8',
              border: 'none',
              borderRadius: '8px',
              padding: '8px 18px',
              fontSize: '13px',
              fontWeight: '800',
              color: '#FFFFFF',
              cursor: kpis && kpis.available_balance_usd > 0 ? 'pointer' : 'not-allowed',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              boxShadow: '0 2px 8px rgba(22,163,74,0.2)'
            }}
          >
            <CreditCard size={15} /> {payoutInProgress ? 'Transferring...' : 'Request Instant Payout'}
          </button>

          <button
            onClick={fetchAccountingData}
            style={{
              background: '#F1F5F9',
              border: 'none',
              borderRadius: '8px',
              padding: '8px 12px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center'
            }}
            title="Refresh Ledger"
          >
            <RefreshCw size={15} color="#475569" className={loading ? 'spin' : ''} />
          </button>
        </div>
      </div>

      {/* Payout Notice Banner */}
      {payoutNotice && (
        <div style={{
          background: payoutNotice.startsWith('✓') ? '#F0FDF4' : '#FEF2F2',
          border: `1px solid ${payoutNotice.startsWith('✓') ? '#86EFAC' : '#FCA5A5'}`,
          borderRadius: '8px',
          padding: '12px 16px',
          fontSize: '13px',
          fontWeight: '700',
          color: payoutNotice.startsWith('✓') ? '#166534' : '#991B1B'
        }}>
          {payoutNotice}
        </div>
      )}

      {/* Stripe Connect Account Strip */}
      <div style={{
        background: isStripeConnected ? 'linear-gradient(135deg, #0F172A 0%, #1E293B 100%)' : '#FFFBEB',
        border: `1px solid ${isStripeConnected ? '#334155' : '#FDE68A'}`,
        borderRadius: '12px',
        padding: '18px 24px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '16px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{
            background: isStripeConnected ? '#0078D4' : '#F59E0B',
            color: '#FFFFFF',
            padding: '10px',
            borderRadius: '10px'
          }}>
            <Landmark size={20} />
          </div>
          <div>
            <div style={{ fontSize: '14px', fontWeight: '800', color: isStripeConnected ? '#FFFFFF' : '#92400E' }}>
              Stripe Connect Treasury & Payout Gateway
            </div>
            <div style={{ fontSize: '12px', color: isStripeConnected ? '#94A3B8' : '#B45309', marginTop: '2px' }}>
              Account ID: <code style={{ color: isStripeConnected ? '#38BDF8' : '#92400E', fontFamily: 'monospace' }}>{data?.stripe_connect.account_id}</code>
              {' • '} Currency: <strong>{data?.stripe_connect.currency || 'USD'}</strong>
              {' • '} Payouts: <strong>{isStripeConnected ? 'Enabled (Direct ACH / Instant Card)' : 'Setup Required'}</strong>
            </div>
          </div>
        </div>

        <div>
          {isStripeConnected ? (
            <span style={{
              background: '#052e16',
              color: '#4ade80',
              border: '1px solid #166534',
              padding: '6px 12px',
              borderRadius: '999px',
              fontSize: '12px',
              fontWeight: '800',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px'
            }}>
              <CheckCircle2 size={13} /> Active & Verified
            </span>
          ) : (
            <button
              onClick={() => alert(`Redirecting to Stripe Connect Express onboarding for ${vendorId}...`)}
              style={{
                background: '#D97706',
                color: '#FFFFFF',
                border: 'none',
                borderRadius: '8px',
                padding: '8px 16px',
                fontSize: '12px',
                fontWeight: '800',
                cursor: 'pointer'
              }}
            >
              Complete Stripe Onboarding
            </button>
          )}
        </div>
      </div>

      {/* 4 Financial KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
        {/* Gross Servicing Volume */}
        <div style={{ background: '#FFFFFF', borderRadius: '12px', border: '1px solid #E2E8F0', padding: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: '#64748B', fontSize: '12px', fontWeight: '700' }}>
            <span>Gross Servicing Revenue</span>
            <DollarSign size={16} color="#0078D4" />
          </div>
          <div style={{ fontSize: '24px', fontWeight: '900', color: '#0F172A', marginTop: '8px' }}>
            ${(kpis?.gross_servicing_revenue_usd ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div style={{ fontSize: '11px', color: '#16A34A', marginTop: '4px', fontWeight: '700' }}>
            100% Live DB Transactions
          </div>
        </div>

        {/* Net 80% Servicing Disbursal */}
        <div style={{ background: '#FFFFFF', borderRadius: '12px', border: '1px solid #E2E8F0', padding: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: '#64748B', fontSize: '12px', fontWeight: '700' }}>
            <span>Net Servicing Payout (80%)</span>
            <TrendingUp size={16} color="#16A34A" />
          </div>
          <div style={{ fontSize: '24px', fontWeight: '900', color: '#16A34A', marginTop: '8px' }}>
            ${(kpis?.net_servicing_payout_usd ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div style={{ fontSize: '11px', color: '#64748B', marginTop: '4px' }}>
            Less 10% Booker & 10% Clearing
          </div>
        </div>

        {/* Booker Referral Commissions (10%) */}
        <div style={{ background: '#FFFFFF', borderRadius: '12px', border: '1px solid #E2E8F0', padding: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: '#64748B', fontSize: '12px', fontWeight: '700' }}>
            <span>Originating Commissions (10%)</span>
            <ArrowUpRight size={16} color="#0284C7" />
          </div>
          <div style={{ fontSize: '24px', fontWeight: '900', color: '#0284C7', marginTop: '8px' }}>
            ${(kpis?.originating_commissions_usd ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div style={{ fontSize: '11px', color: '#64748B', marginTop: '4px' }}>
            Earned from Farm-Out Referrals
          </div>
        </div>

        {/* Available Balance vs Pending Escrow */}
        <div style={{ background: '#FFFFFF', borderRadius: '12px', border: '1px solid #E2E8F0', padding: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: '#64748B', fontSize: '12px', fontWeight: '700' }}>
            <span>Available for Payout</span>
            <CreditCard size={16} color="#0F172A" />
          </div>
          <div style={{ fontSize: '24px', fontWeight: '900', color: '#0F172A', marginTop: '8px' }}>
            ${(kpis?.available_balance_usd ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div style={{ fontSize: '11px', color: '#CA8A04', marginTop: '4px', fontWeight: '700' }}>
            ${(kpis?.pending_escrow_usd ?? 0).toFixed(2)} in 24h Escrow Hold
          </div>
        </div>
      </div>

      {/* Sub Tabs */}
      <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid #E2E8F0', paddingBottom: '8px' }}>
        <button
          onClick={() => setActiveTab('settlements')}
          style={{
            padding: '8px 16px',
            borderRadius: '8px',
            fontSize: '13px',
            fontWeight: '800',
            border: 'none',
            cursor: 'pointer',
            background: activeTab === 'settlements' ? '#0F172A' : 'transparent',
            color: activeTab === 'settlements' ? '#FFFFFF' : '#64748B'
          }}
        >
          Settlement Ledger ({data?.settlement_transactions.length ?? 0})
        </button>

        <button
          onClick={() => setActiveTab('payroll')}
          style={{
            padding: '8px 16px',
            borderRadius: '8px',
            fontSize: '13px',
            fontWeight: '800',
            border: 'none',
            cursor: 'pointer',
            background: activeTab === 'payroll' ? '#0F172A' : 'transparent',
            color: activeTab === 'payroll' ? '#FFFFFF' : '#64748B'
          }}
        >
          Chauffeur Payroll & Tips ({data?.driver_payroll.length ?? 0})
        </button>

        <button
          onClick={() => setActiveTab('taxes')}
          style={{
            padding: '8px 16px',
            borderRadius: '8px',
            fontSize: '13px',
            fontWeight: '800',
            border: 'none',
            cursor: 'pointer',
            background: activeTab === 'taxes' ? '#0F172A' : 'transparent',
            color: activeTab === 'taxes' ? '#FFFFFF' : '#64748B'
          }}
        >
          Taxes, Fees & Tolls
        </button>
      </div>

      {/* Tab 1: Settlement Ledger */}
      {activeTab === 'settlements' && (
        <div style={{ background: '#FFFFFF', borderRadius: '12px', border: '1px solid #E2E8F0', overflow: 'hidden' }}>
          {data?.settlement_transactions.length === 0 ? (
            <div style={{ padding: '48px 24px', textAlign: 'center', color: '#64748B' }}>
              <Receipt size={36} color="#CBD5E1" style={{ margin: '0 auto 12px auto' }} />
              <div style={{ fontSize: '15px', fontWeight: '800', color: '#0F172A' }}>No Settlement Records Found</div>
              <div style={{ fontSize: '13px', color: '#64748B', marginTop: '4px' }}>
                Completed customer bookings dispatched to this sovereign vendor will appear here with live 80/10/10 ledger splits.
              </div>
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'left' }}>
              <thead>
                <tr style={{ background: '#F8FAFC', borderBottom: '1px solid #E2E8F0', color: '#475569', fontWeight: '700' }}>
                  <th style={{ padding: '14px 16px' }}>Settlement ID</th>
                  <th style={{ padding: '14px 16px' }}>Booking Ref</th>
                  <th style={{ padding: '14px 16px' }}>Passenger & Route</th>
                  <th style={{ padding: '14px 16px' }}>Role</th>
                  <th style={{ padding: '14px 16px' }}>Total Fare</th>
                  <th style={{ padding: '14px 16px' }}>Your Net</th>
                  <th style={{ padding: '14px 16px' }}>Clearing Fee</th>
                  <th style={{ padding: '14px 16px' }}>Status</th>
                  <th style={{ padding: '14px 16px' }}>Stripe Transfer</th>
                </tr>
              </thead>
              <tbody>
                {data?.settlement_transactions.map(s => (
                  <tr key={s.settlement_id} style={{ borderBottom: '1px solid #F1F5F9' }}>
                    <td style={{ padding: '14px 16px', fontFamily: 'monospace', fontWeight: '700', fontSize: '12px' }}>
                      {s.settlement_id}
                    </td>
                    <td style={{ padding: '14px 16px', fontWeight: '800', color: '#0078D4' }}>
                      {s.booking_reference}
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      <div style={{ fontWeight: '700', color: '#0F172A' }}>{s.passenger_name}</div>
                      <div style={{ fontSize: '11px', color: '#64748B', maxWidth: '240px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {s.route}
                      </div>
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      <span style={{
                        fontSize: '11px',
                        fontWeight: '700',
                        color: s.role === 'SERVICING_AFFILIATE' ? '#16A34A' : '#0284C7'
                      }}>
                        {s.role === 'SERVICING_AFFILIATE' ? 'Servicing (80%)' : 'Booker (10%)'}
                      </span>
                    </td>
                    <td style={{ padding: '14px 16px', fontWeight: '800' }}>
                      ${s.total_fare_usd.toFixed(2)}
                    </td>
                    <td style={{ padding: '14px 16px', fontWeight: '800', color: '#16A34A' }}>
                      ${s.vendor_net_earnings_usd.toFixed(2)}
                    </td>
                    <td style={{ padding: '14px 16px', color: '#64748B', fontSize: '12px' }}>
                      ${s.platform_fee_usd.toFixed(2)}
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      <span style={{
                        fontSize: '11px',
                        fontWeight: '800',
                        padding: '3px 8px',
                        borderRadius: '999px',
                        background: s.status === 'TRANSFERS_EXECUTED' || s.status === 'RELEASED_TO_AFFILIATE' ? '#DCFCE7' : s.status === 'DISPUTE_LOCKED' ? '#FEE2E2' : '#FEF9C3',
                        color: s.status === 'TRANSFERS_EXECUTED' || s.status === 'RELEASED_TO_AFFILIATE' ? '#15803D' : s.status === 'DISPUTE_LOCKED' ? '#B91C1C' : '#854D0E'
                      }}>
                        {s.status}
                      </span>
                    </td>
                    <td style={{ padding: '14px 16px', fontFamily: 'monospace', fontSize: '11px', color: '#64748B' }}>
                      {s.stripe_transfer_id}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Tab 2: Chauffeur Payroll & Tips */}
      {activeTab === 'payroll' && (
        <div style={{ background: '#FFFFFF', borderRadius: '12px', border: '1px solid #E2E8F0', overflow: 'hidden' }}>
          <div style={{ padding: '16px 20px', background: '#F8FAFC', borderBottom: '1px solid #E2E8F0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: '14px', fontWeight: '800', color: '#0F172A' }}>Chauffeur Compensation & 100% Tip Pass-Through</div>
              <div style={{ fontSize: '12px', color: '#64748B' }}>Calculated from actual completed trip missions. Contractor splits & gratuity payouts.</div>
            </div>
            <button
              onClick={() => window.open(`/api/v1/vendors/${vendorId}/payroll/export`, '_blank')}
              style={{
                background: '#0F172A',
                color: '#FFF',
                border: 'none',
                borderRadius: '6px',
                padding: '6px 12px',
                fontSize: '12px',
                fontWeight: '700',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <Download size={13} /> Export Gusto/ADP CSV
            </button>
          </div>

          {data?.driver_payroll.length === 0 ? (
            <div style={{ padding: '48px 24px', textAlign: 'center', color: '#64748B' }}>
              <Users size={36} color="#CBD5E1" style={{ margin: '0 auto 12px auto' }} />
              <div style={{ fontSize: '15px', fontWeight: '800', color: '#0F172A' }}>No Driver Trip Compensation Records</div>
              <div style={{ fontSize: '13px', color: '#64748B', marginTop: '4px' }}>
                Completed rides with assigned chauffeurs will automatically accumulate trip earnings, commission splits, and tip disbursements here.
              </div>
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'left' }}>
              <thead>
                <tr style={{ background: '#F8FAFC', borderBottom: '1px solid #E2E8F0', color: '#475569', fontWeight: '700' }}>
                  <th style={{ padding: '14px 16px' }}>Chauffeur Name</th>
                  <th style={{ padding: '14px 16px' }}>Phone</th>
                  <th style={{ padding: '14px 16px' }}>Trips Completed</th>
                  <th style={{ padding: '14px 16px' }}>Total Fares Driven</th>
                  <th style={{ padding: '14px 16px' }}>Commission Split</th>
                  <th style={{ padding: '14px 16px' }}>100% Tips Collected</th>
                  <th style={{ padding: '14px 16px' }}>Net Chauffeur Pay</th>
                  <th style={{ padding: '14px 16px' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {data?.driver_payroll.map((d, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid #F1F5F9' }}>
                    <td style={{ padding: '14px 16px', fontWeight: '800', color: '#0F172A' }}>{d.driver_name}</td>
                    <td style={{ padding: '14px 16px', color: '#64748B' }}>{d.phone}</td>
                    <td style={{ padding: '14px 16px', fontWeight: '700' }}>{d.completed_trips} rides</td>
                    <td style={{ padding: '14px 16px', fontWeight: '700' }}>${d.gross_fares_usd.toFixed(2)}</td>
                    <td style={{ padding: '14px 16px', color: '#0078D4', fontWeight: '700' }}>{d.commission_rate_pct}%</td>
                    <td style={{ padding: '14px 16px', color: '#16A34A', fontWeight: '700' }}>${d.gratuities_usd.toFixed(2)}</td>
                    <td style={{ padding: '14px 16px', fontWeight: '900', color: '#16A34A', fontSize: '14px' }}>
                      ${(d.driver_earnings_usd + d.gratuities_usd).toFixed(2)}
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      <button
                        onClick={() => setSelectedDriverForSlip(d)}
                        style={{
                          background: '#F1F5F9',
                          border: '1px solid #CBD5E1',
                          borderRadius: '6px',
                          padding: '4px 10px',
                          fontSize: '11px',
                          fontWeight: '700',
                          color: '#0F172A',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px'
                        }}
                      >
                        <FileText size={12} /> Pay Slip
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Tab 3: Taxes, Fees & Tolls */}
      {activeTab === 'taxes' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px' }}>
          <div style={{ background: '#FFFFFF', borderRadius: '12px', border: '1px solid #E2E8F0', padding: '24px' }}>
            <h4 style={{ margin: '0 0 16px 0', fontSize: '15px', fontWeight: '800', color: '#0F172A' }}>
              Statutory Tax & Regulatory Surcharges
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid #F1F5F9' }}>
                <span style={{ fontSize: '13px', color: '#64748B' }}>Primary Tax Jurisdiction</span>
                <strong style={{ color: '#0F172A' }}>{data?.tax_and_surcharges.tax_jurisdiction}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid #F1F5F9' }}>
                <span style={{ fontSize: '13px', color: '#64748B' }}>Sales & Ground Transportation Tax Collected</span>
                <strong style={{ color: '#16A34A', fontSize: '15px' }}>${(data?.tax_and_surcharges.total_tax_collected_usd ?? 0).toFixed(2)}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid #F1F5F9' }}>
                <span style={{ fontSize: '13px', color: '#64748B' }}>Airport Ground Transportation Terminal Fees ($20/pickup)</span>
                <strong style={{ color: '#0078D4', fontSize: '15px' }}>${(data?.tax_and_surcharges.total_airport_fees_usd ?? 0).toFixed(2)}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0' }}>
                <span style={{ fontSize: '13px', color: '#64748B' }}>Bridge, Tunnel & Toll Surcharges</span>
                <strong style={{ color: '#64748B' }}>${(data?.tax_and_surcharges.total_tolls_usd ?? 0).toFixed(2)}</strong>
              </div>
            </div>
          </div>

          <div style={{ background: '#FFFFFF', borderRadius: '12px', border: '1px solid #E2E8F0', padding: '24px' }}>
            <h4 style={{ margin: '0 0 16px 0', fontSize: '15px', fontWeight: '800', color: '#0F172A' }}>
              CPA Tax Filing & Remittance Summary
            </h4>
            <p style={{ fontSize: '13px', color: '#64748B', lineHeight: '1.6' }}>
              All taxes, airport concession fees, and customer invoices are generated under <strong>Global Hub as Merchant of Record</strong> or passed directly to your registered tax ID. Use the official export statement above for state sales tax filing and 1099-K reconciliation.
            </p>
            <div style={{ marginTop: '20px', padding: '14px', background: '#F8FAFC', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
              <div style={{ fontSize: '12px', fontWeight: '700', color: '#0F172A' }}>Merchant Clearing ID</div>
              <div style={{ fontSize: '12px', color: '#64748B', fontFamily: 'monospace', marginTop: '2px' }}>
                MEC-LIMO-{vendorId.toUpperCase()}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Driver Pay Slip Modal */}
      {selectedDriverForSlip && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.6)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: '20px'
        }}>
          <div style={{
            background: '#FFFFFF',
            borderRadius: '12px',
            maxWidth: '500px',
            width: '100%',
            padding: '30px',
            boxShadow: '0 20px 40px rgba(0,0,0,0.2)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2px solid #0F172A', paddingBottom: '16px' }}>
              <div>
                <div style={{ fontSize: '18px', fontWeight: '900', color: '#0F172A' }}>Chauffeur Settlement Voucher</div>
                <div style={{ fontSize: '12px', color: '#64748B' }}>{data?.company_name || vendorName} • Driver Pay Statement</div>
              </div>
              <button
                onClick={() => setSelectedDriverForSlip(null)}
                style={{ background: 'transparent', border: 'none', fontSize: '18px', fontWeight: 'bold', cursor: 'pointer', color: '#64748B' }}
              >
                ✕
              </button>
            </div>

            <div style={{ padding: '20px 0', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '13px', color: '#64748B' }}>Chauffeur Name:</span>
                <strong style={{ color: '#0F172A' }}>{selectedDriverForSlip.driver_name}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '13px', color: '#64748B' }}>Phone:</span>
                <span style={{ color: '#0F172A' }}>{selectedDriverForSlip.phone}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '13px', color: '#64748B' }}>Completed Trips:</span>
                <strong style={{ color: '#0078D4' }}>{selectedDriverForSlip.completed_trips} rides</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #E2E8F0', paddingTop: '10px' }}>
                <span style={{ fontSize: '13px', color: '#64748B' }}>Gross Fares Driven:</span>
                <span>${selectedDriverForSlip.gross_fares_usd.toFixed(2)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '13px', color: '#64748B' }}>Commission Cut ({selectedDriverForSlip.commission_rate_pct}%):</span>
                <strong style={{ color: '#16A34A' }}>${selectedDriverForSlip.driver_earnings_usd.toFixed(2)}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '13px', color: '#64748B' }}>100% Tips Pass-Through:</span>
                <strong style={{ color: '#16A34A' }}>+${selectedDriverForSlip.gratuities_usd.toFixed(2)}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '2px solid #0F172A', paddingTop: '12px', fontSize: '16px' }}>
                <strong>Total Net Compensation:</strong>
                <strong style={{ color: '#16A34A' }}>
                  ${(selectedDriverForSlip.driver_earnings_usd + selectedDriverForSlip.gratuities_usd).toFixed(2)}
                </strong>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '10px', marginTop: '16px' }}>
              <button
                onClick={() => window.print()}
                style={{
                  flex: 1,
                  background: '#0F172A',
                  color: '#FFF',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '10px',
                  fontSize: '13px',
                  fontWeight: '700',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px'
                }}
              >
                <Printer size={14} /> Print Pay Voucher
              </button>
              <button
                onClick={() => setSelectedDriverForSlip(null)}
                style={{
                  background: '#F1F5F9',
                  color: '#475569',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '10px 16px',
                  fontSize: '13px',
                  fontWeight: '700',
                  cursor: 'pointer'
                }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
