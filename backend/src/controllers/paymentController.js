const Payment = require('../models/Payment');
const User = require('../models/User');
const Transaction = require('../models/Transaction');
const payheroService = require('../utils/payhero');

// ============================================
// INITIATE DEPOSIT
// ============================================
const initiateDeposit = async (req, res) => {
    try {
        const { phoneNumber, amount } = req.body;
        const user = await User.findById(req.user._id);

        console.log('\n========================================');
        console.log('💰 DEPOSIT INITIATION - PayHero');
        console.log('========================================');
        console.log(`📱 Phone: ${phoneNumber}`);
        console.log(`💰 Amount: KES ${amount}`);
        console.log(`👤 User: ${user.email}`);
        console.log('========================================\n');

        if (!phoneNumber || !amount) {
            return res.status(400).json({
                success: false,
                message: 'Phone number and amount are required',
            });
        }

        if (Number(amount) < 100) {
            return res.status(400).json({
                success: false,
                message: 'Minimum deposit is KES 100',
            });
        }

        const timestamp = Date.now();
        const orderId = `DEP${timestamp}`;
        const externalReference = `REF${timestamp}`;

        const result = await payheroService.initiateSTKPush(
            phoneNumber,
            amount,
            externalReference,
            `${user.firstName} ${user.lastName}`
        );

        if (!result.success) {
            console.error('❌ PayHero error:', result.error);
            return res.status(500).json({
                success: false,
                message: result.error || 'Failed to initiate payment. Please try again.',
            });
        }

        // Create payment record
        const payment = new Payment({
            user: user._id,
            orderId,
            externalReference,
            phoneNumber: result.formattedPhone,
            email: user.email,
            amount: Math.round(amount),
            customerName: `${user.firstName} ${user.lastName}`,
            description: 'Account Deposit - Golden Gates',
            status: 'pending',
            payheroTransactionId: result.payheroReference || '',
            paymentChannel: 'mpesa',
        });

        await payment.save();

        console.log('✅ Payment record saved');
        console.log(`📋 Order ID: ${orderId}`);
        console.log(`📱 External Ref: ${externalReference}`);
        console.log('========================================\n');

        return res.json({
            success: true,
            data: {
                orderId,
                externalReference,
                message: 'STK Push sent. Check your phone for the M-Pesa prompt.',
            },
        });
    } catch (error) {
        console.error('❌ Deposit initiation error:', error);
        return res.status(500).json({
            success: false,
            message: error.message || 'Failed to initiate deposit',
        });
    }
};

// ============================================
// PAYHERO WEBHOOK CALLBACK
// ============================================
const payheroCallback = async (req, res) => {
    try {
        console.log('\n========================================');
        console.log('📞 PAYHERO CALLBACK RECEIVED');
        console.log('========================================');
        console.log('Full Body:', JSON.stringify(req.body, null, 2));
        console.log('========================================\n');

        const raw = req.body;
        let externalReference = null;
        let status = null;
        let providerReference = null;
        let reference = null;
        let resultCode = null;
        let resultDesc = null;

        // Parse different formats
        if (raw.ExternalReference || raw.external_reference) {
            externalReference = raw.ExternalReference || raw.external_reference;
            status = raw.Status || raw.status;
            providerReference = raw.MpesaReceiptNumber || raw.mpesa_receipt || '';
            reference = raw.MerchantRequestID || raw.reference || '';
            resultCode = raw.ResultCode;
            resultDesc = raw.ResultDesc || raw.ResultDescription || '';
        } else if (raw.response) {
            const payload = raw.response;
            externalReference = payload.ExternalReference || payload.external_reference;
            status = payload.Status || payload.status;
            providerReference = payload.MpesaReceiptNumber || payload.mpesa_receipt || '';
            reference = payload.MerchantRequestID || payload.reference || '';
            resultCode = payload.ResultCode;
            resultDesc = payload.ResultDesc || payload.ResultDescription || '';
        }

        if (!externalReference) {
            console.error('❌ No external_reference in callback');
            return res.status(200).json({ success: false, message: 'Missing external_reference' });
        }

        const payment = await Payment.findOne({ externalReference });

        if (!payment) {
            console.error('❌ Payment not found for ref:', externalReference);
            return res.status(200).json({ success: false, message: 'Payment record not found' });
        }

        const terminalStatuses = ['completed', 'failed', 'timeout', 'cancelled'];
        if (terminalStatuses.includes(payment.status)) {
            console.log(`ℹ️ Payment already in terminal state: ${payment.status}. Skipping.`);
            return res.status(200).json({ success: true, message: 'Already processed' });
        }

        const normStatus = (status || '').toString().toLowerCase().trim();
        console.log(`📊 Normalized status: ${normStatus}`);

        switch (normStatus) {
            case 'success':
            case 'completed':
            case 'settled': {
                console.log('\n✅ PAYMENT SUCCESSFUL!');
                console.log(`💰 Amount: KES ${payment.amount}`);
                console.log(`🧾 M-Pesa Receipt: ${providerReference}`);
                console.log(`📧 Customer: ${payment.email}`);

                payment.status = 'completed';
                payment.mpesaReceiptNumber = providerReference || '';
                payment.payheroTransactionId = reference || payment.payheroTransactionId;
                payment.transactionDate = new Date();
                payment.resultCode = resultCode || 0;
                payment.resultDesc = 'Payment successful';
                await payment.save();

                // Update user balance
                const user = await User.findById(payment.user);
                if (user) {
                    const balanceBefore = user.balance;
                    user.balance += payment.amount;
                    await user.save();

                    // Create transaction record
                    await Transaction.create({
                        user: user._id,
                        type: 'deposit',
                        amount: payment.amount,
                        balanceBefore,
                        balanceAfter: user.balance,
                        description: `Deposit of KES ${payment.amount} via M-Pesa`,
                        status: 'completed',
                        paymentId: payment._id,
                    });

                    console.log(`✅ User balance updated: ${user.balance}`);
                }

                break;
            }
            case 'failed':
            case 'error': {
                console.log('\n❌ PAYMENT FAILED');
                payment.status = 'failed';
                payment.resultDesc = resultDesc || 'Payment failed';
                await payment.save();
                break;
            }
            case 'timeout':
            case 'timedout': {
                console.log('\n⏰ PAYMENT TIMEOUT');
                payment.status = 'timeout';
                payment.resultDesc = resultDesc || 'Payment timed out';
                await payment.save();
                break;
            }
            case 'cancelled':
            case 'canceled': {
                console.log('\n🚫 PAYMENT CANCELLED');
                payment.status = 'cancelled';
                payment.resultDesc = resultDesc || 'Cancelled by user';
                await payment.save();
                break;
            }
            default: {
                console.log(`⚠️ Unknown callback status: ${status}`);
            }
        }

        return res.status(200).json({ success: true, message: 'Callback processed' });
    } catch (error) {
        console.error('❌ Callback processing error:', error);
        return res.status(200).json({ success: false, message: 'Callback processing failed' });
    }
};

// ============================================
// CHECK PAYMENT STATUS
// ============================================
const checkPaymentStatus = async (req, res) => {
    try {
        const { externalReference } = req.params;

        console.log(`🔍 Checking payment status for: ${externalReference}`);

        const payment = await Payment.findOne({ externalReference });

        if (!payment) {
            return res.status(404).json({ success: false, message: 'Payment not found' });
        }

        if (payment.status === 'pending') {
            console.log('⏳ Status is pending, checking with PayHero...');
            const result = await payheroService.checkTransactionStatus(externalReference);

            if (result.success && result.data) {
                const txStatus = (result.data.status || '').toUpperCase();
                console.log(`📊 PayHero status: ${txStatus}`);

                if (txStatus === 'SUCCESS' || txStatus === 'COMPLETED') {
                    payment.status = 'completed';
                    payment.mpesaReceiptNumber = result.data.mpesa_receipt || '';
                    payment.transactionDate = new Date();
                    await payment.save();

                    // Update user balance
                    const user = await User.findById(payment.user);
                    if (user) {
                        const balanceBefore = user.balance;
                        user.balance += payment.amount;
                        await user.save();

                        await Transaction.create({
                            user: user._id,
                            type: 'deposit',
                            amount: payment.amount,
                            balanceBefore,
                            balanceAfter: user.balance,
                            description: `Deposit of KES ${payment.amount} via M-Pesa`,
                            status: 'completed',
                            paymentId: payment._id,
                        });
                    }
                    console.log('✅ Payment status updated to completed via polling');
                } else if (['FAILED', 'ERROR'].includes(txStatus)) {
                    payment.status = 'failed';
                    await payment.save();
                } else if (['TIMEOUT', 'TIMEDOUT'].includes(txStatus)) {
                    payment.status = 'timeout';
                    await payment.save();
                }
            }
        }

        return res.json({
            success: true,
            data: {
                status: payment.status,
                mpesaReceiptNumber: payment.mpesaReceiptNumber || null,
                transactionDate: payment.transactionDate || null,
                amount: payment.amount,
            },
        });
    } catch (error) {
        console.error('❌ Status check error:', error);
        return res.status(500).json({
            success: false,
            message: error.message || 'Failed to check payment status',
        });
    }
};

// ============================================
// GET USER PAYMENTS
// ============================================
const getUserPayments = async (req, res) => {
    try {
        const payments = await Payment.find({ user: req.user._id })
            .sort({ createdAt: -1 });

        return res.json({
            success: true,
            data: payments,
        });
    } catch (error) {
        console.error('❌ Fetch payments error:', error);
        return res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};

module.exports = {
    initiateDeposit,
    payheroCallback,
    checkPaymentStatus,
    getUserPayments,
};