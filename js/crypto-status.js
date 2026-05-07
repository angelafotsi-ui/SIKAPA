/* Crypto Status & Live Charts */

// Crypto data configuration
const CRYPTO_COINS = [
    {
        id: 'btc',
        name: 'Bitcoin',
        symbol: 'BTC',
        coingeckoId: 'bitcoin',
        icon: '₿',
        gradient: 'linear-gradient(135deg, #F7931A 0%, #F7931A 100%)',
        color: '#F7931A'
    },
    {
        id: 'usdt',
        name: 'USDT',
        symbol: 'USDT',
        coingeckoId: 'tether',
        icon: '₮',
        gradient: 'linear-gradient(135deg, #26A17B 0%, #26A17B 100%)',
        color: '#26A17B'
    },
    {
        id: 'sol',
        name: 'Solana',
        symbol: 'SOL',
        coingeckoId: 'solana',
        icon: 'λ',
        gradient: 'linear-gradient(135deg, #14F195 0%, #14F195 100%)',
        color: '#14F195'
    }
];

// Load crypto status data
async function loadCryptoStatus() {
    const container = document.getElementById('cryptoStatusCards');
    
    if (!container) {
        console.log('Crypto status container not found');
        return;
    }

    try {
        // Show loading state
        container.innerHTML = '<div style="padding: 20px; text-align: center; color: #999;">Loading crypto market data...</div>';
        
        // Fetch crypto prices from CoinGecko API
        const prices = await fetchCryptoData();
        
        if (!prices || prices.length === 0) {
            container.innerHTML = '<div style="padding: 20px; text-align: center; color: #999;">Unable to fetch crypto data</div>';
            return;
        }

        // Display crypto status cards
        displayCryptoStatusCards(prices);
    } catch (error) {
        console.error('Error loading crypto status:', error);
        container.innerHTML = '<div style="padding: 20px; text-align: center; color: #ef4444;">Failed to load crypto data. Please refresh.</div>';
    }
}

// Fetch crypto prices from CoinGecko API
async function fetchCryptoData() {
    try {
        const ids = CRYPTO_COINS.map(coin => coin.coingeckoId).join(',');
        const response = await fetch(
            `https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=usd&include_market_cap=true&include_24hr_vol=true&include_24hr_change=true&include_last_updated_at=true`
        );
        
        if (!response.ok) {
            throw new Error('Failed to fetch crypto data');
        }

        const data = await response.json();
        
        // Transform data to match our coin structure
        return CRYPTO_COINS.map(coin => ({
            ...coin,
            price: data[coin.coingeckoId]?.usd || 0,
            change24h: data[coin.coingeckoId]?.usd_24h_change || 0,
            marketCap: data[coin.coingeckoId]?.usd_market_cap || 0,
            volume24h: data[coin.coingeckoId]?.usd_24h_vol || 0,
            timestamp: new Date().getTime()
        }));
    } catch (error) {
        console.error('Error fetching crypto data:', error);
        return [];
    }
}

// Display crypto status cards with inline charts
function displayCryptoStatusCards(prices) {
    const container = document.getElementById('cryptoStatusCards');
    
    if (!container) return;

    container.innerHTML = prices.map(coin => {
        const isPriceUp = coin.change24h >= 0;
        const changeColor = isPriceUp ? '#10b981' : '#ef4444';
        const changeIcon = isPriceUp ? '↑' : '↓';
        const changePercent = Math.abs(coin.change24h).toFixed(2);

        return `
            <div class="crypto-status-card">
                <div class="crypto-status-header">
                    <div class="crypto-status-info">
                        <div class="crypto-status-icon" style="background: ${coin.gradient};">
                            <span style="font-size: 20px; color: white; font-weight: bold;">${coin.icon}</span>
                        </div>
                        <div class="crypto-status-name">
                            <h3>${coin.name}</h3>
                            <p>${coin.symbol}</p>
                        </div>
                    </div>
                    <div class="crypto-status-price">
                        <div class="crypto-price-value">$${formatCryptoPrice(coin.price)}</div>
                        <div class="crypto-price-change ${isPriceUp ? 'positive' : 'negative'}">
                            ${changeIcon} ${changePercent}%
                        </div>
                    </div>
                </div>
                <div class="crypto-chart-container">
                    <div id="chart-${coin.id}" class="crypto-chart" data-coin-id="${coin.id}" data-coingecko-id="${coin.coingeckoId}"></div>
                </div>
            </div>
        `;
    }).join('');

    // Load charts for each coin
    prices.forEach(coin => {
        loadCryptoChart(coin);
    });

    // Refresh crypto data every 60 seconds
    setInterval(() => {
        fetchCryptoData().then(updatedPrices => {
            displayCryptoStatusCards(updatedPrices);
        });
    }, 60000);
}

// Load mini chart for each crypto
async function loadCryptoChart(coin) {
    const chartContainer = document.getElementById(`chart-${coin.id}`);
    
    if (!chartContainer) return;

    try {
        // Fetch historical data for the last 7 days
        const response = await fetch(
            `https://api.coingecko.com/api/v3/coins/${coin.coingeckoId}/market_chart?vs_currency=usd&days=7&interval=daily`
        );

        if (!response.ok) {
            chartContainer.innerHTML = '<div class="crypto-chart-loading">Chart unavailable</div>';
            return;
        }

        const data = await response.json();
        const prices = data.prices;

        // Create a simple ASCII sparkline chart if prices exist
        if (prices && prices.length > 0) {
            const sparklineHtml = createSparklineChart(prices, coin.color);
            chartContainer.innerHTML = sparklineHtml;
        } else {
            chartContainer.innerHTML = '<div class="crypto-chart-loading">No data</div>';
        }
    } catch (error) {
        console.error(`Error loading chart for ${coin.name}:`, error);
        chartContainer.innerHTML = '<div class="crypto-chart-loading">Chart error</div>';
    }
}

// Create a simple sparkline chart visualization
function createSparklineChart(prices, color) {
    if (prices.length < 2) {
        return '<div class="crypto-chart-loading">Insufficient data</div>';
    }

    // Extract just the price values
    const priceValues = prices.map(p => p[1]);
    const minPrice = Math.min(...priceValues);
    const maxPrice = Math.max(...priceValues);
    const range = maxPrice - minPrice || 1;

    // Create SVG sparkline
    const width = 100;
    const height = 60;
    const padding = 5;
    const graphWidth = width - (padding * 2);
    const graphHeight = height - (padding * 2);

    // Calculate points for SVG path
    const points = priceValues.map((price, index) => {
        const x = padding + (index / (priceValues.length - 1)) * graphWidth;
        const y = padding + graphHeight - ((price - minPrice) / range) * graphHeight;
        return `${x},${y}`;
    }).join(' ');

    // Determine if trend is up or down
    const isUp = priceValues[priceValues.length - 1] >= priceValues[0];
    const lineColor = isUp ? '#10b981' : '#ef4444';
    const fillColor = isUp ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)';

    const svg = `
        <svg width="100%" height="100%" viewBox="0 0 ${width} ${height}" preserveAspectRatio="none">
            <defs>
                <linearGradient id="sparkGradient-${color.replace('#', '')}" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" style="stop-color:${lineColor};stop-opacity:0.3" />
                    <stop offset="100%" style="stop-color:${lineColor};stop-opacity:0" />
                </linearGradient>
            </defs>
            <polyline points="${points}" fill="none" stroke="${lineColor}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" vector-effect="non-scaling-stroke"/>
            <polyline points="${points} ${width - padding},${height} ${padding},${height}" fill="url(#sparkGradient-${color.replace('#', '')})" opacity="0.5"/>
        </svg>
    `;

    return svg;
}

// Format crypto price display
function formatCryptoPrice(price) {
    if (price >= 1) {
        return price.toLocaleString('en-US', { maximumFractionDigits: 2 });
    } else if (price >= 0.01) {
        return price.toFixed(4);
    } else if (price >= 0.0001) {
        return price.toFixed(6);
    } else {
        return price.toExponential(2);
    }
}

// Load crypto status when market tab is opened
document.addEventListener('DOMContentLoaded', function() {
    const marketTab = document.getElementById('quantify-tab');
    if (marketTab) {
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (marketTab.classList.contains('active')) {
                    const container = document.getElementById('cryptoStatusCards');
                    if (container && container.children.length === 0) {
                        loadCryptoStatus();
                    }
                }
            });
        });

        observer.observe(marketTab, {
            attributes: true,
            attributeFilter: ['class']
        });
    }
});
