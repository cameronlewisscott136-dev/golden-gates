import axios from 'axios';
import toast from 'react-hot-toast';

const API_URL = import.meta.env.DEV ? '/api' : import.meta.env.VITE_API_URL || 'https://golden-gates-oegh.onrender.com/api';

const api = axios.create({
    baseURL: API_URL,
    headers: { 'Content-Type': 'application/json' },
    timeout: 30000,
    withCredentials: true,
});

api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('token');
        if (token) config.headers.Authorization = `Bearer ${token}`;
        return config;
    },
    (error) => Promise.reject(error)
);

api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response) {
            const { status, data } = error.response;
            if (status === 401) {
                localStorage.removeItem('token');
                localStorage.removeItem('user');
                window.location.href = '/login';
                toast.error('Session expired. Please login again.');
            }
            if (status === 403) toast.error(data.message || 'Access denied');
            if (status === 404) toast.error(data.message || 'Resource not found');
            if (status === 500) toast.error('Server error. Please try again later.');
        } else if (error.request) {
            toast.error('Network error. Please check your connection.');
        }
        return Promise.reject(error);
    }
);

export default api;