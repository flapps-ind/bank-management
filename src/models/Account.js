const mongoose = require("mongoose");
const crypto = require("crypto");

const accountSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    type: { type: String, enum: ["savings", "checking"], required: true },
    accountNumber: {
      type: String,
      unique: true,
      required: true,
      default: () => String(crypto.randomInt(1_000_000_000, 10_000_000_000)),
    },
    balance: { type: Number, default: 0, min: 0 },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Account", accountSchema);
