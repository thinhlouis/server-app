const hashedPassword = require("./hasPassword");

const checkFieldsNeedUpdated = async (body) => {
  let dataToUpdate = {};
  const { username, password, securyti_code, role } = body;
  if (username !== "") {
    dataToUpdate.username = username;
  }
  if (password !== "") {
    dataToUpdate.password = await hashedPassword(password);
  }
  if (securyti_code !== "") {
    dataToUpdate.securyti_code = securyti_code;
  }
  if (role !== "") {
    dataToUpdate.role = role;
  }
  return dataToUpdate;
};

module.exports = checkFieldsNeedUpdated;
