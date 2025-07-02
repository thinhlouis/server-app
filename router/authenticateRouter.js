const express = require("express");
const jwt = require("jsonwebtoken");
const { ObjectId } = require("mongodb");
const { v4: uuidv4 } = require("uuid");
const bcrypt = require("bcrypt");

const authenticateLogin = require("../middleware/authenticateLogin");
const authenticateToken = require("../middleware/authenticateToken");
const authenticateRole = require("../middleware/authenticateRole");
const getDataFromMongoDB = require("../utils/getDataFromMongoDB");
const hashPassword = require("../utils/hasPassword");
const checkFieldsNeedUpdated = require("../utils/checkFieldsNeedUpdated");
const sendPasswordResetEmail = require("../utils/sendPasswordResetEmail");

const { db } = require("../utils/conect.mongo");
const {
  generateResetToken,
  isResetTokenValid,
} = require("../utils/resetToken");

const authenticateRouter = express.Router();

authenticateRouter.post("/sig-in", async (req, res) => {
  const { usernameOrEmail, password } = req.body;

  if (!usernameOrEmail || !password) {
    return res.status(400).json({
      message: "Missing input data!",
    });
  }

  const users = await getDataFromMongoDB(db.users);

  try {
    const existingUser = await authenticateLogin(req.body, users);

    await db.users.updateOne(
      { _id: new ObjectId(String(existingUser._id)) },
      { $set: { isActive: true } }
    );

    const payload = {
      _id: existingUser._id,
      userId: existingUser.userId,
      role: existingUser.role,
    };

    const SECRET_KEY = process.env.SECRET_KEY;

    const token = jwt.sign(payload, SECRET_KEY, {
      expiresIn: "1d",
    });

    res.json({
      message: "Login successfully",
      success: true,
      accessToken: token,
    });
  } catch (err) {
    res.status(400).json({
      message: err.message,
    });
  }
});

authenticateRouter.post("/sig-up", authenticateRole, async (req, res) => {
  const { username, password, security_code, role } = req.body;

  if (!username || !password || !security_code || !role) {
    return res.status(400).json({
      message: "Missing required keys!",
    });
  }

  try {
    const userExisted = await db.users.findOne({
      username: username,
    });
    if (userExisted) {
      return res.status(409).json({
        message: "The user has already exists.",
      });
    }

    const hashedPassword = await hashPassword(password);

    const payload = {
      createdAt: new Date(),
      userId: uuidv4(),
      username,
      role,
      security_code,
      password: hashedPassword,
    };
    const newUser = await db.users.insertOne(payload);

    if (!newUser) {
      return res.status(503).json({
        message: "Insert failed!",
      });
    }
    res.status(201).json({
      message: "Register new user successfully!",
      data: payload,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json(error);
  }
});

authenticateRouter.get("/me", authenticateToken, async (req, res) => {
  const { _id } = req.users;

  const user = await db.users.findOne(
    {
      _id: new ObjectId(String(_id)),
    },
    { projection: { password: 0, security_code: 0, resetToken: 0 } }
  );

  res.json({
    userInfo: user,
  });
});

authenticateRouter.get("/verify-token", authenticateToken, async (req, res) => {
  try {
    return res.status(200).json({
      message: "Token still valid!",
    });
  } catch (error) {
    console.log(error.message);
    return res.status(400).json({
      message: error.message,
    });
  }
});

authenticateRouter.post("/verify-code", authenticateToken, async (req, res) => {
  const { security_code } = req.body;

  try {
    const user = await db.users.findOne({
      _id: new ObjectId(String(req.users._id)),
    });

    if (user.security_code !== security_code)
      return res.status(400).json({
        success: false,
        message: "Security codes do not match!",
      });

    return res.status(200).json({
      success: true,
    });
  } catch (error) {
    console.error(error.message);
    return res.status(200).json({
      success: false,
      message: error.message,
    });
  }
});

authenticateRouter.get("/search", authenticateRole, async (req, res) => {
  try {
    const searchQuery = req.query.keyword;

    if (!searchQuery) {
      // Nếu không có chuỗi tìm kiếm, trả về lỗi 400 Bad Request
      return res
        .status(400)
        .json({ message: 'Query parameter "keyword" is required for search.' });
    }
    const queryOptions = {
      username: { $regex: searchQuery, $options: "i" },
    };

    const projectionOptions = {
      password: 0,
      security_code: 0,
    };
    const users = await getDataFromMongoDB(
      db.users,
      queryOptions,
      projectionOptions
    );
    if (users.length === 0) {
      // Nếu không tìm thấy người dùng nào
      return res
        .status(404)
        .json({ message: "No users found matching your query." });
    }
    res.status(200).json({ users: users });
  } catch (error) {
    console.error("Error during user search:", error);
    res.status(500).json({ message: "Server error during search operation." });
  }
});

authenticateRouter.put("/update", authenticateRole, async (req, res) => {
  const { _id, password } = req.body;

  if (!_id || !req.body) {
    // Nếu không có chuỗi tìm kiếm, trả về lỗi 400 Bad Request
    return res.status(400).json({ message: "Data field error" });
  }

  try {
    const user = await db.users.findOne({
      _id: new ObjectId(String(_id)),
    });

    const updateOptions = await checkFieldsNeedUpdated(req.body, user);
    const matchingPassword = await bcrypt.compare(password, user.password);
    if (matchingPassword) {
      return res.status(409).json({
        success: false,
        message:
          "You are reusing an old password. Please try a new password for this request.",
      });
    }

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

authenticateRouter.post("/request-reset", async (req, res) => {
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

authenticateRouter.get("/verify-reset", async (req, res) => {
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

authenticateRouter.post("/confirm-reset", async (req, res) => {
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

module.exports = authenticateRouter;
