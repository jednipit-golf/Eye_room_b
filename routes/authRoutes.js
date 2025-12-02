const express = require('express');
const router = express.Router();
const { register, login, getMe, logout, getAllMembers, resetPassword } = require('../controllers/authController');
const { protect, authorize, authorizeSystemAdmin } = require('../middleware/auth');

router.post('/register', protect, authorizeSystemAdmin, validate('register'), register);
router.post('/login', validate('login'), login);
router.get('/me', protect, getMe);
router.get('/logout', logout);
router.get('/members', protect, authorize('admin', 'system-admin'), getAllMembers);
router.post('/reset-password', protect, authorizeSystemAdmin, validate('resetPassword'), resetPassword);

module.exports = router;
