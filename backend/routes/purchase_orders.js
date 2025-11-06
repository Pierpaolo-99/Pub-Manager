const express = require('express');
const router = express.Router();
const purchaseOrdersController = require('../controllers/purchase_orders_controller');

// Route per purchase orders
router.get('/', purchaseOrdersController.getAllPurchaseOrders);
router.get('/suppliers', purchaseOrdersController.getSuppliers);
router.get('/:id', purchaseOrdersController.getPurchaseOrderById);
router.post('/', purchaseOrdersController.createPurchaseOrder);
router.put('/:id', purchaseOrdersController.updatePurchaseOrder);
router.put('/:id/status', purchaseOrdersController.updateOrderStatus);
router.delete('/:id', purchaseOrdersController.deletePurchaseOrder);

module.exports = router;