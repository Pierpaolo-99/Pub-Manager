const express = require('express');
const router = express.Router();
const refundsController = require('../controllers/refunds_controller');

router.post('/', refundsController.createRefund);
router.get('/', refundsController.listRefunds); // opzionale

module.exports = router;