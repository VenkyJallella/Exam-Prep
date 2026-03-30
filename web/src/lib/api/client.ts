import axios from 'axios';
import { useAuthStore } from '../store/authStore';

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api/v1';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor: attach auth token
apiClient.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Prevent concurrent refresh attempts
let isRefreshing = false;
let failedQueue: Array<{ resolve: (value: any) => void; reject: (err: any) => void; config: any }> = [];

function processQueue(error: any, token: string | null) {
  failedQueue.forEach((item) => {
    if (token) {
      item.config.headers.Authorization = `Bearer ${token}`;
      item.resolve(apiClient(item.config));
    } else {
      item.reject(error);
    }
  });
  failedQueue = [];
}

// Response interceptor: handle 401 + silent refresh
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Don't retry auth endpoints or already-retried requests
    if (
      error.response?.status !== 401 ||
      originalRequest._retry ||
      originalRequest.url?.includes('/auth/login') ||
      originalRequest.url?.includes('/auth/refresh') ||
      originalRequest.url?.includes('/auth/register')
    ) {
      return Promise.reject(error);
    }

    originalRequest._retry = true;

    // If already refreshing, queue this request
    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        failedQueue.push({ resolve, reject, config: originalRequest });
      });
    }

    const refreshToken = useAuthStore.getState().refreshToken;
    if (!refreshToken) {
      // No refresh token — silently logout, no error toast
      useAuthStore.getState().logout();
      if (!window.location.pathname.startsWith('/login')) {
        window.location.href = '/login';
      }
      return Promise.reject(error);
    }

    isRefreshing = true;
    try {
      const res = await axios.post(`${API_BASE_URL}/auth/refresh`, {
        refresh_token: refreshToken,
      });
      const { access_token, refresh_token } = res.data.data;
      useAuthStore.getState().setTokens(access_token, refresh_token);

      // Retry original request + all queued requests
      originalRequest.headers.Authorization = `Bearer ${access_token}`;
      processQueue(null, access_token);
      isRefreshing = false;

      return apiClient(originalRequest);
    } catch {
      // Refresh failed — silently logout, no error toast
      processQueue(error, null);
      isRefreshing = false;
      useAuthStore.getState().logout();
      if (!window.location.pathname.startsWith('/login')) {
        window.location.href = '/login';
      }
      return Promise.reject(error);
    }
  }
);

export default apiClient;
