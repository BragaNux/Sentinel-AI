const { audit } = require('../utils/logger');

function uninstall(req, res) {
  try { audit('uninstall_feedback', { body: req.body }); } catch {}
  res.json({ ok: true });
}

module.exports = { uninstall };
