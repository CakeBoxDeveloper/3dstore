// api/order.js — Vercel Serverless Function
// Принимает заказ с сайта и отправляет сообщение в Telegram

export default async function handler(req, res) {
  // CORS — разрешаем только свой домен в проде, * для разработки
  res.setHeader('Access-Control-Allow-Origin', process.env.ALLOWED_ORIGIN || '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Валидация env
  const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || process.env.BOT_TOKEN;
  const CHAT_ID   = process.env.TELEGRAM_CHAT_ID  || process.env.CHAT_ID;

  if (!BOT_TOKEN || !CHAT_ID) {
    console.error('Missing TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID');
    return res.status(500).json({ error: 'Server misconfiguration' });
  }

  // Валидация тела запроса
  const { product, productId, category, subcategory, material, color, price, phone } = req.body || {};

  if (!product || !phone || !material) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  // Базовая валидация телефона (только цифры, +, пробелы, тире, скобки)
  const phoneClean = String(phone).replace(/[^\d+\s\-()]/g, '').trim();
  if (phoneClean.length < 5) {
    return res.status(400).json({ error: 'Invalid phone number' });
  }

  // Формируем сообщение
  const now = new Date().toLocaleString('ru-RU', { timeZone: 'Europe/Moscow' });

  const text = [
    '🛒 *Новый заказ*',
    '',
    `📦 *Товар:* ${escMd(product)}`,
    `🏷 *Категория:* ${escMd(category)} / ${escMd(subcategory)}`,
    `🎨 *Материал:* ${escMd(material)}`,
    `🎨 *Цвет:* ${escMd(color)}`,
    `💰 *Цена:* ${Number(price).toLocaleString('ru-RU')} ₽`,
    '',
    `📞 *Телефон:* ${escMd(phoneClean)}`,
    '',
    `🕐 ${escMd(now)}`,
    `🔗 ID: \`${escMd(productId || '—')}\``,
  ].join('\n');

  // Отправляем в Telegram
  try {
    const tgRes = await fetch(
      `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id:    CHAT_ID,
          text,
          parse_mode: 'MarkdownV2',
        }),
      }
    );

    const tgData = await tgRes.json();

    if (!tgData.ok) {
      console.error('Telegram API error:', tgData);
      return res.status(502).json({ error: 'Telegram delivery failed' });
    }

    return res.status(200).json({ ok: true });

  } catch (err) {
    console.error('Fetch error:', err);
    return res.status(500).json({ error: 'Internal error' });
  }
}

// Экранирование спецсимволов для MarkdownV2
function escMd(text) {
  return String(text).replace(/[_*[\]()~`>#+\-=|{}.!\\]/g, '\\$&');
}
