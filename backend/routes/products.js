const router = require('express').Router();
const productsController = require('../controllers/products_controller');

// GET tutte le statistiche prodotti
router.get('/stats', productsController.getProductStats);

// GET tutti i prodotti con filtri
router.get('/', productsController.getAllProducts);

// GET singolo prodotto
router.get('/:id', productsController.getProductById);

// POST nuovo prodotto
router.post('/', productsController.createProduct);

// PUT aggiornamento completo prodotto
router.put('/:id', productsController.updateProduct);

// PATCH toggle campo specifico (active, featured)
router.patch('/:id', productsController.toggleProductField);

// DELETE prodotto
router.delete('/:id', productsController.deleteProduct);

module.exports = router;