const express = require('express');
const router = express.Router();
const promotionController = require('../controllers/promotions_controller');

// CRUD promozioni
router.get('/', promotionController.getPromotions);
router.post('/', promotionController.createPromotion);
router.patch('/:id', promotionController.updatePromotion);
router.delete('/:id', promotionController.deletePromotion);

// Assegna/rimuovi promozione a prodotto
router.post('/assign', promotionController.addPromotionToProduct);
router.delete('/remove/:productId/:promotionId', promotionController.removePromotionFromProduct);

module.exports = router;
