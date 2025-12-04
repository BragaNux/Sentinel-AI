const fs = require('fs');
const path = require('path');
const { RATE_LIMIT, CACHE_TTL_MS } = require('../config');

const { MODEL_PROVIDER = 'gemini', OLLAMA_MODEL_NAME = 'llama3' } = process.env;
const { GEMINI_MODEL = 'gemini-2.5-pro-exp-03-25', REQUIRE_API_KEY = 'false' } = process.env;

function health(req, res) {
  res.json({ ok: true, provider: MODEL_PROVIDER, model: MODEL_PROVIDER === 'gemini' ? GEMINI_MODEL : OLLAMA_MODEL_NAME });
}

function models(req, res) {
  res.json({ provider: MODEL_PROVIDER, geminiModel: GEMINI_MODEL, ollamaModel: OLLAMA_MODEL_NAME });
}

function config(req, res) {
  res.json({ rateLimit: RATE_LIMIT, cacheTtlMs: CACHE_TTL_MS, requireApiKey: REQUIRE_API_KEY === 'true' });
}

function auditLogs(req, res) {
  const p = path.join(__dirname, '..', 'audit.log');
  try {
    const text = fs.readFileSync(p, 'utf8');
    const lines = text.trim().split(/\r?\n/).slice(-100);
    res.type('text/plain').send(lines.join('\n'));
  } catch {
    res.type('text/plain').send('');
  }
}

function uninstallFeedback(req, res) {
  res.sendFile(path.join(__dirname, '..', 'views', 'uninstall-feedback.html'));
}

module.exports = { health, models, config, auditLogs, uninstallFeedback };
