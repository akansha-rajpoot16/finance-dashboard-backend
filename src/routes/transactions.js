const express = require('express');
const router = express.Router();
const {
  getTransactions,
  getTransactionById,
  createTransaction,
  updateTransaction,
  deleteTransaction,
} = require('../controllers/transactionController');
const { authenticate } = require('../middleware/auth');
const { authorize } = require('../middleware/rbac');
const { checkTransactionOwnership } = require('../middleware/ownership');

// All transaction routes require authentication.
// Analysts and above can read; all roles can manage their own transactions.
router.use(authenticate);

// List & create — available to analyst+ for listing; viewer can create own
router.get('/', authorize('analyst'), getTransactions);
router.post('/', createTransaction); // any authenticated user

// Single transaction — ownership checked by middleware
router.get('/:id', authorize('analyst'), checkTransactionOwnership, getTransactionById);
router.patch('/:id', checkTransactionOwnership, updateTransaction);
router.delete('/:id', checkTransactionOwnership, deleteTransaction);

module.exports = router;
