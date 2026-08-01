# Redora — Where Technology Meets Life 

A full-stack MERN blood donation platform connecting donors, recipients,
hospitals, and blood banks in real time — powered by an AI-based donor
matching engine.

## Key Flows

**Donor Journey**
- Register with email/mobile OTP verification
- Complete profile: blood group, last donation date, availability,
  preferred location, emergency preference
- Live dashboard: eligibility countdown, donation history, nearby requests
- Get emergency alerts with distance + estimated travel time
- Accept → start journey → arrive → donate under hospital supervision
- Earn the Redora Life Saver Certificate; donation added to history

**Recipient Journey**
- Register with OTP → create emergency request (blood group, units,
  hospital, location, urgency)
- Request verified by hospital/admin before activation
- AI searches eligible donors 5km → 50km → blood banks
- Track full lifecycle live: created → donors notified → accepted →
  on the way → arrived → completed → fulfilled
- Give feedback on response speed, platform experience, request handling

**AI Matching Engine**
- Scores donors on compatibility, availability, eligibility, distance,
  and estimated travel time
- Auto-selects the most suitable/fastest donor when multiple accept;
  other donors are notified gracefully

## Tech Stack
- **Frontend:** React, React Router, Axios
- **Backend:** Node.js, Express, JWT
- **Database:** MongoDB (Mongoose)

## Structure
backend/    Express API, models, routes, controllers
frontend/   React app

## Setup
Backend :

cd backend && npm install && npm run dev

Frontend :

cd frontend && npm install && npm start

## Environment Variables (backend/.env)
PORT=5000
MONGO_URI=your_mongodb_connection_string

JWT_SECRET=your_secret
