import api from './api';

const referralService = {
    getReferrals: async () => {
        const response = await api.get('/referrals');
        return response.data;
    },

    getReferralStats: async () => {
        const response = await api.get('/referrals/stats');
        return response.data;
    },

    getReferralCode: async () => {
        const response = await api.get('/referrals/code');
        return response.data;
    }
};

export default referralService;