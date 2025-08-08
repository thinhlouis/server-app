const express = require("express");

const requireAPIKey = require("../middleware/requireAPIKey");

const administratorsRouter = require("./administratorsRouter");
const videosRouter = require("./videosRouter");
const picturesRouter = require("./picturesRouter");
const authenticateRouter = require("./authenticateRouter");
const uploadFileRouter = require("./uploadFileRouter");
const quotesRouter = require("./quotesRouter");
const usersRouter = require("./usersRouter");

const routers = express.Router();

routers.use("/admin", administratorsRouter);
routers.use("/auth", authenticateRouter);
routers.use("/videos", requireAPIKey, videosRouter);
routers.use("/pictures", requireAPIKey, picturesRouter);
routers.use("/upload", uploadFileRouter);
routers.use("/quotes", quotesRouter);
routers.use("/user", usersRouter);

module.exports = routers;
