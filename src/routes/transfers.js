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

// Transfer from one of MY accounts to any account (by account number).
// Debit + credit + ledger entry succeed together or not at all.
router.post(
  "/",
  asyncHandler(async (req, res) => {
    const { fromAccountId, toAccountNumber } = req.body;
    const amount = parseAmount(req.body.amount);
    if (!fromAccountId || !toAccountNumber) {
      throw new AppError("fromAccountId and toAccountNumber are required");
    }

    const result = await runInTransaction(async (session) => {
      const from = await Account.findOneAndUpdate(
        { _id: fromAccountId, userId: req.user.id, balance: { $gte: amount } },
        { $inc: { balance: -amount } },
        { new: true, session }
      );
      if (!from) {
        const exists = await Account.exists({ _id: fromAccountId, userId: req.user.id }).session(session);
        throw exists ? new AppError("Insufficient funds", 400) : new AppError("Source account not found", 404);
      }

      if (from.accountNumber === toAccountNumber) {
        throw new AppError("Cannot transfer to the same account", 400);
      }

      const to = await Account.findOneAndUpdate(
        { accountNumber: toAccountNumber },
        { $inc: { balance: amount } },
        { new: true, session }
      );
      // Throwing here aborts the transaction, so the debit above is rolled back
      if (!to) throw new AppError("Destination account not found", 404);

      const [transaction] = await Transaction.create(
        [{ type: "transfer", fromAccount: from._id, toAccount: to._id, amount, performedBy: req.user.id }],
        { session }
      );
      return { transaction, fromBalance: from.balance };
    });

    res.status(201).json(result);
  })
);

module.exports = router;
