import axios from 'axios';
import { API_BASE_URL } from '../config';

const client = axios.create({
  baseURL: API_BASE_URL,
});

client.interceptors.response.use(
  (response) => response,
  (error) => {
    // Global error interceptor
    console.error("API Error:", error.response?.data || error.message);
    return Promise.reject(error);
  }
);

export default client;
