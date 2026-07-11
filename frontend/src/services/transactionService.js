import api from './api';

const transactionService = {
    getTransactions: async (params = {}) => {
        const response = await api.get('/transactions', { params });
        return response.data;
    }
};

export default transactionService;