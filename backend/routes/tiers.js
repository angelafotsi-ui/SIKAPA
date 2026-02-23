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

// Helper: Check if 24 hours have passed
function canClaimTier(lastClaimTime) {
  if (!lastClaimTime) return true;
  const lastClaim = new Date(lastClaimTime);
  const now = new Date();
  const hoursPassed = (now - lastClaim) / (1000 * 60 * 60);
  return hoursPassed >= 24;
}

// GET /api/tiers/config - Get all tier configurations
router.get('/config', (req, res) => {
  res.json(TIER_CONFIG);
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
  
  for (let tierId = 0; tierId <= 4; tierId++) {
    const tier = TIER_CONFIG[tierId];
    const isAccessible = userBalance >= tier.required_amount;
    const lastClaimTime = userClaims[tierId];
    const canClaim = canClaimTier(lastClaimTime);
    let nextClaimTime = null;
    
    if (lastClaimTime && !canClaim) {
      const nextClaim = new Date(lastClaimTime);
      nextClaim.setHours(nextClaim.getHours() + 24);
      nextClaimTime = nextClaim.toISOString();
    }
    
    tierData.push({
      tier_id: tierId,
      name: tier.name,
      required_amount: tier.required_amount,
      daily_reward: tier.daily_reward,
      is_accessible: isAccessible,
      can_claim: canClaim && isAccessible,
      last_claim_time: lastClaimTime,
      next_claim_time: nextClaimTime
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
  
  // Record the claim
  tierClaims[userId][tierId] = new Date().toISOString();
  saveTierClaims(tierClaims);
  
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
