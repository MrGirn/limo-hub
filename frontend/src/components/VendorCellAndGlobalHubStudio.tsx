import React, { useState, useEffect } from 'react';
import { 
  Building2, Globe, Shield, RefreshCw, Zap, Server, 
  ArrowUpRight, AlertTriangle, CheckCircle, Database, 
  Cpu, Plane, DollarSign, Activity, Layers, Play, Mail, Send, Users, Sparkles, FileText, Check, AlertCircle
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import {
  fetchVendorCellStatusApi,
  toggleVendorCellCircuitBreakerApi,
  syncVendorOutboxToGlobalHubApi,
  listVendorCellsApi,
  fetchGlobalHubAnalyticsApi,
  executeDirectCellBookingApi,
  parseVendorInboundEmailApi,
  dispatchVendorOutboundEmailApi,
  farmOutAffiliateRide,
  fetchAffiliateRecommendations,
  fetchGlobalHubKnowledgeBase,
  spinUpVendorCellApi,
  validateVendorYamlApi,
  fetchVendorManifestTemplateApi,
  generateVendorPortalTokenApi,
  resolveVendorPortalTokenApi,
  getAuthHeaders,
  BASE_URL
} from '../api';

interface VendorCellStatus {
  vendor_id: string;
  vendor_name: string;
  operating_mode: string;
  tier?: string;
  city?: string;
  state?: string;
  country_code?: string;
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

interface VendorCellAndGlobalHubStudioProps {
  defaultVendorId?: string;
}

export const VendorCellAndGlobalHubStudio: React.FC<VendorCellAndGlobalHubStudioProps> = ({
  defaultVendorId
}) => {
  const { user } = useAuth();
  const [registeredCells, setRegisteredCells] = useState<any[]>([]);
  const [selectedVendor, setSelectedVendor] = useState<string>(defaultVendorId || user?.vendor_id || '');
  const [activeTab, setActiveTab] = useState<'overview' | 'portal' | 'email' | 'affiliate' | 'spinup'>('overview');
  const [cellStatus, setCellStatus] = useState<VendorCellStatus | null>(null);
  const [hubAnalytics, setHubAnalytics] = useState<HubAnalytics | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [syncing, setSyncing] = useState<boolean>(false);
  const [lastSyncResult, setLastSyncResult] = useState<any>(null);

  // Direct Booking State
  const [passengerName, setPassengerName] = useState<string>('Director Harrison Vance');
  const [distanceKm, setDistanceKm] = useState<number>(18.2);
  const [vehicleClass, setVehicleClass] = useState<string>('FIRST_CLASS');
  const [lastBooking, setLastBooking] = useState<any>(null);

  // Email Gateway State
  const [inboundEmailText, setInboundEmailText] = useState<string>(
    "Hello Dispatch Team,\nPlease book a luxury SUV for passenger Director Harrison Vance, phone: +12155550199.\nPickup: Philadelphia International Airport (PHL) Terminal A\nDropoff: The Ritz-Carlton Philadelphia, 10 Avenue of the Arts\nFlight: AA 1204 arriving tomorrow at 4:30 PM."
  );
  const [parsedRFQ, setParsedRFQ] = useState<any>(null);
  const [outboundEmailResult, setOutboundEmailResult] = useState<any>(null);
  const [parsingEmail, setParsingEmail] = useState<boolean>(false);

  // Affiliate Farming State
  const [performingVendor, setPerformingVendor] = useState<string>('');
  const [affiliatePassenger, setAffiliatePassenger] = useState<string>('Elena Rostova');
  const [lastAffiliateRecord, setLastAffiliateRecord] = useState<any>(null);
  const [farmingRide, setFarmingRide] = useState<boolean>(false);
  const [affiliateRecommendations, setAffiliateRecommendations] = useState<any[]>([]);
  const [loadingRecommendations, setLoadingRecommendations] = useState<boolean>(false);
  const [affiliateKnowledgeBase, setAffiliateKnowledgeBase] = useState<any | null>(null);
  const [showKnowledgeBaseModal, setShowKnowledgeBaseModal] = useState<boolean>(false);

  const loadAffiliateRecommendations = async (destCity: string = 'New York') => {
    if (!selectedVendor) return;
    setLoadingRecommendations(true);
    try {
      const recs = await fetchAffiliateRecommendations(selectedVendor, destCity, 'FIRST_CLASS', 25.0);
      setAffiliateRecommendations(recs || []);
    } catch (e) {
      console.warn('Could not fetch affiliate recommendations:', e);
    } finally {
      setLoadingRecommendations(false);
    }
  };

  const loadKnowledgeBase = async () => {
    try {
      const kb = await fetchGlobalHubKnowledgeBase();
      setAffiliateKnowledgeBase(kb);
    } catch (e) {
      console.warn('Could not fetch affiliate knowledge base:', e);
    }
  };

  // Spin-Up State
  const [newVendorYaml, setNewVendorYaml] = useState<string>('');
  const [yamlValidation, setYamlValidation] = useState<any>(null);
  const [spinUpResult, setSpinUpResult] = useState<any>(null);
  const [spinningUp, setSpinningUp] = useState<boolean>(false);
  const [validatingYaml, setValidatingYaml] = useState<boolean>(false);

  // Secure Portal Token State
  const [cellularToken, setCellularToken] = useState<string | null>(null);
  const [generatingToken, setGeneratingToken] = useState<boolean>(false);

  useEffect(() => {
    loadRegisteredCells();
  }, []);

  useEffect(() => {
    if (selectedVendor) {
      fetchCellAndHubData(selectedVendor);
    }
  }, [selectedVendor]);

  const loadRegisteredCells = async () => {
    try {
      const cells = await listVendorCellsApi();
      if (Array.isArray(cells)) {
        setRegisteredCells(cells);
        if (!selectedVendor && cells.length > 0) {
          setSelectedVendor(cells[0].vendor_id);
        }
        if (!performingVendor && cells.length > 1) {
          setPerformingVendor(cells[1].vendor_id);
        } else if (!performingVendor && cells.length > 0) {
          setPerformingVendor(cells[0].vendor_id);
        }
      }
    } catch (err: any) {
      console.error('Failed to load registered vendor cells:', err);
    }
  };

  const fetchCellAndHubData = async (vendorIdToFetch?: string) => {
    const vId = vendorIdToFetch || selectedVendor;
    if (!vId) return;

    setLoading(true);
    setErrorMessage(null);
    try {
      const [cData, hData] = await Promise.all([
        fetchVendorCellStatusApi(vId),
        fetchGlobalHubAnalyticsApi().catch(err => {
          console.warn('Hub analytics not available:', err);
          return null;
        })
      ]);
      setCellStatus(cData);
      if (hData) setHubAnalytics(hData);
    } catch (err: any) {
      console.error('Error loading vendor cell status:', err);
      setErrorMessage(err.message || 'Failed to fetch authoritative vendor cell data');
      setCellStatus(null);
    } finally {
      setLoading(false);
    }
  };

  const toggleCircuitBreaker = async (status: string) => {
    if (!selectedVendor) return;
    try {
      const updatedConfig = await toggleVendorCellCircuitBreakerApi(selectedVendor, status === 'DEGRADED_FALLBACK', 'Manual operator test');
      if (cellStatus) {
        setCellStatus({ ...cellStatus, circuit_breaker_status: updatedConfig.circuit_breaker_status || status });
      }
    } catch (err: any) {
      alert(err.message || 'Failed to toggle cell circuit breaker');
    }
  };

  const syncOutbox = async () => {
    if (!selectedVendor) return;
    setSyncing(true);
    try {
      const data = await syncVendorOutboxToGlobalHubApi(selectedVendor);
      setLastSyncResult(data);
      await fetchCellAndHubData(selectedVendor);
    } catch (err: any) {
      alert(err.message || 'Outbox sync failed');
    } finally {
      setSyncing(false);
    }
  };

  const executeDirectBooking = async () => {
    if (!selectedVendor) return;
    try {
      const data = await executeDirectCellBookingApi(selectedVendor, {
        passenger_name: passengerName,
        passenger_phone: '+12155550199',
        pickup_address: cellStatus?.city ? `${cellStatus.city} International Airport FBO` : 'Regional Airport FBO',
        dropoff_address: cellStatus?.city ? `${cellStatus.city} Downtown Financial District` : 'Executive Plaza Suites',
        distance_km: distanceKm,
        vehicle_class: vehicleClass
      });
      setLastBooking(data);
      await fetchCellAndHubData(selectedVendor);
    } catch (err: any) {
      alert(err.message || 'Direct booking creation failed');
    }
  };

  const parseInboundEmail = async () => {
    if (!selectedVendor) return;
    setParsingEmail(true);
    try {
      const data = await parseVendorInboundEmailApi(selectedVendor, {
        sender_email: 'traveldesk@blackrock.com',
        subject: 'VIP Transfer Request',
        body: inboundEmailText
      });
      setParsedRFQ(data);
    } catch (err: any) {
      alert(err.message || 'Failed to parse inbound email');
    } finally {
      setParsingEmail(false);
    }
  };

  const sendOutboundConfirmation = async () => {
    if (!selectedVendor) return;
    try {
      const data = await dispatchVendorOutboundEmailApi(selectedVendor, {
        recipient_email: 'passenger@example.com',
        booking_id: parsedRFQ?.email_id ? `bk_${parsedRFQ.email_id}` : 'bk_live_901',
        passenger_name: parsedRFQ?.parsed_passenger_name || passengerName || 'Passenger',
        pickup_address: parsedRFQ?.parsed_pickup || 'Airport FBO',
        dropoff_address: parsedRFQ?.parsed_dropoff || 'Hotel VIP',
        vehicle_class: parsedRFQ?.parsed_vehicle_class || vehicleClass || 'FIRST_CLASS',
        amount_usd: parsedRFQ?.quoted_amount_usd || 120.00,
        driver_name: 'Lead Chauffeur',
        driver_phone: '+1 (555) 019-9000',
        vehicle_info: 'Luxury Executive Vehicle',
        company_name: cellStatus?.vendor_name || 'Executive Transport'
      });
      setOutboundEmailResult(data);
    } catch (err: any) {
      alert(err.message || 'Outbound email dispatch failed');
    }
  };

  const executeAffiliateFarmOut = async () => {
    if (!selectedVendor || !performingVendor) {
      alert('Please select both Originating and Performing Vendor Cells.');
      return;
    }
    setFarmingRide(true);
    try {
      const data = await farmOutAffiliateRide(selectedVendor, {
        performing_vendor_id: performingVendor,
        passenger_name: affiliatePassenger,
        passenger_phone: '+1 (555) 019-9100',
        pickup_address: 'Airport FBO Terminal A',
        dropoff_address: 'Center City Executive Plaza',
        distance_km: 18.2,
        vehicle_class: 'FIRST_CLASS'
      });
      setLastAffiliateRecord(data);
      await fetchCellAndHubData(selectedVendor);
    } catch (err: any) {
      alert(err.message || 'Affiliate farm-out failed');
    } finally {
      setFarmingRide(false);
    }
  };

  const handleValidateYaml = async () => {
    if (!newVendorYaml.trim()) {
      alert('Please enter or load YAML manifest content.');
      return;
    }
    setValidatingYaml(true);
    try {
      const res = await validateVendorYamlApi(newVendorYaml);
      setYamlValidation(res);
    } catch (err: any) {
      alert(err.message || 'YAML validation failed');
    } finally {
      setValidatingYaml(false);
    }
  };

  const executeDeclarativeSpinUp = async () => {
    if (!newVendorYaml.trim()) {
      alert('Please enter YAML manifest specification.');
      return;
    }
    setSpinningUp(true);
    try {
      const valRes = await validateVendorYamlApi(newVendorYaml);
      if (!valRes.valid) {
        setYamlValidation(valRes);
        alert('YAML Manifest validation failed. Please correct schema errors.');
        setSpinningUp(false);
        return;
      }

      const payload = valRes.parsed_payload;
      const res = await spinUpVendorCellApi(payload);
      setSpinUpResult(res);
      await loadRegisteredCells();
      setSelectedVendor(res.vendor_id);
    } catch (err: any) {
      alert(err.message || 'Spin up vendor cell failed');
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
        boxShadow: '0 4px 20px rgba(15, 23, 42, 0.15)',
        flexWrap: 'wrap',
        gap: '12px'
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

        {/* Dynamic Vendor Selector */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ fontSize: '12px', color: '#64748B', fontWeight: 600 }}>Active Vendor Cell:</span>
          {registeredCells.length > 0 ? (
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
              {registeredCells.map((cell) => (
                <option key={cell.vendor_id} value={cell.vendor_id}>
                  🏢 {cell.vendor_name || cell.name || cell.vendor_id} ({cell.local_currency || cell.currency || 'USD'})
                </option>
              ))}
            </select>
          ) : (
            <input
              type="text"
              value={selectedVendor}
              onChange={(e) => setSelectedVendor(e.target.value)}
              placeholder="Enter Vendor ID..."
              style={{
                background: '#FFFFFF',
                color: '#0F172A',
                border: '1.5px solid #CBD5E1',
                borderRadius: '8px',
                padding: '8px 14px',
                fontSize: '13px',
                fontWeight: 700
              }}
            />
          )}
        </div>
      </div>

      {errorMessage && (
        <div style={{ background: '#FEF2F2', border: '1px solid #FCA5A5', padding: '14px', borderRadius: '12px', color: '#991B1B', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <AlertCircle size={18} />
          <span style={{ fontSize: '13px', fontWeight: 600 }}>{errorMessage}</span>
        </div>
      )}

      {/* Navigation Tabs */}
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
                  {cellStatus?.vendor_name || selectedVendor || 'Vendor Cell'}
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
                STATUS: {cellStatus?.circuit_breaker_status || 'UNKNOWN'}
              </span>
            </div>

            {/* Metrics */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
              <div style={{ background: '#F8FAFC', padding: '12px', borderRadius: '10px', border: '1px solid #E2E8F0' }}>
                <div style={{ fontSize: '11px', color: '#64748B', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Database size={13} /> DB Partition
                </div>
                <div style={{ fontSize: '13px', fontWeight: 700, color: '#0F172A', marginTop: '4px' }}>
                  {cellStatus?.local_db_partition_id || 'Isolated'}
                </div>
                <div style={{ fontSize: '10px', color: '#10B981', fontWeight: 600 }}>100% Private Schema</div>
              </div>

              <div style={{ background: '#F8FAFC', padding: '12px', borderRadius: '10px', border: '1px solid #E2E8F0' }}>
                <div style={{ fontSize: '11px', color: '#64748B', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Activity size={13} /> Direct Rides
                </div>
                <div style={{ fontSize: '14px', fontWeight: 700, color: '#0F172A', marginTop: '4px' }}>
                  {cellStatus?.total_bookings_processed ?? 0}
                </div>
                <div style={{ fontSize: '10px', color: '#64748B' }}>Processed Locally</div>
              </div>

              <div style={{ background: '#F8FAFC', padding: '12px', borderRadius: '10px', border: '1px solid #E2E8F0' }}>
                <div style={{ fontSize: '11px', color: '#64748B', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Zap size={13} /> Chauffeurs
                </div>
                <div style={{ fontSize: '14px', fontWeight: 700, color: '#0F172A', marginTop: '4px' }}>
                  {cellStatus?.available_drivers_count ?? 0} Active
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
                    Fare: <strong>${lastBooking.estimated_cost_usd || lastBooking.gross_amount_usd || 0} USD</strong> • Driver: <strong>{lastBooking.assigned_driver_id || 'Assigned'}</strong>
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
                {hubAnalytics?.hub_health_status || 'ONLINE'}
              </span>
            </div>

            {/* Cloud Cost Savings Breakdown */}
            <div style={{ background: '#F8FAFC', padding: '16px', borderRadius: '12px', border: '1px solid #E2E8F0' }}>
              <div style={{ fontSize: '13px', fontWeight: 700, color: '#0F172A', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <DollarSign size={16} color="#059669" /> Centralized Cloud Economies of Scale
              </div>
              <div style={{ fontSize: '24px', fontWeight: 800, color: '#059669', marginTop: '6px' }}>
                ${(hubAnalytics?.estimated_monthly_cloud_savings_usd || 0).toLocaleString()} / mo
              </div>
              <div style={{ fontSize: '11px', color: '#64748B' }}>Total Monthly Cloud Costs Saved Across All Connected Cells</div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', marginTop: '14px' }}>
                <div style={{ background: '#FFFFFF', padding: '8px', borderRadius: '6px', border: '1px solid #E2E8F0' }}>
                  <div style={{ fontSize: '10px', color: '#64748B' }}>Flight Radar Multiplex</div>
                  <div style={{ fontSize: '13px', fontWeight: 700, color: '#0F172A' }}>
                    ${hubAnalytics?.savings_breakdown?.multiplexed_flight_radar_usd ?? 0}/mo
                  </div>
                </div>
                <div style={{ background: '#FFFFFF', padding: '8px', borderRadius: '6px', border: '1px solid #E2E8F0' }}>
                  <div style={{ fontSize: '10px', color: '#64748B' }}>Pooled AI Gateway</div>
                  <div style={{ fontSize: '13px', fontWeight: 700, color: '#0F172A' }}>
                    ${hubAnalytics?.savings_breakdown?.pooled_ai_gateway_usd ?? 0}/mo
                  </div>
                </div>
                <div style={{ background: '#FFFFFF', padding: '8px', borderRadius: '6px', border: '1px solid #E2E8F0' }}>
                  <div style={{ fontSize: '10px', color: '#64748B' }}>Serverless Compute</div>
                  <div style={{ fontSize: '13px', fontWeight: 700, color: '#0F172A' }}>
                    ${hubAnalytics?.savings_breakdown?.serverless_scale_to_zero_infra_usd ?? 0}/mo
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
                  Status: <strong>{lastSyncResult.status}</strong> • Synced: <strong>{lastSyncResult.synced_count ?? 0} events</strong>
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
            background: 'linear-gradient(135deg, #1E3A8A 0%, #0F172A 100%)',
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
                <span style={{ fontSize: '24px' }}>👑</span>
                <h2 style={{ margin: 0, fontSize: '22px', fontWeight: 800, letterSpacing: '-0.5px' }}>
                  {cellStatus?.vendor_name || selectedVendor}
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
                {cellStatus?.vendor_name ? `${cellStatus.vendor_name} • Sovereign Executive Chauffeur & Airport Transport` : 'Private Executive Transportation & Airport Transfers'}
              </p>
              <div style={{ display: 'flex', gap: '16px', marginTop: '12px', fontSize: '12px', color: '#94A3B8' }}>
                <span>🌐 Domain: <strong style={{ color: '#F8FAFC' }}>{cellStatus?.vendor_id ? `${cellStatus.vendor_id.replace(/_/g, '-')}.limo-ops.com` : 'vendor-portal.limo-ops.com'}</strong></span>
                <span>📍 Coverage: <strong style={{ color: '#F8FAFC' }}>{cellStatus?.city ? `${cellStatus.city}, ${cellStatus.state || cellStatus.country_code || 'US'}` : 'Regional Metro Service Area'}</strong></span>
                <span>💳 Rates: <strong style={{ color: '#34D399' }}>{cellStatus?.local_currency || 'USD'} Base Tariff Active</strong></span>
              </div>
            </div>

            <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '6px' }}>
              <div style={{ fontSize: '11px', color: '#94A3B8' }}>Sovereign Cell Isolated DB</div>
              <div style={{ fontSize: '14px', fontWeight: 700, color: '#38BDF8', fontFamily: 'monospace' }}>
                {cellStatus?.local_db_partition_id || 'Private Partition'}
              </div>
              <button
                onClick={async () => {
                  if (!selectedVendor) return;
                  setGeneratingToken(true);
                  try {
                    const res = await generateVendorPortalTokenApi(selectedVendor);
                    const token = (res as any).encrypted_token || res.token;
                    setCellularToken(token);
                    if (token) {
                      await resolveVendorPortalTokenApi(token);
                    }
                  } catch (err: any) {
                    alert(err.message || 'Token generation failed');
                  } finally {
                    setGeneratingToken(false);
                  }
                }}
                style={{
                  fontSize: '10px',
                  padding: '3px 8px',
                  borderRadius: '4px',
                  backgroundColor: '#38BDF8',
                  color: '#0F172A',
                  border: 'none',
                  fontWeight: 800,
                  cursor: 'pointer'
                }}
              >
                {generatingToken ? 'Generating...' : cellularToken ? '🔐 Token Active' : '🔑 Issue URL Token'}
              </button>
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
                    defaultValue={cellStatus?.city ? `${cellStatus.city} International Airport (PHL) Terminal A` : 'Airport Terminal VIP'}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '13px' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 600, color: '#475569' }}>Dropoff Destination</label>
                  <input
                    type="text"
                    defaultValue={cellStatus?.city ? `${cellStatus.city} Center City Executive Suites` : 'Executive Plaza Suites'}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '13px' }}
                  />
                </div>
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
                      ${(distanceKm * 3.25 * (vehicleClass === 'LUXURY_SUV' ? 1.25 : vehicleClass === 'ULTRA_LUXURY' ? 1.75 : 1.0) + 75.0 * 1.08).toFixed(2)} {cellStatus?.local_currency || 'USD'}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right', fontSize: '11px', color: '#64748B' }}>
                    Local Taxes & Fees Calculated<br />
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
                  background: '#0F172A',
                  color: '#FFFFFF',
                  fontWeight: 800,
                  fontSize: '15px',
                  border: 'none',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  boxShadow: '0 4px 12px rgba(15, 23, 42, 0.25)'
                }}
              >
                <Check size={18} /> Confirm Direct Reservation
              </button>

              {lastBooking && (
                <div style={{ marginTop: '16px', background: '#F0FDF4', padding: '16px', borderRadius: '10px', border: '1px solid #BBF7D0' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#166534', fontWeight: 700, fontSize: '14px' }}>
                    <CheckCircle size={18} /> Booking Confirmed: {lastBooking.booking_id}
                  </div>
                  <div style={{ fontSize: '13px', color: '#15803D', marginTop: '6px' }}>
                    Passenger: <strong>{lastBooking.passenger_name}</strong> • Total Fare: <strong>${lastBooking.estimated_cost_usd || lastBooking.gross_amount_usd} {cellStatus?.local_currency || 'USD'}</strong>
                  </div>
                  <div style={{ fontSize: '12px', color: '#166534', marginTop: '4px' }}>
                    Driver Assigned: <strong>{lastBooking.assigned_driver_id || 'Chauffeur Lead'}</strong>
                  </div>
                </div>
              )}
            </div>

            {/* Right: AI Passenger Concierge Chat Widget */}
            <div style={{ background: '#FFFFFF', borderRadius: '16px', padding: '24px', border: '1px solid #E2E8F0', display: 'flex', flexDirection: 'column' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
                <Sparkles size={18} color="#2563EB" />
                <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: '#0F172A' }}>
                  AI Chauffeur Concierge
                </h3>
              </div>

              <p style={{ fontSize: '12px', color: '#64748B', margin: '0 0 14px 0' }}>
                Ask real-time questions regarding flight tracking, child seats, luggage space, or local airport pickup procedures:
              </p>

              <div style={{ flex: 1, background: '#F8FAFC', borderRadius: '10px', padding: '14px', border: '1px solid #E2E8F0', display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '14px' }}>
                <div style={{ background: '#E2E8F0', padding: '10px 12px', borderRadius: '10px', fontSize: '12px', color: '#1E293B', alignSelf: 'flex-start', maxWidth: '85%' }}>
                  👋 Welcome to <strong>{cellStatus?.vendor_name || selectedVendor}</strong>! How can I assist with your executive transport today?
                </div>
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
                Inbound Email RFQ Parser
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
                marginTop: '10px',
                padding: '8px 16px',
                borderRadius: '8px',
                background: '#2563EB',
                color: '#FFFFFF',
                fontWeight: 700,
                fontSize: '12px',
                border: 'none',
                cursor: 'pointer'
              }}
            >
              {parsingEmail ? 'Parsing with Inbound Gateway...' : 'Parse Inbound Email RFQ'}
            </button>

            {parsedRFQ && (
              <div style={{ marginTop: '16px', background: '#F8FAFC', padding: '14px', borderRadius: '10px', border: '1px solid #E2E8F0' }}>
                <div style={{ fontSize: '12px', fontWeight: 700, color: '#0F172A' }}>
                  Parsed RFQ #{parsedRFQ.rfq_id || parsedRFQ.email_id}
                </div>
                <div style={{ fontSize: '12px', color: '#475569', marginTop: '4px' }}>
                  Passenger: <strong>{parsedRFQ.passenger_name || parsedRFQ.parsed_passenger_name}</strong> • Quoted: <strong>${parsedRFQ.quote_usd || parsedRFQ.quoted_amount_usd} USD</strong>
                </div>
                <div style={{ fontSize: '11px', color: '#64748B', marginTop: '2px' }}>
                  Pickup: {parsedRFQ.pickup_location || parsedRFQ.parsed_pickup} → Dropoff: {parsedRFQ.dropoff_location || parsedRFQ.parsed_dropoff}
                </div>
              </div>
            )}
          </div>

          {/* Right: Outbound Email Dispatcher */}
          <div style={{ background: '#FFFFFF', borderRadius: '16px', padding: '24px', border: '1px solid #E2E8F0' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
              <Send size={18} color="#059669" />
              <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: '#0F172A' }}>
                Outbound Branded Dispatch Email
              </h3>
            </div>
            <p style={{ margin: '0 0 14px 0', fontSize: '12px', color: '#64748B' }}>
              Send branded booking confirmations and trip itineraries directly via your dedicated SMTP / SES connection:
            </p>

            <button
              onClick={sendOutboundConfirmation}
              style={{
                padding: '10px 18px',
                borderRadius: '8px',
                background: '#059669',
                color: '#FFFFFF',
                fontWeight: 700,
                fontSize: '12px',
                border: 'none',
                cursor: 'pointer'
              }}
            >
              Dispatch Confirmation Email Ping
            </button>

            {outboundEmailResult && (
              <div style={{ marginTop: '16px', background: '#F0FDF4', padding: '14px', borderRadius: '10px', border: '1px solid #BBF7D0' }}>
                <div style={{ fontSize: '12px', fontWeight: 700, color: '#166534' }}>
                  ✅ Outbound Email Dispatched
                </div>
                <div style={{ fontSize: '12px', color: '#15803D', marginTop: '4px' }}>
                  Message ID: <code>{outboundEmailResult.message_id}</code> • Status: <strong>{outboundEmailResult.status}</strong>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 3: B2B Affiliate Cross-Dispatch */}
      {activeTab === 'affiliate' && (
        <div style={{ background: '#FFFFFF', borderRadius: '16px', padding: '24px', border: '1px solid #E2E8F0' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Users size={18} color="#2563EB" />
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: '#0F172A' }}>
                B2B Affiliate Cross-Dispatch & Escrow Clearinghouse (85% / 10% / 5%)
              </h3>
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                onClick={() => loadAffiliateRecommendations('New York')}
                disabled={loadingRecommendations}
                style={{
                  padding: '6px 12px',
                  borderRadius: '6px',
                  background: '#EFF6FF',
                  border: '1px solid #BFDBFE',
                  color: '#1E40AF',
                  fontSize: '11px',
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                {loadingRecommendations ? 'Finding Partners...' : '🔍 Find Recommended Partners'}
              </button>
              <button
                onClick={() => {
                  setShowKnowledgeBaseModal(!showKnowledgeBaseModal);
                  if (!affiliateKnowledgeBase) loadKnowledgeBase();
                }}
                style={{
                  padding: '6px 12px',
                  borderRadius: '6px',
                  background: '#F8FAFC',
                  border: '1px solid #CBD5E1',
                  color: '#334155',
                  fontSize: '11px',
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                📚 Global Hub Knowledge Base
              </button>
            </div>
          </div>
          <p style={{ margin: '0 0 16px 0', fontSize: '13px', color: '#64748B' }}>
            Farm out overflow rides between registered sovereign partner cells with authoritative escrow clearing:
          </p>

          {/* Partner Recommendations Grid */}
          {affiliateRecommendations.length > 0 && (
            <div style={{ marginBottom: '16px', background: '#F8FAFC', padding: '14px', borderRadius: '12px', border: '1px solid #E2E8F0' }}>
              <div style={{ fontSize: '12px', fontWeight: 700, color: '#0F172A', marginBottom: '8px' }}>
                🎯 Top Certified Affiliate Partners Recommended by Global Hub
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '10px' }}>
                {affiliateRecommendations.map((rec: any, idx: number) => (
                  <div
                    key={idx}
                    onClick={() => setPerformingVendor(rec.vendor_id || rec.id)}
                    style={{
                      padding: '10px',
                      borderRadius: '8px',
                      background: performingVendor === (rec.vendor_id || rec.id) ? '#EFF6FF' : '#FFFFFF',
                      border: performingVendor === (rec.vendor_id || rec.id) ? '2px solid #2563EB' : '1px solid #CBD5E1',
                      cursor: 'pointer'
                    }}
                  >
                    <div style={{ fontSize: '12px', fontWeight: 700, color: '#0F172A' }}>
                      {rec.vendor_name || rec.name || rec.vendor_id}
                    </div>
                    <div style={{ fontSize: '11px', color: '#64748B', marginTop: '2px' }}>
                      Coverage: {rec.city || rec.region || 'Metropolitan'} • Score: <strong>{(Number(rec.readiness_score || rec.rating || 0.95) * 100).toFixed(0)}%</strong>
                    </div>
                    <div style={{ fontSize: '10px', color: '#059669', fontWeight: 700, marginTop: '4px' }}>
                      {performingVendor === (rec.vendor_id || rec.id) ? '✓ Selected for Cross-Dispatch' : 'Click to Select'}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '16px' }}>
            <div>
              <label style={{ fontSize: '11px', color: '#64748B', fontWeight: 600 }}>Originating Vendor (Referring)</label>
              <input 
                type="text" 
                disabled 
                value={selectedVendor} 
                style={{ width: '100%', padding: '8px', borderRadius: '6px', background: '#F1F5F9', border: '1px solid #CBD5E1', fontSize: '12px' }} 
              />
            </div>
            <div>
              <label style={{ fontSize: '11px', color: '#64748B', fontWeight: 600 }}>Performing Vendor (Local Execution)</label>
              {registeredCells.length > 0 ? (
                <select 
                  value={performingVendor} 
                  onChange={(e) => setPerformingVendor(e.target.value)}
                  style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '12px' }}
                >
                  <option value="">Select a partner cell...</option>
                  {registeredCells.map((cell) => (
                    <option key={cell.vendor_id} value={cell.vendor_id}>
                      {cell.vendor_name || cell.name || cell.vendor_id}
                    </option>
                  ))}
                </select>
              ) : (
                <input 
                  type="text" 
                  value={performingVendor} 
                  onChange={(e) => setPerformingVendor(e.target.value)}
                  placeholder="Enter performing vendor ID..."
                  style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '12px' }} 
                />
              )}
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

          {/* Global Hub Knowledge Base Modal */}
          {showKnowledgeBaseModal && (
            <div style={{ marginTop: '16px', background: '#F8FAFC', padding: '16px', borderRadius: '12px', border: '1px solid #CBD5E1' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <div style={{ fontSize: '13px', fontWeight: 700, color: '#0F172A' }}>
                  📖 Global Hub Affiliate SOP & Settlement Knowledge Base
                </div>
                <button
                  onClick={() => setShowKnowledgeBaseModal(false)}
                  style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '4px', border: '1px solid #CBD5E1', cursor: 'pointer', background: '#FFFFFF' }}
                >
                  Close
                </button>
              </div>
              <div style={{ fontSize: '12px', color: '#475569', lineHeight: '1.6' }}>
                {affiliateKnowledgeBase?.articles ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {affiliateKnowledgeBase.articles.map((art: any, i: number) => (
                      <div key={i} style={{ padding: '8px', background: '#FFFFFF', borderRadius: '6px', border: '1px solid #E2E8F0' }}>
                        <div style={{ fontWeight: 700, color: '#0F172A' }}>{art.title || art.topic}</div>
                        <div style={{ fontSize: '11px', color: '#64748B', marginTop: '2px' }}>{art.summary || art.content}</div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p style={{ margin: 0 }}>
                    Standard Operating Procedure: All farm-out rides settle through the centralized cryptographic ledger. Originator receives 10%, Performing Vendor receives 85%, and Global Hub receives 5% clearing fee upon chauffeur delivery confirmation.
                  </p>
                )}
              </div>
            </div>
          )}

          {lastAffiliateRecord && lastAffiliateRecord.fare_split && (
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
                  <div style={{ fontSize: '11px', color: '#065F46' }}>85% Performing Vendor</div>
                  <div style={{ fontSize: '16px', fontWeight: 800, color: '#059669' }}>
                    ${lastAffiliateRecord.fare_split.performing_vendor_net_usd}
                  </div>
                </div>
                <div style={{ background: '#EFF6FF', padding: '10px', borderRadius: '8px', border: '1px solid #BFDBFE' }}>
                  <div style={{ fontSize: '11px', color: '#1E40AF' }}>10% Originator</div>
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
              Declarative Vendor Spin-Up Orchestrator
            </h3>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <p style={{ margin: 0, fontSize: '13px', color: '#64748B' }}>
              Paste a declarative YAML specification or load the authoritative backend starter template:
            </p>
            <button
              onClick={async () => {
                try {
                  const d = await fetchVendorManifestTemplateApi();
                  setNewVendorYaml(d.template_yaml || '');
                } catch (e) {
                  console.error('Error fetching template', e);
                }
              }}
              style={{
                fontSize: '11px',
                color: '#0078D4',
                backgroundColor: '#EFF6FF',
                border: '1px solid #BFDBFE',
                padding: '3px 10px',
                borderRadius: '4px',
                fontWeight: 700,
                cursor: 'pointer'
              }}
            >
              📋 Load Starter Template
            </button>
          </div>
          <textarea
            rows={10}
            value={newVendorYaml}
            onChange={(e) => setNewVendorYaml(e.target.value)}
            placeholder="# Paste or load vendor cell YAML manifest here..."
            style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '12px', fontFamily: 'monospace' }}
          />

          <div style={{ display: 'flex', gap: '10px', marginTop: '12px' }}>
            <button
              onClick={handleValidateYaml}
              disabled={validatingYaml}
              style={{
                padding: '10px 18px',
                borderRadius: '8px',
                background: '#FFFFFF',
                color: '#0F172A',
                fontWeight: 700,
                fontSize: '13px',
                border: '1px solid #CBD5E1',
                cursor: 'pointer'
              }}
            >
              {validatingYaml ? 'Validating Schema...' : '🔍 Validate YAML Schema'}
            </button>
            <button
              onClick={executeDeclarativeSpinUp}
              disabled={spinningUp}
              style={{
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
          </div>

          {yamlValidation && (
            <div style={{ marginTop: '16px', background: yamlValidation.valid ? '#F0FDF4' : '#FEF2F2', padding: '14px', borderRadius: '10px', border: `1px solid ${yamlValidation.valid ? '#BBF7D0' : '#FCA5A5'}` }}>
              <div style={{ fontSize: '13px', fontWeight: 700, color: yamlValidation.valid ? '#166534' : '#991B1B' }}>
                {yamlValidation.valid ? '✅ Manifest Validated Successfully' : '❌ Manifest Validation Failed'}
              </div>
              {yamlValidation.checks && (
                <div style={{ marginTop: '8px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  {yamlValidation.checks.map((c: any, i: number) => (
                    <div key={i} style={{ fontSize: '11px', color: c.status === 'PASSED' ? '#15803D' : '#DC2626' }}>
                      • {c.name}: <strong>{c.status}</strong> — {c.detail}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {spinUpResult && (
            <div style={{ marginTop: '16px', background: '#F0FDF4', padding: '14px', borderRadius: '10px', border: '1px solid #BBF7D0' }}>
              <div style={{ fontSize: '13px', fontWeight: 700, color: '#166534' }}>
                🎉 Successfully Spun Up {spinUpResult.vendor_name || spinUpResult.name}!
              </div>
              <div style={{ fontSize: '12px', color: '#15803D', marginTop: '4px' }}>
                Vendor ID: <code>{spinUpResult.vendor_id}</code> • Tier: <strong>{spinUpResult.tier}</strong> • DB Partition: <code>{spinUpResult.local_db_partition_id || spinUpResult.db_partition}</code>
              </div>
            </div>
          )}
        </div>
      )}

    </div>
  );
};
