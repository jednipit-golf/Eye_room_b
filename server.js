const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const mongoSanitize = require('express-mongo-sanitize');
const helmet = require('helmet');
const { xss } = require('express-xss-sanitizer');
const rateLimit = require('express-rate-limit');
const hpp=require('hpp');

require('dotenv').config();
const connectDB = require('./config/database');

// Import routes
const authRoutes = require('./routes/authRoutes');
const leaveRoutes = require('./routes/leaveRoutes');

// Connect to MongoDB
connectDB();

const app = express();

//body parser
app.use(express.json());

//Cookie parser
app.use(cookieParser());

//Sanitize data
app.use(mongoSanitize());

//Set security headers
app.use(helmet());

//Prevent XSS attacks
app.use(xss());

//Rate Limiting
const limiter = rateLimit({
    windowsMs: 10 * 60 * 1000,//10 mins
    max: 100
});
app.use(limiter);

//Prevent http param pollutions
app.use(hpp());

// Middleware
app.use(cors());

// Routes
app.get('/', (req, res) => {
    res.json({
        success: true,
        message: 'Leave Request Booking System API',
        version: '1.0.0'
    });
});

app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/leaves', leaveRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({
        success: false,
        message: 'เกิดข้อผิดพลาดในระบบ',
        error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
});

// เริ่ม server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`📝 Environment: ${process.env.NODE_ENV || 'development'}`);
});
