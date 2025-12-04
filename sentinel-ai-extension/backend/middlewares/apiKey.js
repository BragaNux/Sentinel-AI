function apiKey(req, res, next) {
  const { REQUIRE_API_KEY = 'false', SENTINEL_API_KEY = '' } = process.env;
  if (REQUIRE_API_KEY === 'true') {
    const key = req.headers['x-api-key'];
    if (!key || key !== SENTINEL_API_KEY) {
      return res.status(401).json({ error: 'API key inválida' });
    }
  }
  next();
}

module.exports = apiKey;
