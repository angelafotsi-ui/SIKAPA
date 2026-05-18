const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const admin = require('firebase-admin');

// Ensure logs directory exists
const logsDir = path.join(__dirname, '../logs');
if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true });
}

const tradesLogFile = path.join(logsDir, 'trades.json');

/**
 * Get user's active and completed trades
 * GET /api/trades/user/:userId
 */
router.get('/user/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        
        if (!fs.existsSync(tradesLogFile)) {
            return res.json({ trades: [], activeTrades: [], completedTrades: [] });
        }

        const tradesData = JSON.parse(fs.readFileSync(tradesLogFile, 'utf8'));
        const userTrades = tradesData.filter(t => t.userId === userId);
        
        const now = new Date().getTime();
        const activeTrades = userTrades.filter(t => t.completionTime > now && t.status === 'pending');
        const completedTrades = userTrades.filter(t => t.completionTime <= now || t.status === 'completed');

        res.json({
            trades: userTrades,
            activeTrades,
            completedTrades
        });
    } catch (error) {
        console.error('[Trades] Error fetching user trades:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch trades' });
    }
});

/**
 * Initiate a new trade
 * POST /api/trades/initiate
 */
router.post('/initiate', async (req, res) => {
    try {
        const {
            userId,
            marketId,
            marketType,
            marketName,
            tradeAmount,
            cashoutAmount,
            period
        } = req.body;

        // Validate required fields
        if (!userId || !marketId || !marketType || !tradeAmount || !cashoutAmount) {
            return res.status(400).json({
                success: false,
                message: 'Missing required trade fields'
            });
        }

        // Parse period to get duration in milliseconds
        let durationMs = 86400000; // Default 24 hours
        if (period === '7Days') {
            durationMs = 604800000;
        } else if (period === '3Days') {
            durationMs = 259200000;
        }

        const now = new Date().getTime();
        const completionTime = now + durationMs;
        const tradeId = `trade_${userId}_${Date.now()}`;

        // Create trade object
        const newTrade = {
            id: tradeId,
            userId,
            marketId,
            marketType,
            marketName,
            tradeAmount: parseFloat(tradeAmount),
            cashoutAmount: parseFloat(cashoutAmount),
            returnAmount: parseFloat(cashoutAmount) - parseFloat(tradeAmount),
            period,
            durationMs,
            createdAt: now,
            completionTime,
            status: 'pending',
            credited: false
        };

        // Load existing trades
        let tradesData = [];
        if (fs.existsSync(tradesLogFile)) {
            tradesData = JSON.parse(fs.readFileSync(tradesLogFile, 'utf8'));
        }

        // Add new trade
        tradesData.push(newTrade);

        // Save trades
        fs.writeFileSync(tradesLogFile, JSON.stringify(tradesData, null, 2));

        console.log('[Trades] New trade initiated:', {
            tradeId,
            userId,
            amount: tradeAmount,
            completesAt: new Date(completionTime).toISOString()
        });

        res.json({
            success: true,
            trade: newTrade,
            message: 'Trade initiated successfully'
        });

    } catch (error) {
        console.error('[Trades] Error initiating trade:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to initiate trade'
        });
    }
});

/**
 * Check and credit completed trades
 * POST /api/trades/check-and-credit/:userId
 */
router.post('/check-and-credit/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        let totalCredited = 0;
        const creditedTrades = [];

        if (!fs.existsSync(tradesLogFile)) {
            return res.json({
                success: true,
                totalCredited: 0,
                creditedTrades: [],
                message: 'No trades to credit'
            });
        }

        // Load trades
        const tradesData = JSON.parse(fs.readFileSync(tradesLogFile, 'utf8'));
        const now = new Date().getTime();

        // Find user's pending but completed trades
        const userTrades = tradesData.filter(t => t.userId === userId);
        const completedNotCredited = userTrades.filter(t => 
            t.completionTime <= now && 
            t.status === 'pending' && 
            !t.credited
        );

        if (completedNotCredited.length === 0) {
            return res.json({
                success: true,
                totalCredited: 0,
                creditedTrades: [],
                message: 'No completed trades to credit'
            });
        }

        // Calculate total to credit
        completedNotCredited.forEach(trade => {
            totalCredited += trade.cashoutAmount;
            creditedTrades.push(trade.id);
        });

        // Update trade status as credited
        const updatedTrades = tradesData.map(trade => {
            if (completedNotCredited.some(ct => ct.id === trade.id)) {
                return { ...trade, status: 'completed', credited: true };
            }
            return trade;
        });

        fs.writeFileSync(tradesLogFile, JSON.stringify(updatedTrades, null, 2));

        // Update user balance in Firebase
        try {
            const userRef = admin.database().ref(`users/${userId}`);
            const snapshot = await userRef.once('value');
            const userData = snapshot.val() || {};
            
            const currentBalance = parseFloat(userData.totalBalance || 0);
            const newBalance = currentBalance + totalCredited;

            await userRef.update({
                totalBalance: newBalance,
                lastTradeCredit: new Date().toISOString()
            });

            console.log('[Trades] Credited user trades:', {
                userId,
                amount: totalCredited,
                newBalance,
                tradesCount: completedNotCredited.length
            });
        } catch (dbError) {
            console.error('[Trades] Error updating Firebase balance:', dbError);
        }

        res.json({
            success: true,
            totalCredited,
            creditedTrades,
            message: `Credited ${completedNotCredited.length} trade(s)`
        });

    } catch (error) {
        console.error('[Trades] Error crediting trades:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to credit trades'
        });
    }
});

/**
 * Get trade statistics
 * GET /api/trades/stats/:userId
 */
router.get('/stats/:userId', async (req, res) => {
    try {
        const { userId } = req.params;

        if (!fs.existsSync(tradesLogFile)) {
            return res.json({
                activeTrades: 0,
                completedTrades: 0,
                totalTraded: 0,
                totalReturns: 0
            });
        }

        const tradesData = JSON.parse(fs.readFileSync(tradesLogFile, 'utf8'));
        const userTrades = tradesData.filter(t => t.userId === userId);
        const now = new Date().getTime();

        const activeTrades = userTrades.filter(t => t.completionTime > now && t.status === 'pending').length;
        const completedTrades = userTrades.filter(t => t.status === 'completed').length;
        const totalTraded = userTrades.reduce((sum, t) => sum + t.tradeAmount, 0);
        const totalReturns = userTrades.reduce((sum, t) => sum + t.returnAmount, 0);

        res.json({
            activeTrades,
            completedTrades,
            totalTraded,
            totalReturns,
            totalTrades: userTrades.length
        });

    } catch (error) {
        console.error('[Trades] Error fetching stats:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch trade statistics' });
    }
});

module.exports = router;
