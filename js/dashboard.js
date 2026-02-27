/* Dashboard JavaScript */

// API Base URL
const apiBase = window.location.hostname === 'localhost' 
    ? 'http://localhost:3000/api'
    : 'https://sikapa-bwxu.onrender.com/api';

// Initialize Dashboard
document.addEventListener('DOMContentLoaded', function() {
    if (!isUserLoggedIn()) {
        window.location.href = 'login.html';
        return;
    }
    loadUserProfile();
    loadUserStats();
    loadTransactions();
    loadReferralStats();
    setInterval(loadUserStats, 10000);
    setInterval(loadTransactions, 30000);
    setInterval(loadReferralStats, 30000);
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
    
    // Load tier data when switching to quantify tab
    if (tabId === 'quantify-tab') {
        loadTiers();
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

        // Generate referral code and link
        const referralCode = `SKP${userId.substring(0, 8).toUpperCase()}`;
        document.getElementById('referralCode').textContent = referralCode;
        
        const referralLink = `${window.location.origin}?ref=${referralCode}`;
        document.getElementById('referralLink').value = referralLink;

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

        // Fetch user balance
        const balanceResponse = await fetch(`${apiBase}/balance/user/${userId}`, {
            headers: {
                'Authorization': `Bearer ${authToken}`,
                'Content-Type': 'application/json'
            }
        });

        if (balanceResponse.ok) {
            const balanceData = await balanceResponse.json();
            const balance = balanceData.balance || 0;

            document.getElementById('homeBalance').textContent = balance.toFixed(2);
            document.getElementById('profileTotalRevenue').textContent = balance.toFixed(2);
        }

        // Fetch user stats (commission today, today's earning, recharge amount, total revenue)
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
            
            // Display total balance (account balance + withdrawable tier rewards)
            document.getElementById('homeBalance').textContent = (stats.totalBalance || 0).toFixed(2);
            document.getElementById('profileTotalRevenue').textContent = (stats.totalBalance || 0).toFixed(2);
            
            // Display withdrawable amount (tier rewards only)
            if (document.getElementById('withdrawableAmount')) {
                document.getElementById('withdrawableAmount').textContent = (stats.withdrawableAmount || 0).toFixed(2);
            }
            
            // Display transaction statistics
            document.getElementById('totalRevenue').textContent = (stats.totalRevenue || 0).toFixed(2);
            document.getElementById('commissionToday').textContent = (stats.commissionToday || 0).toFixed(2);
            document.getElementById('todayEarning').textContent = (stats.todayEarning || 0).toFixed(2);
            document.getElementById('rechargeAmount').textContent = (stats.rechargeAmount || 0).toFixed(2);

            // Update tier reward stats
            if (document.getElementById('tierClaimedToday')) {
                document.getElementById('tierClaimedToday').textContent = stats.tierClaimedToday || 0;
            }
            if (document.getElementById('tierEarnings')) {
                document.getElementById('tierEarnings').textContent = (stats.totalTierEarnings || 0).toFixed(2);
            }

            // Update profile tab stats
            document.getElementById('profileTotalRevenue').textContent = (stats.totalBalance || 0).toFixed(2);
            document.getElementById('profileCommissionToday').textContent = (stats.commissionToday || 0).toFixed(2);
            document.getElementById('profileTodayEarning').textContent = (stats.todayEarning || 0).toFixed(2);
            document.getElementById('profileRechargeAmount').textContent = (stats.rechargeAmount || 0).toFixed(2);

            // Note: friendsInvited and referralCommission are now handled by loadReferralStats()
        }

    } catch (error) {
        console.error('Error loading user stats:', error);
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
        'commission': '#667eea33',
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
 * Load Tiers Data
 */
async function loadTiers() {
    const userId = localStorage.getItem('userId') || localStorage.getItem('user_uid');
    
    try {
        const response = await fetch(`${apiBase}/tiers/user/${userId}`);
        if (!response.ok) throw new Error('Failed to fetch tiers');
        
        const tiers = await response.json();
        displayTiers(tiers, userId);
    } catch (error) {
        console.error('Error loading tiers:', error);
        document.getElementById('tiersList').innerHTML = `
            <div class="error-state">
                <i class="fas fa-exclamation-circle"></i>
                <p>Failed to load tiers</p>
            </div>
        `;
    }
}

/**
 * Display Tier Cards
 */
function displayTiers(tiers, userId) {
    const tiersList = document.getElementById('tiersList');
    
    if (!tiers || tiers.length === 0) {
        tiersList.innerHTML = '<p>No tiers available</p>';
        return;
    }
    
    tiersList.innerHTML = tiers.map(tier => {
        const isAccessible = tier.is_accessible;
        const canClaim = tier.can_claim;
        const isLocked = tier.is_locked;
        const lastClaim = tier.last_claim_time ? new Date(tier.last_claim_time) : null;
        const nextClaim = tier.next_claim_time ? new Date(tier.next_claim_time) : null;
        const nextUnlock = tier.next_unlock_time ? new Date(tier.next_unlock_time) : null;
        
        let buttonHTML = '';
        let statusClass = 'locked';
        let statusText = 'LOCKED';
        
        if (!isAccessible && tier.tier_id !== 0) {
            buttonHTML = `<button class="tier-action-btn tier-locked-btn" disabled>
                LOCKED - Need ₵${tier.required_amount}
            </button>`;
            statusClass = 'locked';
            statusText = 'LOCKED';
        } else if (isLocked && tier.tier_id !== 0) {
            // Tier is locked because user claimed from another paid tier
            const timeRemaining = getTimeRemaining(nextUnlock);
            buttonHTML = `
                <button class="tier-action-btn tier-locked-btn" disabled>
                    LOCKED - CLAIM FROM TIER ${tier.active_paid_tier_id}
                </button>
                <div class="cooldown-timer">Unlocks in ${timeRemaining}</div>
            `;
            statusClass = 'locked';
            statusText = 'LOCKED';
        } else if (canClaim) {
            buttonHTML = `<button class="tier-action-btn tier-claim-btn" onclick="claimTierReward(${tier.tier_id}, '${userId}')">
                CLAIM ₵${tier.daily_reward} REWARD
            </button>`;
            statusClass = 'unlocked';
            statusText = 'READY';
        } else {
            const timeRemaining = getTimeRemaining(nextClaim);
            buttonHTML = `
                <button class="tier-action-btn tier-cooldown-btn" disabled>
                    CLAIMED - COOLDOWN
                </button>
                <div class="cooldown-timer">Available in ${timeRemaining}</div>
            `;
            statusClass = 'claimed';
            statusText = 'CLAIMED';
        }
        
        return `
            <div class="tier-card tier-${tier.tier_id} ${statusClass}">
                <div class="tier-card-header">
                    <div class="tier-name">
                        <div class="tier-icon">
                            ${getTierIcon(tier.tier_id)}
                        </div>
                        <div class="tier-title">
                            <h3>${tier.name} Tier</h3>
                            <p>Tier ${tier.tier_id}</p>
                        </div>
                    </div>
                    <div class="tier-status ${statusClass}">
                        ${statusText}
                    </div>
                </div>
                
                <div class="tier-card-body">
                    <div class="tier-requirements">
                        <div class="requirement-box required">
                            <div class="label">Required Balance</div>
                            <div class="value">₵${tier.required_amount}</div>
                        </div>
                        <div class="requirement-box reward">
                            <div class="label">Daily Reward</div>
                            <div class="value">₵${tier.daily_reward}</div>
                        </div>
                    </div>
                </div>
                
                ${buttonHTML}
            </div>
        `;
    }).join('');
}

/**
 * Get Tier Icon
 */
function getTierIcon(tierId) {
    const icons = {
        0: '<i class="fas fa-star"></i>',
        1: '<i class="fas fa-shield-alt"></i>',
        2: '<i class="fas fa-crown"></i>',
        3: '<i class="fas fa-gem"></i>',
        4: '<i class="fas fa-trophy"></i>'
    };
    return icons[tierId] || '<i class="fas fa-star"></i>';
}

/**
 * Get Time Remaining
 */
function getTimeRemaining(futureDate) {
    if (!futureDate) return 'soon';
    
    const now = new Date();
    const diff = futureDate - now;
    
    if (diff <= 0) return 'now';
    
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    
    if (hours > 0) {
        return `${hours}h ${minutes}m`;
    } else {
        return `${minutes}m`;
    }
}

/**
 * Claim Tier Reward
 */
async function claimTierReward(tierId, userId) {
    try {
        const button = event.target;
        button.disabled = true;
        button.textContent = 'Processing...';
        
        const response = await fetch(`${apiBase}/tiers/claim/${userId}/${tierId}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            }
        });
        
        const data = await response.json();
        
        if (response.ok) {
            showNotification(`Claimed ₵${data.reward} from ${data.tier} tier!`, 'success');
            // Reload stats and tiers to update the display
            loadUserStats();
            loadTiers();
        } else {
            // Handle locked tier error
            if (data.locked_reason) {
                const unlockTime = new Date(data.tier_unlocks_at);
                const formattedTime = unlockTime.toLocaleTimeString();
                showNotification(`This tier is locked. ${data.locked_reason}. Unlocks at ${formattedTime}`, 'error');
            } else {
                showNotification(data.error || 'Failed to claim reward', 'error');
            }
            button.disabled = false;
            button.textContent = `CLAIM ₵${data.reward || 'Reward'} REWARD`;
        }
    } catch (error) {
        console.error('Error claiming reward:', error);
        showNotification('Error claiming reward', 'error');
        if (event.target) {
            event.target.disabled = false;
        }
    }
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

