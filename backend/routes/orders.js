const express = require('express');
const router = express.Router();
const ordersController = require('../controllers/orders_controller');

// Routes principali per ordini
router.get('/stats', ordersController.getOrdersStats);           // GET /api/orders/stats
router.get('/tables', ordersController.getTablesWithStatus);     // GET /api/orders/tables
router.get('/', ordersController.getAllOrders);                 // GET /api/orders
router.get('/:id', ordersController.getOrderById);              // GET /api/orders/:id

router.post('/', ordersController.createOrder);                 // POST /api/orders
router.patch('/:id', ordersController.updateOrderStatus);       // PATCH /api/orders/:id
router.delete('/:id', ordersController.deleteOrder);            // DELETE /api/orders/:id

// Routes legacy (per compatibilità)
router.post('/simple', ordersController.createSimpleOrder);     // POST /api/orders/simple

module.exports = router;
