const https = require('https');
const axios = require('axios');

const payheroAxios = axios.create({
    decompress: false,
    httpsAgent: new https.Agent({ rejectUnauthorized: true }),
});

class PayHeroService {
    constructor() {
        this.authToken = process.env.PAYHERO_BASIC_AUTH_TOKEN;
        this.channelId = parseInt(process.env.PAYHERO_CHANNEL_ID);
        this.baseUrl = process.env.PAYHERO_BASE_URL || 'https://backend.payhero.co.ke/api/v2';
        console.log('🏦 PayHero Service Initialized');
    }

    formatPhone(phoneNumber) {
        let phone = phoneNumber.replace(/\s+/g, '').replace(/^\+/, '');
        if (phone.startsWith('254') && phone.length === 12) {
            phone = '0' + phone.substring(3);
        }
        return phone;
    }

    async initiateSTKPush(phoneNumber, amount, externalReference, customerName, description = 'Payment') {
        try {
            const formattedPhone = this.formatPhone(phoneNumber);
            console.log(`📱 PayHero STK Push: KES ${amount} to ${formattedPhone}`);

            const payload = {
                amount: Math.round(amount),
                phone_number: formattedPhone,
                channel_id: parseInt(this.channelId),
                network_code: '63902',
                provider: 'm-pesa',
                external_reference: externalReference,
                callback_url: process.env.PAYHERO_CALLBACK_URL,
                description: description,
                customer_name: customerName || 'Customer',
            };

            const response = await payheroAxios.post(
                `${this.baseUrl}/payments`,
                payload,
                {
                    headers: {
                        Authorization: this.authToken,
                        'Content-Type': 'application/json',
                        'Accept-Encoding': 'identity',
                    },
                    timeout: 30000,
                }
            );

            const responseData = typeof response.data === 'string'
                ? JSON.parse(response.data)
                : Buffer.isBuffer(response.data)
                    ? JSON.parse(response.data.toString('utf8'))
                    : response.data;

            return {
                success: true,
                data: responseData,
                formattedPhone,
                payheroReference: responseData?.reference || responseData?.Reference || null,
                checkoutRequestId: responseData?.CheckoutRequestID || null,
            };
        } catch (error) {
            let errorData = error.response?.data;
            if (Buffer.isBuffer(errorData)) {
                try { errorData = JSON.parse(errorData.toString('utf8')); } catch (e) { }
            }
            console.error('❌ PayHero error:', errorData || error.message);
            return {
                success: false,
                error: errorData?.error_message || errorData?.message || error.message,
                status: error.response?.status,
            };
        }
    }

    async checkTransactionStatus(externalReference) {
        try {
            const response = await payheroAxios.get(
                `${this.baseUrl}/payments`,
                {
                    params: { external_reference: externalReference },
                    headers: { Authorization: this.authToken, 'Accept-Encoding': 'identity' },
                    timeout: 15000,
                }
            );

            const responseData = typeof response.data === 'string'
                ? JSON.parse(response.data)
                : Buffer.isBuffer(response.data)
                    ? JSON.parse(response.data.toString('utf8'))
                    : response.data;

            const records = responseData?.payments || responseData?.data || [];
            const record = Array.isArray(records)
                ? records.find(r => r.external_reference === externalReference)
                : responseData;

            if (!record) return { success: false, error: 'Transaction not found' };

            return {
                success: true,
                data: {
                    status: record.status,
                    mpesa_receipt: record.provider_reference || record.mpesa_receipt || '',
                    amount: record.amount,
                    phone: record.phone_number,
                },
            };
        } catch (error) {
            console.error('❌ PayHero status check error:', error.message);
            return { success: false, error: error.message };
        }
    }
}

module.exports = new PayHeroService();