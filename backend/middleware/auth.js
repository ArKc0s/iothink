const jwt = require('jsonwebtoken');
const { Logtail } = require('@logtail/node');

// Initialize Logtail for structured logging
const logtail = new Logtail(process.env.LOGTAIL_SOURCE_TOKEN);

/**
 * Middleware for JWT authentication
 * Validates the presence and validity of a JWT in the Authorization header.
 * Attaches the decoded token to the request object if valid.
 * Logs all failed attempts for better traceability.
 */
function authenticateJWT(req, res, next) {
    const authHeader = req.headers['authorization'];
    
    // Check for missing Authorization header
    if (!authHeader) {
        logtail.warn('Authentication attempt without token', {
            ip: req.ip,
            route: req.originalUrl,
            method: req.method,
            headers: req.headers
        });
        return res.status(401).json({ error: 'Missing token' });
    }
    
    // Extract and validate token format (Bearer <token>)
    const token = authHeader.split(' ')[1];
    if (!token) {
        logtail.warn('Authentication attempt with malformed token', {
            ip: req.ip,
            route: req.originalUrl,
            method: req.method,
            headers: req.headers
        });
        return res.status(401).json({ error: 'Invalid token format' });
    }
    
    try {
        // Verify the token
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.auth = decoded;  // Attach decoded payload (sub, type) to request
        logtail.info('Successful authentication', {
            ip: req.ip,
            route: req.originalUrl,
            method: req.method,
            user: decoded.sub,
            tokenType: decoded.type
        });
        next();
    } catch (err) {
        // Log the error for traceability
        logtail.error('Authentication failed', {
            ip: req.ip,
            route: req.originalUrl,
            method: req.method,
            error: err.message
        });
        return res.status(403).json({ error: 'Invalid or expired token' });
    }
}

module.exports = authenticateJWT;