const express = require("express");
const { ObjectId } = require("mongodb");
const bcrypt = require("bcrypt");

const authenticateRole = require("../middleware/authenticateRole");
const authenticateUpdate = require("../middleware/authenticateUpdate");
const getDataFromMongoDB = require("../utils/getDataFromMongoDB");
const { db } = require("../utils/conect.mongo");

const administratorsRouter = express.Router();

administratorsRouter.use(authenticateRole);

administratorsRouter.get("/search", async (req, res) => {
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

administratorsRouter.put("/update", async (req, res) => {
  const { _id } = req.body;

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

    await db.users.updateOne(
      { _id: new ObjectId(String(_id)) },
      { $inc: { tokenVersion: 1 } }
    );

    res.status(200).json({ message: "User updated successfully." });
  } catch (error) {
    console.error("Error update user :", error);
    res.status(500).json({ message: "Server error during update operation." });
  }
});

module.exports = administratorsRouter;
