const express = require('express');
const router = express.Router();
const suppliersController = require('../controllers/suppliers_controller');

// GET statistiche fornitori (prima di /:id)
router.get('/stats', suppliersController.getSuppliersStats);

// GET fornitori attivi per dropdown (prima di /:id)
router.get('/active', suppliersController.getActiveSuppliers);

// GET termini di pagamento disponibili
router.get('/payment-terms', suppliersController.getPaymentTerms);

// GET prodotti per fornitore (prima di /:id)
router.get('/:id/products', suppliersController.getSupplierProducts);

// GET tutti i fornitori con filtri
router.get('/', suppliersController.getAllSuppliers);

// GET singolo fornitore per ID
router.get('/:id', suppliersController.getSupplierById);

// POST nuovo fornitore
router.post('/', suppliersController.createSupplier);

// PATCH aggiornamento fornitore
router.patch('/:id', suppliersController.updateSupplier);

// DELETE fornitore
router.delete('/:id', suppliersController.deleteSupplier);

module.exports = router;