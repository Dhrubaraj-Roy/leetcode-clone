const adminAuth = (req, res, next) => {
  // Check if user is authenticated and has admin role
  if (!req.user || req.user.role !== "admin") {
    return res.status(403).json({
      message: "Access denied. Only an admin can perform this action.",
    });
  }

  next();
};

module.exports = adminAuth;
