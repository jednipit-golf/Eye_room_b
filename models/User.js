const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'กรุณากรอกชื่อ'],
        trim: true
    },
    telephone: {
        type: String,
        required: [true, 'กรุณากรอกเบอร์โทรศัพท์'],
        unique: true,
        trim: true
    },
    email: {
        type: String,
        required: [true, 'กรุณากรอกอีเมล'],
        unique: true,
        lowercase: true,
        trim: true
    },
    password: {
        type: String,
        required: [true, 'กรุณากรอกรหัสผ่าน'],
        minlength: 6
    },
    firstName: {
        type: String,
        required: [true, 'กรุณากรอกชื่อ'],
        trim: true
    },
    lastName: {
        type: String,
        required: [true, 'กรุณากรอกนามสกุล'],
        trim: true
    },
    department: {
        type: String,
        required: [true, 'กรุณาระบุแผนก'],
        trim: true
    },
    position: {
        type: String,
        required: [true, 'กรุณาระบุตำแหน่ง'],
        trim: true
    },
    role: {
        type: String,
        enum: ['employee', 'manager', 'admin'],
        default: 'employee'
    },
    annualLeaveBalance: {
        type: Number,
        default: 10
    },
    sickLeaveBalance: {
        type: Number,
        default: 30
    },
    personalLeaveBalance: {
        type: Number,
        default: 3
    }
}, {
    timestamps: true
});

// Hash password ก่อน save
userSchema.pre('save', async function(next) {
    if (!this.isModified('password')) return next();
    this.password = await bcrypt.hash(this.password, 10);
    next();
});

// Method สำหรับตรวจสอบรหัสผ่าน
userSchema.methods.comparePassword = async function(candidatePassword) {
    return await bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model('User', userSchema);
