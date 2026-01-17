const express = require('express');
const {
  register, login, logout, getMe, updateDetails, updatePassword,
  getAllAdmins, getAdmin, createAdmin, updateAdmin, deleteAdmin, resetAdminPassword,
  getAllUsers, getUser, createUser, updateUser, deleteUser, updateSubscription, getUserStats
} = require('../controllers/adminController');
const { protectAdmin } = require('../middleware/auth');

const router = express.Router();

// Public
router.post('/register', register);
router.post('/login', login);

// Admin auth
router.get('/logout', protectAdmin, logout);
router.get('/me', protectAdmin, getMe);
router.put('/updatedetails', protectAdmin, updateDetails);
router.put('/updatepassword', protectAdmin, updatePassword);

// Admin management
router.get('/admins', protectAdmin, getAllAdmins);
router.get('/admins/:id', protectAdmin, getAdmin);
router.post('/admins', protectAdmin, createAdmin);
router.put('/admins/:id', protectAdmin, updateAdmin);
router.delete('/admins/:id', protectAdmin, deleteAdmin);
router.put('/admins/:id/resetpassword', protectAdmin, resetAdminPassword);

// User management
router.get('/users/stats', protectAdmin, getUserStats);
router.get('/users', protectAdmin, getAllUsers);
router.get('/users/:id', protectAdmin, getUser);
router.post('/users', protectAdmin, createUser);
router.put('/users/:id', protectAdmin, updateUser);
router.delete('/users/:id', protectAdmin, deleteUser);
router.put('/users/:id/subscription', protectAdmin, updateSubscription);

module.exports = router;