const jwt = require('jsonwebtoken');
const User = require('../models/User');
const ApiError = require('../utils/apiError');

/**
 * authenticate — verifies the JWT in the Authorization header.
 *
 * On success, attaches the full user document to req.user so downstream
 * middleware and controllers can use it without additional DB queries.
 *
 * Flow:
 *   Authorization: Bearer <token>
 *   → decode token → load user → check status → attach to req
 */
const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new ApiError(401, 'Authentication token missing');
    }

    const token = authHeader.split(' ')[1];

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (err) {
      // Differentiate expired vs tampered tokens for better client messages
      const message =
        err.name === 'TokenExpiredError' ? 'Token has expired' : 'Invalid token';
      throw new ApiError(401, message);
    }

    // Re-fetch user so we catch role changes or deactivations since token issue
    const user = await User.findById(decoded.id);
    if (!user) throw new ApiError(401, 'User no longer exists');
    if (user.status === 'inactive') throw new ApiError(403, 'Account is inactive');

    req.user = user;
    next();
  } catch (err) {
    next(err);
  }
};

module.exports = { authenticate };
