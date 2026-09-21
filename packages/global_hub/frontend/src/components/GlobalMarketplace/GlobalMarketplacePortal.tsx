import React, { useState } from 'react';
import { Plane, MapPin, Calendar, Users, DollarSign, ArrowRight, ShieldCheck, Clock, CheckCircle2 } from 'lucide-react';

export const GlobalMarketplacePortal: React.FC = () => {
  const [legs, setLegs] = useState([
    {
      id: 1,
      city: 'New York (JFK)',
      origin: 'The Carlyle Hotel, Upper East Side',
      destination: 'JFK Terminal 4 (Flight BA 178)',
      vehicle: 'Cadillac Escalade ESV',
      dist: '18.2 mi',
      status: 'LOCKED_IN_NETWORK',
      price: 210.87,
      node: 'hub-us-east-prod'
    },
    {
      id: 2,
      city: 'London (LHR)',
      origin: 'Heathrow Airport Terminal 5',
      destination: 'The Savoy, Strand, London',
      vehicle: 'Mercedes-Benz S 580',
      dist: '16.5 mi',
      status: 'DELEGATED_TO_EU_HUB',
      price: 195.40,
      node: 'hub-eu-west-prod'
    },
    {
      id: 3,
      city: 'Dubai (DXB)',
      origin: 'Dubai International DXB VIP Lounge',
      destination: 'Burj Al Arab Suite Dropoff',
      vehicle: 'Cadillac Escalade ESV',
      dist: '15.0 mi',
      status: 'DELEGATED_TO_ME_HUB',
      price: 194.58,
      node: 'hub-me-central-prod'
    }
  ]);

  const totalAllInclusive = legs.reduce((acc, leg) => acc + leg.price, 0);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Hero (Light Mode) */}
      <div className="glass-card" style={{ padding: '28px', background: 'linear-gradient(135deg, #FFFFFF 0%, #F8FAFC 50%, #EFF6FF 100%)', border: '1px solid #E2E8F0' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
          <span style={{ background: '#E0F2FE', color: '#0369A1', padding: '3px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: 800, border: '1px solid #BAE6FD' }}>
            Global Clearinghouse
          </span>
          <span style={{ fontSize: '12px', color: '#64748B', fontWeight: 600 }}>Multi-City & Transcontinental Journeys</span>
        </div>
        <h2 style={{ fontSize: '26px', fontWeight: '800', color: '#0F172A' }}>Transcontinental Chauffeured Itinerary Builder</h2>
        <p style={{ fontSize: '14px', color: '#64748B', marginTop: '4px' }}>
          Seamless booking across multi-continent legs. Sourced and serviced by local vetted affiliates with 80/10/10 Stripe split.
        </p>
      </div>

      {/* Itinerary Legs Stack */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {legs.map((leg, i) => (
          <div key={leg.id} className="glass-card" style={{ padding: '22px', borderLeft: '4px solid #0078D4', background: '#FFFFFF', border: '1px solid #E2E8F0' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px', marginBottom: '14px' }}>
              <div>
                <span style={{ fontSize: '11px', fontWeight: '800', color: '#0078D4', letterSpacing: '0.05em' }}>LEG {i + 1} — {leg.city}</span>
                <h3 style={{ fontSize: '17px', fontWeight: '700', color: '#0F172A', marginTop: '2px' }}>{leg.vehicle}</h3>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '22px', fontWeight: '800', color: '#0078D4' }}>${leg.price.toFixed(2)}</div>
                <span style={{ fontSize: '11px', color: '#64748B', fontWeight: 600 }}>All-Inclusive (Tax + Tip)</span>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '14px', background: '#F8FAFC', padding: '14px', borderRadius: '12px', border: '1px solid #E2E8F0' }}>
              <div>
                <div style={{ fontSize: '10px', color: '#64748B', fontWeight: 600 }}>PICKUP LOCATION</div>
                <div style={{ fontSize: '13px', fontWeight: '700', color: '#0F172A' }}>{leg.origin}</div>
              </div>
              <div>
                <div style={{ fontSize: '10px', color: '#64748B', fontWeight: 600 }}>DROP-OFF DESTINATION</div>
                <div style={{ fontSize: '13px', fontWeight: '700', color: '#0F172A' }}>{leg.destination}</div>
              </div>
              <div>
                <div style={{ fontSize: '10px', color: '#64748B', fontWeight: 600 }}>AUTHORITATIVE HUB NODE</div>
                <div style={{ fontSize: '12px', fontWeight: '700', color: '#7C3AED', fontFamily: 'monospace' }}>{leg.node}</div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Escrow 80/10/10 Split Calculation Summary */}
      <div className="glass-card" style={{ padding: '24px', background: '#FFFFFF', border: '1px solid #E2E8F0' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <div style={{ fontSize: '12px', color: '#64748B', fontWeight: 600 }}>Total Itinerary Commitment (3 Legs)</div>
            <div style={{ fontSize: '28px', fontWeight: '800', color: '#0F172A' }}>${totalAllInclusive.toFixed(2)} USD</div>
            <div style={{ fontSize: '12px', color: '#16A34A', marginTop: '4px', fontWeight: 700 }}>
              ✓ Stripe Connect Pre-Authorization Hold Ready
            </div>
          </div>

          <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
            <div style={{ background: '#F8FAFC', padding: '12px 18px', borderRadius: '12px', border: '1px solid #E2E8F0' }}>
              <div style={{ fontSize: '10px', color: '#64748B', fontWeight: 600 }}>80% SERVICING CHAUFFEURS</div>
              <div style={{ fontSize: '16px', fontWeight: '800', color: '#16A34A' }}>${(totalAllInclusive * 0.8).toFixed(2)}</div>
            </div>
            <div style={{ background: '#F8FAFC', padding: '12px 18px', borderRadius: '12px', border: '1px solid #E2E8F0' }}>
              <div style={{ fontSize: '10px', color: '#64748B', fontWeight: 600 }}>10% ORIGINATING BOOKER</div>
              <div style={{ fontSize: '16px', fontWeight: '800', color: '#D97706' }}>${(totalAllInclusive * 0.1).toFixed(2)}</div>
            </div>
            <div style={{ background: '#F8FAFC', padding: '12px 18px', borderRadius: '12px', border: '1px solid #E2E8F0' }}>
              <div style={{ fontSize: '10px', color: '#64748B', fontWeight: 600 }}>10% GLOBAL CLEARINGHOUSE</div>
              <div style={{ fontSize: '16px', fontWeight: '800', color: '#0078D4' }}>${(totalAllInclusive * 0.1).toFixed(2)}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
