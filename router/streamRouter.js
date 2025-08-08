const express = require("express");
const rateLimit = require("express-rate-limit");
const axios = require("axios");
const { pipeline } = require("stream");

const requireAPIKey = require("../middleware/requireAPIKey");

const streamRouter = express();
const limiter = rateLimit({ windowMs: 1000, max: 50 });

streamRouter.use(requireAPIKey);

async function streamFromR2({ req, res, filename, baseUrl }) {
  const range = req.headers.range;

  if (!range) {
    return res.status(400).send("Thiếu header 'Range'");
  }

  // if (!/^[\w.\-]+$/.test(filename)) {
  //   return res.status(400).send("Tên file không hợp lệ");
  // }

  const videoUrl = `${baseUrl}/${filename}`;

  try {
    const response = await axios.get(videoUrl, {
      headers: { Range: range },
      responseType: "stream",
      validateStatus: (status) => status < 500,
    });

    if (response.status === 416) {
      return res.status(416).send("Range không hợp lệ");
    }

    const supportsRange = response.status === 206;

    if (!supportsRange) {
      const fullResponse = await axios.get(videoUrl, {
        responseType: "stream",
      });

      res.writeHead(fullResponse.status, fullResponse.headers);
      return pipeline(fullResponse.data, res, (err) => {
        if (err) {
          console.error("❌ Lỗi pipeline:", err);
          res.status(500).end("Không thể truyền video.");
        }
      });
    }

    res.setHeader("Content-Disposition", `inline; filename="${filename}"`);
    if (!res.headersSent) {
      res.writeHead(response.status, response.headers);
    }
    let isClientClosed = false;

    req.on("close", () => {
      isClientClosed = true;
      console.log("❗ Client đã đóng kết nối.");
      response.data.destroy();
    });

    pipeline(response.data, res, (err) => {
      if (err && !isClientClosed) {
        console.error("❌ Lỗi pipeline:", err);
        if (!res.writableEnded) {
          res.statusCode = 500;
          res.end("Lỗi khi truyền video.");
        }
      }
    });
  } catch (err) {
    console.error("⚠️ Lỗi khi fetch video:", err.message);
    if (!res.writableEnded) {
      res.status(500).send("Không thể tải video.");
    }
  }
}

streamRouter.get("/video-jav/:filename", limiter, async (req, res) => {
  await streamFromR2({
    req,
    res,
    filename: req.params.filename,
    baseUrl: "https://pub-246f334bd09a4e93b377c14617fc936f.r2.dev",
    previewMinutes: 3,
  });
});

streamRouter.get("/video-real/:filename", limiter, async (req, res) => {
  await streamFromR2({
    req,
    res,
    filename: req.params.filename,
    baseUrl: "https://pub-8bc22c3975bb4cfea840abd7a039e300.r2.dev",
    previewMinutes: 1,
  });
});

module.exports = streamRouter;
