const jwt = require('jsonwebtoken');
const User = require('../models/User');

// สร้าง JWT Token
const generateToken = (id) => {
    return jwt.sign({ id }, process.env.JWT_SECRET, {
        expiresIn: '7d'
    });
};

// @desc    ลงทะเบียนผู้ใช้งานใหม่
// @route   POST /api/v1/auth/register
// @access  Public
exports.register = async (req, res) => {
    try {
        const { name, telephone, password, role } = req.body;

        // ป้องกันการส่ง role มาในการลงทะเบียน
        if (role !== undefined) {
            return res.status(403).json({
                success: false,
                message: 'ไม่สามารถกำหนด role ได้ในการลงทะเบียน'
            });
        }

        // ตรวจสอบว่ามี telephone นี้ในระบบแล้วหรือไม่
        const existingUser = await User.findOne({ telephone });
        if (existingUser) {
            return res.status(400).json({
                success: false,
                message: 'เบอร์โทรศัพท์นี้ถูกใช้งานแล้ว'
            });
        }

        // สร้างผู้ใช้งานใหม่
        const user = await User.create({
            name,
            telephone,
            password
        });

        const token = generateToken(user._id);

        res.status(201).json({
            success: true,
            token,
            user: {
                id: user._id,
                name: user.name,
                telephone: user.telephone,
                role: user.role
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'เกิดข้อผิดพลาดในการลงทะเบียน',
            error: error.message
        });
    }
};

// @desc    เข้าสู่ระบบ
// @route   POST /api/v1/auth/login
// @access  Public
exports.login = async (req, res) => {
    try {
        const {telephone, password } = req.body;

        // ตรวจสอบว่ากรอกข้อมูลครบหรือไม่
        if (!telephone || !password) {
            return res.status(400).json({
                success: false,
                message: 'กรุณากรอกชื่อ เบอร์โทรศัพท์ และรหัสผ่าน'
            });
        }

        // ค้นหาผู้ใช้งาน
        const user = await User.findOne({ telephone }).select('+password');
        if (!user) {
            return res.status(401).json({
                success: false,
                message: ' เบอร์โทรศัพท์ หรือรหัสผ่านไม่ถูกต้อง'
            });
        }

        // ตรวจสอบรหัสผ่าน
        const isPasswordMatch = await user.comparePassword(password);
        if (!isPasswordMatch) {
            return res.status(401).json({
                success: false,
                message: 'เบอร์โทรศัพท์ หรือรหัสผ่านไม่ถูกต้อง'
            });
        }

        const token = generateToken(user._id);

        res.status(200).json({
            success: true,
            token,
            user: {
                id: user._id,
                name: user.name,
                telephone: user.telephone,
                role: user.role
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'เกิดข้อผิดพลาดในการเข้าสู่ระบบ',
            error: error.message
        });
    }
};

// @desc    ดึงข้อมูลผู้ใช้งานปัจจุบัน
// @route   GET /api/v1/auth/me
// @access  Private
exports.getMe = async (req, res) => {
    try {
        const user = await User.findById(req.user.id);
        
        res.status(200).json({
            success: true,
            user: {
                id: user._id,
                name: user.name,
                telephone: user.telephone,
                role: user.role
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'เกิดข้อผิดพลาดในการดึงข้อมูล',
            error: error.message
        });
    }
};

// @desc    ออกจากระบบ
// @route   GET /api/v1/auth/logout
// @access  Private
exports.logout = async (req, res, next) => {
    res.clearCookie('token', {
        httpOnly: true,
        sameSite: 'strict'
    });
    res.clearCookie('accessToken', {
        httpOnly: true,
        sameSite: 'strict'
    });
    res.clearCookie('refreshToken', {
        httpOnly: true,
        sameSite: 'strict'
    });
    res.status(200).json({
        success: true,
        data: {}
    });
};

// @desc    ดึงข้อมูลสมาชิกทั้งหมดพร้อมประวัติการลา
// @route   GET /api/v1/auth/members
// @access  Private (Admin only)
exports.getAllMembers = async (req, res) => {
    try {
        const Leave = require('../models/Leave');
        
        // ดึงข้อมูลสมาชิกทั้งหมด
        const users = await User.find().select('-password').sort('name');
        
        // ดึงข้อมูลการลาของแต่ละคน
        const membersWithLeaves = await Promise.all(
            users.map(async (user) => {
                const leaves = await Leave.find({ user: user._id })
                    .populate('approvedBy', 'name')
                    .sort('-createdAt');
                
                // นับสถิติการลา
                const stats = {
                    total: leaves.length,
                    pending: leaves.filter(l => l.status === 'pending').length,
                    approved: leaves.filter(l => l.status === 'approved').length,
                    rejected: leaves.filter(l => l.status === 'rejected').length,
                    totalDaysApproved: leaves
                        .filter(l => l.status === 'approved')
                        .reduce((sum, l) => sum + l.totalDays, 0)
                };
                
                return {
                    id: user._id,
                    name: user.name,
                    telephone: user.telephone,
                    role: user.role,
                    createdAt: user.createdAt,
                    leaves: leaves,
                    stats: stats
                };
            })
        );
        
        res.status(200).json({
            success: true,
            count: membersWithLeaves.length,
            data: membersWithLeaves
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'เกิดข้อผิดพลาดในการดึงข้อมูลสมาชิก',
            error: error.message
        });
    }
};

// @desc    Reset password สำหรับ System Admin
// @route   POST /api/v1/auth/reset-password
// @access  Private (Admin only)
exports.resetPassword = async (req, res) => {
    try {
        const { telephone, password } = req.body;

        // ตรวจสอบว่ากรอกข้อมูลครบหรือไม่
        if (!telephone || !password) {
            return res.status(400).json({
                success: false,
                message: 'กรุณากรอกเบอร์โทรศัพท์และรหัสผ่านใหม่'
            });
        }

        // ตรวจสอบความยาวรหัสผ่าน
        if (password.length < 6) {
            return res.status(400).json({
                success: false,
                message: 'รหัสผ่านต้องมีความยาวอย่างน้อย 6 ตัวอักษร'
            });
        }

        // ค้นหาผู้ใช้จากเบอร์โทร
        const user = await User.findOne({ telephone: telephone });
        
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'ไม่พบผู้ใช้งานที่มีเบอร์โทรศัพท์นี้'
            });
        }

        // อัปเดตรหัสผ่าน (จะถูก hash อัตโนมัติผ่าน pre-save middleware)
        user.password = password;
        await user.save();

        res.status(200).json({
            success: true,
            message: `รีเซ็ตรหัสผ่านสำเร็จสำหรับ ${user.name} (${user.telephone}) - ผู้ใช้จะต้องเข้าสู่ระบบใหม่`,
            forceLogout: true, // บอก client ให้ logout user นี้
            data: {
                name: user.name,
                telephone: user.telephone,
                role: user.role
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'เกิดข้อผิดพลาดในการรีเซ็ตรหัสผ่าน',
            error: error.message
        });
    }
};
