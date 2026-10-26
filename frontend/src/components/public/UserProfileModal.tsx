import React, { useState, useEffect } from 'react';
import {
  X, User, Shield, Sparkles, MapPin, CheckCircle2, AlertCircle,
  Lock, Phone, Building2, KeyRound, Plus, Trash2, Smartphone
} from 'lucide-react';
import {
  getUserProfileApi,
  updateUserProfileApi,
  addSavedAddressApi,
  deleteSavedAddressApi,
  UserProfileResponse
} from '../../api';
import { UserSession } from '../../types';

export interface UserProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: UserSession | null;
  onUpdateUser?: (user: UserSession) => void;
}

type TabType = 'DETAILS' | 'SECURITY' | 'PREFERENCES' | 'ADDRESSES';

export const UserProfileModal: React.FC<UserProfileModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onUpdateUser
}) => {
  const [activeTab, setActiveTab] = useState<TabType>('DETAILS');
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Form Fields
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [companyName, setCompanyName] = useState('');
  
  // Security
  const [mfaEnabled, setMfaEnabled] = useState(false);
  const [mfaPhone, setMfaPhone] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [hasPassword, setHasPassword] = useState(false);

  // VIP Preferences
  const [preferredVehicleClass, setPreferredVehicleClass] = useState('LUXURY_SUV');
  const [targetCabinTemp, setTargetCabinTemp] = useState<number>(68);
  const [cabinAudio, setCabinAudio] = useState('Quiet Ride / Do Not Disturb');
  const [beverage, setBeverage] = useState('Chilled Fiji Water');
  const [chauffeurNotes, setChauffeurNotes] = useState('');
  const [seatingNotes, setSeatingNotes] = useState('');

  // Saved Addresses
  const [savedAddresses, setSavedAddresses] = useState<Array<any>>([]);
  const [newAddrLabel, setNewAddrLabel] = useState('');
  const [newAddrText, setNewAddrText] = useState('');
  const [isDefaultPickup, setIsDefaultPickup] = useState(false);
  const [isAddingAddress, setIsAddingAddress] = useState(false);

  // Load profile on modal open
  useEffect(() => {
    if (!isOpen) return;

    setErrorMessage(null);
    setSuccessMessage(null);
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setIsAddingAddress(false);

    setIsLoading(true);
    getUserProfileApi()
      .then((data: UserProfileResponse) => {
        setFullName(data.full_name || currentUser?.full_name || '');
        setEmail(data.email || currentUser?.email || '');
        setPhone(data.phone || '');
        setCompanyName(data.company_name || '');
        setMfaEnabled(Boolean(data.mfa_enabled));
        setMfaPhone(data.mfa_phone || data.phone || '');
        setPreferredVehicleClass(data.preferred_vehicle_class || 'LUXURY_SUV');
        setTargetCabinTemp(data.target_cabin_temp_f || 68);
        setCabinAudio(data.cabin_audio_preference || 'Quiet Ride / Do Not Disturb');
        setBeverage(data.beverage_preference || 'Chilled Fiji Water');
        setChauffeurNotes(data.chauffeur_etiquette_notes || '');
        setSeatingNotes(data.seating_notes || '');
        setSavedAddresses(data.saved_addresses || []);
        setHasPassword(Boolean(data.has_password));
      })
      .catch((err) => {
        console.warn('Profile fetch note:', err);
        // Fallback to local session
        if (currentUser) {
          setFullName(currentUser.full_name || '');
          setEmail(currentUser.email || '');
        }
      })
      .finally(() => setIsLoading(false));
  }, [isOpen, currentUser]);

  if (!isOpen) return null;

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (newPassword) {
      if (newPassword.length < 8) {
        setErrorMessage('New password must be at least 8 characters long.');
        setActiveTab('SECURITY');
        return;
      }
      if (newPassword !== confirmPassword) {
        setErrorMessage('New passwords do not match.');
        setActiveTab('SECURITY');
        return;
      }
      if (hasPassword && !currentPassword) {
        setErrorMessage('Please enter your current password to authorize this security change.');
        setActiveTab('SECURITY');
        return;
      }
    }

    setIsSaving(true);
    try {
      const payload: any = {
        full_name: fullName.trim(),
        phone: phone.trim(),
        company_name: companyName.trim(),
        mfa_enabled: mfaEnabled,
        mfa_phone: mfaPhone.trim() || phone.trim(),
        preferred_vehicle_class: preferredVehicleClass,
        target_cabin_temp_f: targetCabinTemp,
        cabin_audio_preference: cabinAudio,
        beverage_preference: beverage,
        chauffeur_etiquette_notes: chauffeurNotes.trim(),
        seating_notes: seatingNotes.trim()
      };

      if (newPassword) {
        payload.new_password = newPassword;
        if (currentPassword) {
          payload.current_password = currentPassword;
        }
      }

      const res = await updateUserProfileApi(payload);
      setSuccessMessage('Profile and service preferences updated successfully!');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      if (newPassword) setHasPassword(true);

      if (res.user && onUpdateUser) {
        onUpdateUser(res.user);
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to update profile.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddAddress = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAddrLabel.trim() || !newAddrText.trim()) return;

    try {
      const res = await addSavedAddressApi({
        label: newAddrLabel.trim(),
        formatted_address: newAddrText.trim(),
        is_default_pickup: isDefaultPickup
      });
      setSavedAddresses([...savedAddresses, res.address]);
      setNewAddrLabel('');
      setNewAddrText('');
      setIsDefaultPickup(false);
      setIsAddingAddress(false);
      setSuccessMessage('Destination saved successfully.');
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to add address.');
    }
  };

  const handleDeleteAddress = async (id: string) => {
    try {
      await deleteSavedAddressApi(id);
      setSavedAddresses(savedAddresses.filter((a) => a.id !== id));
      setSuccessMessage('Saved address removed.');
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to remove address.');
    }
  };

  const roleLabel = currentUser?.role === 'ROLE_VENDOR_ADMIN'
    ? 'Owner / Administrator'
    : currentUser?.role === 'ROLE_DISPATCHER'
    ? 'Flight & Fleet Dispatcher'
    : currentUser?.role === 'ROLE_CHAUFFEUR'
    ? 'Certified Chauffeur'
    : currentUser?.role === 'ROLE_CORPORATE_BOOKER'
    ? 'Corporate Travel Booker'
    : 'VIP Passenger & Client';

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(10, 25, 47, 0.72)',
        backdropFilter: 'blur(6px)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px'
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        style={{
          width: '680px',
          maxWidth: '100%',
          maxHeight: '92vh',
          backgroundColor: '#FFFFFF',
          borderRadius: '16px',
          boxShadow: '0 25px 60px -15px rgba(10, 25, 47, 0.4), 0 0 0 1px rgba(226, 232, 240, 0.8)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          animation: 'scaleUp 0.18s ease-out'
        }}
      >
        {/* 1. Executive Top Header */}
        <div
          style={{
            backgroundColor: '#0A192F',
            backgroundImage: 'linear-gradient(135deg, #0A192F 0%, #1E293B 100%)',
            color: '#FFFFFF',
            padding: '20px 24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderBottom: '1px solid #1E293B'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div
              style={{
                width: '46px',
                height: '46px',
                borderRadius: '50%',
                backgroundColor: '#1E293B',
                border: '2px solid #D4AF37',
                color: '#D4AF37',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '18px',
                fontWeight: 800,
                boxShadow: '0 2px 8px rgba(0, 0, 0, 0.25)'
              }}
            >
              {(fullName || email || 'U').charAt(0).toUpperCase()}
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h2 style={{ fontSize: '18px', fontWeight: 800, margin: 0, letterSpacing: '-0.3px', color: '#FFFFFF' }}>
                  {fullName || email.split('@')[0] || 'My Account'}
                </h2>
                <span
                  style={{
                    fontSize: '10px',
                    fontWeight: 800,
                    textTransform: 'uppercase',
                    letterSpacing: '0.4px',
                    padding: '2px 8px',
                    borderRadius: '12px',
                    backgroundColor: 'rgba(212, 175, 55, 0.2)',
                    color: '#D4AF37',
                    border: '1px solid rgba(212, 175, 55, 0.4)'
                  }}
                >
                  {roleLabel}
                </span>
              </div>
              <p style={{ margin: '3px 0 0 0', fontSize: '12.5px', color: '#94A3B8' }}>
                {email} • Authoritative Profile & Service Settings
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            aria-label="Close"
            style={{
              background: 'rgba(255, 255, 255, 0.08)',
              border: 'none',
              color: '#CBD5E1',
              cursor: 'pointer',
              padding: '8px',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'background 0.15s ease'
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255, 255, 255, 0.16)')}
            onMouseLeave={(e) => (e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)')}
          >
            <X size={18} />
          </button>
        </div>

        {/* 2. Navigation Tabs */}
        <div
          style={{
            display: 'flex',
            backgroundColor: '#F8FAFC',
            borderBottom: '1px solid #E2E8F0',
            padding: '0 16px'
          }}
        >
          <button
            type="button"
            onClick={() => setActiveTab('DETAILS')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '12px 16px',
              fontSize: '13px',
              fontWeight: 700,
              border: 'none',
              background: 'none',
              cursor: 'pointer',
              color: activeTab === 'DETAILS' ? '#0A192F' : '#64748B',
              borderBottom: activeTab === 'DETAILS' ? '2.5px solid #0A192F' : '2.5px solid transparent',
              transition: 'all 0.15s ease'
            }}
          >
            <User size={15} color={activeTab === 'DETAILS' ? '#D4AF37' : '#94A3B8'} />
            <span>Personal Profile</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('SECURITY')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '12px 16px',
              fontSize: '13px',
              fontWeight: 700,
              border: 'none',
              background: 'none',
              cursor: 'pointer',
              color: activeTab === 'SECURITY' ? '#0A192F' : '#64748B',
              borderBottom: activeTab === 'SECURITY' ? '2.5px solid #0A192F' : '2.5px solid transparent',
              transition: 'all 0.15s ease'
            }}
          >
            <Shield size={15} color={activeTab === 'SECURITY' ? '#D4AF37' : '#94A3B8'} />
            <span>Security & 2FA</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('PREFERENCES')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '12px 16px',
              fontSize: '13px',
              fontWeight: 700,
              border: 'none',
              background: 'none',
              cursor: 'pointer',
              color: activeTab === 'PREFERENCES' ? '#0A192F' : '#64748B',
              borderBottom: activeTab === 'PREFERENCES' ? '2.5px solid #0A192F' : '2.5px solid transparent',
              transition: 'all 0.15s ease'
            }}
          >
            <Sparkles size={15} color={activeTab === 'PREFERENCES' ? '#D4AF37' : '#94A3B8'} />
            <span>Ride Preferences</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('ADDRESSES')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '12px 16px',
              fontSize: '13px',
              fontWeight: 700,
              border: 'none',
              background: 'none',
              cursor: 'pointer',
              color: activeTab === 'ADDRESSES' ? '#0A192F' : '#64748B',
              borderBottom: activeTab === 'ADDRESSES' ? '2.5px solid #0A192F' : '2.5px solid transparent',
              transition: 'all 0.15s ease'
            }}
          >
            <MapPin size={15} color={activeTab === 'ADDRESSES' ? '#D4AF37' : '#94A3B8'} />
            <span>Saved Destinations ({savedAddresses.length})</span>
          </button>
        </div>

        {/* 3. Modal Body Content */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '24px' }}>
          
          {/* Status Messages */}
          {errorMessage && (
            <div
              style={{
                marginBottom: '16px',
                padding: '12px 14px',
                backgroundColor: '#FEF2F2',
                border: '1px solid #FCA5A5',
                borderRadius: '8px',
                color: '#991B1B',
                fontSize: '13px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              <AlertCircle size={16} color="#DC2626" style={{ flexShrink: 0 }} />
              <span>{errorMessage}</span>
            </div>
          )}

          {successMessage && (
            <div
              style={{
                marginBottom: '16px',
                padding: '12px 14px',
                backgroundColor: '#ECFDF5',
                border: '1px solid #A7F3D0',
                borderRadius: '8px',
                color: '#065F46',
                fontSize: '13px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              <CheckCircle2 size={16} color="#059669" style={{ flexShrink: 0 }} />
              <span>{successMessage}</span>
            </div>
          )}

          {isLoading ? (
            <div style={{ textAlign: 'center', padding: '40px', color: '#64748B', fontSize: '14px' }}>
              Loading profile details...
            </div>
          ) : (
            <form onSubmit={handleSaveProfile} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              
              {/* --- TAB 1: PERSONAL DETAILS --- */}
              {activeTab === 'DETAILS' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                      Full Legal Name
                    </label>
                    <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                      <User size={16} style={{ position: 'absolute', left: '12px', color: '#94A3B8' }} />
                      <input
                        type="text"
                        required
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        placeholder="e.g. Sir Arthur Davies"
                        style={{
                          width: '100%',
                          padding: '10px 12px 10px 36px',
                          borderRadius: '8px',
                          border: '1.5px solid #CBD5E1',
                          fontSize: '13.5px',
                          color: '#0F172A',
                          outline: 'none',
                          boxSizing: 'border-box'
                        }}
                      />
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                        Email Address (Verified)
                      </label>
                      <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                        <Lock size={15} style={{ position: 'absolute', left: '12px', color: '#94A3B8' }} />
                        <input
                          type="email"
                          disabled
                          value={email}
                          style={{
                            width: '100%',
                            padding: '10px 12px 10px 36px',
                            borderRadius: '8px',
                            border: '1.5px solid #E2E8F0',
                            backgroundColor: '#F8FAFC',
                            fontSize: '13.5px',
                            color: '#64748B',
                            cursor: 'not-allowed',
                            boxSizing: 'border-box'
                          }}
                        />
                      </div>
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                        Mobile Phone Number
                      </label>
                      <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                        <Phone size={15} style={{ position: 'absolute', left: '12px', color: '#94A3B8' }} />
                        <input
                          type="tel"
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                          placeholder="+1 (215) 555-0199"
                          style={{
                            width: '100%',
                            padding: '10px 12px 10px 36px',
                            borderRadius: '8px',
                            border: '1.5px solid #CBD5E1',
                            fontSize: '13.5px',
                            color: '#0F172A',
                            outline: 'none',
                            boxSizing: 'border-box'
                          }}
                        />
                      </div>
                      <span style={{ fontSize: '11px', color: '#64748B', marginTop: '4px', display: 'block' }}>
                        Used for live chauffeur SMS dispatch updates and pickup alerts.
                      </span>
                    </div>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                      Company / Organization (Optional)
                    </label>
                    <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                      <Building2 size={16} style={{ position: 'absolute', left: '12px', color: '#94A3B8' }} />
                      <input
                        type="text"
                        value={companyName}
                        onChange={(e) => setCompanyName(e.target.value)}
                        placeholder="e.g. Citadel Global, BlackRock VIP, ANB Trans Inc"
                        style={{
                          width: '100%',
                          padding: '10px 12px 10px 36px',
                          borderRadius: '8px',
                          border: '1.5px solid #CBD5E1',
                          fontSize: '13.5px',
                          color: '#0F172A',
                          outline: 'none',
                          boxSizing: 'border-box'
                        }}
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* --- TAB 2: SECURITY & CREDENTIALS --- */}
              {activeTab === 'SECURITY' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
                  
                  {/* Two-Factor Authentication Card */}
                  <div
                    style={{
                      border: '1px solid #E2E8F0',
                      borderRadius: '10px',
                      padding: '16px',
                      backgroundColor: '#F8FAFC',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '12px'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <Smartphone size={18} color="#0078D4" />
                        <div>
                          <div style={{ fontSize: '13.5px', fontWeight: 700, color: '#0F172A' }}>
                            Two-Factor SMS Authentication (2FA)
                          </div>
                          <div style={{ fontSize: '11.5px', color: '#64748B' }}>
                            Requires a 6-digit numeric SMS verification passcode on login.
                          </div>
                        </div>
                      </div>

                      <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', gap: '8px' }}>
                        <input
                          type="checkbox"
                          checked={mfaEnabled}
                          onChange={(e) => setMfaEnabled(e.target.checked)}
                          style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                        />
                        <span style={{ fontSize: '12px', fontWeight: 700, color: mfaEnabled ? '#059669' : '#64748B' }}>
                          {mfaEnabled ? 'Enabled' : 'Disabled'}
                        </span>
                      </label>
                    </div>

                    {mfaEnabled && (
                      <div style={{ paddingTop: '8px', borderTop: '1px solid #E2E8F0' }}>
                        <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                          2FA Destination Mobile Phone
                        </label>
                        <input
                          type="tel"
                          value={mfaPhone}
                          onChange={(e) => setMfaPhone(e.target.value)}
                          placeholder="+14844324476"
                          style={{
                            width: '100%',
                            padding: '9px 12px',
                            borderRadius: '6px',
                            border: '1.5px solid #CBD5E1',
                            fontSize: '13px',
                            boxSizing: 'border-box'
                          }}
                        />
                      </div>
                    )}
                  </div>

                  {/* Password Change Section */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <div style={{ fontSize: '14px', fontWeight: 800, color: '#0F172A', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <KeyRound size={16} color="#D4AF37" />
                      <span>{hasPassword ? 'Update Account Password' : 'Set Account Password'}</span>
                    </div>

                    {hasPassword && (
                      <div>
                        <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                          Current Password
                        </label>
                        <input
                          type="password"
                          value={currentPassword}
                          onChange={(e) => setCurrentPassword(e.target.value)}
                          placeholder="••••••••••••"
                          style={{
                            width: '100%',
                            padding: '9px 12px',
                            borderRadius: '6px',
                            border: '1.5px solid #CBD5E1',
                            fontSize: '13px',
                            boxSizing: 'border-box'
                          }}
                        />
                      </div>
                    )}

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                      <div>
                        <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                          New Password (min 8 chars)
                        </label>
                        <input
                          type="password"
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          placeholder="••••••••••••"
                          style={{
                            width: '100%',
                            padding: '9px 12px',
                            borderRadius: '6px',
                            border: '1.5px solid #CBD5E1',
                            fontSize: '13px',
                            boxSizing: 'border-box'
                          }}
                        />
                      </div>

                      <div>
                        <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                          Confirm New Password
                        </label>
                        <input
                          type="password"
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          placeholder="••••••••••••"
                          style={{
                            width: '100%',
                            padding: '9px 12px',
                            borderRadius: '6px',
                            border: '1.5px solid #CBD5E1',
                            fontSize: '13px',
                            boxSizing: 'border-box'
                          }}
                        />
                      </div>
                    </div>

                    <span style={{ fontSize: '11px', color: '#64748B' }}>
                      Encrypted with NIST SP 800-63B PBKDF2-HMAC-SHA256 (100,000 rounds).
                    </span>
                  </div>
                </div>
              )}

              {/* --- TAB 3: VIP RIDE & SERVICE PREFERENCES --- */}
              {activeTab === 'PREFERENCES' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                      Default Preferred Vehicle Class
                    </label>
                    <select
                      value={preferredVehicleClass}
                      onChange={(e) => setPreferredVehicleClass(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '10px 12px',
                        borderRadius: '8px',
                        border: '1.5px solid #CBD5E1',
                        fontSize: '13.5px',
                        color: '#0F172A',
                        outline: 'none',
                        backgroundColor: '#FFFFFF'
                      }}
                    >
                      <option value="BUSINESS_SEDAN">Business Class Sedan (Mercedes E-Class / BMW 5-Series)</option>
                      <option value="FIRST_CLASS">First Class Flagship (Mercedes S-Class / BMW 7-Series)</option>
                      <option value="LUXURY_SUV">Executive Luxury SUV (Cadillac Escalade / Lincoln Navigator)</option>
                      <option value="BUSINESS_VAN">Executive Sprinter / Business Van (Mercedes-Benz Sprinter)</option>
                    </select>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                        Target Cabin Temperature: {targetCabinTemp}°F
                      </label>
                      <div style={{ display: 'flex', gap: '6px' }}>
                        {[66, 68, 70, 72].map((t) => (
                          <button
                            key={t}
                            type="button"
                            onClick={() => setTargetCabinTemp(t)}
                            style={{
                              flex: 1,
                              padding: '8px',
                              borderRadius: '6px',
                              border: targetCabinTemp === t ? '1.5px solid #0A192F' : '1px solid #CBD5E1',
                              backgroundColor: targetCabinTemp === t ? '#0A192F' : '#FFFFFF',
                              color: targetCabinTemp === t ? '#FFFFFF' : '#334155',
                              fontSize: '12px',
                              fontWeight: 700,
                              cursor: 'pointer'
                            }}
                          >
                            {t}°F
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                        Preferred Beverage
                      </label>
                      <select
                        value={beverage}
                        onChange={(e) => setBeverage(e.target.value)}
                        style={{
                          width: '100%',
                          padding: '10px 12px',
                          borderRadius: '8px',
                          border: '1.5px solid #CBD5E1',
                          fontSize: '13px',
                          backgroundColor: '#FFFFFF'
                        }}
                      >
                        <option value="Chilled Fiji Water">Chilled Fiji Water</option>
                        <option value="San Pellegrino Sparkling">San Pellegrino Sparkling</option>
                        <option value="Room Temperature Evian">Room Temperature Evian</option>
                        <option value="None / No Preference">None / No Preference</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                      Cabin Audio / Atmosphere
                    </label>
                    <select
                      value={cabinAudio}
                      onChange={(e) => setCabinAudio(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '10px 12px',
                        borderRadius: '8px',
                        border: '1.5px solid #CBD5E1',
                        fontSize: '13px',
                        backgroundColor: '#FFFFFF'
                      }}
                    >
                      <option value="Quiet Ride / Do Not Disturb">Quiet Ride / Do Not Disturb (Executive Focus)</option>
                      <option value="Classical & Symphony">Classical & Symphony</option>
                      <option value="Acoustic & Executive Jazz">Acoustic & Executive Jazz</option>
                      <option value="Bloomberg / Financial News">Bloomberg / Financial News</option>
                    </select>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                      Chauffeur Etiquette & Special Instructions
                    </label>
                    <textarea
                      rows={2}
                      value={chauffeurNotes}
                      onChange={(e) => setChauffeurNotes(e.target.value)}
                      placeholder="e.g. Inside baggage claim meet & greet with tablet iPad sign. Please assist with luggage."
                      style={{
                        width: '100%',
                        padding: '10px 12px',
                        borderRadius: '8px',
                        border: '1.5px solid #CBD5E1',
                        fontSize: '13px',
                        outline: 'none',
                        boxSizing: 'border-box'
                      }}
                    />
                  </div>
                </div>
              )}

              {/* --- TAB 4: SAVED DESTINATIONS --- */}
              {activeTab === 'ADDRESSES' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '13px', fontWeight: 700, color: '#334155' }}>
                      Frequent VIP Locations
                    </span>
                    {!isAddingAddress && (
                      <button
                        type="button"
                        onClick={() => setIsAddingAddress(true)}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '5px',
                          padding: '6px 12px',
                          backgroundColor: '#0A192F',
                          color: '#FFFFFF',
                          border: 'none',
                          borderRadius: '6px',
                          fontSize: '12px',
                          fontWeight: 700,
                          cursor: 'pointer'
                        }}
                      >
                        <Plus size={14} />
                        <span>Add Destination</span>
                      </button>
                    )}
                  </div>

                  {/* Add Destination Sub-form */}
                  {isAddingAddress && (
                    <div
                      style={{
                        padding: '14px',
                        backgroundColor: '#F8FAFC',
                        borderRadius: '10px',
                        border: '1.5px solid #CBD5E1',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '10px'
                      }}
                    >
                      <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: '10px' }}>
                        <input
                          type="text"
                          required
                          placeholder="Label (e.g. Home)"
                          value={newAddrLabel}
                          onChange={(e) => setNewAddrLabel(e.target.value)}
                          style={{
                            padding: '8px 10px',
                            borderRadius: '6px',
                            border: '1px solid #CBD5E1',
                            fontSize: '12.5px'
                          }}
                        />
                        <input
                          type="text"
                          required
                          placeholder="Full Address (e.g. 1735 Market St, Philadelphia, PA)"
                          value={newAddrText}
                          onChange={(e) => setNewAddrText(e.target.value)}
                          style={{
                            padding: '8px 10px',
                            borderRadius: '6px',
                            border: '1px solid #CBD5E1',
                            fontSize: '12.5px'
                          }}
                        />
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#475569' }}>
                          <input
                            type="checkbox"
                            checked={isDefaultPickup}
                            onChange={(e) => setIsDefaultPickup(e.target.checked)}
                          />
                          <span>Set as default pickup location</span>
                        </label>

                        <div style={{ display: 'flex', gap: '6px' }}>
                          <button
                            type="button"
                            onClick={() => setIsAddingAddress(false)}
                            style={{
                              padding: '6px 12px',
                              backgroundColor: '#FFFFFF',
                              border: '1px solid #CBD5E1',
                              borderRadius: '6px',
                              fontSize: '12px',
                              cursor: 'pointer'
                            }}
                          >
                            Cancel
                          </button>
                          <button
                            type="button"
                            onClick={handleAddAddress}
                            style={{
                              padding: '6px 14px',
                              backgroundColor: '#0078D4',
                              color: '#FFFFFF',
                              border: 'none',
                              borderRadius: '6px',
                              fontSize: '12px',
                              fontWeight: 700,
                              cursor: 'pointer'
                            }}
                          >
                            Save Location
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* List of Saved Addresses */}
                  {savedAddresses.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '30px', color: '#94A3B8', fontSize: '13px' }}>
                      No saved destinations yet. Add Home, Office, or Airport for 1-click booking!
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {savedAddresses.map((addr) => (
                        <div
                          key={addr.id}
                          style={{
                            padding: '12px 14px',
                            borderRadius: '8px',
                            border: '1px solid #E2E8F0',
                            backgroundColor: '#FFFFFF',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            gap: '12px'
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <div
                              style={{
                                width: '32px',
                                height: '32px',
                                borderRadius: '6px',
                                backgroundColor: '#F1F5F9',
                                color: '#0A192F',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                              }}
                            >
                              <MapPin size={16} />
                            </div>
                            <div>
                              <div style={{ fontSize: '13px', fontWeight: 700, color: '#0F172A' }}>
                                {addr.label}
                                {addr.is_default_pickup && (
                                  <span style={{ marginLeft: '6px', fontSize: '10px', color: '#059669', fontWeight: 800 }}>
                                    (DEFAULT PICKUP)
                                  </span>
                                )}
                              </div>
                              <div style={{ fontSize: '12px', color: '#64748B' }}>
                                {addr.formatted_address}
                              </div>
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() => handleDeleteAddress(addr.id)}
                            style={{
                              background: 'none',
                              border: 'none',
                              color: '#EF4444',
                              cursor: 'pointer',
                              padding: '6px',
                              borderRadius: '4px'
                            }}
                            title="Delete Address"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Bottom Action Bar */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'flex-end',
                  gap: '10px',
                  paddingTop: '16px',
                  borderTop: '1px solid #F1F5F9'
                }}
              >
                <button
                  type="button"
                  onClick={onClose}
                  style={{
                    padding: '10px 18px',
                    borderRadius: '8px',
                    border: '1.5px solid #CBD5E1',
                    backgroundColor: '#FFFFFF',
                    color: '#334155',
                    fontSize: '13px',
                    fontWeight: 700,
                    cursor: 'pointer'
                  }}
                >
                  Close
                </button>

                <button
                  type="submit"
                  disabled={isSaving}
                  style={{
                    padding: '10px 24px',
                    borderRadius: '8px',
                    border: 'none',
                    backgroundColor: '#0A192F',
                    backgroundImage: 'linear-gradient(135deg, #0A192F 0%, #1E293B 100%)',
                    color: '#FFFFFF',
                    fontSize: '13px',
                    fontWeight: 800,
                    cursor: isSaving ? 'not-allowed' : 'pointer',
                    boxShadow: '0 2px 8px rgba(10, 25, 47, 0.25)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}
                >
                  <CheckCircle2 size={16} color="#D4AF37" />
                  <span>{isSaving ? 'Saving Changes...' : 'Save Profile & Settings'}</span>
                </button>
              </div>

            </form>
          )}

        </div>
      </div>
    </div>
  );
};

export default UserProfileModal;
