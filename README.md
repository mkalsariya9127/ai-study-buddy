# AI Study Buddy - Full Stack MERN Application

A modern, full-stack AI-powered learning and study assistant platform built with React 19, Vite, Node.js, Express.js, and MongoDB.

---

## 🏗️ Architecture & Project Structure

```text
react study body/
├── server/                    # Node.js + Express + MongoDB Backend
│   ├── config/
│   │   └── db.js              # Mongoose MongoDB Connection with retry logic
│   ├── controllers/
│   │   ├── authController.js  # Registration, OTP, Login, Profile & JWT
│   │   ├── noteController.js  # Full CRUD & Search for Study Notes
│   │   ├── taskController.js  # Full CRUD & Status for Study Planner
│   │   ├── courseController.js# Course catalog & Progress tracking
│   │   ├── timerController.js # Pomodoro Session Logger & Analytics
│   │   ├── quizController.js  # Question Banking, Scoring & Attempts
│   │   ├── aiController.js    # Gemini 2.5/1.5 API Tutor Integration
│   │   ├── pdfController.js   # PDF Parser (pdf-parse) & AI Summarizer
│   │   └── settingsController.js # Theme, Language & Notifications
│   ├── middleware/
│   │   ├── authMiddleware.js  # Bearer JWT Verification
│   │   └── errorHandler.js    # Central Error Handling & Status Codes
│   ├── socket.js              # Authenticated, user-scoped dashboard events
│   ├── models/
│   │   ├── User.js            # User Schema with Bcrypt Password Hashing
│   │   ├── Note.js            # User Scoped Notes Schema
│   │   ├── Task.js            # Study Planner Checklist Schema
│   │   ├── Course.js          # Course Catalog & Enrollment Schema
│   │   ├── StudySession.js    # Pomodoro Focus Session Schema
│   │   ├── Quiz.js            # Quiz Attempt & Score Tracking Schema
│   │   └── Settings.js        # User Preferences Schema
│   ├── routes/                # 9 RESTful API Route Modules
│   ├── tests/                 # Authentication, ownership & socket tests
│   ├── scripts/
│   │   └── migrateAuthSecrets.js
│   ├── .env.example           # Environment template; never commit .env
│   ├── package.json           # Backend Dependencies
│   └── server.js              # Express App Entry Point (Helmet, CORS, Rate-Limiting)
│
├── study/                     # React 19 + Vite Frontend Application
│   ├── src/
│   │   ├── components/        # Navbar, Hero, Features, BackButton
│   │   ├── pages/             # All 14 App Pages (Dashboard, Notes, Quiz, Timer, etc.)
│   │   ├── services/
│   │   │   └── api.js         # Cookie-based REST client and private profile cache
│   │   ├── App.jsx            # React Router v7 Routing Map & 404 Fallback
│   │   └── main.jsx
│   ├── package.json
│   └── vite.config.js
│
└── package.json               # Root Proxy Configuration
```

---

## 🚀 Setup and Run

Install the backend and frontend dependencies from the project root:
```bash
npm install --prefix server
npm install --prefix study
```

Copy `server/.env.example` to `server/.env` and `study/.env.example` to
`study/.env`, then set the required values. Do not commit either `.env` file.

Generate separate random secrets for `JWT_SECRET` and `OTP_SECRET` (at least 32
characters each). For example, run this twice in Node.js:
```bash
node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"
```

Set `MONGO_URI` to the intended MongoDB database. Configure `EMAIL_USER` and
`EMAIL_PASS` to enable email verification and password-reset codes. Google sign
in requires the same Google OAuth web client ID in `server/.env` and
`study/.env`; the server verifies the ID token with Google's authentication
library. Keep the allowed frontend origins in `CLIENT_URL` accurate.

Use `COOKIE_SAME_SITE=lax` for the local frontend/backend setup. Cross-site
production deployments require HTTPS, `COOKIE_SAME_SITE=none`, and exact
frontend origins in `CLIENT_URL`.

Start the backend in one terminal:
```bash
npm run server:dev
```

Start the frontend in a second terminal:
```bash
npm run dev
```

The API health check is at **`http://localhost:5000/api/health`**. Authenticated
sessions use short-lived HttpOnly cookies and a revocable refresh cookie;
unsafe cookie-authenticated requests also require a CSRF token. Socket.IO uses
the verified session to join a private user room. The dashboard continues to
use REST endpoints and refreshes its data after socket reconnects.

The Vite development server proxies `/api` and `/socket.io` to
`http://127.0.0.1:5000`. Keep the backend running while using login or signup.
For a separately hosted API, set `VITE_API_BASE_URL` in the frontend environment
to its full `/api` URL and allow the deployed frontend origin in `CLIENT_URL`.

---

## 🔐 Legacy OTP/Reset-Token Migration

Back up the intended database before running the migration. If existing users
have plaintext legacy OTP or password-reset values, run the migration once with
the same `JWT_SECRET` and `OTP_SECRET` configured in `server/.env`:
```bash
npm --prefix server run migrate:auth-secrets
```
It hashes unexpired legacy codes and removes the old plaintext fields. Do not
change `OTP_SECRET` after migrating active codes, or users will not be able to
verify those codes.

---

## 🤖 Optional: Google Gemini AI API
To enable live cloud LLM responses in the AI Chatbot and PDF Analyzer:
1. Get a free API key from [Google AI Studio](https://aistudio.google.com/).
2. Paste it in `server/.env`:
```env
GEMINI_API_KEY=your_actual_gemini_api_key_here
```
*(Note: If left blank, the app uses its built-in intelligent study tutor assistant automatically).*

---

## 🧪 Tests and Validation

Run the backend authentication, account-isolation, and socket tests:
```bash
npm --prefix server test
```

Run the frontend lint and production build checks:
```bash
npm run lint
npm run build
```

The automated backend tests use an in-memory MongoDB instance and do not
exercise a production Atlas deployment or real email/Google credentials.

## Historical Baseline Notes
- **Backend API**: All 9 modules verified with Bearer token authentication and user isolation.
- **Resilience**: Frontend seamlessly falls back to local storage cache if the backend is temporarily offline.
