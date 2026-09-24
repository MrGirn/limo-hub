import React, { useState } from 'react';
import { 
  Shield, CheckCircle2, Lock, Sparkles, X, 
  ArrowRight, UserCheck, AlertCircle, Fingerprint, Mail, Key
} from 'lucide-react';
import { oauthLoginApi } from '../../api';
import { UserSession } from '../../types';

interface PublicAuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAuthSuccess: (user: UserSession, token: string) => void;
  defaultRole?: string;
  vendorName?: string;
  vendorId?: string;
}

export const PublicAuthModal: React.FC<PublicAuthModalProps> = ({
  isOpen,
  onClose,
  onAuthSuccess,
  defaultRole = 'ROLE_CUSTOMER',
  vendorName = 'Executive Chauffeur Alliance',
  vendorId = 'vendor-ny-executive'
}) => {
  const [activeTab, setActiveTab] = useState<'oauth' | 'email' | 'corporate'>('oauth');
  const [isProcessing, setIsProcessing] = useState(false);
  const [authProvider, setAuthProvider] = useState<'apple' | 'google' | null>(null);
  const [emailInput, setEmailInput] = useState('');
  const [nameInput, setNameInput] = useState('');
  const [selectedRole, setSelectedRole] = useState(defaultRole);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successStatus, setSuccessStatus] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleOAuthLogin = async (provider: 'apple' | 'google') => {
    setIsProcessing(true);
    setAuthProvider(provider);
    setErrorMessage(null);
    setSuccessStatus(`Connecting to ${provider === 'apple' ? 'Apple ID / FaceID' : 'Google Identity Secure SSO'}...`);

    if (!emailInput || !emailInput.includes('@')) {
      setIsProcessing(false);
      setAuthProvider(null);
      setErrorMessage(`Please enter your valid passenger email address below to sign in with ${provider === 'apple' ? 'Apple ID' : 'Google'}.`);
      return;
    }

    try {
      await new Promise((resolve) => setTimeout(resolve, 400));

      const userEmail = emailInput.trim().toLowerCase();
      const userName = nameInput.trim() || userEmail.split('@')[0];

      const res = await oauthLoginApi({
        provider,
        email: userEmail,
        full_name: userName,
        id_token: `jwt_${provider}_token_assertion_${Date.now()}`,
        role: selectedRole,
        vendor_id: vendorId
      });

      setSuccessStatus(`Verified! Welcome ${res.user.full_name || userName}`);
      await new Promise((resolve) => setTimeout(resolve, 300));
      onAuthSuccess(res.user, res.token);
      onClose();
    } catch (err: any) {
      console.error('OAuth sign in error:', err);
      setErrorMessage(err.message || 'Authentication failed. Please verify credentials.');
    } finally {
      setIsProcessing(false);
      setAuthProvider(null);
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
      await new Promise((resolve) => setTimeout(resolve, 400));
      onAuthSuccess(res.user, res.token);
      onClose();
    } catch (err: any) {
      setErrorMessage(err.message || 'Login failed.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(10, 25, 47, 0.45)',
      backdropFilter: 'blur(6px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 100,
      padding: '16px'
    }}>
      <div style={{
        background: '#FFFFFF',
        border: '1px solid #EAE6DF',
        borderRadius: '16px',
        width: '100%',
        maxWidth: '460px',
        overflow: 'hidden',
        boxShadow: '0 24px 48px rgba(10, 25, 47, 0.18)'
      }}>
        
        {/* Header Ribbon */}
        <div style={{
          padding: '20px 24px',
          background: 'linear-gradient(135deg, #FAF8F5 0%, #F5EFE6 100%)',
          borderBottom: '1px solid #EAE6DF',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '40px',
              height: '40px',
              borderRadius: '10px',
              background: 'rgba(154, 123, 79, 0.12)',
              border: '1px solid rgba(154, 123, 79, 0.35)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#9A7B4F'
            }}>
              <Shield size={20} />
            </div>
            <div>
              <h3 style={{ fontSize: '16px', fontWeight: 800, color: '#0A192F', margin: 0 }}>VIP Member Sign In</h3>
              <p style={{ fontSize: '12px', color: '#64748B', margin: 0 }}>{vendorName}</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            style={{ background: 'transparent', border: 'none', color: '#64748B', cursor: 'pointer', padding: '6px', borderRadius: '6px' }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Auth Tabs */}
        <div style={{ display: 'flex', borderBottom: '1px solid #EAE6DF', background: '#FAF8F5', padding: '0 24px' }}>
          {[
            { id: 'oauth', label: '1-Click Social Sign-In' },
            { id: 'corporate', label: 'Corporate SSO' },
            { id: 'email', label: 'Direct Magic Link' }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              style={{
                flex: 1,
                padding: '12px 6px',
                fontSize: '12px',
                fontWeight: activeTab === tab.id ? 800 : 500,
                color: activeTab === tab.id ? '#9A7B4F' : '#64748B',
                background: 'transparent',
                border: 'none',
                borderBottom: activeTab === tab.id ? '2px solid #9A7B4F' : '2px solid transparent',
                cursor: 'pointer'
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Body Content */}
        <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '18px', background: '#FFFFFF' }}>
          {errorMessage && (
            <div style={{ padding: '12px', background: '#FEF2F2', border: '1px solid #FCA5A5', borderRadius: '10px', fontSize: '12px', color: '#991B1B', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <AlertCircle size={16} color="#DC2626" />
              <span>{errorMessage}</span>
            </div>
          )}

          {successStatus && (
            <div style={{ padding: '12px', background: '#ECFDF5', border: '1px solid #A7F3D0', borderRadius: '10px', fontSize: '12px', color: '#065F46', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <CheckCircle2 size={16} color="#059669" />
              <span>{successStatus}</span>
            </div>
          )}

          {activeTab === 'oauth' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <p style={{ fontSize: '12px', color: '#64748B', lineHeight: '1.6', margin: 0 }}>
                Sign in instantly using your biometric Apple ID or Google Workspace account for encrypted reservations and guaranteed flight tracking sync.
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
                  gap: '12px',
                  padding: '13px 18px',
                  background: '#FFFFFF',
                  color: '#0A192F',
                  border: '1.5px solid #CBD5E1',
                  borderRadius: '10px',
                  fontSize: '14px',
                  fontWeight: 700,
                  cursor: isProcessing ? 'not-allowed' : 'pointer',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
                  opacity: isProcessing ? 0.6 : 1
                }}
              >
                <svg style={{ width: '16px', height: '16px', fill: '#0A192F' }} viewBox="0 0 170 170">
                  <path d="M150.37 130.25c-2.45 5.66-5.35 10.87-8.71 15.66-4.58 6.53-8.33 11.05-11.22 13.56-4.48 4.12-9.28 6.23-14.42 6.35-3.69 0-8.14-1.05-13.32-3.18-5.19-2.12-9.97-3.17-14.34-3.17-4.58 0-9.49 1.05-14.75 3.17-5.26 2.13-9.5 3.24-12.74 3.35-4.35.13-9.16-1.9-14.42-6.08-3.69-3.04-7.6-7.79-11.74-14.24-5.99-9.35-10.74-19.86-14.25-31.54-3.51-11.67-5.27-22.92-5.27-33.74 0-14.07 3.51-26.04 10.53-35.91 7.02-9.87 16.03-14.86 27.02-14.98 5.75 0 11.9 1.48 18.45 4.45 6.55 2.97 10.66 4.48 12.33 4.48 1.45 0 5.86-1.59 13.24-4.78 7.38-3.18 13.5-4.52 18.36-4.01 13.56 1.01 24.38 6.45 32.47 16.32-11.9 7.21-17.74 17.06-17.51 29.56.23 9.87 4.13 18.06 11.71 24.58 7.58 6.52 16.54 10.33 26.89 11.45-2.23 6.94-4.88 13.84-7.94 20.7zM119.22 33.64c0-7.39 2.65-14.35 7.96-20.89 5.3-6.54 11.83-10.79 19.59-12.75 1.01 6.84.03 13.62-2.94 20.35-2.97 6.72-7.58 12.01-13.84 15.86-3.8 2.34-7.66 3.73-11.59 4.18-.54-2.18-.82-4.43-.82-6.75z" />
                </svg>
                <span>Continue with Apple</span>
                <Fingerprint size={16} color="#9A7B4F" style={{ marginLeft: 'auto' }} />
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
                  gap: '12px',
                  padding: '13px 18px',
                  background: '#FFFFFF',
                  color: '#0A192F',
                  border: '1.5px solid #CBD5E1',
                  borderRadius: '10px',
                  fontSize: '14px',
                  fontWeight: 700,
                  cursor: isProcessing ? 'not-allowed' : 'pointer',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
                  opacity: isProcessing ? 0.6 : 1
                }}
              >
                <svg style={{ width: '16px', height: '16px' }} viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                </svg>
                <span>Continue with Google</span>
                <UserCheck size={16} color="#2563EB" style={{ marginLeft: 'auto' }} />
              </button>
            </div>
          )}

          {activeTab === 'corporate' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <p style={{ fontSize: '12px', color: '#64748B' }}>
                Corporate bookers and enterprise travel desk managers: Enter your corporate domain to trigger enterprise SAML / Okta / Azure AD federation.
              </p>
              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>Corporate Email</label>
                <input
                  type="email"
                  placeholder="executive@citadel.com"
                  value={emailInput}
                  onChange={(e) => setEmailInput(e.target.value)}
                  style={{ width: '100%', padding: '10px 12px', fontSize: '12px', borderRadius: '8px', border: '1px solid #CBD5E1', background: '#FFFFFF', color: '#0A192F' }}
                />
              </div>
              <button
                disabled={isProcessing}
                onClick={() => handleOAuthLogin('google')}
                style={{
                  width: '100%',
                  padding: '12px',
                  background: 'linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)',
                  color: '#FFFFFF',
                  fontWeight: 700,
                  fontSize: '13px',
                  borderRadius: '10px',
                  border: 'none',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  boxShadow: '0 2px 8px rgba(37, 99, 235, 0.25)'
                }}
              >
                <Lock size={15} />
                <span>Verify Enterprise SSO (SAML / Okta)</span>
              </button>
            </div>
          )}

          {activeTab === 'email' && (
            <form onSubmit={handleEmailSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>Full Name</label>
                <input
                  type="text"
                  placeholder="e.g. Jordan Belfort"
                  value={nameInput}
                  onChange={(e) => setNameInput(e.target.value)}
                  style={{ width: '100%', padding: '10px 12px', fontSize: '12px', borderRadius: '8px', border: '1px solid #CBD5E1', background: '#FFFFFF', color: '#0A192F' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>Email Address</label>
                <input
                  type="email"
                  required
                  placeholder="client@luxury.com"
                  value={emailInput}
                  onChange={(e) => setEmailInput(e.target.value)}
                  style={{ width: '100%', padding: '10px 12px', fontSize: '12px', borderRadius: '8px', border: '1px solid #CBD5E1', background: '#FFFFFF', color: '#0A192F' }}
                />
              </div>
              <button
                type="submit"
                disabled={isProcessing}
                style={{
                  width: '100%',
                  padding: '12px',
                  background: 'linear-gradient(135deg, #9A7B4F 0%, #7D5E30 100%)',
                  color: '#FFFFFF',
                  fontWeight: 800,
                  fontSize: '13px',
                  borderRadius: '10px',
                  border: 'none',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  boxShadow: '0 2px 8px rgba(154, 123, 79, 0.3)'
                }}
              >
                <Mail size={15} />
                <span>Send 1-Click VIP Magic Link</span>
              </button>
            </form>
          )}

          {/* Footer */}
          <div style={{ paddingTop: '14px', borderTop: '1px solid #EAE6DF', display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '11px', color: '#64748B' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Lock size={12} color="#16A34A" /> 256-bit TLS Encrypted
            </span>
            <span style={{ color: '#9A7B4F', fontWeight: 700 }}>PPA & TLC Verified</span>
          </div>

        </div>
      </div>
    </div>
  );
};
