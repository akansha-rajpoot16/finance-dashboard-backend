const mongoose = require('mongoose');

/**
 * Transaction Schema
 *
 * Design notes:
 * - userId references the User model — enables population and ownership checks.
 * - isDeleted enables soft delete: records are hidden but not erased from the DB.
 * - Compound index on (userId, date) speeds up per-user date-range queries.
 * - Amount is stored in minor currency units (cents) as a Number to avoid
 *   floating-point issues; you may also use mongoose-currency or Decimal128.
 */
const transactionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    amount: {
      type: Number,
      required: [true, 'Amount is required'],
      min: [0.01, 'Amount must be greater than 0'],
    },
    type: {
      type: String,
      enum: {
        values: ['income', 'expense'],
        message: 'Type must be income or expense',
      },
      required: [true, 'Transaction type is required'],
    },
    category: {
      type: String,
      required: [true, 'Category is required'],
      trim: true,
      maxlength: [50, 'Category cannot exceed 50 characters'],
    },
    date: {
      type: Date,
      required: [true, 'Date is required'],
      default: Date.now,
    },
    description: {
      type: String,
      trim: true,
      maxlength: [500, 'Description cannot exceed 500 characters'],
    },
    isDeleted: {
      type: Boolean,
      default: false,
      index: true, // filtered out in most queries
    },
  },
  {
    timestamps: true,
  }
);

// ── Compound index: most dashboard queries filter by user + date ──────────────
transactionSchema.index({ userId: 1, date: -1 });
transactionSchema.index({ userId: 1, type: 1 });
transactionSchema.index({ userId: 1, category: 1 });

// ── Query helper: automatically exclude soft-deleted records ─────────────────
// Attach .active() to any query: Transaction.find().active()
transactionSchema.query.active = function () {
  return this.where({ isDeleted: false });
};

module.exports = mongoose.model('Transaction', transactionSchema);
