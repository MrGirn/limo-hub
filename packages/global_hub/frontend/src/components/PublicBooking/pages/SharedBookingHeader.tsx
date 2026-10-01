import React from 'react';
import { ChevronDown, User, Lock } from 'lucide-react';

interface Props {
  onOpenMyBookings?: () => void;
  onOpenSignIn?: () => void;
  onHomeClick?: () => void;
}

export const SharedBookingHeader: React.FC<Props> = ({
  onOpenMyBookings,
  onOpenSignIn,
  onHomeClick
}) => {
  return (
    <header style={{
      height: '60px',
      background: '#FFFFFF',
      borderBottom: '1px solid #E5E7EB',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 40px',
      position: 'sticky',
      top: 0,
      zIndex: 50
    }}>
      {/* Brand Logo */}
      <div
        onClick={onHomeClick}
        style={{
          fontSize: '22px',
          fontWeight: '900',
          letterSpacing: '-0.04em',
          color: '#000000',
          cursor: 'pointer',
          fontFamily: 'system-ui, -apple-system, sans-serif'
        }}
      >
        LIMO
      </div>

      {/* Right Navigation */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '28px',
        fontSize: '13px',
        fontWeight: '500',
        color: '#4B5563'
      }}>
        <span
          onClick={onOpenMyBookings}
          style={{ cursor: 'pointer', color: '#1F2937' }}
        >
          My bookings
        </span>

        <span
          onClick={() => alert('Support available 24/7 at support@limo.com')}
          style={{ cursor: 'pointer', color: '#1F2937' }}
        >
          Help
        </span>

        <span
          onClick={onOpenSignIn}
          style={{ cursor: 'pointer', color: '#1F2937' }}
        >
          Sign in
        </span>

        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '4px',
          cursor: 'pointer',
          color: '#1F2937',
          fontWeight: '500'
        }}>
          <span>EN / USD</span>
          <ChevronDown size={14} color="#6B7280" />
        </div>
      </div>
    </header>
  );
};
