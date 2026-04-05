const jwt = require('jsonwebtoken');

const User = require('../models/User');
const ApiError = require('../utils/apiError');
const { sendResponse } = require('../utils/apiResponse');

/**
 * Generates a signed JWT for a given user ID.
 * The token payload is intentionally minimal — only the ID.
 * Role and status are re-fetched from the DB on each request (see auth middleware).
 */
const signToken = (userId) =>
  jwt.sign({ id: userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });

// ── POST /api/auth/register ──────────────────────────────────────────────────
const register = async (req, res, next) => {
  try {
    const { name, email, password, role } = req.body;

    // Prevent self-assignment of admin role during registration
    const safeRole = role === 'admin' ? 'viewer' : role;

    const user = await User.create({ name, email, password, role: safeRole });
    const token = signToken(user._id);

    sendResponse(res, 201, 'User registered successfully', { token, user });
  } catch (err) {
    // Mongoose duplicate key error (email already exists)
    if (err.code === 11000) {
      return next(new ApiError(409, 'Email is already registered'));
    }
    next(err);
  }
};

// ── POST /api/auth/login ─────────────────────────────────────────────────────
const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      throw new ApiError(400, 'Email and password are required');
    }

    // Explicitly select password since it's excluded by default in the schema
    const user = await User.findOne({ email }).select('+password');

    if (!user || !(await user.comparePassword(password))) {
      // Use a generic message to prevent user enumeration attacks
      throw new ApiError(401, 'Invalid email or password');
    }

    if (user.status === 'inactive') {
      throw new ApiError(403, 'Account is inactive. Contact an administrator.');
    }

    const token = signToken(user._id);

    // Strip password before sending (schema toJSON handles this too, but be explicit)
    user.password = undefined;

    sendResponse(res, 200, 'Login successful', { token, user });
  } catch (err) {
    next(err);
  }
};

// ── GET /api/auth/me ─────────────────────────────────────────────────────────
const getMe = async (req, res, next) => {
  try {
    sendResponse(res, 200, 'Current user fetched', { user: req.user });
  } catch (err) {
    next(err);
  }
};

module.exports = { register, login, getMe };
