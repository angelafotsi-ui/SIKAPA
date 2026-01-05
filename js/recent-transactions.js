/**
 * Recent Transactions Module
 * Handles fetching, displaying, and polling for transaction updates
 */

class RecentTransactionsManager {
    constructor(config = {}) {
        this.containerId = config.containerId || 'recent-transactions-container';
        this.pollInterval = config.pollInterval || 5000; // 5 seconds
        this.userId = null;
        this.transactions = [];
        this.pollingHandle = null;
        this.lastTransactionIds = new Set();
        
        // Initialize on load
        this.init();
    }

    init() {
        document.addEventListener('DOMContentLoaded', () => {
            this.userId = localStorage.getItem('userId');
            if (this.userId) {
                this.render();
                this.loadTransactions();
                this.startPolling();
            }
        });
    }

    render() {
        const container = document.getElementById(this.containerId);
        if (!container) {
            console.warn(`[RecentTransactions] Container with ID "${this.containerId}" not found`);
            return;
        }

        container.innerHTML = `
            <div class="recent-transactions-section">
                <h3>📊 Recent Transactions</h3>
                <div id="transactions-content" class="transactions-content">
                    <div class="transactions-loading">
                        <div class="loading-spinner"></div>
                    </div>
                </div>
            </div>
        `;
    }

    async loadTransactions() {
        try {
            const response = await fetch(`/api/transactions/user/${this.userId}`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
                    'Content-Type': 'application/json'
                }
            });

            const data = await response.json();

            if (data.success) {
                this.updateTransactions(data.transactions || []);
            } else {
                console.error('[RecentTransactions] Failed to load transactions:', data.message);
                this.showError(data.message);
            }
        } catch (error) {
            console.error('[RecentTransactions] Error loading transactions:', error);
            this.showError('Failed to load transactions');
        }
    }

    updateTransactions(newTransactions) {
        this.transactions = newTransactions;
        this.renderTransactionsList();
        this.updateLastTransactionIds();
    }

    renderTransactionsList() {
        const content = document.getElementById('transactions-content');
        if (!content) return;

        if (this.transactions.length === 0) {
            content.innerHTML = `
                <div class="empty-state">
                    <div class="empty-state-icon">📭</div>
                    <div class="empty-state-text">No transactions yet</div>
                    <div class="empty-state-subtext">Your recent transactions will appear here</div>
                </div>
            `;
            return;
        }

        const transactionsHTML = this.transactions.map(transaction => {
            const date = new Date(transaction.createdAt);
            const formattedDate = this.formatDate(date);
            const icon = transaction.type === 'cashout' ? '💰' : '🏦';
            const typeLabel = transaction.type === 'cashout' ? 'Cashout' : 'Withdrawal';
            
            return `
                <div class="transaction-item" data-transaction-id="${transaction.id}">
                    <div class="transaction-info">
                        <div class="transaction-icon ${transaction.type}">
                            ${icon}
                        </div>
                        <div class="transaction-details">
                            <div class="transaction-type">${typeLabel}</div>
                            <div class="transaction-date">${formattedDate}</div>
                        </div>
                    </div>
                    <div class="transaction-amount">
                        $${transaction.amount.toFixed(2)}
                    </div>
                    <div class="transaction-status">
                        <span class="status-badge ${transaction.status}">
                            ${this.formatStatusText(transaction.status)}
                        </span>
                    </div>
                </div>
            `;
        }).join('');

        content.innerHTML = `<div class="transactions-list">${transactionsHTML}</div>`;
    }

    formatDate(date) {
        const now = new Date();
        const diffMs = now - date;
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);

        if (diffMins < 1) return 'Just now';
        if (diffMins < 60) return `${diffMins}m ago`;
        if (diffHours < 24) return `${diffHours}h ago`;
        if (diffDays < 7) return `${diffDays}d ago`;

        return date.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
        });
    }

    formatStatusText(status) {
        const statusMap = {
            'pending': 'Pending',
            'approved': 'Approved',
            'success': 'Success',
            'rejected': 'Rejected',
            'failed': 'Failed'
        };
        return statusMap[status] || status.charAt(0).toUpperCase() + status.slice(1);
    }

    showError(message) {
        const content = document.getElementById('transactions-content');
        if (content) {
            content.innerHTML = `
                <div class="empty-state">
                    <div class="empty-state-icon">❌</div>
                    <div class="empty-state-text">Error loading transactions</div>
                    <div class="empty-state-subtext">${message}</div>
                </div>
            `;
        }
    }

    updateLastTransactionIds() {
        this.lastTransactionIds.clear();
        this.transactions.forEach(t => {
            this.lastTransactionIds.add(t.id);
        });
    }

    startPolling() {
        // Clear any existing polling
        if (this.pollingHandle) {
            clearInterval(this.pollingHandle);
        }

        // Start polling for updates
        this.pollingHandle = setInterval(() => {
            this.checkForUpdates();
        }, this.pollInterval);
    }

    stopPolling() {
        if (this.pollingHandle) {
            clearInterval(this.pollingHandle);
            this.pollingHandle = null;
        }
    }

    async checkForUpdates() {
        try {
            const response = await fetch(`/api/transactions/user/${this.userId}`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
                    'Content-Type': 'application/json'
                }
            });

            const data = await response.json();

            if (data.success) {
                const newTransactions = data.transactions || [];
                
                // Check if transactions have changed
                if (this.hasTransactionsChanged(newTransactions)) {
                    console.log('[RecentTransactions] Updates detected, refreshing...');
                    this.updateTransactions(newTransactions);
                    this.triggerNotificationIfStatusChanged(newTransactions);
                }
            }
        } catch (error) {
            console.error('[RecentTransactions] Error checking for updates:', error);
        }
    }

    hasTransactionsChanged(newTransactions) {
        if (newTransactions.length !== this.transactions.length) {
            return true;
        }

        for (let i = 0; i < newTransactions.length; i++) {
            const newTx = newTransactions[i];
            const oldTx = this.transactions[i];

            if (newTx.status !== oldTx.status ||
                newTx.amount !== oldTx.amount ||
                newTx.createdAt !== oldTx.createdAt) {
                return true;
            }
        }

        return false;
    }

    triggerNotificationIfStatusChanged(newTransactions) {
        // Compare with old transactions to find status changes
        newTransactions.forEach(newTx => {
            const oldTx = this.transactions.find(t => t.id === newTx.id);
            
            if (oldTx && oldTx.status !== newTx.status) {
                this.showNotification(newTx);
            }
        });
    }

    showNotification(transaction) {
        const message = `Transaction ${transaction.type} for $${transaction.amount.toFixed(2)} is now ${transaction.status}`;
        
        // Show browser notification if permitted
        if ('Notification' in window && Notification.permission === 'granted') {
            new Notification('Transaction Updated', {
                body: message,
                icon: transaction.type === 'cashout' ? '💰' : '🏦'
            });
        }

        // Show in-page notification
        this.showInPageNotification(message, transaction.status);
    }

    showInPageNotification(message, status) {
        const notificationDiv = document.createElement('div');
        notificationDiv.className = `transaction-notification notification-${status}`;
        notificationDiv.innerHTML = `
            <span>${message}</span>
            <button onclick="this.parentElement.remove()" style="background: none; border: none; color: inherit; cursor: pointer; font-size: 1.2em;">×</button>
        `;
        
        // Add to page
        document.body.insertBefore(notificationDiv, document.body.firstChild);

        // Auto-remove after 5 seconds
        setTimeout(() => {
            if (notificationDiv.parentElement) {
                notificationDiv.remove();
            }
        }, 5000);
    }

    destroy() {
        this.stopPolling();
    }
}

// Initialize on page load
const recentTransactionsManager = new RecentTransactionsManager({
    containerId: 'recent-transactions-container',
    pollInterval: 5000 // Poll every 5 seconds
});

// Request notification permission
if ('Notification' in window && Notification.permission === 'default') {
    Notification.requestPermission();
}
