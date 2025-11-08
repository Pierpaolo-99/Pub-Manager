const router = require('express').Router();
const variantsController = require('../controllers/variants_controller');

// GET statistiche varianti
router.get('/stats', variantsController.getVariantStats);

// GET prodotti per dropdown
router.get('/products', variantsController.getProductsForVariants);

// GET tutte le varianti
router.get('/', variantsController.getAllVariants);

// GET singola variante
router.get('/:id', variantsController.getVariantById);

// POST nuova variante
router.post('/', variantsController.createVariant);

// PUT aggiornamento variante
router.put('/:id', variantsController.updateVariant);

// DELETE variante
router.delete('/:id', variantsController.deleteVariant);

// PUT aggiornamento ordinamento varianti
router.put('/order', variantsController.updateVariantOrder);

// GET varianti per prodotto specifico
router.get('/product/:productId', variantsController.getVariantsByProduct);

module.exports = router;
