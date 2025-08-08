const express = require("express");
const { ObjectId } = require("mongodb");

const { db } = require("../utils/conect.mongo");
const hashPassword = require("../utils/hasPassword");
const authenticateToken = require("../middleware/authenticateToken");
const authenticateUpdate = require("../middleware/authenticateUpdate");
const sendPasswordResetEmail = require("../utils/sendPasswordResetEmail");

const {
  generateResetToken,
  isResetTokenValid,
} = require("../utils/resetToken");

const usersRouter = express.Router();

usersRouter.get("/vip-member/:id", async (req, res) => {
  const id = req.params.id;

  try {
    const user = await db.users.findOne({
      _id: new ObjectId(id),
    });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "Resource not found",
      });
    }
    if (!user.vip_member) {
      return res.status(403).json({
        success: false,
        message: "Not VIP",
      });
    }
    res.status(200).json({
      success: true,
      message: "Is VIP",
    });
  } catch (err) {
    res.status(500).json({
      message: "Resource is not existence!",
      error: err.message,
    });
  }
});

usersRouter.get("/status", authenticateToken, async (req, res) => {
  const { _id } = req.users;

  try {
    const user = await db.users.findOne({ _id: new ObjectId(String(_id)) });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found!",
      });
    }

    if (!user.isActive) {
      return res.status(404).json({
        success: false,
        message: "User not active!",
      });
    }
    res.status(200).json({
      success: true,
      message: "User active!",
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

usersRouter.post("/chage-active", authenticateToken, async (req, res) => {
  const { isActive } = req.body;
  const user = req.users;
  try {
    const updateAcitve = await db.users.updateOne(
      { _id: new ObjectId(String(user._id)) },
      { $set: { isActive: isActive } }
    );
    if (updateAcitve.matchedCount === 0) {
      return es.json({
        success: false,
        message: "failed",
      });
    }
    res.json({
      success: true,
      message: "OK",
    });
  } catch (error) {
    console.error(error);
    res.json({
      success: false,
      message: "failed",
    });
  }
});

usersRouter.post("/request-reset", async (req, res) => {
  const { usernameOrEmail } = req.body;

  if (!usernameOrEmail) {
    return res.status(400).json({ message: "Username or Email is required!" });
  }

  try {
    const userNeedResetPassword = await db.users.findOne({
      $or: [{ username: usernameOrEmail }, { email: usernameOrEmail }],
    });

    if (!userNeedResetPassword) {
      return res.status(200).json({
        message:
          "A password reset link has been sent to your email. Please check your inbox or spam.",
      });
    }
    // Kiểm tra nếu user đã gửi yêu cầu trong vòng 5 phút
    const now = new Date();
    if (
      userNeedResetPassword.resetTokenRequestedAt &&
      userNeedResetPassword.resetTokenRequestedAt >
        new Date(now.getTime() - 10 * 60 * 1000)
    ) {
      return res.status(429).json({
        message:
          "You have requested a password reset once, please check your inbox or try again in 10 minutes.",
      });
    }

    const { token, expiresAt } = generateResetToken();

    const insertResetToken = await db.users.updateOne(
      { userId: userNeedResetPassword.userId },
      {
        $set: {
          resetToken: token,
          resetTokenExpiresAt: expiresAt,
          resetTokenRequestedAt: now,
        },
      }
    );

    if (insertResetToken.matchedCount === 0) {
      return res
        .status(500)
        .json({ message: "An error occurred from the server." });
    }

    const email = userNeedResetPassword.email;
    const username = userNeedResetPassword.username;
    const url = `https://ksc88.net/reset-password?token=${token}`;

    sendPasswordResetEmail(email, username, url);

    res.status(200).json({
      message: `A password reset link has been sent to your email. Please check your inbox or spam.`,
    });
  } catch (error) {
    res.status(500).json({ message: "Server error during reissue operation." });
  }
});

usersRouter.get("/verify-reset", async (req, res) => {
  const { token } = req.query;

  if (!token) {
    return res.status(400).json({
      message: "Token not required!",
    });
  }
  try {
    const user = await db.users.findOne({
      resetToken: token,
    });

    if (!isResetTokenValid(user, token)) {
      return res.status(400).json({ message: "Invalid or expired token!" });
    }

    res.status(201).json({
      message: "OK",
      success: true,
    });
  } catch (error) {
    return res.json({
      message: error.message,
      success: false,
    });
  }
});

usersRouter.post("/confirm-reset", async (req, res) => {
  const { token, newPassword } = req.body;
  if (!newPassword || !token)
    return res.status(400).json({ message: "Missing token or new password!" });

  try {
    const user = await db.users.findOne({ resetToken: token });

    if (!isResetTokenValid(user, token)) {
      return res.status(400).json({ message: "Invalid or expired token" });
    }

    const isHasPassword = await hashPassword(newPassword);

    const resetPasswordUser = await db.users.updateOne(
      { userId: user.userId },
      {
        $set: { password: isHasPassword },
        $unset: { resetToken: "", resetTokenExpiresAt: "" },
      }
    );
    if (resetPasswordUser.matchedCount === 0) {
      return res
        .status(500)
        .json({ message: "An error occurred while reset your password." });
    }

    res.status(200).json({
      success: true,
      message:
        "Reset password successfully. You can now log in with your new password.",
    });
  } catch (error) {
    console.error("Error resetting password:", error);
    res.status(500).json({ message: "Server error during reset operation." });
  }
});

usersRouter.put("/update", authenticateToken, async (req, res) => {
  const { _id } = req.users;

  if (!_id || !req.body) {
    // Nếu không có chuỗi tìm kiếm, trả về lỗi 400 Bad Request
    return res.status(400).json({ message: "Data field error" });
  }

  try {
    const user = await db.users.findOne({
      _id: new ObjectId(String(_id)),
    });

    const updateOptions = await authenticateUpdate(req.body, user);

    const result = await db.users.updateOne(
      { _id: new ObjectId(String(_id)) },
      { $set: updateOptions }
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({ message: "User not found" });
    }

    res.status(200).json({ message: "User updated successfully." });
  } catch (error) {
    console.error("Error update user :", error);
    res.status(500).json({ message: "Server error during update operation." });
  }
});

module.exports = usersRouter;
