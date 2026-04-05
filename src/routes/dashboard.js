const express = require('express');
const router = express.Router();
const {
  getSummary,
  getCategoryTotals,
  getMonthlyTrends,
  getRecentTransactions,
} = require('../controllers/dashboardController');
const { authenticate } = require('../middleware/auth');
const { authorize } = require('../middleware/rbac');

// Dashboard is accessible to all authenticated users (viewer and above)
router.use(authenticate, authorize('viewer'));

router.get('/summary', getSummary);
router.get('/category-totals', getCategoryTotals);
router.get('/monthly-trends', getMonthlyTrends);
router.get('/recent', getRecentTransactions);

module.exports = router;
