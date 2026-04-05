const ApiError = require('../utils/apiError');

/**
 * Role hierarchy (higher index = more permissions).
 * Used so 'admin' implicitly satisfies 'analyst' or 'viewer' requirements.
 */
const ROLE_HIERARCHY = ['viewer', 'analyst', 'admin'];

/**
 * authorize(...roles) — factory that returns middleware enforcing role access.
 *
 * Usage:
 *   router.get('/users', authenticate, authorize('admin'), getAllUsers);
 *   router.get('/analytics', authenticate, authorize('analyst', 'admin'), getAnalytics);
 *
 * Design: we check that the user's role rank is >= the minimum required rank,
 * so an admin can always access analyst-or-viewer-only routes without listing
 * every role explicitly.
 */
const authorize = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return next(new ApiError(401, 'Not authenticated'));
    }

    const userRank = ROLE_HIERARCHY.indexOf(req.user.role);
    const minRequiredRank = Math.min(
      ...allowedRoles.map((r) => ROLE_HIERARCHY.indexOf(r))
    );

    if (userRank < minRequiredRank) {
      return next(
        new ApiError(403, `Access denied. Required role: ${allowedRoles.join(' or ')}`)
      );
    }

    next();
  };
};

module.exports = { authorize };
