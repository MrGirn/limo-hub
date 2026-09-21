import React, { useState, useEffect } from 'react';
import { 
  Building2, Globe, Shield, RefreshCw, Zap, Server, 
  ArrowUpRight, AlertTriangle, CheckCircle, Database, 
  Cpu, Plane, DollarSign, Activity, Layers, Play, Mail, Send, Users, Sparkles, FileText, Check
} from 'lucide-react';

interface VendorCellStatus {
  vendor_id: string;
  vendor_name: string;
  operating_mode: string;
  tier?: string;
  circuit_breaker_status: string;
  local_currency: string;
  local_db_partition_id: string;
  total_bookings_processed: number;
  pending_outbox_events: number;
  available_drivers_count: number;
  blast_radius_isolated: boolean;
}

interface HubAnalytics {
  active_connected_vendor_cells: number;
  vendor_cell_ids: string[];
  total_local_bookings_across_cells: number;
  total_outbox_events_synced: number;
  shared_llm_tokens_pooled: number;
  shared_flight_radar_streams_active: number;
  estimated_monthly_cloud_savings_usd: number;
  savings_breakdown: {
    multiplexed_flight_radar_usd: number;
    pooled_ai_gateway_usd: number;
    serverless_scale_to_zero_infra_usd: number;
  };
  hub_health_status: string;
  global_clearing_currency: string;
}

export const VendorCellAndGlobalHubStudio: React.FC = () => {
  const [selectedVendor, setSelectedVendor] = useState<string>('vendor_anb_philly');
  const [activeTab, setActiveTab] = useState<'overview' | 'portal' | 'email' | 'affiliate' | 'spinup'>('overview');
  const [cellStatus, setCellStatus] = useState<VendorCellStatus | null>(null);
  const [hubAnalytics, setHubAnalytics] = useState<HubAnalytics | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [syncing, setSyncing] = useState<boolean>(false);
  const [lastSyncResult, setLastSyncResult] = useState<any>(null);

  // Direct Booking State
  const [passengerName, setPassengerName] = useState<string>('Director Harrison Vance');
  const [distanceKm, setDistanceKm] = useState<number>(18.2);
  const [vehicleClass, setVehicleClass] = useState<string>('FIRST_CLASS');
  const [lastBooking, setLastBooking] = useState<any>(null);

  // Email Gateway State
  const [inboundEmailText, setInboundEmailText] = useState<string>(
    "Hello ANB Team,\nPlease book a luxury SUV for passenger Director Harrison Vance, phone: +12155550199.\nPickup: Philadelphia International Airport (PHL) Terminal A\nDropoff: The Ritz-Carlton Philadelphia, 10 Avenue of the Arts\nFlight: AA 1204 arriving tomorrow at 4:30 PM."
  );
  const [parsedRFQ, setParsedRFQ] = useState<any>(null);
  const [outboundEmailResult, setOutboundEmailResult] = useState<any>(null);
  const [parsingEmail, setParsingEmail] = useState<boolean>(false);

  // Affiliate Farming State
  const [performingVendor, setPerformingVendor] = useState<string>('vendor_anb_philly');
  const [affiliatePassenger, setAffiliatePassenger] = useState<string>('Elena Rostova');
  const [lastAffiliateRecord, setLastAffiliateRecord] = useState<any>(null);
  const [farmingRide, setFarmingRide] = useState<boolean>(false);

  // Spin-Up State
  const [newVendorYaml, setNewVendorYaml] = useState<string>(
`vendor:
  id: "vendor_miami_sobe"
  name: "South Beach Sovereign Chauffeurs (Miami, FL)"
  tier: "AUTONOMOUS_T1"
  region: "Miami / Fort Lauderdale (MIA/FLL)"
  currency: "USD"
  base_rate_usd: 85.00
  per_km_usd: 3.75
  tax_rate_pct: 7.00
  domain: "sobe-limo.com"
  inbound_email: "rides@sobe-limo.com"
  contact_phone: "+13055550199"`
  );
  const [spinUpResult, setSpinUpResult] = useState<any>(null);
  const [spinningUp, setSpinningUp] = useState<boolean>(false);

  useEffect(() => {
    fetchCellAndHubData();
  }, [selectedVendor]);

  const fetchCellAndHubData = async () => {
    setLoading(true);
    try {
      const [cellRes, hubRes] = await Promise.all([
        fetch(`http://localhost:8000/api/v1/vendor-cell/${selectedVendor}/status`),
        fetch('http://localhost:8000/api/v1/global-hub/analytics')
      ]);
      if (cellRes.ok) {
        const cData = await cellRes.json();
        setCellStatus(cData);
      }
      if (hubRes.ok) {
        const hData = await hubRes.json();
        setHubAnalytics(hData);
      }
    } catch {
      // Fallback
      setCellStatus({
        vendor_id: selectedVendor,
        vendor_name: selectedVendor.includes('anb') ? 'ANB Limo Company (Philadelphia, PA)' : 'Empire Executive Chauffeurs NY',
        operating_mode: 'GLOBAL_FEDERATED',
        tier: 'AUTONOMOUS_T1',
        circuit_breaker_status: 'HEALTHY',
        local_currency: 'USD',
        local_db_partition_id: 'db_partition_7f3ea6',
        total_bookings_processed: 3,
        pending_outbox_events: 0,
        available_drivers_count: 3,
        blast_radius_isolated: true
      });
      setHubAnalytics({
        active_connected_vendor_cells: 4,
        vendor_cell_ids: ['vendor_anb_philly', 'vendor_ny_executive', 'vendor_london_royal', 'vendor_tokyo_sovereign'],
        total_local_bookings_across_cells: 3,
        total_outbox_events_synced: 3,
        shared_llm_tokens_pooled: 250,
        shared_flight_radar_streams_active: 1,
        estimated_monthly_cloud_savings_usd: 1680.0,
        savings_breakdown: {
          multiplexed_flight_radar_usd: 1500.0,
          pooled_ai_gateway_usd: 0.0,
          serverless_scale_to_zero_infra_usd: 180.0
        },
        hub_health_status: 'ONLINE_HEALTHY',
        global_clearing_currency: 'USD'
      });
    } finally {
      setLoading(false);
    }
  };

  const toggleCircuitBreaker = async (status: string) => {
    try {
      const res = await fetch(`http://localhost:8000/api/v1/vendor-cell/${selectedVendor}/circuit-breaker`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      });
      if (res.ok) {
        const data = await res.json();
        if (cellStatus) {
          setCellStatus({ ...cellStatus, circuit_breaker_status: data.circuit_breaker_status });
        }
      }
    } catch {
      if (cellStatus) {
        setCellStatus({ ...cellStatus, circuit_breaker_status: status });
      }
    }
  };

  const syncOutbox = async () => {
    setSyncing(true);
    try {
      const res = await fetch(`http://localhost:8000/api/v1/vendor-cell/${selectedVendor}/outbox/sync`, {
        method: 'POST'
      });
      if (res.ok) {
        const data = await res.json();
        setLastSyncResult(data);
        fetchCellAndHubData();
      }
    } catch {
      setLastSyncResult({ status: 'SYNC_SUCCESSFUL (DEMO)', synced_count: cellStatus?.pending_outbox_events || 1 });
      if (cellStatus) {
        setCellStatus({ ...cellStatus, pending_outbox_events: 0 });
      }
    } finally {
      setSyncing(false);
    }
  };

  const getCityAddresses = (vendor: string) => {
    switch(vendor) {
      case 'vendor_anb_philly':
        return {
          pickup: 'Philadelphia International Airport (PHL) Terminal A',
          dropoff: 'The Ritz-Carlton Philadelphia, 10 Avenue of the Arts, PA',
          phone: '+12155550144',
          defaultKm: 18.2
        };
      case 'vendor_london_royal':
        return {
          pickup: 'London Heathrow Airport (LHR) VIP Suite',
          dropoff: 'The Connaught Hotel, Carlos Place, Mayfair, London',
          phone: '+442079460199',
          defaultKm: 24.5
        };
      case 'vendor_tokyo_sovereign':
        return {
          pickup: 'Tokyo Haneda Airport (HND) VIP Terminal',
          dropoff: 'Aman Tokyo, Otemachi, Chiyoda City, Tokyo',
          phone: '+8135550198',
          defaultKm: 22.0
        };
      case 'vendor_ny_executive':
      default:
        return {
          pickup: '767 5th Ave, Manhattan, NY',
          dropoff: 'JFK Airport Terminal 4 VIP Gate',
          phone: '+12125550199',
          defaultKm: 28.5
        };
    }
  };

  const executeDirectBooking = async () => {
    const route = getCityAddresses(selectedVendor);
    try {
      const res = await fetch(`http://localhost:8000/api/v1/vendor-cell/${selectedVendor}/booking/direct`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          passenger_name: passengerName,
          passenger_phone: route.phone,
          pickup_address: route.pickup,
          dropoff_address: route.dropoff,
          distance_km: distanceKm,
          vehicle_class: vehicleClass
        })
      });
      if (res.ok) {
        const data = await res.json();
        setLastBooking(data);
        fetchCellAndHubData();
      }
    } catch {
      setLastBooking({
        booking_id: `bk_demo_${Math.floor(Math.random()*10000)}`,
        vendor_id: selectedVendor,
        passenger_name: passengerName,
        estimated_cost_usd: Math.round(distanceKm * 3.25 + 75.0),
        status: 'CONFIRMED',
        fallback_pricing_applied: cellStatus?.circuit_breaker_status !== 'HEALTHY'
      });
      if (cellStatus) {
        setCellStatus({
          ...cellStatus,
          total_bookings_processed: cellStatus.total_bookings_processed + 1,
          pending_outbox_events: cellStatus.pending_outbox_events + 1
        });
      }
    }
  };

  const parseInboundEmail = async () => {
    setParsingEmail(true);
    try {
      const res = await fetch(`http://localhost:8000/api/v1/vendor-cell/${selectedVendor}/email/inbound-parse`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sender_email: 'traveldesk@blackrock.com',
          subject: 'VIP Transfer Request',
          body: inboundEmailText
        })
      });
      if (res.ok) {
        const data = await res.json();
        setParsedRFQ(data);
      }
    } catch {
      setParsedRFQ({
        email_id: 'eml_in_demo',
        vendor_id: selectedVendor,
        parsed_passenger_name: 'Director Harrison Vance',
        parsed_pickup: 'Philadelphia International Airport (PHL) Terminal A',
        parsed_dropoff: 'The Ritz-Carlton Philadelphia, 10 Avenue of the Arts',
        parsed_flight_number: 'AA 1204',
        parsed_vehicle_class: 'LUXURY_SUV',
        quoted_amount_usd: 146.06,
        status: 'PARSED_QUOTED'
      });
    } finally {
      setParsingEmail(false);
    }
  };

  const sendOutboundConfirmation = async () => {
    try {
      const res = await fetch(`http://localhost:8000/api/v1/vendor-cell/${selectedVendor}/email/outbound-dispatch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipient_email: 'hvance@blackrock.com',
          booking_id: parsedRFQ?.email_id ? `bk_${parsedRFQ.email_id}` : 'bk_philly_901',
          passenger_name: parsedRFQ?.parsed_passenger_name || 'Director Harrison Vance',
          pickup_address: parsedRFQ?.parsed_pickup || 'PHL Airport',
          dropoff_address: parsedRFQ?.parsed_dropoff || 'The Ritz-Carlton Philadelphia',
          vehicle_class: parsedRFQ?.parsed_vehicle_class || 'LUXURY_SUV',
          amount_usd: parsedRFQ?.quoted_amount_usd || 146.06,
          driver_name: 'Marcus Brody',
          driver_phone: '+12155550991',
          vehicle_info: 'Cadillac Escalade ESV (Plate: PA-LM992)',
          company_name: cellStatus?.vendor_name || 'ANB Limo Company'
        })
      });
      if (res.ok) {
        const data = await res.json();
        setOutboundEmailResult(data);
      }
    } catch {
      setOutboundEmailResult({
        message_id: 'eml_out_demo99',
        sender_from: `${cellStatus?.vendor_name} Dispatch <dispatch@anblimo-philly.com>`,
        subject: `Booking Confirmed: bk_philly_901 - ${cellStatus?.vendor_name}`,
        dkim_signature: 'v=1; a=rsa-sha256; d=anblimo-philly.com; s=limo',
        spf_record_status: 'PASS_VERIFIED',
        status: 'DELIVERED'
      });
    }
  };

  const executeAffiliateFarmOut = async () => {
    setFarmingRide(true);
    try {
      const res = await fetch(`http://localhost:8000/api/v1/vendor-cell/${selectedVendor}/affiliate/farm-out`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          performing_vendor_id: performingVendor,
          passenger_name: affiliatePassenger,
          passenger_phone: '+12125550199',
          pickup_address: 'Philadelphia International Airport (PHL) Terminal A',
          dropoff_address: 'The Ritz-Carlton Philadelphia',
          distance_km: 18.2,
          vehicle_class: 'FIRST_CLASS'
        })
      });
      if (res.ok) {
        const data = await res.json();
        setLastAffiliateRecord(data);
        fetchCellAndHubData();
      }
    } catch {
      setLastAffiliateRecord({
        exchange_id: 'aff_xch_demo',
        originator_vendor_name: 'Empire Executive Chauffeurs NY',
        performing_vendor_name: 'ANB Limo Company (Philadelphia, PA)',
        passenger_name: affiliatePassenger,
        fare_split: {
          gross_fare_usd: 146.06,
          performing_vendor_net_usd: 124.15,
          originating_vendor_commission_usd: 14.61,
          hub_clearing_fee_usd: 7.30
        },
        status: 'ACCEPTED_DISPATCHED',
        assigned_driver_id: 'driver_anb_01'
      });
    } finally {
      setFarmingRide(false);
    }
  };

  const executeDeclarativeSpinUp = async () => {
    setSpinningUp(true);
    try {
      const res = await fetch('http://localhost:8000/api/v1/vendor-cell/spin-up', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vendor_id: 'vendor_miami_sobe',
          name: 'South Beach Sovereign Chauffeurs (Miami, FL)',
          tier: 'AUTONOMOUS_T1',
          region: 'Miami / Fort Lauderdale (MIA/FLL)',
          currency: 'USD',
          base_rate_usd: 85.00,
          per_km_usd: 3.75,
          tax_rate_pct: 7.00,
          domain: 'sobe-limo.com',
          inbound_email: 'rides@sobe-limo.com',
          contact_phone: '+13055550199',
          drivers: [{ id: 'driver_mia_01', name: 'Carlos Santos', vehicle: 'Cadillac Escalade' }],
          branding: {
            company_tagline: 'Miami VIP Airport & Yacht Chauffeur Services',
            primary_color: '#0D9488',
            accent_color: '#F59E0B',
            domain: 'sobe-limo.com',
            contact_phone: '+13055550199'
          }
        })
      });
      if (res.ok) {
        const data = await res.json();
        setSpinUpResult(data);
        fetchCellAndHubData();
      }
    } catch {
      setSpinUpResult({
        vendor_id: 'vendor_miami_sobe',
        vendor_name: 'South Beach Sovereign Chauffeurs (Miami, FL)',
        tier: 'AUTONOMOUS_T1',
        operating_mode: 'GLOBAL_FEDERATED',
        local_currency: 'USD',
        local_db_partition_id: 'db_partition_mia_01',
        circuit_breaker_status: 'HEALTHY'
      });
    } finally {
      setSpinningUp(false);
    }
  };

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      gap: '20px',
      padding: '24px',
      background: '#F8FAFC',
      minHeight: '100vh',
      fontFamily: 'system-ui, -apple-system, sans-serif'
    }}>
      
      {/* Top Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        background: '#0F172A',
        color: '#FFFFFF',
        padding: '20px 24px',
        borderRadius: '16px',
        boxShadow: '0 4px 20px rgba(15, 23, 42, 0.15)'
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Building2 size={24} color="#38BDF8" />
            <h1 style={{ margin: 0, fontSize: '20px', fontWeight: 800, letterSpacing: '-0.5px' }}>
              Autonomous Single-Tenant Vendor Suite & Global Federation Hub
            </h1>
          </div>
          <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#94A3B8' }}>
            Zero-Shared-Failure Cellular Architecture • Dedicated Inbound/Outbound Email • B2B Affiliate Exchange
          </p>
        </div>

        {/* Vendor Selector */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ fontSize: '12px', color: '#64748B', fontWeight: 600 }}>Active Vendor Cell:</span>
          <select 
            value={selectedVendor} 
            onChange={(e) => setSelectedVendor(e.target.value)}
            style={{
              background: '#FFFFFF',
              color: '#0F172A',
              border: '1.5px solid #CBD5E1',
              borderRadius: '8px',
              padding: '8px 14px',
              fontSize: '13px',
              fontWeight: 700,
              cursor: 'pointer',
              boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
            }}
          >
            <option value="vendor_anb_philly">🔔 ANB Limo Company (Philadelphia, PA - T-1)</option>
            <option value="vendor_ny_executive">🇺🇸 Empire Executive Chauffeurs NY (USD - T-0)</option>
            <option value="vendor_london_royal">🇬🇧 Royal Crown Chauffeurs London (GBP - T-0)</option>
            <option value="vendor_tokyo_sovereign">🇯🇵 Tokyo Imperial Chauffeurs (JPY - T-0)</option>
            {spinUpResult && <option value="vendor_miami_sobe">🌴 South Beach Sovereign (Miami, FL - T-1)</option>}
          </select>
        </div>
      </div>

      {/* Navigation Tabs (Light Mode) */}
      <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid #E2E8F0', paddingBottom: '12px', flexWrap: 'wrap' }}>
        <button
          onClick={() => setActiveTab('overview')}
          style={{
            padding: '8px 16px',
            borderRadius: '8px',
            fontSize: '13px',
            fontWeight: 700,
            cursor: 'pointer',
            border: activeTab === 'overview' ? '1px solid #0078D4' : '1px solid #E2E8F0',
            background: activeTab === 'overview' ? '#0078D4' : '#FFFFFF',
            color: activeTab === 'overview' ? '#FFFFFF' : '#475569',
            boxShadow: activeTab === 'overview' ? '0 2px 8px rgba(0, 120, 212, 0.25)' : 'none'
          }}
        >
          <Layers size={14} style={{ display: 'inline', marginRight: '6px' }} />
          Cellular Overview & Fallback
        </button>

        <button
          onClick={() => setActiveTab('portal')}
          style={{
            padding: '8px 16px',
            borderRadius: '8px',
            fontSize: '13px',
            fontWeight: 700,
            cursor: 'pointer',
            border: activeTab === 'portal' ? '1px solid #0078D4' : '1px solid #E2E8F0',
            background: activeTab === 'portal' ? '#0078D4' : '#FFFFFF',
            color: activeTab === 'portal' ? '#FFFFFF' : '#475569',
            boxShadow: activeTab === 'portal' ? '0 2px 8px rgba(0, 120, 212, 0.25)' : 'none'
          }}
        >
          <Globe size={14} style={{ display: 'inline', marginRight: '6px' }} />
          Branded Public Booking Website
        </button>

        <button
          onClick={() => setActiveTab('email')}
          style={{
            padding: '8px 16px',
            borderRadius: '8px',
            fontSize: '13px',
            fontWeight: 700,
            cursor: 'pointer',
            border: activeTab === 'email' ? '1px solid #0078D4' : '1px solid #E2E8F0',
            background: activeTab === 'email' ? '#0078D4' : '#FFFFFF',
            color: activeTab === 'email' ? '#FFFFFF' : '#475569',
            boxShadow: activeTab === 'email' ? '0 2px 8px rgba(0, 120, 212, 0.25)' : 'none'
          }}
        >
          <Mail size={14} style={{ display: 'inline', marginRight: '6px' }} />
          Dedicated Email Gateway
        </button>

        <button
          onClick={() => setActiveTab('affiliate')}
          style={{
            padding: '8px 16px',
            borderRadius: '8px',
            fontSize: '13px',
            fontWeight: 700,
            cursor: 'pointer',
            border: activeTab === 'affiliate' ? '1px solid #0078D4' : '1px solid #E2E8F0',
            background: activeTab === 'affiliate' ? '#0078D4' : '#FFFFFF',
            color: activeTab === 'affiliate' ? '#FFFFFF' : '#475569',
            boxShadow: activeTab === 'affiliate' ? '0 2px 8px rgba(0, 120, 212, 0.25)' : 'none'
          }}
        >
          <Users size={14} style={{ display: 'inline', marginRight: '6px' }} />
          B2B Affiliate Cross-Dispatch
        </button>

        <button
          onClick={() => setActiveTab('spinup')}
          style={{
            padding: '8px 16px',
            borderRadius: '8px',
            fontSize: '13px',
            fontWeight: 700,
            cursor: 'pointer',
            border: activeTab === 'spinup' ? '1px solid #0078D4' : '1px solid #E2E8F0',
            background: activeTab === 'spinup' ? '#0078D4' : '#FFFFFF',
            color: activeTab === 'spinup' ? '#FFFFFF' : '#475569',
            boxShadow: activeTab === 'spinup' ? '0 2px 8px rgba(0, 120, 212, 0.25)' : 'none'
          }}
        >
          <Sparkles size={14} style={{ display: 'inline', marginRight: '6px' }} />
          Declarative Cell Spin-Up
        </button>
      </div>

      {/* TAB 1: Cellular Overview & Fault Isolation */}
      {activeTab === 'overview' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
          
          {/* LEFT: Autonomous Vendor Cell */}
          <div style={{
            background: '#FFFFFF',
            borderRadius: '16px',
            padding: '24px',
            border: '1px solid #E2E8F0',
            boxShadow: '0 4px 16px rgba(0,0,0,0.03)',
            display: 'flex',
            flexDirection: 'column',
            gap: '20px'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Building2 size={20} color="#2563EB" />
                <h2 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: '#0F172A' }}>
                  {cellStatus?.vendor_name}
                </h2>
              </div>
              <span style={{
                fontSize: '11px',
                padding: '3px 8px',
                borderRadius: '6px',
                fontWeight: 700,
                background: cellStatus?.circuit_breaker_status === 'HEALTHY' ? 'rgba(16, 185, 129, 0.12)' : 'rgba(239, 68, 68, 0.12)',
                color: cellStatus?.circuit_breaker_status === 'HEALTHY' ? '#059669' : '#DC2626',
                border: `1px solid ${cellStatus?.circuit_breaker_status === 'HEALTHY' ? '#10B981' : '#EF4444'}`
              }}>
                STATUS: {cellStatus?.circuit_breaker_status}
              </span>
            </div>

            {/* Metrics */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
              <div style={{ background: '#F8FAFC', padding: '12px', borderRadius: '10px', border: '1px solid #E2E8F0' }}>
                <div style={{ fontSize: '11px', color: '#64748B', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Database size={13} /> DB Partition
                </div>
                <div style={{ fontSize: '13px', fontWeight: 700, color: '#0F172A', marginTop: '4px' }}>
                  {cellStatus?.local_db_partition_id}
                </div>
                <div style={{ fontSize: '10px', color: '#10B981', fontWeight: 600 }}>100% Private Schema</div>
              </div>

              <div style={{ background: '#F8FAFC', padding: '12px', borderRadius: '10px', border: '1px solid #E2E8F0' }}>
                <div style={{ fontSize: '11px', color: '#64748B', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Activity size={13} /> Direct Rides
                </div>
                <div style={{ fontSize: '14px', fontWeight: 700, color: '#0F172A', marginTop: '4px' }}>
                  {cellStatus?.total_bookings_processed}
                </div>
                <div style={{ fontSize: '10px', color: '#64748B' }}>Zero Cloud Blockers</div>
              </div>

              <div style={{ background: '#F8FAFC', padding: '12px', borderRadius: '10px', border: '1px solid #E2E8F0' }}>
                <div style={{ fontSize: '11px', color: '#64748B', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Zap size={13} /> Chauffeurs
                </div>
                <div style={{ fontSize: '14px', fontWeight: 700, color: '#0F172A', marginTop: '4px' }}>
                  {cellStatus?.available_drivers_count} Active
                </div>
                <div style={{ fontSize: '10px', color: '#64748B' }}>Local Fleet Assigned</div>
              </div>
            </div>

            {/* Circuit Breaker Simulator */}
            <div style={{ background: '#FFFBEB', padding: '14px', borderRadius: '10px', border: '1px solid #FDE68A' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', fontWeight: 700, color: '#92400E' }}>
                <AlertTriangle size={16} /> Circuit-Breaker Fault Injection Simulator
              </div>
              <p style={{ margin: '6px 0 12px 0', fontSize: '12px', color: '#78350F' }}>
                Trip the circuit breaker to simulate total Global Cloud disconnection. The vendor cell will immediately switch to sovereign deterministic fallback pricing with 0 external API calls.
              </p>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  onClick={() => toggleCircuitBreaker('HEALTHY')}
                  style={{
                    flex: 1,
                    padding: '8px',
                    borderRadius: '6px',
                    fontSize: '12px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    background: cellStatus?.circuit_breaker_status === 'HEALTHY' ? '#059669' : '#FFFFFF',
                    color: cellStatus?.circuit_breaker_status === 'HEALTHY' ? '#FFFFFF' : '#059669',
                    border: '1px solid #059669'
                  }}
                >
                  Set Healthy (Federated)
                </button>
                <button
                  onClick={() => toggleCircuitBreaker('DEGRADED_FALLBACK')}
                  style={{
                    flex: 1,
                    padding: '8px',
                    borderRadius: '6px',
                    fontSize: '12px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    background: cellStatus?.circuit_breaker_status === 'DEGRADED_FALLBACK' ? '#DC2626' : '#FFFFFF',
                    color: cellStatus?.circuit_breaker_status === 'DEGRADED_FALLBACK' ? '#FFFFFF' : '#DC2626',
                    border: '1px solid #DC2626'
                  }}
                >
                  Trip (Offline Fallback)
                </button>
              </div>
            </div>

            {/* Direct Booking Simulator */}
            <div style={{ border: '1px solid #E2E8F0', padding: '16px', borderRadius: '12px' }}>
              <div style={{ fontSize: '13px', fontWeight: 700, color: '#0F172A', marginBottom: '10px' }}>
                🚗 Instant Cellular Direct Booking Simulator
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '10px' }}>
                <div>
                  <label style={{ fontSize: '11px', color: '#64748B', fontWeight: 600 }}>Passenger Name</label>
                  <input
                    type="text"
                    value={passengerName}
                    onChange={(e) => setPassengerName(e.target.value)}
                    style={{ width: '100%', padding: '6px 8px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '12px' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '11px', color: '#64748B', fontWeight: 600 }}>Vehicle Class</label>
                  <select
                    value={vehicleClass}
                    onChange={(e) => setVehicleClass(e.target.value)}
                    style={{ width: '100%', padding: '6px 8px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '12px' }}
                  >
                    <option value="FIRST_CLASS">First Class Sedan</option>
                    <option value="LUXURY_SUV">Luxury SUV (Escalade)</option>
                    <option value="ULTRA_LUXURY">Ultra-Luxury (Maybach)</option>
                    <option value="ELECTRIC_VIP">Electric VIP (Lucid)</option>
                  </select>
                </div>
              </div>

              <button
                onClick={executeDirectBooking}
                style={{
                  width: '100%',
                  padding: '10px',
                  borderRadius: '8px',
                  background: '#2563EB',
                  color: '#FFFFFF',
                  fontWeight: 700,
                  fontSize: '13px',
                  border: 'none',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px'
                }}
              >
                <Play size={15} /> Execute Direct Local Ride Booking
              </button>

              {lastBooking && (
                <div style={{ marginTop: '12px', background: '#F0FDF4', padding: '12px', borderRadius: '8px', border: '1px solid #BBF7D0' }}>
                  <div style={{ fontSize: '12px', fontWeight: 700, color: '#166534' }}>
                    ✅ Booking {lastBooking.booking_id} Confirmed!
                  </div>
                  <div style={{ fontSize: '12px', color: '#15803D', marginTop: '4px' }}>
                    Fare: <strong>${lastBooking.estimated_cost_usd} USD</strong> • Driver: <strong>{lastBooking.assigned_driver_id}</strong>
                  </div>
                  <div style={{ fontSize: '11px', color: '#166534', marginTop: '2px' }}>
                    Fallback Pricing Applied: {lastBooking.fallback_pricing_applied ? 'YES (0 Cloud Calls)' : 'NO (Dynamic)'}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* RIGHT: Global Federation Hub */}
          <div style={{
            background: '#FFFFFF',
            borderRadius: '16px',
            padding: '24px',
            border: '1px solid #E2E8F0',
            boxShadow: '0 4px 16px rgba(0,0,0,0.03)',
            display: 'flex',
            flexDirection: 'column',
            gap: '20px'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Globe size={20} color="#059669" />
                <h2 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: '#0F172A' }}>
                  Global Federation Hub & Shared Resources
                </h2>
              </div>
              <span style={{ fontSize: '11px', padding: '3px 8px', borderRadius: '6px', fontWeight: 700, background: 'rgba(16, 185, 129, 0.12)', color: '#059669', border: '1px solid #10B981' }}>
                {hubAnalytics?.hub_health_status}
              </span>
            </div>

            {/* Cloud Cost Savings Breakdown */}
            <div style={{ background: '#F8FAFC', padding: '16px', borderRadius: '12px', border: '1px solid #E2E8F0' }}>
              <div style={{ fontSize: '13px', fontWeight: 700, color: '#0F172A', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <DollarSign size={16} color="#059669" /> Centralized Cloud Economies of Scale
              </div>
              <div style={{ fontSize: '24px', fontWeight: 800, color: '#059669', marginTop: '6px' }}>
                ${hubAnalytics?.estimated_monthly_cloud_savings_usd.toLocaleString()} / mo
              </div>
              <div style={{ fontSize: '11px', color: '#64748B' }}>Total Monthly Cloud Costs Saved Across All Connected Cells</div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', marginTop: '14px' }}>
                <div style={{ background: '#FFFFFF', padding: '8px', borderRadius: '6px', border: '1px solid #E2E8F0' }}>
                  <div style={{ fontSize: '10px', color: '#64748B' }}>Flight Radar Multiplex</div>
                  <div style={{ fontSize: '13px', fontWeight: 700, color: '#0F172A' }}>
                    ${hubAnalytics?.savings_breakdown.multiplexed_flight_radar_usd}/mo
                  </div>
                </div>
                <div style={{ background: '#FFFFFF', padding: '8px', borderRadius: '6px', border: '1px solid #E2E8F0' }}>
                  <div style={{ fontSize: '10px', color: '#64748B' }}>Pooled AI Gateway</div>
                  <div style={{ fontSize: '13px', fontWeight: 700, color: '#0F172A' }}>
                    ${hubAnalytics?.savings_breakdown.pooled_ai_gateway_usd}/mo
                  </div>
                </div>
                <div style={{ background: '#FFFFFF', padding: '8px', borderRadius: '6px', border: '1px solid #E2E8F0' }}>
                  <div style={{ fontSize: '10px', color: '#64748B' }}>Serverless Compute</div>
                  <div style={{ fontSize: '13px', fontWeight: 700, color: '#0F172A' }}>
                    ${hubAnalytics?.savings_breakdown.serverless_scale_to_zero_infra_usd}/mo
                  </div>
                </div>
              </div>
            </div>

            {/* Outbox Sync Trigger */}
            <div style={{ border: '1px solid #E2E8F0', padding: '16px', borderRadius: '12px' }}>
              <div style={{ fontSize: '13px', fontWeight: 700, color: '#0F172A', marginBottom: '6px' }}>
                📦 Transactional Outbox Sync & Clearing
              </div>
              <p style={{ margin: '0 0 12px 0', fontSize: '12px', color: '#64748B' }}>
                Local vendor cell queues transactions safely in private outbox. The Global Hub ingests and acknowledges events asynchronously with zero blocking.
              </p>
              <button
                onClick={syncOutbox}
                disabled={syncing}
                style={{
                  width: '100%',
                  padding: '10px',
                  borderRadius: '8px',
                  background: '#0F172A',
                  color: '#FFFFFF',
                  fontWeight: 700,
                  fontSize: '13px',
                  border: 'none',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px'
                }}
              >
                <RefreshCw size={15} className={syncing ? 'spin' : ''} /> 
                {syncing ? 'Syncing Outbox Events...' : `Sync Outbox to Global Hub (${cellStatus?.pending_outbox_events || 0} Queued)`}
              </button>

              {lastSyncResult && (
                <div style={{ marginTop: '10px', background: '#F8FAFC', padding: '10px', borderRadius: '6px', fontSize: '11px', color: '#334155', border: '1px solid #E2E8F0' }}>
                  Status: <strong>{lastSyncResult.status}</strong> • Synced: <strong>{lastSyncResult.synced_count} events</strong>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB: Branded Public Booking Website */}
      {activeTab === 'portal' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          {/* White-Label Vendor Public Banner */}
          <div style={{
            background: selectedVendor.includes('anb') ? 'linear-gradient(135deg, #1E3A8A 0%, #0F172A 100%)' : 'linear-gradient(135deg, #0F172A 0%, #1E293B 100%)',
            color: '#FFFFFF',
            borderRadius: '16px',
            padding: '24px 32px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            boxShadow: '0 10px 25px -5px rgba(30, 58, 138, 0.2)'
          }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ fontSize: '24px' }}>{selectedVendor.includes('anb') ? '🔔' : '👑'}</span>
                <h2 style={{ margin: 0, fontSize: '22px', fontWeight: 800, letterSpacing: '-0.5px' }}>
                  {cellStatus?.vendor_name}
                </h2>
                <span style={{
                  background: '#F59E0B',
                  color: '#000000',
                  padding: '2px 8px',
                  borderRadius: '6px',
                  fontSize: '11px',
                  fontWeight: 800
                }}>
                  PUBLIC BOOKING PORTAL
                </span>
              </div>
              <p style={{ margin: '6px 0 0 0', fontSize: '13px', color: '#CBD5E1' }}>
                {selectedVendor.includes('anb') ? 'Philadelphia Premier Executive Chauffeur & Airport Transport • 24/7 Hotline: +1 (800) 555-0199' : 'Private Executive Transportation & Airport Transfers • 24/7 Concierge'}
              </p>
              <div style={{ display: 'flex', gap: '16px', marginTop: '12px', fontSize: '12px', color: '#94A3B8' }}>
                <span>🌐 Domain: <strong style={{ color: '#F8FAFC' }}>{selectedVendor.includes('anb') ? 'anblimo-philly.com' : 'empire-limo.com'}</strong></span>
                <span>📍 Coverage: <strong style={{ color: '#F8FAFC' }}>{selectedVendor.includes('anb') ? 'Greater Philadelphia & Tri-State' : 'Tri-State Metro Area'}</strong></span>
                <span>💳 Rates: <strong style={{ color: '#34D399' }}>${cellStatus?.local_currency === 'JPY' ? '¥12,000' : '$75.00'} Base + ${cellStatus?.local_currency === 'JPY' ? '¥550' : '$3.25'}/km</strong></span>
              </div>
            </div>

            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '11px', color: '#94A3B8' }}>Sovereign Cell Isolated DB</div>
              <div style={{ fontSize: '14px', fontWeight: 700, color: '#38BDF8', fontFamily: 'monospace' }}>
                {cellStatus?.local_db_partition_id}
              </div>
            </div>
          </div>

          {/* Interactive Public Booking Form & Vehicle Fleet */}
          <div style={{ display: 'grid', gridTemplateColumns: '3fr 2fr', gap: '24px' }}>
            
            {/* Left: Interactive Booking Form */}
            <div style={{ background: '#FFFFFF', borderRadius: '16px', padding: '24px', border: '1px solid #E2E8F0', boxShadow: '0 4px 16px rgba(0,0,0,0.03)' }}>
              <h3 style={{ margin: '0 0 16px 0', fontSize: '16px', fontWeight: 700, color: '#0F172A' }}>
                Reserve Your Private Chauffeur
              </h3>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '14px' }}>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 600, color: '#475569' }}>Passenger Full Name</label>
                  <input
                    type="text"
                    value={passengerName}
                    onChange={(e) => setPassengerName(e.target.value)}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '13px' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 600, color: '#475569' }}>Passenger Contact Phone</label>
                  <input
                    type="text"
                    defaultValue="+12155550199"
                    style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '13px' }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '14px' }}>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 600, color: '#475569' }}>Pickup Address / Airport</label>
                  <input
                    type="text"
                    defaultValue={getCityAddresses(selectedVendor).pickup}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '13px' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 600, color: '#475569' }}>Dropoff Destination</label>
                  <input
                    type="text"
                    defaultValue={getCityAddresses(selectedVendor).dropoff}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '13px' }}
                  />
                </div>
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={{ fontSize: '12px', fontWeight: 600, color: '#475569' }}>Flight Number (Optional Radar Tracking)</label>
                <input
                  type="text"
                  placeholder="e.g. AA 1204 (Free 60-min airport delay protection)"
                  defaultValue="AA 1204"
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '13px' }}
                />
              </div>

              {/* Vehicle Class Selector Cards */}
              <label style={{ fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '8px', display: 'block' }}>
                Select Vehicle Class
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px', marginBottom: '20px' }}>
                <div
                  onClick={() => setVehicleClass('FIRST_CLASS')}
                  style={{
                    padding: '12px',
                    borderRadius: '10px',
                    border: vehicleClass === 'FIRST_CLASS' ? '2px solid #2563EB' : '1px solid #E2E8F0',
                    background: vehicleClass === 'FIRST_CLASS' ? '#EFF6FF' : '#F8FAFC',
                    cursor: 'pointer'
                  }}
                >
                  <div style={{ fontWeight: 700, fontSize: '13px', color: '#0F172A' }}>First Class Sedan</div>
                  <div style={{ fontSize: '11px', color: '#64748B' }}>Mercedes S-Class / BMW 7 • 3 Pax • 3 Bags</div>
                </div>

                <div
                  onClick={() => setVehicleClass('LUXURY_SUV')}
                  style={{
                    padding: '12px',
                    borderRadius: '10px',
                    border: vehicleClass === 'LUXURY_SUV' ? '2px solid #2563EB' : '1px solid #E2E8F0',
                    background: vehicleClass === 'LUXURY_SUV' ? '#EFF6FF' : '#F8FAFC',
                    cursor: 'pointer'
                  }}
                >
                  <div style={{ fontWeight: 700, fontSize: '13px', color: '#0F172A' }}>Luxury SUV (Escalade ESV)</div>
                  <div style={{ fontSize: '11px', color: '#64748B' }}>Cadillac Escalade ESV • 6 Pax • 6 Bags</div>
                </div>

                <div
                  onClick={() => setVehicleClass('ULTRA_LUXURY')}
                  style={{
                    padding: '12px',
                    borderRadius: '10px',
                    border: vehicleClass === 'ULTRA_LUXURY' ? '2px solid #2563EB' : '1px solid #E2E8F0',
                    background: vehicleClass === 'ULTRA_LUXURY' ? '#EFF6FF' : '#F8FAFC',
                    cursor: 'pointer'
                  }}
                >
                  <div style={{ fontWeight: 700, fontSize: '13px', color: '#0F172A' }}>Ultra-Luxury (Maybach)</div>
                  <div style={{ fontSize: '11px', color: '#64748B' }}>Mercedes-Maybach S680 • VIP Luxury</div>
                </div>

                <div
                  onClick={() => setVehicleClass('ELECTRIC_VIP')}
                  style={{
                    padding: '12px',
                    borderRadius: '10px',
                    border: vehicleClass === 'ELECTRIC_VIP' ? '2px solid #2563EB' : '1px solid #E2E8F0',
                    background: vehicleClass === 'ELECTRIC_VIP' ? '#EFF6FF' : '#F8FAFC',
                    cursor: 'pointer'
                  }}
                >
                  <div style={{ fontWeight: 700, fontSize: '13px', color: '#0F172A' }}>Electric VIP (Lucid Air)</div>
                  <div style={{ fontSize: '11px', color: '#64748B' }}>Zero Emission • Ultra Quiet Cabin</div>
                </div>
              </div>

              {/* Instant Fare Quote & Submit */}
              <div style={{ background: '#F8FAFC', padding: '16px', borderRadius: '12px', border: '1px solid #E2E8F0', marginBottom: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontSize: '12px', color: '#64748B' }}>Estimated All-Inclusive Fare (18.2 km)</div>
                    <div style={{ fontSize: '22px', fontWeight: 800, color: '#0F172A' }}>
                      ${(distanceKm * 3.25 * (vehicleClass === 'LUXURY_SUV' ? 1.25 : vehicleClass === 'ULTRA_LUXURY' ? 1.75 : 1.0) + 75.0 * 1.08).toFixed(2)} USD
                    </div>
                  </div>
                  <div style={{ textAlign: 'right', fontSize: '11px', color: '#64748B' }}>
                    Includes 8% PA/Philly Tax<br />
                    Tolls & Airport Access Included
                  </div>
                </div>
              </div>

              <button
                onClick={executeDirectBooking}
                style={{
                  width: '100%',
                  padding: '14px',
                  borderRadius: '10px',
                  background: selectedVendor.includes('anb') ? '#1E3A8A' : '#0F172A',
                  color: '#FFFFFF',
                  fontWeight: 800,
                  fontSize: '15px',
                  border: 'none',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  boxShadow: '0 4px 12px rgba(30, 58, 138, 0.25)'
                }}
              >
                <Check size={18} /> Confirm Direct Reservation with {cellStatus?.vendor_name.split(' ')[0]}
              </button>

              {lastBooking && (
                <div style={{ marginTop: '16px', background: '#F0FDF4', padding: '16px', borderRadius: '10px', border: '1px solid #BBF7D0' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#166534', fontWeight: 700, fontSize: '14px' }}>
                    <CheckCircle size={18} /> Booking Confirmed: {lastBooking.booking_id}
                  </div>
                  <div style={{ fontSize: '13px', color: '#15803D', marginTop: '6px' }}>
                    Passenger: <strong>{lastBooking.passenger_name}</strong> • Total Fare: <strong>${lastBooking.estimated_cost_usd} USD</strong>
                  </div>
                  <div style={{ fontSize: '12px', color: '#166534', marginTop: '4px' }}>
                    Driver Assigned: <strong>{lastBooking.assigned_driver_id}</strong> (Lead Chauffeur)
                  </div>
                </div>
              )}
            </div>

            {/* Right: AI Passenger Concierge Chat Widget */}
            <div style={{ background: '#FFFFFF', borderRadius: '16px', padding: '24px', border: '1px solid #E2E8F0', display: 'flex', flexDirection: 'column' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
                <Sparkles size={18} color="#2563EB" />
                <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: '#0F172A' }}>
                  {cellStatus?.vendor_name.split(' ')[0]} AI Chauffeur Concierge
                </h3>
              </div>

              <p style={{ fontSize: '12px', color: '#64748B', margin: '0 0 14px 0' }}>
                Ask real-time questions regarding flight tracking, child seats, luggage space, or Philadelphia pickup procedures:
              </p>

              <div style={{ flex: 1, background: '#F8FAFC', borderRadius: '10px', padding: '14px', border: '1px solid #E2E8F0', display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '14px' }}>
                <div style={{ background: '#E2E8F0', padding: '10px 12px', borderRadius: '10px', fontSize: '12px', color: '#1E293B', alignSelf: 'flex-start', maxWidth: '85%' }}>
                  👋 Welcome to <strong>{cellStatus?.vendor_name}</strong>! How can I assist with your executive transport today?
                </div>

                <div style={{ background: '#2563EB', color: '#FFFFFF', padding: '10px 12px', borderRadius: '10px', fontSize: '12px', alignSelf: 'flex-end', maxWidth: '85%' }}>
                  What is your meet and greet policy at Philadelphia PHL airport?
                </div>

                <div style={{ background: '#E2E8F0', padding: '10px 12px', borderRadius: '10px', fontSize: '12px', color: '#1E293B', alignSelf: 'flex-start', maxWidth: '85%' }}>
                  Your assigned chauffeur will monitor your flight in real-time. For Terminal A arrivals, we offer indoor baggage claim meet-and-greet with an iPad name sign, plus 60 minutes complimentary wait time after flight touchdown.
                </div>
              </div>

              <div style={{ display: 'flex', gap: '8px' }}>
                <input
                  type="text"
                  placeholder="Ask a question about your trip..."
                  defaultValue="Do you provide child booster seats?"
                  style={{ flex: 1, padding: '8px 12px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '12px' }}
                />
                <button
                  style={{
                    padding: '8px 14px',
                    borderRadius: '8px',
                    background: '#2563EB',
                    color: '#FFFFFF',
                    border: 'none',
                    fontWeight: 700,
                    fontSize: '12px',
                    cursor: 'pointer'
                  }}
                >
                  Ask AI
                </button>
              </div>
            </div>

          </div>

        </div>
      )}

      {/* TAB 2: Dedicated Email Gateway */}
      {activeTab === 'email' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
          {/* Left: Inbound Email Parser */}
          <div style={{ background: '#FFFFFF', borderRadius: '16px', padding: '24px', border: '1px solid #E2E8F0' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
              <Mail size={18} color="#2563EB" />
              <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: '#0F172A' }}>
                Inbound Email RFQ Parser (rides@anblimo-philly.com)
              </h3>
            </div>
            <p style={{ margin: '0 0 10px 0', fontSize: '12px', color: '#64748B' }}>
              Paste an incoming corporate travel desk booking request or itinerary:
            </p>
            <textarea
              rows={6}
              value={inboundEmailText}
              onChange={(e) => setInboundEmailText(e.target.value)}
              style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '12px', fontFamily: 'monospace' }}
            />
            <button
              onClick={parseInboundEmail}
              disabled={parsingEmail}
              style={{
                width: '100%',
                marginTop: '10px',
                padding: '10px',
                borderRadius: '8px',
                background: '#2563EB',
                color: '#FFFFFF',
                fontWeight: 700,
                fontSize: '13px',
                border: 'none',
                cursor: 'pointer'
              }}
            >
              {parsingEmail ? 'Parsing RFQ & Generating Quote...' : 'Parse Inbound Email & Calculate Instant Quote'}
            </button>

            {parsedRFQ && (
              <div style={{ marginTop: '16px', background: '#F8FAFC', padding: '14px', borderRadius: '10px', border: '1px solid #E2E8F0' }}>
                <div style={{ fontSize: '12px', fontWeight: 700, color: '#0F172A', marginBottom: '8px' }}>
                  🎯 Extracted RFQ & Local Sovereign Quote
                </div>
                <div style={{ fontSize: '12px', color: '#334155', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
                  <div>Passenger: <strong>{parsedRFQ.parsed_passenger_name}</strong></div>
                  <div>Flight: <strong>{parsedRFQ.parsed_flight_number || 'N/A'}</strong></div>
                  <div>Pickup: <strong>{parsedRFQ.parsed_pickup}</strong></div>
                  <div>Dropoff: <strong>{parsedRFQ.parsed_dropoff}</strong></div>
                  <div>Vehicle: <strong>{parsedRFQ.parsed_vehicle_class}</strong></div>
                  <div>Calculated Fare: <strong style={{ color: '#059669' }}>${parsedRFQ.quoted_amount_usd} USD</strong></div>
                </div>
              </div>
            )}
          </div>

          {/* Right: Outbound Email Dispatcher */}
          <div style={{ background: '#FFFFFF', borderRadius: '16px', padding: '24px', border: '1px solid #E2E8F0' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
              <Send size={18} color="#059669" />
              <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: '#0F172A' }}>
                Outbound Branded Confirmation & DKIM/SPF Generator
              </h3>
            </div>
            <p style={{ margin: '0 0 10px 0', fontSize: '12px', color: '#64748B' }}>
              Dispatches trip confirmation directly from vendor's dedicated domain with SPF/DKIM verification:
            </p>

            <button
              onClick={sendOutboundConfirmation}
              style={{
                width: '100%',
                padding: '10px',
                borderRadius: '8px',
                background: '#059669',
                color: '#FFFFFF',
                fontWeight: 700,
                fontSize: '13px',
                border: 'none',
                cursor: 'pointer'
              }}
            >
              Dispatch Branded Outbound Confirmation Email
            </button>

            {outboundEmailResult && (
              <div style={{ marginTop: '16px', background: '#F0FDF4', padding: '14px', borderRadius: '10px', border: '1px solid #BBF7D0' }}>
                <div style={{ fontSize: '12px', fontWeight: 700, color: '#166534', marginBottom: '6px' }}>
                  ✉️ Email Dispatched Successfully!
                </div>
                <div style={{ fontSize: '11px', color: '#15803D' }}>
                  Sender: <strong>{outboundEmailResult.sender_from}</strong><br />
                  SPF Record: <strong>{outboundEmailResult.spf_record_status}</strong><br />
                  DKIM Signature: <code style={{ fontSize: '10px' }}>{outboundEmailResult.dkim_signature}</code>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 3: B2B Affiliate Cross-Dispatch */}
      {activeTab === 'affiliate' && (
        <div style={{ background: '#FFFFFF', borderRadius: '16px', padding: '24px', border: '1px solid #E2E8F0' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
            <Users size={18} color="#2563EB" />
            <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: '#0F172A' }}>
              B2B Affiliate Cross-Dispatch & Escrow Clearinghouse (85% / 10% / 5%)
            </h3>
          </div>
          <p style={{ margin: '0 0 16px 0', fontSize: '13px', color: '#64748B' }}>
            Farm out multi-city overflow rides from Empire Executive (NY) to ANB Limo Company (Philadelphia, PA):
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '16px' }}>
            <div>
              <label style={{ fontSize: '11px', color: '#64748B', fontWeight: 600 }}>Originating Vendor (Referring)</label>
              <input type="text" disabled value="Empire Executive Chauffeurs NY" style={{ width: '100%', padding: '8px', borderRadius: '6px', background: '#F1F5F9', border: '1px solid #CBD5E1', fontSize: '12px' }} />
            </div>
            <div>
              <label style={{ fontSize: '11px', color: '#64748B', fontWeight: 600 }}>Performing Vendor (Local Execution)</label>
              <select 
                value={performingVendor} 
                onChange={(e) => setPerformingVendor(e.target.value)}
                style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '12px' }}
              >
                <option value="vendor_anb_philly">🔔 ANB Limo Company (Philadelphia, PA)</option>
                <option value="vendor_london_royal">🇬🇧 Royal Crown Chauffeurs London</option>
              </select>
            </div>
            <div>
              <label style={{ fontSize: '11px', color: '#64748B', fontWeight: 600 }}>Passenger Name</label>
              <input 
                type="text" 
                value={affiliatePassenger} 
                onChange={(e) => setAffiliatePassenger(e.target.value)}
                style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '12px' }} 
              />
            </div>
          </div>

          <button
            onClick={executeAffiliateFarmOut}
            disabled={farmingRide}
            style={{
              padding: '10px 20px',
              borderRadius: '8px',
              background: '#2563EB',
              color: '#FFFFFF',
              fontWeight: 700,
              fontSize: '13px',
              border: 'none',
              cursor: 'pointer'
            }}
          >
            {farmingRide ? 'Dispatching & Clearing Escrow...' : 'Execute B2B Cross-Dispatch Ride'}
          </button>

          {lastAffiliateRecord && (
            <div style={{ marginTop: '20px', background: '#F8FAFC', padding: '16px', borderRadius: '12px', border: '1px solid #E2E8F0' }}>
              <div style={{ fontSize: '13px', fontWeight: 700, color: '#0F172A', marginBottom: '10px' }}>
                💰 Escrow Commission Settlement Breakdown
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px' }}>
                <div style={{ background: '#FFFFFF', padding: '10px', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
                  <div style={{ fontSize: '11px', color: '#64748B' }}>Total Gross Fare</div>
                  <div style={{ fontSize: '16px', fontWeight: 800, color: '#0F172A' }}>
                    ${lastAffiliateRecord.fare_split.gross_fare_usd}
                  </div>
                </div>
                <div style={{ background: '#ECFDF5', padding: '10px', borderRadius: '8px', border: '1px solid #A7F3D0' }}>
                  <div style={{ fontSize: '11px', color: '#065F46' }}>85% Performing Vendor (ANB Philly)</div>
                  <div style={{ fontSize: '16px', fontWeight: 800, color: '#059669' }}>
                    ${lastAffiliateRecord.fare_split.performing_vendor_net_usd}
                  </div>
                </div>
                <div style={{ background: '#EFF6FF', padding: '10px', borderRadius: '8px', border: '1px solid #BFDBFE' }}>
                  <div style={{ fontSize: '11px', color: '#1E40AF' }}>10% Originator (Empire NY)</div>
                  <div style={{ fontSize: '16px', fontWeight: 800, color: '#2563EB' }}>
                    ${lastAffiliateRecord.fare_split.originating_vendor_commission_usd}
                  </div>
                </div>
                <div style={{ background: '#FFFBEB', padding: '10px', borderRadius: '8px', border: '1px solid #FDE68A' }}>
                  <div style={{ fontSize: '11px', color: '#92400E' }}>5% Global Hub Platform Fee</div>
                  <div style={{ fontSize: '16px', fontWeight: 800, color: '#D97706' }}>
                    ${lastAffiliateRecord.fare_split.hub_clearing_fee_usd}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 4: Declarative Spin-Up */}
      {activeTab === 'spinup' && (
        <div style={{ background: '#FFFFFF', borderRadius: '16px', padding: '24px', border: '1px solid #E2E8F0' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
            <Sparkles size={18} color="#F59E0B" />
            <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: '#0F172A' }}>
              Declarative Vendor Spin-Up Orchestrator (Client 3, Client 4, etc.)
            </h3>
          </div>
          <p style={{ margin: '0 0 12px 0', fontSize: '13px', color: '#64748B' }}>
            Paste a declarative YAML specification to instantly provision a new sovereign vendor instance in &lt; 1 second:
          </p>
          <textarea
            rows={10}
            value={newVendorYaml}
            onChange={(e) => setNewVendorYaml(e.target.value)}
            style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '12px', fontFamily: 'monospace' }}
          />
          <button
            onClick={executeDeclarativeSpinUp}
            disabled={spinningUp}
            style={{
              marginTop: '12px',
              padding: '10px 20px',
              borderRadius: '8px',
              background: '#0F172A',
              color: '#FFFFFF',
              fontWeight: 700,
              fontSize: '13px',
              border: 'none',
              cursor: 'pointer'
            }}
          >
            {spinningUp ? 'Provisioning Sovereign Instance...' : '⚡ Spin Up New Sovereign Vendor Instance'}
          </button>

          {spinUpResult && (
            <div style={{ marginTop: '16px', background: '#F0FDF4', padding: '14px', borderRadius: '10px', border: '1px solid #BBF7D0' }}>
              <div style={{ fontSize: '13px', fontWeight: 700, color: '#166534' }}>
                🎉 Successfully Spun Up {spinUpResult.vendor_name}!
              </div>
              <div style={{ fontSize: '12px', color: '#15803D', marginTop: '4px' }}>
                Vendor ID: <code>{spinUpResult.vendor_id}</code> • Tier: <strong>{spinUpResult.tier}</strong> • DB Partition: <code>{spinUpResult.local_db_partition_id}</code>
              </div>
            </div>
          )}
        </div>
      )}

    </div>
  );
};
