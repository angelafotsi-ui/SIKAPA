// ============================================
// SIKAPA ACTIVITY NOTIFICATIONS SYSTEM
// ============================================

const ACTIVITIES = [
  // 40 seconds
  { text: "Joseph Akong just deposited GH₵540.00", icon: "💳", delay: 40 },
  { text: "David Kwadwo Osei just initiated GH₵250.00 - Bitcoin", icon: "₿", delay: 40 },
  { text: "Emelia just deposited GH₵300.00", icon: "💳", delay: 40 },
  
  // 60 seconds
  { text: "Kofi Oppong just Withdrew GH₵2367.00", icon: "🔄", delay: 60 },
  { text: "Jojo Frimpong just deposited GH₵400.00", icon: "💳", delay: 60 },
  { text: "Christian Mensah just Withdrew GH₵1890.00", icon: "🔄", delay: 60 },
  
  // 120 seconds
  { text: "Clifford just Withdrew GH₵2700.00", icon: "🔄", delay: 120 },
  { text: "Nii Quaye just Withdrew GH₵170.00", icon: "🔄", delay: 120 },
  { text: "Akorfa Mabel just deposited GH₵900.00", icon: "💳", delay: 120 },
  { text: "Fiifi Benjamin just initiated GH₵189.00 - Solana", icon: "◎", delay: 120 },
  
  // 180 seconds
  { text: "Denis Morris just deposited GH₵320.00", icon: "💳", delay: 180 },
  { text: "Jonathan just deposited GH₵450.00", icon: "💳", delay: 180 },
  { text: "Godfred just deposited GH₵270.00", icon: "💳", delay: 180 },
  { text: "Jonathan just initiated GH₵150.00 - Fish Farming", icon: "🐟", delay: 180 },
  
  // 600 seconds
  { text: "Godfred just initiated GH₵250.00 - USDT Market", icon: "💵", delay: 600 },
  { text: "Emelia just initiated GH₵300.00 - Cattle Farming", icon: "🐄", delay: 600 },
  { text: "Denis Morris just initiated GH₵300.00 - Cattle Farming", icon: "🐄", delay: 600 },
  { text: "Jojo Frimpong just Initiated GH₵300.00 - Cattle Farming", icon: "🐄", delay: 600 },
  { text: "Godfred just initiated GH₵20.00 - Snail Farming", icon: "🐌", delay: 600 },
  { text: "Jojo Frimpong just Initiated GH₵100.00 - Pig Farming", icon: "🐷", delay: 600 }
];

let notificationId = 0;
let notificationTimeouts = [];
const DISPLAY_TIME = 5000; // 5 seconds to display
const ANIMATION_TIME = 500; // 0.5 seconds for exit animation
const MIN_INTERVAL = 5000; // 5 seconds minimum between notifications
const MAX_INTERVAL = 15000; // 15 seconds maximum between notifications

function getRandomInterval() {
  return Math.random() * (MAX_INTERVAL - MIN_INTERVAL) + MIN_INTERVAL;
}

function getContainer() {
  return document.getElementById('notificationContainer');
}

function showNotification(activity) {
  const container = getContainer();
  if (!container) return;

  const id = notificationId++;
  const notif = document.createElement('div');
  notif.className = 'notification-item';
  notif.id = `notif-${id}`;
  notif.innerHTML = `
    <span class="notification-icon">${activity.icon}</span>
    <span class="notification-text">${activity.text}</span>
    <button class="notification-close" type="button">×</button>
  `;

  const closeBtn = notif.querySelector('.notification-close');
  const remove = () => {
    notif.classList.add('removing');
    setTimeout(() => {
      if (notif.parentElement) notif.remove();
    }, ANIMATION_TIME);
  };

  closeBtn.addEventListener('click', remove);
  notif.addEventListener('click', remove);

  container.appendChild(notif);

  // Auto-remove after display time
  const timeout = setTimeout(() => {
    if (notif.parentElement) remove();
  }, DISPLAY_TIME);

  return timeout;
}

function scheduleSequentialNotifications() {
  console.log('📢 Sequential notifications scheduled - first drops in 40 seconds');
  
  let cumulativeDelay = 40000; // Start at 40 seconds

  ACTIVITIES.forEach((activity, index) => {
    const randomInterval = getRandomInterval();
    const delay = cumulativeDelay + randomInterval;

    const timeout = setTimeout(() => {
      showNotification(activity);
      console.log(`✓ ${activity.text}`);
    }, delay);

    notificationTimeouts.push(timeout);
    // Update cumulative delay for next notification
    cumulativeDelay = delay + DISPLAY_TIME + ANIMATION_TIME;
  });
}

// Start when ready
function startNotifications() {
  if (getContainer()) {
    scheduleSequentialNotifications();
  }
}

// Run on ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', startNotifications);
} else {
  startNotifications();
}

// Cleanup and restart function
window.testNotifications = function(offset = 40) {
  notificationTimeouts.forEach(clearTimeout);
  notificationTimeouts = [];
  const container = getContainer();
  if (container) {
    container.innerHTML = '';
    notificationId = 0;
    console.log(`🔄 Sequential notifications reset - first in ${offset}s with 5-15s random intervals`);
    
    let cumulativeDelay = offset * 1000;

    ACTIVITIES.forEach((activity) => {
      const randomInterval = getRandomInterval();
      const delay = cumulativeDelay + randomInterval;

      const timeout = setTimeout(() => showNotification(activity), delay);
      notificationTimeouts.push(timeout);
      
      cumulativeDelay = delay + DISPLAY_TIME + ANIMATION_TIME;
    });
  } else {
    console.warn('⚠️ No notification container found!');
  }
};
