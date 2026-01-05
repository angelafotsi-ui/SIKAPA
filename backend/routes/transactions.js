const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');

// Get user's last 5 transactions (combining cashout and withdraw requests)
router.get('/user/:userId', (req, res) => {
    try {
        const { userId } = req.params;

        if (!userId) {
            return res.status(400).json({
                success: false,
                message: 'User ID is required'
            });
        }

        const cashoutPath = path.join(__dirname, '../logs/cashout_requests.json');
        const withdrawPath = path.join(__dirname, '../logs/withdraw_requests.json');

        let allTransactions = [];

        // Read cashout requests
        if (fs.existsSync(cashoutPath)) {
            const cashoutData = fs.readFileSync(cashoutPath, 'utf-8');
            const cashouts = JSON.parse(cashoutData || '[]');
            
            allTransactions.push(...cashouts
                .filter(c => c.userId === userId)
                .map(c => ({
                    id: `cashout_${c.createdAt}`,
                    type: 'cashout',
                    amount: parseFloat(c.amount),
                    status: c.status || 'pending',
                    createdAt: c.createdAt,
                    details: {
                        walletId: c.walletId,
                        tokenId: c.tokenId
                    }
                }))
            );
        }

        // Read withdraw requests
        if (fs.existsSync(withdrawPath)) {
            const withdrawData = fs.readFileSync(withdrawPath, 'utf-8');
            const withdrawals = JSON.parse(withdrawData || '[]');
            
            allTransactions.push(...withdrawals
                .filter(w => w.userId === userId)
                .map(w => ({
                    id: `withdraw_${w.createdAt}`,
                    type: 'withdraw',
                    amount: parseFloat(w.amount),
                    status: w.status || 'pending',
                    createdAt: w.createdAt,
                    details: {
                        walletId: w.walletId,
                        walletNetwork: w.walletNetwork,
                        walletIdName: w.walletIdName
                    }
                }))
            );
        }

        // Sort by creation date (newest first) and get last 5
        const recentTransactions = allTransactions
            .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
            .slice(0, 5);

        res.json({
            success: true,
            transactions: recentTransactions
        });

    } catch (error) {
        console.error('[Transactions] Error fetching user transactions:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching transactions',
            error: error.message
        });
    }
});

// Update transaction status
router.post('/update-status', (req, res) => {
    try {
        const { type, userId, createdAt, status } = req.body;

        if (!type || !userId || !createdAt || !status) {
            return res.status(400).json({
                success: false,
                message: 'Missing required fields: type, userId, createdAt, status'
            });
        }

        // Validate status
        const validStatuses = ['pending', 'approved', 'rejected', 'success', 'failed'];
        if (!validStatuses.includes(status)) {
            return res.status(400).json({
                success: false,
                message: `Invalid status. Must be one of: ${validStatuses.join(', ')}`
            });
        }

        const filePath = type === 'withdraw' 
            ? path.join(__dirname, '../logs/withdraw_requests.json')
            : path.join(__dirname, '../logs/cashout_requests.json');

        if (!fs.existsSync(filePath)) {
            return res.status(404).json({
                success: false,
                message: `No ${type} requests found`
            });
        }

        const fileData = fs.readFileSync(filePath, 'utf-8');
        const transactions = JSON.parse(fileData || '[]');

        // Find and update the transaction
        let found = false;
        const updatedTransactions = transactions.map(transaction => {
            if (transaction.userId === userId && transaction.createdAt === createdAt) {
                transaction.status = status;
                transaction.updatedAt = new Date().toISOString();
                found = true;
            }
            return transaction;
        });

        if (!found) {
            return res.status(404).json({
                success: false,
                message: 'Transaction not found'
            });
        }

        // Write updated transactions back to file
        fs.writeFileSync(filePath, JSON.stringify(updatedTransactions, null, 2));

        console.log(`[Transactions] Updated ${type} transaction status for user ${userId} to ${status}`);

        res.json({
            success: true,
            message: `Transaction status updated to ${status}`,
            transaction: updatedTransactions.find(t => t.userId === userId && t.createdAt === createdAt)
        });

    } catch (error) {
        console.error('[Transactions] Error updating status:', error);
        res.status(500).json({
            success: false,
            message: 'Error updating transaction status',
            error: error.message
        });
    }
});

module.exports = router;
