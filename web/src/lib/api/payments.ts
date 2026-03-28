import apiClient from './client';

export const paymentsAPI = {
  getSubscription: () =>
    apiClient.get<{ data: any }>('/payments/subscription'),

  createOrder: (plan: string) =>
    apiClient.post<{ data: any }>('/payments/orders', { plan }),

  verifyPayment: (data: { payment_id: string; razorpay_payment_id?: string; razorpay_signature?: string }) =>
    apiClient.post<{ data: any }>('/payments/verify', data),

  getHistory: () =>
    apiClient.get<{ data: any[] }>('/payments/history'),
};
