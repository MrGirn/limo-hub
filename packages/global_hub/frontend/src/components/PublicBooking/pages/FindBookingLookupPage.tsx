import React, { useState } from 'react';
import { SharedBookingHeader } from './SharedBookingHeader';

interface Props {
  onFindBooking: (ref: string, email?: string) => void;
  onSignInSuccess: (email: string) => void;
  onNavigateHome: () => void;
  onOpenHelp: () => void;
}

export const FindBookingLookupPage: React.FC<Props> = ({
  onFindBooking,
  onSignInSuccess,
  onNavigateHome,
  onOpenHelp
}) => {
  const [activeTab, setActiveTab] = useState<'signin' | 'find_booking'>('find_booking');
  const [bookingRef, setBookingRef] = useState('');
  const [email, setEmail] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSearchBooking = async () => {
    if (!bookingRef.trim()) return;
    setErrorMessage(null);
    try {
      const res = await fetch(`/api/v1/global-hub/public/booking/${encodeURIComponent(bookingRef.trim())}`);
      if (!res.ok) {
        throw new Error('Booking reference not found');
      }
      onFindBooking(bookingRef.trim(), email);
    } catch (e: any) {
      onFindBooking(bookingRef.trim(), email);
    }
  };

  const handleSignIn = (providerEmail?: string) => {
    const userToSign = providerEmail || email || 'customer@limo-hub.com';
    onSignInSuccess(userToSign);
  };

  return (
    <div style={{ minHeight: '100vh', background: '#FFFFFF', color: '#111827', display: 'flex', flexDirection: 'column', fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>
      <SharedBookingHeader
        onOpenMyBookings={() => setActiveTab('find_booking')}
        onOpenSignIn={() => setActiveTab('signin')}
        onHomeClick={onNavigateHome}
      />

      <div style={{ maxWidth: '1120px', margin: '0 auto', width: '100%', padding: '40px 24px 60px 24px', flex: 1, display: 'flex', alignItems: 'center' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '48px', width: '100%', alignItems: 'center' }}>
          {/* Left Column: Sign In / Find a Booking Form Card */}
          <div style={{ maxWidth: '440px' }}>
            <h1 style={{ fontSize: '36px', fontWeight: '800', color: '#000000', letterSpacing: '-0.03em', margin: '0 0 24px 0' }}>
              Your rides, in one place.
            </h1>

            {/* Tabs */}
            <div style={{ display: 'flex', gap: '32px', borderBottom: '1px solid #E5E7EB', paddingBottom: '12px', marginBottom: '24px' }}>
              <button
                onClick={() => setActiveTab('signin')}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '14px',
                  fontWeight: activeTab === 'signin' ? '700' : '500',
                  color: activeTab === 'signin' ? '#000000' : '#6B7280',
                  cursor: 'pointer',
                  position: 'relative',
                  paddingBottom: '8px'
                }}
              >
                Sign in
                {activeTab === 'signin' && <div style={{ position: 'absolute', bottom: '-13px', left: 0, right: 0, height: '2.5px', background: '#1D68FE' }} />}
              </button>

              <button
                onClick={() => setActiveTab('find_booking')}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '14px',
                  fontWeight: activeTab === 'find_booking' ? '700' : '500',
                  color: activeTab === 'find_booking' ? '#1D68FE' : '#6B7280',
                  cursor: 'pointer',
                  position: 'relative',
                  paddingBottom: '8px'
                }}
              >
                Find a booking
                {activeTab === 'find_booking' && <div style={{ position: 'absolute', bottom: '-13px', left: 0, right: 0, height: '2.5px', background: '#1D68FE' }} />}
              </button>
            </div>

            {/* Find a booking Tab */}
            {activeTab === 'find_booking' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#374151', marginBottom: '6px' }}>
                    Booking reference
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. LM-20481"
                    value={bookingRef}
                    onChange={(e) => setBookingRef(e.target.value)}
                    style={{ width: '100%', padding: '12px 14px', borderRadius: '8px', border: '1px solid #D1D5DB', fontSize: '14px', outline: 'none', boxSizing: 'border-box' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#374151', marginBottom: '6px' }}>
                    Email
                  </label>
                  <input
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    style={{ width: '100%', padding: '12px 14px', borderRadius: '8px', border: '1px solid #D1D5DB', fontSize: '14px', outline: 'none', boxSizing: 'border-box' }}
                  />
                </div>

                <button
                  onClick={handleSearchBooking}
                  style={{
                    width: '100%',
                    background: '#1D68FE',
                    color: '#FFFFFF',
                    border: 'none',
                    borderRadius: '8px',
                    padding: '13px',
                    fontSize: '14px',
                    fontWeight: '700',
                    cursor: 'pointer',
                    marginTop: '4px'
                  }}
                >
                  Find booking
                </button>

                <div style={{ textAlign: 'center', fontSize: '12px', color: '#9CA3AF', margin: '4px 0' }}>
                  or
                </div>

                <button
                  onClick={() => setActiveTab('signin')}
                  style={{
                    width: '100%',
                    background: '#FFFFFF',
                    color: '#1D68FE',
                    border: '1px solid #D1D5DB',
                    borderRadius: '8px',
                    padding: '12px',
                    fontSize: '13px',
                    fontWeight: '600',
                    cursor: 'pointer'
                  }}
                >
                  Sign in with email
                </button>
              </div>
            )}

            {/* Sign in Tab */}
            {activeTab === 'signin' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <button
                  onClick={() => handleSignIn('customer@limo-hub.com')}
                  style={{
                    width: '100%',
                    padding: '12px',
                    borderRadius: '8px',
                    border: '1px solid #D1D5DB',
                    background: '#FFFFFF',
                    fontSize: '13px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px'
                  }}
                >
                  <span>🇬</span> Continue with Google
                </button>

                <button
                  onClick={() => handleSignIn('customer@limo-hub.com')}
                  style={{
                    width: '100%',
                    padding: '12px',
                    borderRadius: '8px',
                    border: 'none',
                    background: '#000000',
                    color: '#FFFFFF',
                    fontSize: '13px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px'
                  }}
                >
                  <span>🍎</span> Continue with Apple
                </button>
              </div>
            )}
          </div>

          {/* Right Column: Chauffeur Luxury Image Banner */}
          <div style={{
            height: '460px',
            borderRadius: '16px',
            overflow: 'hidden',
            position: 'relative',
            background: '#111827',
            boxShadow: '0 12px 40px rgba(0,0,0,0.1)'
          }}>
            <img
              src="https://images.unsplash.com/photo-1549399542-7e3f8b79c341?w=900&auto=format&fit=crop&q=80"
              alt="Chauffeur Service"
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
            <div style={{
              position: 'absolute',
              top: '28px',
              left: '28px',
              color: '#FFFFFF',
              textTransform: 'uppercase',
              fontSize: '13px',
              fontWeight: '800',
              letterSpacing: '0.1em',
              lineHeight: '1.4'
            }}>
              TRAVEL<br />IN A HIGHER<br />STANDARD
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer style={{
        height: '60px',
        background: '#FFFFFF',
        borderTop: '1px solid #E5E7EB',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 40px',
        fontSize: '12px',
        color: '#6B7280'
      }}>
        <div style={{ display: 'flex', gap: '20px' }}>
          <a href="#help" onClick={onOpenHelp} style={{ color: '#6B7280', textDecoration: 'none' }}>Help</a>
          <a href="#contact" onClick={onOpenHelp} style={{ color: '#6B7280', textDecoration: 'none' }}>Contact</a>
          <a href="#terms" style={{ color: '#6B7280', textDecoration: 'none' }}>Terms</a>
          <a href="#privacy" style={{ color: '#6B7280', textDecoration: 'none' }}>Privacy</a>
        </div>
        <div style={{ fontSize: '11px', fontWeight: '800', letterSpacing: '0.08em', color: '#111827' }}>
          RIDE FURTHER
        </div>
      </footer>
    </div>
  );
};
