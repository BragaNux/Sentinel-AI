const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/analyzeController');

router.post('/analyze', ctrl.analyzeGeneric);
router.post('/analyze/text', ctrl.analyzeText);
router.post('/analyze/url', ctrl.analyzeUrl);
router.post('/analyze/code', ctrl.analyzeCode);
router.post('/analyze/batch', ctrl.analyzeBatch);

module.exports = router;
