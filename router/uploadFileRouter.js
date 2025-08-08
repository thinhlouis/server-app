const express = require("express");
require("dotenv").config();
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const ffmpegPath = require("@ffmpeg-installer/ffmpeg").path;
const ffmpeg = require("fluent-ffmpeg");
ffmpeg.setFfmpegPath(ffmpegPath);
const { v4: uuidv4 } = require("uuid");
const { ObjectId } = require("mongodb");

const { S3Client, PutObjectCommand } = require("@aws-sdk/client-s3");
const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");
const { db } = require("../utils/conect.mongo"); // Giả sử bạn vẫn cần MongoDB
const authenticateRole = require("../middleware/authenticateRole");

const uploadFileRouter = express.Router();
const upload = multer({
  dest: "temp/",
  limits: {
    fileSize: 5 * 1024 * 1024 * 1024,
  },
});

// Cấu hình kết nối R2
const s3 = new S3Client({
  region: "auto",
  endpoint: process.env.R2_ENDPOINT,
  credentials: {
    accessKeyId: process.env.ACCESS_KEY_ID,
    secretAccessKey: process.env.SECRET_ACCESS_KEY,
  },
});

uploadFileRouter.post("/videos-real", authenticateRole, async (req, res) => {
  const videosToUpload = req.body;

  if (!Array.isArray(videosToUpload) || videosToUpload.length === 0) {
    return res
      .status(400)
      .json({ message: "Dữ liệu gửi lên không hợp lệ hoặc trống." });
  }

  try {
    const result = await db.videos_real.insertMany(videosToUpload);

    res.status(201).json({
      message: "Tải lên video thành công!",
      insertedCount: result.insertedCount,
      insertedIds: result.insertedIds,
    });
  } catch (error) {
    console.error("Lỗi khi chèn video vào MongoDB:", error);
    res.status(400).json({
      message: error.message,
    });
  }
});

uploadFileRouter.post("/videos-jav", authenticateRole, async (req, res) => {
  const videosToUpload = req.body;

  if (!Array.isArray(videosToUpload) || videosToUpload.length === 0) {
    return res
      .status(400)
      .json({ message: "Dữ liệu gửi lên không hợp lệ hoặc trống." });
  }

  try {
    const result = await db.videos.insertMany(videosToUpload);

    res.status(201).json({
      message: "Tải lên video thành công!",
      insertedCount: result.insertedCount,
      insertedIds: result.insertedIds,
    });
  } catch (error) {
    console.error("Lỗi khi chèn video vào MongoDB:", error);
    res.status(400).json({
      message: error.message,
    });
  }
});

uploadFileRouter.post("/picture-real", authenticateRole, async (req, res) => {
  const imagesToUpload = req.body;

  if (!Array.isArray(imagesToUpload) || imagesToUpload.length === 0) {
    return res
      .status(400)
      .json({ message: "Dữ liệu gửi lên không hợp lệ hoặc trống." });
  }

  try {
    const result = await db.pictures_real.insertMany(imagesToUpload);

    res.status(201).json({
      message: "Tải lên video thành công!",
      insertedCount: result.insertedCount,
      insertedIds: result.insertedIds,
    });
  } catch (error) {
    console.error("Lỗi khi chèn video vào MongoDB:", error);
    res.status(400).json({
      message: error.message,
    });
  }
});

uploadFileRouter.post(
  "/avatar",
  authenticateRole,
  upload.single("image"), // <-- Đảm bảo client gửi với key 'image'
  async (req, res) => {
    const file = req.file;
    const _id = req.body._id;

    if (!file) return res.status(400).json({ error: "Không có file nào" });

    const imageName = `${Date.now()}-${file.originalname}`;

    const imagePath = file.path;

    try {
      const fileBuffer = fs.readFileSync(imagePath); // Đọc file từ đường dẫn tạm thời
      await s3.send(
        new PutObjectCommand({
          Bucket: "avatar",
          Key: imageName, // <-- Sửa: Dùng imageName
          Body: fileBuffer,
          ContentType: file.mimetype, // <-- Sửa: Dùng file.mimetype để linh hoạt hơn
          ACL: "public-read", // Đảm bảo file công khai
        })
      ); // Xóa file tạm thời sau khi upload xong

      fs.unlinkSync(imagePath); // <-- Sửa: Dùng imagePath // 8. Trả về kết quả

      const publicUrl = `${process.env.R2_URI_AVT}/${imageName}`; // URL công khai của ảnh trên R2
      res.status(201).json({
        avatarUrl: publicUrl, // <-- Đề xuất sửa: Thống nhất key với frontend là 'avatarUrl'
      });
      await db.users.updateOne(
        { _id: new ObjectId(String(_id)) },
        { $set: { avatar: publicUrl } }
      );
    } catch (err) {
      console.error("❌ Lỗi upload R2:", err); // Đảm bảo xóa file tạm thời ngay cả khi có lỗi
      if (fs.existsSync(imagePath)) {
        fs.unlinkSync(imagePath);
      }
      res.status(500).json({
        error: `Lỗi xử lý file ${file.originalname}: ${err.message}`,
        message: err.message,
      });
    }
  }
);

uploadFileRouter.post("/sign-url-jav", authenticateRole, async (req, res) => {
  const { fileName, fileType } = req.body; // Frontend sẽ gửi tên và loại file

  if (!fileName || !fileType) {
    return res.status(400).json({ error: "Missing fileName or fileType" });
  }

  const bucketName = process.env.R2_BUCKET_JAV || "jav"; // Tên bucket R2 của bạn

  try {
    const command = new PutObjectCommand({
      Bucket: bucketName,
      Key: fileName, // Tên file trên R2
      ContentType: fileType, // Loại file (ví dụ: video/mp4)
      ACL: "public-read", // Nếu bạn muốn file công khai
    });

    const signedUrl = await getSignedUrl(s3, command, {
      expiresIn: 3600, // URL hợp lệ trong 1 giờ (có thể điều chỉnh)
    });

    res.status(200).json({ signedUrl });
  } catch (err) {
    console.error("❌ Lỗi khi tạo Signed URL:", err);
    res
      .status(500)
      .json({ error: "Failed to generate signed URL", details: err.message });
  }
});

uploadFileRouter.post(
  "/sign-url-real", // This is the endpoint the frontend will call
  authenticateRole,
  upload.single("video"), // Expects a file named 'video'
  async (req, res) => {
    const file = req.file;

    if (!file) {
      return res.status(400).json({ error: "No file uploaded." });
    }

    // Generate unique names for video and thumbnail
    const uniqueFileName = `${uuidv4()}-${file.originalname}`;
    const videoName = uniqueFileName;
    // Replace extension for thumbnail, ensuring it's a .jpg
    const thumbName = uniqueFileName.replace(/\.[^.]+$/, "") + ".jpg";

    try {
      // 1. Create signed URL for video upload
      const videoCommand = new PutObjectCommand({
        Bucket: process.env.R2_BUCKET,
        Key: videoName,
        ContentType: file.mimetype,
        ACL: "public-read", // Ensure public readability
      });

      const videoUploadUrl = await getSignedUrl(s3, videoCommand, {
        expiresIn: 3600, // URL valid for 1 hour
      });

      // 2. Create signed URL for thumbnail upload
      const thumbCommand = new PutObjectCommand({
        Bucket: process.env.R2_BUCKET_THUMB,
        Key: thumbName,
        ContentType: "image/jpeg", // Thumbnail will always be JPEG
        ACL: "public-read", // Ensure public readability
      });
      const thumbUploadUrl = await getSignedUrl(s3, thumbCommand, {
        expiresIn: 3600, // URL valid for 1 hour
      });

      // Clean up the temporary file after getting the necessary info
      fs.unlink(file.path, (err) => {
        if (err) console.error("Error deleting temp file:", err);
      });

      // 3. Return both signed URLs to the frontend
      res.status(201).json({
        videoUploadUrl,
        thumbUploadUrl,
        videoName, // Also return the generated videoName
        thumbName, // And the generated thumbName
      });
    } catch (err) {
      console.error("❌ Error generating signed URLs:", err);
      // Clean up temp file in case of error too
      fs.unlink(file.path, (err) => {
        if (err) console.error("Error deleting temp file on error:", err);
      });
      res
        .status(500)
        .json({ error: `Error processing file ${file.originalname}` });
    }
  }
);

uploadFileRouter.post(
  "/sign-image",
  authenticateRole,
  upload.single("image"),
  async (req, res) => {
    const file = req.file;
    if (!file) return res.status(400).json({ error: "No file uploaded." });

    const originalName = `${uuidv4()}-${file.originalname}`;
    const webpName = "webp/" + originalName.replace(/\.[^.]+$/, "") + ".webp";

    try {
      const bucketName = process.env.R2_BUCKET_PICTURE || "realthumb";

      const originalCmd = new PutObjectCommand({
        Bucket: bucketName,
        Key: originalName,
        ContentType: file.mimetype,
        ACL: "public-read",
      });

      const webpCmd = new PutObjectCommand({
        Bucket: bucketName,
        Key: webpName,
        ContentType: "image/webp",
        ACL: "public-read",
      });

      const [originalUrl, webpUrl] = await Promise.all([
        getSignedUrl(s3, originalCmd, { expiresIn: 3600 }),
        getSignedUrl(s3, webpCmd, { expiresIn: 3600 }),
      ]);

      fs.unlinkSync(file.path); // Xóa file tạm

      res.status(200).json({
        originalUrl,
        webpUrl,
        originalName,
        webpName,
      });
    } catch (err) {
      console.error("❌ sign-image error:", err);
      if (fs.existsSync(file.path)) fs.unlinkSync(file.path);
      res.status(500).json({ error: err.message });
    }
  }
);

module.exports = uploadFileRouter;
