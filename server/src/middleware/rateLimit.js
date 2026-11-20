export function rateLimit({ windowMs, max }) {
  const hits = new Map();

  return (req, res, next) => {
    const now = Date.now();
    const key = req.ip || 'unknown';
    const recent = (hits.get(key) || []).filter((time) => now - time < windowMs);

    if (recent.length >= max) {
      return res.status(429).json({ error: 'Too many attempts. Please wait a few minutes.' });
    }

    recent.push(now);
    hits.set(key, recent);
    if (hits.size > 5000) hits.clear();
    return next();
  };
}
