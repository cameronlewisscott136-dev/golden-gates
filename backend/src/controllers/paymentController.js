const Payment = require('../models/Payment');
const User = require('../models/User');
const Transaction = require('../models/Transaction');
const Referral = require('../models/Referral');
const payheroService = require('../utils/payhero');

// ============================================
// PAYHERO WEBHOOK CALLBACK
// ============================================
const payheroCallback = async (req, res) => {
    try {
        console.log('📞 PayHero Callback Received');
        console.log('Body:', JSON.stringify(req.body, null, 2));

        const data = req.body.response || req.body.data || req.body;
        const externalReference = data.ExternalReference || data.external_reference;
        const status = data.Status || data.status;
        const providerReference = data.MpesaReceiptNumber || data.mpesa_receipt || '';
        const resultCode = data.ResultCode !== undefined ? data.ResultCode : 0;
        const resultDesc = data.ResultDesc || data.result_desc || '';

        if (!externalReference) {
            console.error('❌ No external reference in callback');
            return res.status(200).json({ success: false, message: 'Missing reference' });
        }

        const payment = await Payment.findOne({ externalReference });
        if (!payment) {
            console.error('❌ Payment not found:', externalReference);
            return res.status(200).json({ success: false, message: 'Payment not found' });
        }

        if (['completed', 'failed', 'timeout', 'cancelled'].includes(payment.status)) {
            console.log('ℹ️ Payment already processed:', payment.status);
            return res.status(200).json({ success: true, message: 'Already processed' });
        }

        const isSuccess = resultCode === 0 || status === 'SUCCESS' || status === 'COMPLETED';
        const isTimeout = resultCode === 1037 || status === 'TIMEOUT';
        const isFailed = resultCode > 0 || status === 'FAILED';

        if (isSuccess) {
            console.log('✅ Payment successful for:', externalReference);

            payment.status = 'completed';
            payment.mpesaReceiptNumber = providerReference;
            payment.transactionDate = new Date();
            payment.resultCode = resultCode;
            payment.resultDesc = resultDesc || 'Payment successful';
            await payment.save();

            const user = await User.findById(payment.user);
            if (user) {
                if (payment.isActivation) {
                    // === ACTIVATION: Set initial capital ===
                    user.initialCapital = payment.amount;  // 200 KES locked
                    user.isActive = true;
                    console.log(`✅ Account activated with initial capital: KES ${user.initialCapital}`);

                    // Process referral bonus for referrer
                    if (user.referredBy) {
                        const referrer = await User.findById(user.referredBy);
                        if (referrer) {
                            const bonusAmount = parseInt(process.env.REFERRAL_BONUS) || 200; // Now 200 KES

                            // Add bonus to referrer's bonus balance
                            referrer.bonusBalance += bonusAmount;
                            referrer.referralEarnings += bonusAmount;
                            referrer.totalReferrals += 1;
                            await referrer.save();

                            // Update referral record
                            await Referral.findOneAndUpdate(
                                { referrer: referrer._id, referredUser: user._id },
                                {
                                    status: 'active',
                                    bonusEarned: bonusAmount,
                                    bonusPaid: true,
                                    activatedAt: new Date()
                                }
                            );

                            // Create transaction for referral bonus
                            await Transaction.create({
                                user: referrer._id,
                                type: 'referral_bonus',
                                amount: bonusAmount,
                                balanceBefore: referrer.totalBalance,
                                balanceAfter: referrer.totalBalance + bonusAmount,
                                description: `Referral bonus for ${user.email} - KES ${bonusAmount}`,
                                status: 'completed',
                                metadata: { referredUser: user._id }
                            });

                            console.log(`✅ Referral bonus of KES ${bonusAmount} added to ${referrer.email}'s bonus balance`);
                        }
                    }
                } else if (payment.isDeposit) {
                    // === DEPOSIT: Add to profit balance (can be used for trading) ===
                    user.profitBalance += payment.amount;
                    user.totalDeposited = (user.totalDeposited || 0) + payment.amount;
                    console.log(`✅ Deposit of KES ${payment.amount} added to profit balance`);
                }

                await user.save();

                // Create transaction record
                await Transaction.create({
                    user: user._id,
                    type: payment.isActivation ? 'capital_activation' : 'deposit',
                    amount: payment.amount,
                    balanceBefore: user.totalBalance - payment.amount,
                    balanceAfter: user.totalBalance,
                    description: payment.isActivation
                        ? `Account activation - Initial Capital of KES ${payment.amount}`
                        : `Deposit of KES ${payment.amount}`,
                    status: 'completed',
                    paymentId: payment._id,
                });
            }
        } else if (isTimeout) {
            console.log('⏰ Payment timeout for:', externalReference);
            payment.status = 'timeout';
            payment.resultDesc = resultDesc || 'Payment timed out';
            await payment.save();
        } else if (isFailed) {
            console.log('❌ Payment failed for:', externalReference);
            payment.status = 'failed';
            payment.resultDesc = resultDesc || 'Payment failed';
            await payment.save();
        }

        return res.status(200).json({ success: true, message: 'Callback processed' });
    } catch (error) {
        console.error('❌ Callback error:', error);
        return res.status(200).json({ success: false, message: 'Callback processing failed' });
    }
};

// ============================================
// CHECK PAYMENT STATUS (Polling)
// ============================================
const checkPaymentStatus = async (req, res) => {
    try {
        const { externalReference } = req.params;
        const payment = await Payment.findOne({ externalReference });

        if (!payment) {
            return res.status(404).json({ success: false, message: 'Payment not found' });
        }

        // If still pending, check with PayHero
        if (payment.status === 'pending') {
            const result = await payheroService.checkTransactionStatus(externalReference);
            if (result.success && result.data) {
                const status = (result.data.status || '').toUpperCase();
                if (status === 'SUCCESS' || status === 'COMPLETED') {
                    // Trigger the callback logic (or update directly)
                    payment.status = 'completed';
                    payment.mpesaReceiptNumber = result.data.mpesa_receipt || '';
                    payment.transactionDate = new Date();
                    await payment.save();

                    // Update user balance
                    const user = await User.findById(payment.user);
                    if (user) {
                        if (payment.isActivation) {
                            user.initialCapital = payment.amount;
                            user.isActive = true;

                            // Process referral bonus
                            if (user.referredBy) {
                                const referrer = await User.findById(user.referredBy);
                                if (referrer) {
                                    const bonusAmount = parseInt(process.env.REFERRAL_BONUS) || 200;
                                    referrer.bonusBalance += bonusAmount;
                                    referrer.referralEarnings += bonusAmount;
                                    referrer.totalReferrals += 1;
                                    await referrer.save();

                                    await Referral.findOneAndUpdate(
                                        { referrer: referrer._id, referredUser: user._id },
                                        { status: 'active', bonusEarned: bonusAmount, bonusPaid: true, activatedAt: new Date() }
                                    );

                                    await Transaction.create({
                                        user: referrer._id,
                                        type: 'referral_bonus',
                                        amount: bonusAmount,
                                        balanceBefore: referrer.totalBalance,
                                        balanceAfter: referrer.totalBalance + bonusAmount,
                                        description: `Referral bonus for ${user.email} - KES ${bonusAmount}`,
                                        status: 'completed',
                                        metadata: { referredUser: user._id }
                                    });
                                }
                            }
                        } else if (payment.isDeposit) {
                            user.profitBalance += payment.amount;
                            user.totalDeposited = (user.totalDeposited || 0) + payment.amount;
                        }
                        await user.save();
                    }
                } else if (status === 'FAILED') {
                    payment.status = 'failed';
                    await payment.save();
                } else if (status === 'TIMEOUT') {
                    payment.status = 'timeout';
                    await payment.save();
                }
            }
        }

        res.json({
            success: true,
            data: {
                status: payment.status,
                mpesaReceiptNumber: payment.mpesaReceiptNumber || null,
                amount: payment.amount,
                isActivation: payment.isActivation,
                isDeposit: payment.isDeposit,
                transactionDate: payment.transactionDate,
            }
        });
    } catch (error) {
        console.error('❌ Status check error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// ============================================
// GET USER PAYMENTS
// ============================================
const getUserPayments = async (req, res) => {
    try {
        const payments = await Payment.find({ user: req.user._id }).sort({ createdAt: -1 });
        res.json({ success: true, data: payments });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

module.exports = {
    payheroCallback,
    checkPaymentStatus,
    getUserPayments,
};