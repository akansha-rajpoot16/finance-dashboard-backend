const User = require('../models/User');
const Transaction = require('../models/Transaction');
const ApiError = require('../utils/apiError');
const { sendResponse } = require('../utils/apiResponse');

const getAllUsers = async (req, res, next) => {
  try {
    const { role, status, page = 1, limit = 20 } = req.query;
    const filter = {};
    if (role) filter.role = role;
    if (status) filter.status = status;
    const skip = (Number(page) - 1) * Number(limit);
    const [users, total] = await Promise.all([
      User.find(filter).sort({ createdAt: -1 }).skip(skip).limit(Number(limit)),
      User.countDocuments(filter),
    ]);
    sendResponse(res, 200, 'Users fetched', {
      users,
      pagination: { total, page: Number(page), pages: Math.ceil(total / Number(limit)), limit: Number(limit) },
    });
  } catch (err) { next(err); }
};

const getUserById = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) throw new ApiError(404, 'User not found');
    sendResponse(res, 200, 'User fetched', { user });
  } catch (err) { next(err); }
};

const updateUser = async (req, res, next) => {
  try {
    const { name, role, status } = req.body;
    const allowedUpdates = {};
    if (name) allowedUpdates.name = name;
    if (role) allowedUpdates.role = role;
    if (status) allowedUpdates.status = status;
    const user = await User.findByIdAndUpdate(req.params.id, allowedUpdates, { new: true, runValidators: true });
    if (!user) throw new ApiError(404, 'User not found');
    sendResponse(res, 200, 'User updated', { user });
  } catch (err) { next(err); }
};

const deleteUser = async (req, res, next) => {
  try {
    const user = await User.findByIdAndDelete(req.params.id);
    if (!user) throw new ApiError(404, 'User not found');
    await Transaction.deleteMany({ userId: req.params.id });
    sendResponse(res, 200, 'User and associated transactions deleted');
  } catch (err) { next(err); }
};

module.exports = { getAllUsers, getUserById, updateUser, deleteUser };