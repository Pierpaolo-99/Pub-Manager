const express = require('express');
const router = express.Router();
const cashDrawerController = require('../controllers/cash_drawer_controller');

router.post('/operation', cashDrawerController.cashOperation);
router.get('/operations', cashDrawerController.listOperations); // opzionale

module.exports = router;