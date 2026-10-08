const mongoose = require("mongoose");

// Runs `work(session)` inside a MongoDB transaction.
// If anything throws, every write made with the session is rolled back.
module.exports = async function runInTransaction(work) {
  const session = await mongoose.startSession();
  try {
    let result;
    await session.withTransaction(async () => {
      result = await work(session);
    });
    return result;
  } finally {
    await session.endSession();
  }
};
