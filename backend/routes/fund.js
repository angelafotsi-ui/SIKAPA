const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');

console.log('[Fund Routes] Module loaded - setting up fund endpoints');

// User balances file
const BALANCES_FILE = path.join(__dirname, '../logs/user_balances.json');

/**
 * Initialize balances file if it doesn't exist
 */
function ensureBalancesFile() {
    if (!fs.existsSync(BALANCES_FILE)) {
        fs.writeFileSync(BALANCES_FILE, JSON.stringify([], null, 2));
    }
}

/**
 * Get all user balances
 */
function getAllBalances() {
    ensureBalancesFile();
    const data = fs.readFileSync(BALANCES_FILE, 'utf-8');
    return JSON.parse(data || '[]');
}

/**
 * Save balances to file
 */
function saveBalances(balances) {
    fs.writeFileSync(BALANCES_FILE, JSON.stringify(balances, null, 2));
}

/**
 * Add or deduct funds from user account
 * POST /api/fund/update
 * Body: { userId, action: 'add' or 'deduct', amount, reason, adminEmail }
 */
router.post('/update', (req, res) => {
    console.log('[Fund] ==================== REQUEST ====================');
    console.log('[Fund] Method: POST /api/fund/update');
    console.log('[Fund] Body:', JSON.stringify(req.body, null, 2));
    console.log('[Fund] Headers Authorization:', req.headers.authorization ? 'Present' : 'Missing');
    
    try {
        const { userId, action, amount, reason, adminEmail } = req.body;

        // Validate inputs
        if (!userId || !action || amount === undefined || amount === null) {
            console.warn('[Fund] ✗ Validation failed');
            return res.status(400).json({
                success: false,
                message: 'userId, action (add/deduct), and amount are required'
            });
        }

        if (action !== 'add' && action !== 'deduct') {
            console.warn('[Fund] ✗ Invalid action:', action);
            return res.status(400).json({
                success: false,
                message: 'action must be "add" or "deduct"'
            });
        }

        const amountNum = parseFloat(amount);
        console.log('[Fund] Parsed amount:', amountNum, 'Type:', typeof amountNum);
        if (isNaN(amountNum) || amountNum <= 0) {
            console.warn('[Fund] ✗ Invalid amount:', amountNum);
            return res.status(400).json({
                success: false,
                message: 'Amount must be a positive number'
            });
        }

        const balances = getAllBalances();
        let userBalance = balances.find(b => b.userId === userId);

        // Create balance if it doesn't exist
        if (!userBalance) {
            userBalance = {
                userId: userId,
                balance: 0,
                currency: 'GHS',
                createdAt: new Date().toISOString(),
                transactions: []
            };
            balances.push(userBalance);
            console.log('[Fund] Created new balance record for user:', userId);
        }

        // Update balance based on action
        const previousBalance = userBalance.balance;
        
        if (action === 'add') {
            userBalance.balance += amountNum;
            console.log(`[Fund] Adding GH${amountNum} to user ${userId}`);
        } else if (action === 'deduct') {
            userBalance.balance = Math.max(0, userBalance.balance - amountNum);
            console.log(`[Fund] Deducting GH${amountNum} from user ${userId}`);
        }

        userBalance.lastUpdated = new Date().toISOString();

        // Initialize transactions array if it doesn't exist
        if (!userBalance.transactions) {
            userBalance.transactions = [];
        }

        // Record transaction
        userBalance.transactions.push({
            type: action,
            amount: amountNum,
            reason: reason || `${action} funds`,
            adminEmail: adminEmail || 'system',
            timestamp: new Date().toISOString(),
            previousBalance: previousBalance,
            newBalance: userBalance.balance
        });

        // Keep only last 100 transactions
        if (userBalance.transactions.length > 100) {
            userBalance.transactions = userBalance.transactions.slice(-100);
        }

        saveBalances(balances);

        console.log(`[Fund] ✓ Successfully ${action}ed GH${amountNum} ${action === 'add' ? 'to' : 'from'} user ${userId}`);
        console.log(`[Fund] Previous balance: GH${previousBalance} → New balance: GH${userBalance.balance}`);
        console.log('[Fund] ==================== SUCCESS ====================');

        res.json({
            success: true,
            message: `${action === 'add' ? 'Added' : 'Deducted'} GH${amountNum.toFixed(2)} ${action === 'add' ? 'to' : 'from'} user account`,
            userId: userId,
            action: action,
            amount: amountNum,
            previousBalance: previousBalance,
            newBalance: userBalance.balance,
            currency: 'GHS'
        });
    } catch (error) {
        console.error('[Fund] ✗ EXCEPTION ERROR');
        console.error('[Fund] Message:', error.message);
        console.error('[Fund] Stack:', error.stack);
        console.error('[Fund] ==================== ERROR ====================');
        res.status(500).json({
            success: false,
            message: 'Error updating balance',
            error: error.message
        });
    }
});

/**
 * Check fund endpoint status
 * GET /api/fund/status
 */
router.get('/status', (req, res) => {
    res.json({
        success: true,
        status: 'Fund endpoint is operational',
        endpoints: {
            'POST /api/fund/update': 'Add or deduct funds from user account',
            'GET /api/fund/status': 'Check if endpoint is working'
        }
    });
});

module.exports = router;
