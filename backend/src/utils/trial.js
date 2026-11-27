const User = require("../models/User");

const TRIAL_DURATION_MS = 24 * 60 * 60 * 1000;

const isTrialActive = (user) =>
  !!(
    user &&
    user.trialEligible &&
    user.trialStartedAt &&
    user.trialEndsAt &&
    new Date(user.trialEndsAt).getTime() > Date.now()
  );

// Starts the one-day free trial on the user's first authenticated use.
// Returns true when the trial was just started.
const ensureTrialStarted = async (user) => {
  if (!user || !user.trialEligible || user.trialStartedAt) return false;

  const now = new Date();
  const trialEndsAt = new Date(now.getTime() + TRIAL_DURATION_MS);

  // Atomic guard so concurrent requests cannot restart/extend the trial.
  const result = await User.updateOne(
    { _id: user._id, trialStartedAt: null },
    { $set: { trialStartedAt: now, trialEndsAt } }
  );

  if (!result.modifiedCount) return false;

  user.trialStartedAt = now;
  user.trialEndsAt = trialEndsAt;
  return true;
};

module.exports = {
  TRIAL_DURATION_MS,
  isTrialActive,
  ensureTrialStarted,
};
