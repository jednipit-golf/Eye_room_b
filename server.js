const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const helmet = require('helmet');
const sanitizeMiddleware = require('./middleware/sanitizeMiddleware');
const limiter = require('./middleware/rateLimiter');
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

// Middleware
app.use(cors());

//body parser
app.use(express.json());

//Cookie parser
app.use(cookieParser());

//Sanitize data
app.use(sanitizeMiddleware);

//Set security headers
app.use(helmet());

//Prevent XSS attacks
app.use(xss());

// Apply rate limiter
app.use(limiter);

//Prevent http param pollutions
app.use(hpp());

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

const PORT = process.env.PORT || 5000;

const server = app.listen(PORT, console.log('Server running in ', process.env.NODE_ENV, ' mode on port ', PORT));

//Handle unhandled promise rejections 
process.on('unhandledRejection', (err, promise) => {
    console.log(`Error: ${err.message}`);
    //Close server & exit process 
    server.close(() => process.exit(1));
});
