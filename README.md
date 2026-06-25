# Stencil OMS — Order Management System

A MERN-style app:

- **Backend** — Express + MongoDB REST API (`Backend/`)
- **Frontend** — a single self-contained `index.html` app (`Frontend/index.html`)

In local mode the **backend also serves the frontend**, so everything runs from
one process on **http://localhost:5000**.

> Note: `Frontend/src/` is an older, unfinished React/Vite rewrite that is **not**
> wired up. The live app is `Frontend/index.html`.

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
└── Frontend/
    ├── index.html        # the live app (vanilla JS)
    └── src/              # abandoned React scaffold (kept, not used)
```

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
