const express = require('express');
const router = express.Router();
const sys = require('../controllers/systemController');

router.get('/health', sys.health);
router.get('/models', sys.models);
router.get('/config', sys.config);
router.get('/audit/logs', sys.auditLogs);
router.get('/uninstall-feedback', sys.uninstallFeedback);

module.exports = router;
