const router = require('express').Router();
const variantsController = require('../controllers/variants_controller');

// ✅ ROUTES SPECIFICHE PRIMA (per evitare conflitti)
// GET statistiche varianti
router.get('/stats', variantsController.getVariantStats);

// GET prodotti per dropdown
router.get('/products', variantsController.getProductsForVariants);

// PUT aggiornamento ordinamento varianti
router.put('/order', variantsController.updateVariantOrder);

// GET varianti per prodotto specifico
router.get('/product/:productId', variantsController.getVariantsByProduct);

// ✅ ROUTES GENERICHE DOPO
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

module.exports = router;
