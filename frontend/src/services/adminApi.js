import axios from 'axios';
import toast from 'react-hot-toast';

const API_URL = import.meta.env.DEV
    ? '/api'
    : import.meta.env.VITE_API_URL || 'https://golden-gates-oegh.onrender.com/api';

const adminApi = axios.create({
    baseURL: API_URL,
    headers: {
        'Content-Type': 'application/json',
    },
    timeout: 30000,
});

// Request interceptor - Add admin token
adminApi.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('adminToken') || sessionStorage.getItem('adminToken');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => Promise.reject(error)
);

// Response interceptor - Handle errors
adminApi.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response) {
            const { status, data } = error.response;

            // If unauthorized or forbidden, redirect to admin login
            if (status === 401 || status === 403) {
                localStorage.removeItem('adminToken');
                localStorage.removeItem('adminUser');
                sessionStorage.removeItem('adminToken');
                window.location.href = '/admin/login';
                toast.error('Admin session expired. Please login again.');
            }

            if (status === 404) {
                toast.error(data.message || 'Resource not found');
            }

            if (status === 500) {
                toast.error('Server error. Please try again later.');
            }
        } else if (error.request) {
            toast.error('Network error. Please check your connection.');
        }

        return Promise.reject(error);
    }
);

export default adminApi;