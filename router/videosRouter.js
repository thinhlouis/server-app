const express = require("express");

const authenticateToken = require("../middleware/authenticateToken");
const getDataFromMongoDB = require("../utils/getDataFromMongoDB");
const { db } = require("../utils/conect.mongo");

const videosRouter = express.Router();

videosRouter.get("/fetch-video", authenticateToken, async (req, res) => {
  const { role } = req.users;

  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 20;
  const skip = (page - 1) * limit;

  try {
    const totalItems = await db.videos.countDocuments();
    const totalPages = Math.ceil(totalItems / limit);

    if (role !== "super_root") {
      return res.status(403).json({
        message: "Không có thẩm quyền!",
      });
    }

    const videos = await getDataFromMongoDB(db.videos, {}, null, {
      limit,
      skip,
    });
    return res.status(200).json({
      currentPage: page,
      totalPages: totalPages,
      totalItems: totalItems,
      videos: videos,
    });
  } catch (error) {
    console.error("❌ Lỗi phân trang:", err);
    res.status(500).json({ error: "Lỗi khi lấy danh sách videos" });
  }
});

videosRouter.get("/fetch-video-real", authenticateToken, async (req, res) => {
  const { role } = req.users;

  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const skip = (page - 1) * limit;

  try {
    const totalItems = await db.videos_real.countDocuments();
    const totalPages = Math.ceil(totalItems / limit);

    if (role !== "super_root") {
      return res.status(403).json({
        message: "Không có thẩm quyền!",
      });
    }

    const videos_real = await getDataFromMongoDB(db.videos_real, {}, null, {
      limit,
      skip,
    });
    return res.status(200).json({
      currentPage: page,
      totalPages: totalPages,
      totalItems: totalItems,
      videos: videos_real,
    });
  } catch (error) {
    console.error("❌ Lỗi phân trang:", err);
    res.status(500).json({ error: "Lỗi khi lấy danh sách videos" });
  }
});

module.exports = videosRouter;
