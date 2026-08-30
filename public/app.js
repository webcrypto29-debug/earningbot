// Initialize Telegram WebApp SDK
const tg = window.Telegram?.WebApp;
if (tg) {
  tg.expand(); // Make Mini App full screen
}

// Default / Fallback User Data
let user = {
  telegramId: tg?.initDataUnsafe?.user?.id || 12345678,
  firstName: tg?.initDataUnsafe?.user?.first_name || 'Guest User',
  credits: 0,
  usdtBalance: 0.00
};

// UI Elements
const userNameEl = document.getElementById('user-name');
const userIdEl = document.getElementById('user-id');
const creditsValEl = document.getElementById('credits-val');
const usdtValEl = document.getElementById('usdt-val');

// Initialize App
document.addEventListener('DOMContentLoaded', () => {
  setupNavigation();
  loadUserData();
  setupEventListeners();
});

// 1. Navigation Logic (Tab Switch)
function setupNavigation() {
  const navBtns = document.querySelectorAll('.nav-btn');
  const tabContents = document.querySelectorAll('.tab-content');

  navBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const targetTab = btn.getAttribute('data-tab');

      navBtns.forEach(b => b.classList.remove('active'));
      tabContents.forEach(c => c.classList.remove('active'));

      btn.classList.add('active');
      document.getElementById(targetTab).classList.add('active');
    });
  });
}

// 2. Load User Profile from Backend API
async function loadUserData() {
  userNameEl.textContent = user.firstName;
  userIdEl.textContent = `ID: ${user.telegramId}`;

  try {
    const res = await fetch(`/api/user/${user.telegramId}`);
    if (res.ok) {
      const data = await res.json();
      user.credits = data.credits || 0;
      user.usdtBalance = data.usdtBalance || 0;
      updateUI();
    }
  } catch (err) {
    console.log('Local Testing Mode or Network Error:', err);
    updateUI();
  }
}

function updateUI() {
  creditsValEl.textContent = user.credits;
  usdtValEl.textContent = `$${user.usdtBalance.toFixed(2)}`;
}

// 3. Add Credits via Backend API
async function addReward(amount, type = 'credits') {
  try {
    const res = await fetch('/api/earn', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        telegramId: user.telegramId,
        amount: amount,
        type: type
      })
    });

    if (res.ok) {
      const data = await res.json();
      user.credits = data.credits;
      user.usdtBalance = data.usdtBalance;
      updateUI();
    } else {
      // Fallback for local testing
      if (type === 'usdt') user.usdtBalance += amount;
      else user.credits += amount;
      updateUI();
    }
  } catch (err) {
    if (type === 'usdt') user.usdtBalance += amount;
    else user.credits += amount;
    updateUI();
  }
}

// 4. Event Listeners Setup
function setupEventListeners() {
  // Daily Bonus
  document.getElementById('daily-claim-btn').addEventListener('click', (e) => {
    addReward(50, 'credits');
    e.target.disabled = true;
    e.target.textContent = 'Claimed!';
    alert('50 Credits Claimed Successfully!');
  });

  // Watch Ads Timer (15 Seconds)
  document.querySelectorAll('.watch-ad-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const adUrl = e.target.getAttribute('data-url');
      const reward = parseInt(e.target.getAttribute('data-reward'));

      window.open(adUrl, '_blank'); // Open Ad / Direct Link

      let timeLeft = 15;
      e.target.disabled = true;
      
      const timer = setInterval(() => {
        e.target.textContent = `Wait (${timeLeft}s)`;
        timeLeft--;

        if (timeLeft < 0) {
          clearInterval(timer);
          e.target.textContent = 'Claimed!';
          addReward(reward, 'credits');
          alert(`Awesome! You earned +${reward} Credits.`);
        }
      }, 1000);
    });
  });

  // Code Redeem
  document.getElementById('submit-code-btn').addEventListener('click', () => {
    const codeInput = document.getElementById('promo-code-input').value.trim();
    if (!codeInput) return alert('Enter a valid code!');

    if (codeInput.toUpperCase() === 'EARN100') {
      addReward(100, 'credits');
      alert('Code Redeemed! +100 Credits Added.');
      document.getElementById('promo-code-input').value = '';
    } else {
      alert('Invalid Promo Code!');
    }
  });

  // Social Tasks
  document.querySelectorAll('.task-sub-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const reward = parseInt(e.target.getAttribute('data-reward'));
      addReward(reward, 'credits');
      e.target.disabled = true;
      e.target.textContent = 'Completed';
      alert(`Task Completed! +${reward} Credits Added.`);
    });
  });

  // Spin The Wheel Logic
  const wheel = document.getElementById('wheel');
  const spinBtn = document.getElementById('spin-btn');
  let currentRotation = 0;

  spinBtn.addEventListener('click', () => {
    if (user.credits < 50) {
      return alert('You need at least 50 Credits to spin the wheel!');
    }

    // Deduct 50 credits for spin
    addReward(-50, 'credits');

    // Spin animation calculation
    const randomDegree = Math.floor(Math.random() * 360) + 1440; // At least 4 full turns
    currentRotation += randomDegree;
    wheel.style.transform = `rotate(${currentRotation}deg)`;

    spinBtn.disabled = true;

    setTimeout(() => {
      spinBtn.disabled = false;
      // Random reward outcome
      const rewards = [
        { type: 'usdt', amount: 0.01, text: '$0.01 USDT' },
        { type: 'credits', amount: 10, text: '10 Credits' },
        { type: 'usdt', amount: 0.05, text: '$0.05 USDT' },
        { type: 'credits', amount: 0, text: 'Better Luck Next Time!' },
        { type: 'usdt', amount: 0.10, text: '$0.10 USDT' },
        { type: 'credits', amount: 50, text: '50 Credits' }
      ];

      const won = rewards[Math.floor(Math.random() * rewards.length)];
      if (won.amount > 0) {
        addReward(won.amount, won.type);
        alert(`Congratulations! You won ${won.text}`);
      } else {
        alert(won.text);
      }
    }, 4000); // 4 Seconds Animation Delay
  });
}

