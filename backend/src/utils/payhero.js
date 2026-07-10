const axios = require('axios');
const crypto = require('crypto');

// PayHero configuration
const PAYHERO_BASE_URL = process.env.PAYHERO_BASE_URL || 'https://api.payhero.co.ke';
const PAYHERO_API_SECRET = process.env.PAYHERO_API_SECRET;
const PAYHERO_BASIC_AUTH_TOKEN = process.env.PAYHERO_BASIC_AUTH_TOKEN;
const PAYHERO_CHANNEL_ID = process.env.PAYHERO_CHANNEL_ID;
const PAYHERO_PASSWORD = process.env.PAYHERO_PASSWORD;
const PAYHERO_USERNAME = process.env.PAYHERO_USERNAME;

// Generate Basic Auth header
const getAuthHeader = () => {
    if (PAYHERO_BASIC_AUTH_TOKEN) {
        return `Basic ${PAYHERO_BASIC_AUTH_TOKEN}`;
    }
    if (PAYHERO_USERNAME && PAYHERO_PASSWORD) {
        const credentials = Buffer.from(`${PAYHERO_USERNAME}:${PAYHERO_PASSWORD}`).toString('base64');
        return `Basic ${credentials}`;
    }
    throw new Error('PayHero credentials not configured');
};

// Generate API signature
const generateSignature = (data) => {
    const sorted = Object.keys(data).sort().reduce((obj, key) => {
        obj[key] = data[key];
        return obj;
    }, {});
    const stringToSign = JSON.stringify(sorted);
    return crypto
        .createHmac('sha256', PAYHERO_API_SECRET)
        .update(stringToSign)
        .digest('hex');
};

// Initiate STK Push
const initiateSTKPush = async (phoneNumber, amount, externalReference, customerName) => {
    try {
        console.log(`💰 Initiating STK Push for ${phoneNumber} - KES ${amount}`);

        const formattedPhone = phoneNumber.replace(/^0+/, '254');

        const payload = {
            channelId: PAYHERO_CHANNEL_ID,
            phoneNumber: formattedPhone,
            amount: Math.round(amount),
            externalReference: externalReference,
            customerName: customerName || 'Customer',
            description: 'Account Activation - Golden Gates',
            callbackUrl: process.env.PAYHERO_CALLBACK_URL,
        };

        const signature = generateSignature(payload);

        const response = await axios.post(
            `${PAYHERO_BASE_URL}/api/v1/payments/stkpush`,
            payload,
            {
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': getAuthHeader(),
                    'X-Signature': signature,
                    'X-Channel-ID': PAYHERO_CHANNEL_ID,
                },
                timeout: 30000,
            }
        );

        console.log('✅ PayHero STK Push initiated');
        console.log('📋 Response:', response.data);

        return {
            success: true,
            payheroReference: response.data.reference || response.data.Reference || response.data.transactionId,
            formattedPhone: formattedPhone,
            data: response.data,
        };
    } catch (error) {
        console.error('❌ PayHero STK Push error:', error.response?.data || error.message);
        return {
            success: false,
            error: error.response?.data?.message || error.response?.data?.Message || error.message,
            details: error.response?.data,
        };
    }
};

// Check transaction status
const checkTransactionStatus = async (externalReference) => {
    try {
        console.log(`🔍 Checking transaction status for: ${externalReference}`);

        const payload = {
            externalReference: externalReference,
            channelId: PAYHERO_CHANNEL_ID,
        };

        const signature = generateSignature(payload);

        const response = await axios.post(
            `${PAYHERO_BASE_URL}/api/v1/payments/status`,
            payload,
            {
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': getAuthHeader(),
                    'X-Signature': signature,
                    'X-Channel-ID': PAYHERO_CHANNEL_ID,
                },
                timeout: 30000,
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
            details: error.response?.data,
        };
    }
};

// Verify webhook signature
const verifyWebhookSignature = (payload, signature) => {
    try {
        const expectedSignature = generateSignature(payload);
        return expectedSignature === signature;
    } catch (error) {
        console.error('❌ Signature verification failed:', error.message);
        return false;
    }
};

module.exports = {
    initiateSTKPush,
    checkTransactionStatus,
    verifyWebhookSignature,
};