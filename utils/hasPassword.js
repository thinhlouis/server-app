const bcrypt = require("bcrypt");
const saltRounds = 10;

async function hashPassword(password) {
  try {
    const salt = await bcrypt.genSalt(saltRounds);
    const hashedPassword = await bcrypt.hash(password, salt);
    return hashedPassword;
  } catch (error) {
    console.error("Error during password hashing process:", error);
    throw error; // Hoặc xử lý lỗi theo cách phù hợp với ứng dụng của bạn
  }
}

module.exports = hashPassword;
