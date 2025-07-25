const express = require("express");

const requireAPIKey = require("../middleware/requireAPIKey");

const videosRouter = require("./videosRouter");
const authenticateRouter = require("./authenticateRouter");
const uploadFileRouter = require("./uploadFileRouter");
const quotesRouter = require("./quotesRouter");
const activeRouter = require("./activeRouter");

const routers = express.Router();

routers.use("/videos", requireAPIKey, videosRouter);
routers.use("/auth", authenticateRouter);
routers.use("/upload", uploadFileRouter);
routers.use("/quotes", quotesRouter);
routers.use("/active", activeRouter);

module.exports = routers;
