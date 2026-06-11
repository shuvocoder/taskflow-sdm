# TaskFlow — Project & Task Management Tool

A full-stack project/task management web app (mini-Trello) built for a
**Software Development Management** course project.

- **Frontend:** React (Vite)
- **Backend:** Node.js + Express + JWT auth
- **Database:** PostgreSQL
- **Deploy:** Railway (single service — Express serves the built React app)

---

## ✨ Features

- User **Sign Up / Login** (JWT, bcrypt-hashed passwords)
- Create / delete **Projects**
- Create / move / delete **Tasks** with title, description, assignee, priority, due date
- **Kanban board**: To Do → In Progress → Done
- **Dashboard stats**: total, in-progress, done, overdue

---

## 🚀 Deploy to Railway (do this for submission)

You do **not** need to buy any server. Railway has a free trial that is enough.

### Step 1 — Push code to GitHub
1. Create a new GitHub repo (e.g. `taskflow-sdm`).
2. Upload this whole folder (or `git push`).

### Step 2 — Create the Railway project
1. Go to **railway.app** → sign in with GitHub.
2. **New Project → Deploy from GitHub repo** → pick your repo.

### Step 3 — Add a PostgreSQL database
1. In your Railway project, click **+ New → Database → Add PostgreSQL**.
2. Railway automatically creates a `DATABASE_URL` variable. The app reads it
   directly — **tables are created automatically on first run**, no manual SQL.

### Step 4 — Set environment variables
On your **service → Variables**, add:
```
JWT_SECRET = <any long random string>
```
(`DATABASE_URL` is already provided by the Postgres plugin. `PORT` is auto-set by Railway.)

### Step 5 — Deploy
- Railway uses `nixpacks.toml`: it builds the React client, installs the server,
  and starts it. Wait for the build to finish.
- Click the generated URL (e.g. `https://taskflow-sdm.up.railway.app`).
- Sign up → create a project → add tasks. Done. ✅

> **Tip for the demo:** create your account and a sample project *before* class
> so the board already has cards to show.

---

## 💻 Run locally (backup plan)

You need Node.js 20+ and a local PostgreSQL (or just use the Railway DB URL).

```bash
# 1. Backend
cd server
cp ../.env.example .env        # then edit DATABASE_URL + JWT_SECRET
npm install
npm start                      # http://localhost:3000

# 2. Frontend (separate terminal, for development with hot reload)
cd client
npm install
npm run dev                    # http://localhost:5173 (proxies /api to :3000)
```

For a production-style local run, build the client first
(`cd client && npm run build`), then just `cd server && npm start` —
Express serves the built app at `http://localhost:3000`.

---

## 📁 Project structure

```
sdm-project/
├── server/
│   ├── index.js        # Express app + all API routes + serves React build
│   ├── db.js           # Postgres pool + auto-creates tables on startup
│   └── package.json
├── client/
│   ├── src/
│   │   ├── App.jsx     # whole UI: Auth, Dashboard, Kanban Board
│   │   ├── api.js      # fetch helper + token storage
│   │   ├── main.jsx
│   │   └── styles.css
│   ├── vite.config.js
│   └── package.json
├── nixpacks.toml       # Railway build/start config
├── .env.example
└── TaskFlow_Project_Report.docx   # the written report for submission
```

## 🔌 API Endpoints

| Method | Endpoint | Auth | Purpose |
|--------|----------|------|---------|
| POST | `/api/register` | – | Create account |
| POST | `/api/login` | – | Log in |
| GET | `/api/projects` | ✅ | List my projects |
| POST | `/api/projects` | ✅ | Create project |
| DELETE | `/api/projects/:id` | ✅ | Delete project |
| GET | `/api/projects/:id/tasks` | ✅ | List tasks |
| POST | `/api/projects/:id/tasks` | ✅ | Create task |
| PATCH | `/api/tasks/:id` | ✅ | Update/move task |
| DELETE | `/api/tasks/:id` | ✅ | Delete task |
