const validator = require("validator");

const validateSignUpData = (data) => {
  const { firstName, emailId, password } = data;

  if (!firstName || firstName.trim().length === 0) {
    throw new Error("First name is required");
  }

  if (!emailId || !validator.isEmail(emailId)) {
    throw new Error("Please enter a valid email address");
  }

  if (!password || !validator.isStrongPassword(password)) {
    throw new Error("Please enter a strong password");
  }
};

const validateLoginData = (data) => {
  const { emailId, password } = data;

  if (!emailId || !validator.isEmail(emailId)) {
    throw new Error("Please enter a valid email address");
  }

  if (!password) {
    throw new Error("Password is required");
  }
};

module.exports = {
  validateSignUpData,
  validateLoginData,
};
