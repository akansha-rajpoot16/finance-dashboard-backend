require('dotenv').config();
const express = require('express');
const rateLimit = require('express-rate-limit');
const connectDB = require('./config/db');
const ApiError = require('./utils/apiError');

// ── Route modules ────────────────────────────────────────────────────────────
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const transactionRoutes = require('./routes/transactions');
const dashboardRoutes = require('./routes/dashboard');

const app = express();

// ── Connect to MongoDB ───────────────────────────────────────────────────────
connectDB();

// ── Global Middleware ────────────────────────────────────────────────────────
app.use(express.json({ limit: '10kb' })); // reject oversized payloads
app.use(express.urlencoded({ extended: true }));

// Rate limiting — applied globally; tighten per-route if needed
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,                  // max 100 requests per window per IP
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many requests, please try again later.' },
});
app.use('/api', limiter);

// Stricter limiter on auth endpoints to slow brute-force attempts
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { success: false, message: 'Too many auth attempts, please try again later.' },
});
app.use('/api/auth', authLimiter);

// ── Routes ───────────────────────────────────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/dashboard', dashboardRoutes);

// Health check — useful for uptime monitors / load balancers
app.get('/health', (req, res) => res.json({ status: 'ok', timestamp: new Date() }));

// ── 404 Handler ──────────────────────────────────────────────────────────────
app.use((req, res, next) => {
  next(new ApiError(404, `Route ${req.originalUrl} not found`));
});

// ── Global Error Handler ─────────────────────────────────────────────────────
/**
 * Centralised error handling keeps controllers free of try/catch boilerplate
 * beyond the basic next(err) call.
 *
 * Two error types:
 *   - ApiError (operational): known, expected errors — return the message directly.
 *   - Other errors: unexpected crashes — log details, return a generic 500.
 */
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  // Mongoose validation error — extract human-readable messages
  if (err.name === 'ValidationError') {
    const messages = Object.values(err.errors).map((e) => e.message);
    return res.status(400).json({ success: false, message: messages.join('. ') });
  }

  // Mongoose cast error (invalid ObjectId format)
  if (err.name === 'CastError') {
    return res.status(400).json({ success: false, message: 'Invalid ID format' });
  }

  if (err.isOperational) {
    // Known ApiError — safe to expose message to client
    return res.status(err.statusCode).json({ success: false, message: err.message });
  }

  // Unknown error — log for debugging, hide internals from client
  console.error('UNEXPECTED ERROR:', err);
  return res.status(500).json({ success: false, message: 'Internal server error' });
});

// ── Start server ─────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT} [${process.env.NODE_ENV || 'development'}]`);
});

module.exports = app;
