import React, { useState, useEffect } from 'react';
import { 
  Radio, PhoneCall, Mail, Clock, AlertTriangle, CheckCircle2, 
  ExternalLink, Search, Sparkles, ShieldCheck, ArrowRight, RefreshCw, 
  DollarSign, Send, UserCheck, Plus, X, Globe, Building2
} from 'lucide-react';
import { 
  fetchSourcingOpportunities, triggerManualSourcingRfp, 
  submitVendorQuoteApi, managerPhoneOverrideApi 
} from '../api';

export const SourcingConciergeDesk: React.FC = () => {
  const [opportunities, setOpportunities] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'ALL' | 'ACTION_REQUIRED' | 'CONFIRMED'>('ALL');
  
  // Modals & Form State
  const [showOverrideModal, setShowOverrideModal] = useState<any | null>(null);
  const [overrideRate, setOverrideRate] = useState('');
  const [overrideContact, setOverrideContact] = useState('');
  const [overrideDriver, setOverrideDriver] = useState('');
  const [overrideNotes, setOverrideNotes] = useState('');
  const [submittingOverride, setSubmittingOverride] = useState(false);

  const [showNewRfpModal, setShowNewRfpModal] = useState(false);
  const [newCity, setNewCity] = useState('Aspen');
  const [newPickup, setNewPickup] = useState('Aspen Pitkin County Airport (ASE) Private VIP FBO');
  const [newDropoff, setNewDropoff] = useState('The Little Nell, 675 E Durant Ave, Aspen, CO');
  const [newVehicleClass, setNewVehicleClass] = useState('LUXURY_SUV');
  const [newManagerCc, setNewManagerCc] = useState('dispatch@manhattanprestige.com');
  const [launchingRfp, setLaunchingRfp] = useState(false);

  const [notification, setNotification] = useState<string | null>(null);
  const [previewEmailModal, setPreviewEmailModal] = useState<any | null>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await fetchSourcingOpportunities();
      setOpportunities(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 6000);
    return () => clearInterval(interval);
  }, []);

  const handlePhoneOverrideSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!showOverrideModal || !overrideRate) return;
    setSubmittingOverride(true);
    try {
      const res = await managerPhoneOverrideApi({
        rfp_id: showOverrideModal.rfp_id,
        manager_name: 'Fleet Dispatcher (In-Charge)',
        vendor_contact_spoken_to: overrideContact || 'Lead Dispatcher',
        agreed_net_payout_usd: parseFloat(overrideRate),
        driver_name: overrideDriver || 'Assigned Lead Chauffeur',
        notes: overrideNotes || 'Confirmed via direct phone call with vendor.'
      });
      setNotification(`✓ Leg locked at $${res.passenger_final_total_usd} all-inclusive! Customer notified.`);
      setShowOverrideModal(null);
      setOverrideRate('');
      setOverrideContact('');
      setOverrideDriver('');
      loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to submit override');
    } finally {
      setSubmittingOverride(false);
    }
  };

  const handleSimulateVendorQuote = async (opp: any) => {
    try {
      const simRate = opp.suggested_benchmark_payout_usd + 15;
      const res = await submitVendorQuoteApi({
        quote_token: opp.quote_token,
        quoted_payout_usd: simRate,
        vendor_company_name: opp.target_vendor_name,
        dispatcher_or_driver_name: 'Alex Vance (Senior Dispatcher)',
        contact_phone: opp.target_vendor_phone || '+1-800-555-0199',
        vehicle_model: '2025 Cadillac Escalade ESV VIP'
      });
      setNotification(`✓ Vendor submitted $${simRate} quote! Leg locked at $${res.passenger_final_total_usd}.`);
      loadData();
    } catch (err: any) {
      alert(err.message || 'Simulation error');
    }
  };

  const handleLaunchNewRfp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLaunchingRfp(true);
    try {
      const res = await triggerManualSourcingRfp({
        city: newCity,
        pickup_address: newPickup,
        dropoff_address: newDropoff,
        vehicle_class: newVehicleClass,
        manager_cc_email: newManagerCc
      });
      setNotification(`🚀 AI Sourcing RFP dispatched to ${res.target_vendor_name}! CC sent to ${res.manager_cc_email}`);
      setShowNewRfpModal(false);
      loadData();
    } catch (err: any) {
      alert(err.message || 'Error launching RFP');
    } finally {
      setLaunchingRfp(false);
    }
  };

  const filteredOpps = opportunities.filter(opp => {
    if (activeTab === 'ACTION_REQUIRED') return opp.status === 'MANAGER_FOLLOWUP_REQUIRED' || opp.status === 'AI_DISPATCHED';
    if (activeTab === 'CONFIRMED') return opp.status === 'PROVISIONALLY_CONFIRMED';
    return true;
  });

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 text-slate-100 shadow-2xl relative overflow-hidden">
      {/* Background Glow */}
      <div className="absolute -right-20 -top-20 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -left-20 -bottom-20 w-80 h-80 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-indigo-500/20 border border-indigo-500/40 rounded-xl text-indigo-400">
              <Sparkles className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <h2 className="text-xl font-bold bg-gradient-to-r from-indigo-200 via-white to-amber-200 bg-clip-text text-transparent">
                AI Autonomous Sourcing & Never-Miss-A-Job Concierge Desk
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Out-of-Market Vendor Discovery · Dual-Delivery RFP (CC to Manager) · 10-Minute Phone Escalation Protocol
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={loadData}
            disabled={loading}
            className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg border border-slate-700 transition flex items-center gap-1.5 text-xs font-semibold"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          <button
            onClick={() => setShowNewRfpModal(true)}
            className="px-3.5 py-2 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 text-white rounded-lg font-semibold text-xs shadow-lg shadow-indigo-600/30 transition flex items-center gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" />
            Source New Corridor
          </button>
        </div>
      </div>

      {/* Alert Banner */}
      {notification && (
        <div className="my-4 p-3 bg-emerald-950/80 border border-emerald-500/40 rounded-xl text-emerald-300 text-xs flex items-center justify-between animate-fadeIn">
          <span>{notification}</span>
          <button onClick={() => setNotification(null)} className="text-emerald-400 hover:text-emerald-200">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Key Metrics Strip */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3 my-5">
        <div className="p-3.5 bg-slate-800/60 border border-slate-700/60 rounded-xl">
          <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Active Sourcing Tickets</div>
          <div className="text-xl font-bold text-white mt-1">{opportunities.length} Live</div>
          <div className="text-[10px] text-indigo-400 mt-0.5">Dual-RFP Sent with Owner CC</div>
        </div>
        <div className="p-3.5 bg-amber-950/30 border border-amber-500/30 rounded-xl">
          <div className="text-[11px] font-semibold text-amber-400 uppercase tracking-wider">Manager Follow-Up (Call Now)</div>
          <div className="text-xl font-bold text-amber-300 mt-1">
            {opportunities.filter(o => o.status === 'MANAGER_FOLLOWUP_REQUIRED').length} Escalated
          </div>
          <div className="text-[10px] text-amber-400/80 mt-0.5">Over 10m SLA grace period</div>
        </div>
        <div className="p-3.5 bg-emerald-950/30 border border-emerald-500/30 rounded-xl">
          <div className="text-[11px] font-semibold text-emerald-400 uppercase tracking-wider">Confirmed & Locked Legs</div>
          <div className="text-xl font-bold text-emerald-300 mt-1">
            {opportunities.filter(o => o.status === 'PROVISIONALLY_CONFIRMED').length} Secured
          </div>
          <div className="text-[10px] text-emerald-400/80 mt-0.5">Provisional affiliates auto-created</div>
        </div>
        <div className="p-3.5 bg-indigo-950/30 border border-indigo-500/30 rounded-xl">
          <div className="text-[11px] font-semibold text-indigo-400 uppercase tracking-wider">Escrow Settlement Channel</div>
          <div className="text-xl font-bold text-indigo-300 mt-1">Stripe Connect</div>
          <div className="text-[10px] text-indigo-400/80 mt-0.5">85% Performer / 10% Originator / 5% Hub</div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 mb-4 border-b border-slate-800 pb-3">
        {(['ALL', 'ACTION_REQUIRED', 'CONFIRMED'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
              activeTab === tab
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            {tab === 'ALL' && 'All Corridors'}
            {tab === 'ACTION_REQUIRED' && '⚠️ Action Required (Call / Sourcing)'}
            {tab === 'CONFIRMED' && '✓ Confirmed & Locked'}
          </button>
        ))}
      </div>

      {/* Opportunities List */}
      <div className="space-y-3.5">
        {filteredOpps.length === 0 ? (
          <div className="p-8 text-center bg-slate-800/40 rounded-xl border border-slate-800 text-slate-400 text-xs">
            No active sourcing opportunities found in this category. Click "Source New Corridor" to launch an autonomous RFP.
          </div>
        ) : (
          filteredOpps.map((opp) => {
            const isEscalated = opp.status === 'MANAGER_FOLLOWUP_REQUIRED';
            const isConfirmed = opp.status === 'PROVISIONALLY_CONFIRMED';
            const isAiDispatched = opp.status === 'AI_DISPATCHED';

            return (
              <div
                key={opp.rfp_id}
                className={`p-4 rounded-xl border transition duration-200 ${
                  isEscalated
                    ? 'bg-amber-950/20 border-amber-500/50 shadow-lg shadow-amber-950/30'
                    : isConfirmed
                    ? 'bg-emerald-950/20 border-emerald-500/40'
                    : 'bg-slate-800/50 border-slate-700/60'
                }`}
              >
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  {/* Left Column: Vendor & Trip Details */}
                  <div className="space-y-1.5 flex-1">
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <span className="font-bold text-sm text-white">{opp.target_city} Corridor</span>
                      <span className="text-xs text-slate-400">·</span>
                      <span className="text-xs font-semibold text-indigo-300">{opp.target_vendor_name}</span>
                      
                      {/* Status Badges */}
                      {isEscalated && (
                        <span className="px-2.5 py-0.5 bg-amber-500/20 border border-amber-500/60 text-amber-300 text-[10px] font-bold rounded-full animate-pulse flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3" />
                          CALL VENDOR NOW (10m SLA EXPIRING)
                        </span>
                      )}
                      {isAiDispatched && (
                        <span className="px-2.5 py-0.5 bg-indigo-500/20 border border-indigo-500/40 text-indigo-300 text-[10px] font-semibold rounded-full flex items-center gap-1">
                          <Clock className="w-3 h-3 animate-spin" />
                          AI Sourcing Active (Awaiting 1-Click Quote)
                        </span>
                      )}
                      {isConfirmed && (
                        <span className="px-2.5 py-0.5 bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-[10px] font-bold rounded-full flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" />
                          Locked & Secured (${opp.quoted_rate_usd} Net)
                        </span>
                      )}
                    </div>

                    <div className="text-xs text-slate-300">
                      <span className="font-medium text-slate-400">Pickup:</span> {opp.pickup_address} <span className="text-indigo-400">➔</span> <span className="font-medium text-slate-400">Dropoff:</span> {opp.dropoff_address}
                    </div>

                    <div className="flex items-center gap-4 text-[11px] text-slate-400 flex-wrap pt-1">
                      <span>Vehicle: <strong className="text-slate-200">{opp.vehicle_class.replace('_', ' ')}</strong></span>
                      <span>Benchmark Net: <strong className="text-emerald-400">${opp.suggested_benchmark_payout_usd}</strong></span>
                      <span>Manager CC: <strong className="text-slate-200">{opp.manager_cc_email}</strong></span>
                      {opp.target_vendor_phone && (
                        <span>Direct Phone: <strong className="text-amber-300 font-mono">{opp.target_vendor_phone}</strong></span>
                      )}
                    </div>

                    {opp.manager_notes && (
                      <div className="text-[11px] bg-slate-900/60 p-2 rounded-lg border border-slate-800 text-slate-300 mt-2 font-mono">
                        📝 {opp.manager_notes}
                      </div>
                    )}
                  </div>

                  {/* Right Column: Actions */}
                  <div className="flex items-center gap-2 flex-wrap lg:flex-nowrap">
                    {/* View Sent Email with CC */}
                    {/* View Sent Email with CC */}
                    <button
                      onClick={() => setPreviewEmailModal(opp)}
                      className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-semibold border border-slate-700 transition flex items-center gap-1.5"
                    >
                      <Mail className="w-3.5 h-3.5 text-indigo-400" />
                      View Email (CC)
                    </button>

                    {/* Direct Call Vendor Button */}
                    {opp.target_vendor_phone && (
                      <a
                        href={`tel:${opp.target_vendor_phone}`}
                        className="px-3 py-2 bg-amber-600/20 hover:bg-amber-600/30 text-amber-300 border border-amber-500/40 rounded-lg text-xs font-bold transition flex items-center gap-1.5"
                      >
                        <PhoneCall className="w-3.5 h-3.5" />
                        Call Vendor
                      </a>
                    )}

                    {/* Log Manual Agreed Rate Button */}
                    {!isConfirmed && (
                      <button
                        onClick={() => {
                          setShowOverrideModal(opp);
                          setOverrideRate(String(opp.suggested_benchmark_payout_usd));
                        }}
                        className="px-3 py-2 bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-500 hover:to-emerald-600 text-white rounded-lg text-xs font-bold shadow-md shadow-emerald-600/20 transition flex items-center gap-1.5"
                      >
                        <DollarSign className="w-3.5 h-3.5" />
                        Log Agreed Rate
                      </button>
                    )}

                    {/* Inbound LLM Email Parser Test */}
                    {!isConfirmed && (
                      <button
                        onClick={async () => {
                          try {
                            const res = await fetch('/api/v1/sourcing/inbound-email-webhook', {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({
                                raw_text: `Hi Dispatch, We can cover this ${opp.target_city} transfer for $${opp.suggested_benchmark_payout_usd} net. Assigned driver is Klaus Vance (+1-970-555-0144) in a 2025 Cadillac Escalade ESV. Thanks!`,
                                sender: opp.target_vendor_email,
                                quote_token: opp.quote_token
                              })
                            });
                            const parsed = await res.json();
                            setNotification(`🤖 LLM Inbound Email Parsed: Extracted $${parsed.extracted_rate_usd} net by ${parsed.extracted_driver}! Leg locked.`);
                            loadData();
                          } catch (e: any) {
                            alert('Email parser error: ' + e.message);
                          }
                        }}
                        className="px-3 py-2 bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 border border-purple-500/40 rounded-lg text-xs font-semibold transition flex items-center gap-1"
                        title="Simulate vendor sending a free-text email reply (auto-parsed by LLM)"
                      >
                        <Sparkles className="w-3.5 h-3.5" />
                        Test Email LLM Parser
                      </button>
                    )}

                    {/* 1-Click Simulate Vendor Quote Response */}
                    {!isConfirmed && (
                      <button
                        onClick={() => handleSimulateVendorQuote(opp)}
                        className="px-3 py-2 bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/40 rounded-lg text-xs font-semibold transition flex items-center gap-1"
                        title="Simulate vendor clicking the 1-click quote link in email"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        Simulate Link Click
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* MODAL 1: Log Manual Agreed Rate (Manager Phone Override) */}
      {showOverrideModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-emerald-500/20 text-emerald-400 rounded-lg">
                  <PhoneCall className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-white text-base">Log Agreed Rate from Phone Call</h3>
                  <p className="text-xs text-slate-400">Lock the leg immediately with agreed rate so no job is lost.</p>
                </div>
              </div>
              <button onClick={() => setShowOverrideModal(null)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handlePhoneOverrideSubmit} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-slate-400 mb-1">Target Vendor</label>
                <input
                  type="text"
                  disabled
                  value={`${showOverrideModal.target_vendor_name} (${showOverrideModal.target_city})`}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2.5 text-slate-300"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1">Agreed Net Payout ($ USD) *</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={overrideRate}
                    onChange={(e) => setOverrideRate(e.target.value)}
                    placeholder="e.g. 195.00"
                    className="w-full bg-slate-800 border border-emerald-500/50 rounded-lg p-2.5 text-white font-bold"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">Dispatcher Contact Spoken To</label>
                  <input
                    type="text"
                    value={overrideContact}
                    onChange={(e) => setOverrideContact(e.target.value)}
                    placeholder="e.g. Lead Dispatcher Klaus"
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2.5 text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1">Driver Name (Optional)</label>
                  <input
                    type="text"
                    value={overrideDriver}
                    onChange={(e) => setOverrideDriver(e.target.value)}
                    placeholder="e.g. Driver Mike"
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2.5 text-white"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">Notes / Special Instructions</label>
                  <input
                    type="text"
                    value={overrideNotes}
                    onChange={(e) => setOverrideNotes(e.target.value)}
                    placeholder="e.g. Flight BA 178 VIP Meet & Greet confirmed"
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2.5 text-white"
                  />
                </div>
              </div>

              <div className="p-3 bg-emerald-950/40 border border-emerald-500/30 rounded-xl text-emerald-300 text-[11px]">
                ⚡ <strong>Instant Lock:</strong> Submitting this will automatically lock the leg in the Master Itinerary, recalculate taxes/gratuity, provision this vendor into the affiliate directory, and notify the customer.
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowOverrideModal(null)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingOverride}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-bold shadow-lg shadow-emerald-600/30 flex items-center gap-1.5"
                >
                  {submittingOverride ? 'Locking Leg...' : 'Lock Leg & Confirm Job'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: Source New Out-of-Market Corridor */}
      {showNewRfpModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-indigo-500/20 text-indigo-400 rounded-lg">
                  <Globe className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-white text-base">Launch Autonomous Vendor Sourcing RFP</h3>
                  <p className="text-xs text-slate-400">Searches local operators in target city and dispatches Dual-RFP with Manager CC.</p>
                </div>
              </div>
              <button onClick={() => setShowNewRfpModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleLaunchNewRfp} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-slate-400 mb-1">Target Destination / City *</label>
                <input
                  type="text"
                  required
                  value={newCity}
                  onChange={(e) => setNewCity(e.target.value)}
                  placeholder="e.g. Aspen, Vail, Jackson Hole, Scottsdale, Honolulu"
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2.5 text-white font-semibold"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Pickup Address / Airport FBO *</label>
                <input
                  type="text"
                  required
                  value={newPickup}
                  onChange={(e) => setNewPickup(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2.5 text-white"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Dropoff Address *</label>
                <input
                  type="text"
                  required
                  value={newDropoff}
                  onChange={(e) => setNewDropoff(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2.5 text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1">Vehicle Class</label>
                  <select
                    value={newVehicleClass}
                    onChange={(e) => setNewVehicleClass(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2.5 text-white"
                  >
                    <option value="LUXURY_SUV">Luxury SUV (Escalade/Navigator)</option>
                    <option value="FIRST_CLASS">First Class (Mercedes S-Class)</option>
                    <option value="BUSINESS_VAN">Executive Sprinter VIP</option>
                    <option value="ULTRA_LUXURY">Ultra Luxury (Maybach)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">Manager CC Email (Self) *</label>
                  <input
                    type="email"
                    required
                    value={newManagerCc}
                    onChange={(e) => setNewManagerCc(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2.5 text-white"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowNewRfpModal(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={launchingRfp}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-bold shadow-lg shadow-indigo-600/30 flex items-center gap-1.5"
                >
                  {launchingRfp ? 'Discovering & Sending...' : 'Discover & Dispatch Dual-RFP'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: View Dual-RFP Sent Email & CC Copy */}
      {previewEmailModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-2xl w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-indigo-500/20 text-indigo-400 rounded-lg">
                  <Mail className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-white text-base">Dual-Delivery RFP Email Preview</h3>
                  <p className="text-xs text-slate-400">Delivered to Vendor + CC Copy with Internal Action Banner sent to Owner/Manager.</p>
                </div>
              </div>
              <button onClick={() => setPreviewEmailModal(null)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 font-mono text-xs text-slate-300 space-y-2 max-h-96 overflow-y-auto">
              <div className="text-slate-400"><strong>From:</strong> Global Executive Chauffeur Network &lt;dispatch@manhattanprestige.com&gt;</div>
              <div className="text-slate-400"><strong>To:</strong> {previewEmailModal.target_vendor_name} &lt;{previewEmailModal.target_vendor_email}&gt;</div>
              <div className="text-amber-400 font-bold"><strong>CC:</strong> {previewEmailModal.manager_cc_email}</div>
              <div className="text-indigo-300 font-bold"><strong>Subject:</strong> [URGENT TRIP RFP #{previewEmailModal.rfp_id}] Executive Chauffeur Booking for {previewEmailModal.target_city}</div>
              <hr className="border-slate-800 my-2" />
              
              <div className="p-3 bg-amber-950/40 border border-amber-500/40 rounded-lg text-amber-200">
                ⚠️ <strong>[INTERNAL MANAGER DISPATCH BANNER]</strong><br />
                • Target Vendor: {previewEmailModal.target_vendor_name}<br />
                • Direct Phone: {previewEmailModal.target_vendor_phone || 'N/A'}<br />
                • Suggested Benchmark: ${previewEmailModal.suggested_benchmark_payout_usd} USD<br />
                • Escalation Window: 10 mins until 'Call Vendor' prompt
              </div>

              <p className="pt-2">Dear Dispatch Team at {previewEmailModal.target_vendor_name},</p>
              <p>The Global Executive Chauffeur Network has an upcoming VIP client trip in your service corridor and is requesting your quote:</p>
              <ul className="list-disc list-inside space-y-1 pl-2 text-slate-200">
                <li>Pickup: {previewEmailModal.pickup_address}</li>
                <li>Destination: {previewEmailModal.dropoff_address}</li>
                <li>Tier: {previewEmailModal.vehicle_class.replace('_', ' ')}</li>
                <li>Client Profile: C-Suite Executive Corporate Transfer</li>
              </ul>
              <p className="pt-2 text-indigo-300 font-bold">👉 Submit Quote Link: http://localhost:5173/sourcing/quote/{previewEmailModal.quote_token}</p>
            </div>

            <div className="flex items-center justify-end pt-2">
              <button
                onClick={() => setPreviewEmailModal(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-semibold"
              >
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
