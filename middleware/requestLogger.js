const morgan = require('morgan');
const { isIP } = require('node:net');

// An arbitrary URL segment can contain an email, credential, or leave record ID.
// Keep known endpoint and probe names readable even when routing never runs.
const publicSegments = new Set([
    'api', 'v1', 'auth', 'register', 'login', 'refresh-token', 'me', 'logout',
    'members', 'reset-password', 'leaves', 'my-leaves', 'stats', 'approve',
    'reject', 'cancel', 'health', 'admin', '.env', '.git', 'config', 'wp-login.php',
    'wp-admin', 'phpmyadmin'
]);

function logPath(path) {
    return path.slice(0, 512).split('/').map(segment => {
        if (!segment || publicSegments.has(segment.toLowerCase())) return segment;
        return ':redacted';
    }).join('/');
}

// Retain recognizable agent products and versions. Free-form comments may contain PII.
function logAgent(value) {
    if (!value) return null;
    const products = value.slice(0, 512).match(
        /\b(?:Mozilla|Firefox|Chrome|Chromium|Edg|Safari|Version|AppleWebKit|curl|PostmanRuntime|okhttp|Wget|UptimeRobot|Go-http-client|python-requests|node|undici)\b(?:\/\d{1,4}(?:\.\d{1,5}){0,3})?/gi
    );
    return products ? products.join(' ') : 'other';
}

module.exports = morgan((tokens, req, res) => {
    const path = req.originalUrl.split('?', 1)[0];
    const status = Number(tokens.status(req, res)) || null;
    if (path === '/health' && res.writableFinished && status >= 200 && status < 300) return;

    let level = 'info';
    if (status >= 500) level = 'error';
    else if (!res.writableFinished || status >= 400) level = 'warn';
    const responseTime = tokens['response-time'](req, res);
    return JSON.stringify({
        timestamp: tokens.date(req, res, 'iso'),
        level,
        ip: isIP(req.ip) ? req.ip : null,
        method: req.method,
        path: logPath(path),
        status,
        responseTimeMs: responseTime === undefined ? null : Number(responseTime),
        userAgent: logAgent(req.headers['user-agent'])
    });
});
