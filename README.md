# Redora — Where Technology Meets Life

A full-stack MERN blood donation platform connecting donors, recipients,
hospitals, and blood banks in real time — powered by AI-based donor matching.

## Version 1 (current) — Foundation: Setup, Models & Authentication

- Express + Mongoose backend with JWT auth
- User model (donor / patient roles)
- Email OTP registration + verification (free dev mode prints OTP to console)
- Login with protected routes
- React frontend with Home, Register, Verify OTP, Login, and role dashboards

## Version 3 (current) — Journey

- **Accept / Decline** — donors accept or decline blood requests; patients
  assign, confirm, or release a matched donor
- **Live tracking** — a shared journey timeline (matched → accepted → traveling
  → arrived → donating → completed) with live location updates and auto-refresh
- **Certificates** — donors get a printable donation certificate with a unique
  code after each completed donation
- **History** — donor journey history and certificates page

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

The API now binds to `0.0.0.0` and accepts requests from any origin / IP, so
phones and computers on your network (or the internet) can reach it. On
startup it prints both the `Local` and `Network` URLs.

> **OTP in dev mode:** if `EMAIL_USER` / `EMAIL_PASS` are empty, the OTP is
> printed in the backend terminal (free, no account needed). To send real
> emails, set them to a free Gmail app password and `npm run dev`.

### 2. Frontend

```
cd frontend
npm install
npm run dev
```

Open http://localhost:5174 (the Vite server is set to `host: true`, so it also
serves on your machine's LAN IP).

## Accessing from your phone / any device (any IP)

1. Make sure your phone is on the **same Wi-Fi network** as the computer
   running the servers.
2. Start the backend then the frontend.
3. Open the **Network** URL the terminal printed, e.g.
   `http://192.168.1.10:5174` — it works from any device.

> **Windows firewall:** allow inbound connections on ports `5000` (API) and
> `5174` (frontend) the first time, or run this once from an **Admin** terminal:
>
> ```
> netsh advfirewall firewall add rule name="Redora 5000" dir=in action=allow protocol=TCP localport=5000
> netsh advfirewall firewall add rule name="Redora 5174" dir=in action=allow protocol=TCP localport=5174
> ```

### Voice/microphone (AURA chatbot) needs HTTPS

The browser **blocks the microphone** (Web Speech API) and geolocation on
plain `http://` LAN addresses — this is a browser security rule, not a bug.
For voice input to work on your phone you must serve the app over **HTTPS**
(localhost is exempt). Options, all free:

- **Tunnel** — run `npx localtunnel --port 5174` or `ngrok http 5174` to get an
  `https://…` URL that works from any device on any network.
- **Deploy** — host the frontend on Vercel/Netlify and the API on
  Render/Railway (all free tiers). Both give you HTTPS for free.
- Without HTTPS, voice chat still works on your own computer via
  `http://localhost:5174`.

## MongoDB Atlas (free tier)

1. Create a free account at https://www.mongodb.com/atlas and a free **M0**
   cluster (no credit card needed).
2. Click **Connect → Drivers** and copy the `mongodb+srv://…` connection string.
3. In **Network Access** → **Add IP Address** → choose *"Allow access from
   anywhere"* (`0.0.0.0/0`) so every IP can connect.
4. Paste it into `backend/.env` as `MONGO_URI`. The code logs whether it
   connected via Atlas (cloud) or local MongoDB.

## API Endpoints

| Method | Endpoint            | Description                        |
| ------ | ------------------- | ---------------------------------- |
| POST   | `/api/auth/register`| Register (sends OTP)               |
| POST   | `/api/auth/verify-otp` | Verify email with OTP            |
| POST   | `/api/auth/login`   | Login, returns JWT                 |
| GET    | `/api/auth/me`      | Current user (protected)           |

### Journey API (protected)

| Method | Endpoint                   | Description                              |
| ------ | -------------------------- | ---------------------------------------- |
| PATCH  | `/api/requests/:id/respond` | Donor accepts / declines a request      |
| PATCH  | `/api/requests/:id/donor`   | Patient assigns / confirms / releases donor |
| PATCH  | `/api/requests/:id/journey` | Advance journey stage, update location, cancel |
| GET    | `/api/requests/:id/tracking`| Live journey detail (patient or donor)  |
| GET    | `/api/requests/:id/certificate` | Donation certificate (donor)       |
| GET    | `/api/donors/my-journey`    | Donor's journey history                 |
| GET    | `/api/donors/certificates`  | Donor's issued certificates             |

## Roadmap

- **v1** Foundation — setup, models, OTP auth, dashboards ✅
- **v2** Core flow — donor profiles, blood requests, search & eligibility ✅
- **v3** Journey — accept/decline, live tracking, certificates, history ✅
- **v4** Admin, inventory, feedback, polish & deploy
