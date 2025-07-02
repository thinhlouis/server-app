const bcrypt = require("bcrypt");

const authenticateLogin = async (body, data) => {
  try {
    // Tìm user mà không tiết lộ thông tin không cần thiết
    const user = data.find(
      (res) =>
        res.username === body.usernameOrEmail ||
        res.email === body.usernameOrEmail
    );

    // Phản hồi chung cho cả 2 trường hợp sai username/password
    if (!user || !(await bcrypt.compare(body.password, user.password))) {
      throw new Error("Invalid credentials");
    }

    // Trả về thông tin cần thiết (không bao gồm password)
    return {
      _id: user._id,
      userId: user.userId,
      role: user.role,
    };
  } catch (error) {
    console.error("Login error:", error);

    if (error.message === "Invalid credentials") {
      throw error;
    }
    throw new Error("Authentication failed");
  }
};

module.exports = authenticateLogin;
