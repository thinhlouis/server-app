const express = require("express");
require("dotenv").config();
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const ffmpegPath = require("@ffmpeg-installer/ffmpeg").path;
const ffmpeg = require("fluent-ffmpeg");
ffmpeg.setFfmpegPath(ffmpegPath);
const { v4: uuidv4 } = require("uuid");
// ffmpeg.setFfmpegPath("C:\\ffmpeg-7.1.1\\bin\\ffmpeg.exe");

const { S3Client, PutObjectCommand } = require("@aws-sdk/client-s3");
const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");
const { db } = require("../utils/conect.mongo"); // Giả sử bạn vẫn cần MongoDB
const authenticateRole = require("../middleware/authenticateRole");
const { create } = require("domain");

const uploadFileRouter = express.Router();
const upload = multer({ dest: "temp/" });

// Cấu hình kết nối R2
const s3 = new S3Client({
  region: "auto",
  endpoint: process.env.R2_ENDPOINT,
  credentials: {
    accessKeyId: process.env.ACCESS_KEY_ID,
    secretAccessKey: process.env.SECRET_ACCESS_KEY,
  },
});

uploadFileRouter.post(
  "/videos-real",
  authenticateRole,
  upload.single("video"),
  async (req, res) => {
    const file = req.file;
    const category = req.body.category; // Lấy category từ body
    if (!file) return res.status(400).json({ error: "Không có file nào" });

    const videoName = `${Date.now()}-${file.originalname}`;
    const thumbName = videoName.replace(/\.[^.]+$/, "") + ".jpg";
    const videoPath = file.path;
    const thumbPath = path.join("temp", thumbName);

    try {
      // 1. Tạo signed URL để upload video
      const videoCommand = new PutObjectCommand({
        Bucket: process.env.R2_BUCKET,
        Key: videoName,
        ContentType: file.mimetype,
        ACL: "public-read", // Đảm bảo file công khai
      });
      const videoUploadUrl = await getSignedUrl(s3, videoCommand, {
        expiresIn: 60,
      });

      // 2. Upload video lên R2
      const videoBuffer = fs.readFileSync(videoPath);
      await s3.send(
        new PutObjectCommand({
          Bucket: process.env.R2_BUCKET,
          Key: videoName,
          Body: videoBuffer,
          ContentType: file.mimetype,
          ACL: "public-read",
        })
      );
      const videoPublicUrl = `${process.env.R2_URI_VID}/${videoName}`; // Thay <account-id>

      // 3. Tạo thumbnail bằng FFmpeg
      await new Promise((resolve, reject) => {
        ffmpeg(videoPath)
          .on("end", resolve)
          .on("error", reject)
          .screenshots({
            timestamps: ["1"],
            filename: thumbName,
            folder: "temp",
            size: "320x?",
          });
      });

      // 4. Tạo signed URL để upload thumbnail
      const thumbCommand = new PutObjectCommand({
        Bucket: process.env.R2_BUCKET,
        Key: thumbName,
        ContentType: "image/jpeg",
        ACL: "public-read", // Đảm bảo file công khai
      });
      const thumbUploadUrl = await getSignedUrl(s3, thumbCommand, {
        expiresIn: 60,
      });

      // 5. Upload thumbnail lên R2
      const thumbBuffer = fs.readFileSync(thumbPath);
      await s3.send(
        new PutObjectCommand({
          Bucket: process.env.R2_BUCKET_THUMB,
          Key: thumbName,
          Body: thumbBuffer,
          ContentType: "image/jpeg",
          ACL: "public-read",
        })
      );
      const thumbPublicUrl = `${process.env.R2_URI_IMG}/${thumbName}`; // Thay <account-id>

      // 6. Lưu vào MongoDB
      await db.videos_real.insertOne({
        id: uuidv4(),
        fileName: file.originalname,
        videoUrl: videoPublicUrl,
        thumbUrl: thumbPublicUrl,
        uploadedAt: new Date(),
        category: category,
      });

      // 7. Xoá file tạm
      fs.unlinkSync(videoPath);
      fs.unlinkSync(thumbPath);

      // 8. Trả về kết quả
      res.status(201).json({
        videoUploadUrl,
        videoPublicUrl,
        thumbUploadUrl,
        thumbPublicUrl,
      });
    } catch (err) {
      console.error("❌ Lỗi:", err);
      res.status(500).json({ error: `Lỗi xử lý file ${file.originalname}` });
    }
  }
);

uploadFileRouter.post("/videos-jav", authenticateRole, async (req, res) => {
  const { name, url, thumbnail, tag = "normal" } = req.body;

  if (!name || !url || !thumbnail) {
    return res.status(401).json({
      message: "Missing input data!",
    });
  }

  const payload = {
    id: uuidv4(),
    createdAt: new Date(),
    name,
    url,
    thumbnail,
    tag,
  };
  try {
    const videoExisted = await db.videos.findOne({
      name: name,
    });

    if (videoExisted) {
      return res.status(409).json({
        message: "The video has already exists.",
      });
    }

    await db.videos.insertOne(payload);

    res.status(201).json({
      message: "Upload successfully.",
      info_file: payload,
    });
  } catch (error) {
    console.error(error.message);
    res.status(400).json({
      message: error.message,
    });
  }
});

module.exports = uploadFileRouter;
