const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');

// Cashout request endpoint
router.post('/request', (req, res) => {
    try {
        // Debug: Log all request properties
        console.log('[Cashout] req.body keys:', Object.keys(req.body || {}));
        console.log('[Cashout] req.files keys:', Object.keys(req.files || {}));
        
        // Parse fields from req.body for FormData with file uploads
        // express-fileupload parses fields from FormData automatically
        let tokenId = req.body?.tokenId;
        let secretCode = req.body?.secretCode;
        let walletId = req.body?.walletId;
        let amount = req.body?.amount;
        let userEmail = req.body?.userEmail;
        let userId = req.body?.userId;

        // Debug log
        console.log('[Cashout] Received body:', { tokenId, secretCode, walletId, amount, userEmail, userId });
        console.log('[Cashout] Full req.body:', req.body);
        console.log('[Cashout] secretCode value:', secretCode, 'type:', typeof secretCode, 'is truthy:', !!secretCode);

        // Validation
        if (!tokenId || !secretCode || !walletId || !amount || !userEmail) {
            return res.status(400).json({
                success: false,
                message: 'Missing required fields'
            });
        }

        // Validate secret code - must be exactly 4 digits
        if (!/^\d{4}$/.test(secretCode)) {
            return res.status(400).json({
                success: false,
                message: 'Secret Code must be exactly 4 digits'
            });
        }

        // Validate amount
        const validAmounts = ['100', '300', '500'];
        if (!validAmounts.includes(amount)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid amount selected'
            });
        }

        // Check if screenshot was uploaded
        if (!req.files || !req.files.screenshot) {
            return res.status(400).json({
                success: false,
                message: 'Screenshot is required'
            });
        }

        // Create uploads directory if it doesn't exist
        const uploadsDir = path.join(__dirname, '../uploads/cashout');
        if (!fs.existsSync(uploadsDir)) {
            fs.mkdirSync(uploadsDir, { recursive: true });
        }

        // Save screenshot
        const screenshotFile = req.files.screenshot;
        const timestamp = Date.now();
        const filename = `${userId}_${timestamp}_${screenshotFile.name}`;
        const uploadPath = path.join(uploadsDir, filename);

        screenshotFile.mv(uploadPath, (err) => {
            if (err) {
                return res.status(500).json({
                    success: false,
                    message: 'Failed to upload screenshot'
                });
            }

            // Log the cashout request
            const cashoutRecord = {
                userId,
                userEmail,
                tokenId,
                secretCode,
                walletId,
                amount,
                screenshotPath: `/uploads/cashout/${filename}`,
                status: 'pending',
                createdAt: new Date().toISOString()
            };

            console.log('[Cashout] New request:', {
                userId,
                userEmail,
                tokenId,
                secretCode,
                amount,
                walletId,
                timestamp: new Date().toISOString()
            });

            // Save to cashout log file
            const logsDir = path.join(__dirname, '../logs');
            if (!fs.existsSync(logsDir)) {
                fs.mkdirSync(logsDir, { recursive: true });
            }

            const logFile = path.join(logsDir, 'cashout_requests.json');
            let requests = [];
            
            if (fs.existsSync(logFile)) {
                try {
                    requests = JSON.parse(fs.readFileSync(logFile, 'utf8'));
                } catch (e) {
                    requests = [];
                }
            }

            requests.push(cashoutRecord);
            fs.writeFileSync(logFile, JSON.stringify(requests, null, 2));

            res.status(201).json({
                success: true,
                message: 'Cashout request submitted successfully',
                requestId: `${userId}_${timestamp}`
            });
        });

    } catch (error) {
        console.error('[Cashout] Error:', error);
        res.status(500).json({
            success: false,
            message: 'Error processing cashout request: ' + error.message
        });
    }
});

// Get cashout requests (admin endpoint)
router.get('/requests', (req, res) => {
    try {
        const logFile = path.join(__dirname, '../logs/cashout_requests.json');
        
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
        console.error('[Cashout] Error fetching requests:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching cashout requests'
        });
    }
});

// Delete cashout request endpoint
router.delete('/delete/:userId/:createdAt', (req, res) => {
    try {
        const { userId, createdAt } = req.params;
        const decodedCreatedAt = decodeURIComponent(createdAt);
        const logFile = path.join(__dirname, '../logs/cashout_requests.json');

        if (!fs.existsSync(logFile)) {
            return res.status(404).json({
                success: false,
                message: 'No cashout requests found'
            });
        }

        let requests = JSON.parse(fs.readFileSync(logFile, 'utf8'));
        const requestIndex = requests.findIndex(r => r.userId === userId && r.createdAt === decodedCreatedAt);

        if (requestIndex === -1) {
            return res.status(404).json({
                success: false,
                message: 'Cashout request not found'
            });
        }

        const requestToDelete = requests[requestIndex];

        // Delete the screenshot file if it exists
        if (requestToDelete.screenshotPath) {
            const screenshotPath = path.join(__dirname, '..', requestToDelete.screenshotPath);
            if (fs.existsSync(screenshotPath)) {
                try {
                    fs.unlinkSync(screenshotPath);
                    console.log('[Cashout] Deleted screenshot:', screenshotPath);
                } catch (err) {
                    console.error('[Cashout] Failed to delete screenshot:', err);
                }
            }
        }

        // Remove request from array
        requests.splice(requestIndex, 1);
        
        // Save updated requests back to file
        fs.writeFileSync(logFile, JSON.stringify(requests, null, 2));

        console.log('[Cashout] Request deleted:', {
            userId,
            userEmail: requestToDelete.userEmail,
            amount: requestToDelete.amount,
            createdAt: decodedCreatedAt
        });

        res.json({
            success: true,
            message: 'Cashout request deleted successfully'
        });
    } catch (error) {
        console.error('[Cashout] Error deleting request:', error);
        res.status(500).json({
            success: false,
            message: 'Error deleting cashout request: ' + error.message
        });
    }
});

module.exports = router;
