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
    if (!PAYHERO_API_SECRET) {
        throw new Error('PAYHERO_API_SECRET is not defined');
    }

    const sorted = Object.keys(data).sort().reduce((obj, key) => {
        obj[key] = data[key];
        return obj;
    }, {});

    const stringToSign = JSON.stringify(sorted);
    console.log('📝 String to sign:', stringToSign);

    const signature = crypto
        .createHmac('sha256', PAYHERO_API_SECRET)
        .update(stringToSign)
        .digest('hex');

    console.log('✅ Signature generated');
    return signature;
};

// Initiate STK Push - Using correct PayHero format
const initiateSTKPush = async (phoneNumber, amount, externalReference, customerName) => {
    try {
        console.log(`💰 Initiating STK Push for ${phoneNumber} - KES ${amount}`);

        const formattedPhone = phoneNumber.replace(/^0+/, '254');

        // Prepare payload according to PayHero API format
        const payload = {
            channelId: PAYHERO_CHANNEL_ID,
            phoneNumber: formattedPhone,
            amount: Math.round(amount),
            externalReference: externalReference,
            customerName: customerName || 'Customer',
            description: 'Account Activation - Golden Gates',
            callbackUrl: process.env.PAYHERO_CALLBACK_URL || 'https://golden-gates-oegh.onrender.com/api/payments/callback',
        };

        console.log('📋 Payload:', JSON.stringify(payload, null, 2));

        // Generate signature
        const signature = generateSignature(payload);

        // Try different endpoint formats - Based on common PayHero API patterns
        const endpoints = [
            '/api/v1/stkpush',
            '/v1/stkpush',
            '/stkpush',
            '/api/stkpush',
            '/payment/stkpush',
        ];

        let lastError = null;
        let successResponse = null;

        // Try each endpoint
        for (const endpoint of endpoints) {
            try {
                const url = `${PAYHERO_BASE_URL}${endpoint}`;
                console.log(`🔄 Trying endpoint: ${url}`);

                const response = await axios.post(
                    url,
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

                console.log('✅ PayHero STK Push initiated successfully');
                console.log('📋 Response:', JSON.stringify(response.data, null, 2));

                successResponse = {
                    success: true,
                    payheroReference: response.data.reference || response.data.Reference || response.data.transactionId || response.data.id || response.data.transactionReference,
                    formattedPhone: formattedPhone,
                    data: response.data,
                };
                break;
            } catch (error) {
                console.log(`❌ Endpoint ${endpoint} failed:`, error.response?.status, error.response?.data || error.message);
                lastError = error;
                // Continue to next endpoint
            }
        }

        if (successResponse) {
            return successResponse;
        }

        // If we get here, all endpoints failed
        console.error('❌ All PayHero endpoints failed');
        throw lastError || new Error('All PayHero endpoints failed');

    } catch (error) {
        console.error('❌ PayHero STK Push error:', error.response?.data || error.message);
        return {
            success: false,
            error: error.response?.data?.message || error.response?.data?.error_message || error.message,
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

        const endpoints = [
            `/api/v1/status`,
            `/v1/status`,
            `/status`,
            `/api/status`,
        ];

        let lastError = null;

        for (const endpoint of endpoints) {
            try {
                const url = `${PAYHERO_BASE_URL}${endpoint}`;
                console.log(`🔄 Trying status endpoint: ${url}`);

                const response = await axios.post(
                    url,
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
                console.log(`❌ Status endpoint ${endpoint} failed:`, error.response?.status || error.message);
                lastError = error;
            }
        }

        throw lastError || new Error('All status endpoints failed');

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

// Test endpoint connectivity
const testConnection = async () => {
    console.log('🔍 Testing PayHero API connectivity...');

    const testEndpoints = [
        '/api/v1/stkpush',
        '/v1/stkpush',
        '/stkpush',
    ];

    for (const endpoint of testEndpoints) {
        try {
            const url = `${PAYHERO_BASE_URL}${endpoint}`;
            console.log(`Testing: ${url}`);
            // Just test if endpoint exists
            await axios.options(url, {
                headers: {
                    'Authorization': getAuthHeader(),
                },
                timeout: 5000,
            });
            console.log(`✅ Working: ${endpoint}`);
            return true;
        } catch (error) {
            console.log(`❌ Failed: ${endpoint} - ${error.message}`);
        }
    }
    return false;
};

module.exports = {
    initiateSTKPush,
    checkTransactionStatus,
    verifyWebhookSignature,
    testConnection,
};