const crypto = require("crypto");

function generateResetToken() {
  const token = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 phút
  return { token, expiresAt };
}

function isResetTokenValid(user, providedToken) {
  if (!user || !user.resetToken || !user.resetTokenExpiresAt) return false;
  const now = new Date();
  return (
    user.resetToken === providedToken &&
    now < new Date(user.resetTokenExpiresAt)
  );
}

module.exports = { generateResetToken, isResetTokenValid };
