const express = require('express');
const router = express.Router();
const suppliersController = require('../controllers/suppliers_controller');

// Routes per fornitori
router.get('/', suppliersController.getAllSuppliers);
router.get('/stats', suppliersController.getSuppliersStats);
router.get('/payment-terms', suppliersController.getPaymentTerms);
router.get('/:id', suppliersController.getSupplierById);

router.post('/', suppliersController.createSupplier);
router.put('/:id', suppliersController.updateSupplier);
router.delete('/:id', suppliersController.deleteSupplier);

module.exports = router;