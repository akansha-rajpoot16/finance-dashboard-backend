/**
 * Sends a consistent JSON response envelope.
 *
 * Every success response follows this shape:
 * {
 *   "success": true,
 *   "message": "...",
 *   "data": { ... }
 * }
 *
 * This keeps client parsing predictable.
 */
const sendResponse = (res, statusCode, message, data = null) => {
  const payload = { success: true, message };
  if (data !== null) payload.data = data;
  return res.status(statusCode).json(payload);
};

module.exports = { sendResponse };
