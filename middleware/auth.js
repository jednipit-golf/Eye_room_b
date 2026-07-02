const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Middleware สำหรับตรวจสอบ authentication
exports.protect = async (req, res, next) => {
    try {
        let token;

        // อ่าน access token จาก Authorization header ก่อน (สำหรับ iOS) ถ้าไม่มีค่อยดูจาก cookie
        if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
            token = req.headers.authorization.split(' ')[1];
        } else if (req.cookies.accessToken) {
            token = req.cookies.accessToken;
        }

        if (!token || token=='null') {
            return res.status(401).json({
                success: false,
                message: 'กรุณาเข้าสู่ระบบเพื่อเข้าถึงข้อมูลนี้'
            });
        }

        // ตรวจสอบ token
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = await User.findById(decoded.id);

        if (!req.user) {
            return res.status(401).json({
                success: false,
                message: 'ไม่พบผู้ใช้งานนี้ในระบบ'
            });
        }

        next();
    } catch (error) {
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({
                success: false,
                message: 'Token หมดอายุ',
                expired: true
            });
        }
        return res.status(401).json({
            success: false,
            message: 'Token ไม่ถูกต้องหรือหมดอายุ'
        });
    }
};

// Middleware สำหรับตรวจสอบสิทธิ์ตาม role
exports.authorize = (...roles) => {
    return (req, res, next) => {
        if (!roles.includes(req.user.role)) {
            return res.status(403).json({
                success: false,
                message: 'คุณไม่มีสิทธิ์เข้าถึงข้อมูลนี้'
            });
        }
        next();
    };
};

// Middleware สำหรับตรวจสอบว่าเป็น system-admin เท่านั้น
exports.authorizeSystemAdmin = (req, res, next) => {
    if (req.user.role !== 'system-admin') {
        return res.status(403).json({
            success: false,
            message: 'เฉพาะ System Admin เท่านั้นที่สามารถเข้าถึงได้'
        });
    }
    next();
};
