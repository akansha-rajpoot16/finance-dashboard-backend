const Transaction = require('../models/Transaction');
const ApiError = require('../utils/apiError');

/**
 * checkTransactionOwnership — ensures the requesting user owns the transaction.
 *
 * Admins bypass this check and can access any transaction.
 * The loaded transaction is attached to req.transaction to avoid a second
 * DB round-trip in the controller.
 *
 * Place AFTER authenticate in the middleware chain:
 *   router.patch('/:id', authenticate, checkTransactionOwnership, updateTransaction);
 */
const checkTransactionOwnership = async (req, res, next) => {
  try {
    const transaction = await Transaction.findById(req.params.id).active();

    if (!transaction) {
      throw new ApiError(404, 'Transaction not found');
    }

    // Admins can modify anyone's transaction
    if (req.user.role === 'admin') {
      req.transaction = transaction;
      return next();
    }

    // For all other roles, enforce ownership
    if (transaction.userId.toString() !== req.user._id.toString()) {
      throw new ApiError(403, 'You do not have permission to access this transaction');
    }

    req.transaction = transaction; // pass to controller without re-querying
    next();
  } catch (err) {
    next(err);
  }
};

module.exports = { checkTransactionOwnership };
