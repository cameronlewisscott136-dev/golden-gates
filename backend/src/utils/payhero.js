const https = require('https');
const axios = require('axios');

// PayHero's API returns a malformed or missing Content-Encoding header that
// causes Node's zlib to throw "incorrect header check" when axios tries to
// auto-decompress. Disabling decompress fixes it.
const payheroAxios = axios.create({
    decompress: false,          // don't let axios/zlib touch the response body
    httpsAgent: new https.Agent({ rejectUnauthorized: true }),
});

class PayHeroService {
    constructor() {
        // Use the Basic Auth token directly from env
        this.authToken = process.env.PAYHERO_BASIC_AUTH_TOKEN;
        this.channelId = parseInt(process.env.PAYHERO_CHANNEL_ID);
        this.baseUrl = process.env.PAYHERO_BASE_URL || 'https://backend.payhero.co.ke/api/v2';

        console.log('========================================');
        console.log('🏦 PayHero Service Initialized');
        console.log(`📱 Channel ID: ${this.channelId}`);
        console.log(`🔑 Auth Token: ${this.authToken ? '✅ Set' : '❌ Missing'}`);
        console.log(`🌐 Base URL: ${this.baseUrl}`);
        console.log('========================================');
    }

    /**
     * Format phone: 0712345678 → 0712345678 (PayHero wants local format)
     * Or 254712345678 → keep as is
     * PayHero accepts both; we'll send local format to be safe.
     */
    formatPhone(phoneNumber) {
        let phone = phoneNumber.replace(/\s+/g, '').replace(/^\+/, '');
        // PayHero wants local format: 07XXXXXXXXX
        if (phone.startsWith('254') && phone.length === 12) {
            phone = '0' + phone.substring(3);
        }
        return phone;
    }

    /**
     * Initiate M-Pesa STK Push via PayHero
     * POST https://backend.payhero.co.ke/api/v2/payments
     */
    async initiateSTKPush(phoneNumber, amount, externalReference, customerName) {
        try {
            const formattedPhone = this.formatPhone(phoneNumber);

            console.log('\n📱 PayHero STK Push');
            console.log('----------------------------------------');
            console.log(`💰 Amount: KES ${amount}`);
            console.log(`📱 Phone: ${formattedPhone}`);
            console.log(`📋 Reference: ${externalReference}`);
            console.log(`👤 Name: ${customerName}`);
            console.log('----------------------------------------');

            const payload = {
                amount: Math.round(amount),
                phone_number: formattedPhone,
                channel_id: parseInt(this.channelId),
                network_code: '63902',
                provider: 'm-pesa',
                external_reference: externalReference,
                callback_url: process.env.PAYHERO_CALLBACK_URL || 'https://golden-gates-oegh.onrender.com/api/payments/callback',
            };

            console.log('📞 Formatted phone:', formattedPhone);
            console.log('📤 Payload:', JSON.stringify(payload, null, 2));

            const response = await payheroAxios.post(
                `${this.baseUrl}/payments`,
                payload,
                {
                    headers: {
                        Authorization: this.authToken,
                        'Content-Type': 'application/json',
                        'Accept-Encoding': 'identity',   // tell server: no compression please
                    },
                    timeout: 30000,
                }
            );

            // payheroAxios returns raw buffer when decompress:false — parse it
            const responseData = typeof response.data === 'string'
                ? JSON.parse(response.data)
                : Buffer.isBuffer(response.data)
                    ? JSON.parse(response.data.toString('utf8'))
                    : response.data;

            console.log('✅ STK Push response:', JSON.stringify(responseData, null, 2));
            console.log('----------------------------------------\n');

            return {
                success: true,
                data: responseData,
                formattedPhone,
                payheroReference: responseData?.reference || responseData?.Reference || null,
                checkoutRequestId: responseData?.CheckoutRequestID || null,
            };

        } catch (error) {
            // Parse raw buffer error body if decompress:false is active
            let errorData = error.response?.data;
            if (Buffer.isBuffer(errorData)) {
                try { errorData = JSON.parse(errorData.toString('utf8')); } catch (e) { }
            }

            console.error('❌ PayHero STK Push Error:');
            console.error('Status:', error.response?.status);
            console.error('Data:', JSON.stringify(errorData, null, 2));
            console.error('Message:', error.message);

            const errorMessage =
                errorData?.error_message ||
                errorData?.message ||
                errorData?.detail ||
                error.message;

            return {
                success: false,
                error: errorMessage,
                errorData,
                status: error.response?.status,
            };
        }
    }

    /**
     * Check transaction status by external_reference
     */
    async checkTransactionStatus(externalReference) {
        try {
            console.log(`🔍 Checking transaction status for: ${externalReference}`);

            const response = await payheroAxios.get(
                `${this.baseUrl}/payments`,
                {
                    params: { external_reference: externalReference },
                    headers: {
                        Authorization: this.authToken,
                        'Accept-Encoding': 'identity',
                    },
                    timeout: 15000,
                }
            );

            // Parse response if needed
            const responseData = typeof response.data === 'string'
                ? JSON.parse(response.data)
                : Buffer.isBuffer(response.data)
                    ? JSON.parse(response.data.toString('utf8'))
                    : response.data;

            // Find our record
            const records = responseData?.payments || responseData?.data || [];
            const record = Array.isArray(records)
                ? records.find(r => r.external_reference === externalReference)
                : responseData;

            if (!record) {
                return { success: false, error: 'Transaction not found in PayHero' };
            }

            console.log('✅ Transaction status retrieved:', record);

            return {
                success: true,
                data: {
                    status: record.status,                          // SUCCESS | FAILED | PENDING etc.
                    mpesa_receipt: record.provider_reference || record.mpesa_receipt || '',
                    amount: record.amount,
                    phone: record.phone_number,
                },
            };

        } catch (error) {
            let errorData = error.response?.data;
            if (Buffer.isBuffer(errorData)) {
                try { errorData = JSON.parse(errorData.toString('utf8')); } catch (e) { }
            }

            console.error('❌ PayHero status check error:', errorData || error.message);
            return {
                success: false,
                error: errorData?.message || error.message,
            };
        }
    }
}

module.exports = new PayHeroService();