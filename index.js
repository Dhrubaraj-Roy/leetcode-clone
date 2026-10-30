const express = require("express");
const cookieParser = require("cookie-parser");
require("dotenv").config();

const connectDB = require("./config/db");
const redisClient = require("./config/redis");
const authRouter = require("./routes/auth");
const problemRouter = require("./routes/problem");

const app = express();

// Middlewares
app.use(express.json());
app.use(cookieParser());

// Routes
app.use("/", authRouter);
app.use("/problem", problemRouter);

// Health check route
app.get("/health", (req, res) => {
  res.status(200).json({ status: "OK", message: "Server is healthy" });
});

const PORT = process.env.PORT || 3000;

const startServer = async () => {
  try {
    await connectDB();
    console.log("Database connection established successfully.");

    await redisClient.connect();
    console.log("Redis connection established successfully.");

    app.listen(PORT, () => {
      console.log(`Server is successfully listening on port ${PORT}...`);
    });
  } catch (err) {
    console.error("Server startup error:", err.message);
  }
};

startServer();
