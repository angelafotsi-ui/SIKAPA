const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');

// Withdraw request endpoint
router.post('/request', (req, res) => {
    try {
        const { walletId, walletIdName, walletNetwork, amount, userEmail, userId } = req.body;

        // Validation
        if (!walletId || !walletIdName || !walletNetwork || !amount || !userEmail) {
            return res.status(400).json({
                success: false,
                message: 'Missing required fields'
            });
        }

        // Validate amount
        const amountNum = parseFloat(amount);
        if (isNaN(amountNum) || amountNum <= 0) {
            return res.status(400).json({
                success: false,
                message: 'Amount must be a valid positive number'
            });
        }

        // Valid networks
        const validNetworks = ['mtn', 'vodafone', 'airtel', 'bank', 'other'];
        if (!validNetworks.includes(walletNetwork)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid wallet network'
            });
        }

        // Log the withdrawal request
        const withdrawRecord = {
            userId,
            userEmail,
            walletId,
            walletIdName,
            walletNetwork,
            amount: amountNum,
            status: 'pending',
            createdAt: new Date().toISOString()
        };

        console.log('[Withdraw] New request:', {
            userId,
            userEmail,
            amount: amountNum,
            walletNetwork,
            timestamp: new Date().toISOString()
        });

        // Save to withdraw log file
        const logsDir = path.join(__dirname, '../logs');
        if (!fs.existsSync(logsDir)) {
            fs.mkdirSync(logsDir, { recursive: true });
        }

        const logFile = path.join(logsDir, 'withdraw_requests.json');
        let requests = [];
        
        if (fs.existsSync(logFile)) {
            try {
                requests = JSON.parse(fs.readFileSync(logFile, 'utf8'));
            } catch (e) {
                requests = [];
            }
        }

        requests.push(withdrawRecord);
        fs.writeFileSync(logFile, JSON.stringify(requests, null, 2));

        res.status(201).json({
            success: true,
            message: 'Withdraw request submitted successfully',
            requestId: `${userId}_${Date.now()}`
        });
    } catch (error) {
        console.error('[Withdraw] Error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error processing withdrawal request'
        });
    }
});

// Get all withdrawal requests (admin endpoint)
router.get('/requests', (req, res) => {
    try {
        const logFile = path.join(__dirname, '../logs/withdraw_requests.json');
        
        if (!fs.existsSync(logFile)) {
            return res.json({
                success: true,
                requests: []
            });
        }

        const requests = JSON.parse(fs.readFileSync(logFile, 'utf8'));
        res.json({
            success: true,
            requests
        });
    } catch (error) {
        console.error('[Withdraw] Error reading requests:', error);
        res.status(500).json({
            success: false,
            message: 'Error retrieving withdrawal requests'
        });
    }
});

module.exports = router;
