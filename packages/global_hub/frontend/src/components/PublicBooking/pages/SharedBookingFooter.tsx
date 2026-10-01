import React from 'react';

interface FooterProps {
  onOpenHelp?: () => void;
}

export const SharedBookingFooter: React.FC<FooterProps> = ({ onOpenHelp }) => {
  return (
    <footer style={{
      height: '64px',
      background: '#FFFFFF',
      borderTop: '1px solid #E5E7EB',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 40px',
      marginTop: 'auto',
      fontSize: '12px',
      color: '#6B7280'
    }}>
      <div style={{ display: 'flex', gap: '20px' }}>
        <a href="#help" onClick={(e) => { if (onOpenHelp) { e.preventDefault(); onOpenHelp(); } }} style={{ color: '#6B7280', textDecoration: 'none' }}>Help</a>
        <a href="#contact" onClick={(e) => { if (onOpenHelp) { e.preventDefault(); onOpenHelp(); } }} style={{ color: '#6B7280', textDecoration: 'none' }}>Contact</a>
        <a href="#terms" style={{ color: '#6B7280', textDecoration: 'none' }}>Terms</a>
        <a href="#privacy" style={{ color: '#6B7280', textDecoration: 'none' }}>Privacy</a>
      </div>


      <div style={{
        fontSize: '16px',
        fontWeight: '900',
        letterSpacing: '-0.04em',
        color: '#000000'
      }}>
        LIMO
      </div>
    </footer>
  );
};
