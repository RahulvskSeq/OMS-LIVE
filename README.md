# Stencil OMS — Order Management System

A **MERN** app (MongoDB · Express · React · Node):

- **Backend** — Express + MongoDB REST API (`Backend/`)
- **Frontend** — a **React + Vite** client (`Frontend/`). The app UI lives in the
  self-contained `Frontend/index.html`; React is wired in through Vite
  (`Frontend/src/main.jsx` → `App.jsx`) as the build/runtime shell, so the whole
  thing builds and runs as a real React app while the existing screens and logic
  stay exactly as they are. Screens can be migrated into `src/` components over time.

Two ways to run the frontend:

- **One-process (simplest):** the **backend also serves `index.html`**, so
  everything runs from one process on **http://localhost:5000** (no build step).
- **React/Vite dev + build:** run the Vite dev server for hot-reload, and
  `npm run build` to produce a deployable `dist/` (see below).

---

## Project structure

```
OMS/
├── package.json          # root convenience scripts (setup / dev / seed)
├── README.md
├── .gitignore
├── Backend/              # Express + MongoDB API (serves the frontend too)
│   ├── server.js
│   ├── config/db.js
│   ├── controllers/
│   ├── models/
│   ├── routes/
│   ├── middleware/
│   ├── utils/seed.js     # creates default roles + superadmin
│   ├── .env              # your secrets (gitignored) — create from .env.example
│   └── .env.example
└── Frontend/            # React + Vite client
    ├── index.html        # app markup + head + the Vite entry (~1.8k lines)
    ├── legacy/           # the app's extracted CSS + JS (classic scripts)
    │   ├── styles.css    #   was the inline <style>
    │   └── app1..4.js    #   was the inline <script> (global-scope, load-ordered)
    ├── config.js         # runtime API base (no build needed to change it)
    ├── vite.config.js
    ├── package.json      # dev / build / preview scripts
    └── src/
        ├── main.jsx      # React entry — mounts the shell (out-of-flow, no UI change)
        ├── App.jsx       # React shell (migration seam for future components)
        └── pages/, components/, store/, api/   # scaffold for the React migration
```

---

## Run the React frontend (Vite)

```bash
cd Frontend
npm install
npm run dev       # Vite dev server (hot reload) → http://localhost:5002
npm run build     # production build → Frontend/dist (config.js copied in)
npm run preview   # serve the built dist locally
```

The app resolves its backend at runtime from `Frontend/config.js`
(`window.__APP_CONFIG__.API_URL`), so the same build works across environments —
no rebuild needed to repoint it.

---

## Prerequisites

- **Node.js 18+** (you have v24)
- A **MongoDB** connection string — either your MongoDB Atlas cluster, or a local
  MongoDB.

---

## Setup

### 1. Configure the database

Edit `Backend/.env` and set `MONGODB_URI` to your MongoDB Atlas connection string:

```
MONGODB_URI=mongodb+srv://USER:PASSWORD@cluster0.xxxxx.mongodb.net/stencil-oms?retryWrites=true&w=majority
```

(`Backend/.env` already has a generated `JWT_SECRET`. If the file doesn't exist,
copy it from `Backend/.env.example`.)

> Prefer a fully-local DB instead of Atlas? Run MongoDB in Docker and use a local URI:
>
> ```powershell
> docker run -d --name oms-mongo -p 27017:27017 mongo:7
> ```
>
> then set `MONGODB_URI=mongodb://127.0.0.1:27017/stencil-oms`.

### 2. Install backend dependencies

```powershell
npm run setup
```

### 3. (First time only) Seed default roles + admin user

Only needed for a **fresh/empty** database. Skip this if you connected to your
existing Atlas data.

```powershell
npm run seed
```

This creates a superadmin — **username: `admin`, password: `admin123`**.

---

## Run locally

```powershell
npm run dev
```

Then open **http://localhost:5000**.

- `npm run dev`   — start with auto-reload (nodemon)
- `npm start`     — start without auto-reload
- API health check: http://localhost:5000/api/health

---

## How the frontend finds the backend

`Frontend/index.html` resolves its API base at runtime (`window.__API__`):

- On `localhost` / `127.0.0.1` → uses the **same origin** (the local backend).
- Anywhere else → uses the deployed backend URL.

So the same file works both locally and in production with no edits.
