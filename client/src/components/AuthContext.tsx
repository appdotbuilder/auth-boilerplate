import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { trpc } from '@/utils/trpc';
// Using correct relative path from components folder
import type { PublicUser, LoginInput, RegisterInput } from '../../../server/src/schema';

interface AuthState {
  user: PublicUser | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
}

interface AuthContextType extends AuthState {
  login: (credentials: LoginInput) => Promise<void>;
  register: (userData: RegisterInput) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    token: null,
    isLoading: true,
    isAuthenticated: false,
  });

  // Initialize auth state from localStorage
  useEffect(() => {
    const storedToken = localStorage.getItem('auth_token');
    const storedUser = localStorage.getItem('auth_user');
    
    if (storedToken && storedUser) {
      try {
        const user = JSON.parse(storedUser) as PublicUser;
        setAuthState({
          user,
          token: storedToken,
          isLoading: false,
          isAuthenticated: true,
        });
      } catch (error) {
        console.error('Failed to parse stored user data:', error);
        localStorage.removeItem('auth_token');
        localStorage.removeItem('auth_user');
        setAuthState(prev => ({ ...prev, isLoading: false }));
      }
    } else {
      setAuthState(prev => ({ ...prev, isLoading: false }));
    }
  }, []);

  const login = useCallback(async (credentials: LoginInput) => {
    try {
      const response = await trpc.login.mutate(credentials);
      
      // Store in localStorage
      localStorage.setItem('auth_token', response.token);
      localStorage.setItem('auth_user', JSON.stringify(response.user));
      
      setAuthState({
        user: response.user,
        token: response.token,
        isLoading: false,
        isAuthenticated: true,
      });
    } catch (error) {
      console.error('Login failed:', error);
      throw error;
    }
  }, []);

  const register = useCallback(async (userData: RegisterInput) => {
    try {
      const response = await trpc.register.mutate(userData);
      
      // Store in localStorage
      localStorage.setItem('auth_token', response.token);
      localStorage.setItem('auth_user', JSON.stringify(response.user));
      
      setAuthState({
        user: response.user,
        token: response.token,
        isLoading: false,
        isAuthenticated: true,
      });
    } catch (error) {
      console.error('Registration failed:', error);
      throw error;
    }
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('auth_user');
    setAuthState({
      user: null,
      token: null,
      isLoading: false,
      isAuthenticated: false,
    });
  }, []);

  const refreshUser = useCallback(async () => {
    if (!authState.isAuthenticated) return;
    
    try {
      const user = await trpc.getCurrentUser.query();
      
      // Update localStorage with fresh user data
      localStorage.setItem('auth_user', JSON.stringify(user));
      
      setAuthState(prev => ({
        ...prev,
        user,
      }));
    } catch (error) {
      console.error('Failed to refresh user data:', error);
      // If refresh fails, logout the user
      logout();
    }
  }, [authState.isAuthenticated, logout]);

  const value: AuthContextType = {
    ...authState,
    login,
    register,
    logout,
    refreshUser,
  };

  return (
    <AuthContext.Provider value={value}>
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