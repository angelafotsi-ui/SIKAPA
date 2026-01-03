const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const { auth, db } = require('../config/firebase');

// Get all users
router.get('/users', async (req, res) => {
    try {
        // Get all users from Firebase Auth
        const listUsersResult = await auth.listUsers(1000);
        
        const users = listUsersResult.users.map(user => ({
            uid: user.uid,
            email: user.email,
            displayName: user.displayName || '',
            disabled: user.disabled,
            createdAt: user.metadata.creationTime,
            lastSignInTime: user.metadata.lastSignInTime
        }));

        res.json({
            success: true,
            users
        });
    } catch (error) {
        console.error('[Admin] Error getting users:', error);
        res.status(500).json({
            success: false,
            message: 'Error retrieving users'
        });
    }
});

// Get all transactions (combine withdrawals and cashouts)
router.get('/transactions', (req, res) => {
    try {
        const logsDir = path.join(__dirname, '../logs');
        let allTransactions = [];

        // Read withdraw logs
        const withdrawLogFile = path.join(logsDir, 'withdraw_requests.json');
        if (fs.existsSync(withdrawLogFile)) {
            const withdrawData = JSON.parse(fs.readFileSync(withdrawLogFile, 'utf8'));
            allTransactions.push(...withdrawData.map(t => ({ ...t, type: 'withdraw' })));
        }

        // Read cashout logs
        const cashoutLogFile = path.join(logsDir, 'cashout_requests.json');
        if (fs.existsSync(cashoutLogFile)) {
            const cashoutData = JSON.parse(fs.readFileSync(cashoutLogFile, 'utf8'));
            allTransactions.push(...cashoutData.map(t => ({ ...t, type: 'cashout' })));
        }

        // Sort by date descending
        allTransactions.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

        res.json({
            success: true,
            transactions: allTransactions
        });
    } catch (error) {
        console.error('[Admin] Error getting transactions:', error);
        res.status(500).json({
            success: false,
            message: 'Error retrieving transactions'
        });
    }
});

// Get dashboard stats
router.get('/stats', (req, res) => {
    try {
        const logsDir = path.join(__dirname, '../logs');
        const stats = {
            totalWithdrawals: 0,
            pendingWithdrawals: 0,
            approvedWithdrawals: 0,
            totalCashouts: 0,
            pendingCashouts: 0,
            approvedCashouts: 0,
            totalUsers: 0
        };

        // Count withdrawals
        const withdrawLogFile = path.join(logsDir, 'withdraw_requests.json');
        if (fs.existsSync(withdrawLogFile)) {
            const withdrawData = JSON.parse(fs.readFileSync(withdrawLogFile, 'utf8'));
            stats.totalWithdrawals = withdrawData.length;
            stats.pendingWithdrawals = withdrawData.filter(w => w.status === 'pending').length;
            stats.approvedWithdrawals = withdrawData.filter(w => w.status === 'approved').length;
        }

        // Count cashouts
        const cashoutLogFile = path.join(logsDir, 'cashout_requests.json');
        if (fs.existsSync(cashoutLogFile)) {
            const cashoutData = JSON.parse(fs.readFileSync(cashoutLogFile, 'utf8'));
            stats.totalCashouts = cashoutData.length;
            stats.pendingCashouts = cashoutData.filter(c => c.status === 'pending').length;
            stats.approvedCashouts = cashoutData.filter(c => c.status === 'approved').length;
        }

        res.json({
            success: true,
            stats
        });
    } catch (error) {
        console.error('[Admin] Error getting stats:', error);
        res.status(500).json({
            success: false,
            message: 'Error retrieving stats'
        });
    }
});

// Update withdrawal status
router.put('/withdraw/:userId/status', (req, res) => {
    try {
        const { userId } = req.params;
        const { status } = req.body;

        const validStatuses = ['pending', 'approved', 'rejected', 'completed'];
        if (!validStatuses.includes(status)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid status'
            });
        }

        const logsDir = path.join(__dirname, '../logs');
        const logFile = path.join(logsDir, 'withdraw_requests.json');

        if (!fs.existsSync(logFile)) {
            return res.status(404).json({
                success: false,
                message: 'No withdrawal requests found'
            });
        }

        let requests = JSON.parse(fs.readFileSync(logFile, 'utf8'));
        const request = requests.find(r => r.userId === userId);

        if (!request) {
            return res.status(404).json({
                success: false,
                message: 'Withdrawal request not found'
            });
        }

        request.status = status;
        request.updatedAt = new Date().toISOString();

        fs.writeFileSync(logFile, JSON.stringify(requests, null, 2));

        res.json({
            success: true,
            message: `Withdrawal status updated to ${status}`
        });
    } catch (error) {
        console.error('[Admin] Error updating withdrawal status:', error);
        res.status(500).json({
            success: false,
            message: 'Error updating status'
        });
    }
});

// Update cashout status
router.put('/cashout/:userId/status', (req, res) => {
    try {
        const { userId } = req.params;
        const { status } = req.body;

        const validStatuses = ['pending', 'approved', 'rejected', 'completed'];
        if (!validStatuses.includes(status)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid status'
            });
        }

        const logsDir = path.join(__dirname, '../logs');
        const logFile = path.join(logsDir, 'cashout_requests.json');

        if (!fs.existsSync(logFile)) {
            return res.status(404).json({
                success: false,
                message: 'No cashout requests found'
            });
        }

        let requests = JSON.parse(fs.readFileSync(logFile, 'utf8'));
        const request = requests.find(r => r.userId === userId);

        if (!request) {
            return res.status(404).json({
                success: false,
                message: 'Cashout request not found'
            });
        }

        request.status = status;
        request.updatedAt = new Date().toISOString();

        fs.writeFileSync(logFile, JSON.stringify(requests, null, 2));

        res.json({
            success: true,
            message: `Cashout status updated to ${status}`
        });
    } catch (error) {
        console.error('[Admin] Error updating cashout status:', error);
        res.status(500).json({
            success: false,
            message: 'Error updating status'
        });
    }
});

module.exports = router;
