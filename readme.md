# LeetCode Clone

This is a full-stack LeetCode clone project that I am building step by step from scratch. It will include the complete frontend, backend, database, and code evaluation system.

Architecture Diagram:
TLDraw - https://www.tldraw.com/f/-1wZ1l0c492YWuhoW7-cT?d=v23.-15.1420.962.page

---

## Project Timeline and Progress Log

I am documenting my progress with dates and timestamps as I build each part of the system step by step.

### Milestone 1: Project Setup and Authentication Backend
- Date: October 29, 2026
- Time: 20:45 - 21:15 IST
- What I completed:
  1. Initialized the project and planned the architecture on TLDraw.
  2. Created the User schema in Mongoose with firstName, lastName, emailId, and password.
  3. Built the validation module to check inputs for registration and login before touching the database.
  4. Implemented controllers for user registration (with bcrypt password hashing), user login (with JWT authentication), and user logout (clearing the HTTP-only cookie).
  5. Setup the MongoDB connection with environment variable configuration (.env).
  6. Tested the register, login, and logout endpoints successfully.

### Upcoming Milestones
- Milestone 2: Problem Management API (Create, Read, Update, Delete coding problems)
- Milestone 3: Code Submission and Execution Engine (Judge system)
- Milestone 4: Frontend Development (Code editor, problem listings, discussion forum, and user dashboard)

---

## What I Built (Step 1: Core Authentication)

### 1. User Schema (models/user.js)
Created a Mongoose schema for users with the following fields:
- firstName: String (required)
- lastName: String (optional)
- emailId: String (required, unique, lowercase)
- password: String (required, stored as a hashed string)

### 2. Validation (utils/validator.js)
Created helper functions to validate incoming request data:
- validateSignUpData: Checks that first name is provided, email format is valid, and password is at least 6 characters.
- validateLoginData: Checks that email format is valid and password is provided.

### 3. Authentication Controllers (controllers/userAuth.js)
- register: Validates input data, checks if the email already exists, hashes the password using bcrypt, and saves the new user to MongoDB.
- login: Finds the user by email, compares passwords with bcrypt, creates a signed JWT token, and saves it in an HTTP-only cookie.
- logout: Clears the authentication token cookie to log the user out.

### 4. Routes and Server (routes/auth.js & index.js)
- Endpoints created: POST /register, POST /signup, POST /login, and POST /logout.
- Connected Express to MongoDB using Mongoose in config/db.js.
- Used cookie-parser for handling auth cookies and express.json for request payloads.

---

## Folder Structure

```
leetcode-clone/
├── config/
│   └── db.js
├── controllers/
│   └── userAuth.js
├── models/
│   └── user.js
├── routes/
│   └── auth.js
├── utils/
│   └── validator.js
├── .env
├── .env.example
├── .gitignore
├── index.js
├── package.json
└── readme.md
```

---

## Environment Variables

Create a .env file in the root directory with the following variables:

```
PORT=3000
MONGO_URI=mongodb://127.0.0.1:27017/leetcode-clone
JWT_SECRET=your_jwt_secret_key
```

---

## How to Run

1. Install dependencies:
   npm install

2. Start the development server:
   npm run dev

3. Or start the production server:
   npm start

---

## API Endpoints

- POST /register or POST /signup
  Body:
  {
    "firstName": "John",
    "lastName": "Doe",
    "emailId": "john@example.com",
    "password": "password123"
  }

- POST /login
  Body:
  {
    "emailId": "john@example.com",
    "password": "password123"
  }

- POST /logout
  Clears the authentication cookie.
