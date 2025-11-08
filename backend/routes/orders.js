const express = require('express');
const router = express.Router();
const ordersController = require('../controllers/orders_controller');

// GET statistiche ordini (prima di /:id)
router.get('/stats', ordersController.getOrdersStats);

// GET tavoli con stato (prima di /:id)
router.get('/tables', ordersController.getTablesWithStatus);

// GET tutti gli ordini con filtri
router.get('/', ordersController.getAllOrders);

// GET singolo ordine per ID
router.get('/:id', ordersController.getOrderById);

// POST nuovo ordine
router.post('/', ordersController.createOrder);

// PATCH aggiornamento stato ordine
router.patch('/:id', ordersController.updateOrderStatus);

// DELETE ordine
router.delete('/:id', ordersController.deleteOrder);

module.exports = router;
