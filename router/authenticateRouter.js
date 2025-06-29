const express = require("express");
const jwt = require("jsonwebtoken");
const { ObjectId } = require("mongodb");
const { v4: uuidv4 } = require("uuid");

const authenticateLogin = require("../middleware/authenticateLogin");
const authenticateToken = require("../middleware/authenticateToken");
const authenticateRole = require("../middleware/authenticateRole");
const getDataFromMongoDB = require("../utils/getDataFromMongoDB");
const hashPassword = require("../utils/hasPassword");
const checkFieldsNeedUpdated = require("../utils/checkFieldsNeedUpdated");

const { db } = require("../utils/conect.mongo");

const authenticateRouter = express.Router();

authenticateRouter.post("/sig-in", async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({
      message: "Missing input data!",
    });
  }

  const users = await getDataFromMongoDB(db.users);

  try {
    const existingUser = await authenticateLogin(req.body, users);

    const SECRET_KEY = process.env.SECRET_KEY;

    const token = jwt.sign(existingUser, SECRET_KEY, {
      expiresIn: "1h",
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
  const { username, password, securyti_code, role } = req.body;

  if (!username || !password || !securyti_code || !role) {
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
      securyti_code,
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
    { projection: { password: 0 } }
  );

  res.json({
    userInfo: user,
  });
});

authenticateRouter.get("/verify", authenticateToken, async (req, res) => {
  try {
    return res.status(200).json({
      message: "Token still valid!",
    });
  } catch (error) {
    return error.message;
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
      password: 0, // loại bỏ trường này khỏi kết quả
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
  const { _id } = req.body;

  if (!_id || !req.body) {
    // Nếu không có chuỗi tìm kiếm, trả về lỗi 400 Bad Request

    return res.status(400).json({ message: "Data field error" });
  }

  try {
    const updateOptions = await checkFieldsNeedUpdated(req.body);

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

module.exports = authenticateRouter;
