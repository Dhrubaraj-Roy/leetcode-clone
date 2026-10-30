const jwt = require("jsonwebtoken");
const User = require("../models/user");
const redisClient = require("../config/redis");

const userAuth = async (req, res, next) => {
  try {
    // 1. Read token from cookies or authorization header
    const token = req.cookies.token || req.headers.authorization?.replace("Bearer ", "");

    if (!token) {
      return res.status(401).json({ message: "Authentication required. Please login." });
    }

    // 2. Check if token is blacklisted in Redis
    const isBlacklisted = await redisClient.get(`token:${token}`);
    if (isBlacklisted) {
      return res.status(401).json({ message: "Session expired or logged out. Please login again." });
    }

    // 3. Verify JWT token
    const decodedObj = jwt.verify(
      token,
      process.env.JWT_SECRET
    );

    // 4. Find user in database
    const user = await User.findById(decodedObj._id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // 5. Attach user and token to request object
    req.user = user;
    req.token = token;

    next();
  } catch (err) {
    return res.status(401).json({ message: "Unauthorized: " + err.message });
  }
};

module.exports = userAuth;
