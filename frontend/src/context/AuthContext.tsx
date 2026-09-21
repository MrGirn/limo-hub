import React, { createContext, useContext, useState, useEffect } from 'react';
import { UserRole, UserSession, ActorPersonaOption } from '../types';
import {
  fetchCurrentSession,
  fetchPersonas,
  switchPersonaApi,
  loginApi,
  setAuthToken
} from '../api';

interface AuthContextType {
  user: UserSession | null;
  token: string | null;
  role: UserRole;
  currentPersonaKey: string;
  personas: Record<string, ActorPersonaOption>;
  isLoading: boolean;
  switchPersona: (personaKey: string) => Promise<void>;
  login: (email: string, password?: string, role?: string) => Promise<void>;
  logout: () => void;
  hasRole: (roles: UserRole[]) => boolean;
  hasPermission: (permission: string) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserSession | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem('limo_auth_token'));
  const [currentPersonaKey, setCurrentPersonaKey] = useState<string>(
    localStorage.getItem('limo_persona_key') || 'customer'
  );
  const [personas, setPersonas] = useState<Record<string, ActorPersonaOption>>({});
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Initialize Auth & Personas dynamically from Database & APIs
  useEffect(() => {
    async function initAuth() {
      try {
        setIsLoading(true);
        // 1. Fetch live registered personas from Database API
        const personaData = await fetchPersonas();
        if (personaData && Object.keys(personaData).length > 0) {
          setPersonas(personaData);

          // 2. Resolve active persona from stored key or first available
          const preferredKey = currentPersonaKey in personaData ? currentPersonaKey : 'customer';
          
          try {
            // Try fetching active session
            const sessionRes = await fetchCurrentSession();
            setUser(sessionRes.user);
            setToken(sessionRes.token);
            setAuthToken(sessionRes.token, sessionRes.user.role);
          } catch {
            // If no token or expired, switch to the preferred database persona
            const switchRes = await switchPersonaApi(preferredKey);
            setUser(switchRes.user);
            setToken(switchRes.token);
            setCurrentPersonaKey(preferredKey);
            localStorage.setItem('limo_persona_key', preferredKey);
            setAuthToken(switchRes.token, switchRes.user.role);
          }
        }
      } catch (err) {
        console.error('Failed to initialize dynamic auth from API:', err);
      } finally {
        setIsLoading(false);
      }
    }
    initAuth();
  }, []);

  const switchPersona = async (personaKey: string) => {
    try {
      setIsLoading(true);
      const targetKey = personaKey.toLowerCase().trim();
      const res = await switchPersonaApi(targetKey);
      if (res && res.user) {
        setUser(res.user);
        setToken(res.token);
        setCurrentPersonaKey(targetKey);
        localStorage.setItem('limo_persona_key', targetKey);
        setAuthToken(res.token, res.user.role);
      }
    } catch (err) {
      console.error('Failed to switch persona via API:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (email: string, password?: string, role?: string) => {
    try {
      setIsLoading(true);
      const res = await loginApi(email, password, role);
      setUser(res.user);
      setToken(res.token);
      setAuthToken(res.token, res.user.role);
    } catch (err) {
      console.error('Login error:', err);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    setAuthToken(null, null);
    localStorage.removeItem('limo_auth_token');
    localStorage.removeItem('limo_persona_key');
  };

  const hasRole = (roles: UserRole[]): boolean => {
    if (!user) return false;
    if (user.role === 'ROLE_SUPER_ADMIN') return true;
    return roles.includes(user.role);
  };

  const hasPermission = (permission: string): boolean => {
    if (!user) return false;
    if (user.permissions.includes('*') || user.role === 'ROLE_SUPER_ADMIN') return true;
    return user.permissions.includes(permission);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        role: user?.role || 'ROLE_CUSTOMER',
        currentPersonaKey,
        personas,
        isLoading,
        switchPersona,
        login,
        logout,
        hasRole,
        hasPermission
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
