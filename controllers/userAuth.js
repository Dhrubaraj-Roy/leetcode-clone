const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const User = require("../models/user");
const { validateSignUpData, validateLoginData } = require("../utils/validator");

// Register / Signup Controller
const register = async (req, res) => {
  try {
    const { firstName, lastName, password } = req.body;
    const emailId = req.body.emailId || req.body.email;

    // 1. Validate request data
    validateSignUpData({ firstName, lastName, emailId, password });

    // 2. Check if user already exists
    const existingUser = await User.findOne({ emailId });
    if (existingUser) {
      return res.status(400).json({ message: "User with this email already exists" });
    }

    // 3. Hash the password
    const passwordHash = await bcrypt.hash(password, 10);

    // 4. Create and save new user
    const newUser = new User({
      firstName,
      lastName,
      emailId,
      password: passwordHash,
    });

    await newUser.save();

    res.status(201).json({
      message: "User registered successfully",
      user: {
        id: newUser._id,
        firstName: newUser.firstName,
        lastName: newUser.lastName,
        emailId: newUser.emailId,
      },
    });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

// Login Controller
const login = async (req, res) => {
  try {
    const { password } = req.body;
    const emailId = req.body.emailId || req.body.email;

    // 1. Validate login input
    validateLoginData({ emailId, password });

    // 2. Find user by email
    const user = await User.findOne({ emailId });
    if (!user) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    // 3. Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    // 4. Create JWT token
    const token = jwt.sign(
      { _id: user._id, emailId: user.emailId },
      process.env.JWT_SECRET || "default_jwt_secret_key",
      { expiresIn: "1d" }
    );

    // 5. Store token in HTTP-only cookie
    res.cookie("token", token, {
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000, // 1 day
    });

    res.status(200).json({
      message: "Login successful",
      user: {
        id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        emailId: user.emailId,
      },
    });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

// Logout Controller
const logout = async (req, res) => {
  try {
    // Clear token cookie
    res.cookie("token", null, {
      httpOnly: true,
      expires: new Date(Date.now()),
    });

    res.status(200).json({ message: "Logout successful" });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

module.exports = {
  register,
  signup: register,
  login,
  logout,
};
