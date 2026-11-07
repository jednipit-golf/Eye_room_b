const mongoose = require('mongoose');
const { currentVersion, hashPassword, verifyPassword } = require('../utils/passwordPepper');

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
    pepperVersion: {
        type: String,
        default: '1'
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

    const version = currentVersion();
    this.password = await hashPassword(this.password, version);
    this.pepperVersion = version;
});

// password compare
userSchema.methods.comparePassword = async function(candidatePassword) {
    // Accounts created before versioning use the original PEPPER_SECRET (v1).
    const version = this.pepperVersion || '1';
    const oldHash = this.password;
    const matches = await verifyPassword(candidatePassword, oldHash, version);
    if (!matches) return false;

    const targetVersion = currentVersion();
    if (version !== targetVersion) {
        const newHash = await hashPassword(candidatePassword, targetVersion);
        // Avoid replacing a password reset or migration that happened concurrently.
        const result = await this.constructor.updateOne(
            { _id: this._id, password: oldHash },
            { $set: { password: newHash, pepperVersion: targetVersion } }
        );
        if (result.modifiedCount !== 1) return false;
        // Keep this document clean so login's save does not hash the hash again.
        this.password = newHash;
        this.pepperVersion = targetVersion;
        this.unmarkModified('password');
        this.unmarkModified('pepperVersion');
    }
    return true;
};

module.exports = mongoose.model('User', userSchema);
