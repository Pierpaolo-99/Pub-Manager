const router = require('express').Router();
const productsController = require('../controllers/products_controller');

router.get('/', productsController.indexProducts);

router.get('/:id', productsController.showProduct);

router.post('/', productsController.createProduct);

router.put('/:id', productsController.updateProduct);

router.delete('/:id', productsController.destroyProduct);

module.exports = router;