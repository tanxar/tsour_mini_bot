const { Telegraf } = require('telegraf');

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const WEBAPP_URL = process.env.WEBAPP_URL || 'https://your-domain.com';

if (!BOT_TOKEN) {
  console.error('Missing TELEGRAM_BOT_TOKEN environment variable');
}

// Create bot instance only once per cold start
const bot = new Telegraf(BOT_TOKEN || ''); // empty string if missing, will just no-op

// /start command – στέλνει το WebApp button
bot.start((ctx) => {
  return ctx.reply('Άνοιξε το mini app 👇', {
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

