import apiClient from './client';

export interface LoginPayload {
  email: string;
  password: string;
}

export interface RegisterPayload {
  email: string;
  password: string;
  full_name: string;
  phone?: string;
}

export interface TokenResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
}

export const authAPI = {
  login: (data: LoginPayload) =>
    apiClient.post<{ data: TokenResponse }>('/auth/login', data),

  register: (data: RegisterPayload) =>
    apiClient.post('/auth/register', data),

  refresh: (refreshToken: string) =>
    apiClient.post<{ data: TokenResponse }>('/auth/refresh', {
      refresh_token: refreshToken,
    }),
};
