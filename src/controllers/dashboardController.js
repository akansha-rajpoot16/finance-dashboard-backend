const Transaction = require('../models/Transaction');
const { sendResponse } = require('../utils/apiResponse');

/**
 * Determines the MongoDB userId filter based on role.
 * Admins can optionally pass ?userId= to scope results to one user.
 */
const getUserScope = (req) => {
  if (req.user.role === 'admin' && req.query.userId) {
    return { $match: { userId: new require('mongoose').Types.ObjectId(req.query.userId) } };
  }
  if (req.user.role !== 'admin') {
    return { $match: { userId: req.user._id } };
  }
  return { $match: {} }; // admin with no filter sees all
};

// ── GET /api/dashboard/summary ───────────────────────────────────────────────
/**
 * Returns total income, expenses, and net balance for the user.
 *
 * Uses a single aggregation pipeline with $facet to compute all three
 * figures in one DB round-trip — more efficient than three separate queries.
 */
const getSummary = async (req, res, next) => {
  try {
    const userScope = getUserScope(req);

    const [result] = await Transaction.aggregate([
      userScope,
      { $match: { isDeleted: false } },
      {
        $group: {
          _id: '$type',
          total: { $sum: '$amount' },
          count: { $sum: 1 },
        },
      },
    ]);

    // Reshape aggregation results into a clean object
    const raw = await Transaction.aggregate([
      userScope,
      { $match: { isDeleted: false } },
      {
        $group: {
          _id: '$type',
          total: { $sum: '$amount' },
          count: { $sum: 1 },
        },
      },
    ]);

    const totals = { income: 0, expense: 0, incomeCount: 0, expenseCount: 0 };
    raw.forEach(({ _id, total, count }) => {
      if (_id === 'income') { totals.income = total; totals.incomeCount = count; }
      if (_id === 'expense') { totals.expense = total; totals.expenseCount = count; }
    });

    sendResponse(res, 200, 'Summary fetched', {
      totalIncome: totals.income,
      totalExpenses: totals.expense,
      netBalance: totals.income - totals.expense,
      transactionCount: totals.incomeCount + totals.expenseCount,
    });
  } catch (err) {
    next(err);
  }
};

// ── GET /api/dashboard/category-totals ──────────────────────────────────────
/**
 * Returns per-category totals, split by income and expense.
 * Useful for pie/donut charts on the frontend.
 */
const getCategoryTotals = async (req, res, next) => {
  try {
    const userScope = getUserScope(req);

    const data = await Transaction.aggregate([
      userScope,
      { $match: { isDeleted: false } },
      {
        $group: {
          _id: { category: '$category', type: '$type' },
          total: { $sum: '$amount' },
          count: { $sum: 1 },
        },
      },
      {
        $group: {
          _id: '$_id.category',
          breakdown: {
            $push: {
              type: '$_id.type',
              total: '$total',
              count: '$count',
            },
          },
          categoryTotal: { $sum: '$total' },
        },
      },
      { $sort: { categoryTotal: -1 } },
      {
        $project: {
          _id: 0,
          category: '$_id',
          breakdown: 1,
          categoryTotal: 1,
        },
      },
    ]);

    sendResponse(res, 200, 'Category totals fetched', { categories: data });
  } catch (err) {
    next(err);
  }
};

// ── GET /api/dashboard/monthly-trends ───────────────────────────────────────
/**
 * Returns monthly income vs expense for the past N months (default 12).
 * Grouped at the DB level using $dateToString for efficiency.
 */
const getMonthlyTrends = async (req, res, next) => {
  try {
    const userScope = getUserScope(req);
    const months = Math.min(Number(req.query.months) || 12, 24); // cap at 24

    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - months);

    const data = await Transaction.aggregate([
      userScope,
      {
        $match: {
          isDeleted: false,
          date: { $gte: startDate },
        },
      },
      {
        $group: {
          _id: {
            year: { $year: '$date' },
            month: { $month: '$date' },
            type: '$type',
          },
          total: { $sum: '$amount' },
          count: { $sum: 1 },
        },
      },
      {
        $group: {
          _id: { year: '$_id.year', month: '$_id.month' },
          breakdown: {
            $push: { type: '$_id.type', total: '$total', count: '$count' },
          },
        },
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } },
      {
        $project: {
          _id: 0,
          year: '$_id.year',
          month: '$_id.month',
          // Label like "2024-03" for easy charting
          period: {
            $concat: [
              { $toString: '$_id.year' },
              '-',
              {
                $cond: [
                  { $lt: ['$_id.month', 10] },
                  { $concat: ['0', { $toString: '$_id.month' }] },
                  { $toString: '$_id.month' },
                ],
              },
            ],
          },
          breakdown: 1,
        },
      },
    ]);

    sendResponse(res, 200, 'Monthly trends fetched', { trends: data });
  } catch (err) {
    next(err);
  }
};

// ── GET /api/dashboard/recent ────────────────────────────────────────────────
/**
 * Returns the N most recent transactions (default 10).
 */
const getRecentTransactions = async (req, res, next) => {
  try {
    const isAdmin = req.user.role === 'admin';
    const limit = Math.min(Number(req.query.limit) || 10, 50);

    const filter = { isDeleted: false };
    if (!isAdmin) filter.userId = req.user._id;

    const transactions = await Transaction.find(filter)
      .populate('userId', 'name email')
      .sort({ date: -1 })
      .limit(limit);

    sendResponse(res, 200, 'Recent transactions fetched', { transactions });
  } catch (err) {
    next(err);
  }
};

module.exports = { getSummary, getCategoryTotals, getMonthlyTrends, getRecentTransactions };
