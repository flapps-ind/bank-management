const AppError = require("./AppError");

// Accepts a positive number with at most 2 decimal places
module.exports = function parseAmount(value) {
  const amount = Number(value);
  if (!Number.isFinite(amount) || amount <= 0 || Number(amount.toFixed(2)) !== amount) {
    throw new AppError("amount must be a positive number with at most 2 decimal places", 400);
  }
  return amount;
};
