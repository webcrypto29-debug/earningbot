const express = require('express');
const { Telegraf } = require('telegraf');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(express.json());
app.use(cors());

// 1. MongoDB Connection
const MONGO_URI = process.env.MONGO_URI || '';
if (MONGO_URI) {
  mongoose.connect(MONGO_URI)
    .then(() => console.log('MongoDB Connected Successfully'))
    .catch((err) => console.error('MongoDB Connection Error:', err));
} else {
  console.log('MongoDB URI missing in environment variables.');
}

// 2. User Schema (Database Structure)
const userSchema = new mongoose.Schema({
  telegramId: { type: Number, required: true, unique: true },
  username: String,
  firstName: String,
  credits: { type: Number, default: 0 },
  usdtBalance: { type: Number, default: 0 },
  completedTasks: [String],
  claimedCodes: [String],
  joinedAt: { type: Date, default: Date.now }
});

const User = mongoose.model('User', userSchema);

// 3. Telegram Bot Setup
const BOT_TOKEN = process.env.BOT_TOKEN || '';
const bot = new Telegraf(BOT_TOKEN);

// Bot Start Command
bot.start(async (ctx) => {
  const { id, username, first_name } = ctx.from;

  try {
    if (mongoose.connection.readyState === 1) {
      let user = await User.findOne({ telegramId: id });
      if (!user) {
        user = new User({
          telegramId: id,
          username: username || '',
          firstName: first_name || 'User'
        });
        await user.save();
      }
    }

    // Mini App Link (Vercel deployment URL)
    const webAppUrl = process.env.VERCEL_URL 
      ? `https://${process.env.VERCEL_URL}` 
      : 'https://your-vercel-app.vercel.app';

    ctx.reply(`नमस्ते ${first_name}! 🚀\nअर्निंग शुरू करने के लिए नीचे दिए गए बटन पर क्लिक करें:`, {
      reply_markup: {
        inline_keyboard: [
          [{ text: "💰 Open Mini App", web_app: { url: webAppUrl } }]
        ]
      }
    });
  } catch (err) {
    console.error("Error in /start:", err);
    ctx.reply("कुछ गड़बड़ हुई, कृपया बाद में प्रयास करें।");
  }
});

// 4. API Endpoints for Frontend (Mini App)

// Get User Profile
app.get('/api/user/:id', async (req, res) => {
  try {
    const user = await User.findOne({ telegramId: req.params.id });
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update Credits / Earnings
app.post('/api/earn', async (req, res) => {
  const { telegramId, amount, type } = req.body;
  try {
    const user = await User.findOne({ telegramId });
    if (!user) return res.status(404).json({ error: 'User not found' });

    if (type === 'usdt') {
      user.usdtBalance += amount;
    } else {
      user.credits += amount;
    }

    await user.save();
    res.json({ success: true, credits: user.credits, usdtBalance: user.usdtBalance });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Base Route
app.get('/', (req, res) => {
  res.send('Earning Bot Backend Server is Live!');
});

// 5. Telegram Webhook Endpoint (For Vercel)
app.post('/api/webhook', (req, res) => {
  bot.handleUpdate(req.body, res);
});

// 6. Local Testing Mode (Termux / PC)
if (process.env.NODE_ENV !== 'production') {
  if (BOT_TOKEN) {
    bot.launch().then(() => console.log('Bot running in Polling Mode (Local Testing)'));
  }
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
}

module.exports = app;

