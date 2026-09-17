import apiClient from '@/api/client';

export const authService = {
  getToken: () => apiClient.post('/auth/token'),
  getServerTime: () => apiClient.get('/auth/server-time'),
};
