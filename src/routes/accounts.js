const express = require("express");
const Account = require("../models/Account");
const Transaction = require("../models/Transaction");
const verifyToken = require("../middleware/verifyToken");
const AppError = require("../utils/AppError");
const asyncHandler = require("../utils/asyncHandler");
const parseAmount = require("../utils/parseAmount");
const runInTransaction = require("../utils/runInTransaction");

const router = express.Router();
router.use(verifyToken);

// Ownership check: an account is only visible to the user it belongs to
async function getOwnedAccount(req) {
  const account = await Account.findOne({ _id: req.params.id, userId: req.user.id });
  if (!account) throw new AppError("Account not found", 404);
  return account;
}

router.post(
  "/",
  asyncHandler(async (req, res) => {
    const { type } = req.body;
    if (!["savings", "checking"].includes(type)) {
      throw new AppError("type must be 'savings' or 'checking'");
    }
    const account = await Account.create({ userId: req.user.id, type });
    res.status(201).json(account);
  })
);

router.get(
  "/",
  asyncHandler(async (req, res) => {
    res.json(await Account.find({ userId: req.user.id }));
  })
);

router.get(
  "/:id",
  asyncHandler(async (req, res) => {
    res.json(await getOwnedAccount(req));
  })
);

router.post(
  "/:id/deposit",
  asyncHandler(async (req, res) => {
    const amount = parseAmount(req.body.amount);

    const account = await runInTransaction(async (session) => {
      const updated = await Account.findOneAndUpdate(
        { _id: req.params.id, userId: req.user.id },
        { $inc: { balance: amount } }, // atomic increment
        { new: true, session }
      );
      if (!updated) throw new AppError("Account not found", 404);
      await Transaction.create(
        [{ type: "deposit", toAccount: updated._id, amount, performedBy: req.user.id }],
        { session }
      );
      return updated;
    });

    res.json(account);
  })
);

router.post(
  "/:id/withdraw",
  asyncHandler(async (req, res) => {
    const amount = parseAmount(req.body.amount);

    const account = await runInTransaction(async (session) => {
      // The balance check and the decrement happen in one atomic operation
      const updated = await Account.findOneAndUpdate(
        { _id: req.params.id, userId: req.user.id, balance: { $gte: amount } },
        { $inc: { balance: -amount } },
        { new: true, session }
      );
      if (!updated) {
        const exists = await Account.exists({ _id: req.params.id, userId: req.user.id }).session(session);
        throw exists ? new AppError("Insufficient funds", 400) : new AppError("Account not found", 404);
      }
      await Transaction.create(
        [{ type: "withdraw", fromAccount: updated._id, amount, performedBy: req.user.id }],
        { session }
      );
      return updated;
    });

    res.json(account);
  })
);

router.get(
  "/:id/transactions",
  asyncHandler(async (req, res) => {
    const account = await getOwnedAccount(req);
    const transactions = await Transaction.find({
      $or: [{ fromAccount: account._id }, { toAccount: account._id }],
    }).sort({ createdAt: -1 });
    res.json(transactions);
  })
);

module.exports = router;
