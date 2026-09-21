import React, { useState } from 'react';
import { 
  Mail, Phone, MessageSquare, Sparkles, ArrowRight, 
  CheckCircle2, FileText, Globe, Plane, Navigation, Clock
} from 'lucide-react';
import { parseOmnichannelEnquiry } from '../api';
import { MasterItinerary } from '../types';

export const OmnichannelPortal: React.FC = () => {
  const [channel, setChannel] = useState<'EMAIL' | 'VOICE' | 'WHATSAPP'>('EMAIL');
  const [sender, setSender] = useState('concierge@savoyhotel.com');
  const [rawText, setRawText] = useState(
    `From: concierge@savoyhotel.com\nSubject: VIP Delegation Itinerary for Ambassador Alexander Hamilton\n\nDear Limo Executive Team,\nPlease book an executive multi-leg itinerary for our VIP guest Ambassador Alexander Hamilton (phone: +1 202 555 0199):\n\nLeg 1: Outbound transfer from 550 W 54th St to John F. Kennedy International Airport (JFK), Terminal 4 VIP on Cadillac Escalade ESV.\nLeg 2: Flight BA 178 from JFK to London Heathrow Airport (LHR).\nLeg 3: London Chauffeur meet & greet from Heathrow Terminal 5 to The Savoy Hotel, Strand, London.\nLeg 4: High-speed rail transfer on Eurostar 9014 from London St Pancras to Paris Gare du Nord.\nLeg 5: Chauffeur transfer from Paris Gare du Nord to Hotel de Crillon, Paris on Mercedes S-Class.\n\nThank you,\nSavoy Concierge Desk`
  );

  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleParse = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await parseOmnichannelEnquiry(channel, sender, rawText);
      setResult(res);
    } catch (err: any) {
      setError(err.message || 'Failed to parse enquiry');
    } finally {
      setLoading(false);
    }
  };

  const itinerary: MasterItinerary | null = result?.itinerary || null;

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '24px' }}>
      <div style={{ marginBottom: '24px' }}>
        <div className="blue-badge" style={{ marginBottom: '6px' }}>
          <Sparkles size={12} /> Autonomous Omnichannel Intake & NLP Parser
        </div>
        <h1 style={{ fontSize: '28px', fontWeight: 800, color: '#0F172A' }}>
          Omnichannel Multi-Leg Ingestion Engine
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>
          Ingests unstructured emails, voice transcripts, and WhatsApp messages, extracting multi-modal $N$-leg journeys with source text provenance.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', alignItems: 'start' }}>
        {/* Left: Input Console */}
        <div className="glass-card" style={{ padding: '24px' }}>
          <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
            <button
              type="button"
              onClick={() => setChannel('EMAIL')}
              style={{
                background: channel === 'EMAIL' ? 'var(--accent-blue-gradient)' : '#FFFFFF',
                color: channel === 'EMAIL' ? '#FFF' : 'var(--text-secondary)',
                border: '1px solid var(--border-subtle)',
                padding: '8px 16px',
                borderRadius: '8px',
                fontSize: '13px',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <Mail size={14} /> Inbound Email & Attachments
            </button>

            <button
              type="button"
              onClick={() => setChannel('VOICE')}
              style={{
                background: channel === 'VOICE' ? 'var(--accent-blue-gradient)' : '#FFFFFF',
                color: channel === 'VOICE' ? '#FFF' : 'var(--text-secondary)',
                border: '1px solid var(--border-subtle)',
                padding: '8px 16px',
                borderRadius: '8px',
                fontSize: '13px',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <Phone size={14} /> Telephony / Voice IVR
            </button>

            <button
              type="button"
              onClick={() => setChannel('WHATSAPP')}
              style={{
                background: channel === 'WHATSAPP' ? 'var(--accent-blue-gradient)' : '#FFFFFF',
                color: channel === 'WHATSAPP' ? '#FFF' : 'var(--text-secondary)',
                border: '1px solid var(--border-subtle)',
                padding: '8px 16px',
                borderRadius: '8px',
                fontSize: '13px',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <MessageSquare size={14} /> WhatsApp Business
            </button>
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>
              SENDER IDENTIFIER (EMAIL / PHONE)
            </label>
            <input
              type="text"
              value={sender}
              onChange={(e) => setSender(e.target.value)}
              style={{ width: '100%', padding: '10px', borderRadius: '8px', fontSize: '13px' }}
            />
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>
              RAW INBOUND MESSAGE CONTENT & ITINERARY TEXT
            </label>
            <textarea
              rows={12}
              value={rawText}
              onChange={(e) => setRawText(e.target.value)}
              style={{ width: '100%', padding: '12px', borderRadius: '8px', fontSize: '13px', fontFamily: 'monospace', lineHeight: '1.5' }}
            />
          </div>

          <button
            onClick={handleParse}
            disabled={loading}
            className="btn-primary"
            style={{ width: '100%', padding: '12px' }}
          >
            {loading ? 'Running Autonomous NLP Extraction...' : 'Extract & Generate N-Leg Master Itinerary'}
          </button>
        </div>

        {/* Right: Parsed Itinerary & Visual Timeline */}
        <div>
          {itinerary ? (
            <div className="glass-card" style={{ padding: '24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <div>
                  <span className="gold-badge" style={{ marginBottom: '4px' }}>
                    {result?.passenger_name} · {itinerary.total_legs_count} Verified Legs
                  </span>
                  <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#0F172A', marginTop: '4px' }}>
                    {itinerary.title}
                  </h3>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>ALL-INCLUSIVE TOTAL</div>
                  <div style={{ fontSize: '22px', fontWeight: 800, color: 'var(--accent-blue)' }}>
                    ${Number(itinerary.all_inclusive_total || 0).toFixed(2)} USD
                  </div>
                </div>
              </div>

              {/* Geographic Spans */}
              <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', flexWrap: 'wrap' }}>
                <span className="blue-badge">Countries: {itinerary.countries_spanned.join(' ➔ ')}</span>
                <span className="blue-badge">Cities: {itinerary.cities_spanned.join(' ➔ ')}</span>
              </div>

              {/* Sequential Leg Timeline */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {itinerary.legs.map((leg, idx) => (
                  <div key={leg.leg_id || idx} style={{ background: '#F8FAFC', border: '1px solid var(--border-subtle)', borderRadius: '10px', padding: '14px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                      <span style={{ fontWeight: 700, fontSize: '13px', color: '#0F172A', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        {leg.leg_mode === 'FLIGHT' ? '✈️' : leg.leg_mode === 'TRAIN' ? '🚆' : leg.leg_mode === 'HELICOPTER_TRANSFER' ? '🚁' : '🚘'}
                        Leg {leg.leg_index}: {leg.title}
                      </span>
                      <span style={{ fontWeight: 700, fontSize: '13px', color: '#2563EB' }}>
                        {Number(leg.total_leg_amount || 0) > 0 ? `$${Number(leg.total_leg_amount).toFixed(2)}` : 'Transit Tracked'}
                      </span>
                    </div>

                    <div style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                      <div><strong>From:</strong> {leg.origin_address} ({leg.origin_city})</div>
                      <div><strong>To:</strong> {leg.destination_address} ({leg.destination_city})</div>
                    </div>

                    {leg.transit_info && (
                      <div style={{ marginTop: '6px', fontSize: '11px', color: '#2563EB', fontWeight: 600 }}>
                        📡 {leg.transit_info.carrier_name} ({leg.transit_info.identifier || 'Live Tracking'}) · {leg.transit_info.status_summary || 'On Schedule'}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="glass-card" style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
              <Globe size={40} color="#94A3B8" style={{ margin: '0 auto 16px auto', display: 'block' }} />
              <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#0F172A', marginBottom: '6px' }}>
                Awaiting Omnichannel Message
              </h3>
              <p style={{ fontSize: '13px' }}>
                Select a channel and click "Extract & Generate N-Leg Master Itinerary" to inspect structured journey parsing.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
