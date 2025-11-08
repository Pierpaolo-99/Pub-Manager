const express = require('express');
const router = express.Router();
const usersController = require('../controllers/users_controller');

// GET utente corrente (PRIMA di /:id per evitare conflitti)
router.get('/me', usersController.getCurrentUser);

// GET statistiche utenti
router.get('/stats', usersController.getUserStats);

// GET tutti gli utenti
router.get('/', usersController.getAllUsers);

// GET singolo utente per ID
router.get('/:id', usersController.getUserById);

// POST nuovo utente
router.post('/', usersController.createUser);

// PUT aggiornamento utente
router.put('/:id', usersController.updateUser);

// PUT cambio password
router.put('/:id/password', usersController.changePassword);

// DELETE utente
router.delete('/:id', usersController.deleteUser);

module.exports = router;
