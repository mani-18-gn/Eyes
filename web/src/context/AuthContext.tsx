import React, { createContext, useContext, useState, useEffect } from 'react';
import { User } from '../types';
import { api } from '../services/api';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, fullName?: string, lang?: string, personality?: string) => Promise<void>;
  logout: () => void;
  updateUser: (data: Partial<User>) => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const refreshProfile = async () => {
    try {
      if (api.getToken()) {
        const u = await api.getMe();
        setUser(u);
      } else {
        setUser(null);
      }
    } catch (err) {
      setUser(null);
      api.setToken(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshProfile();

    const handleLogout = () => {
      setUser(null);
    };

    window.addEventListener('realitylens_logout', handleLogout);
    return () => window.removeEventListener('realitylens_logout', handleLogout);
  }, []);

  const login = async (email: string, password: string) => {
    const res = await api.login({ email, password });
    setUser(res.user);
  };

  const register = async (email: string, password: string, fullName?: string, lang?: string, personality?: string) => {
    const res = await api.register({
      email,
      password,
      full_name: fullName,
      preferred_language: lang,
      ai_personality: personality,
    });
    setUser(res.user);
  };

  const logout = () => {
    api.setToken(null);
    setUser(null);
  };

  const updateUser = async (data: Partial<User>) => {
    const updated = await api.updateMe(data);
    setUser(updated);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, updateUser, refreshProfile }}>
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
