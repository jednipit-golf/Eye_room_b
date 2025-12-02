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

router.post('/', protect, createLeave);
router.get('/my-leaves', protect, getMyLeaves);
router.get('/stats', protect, getLeaveStats);
router.get('/', protect, authorize('admin'), getAllLeaves);
router.get('/:id', protect, getLeaveById);
router.put('/:id/approve', protect, authorize('admin'), approveLeave);
router.put('/:id/reject', protect, authorize('admin'), rejectLeave);
router.put('/:id/cancel', protect, cancelLeave);

module.exports = router;
