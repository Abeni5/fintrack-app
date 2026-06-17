import axios from 'axios';
import { getToken, clearAuth } from '../utils/secureStorage';

const BASE_URL = 'https://fintrack-app-full.onrender.com';

const api = axios.create({
  baseURL: BASE_URL,
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
});

// Attach token from SecureStore to every request
api.interceptors.request.use(async (config) => {
  const token = await getToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Auto-clear auth on 401 (token invalid/expired)
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      await clearAuth();
    }
    return Promise.reject(error);
  }
);

export default api;