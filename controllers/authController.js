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
        const { name, telephone, password } = req.body;

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
                telephone: user.telephone
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
                telephone: user.telephone
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
                telephone: user.telephone
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
// @route   POST /api/v1/auth/logout
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
