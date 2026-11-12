const express = require("express");
const chatRouter = express.Router();
const userAuth = require("../middleware/userAuth");
const { handleChat } = require("../controllers/chat.controller");

// Route: POST /chat (also supports POST /chat/)
// Protected route: user must be authenticated with a valid session/token in the database
chatRouter.post("/", userAuth, handleChat);
chatRouter.post("/chat", userAuth, handleChat);

module.exports = chatRouter;


