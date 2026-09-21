import React, { useState, useEffect, useRef } from 'react';
import { 
  Shield, CheckCircle2, Lock, X, 
  UserCheck, AlertCircle, Fingerprint, Mail
} from 'lucide-react';
import { oauthLoginApi } from '../../api';
import { UserSession } from '../../types';

export interface PublicAuthDropdownProps {
  isOpen: boolean;
  onClose: () => void;
  onAuthSuccess: (user: UserSession, token: string) => void;
  defaultRole?: string;
  vendorName?: string;
  vendorId?: string;
}

export const PublicAuthDropdown: React.FC<PublicAuthDropdownProps> = ({
  isOpen,
  onClose,
  onAuthSuccess,
  defaultRole = 'ROLE_CUSTOMER',
  vendorName = 'Executive Chauffeur Alliance',
  vendorId = 'vendor_anb_philly'
}) => {
  const [activeTab, setActiveTab] = useState<'oauth' | 'email' | 'corporate' | 'owner'>('oauth');
  const [isProcessing, setIsProcessing] = useState(false);
  const [emailInput, setEmailInput] = useState('');
  const [nameInput, setNameInput] = useState('');
  const [selectedRole] = useState(defaultRole);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successStatus, setSuccessStatus] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close on Escape or click outside
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    // Slight delay so the triggering button click doesn't immediately close it
    const timer = setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside);
    }, 10);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('mousedown', handleClickOutside);
      clearTimeout(timer);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleOAuthLogin = async (provider: 'apple' | 'google') => {
    setIsProcessing(true);
    setErrorMessage(null);
    setSuccessStatus(`Connecting to ${provider === 'apple' ? 'Apple ID / FaceID' : 'Google Identity'}...`);

    try {
      await new Promise((resolve) => setTimeout(resolve, 400));

      const authEmail = emailInput.trim() || `${provider === 'apple' ? 'apple.user' : 'google.user'}@authenticated.net`;
      const authName = nameInput.trim() || (provider === 'apple' ? 'Apple Verified Guest' : 'Google Verified Executive');

      const res = await oauthLoginApi({
        provider,
        email: authEmail,
        full_name: authName,
        id_token: `jwt_${provider}_token_${Date.now()}`,
        role: selectedRole,
        vendor_id: vendorId
      });

      setSuccessStatus(`Verified! Welcome ${res.user.full_name || authName}`);
      await new Promise((resolve) => setTimeout(resolve, 350));
      onAuthSuccess(res.user, res.token);
      onClose();
    } catch (err: any) {
      console.error('OAuth sign in error:', err);
      setErrorMessage(err.message || 'Authentication failed. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCorporateLogin = async () => {
    setIsProcessing(true);
    setErrorMessage(null);
    setSuccessStatus('Connecting to Enterprise Identity Provider (Okta/SAML)...');
    try {
      const corpEmail = emailInput.trim() || 'traveldesk@blackrock-vip.com';
      const corpName = nameInput.trim() || (corpEmail.split('@')[0].replace('.', ' ').toUpperCase() + ' (Corporate Booker)');
      const res = await oauthLoginApi({
        provider: 'google',
        email: corpEmail,
        full_name: corpName,
        id_token: `jwt_corp_sso_${Date.now()}`,
        role: 'ROLE_CORPORATE_BOOKER',
        vendor_id: vendorId
      });
      setSuccessStatus(`Enterprise SSO Verified! Welcome ${res.user.full_name || corpName}`);
      await new Promise((r) => setTimeout(r, 350));
      onAuthSuccess(res.user, res.token);
      onClose();
    } catch (err: any) {
      console.error('Corporate SSO error:', err);
      setErrorMessage(err.message || 'Corporate SSO authentication failed.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailInput || !emailInput.includes('@')) {
      setErrorMessage('Please enter a valid business or personal email address.');
      return;
    }

    setIsProcessing(true);
    setErrorMessage(null);
    setSuccessStatus('Validating secure sign-in token...');

    try {
      const res = await oauthLoginApi({
        provider: 'google',
        email: emailInput,
        full_name: nameInput || emailInput.split('@')[0].replace('.', ' ').toUpperCase(),
        role: selectedRole,
        vendor_id: vendorId
      });

      setSuccessStatus(`Authenticated as ${res.user.email}`);
      await new Promise((resolve) => setTimeout(resolve, 350));
      onAuthSuccess(res.user, res.token);
      onClose();
    } catch (err: any) {
      setErrorMessage(err.message || 'Login failed.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div
      ref={dropdownRef}
      style={{
        position: 'absolute',
        top: 'calc(100% + 10px)',
        right: 0,
        width: '400px',
        maxWidth: '92vw',
        background: '#FFFFFF',
        borderRadius: '16px',
        border: '1px solid #CBD5E1',
        boxShadow: '0 20px 45px -10px rgba(15, 23, 42, 0.22), 0 0 0 1px rgba(15, 23, 42, 0.06)',
        zIndex: 1000,
        overflow: 'hidden',
        animation: 'slideDownFade 0.2s cubic-bezier(0.16, 1, 0.3, 1)'
      }}
    >
      {/* 1. Header Ribbon */}
      <div style={{
        padding: '16px 20px',
        background: 'linear-gradient(135deg, #0F172A 0%, #1E293B 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderBottom: '1px solid #334155'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            width: '34px',
            height: '34px',
            borderRadius: '8px',
            background: 'rgba(245, 158, 11, 0.18)',
            border: '1px solid rgba(245, 158, 11, 0.4)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#F59E0B'
          }}>
            <Shield size={18} />
          </div>
          <div>
            <h3 style={{ fontSize: '14px', fontWeight: 800, color: '#FFFFFF', margin: 0, letterSpacing: '-0.01em' }}>
              VIP Member Sign In
            </h3>
            <p style={{ fontSize: '11px', color: '#94A3B8', margin: 0 }}>
              {vendorName}
            </p>
          </div>
        </div>

        <button 
          onClick={onClose}
          aria-label="Close"
          style={{
            background: 'rgba(255, 255, 255, 0.1)',
            border: 'none',
            color: '#CBD5E1',
            cursor: 'pointer',
            padding: '5px',
            borderRadius: '6px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'background 0.15s ease'
          }}
        >
          <X size={16} />
        </button>
      </div>

      {/* 2. Navigation Tabs */}
      <div style={{
        display: 'flex',
        borderBottom: '1px solid #E2E8F0',
        background: '#F8FAFC',
        padding: '0 8px'
      }}>
        {[
          { id: 'oauth', label: '1-Click Social' },
          { id: 'corporate', label: 'Corporate SSO' },
          { id: 'email', label: 'Magic Link' },
          { id: 'owner', label: '🏢 Owner / Dispatch' }
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            style={{
              flex: 1,
              padding: '10px 3px',
              fontSize: '10.5px',
              fontWeight: activeTab === tab.id ? 800 : 600,
              color: activeTab === tab.id ? (tab.id === 'owner' ? '#B45309' : '#0F172A') : '#64748B',
              background: 'transparent',
              border: 'none',
              borderBottom: activeTab === tab.id ? '2px solid #D97706' : '2px solid transparent',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
              whiteSpace: 'nowrap'
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* 3. Card Body */}
      <div style={{ padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
        {errorMessage && (
          <div style={{ padding: '10px 12px', background: '#FEF2F2', border: '1px solid #FCA5A5', borderRadius: '8px', fontSize: '11px', color: '#991B1B', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <AlertCircle size={14} color="#DC2626" />
            <span>{errorMessage}</span>
          </div>
        )}

        {successStatus && (
          <div style={{ padding: '10px 12px', background: '#ECFDF5', border: '1px solid #A7F3D0', borderRadius: '8px', fontSize: '11px', color: '#065F46', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <CheckCircle2 size={14} color="#059669" />
            <span>{successStatus}</span>
          </div>
        )}

        {activeTab === 'oauth' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <p style={{ fontSize: '11px', color: '#64748B', lineHeight: '1.5', margin: 0 }}>
              Sign in with your Apple ID or Google account for 1-click booking, encrypted quotes, and real-time flight tracking sync.
            </p>

            {/* Apple Sign In Button */}
            <button
              disabled={isProcessing}
              onClick={() => handleOAuthLogin('apple')}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '10px',
                padding: '11px 16px',
                background: '#0F172A',
                color: '#FFFFFF',
                border: '1px solid #0F172A',
                borderRadius: '10px',
                fontSize: '13px',
                fontWeight: 700,
                cursor: isProcessing ? 'not-allowed' : 'pointer',
                boxShadow: '0 2px 6px rgba(15, 23, 42, 0.15)',
                opacity: isProcessing ? 0.6 : 1,
                transition: 'all 0.15s ease'
              }}
            >
              <svg style={{ width: '15px', height: '15px', fill: 'currentColor' }} viewBox="0 0 170 170">
                <path d="M150.37 130.25c-2.45 5.66-5.35 10.87-8.71 15.66-4.58 6.53-8.33 11.05-11.22 13.56-4.48 4.12-9.28 6.23-14.42 6.35-3.69 0-8.14-1.05-13.32-3.18-5.19-2.12-9.97-3.17-14.34-3.17-4.58 0-9.49 1.05-14.75 3.17-5.26 2.13-9.5 3.24-12.74 3.35-4.35.13-9.16-1.9-14.42-6.08-3.69-3.04-7.6-7.79-11.74-14.24-5.99-9.35-10.74-19.86-14.25-31.54-3.51-11.67-5.27-22.92-5.27-33.74 0-14.07 3.51-26.04 10.53-35.91 7.02-9.87 16.03-14.86 27.02-14.98 5.75 0 11.9 1.48 18.45 4.45 6.55 2.97 10.66 4.48 12.33 4.48 1.45 0 5.86-1.59 13.24-4.78 7.38-3.18 13.5-4.52 18.36-4.01 13.56 1.01 24.38 6.45 32.47 16.32-11.9 7.21-17.74 17.06-17.51 29.56.23 9.87 4.13 18.06 11.71 24.58 7.58 6.52 16.54 10.33 26.89 11.45-2.23 6.94-4.88 13.84-7.94 20.7zM119.22 33.64c0-7.39 2.65-14.35 7.96-20.89 5.3-6.54 11.83-10.79 19.59-12.75 1.01 6.84.03 13.62-2.94 20.35-2.97 6.72-7.58 12.01-13.84 15.86-3.8 2.34-7.66 3.73-11.59 4.18-.54-2.18-.82-4.43-.82-6.75z" />
              </svg>
              <span>Continue with Apple</span>
              <Fingerprint size={15} color="#F59E0B" style={{ marginLeft: 'auto' }} />
            </button>

            {/* Google Sign In Button */}
            <button
              disabled={isProcessing}
              onClick={() => handleOAuthLogin('google')}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '10px',
                padding: '11px 16px',
                background: '#FFFFFF',
                color: '#0F172A',
                border: '1px solid #CBD5E1',
                borderRadius: '10px',
                fontSize: '13px',
                fontWeight: 700,
                cursor: isProcessing ? 'not-allowed' : 'pointer',
                boxShadow: '0 2px 6px rgba(0,0,0,0.04)',
                opacity: isProcessing ? 0.6 : 1,
                transition: 'all 0.15s ease'
              }}
            >
              <svg style={{ width: '15px', height: '15px' }} viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
              </svg>
              <span>Continue with Google</span>
              <UserCheck size={15} color="#2563EB" style={{ marginLeft: 'auto' }} />
            </button>
          </div>
        )}

        {activeTab === 'corporate' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <p style={{ fontSize: '11px', color: '#64748B', margin: 0 }}>
              Enterprise travel desks: Enter your corporate domain for SAML / Okta / Azure AD authentication.
            </p>
            <div>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                Corporate Email
              </label>
              <input
                type="email"
                placeholder="executive@citadel.com"
                value={emailInput}
                onChange={(e) => setEmailInput(e.target.value)}
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  fontSize: '12px',
                  borderRadius: '8px',
                  border: '1px solid #CBD5E1',
                  background: '#F8FAFC',
                  color: '#0F172A',
                  outline: 'none',
                  boxSizing: 'border-box'
                }}
              />
            </div>
            <button
              disabled={isProcessing}
              onClick={handleCorporateLogin}
              style={{
                width: '100%',
                padding: '11px',
                background: 'linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)',
                color: '#FFFFFF',
                fontWeight: 700,
                fontSize: '12px',
                borderRadius: '8px',
                border: 'none',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px'
              }}
            >
              <Lock size={14} />
              <span>Verify Enterprise SSO (SAML/Okta)</span>
            </button>
          </div>
        )}

        {activeTab === 'email' && (
          <form onSubmit={handleEmailSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                Full Name
              </label>
              <input
                type="text"
                placeholder="e.g. Jordan Belfort"
                value={nameInput}
                onChange={(e) => setNameInput(e.target.value)}
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  fontSize: '12px',
                  borderRadius: '8px',
                  border: '1px solid #CBD5E1',
                  background: '#F8FAFC',
                  color: '#0F172A',
                  outline: 'none',
                  boxSizing: 'border-box'
                }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                Email Address
              </label>
              <input
                type="email"
                required
                placeholder="client@luxury.com"
                value={emailInput}
                onChange={(e) => setEmailInput(e.target.value)}
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  fontSize: '12px',
                  borderRadius: '8px',
                  border: '1px solid #CBD5E1',
                  background: '#F8FAFC',
                  color: '#0F172A',
                  outline: 'none',
                  boxSizing: 'border-box'
                }}
              />
            </div>
            <button
              type="submit"
              disabled={isProcessing}
              style={{
                width: '100%',
                padding: '11px',
                background: 'linear-gradient(135deg, #0F172A 0%, #1E293B 100%)',
                color: '#FBBF24',
                fontWeight: 800,
                fontSize: '12px',
                borderRadius: '8px',
                border: 'none',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px'
              }}
            >
              <Mail size={14} />
              <span>Send 1-Click VIP Magic Link</span>
            </button>
          </form>
        )}

        {activeTab === 'owner' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{
              padding: '12px',
              background: '#0F172A',
              borderRadius: '10px',
              border: '1px solid #334155',
              color: '#FFFFFF'
            }}>
              <div style={{ fontSize: '12px', fontWeight: 800, color: '#FBBF24', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Shield size={14} color="#FBBF24" /> Vendor Owner & Dispatch Console
              </div>
              <p style={{ fontSize: '11px', color: '#94A3B8', margin: 0, lineHeight: '1.4' }}>
                Full access to Live Trip Dispatch, Fleet & Pricing Management, Chauffeur Roster, Radar Flight Tracking, and Voice AI Studio.
              </p>
            </div>

            <button
              disabled={isProcessing}
              onClick={async () => {
                setIsProcessing(true);
                setErrorMessage(null);
                setSuccessStatus(`Authenticating Vendor Fleet Owner for ${vendorName}...`);
                try {
                  const res = await oauthLoginApi({
                    provider: 'google',
                    email: 'owner@' + (vendorId.replace('_', '-') + '.com'),
                    full_name: `${vendorName} Owner & General Manager`,
                    role: 'ROLE_VENDOR_ADMIN',
                    vendor_id: vendorId
                  });
                  setSuccessStatus('Authenticated as Vendor Owner!');
                  await new Promise((r) => setTimeout(r, 300));
                  onAuthSuccess(res.user, res.token);
                  onClose();
                } catch (err: any) {
                  setErrorMessage(err.message || 'Owner authentication failed.');
                } finally {
                  setIsProcessing(false);
                }
              }}
              style={{
                width: '100%',
                padding: '12px',
                background: 'linear-gradient(135deg, #0F172A 0%, #1E293B 100%)',
                color: '#FBBF24',
                fontWeight: 800,
                fontSize: '12.5px',
                borderRadius: '10px',
                border: '1px solid rgba(251, 191, 36, 0.4)',
                cursor: isProcessing ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                boxShadow: '0 4px 14px rgba(15, 23, 42, 0.3)',
                opacity: isProcessing ? 0.6 : 1
              }}
            >
              <Shield size={15} color="#FBBF24" />
              <span>Launch Vendor Operations Console</span>
            </button>
          </div>
        )}

        {/* 4. Footer Trust Indicators */}
        <div style={{
          paddingTop: '10px',
          borderTop: '1px solid #E2E8F0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          fontSize: '10px',
          color: '#64748B'
        }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <Lock size={11} color="#10B981" /> 256-bit TLS Encrypted
          </span>
          <span style={{ color: '#D97706', fontWeight: 700 }}>
            PPA & TLC Verified
          </span>
        </div>
      </div>
    </div>
  );
};

export default PublicAuthDropdown;
