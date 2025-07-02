const express = require("express");
const { ObjectId } = require("mongodb");

const { db } = require("../utils/conect.mongo");
const authenticateToken = require("../middleware/authenticateToken");

const activeRouter = express.Router();

activeRouter.get("/status", authenticateToken, async (req, res) => {
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

activeRouter.post("/chage-active", authenticateToken, async (req, res) => {
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

module.exports = activeRouter;
