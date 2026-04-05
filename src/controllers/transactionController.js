const Transaction = require('../models/Transaction');
const ApiError = require('../utils/apiError');
const { sendResponse } = require('../utils/apiResponse');

/**
 * Builds a MongoDB filter object from query parameters.
 *
 * Centralising filter logic here keeps controller actions clean
 * and makes it easy to add new filter fields later.
 */
const buildFilter = (query, userId, isAdmin) => {
  const filter = { isDeleted: false };

  // Non-admins can only see their own transactions
  if (!isAdmin) filter.userId = userId;

  // Optional: admin can filter by a specific user
  if (isAdmin && query.userId) filter.userId = query.userId;

  if (query.type) filter.type = query.type;
  if (query.category) filter.category = new RegExp(query.category, 'i'); // case-insensitive
  if (query.startDate || query.endDate) {
    filter.date = {};
    if (query.startDate) filter.date.$gte = new Date(query.startDate);
    if (query.endDate) filter.date.$lte = new Date(query.endDate);
  }

  return filter;
};

// ── GET /api/transactions ─────────────────────────────────────────────────────
const getTransactions = async (req, res, next) => {
  try {
    const isAdmin = req.user.role === 'admin';
    const { page = 1, limit = 20, sortBy = 'date', sortOrder = 'desc' } = req.query;

    const filter = buildFilter(req.query, req.user._id, isAdmin);
    const skip = (Number(page) - 1) * Number(limit);
    const sort = { [sortBy]: sortOrder === 'asc' ? 1 : -1 };

    const [transactions, total] = await Promise.all([
      Transaction.find(filter)
        .populate('userId', 'name email') // join user info for admin views
        .sort(sort)
        .skip(skip)
        .limit(Number(limit)),
      Transaction.countDocuments(filter),
    ]);

    sendResponse(res, 200, 'Transactions fetched', {
      transactions,
      pagination: {
        total,
        page: Number(page),
        pages: Math.ceil(total / Number(limit)),
        limit: Number(limit),
      },
    });
  } catch (err) {
    next(err);
  }
};

// ── GET /api/transactions/:id ─────────────────────────────────────────────────
const getTransactionById = async (req, res, next) => {
  try {
    // req.transaction is already loaded and ownership-checked by middleware
    sendResponse(res, 200, 'Transaction fetched', { transaction: req.transaction });
  } catch (err) {
    next(err);
  }
};

// ── POST /api/transactions ────────────────────────────────────────────────────
const createTransaction = async (req, res, next) => {
  try {
    const { amount, type, category, date, description } = req.body;

    const transaction = await Transaction.create({
      userId: req.user._id, // always tied to the authenticated user
      amount,
      type,
      category,
      date: date || new Date(),
      description,
    });

    sendResponse(res, 201, 'Transaction created', { transaction });
  } catch (err) {
    next(err);
  }
};

// ── PATCH /api/transactions/:id ──────────────────────────────────────────────
const updateTransaction = async (req, res, next) => {
  try {
    const { amount, type, category, date, description } = req.body;

    // Pick only fields that were sent; don't overwrite fields with undefined
    const updates = {};
    if (amount !== undefined) updates.amount = amount;
    if (type !== undefined) updates.type = type;
    if (category !== undefined) updates.category = category;
    if (date !== undefined) updates.date = date;
    if (description !== undefined) updates.description = description;

    // req.transaction was loaded by ownership middleware — just update it
    Object.assign(req.transaction, updates);
    await req.transaction.save({ runValidators: true });

    sendResponse(res, 200, 'Transaction updated', { transaction: req.transaction });
  } catch (err) {
    next(err);
  }
};

// ── DELETE /api/transactions/:id (soft delete) ───────────────────────────────
const deleteTransaction = async (req, res, next) => {
  try {
    // Soft delete: mark isDeleted = true instead of removing from DB.
    // Preserves data for auditing and allows potential recovery.
    req.transaction.isDeleted = true;
    await req.transaction.save();

    sendResponse(res, 200, 'Transaction deleted');
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getTransactions,
  getTransactionById,
  createTransaction,
  updateTransaction,
  deleteTransaction,
};
