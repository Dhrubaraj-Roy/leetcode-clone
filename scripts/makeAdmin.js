require("dotenv").config();
const connectDB = require("../config/db");
const User = require("../models/user");

const email = process.argv[2];

if (!email) {
  console.log("Usage: node scripts/makeAdmin.js <user-email>");
  process.exit(1);
}

const promoteToAdmin = async () => {
  try {
    await connectDB();
    const user = await User.findOneAndUpdate(
      { emailId: email.toLowerCase() },
      { $set: { role: "admin" } },
      { new: true }
    );

    if (!user) {
      console.log(`User with email "${email}" not found in database.`);
    } else {
      console.log(`Success! User "${user.emailId}" role is now: ${user.role}`);
    }
  } catch (err) {
    console.error("Error:", err.message);
  } finally {
    process.exit(0);
  }
};

promoteToAdmin();
