const mongoose = require('mongoose');

const leaveSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    leaveType: {
        type: String,
        enum: ['annual', 'sick', 'personal', 'unpaid'],
        required: [true, 'กรุณาระบุประเภทการลา']
    },
    startDate: {
        type: Date,
        required: [true, 'กรุณาระบุวันที่เริ่มลา']
    },
    endDate: {
        type: Date,
        required: [true, 'กรุณาระบุวันที่สิ้นสุดการลา']
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
    },
    rejectionReason: {
        type: String,
        trim: true
    },
    attachments: [{
        fileName: String,
        fileUrl: String
    }]
}, {
    timestamps: true
});

// คำนวณจำนวนวันลา (ไม่นับวันเสาร์-อาทิตย์)
leaveSchema.pre('save', function() {
    if (this.isModified('startDate') || this.isModified('endDate')) {
        const start = new Date(this.startDate);
        const end = new Date(this.endDate);
        let days = 0;
        
        for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
            const dayOfWeek = d.getDay();
            if (dayOfWeek !== 0 && dayOfWeek !== 6) { // ไม่นับวันอาทิตย์(0) และวันเสาร์(6)
                days++;
            }
        }
        
        this.totalDays = days;
    }
});

module.exports = mongoose.model('Leave', leaveSchema);
