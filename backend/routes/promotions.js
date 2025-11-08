const express = require('express');
const router = express.Router();
const promotionController = require('../controllers/promotions_controller');

// GET promozioni valide per ordine (deve essere prima di /:id)
router.get('/valid', promotionController.getValidPromotions);

// CRUD promozioni
router.get('/', promotionController.getPromotions);
router.get('/:id', promotionController.getPromotionById);
router.post('/', promotionController.createPromotion);
router.put('/:id', promotionController.updatePromotion);
router.delete('/:id', promotionController.deletePromotion);

// Utilities promozioni
router.get('/:id/usage', promotionController.getPromotionUsage);
router.post('/:id/increment-usage', promotionController.incrementPromotionUsage);

module.exports = router;
