const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const { sendPaymentConfirmation } = require('../services/emailService');
const { initializePayment, verifyPayment } = require('../config/hubtel');

console.log('[Deposit Routes] Module loaded - setting up deposit endpoints');

// Deposit requests file
const DEPOSITS_FILE = path.join(__dirname, '../logs/deposit_requests.json');
const BALANCES_FILE = path.join(__dirname, '../logs/user_balances.json');

/**
 * Initialize deposits file if it doesn't exist
 */
function ensureDepositsFile() {
    if (!fs.existsSync(DEPOSITS_FILE)) {
        fs.writeFileSync(DEPOSITS_FILE, JSON.stringify([], null, 2));
    }
}

/**
 * Get all deposit requests
 */
function getAllDeposits() {
    ensureDepositsFile();
    const data = fs.readFileSync(DEPOSITS_FILE, 'utf-8');
    return JSON.parse(data || '[]');
}

/**
 * Save deposits to file
 */
function saveDeposits(deposits) {
    fs.writeFileSync(DEPOSITS_FILE, JSON.stringify(deposits, null, 2));
}

/**
 * Get user balance
 */
function getUserBalance(userId) {
    try {
        if (!fs.existsSync(BALANCES_FILE)) {
            return { balance: 0, deposited: 0, withdrawable: 0 };
        }
        
        const data = fs.readFileSync(BALANCES_FILE, 'utf-8');
        const balances = JSON.parse(data || '[]');
        
        // Handle array format
        if (Array.isArray(balances)) {
            const userBalance = balances.find(b => b.userId === userId);
            return userBalance || { userId, balance: 0, deposited: 0, withdrawable: 0 };
        }
        
        // Handle object format
        return balances[userId] || { userId, balance: 0, deposited: 0, withdrawable: 0 };
    } catch (error) {
        console.error('Error reading balance:', error);
        return { balance: 0, deposited: 0, withdrawable: 0 };
    }
}

/**
 * Save user balance
 */
function saveUserBalance(userId, balanceData) {
    try {
        const data = fs.readFileSync(BALANCES_FILE, 'utf-8');
        let balances = JSON.parse(data || '[]');
        
        // Handle array format
        if (Array.isArray(balances)) {
            const index = balances.findIndex(b => b.userId === userId);
            if (index !== -1) {
                balances[index] = { ...balances[index], ...balanceData };
            } else {
                balances.push({ userId, ...balanceData });
            }
        } else {
            // Object format
            balances[userId] = { ...balances[userId], ...balanceData };
        }
        
        fs.writeFileSync(BALANCES_FILE, JSON.stringify(balances, null, 2));
    } catch (error) {
        console.error('Error saving balance:', error);
    }
}

/**
 * Submit a deposit request
 * POST /api/deposit/submit
 */
router.post('/submit', (req, res) => {
    console.log('[Deposit] ================== SUBMIT REQUEST ==================');
    console.log('[Deposit] Method: POST /api/deposit/submit');
    
    try {
        const { userId, senderName, senderNumber, amount, momoNumber, momoName } = req.body;
        
        if (!userId || !senderName || !senderNumber || !amount || !req.files || !req.files.screenshot) {
            console.log('[Deposit] ✗ Validation failed');
            return res.status(400).json({
                success: false,
                message: 'userId, senderName, senderNumber, amount, and screenshot are required'
            });
        }

        const amountNum = parseFloat(amount);
        if (isNaN(amountNum) || amountNum <= 0) {
            console.log('[Deposit] ✗ Invalid amount:', amountNum);
            return res.status(400).json({
                success: false,
                message: 'Amount must be a positive number'
            });
        }

        // Get the screenshot file
        const screenshot = req.files.screenshot;
        
        // Validate file type
        const allowedMimes = ['image/png', 'image/jpeg', 'image/gif'];
        if (!allowedMimes.includes(screenshot.mimetype)) {
            return res.status(400).json({
                success: false,
                message: 'Only PNG, JPG, or GIF files are allowed'
            });
        }

        // Validate file size (5MB limit)
        if (screenshot.size > 5 * 1024 * 1024) {
            return res.status(400).json({
                success: false,
                message: 'File size must be less than 5MB'
            });
        }

        // Create uploads directory if it doesn't exist
        const uploadDir = path.join(__dirname, '../uploads/deposits');
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }

        // Generate unique filename
        const filename = `${userId}_${Date.now()}_${screenshot.name}`;
        const filepath = path.join(uploadDir, filename);

        // Save file to disk
        screenshot.mv(filepath, (err) => {
            if (err) {
                console.error('[Deposit] ✗ File upload error:', err);
                return res.status(500).json({
                    success: false,
                    message: 'Error uploading file',
                    error: err.message
                });
            }

            // Create deposit request
            const depositRequest = {
                id: `deposit_${userId}_${Date.now()}`,
                userId: userId,
                senderName: senderName,
                senderNumber: senderNumber,
                amount: amountNum,
                momoNumber: momoNumber || '0553843255',
                momoName: momoName || 'Emmanuel Mawufemor',
                screenshotPath: filename,
                screenshotSize: screenshot.size,
                status: 'pending', // pending, approved, rejected
                createdAt: new Date().toISOString(),
                approvedAt: null,
                approvedBy: null,
                rejectionReason: null
            };

            // Save to deposits file
            const deposits = getAllDeposits();
            deposits.push(depositRequest);
            saveDeposits(deposits);

            console.log(`[Deposit] ✓ Deposit request created:`, {
                id: depositRequest.id,
                userId: userId,
                amount: amountNum,
                status: 'pending'
            });
            console.log('[Deposit] ================== SUCCESS ==================');

            res.json({
                success: true,
                message: 'Deposit request submitted successfully',
                deposit: depositRequest
            });
        });

    } catch (error) {
        console.error('[Deposit] ✗ EXCEPTION ERROR');
        console.error('[Deposit] Message:', error.message);
        console.error('[Deposit] Stack:', error.stack);
        console.error('[Deposit] ================== ERROR ==================');
        
        res.status(500).json({
            success: false,
            message: 'Error submitting deposit request',
            error: error.message
        });
    }
});

/**
 * Get deposit requests for a user
 * GET /api/deposit/user/:userId
 */
router.get('/user/:userId', (req, res) => {
    try {
        const { userId } = req.params;
        
        if (!userId) {
            return res.status(400).json({
                success: false,
                message: 'User ID is required'
            });
        }

        const deposits = getAllDeposits();
        const userDeposits = deposits.filter(d => d.userId === userId);

        res.json({
            success: true,
            deposits: userDeposits
        });

    } catch (error) {
        console.error('[Deposit] Error fetching user deposits:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching deposits',
            error: error.message
        });
    }
});

/**
 * Get all pending deposit requests (for admin)
 * GET /api/deposit/pending
 */
router.get('/pending', (req, res) => {
    try {
        const deposits = getAllDeposits();
        const pendingDeposits = deposits.filter(d => d.status === 'pending');

        res.json({
            success: true,
            deposits: pendingDeposits
        });

    } catch (error) {
        console.error('[Deposit] Error fetching pending deposits:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching pending deposits',
            error: error.message
        });
    }
});

/**
 * Get all deposits (for admin)
 * GET /api/deposit/all
 */
router.get('/all', (req, res) => {
    try {
        const deposits = getAllDeposits();

        res.json({
            success: true,
            deposits: deposits
        });

    } catch (error) {
        console.error('[Deposit] Error fetching all deposits:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching deposits',
            error: error.message
        });
    }
});

/**
 * Approve deposit request (admin only)
 * POST /api/deposit/approve
 */
router.post('/approve', (req, res) => {
    console.log('[Deposit] ================== APPROVE REQUEST ==================');
    
    try {
        const { depositId, adminEmail } = req.body;
        
        if (!depositId) {
            return res.status(400).json({
                success: false,
                message: 'depositId is required'
            });
        }

        const deposits = getAllDeposits();
        const depositIndex = deposits.findIndex(d => d.id === depositId);

        if (depositIndex === -1) {
            return res.status(404).json({
                success: false,
                message: 'Deposit request not found'
            });
        }

        const deposit = deposits[depositIndex];

        if (deposit.status !== 'pending') {
            return res.status(400).json({
                success: false,
                message: `Cannot approve deposit with status: ${deposit.status}`
            });
        }

        // Update deposit status
        deposit.status = 'approved';
        deposit.approvedAt = new Date().toISOString();
        deposit.approvedBy = adminEmail || 'admin';

        // Add balance to user (this becomes their deposited amount)
        const userBalance = getUserBalance(deposit.userId);
        const newBalance = (userBalance.balance || 0) + deposit.amount;
        const deposited = (userBalance.deposited || 0) + deposit.amount;

        saveUserBalance(deposit.userId, {
            balance: newBalance,
            deposited: deposited,
            lastUpdated: new Date().toISOString()
        });

        // Save updated deposits
        deposits[depositIndex] = deposit;
        saveDeposits(deposits);

        // Send payment confirmation email asynchronously
        try {
            // Get user email from Firebase (requires auth service)
            const { auth } = require('../config/firebase');
            auth.getUser(deposit.userId).then(userRecord => {
                const userEmail = userRecord.email;
                const refId = depositId;
                const dateStr = new Date(deposit.approvedAt).toLocaleString();
                
                sendPaymentConfirmation(userEmail, deposit.amount, refId, dateStr).catch(emailError => {
                    console.error(`[Deposit] Failed to send payment confirmation email:`, emailError.message);
                });
            }).catch(authError => {
                console.error(`[Deposit] Failed to fetch user email for deposit ${depositId}:`, authError.message);
            });
        } catch (emailError) {
            console.error(`[Deposit] Error in email sending:`, emailError.message);
        }

        console.log(`[Deposit] ✓ Deposit approved:`, {
            id: depositId,
            userId: deposit.userId,
            amount: deposit.amount,
            newBalance: newBalance
        });
        console.log('[Deposit] ================== SUCCESS ==================');

        res.json({
            success: true,
            message: 'Deposit approved successfully',
            deposit: deposit,
            newBalance: newBalance
        });

    } catch (error) {
        console.error('[Deposit] ✗ EXCEPTION ERROR');
        console.error('[Deposit] Message:', error.message);
        console.error('[Deposit] ================== ERROR ==================');
        
        res.status(500).json({
            success: false,
            message: 'Error approving deposit',
            error: error.message
        });
    }
});

/**
 * Reject deposit request (admin only)
 * POST /api/deposit/reject
 */
router.post('/reject', (req, res) => {
    console.log('[Deposit] ================== REJECT REQUEST ==================');
    
    try {
        const { depositId, rejectionReason, adminEmail } = req.body;
        
        if (!depositId) {
            return res.status(400).json({
                success: false,
                message: 'depositId is required'
            });
        }

        const deposits = getAllDeposits();
        const depositIndex = deposits.findIndex(d => d.id === depositId);

        if (depositIndex === -1) {
            return res.status(404).json({
                success: false,
                message: 'Deposit request not found'
            });
        }

        const deposit = deposits[depositIndex];

        if (deposit.status !== 'pending') {
            return res.status(400).json({
                success: false,
                message: `Cannot reject deposit with status: ${deposit.status}`
            });
        }

        // Update deposit status
        deposit.status = 'rejected';
        deposit.approvedAt = new Date().toISOString();
        deposit.approvedBy = adminEmail || 'admin';
        deposit.rejectionReason = rejectionReason || 'No reason provided';

        // Save updated deposits
        deposits[depositIndex] = deposit;
        saveDeposits(deposits);

        console.log(`[Deposit] ✓ Deposit rejected:`, {
            id: depositId,
            userId: deposit.userId,
            reason: rejectionReason
        });
        console.log('[Deposit] ================== SUCCESS ==================');

        res.json({
            success: true,
            message: 'Deposit rejected successfully',
            deposit: deposit
        });

    } catch (error) {
        console.error('[Deposit] ✗ EXCEPTION ERROR');
        console.error('[Deposit] Message:', error.message);
        console.error('[Deposit] ================== ERROR ==================');
        
        res.status(500).json({
            success: false,
            message: 'Error rejecting deposit',
            error: error.message
        });
    }
});

/**
 * Get deposit screenshot
 * GET /api/deposit/screenshot/:filename
 */
router.get('/screenshot/:filename', (req, res) => {
    try {
        const { filename } = req.params;
        const filepath = path.join(__dirname, '../uploads/deposits/', filename);

        // Validate path to prevent directory traversal
        const normalizedPath = path.normalize(filepath);
        const uploadsDir = path.normalize(path.join(__dirname, '../uploads/deposits'));

        if (!normalizedPath.startsWith(uploadsDir)) {
            return res.status(403).json({
                success: false,
                message: 'Access denied'
            });
        }

        if (!fs.existsSync(filepath)) {
            return res.status(404).json({
                success: false,
                message: 'Screenshot not found'
            });
        }

        res.sendFile(filepath);

    } catch (error) {
        console.error('[Deposit] Error retrieving screenshot:', error);
        res.status(500).json({
            success: false,
            message: 'Error retrieving screenshot',
            error: error.message
        });
    }
});

/**
 * Initialize HUBTEL payment
 * POST /api/deposit/hubtel/initiate
 */
router.post('/hubtel/initiate', async (req, res) => {
    console.log('[Deposit] ================== HUBTEL INITIATE ==================');
    console.log('[Deposit] Method: POST /api/deposit/hubtel/initiate');
    
    try {
        const { userId, customerEmail, amount, returnUrl } = req.body;

        if (!userId || !customerEmail || !amount) {
            console.log('[Deposit] ✗ Missing required fields');
            return res.status(400).json({
                success: false,
                message: 'userId, customerEmail, and amount are required'
            });
        }

        const amountNum = parseFloat(amount);
        if (isNaN(amountNum) || amountNum <= 0) {
            return res.status(400).json({
                success: false,
                message: 'Amount must be a positive number'
            });
        }

        // Generate unique reference (max 32 chars for HUBTEL)
        const shortUserId = userId.substring(0, 8);
        const timestamp = Date.now().toString().slice(-7);
        const reference = `DEP_${shortUserId}_${timestamp}`;

        // Prepare payment data
        const baseUrl = process.env.BASE_URL || 'http://localhost:3000';
        
        // Use provided returnUrl with reference replaced, or default to deposit-success.html
        let finalReturnUrl;
        if (returnUrl) {
            finalReturnUrl = returnUrl.replace('{reference}', reference);
        } else {
            finalReturnUrl = `${baseUrl}/deposit-success.html?amount=${amountNum}&reference=${reference}`;
        }

        const paymentData = {
            amount: amountNum,
            description: `Deposit to Sikapa account - User: ${userId}`,
            customerName: customerEmail.split('@')[0] || 'Sikapa User',
            customerEmail: customerEmail,
            customerPhone: '233', // Placeholder, HUBTEL will collect actual phone
            reference: reference,
            returnUrl: finalReturnUrl,
            callbackUrl: `${baseUrl}/api/deposit/hubtel/callback`
        };

        // Initialize HUBTEL payment
        const result = await initializePayment(paymentData);

        if (!result.success) {
            console.error('[Deposit] ✗ HUBTEL payment initialization failed:', result.error);
            return res.status(400).json({
                success: false,
                message: 'Failed to initialize payment',
                error: result.error
            });
        }

        // Save deposit record as pending
        const depositRecord = {
            id: reference,
            userId: userId,
            customerEmail: customerEmail,
            amount: amountNum,
            method: 'HUBTEL',
            status: 'pending',
            transactionId: result.transactionId,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        // Append to deposits file
        const deposits = getAllDeposits();
        deposits.push(depositRecord);
        saveDeposits(deposits);

        console.log('[Deposit] ✓ HUBTEL payment initiated:', reference);

        res.json({
            success: true,
            paymentUrl: result.paymentUrl,
            reference: reference,
            transactionId: result.transactionId,
            message: 'Payment initialization successful'
        });

    } catch (error) {
        console.error('[Deposit] ✗ Error initiating HUBTEL payment:', error);
        res.status(500).json({
            success: false,
            message: 'Error initiating payment',
            error: error.message
        });
    }
});

/**
 * HUBTEL Payment Callback
 * POST /api/deposit/hubtel/callback
 */
router.post('/hubtel/callback', async (req, res) => {
    console.log('[Deposit] ================== HUBTEL CALLBACK ==================');
    console.log('[Deposit] Callback data:', req.body);

    try {
        // Parse HUBTEL callback format: { ResponseCode, Status, Data: { ClientReference, Amount, Status, ... } }
        const { ResponseCode, Status, Data } = req.body;

        if (!Data || !Data.ClientReference) {
            console.log('[Deposit] ✗ Invalid callback data - missing ClientReference');
            return res.status(400).json({
                success: false,
                message: 'Missing ClientReference in callback'
            });
        }

        const clientReference = Data.ClientReference;
        const amount = Data.Amount;
        const paymentStatus = Data.Status;

        // Check if payment was successful
        if (ResponseCode !== '0000' || paymentStatus !== 'Success') {
            console.log('[Deposit] ✗ Payment not successful, status:', paymentStatus);
            // Update deposit status
            updateDepositStatus(clientReference, 'failed', { 
                responseCode: ResponseCode,
                paymentStatus: paymentStatus,
                reason: Data.Description || 'Payment failed'
            });
            return res.status(200).json({
                success: false,
                message: 'Payment failed: ' + (Data.Description || 'Unknown reason')
            });
        }

        // Extract userId from reference (DEP_userId_timestamp)
        const parts = clientReference.split('_');
        const userId = parts[1];

        if (!userId) {
            console.log('[Deposit] ✗ Invalid reference format');
            return res.status(400).json({
                success: false,
                message: 'Invalid reference format'
            });
        }

        // Get current balance
        const currentBalance = getUserBalance(userId);

        // Update balance
        const newBalance = (currentBalance.balance || 0) + amount;
        const newDeposited = (currentBalance.deposited || 0) + amount;
        const newWithdrawable = (currentBalance.withdrawable || 0) + amount;

        saveUserBalance(userId, {
            userId,
            balance: newBalance,
            deposited: newDeposited,
            withdrawable: newWithdrawable,
            lastUpdated: new Date().toISOString()
        });

        // Update deposit status
        updateDepositStatus(clientReference, 'completed', {
            transactionId: Data.TransactionId,
            externalTransactionId: Data.ExternalTransactionId,
            amount: amount,
            paymentMethod: Data.PaymentDetails?.PaymentType || 'unknown',
            verifiedAt: new Date().toISOString()
        });

        console.log('[Deposit] ✓ Payment confirmed and balance updated:', {
            userId,
            amount,
            oldBalance: currentBalance.balance,
            newBalance,
            transactionId: Data.TransactionId
        });

        res.json({
            success: true,
            message: 'Payment confirmed and balance updated'
        });

    } catch (error) {
        console.error('[Deposit] ✗ Error processing callback:', error);
        res.status(500).json({
            success: false,
            message: 'Error processing callback',
            error: error.message
        });
    }
});

/**
 * Get payment status
 * GET /api/deposit/hubtel/status/:reference
 */
router.get('/hubtel/status/:reference', async (req, res) => {
    console.log('[Deposit] Checking HUBTEL payment status for:', req.params.reference);

    try {
        const { reference } = req.params;

        // Find deposit record
        const deposits = getAllDeposits();
        const deposit = deposits.find(d => d.id === reference);

        if (!deposit) {
            return res.status(404).json({
                success: false,
                message: 'Deposit record not found'
            });
        }

        // Verify payment if pending
        if (deposit.status === 'pending' && deposit.transactionId) {
            const verification = await verifyPayment(deposit.transactionId);
            
            if (verification.success && verification.status === 'completed') {
                // Update deposit status
                updateDepositStatus(reference, 'completed', {
                    verifiedAt: new Date().toISOString()
                });
                return res.json({
                    success: true,
                    status: 'completed',
                    amount: deposit.amount,
                    deposit: deposit
                });
            }
        }

        res.json({
            success: true,
            status: deposit.status,
            amount: deposit.amount,
            deposit: deposit
        });

    } catch (error) {
        console.error('[Deposit] Error checking payment status:', error);
        res.status(500).json({
            success: false,
            message: 'Error checking payment status',
            error: error.message
        });
    }
});

/**
 * Verify payment status
 * GET /api/deposit/verify
 */
router.get('/verify', async (req, res) => {
    console.log('[Deposit] ================== VERIFY PAYMENT ==================');
    
    try {
        const { reference, userId } = req.query;

        if (!reference || !userId) {
            return res.status(400).json({
                success: false,
                verified: false,
                message: 'reference and userId are required'
            });
        }

        // Find deposit record
        const deposits = getAllDeposits();
        const deposit = deposits.find(d => d.id === reference && d.userId === userId);

        if (!deposit) {
            return res.status(404).json({
                success: false,
                verified: false,
                message: 'Deposit record not found'
            });
        }

        // Check deposit status
        if (deposit.status === 'completed') {
            return res.json({
                success: true,
                verified: true,
                status: 'completed',
                amount: deposit.amount,
                message: 'Payment verified successfully'
            });
        }

        if (deposit.status === 'pending' && deposit.transactionId) {
            // Attempt to verify with HUBTEL
            console.log('[Deposit] Verifying with HUBTEL for:', reference);
            const verification = await verifyPayment(deposit.transactionId);
            
            if (verification.success && verification.status === 'completed') {
                // Update deposit status
                updateDepositStatus(reference, 'completed', {
                    verifiedAt: new Date().toISOString()
                });
                return res.json({
                    success: true,
                    verified: true,
                    status: 'completed',
                    amount: deposit.amount,
                    message: 'Payment verified successfully'
                });
            }
        }

        // Still pending
        return res.json({
            success: true,
            verified: false,
            status: deposit.status,
            amount: deposit.amount,
            message: 'Payment is still processing, please refresh shortly'
        });

    } catch (error) {
        console.error('[Deposit] Error verifying payment:', error);
        res.status(500).json({
            success: false,
            verified: false,
            message: 'Error verifying payment',
            error: error.message
        });
    }
});

/**
 * Helper: Update deposit status
 */
function updateDepositStatus(depositId, newStatus, additionalData = {}) {
    try {
        const deposits = getAllDeposits();
        const index = deposits.findIndex(d => d.id === depositId);
        
        if (index !== -1) {
            deposits[index] = {
                ...deposits[index],
                status: newStatus,
                updatedAt: new Date().toISOString(),
                ...additionalData
            };
            saveDeposits(deposits);
            console.log('[Deposit] Status updated:', { depositId, newStatus });
        }
    } catch (error) {
        console.error('[Deposit] Error updating deposit status:', error);
    }
}

/**
 * Check deposit endpoint status
 * GET /api/deposit/status
 */
router.get('/status', (req, res) => {
    res.json({
        success: true,
        status: 'Deposit endpoint is operational',
        endpoints: {
            'POST /api/deposit/submit': 'Submit a deposit request with screenshot',
            'POST /api/deposit/hubtel/initiate': 'Initiate HUBTEL payment',
            'POST /api/deposit/hubtel/callback': 'HUBTEL payment callback',
            'GET /api/deposit/verify': 'Verify payment status by reference and userId',
            'GET /api/deposit/hubtel/status/:reference': 'Check HUBTEL payment status',
            'GET /api/deposit/user/:userId': 'Get user deposits',
            'GET /api/deposit/pending': 'Get all pending deposits (admin)',
            'GET /api/deposit/all': 'Get all deposits (admin)',
            'POST /api/deposit/approve': 'Approve deposit (admin)',
            'POST /api/deposit/reject': 'Reject deposit (admin)',
            'GET /api/deposit/screenshot/:filename': 'Get deposit screenshot'
        }
    });
});

module.exports = router;
