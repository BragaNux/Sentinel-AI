const express = require('express');
const router = express.Router();
const fb = require('../controllers/feedbackController');

router.post('/feedback/uninstall', fb.uninstall);

module.exports = router;
