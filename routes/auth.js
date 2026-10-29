const express = require("express");
const authRouter = express.Router();
const { register, login, logout } = require("../controllers/userAuth");

// Register / Signup
authRouter.post("/register", register);
authRouter.post("/signup", register);

// Login
authRouter.post("/login", login);

// Logout
authRouter.post("/logout", logout);

module.exports = authRouter;
