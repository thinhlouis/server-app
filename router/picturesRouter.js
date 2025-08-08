const express = require("express");

const authenticateRole = require("../middleware/authenticateRole");
const getDataFromMongoDB = require("../utils/getDataFromMongoDB");
const { db } = require("../utils/conect.mongo");

const picturesRouter = express.Router();

picturesRouter.use(authenticateRole);

picturesRouter.get("/images", async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 50;
  const skip = (page - 1) * limit;

  try {
    const totalItems = await db.pictures_real.countDocuments({
      category: "realitic",
    });
    const totalPages = Math.ceil(totalItems / limit);

    const pictures = await getDataFromMongoDB(db.pictures_real, {}, null, {
      limit,
      skip,
    });
    return res.status(200).json({
      currentPage: page,
      totalPages: totalPages,
      totalItems: totalItems,
      pictures: pictures,
    });
  } catch (error) {
    console.error("❌ Lỗi phân trang:", err);
    res.status(500).json({ message: "Lỗi khi lấy danh sách pictures" });
  }
});

module.exports = picturesRouter;
