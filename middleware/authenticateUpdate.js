const bcrypt = require("bcrypt");
const hashPassword = require("../utils/hasPassword");
const capitalizedWords = require("../utils/capitalizedWords");
const { db } = require("../utils/conect.mongo");

const authenticateUpdate = async (body, user) => {
  try {
    const filteredPayload = Object.fromEntries(
      Object.entries(body).filter(([key, value]) => {
        const isEmptyString = value === "" || value === null;
        const isDuplicate = user.hasOwnProperty(key) && user[key] === value;
        return !isEmptyString && !isDuplicate;
      })
    );
    const { username, email, password, security_code } = filteredPayload;

    if (username) {
      const usernameHasExisted = await db.users.findOne({
        username: username,
      });
      if (usernameHasExisted) {
        throw new Error("Username alredy exists");
      }
      filteredPayload.username = capitalizedWords(username);
    }
    if (email) {
      const emailHasExisted = await db.users.findOne({
        email: email,
      });
      if (emailHasExisted) {
        throw new Error("Email alredy exists");
      }
      filteredPayload.username = capitalizedWords(username);
    }
    if (password) {
      const matchingPassword = await bcrypt.compare(password, user.password);
      if (matchingPassword) {
        throw new Error("You are reusing an old password");
      }
      filteredPayload.password = await hashPassword(password);
    }
    if (security_code) {
      const matchingSecurityCode = await bcrypt.compare(
        security_code,
        user.security_code
      );
      if (matchingSecurityCode) {
        throw new Error("You are reusing an old security code");
      }
      filteredPayload.security_code = await hashPassword(security_code);
    }

    return filteredPayload;
  } catch (error) {
    console.error("Update error:", error);
    if (error.message === "Username alredy exists") {
      throw error;
    }
    if (error.message === "Emal alredy exists") {
      throw error;
    }

    if (error.message === "You are reusing an old password") {
      throw error;
    }
    if (error.message === "You are reusing an old security code") {
      throw error;
    }
    throw new Error("Authentication update failed");
  }
};

module.exports = authenticateUpdate;
