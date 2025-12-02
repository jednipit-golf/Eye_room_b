const express = require('express');
const router = express.Router();
const {
    createLeave,
    getMyLeaves,
    getAllLeaves,
    getLeaveById,
    approveLeave,
    rejectLeave,
    cancelLeave,
    getLeaveStats
} = require('../controllers/leaveController');
const { protect, authorize } = require('../middleware/auth');

// Routes ที่มี path เฉพาะเจาะจงต้องอยู่ก่อน dynamic routes (/:id)
router.post('/', protect, createLeave);
router.get('/my-leaves', protect, getMyLeaves);
router.get('/stats', protect, getLeaveStats);
router.get('/', protect, authorize('admin', 'system-admin'), getAllLeaves);

// Dynamic routes ต้องอยู่หลังสุด
router.get('/:id', protect, getLeaveById);
router.put('/:id/approve', protect, authorize('admin', 'system-admin'), approveLeave);
router.put('/:id/reject', protect, authorize('admin', 'system-admin'), rejectLeave);
router.put('/:id/cancel', protect, cancelLeave);

module.exports = router;
