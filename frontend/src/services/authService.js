import api from './api';

const authService = {
    register: async (userData) => {
        const response = await api.post('/auth/register', userData);
        if (response.data.data?.token) {
            localStorage.setItem('token', response.data.data.token);
            localStorage.setItem('user', JSON.stringify(response.data.data.user));
        }
        return response.data;
    },

    login: async (credentials) => {
        const response = await api.post('/auth/login', credentials);
        if (response.data.data?.token) {
            localStorage.setItem('token', response.data.data.token);
            localStorage.setItem('user', JSON.stringify(response.data.data.user));
        }
        return response.data;
    },

    verifyEmail: async (code) => {
        const response = await api.post('/auth/verify-email', { code });
        return response.data;
    },

    resendVerification: async () => {
        const response = await api.post('/auth/resend-verification');
        return response.data;
    },

    activateAccount: async (amount) => {
        const response = await api.post('/auth/activate', { amount });
        if (response.data.data) {
            const user = JSON.parse(localStorage.getItem('user'));
            const updatedUser = { ...user, ...response.data.data };
            localStorage.setItem('user', JSON.stringify(updatedUser));
        }
        return response.data;
    },

    getCurrentUser: async () => {
        const response = await api.get('/auth/me');
        if (response.data.data?.user) {
            localStorage.setItem('user', JSON.stringify(response.data.data.user));
        }
        return response.data;
    },

    logout: () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
    },

    getToken: () => localStorage.getItem('token'),

    getUser: () => {
        const user = localStorage.getItem('user');
        return user ? JSON.parse(user) : null;
    },

    isAuthenticated: () => !!localStorage.getItem('token'),

    isVerified: () => {
        const user = authService.getUser();
        return user?.isVerified || false;
    },

    isActive: () => {
        const user = authService.getUser();
        return user?.isActive || false;
    }
};

export default authService;