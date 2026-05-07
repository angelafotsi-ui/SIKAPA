/* Dashboard JavaScript */

// API Base URL
const apiBase = window.location.hostname === 'localhost' 
    ? 'http://localhost:3000/api'
    : 'https://sikapa-q2i0.onrender.com/api';

// Initialize Dashboard
document.addEventListener('DOMContentLoaded', function() {
    if (!isUserLoggedIn()) {
        window.location.href = 'login.html';
        return;
    }
    loadUserProfile();
    loadUserStats();
    loadTransactions();
    loadActivities();
    loadSupportMessages();
    resumeActiveTrades();
    setInterval(loadUserStats, 10000);
    setInterval(loadTransactions, 30000);
    setInterval(loadSupportMessages, 7000);

    const supportInput = document.getElementById('supportInput');
    if (supportInput) {
        supportInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                sendSupportMessage();
            }
        });
    }
});

/**
 * Switch Between Tabs
 */
function switchTab(tabId, element) {
    // Hide all tabs
    document.querySelectorAll('.tab-pane').forEach(tab => {
        tab.classList.remove('active');
    });

    // Remove active from all nav items
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
    });

    // Show selected tab
    document.getElementById(tabId).classList.add('active');
    
    // Add active to nav item
    element.classList.add('active');
    
    // Load market data when switching to quantify tab
    if (tabId === 'quantify-tab') {
        loadMarkets();
    } else if (tabId === 'invite-tab') {
        loadSupportMessages();
    }
}

/**
 * Load User Profile
 */
async function loadUserProfile() {
    try {
        const userId = localStorage.getItem('userId') || localStorage.getItem('user_uid');
        const authToken = localStorage.getItem('authToken') || localStorage.getItem('auth_token');
        const userName = localStorage.getItem('user_name') || 'User';
        const userEmail = localStorage.getItem('user_email') || '';

        if (!userId) return;

        // Update Home Tab
        document.getElementById('userName').textContent = userName;
        document.getElementById('userEmail').textContent = userEmail;

        // Update Profile Tab
        document.getElementById('profileName').textContent = userName || 'User Name';
        document.getElementById('profileEmail').textContent = userEmail || 'user@example.com';
        document.getElementById('infoEmail').textContent = userEmail || 'user@example.com';
        document.getElementById('infoUserId').textContent = userId;

        // Set member since date
        const createdAt = new Date();
        document.getElementById('infoMemberSince').textContent = createdAt.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });

        const welcome = document.getElementById('supportWelcomeMessage');
        if (welcome) {
            welcome.textContent = `Hello ${userName || 'User'}! 👋 Welcome to Sikapa Ghana support. Leave us a message below and our team will assist you shortly.`;
        }

        // Show admin button if user is admin
        showAdminButtonIfAdmin();

    } catch (error) {
        console.error('Error loading user profile:', error);
    }
}

/**
 * Load User Statistics
 */
async function loadUserStats() {
    try {
        const userId = localStorage.getItem('userId') || localStorage.getItem('user_uid');
        const authToken = localStorage.getItem('authToken') || localStorage.getItem('auth_token');

        if (!userId) return;

        // Fetch user stats
        const statsResponse = await fetch(`${apiBase}/user/stats/${userId}`, {
            headers: {
                'Authorization': `Bearer ${authToken}`,
                'Content-Type': 'application/json'
            }
        });

        if (statsResponse.ok) {
            const statsData = await statsResponse.json();
            
            // Update all stat fields
            const stats = statsData.stats || {};
            
            // Display spendable balance after deducting pending market principal
            const backendTotalBalance = stats.totalBalance || 0;
            const pendingMarketPrincipal = getPendingMarketPrincipal();
            const effectiveAvailableBalance = Math.max(0, backendTotalBalance - pendingMarketPrincipal);

            document.getElementById('homeBalance').textContent = effectiveAvailableBalance.toFixed(2);
            
            // Store effective spendable balance for market checks and cards
            localStorage.setItem('userBalance', effectiveAvailableBalance.toFixed(2));
            localStorage.setItem('backendTotalBalance', backendTotalBalance.toFixed(2));

            // Fetch financial totals from dedicated endpoint
            const financialSummary = await loadFinancialSummary(userId, authToken);
            const totalInflow = financialSummary.totalInflow || 0;
            const totalOutflow = financialSummary.totalOutflow || 0;

            document.getElementById('totalInflow').textContent = totalInflow.toFixed(2);
            document.getElementById('totalOutflow').textContent = totalOutflow.toFixed(2);
            document.getElementById('profileTotalInflow').textContent = totalInflow.toFixed(2);
            document.getElementById('profileTotalOutflow').textContent = totalOutflow.toFixed(2);
            
            // Display withdrawable amount (tier rewards only)
            if (document.getElementById('withdrawableAmount')) {
                document.getElementById('withdrawableAmount').textContent = (stats.withdrawableAmount || 0).toFixed(2);
            }

            // Update tier reward stats if they exist
            if (document.getElementById('tierClaimedToday')) {
                document.getElementById('tierClaimedToday').textContent = stats.tierClaimedToday || 0;
            }
            if (document.getElementById('tierEarnings')) {
                document.getElementById('tierEarnings').textContent = (stats.totalTierEarnings || 0).toFixed(2);
            }
        }

    } catch (error) {
        console.error('Error loading user stats:', error);
    }
}

/**
 * Load support chat messages for current user
 */
async function loadSupportMessages() {
    try {
        const userId = localStorage.getItem('userId') || localStorage.getItem('user_uid');
        if (!userId) return;

        const response = await fetch(`${apiBase}/support/messages/${userId}`);
        if (!response.ok) return;

        const data = await response.json();
        const messages = data.messages || [];
        const supportMessagesEl = document.getElementById('supportMessages');
        if (!supportMessagesEl) return;

        const userName = localStorage.getItem('user_name') || 'User';
        const introCard = `
            <div class="support-message support-message-admin">
                <div class="support-bubble">
                    <h4>System Agent</h4>
                    <p>Hello ${userName}! 👋 Welcome to Sikapa Ghana support. Leave us a message below and our team will assist you shortly.</p>
                </div>
            </div>
        `;

        const messageCards = messages.map(msg => {
            const time = new Date(msg.createdAt).toLocaleString('en-US', {
                month: 'short',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit'
            });
            const sender = msg.senderType === 'admin' ? 'System Agent' : 'You';
            const rowClass = msg.senderType === 'admin' ? 'support-message-admin' : 'support-message-user';
            return `
                <div class="support-message ${rowClass}">
                    <div class="support-bubble">
                        <h4>${sender}</h4>
                        <p>${msg.text}</p>
                        <small>${time}</small>
                    </div>
                </div>
            `;
        }).join('');

        supportMessagesEl.innerHTML = introCard + (messageCards || '');
        supportMessagesEl.scrollTop = supportMessagesEl.scrollHeight;
    } catch (error) {
        console.error('Error loading support messages:', error);
    }
}

/**
 * Send support message from user
 */
async function sendSupportMessage() {
    try {
        const input = document.getElementById('supportInput');
        if (!input) return;

        const text = input.value.trim();
        if (!text) {
            showNotification('Please enter a message', 'error');
            return;
        }

        const userId = localStorage.getItem('userId') || localStorage.getItem('user_uid');
        const userName = localStorage.getItem('user_name') || 'User';
        const userEmail = localStorage.getItem('user_email') || '';
        if (!userId) return;

        const response = await fetch(`${apiBase}/support/messages`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId, userName, userEmail, text })
        });

        const data = await response.json();
        if (!response.ok || !data.success) {
            showNotification(data.message || 'Failed to send message', 'error');
            return;
        }

        input.value = '';
        loadSupportMessages();
    } catch (error) {
        console.error('Error sending support message:', error);
        showNotification('Failed to send message', 'error');
    }
}

/**
 * Load Total Inflow and Outflow
 */
async function loadFinancialSummary(userId, authToken) {
    const localMarketOutflow = parseFloat(localStorage.getItem('totalOutflow') || '0');

    try {
        const summaryResponse = await fetch(
            `${apiBase}/user/financial-summary/${userId}?marketOutflow=${encodeURIComponent(localMarketOutflow)}`,
            {
                headers: {
                    'Authorization': `Bearer ${authToken}`,
                    'Content-Type': 'application/json'
                }
            }
        );

        if (!summaryResponse.ok) {
            throw new Error('Failed to load financial summary');
        }

        const summaryData = await summaryResponse.json();
        return summaryData.summary || { totalInflow: 0, totalOutflow: localMarketOutflow };
    } catch (error) {
        console.error('Error loading financial summary:', error);
        return { totalInflow: 0, totalOutflow: localMarketOutflow };
    }
}

/**
 * Load Recent Transactions
 */
async function loadTransactions() {
    try {
        const userId = localStorage.getItem('userId') || localStorage.getItem('user_uid');
        const authToken = localStorage.getItem('authToken') || localStorage.getItem('auth_token');

        if (!userId) return;

        const response = await fetch(`${apiBase}/transactions/user/${userId}`, {
            headers: {
                'Authorization': `Bearer ${authToken}`,
                'Content-Type': 'application/json'
            }
        });

        if (response.ok) {
            const transactionsData = await response.json();
            const transactions = transactionsData.transactions || [];

            const transactionsList = document.getElementById('transactionsList');
            
            if (transactions.length === 0) {
                transactionsList.innerHTML = '<p class="no-data">No recent transactions</p>';
                return;
            }

            transactionsList.innerHTML = transactions.slice(0, 5).map(transaction => {
                const date = new Date(transaction.createdAt || transaction.date);
                const statusColor = getStatusColor(transaction.status);
                const displayType = transaction.type.charAt(0).toUpperCase() + transaction.type.slice(1);
                
                return `
                <div class="transaction-item">
                    <div class="transaction-details">
                        <div class="transaction-icon" style="background: ${getTransactionColor(transaction.type)};">
                            ${getTransactionIcon(transaction.type)}
                        </div>
                        <div class="transaction-text">
                            <h4>${displayType} <span style="font-size: 0.8rem; color: ${statusColor}; font-weight: 600; text-transform: uppercase;">${transaction.status}</span></h4>
                            <p>${date.toLocaleDateString()}</p>
                        </div>
                    </div>
                    <div class="transaction-amount" style="color: ${transaction.type === 'deposit' || transaction.type === 'cashout' ? '#4CAF50' : '#FF6B6B'};">
                        ${transaction.type === 'deposit' || transaction.type === 'cashout' ? '+' : '-'}₵${transaction.amount.toFixed(2)}
                    </div>
                </div>
                `;
            }).join('');
        }

    } catch (error) {
        console.error('Error loading transactions:', error);
    }
}

/**
 * Load and Display Recent Activities (Ongoing Trades)
 */
async function loadActivities() {
    try {
        displayActivities();
    } catch (error) {
        console.error('Error loading activities:', error);
    }
}

/**
 * Display Recent Activities from localStorage
 */
function displayActivities() {
    const activitiesList = document.getElementById('activitiesList');
    if (!activitiesList) return;

    migrateTradeActivitiesIfNeeded();
    const trades = JSON.parse(localStorage.getItem('tradeActivities') || '[]');
    const now = new Date().getTime();
    
    if (trades.length === 0) {
        activitiesList.innerHTML = '<p class="no-data">No recent activities</p>';
        return;
    }
    
    activitiesList.innerHTML = trades.slice(0, 5).map((trade, index) => {
        const isCompleted = trade.status === 'completed' || trade.completionTime <= now;
        const status = isCompleted ? 'Completed' : 'Pending';
        const statusClass = isCompleted ? 'completed' : 'pending';
        
        const returnAmount = trade.cashoutAmount - trade.tradeAmount;
        const usdTradeAmount = convertToUSD(trade.tradeAmount);
        const usdCashoutAmount = convertToUSD(trade.cashoutAmount);
        
        return `
            <div class="activity-item">
                <div class="activity-header">
                    <div class="activity-info">
                        <h4 class="activity-name">${trade.marketName}</h4>
                        <p class="activity-date">${new Date(trade.createdAt).toLocaleDateString()}</p>
                    </div>
                    <span class="activity-status ${statusClass}">${status}</span>
                </div>
                
                <div class="activity-details">
                    <div class="detail-item">
                        <span class="detail-label">Investment</span>
                        <span class="detail-value">GH₵${trade.tradeAmount.toFixed(2)} ($${usdTradeAmount})</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Expected Return</span>
                        <span class="detail-value profit">+ GH₵${returnAmount.toFixed(2)} ($${convertToUSD(returnAmount)})</span>
                    </div>
                </div>
                
                ${!isCompleted ? `
                    <div class="activity-countdown" id="countdown-${index}">
                        <span class="countdown-label">Completes in:</span>
                        <span class="countdown-display" id="countdown-text-${index}">calculating...</span>
                    </div>
                ` : `
                    <div class="activity-completed">
                        <i class="fas fa-check-circle"></i>
                        <span>Credited GH₵${trade.cashoutAmount.toFixed(2)}</span>
                    </div>
                `}
            </div>
        `;
    }).join('');
    
    // Start countdown timers for active trades
    trades.forEach((trade, index) => {
        if (trade.completionTime > now) {
            updateActivityCountdown(trade, index);
        }
    });
}

/**
 * Update Activity Countdown Display
 */
function updateActivityCountdown(trade, index) {
    const countdownDisplay = document.getElementById(`countdown-text-${index}`);
    if (!countdownDisplay) return;
    
    const timerInterval = setInterval(() => {
        const now = new Date().getTime();
        const timeRemaining = trade.completionTime - now;
        
        if (timeRemaining <= 0) {
            clearInterval(timerInterval);
            countdownDisplay.textContent = 'Completed!';
            countdownDisplay.classList.add('completed');
            
            // Refresh activities after a short delay
            setTimeout(() => {
                displayActivities();
                loadUserStats();
            }, 1000);
            return;
        }
        
        // Calculate time units
        const days = Math.floor(timeRemaining / (1000 * 60 * 60 * 24));
        const hours = Math.floor((timeRemaining % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((timeRemaining % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((timeRemaining % (1000 * 60)) / 1000);
        
        // Format display
        let displayText = '';
        if (days > 0) {
            displayText = `${days}d ${hours}h ${minutes}m`;
        } else if (hours > 0) {
            displayText = `${hours}h ${minutes}m ${seconds}s`;
        } else {
            displayText = `${minutes}m ${seconds}s`;
        }
        
        countdownDisplay.textContent = displayText;
    }, 1000);
}

/**
 * Load Referral Statistics
 */
async function loadReferralStats() {
    try {
        const userId = localStorage.getItem('userId') || localStorage.getItem('user_uid');
        const authToken = localStorage.getItem('authToken') || localStorage.getItem('auth_token');

        if (!userId) {
            console.log('[Referral] No userId found. Checking localStorage keys:', Object.keys(localStorage));
            return;
        }

        console.log('[Referral] Loading stats for userId:', userId);
        console.log('[Referral] API Base:', apiBase);

        const fetchUrl = `${apiBase}/user/referrals/${userId}`;
        console.log('[Referral] Fetching from:', fetchUrl);

        const response = await fetch(fetchUrl, {
            headers: {
                'Authorization': `Bearer ${authToken}`,
                'Content-Type': 'application/json'
            }
        });

        console.log('[Referral] Response status:', response.status, response.statusText);

        if (!response.ok) {
            const errorData = await response.text();
            console.error('[Referral] API Error Response:', {
                status: response.status,
                statusText: response.statusText,
                body: errorData
            });
            return;
        }

        const data = await response.json();
        console.log('[Referral] Full API Response:', JSON.stringify(data, null, 2));
        
        const referrals = data.referrals || data;

        console.log('[Referral] Parsed referrals object:', referrals);

        // Update referral code display
        const codeElement = document.getElementById('referralCode');
        if (codeElement) {
            codeElement.textContent = referrals.referralCode || 'N/A';
            console.log('[Referral] Updated referralCode to:', referrals.referralCode);
        } else {
            console.warn('[Referral] referralCode element not found');
        }

        // Update referral link
        const linkElement = document.getElementById('referralLink');
        if (linkElement) {
            const referralLink = `${window.location.origin}/signup.html?ref=${referrals.referralCode}`;
            linkElement.value = referralLink;
            console.log('[Referral] Updated referralLink to:', referralLink);
        } else {
            console.warn('[Referral] referralLink element not found');
        }

        // Update friends invited
        const friendsElement = document.getElementById('friendsInvited');
        if (friendsElement) {
            friendsElement.textContent = referrals.friendsInvited || 0;
            console.log('[Referral] Successfully updated friendsInvited to:', referrals.friendsInvited);
        } else {
            console.warn('[Referral] friendsInvited element not found');
        }

        // Update commission earned
        const commissionElement = document.getElementById('referralCommission');
        if (commissionElement) {
            const commission = (referrals.commissionEarned || 0).toFixed(2);
            commissionElement.textContent = commission;
            console.log('[Referral] Successfully updated referralCommission to:', commission);
        } else {
            console.warn('[Referral] referralCommission element not found');
        }

        // Display referred users list
        const referralsListElement = document.getElementById('referralsList');
        if (referralsListElement) {
            const referredUsers = referrals.referredUsers || [];
            console.log('[Referral] Referred users:', referredUsers);

            if (referredUsers.length === 0) {
                referralsListElement.innerHTML = '<p class="no-data">No referrals yet</p>';
                console.log('[Referral] No referred users found');
            } else {
                referralsListElement.innerHTML = referredUsers.map(user => {
                    const signupDate = new Date(user.signupDate).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric'
                    });
                    return `
                    <div class="friend-card">
                        <div class="friend-info">
                            <h4>${user.name}</h4>
                            <p>${user.email}</p>
                            <small>Joined: ${signupDate}</small>
                        </div>
                        <div class="friend-icon">
                            <i class="fas fa-check-circle" style="color: #4CAF50;"></i>
                        </div>
                    </div>
                    `;
                }).join('');
                console.log('[Referral] Successfully displayed', referredUsers.length, 'referred users');
            }
        } else {
            console.warn('[Referral] referralsList element not found');
        }

    } catch (error) {
        console.error('[Referral] Exception occurred:', error);
        console.error('[Referral] Error stack:', error.stack);
    }
}

/**
 * Get Transaction Color
 */
function getTransactionColor(type) {
    const colors = {
        'deposit': '#4CAF5033',
        'withdraw': '#FF6B6B33',
        'commission': '#37017a33',
        'payment': '#f5576c33'
    };
    return colors[type] || '#99999933';
}

/**
 * Get Transaction Icon
 */
function getTransactionIcon(type) {
    const icons = {
        'deposit': '💳',
        'withdraw': '💸',
        'commission': '🎁',
        'payment': '💰',
        'cashout': '💰'
    };
    return icons[type] || '📊';
}

/**
 * Get Status Color
 */
function getStatusColor(status) {
    const colors = {
        'pending': '#ff9800',
        'approved': '#4CAF50',
        'rejected': '#f44336',
        'success': '#4CAF50',
        'failed': '#f44336',
        'completed': '#4CAF50'
    };
    return colors[status] || '#999';
}

/**
 * Redirect to Deposit
 */
function redirectToDeposit() {
    window.location.href = 'deposit.html';
}

/**
 * Redirect to Withdraw
 */
function redirectToWithdraw() {
    window.location.href = 'withdraw.html';
}

/**
 * Redirect to Admin Panel
 */
function redirectToAdmin() {
    window.location.href = 'admin.html';
}

/**
 * Show Admin Button if User is Admin
 */
function showAdminButtonIfAdmin() {
    try {
        if (isUserAdmin()) {
            document.getElementById('admin-btn').style.display = 'flex';
        } else {
            document.getElementById('admin-btn').style.display = 'none';
        }
    } catch (error) {
        console.error('Error checking admin status:', error);
        document.getElementById('admin-btn').style.display = 'none';
    }
}

/**
 * Copy Referral Code
 */
function copyReferralCode() {
    const code = document.getElementById('referralCode').textContent;
    navigator.clipboard.writeText(code).then(() => {
        showNotification('Referral code copied!', 'success');
    }).catch(() => {
        showNotification('Failed to copy', 'error');
    });
}

/**
 * Copy Referral Link
 */
function copyReferralLink() {
    const link = document.getElementById('referralLink').value;
    navigator.clipboard.writeText(link).then(() => {
        showNotification('Referral link copied!', 'success');
    }).catch(() => {
        showNotification('Failed to copy', 'error');
    });
}

/**
 * Share via WhatsApp
 */
function shareViaWhatsapp() {
    const link = document.getElementById('referralLink').value;
    const message = `Join Sikapa and start earning! ${link}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(message)}`);
}

/**
 * Share via Facebook
 */
function shareViaFacebook() {
    const link = document.getElementById('referralLink').value;
    window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(link)}`);
}

/**
 * Share via Twitter
 */
function shareViaTwitter() {
    const link = document.getElementById('referralLink').value;
    const text = 'Join Sikapa and start earning!';
    window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(link)}`);
}

/**
 * Handle Change Password
 */
function handleChangePassword() {
    const newPassword = prompt('Enter new password:');
    if (!newPassword) return;

    const confirmPassword = prompt('Confirm new password:');
    if (newPassword !== confirmPassword) {
        showNotification('Passwords do not match', 'error');
        return;
    }

    // Call password change endpoint
    updateUserPassword(newPassword);
}

/**
 * Update User Password
 */
async function updateUserPassword(newPassword) {
    try {
        const userId = localStorage.getItem('userId') || localStorage.getItem('user_uid');
        const authToken = localStorage.getItem('authToken') || localStorage.getItem('auth_token');

        const response = await fetch(`${apiBase}/user/change-password`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${authToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                userId,
                newPassword
            })
        });

        if (response.ok) {
            showNotification('Password updated successfully', 'success');
        } else {
            showNotification('Failed to update password', 'error');
        }

    } catch (error) {
        console.error('Error updating password:', error);
        showNotification('Error updating password', 'error');
    }
}

/**
/**
 * Exchange Rate Configuration
 */
const EXCHANGE_RATE = 10.5; // 1 USD = 10.5 GH₵ (adjust as needed)

/**
 * Market Data Configuration
 */
const MARKETS_DATA = {
    crypto: [
        {
            id: 'btc',
            name: 'Bitcoin',
            symbol: 'BTC',
            image: 'images/BITCOIN.png',
            icon: '<i class="fab fa-bitcoin"></i>',
            tradeAmount: 221.00, // in GH₵
            cashoutAmount: 1800.00, // in GH₵
            period: '24Hours'
        },
        {
            id: 'usdt',
            name: 'USDT',
            symbol: 'USDT',
            image: 'images/USDT.png',
            icon: '<i class="fas fa-coins"></i>',
            tradeAmount: 250.00, // in GH₵
            cashoutAmount: 2100.00, // in GH₵
            period: '24Hours'
        },
        {
            id: 'sol',
            name: 'Solana',
            symbol: 'SOL',
            image: 'images/SOLANA.jpg',
            icon: '<i class="fas fa-sun"></i>',
            tradeAmount: 189.00, // in GH₵
            cashoutAmount: 1500.00, // in GH₵
            period: '24Hours'
        }
    ],
    livestock: [
        {
            id: 'snail',
            name: 'Snail',
            symbol: 'Snail',
            location: 'Gbetsile',
            image: 'images/SNAIL.jpg',
            icon: '<i class="fas fa-bug"></i>',
            tradeAmount: 20.00, // in GH₵
            cashoutAmount: 650.00, // in GH₵
            period: '7Days'
        },
        {
            id: 'fish',
            name: 'Fish Farming',
            symbol: 'Tilapia & Catfish',
            location: 'Gbetsile',
            image: 'images/FISH.jpg',
            icon: '<i class="fas fa-fish"></i>',
            tradeAmount: 150.00, // in GH₵
            cashoutAmount: 1450.00, // in GH₵
            period: '3Days'
        },
        {
            id: 'pig',
            name: 'Pig',
            symbol: 'PIG',
            location: 'Madina',
            image: 'images/PIGS.jpg',
            icon: '<i class="fas fa-pig"></i>',
            tradeAmount: 100.00, // in GH₵
            cashoutAmount: 1200.00, // in GH₵
            period: '7Days'
        },
        {
            id: 'cattle',
            name: 'Cattle',
            symbol: 'CATTLE',
            location: 'WA',
            image: 'images/CATTLE.jpg',
            icon: '<i class="fas fa-cow"></i>',
            tradeAmount: 300.00, // in GH₵
            cashoutAmount: 2500.00, // in GH₵
            period: '7Days'
        },
        {
            id: 'poultry',
            name: 'Poultry',
            symbol: 'POULTRY',
            location: 'Accra',
            image: 'images/POULTRY.jpg',
            icon: '<i class="fas fa-feather-alt"></i>',
            tradeAmount: 70.00, // in GH₵
            cashoutAmount: 900.00, // in GH₵
            period: '7Days'
        }
    ]
};

/**
 * Convert GH₵ to USD
 */
function convertToUSD(ghAmount) {
    return (ghAmount / EXCHANGE_RATE).toFixed(2);
}

/**
 * Format Currency Display
 */
function formatCurrencyDisplay(ghAmount) {
    const usdAmount = convertToUSD(ghAmount);
    return `GH₵${ghAmount.toFixed(2)} ($${usdAmount})`;
}

/**
 * Load Markets Data
 */
async function loadMarkets() {
    try {
        displayCryptoMarkets();
        displayLivestockMarkets();
        updateMarketBalance();
        loadCryptoStatus();
    } catch (error) {
        console.error('Error loading markets:', error);
        showNotification('Failed to load markets', 'error');
    }
}

/**
 * Update Market Balance Display
 */
function updateMarketBalance() {
    const balance = localStorage.getItem('userBalance') || '0.00';
    document.getElementById('marketAvailableBalance').textContent = balance;
}

function getPendingMarketPrincipal() {
    const now = Date.now();
    const activeTrades = JSON.parse(localStorage.getItem('activeTrades') || '[]');

    return activeTrades.reduce((sum, trade) => {
        if (trade.completionTime > now) {
            return sum + parseFloat(trade.tradeAmount || 0);
        }
        return sum;
    }, 0);
}

/**
 * Display Crypto Markets
 */
function displayCryptoMarkets() {
    const cryptoContainer = document.getElementById('cryptoMarketCards');
    
    if (!cryptoContainer) return;
    
    cryptoContainer.innerHTML = MARKETS_DATA.crypto.map(market => `
        <div class="market-card">
            <div class="market-card-header">
                <div class="market-card-icon" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 14px; overflow: hidden;">
                    <img src="${market.image}" alt="${market.name}" style="width: 100%; height: 100%; object-fit: cover;">
                </div>
                <div class="market-card-info">
                    <h3>${market.name} Market</h3>
                    <p>${market.symbol}</p>
                </div>
            </div>
            
            <div class="market-card-body">
                <div class="market-details">
                    <div class="detail-row">
                        <span class="detail-label">Trade</span>
                        <span class="detail-value">${formatCurrencyDisplay(market.tradeAmount)}</span>
                    </div>
                    <div class="detail-row">
                        <span class="detail-label">Cashout</span>
                        <span class="detail-value">${formatCurrencyDisplay(market.cashoutAmount)}</span>
                    </div>
                    <div class="detail-row">
                        <span class="detail-label">Period</span>
                        <span class="detail-value">${market.period}</span>
                    </div>
                </div>
            </div>
            
            <button class="market-action-btn" onclick="handleTrade('crypto', '${market.id}', ${market.tradeAmount})">
                <i class="fas fa-arrow-right"></i> Trade
            </button>
        </div>
    `).join('');
}

/**
 * Display Livestock Markets
 */
function displayLivestockMarkets() {
    const livestockContainer = document.getElementById('livestockMarketCards');
    
    if (!livestockContainer) return;
    
    livestockContainer.innerHTML = MARKETS_DATA.livestock.map(market => `
        <div class="market-card">
            <div class="market-card-header">
                <div class="market-card-icon" style="background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); border-radius: 14px; overflow: hidden;">
                    <img src="${market.image}" alt="${market.name}" style="width: 100%; height: 100%; object-fit: cover;">
                </div>
                <div class="market-card-info">
                    <h3>${market.name} Market</h3>
                    <p>${market.location ? `<i class="fas fa-map-marker-alt"></i> ${market.location}` : market.symbol}</p>
                </div>
            </div>
            
            <div class="market-card-body">
                <div class="market-details">
                    <div class="detail-row">
                        <span class="detail-label">Trade</span>
                        <span class="detail-value">${formatCurrencyDisplay(market.tradeAmount)}</span>
                    </div>
                    <div class="detail-row">
                        <span class="detail-label">Cashout</span>
                        <span class="detail-value">${formatCurrencyDisplay(market.cashoutAmount)}</span>
                    </div>
                    <div class="detail-row">
                        <span class="detail-label">Period</span>
                        <span class="detail-value">${market.period}</span>
                    </div>
                </div>
            </div>
            
            <button class="market-action-btn" onclick="handleTrade('livestock', '${market.id}', ${market.tradeAmount})">
                <i class="fas fa-arrow-right"></i> Trade
            </button>
        </div>
    `).join('');
}

/**
 * Handle Trade Action
 */
function handleTrade(marketType, marketId, tradeAmount) {
    const userBalance = parseFloat(localStorage.getItem('userBalance') || '0');
    
    if (userBalance < tradeAmount) {
        showNotification(`Insufficient balance. Need ₵${tradeAmount} but you have ₵${userBalance}`, 'error');
        return;
    }
    
    // Find the market details
    const allMarkets = [...MARKETS_DATA.crypto, ...MARKETS_DATA.livestock];
    const market = allMarkets.find(m => m.id === marketId);
    
    if (!market) {
        showNotification('Market not found', 'error');
        return;
    }
    
    // Store trade data for confirmation
    window.currentTrade = {
        marketType: marketType,
        marketId: marketId,
        market: market,
        tradeAmount: tradeAmount,
        cashoutAmount: market.cashoutAmount,
        period: market.period
    };
    
    // Display trade initiation modal
    displayTradeModal(market, tradeAmount);
}

/**
 * Display Trade Initiation Modal
 */
function displayTradeModal(market, tradeAmount) {
    const usdAmount = convertToUSD(tradeAmount);
    const returnAmount = market.cashoutAmount - tradeAmount;
    
    document.getElementById('tradeImage').src = market.image;
    document.getElementById('tradeName').textContent = market.name;
    document.getElementById('tradeSymbol').textContent = market.symbol;
    document.getElementById('investAmount').textContent = `GH₵${tradeAmount.toFixed(2)} ($${usdAmount})`;
    document.getElementById('cashoutPeriod').textContent = `GH₵${market.cashoutAmount.toFixed(2)} ($${convertToUSD(market.cashoutAmount)})`;
    document.getElementById('returnValue').textContent = `+ GH₵${returnAmount.toFixed(2)} ($${convertToUSD(returnAmount)})`;
    document.getElementById('tradePeriod').textContent = market.period;
    
    document.getElementById('tradeInitialModal').classList.add('active');
}

/**
 * Close Trade Modal
 */
function closeTradeModal() {
    document.getElementById('tradeInitialModal').classList.remove('active');
    window.currentTrade = null;
}

/**
 * Confirm Trade and Deduct Balance
 */
function confirmTrade() {
    if (!window.currentTrade) return;
    
    const trade = window.currentTrade;
    const userId = localStorage.getItem('userId') || localStorage.getItem('user_uid');
    const currentBalance = parseFloat(localStorage.getItem('userBalance') || '0');
    const newBalance = currentBalance - trade.tradeAmount;
    
    // Track total outflow
    const totalOutflow = parseFloat(localStorage.getItem('totalOutflow') || '0');
    localStorage.setItem('totalOutflow', (totalOutflow + trade.tradeAmount).toFixed(2));
    
    // Deduct balance immediately
    localStorage.setItem('userBalance', newBalance.toFixed(2));
    document.getElementById('homeBalance').textContent = newBalance.toFixed(2);
    document.getElementById('marketAvailableBalance').textContent = newBalance.toFixed(2);
    
    // Update outflow display
    document.getElementById('totalOutflow').textContent = (totalOutflow + trade.tradeAmount).toFixed(2);
    
    // Close initiation modal
    closeTradeModal();
    
    // Show success modal with countdown
    displaySuccessModal(trade);
    
    // Start countdown timer
    startCountdown(trade);
    
    // Log the trade (optional: send to backend)
    logTradeTransaction(userId, trade);
}

/**
 * Display Success Modal with Countdown
 */
function displaySuccessModal(trade) {
    const returnAmount = trade.cashoutAmount - trade.tradeAmount;
    const usdReturnAmount = convertToUSD(returnAmount);
    const usdTradeAmount = convertToUSD(trade.tradeAmount);
    
    document.getElementById('successInvestAmount').textContent = `GH₵${trade.tradeAmount.toFixed(2)} ($${usdTradeAmount})`;
    document.getElementById('successReturnAmount').textContent = `+ GH₵${returnAmount.toFixed(2)} ($${usdReturnAmount})`;
    
    document.getElementById('tradeSuccessModal').classList.add('active');
}

/**
 * Close Success Modal
 */
function closeSuccessModal() {
    document.getElementById('tradeSuccessModal').classList.remove('active');
}

/**
 * Start Countdown Timer
 */
function startCountdown(trade) {
    // Parse period to get duration in seconds
    let durationSeconds = 86400; // Default 24 hours
    
    if (trade.period === '7Days') {
        durationSeconds = 604800; // 7 days in seconds
    } else if (trade.period === '3Days') {
        durationSeconds = 259200; // 3 days in seconds
    } else if (trade.period === '24Hours') {
        durationSeconds = 86400; // 24 hours in seconds
    }
    
    // Get or set the trade completion time
    const now = new Date().getTime();
    const completionTime = now + (durationSeconds * 1000);
    const tradeId = `trade_${Date.now()}_${Math.floor(Math.random() * 10000)}`;
    
    // Store trade info for later retrieval
    const trades = JSON.parse(localStorage.getItem('activeTrades') || '[]');
    trades.push({
        id: tradeId,
        tradeAmount: trade.tradeAmount,
        cashoutAmount: trade.cashoutAmount,
        completionTime: completionTime,
        marketName: trade.market.name,
        createdAt: now,
        status: 'pending'
    });
    localStorage.setItem('activeTrades', JSON.stringify(trades));

    // Keep activity history so completed trades remain visible
    const tradeActivities = JSON.parse(localStorage.getItem('tradeActivities') || '[]');
    tradeActivities.unshift({
        id: tradeId,
        tradeAmount: trade.tradeAmount,
        cashoutAmount: trade.cashoutAmount,
        completionTime: completionTime,
        marketName: trade.market.name,
        createdAt: now,
        status: 'pending'
    });
    localStorage.setItem('tradeActivities', JSON.stringify(tradeActivities.slice(0, 20)));
    
    // Update countdown display and check for completion
    updateCountdown(completionTime);
    displayActivities();
}

/**
 * Update Countdown Timer Display
 */
function updateCountdown(completionTime) {
    const timerInterval = setInterval(() => {
        const now = new Date().getTime();
        const timeRemaining = completionTime - now;
        
        if (timeRemaining <= 0) {
            clearInterval(timerInterval);
            
            // Countdown complete - credit the account
            creditTradeReturn();
            
            // Update display to show 00:00:00:00
            document.getElementById('countdownDays').textContent = '00';
            document.getElementById('countdownHours').textContent = '00';
            document.getElementById('countdownMinutes').textContent = '00';
            document.getElementById('countdownSeconds').textContent = '00';
            
            return;
        }
        
        // Calculate time units
        const days = Math.floor(timeRemaining / (1000 * 60 * 60 * 24));
        const hours = Math.floor((timeRemaining % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((timeRemaining % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((timeRemaining % (1000 * 60)) / 1000);
        
        // Update display
        document.getElementById('countdownDays').textContent = String(days).padStart(2, '0');
        document.getElementById('countdownHours').textContent = String(hours).padStart(2, '0');
        document.getElementById('countdownMinutes').textContent = String(minutes).padStart(2, '0');
        document.getElementById('countdownSeconds').textContent = String(seconds).padStart(2, '0');
    }, 1000);
}

/**
 * Resume Active Trade Countdowns
 */
function resumeActiveTrades() {
    const trades = JSON.parse(localStorage.getItem('activeTrades') || '[]');
    
    if (trades.length === 0) return;
    
    migrateTradeActivitiesIfNeeded();

    // Check for completed trades
    const now = new Date().getTime();
    const remainingTrades = [];
    let totalCreditAmount = 0;
    
    trades.forEach((trade) => {
        if (trade.completionTime <= now) {
            // Trade is complete
            totalCreditAmount += trade.cashoutAmount;
            markTradeActivityAsCompleted(trade.id);
        } else {
            // Trade is still active - resume countdown
            remainingTrades.push(trade);
            updateCountdown(trade.completionTime);
            
            // Display success modal for ongoing trades
            displayActiveTradeModal(trade);
        }
    });
    
    // Credit any completed trades
    if (totalCreditAmount > 0) {
        const currentBalance = parseFloat(localStorage.getItem('userBalance') || '0');
        const newBalance = currentBalance + totalCreditAmount;
        localStorage.setItem('userBalance', newBalance.toFixed(2));
        
        if (document.getElementById('homeBalance')) {
            document.getElementById('homeBalance').textContent = newBalance.toFixed(2);
        }
        if (document.getElementById('marketAvailableBalance')) {
            document.getElementById('marketAvailableBalance').textContent = newBalance.toFixed(2);
        }
    }
    
    // Save remaining active trades
    localStorage.setItem('activeTrades', JSON.stringify(remainingTrades));
    
    // Display activities
    displayActivities();
}

/**
 * Display Active Trade Modal for Ongoing Trades
 */
function displayActiveTradeModal(trade) {
    const returnAmount = trade.cashoutAmount - trade.tradeAmount;
    const usdReturnAmount = convertToUSD(returnAmount);
    const usdTradeAmount = convertToUSD(trade.tradeAmount);
    
    document.getElementById('successInvestAmount').textContent = `GH₵${trade.tradeAmount.toFixed(2)} ($${usdTradeAmount})`;
    document.getElementById('successReturnAmount').textContent = `+ GH₵${returnAmount.toFixed(2)} ($${usdReturnAmount})`;
}

/**
 * Credit Trade Return to User Balance
 */
function creditTradeReturn() {
    const trades = JSON.parse(localStorage.getItem('activeTrades') || '[]');
    
    let totalCreditAmount = 0;
    const completedTrades = [];
    
    // Find completed trades and calculate total credit
    trades.forEach((trade, index) => {
        if (trade.completionTime <= new Date().getTime()) {
            totalCreditAmount += trade.cashoutAmount;
            completedTrades.push(trade);
            markTradeActivityAsCompleted(trade.id);
        }
    });
    
    if (totalCreditAmount > 0) {
        const currentBalance = parseFloat(localStorage.getItem('userBalance') || '0');
        const newBalance = currentBalance + totalCreditAmount;
        
        localStorage.setItem('userBalance', newBalance.toFixed(2));
        document.getElementById('homeBalance').textContent = newBalance.toFixed(2);
        document.getElementById('marketAvailableBalance').textContent = newBalance.toFixed(2);
        
        // Remove completed trades
        const remainingTrades = trades.filter(t => t.completionTime > new Date().getTime());
        localStorage.setItem('activeTrades', JSON.stringify(remainingTrades));
        
        // Show success notification
        showNotification(`🎉 Trade completed! You've received ₵${totalCreditAmount.toFixed(2)}`, 'success');
        loadUserStats();
        displayActivities();
    }
}

function migrateTradeActivitiesIfNeeded() {
    const tradeActivities = JSON.parse(localStorage.getItem('tradeActivities') || '[]');
    if (tradeActivities.length > 0) {
        return;
    }

    const activeTrades = JSON.parse(localStorage.getItem('activeTrades') || '[]');
    if (activeTrades.length === 0) {
        return;
    }

    const migrated = activeTrades.map(trade => ({
        ...trade,
        status: trade.completionTime <= Date.now() ? 'completed' : 'pending'
    }));
    localStorage.setItem('tradeActivities', JSON.stringify(migrated.slice(0, 20)));
}

function markTradeActivityAsCompleted(tradeId) {
    if (!tradeId) return;

    const tradeActivities = JSON.parse(localStorage.getItem('tradeActivities') || '[]');
    const updated = tradeActivities.map(activity => {
        if (activity.id === tradeId) {
            return { ...activity, status: 'completed' };
        }
        return activity;
    });

    localStorage.setItem('tradeActivities', JSON.stringify(updated));
}

/**
 * Log Trade Transaction
 */
function logTradeTransaction(userId, trade) {
    // Optional: Send trade data to backend for logging
    const tradeLog = {
        userId: userId,
        marketType: trade.marketType,
        marketId: trade.marketId,
        marketName: trade.market.name,
        tradeAmount: trade.tradeAmount,
        cashoutAmount: trade.cashoutAmount,
        period: trade.period,
        timestamp: new Date().toISOString()
    };
    
    console.log('Trade logged:', tradeLog);
    
    // You can send this to backend if needed:
    // fetch(`${apiBase}/trades/log`, {
    //     method: 'POST',
    //     headers: { 'Content-Type': 'application/json' },
    //     body: JSON.stringify(tradeLog)
    // });
}

/**
 * Handle Logout
 */
function handleLogout() {
    if (confirm('Are you sure you want to logout?')) {
        localStorage.clear();
        window.location.href = 'login.html';
    }
}

/**
 * Show Notification
 */
function showNotification(message, type = 'info') {
    alert(message);
}

