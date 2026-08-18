import React, { createContext, useContext, useState, useEffect } from 'react';
import { authApi } from '../api/authApi';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    const savedUser = localStorage.getItem('kartrix_user');
    return savedUser ? JSON.parse(savedUser) : null;
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initAuth = async () => {
      const token = localStorage.getItem('kartrix_access_token');
      if (token) {
        try {
          const profileData = await authApi.getProfile();
          setUser(profileData);
          localStorage.setItem('kartrix_user', JSON.stringify(profileData));
        } catch (err) {
          console.warn('Failed to verify token profile:', err);
        }
      }
      setLoading(false);
    };
    initAuth();
  }, []);

  const login = async (credentials) => {
    const data = await authApi.login(credentials);
    localStorage.setItem('kartrix_access_token', data.access);
    localStorage.setItem('kartrix_refresh_token', data.refresh);
    localStorage.setItem('kartrix_user', JSON.stringify(data.user));
    setUser(data.user);
    return data;
  };

  const register = async (userData) => {
    const data = await authApi.register(userData);
    localStorage.setItem('kartrix_access_token', data.access);
    localStorage.setItem('kartrix_refresh_token', data.refresh);
    localStorage.setItem('kartrix_user', JSON.stringify(data.user));
    setUser(data.user);
    return data;
  };

  const logout = () => {
    localStorage.removeItem('kartrix_access_token');
    localStorage.removeItem('kartrix_refresh_token');
    localStorage.removeItem('kartrix_user');
    setUser(null);
  };

  const updateProfile = async (profileData) => {
    const updatedUser = await authApi.updateProfile(profileData);
    setUser(updatedUser);
    localStorage.setItem('kartrix_user', JSON.stringify(updatedUser));
    return updatedUser;
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        loading,
        login,
        register,
        logout,
        updateProfile,
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
