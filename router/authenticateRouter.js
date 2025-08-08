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
const capitalizedWords = require("../utils/capitalizedWords");

const { db } = require("../utils/conect.mongo");

const authenticateRouter = express.Router();

authenticateRouter.post("/sig-in", async (req, res) => {
  const { usernameOrEmail, password } = req.body;

  if (!usernameOrEmail || !password) {
    return res.status(400).json({
      success: false,
      message: "Missing input data!",
    });
  }

  const users = await getDataFromMongoDB(db.users);

  try {
    const existingUser = await authenticateLogin(req.body, users);

    await db.users.updateOne(
      { _id: new ObjectId(String(existingUser._id)) },
      { $set: { isActive: true, tokenVersion: 0 } }
    );

    const payload = {
      _id: existingUser._id,
      userId: existingUser.userId,
      tokenVersion: existingUser.tokenVersion ?? 0,
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
  const { fullname, username, email, password, security_code, role } = req.body;

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
    const capitalizedName = capitalizedWords(fullname);

    const payload = {
      createdAt: new Date(),
      userId: uuidv4(),
      fullname: fullname ? capitalizedName : "guest",
      username,
      email,
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
    {
      projection: {
        password: 0,
        security_code: 0,
        resetToken: 0,
        tokenVersion: 0,
      },
    }
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

  if (!security_code) {
    return res.status(400).json({
      message: "Body missing data!",
    });
  }

  try {
    const user = await db.users.findOne({
      _id: new ObjectId(String(req.users._id)),
    });

    if (
      !user ||
      !(await bcrypt.compare(req.body.security_code, user.security_code))
    )
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

module.exports = authenticateRouter;
