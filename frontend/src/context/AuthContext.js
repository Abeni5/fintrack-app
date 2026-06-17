import React, { createContext, useState, useContext, useEffect } from 'react';
import api from '../api/client';
import { getToken, setToken as saveToken, getUser, setUser as saveUser, clearAuth } from '../utils/secureStorage';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadStoredAuth(); }, []);

  const loadStoredAuth = async () => {
    try {
      const storedToken = await getToken();
      const storedUser = await getUser();
      if (storedToken && storedUser) {
        setToken(storedToken);
        setUser(storedUser);
      }
    } catch (e) {
      console.log('Error loading auth:', e);
    } finally {
      setLoading(false);
    }
  };

  const login = async (email, password) => {
    const response = await api.post('/auth/login', { email, password });
    const { access_token, user: userData } = response.data;
    await saveToken(access_token);
    await saveUser(userData);
    setToken(access_token);
    setUser(userData);
    return userData;
  };

  // NOTE: register() no longer stores a token or logs the user in.
  // With OTP verification, the user must verify their email first.
  // RegisterScreen.js navigates to OTPVerification after this resolves,
  // and the user logs in normally afterward via LoginScreen.
  const register = async (name, email, password, currency = 'ETB') => {
    const response = await api.post('/auth/register', {
      name, email, password, default_currency: currency
    });
    // Intentionally NOT storing token/user here — see note above
    return response.data.user;
  };

  const logout = async () => {
    await clearAuth();
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);