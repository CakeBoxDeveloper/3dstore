// api/chat-poll.js
// Сайт поллит этот endpoint каждые 2 сек — проверяет есть ли ответ оператора

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', process.env.ALLOWED_ORIGIN || '*');
  if (req.method !== 'GET') return res.status(405).end();

  const session = req.query.s;
  if (!session) return res.status(400).json({ error: 'Missing session' });

  const reply = await redisGet(`reply:${session}`);

  if (reply) {
    // Удаляем ответ из Redis чтобы не показывать повторно
    await redisDel(`reply:${session}`);
    return res.status(200).json({ ok: true, reply });
  }

  return res.status(200).json({ ok: true, reply: null });
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

async function redisDel(key) {
  const url   = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return;
  await fetch(`${url}/del/${encodeURIComponent(key)}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
}
