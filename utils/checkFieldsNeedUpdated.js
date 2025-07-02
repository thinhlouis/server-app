const bcrypt = require("bcrypt");
const hashedPassword = require("./hasPassword");

const checkFieldsNeedUpdated = async (body, data) => {
  let dataToUpdate = {};
  const { username, email, password, security_code, role } = body;

  const matchingPassword = await bcrypt.compare(password, data.password);

  if (username !== "" || username !== data.username) {
    dataToUpdate.username = username;
  }
  if (email !== "" || email !== data.email) {
    dataToUpdate.email = email;
  }
  if (password !== "" || !matchingPassword) {
    dataToUpdate.password = await hashedPassword(password);
  }
  if (security_code !== "" || security_code !== data.security_code) {
    dataToUpdate.security_code = security_code;
  }
  if (role !== "" || role !== data.role) {
    dataToUpdate.role = role;
  }
  return dataToUpdate;
};

module.exports = checkFieldsNeedUpdated;
