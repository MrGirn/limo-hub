import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, CheckCircle2, Clock, Car, User, Phone, MapPin, 
  DollarSign, ArrowRight, Building2, Sparkles, AlertCircle, FileText, ChevronRight
} from 'lucide-react';
import { fetchRfpDetailsByToken, submitVendorQuoteApi } from '../api';

interface PublicVendorQuotePortalProps {
  token?: string;
  onBackToMain?: () => void;
}

export const PublicVendorQuotePortal: React.FC<PublicVendorQuotePortalProps> = ({ 
  token = '', 
  onBackToMain 
}) => {
  const [rfp, setRfp] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Form State
  const [quotePayout, setQuotePayout] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [dispatcherName, setDispatcherName] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [vehicleModel, setVehicleModel] = useState('');
  const [acceptTerms, setAcceptTerms] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submittedResult, setSubmittedResult] = useState<any | null>(null);

  useEffect(() => {
    if (!token) {
      setError('No RFP quote token provided in the URL or request parameters.');
      setLoading(false);
      return;
    }
    const loadRfp = async () => {
      setLoading(true);
      try {
        const data = await fetchRfpDetailsByToken(token);
        setRfp(data);
        setCompanyName(data.target_vendor_name || '');
        setContactPhone(data.target_vendor_phone || '');
        if (data.suggested_benchmark_payout_usd) {
          setQuotePayout(String(data.suggested_benchmark_payout_usd));
        }
      } catch (err: any) {
        setError(err.message || 'Failed to load RFP trip details');
      } finally {
        setLoading(false);
      }
    };
    loadRfp();
  }, [token]);

  const handleSubmitQuote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quotePayout || !contactPhone) return;
    setSubmitting(true);
    try {
      const res = await submitVendorQuoteApi({
        quote_token: token,
        quoted_payout_usd: parseFloat(quotePayout),
        vendor_company_name: companyName,
        dispatcher_or_driver_name: dispatcherName || 'Lead Chauffeur',
        contact_phone: contactPhone,
        vehicle_model: vehicleModel,
        accepts_network_terms: acceptTerms
      });
      setSubmittedResult(res);
    } catch (err: any) {
      alert(err.message || 'Failed to submit quote');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 text-slate-100">
        <div className="flex items-center gap-3 text-indigo-400">
          <Clock className="w-6 h-6 animate-spin" />
          <span className="text-sm font-semibold">Loading VIP Trip RFP Specifications...</span>
        </div>
      </div>
    );
  }

  if (error || !rfp) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 text-slate-100">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-md w-full text-center space-y-4 shadow-2xl">
          <AlertCircle className="w-12 h-12 text-rose-400 mx-auto" />
          <h2 className="text-lg font-bold text-white">RFP Link Expired or Invalid</h2>
          <p className="text-xs text-slate-400">
            This quote request may have already been awarded to another affiliate or expired.
          </p>
          {onBackToMain && (
            <button
              onClick={onBackToMain}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold transition"
            >
              Return to Dispatch
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-xl mx-auto w-full space-y-6">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/30 text-indigo-300 text-xs font-semibold">
            <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
            Global Chauffeur Affiliate Network · Official B2B RFP
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            VIP Trip Request & Rate Quote
          </h1>
          <p className="text-xs text-slate-400">
            Submit your net payout rate to accept this booking. Instant escrow settlement upon completion.
          </p>
        </div>

        {/* Success Screen */}
        {submittedResult ? (
          <div className="bg-slate-900 border border-emerald-500/40 rounded-2xl p-6 shadow-2xl space-y-5 text-center animate-fadeIn">
            <div className="w-16 h-16 bg-emerald-500/20 border border-emerald-500/40 rounded-full flex items-center justify-center mx-auto text-emerald-400">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            
            <div>
              <h2 className="text-xl font-bold text-white">Quote Submitted & Leg Confirmed!</h2>
              <p className="text-xs text-emerald-300 mt-1">
                Your net payout of <strong>${submittedResult.vendor_net_payout_usd} USD</strong> is locked in escrow.
              </p>
            </div>

            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 text-left text-xs space-y-2">
              <div className="flex justify-between text-slate-400">
                <span>RFP ID:</span>
                <span className="font-mono text-white">{submittedResult.rfp_id}</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Provisional Partner ID:</span>
                <span className="font-mono text-indigo-300">{submittedResult.provisional_partner_id}</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Client Status:</span>
                <span className="text-emerald-400 font-semibold">Itinerary Binding Total Updated</span>
              </div>
            </div>

            {/* Instant Stripe Connect Payout Setup CTA */}
            <div className="p-4 bg-gradient-to-r from-indigo-950/60 to-purple-950/60 border border-indigo-500/40 rounded-xl text-left space-y-2">
              <div className="flex items-center gap-2 text-indigo-300 font-bold text-xs">
                <ShieldCheck className="w-4 h-4 text-indigo-400" />
                Setup Instant Direct Deposit (Stripe Connect Express)
              </div>
              <p className="text-[11px] text-slate-300">
                Connect your bank account or debit card to receive instant automatic payout within 30 minutes of ride dropoff.
              </p>
              <button
                onClick={() => alert('Redirecting to Stripe Connect Express Onboarding...')}
                className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-bold text-xs shadow-lg shadow-indigo-600/30 transition flex items-center justify-center gap-1.5 mt-1"
              >
                Connect Payout Account in 60 Seconds <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {onBackToMain && (
              <button
                onClick={onBackToMain}
                className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-semibold"
              >
                Back to Dispatch Portal
              </button>
            )}
          </div>
        ) : (
          /* Quoting Form */
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl space-y-6">
            {/* Trip Details Card */}
            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <span className="text-xs font-bold text-indigo-400 uppercase tracking-wider">
                  Trip Specifications
                </span>
                <span className="text-xs font-semibold px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300">
                  {rfp.vehicle_class.replace('_', ' ')}
                </span>
              </div>

              <div className="space-y-2 text-xs">
                <div className="flex items-start gap-2">
                  <MapPin className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" />
                  <div>
                    <span className="text-slate-400">Pickup:</span>
                    <p className="text-white font-semibold">{rfp.pickup_address}</p>
                  </div>
                </div>

                <div className="flex items-start gap-2">
                  <MapPin className="w-4 h-4 text-rose-400 mt-0.5 shrink-0" />
                  <div>
                    <span className="text-slate-400">Dropoff:</span>
                    <p className="text-white font-semibold">{rfp.dropoff_address}</p>
                  </div>
                </div>

                <div className="flex items-center gap-4 text-slate-400 pt-1 border-t border-slate-800/80">
                  <span>📅 Scheduled: <strong className="text-slate-200">{new Date(rfp.pickup_time_utc).toLocaleString()}</strong></span>
                  <span>👥 Passengers: <strong className="text-slate-200">{rfp.passenger_count}</strong></span>
                  <span>🧳 Bags: <strong className="text-slate-200">{rfp.luggage_count}</strong></span>
                </div>
              </div>
            </div>

            {/* Quoting Inputs */}
            <form onSubmit={handleSubmitQuote} className="space-y-4 text-xs">
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="text-slate-300 font-semibold">
                    Your Guaranteed Net Payout Rate ($ USD) *
                  </label>
                  <span className="text-[11px] text-emerald-400 font-medium">
                    Suggested Benchmark: ${rfp.suggested_benchmark_payout_usd}
                  </span>
                </div>
                <div className="relative">
                  <DollarSign className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={quotePayout}
                    onChange={(e) => setQuotePayout(e.target.value)}
                    placeholder="185.00"
                    className="w-full bg-slate-800 border border-indigo-500/50 rounded-xl p-2.5 pl-9 text-white font-extrabold text-base focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <p className="text-[10px] text-slate-400 mt-1">
                  You receive 100% of this amount. Platform commission is added on top to the customer.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1">Company / Operating Name *</label>
                  <input
                    type="text"
                    required
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2.5 text-white"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">Dispatch / Driver Phone *</label>
                  <input
                    type="tel"
                    required
                    value={contactPhone}
                    onChange={(e) => setContactPhone(e.target.value)}
                    placeholder="+1 (970) 555-0144"
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2.5 text-white font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1">Assigned Chauffeur Name</label>
                  <input
                    type="text"
                    value={dispatcherName}
                    onChange={(e) => setDispatcherName(e.target.value)}
                    placeholder="e.g. Klaus Vance (Lead Chauffeur)"
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2.5 text-white"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">Vehicle Model & Year</label>
                  <input
                    type="text"
                    value={vehicleModel}
                    onChange={(e) => setVehicleModel(e.target.value)}
                    placeholder="2025 Cadillac Escalade ESV"
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2.5 text-white"
                  />
                </div>
              </div>

              {/* Terms Checkbox */}
              <div className="flex items-start gap-2 pt-2">
                <input
                  type="checkbox"
                  id="terms"
                  checked={acceptTerms}
                  onChange={(e) => setAcceptTerms(e.target.checked)}
                  className="mt-0.5 rounded bg-slate-800 border-slate-700 text-indigo-600 focus:ring-indigo-500"
                />
                <label htmlFor="terms" className="text-[11px] text-slate-300">
                  I agree to service this VIP trip per standards ($5M+ commercial insurance, 15m early arrival, executive dress code) and accept automatic escrow settlement.
                </label>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={submitting}
                className="w-full py-3 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 text-white rounded-xl font-bold text-sm shadow-xl shadow-indigo-600/30 transition flex items-center justify-center gap-2"
              >
                {submitting ? 'Submitting & Locking Leg...' : `Accept Job & Lock Rate ($${quotePayout || '0.00'})`}
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          </div>
        )}

        {/* Footer Guarantee */}
        <div className="text-center text-[11px] text-slate-400 flex items-center justify-center gap-4">
          <span className="flex items-center gap-1"><ShieldCheck className="w-3.5 h-3.5 text-emerald-400" /> Guaranteed Escrow Clearing</span>
          <span className="flex items-center gap-1"><Building2 className="w-3.5 h-3.5 text-indigo-400" /> Direct Bank ACH & Stripe Connect</span>
        </div>
      </div>
    </div>
  );
};
