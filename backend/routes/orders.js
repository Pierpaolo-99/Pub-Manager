const express = require('express');
const router = express.Router();
const ordersController = require('../controllers/orders_controller');

// STATS PRIMA di /:id per evitare conflitti
router.get('/stats', ordersController.getOrdersStats);             // GET /api/orders/stats

// Route per l'admin dashboard
router.get('/', ordersController.getAllOrders);                    // GET /api/orders
router.get('/:id', ordersController.getOrderById);                 // GET /api/orders/:id
router.post('/simple', ordersController.createSimpleOrder);        // POST /api/orders/simple
router.patch('/:id', ordersController.updateOrderStatus);          // PATCH /api/orders/:id
router.delete('/:id', ordersController.deleteOrder);               // DELETE /api/orders/:id

// Route esistenti per tavoli (con prefisso diverso)
router.get('/tables/all', ordersController.getTables);                 
router.patch('/tables/:id', ordersController.updateTableStatus);   
router.post('/create', ordersController.createOrder);              // Cambiato da '/' 
router.get('/table/:table_id', ordersController.getOrdersByTable); 
router.post('/items', ordersController.addItemToOrder);            
router.put('/items/:id', ordersController.updateOrderItem);        
router.delete('/items/:id', ordersController.deleteOrderItem);     

module.exports = router;
