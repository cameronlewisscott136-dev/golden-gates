const Payment = require('../models/Payment');
const User = require('../models/User');
const Transaction = require('../models/Transaction');
const Referral = require('../models/Referral');
const payheroService = require('../utils/payhero');

// ============================================
// INITIATE ACTIVATION PAYMENT
// ============================================
const initiateActivationPayment = async (req, res) => {
    try {
        const { phoneNumber, amount } = req.body;
        const user = await User.findById(req.user._id);

        console.log("\n========================================");
        console.log("💰 ACCOUNT ACTIVATION - PayHero");
        console.log("========================================");
        console.log(`📱 Phone: ${phoneNumber}`);
        console.log(`📧 Email: ${user.email}`);
        console.log(`💰 Amount: KES ${amount}`);
        console.log(`👤 Customer: ${user.firstName} ${user.lastName}`);
        console.log("========================================\n");

        // Validation
        if (!phoneNumber || !amount) {
            return res.status(400).json({
                success: false,
                message: "Phone number and amount are required",
            });
        }

        if (user.isActive) {
            return res.status(400).json({
                success: false,
                message: "Account already activated",
            });
        }

        if (!user.isVerified) {
            return res.status(400).json({
                success: false,
                message: "Please verify your email first",
            });
        }

        const requiredAmount = parseInt(process.env.CAPITAL_REQUIRED) || 200;
        const depositAmount = parseFloat(amount);

        if (!depositAmount || depositAmount < requiredAmount) {
            return res.status(400).json({
                success: false,
                message: `Minimum deposit for activation is KES ${requiredAmount}`,
            });
        }

        // Generate references
        const timestamp = Date.now();
        const orderId = `ACT${timestamp}`;
        const externalReference = `ACT${timestamp}`;

        // Initiate PayHero STK Push
        const result = await payheroService.initiateSTKPush(
            phoneNumber,
            depositAmount,
            externalReference,
            `${user.firstName} ${user.lastName}`
        );

        if (!result.success) {
            console.error("❌ PayHero error:", result.error);
            return res.status(500).json({
                success: false,
                message: result.error || "Failed to initiate payment. Please try again.",
            });
        }

        // Create payment record
        const payment = new Payment({
            user: user._id,
            orderId,
            externalReference,
            phoneNumber: result.formattedPhone,
            email: user.email,
            amount: Math.round(depositAmount),
            customerName: `${user.firstName} ${user.lastName}`,
            description: "Account Activation Deposit - Golden Gates",
            status: "pending",
            payheroTransactionId: result.payheroReference || "",
            paymentChannel: "mpesa",
            isActivation: true,
        });

        await payment.save();

        console.log("✅ Payment record saved");
        console.log(`📋 Order ID: ${orderId}`);
        console.log(`📱 External Ref: ${externalReference}`);
        console.log(`🏦 PayHero Ref: ${result.payheroReference}`);
        console.log("========================================\n");

        return res.json({
            success: true,
            data: {
                orderId,
                externalReference,
                phoneNumber: result.formattedPhone,
                amount: depositAmount,
                message: "STK Push sent. Check your phone for the M-Pesa prompt.",
            },
        });
    } catch (error) {
        console.error("❌ Payment initiation error:", error);
        return res.status(500).json({
            success: false,
            message: error.message || "Failed to initiate payment",
        });
    }
};

// ============================================
// PAYHERO WEBHOOK CALLBACK
// ============================================
const payheroCallback = async (req, res) => {
    try {
        console.log("\n========================================");
        console.log("📞 PAYHERO CALLBACK RECEIVED");
        console.log("========================================");
        console.log("Full Body:", JSON.stringify(req.body, null, 2));
        console.log("========================================\n");

        const raw = req.body;
        let externalReference = null;
        let status = null;
        let providerReference = null;
        let reference = null;
        let resultCode = null;
        let resultDesc = null;

        // Try different formats
        if (raw.ExternalReference || raw.external_reference) {
            externalReference = raw.ExternalReference || raw.external_reference;
            status = raw.Status || raw.status;
            providerReference = raw.MpesaReceiptNumber || raw.mpesa_receipt || raw.provider_reference || "";
            reference = raw.MerchantRequestID || raw.reference || "";
            resultCode = raw.ResultCode;
            resultDesc = raw.ResultDesc || raw.ResultDescription || "";
        } else if (raw.response) {
            const payload = raw.response;
            externalReference = payload.ExternalReference || payload.external_reference;
            status = payload.Status || payload.status;
            providerReference = payload.MpesaReceiptNumber || payload.mpesa_receipt || payload.provider_reference || "";
            reference = payload.MerchantRequestID || payload.reference || "";
            resultCode = payload.ResultCode;
            resultDesc = payload.ResultDesc || payload.ResultDescription || "";
        } else if (raw.data) {
            const payload = raw.data;
            externalReference = payload.ExternalReference || payload.external_reference;
            status = payload.Status || payload.status;
            providerReference = payload.MpesaReceiptNumber || payload.mpesa_receipt || payload.provider_reference || "";
            reference = payload.MerchantRequestID || payload.reference || "";
            resultCode = payload.ResultCode;
            resultDesc = payload.ResultDesc || payload.ResultDescription || "";
        }

        console.log("📋 Parsed callback:", {
            externalReference,
            status,
            providerReference,
            resultCode,
            resultDesc,
        });

        if (!externalReference) {
            console.error("❌ No external_reference in callback");
            return res.status(200).json({ success: false, message: "Missing external_reference" });
        }

        const payment = await Payment.findOne({ externalReference: externalReference });

        if (!payment) {
            console.error("❌ Payment not found for ref:", externalReference);
            return res.status(200).json({ success: false, message: "Payment record not found" });
        }

        const terminalStatuses = ["completed", "failed", "timeout", "cancelled"];
        if (terminalStatuses.includes(payment.status)) {
            console.log(`ℹ️ Payment already in terminal state: ${payment.status}. Skipping.`);
            return res.status(200).json({ success: true, message: "Already processed" });
        }

        const normStatus = (status || "").toString().toLowerCase().trim();
        console.log(`📊 Normalized status: ${normStatus}`);

        switch (normStatus) {
            case "success":
            case "completed":
            case "settled": {
                console.log("\n✅ PAYMENT SUCCESSFUL!");
                console.log(`💰 Amount: KES ${payment.amount}`);
                console.log(`🧾 M-Pesa Receipt: ${providerReference}`);
                console.log(`📧 Customer: ${payment.email}`);

                // Update payment
                payment.status = "completed";
                payment.mpesaReceiptNumber = providerReference || "";
                payment.payheroTransactionId = reference || payment.payheroTransactionId;
                payment.transactionDate = new Date();
                payment.resultCode = resultCode || 0;
                payment.resultDesc = "Payment successful";
                await payment.save();

                // Get user
                const user = await User.findById(payment.user);
                if (!user) {
                    console.error("❌ User not found for payment:", payment.user);
                    return res.status(200).json({ success: false, message: "User not found" });
                }

                // Update user balance and activate account
                const balanceBefore = user.balance;
                user.balance += payment.amount;
                if (payment.isActivation) {
                    user.isActive = true;
                    console.log("✅ Account activated for user:", user.email);
                }
                await user.save();

                // Create transaction record
                await Transaction.create({
                    user: user._id,
                    type: payment.isActivation ? 'capital_activation' : 'deposit',
                    amount: payment.amount,
                    balanceBefore,
                    balanceAfter: user.balance,
                    description: payment.isActivation
                        ? `Account activation deposit of KES ${payment.amount} via M-Pesa`
                        : `Deposit of KES ${payment.amount} via M-Pesa`,
                    status: 'completed',
                    paymentId: payment._id,
                });

                // Process referral bonus if this is activation and user was referred
                if (payment.isActivation && user.referredBy) {
                    const referrer = await User.findById(user.referredBy);
                    if (referrer) {
                        const bonusAmount = parseInt(process.env.REFERRAL_BONUS) || 100;
                        const refBalanceBefore = referrer.balance;

                        referrer.balance += bonusAmount;
                        referrer.referralEarnings += bonusAmount;
                        referrer.totalReferrals += 1;
                        await referrer.save();

                        await Referral.findOneAndUpdate(
                            { referrer: referrer._id, referredUser: user._id },
                            {
                                status: 'active',
                                bonusEarned: bonusAmount,
                                bonusPaid: true,
                                activatedAt: new Date()
                            }
                        );

                        await Transaction.create({
                            user: referrer._id,
                            type: 'referral_bonus',
                            amount: bonusAmount,
                            balanceBefore: refBalanceBefore,
                            balanceAfter: referrer.balance,
                            description: `Referral bonus for ${user.email}`,
                        });

                        console.log(`✅ Referral bonus of KES ${bonusAmount} processed for ${referrer.email}`);
                    }
                }

                console.log(`✅ User balance updated: ${user.balance}`);
                break;
            }
            case "failed":
            case "error": {
                console.log("\n❌ PAYMENT FAILED");
                payment.status = "failed";
                payment.resultDesc = resultDesc || "Payment failed";
                await payment.save();
                break;
            }
            case "timeout":
            case "timedout": {
                console.log("\n⏰ PAYMENT TIMEOUT");
                payment.status = "timeout";
                payment.resultDesc = resultDesc || "Payment timed out";
                await payment.save();
                break;
            }
            case "cancelled":
            case "canceled": {
                console.log("\n🚫 PAYMENT CANCELLED");
                payment.status = "cancelled";
                payment.resultDesc = resultDesc || "Cancelled by user";
                await payment.save();
                break;
            }
            default: {
                console.log(`⚠️ Unknown callback status: ${status}`);
            }
        }

        return res.status(200).json({ success: true, message: "Callback processed" });
    } catch (error) {
        console.error("❌ Callback processing error:", error);
        return res.status(200).json({ success: false, message: "Callback processing failed" });
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
            return res.status(404).json({ success: false, message: "Payment not found" });
        }

        if (payment.status === "pending") {
            console.log("⏳ Status is pending, checking with PayHero...");
            const result = await payheroService.checkTransactionStatus(externalReference);

            if (result.success && result.data) {
                const txStatus = (result.data.status || "").toUpperCase();
                console.log(`📊 PayHero status: ${txStatus}`);

                if (txStatus === "SUCCESS" || txStatus === "COMPLETED") {
                    // Process successful payment
                    payment.status = "completed";
                    payment.mpesaReceiptNumber = result.data.mpesa_receipt || "";
                    payment.transactionDate = new Date();
                    await payment.save();

                    // Update user
                    const user = await User.findById(payment.user);
                    if (user) {
                        const balanceBefore = user.balance;
                        user.balance += payment.amount;
                        if (payment.isActivation) {
                            user.isActive = true;
                        }
                        await user.save();

                        await Transaction.create({
                            user: user._id,
                            type: payment.isActivation ? 'capital_activation' : 'deposit',
                            amount: payment.amount,
                            balanceBefore,
                            balanceAfter: user.balance,
                            description: payment.isActivation
                                ? `Account activation deposit of KES ${payment.amount} via M-Pesa`
                                : `Deposit of KES ${payment.amount} via M-Pesa`,
                            status: 'completed',
                            paymentId: payment._id,
                        });
                    }
                    console.log("✅ Payment status updated to completed via polling");
                } else if (["FAILED", "ERROR"].includes(txStatus)) {
                    payment.status = "failed";
                    await payment.save();
                } else if (["TIMEOUT", "TIMEDOUT"].includes(txStatus)) {
                    payment.status = "timeout";
                    await payment.save();
                } else if (["CANCELLED", "CANCELED"].includes(txStatus)) {
                    payment.status = "cancelled";
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
                email: payment.email,
                customerName: payment.customerName,
                amount: payment.amount,
                isActivation: payment.isActivation,
            },
        });
    } catch (error) {
        console.error("❌ Status check error:", error);
        return res.status(500).json({
            success: false,
            message: error.message || "Failed to check payment status",
        });
    }
};

// ============================================
// TEST PAYMENT (For debugging)
// ============================================
const testCallback = async (req, res) => {
    try {
        const { externalReference } = req.params;

        console.log(`🧪 [TEST] Manually completing payment for: ${externalReference}`);

        const payment = await Payment.findOne({ externalReference });

        if (!payment) {
            return res.status(404).json({ success: false, message: 'Payment not found' });
        }

        payment.status = 'completed';
        payment.mpesaReceiptNumber = 'TEST' + Date.now();
        payment.transactionDate = new Date();
        payment.resultCode = 0;
        payment.resultDesc = 'Test payment completed';
        await payment.save();

        // Update user balance
        const user = await User.findById(payment.user);
        if (user) {
            const balanceBefore = user.balance;
            user.balance += payment.amount;
            if (payment.isActivation) {
                user.isActive = true;
            }
            await user.save();

            await Transaction.create({
                user: user._id,
                type: payment.isActivation ? 'capital_activation' : 'deposit',
                amount: payment.amount,
                balanceBefore,
                balanceAfter: user.balance,
                description: 'Test payment completed',
                status: 'completed',
                paymentId: payment._id,
            });
        }

        return res.json({
            success: true,
            message: 'Payment completed successfully (test)',
            data: {
                status: payment.status,
                mpesaReceiptNumber: payment.mpesaReceiptNumber,
                email: payment.email,
                amount: payment.amount,
                isActivation: payment.isActivation,
            }
        });
    } catch (error) {
        console.error('❌ [TEST] Error:', error);
        return res.status(500).json({ success: false, message: error.message });
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
        console.error("❌ Fetch payments error:", error);
        return res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};

// ============================================
// GET PAYMENT BY ORDER ID
// ============================================
const getPaymentByOrderId = async (req, res) => {
    try {
        const payment = await Payment.findOne({ orderId: req.params.orderId });
        if (!payment) {
            return res.status(404).json({ success: false, message: "Payment not found" });
        }
        return res.json({ success: true, data: payment });
    } catch (error) {
        console.error("❌ Get payment error:", error);
        return res.status(500).json({ success: false, message: error.message });
    }
};

// ============================================
// ADMIN: GET ALL PAYMENTS
// ============================================
const getPayments = async (req, res) => {
    try {
        const payments = await Payment.find().sort({ createdAt: -1 });
        return res.json({ success: true, data: payments });
    } catch (error) {
        console.error("❌ Fetch payments error:", error);
        return res.status(500).json({ success: false, message: error.message });
    }
};

// ============================================
// ADMIN: UPDATE PAYMENT STATUS
// ============================================
const updatePaymentStatus = async (req, res) => {
    try {
        const { orderId } = req.params;
        const { status, notes } = req.body;

        const payment = await Payment.findOne({ orderId });

        if (!payment) {
            return res.status(404).json({ success: false, message: "Payment not found" });
        }

        if (status) payment.status = status;
        if (notes) payment.notes = notes;

        if (status === "completed") {
            payment.transactionDate = new Date();
        }

        await payment.save();

        return res.json({
            success: true,
            message: "Payment status updated",
            data: payment,
        });
    } catch (error) {
        console.error("❌ Update payment error:", error);
        return res.status(500).json({ success: false, message: error.message });
    }
};

module.exports = {
    initiateActivationPayment,
    payheroCallback,
    checkPaymentStatus,
    getUserPayments,
    getPaymentByOrderId,
    getPayments,
    updatePaymentStatus,
    testCallback,
};