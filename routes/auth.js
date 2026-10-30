const express = require("express");
const authRouter = express.Router();
const { register, login, logout } = require("../controllers/userAuth");
const userAuth = require("../middleware/userAuth");

// Register
authRouter.post("/register", register);

// Login
authRouter.post("/login", login);

// Logout (protected with userAuth middleware)
authRouter.post("/logout", userAuth, logout);

// Profile (protected route to verify userAuth middleware)
authRouter.get("/profile", userAuth, async (req, res) => {
  res.status(200).json({ user: req.user });
});

module.exports = authRouter;
