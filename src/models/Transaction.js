const mongoose = require("mongoose");

const transactionSchema = new mongoose.Schema(
  {
    type: { type: String, enum: ["deposit", "withdraw", "transfer"], required: true },
    fromAccount: { type: mongoose.Schema.Types.ObjectId, ref: "Account" },
    toAccount: { type: mongoose.Schema.Types.ObjectId, ref: "Account" },
    amount: { type: Number, required: true, min: 0.01 },
    performedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Transaction", transactionSchema);
