const mongoose = require("mongoose");

const deletedUserTrialSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  trialExpired: { type: Boolean, default: false },
  freeTrialStart: { type: Date },
  freeTrialEnd: { type: Date },
  freeTrialActive: { type: Boolean, default: false },
  deletedAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("DeletedUserTrial", deletedUserTrialSchema);
