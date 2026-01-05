const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');

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
 * Get user balance
 */
router.get('/user/:userId', (req, res) => {
    try {
        const { userId } = req.params;
        const balances = getAllBalances();
        const userBalance = balances.find(b => b.userId === userId);

        if (!userBalance) {
            return res.json({
                success: true,
                balance: 0,
                userId: userId,
                currency: 'GHS'
            });
        }

        res.json({
            success: true,
            balance: userBalance.balance,
            userId: userId,
            currency: 'GHS',
            lastUpdated: userBalance.lastUpdated
        });
    } catch (error) {
        console.error('[Balance] Error getting user balance:', error);
        res.status(500).json({
            success: false,
            message: 'Error retrieving balance'
        });
    }
});

/**
 * Create initial balance for new user (GH 10 bonus)
 */
router.post('/init/:userId', (req, res) => {
    try {
        const { userId } = req.params;
        const balances = getAllBalances();

        // Check if user already has a balance
        const existingBalance = balances.find(b => b.userId === userId);
        if (existingBalance) {
            return res.json({
                success: true,
                message: 'User balance already initialized',
                balance: existingBalance.balance
            });
        }

        // Create new balance with GH 10 bonus
        const newBalance = {
            userId: userId,
            balance: 10.00,
            currency: 'GHS',
            createdAt: new Date().toISOString(),
            lastUpdated: new Date().toISOString(),
            bonus: 10.00,
            bonusGivenAt: new Date().toISOString()
        };

        balances.push(newBalance);
        saveBalances(balances);

        console.log(`[Balance] Created initial balance for user ${userId} with GH 10 bonus`);

        res.json({
            success: true,
            message: 'Initial balance created with GH 10 bonus',
            balance: newBalance.balance,
            userId: userId
        });
    } catch (error) {
        console.error('[Balance] Error initializing balance:', error);
        res.status(500).json({
            success: false,
            message: 'Error initializing balance'
        });
    }
});

/**
 * Ensure user balance is initialized (called on first login)
 * If balance doesn't exist, creates it with GH 10 bonus
 */
router.post('/ensure-initialized/:userId', (req, res) => {
    try {
        const { userId } = req.params;
        console.log(`[Balance] ensure-initialized called for userId: ${userId}`);
        const balances = getAllBalances();

        // Check if user already has a balance
        const existingBalance = balances.find(b => b.userId === userId);
        if (existingBalance) {
            // User already has a balance, just return it
            console.log(`[Balance] User ${userId} balance already exists with amount: GH ${existingBalance.balance}`);
            res.set('Content-Type', 'application/json');
            return res.json({
                success: true,
                message: 'User balance already initialized',
                balance: existingBalance.balance,
                isNew: false
            });
        }

        // Create new balance with GH 10 bonus for first-time login
        const newBalance = {
            userId: userId,
            balance: 10.00,
            currency: 'GHS',
            createdAt: new Date().toISOString(),
            lastUpdated: new Date().toISOString(),
            bonus: 10.00,
            bonusGivenAt: new Date().toISOString()
        };

        balances.push(newBalance);
        saveBalances(balances);

        console.log(`[Balance] Ensured initial balance for user ${userId} with GH 10 bonus on first login`);

        res.set('Content-Type', 'application/json');
        res.json({
            success: true,
            message: 'User balance ensured with GH 10 welcome bonus',
            balance: newBalance.balance,
            userId: userId,
            isNew: true
        });
    } catch (error) {
        console.error('[Balance] Error ensuring balance initialization:', error);
        res.set('Content-Type', 'application/json');
        res.status(500).json({
            success: false,
            message: 'Error ensuring balance initialization',
            error: error.message
        });
    }
});

/**
 * Add funds to user account (admin only)
 */
router.post('/add', (req, res) => {
    console.log('[Balance Add] ==================== REQUEST ====================');
    console.log('[Balance Add] Method: POST /api/balance/add');
    console.log('[Balance Add] Body:', JSON.stringify(req.body, null, 2));
    console.log('[Balance Add] Headers Authorization:', req.headers.authorization ? 'Present' : 'Missing');
    
    try {
        const { userId, amount, reason, adminEmail } = req.body;

        // Validate inputs
        if (!userId || amount === undefined || amount === null) {
            console.warn('[Balance Add] ✗ Validation failed - missing userId or amount');
            return res.status(400).json({
                success: false,
                message: 'userId and amount are required'
            });
        }

        const amountNum = parseFloat(amount);
        console.log('[Balance Add] Parsed amount:', amountNum, 'Type:', typeof amountNum);
        if (isNaN(amountNum) || amountNum <= 0) {
            console.warn('[Balance Add] ✗ Invalid amount:', amountNum);
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
        }

        // Add funds
        const previousBalance = userBalance.balance;
        userBalance.balance += amountNum;
        userBalance.lastUpdated = new Date().toISOString();

        // Initialize transactions array if it doesn't exist
        if (!userBalance.transactions) {
            userBalance.transactions = [];
        }

        // Record transaction
        userBalance.transactions.push({
            type: 'add',
            amount: amountNum,
            reason: reason || 'Admin credit',
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

        console.log(`[Balance Add] ✓ Successfully added GH${amountNum} to user ${userId}`);
        console.log(`[Balance Add] Previous balance: GH${previousBalance} → New balance: GH${userBalance.balance}`);
        console.log('[Balance Add] File saved to:', BALANCES_FILE);
        console.log('[Balance Add] ==================== SUCCESS ====================');

        res.json({
            success: true,
            message: `Added GH${amountNum.toFixed(2)} to user account`,
            userId: userId,
            amount: amountNum,
            previousBalance: previousBalance,
            newBalance: userBalance.balance
        });
    } catch (error) {
        console.error('[Balance Add] ✗ EXCEPTION ERROR');
        console.error('[Balance Add] Message:', error.message);
        console.error('[Balance Add] Stack:', error.stack);
        console.error('[Balance Add] ==================== ERROR ====================');
        res.status(500).json({
            success: false,
            message: 'Error adding funds',
            error: error.message,
            debug: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }
});

/**
 * Deduct funds from user account (admin only)
 */
router.post('/deduct', (req, res) => {
    console.log('[Balance Deduct] ==================== REQUEST ====================');
    console.log('[Balance Deduct] Method: POST /api/balance/deduct');
    console.log('[Balance Deduct] Body:', JSON.stringify(req.body, null, 2));
    console.log('[Balance Deduct] Headers Authorization:', req.headers.authorization ? 'Present' : 'Missing');
    
    try {
        const { userId, amount, reason, adminEmail } = req.body;

        // Validate inputs
        if (!userId || amount === undefined || amount === null) {
            console.warn('[Balance Deduct] ✗ Validation failed - missing userId or amount');
            return res.status(400).json({
                success: false,
                message: 'userId and amount are required'
            });
        }

        const amountNum = parseFloat(amount);
        console.log('[Balance Deduct] Parsed amount:', amountNum, 'Type:', typeof amountNum);
        if (isNaN(amountNum) || amountNum <= 0) {
            console.warn('[Balance Deduct] ✗ Invalid amount:', amountNum);
            return res.status(400).json({
                success: false,
                message: 'Amount must be a positive number'
            });
        }

        const balances = getAllBalances();
        const userBalance = balances.find(b => b.userId === userId);

        if (!userBalance) {
            console.warn('[Balance Deduct] ✗ User not found:', userId);
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        console.log('[Balance Deduct] User found. Current balance: GH' + userBalance.balance);

        // Check if user has sufficient balance
        if (userBalance.balance < amountNum) {
            console.warn(`[Balance Deduct] ✗ Insufficient balance. Current: GH${userBalance.balance}, Required: GH${amountNum}`);
            return res.status(400).json({
                success: false,
                message: `Insufficient balance. Current: GH${userBalance.balance.toFixed(2)}, Required: GH${amountNum.toFixed(2)}`
            });
        }

        // Deduct funds
        const previousBalance = userBalance.balance;
        userBalance.balance -= amountNum;
        userBalance.lastUpdated = new Date().toISOString();

        // Initialize transactions array if it doesn't exist
        if (!userBalance.transactions) {
            userBalance.transactions = [];
        }

        // Record transaction
        userBalance.transactions.push({
            type: 'deduct',
            amount: amountNum,
            reason: reason || 'Admin debit',
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

        console.log(`[Balance Deduct] ✓ Successfully deducted GH${amountNum} from user ${userId}`);
        console.log(`[Balance Deduct] Previous balance: GH${previousBalance} → New balance: GH${userBalance.balance}`);
        console.log('[Balance Deduct] File saved to:', BALANCES_FILE);
        console.log('[Balance Deduct] ==================== SUCCESS ====================');

        res.json({
            success: true,
            message: `Deducted GH${amountNum.toFixed(2)} from user account`,
            userId: userId,
            amount: amountNum,
            previousBalance: previousBalance,
            newBalance: userBalance.balance
        });
    } catch (error) {
        console.error('[Balance Deduct] ✗ EXCEPTION ERROR');
        console.error('[Balance Deduct] Message:', error.message);
        console.error('[Balance Deduct] Stack:', error.stack);
        console.error('[Balance Deduct] ==================== ERROR ====================');
        res.status(500).json({
            success: false,
            message: 'Error deducting funds',
            error: error.message
        });
    }
});

/**
 * Get all user balances (admin only)
 */
router.get('/all', (req, res) => {
    try {
        const balances = getAllBalances();
        
        // Return without transaction history for performance
        const simplifiedBalances = balances.map(b => ({
            userId: b.userId,
            balance: b.balance,
            currency: b.currency,
            lastUpdated: b.lastUpdated,
            createdAt: b.createdAt
        }));

        res.json({
            success: true,
            balances: simplifiedBalances,
            totalUsers: simplifiedBalances.length,
            totalBalance: simplifiedBalances.reduce((sum, b) => sum + b.balance, 0)
        });
    } catch (error) {
        console.error('[Balance] Error getting all balances:', error);
        res.status(500).json({
            success: false,
            message: 'Error retrieving balances'
        });
    }
});

/**
 * Get user balance history (admin only)
 */
router.get('/history/:userId', (req, res) => {
    try {
        const { userId } = req.params;
        const balances = getAllBalances();
        const userBalance = balances.find(b => b.userId === userId);

        if (!userBalance) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        res.json({
            success: true,
            userId: userId,
            currentBalance: userBalance.balance,
            createdAt: userBalance.createdAt,
            transactions: userBalance.transactions || []
        });
    } catch (error) {
        console.error('[Balance] Error getting balance history:', error);
        res.status(500).json({
            success: false,
            message: 'Error retrieving balance history'
        });
    }
});

module.exports = router;
