import api from './api';

const tradeService = {
    createTrade: async (tradeData) => {
        const response = await api.post('/trades', tradeData);
        return response.data;
    },

    getTrades: async (params = {}) => {
        const response = await api.get('/trades', { params });
        return response.data;
    },

    getTradeById: async (tradeId) => {
        const response = await api.get(`/trades/${tradeId}`);
        return response.data;
    },

    getTradeStats: async () => {
        const response = await api.get('/trades/stats');
        return response.data;
    },

    // NEW: Get daily trade status
    getDailyStatus: async () => {
        const response = await api.get('/trades/daily-status');
        return response.data;
    }
};

export default tradeService;