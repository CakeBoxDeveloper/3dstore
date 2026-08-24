// api/chat-webhook.js
// Telegram webhook — получает reply от оператора, кладёт ответ в Redis

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const body = req.body;
  const msg  = body?.message;

  // Нас интересуют только reply-сообщения
  if (!msg || !msg.reply_to_message) return res.status(200).json({ ok: true });

  const replyToId = msg.reply_to_message.message_id;
  const text      = msg.text || '';

  // Находим session по message_id
  const session = await redisGet(`msg:${replyToId}`);
  if (!session) return res.status(200).json({ ok: true, note: 'session not found' });

  // Кладём ответ оператора в Redis
  await redisSet(`reply:${session}`, text, 3600); // TTL 1 час

  return res.status(200).json({ ok: true });
}

async function redisGet(key) {
  const url   = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;
  const r = await fetch(`${url}/get/${encodeURIComponent(key)}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await r.json();
  return data.result || null;
}

async function redisSet(key, value, ttl) {
  const url   = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return;
  await fetch(`${url}/set/${encodeURIComponent(key)}/${encodeURIComponent(value)}${ttl ? `/ex/${ttl}` : ''}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
}
