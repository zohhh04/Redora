# Redora — Where Technology Meets Life

A full-stack MERN blood donation platform connecting donors, recipients,
hospitals, and blood banks in real time — powered by AI-based donor matching.

## Version 1 (current) — Foundation: Setup, Models & Authentication

- Express + Mongoose backend with JWT auth
- User model (donor / patient roles)
- Email OTP registration + verification (free dev mode prints OTP to console)
- Login with protected routes
- React frontend with Home, Register, Verify OTP, Login, and role dashboards

## Tech Stack

- **Frontend:** React (Vite), React Router, Axios
- **Backend:** Node.js, Express, JWT, Nodemailer
- **Database:** MongoDB (Mongoose) — Atlas free tier or local

## Project Structure

```
backend/    Express API: models, routes, controllers, middleware
frontend/   React app: pages, context, api client
```

## Getting Started

### Prerequisites

- Node.js
- MongoDB (local or Atlas free tier)

### 1. Backend

```
cd backend
npm install
```

Create `backend/.env`:

```
PORT=5000
MONGO_URI=your_mongodb_atlas_connection_string
JWT_SECRET=change_this_to_a_long_random_string
EMAIL_USER=
EMAIL_PASS=
```

Run:

```
npm run dev
```

> **OTP in dev mode:** if `EMAIL_USER` / `EMAIL_PASS` are empty, the OTP is
> printed in the backend terminal (free, no account needed). To send real
> emails, set them to a free Gmail app password and `npm run dev`.

### 2. Frontend

```
cd frontend
npm install
npm run dev
```

Open http://localhost:5173

## API Endpoints

| Method | Endpoint            | Description                        |
| ------ | ------------------- | ---------------------------------- |
| POST   | `/api/auth/register`| Register (sends OTP)               |
| POST   | `/api/auth/verify-otp` | Verify email with OTP            |
| POST   | `/api/auth/login`   | Login, returns JWT                 |
| GET    | `/api/auth/me`      | Current user (protected)           |

## Roadmap

- **v1** Foundation — setup, models, OTP auth, dashboards ✅
- **v2** Core flow — donor profiles, blood requests, search & eligibility
- **v3** Journey — accept/decline, live tracking, certificates, history
- **v4** Admin, inventory, feedback, polish & deploy
