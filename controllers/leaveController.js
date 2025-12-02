const Leave = require('../models/Leave');
const User = require('../models/User');

// @desc    สร้างคำขอลาใหม่
// @route   POST /api/leaves
// @access  Private
exports.createLeave = async (req, res) => {
    try {
        const { leaveType, startDate, endDate, reason } = req.body;

        // ตรวจสอบข้อมูล
        if (!leaveType || !startDate || !endDate || !reason) {
            return res.status(400).json({
                success: false,
                message: 'กรุณากรอกข้อมูลให้ครบถ้วน'
            });
        }

        // ตรวจสอบว่าวันที่ถูกต้อง
        if (new Date(startDate) > new Date(endDate)) {
            return res.status(400).json({
                success: false,
                message: 'วันที่เริ่มต้นต้องน้อยกว่าหรือเท่ากับวันที่สิ้นสุด'
            });
        }

        // สร้างคำขอลา
        const leave = await Leave.create({
            user: req.user.id,
            leaveType,
            startDate,
            endDate,
            reason
        });

        // ดึงข้อมูลพร้อม populate user
        const populatedLeave = await Leave.findById(leave._id).populate('user', 'firstName lastName email department');

        res.status(201).json({
            success: true,
            data: populatedLeave
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'เกิดข้อผิดพลาดในการสร้างคำขอลา',
            error: error.message
        });
    }
};

// @desc    ดึงรายการคำขอลาของผู้ใช้งาน
// @route   GET /api/leaves/my-leaves
// @access  Private
exports.getMyLeaves = async (req, res) => {
    try {
        const leaves = await Leave.find({ user: req.user.id })
            .populate('approvedBy', 'firstName lastName')
            .sort('-createdAt');

        res.status(200).json({
            success: true,
            count: leaves.length,
            data: leaves
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'เกิดข้อผิดพลาดในการดึงข้อมูล',
            error: error.message
        });
    }
};

// @desc    ดึงรายการคำขอลาทั้งหมด (สำหรับ manager/admin)
// @route   GET /api/leaves
// @access  Private (Manager/Admin)
exports.getAllLeaves = async (req, res) => {
    try {
        const { status, leaveType, startDate, endDate } = req.query;
        let query = {};

        if (status) query.status = status;
        if (leaveType) query.leaveType = leaveType;
        if (startDate && endDate) {
            query.startDate = { $gte: new Date(startDate), $lte: new Date(endDate) };
        }

        const leaves = await Leave.find(query)
            .populate('user', 'firstName lastName email department position')
            .populate('approvedBy', 'firstName lastName')
            .sort('-createdAt');

        res.status(200).json({
            success: true,
            count: leaves.length,
            data: leaves
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'เกิดข้อผิดพลาดในการดึงข้อมูล',
            error: error.message
        });
    }
};

// @desc    ดึงคำขอลาตาม ID
// @route   GET /api/leaves/:id
// @access  Private
exports.getLeaveById = async (req, res) => {
    try {
        const leave = await Leave.findById(req.params.id)
            .populate('user', 'firstName lastName email department position')
            .populate('approvedBy', 'firstName lastName');

        if (!leave) {
            return res.status(404).json({
                success: false,
                message: 'ไม่พบคำขอลานี้'
            });
        }

        // ตรวจสอบสิทธิ์ (เฉพาะเจ้าของ, manager, หรือ admin)
        if (leave.user._id.toString() !== req.user.id && 
            req.user.role !== 'manager' && 
            req.user.role !== 'admin') {
            return res.status(403).json({
                success: false,
                message: 'คุณไม่มีสิทธิ์เข้าถึงข้อมูลนี้'
            });
        }

        res.status(200).json({
            success: true,
            data: leave
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'เกิดข้อผิดพลาดในการดึงข้อมูล',
            error: error.message
        });
    }
};

// @desc    อนุมัติคำขอลา
// @route   PUT /api/leaves/:id/approve
// @access  Private (Manager/Admin)
exports.approveLeave = async (req, res) => {
    try {
        const leave = await Leave.findById(req.params.id).populate('user');

        if (!leave) {
            return res.status(404).json({
                success: false,
                message: 'ไม่พบคำขอลานี้'
            });
        }

        if (leave.status !== 'pending') {
            return res.status(400).json({
                success: false,
                message: 'ไม่สามารถอนุมัติคำขอที่มีสถานะนี้ได้'
            });
        }

        // ตรวจสอบยอดวันลาคงเหลือ
        const user = leave.user;
        let balance = 0;

        switch (leave.leaveType) {
            case 'annual':
                balance = user.annualLeaveBalance;
                break;
            case 'sick':
                balance = user.sickLeaveBalance;
                break;
            case 'personal':
                balance = user.personalLeaveBalance;
                break;
            case 'unpaid':
                balance = Infinity; // ไม่จำกัด
                break;
        }

        if (balance < leave.totalDays) {
            return res.status(400).json({
                success: false,
                message: 'วันลาคงเหลือไม่เพียงพอ'
            });
        }

        // อัพเดทสถานะ
        leave.status = 'approved';
        leave.approvedBy = req.user.id;
        leave.approvedDate = Date.now();
        await leave.save();

        // หักวันลา
        if (leave.leaveType !== 'unpaid') {
            const field = `${leave.leaveType}LeaveBalance`;
            user[field] -= leave.totalDays;
            await user.save();
        }

        const populatedLeave = await Leave.findById(leave._id)
            .populate('user', 'firstName lastName email department')
            .populate('approvedBy', 'firstName lastName');

        res.status(200).json({
            success: true,
            data: populatedLeave
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'เกิดข้อผิดพลาดในการอนุมัติคำขอลา',
            error: error.message
        });
    }
};

// @desc    ปฏิเสธคำขอลา
// @route   PUT /api/leaves/:id/reject
// @access  Private (Manager/Admin)
exports.rejectLeave = async (req, res) => {
    try {
        const { rejectionReason } = req.body;
        const leave = await Leave.findById(req.params.id);

        if (!leave) {
            return res.status(404).json({
                success: false,
                message: 'ไม่พบคำขอลานี้'
            });
        }

        if (leave.status !== 'pending') {
            return res.status(400).json({
                success: false,
                message: 'ไม่สามารถปฏิเสธคำขอที่มีสถานะนี้ได้'
            });
        }

        leave.status = 'rejected';
        leave.approvedBy = req.user.id;
        leave.approvedDate = Date.now();
        leave.rejectionReason = rejectionReason || 'ไม่ระบุเหตุผล';
        await leave.save();

        const populatedLeave = await Leave.findById(leave._id)
            .populate('user', 'firstName lastName email department')
            .populate('approvedBy', 'firstName lastName');

        res.status(200).json({
            success: true,
            data: populatedLeave
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'เกิดข้อผิดพลาดในการปฏิเสธคำขอลา',
            error: error.message
        });
    }
};

// @desc    ยกเลิกคำขอลา
// @route   PUT /api/leaves/:id/cancel
// @access  Private
exports.cancelLeave = async (req, res) => {
    try {
        const leave = await Leave.findById(req.params.id);

        if (!leave) {
            return res.status(404).json({
                success: false,
                message: 'ไม่พบคำขอลานี้'
            });
        }

        // ตรวจสอบว่าเป็นเจ้าของคำขอหรือไม่
        if (leave.user.toString() !== req.user.id) {
            return res.status(403).json({
                success: false,
                message: 'คุณไม่มีสิทธิ์ยกเลิกคำขอนี้'
            });
        }

        if (leave.status === 'cancelled') {
            return res.status(400).json({
                success: false,
                message: 'คำขอนี้ถูกยกเลิกแล้ว'
            });
        }

        // ถ้าถูกอนุมัติแล้วให้คืนวันลา
        if (leave.status === 'approved' && leave.leaveType !== 'unpaid') {
            const user = await User.findById(leave.user);
            const field = `${leave.leaveType}LeaveBalance`;
            user[field] += leave.totalDays;
            await user.save();
        }

        leave.status = 'cancelled';
        await leave.save();

        res.status(200).json({
            success: true,
            data: leave
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'เกิดข้อผิดพลาดในการยกเลิกคำขอลา',
            error: error.message
        });
    }
};

// @desc    ดึงสถิติการลา
// @route   GET /api/leaves/stats
// @access  Private
exports.getLeaveStats = async (req, res) => {
    try {
        const userId = req.user.id;
        const currentYear = new Date().getFullYear();

        const stats = await Leave.aggregate([
            {
                $match: {
                    user: require('mongoose').Types.ObjectId(userId),
                    status: 'approved',
                    startDate: {
                        $gte: new Date(`${currentYear}-01-01`),
                        $lte: new Date(`${currentYear}-12-31`)
                    }
                }
            },
            {
                $group: {
                    _id: '$leaveType',
                    totalDays: { $sum: '$totalDays' }
                }
            }
        ]);

        const user = await User.findById(userId);

        res.status(200).json({
            success: true,
            data: {
                usedLeaves: stats,
                remainingLeaves: {
                    annual: user.annualLeaveBalance,
                    sick: user.sickLeaveBalance,
                    personal: user.personalLeaveBalance
                }
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'เกิดข้อผิดพลาดในการดึงสถิติ',
            error: error.message
        });
    }
};
