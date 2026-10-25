import React, { useState, useEffect } from 'react';
import { DollarSign, TrendingUp, ShieldCheck, Download, CreditCard, Building, RefreshCw, FileText, CheckCircle2, ArrowUpRight } from 'lucide-react';

interface FinancialReportSummary {
  financial_summary: {
    gross_merchandise_volume_usd: number;
    clearinghouse_net_revenue_usd: number;
    affiliate_servicing_payouts_usd: number;
    originating_partner_commissions_usd: number;
    total_settlement_transactions: number;
  };
  ride_volume_summary: {
    total_rides_created: number;
    confirmed_rides: number;
    completed_rides: number;
    in_progress_rides: number;
    cancelled_rides: number;
    on_time_dispatch_sla_pct: number;
  };
  network_capacity: {
    active_sovereign_cells: number;
    total_registered_fleet: number;
    open_rfp_auctions: number;
    average_network_rating: number;
  };
  top_carrier_volume: Array<{ carrier: string; volume_usd: number }>;
}

interface SettlementRecord {
  settlement_id: string;
  booking_id: string;
  total_fare_usd: number;
  servicing_payout_usd: number;
  originating_commission_usd: number;
  platform_clearing_fee_usd: number;
  servicing_vendor_id: string;
  status: string;
  stripe_transfer_servicing_id?: string;
  created_at: string;
}

interface CorporateAccount {
  corporate_id: string;
  company_name: string;
  billing_email: string;
  credit_limit_usd: number;
  outstanding_balance_usd: number;
  currency: string;
  payment_terms: string;
  status: string;
}

export const FinancialReportsLedgerPanel: React.FC = () => {
  const [summary, setSummary] = useState<FinancialReportSummary | null>(null);
  const [ledger, setLedger] = useState<SettlementRecord[]>([]);
  const [corporateAccounts, setCorporateAccounts] = useState<CorporateAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeSubTab, setActiveSubTab] = useState<'analytics' | 'escrow' | 'corporate'>('analytics');

  const fetchData = async () => {
    setLoading(true);
    try {
      const [sumRes, ledRes, corpRes] = await Promise.all([
        fetch('/api/v1/global-hub/admin/reports/summary'),
        fetch('/api/v1/global-hub/settlements/ledger'),
        fetch('/api/v1/global-hub/corporate/accounts')
      ]);

      if (sumRes.ok) {
        const sumData = await sumRes.json();
        setSummary(sumData);
      }
      if (ledRes.ok) {
        const ledData = await ledRes.json();
        setLedger(ledData.ledger || []);
      }
      if (corpRes.ok) {
        const corpData = await corpRes.json();
        setCorporateAccounts(corpData.accounts || []);
      }
    } catch (err) {
      console.error('Failed to load financial reports', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleDownloadCsv = () => {
    if (!ledger.length) return;
    const headers = ['Settlement ID', 'Booking Ref', 'Total Fare USD', 'Servicing 80%', 'Originating 10%', 'Clearing Fee 10%', 'Status', 'Date'];
    const rows = ledger.map(s => [
      s.settlement_id,
      s.booking_id,
      s.total_fare_usd,
      s.servicing_payout_usd,
      s.originating_commission_usd,
      s.platform_clearing_fee_usd,
      s.status,
      s.created_at
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `global_hub_escrow_settlements_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ fontSize: '22px', fontWeight: '900', color: '#0F172A', margin: 0, letterSpacing: '-0.02em' }}>
            Clearinghouse Financial Analytics & Escrow Ledger (SOC 1)
          </h2>
          <p style={{ fontSize: '13px', color: '#64748B', margin: '4px 0 0 0' }}>
            Authoritative 80/10/10 revenue accounting, double-entry escrow logs, corporate Net-30 master accounts, and automated audit trails.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            onClick={handleDownloadCsv}
            style={{
              background: '#0F172A',
              border: 'none',
              borderRadius: '8px',
              padding: '8px 16px',
              fontSize: '13px',
              fontWeight: '700',
              color: '#FFFFFF',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <Download size={14} /> Export Audit CSV
          </button>

          <button
            onClick={fetchData}
            disabled={loading}
            style={{
              background: '#FFFFFF',
              border: '1px solid #CBD5E1',
              borderRadius: '8px',
              padding: '8px 14px',
              fontSize: '13px',
              fontWeight: '700',
              color: '#0F172A',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <RefreshCw size={14} className={loading ? 'spin' : ''} /> Refresh
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
        <div style={{ background: '#FFFFFF', padding: '20px', borderRadius: '12px', border: '1px solid #E2E8F0', boxShadow: '0 1px 4px rgba(0,0,0,0.02)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: '#64748B', fontSize: '12px', fontWeight: '700' }}>
            <span>Gross Merchandise Volume (GMV)</span>
            <DollarSign size={16} color="#0078D4" />
          </div>
          <div style={{ fontSize: '24px', fontWeight: '900', color: '#0F172A', marginTop: '8px' }}>
            ${(summary?.financial_summary?.gross_merchandise_volume_usd ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </div>
          <div style={{ fontSize: '11px', color: '#16A34A', marginTop: '4px', fontWeight: '700' }}>
            ↑ 100% Live DB Transactions
          </div>
        </div>

        <div style={{ background: '#FFFFFF', padding: '20px', borderRadius: '12px', border: '1px solid #E2E8F0', boxShadow: '0 1px 4px rgba(0,0,0,0.02)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: '#64748B', fontSize: '12px', fontWeight: '700' }}>
            <span>Clearinghouse Net Revenue (10%)</span>
            <TrendingUp size={16} color="#16A34A" />
          </div>
          <div style={{ fontSize: '24px', fontWeight: '900', color: '#16A34A', marginTop: '8px' }}>
            ${(summary?.financial_summary?.clearinghouse_net_revenue_usd ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </div>
          <div style={{ fontSize: '11px', color: '#64748B', marginTop: '4px' }}>
            Retained Clearinghouse Fee
          </div>
        </div>

        <div style={{ background: '#FFFFFF', padding: '20px', borderRadius: '12px', border: '1px solid #E2E8F0', boxShadow: '0 1px 4px rgba(0,0,0,0.02)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: '#64748B', fontSize: '12px', fontWeight: '700' }}>
            <span>Affiliate Payouts (80%)</span>
            <ShieldCheck size={16} color="#CA8A04" />
          </div>
          <div style={{ fontSize: '24px', fontWeight: '900', color: '#0F172A', marginTop: '8px' }}>
            ${(summary?.financial_summary?.affiliate_servicing_payouts_usd ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </div>
          <div style={{ fontSize: '11px', color: '#64748B', marginTop: '4px' }}>
            Stripe Connect Disbursed
          </div>
        </div>

        <div style={{ background: '#FFFFFF', padding: '20px', borderRadius: '12px', border: '1px solid #E2E8F0', boxShadow: '0 1px 4px rgba(0,0,0,0.02)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: '#64748B', fontSize: '12px', fontWeight: '700' }}>
            <span>Dispatch SLA & Quality Score</span>
            <CheckCircle2 size={16} color="#0078D4" />
          </div>
          <div style={{ fontSize: '24px', fontWeight: '900', color: '#0078D4', marginTop: '8px' }}>
            {summary?.ride_volume_summary ? `${summary.ride_volume_summary.on_time_dispatch_sla_pct}%` : '—'}
          </div>
          <div style={{ fontSize: '11px', color: '#64748B', marginTop: '4px' }}>
            Avg Rating: {summary?.network_capacity ? `${summary.network_capacity.average_network_rating}★` : '—'}
          </div>
        </div>
      </div>

      {/* Sub Tabs */}
      <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid #E2E8F0', paddingBottom: '8px' }}>
        <button
          onClick={() => setActiveSubTab('analytics')}
          style={{
            padding: '8px 16px',
            borderRadius: '8px',
            fontSize: '13px',
            fontWeight: '700',
            border: 'none',
            cursor: 'pointer',
            background: activeSubTab === 'analytics' ? '#0078D4' : 'transparent',
            color: activeSubTab === 'analytics' ? '#FFFFFF' : '#64748B'
          }}
        >
          Performance Analytics
        </button>

        <button
          onClick={() => setActiveSubTab('escrow')}
          style={{
            padding: '8px 16px',
            borderRadius: '8px',
            fontSize: '13px',
            fontWeight: '700',
            border: 'none',
            cursor: 'pointer',
            background: activeSubTab === 'escrow' ? '#0078D4' : 'transparent',
            color: activeSubTab === 'escrow' ? '#FFFFFF' : '#64748B'
          }}
        >
          80/10/10 Escrow Settlement Ledger ({ledger.length})
        </button>

        <button
          onClick={() => setActiveSubTab('corporate')}
          style={{
            padding: '8px 16px',
            borderRadius: '8px',
            fontSize: '13px',
            fontWeight: '700',
            border: 'none',
            cursor: 'pointer',
            background: activeSubTab === 'corporate' ? '#0078D4' : 'transparent',
            color: activeSubTab === 'corporate' ? '#FFFFFF' : '#64748B'
          }}
        >
          Corporate Net-30 Master Accounts ({corporateAccounts.length})
        </button>
      </div>

      {/* Tab 1: Analytics Breakdown */}
      {activeSubTab === 'analytics' && summary && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
          <div style={{ background: '#FFFFFF', padding: '24px', borderRadius: '12px', border: '1px solid #E2E8F0' }}>
            <h3 style={{ fontSize: '16px', fontWeight: '800', color: '#0F172A', margin: '0 0 16px 0' }}>
              Ride Volume by Status
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px', background: '#F8FAFC', borderRadius: '8px' }}>
                <span style={{ fontSize: '13px', color: '#475569' }}>Total Rides Created</span>
                <strong style={{ color: '#0F172A' }}>{summary.ride_volume_summary.total_rides_created}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px', background: '#F8FAFC', borderRadius: '8px' }}>
                <span style={{ fontSize: '13px', color: '#16A34A' }}>Confirmed & In Progress</span>
                <strong style={{ color: '#16A34A' }}>{summary.ride_volume_summary.confirmed_rides + summary.ride_volume_summary.in_progress_rides}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px', background: '#F8FAFC', borderRadius: '8px' }}>
                <span style={{ fontSize: '13px', color: '#0078D4' }}>Completed & Settled</span>
                <strong style={{ color: '#0078D4' }}>{summary.ride_volume_summary.completed_rides}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px', background: '#F8FAFC', borderRadius: '8px' }}>
                <span style={{ fontSize: '13px', color: '#DC2626' }}>Cancelled & Refunded</span>
                <strong style={{ color: '#DC2626' }}>{summary.ride_volume_summary.cancelled_rides}</strong>
              </div>
            </div>
          </div>

          <div style={{ background: '#FFFFFF', padding: '24px', borderRadius: '12px', border: '1px solid #E2E8F0' }}>
            <h3 style={{ fontSize: '16px', fontWeight: '800', color: '#0F172A', margin: '0 0 16px 0' }}>
              Top Performing Carrier Clusters
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {summary.top_carrier_volume.map((c, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px', background: '#F8FAFC', borderRadius: '8px' }}>
                  <span style={{ fontSize: '13px', color: '#0F172A', fontWeight: '700' }}>{c.carrier}</span>
                  <strong style={{ color: '#16A34A' }}>${c.volume_usd.toFixed(2)}</strong>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Escrow Ledger */}
      {activeSubTab === 'escrow' && (
        <div style={{ background: '#FFFFFF', borderRadius: '12px', border: '1px solid #E2E8F0', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'left' }}>
            <thead>
              <tr style={{ background: '#F8FAFC', borderBottom: '1px solid #E2E8F0', color: '#475569', fontWeight: '700' }}>
                <th style={{ padding: '14px 16px' }}>Settlement ID</th>
                <th style={{ padding: '14px 16px' }}>Booking Ref</th>
                <th style={{ padding: '14px 16px' }}>Total Fare</th>
                <th style={{ padding: '14px 16px' }}>80% Carrier</th>
                <th style={{ padding: '14px 16px' }}>10% Booker</th>
                <th style={{ padding: '14px 16px' }}>10% Hub</th>
                <th style={{ padding: '14px 16px' }}>Status</th>
                <th style={{ padding: '14px 16px' }}>Clearinghouse Actions</th>
              </tr>
            </thead>
            <tbody>
              {ledger.map(s => (
                <tr key={s.settlement_id} style={{ borderBottom: '1px solid #F1F5F9' }}>
                  <td style={{ padding: '14px 16px', fontFamily: 'monospace', fontWeight: '700' }}>{s.settlement_id}</td>
                  <td style={{ padding: '14px 16px', fontWeight: '800', color: '#0078D4' }}>{s.booking_id}</td>
                  <td style={{ padding: '14px 16px', fontWeight: '800' }}>${s.total_fare_usd.toFixed(2)}</td>
                  <td style={{ padding: '14px 16px', color: '#16A34A', fontWeight: '700' }}>${s.servicing_payout_usd.toFixed(2)}</td>
                  <td style={{ padding: '14px 16px', color: '#64748B' }}>${s.originating_commission_usd.toFixed(2)}</td>
                  <td style={{ padding: '14px 16px', color: '#0078D4', fontWeight: '700' }}>${s.platform_clearing_fee_usd.toFixed(2)}</td>
                  <td style={{ padding: '14px 16px' }}>
                    <span style={{
                      fontSize: '11px',
                      fontWeight: '800',
                      padding: '3px 8px',
                      borderRadius: '999px',
                      background: s.status === 'RELEASED_TO_AFFILIATE' || s.status === 'TRANSFERS_EXECUTED' ? '#DCFCE7' : s.status === 'REFUNDED_TO_CUSTOMER' || s.status === 'DISPUTE_LOCKED' ? '#FEE2E2' : '#FEF9C3',
                      color: s.status === 'RELEASED_TO_AFFILIATE' || s.status === 'TRANSFERS_EXECUTED' ? '#15803D' : s.status === 'REFUNDED_TO_CUSTOMER' || s.status === 'DISPUTE_LOCKED' ? '#B91C1C' : '#854D0E'
                    }}>
                      {s.status}
                    </span>
                  </td>
                  <td style={{ padding: '14px 16px', display: 'flex', gap: '6px' }}>
                    {s.status !== 'RELEASED_TO_AFFILIATE' && s.status !== 'TRANSFERS_EXECUTED' && s.status !== 'REFUNDED_TO_CUSTOMER' ? (
                      <>
                        <button
                          onClick={async () => {
                            try {
                              const res = await fetch('/api/v1/global-hub/settlements/release-payout', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ booking_id: s.booking_id, servicing_stripe_account: 'acct_conn_clearing' })
                              });
                              if (res.ok) fetchData();
                            } catch (e) {
                              console.error('Release failed', e);
                            }
                          }}
                          style={{ background: '#16A34A', color: '#FFF', border: 'none', borderRadius: '4px', padding: '4px 8px', fontSize: '11px', fontWeight: '700', cursor: 'pointer' }}
                        >
                          Release 80%
                        </button>
                        <button
                          onClick={async () => {
                            try {
                              const res = await fetch(`/api/v1/global-hub/settlements/${s.settlement_id}/dispute-hold`, { method: 'POST' });
                              if (res.ok) fetchData();
                            } catch (e) {
                              console.error('Dispute hold failed', e);
                            }
                          }}
                          style={{ background: '#DC2626', color: '#FFF', border: 'none', borderRadius: '4px', padding: '4px 8px', fontSize: '11px', fontWeight: '700', cursor: 'pointer' }}
                        >
                          Dispute
                        </button>
                        <button
                          onClick={async () => {
                            try {
                              const res = await fetch(`/api/v1/global-hub/settlements/${s.settlement_id}/refund`, { method: 'POST' });
                              if (res.ok) fetchData();
                            } catch (e) {
                              console.error('Refund failed', e);
                            }
                          }}
                          style={{ background: '#64748B', color: '#FFF', border: 'none', borderRadius: '4px', padding: '4px 8px', fontSize: '11px', fontWeight: '700', cursor: 'pointer' }}
                        >
                          Refund
                        </button>
                      </>
                    ) : (
                      <span style={{ fontSize: '11px', color: '#64748B', fontFamily: 'monospace' }}>
                        {s.stripe_transfer_servicing_id || 'Settled'}
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Tab 3: Corporate Accounts */}
      {activeSubTab === 'corporate' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '16px' }}>
          {corporateAccounts.map(c => (
            <div
              key={c.corporate_id}
              style={{
                background: '#FFFFFF',
                borderRadius: '12px',
                border: '1px solid #E2E8F0',
                padding: '20px',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
                boxShadow: '0 1px 4px rgba(0,0,0,0.02)'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div style={{ fontSize: '16px', fontWeight: '800', color: '#0F172A' }}>{c.company_name}</div>
                  <div style={{ fontSize: '12px', color: '#64748B' }}>ID: <code>{c.corporate_id}</code></div>
                </div>
                <span style={{
                  fontSize: '11px',
                  fontWeight: '800',
                  padding: '2px 8px',
                  borderRadius: '999px',
                  background: c.status === 'ACTIVE' ? '#DCFCE7' : '#FEE2E2',
                  color: c.status === 'ACTIVE' ? '#15803D' : '#B91C1C'
                }}>
                  {c.status}
                </span>
              </div>

              <div style={{ background: '#F8FAFC', padding: '12px', borderRadius: '8px', fontSize: '12px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#64748B' }}>Credit Limit:</span>
                  <strong>${(c.credit_limit_usd ?? 0).toLocaleString()} {c.currency || 'USD'}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#64748B' }}>Outstanding Balance:</span>
                  <strong style={{ color: '#DC2626' }}>${(c.outstanding_balance_usd ?? 0).toLocaleString()} {c.currency || 'USD'}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#64748B' }}>Payment Terms:</span>
                  <strong>{c.payment_terms}</strong>
                </div>
              </div>

              <a
                href={`/api/v1/global-hub/corporate/${c.corporate_id}/statement`}
                target="_blank"
                rel="noreferrer"
                style={{
                  background: '#F1F5F9',
                  border: '1px solid #CBD5E1',
                  borderRadius: '8px',
                  padding: '8px',
                  fontSize: '12px',
                  fontWeight: '700',
                  color: '#0F172A',
                  textAlign: 'center',
                  textDecoration: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  marginTop: 'auto'
                }}
              >
                <FileText size={13} /> View Consolidated Statement
              </a>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
