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

### Milestone 4: Problem Management API (CRUD Coding Problems)
- Date: October 30, 2026
- Time: 12:45 - 13:15 IST
- What I completed:
  1. Created the `Problem` schema in Mongoose with title, description, difficulty level, tags, visible test cases, hidden test cases, starter code per language, and reference to the problem creator.
  2. Built admin controllers to create, update, and delete coding problems.
  3. Built public controllers to fetch all problems with query filters (`difficulty` and `tag`), and view a single problem by ID.
  4. Implemented data privacy for test cases: `hiddenTestCases` are strictly excluded from public responses (`.select("-hiddenTestCases")`) so users cannot peek at the test suite.
  5. Built the problem submission route (`POST /problem/solve/:id`) for authenticated users to submit code for evaluation.
  6. Mounted all problem endpoints under `/problem` in `index.js`.

### Milestone 5: OnlineCompiler (Judge0-Compatible API) Integration & Problem Verification
- Date: October 31, 2026
- Time: 10:00 - 13:00 IST
- What I completed:
  1. Added `referenceSolution` to the `Problem` schema with `language` and `completeCode`.
  2. Integrated OnlineCompiler.io as a Judge0-compatible execution provider via Axios (`POST /submissions/batch` and `GET /submissions/batch?tokens=...`).
  3. Built `utils/problem.service.js` with `getLanguageById`, `submitBatch`, `getBatchResults`, and `wait`.
  4. Restricted supported languages strictly to **C++** (ID: 105) and **Python** (ID: 113) for performance and consistency.
  5. Configured `ONLINECOMPILER_API_KEY` and `JUDGE0_URL` in `.env`.
  6. Updated `createProblem` to dynamically construct batch submissions of reference solutions against all visible and hidden test cases.
  7. Implemented an asynchronous polling mechanism (1-second intervals) that waits until submissions finish processing (Status 1: In Queue, Status 2: Processing).
  8. Enforced verification: every reference solution test run must return Status 3 (`Accepted`). If any test case fails or produces an error, problem creation is rejected with detailed error feedback.
  9. Excluded `referenceSolution` and `hiddenTestCases` from public problem views to safeguard test suite integrity.

### Milestone 6: Problem Pagination, ObjectId Validation & Submission Schema Architecture
- Date: October 31, 2026
- Time: 17:30 - 17:40 IST
- What I completed:
  1. Built a reusable `isValidObjectId` validator in `utils/validator.js` and plugged it into all ID-based endpoints (`updateProblem`, `deleteProblem`, `getProblemById`, `solveProblem`) to eliminate unhandled `CastError` exceptions and return clean 400 Bad Request responses.
  2. Implemented pagination on `GET /problem/all` (`getAllProblems`) with query parameters `page` (default: 1) and `limit` (default: 10), returning pagination metadata (`page`, `limit`, `totalPages`, `totalProblems`, `count`, `problems`).
  3. Added language support validation in `updateProblem` to ensure any modified `referenceSolution` adheres strictly to supported languages (C++ and Python).
  4. Designed and created the `Submission` Mongoose model (`models/submission.model.js`) to capture user code submissions, status verdicts, runtime metrics (`time` in seconds, `memory` in KB), test case counters (`testCasesPassed`, `totalTestCases`), error messages, and compound indexes for fast history queries.

---

## What I Built So Far

### 1. User Schema (models/user.js)
Created a Mongoose schema for users with the following fields:
- firstName: String (required)
- lastName: String (optional)
- emailId: String (required, unique, lowercase, trimmed)
- password: String (required, stored as a bcrypt hash)
- role: String (enum: `["user", "admin"]`, default: `"user"`)
- problemsSolved: Array of ObjectIds (references to `Problem`, storing unique solved problems without duplicates)

### 2. Problem Schema (models/problem.model.js)
Created a Mongoose schema for coding problems with the following fields:
- title: String (required, trimmed)
- description: String (required, trimmed)
- difficulty: String (required, enum: `["easy", "medium", "hard"]`)
- tags: Array of strings (e.g., `["array", "two-pointers"]`)
- visibleTestCases: Array of public example test cases shown to users:
  - input: String (required)
  - output: String (required)
  - explanation: String (optional)
- hiddenTestCases: Array of test cases used by the judge to evaluate code (never exposed to normal users):
  - input: String (required)
  - output: String (required)
- startCode: Array of boilerplate starter templates:
  - language: String (e.g., `"python"`, `"cpp"`)
  - initialCode: String
- referenceSolution: Array of complete reference solutions per language:
  - language: String (e.g., `"python"`, `"cpp"`)
  - completeCode: String
- problemCreator: ObjectId (reference to `User`, required)

### 3. Submission Schema (models/submission.model.js)
Created a Mongoose schema for code evaluation submissions with the following fields:
- userId: ObjectId (reference to `User`, required, indexed)
- problemId: ObjectId (reference to `Problem`, required, indexed)
- code: String (required)
- language: String (enum: `["cpp", "python"]`, required)
- status: String (enum: `["Pending", "Accepted", "Wrong Answer", "Time Limit Exceeded", "Memory Limit Exceeded", "Compilation Error", "Runtime Error", "Internal Error"]`, default: `"Pending"`)
- time: Number (execution time in seconds, default: 0)
- memory: Number (memory consumed in KB, default: 0)
- testCasesPassed: Number (default: 0)
- totalTestCases: Number (default: 0)
- errorMessage: String (details of runtime or execution error, optional)
- compileOutput: String (compiler error logs or warnings, optional)
- Timestamps and compound indexes for fast query lookup (`userId + problemId`, `createdAt`).

### 4. Problem Service & OnlineCompiler Judge0 API (utils/problem.service.js)
Created utility functions to interface with the code execution engine via Axios:
- getLanguageById: Maps language names to compiler IDs (C++: 105, Python: 113).
- submitBatch: Posts a batch of submissions to OnlineCompiler (`POST https://api.onlinecompiler.io/api/judge0/submissions/batch`).
- getBatchResults: Retrieves execution results by tokens (`GET /submissions/batch?tokens=...`).
- wait: Promisified timer used for 1-second polling intervals while waiting for compiler execution.
- getHeaders: Authenticates requests using `process.env.ONLINECOMPILER_API_KEY`.

### 5. Input Validation (utils/validator.js)
Created helper functions to validate incoming request data before hitting the database:
- isValidObjectId: Validates whether a given ID string is a valid MongoDB ObjectId format.
- validateSignUpData: Checks that first name is provided, email is valid, and password is strong (contains uppercase, lowercase, number, and special character).
- validateLoginData: Checks that email format is valid and password is provided.

### 6. Authentication Controllers (controllers/userAuth.js)
- register: Validates input data, checks if the email already exists, hashes the password using bcrypt (10 rounds), strictly assigns `role: "user"`, and saves the new user to MongoDB.
- login: Finds user by email, verifies password with bcrypt, creates a signed JWT token containing user ID, email, and role (expires in 1 hour), and stores it in an HTTP-only cookie.
- logout: Extracts the token, calculates how much time it has left before expiration, adds it to the Redis blacklist with that exact TTL, and clears the cookie.
- adminRegister: An admin-only controller that registers another admin account with `role: "admin"` and hashed password.

### 7. Problem Controllers (controllers/problem.controller.js)
- createProblem (Admin only): Validates required fields, compiles reference solutions and test cases into a batch submission for OnlineCompiler, polls every 1 second until compilation finishes, verifies Status 3 (`Accepted`) across all test cases, links the problem to the admin, and saves to MongoDB.
- updateProblem (Admin only): Validates MongoDB ObjectId format, accepts partial updates via `PATCH` or `PUT`, ensures only allowed fields (including `referenceSolution`) are modified, and re-validates data.
- deleteProblem (Admin only): Validates MongoDB ObjectId format, finds and deletes a problem by ID from MongoDB.
- getAllProblems (Public): Returns a paginated list of all problems (default: 10 per page) using field allowlisting for public safety.
- getProblemById (Public): Validates MongoDB ObjectId format and uses field allowlisting (positive selection) so hidden test cases and reference solutions are strictly hidden from non-admin viewers.
- solveProblem (Protected - User login required): Validates MongoDB ObjectId format, receives code and language from the user for execution.

### 8. Middlewares (middleware/)
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

### 9. Why and How Redis Token Blacklisting Works
JWT tokens are stateless. When a user logs out, simply deleting the cookie from their browser doesn't invalidate the token itself. If someone had copied that token, they could still make requests until it expired.

To solve this:
- On logout, I decode the token to get its expiration time (`exp`).
- I calculate the remaining seconds: `remainingTime = exp - currentTime`.
- If the token is still active, I save it in Redis as `token:<token>` with a value of `"blacklisted"` and set its TTL to `remainingTime`.
- When any protected route is accessed, `userAuth` middleware checks Redis first. If the key exists, it returns `401 Unauthorized`.
- Once the token expires naturally, Redis evicts it automatically, so memory usage stays low without any manual cleanup.

### 10. Bootstrapping Admins (scripts/makeAdmin.js)
Since creating an admin via the API requires you to already be logged in as an admin (`POST /admin/register`), there is a chicken-and-egg problem: how do you create the very first admin?

To solve this, I made a CLI helper script:
```bash
npm run make-admin user@example.com
# or
node scripts/makeAdmin.js user@example.com
```
This connects to MongoDB, finds the user by email, and sets their `role` to `"admin"`. Once you have your first admin, that admin can log in and register other admins through the API.

### 11. Server Startup (index.js & config/)
- `config/db.js`: Connects to MongoDB using Mongoose.
- `config/redis.js`: Creates and exports the Redis client.
- `index.js`: Connects to both MongoDB and Redis before the Express server starts listening for requests.
- Routers mounted:
  - Auth routes: `/` (`authRouter`)
  - Problem routes: `/problem` (`problemRouter`)
  - Submission routes: `/submit` (`submitCodeRouter`)

---

## Folder Structure

```
leetcode-clone/
├── config/
│   ├── db.js
│   └── redis.js
├── controllers/
│   ├── problem.controller.js
│   ├── submission.controller.js
│   └── userAuth.js
├── middleware/
│   ├── adminAuth.js
│   └── userAuth.js
├── models/
│   ├── problem.model.js
│   ├── submission.model.js
│   └── user.js
├── routes/
│   ├── auth.js
│   ├── problem.js
│   └── submitCode.js
├── scripts/
│   └── makeAdmin.js
├── utils/
│   ├── problem.service.js
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
ONLINECOMPILER_API_KEY=your_onlinecompiler_api_key
JUDGE0_URL=https://api.onlinecompiler.io/api/judge0
```

---

## API Endpoints

### 1. Authentication Endpoints

#### Public
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

#### Protected (Requires User Login)
- GET /profile
  Fetches the logged-in user profile (including `role`).
  Header: `Cookie: token=...` or `Authorization: Bearer <token>`

- POST /logout
  Logs the user out, blacklists the token in Redis for its remaining lifetime, and clears the auth cookie.
  Header: `Cookie: token=...` or `Authorization: Bearer <token>`

#### Admin-Only
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

---

### 2. Problem Management Endpoints

#### Public (Anyone can view problems)
- GET /problem/all (or `/problem`)
  Lists all problems with pagination. Hidden test cases and reference solutions are excluded.
  Optional Query Filters: `?page=1&limit=10`, `?difficulty=easy`, `?tag=array`

- GET /problem/:id (or `/problem/get/:id`)
  Retrieves single problem details by ID (hidden test cases are hidden for users).

#### Protected (Requires User Login)
- GET /problem/solved
  Retrieves all unique problems solved by the authenticated user, displaying problem ID, difficulty, title, and tags.
  Protected by: `userAuth` middleware.
  Response:
  ```json
  {
    "count": 1,
    "solvedProblems": [
      {
        "_id": "672461ab711b4650cab3ad31",
        "title": "Two Sum",
        "difficulty": "easy",
        "tags": ["array", "hash-table"]
      }
    ]
  }
  ```

- POST /problem/run/:id
  Runs code against visible/example test cases only. Does NOT store anything in the database (no submission or solve record created). Returns per-testcase input, expected output, and actual stdout so users can test before submitting.
  Protected by: `userAuth` middleware.
  Body:
  ```json
  {
    "language": "python",
    "code": "import sys\n# code here\n"
  }
  ```
  Response:
  ```json
  {
    "message": "Code run finished",
    "status": "Accepted",
    "testCasesPassed": 2,
    "totalTestCases": 2,
    "runtime": "0.012s",
    "memory": "1120 KB",
    "results": [
      {
        "testCase": 1,
        "input": "4 9\n2 7 11 15",
        "expectedOutput": "0 1\n",
        "actualOutput": "0 1\n",
        "status": "Accepted",
        "passed": true,
        "time": "0.012s",
        "memory": "1120 KB",
        "error": null
      }
    ]
  }
  ```

- POST /submit/:problemId (or `POST /problem/solve/:id`)
  Submits user code for real-time evaluation. The submission is persisted in the database as "Pending" first, then evaluated against all visible and hidden test cases on OnlineCompiler.
  Protected by: `userAuth` middleware.
  Body:
  ```json
  {
    "language": "python",
    "code": "import sys\n\ndef solve():\n    # your solution code\n    pass\n\nif __name__ == '__main__':\n    solve()"
  }
  ```
  Response:
  ```json
  {
    "message": "Code evaluated successfully",
    "submission": {
      "id": "672462e78f9...",
      "problemId": "6723... ",
      "status": "Accepted",
      "time": "0.015s",
      "memory": "1280 KB",
      "testCasesPassed": 4,
      "totalTestCases": 4,
      "errorMessage": null,
      "compileOutput": null
    }
  }
  ```

#### Admin-Only (Requires Admin Login)
All problem creation and modification endpoints require both `userAuth` and `adminAuth`.

- POST /problem/create
  Creates a new coding problem with test cases, starter templates, and reference solutions (must pass all test cases on OnlineCompiler before saving).
  Body:
  ```json
  {
    "title": "Two Sum",
    "description": "Given an array of integers nums and an integer target...",
    "difficulty": "easy",
    "tags": ["array", "hash-table"],
    "visibleTestCases": [
      {
        "input": "4 9\n2 7 11 15",
        "output": "0 1\n",
        "explanation": "nums[0] + nums[1] == 2 + 7 == 9, so the indices are 0 1."
      }
    ],
    "hiddenTestCases": [
      {
        "input": "3 6\n3 2 4",
        "output": "1 2\n"
      }
    ],
    "startCode": [
      {
        "language": "python",
        "initialCode": "import sys\n# starter code\n"
      },
      {
        "language": "cpp",
        "initialCode": "#include <iostream>\nusing namespace std;\n// starter code\n"
      }
    ],
    "referenceSolution": [
      {
        "language": "python",
        "completeCode": "import sys\n# complete working code\n"
      },
      {
        "language": "cpp",
        "completeCode": "#include <iostream>\nusing namespace std;\n// complete working code\n"
      }
    ]
  }
  ```

- PATCH /problem/update/:id (or `PUT /problem/update/:id`)
  Updates existing problem details.

- DELETE /problem/delete/:id
  Deletes a problem by ID.
