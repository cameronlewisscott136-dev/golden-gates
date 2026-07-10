import api from './api';

const transactionService = {
    getTransactions: async (params = {}) => {
        const response = await api.get('/transactions', { params });
        return response.data;
    },

    deposit: async (amount) => {
        const response = await api.post('/transactions/deposit', { amount });
        return response.data;
    }
};

export default transactionService;