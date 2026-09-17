import axios from 'axios';

const apiClient = axios.create({
  baseURL: '/api',
});

apiClient.interceptors.response.use(
  (response) => response.data,
  (error) => {
    const data = error.response?.data;
    const message =
      data?.StatusMessage ||
      data?.message ||
      error.message ||
      'An unexpected error occurred';
    const err = new Error(message);
    (err as any).responseData = data ?? { StatusCode: 500, StatusMessage: message };
    return Promise.reject(err);
  }
);

export default apiClient;
