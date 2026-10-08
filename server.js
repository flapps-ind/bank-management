require("dotenv").config();
const express = require("express");
const connectDB = require("./src/config/db");

const authRoutes = require("./src/routes/auth");
const accountRoutes = require("./src/routes/accounts");
const transferRoutes = require("./src/routes/transfers");

const app = express();
app.use(express.json());

app.get("/health", (req, res) => res.json({ status: "ok" }));
app.use("/api/auth", authRoutes);
app.use("/api/accounts", accountRoutes);
app.use("/api/transfers", transferRoutes);

app.use((req, res) => res.status(404).json({ message: "Route not found" }));

// Central error handler
app.use((err, req, res, next) => {
  if (err.name === "CastError") return res.status(400).json({ message: "Invalid id" });
  if (err.name === "ValidationError") return res.status(400).json({ message: err.message });
  if (err.code === 11000) return res.status(409).json({ message: "Duplicate value" });
  const status = err.status || 500;
  if (status === 500) console.error(err);
  res.status(status).json({ message: status === 500 ? "Internal server error" : err.message });
});

async function start() {
  if (!process.env.MONGO_URI || !process.env.JWT_SECRET) {
    throw new Error("MONGO_URI and JWT_SECRET must be set in .env");
  }
  await connectDB();
  const port = process.env.PORT || 3000;
  app.listen(port, () => console.log(`Server running on port ${port}`));
}

start().catch((err) => {
  console.error(err);
  process.exit(1);
});
