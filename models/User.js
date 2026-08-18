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
    password: {
        type: String,
        required: [true, 'กรุณากรอกรหัสผ่าน'],
        minlength: 6,
        select: false
    },
    role: {
        type: String,
        enum: ['user', 'admin', 'system-admin'],
        default: 'user'
    },
    refreshToken: {
        type: String,
        default: null
    }
}, {
    timestamps: true
});

// Hash password before save with pepper
userSchema.pre('save', async function() {
    if (!this.isModified('password')) return;

    const pepper = process.env.PEPPER_SECRET;
    if (!pepper) {
        throw new Error('PEPPER_SECRET is required');
    }

    const pepperedPassword = this.password + pepper;
    this.password = await bcrypt.hash(pepperedPassword, 10);
});

// password compare
userSchema.methods.comparePassword = async function(candidatePassword) {
    const pepper = process.env.PEPPER_SECRET;
    if (!pepper) {
        throw new Error('PEPPER_SECRET is required');
    }

    const pepperedCandidate = candidatePassword + pepper;
    return await bcrypt.compare(pepperedCandidate, this.password);
};

module.exports = mongoose.model('User', userSchema);
