const mongoose = require('mongoose');
const { formatBangkokDate, formatBangkokDateTime } = require('../utils/thaiDate');

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
    toJSON: { 
        virtuals: true,
        transform: function(doc, ret) {
            // เพิ่ม formattedApprovedDate โดยตรงใน JSON
            if (ret.approvedDate) {
                ret.formattedApprovedDate = formatBangkokDateTime(ret.approvedDate);
            }
            // เพิ่ม formattedStartDate โดยตรงใน JSON
            if (ret.startDate) {
                ret.formattedStartDate = formatBangkokDate(ret.startDate, '-');
            }
            return ret;
        }
    },
    toObject: { virtuals: true }
});

// Virtual field สำหรับแสดงวันที่ในรูปแบบ DD-MM-YYYY (พ.ศ.)
leaveSchema.virtual('formattedStartDate').get(function() {
    if (!this.startDate) return null;
    return formatBangkokDate(this.startDate, '-');
});

// Virtual field สำหรับแสดงวันที่อนุญาต/ไม่อนุญาต ในรูปแบบ D/M/YYYY HH:MM:SS (พ.ศ.)
leaveSchema.virtual('formattedApprovedDate').get(function() {
    if (!this.approvedDate) return null;
    return formatBangkokDateTime(this.approvedDate);
});

module.exports = mongoose.model('Leave', leaveSchema);
