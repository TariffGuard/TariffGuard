'use client';
import { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { fetchApi } from '@/lib/api';

type Role = 'Owner' | 'Manager' | 'Supervisor' | 'owner' | 'manager' | 'supervisor' | null;

interface AuthContextType {
  role: Role;
  user: any | null;
  login: (username: string, password: string) => Promise<void>;
  register: (username: string, email: string, password: string, role: string) => Promise<any>;
  demoLogin: (role: Role) => void;
  logout: () => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [role, setRole] = useState<Role>(null);
  const [user, setUser] = useState<any | null>(null);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const storedUser = localStorage.getItem('user');
    if (token && storedUser) {
      try {
        const parsed = JSON.parse(storedUser);
        setUser(parsed);
        setRole(parsed.role as Role);
      } catch(e) {}
    }
  }, []);

  const login = async (username: string, password: string) => {
    const response = await fetchApi('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    });
    localStorage.setItem('token', response.access_token);
    localStorage.setItem('user', JSON.stringify(response.user));
    setUser(response.user);
    setRole(response.user.role as Role);
  };

  const register = async (username: string, email: string, password: string, selectedRole: string) => {
    const response = await fetchApi('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({ username, email, password, role: selectedRole }),
    });
    return response;
  };

  const demoLogin = (selectedRole: Role) => {
    let username = 'demo_user';
    if (selectedRole === 'Owner' || selectedRole === 'owner') username = 'Demo Owner';
    if (selectedRole === 'Manager' || selectedRole === 'manager') username = 'Demo Manager';
    if (selectedRole === 'Supervisor' || selectedRole === 'supervisor') username = 'Demo Supervisor';

    const mockUser = { id: 999, username, role: selectedRole, factory_id: 1, email: 'demo@tariffguard.com' };
    localStorage.setItem('token', 'fake_demo_token');
    localStorage.setItem('user', JSON.stringify(mockUser));
    setUser(mockUser);
    setRole(selectedRole);
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setRole(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ role, user, login, register, demoLogin, logout, isAuthenticated: !!role }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
