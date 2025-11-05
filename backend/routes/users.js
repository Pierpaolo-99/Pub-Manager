const express = require('express');
const router = express.Router();
const userController = require('../controllers/users_controller');

// CRUD utenti
router.get('/', userController.getUsers);
router.post('/register', userController.registerUser);
router.post('/login', userController.loginUser);
router.patch('/:id', userController.updateUser);
router.put('/:id', userController.updateUser); // Aggiungi questa linea
router.delete('/:id', userController.deleteUser);

router.get('/me', userController.checkAuthStatus);
router.post('/logout', userController.logout);

module.exports = router;
