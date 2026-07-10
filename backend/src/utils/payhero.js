const axios = require('axios');

// PayHero configuration
const PAYHERO_BASE_URL = process.env.PAYHERO_BASE_URL || 'https://api.payhero.co.ke';
const PAYHERO_API_KEY = process.env.PAYHERO_API_KEY;
const PAYHERO_MERCHANT_ID = process.env.PAYHERO_MERCHANT_ID;

// Initiate STK Push
const initiateSTKPush = async (phoneNumber, amount, externalReference, customerName) => {
    try {
        console.log(`💰 Initiating STK Push for ${phoneNumber} - KES ${amount}`);

        const formattedPhone = phoneNumber.replace(/^0+/, '254');

        const payload = {
            merchantId: PAYHERO_MERCHANT_ID,
            phoneNumber: formattedPhone,
            amount: Math.round(amount),
            externalReference: externalReference,
            customerName: customerName || 'Customer',
            description: 'Account Deposit - Golden Gates',
            callbackUrl: process.env.PAYHERO_CALLBACK_URL,
        };

        const response = await axios.post(`${PAYHERO_BASE_URL}/api/v1/payments/stkpush`, payload, {
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${PAYHERO_API_KEY}`,
            },
        });

        console.log('✅ PayHero STK Push initiated');
        console.log('📋 Response:', response.data);

        return {
            success: true,
            payheroReference: response.data.reference || response.data.Reference,
            formattedPhone: formattedPhone,
            data: response.data,
        };
    } catch (error) {
        console.error('❌ PayHero STK Push error:', error.response?.data || error.message);
        return {
            success: false,
            error: error.response?.data?.message || error.message,
        };
    }
};

// Check transaction status
const checkTransactionStatus = async (externalReference) => {
    try {
        console.log(`🔍 Checking transaction status for: ${externalReference}`);

        const response = await axios.get(
            `${PAYHERO_BASE_URL}/api/v1/payments/status/${externalReference}`,
            {
                headers: {
                    'Authorization': `Bearer ${PAYHERO_API_KEY}`,
                },
            }
        );

        console.log('✅ Transaction status retrieved');
        return {
            success: true,
            data: response.data,
        };
    } catch (error) {
        console.error('❌ Status check error:', error.response?.data || error.message);
        return {
            success: false,
            error: error.response?.data?.message || error.message,
        };
    }
};

module.exports = {
    initiateSTKPush,
    checkTransactionStatus,
};