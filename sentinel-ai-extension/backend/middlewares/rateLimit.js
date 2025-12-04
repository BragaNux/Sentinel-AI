const { RATE_LIMIT } = require('../config');

const rateData = new Map();

function rateLimit(req, res, next) {
  const now = Date.now();
  const key = req.ip || 'unknown';
  const entry = rateData.get(key) || { count: 0, resetAt: now + RATE_LIMIT.windowMs };
  if (now > entry.resetAt) {
    entry.count = 0;
    entry.resetAt = now + RATE_LIMIT.windowMs;
  }
  entry.count += 1;
  rateData.set(key, entry);
  if (entry.count > RATE_LIMIT.max) {
    return res.status(429).json({ error: 'Muitas requisições. Tente novamente em instantes.' });
  }
  next();
}

module.exports = rateLimit;
