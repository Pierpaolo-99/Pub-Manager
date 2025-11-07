const express = require('express');
const router = express.Router();
const usersController = require('../controllers/users_controller');

// Assicurati che tutte le funzioni esistano nel controller
console.log('Available controller methods:', Object.keys(usersController));

// Route per verificare autenticazione
router.get('/me', usersController.getCurrentUser || ((req, res) => {
    res.status(501).json({ error: 'getCurrentUser not implemented' });
}));

// GET all users
router.get('/', usersController.getAllUsers || ((req, res) => {
    res.status(501).json({ error: 'getAllUsers not implemented' });
}));

// GET specific user
router.get('/:id', usersController.getUserById || ((req, res) => {
    res.status(501).json({ error: 'getUserById not implemented' });
}));

// POST new user
router.post('/', usersController.createUser || ((req, res) => {
    res.status(501).json({ error: 'createUser not implemented' });
}));

// PUT update user
router.put('/:id', usersController.updateUser || ((req, res) => {
    res.status(501).json({ error: 'updateUser not implemented' });
}));

// DELETE user
router.delete('/:id', usersController.deleteUser || ((req, res) => {
    res.status(501).json({ error: 'deleteUser not implemented' });
}));

module.exports = router;
