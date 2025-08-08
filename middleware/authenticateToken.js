const jwt = require("jsonwebtoken");
const { db } = require("../utils/conect.mongo");
const { ObjectId } = require("mongodb");

const authenticateToken = async (req, res, next) => {
  const token = req.headers["x-access-token"];

  if (!token) {
    return res.status(400).json({
      message: "Token is not provided",
    });
  }
  try {
    const decoded = jwt.verify(token, process.env.SECRET_KEY);

    const user = await db.users.findOne({
      _id: new ObjectId(String(decoded._id)),
    });

    if (!user || user.tokenVersion !== decoded.tokenVersion) {
      return res.status(401).json({
        message: "Token invalid or outdated!",
      });
    }
    req.users = user;

    next();
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      return res.status(403).json({
        message: "Token is expired",
      });
    }
    return res.status(401).json({
      message: "Token is not validated",
    });
  }
};

module.exports = authenticateToken;
