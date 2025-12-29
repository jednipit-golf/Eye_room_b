const mongoose = require('mongoose');

const leaveSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    startDate: {
        type: Date,
        required: [true, 'กรุณาระบุวันท้าเริ่มลา']
    },
    totalDays: {
        type: Number,
        required: true
    },
    reason: {
        type: String,
        required: [true, 'กรุณาระบุเหตุผลการลา'],
        trim: true
    },
    status: {
        type: String,
        enum: ['pending', 'approved', 'rejected', 'cancelled'],
        default: 'pending'
    },
    approvedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    approvedDate: {
        type: Date
    }
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// Virtual field สำหรับแสดงวันที่ในรูปแบบ DD-MM-YYYY (พ.ศ.)
leaveSchema.virtual('formattedStartDate').get(function() {
    if (!this.startDate) return null;
    const date = new Date(this.startDate);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear() + 543; // แปลง ค.ศ. เป็น พ.ศ.
    return `${day}-${month}-${year}`;
});

// Virtual field สำหรับแสดงวันที่อนุญาต/ไม่อนุญาต ในรูปแบบ D/M/YYYY HH:MM:SS (พ.ศ.)
leaveSchema.virtual('formattedApprovedDate').get(function() {
    if (!this.approvedDate) return null;
    const date = new Date(this.approvedDate);
    const day = date.getDate();
    const month = date.getMonth() + 1;
    const year = date.getFullYear() + 543; // แปลง ค.ศ. เป็น พ.ศ.
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');
    return `${day}/${month}/${year} ${hours}:${minutes}:${seconds}`;
});

module.exports = mongoose.model('Leave', leaveSchema);
