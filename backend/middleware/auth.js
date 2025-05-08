const jwt = require('jsonwebtoken');
const logger = require('../logger');

/**
 * Middleware for authenticating JWT tokens.
 * Validates the presence and format of the token before decoding it.
 */
function authenticateJWT(req, res, next) {
    const authHeader = req.headers['authorization'];
    if (!authHeader) {
        logger.warn(`Unauthorized request to ${req.originalUrl} - Missing token`);
        return res.status(401).json({ error: 'Missing token' });
    }

    const token = authHeader.split(' ')[1];
    if (!token) {
      logger.warn(`Unauthorized request to ${req.originalUrl} - Invalid token format`);
        return res.status(401).json({ error: 'Invalid token format' });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.auth = decoded;  // contains sub and type
        logger.info(`Token verified for user ${decoded.sub}, type: ${decoded.type}`);
        next();
    } catch (err) {
      logger.error(`Token verification failed for request to ${req.originalUrl} - ${err.message}`);
        return res.status(403).json({ error: 'Invalid or expired token' });
    }
}

module.exports = authenticateJWT;