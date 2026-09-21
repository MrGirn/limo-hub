import React, { useState, useEffect } from 'react';
import { 
  FileText, Mail, ShieldAlert, CheckCircle2, RotateCcw, 
  Clock, DollarSign, Plane, AlertTriangle, Download, Eye, ExternalLink, Settings
} from 'lucide-react';

export const DocumentCenter: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'CONFIRMATION_EMAIL' | 'CANCELLATION_REFUND' | 'POLICY_SETTINGS'>('CONFIRMATION_EMAIL');
  
  // Policy Settings State
  const [freeCancelHours, setFreeCancelHours] = useState(12);
  const [latePenaltyPct, setLatePenaltyPct] = useState(50);
  const [airportWaitMins, setAirportWaitMins] = useState(60);
  const [customTerms, setCustomTerms] = useState("ANB Limo provides 60 minutes complimentary waiting on all commercial flights from touch-down.");
  const [policySaved, setPolicySaved] = useState(false);

  // Cancellation Simulator State
  const [simTripFare, setSimTripFare] = useState(240.00);
  const [simHoursBeforePickup, setSimHoursBeforePickup] = useState(28);
  const [isAirlineFlightCancelled, setIsAirlineFlightCancelled] = useState(false);
  const [cancelResult, setCancelResult] = useState<any>(null);

  // Email Render State
  const [emailHtml, setEmailHtml] = useState<string>('');

  useEffect(() => {
    // Generate initial live preview email
    fetchEmailPreview();
  }, [freeCancelHours, latePenaltyPct, airportWaitMins]);

  const fetchEmailPreview = async () => {
    try {
      const res = await fetch('http://localhost:8001/api/v1/vendor-app/documents/render-booking-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          booking_data: {
            trip_id: 'TRP-88129',
            passenger_name: 'Sir Arthur Davies',
            passenger_phone: '+1 (215) 555-9000',
            pickup_address: 'The Ritz-Carlton Philadelphia',
            dropoff_address: 'Philadelphia International Airport Terminal A',
            flight_number: 'BA 178 (Touchdown On-Time)'
          },
          vendor_id: 'vendor_anb_philly'
        })
      });
      const data = await res.json();
      setEmailHtml(data.html);
    } catch (e) {
      // Demo fallback HTML
      setEmailHtml("<div style='padding:20px; font-family:sans-serif;'><h3>ANB Limo Confirmation Email</h3><p>Booking confirmed with 60 min complimentary airport waiting.</p></div>");
    }
  };

  const handleSimulateCancellation = () => {
    let tier = "FREE_CANCELLATION";
    let refund = simTripFare;
    let penalty = 0.0;
    let explanation = "";

    if (isAirlineFlightCancelled) {
      tier = "FLIGHT_FORCE_MAJEURE";
      refund = simTripFare;
      penalty = 0.0;
      explanation = "Flight cancelled by airline. 100% full refund issued under Flight Protection policy.";
    } else if (simHoursBeforePickup >= freeCancelHours) {
      tier = "FREE_CANCELLATION";
      refund = simTripFare;
      penalty = 0.0;
      explanation = `Cancelled ${simHoursBeforePickup}h in advance (policy allows free cancel up to ${freeCancelHours}h). Full 100% refund of $${simTripFare.toFixed(2)} issued.`;
    } else if (simHoursBeforePickup >= 6) {
      tier = "LATE_CANCELLATION_PARTIAL";
      penalty = simTripFare * (latePenaltyPct / 100);
      refund = simTripFare - penalty;
      explanation = `Late cancellation ${simHoursBeforePickup}h before pickup (${latePenaltyPct}% late fee applied). Refund of $${refund.toFixed(2)} issued.`;
    } else {
      tier = "NO_REFUND_FORFEITURE";
      penalty = simTripFare;
      refund = 0.0;
      explanation = `Cancelled within ${simHoursBeforePickup}h of pickup after chauffeur vehicle dispatch. 100% vehicle hold forfeiture.`;
    }

    setCancelResult({
      tier,
      refund,
      penalty,
      explanation,
      creditMemoId: `CM-${Math.floor(100000 + Math.random() * 900000)}`,
      timestamp: new Date().toLocaleString()
    });
  };

  const handleSavePolicy = () => {
    setPolicySaved(true);
    setTimeout(() => setPolicySaved(false), 3000);
  };

  return (
    <div style={{ maxWidth: '1080px', margin: '0 auto', padding: '16px 24px', color: '#0F172A' }}>
      
      {/* Top Title Bar */}
      <div style={{ background: '#FFFFFF', padding: '24px 32px', borderRadius: '16px', border: '1px solid #E2E8F0', marginBottom: '24px', boxShadow: '0 2px 8px rgba(0,0,0,0.04)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <div style={{ fontSize: '11px', fontWeight: 800, color: '#D97706', letterSpacing: '0.08em' }}>DOCUMENT & CANCELLATION ENGINE</div>
          <h1 style={{ fontSize: '24px', fontWeight: 900, margin: '4px 0', color: '#0F172A' }}>
            Branded Emails, Invoices & Policy Management
          </h1>
          <p style={{ fontSize: '13px', color: '#64748B', margin: 0 }}>
            Configure vendor cancellation terms, preview dynamic customer confirmation emails, and simulate Stripe refunds.
          </p>
        </div>

        {/* Tab Controls */}
        <div style={{ display: 'flex', gap: '6px', background: '#F8FAFC', padding: '4px', borderRadius: '10px', border: '1px solid #E2E8F0' }}>
          <button
            onClick={() => setActiveTab('CONFIRMATION_EMAIL')}
            style={{
              padding: '8px 14px',
              borderRadius: '8px',
              fontSize: '12px',
              fontWeight: 700,
              border: 'none',
              background: activeTab === 'CONFIRMATION_EMAIL' ? '#FFFFFF' : 'transparent',
              color: activeTab === 'CONFIRMATION_EMAIL' ? '#2563EB' : '#64748B',
              boxShadow: activeTab === 'CONFIRMATION_EMAIL' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <Mail size={14} /> Confirmation Email Preview
          </button>

          <button
            onClick={() => setActiveTab('CANCELLATION_REFUND')}
            style={{
              padding: '8px 14px',
              borderRadius: '8px',
              fontSize: '12px',
              fontWeight: 700,
              border: 'none',
              background: activeTab === 'CANCELLATION_REFUND' ? '#FFFFFF' : 'transparent',
              color: activeTab === 'CANCELLATION_REFUND' ? '#DC2626' : '#64748B',
              boxShadow: activeTab === 'CANCELLATION_REFUND' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <RotateCcw size={14} /> Cancel & Refund Simulator
          </button>

          <button
            onClick={() => setActiveTab('POLICY_SETTINGS')}
            style={{
              padding: '8px 14px',
              borderRadius: '8px',
              fontSize: '12px',
              fontWeight: 700,
              border: 'none',
              background: activeTab === 'POLICY_SETTINGS' ? '#FFFFFF' : 'transparent',
              color: activeTab === 'POLICY_SETTINGS' ? '#D97706' : '#64748B',
              boxShadow: activeTab === 'POLICY_SETTINGS' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <Settings size={14} /> Vendor Policy Settings
          </button>
        </div>
      </div>

      {/* --- TAB 1: CONFIRMATION EMAIL PREVIEW --- */}
      {activeTab === 'CONFIRMATION_EMAIL' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: '24px' }}>
          {/* Live Render Frame */}
          <div style={{ background: '#FFFFFF', borderRadius: '16px', border: '1px solid #E2E8F0', padding: '24px', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', borderBottom: '1px solid #E2E8F0', paddingBottom: '12px' }}>
              <div style={{ fontSize: '13px', fontWeight: 800, color: '#0F172A' }}>
                ✉️ Live Responsive HTML Email Preview (Gmail / Apple Mail)
              </div>
              <button 
                onClick={fetchEmailPreview}
                style={{ background: '#F1F5F9', border: '1px solid #CBD5E1', padding: '4px 10px', borderRadius: '6px', fontSize: '11px', fontWeight: 700, cursor: 'pointer' }}
              >
                ↻ Refresh Render
              </button>
            </div>

            <div 
              style={{ border: '1px solid #E2E8F0', borderRadius: '12px', overflow: 'hidden', maxHeight: '650px', overflowY: 'auto' }}
              dangerouslySetInnerHTML={{ __html: emailHtml }}
            />
          </div>

          {/* Email Insights & Policy Card */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ background: '#FFFFFF', borderRadius: '16px', border: '1px solid #E2E8F0', padding: '20px', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
              <h3 style={{ fontSize: '15px', fontWeight: 800, color: '#0F172A', marginBottom: '12px' }}>
                📋 Included Leg Policies & Disclosures
              </h3>
              <ul style={{ margin: 0, paddingLeft: '18px', fontSize: '12px', color: '#64748B', lineHeight: 1.6 }}>
                <li><strong>Free Cancellation Window:</strong> Up to {freeCancelHours} hours before scheduled pickup.</li>
                <li><strong>Late Cancellation Fee:</strong> {latePenaltyPct}% of total fare.</li>
                <li><strong>Airport Waiting Allowance:</strong> {airportWaitMins} min complimentary from wheels-down.</li>
                <li><strong>Flight Delay Shield:</strong> Zero charge for commercial airline delays.</li>
              </ul>
            </div>

            <div style={{ background: '#EFF6FF', borderRadius: '16px', border: '1px solid #BFDBFE', padding: '20px' }}>
              <div style={{ fontWeight: 800, color: '#1D4ED8', fontSize: '13px', marginBottom: '6px' }}>
                🌐 Multi-Leg Transparency
              </div>
              <p style={{ fontSize: '12px', color: '#1E40AF', margin: 0, lineHeight: 1.5 }}>
                For multi-city Global Hub bookings, this email automatically includes a dedicated breakdown box for <strong>every individual servicing affiliate</strong> in the itinerary.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* --- TAB 2: CANCELLATION & REFUND SIMULATOR --- */}
      {activeTab === 'CANCELLATION_REFUND' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1.2fr', gap: '24px' }}>
          {/* Controls */}
          <div style={{ background: '#FFFFFF', borderRadius: '16px', border: '1px solid #E2E8F0', padding: '24px', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 800, color: '#0F172A', marginBottom: '16px' }}>
              ⚙️ Cancellation Scenario Parameters
            </h3>

            <div style={{ display: 'grid', gap: '16px' }}>
              <div>
                <label style={{ fontSize: '11px', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '6px' }}>
                  ORIGINAL TOTAL FARE PAID ($)
                </label>
                <input 
                  type="number" 
                  value={simTripFare}
                  onChange={(e) => setSimTripFare(Number(e.target.value))}
                  style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '13px' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '11px', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '6px' }}>
                  HOURS BEFORE SCHEDULED PICKUP (CANCELLATION TIME)
                </label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <input 
                    type="range" 
                    min="1" 
                    max="48" 
                    value={simHoursBeforePickup}
                    onChange={(e) => setSimHoursBeforePickup(Number(e.target.value))}
                    style={{ flex: 1 }}
                  />
                  <span style={{ fontSize: '14px', fontWeight: 800, color: '#0F172A', width: '50px' }}>
                    {simHoursBeforePickup} hrs
                  </span>
                </div>
              </div>

              <div style={{ background: '#F8FAFC', padding: '12px', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', fontWeight: 700, color: '#0F172A', cursor: 'pointer' }}>
                  <input 
                    type="checkbox" 
                    checked={isAirlineFlightCancelled}
                    onChange={(e) => setIsAirlineFlightCancelled(e.target.checked)}
                  />
                  Flight Cancelled by Airline (Force Majeure Protection)
                </label>
              </div>

              <button
                onClick={handleSimulateCancellation}
                style={{
                  background: '#DC2626',
                  color: '#FFFFFF',
                  padding: '12px',
                  borderRadius: '10px',
                  border: 'none',
                  fontWeight: 800,
                  fontSize: '14px',
                  cursor: 'pointer',
                  boxShadow: '0 2px 6px rgba(220,38,38,0.2)'
                }}
              >
                Evaluate & Execute Rule-Based Refund
              </button>
            </div>
          </div>

          {/* Result Memo */}
          <div style={{ background: '#FFFFFF', borderRadius: '16px', border: '1px solid #E2E8F0', padding: '24px', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 800, color: '#0F172A', marginBottom: '16px' }}>
              🧾 Official Credit Memo & Refund Settlement
            </h3>

            {cancelResult ? (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', background: '#F8FAFC', padding: '10px 14px', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
                  <span style={{ fontSize: '12px', fontWeight: 700, color: '#64748B' }}>REFUND TIER:</span>
                  <span style={{ 
                    fontSize: '11px', 
                    fontWeight: 800, 
                    padding: '3px 8px', 
                    borderRadius: '6px',
                    background: cancelResult.tier === 'FREE_CANCELLATION' || cancelResult.tier === 'FLIGHT_FORCE_MAJEURE' ? '#DCFCE7' : cancelResult.tier === 'LATE_CANCELLATION_PARTIAL' ? '#FEF3C7' : '#FEE2E2',
                    color: cancelResult.tier === 'FREE_CANCELLATION' || cancelResult.tier === 'FLIGHT_FORCE_MAJEURE' ? '#16A34A' : cancelResult.tier === 'LATE_CANCELLATION_PARTIAL' ? '#B45309' : '#DC2626'
                  }}>
                    {cancelResult.tier}
                  </span>
                </div>

                <div style={{ display: 'grid', gap: '10px', fontSize: '13px', marginBottom: '18px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: '#64748B' }}>
                    <span>Original Charge:</span>
                    <strong style={{ color: '#0F172A' }}>${simTripFare.toFixed(2)}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: '#DC2626' }}>
                    <span>Cancellation Penalty:</span>
                    <strong>-${cancelResult.penalty.toFixed(2)}</strong>
                  </div>
                  <div style={{ borderTop: '2px solid #E2E8F0', paddingTop: '10px', display: 'flex', justifyContent: 'space-between', fontSize: '16px', fontWeight: 900, color: '#16A34A' }}>
                    <span>Net Refund to Customer:</span>
                    <span>${cancelResult.refund.toFixed(2)}</span>
                  </div>
                </div>

                <div style={{ background: '#F8FAFC', padding: '12px 16px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '12px', color: '#334155', lineHeight: 1.5, marginBottom: '16px' }}>
                  {cancelResult.explanation}
                </div>

                <div style={{ fontSize: '11px', color: '#64748B', display: 'flex', justifyContent: 'space-between' }}>
                  <span>Credit Memo: <strong>{cancelResult.creditMemoId}</strong></span>
                  <span>Stripe Status: <strong style={{ color: '#16A34A' }}>TRANSFERRED</strong></span>
                </div>
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '50px 0', color: '#94A3B8' }}>
                <RotateCcw size={36} style={{ margin: '0 auto 12px auto', opacity: 0.4 }} />
                <p style={{ fontSize: '13px' }}>Adjust the scenario controls on the left to simulate automated policy evaluation.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* --- TAB 3: POLICY SETTINGS --- */}
      {activeTab === 'POLICY_SETTINGS' && (
        <div style={{ background: '#FFFFFF', borderRadius: '16px', border: '1px solid #E2E8F0', padding: '32px', boxShadow: '0 2px 8px rgba(0,0,0,0.04)', maxWidth: '720px', margin: '0 auto' }}>
          <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#0F172A', marginBottom: '8px' }}>
            👑 Sovereign Cancellation & Waiting Policy Configuration
          </h3>
          <p style={{ fontSize: '13px', color: '#64748B', marginBottom: '24px' }}>
            Adjust your company's legal rules. These settings automatically update your public quotes, emails, and refund calculations.
          </p>

          <div style={{ display: 'grid', gap: '20px' }}>
            <div>
              <label style={{ fontSize: '12px', fontWeight: 700, color: '#0F172A', display: 'block', marginBottom: '4px' }}>
                FREE CANCELLATION WINDOW (HOURS PRIOR TO PICKUP)
              </label>
              <select
                value={freeCancelHours}
                onChange={(e) => setFreeCancelHours(Number(e.target.value))}
                style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '13px' }}
              >
                <option value={6}>6 Hours (Sedans / Urgent Booking)</option>
                <option value={12}>12 Hours (Executive SUVs / Standard Limo)</option>
                <option value={24}>24 Hours (First Class / High Demand)</option>
                <option value={48}>48 Hours (Sprinter Vans & Stretch Limos)</option>
              </select>
            </div>

            <div>
              <label style={{ fontSize: '12px', fontWeight: 700, color: '#0F172A', display: 'block', marginBottom: '4px' }}>
                LATE CANCELLATION PENALTY (%)
              </label>
              <select
                value={latePenaltyPct}
                onChange={(e) => setLatePenaltyPct(Number(e.target.value))}
                style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '13px' }}
              >
                <option value={30}>30% Vehicle Reservation Fee</option>
                <option value={50}>50% Standard Late Cancellation Fee</option>
                <option value={100}>100% Full Fare Forfeiture</option>
              </select>
            </div>

            <div>
              <label style={{ fontSize: '12px', fontWeight: 700, color: '#0F172A', display: 'block', marginBottom: '4px' }}>
                COMPLIMENTARY AIRPORT WAITING TIME (MINUTES AFTER TOUCHDOWN)
              </label>
              <input 
                type="number"
                value={airportWaitMins}
                onChange={(e) => setAirportWaitMins(Number(e.target.value))}
                style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '13px' }}
              />
            </div>

            <div>
              <label style={{ fontSize: '12px', fontWeight: 700, color: '#0F172A', display: 'block', marginBottom: '4px' }}>
                CUSTOM LEGAL NOTICE / DISCLOSURE TEXT
              </label>
              <textarea 
                rows={3}
                value={customTerms}
                onChange={(e) => setCustomTerms(e.target.value)}
                style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '13px' }}
              />
            </div>

            <button
              onClick={handleSavePolicy}
              style={{
                background: '#D97706',
                color: '#FFFFFF',
                padding: '12px',
                borderRadius: '8px',
                border: 'none',
                fontWeight: 800,
                fontSize: '14px',
                cursor: 'pointer',
                boxShadow: '0 2px 6px rgba(217,119,6,0.2)'
              }}
            >
              Save Policy Configuration
            </button>

            {policySaved && (
              <div style={{ background: '#DCFCE7', color: '#16A34A', padding: '10px', borderRadius: '8px', textAlign: 'center', fontSize: '12px', fontWeight: 700 }}>
                ✓ Policy successfully saved and active across all booking channels.
              </div>
            )}
          </div>
        </div>
      )}

    </div>
  );
};
