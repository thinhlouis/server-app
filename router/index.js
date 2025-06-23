const express = require("express");

const requireAPIKey = require("../middleware/requireAPIKey");

const videosRouter = require("./videosRouter");
const authenticateRouter = require("./authenticateRouter");
const uploadFileRouter = require("./uploadFileRouter");

const routers = express.Router();

routers.use("/videos", requireAPIKey, videosRouter);
routers.use("/auth", authenticateRouter);
routers.use("/upload", uploadFileRouter);

module.exports = routers;
