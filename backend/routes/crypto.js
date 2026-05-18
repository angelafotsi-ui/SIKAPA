const express = require('express');
const router = express.Router();
const fetch = require('node-fetch');

/**
 * GET /api/crypto/prices
 * Fetch crypto prices from CoinGecko (backend proxy to avoid CORS issues)
 */
router.get('/prices', async (req, res) => {
    try {
        const ids = req.query.ids || 'bitcoin,tether,solana';
        
        const response = await fetch(
            `https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=usd&include_market_cap=true&include_24hr_vol=true&include_24hr_change=true`,
            {
                timeout: 10000,
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                }
            }
        );

        if (!response.ok) {
            console.log('[Crypto] CoinGecko API error:', response.status);
            return res.status(502).json({
                success: false,
                message: 'Failed to fetch crypto data from CoinGecko'
            });
        }

        const data = await response.json();
        res.json({
            success: true,
            data: data,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('[Crypto] Error fetching prices:', error.message);
        res.status(502).json({
            success: false,
            message: 'Failed to fetch crypto prices',
            error: error.message
        });
    }
});

/**
 * GET /api/crypto/chart/:coinId
 * Fetch historical chart data for a coin
 */
router.get('/chart/:coinId', async (req, res) => {
    try {
        const { coinId } = req.params;
        const days = req.query.days || '7';
        
        const response = await fetch(
            `https://api.coingecko.com/api/v3/coins/${coinId}/market_chart?vs_currency=usd&days=${days}&interval=daily`,
            {
                timeout: 10000,
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                }
            }
        );

        if (!response.ok) {
            return res.status(502).json({
                success: false,
                message: 'Failed to fetch chart data'
            });
        }

        const data = await response.json();
        res.json({
            success: true,
            prices: data.prices || [],
            volumes: data.volumes || [],
            market_caps: data.market_caps || []
        });

    } catch (error) {
        console.error('[Crypto] Error fetching chart data:', error.message);
        res.status(502).json({
            success: false,
            message: 'Failed to fetch chart data',
            error: error.message
        });
    }
});

module.exports = router;
