const express = require('express');
const router = express.Router();
const userController = require('../controllers/users_controller');

// CRUD utenti
router.get('/', userController.getUsers);
router.post('/register', userController.registerUser);
router.post('/login', userController.loginUser);
router.patch('/:id', userController.updateUser);
router.delete('/:id', userController.deleteUser);

module.exports = router;
