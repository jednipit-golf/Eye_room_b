const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const helmet = require('helmet');
const sanitizeMiddleware = require('./middleware/sanitizeMiddleware');
const limiter = require('./middleware/rateLimiter');
const requestLogger = require('./middleware/requestLogger');
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

// Set to the verified ingress proxy IPs/CIDRs, nearest to the app through the edge.
// Express stops at the first untrusted address. Direct deployments use the socket IP.
const trustedProxies = process.env.TRUSTED_PROXY_CIDRS;
if (trustedProxies) {
    app.set('trust proxy', trustedProxies.split(',').map(value => value.trim()));
}
app.use(requestLogger);

// CORS configuration
const isDevelopment = process.env.NODE_ENV === 'development';
const configuredOrigins = process.env.CORS_ALLOWED_ORIGINS ?? process.env.FRONTEND_URL ?? '';
const allowedOrigins = new Set();
for (const entry of configuredOrigins.split(',').map(value => value.trim()).filter(Boolean)) {
    const url = new URL(entry);
    if (!['https:', 'http:'].includes(url.protocol) ||
        (entry !== url.origin && entry !== url.origin + '/') || entry.includes('*')) {
        throw new Error('CORS origins must be exact HTTP(S) origins');
    }
    const host = url.hostname.replace(/\.$/, '');
    const isLocalhost = host === 'localhost' || host.endsWith('.localhost') ||
        /^127\.\d+\.\d+\.\d+$/.test(host) || host === '[::1]';
    if (isDevelopment || (!isLocalhost && url.protocol === 'https:')) {
        allowedOrigins.add(url.origin);
    }
}
if (isDevelopment) allowedOrigins.add('http://localhost:5173');

const corsOptions = {
    origin: function (origin, callback) {
        // Allow requests with no origin (like mobile apps or curl)
        if (origin === undefined || allowedOrigins.has(origin)) return callback(null, true);
        const error = new Error('Not allowed by CORS');
        error.status = 403;
        callback(error);
    },
    credentials: true,
    optionsSuccessStatus: 200
};

// Middleware
app.use(cors(corsOptions));

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

app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', timestamp: Date.now() });
});

app.get('/', (req, res) => {
  res.send('Hello from app — healthy');
});

const PORT = process.env.PORT || 5000;

// Parser and URL-decoding errors can include raw user input in Express's default error log.
app.use((err, req, res, next) => {
    if (!res.headersSent && (err.type === 'entity.parse.failed' || err instanceof URIError)) {
        return res.sendStatus(err.status || 400);
    }
    next(err);
});

const server = app.listen(PORT, console.log('Server running in ', process.env.NODE_ENV, ' mode on port ', PORT));

//Handle unhandled promise rejections 
process.on('unhandledRejection', (err, promise) => {
    console.log(`Error: ${err.message}`);
    //Close server & exit process 
    server.close(() => process.exit(1));
});
