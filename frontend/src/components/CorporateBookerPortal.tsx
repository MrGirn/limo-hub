import React, { useState, useEffect } from 'react';
import { 
  Building2, Briefcase, CreditCard, DollarSign, Download, CheckCircle2, 
  AlertTriangle, Plus, ShieldCheck, ChevronRight, FileText, Globe, ArrowRight,
  Sparkles, Clock, UserCheck, AlertCircle
} from 'lucide-react';
import { AddressAutocompleteInput } from './AddressAutocompleteInput';
import { getAuthHeaders, extractErrorMessage } from '../api';

interface CostCenter {
  id: string;
  code: string;
  name: string;
  monthly_budget: number;
  current_month_spend: number;
  currency: string;
  is_active: boolean;
}

interface TravelPolicy {
  max_vehicle_class: string;
  max_spend_per_trip: number;
  auto_approve_threshold: number;
  require_flight_number_for_airports: boolean;
  allow_multi_leg_international: boolean;
}

interface CorporateAccount {
  id: string;
  name: string;
  company_tax_id: string;
  billing_email: string;
  default_currency: string;
  monthly_credit_limit: number;
  current_balance: number;
  cost_centers: CostCenter[];
  travel_policy: TravelPolicy;
  is_active: boolean;
}

interface InvoiceLineItem {
  id: string;
  booking_id: string;
  trip_date: string;
  passenger_name: string;
  cost_center_code: string;
  route_summary: string;
  net_amount: number;
  tax_amount: number;
  total_amount: number;
  currency: string;
}

interface CorporateInvoice {
  id: string;
  account_id: string;
  account_name: string;
  billing_month: string;
  total_net: number;
  total_tax: number;
  total_gross: number;
  currency: string;
  status: string;
  due_date: string;
  line_items: InvoiceLineItem[];
}

export const CorporateBookerPortal: React.FC = () => {
  const [accounts, setAccounts] = useState<CorporateAccount[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState<string>('corp-gs-global');
  const [selectedAccount, setSelectedAccount] = useState<CorporateAccount | null>(null);
  const [invoices, setInvoices] = useState<CorporateInvoice[]>([]);
  const [currency, setCurrency] = useState<string>('USD');
  const [loading, setLoading] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Dynamic initial pickup date (Tomorrow at 09:00 local time)
  const getInitialPickupDate = () => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    d.setHours(9, 0, 0, 0);
    return d.toISOString().slice(0, 16);
  };

  // Booking Form State
  const [passengerName, setPassengerName] = useState<string>('Victoria Sterling (CFO)');
  const [passengerEmail, setPassengerEmail] = useState<string>('victoria.sterling@gs.com');
  const [passengerPhone, setPassengerPhone] = useState<string>('+1 917 555 0188');
  const [selectedCostCenter, setSelectedCostCenter] = useState<string>('EXEC-100');
  const [vehicleClass, setVehicleClass] = useState<string>('FIRST_CLASS');
  const [pickupAddress, setPickupAddress] = useState<string>('200 West St, New York, NY 10282 (Goldman Sachs HQ)');
  const [dropoffAddress, setDropoffAddress] = useState<string>('John F. Kennedy International Airport (JFK), Terminal 4 VIP');
  const [flightNumber, setFlightNumber] = useState<string>('BA 178');
  const [pickupDate, setPickupDate] = useState<string>(getInitialPickupDate());
  
  // Quote & Policy Check State
  const [calculating, setCalculating] = useState<boolean>(false);
  const [quoteResult, setQuoteResult] = useState<any>(null);
  const [policyEval, setPolicyEval] = useState<any>(null);
  const [bookingSuccess, setBookingSuccess] = useState<any>(null);
  const [showAddCostCenterModal, setShowAddCostCenterModal] = useState<boolean>(false);
  const [newCcCode, setNewCcCode] = useState<string>('');
  const [newCcName, setNewCcName] = useState<string>('');
  const [newCcBudget, setNewCcBudget] = useState<string>('20000');

  useEffect(() => {
    fetchAccounts();
  }, []);

  useEffect(() => {
    if (selectedAccountId) {
      fetchAccountDetails(selectedAccountId);
      fetchInvoices(selectedAccountId);
    }
  }, [selectedAccountId]);

  const fetchAccounts = async () => {
    try {
      const res = await fetch('/api/v1/corporate/accounts', {
        headers: getAuthHeaders()
      });
      if (res.ok) {
        const data = await res.json();
        setAccounts(data);
        if (data.length > 0 && !selectedAccountId) {
          setSelectedAccountId(data[0].id);
        }
      }
    } catch (err) {
      console.error('Error fetching corporate accounts:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchAccountDetails = async (accId: string) => {
    try {
      const res = await fetch(`/api/v1/corporate/accounts/${accId}`, {
        headers: getAuthHeaders()
      });
      if (res.ok) {
        const data = await res.json();
        setSelectedAccount(data);
        if (data.cost_centers && data.cost_centers.length > 0) {
          setSelectedCostCenter(data.cost_centers[0].code);
        }
      }
    } catch (err) {
      console.error('Error fetching account details:', err);
    }
  };

  const fetchInvoices = async (accId: string) => {
    try {
      const res = await fetch(`/api/v1/corporate/invoices/${accId}`, {
        headers: getAuthHeaders()
      });
      if (res.ok) {
        const data = await res.json();
        setInvoices(data);
      }
    } catch (err) {
      console.error('Error fetching invoices:', err);
    }
  };

  const handleCalculateCorporateQuote = async () => {
    setCalculating(true);
    setBookingSuccess(null);
    setErrorMessage(null);
    try {
      // 1. Fetch Quote with Multi-Currency
      const quoteRes = await fetch('/api/v1/quotes', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          tenant_id: 'tenant-us-east',
          vendor_id: 'vendor-ny-executive',
          service_type: flightNumber ? 'AIRPORT_TRANSFER' : 'POINT_TO_POINT',
          vehicle_class: vehicleClass,
          pickup_address: pickupAddress,
          dropoff_address: dropoffAddress,
          flight_number: flightNumber,
          currency: currency
        })
      });

      if (!quoteRes.ok) {
        const errJson = await quoteRes.json().catch(() => ({}));
        throw new Error(extractErrorMessage(errJson, 'Quote calculation failed'));
      }
      const quote = await quoteRes.json();
      setQuoteResult(quote);

      // 2. Validate Travel Policy
      const policyRes = await fetch('/api/v1/corporate/validate-policy', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          account_id: selectedAccountId,
          cost_center_code: selectedCostCenter,
          vehicle_class: vehicleClass,
          total_amount: quote.final_payable_amount,
          currency: currency,
          has_flight_number: Boolean(flightNumber)
        })
      });

      if (policyRes.ok) {
        const policyData = await policyRes.json();
        setPolicyEval(policyData);
      }
    } catch (err: any) {
      console.error('Error calculating quote/policy:', err);
      setErrorMessage(extractErrorMessage(err, 'Policy validation or quote calculation failed.'));
    } finally {
      setCalculating(false);
    }
  };

  const handleConfirmCorporateBooking = async () => {
    if (!quoteResult) return;
    setCalculating(true);
    setErrorMessage(null);
    try {
      const res = await fetch('/api/v1/corporate/bookings', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          account_id: selectedAccountId,
          cost_center_code: selectedCostCenter,
          quote_id: quoteResult.id,
          pickup_time_utc: new Date(pickupDate).toISOString(),
          party: {
            booker_name: 'Corporate Travel Desk',
            booker_email: 'travel-desk@corporate.com',
            booker_phone: '+1 800 555 0199',
            passenger_name: passengerName,
            passenger_email: passengerEmail,
            passenger_phone: passengerPhone,
            passenger_count: 1,
            luggage_count: 2
          }
        })
      });

      if (res.ok) {
        const booking = await res.json();
        setBookingSuccess(booking);
        setQuoteResult(null);
        setPolicyEval(null);
        fetchAccountDetails(selectedAccountId);
        fetchInvoices(selectedAccountId);
      } else {
        const err = await res.json().catch(() => ({}));
        setErrorMessage(`Booking rejected: ${extractErrorMessage(err, 'Policy violation or credit limit exceeded.')}`);
      }
    } catch (err: any) {
      console.error('Error confirming corporate booking:', err);
      setErrorMessage(extractErrorMessage(err, 'Could not complete corporate booking reservation.'));
    } finally {
      setCalculating(false);
    }
  };

  const handleAddCostCenter = async () => {
    if (!newCcCode || !newCcName) return;
    try {
      const res = await fetch(`/api/v1/corporate/accounts/${selectedAccountId}/cost-centers`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          code: newCcCode,
          name: newCcName,
          monthly_budget: parseFloat(newCcBudget) || 20000,
          currency: currency
        })
      });
      if (res.ok) {
        setShowAddCostCenterModal(false);
        setNewCcCode('');
        setNewCcName('');
        fetchAccountDetails(selectedAccountId);
      }
    } catch (err: any) {
      console.error('Error adding cost center:', err);
      setErrorMessage(extractErrorMessage(err, 'Could not create departmental cost center.'));
    }
  };

  const handleDownloadCSV = async (invoiceId: string) => {
    try {
      const res = await fetch(`/api/v1/corporate/invoices/${invoiceId}/csv`, {
        headers: getAuthHeaders()
      });
      if (res.ok) {
        const data = await res.json();
        const blob = new Blob([data.csv_content], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `${invoiceId}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
    } catch (err: any) {
      console.error('Error downloading invoice CSV:', err);
      setErrorMessage(extractErrorMessage(err, 'Failed to download ERP invoice statement.'));
    }
  };

  if (loading) {
    return (
      <div style={{ padding: '40px', textAlign: 'center', color: '#64748B' }}>
        <Clock className="animate-spin" style={{ margin: '0 auto 12px' }} size={32} />
        <p>Loading Corporate Accounts and Ledger...</p>
      </div>
    );
  }

  const creditLimit = selectedAccount?.monthly_credit_limit || 50000;
  const currentBalance = selectedAccount?.current_balance || 0;
  const availableCredit = Math.max(0, creditLimit - currentBalance);
  const creditUsagePct = Math.min(100, Math.round((currentBalance / creditLimit) * 100));

  return (
    <div style={{ padding: '24px 32px', maxWidth: '1400px', margin: '0 auto' }}>
      {/* Top Header & Account Switcher */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Building2 size={26} color="#0284C7" />
            <h1 style={{ fontSize: '24px', fontWeight: '700', color: '#0F172A', margin: 0 }}>
              Executive Corporate Booker & Expense Hub
            </h1>
          </div>
          <p style={{ color: '#64748B', fontSize: '14px', marginTop: '4px' }}>
            Manage departmental travel budgets, enforce multi-tiered travel policies, and reconcile monthly consolidated ledgers.
          </p>
        </div>

        {/* Account Selector & Currency Switcher */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#F8FAFC', padding: '6px 12px', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
            <Globe size={16} color="#0284C7" />
            <span style={{ fontSize: '13px', fontWeight: '600', color: '#334155' }}>Currency:</span>
            <select
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
              style={{ padding: '4px 8px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '13px', fontWeight: '600', color: '#0F172A', background: '#FFFFFF' }}
            >
              <option value="USD">USD ($ - US Dollar)</option>
              <option value="EUR">EUR (€ - Eurozone)</option>
              <option value="GBP">GBP (£ - British Pound)</option>
              <option value="JPY">JPY (¥ - Japanese Yen)</option>
              <option value="AED">AED (د.إ - UAE Dirham)</option>
              <option value="CAD">CAD (C$ - Canadian Dollar)</option>
              <option value="CHF">CHF (CHF - Swiss Franc)</option>
            </select>
          </div>

          <select
            value={selectedAccountId}
            onChange={(e) => setSelectedAccountId(e.target.value)}
            style={{ padding: '8px 16px', borderRadius: '8px', border: '1px solid #0284C7', background: '#F0F9FF', color: '#0369A1', fontWeight: '700', fontSize: '14px' }}
          >
            {accounts.map(acc => (
              <option key={acc.id} value={acc.id}>{acc.name} ({acc.default_currency})</option>
            ))}
          </select>
        </div>
      </div>

      {/* KPI Overview Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '20px', marginBottom: '28px' }}>
        {/* Credit & Balance Meter */}
        <div style={{ background: '#FFFFFF', padding: '20px', borderRadius: '12px', border: '1px solid #E2E8F0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <span style={{ fontSize: '13px', fontWeight: '600', color: '#64748B' }}>Monthly Credit Line</span>
            <CreditCard size={18} color="#0284C7" />
          </div>
          <div style={{ fontSize: '24px', fontWeight: '800', color: '#0F172A' }}>
            ${currentBalance.toLocaleString()} / <span style={{ color: '#64748B', fontSize: '18px' }}>${creditLimit.toLocaleString()}</span>
          </div>
          <div style={{ marginTop: '12px', background: '#F1F5F9', borderRadius: '6px', height: '8px', overflow: 'hidden' }}>
            <div style={{ background: creditUsagePct > 80 ? '#EF4444' : '#0284C7', width: `${creditUsagePct}%`, height: '100%', borderRadius: '6px', transition: 'width 0.3s ease' }} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '6px', fontSize: '12px', color: '#64748B' }}>
            <span>{creditUsagePct}% Utilized</span>
            <span>${availableCredit.toLocaleString()} Available</span>
          </div>
        </div>

        {/* Cost Centers Count */}
        <div style={{ background: '#FFFFFF', padding: '20px', borderRadius: '12px', border: '1px solid #E2E8F0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <span style={{ fontSize: '13px', fontWeight: '600', color: '#64748B' }}>Active Cost Centers</span>
            <Briefcase size={18} color="#10B981" />
          </div>
          <div style={{ fontSize: '24px', fontWeight: '800', color: '#0F172A' }}>
            {selectedAccount?.cost_centers.length || 0} Departments
          </div>
          <p style={{ fontSize: '12px', color: '#10B981', marginTop: '6px', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <CheckCircle2 size={14} /> 100% Budget Active & Monitored
          </p>
        </div>

        {/* Policy Compliance */}
        <div style={{ background: '#FFFFFF', padding: '20px', borderRadius: '12px', border: '1px solid #E2E8F0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <span style={{ fontSize: '13px', fontWeight: '600', color: '#64748B' }}>Policy Compliance</span>
            <ShieldCheck size={18} color="#8B5CF6" />
          </div>
          <div style={{ fontSize: '24px', fontWeight: '800', color: '#0F172A' }}>
            Max {selectedAccount?.travel_policy.max_vehicle_class.replace('_', ' ')}
          </div>
          <p style={{ fontSize: '12px', color: '#64748B', marginTop: '6px' }}>
            Auto-approves trips under ${selectedAccount?.travel_policy.auto_approve_threshold} USD
          </p>
        </div>

        {/* Invoices Status */}
        <div style={{ background: '#FFFFFF', padding: '20px', borderRadius: '12px', border: '1px solid #E2E8F0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <span style={{ fontSize: '13px', fontWeight: '600', color: '#64748B' }}>Consolidated Invoices</span>
            <FileText size={18} color="#F59E0B" />
          </div>
          <div style={{ fontSize: '24px', fontWeight: '800', color: '#0F172A' }}>
            {invoices.length} Statements
          </div>
          <p style={{ fontSize: '12px', color: '#F59E0B', marginTop: '6px', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <Download size={14} /> 1-Click ERP CSV Exports Ready
          </p>
        </div>
      </div>

      {/* Main Grid: Booking Engine + Cost Centers / Invoices */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(340px, 1.2fr) minmax(320px, 1fr)', gap: '28px' }}>
        
        {/* Left Column: Corporate Booking Form */}
        <div style={{ background: '#FFFFFF', padding: '24px', borderRadius: '12px', border: '1px solid #E2E8F0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '18px', borderBottom: '1px solid #F1F5F9', paddingBottom: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Briefcase size={20} color="#0284C7" />
              <h2 style={{ fontSize: '18px', fontWeight: '700', color: '#0F172A', margin: 0 }}>Corporate Direct Booking</h2>
            </div>
            <span style={{ fontSize: '12px', background: '#F0F9FF', color: '#0369A1', padding: '4px 10px', borderRadius: '12px', fontWeight: '600' }}>
              Direct Bill to Monthly Statement
            </span>
          </div>

          {errorMessage && (
            <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', padding: '14px', borderRadius: '8px', marginBottom: '18px', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <AlertCircle size={18} color="#DC2626" />
              <span style={{ fontSize: '13px', color: '#991B1B', fontWeight: 600 }}>{errorMessage}</span>
            </div>
          )}

          {bookingSuccess && (
            <div style={{ background: '#F0FDF4', border: '1px solid #BBF7D0', padding: '16px', borderRadius: '8px', marginBottom: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#166534', fontWeight: '700', fontSize: '15px' }}>
                <CheckCircle2 size={20} />
                <span>Booking Confirmed & Billed to {bookingSuccess.corporate_account_id}!</span>
              </div>
              <p style={{ fontSize: '13px', color: '#15803D', marginTop: '6px' }}>
                Booking Reference: <strong>{bookingSuccess.id}</strong> · Cost Center: <strong>{bookingSuccess.cost_center_code}</strong> · Total: <strong>{bookingSuccess.total_amount} {bookingSuccess.currency}</strong>
              </p>
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#475569', marginBottom: '6px' }}>Passenger Name</label>
              <input
                type="text"
                value={passengerName}
                onChange={(e) => setPassengerName(e.target.value)}
                style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '14px' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#475569', marginBottom: '6px' }}>Cost Center Allocation</label>
              <select
                value={selectedCostCenter}
                onChange={(e) => setSelectedCostCenter(e.target.value)}
                style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '14px', background: '#FFFFFF', fontWeight: '600' }}
              >
                {selectedAccount?.cost_centers.map(cc => (
                  <option key={cc.id} value={cc.code}>
                    {cc.code} — {cc.name} (${cc.monthly_budget - cc.current_month_spend} avail)
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#475569', marginBottom: '6px' }}>Passenger Email</label>
              <input
                type="email"
                value={passengerEmail}
                onChange={(e) => setPassengerEmail(e.target.value)}
                style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '14px' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#475569', marginBottom: '6px' }}>Passenger Mobile Phone</label>
              <input
                type="tel"
                value={passengerPhone}
                onChange={(e) => setPassengerPhone(e.target.value)}
                style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '14px' }}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#475569', marginBottom: '6px' }}>Vehicle Class</label>
              <select
                value={vehicleClass}
                onChange={(e) => setVehicleClass(e.target.value)}
                style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '14px', background: '#FFFFFF' }}
              >
                <option value="FIRST_CLASS">First Class (Mercedes S 580, BMW 760i)</option>
                <option value="LUXURY_SUV">Luxury SUV (Cadillac Escalade ESV)</option>
                <option value="ELECTRIC_VIP">Electric VIP (Lucid Air, Tesla Plaid)</option>
                <option value="BUSINESS_SEDAN">Business Sedan (Mercedes E-Class)</option>
                <option value="BUSINESS_VAN">Executive Van VIP (Sprinter 3500)</option>
                <option value="ULTRA_LUXURY">Ultra Luxury (Rolls-Royce Ghost)</option>
              </select>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#475569', marginBottom: '6px' }}>Pickup Date & Time</label>
              <input
                type="datetime-local"
                value={pickupDate}
                onChange={(e) => setPickupDate(e.target.value)}
                style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '14px' }}
              />
            </div>
          </div>

          {/* Pickup & Dropoff Global Autocomplete */}
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#475569', marginBottom: '6px' }}>Pickup Address (Global)</label>
            <AddressAutocompleteInput
              value={pickupAddress}
              onChange={setPickupAddress}
              placeholder="e.g. 200 West St, NYC or London Heathrow Airport"
            />
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#475569', marginBottom: '6px' }}>Destination Address</label>
            <AddressAutocompleteInput
              value={dropoffAddress}
              onChange={setDropoffAddress}
              placeholder="e.g. JFK Airport Terminal 4 or The Savoy London"
            />
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#475569', marginBottom: '6px' }}>Flight / Train Number (For Live Radar Staging)</label>
            <input
              type="text"
              value={flightNumber}
              onChange={(e) => setFlightNumber(e.target.value)}
              placeholder="e.g. BA 178, DL 492, Acela 2150"
              style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '14px' }}
            />
          </div>

          {/* Quote & Policy Check Trigger */}
          <button
            onClick={handleCalculateCorporateQuote}
            disabled={calculating}
            style={{ width: '100%', background: '#0284C7', color: '#FFFFFF', padding: '12px', borderRadius: '8px', fontWeight: '700', fontSize: '15px', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
          >
            {calculating ? <Clock className="animate-spin" size={18} /> : <Sparkles size={18} />}
            Evaluate Corporate Policy & Generate Quote ({currency})
          </button>

          {/* Quote & Policy Breakdown Card */}
          {quoteResult && (
            <div style={{ marginTop: '24px', padding: '18px', background: '#F8FAFC', borderRadius: '10px', border: '1px solid #E2E8F0' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <span style={{ fontSize: '14px', fontWeight: '700', color: '#0F172A' }}>Executive Quote Summary</span>
                <span style={{ fontSize: '20px', fontWeight: '800', color: '#0284C7' }}>
                  {quoteResult.final_payable_amount} {quoteResult.currency}
                </span>
              </div>

              {/* Policy Evaluation Badge */}
              {policyEval && (
                <div style={{
                  padding: '10px 14px',
                  borderRadius: '8px',
                  marginBottom: '14px',
                  background: policyEval.is_compliant ? '#F0FDF4' : (policyEval.status === 'REQUIRES_MANAGER_OVERRIDE' ? '#FFFBEB' : '#FEF2F2'),
                  border: `1px solid ${policyEval.is_compliant ? '#86EFAC' : (policyEval.status === 'REQUIRES_MANAGER_OVERRIDE' ? '#FDE68A' : '#FECACA')}`
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: '700', fontSize: '13px', color: policyEval.is_compliant ? '#166534' : (policyEval.status === 'REQUIRES_MANAGER_OVERRIDE' ? '#B45309' : '#991B1B') }}>
                    {policyEval.is_compliant ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />}
                    <span>Status: {policyEval.status.replace(/_/g, ' ')}</span>
                  </div>
                  {policyEval.reasons && policyEval.reasons.length > 0 && (
                    <ul style={{ margin: '6px 0 0', paddingLeft: '20px', fontSize: '12px', color: '#334155' }}>
                      {policyEval.reasons.map((r: string, idx: number) => <li key={idx}>{r}</li>)}
                    </ul>
                  )}
                </div>
              )}

              {/* Itemized Line Items */}
              <div style={{ fontSize: '12px', color: '#64748B', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {quoteResult.line_items.map((li: any, idx: number) => (
                  <div key={idx} style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>{li.description}</span>
                    <span style={{ fontWeight: '600', color: '#0F172A' }}>{li.total_gross} {quoteResult.currency}</span>
                  </div>
                ))}
                <div style={{ borderTop: '1px dashed #CBD5E1', paddingTop: '6px', marginTop: '4px', display: 'flex', justifyContent: 'space-between', fontWeight: '700', color: '#0F172A' }}>
                  <span>Tax Jurisdiction / FX Snapshot:</span>
                  <span>{quoteResult.tax_jurisdiction} ({quoteResult.fx_snapshot?.rate || 1.0})</span>
                </div>
              </div>

              {/* Confirm Booking Button */}
              <button
                onClick={handleConfirmCorporateBooking}
                disabled={calculating || (policyEval && policyEval.status === 'POLICY_VIOLATION')}
                style={{
                  width: '100%',
                  marginTop: '16px',
                  background: (policyEval && policyEval.status === 'POLICY_VIOLATION') ? '#94A3B8' : '#10B981',
                  color: '#FFFFFF',
                  padding: '12px',
                  borderRadius: '8px',
                  fontWeight: '700',
                  fontSize: '15px',
                  border: 'none',
                  cursor: (policyEval && policyEval.status === 'POLICY_VIOLATION') ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px'
                }}
              >
                <CheckCircle2 size={18} />
                Confirm Corporate Booking & Direct-Bill
              </button>
            </div>
          )}
        </div>

        {/* Right Column: Cost Centers & Invoices */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
          
          {/* Department Cost Centers */}
          <div style={{ background: '#FFFFFF', padding: '24px', borderRadius: '12px', border: '1px solid #E2E8F0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Briefcase size={20} color="#10B981" />
                <h3 style={{ fontSize: '17px', fontWeight: '700', color: '#0F172A', margin: 0 }}>Department Cost Centers</h3>
              </div>
              <button
                onClick={() => setShowAddCostCenterModal(!showAddCostCenterModal)}
                style={{ background: '#F1F5F9', border: '1px solid #CBD5E1', padding: '6px 12px', borderRadius: '6px', fontSize: '12px', fontWeight: '700', color: '#334155', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
              >
                <Plus size={14} /> Add Cost Center
              </button>
            </div>

            {showAddCostCenterModal && (
              <div style={{ background: '#F8FAFC', padding: '14px', borderRadius: '8px', border: '1px solid #CBD5E1', marginBottom: '16px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr 1fr', gap: '8px', marginBottom: '10px' }}>
                  <input
                    placeholder="Code (e.g. M&A-01)"
                    value={newCcCode}
                    onChange={(e) => setNewCcCode(e.target.value)}
                    style={{ padding: '6px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '12px' }}
                  />
                  <input
                    placeholder="Department Name"
                    value={newCcName}
                    onChange={(e) => setNewCcName(e.target.value)}
                    style={{ padding: '6px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '12px' }}
                  />
                  <input
                    placeholder="Budget ($)"
                    value={newCcBudget}
                    onChange={(e) => setNewCcBudget(e.target.value)}
                    style={{ padding: '6px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '12px' }}
                  />
                </div>
                <button
                  onClick={handleAddCostCenter}
                  style={{ background: '#10B981', color: '#FFFFFF', padding: '6px 12px', borderRadius: '6px', fontSize: '12px', fontWeight: '700', border: 'none', cursor: 'pointer' }}
                >
                  Save Cost Center
                </button>
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {selectedAccount?.cost_centers.map(cc => {
                const pct = Math.min(100, Math.round((cc.current_month_spend / cc.monthly_budget) * 100));
                return (
                  <div key={cc.id} style={{ padding: '12px', borderRadius: '8px', border: '1px solid #F1F5F9', background: '#F8FAFC' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontWeight: '700', fontSize: '14px', color: '#0F172A' }}>
                        {cc.code} · <span style={{ color: '#64748B', fontWeight: '500' }}>{cc.name}</span>
                      </span>
                      <span style={{ fontWeight: '700', fontSize: '13px', color: pct > 85 ? '#EF4444' : '#0F172A' }}>
                        ${cc.current_month_spend.toLocaleString()} / ${cc.monthly_budget.toLocaleString()}
                      </span>
                    </div>
                    <div style={{ marginTop: '8px', background: '#E2E8F0', borderRadius: '4px', height: '6px', overflow: 'hidden' }}>
                      <div style={{ background: pct > 85 ? '#EF4444' : '#10B981', width: `${pct}%`, height: '100%' }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Consolidated Invoices & CSV Export */}
          <div style={{ background: '#FFFFFF', padding: '24px', borderRadius: '12px', border: '1px solid #E2E8F0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
              <FileText size={20} color="#F59E0B" />
              <h3 style={{ fontSize: '17px', fontWeight: '700', color: '#0F172A', margin: 0 }}>Consolidated Monthly Invoices</h3>
            </div>

            {invoices.length === 0 ? (
              <p style={{ fontSize: '13px', color: '#64748B' }}>No invoices generated yet for this billing cycle.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {invoices.map(inv => (
                  <div key={inv.id} style={{ padding: '14px', borderRadius: '8px', border: '1px solid #E2E8F0', background: '#FFFFFF', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ fontWeight: '700', fontSize: '14px', color: '#0F172A' }}>
                        {inv.billing_month} Statement · <span style={{ color: '#0284C7' }}>{inv.id}</span>
                      </div>
                      <div style={{ fontSize: '12px', color: '#64748B', marginTop: '2px' }}>
                        {inv.line_items.length} Trips · Net: ${inv.total_net.toLocaleString()} · Tax: ${inv.total_tax.toLocaleString()} · Total: <strong style={{ color: '#0F172A' }}>${inv.total_gross.toLocaleString()} {inv.currency}</strong>
                      </div>
                    </div>
                    <button
                      onClick={() => handleDownloadCSV(inv.id)}
                      style={{ background: '#FEF3C7', color: '#B45309', border: '1px solid #FDE68A', padding: '8px 14px', borderRadius: '6px', fontSize: '12px', fontWeight: '700', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
                    >
                      <Download size={14} /> Export CSV
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
};
