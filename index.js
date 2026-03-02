require('dotenv').config();
const express = require('express');
const path = require('path');
const { Telegraf } = require('telegraf');

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const WEBAPP_URL = process.env.WEBAPP_URL || 'https://your-domain.com';
const PORT = process.env.PORT || 3000;

if (!BOT_TOKEN) {
  console.error('Missing TELEGRAM_BOT_TOKEN in .env');
  process.exit(1);
}

const bot = new Telegraf(BOT_TOKEN);
const app = express();

// Serve static files for the mini app
app.use(express.static(path.join(__dirname, 'public')));

// Simple health check
app.get('/health', (_req, res) => {
  res.send('OK');
});

// Telegram commands
bot.start((ctx) => {
  return ctx.reply('Άνοιξε το mini app 👇', {
    reply_markup: {
      inline_keyboard: [
        [
          {
            text: "Open mini app",
            web_app: { url: WEBAPP_URL }
          }
        ]
      ]
    }
  });
});

// Launch bot (long polling – για δοκιμές τοπικά)
bot.launch().then(() => {
  console.log('Telegram bot started');
});

// Start web server
app.listen(PORT, () => {
  console.log(`Web server listening on http://localhost:${PORT}`);
});

// Enable graceful stop
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));

