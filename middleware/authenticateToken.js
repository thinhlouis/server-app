const jwt = require("jsonwebtoken");

const authenticateToken = (req, res, next) => {
  const token = req.headers["x-access-token"];

  if (!token) {
    return res.status(400).json({
      message: "Token is not provided",
    });
  }
  try {
    const decoded = jwt.verify(token, process.env.SECRET_KEY);

    req.users = decoded;

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
