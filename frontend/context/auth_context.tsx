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

  // Load user from localStorage on mount
  useEffect(() => {
    const token = localStorage.getItem('token');
    const storedUser = localStorage.getItem('user');
    
    if (token && storedUser) {
      try {
        const parsed = JSON.parse(storedUser);
        setUser(parsed);
        setRole(parsed.role as Role);
      } catch (e) {
        console.error('Failed to parse stored user:', e);
        localStorage.removeItem('token');
        localStorage.removeItem('user');
      }
    }
  }, []);

  const login = async (username: string, password: string) => {
    try {
      const response = await fetchApi('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ username, password }),
      });
      
      console.log('Login response:', response);
      
      if (!response.access_token) {
        throw new Error('No access token received from server');
      }
      
      if (!response.user) {
        throw new Error('No user data received from server');
      }
      
      // Store token and user
      localStorage.setItem('token', response.access_token);
      localStorage.setItem('user', JSON.stringify(response.user));
      
      // Update state
      setUser(response.user);
      setRole(response.user.role as Role);
      
      console.log('Login successful:', response.user.username, 'Role:', response.user.role);
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  };

  const register = async (username: string, email: string, password: string, selectedRole: string) => {
    try {
      const response = await fetchApi('/api/auth/register', {
        method: 'POST',
        body: JSON.stringify({ 
          username, 
          email, 
          password, 
          role: selectedRole.toLowerCase() 
        }),
      });
      
      console.log('Registration response:', response);
      return response;
    } catch (error) {
      console.error('Registration error:', error);
      throw error;
    }
  };

  const demoLogin = (selectedRole: Role) => {
    let username = 'demo_user';
    let email = 'demo@tariffguard.com';
    
    if (selectedRole === 'Owner' || selectedRole === 'owner') {
      username = 'Demo Owner';
    }
    if (selectedRole === 'Manager' || selectedRole === 'manager') {
      username = 'Demo Manager';
    }
    if (selectedRole === 'Supervisor' || selectedRole === 'supervisor') {
      username = 'Demo Supervisor';
    }

    const mockUser = { 
      id: 999, 
      username, 
      role: selectedRole, 
      factory_id: 1, 
      email 
    };
    
    localStorage.setItem('token', 'fake_demo_token');
    localStorage.setItem('user', JSON.stringify(mockUser));
    setUser(mockUser);
    setRole(selectedRole);
    
    console.log('Demo login:', username, 'Role:', selectedRole);
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setRole(null);
    setUser(null);
    console.log('Logged out');
  };

  return (
    <AuthContext.Provider value={{ 
      role, 
      user, 
      login, 
      register, 
      demoLogin, 
      logout, 
      isAuthenticated: !!role 
    }}>
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