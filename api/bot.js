const { Telegraf } = require('telegraf');

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const WEBAPP_URL = process.env.WEBAPP_URL || 'https://your-domain.com';

if (!BOT_TOKEN) {
  console.error('Missing TELEGRAM_BOT_TOKEN environment variable');
}

// Create bot instance only once per cold start
const bot = new Telegraf(BOT_TOKEN || ''); // empty string if missing, will just no-op

// /start command – welcome μήνυμα + WebApp button
bot.start((ctx) => {
  const username = ctx.from?.username || ctx.from?.first_name || 'there';
  const message =
    `Hi ${username} 👋\n\n` +
    `Καλωσήρθες στο Tsour Mini Bot!\n` +
    `Με αυτό το mini app μπορείς να βλέπεις τις προσφορές σου, τις κινήσεις σου και να κάνεις γρήγορες ενέργειες απευθείας μέσα από το Telegram.\n\n` +
    `➤ Πάτα το κουμπί από κάτω για να ανοίξεις το mini app.\n` +
    `➤ Μπορείς να επιστρέφεις όποτε θέλεις στέλνοντας /start ξανά.`;

  return ctx.reply(message, {
    reply_markup: {
      inline_keyboard: [
        [
          {
            text: 'Open mini app',
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

