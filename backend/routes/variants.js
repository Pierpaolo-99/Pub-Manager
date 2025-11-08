const express = require('express');
const router = express.Router();
const {
    getAllVariants,
    getVariantStats,
    getVariantById,
    createVariant,
    updateVariant,
    deleteVariant,
    getProductsForVariants,
    getVariantsByProduct,
    updateVariantOrder
} = require('../controllers/variants_controller');

// Routes
router.get('/stats', getVariantStats);
router.get('/products', getProductsForVariants);
router.get('/product/:productId', getVariantsByProduct);
router.put('/order', updateVariantOrder);
router.get('/:id', getVariantById);
router.get('/', getAllVariants);
router.post('/', createVariant);
router.put('/:id', updateVariant);
router.delete('/:id', deleteVariant);

module.exports = router;
