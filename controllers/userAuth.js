const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const User = require("../models/user");
const Submission = require("../models/submission.model");
const redisClient = require("../config/redis");
const {
  validateSignUpData,
  validateLoginData,
  isValidObjectId,
} = require("../utils/validator");

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

    // 4. Create and save new user (role is always strictly enforced as "user")
    const newUser = new User({
      firstName,
      lastName,
      emailId,
      password: passwordHash,
      role: "user",
    });

    await newUser.save();

    // 5. Create JWT token and set HTTP-only cookie so the user is logged in automatically
    const token = jwt.sign(
      { _id: newUser._id, emailId: newUser.emailId, role: newUser.role },
      process.env.JWT_SECRET,
      { expiresIn: "1h" }
    );

    res.cookie("token", token, {
      httpOnly: true,
      maxAge: 60 * 60 * 1000, // 1 hour
    });

    res.status(201).json({
      message: "User registered successfully",
      user: {
        id: newUser._id,
        firstName: newUser.firstName,
        lastName: newUser.lastName,
        emailId: newUser.emailId,
        role: newUser.role,
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
      { _id: user._id, emailId: user.emailId, role: user.role },
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
        role: user.role,
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

// Admin Register Controller (only accessible by an authenticated admin)
const adminRegister = async (req, res) => {
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

    // 4. Create and save new admin user
    const newAdmin = new User({
      firstName,
      lastName,
      emailId,
      password: passwordHash,
      role: "admin",
    });

    await newAdmin.save();

    res.status(201).json({
      message: "Admin registered successfully",
      user: {
        id: newAdmin._id,
        firstName: newAdmin.firstName,
        lastName: newAdmin.lastName,
        emailId: newAdmin.emailId,
        role: newAdmin.role,
      },
    });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

// Delete Profile Controller (User deletes their own account)
const deleteProfile = async (req, res) => {
  try {
    const userId = req.user._id;

    // Check if target user exists in database
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    // 1. Delete all submissions made by this user
    const submissionDeleteResult = await Submission.deleteMany({
      userId,
    });

    // 2. Delete the user
    await User.findByIdAndDelete(userId);

    // 3. Blacklist token in Redis and clear cookie
    const token = req.token || req.cookies?.token;
    if (token) {
      const decoded = jwt.decode(token);
      if (decoded && decoded.exp) {
        const currentTime = Math.floor(Date.now() / 1000);
        const remainingTime = decoded.exp - currentTime;
        if (remainingTime > 0) {
          await redisClient.set(`token:${token}`, "blacklisted", {
            EX: remainingTime,
          });
        }
      }
    }
    res.clearCookie("token");

    res.status(200).json({
      message: "Profile and all associated submissions deleted successfully.",
      deletedUser: {
        id: user._id,
        emailId: user.emailId,
        firstName: user.firstName,
      },
      deletedSubmissionsCount: submissionDeleteResult.deletedCount,
    });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

// Check Auth Controller (gracefully checks auth status without throwing 401 in browser console)
const checkAuth = async (req, res) => {
  try {
    const token = req.cookies.token || req.headers.authorization?.replace("Bearer ", "");

    if (!token) {
      return res.status(200).json({
        authenticated: false,
        user: null,
      });
    }

    // Check if token is blacklisted in Redis
    const isBlacklisted = await redisClient.get(`token:${token}`);
    if (isBlacklisted) {
      return res.status(200).json({
        authenticated: false,
        user: null,
      });
    }

    // Verify JWT token
    const decodedObj = jwt.verify(token, process.env.JWT_SECRET);

    // Find user in database
    const user = await User.findById(decodedObj._id);
    if (!user) {
      return res.status(200).json({
        authenticated: false,
        user: null,
      });
    }

    res.status(200).json({
      authenticated: true,
      user: {
        id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        emailId: user.emailId,
        role: user.role,
      },
    });
  } catch (err) {
    // If token is expired or invalid, return unauthenticated state cleanly
    return res.status(200).json({
      authenticated: false,
      user: null,
    });
  }
};

module.exports = {
  register,
  login,
  logout,
  adminRegister,
  deleteProfile,
  checkAuth,
};
