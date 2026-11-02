const express = require("express");
const authRouter = express.Router();
const {
  register,
  login,
  logout,
  adminRegister,
  deleteProfile,
} = require("../controllers/userAuth");
const userAuth = require("../middleware/userAuth");
const adminAuth = require("../middleware/adminAuth");

// Register (role is always user)
authRouter.post("/register", register);

// Login
authRouter.post("/login", login);

// Logout (protected with userAuth middleware)
authRouter.post("/logout", userAuth, logout);

// Admin Register (only an authenticated admin can access this)
authRouter.post("/admin/register", userAuth, adminAuth, adminRegister);

// Profile (protected route to verify userAuth middleware)
authRouter.get("/profile", userAuth, async (req, res) => {
  res.status(200).json({ user: req.user });
});

// Delete My Profile (User deletes their own account)
authRouter.delete("/profile", userAuth, deleteProfile);

// Admin Delete User Profile (Admin deletes any specified user by userId)
authRouter.delete("/profile/:userId", userAuth, deleteProfile);
authRouter.delete("/admin/user/:userId", userAuth, adminAuth, deleteProfile);

module.exports = authRouter;
