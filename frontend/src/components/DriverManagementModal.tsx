import React, { useState, useEffect } from 'react';
import { 
  X, Users, ShieldCheck, DollarSign, Upload, CheckCircle, 
  AlertCircle, RefreshCw, FileText, Plus, Car, Award, Clock
} from 'lucide-react';
import { Driver } from '../types';
import { 
  fetchDrivers, 
  fetchVendorDriversApi,
  createVendorDriverApi,
  updateDriverCompensationModelApi, 
  uploadDriverDocumentApi 
} from '../api';

interface DriverManagementModalProps {
  vendorId: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const DriverManagementModal: React.FC<DriverManagementModalProps> = ({
  vendorId,
  isOpen,
  onClose,
  onSuccess
}) => {
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [selectedDriver, setSelectedDriver] = useState<Driver | null>(null);
  const [activeTab, setActiveTab] = useState<'roster' | 'compensation' | 'documents' | 'add'>('roster');
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Compensation Form
  const [compModel, setCompModel] = useState<'SPLIT_PERCENTAGE' | 'HOURLY' | 'COMMISSION_FLAT'>('SPLIT_PERCENTAGE');
  const [splitPct, setSplitPct] = useState('75.0');
  const [hourlyRate, setHourlyRate] = useState('38.00');
  const [minPayout, setMinPayout] = useState('50.00');

  // Document Upload Form
  const [docType, setDocType] = useState('TLC_COMMERCIAL_LICENSE');
  const [docName, setDocName] = useState('');
  const [docExpiry, setDocExpiry] = useState('2027-12-31');
  const [docBase64, setDocBase64] = useState('');

  // Add Driver Form
  const [newFirstName, setNewFirstName] = useState('');
  const [newLastName, setNewLastName] = useState('');
  const [newPhone, setNewPhone] = useState('+1 (555) 019-2834');
  const [newEmail, setNewEmail] = useState('');
  const [newLicensePlate, setNewLicensePlate] = useState('TLC-9942');

  useEffect(() => {
    if (!isOpen) return;
    loadDrivers();
  }, [isOpen, vendorId]);

  const loadDrivers = async () => {
    setLoading(true);
    setError(null);
    try {
      const list = vendorId ? await fetchVendorDriversApi(vendorId) : await fetchDrivers();
      setDrivers(list);
      if (list.length > 0 && !selectedDriver) {
        setSelectedDriver(list[0]);
      }
    } catch (e: any) {
      setError(e.message || 'Failed to load drivers');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveCompensation = async () => {
    if (!selectedDriver) return;
    setActionLoading(true);
    setError(null);
    try {
      const res = await updateDriverCompensationModelApi(vendorId, selectedDriver.id, {
        model_type: compModel,
        hourly_rate_usd: parseFloat(hourlyRate) || 0,
        split_percentage: parseFloat(splitPct) || 0,
        minimum_trip_payout_usd: parseFloat(minPayout) || 0
      });
      setSuccessMsg(res.message || 'Driver compensation model successfully saved!');
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (e: any) {
      setError(e.message || 'Failed to update compensation model');
    } finally {
      setActionLoading(false);
    }
  };

  const handleUploadDocument = async () => {
    if (!selectedDriver) return;
    if (!docName.trim()) {
      setError('Please provide a document title.');
      return;
    }
    if (!docBase64) {
      setError('Please attach a document file (PDF or image).');
      return;
    }
    setActionLoading(true);
    setError(null);
    try {
      const res = await uploadDriverDocumentApi(selectedDriver.id, {
        document_type: docType,
        document_name: docName,
        expiry_date: docExpiry,
        file_base64: docBase64
      });
      setSuccessMsg(res.message || 'Credential document securely uploaded & attached!');
      setDocName('');
      setDocBase64('');
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (e: any) {
      setError(e.message || 'Failed to upload document');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCreateDriver = async () => {
    if (!newFirstName.trim() || !newLastName.trim()) {
      setError('First and last name are required.');
      return;
    }
    setActionLoading(true);
    setError(null);
    try {
      await createVendorDriverApi(vendorId, {
        first_name: newFirstName.trim(),
        last_name: newLastName.trim(),
        phone: newPhone.trim(),
        email: newEmail.trim() || `${newFirstName.toLowerCase()}.${newLastName.toLowerCase()}@chauffeur.net`,
        license_number: newLicensePlate.trim(),
        current_vehicle_id: undefined
      });
      setSuccessMsg(`Driver ${newFirstName} ${newLastName} registered successfully!`);
      setNewFirstName('');
      await loadDrivers();
      setActiveTab('roster');
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (e: any) {
      setError(e.message || 'Failed to register driver');
    } finally {
      setActionLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(15, 23, 42, 0.7)',
      backdropFilter: 'blur(5px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 10000,
      padding: '20px'
    }}>
      <div style={{
        background: '#FFFFFF',
        borderRadius: '16px',
        maxWidth: '850px',
        width: '100%',
        maxHeight: '90vh',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
        border: '1px solid #E2E8F0',
        overflow: 'hidden'
      }}>
        {/* Top Header */}
        <div style={{
          background: '#0F172A',
          color: '#FFFFFF',
          padding: '16px 24px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          borderBottom: '1px solid #1E293B'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Users size={20} color="#38BDF8" />
            <div>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 800 }}>
                Chauffeur Roster & Compensation Management
              </h3>
              <p style={{ margin: 0, fontSize: '12px', color: '#94A3B8' }}>
                Vendor Cell: <span style={{ color: '#F1F5F9', fontWeight: 700 }}>{vendorId}</span>
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            style={{ background: 'transparent', border: 'none', color: '#94A3B8', cursor: 'pointer', padding: '4px' }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div style={{
          display: 'flex',
          background: '#F8FAFC',
          borderBottom: '1px solid #E2E8F0',
          padding: '0 16px',
          gap: '4px'
        }}>
          {[
            { id: 'roster', label: `👥 Chauffeur Roster (${drivers.length})`, icon: <Users size={13} /> },
            { id: 'compensation', label: '💰 Compensation Model', icon: <DollarSign size={13} /> },
            { id: 'documents', label: '📄 Credential Documents', icon: <FileText size={13} /> },
            { id: 'add', label: '➕ Onboard New Driver', icon: <Plus size={13} /> }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '12px 16px',
                border: 'none',
                background: 'transparent',
                borderBottom: activeTab === tab.id ? '2px solid #0078D4' : '2px solid transparent',
                color: activeTab === tab.id ? '#0078D4' : '#64748B',
                fontWeight: activeTab === tab.id ? 800 : 600,
                fontSize: '12.5px',
                cursor: 'pointer',
                whiteSpace: 'nowrap'
              }}
            >
              {tab.icon} {tab.label}
            </button>
          ))}
        </div>

        {/* Messages */}
        {error && (
          <div style={{ background: '#FEF2F2', borderBottom: '1px solid #FCA5A5', color: '#991B1B', padding: '10px 20px', fontSize: '12.5px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <AlertCircle size={15} color="#DC2626" />
            <span>{error}</span>
          </div>
        )}
        {successMsg && (
          <div style={{ background: '#ECFDF5', borderBottom: '1px solid #6EE7B7', color: '#065F46', padding: '10px 20px', fontSize: '12.5px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <CheckCircle size={15} color="#059669" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '24px' }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '60px 20px' }}>
              <RefreshCw size={28} color="#0078D4" className="pulse-live" style={{ margin: '0 auto 12px auto' }} />
              <div style={{ fontSize: '14px', fontWeight: 700, color: '#0F172A' }}>Loading Chauffeurs...</div>
            </div>
          ) : (
            <>
              {/* --- TAB 1: ROSTER --- */}
              {activeTab === 'roster' && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '14px' }}>
                  {drivers.map(d => {
                    const isSelected = selectedDriver?.id === d.id;
                    return (
                      <div
                        key={d.id}
                        onClick={() => setSelectedDriver(d)}
                        style={{
                          background: isSelected ? '#EFF6FF' : '#F8FAFC',
                          border: isSelected ? '2px solid #0078D4' : '1px solid #E2E8F0',
                          borderRadius: '10px',
                          padding: '14px',
                          cursor: 'pointer',
                          transition: 'all 0.15s ease'
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontSize: '14px', fontWeight: 800, color: '#0F172A' }}>
                            {d.first_name} {d.last_name}
                          </span>
                          <span style={{ fontSize: '11px', color: '#D97706', fontWeight: 700 }}>
                            ★ {d.rating?.toFixed(2) || '5.00'}
                          </span>
                        </div>
                        <div style={{ fontSize: '12px', color: '#64748B', marginTop: '2px' }}>
                          📞 {d.phone || '+1 555-0192'}
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '10px', fontSize: '11px', color: '#475569' }}>
                          <span style={{ background: d.is_on_duty ? '#DCFCE7' : '#F1F5F9', color: d.is_on_duty ? '#166534' : '#64748B', padding: '2px 6px', borderRadius: '4px', fontWeight: 700 }}>
                            {d.is_on_duty ? '🟢 On Duty' : '⚪ Off Duty'}
                          </span>
                          <span style={{ fontWeight: 600 }}>{d.trips_completed || 0} trips completed</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* --- TAB 2: COMPENSATION MODEL --- */}
              {activeTab === 'compensation' && (
                <div style={{ maxWidth: '560px', margin: '0 auto' }}>
                  {selectedDriver ? (
                    <div>
                      <div style={{ background: '#F8FAFC', padding: '12px 16px', borderRadius: '8px', border: '1px solid #E2E8F0', marginBottom: '20px' }}>
                        <div style={{ fontSize: '11px', color: '#64748B', fontWeight: 700, textTransform: 'uppercase' }}>CONFIGURING CHAUFFEUR</div>
                        <div style={{ fontSize: '15px', fontWeight: 800, color: '#0F172A' }}>
                          {selectedDriver.first_name} {selectedDriver.last_name} ({selectedDriver.id})
                        </div>
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        <div>
                          <label style={{ fontSize: '12px', fontWeight: 700, color: '#334155' }}>Compensation Scheme</label>
                          <select
                            value={compModel}
                            onChange={(e) => setCompModel(e.target.value as any)}
                            style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '13px', marginTop: '4px' }}
                          >
                            <option value="SPLIT_PERCENTAGE">Commission Split (Percentage of Fare)</option>
                            <option value="HOURLY">Hourly Charter Rate</option>
                            <option value="COMMISSION_FLAT">Flat Rate per Completed Trip</option>
                          </select>
                        </div>

                        {compModel === 'SPLIT_PERCENTAGE' && (
                          <div>
                            <label style={{ fontSize: '12px', fontWeight: 700, color: '#334155' }}>Driver Split Share (%)</label>
                            <input
                              type="number"
                              value={splitPct}
                              onChange={(e) => setSplitPct(e.target.value)}
                              style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '14px', marginTop: '4px' }}
                            />
                            <span style={{ fontSize: '11px', color: '#64748B' }}>Chauffeur retains {splitPct}% of gross fare plus 100% of customer tips.</span>
                          </div>
                        )}

                        {compModel === 'HOURLY' && (
                          <div>
                            <label style={{ fontSize: '12px', fontWeight: 700, color: '#334155' }}>Hourly Rate ($ USD / hour)</label>
                            <input
                              type="number"
                              value={hourlyRate}
                              onChange={(e) => setHourlyRate(e.target.value)}
                              style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '14px', marginTop: '4px' }}
                            />
                          </div>
                        )}

                        <div>
                          <label style={{ fontSize: '12px', fontWeight: 700, color: '#334155' }}>Minimum Guaranteed Payout per Trip ($)</label>
                          <input
                            type="number"
                            value={minPayout}
                            onChange={(e) => setMinPayout(e.target.value)}
                            style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '14px', marginTop: '4px' }}
                          />
                        </div>

                        <button
                          onClick={handleSaveCompensation}
                          disabled={actionLoading}
                          style={{
                            background: '#0078D4',
                            color: '#FFFFFF',
                            border: 'none',
                            padding: '12px',
                            borderRadius: '8px',
                            fontSize: '13px',
                            fontWeight: 800,
                            cursor: 'pointer',
                            marginTop: '10px'
                          }}
                        >
                          {actionLoading ? 'Saving Scheme...' : '💾 Save Chauffeur Compensation Model'}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div style={{ textAlign: 'center', padding: '40px 0', color: '#64748B' }}>
                      Please select a chauffeur from the roster tab first.
                    </div>
                  )}
                </div>
              )}

              {/* --- TAB 3: CREDENTIAL DOCUMENTS --- */}
              {activeTab === 'documents' && (
                <div style={{ maxWidth: '560px', margin: '0 auto' }}>
                  {selectedDriver ? (
                    <div>
                      <div style={{ background: '#F8FAFC', padding: '12px 16px', borderRadius: '8px', border: '1px solid #E2E8F0', marginBottom: '20px' }}>
                        <div style={{ fontSize: '11px', color: '#64748B', fontWeight: 700, textTransform: 'uppercase' }}>UPLOADING FOR</div>
                        <div style={{ fontSize: '15px', fontWeight: 800, color: '#0F172A' }}>
                          {selectedDriver.first_name} {selectedDriver.last_name}
                        </div>
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                        <div>
                          <label style={{ fontSize: '12px', fontWeight: 700, color: '#334155' }}>Document Type</label>
                          <select
                            value={docType}
                            onChange={(e) => setDocType(e.target.value)}
                            style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '13px', marginTop: '4px' }}
                          >
                            <option value="TLC_COMMERCIAL_LICENSE">TLC Commercial Chauffeur License</option>
                            <option value="COMMERCIAL_LIVERY_INSURANCE">Commercial Livery Insurance Certificate (COI)</option>
                            <option value="AIRPORT_FBO_SECURITY_BADGE">Airport Port Authority / FBO Security Badge</option>
                            <option value="DOT_MEDICAL_EXAMINER_CERTIFICATE">DOT Medical Examiner Certificate</option>
                          </select>
                        </div>

                        <div>
                          <label style={{ fontSize: '12px', fontWeight: 700, color: '#334155' }}>Document Title / Serial Number</label>
                          <input
                            type="text"
                            value={docName}
                            placeholder="e.g. TLC Badge #558921 - State Livery"
                            onChange={(e) => setDocName(e.target.value)}
                            style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '13px', marginTop: '4px' }}
                          />
                        </div>

                        <div>
                          <label style={{ fontSize: '12px', fontWeight: 700, color: '#334155' }}>Regulatory Expiry Date</label>
                          <input
                            type="date"
                            value={docExpiry}
                            onChange={(e) => setDocExpiry(e.target.value)}
                            style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '13px', marginTop: '4px' }}
                          />
                        </div>

                        <button
                          onClick={handleUploadDocument}
                          disabled={actionLoading}
                          style={{
                            background: '#0F172A',
                            color: '#FFFFFF',
                            border: 'none',
                            padding: '12px',
                            borderRadius: '8px',
                            fontSize: '13px',
                            fontWeight: 800,
                            cursor: 'pointer',
                            marginTop: '10px'
                          }}
                        >
                          {actionLoading ? 'Uploading...' : '📤 Upload & Attach to Chauffeur Profile'}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div style={{ textAlign: 'center', padding: '40px 0', color: '#64748B' }}>
                      Please select a chauffeur from the roster tab first.
                    </div>
                  )}
                </div>
              )}

              {/* --- TAB 4: ADD NEW DRIVER --- */}
              {activeTab === 'add' && (
                <div style={{ maxWidth: '560px', margin: '0 auto' }}>
                  <h3 style={{ fontSize: '16px', fontWeight: 800, color: '#0F172A', marginBottom: '16px' }}>
                    Register & Onboard New Chauffeur
                  </h3>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                      <div>
                        <label style={{ fontSize: '12px', fontWeight: 700, color: '#334155' }}>First Name</label>
                        <input
                          type="text"
                          value={newFirstName}
                          placeholder="e.g. Michael"
                          onChange={(e) => setNewFirstName(e.target.value)}
                          style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '13px', marginTop: '4px' }}
                        />
                      </div>
                      <div>
                        <label style={{ fontSize: '12px', fontWeight: 700, color: '#334155' }}>Last Name</label>
                        <input
                          type="text"
                          value={newLastName}
                          placeholder="e.g. Vance"
                          onChange={(e) => setNewLastName(e.target.value)}
                          style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '13px', marginTop: '4px' }}
                        />
                      </div>
                    </div>

                    <div>
                      <label style={{ fontSize: '12px', fontWeight: 700, color: '#334155' }}>Mobile Phone Number</label>
                      <input
                        type="text"
                        value={newPhone}
                        onChange={(e) => setNewPhone(e.target.value)}
                        style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '13px', marginTop: '4px' }}
                      />
                    </div>

                    <div>
                      <label style={{ fontSize: '12px', fontWeight: 700, color: '#334155' }}>Email Address</label>
                      <input
                        type="email"
                        value={newEmail}
                        placeholder="e.g. michael.vance@executive.com"
                        onChange={(e) => setNewEmail(e.target.value)}
                        style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '13px', marginTop: '4px' }}
                      />
                    </div>

                    <div>
                      <label style={{ fontSize: '12px', fontWeight: 700, color: '#334155' }}>Assigned TLC License Plate</label>
                      <input
                        type="text"
                        value={newLicensePlate}
                        onChange={(e) => setNewLicensePlate(e.target.value)}
                        style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '13px', marginTop: '4px' }}
                      />
                    </div>

                    <button
                      onClick={handleCreateDriver}
                      disabled={actionLoading}
                      style={{
                        background: '#0078D4',
                        color: '#FFFFFF',
                        border: 'none',
                        padding: '12px',
                        borderRadius: '8px',
                        fontSize: '13px',
                        fontWeight: 800,
                        cursor: 'pointer',
                        marginTop: '10px'
                      }}
                    >
                      {actionLoading ? 'Creating Profile...' : '➕ Complete Chauffeur Registration'}
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};
