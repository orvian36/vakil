"use client";

import React, { createContext, useContext, ReactNode } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { AuthContextType } from '@/types/auth';
import Navbar from '@/components/Navbar';
import authService from '@/services/authService';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuthContext = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuthContext must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const auth = useAuth();

  // Enhanced logout with user feedback
  const handleLogout = async () => {
    try {
      await auth.logout();
      // Toast notification for successful logout can be added here using shadCN
    } catch (error) {
      // Toast notification for failed logout can be added here using shadCN
    }
  };

  const contextValue: AuthContextType = {
    ...auth,
    logout: handleLogout,
  };

  return (
    <AuthContext.Provider value={contextValue}>
      <Navbar 
        user={auth.user}
        isLoading={auth.isLoading}
        isAuthenticated={auth.isAuthenticated}
        onLogout={handleLogout}
      />
      {children}
      {/* ShadCN ToastContainer will be rendered here */}
    </AuthContext.Provider>
  );
};

export { authService }; 