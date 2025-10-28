const router = require('express').Router();
const variantsController = require('../controllers/variants_controller');

router.get('/', variantsController.indexVariants);

router.get('/:id', variantsController.showVariant);

router.get('/product/:product_id', variantsController.byProduct);

router.post('/', variantsController.createVariant);

router.put('/:id', variantsController.updateVariant);

router.delete('/:id', variantsController.destroyVariant);

module.exports = router
