const express = require('express');
const router = express.Router();
const orderController = require('../controllers/orders_controller');

// TAVOLI
router.get('/tables', orderController.getTables);
router.patch('/tables/:id', orderController.updateTableStatus);

// ORDINI
router.post('/orders', orderController.createOrder);
router.get('/orders/:table_id', orderController.getOrdersByTable);
router.patch('/orders/:id', orderController.updateOrderStatus);
router.delete('/orders/:id', orderController.deleteOrder);

// ORDER ITEMS
router.post('/order-items', orderController.addItemToOrder);
router.patch('/order-items/:id', orderController.updateOrderItem);
router.delete('/order-items/:id', orderController.deleteOrderItem);

module.exports = router;
