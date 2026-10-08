const express = require("express");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const AppError = require("../utils/AppError");
const asyncHandler = require("../utils/asyncHandler");

const router = express.Router();

const signToken = (user) =>
  jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || "1d",
  });

router.post(
  "/register",
  asyncHandler(async (req, res) => {
    const { name, email, password } = req.body;
    if (!name || !email || !password) throw new AppError("name, email and password are required");
    if (password.length < 8) throw new AppError("password must be at least 8 characters");

    if (await User.exists({ email: email.toLowerCase() })) {
      throw new AppError("Email already registered", 409);
    }
    const user = await User.create({ name, email, password });
    res.status(201).json({
      token: signToken(user),
      user: { id: user._id, name: user.name, email: user.email },
    });
  })
);

router.post(
  "/login",
  asyncHandler(async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) throw new AppError("email and password are required");

    const user = await User.findOne({ email: email.toLowerCase() }).select("+password");
    if (!user || !(await user.comparePassword(password))) {
      throw new AppError("Invalid credentials", 401);
    }
    res.json({
      token: signToken(user),
      user: { id: user._id, name: user.name, email: user.email },
    });
  })
);

module.exports = router;
