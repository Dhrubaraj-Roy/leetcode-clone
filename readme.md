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

### Milestone 2: Auth Middleware & Redis Token Blacklisting
- Date: October 30, 2026
- Time: 11:30 - 12:15 IST
- What I completed:
  1. Created a reusable `userAuth` middleware to protect private routes.
  2. Integrated Redis to handle JWT token blacklisting when a user logs out.
  3. Stored blacklisted tokens with a dynamic TTL (Time-To-Live) matching their remaining expiry time, so Redis cleans them up automatically without taking up extra memory.
  4. Updated the login system so tokens expire in 1 hour (down from 24 hours) for better security.
  5. Added a protected `GET /profile` endpoint to verify the middleware and fetch logged-in user details.
  6. Strengthened signup validation using `validator.isStrongPassword`.
  7. Updated server initialization to connect to both MongoDB and Redis before starting the Express server.

### Milestone 3: Role-Based Access Control (User & Admin Roles)
- Date: October 30, 2026
- Time: 12:20 - 12:35 IST
- What I completed:
  1. Added a `role` field to the User schema (`user` or `admin`, defaulting to `user`).
  2. Enforced that public signups (`POST /register`) can only create accounts with the `user` role to prevent unauthorized privilege escalation.
  3. Included the `role` inside the JWT payload and user login/register responses.
  4. Created an `adminAuth` middleware to restrict administrative routes to users who have `role === 'admin'`.
  5. Added a protected `POST /admin/register` endpoint (chained with `userAuth` and `adminAuth`) so existing admins can create new admin accounts.
  6. Built a CLI script `scripts/makeAdmin.js` and added `npm run make-admin <email>` to bootstrap the initial admin directly in the database.

---

## What I Built So Far

### 1. User Schema (models/user.js)
Created a Mongoose schema for users with the following fields:
- firstName: String (required)
- lastName: String (optional)
- emailId: String (required, unique, lowercase, trimmed)
- password: String (required, stored as a bcrypt hash)
- role: String (enum: `["user", "admin"]`, default: `"user"`)

### 2. Input Validation (utils/validator.js)
Created helper functions to validate incoming request data before hitting the database:
- validateSignUpData: Checks that first name is provided, email is valid, and password is strong (contains uppercase, lowercase, number, and special character).
- validateLoginData: Checks that email format is valid and password is provided.

### 3. Authentication Controllers (controllers/userAuth.js)
- register: Validates input data, checks if the email already exists, hashes the password using bcrypt (10 rounds), strictly assigns `role: "user"`, and saves the new user to MongoDB.
- login: Finds user by email, verifies password with bcrypt, creates a signed JWT token containing user ID, email, and role (expires in 1 hour), and stores it in an HTTP-only cookie.
- logout: Extracts the token, calculates how much time it has left before expiration, adds it to the Redis blacklist with that exact TTL, and clears the cookie.
- adminRegister: An admin-only controller that registers another admin account with `role: "admin"` and hashed password.

### 4. Middlewares (middleware/)
- `middleware/userAuth.js`:
  1. Reads the token from either the HTTP-only cookie or the `Authorization: Bearer <token>` header.
  2. Checks Redis to see if the token is blacklisted. If blacklisted, rejects the request immediately.
  3. Verifies the JWT token using `JWT_SECRET`.
  4. Finds the user in MongoDB by ID.
  5. Attaches `user` and `token` to the request object (`req.user`, `req.token`) and calls `next()`.
- `middleware/adminAuth.js`:
  1. Runs after `userAuth`.
  2. Verifies that `req.user.role === "admin"`.
  3. If not an admin, rejects with a `403 Forbidden` response.

### 5. Why and How Redis Token Blacklisting Works
JWT tokens are stateless. When a user logs out, simply deleting the cookie from their browser doesn't invalidate the token itself. If someone had copied that token, they could still make requests until it expired.

To solve this:
- On logout, I decode the token to get its expiration time (`exp`).
- I calculate the remaining seconds: `remainingTime = exp - currentTime`.
- If the token is still active, I save it in Redis as `token:<token>` with a value of `"blacklisted"` and set its TTL to `remainingTime`.
- When any protected route is accessed, `userAuth` middleware checks Redis first. If the key exists, it returns `401 Unauthorized`.
- Once the token expires naturally, Redis evicts it automatically, so memory usage stays low without any manual cleanup.

### 6. Bootstrapping Admins (scripts/makeAdmin.js)
Since creating an admin via the API requires you to already be logged in as an admin (`POST /admin/register`), there is a chicken-and-egg problem: how do you create the very first admin?

To solve this, I made a CLI helper script:
```bash
npm run make-admin user@example.com
# or
node scripts/makeAdmin.js user@example.com
```
This connects to MongoDB, finds the user by email, and sets their `role` to `"admin"`. Once you have your first admin, that admin can log in and register other admins through the API.

### 7. Server Startup (index.js & config/)
- `config/db.js`: Connects to MongoDB using Mongoose.
- `config/redis.js`: Creates and exports the Redis client.
- `index.js`: Connects to both MongoDB and Redis before the Express server starts listening for requests.

---

## Folder Structure

```
leetcode-clone/
├── config/
│   ├── db.js
│   └── redis.js
├── controllers/
│   └── userAuth.js
├── middleware/
│   ├── adminAuth.js
│   └── userAuth.js
├── models/
│   └── user.js
├── routes/
│   └── auth.js
├── scripts/
│   └── makeAdmin.js
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

Create a `.env` file in the root directory with the following variables:

```
PORT=3000
MONGO_URI=mongodb+srv://<username>:<password>@cluster0.mongodb.net/leetcode-clone
JWT_SECRET=your_jwt_secret_key
REDIS_HOST=127.0.0.1
REDIS_PORT=6379
REDIS_PASS=your_redis_password
```

---

## How to Run

1. Install dependencies:
   ```bash
   npm install
   ```

2. Make sure MongoDB and Redis are running on your system or you have cloud connection URIs set up in `.env`.

3. Start the development server:
   ```bash
   npm run dev
   ```

4. Or start the production server:
   ```bash
   npm start
   ```

5. Promote an existing user to admin via CLI script:
   ```bash
   npm run make-admin user@example.com
   ```

---

## API Endpoints

### Public Endpoints

- POST /register
  Registers a new regular user account (role is always strictly `"user"`).
  Body:
  ```json
  {
    "firstName": "John",
    "lastName": "Doe",
    "emailId": "john@example.com",
    "password": "Password@123"
  }
  ```

- POST /login
  Authenticates a user and sets an HTTP-only cookie with the JWT (valid for 1 hour). Returns user details including their `role`.
  Body:
  ```json
  {
    "emailId": "john@example.com",
    "password": "Password@123"
  }
  ```

### Protected Endpoints (Requires Login)

- GET /profile
  Fetches the logged-in user profile (including `role`).
  Header: `Cookie: token=...` or `Authorization: Bearer <token>`

- POST /logout
  Logs the user out, blacklists the token in Redis for its remaining lifetime, and clears the auth cookie.
  Header: `Cookie: token=...` or `Authorization: Bearer <token>`

### Admin-Only Endpoints (Requires Admin Login)

- POST /admin/register
  Allows an authenticated admin to create another admin account.
  Protected by: `userAuth` + `adminAuth` middlewares.
  Header: `Cookie: token=...` or `Authorization: Bearer <token>`
  Body:
  ```json
  {
    "firstName": "AdminFirst",
    "lastName": "AdminLast",
    "emailId": "admin@example.com",
    "password": "Password@123"
  }
  ```
