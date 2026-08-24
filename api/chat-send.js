// api/chat-send.js
// Принимает сообщение с сайта, шлёт боту в Telegram с session_id

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', process.env.ALLOWED_ORIGIN || '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).end();

  const { message, session } = req.body || {};
  if (!message || !session) return res.status(400).json({ error: 'Missing message or session' });

  const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || process.env.BOT_TOKEN;
  const CHAT_ID   = process.env.TELEGRAM_CHAT_ID   || process.env.CHAT_ID;
  if (!BOT_TOKEN || !CHAT_ID) return res.status(500).json({ error: 'Bot not configured' });

  // Текст для бота — содержит session_id чтобы можно было reply
  const text = `💬 *Повідомлення з сайту*\n\n${escMd(message)}\n\n🔑 \`${session}\``;

  try {
    const r = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: CHAT_ID, text, parse_mode: 'MarkdownV2' }),
    });
    const data = await r.json();
    if (!data.ok) return res.status(502).json({ error: 'Telegram error', detail: data });

    // Сохраняем message_id → session маппинг в Redis
    // Чтобы при reply мы знали к какой сессии он относится
    const msgId = data.result.message_id;
    await redisSet(`msg:${msgId}`, session, 86400); // TTL 24 часа

    return res.status(200).json({ ok: true, message_id: msgId });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}

function escMd(t) {
  return String(t).replace(/[_*[\]()~`>#+\-=|{}.!\\]/g, '\\$&');
}

async function redisSet(key, value, ttl) {
  const url   = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return;
  await fetch(`${url}/set/${encodeURIComponent(key)}/${encodeURIComponent(value)}${ttl ? `/ex/${ttl}` : ''}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
}
