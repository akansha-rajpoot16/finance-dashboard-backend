/**
 * Custom error class that carries an HTTP status code.
 * Thrown from controllers/middleware and caught by the global error handler.
 *
 * Usage:
 *   throw new ApiError(404, 'Transaction not found');
 */
class ApiError extends Error {
  constructor(statusCode, message) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true; // distinguishes thrown errors from unexpected crashes
  }
}

module.exports = ApiError;
