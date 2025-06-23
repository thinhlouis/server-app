const jwt = require("jsonwebtoken");

const authenticateRole = (req, res, next) => {
  const token = req.headers["x-access-token"] || req.headers["authorization"];

  if (!token) {
    return res.status(401).json({
      // Nên dùng 401 thay vì 400 cho lỗi xác thực
      success: false,
      message: "Token is not provided",
    });
  }

  try {
    // Loại bỏ 'Bearer ' nếu có
    const tokenWithoutBearer = token.replace(/^Bearer\s+/i, "");

    const decoded = jwt.verify(tokenWithoutBearer, process.env.SECRET_KEY);
    req.users = decoded; // Nên dùng 'user' thay vì 'users' để nhất quán

    if (decoded.role !== "super_root") {
      return res.status(403).json({
        success: false,
        message: "You do not have access!",
      });
    }

    next();
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      return res.status(401).json({
        // 401 thay vì 403 cho token hết hạn
        success: false,
        message: "Token is expired",
      });
    }

    if (error instanceof jwt.JsonWebTokenError) {
      return res.status(401).json({
        success: false,
        message: "Invalid token", // Thống nhất ngôn ngữ (tiếng Anh)
      });
    }

    return res.status(500).json({
      success: false,
      message: "Authentication error", // Chữ thường cho thông báo lỗi
    });
  }
};

module.exports = authenticateRole;
