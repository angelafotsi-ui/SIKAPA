const express = require('express');
const fs = require('fs');
const path = require('path');
const router = express.Router();

// Tier configuration
const TIER_CONFIG = {
  0: { required_amount: 0, daily_reward: 0.5, name: 'Starter' },
  1: { required_amount: 30, daily_reward: 8, name: 'Silver' },
  2: { required_amount: 100, daily_reward: 21, name: 'Gold' },
  3: { required_amount: 250, daily_reward: 60, name: 'Platinum' },
  4: { required_amount: 500, daily_reward: 100, name: 'Diamond' }
};

const tierClaimsPath = path.join(__dirname, '../logs/tier_claims.json');
const balancePath = path.join(__dirname, '../logs/user_balances.json');
const tierPurchasesPath = path.join(__dirname, '../logs/tier_purchases.json');

// Helper: Get user balance
function getUserBalance(userId) {
  try {
    if (fs.existsSync(balancePath)) {
      const balancesData = JSON.parse(fs.readFileSync(balancePath, 'utf8'));
      
      // Handle array format (old format)
      if (Array.isArray(balancesData)) {
        const userBalance = balancesData.find(b => b.userId === userId);
        return userBalance?.balance || 0;
      }
      
      // Handle object format (new format)
      return balancesData[userId]?.balance || 0;
    }
  } catch (err) {
    console.error('Error reading balance:', err);
  }
  return 0;
}

// Helper: Read tier claims
function getTierClaims() {
  try {
    if (fs.existsSync(tierClaimsPath)) {
      return JSON.parse(fs.readFileSync(tierClaimsPath, 'utf8'));
    }
  } catch (err) {
    console.error('Error reading tier claims:', err);
  }
  return {};
}

// Helper: Write tier claims
function saveTierClaims(data) {
  fs.writeFileSync(tierClaimsPath, JSON.stringify(data, null, 2));
}

// Helper: Read tier purchases
function getTierPurchases() {
  try {
    if (fs.existsSync(tierPurchasesPath)) {
      return JSON.parse(fs.readFileSync(tierPurchasesPath, 'utf8'));
    }
  } catch (err) {
    console.error('Error reading tier purchases:', err);
  }
  return {};
}

// Helper: Write tier purchases
function saveTierPurchases(data) {
  fs.writeFileSync(tierPurchasesPath, JSON.stringify(data, null, 2));
}

// Helper: Check if user has purchased a tier
function hasPurchasedTier(userId, tierId) {
  const purchases = getTierPurchases();
  return purchases[userId] && purchases[userId][tierId];
}

// Helper: Mark tier as purchased for user
function markTierAsPurchased(userId, tierId) {
  const purchases = getTierPurchases();
  if (!purchases[userId]) {
    purchases[userId] = {};
  }
  purchases[userId][tierId] = new Date().toISOString();
  saveTierPurchases(purchases);
}

// Helper: Check if 24 hours have passed
function canClaimTier(lastClaimTime) {
  if (!lastClaimTime) return true;
  const lastClaim = new Date(lastClaimTime);
  const now = new Date();
  const hoursPassed = (now - lastClaim) / (1000 * 60 * 60);
  return hoursPassed >= 24;
}

// Helper: Get the most recent claim from PAID TIERS ONLY (1-4) for a user
function getMostRecentPaidTierClaim(userClaims) {
  let mostRecent = null;
  let mostRecentTierId = null;
  
  // Only check paid tiers (1-4), ignore tier 0
  for (let tierId = 1; tierId <= 4; tierId++) {
    const claimTime = userClaims[tierId];
    if (claimTime) {
      if (!mostRecent || new Date(claimTime) > new Date(mostRecent)) {
        mostRecent = claimTime;
        mostRecentTierId = tierId;
      }
    }
  }
  
  return { claimTime: mostRecent, tierId: mostRecentTierId };
}

// Helper: Check if a tier is locked (user has claimed from another PAID tier recently)
function isTierLocked(userClaims, currentTierId) {
  // Tier 0 is NEVER locked - it's independent
  if (currentTierId === 0) return false;
  
  const mostRecent = getMostRecentPaidTierClaim(userClaims);
  
  // If no recent claim from paid tiers, tier is not locked
  if (!mostRecent.claimTime) return false;
  
  // If the most recent claim is from this same tier, it's not locked (just on cooldown)
  if (mostRecent.tierId === currentTierId) return false;
  
  // If more than 24 hours have passed since the most recent paid tier claim, tier is not locked
  if (canClaimTier(mostRecent.claimTime)) return false;
  
  // Otherwise, this paid tier is locked by a different paid tier
  return true;
}

// GET /api/tiers/config - Get all tier configurations
router.get('/config', (req, res) => {
  res.json(TIER_CONFIG);
});

// POST /api/tiers/access/:userId/:tierId - Purchase/Access a tier (deduct cost)
router.post('/access/:userId/:tierId', (req, res) => {
  const userId = req.params.userId;
  const tierId = parseInt(req.params.tierId);
  
  // Validate tier
  if (tierId < 0 || tierId > 4) {
    return res.status(400).json({ error: 'Invalid tier ID' });
  }

  // Tier 0 is free, no purchase needed
  if (tierId === 0) {
    return res.json({ 
      success: true,
      message: 'Starter tier is free to access'
    });
  }

  const tier = TIER_CONFIG[tierId];
  const userBalance = getUserBalance(userId);
  
  // Check if user has already purchased this tier
  if (hasPurchasedTier(userId, tierId)) {
    return res.status(400).json({ 
      error: 'You have already purchased this tier',
      tier: tier.name
    });
  }
  
  // Check if user has required balance
  if (userBalance < tier.required_amount) {
    return res.status(403).json({ 
      error: 'Insufficient balance for this tier',
      required: tier.required_amount,
      current: userBalance
    });
  }
  
  try {
    // Deduct tier cost from balance
    let balancesData = [];
    if (fs.existsSync(balancePath)) {
      const data = JSON.parse(fs.readFileSync(balancePath, 'utf8'));
      
      if (Array.isArray(data)) {
        balancesData = data;
      } else {
        balancesData = Object.keys(data).map(key => ({ userId: key, ...data[key] }));
      }
    }
    
    // Find or create user balance entry
    let userBalanceEntry = balancesData.find(b => b.userId === userId);
    if (!userBalanceEntry) {
      userBalanceEntry = { userId, balance: 0, deposited: 0, withdrawable: 0 };
      balancesData.push(userBalanceEntry);
    }
    
    // Deduct the tier cost from the balance
    userBalanceEntry.balance = Math.max(0, userBalanceEntry.balance - tier.required_amount);
    userBalanceEntry.tierCost = (userBalanceEntry.tierCost || 0) + tier.required_amount;
    userBalanceEntry.lastUpdated = new Date().toISOString();
    
    fs.writeFileSync(balancePath, JSON.stringify(balancesData, null, 2));
    
    // Mark tier as purchased
    markTierAsPurchased(userId, tierId);
    
    console.log(`[Tiers] User ${userId} purchased ${tier.name} tier for ₵${tier.required_amount}. Remaining: ₵${userBalanceEntry.balance}`);
    
    res.json({
      success: true,
      message: `Successfully purchased ${tier.name} tier`,
      tier: tier.name,
      cost: tier.required_amount,
      daily_reward: tier.daily_reward,
      remaining_balance: userBalanceEntry.balance
    });

  } catch (err) {
    console.error('Error purchasing tier:', err);
    res.status(500).json({
      error: 'Error purchasing tier',
      message: err.message
    });
  }
});

// GET /api/tiers/available/:userId - Get tiers available/accessible to user
router.get('/available/:userId', (req, res) => {
  const userId = req.params.userId;
  const userBalance = getUserBalance(userId);
  const availableTiers = [];

  // Check each tier
  for (let tierId = 0; tierId <= 4; tierId++) {
    const tier = TIER_CONFIG[tierId];
    const isAccessible = userBalance >= tier.required_amount;
    
    availableTiers.push({
      tier_id: tierId,
      name: tier.name,
      required_amount: tier.required_amount,
      daily_reward: tier.daily_reward,
      is_accessible: isAccessible,
      user_balance: userBalance
    });
  }

  res.json(availableTiers);
});

// GET /api/tiers/user/:userId - Get user's tier data with claim history
router.get('/user/:userId', (req, res) => {
  const userId = req.params.userId;
  const userBalance = getUserBalance(userId);
  const tierClaims = getTierClaims();
  const userClaims = tierClaims[userId] || {};
  
  const tierData = [];
  const mostRecentPaidTier = getMostRecentPaidTierClaim(userClaims);
  
  for (let tierId = 0; tierId <= 4; tierId++) {
    const tier = TIER_CONFIG[tierId];
    const isAccessible = userBalance >= tier.required_amount;
    const lastClaimTime = userClaims[tierId];
    const canClaim = canClaimTier(lastClaimTime);
    const isLocked = isTierLocked(userClaims, tierId);
    let nextClaimTime = null;
    let nextUnlockTime = null;
    
    if (lastClaimTime && !canClaim) {
      const nextClaim = new Date(lastClaimTime);
      nextClaim.setHours(nextClaim.getHours() + 24);
      nextClaimTime = nextClaim.toISOString();
    }
    
    // If tier is locked, show when it will unlock (based on most recent PAID tier claim)
    if (isLocked && mostRecentPaidTier.claimTime) {
      const unlockTime = new Date(mostRecentPaidTier.claimTime);
      unlockTime.setHours(unlockTime.getHours() + 24);
      nextUnlockTime = unlockTime.toISOString();
    }
    
    tierData.push({
      tier_id: tierId,
      name: tier.name,
      required_amount: tier.required_amount,
      daily_reward: tier.daily_reward,
      is_accessible: isAccessible,
      can_claim: canClaim && isAccessible && !isLocked,
      is_locked: isLocked,
      last_claim_time: lastClaimTime,
      next_claim_time: nextClaimTime,
      next_unlock_time: nextUnlockTime,
      active_paid_tier_id: mostRecentPaidTier.tierId
    });
  }
  
  res.json(tierData);
});

// POST /api/tiers/claim/:userId/:tierId - Claim reward for a tier
router.post('/claim/:userId/:tierId', (req, res) => {
  const userId = req.params.userId;
  const tierId = parseInt(req.params.tierId);
  
  // Validate tier
  if (tierId < 0 || tierId > 4) {
    return res.status(400).json({ error: 'Invalid tier ID' });
  }
  
  const tier = TIER_CONFIG[tierId];
  const userBalance = getUserBalance(userId);
  
  // Check if user has required balance
  if (userBalance < tier.required_amount) {
    return res.status(403).json({ 
      error: 'Insufficient balance for this tier',
      required: tier.required_amount,
      current: userBalance
    });
  }
  
  // Check 24-hour cooldown
  const tierClaims = getTierClaims();
  if (!tierClaims[userId]) {
    tierClaims[userId] = {};
  }
  
  const lastClaimTime = tierClaims[userId][tierId];
  if (!canClaimTier(lastClaimTime)) {
    const nextClaim = new Date(lastClaimTime);
    nextClaim.setHours(nextClaim.getHours() + 24);
    return res.status(429).json({
      error: 'Reward already claimed. Try again after 24 hours',
      last_claim: lastClaimTime,
      next_available: nextClaim.toISOString()
    });
  }
  
  // Check if tier is locked (user claimed from another paid tier recently)
  if (isTierLocked(tierClaims[userId], tierId)) {
    const mostRecentPaid = getMostRecentPaidTierClaim(tierClaims[userId]);
    const unlockTime = new Date(mostRecentPaid.claimTime);
    unlockTime.setHours(unlockTime.getHours() + 24);
    
    return res.status(429).json({
      error: 'This tier is locked. You can only claim from one paid tier at a time.',
      locked_reason: `You recently claimed from ${TIER_CONFIG[mostRecentPaid.tierId].name} tier`,
      active_paid_tier_id: mostRecentPaid.tierId,
      active_paid_tier_name: TIER_CONFIG[mostRecentPaid.tierId].name,
      tier_unlocks_at: unlockTime.toISOString()
    });
  }
  
  // Record the claim
  tierClaims[userId][tierId] = new Date().toISOString();
  saveTierClaims(tierClaims);
  
  // Track cumulative earnings in tier_earnings.json
  try {
    const tierEarningsPath = path.join(__dirname, '../logs/tier_earnings.json');
    let tierEarnings = {};
    
    if (fs.existsSync(tierEarningsPath)) {
      const data = JSON.parse(fs.readFileSync(tierEarningsPath, 'utf8'));
      tierEarnings = data;
    }
    
    if (!tierEarnings[userId]) {
      tierEarnings[userId] = {
        totalEarned: 0,
        claims: []
      };
    }
    
    // Add the reward to cumulative earnings
    tierEarnings[userId].totalEarned += tier.daily_reward;
    tierEarnings[userId].claims.push({
      tierId: tierId,
      tierName: tier.name,
      reward: tier.daily_reward,
      claimedAt: new Date().toISOString()
    });
    
    fs.writeFileSync(tierEarningsPath, JSON.stringify(tierEarnings, null, 2));
    console.log(`[Tiers] Added ₵${tier.daily_reward} to total earnings for user ${userId}. Total earned: ₵${tierEarnings[userId].totalEarned}`);
  } catch (err) {
    console.error('Error tracking tier earnings:', err);
  }
  
  // Add reward to user balance (stored in balance system for withdrawable amount)
  try {
    let balancesData = [];
    if (fs.existsSync(balancePath)) {
      const data = JSON.parse(fs.readFileSync(balancePath, 'utf8'));
      
      // Handle both array and object formats
      if (Array.isArray(data)) {
        balancesData = data;
      } else {
        // Convert object format to array format
        balancesData = Object.keys(data).map(key => ({ userId: key, ...data[key] }));
      }
    }
    
    // Find or create user balance entry
    let userBalanceEntry = balancesData.find(b => b.userId === userId);
    if (!userBalanceEntry) {
      userBalanceEntry = { userId, balance: 0, withdrawable: 0 };
      balancesData.push(userBalanceEntry);
    }
    
    // Add to withdrawable amount
    userBalanceEntry.withdrawable = (userBalanceEntry.withdrawable || 0) + tier.daily_reward;
    userBalanceEntry.lastUpdated = new Date().toISOString();
    
    fs.writeFileSync(balancePath, JSON.stringify(balancesData, null, 2));
    
    console.log(`[Tiers] Added ₵${tier.daily_reward} to withdrawable amount for user ${userId}. Total withdrawable: ₵${userBalanceEntry.withdrawable}`);
  } catch (err) {
    console.error('Error updating balance:', err);
  }
  
  res.json({
    success: true,
    message: `Claimed GH${tier.daily_reward} from ${tier.name} tier`,
    reward: tier.daily_reward,
    tier: tier.name,
    claim_time: tierClaims[userId][tierId],
    next_available: new Date(new Date().getTime() + 24 * 60 * 60 * 1000).toISOString()
  });
});

// GET /api/tiers/withdrawable/:userId - Get total withdrawable amount from tier rewards
router.get('/withdrawable/:userId', (req, res) => {
  const userId = req.params.userId;
  try {
    let withdrawable = 0;
    if (fs.existsSync(balancePath)) {
      const balancesData = JSON.parse(fs.readFileSync(balancePath, 'utf8'));
      
      // Handle array format (old format)
      if (Array.isArray(balancesData)) {
        const userBalance = balancesData.find(b => b.userId === userId);
        withdrawable = userBalance?.withdrawable || 0;
      } else {
        // Handle object format (new format)
        withdrawable = balancesData[userId]?.withdrawable || 0;
      }
    }
    
    res.json({ withdrawable });
  } catch (err) {
    console.error('Error getting withdrawable amount:', err);
    res.json({ withdrawable: 0 });
  }
});

module.exports = router;
