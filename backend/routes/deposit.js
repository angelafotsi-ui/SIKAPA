const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const { sendPaymentConfirmation } = require('../services/emailService');

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
 * Check deposit endpoint status
 * GET /api/deposit/status
 */
router.get('/status', (req, res) => {
    res.json({
        success: true,
        status: 'Deposit endpoint is operational',
        endpoints: {
            'POST /api/deposit/submit': 'Submit a deposit request with screenshot',
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
