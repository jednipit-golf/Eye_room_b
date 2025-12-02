const express = require('express');
const router = express.Router();
const { register, login, getMe, logout, getAllMembers } = require('../controllers/authController');
const { protect, authorize } = require('../middleware/auth');

router.post('/register', register);
router.post('/login', login);
router.get('/me', protect, getMe);
router.get('/logout', logout);
router.get('/members', protect, authorize('admin'), getAllMembers);

module.exports = router;
