const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const User = require("../models/user");
const redisClient = require("../config/redis");
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
    const emailId = req.body.emailId;

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
      process.env.JWT_SECRET,
      { expiresIn: "1h" }
    );

    // 5. Store token in HTTP-only cookie (expires in 1 hour)
    res.cookie("token", token, {
      httpOnly: true,
      maxAge: 60 * 60 * 1000, // 1 hour
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
    const token = req.token || req.cookies?.token;

    if (token) {
      const decoded = jwt.decode(token);
      if (decoded && decoded.exp) {
        const currentTime = Math.floor(Date.now() / 1000);
        const remainingTime = decoded.exp - currentTime;

        if (remainingTime > 0) {
          // Store token in Redis blacklist for the remaining TTL
          await redisClient.set(`token:${token}`, "blacklisted", {
            EX: remainingTime,
          });
        }
      }
    }

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
  login,
  logout,
};
