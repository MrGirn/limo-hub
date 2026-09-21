import React from 'react';
import { useAuth } from '../context/AuthContext';
import { Shield, User, Car, Building, Globe, KeyRound, CheckCircle2 } from 'lucide-react';
import { UserRole } from '../types';

export const ActorImpersonationBar: React.FC = () => {
  const { user, currentPersonaKey, personas, switchPersona, isLoading } = useAuth();

  const getRoleIcon = (role: UserRole) => {
    switch (role) {
      case 'ROLE_CUSTOMER':
      case 'ROLE_CORPORATE_BOOKER':
        return <User size={14} className="text-blue-600" />;
      case 'ROLE_CHAUFFEUR':
        return <Car size={14} className="text-amber-600" />;
      case 'ROLE_VENDOR_ADMIN':
      case 'ROLE_DISPATCHER':
        return <Building size={14} className="text-emerald-600" />;
      case 'ROLE_NETWORK_AFFILIATE':
        return <Globe size={14} className="text-purple-600" />;
      case 'ROLE_SUPER_ADMIN':
        return <Shield size={14} className="text-rose-600" />;
      default:
        return <KeyRound size={14} className="text-slate-600" />;
    }
  };

  const getRoleBadgeStyle = (role: UserRole) => {
    switch (role) {
      case 'ROLE_CUSTOMER':
        return { bg: '#EFF6FF', text: '#1D4ED8', border: '#BFDBFE' };
      case 'ROLE_CHAUFFEUR':
        return { bg: '#FEF3C7', text: '#B45309', border: '#FDE68A' };
      case 'ROLE_VENDOR_ADMIN':
        return { bg: '#ECFDF5', text: '#047857', border: '#A7F3D0' };
      case 'ROLE_NETWORK_AFFILIATE':
        return { bg: '#FAF5FF', text: '#7E22CE', border: '#E9D5FF' };
      case 'ROLE_SUPER_ADMIN':
        return { bg: '#FFF1F2', text: '#BE123C', border: '#FECDD3' };
      default:
        return { bg: '#F1F5F9', text: '#475569', border: '#CBD5E1' };
    }
  };

  const badge = user ? getRoleBadgeStyle(user.role) : { bg: '#F1F5F9', text: '#475569', border: '#CBD5E1' };

  return (
    <div style={{
      background: 'linear-gradient(90deg, #FFFFFF 0%, #F8FAFC 50%, #EFF6FF 100%)',
      color: '#0F172A',
      padding: '8px 24px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      borderBottom: '1px solid #E2E8F0',
      boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
      fontSize: '12px',
      zIndex: 1000
    }}>
      {/* Active Identity Badge */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ color: '#64748B', fontWeight: 600 }}>Active Persona:</span>
          <span style={{ fontWeight: 800, color: '#0F172A' }}>
            {user?.full_name || 'Marcus Brody'}
          </span>
        </div>

        {user && (
          <span style={{
            background: badge.bg,
            color: badge.text,
            border: `1px solid ${badge.border}`,
            padding: '2px 8px',
            borderRadius: '12px',
            fontWeight: 700,
            fontSize: '11px',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px'
          }}>
            {getRoleIcon(user.role)}
            {String(user.role || 'ROLE_CUSTOMER').replace('ROLE_', '')}
          </span>
        )}

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#64748B', fontSize: '11px' }}>
          <span>Tenant: <strong style={{ color: '#0F172A' }}>{user?.tenant_id || 'tenant-us-east'}</strong></span>
          {user?.vendor_id && (
            <span>• Vendor: <strong style={{ color: '#0078D4' }}>{user.vendor_id}</strong></span>
          )}
        </div>
      </div>

      {/* Role Impersonation Switcher Buttons */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
        <span style={{ color: '#64748B', fontSize: '11px', fontWeight: 600, marginRight: '4px' }}>
          Switch Actor Perspective:
        </span>
        {Object.entries(personas).map(([key, p]) => {
          const isSelected = currentPersonaKey === key;
          const roleLabel = String(p?.role || key).replace('ROLE_', '').split('_')[0];
          const firstName = (p?.full_name || key).split(' ')[0];
          return (
            <button
              key={key}
              onClick={() => switchPersona(key)}
              disabled={isLoading}
              style={{
                background: isSelected ? '#0078D4' : '#FFFFFF',
                color: isSelected ? '#FFFFFF' : '#334155',
                border: isSelected ? '1px solid #0078D4' : '1px solid #CBD5E1',
                borderRadius: '6px',
                padding: '4px 10px',
                fontSize: '11px',
                fontWeight: isSelected ? 800 : 600,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                boxShadow: isSelected ? '0 1px 4px rgba(0, 120, 212, 0.3)' : '0 1px 2px rgba(0,0,0,0.03)',
                transition: 'all 0.15s ease'
              }}
            >
              {getRoleIcon(p?.role || 'ROLE_CUSTOMER')}
              <span>{firstName} ({roleLabel})</span>
              {isSelected && <CheckCircle2 size={12} color="#FFFFFF" />}
            </button>
          );
        })}
      </div>
    </div>
  );
};
