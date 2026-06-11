import express from "express";
import cors from "cors";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import { pool, initDb } from "./db.js";

dotenv.config();
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const JWT_SECRET = process.env.JWT_SECRET || "dev-secret-change-me";

app.use(cors());
app.use(express.json());

// ---------- Auth middleware ----------
function auth(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: "No token" });
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ error: "Invalid token" });
  }
}

// ---------- Auth routes ----------
app.post("/api/register", async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password)
      return res.status(400).json({ error: "All fields required" });
    const hash = await bcrypt.hash(password, 10);
    const result = await pool.query(
      "INSERT INTO users (name,email,password_hash) VALUES ($1,$2,$3) RETURNING id,name,email",
      [name, email, hash]
    );
    const user = result.rows[0];
    const token = jwt.sign({ id: user.id, name: user.name }, JWT_SECRET, {
      expiresIn: "7d",
    });
    res.json({ token, user });
  } catch (e) {
    if (e.code === "23505")
      return res.status(409).json({ error: "Email already registered" });
    res.status(500).json({ error: "Server error" });
  }
});

app.post("/api/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    const result = await pool.query("SELECT * FROM users WHERE email=$1", [
      email,
    ]);
    const user = result.rows[0];
    if (!user) return res.status(401).json({ error: "Invalid credentials" });
    const ok = await bcrypt.compare(password, user.password_hash);
    if (!ok) return res.status(401).json({ error: "Invalid credentials" });
    const token = jwt.sign({ id: user.id, name: user.name }, JWT_SECRET, {
      expiresIn: "7d",
    });
    res.json({ token, user: { id: user.id, name: user.name, email: user.email } });
  } catch {
    res.status(500).json({ error: "Server error" });
  }
});

// ---------- Project routes ----------
app.get("/api/projects", auth, async (req, res) => {
  const result = await pool.query(
    "SELECT * FROM projects WHERE owner_id=$1 ORDER BY created_at DESC",
    [req.user.id]
  );
  res.json(result.rows);
});

app.post("/api/projects", auth, async (req, res) => {
  const { name, description } = req.body;
  const result = await pool.query(
    "INSERT INTO projects (owner_id,name,description) VALUES ($1,$2,$3) RETURNING *",
    [req.user.id, name, description || ""]
  );
  res.json(result.rows[0]);
});

app.delete("/api/projects/:id", auth, async (req, res) => {
  await pool.query("DELETE FROM projects WHERE id=$1 AND owner_id=$2", [
    req.params.id,
    req.user.id,
  ]);
  res.json({ ok: true });
});

// ---------- Task routes ----------
app.get("/api/projects/:id/tasks", auth, async (req, res) => {
  const result = await pool.query(
    "SELECT * FROM tasks WHERE project_id=$1 ORDER BY created_at",
    [req.params.id]
  );
  res.json(result.rows);
});

app.post("/api/projects/:id/tasks", auth, async (req, res) => {
  const { title, description, assignee, priority, due_date } = req.body;
  const result = await pool.query(
    `INSERT INTO tasks (project_id,title,description,assignee,priority,due_date)
     VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
    [req.params.id, title, description || "", assignee || "", priority || "Medium", due_date || null]
  );
  res.json(result.rows[0]);
});

app.patch("/api/tasks/:id", auth, async (req, res) => {
  const { status, title, description, assignee, priority, due_date } = req.body;
  const result = await pool.query(
    `UPDATE tasks SET
       status=COALESCE($1,status),
       title=COALESCE($2,title),
       description=COALESCE($3,description),
       assignee=COALESCE($4,assignee),
       priority=COALESCE($5,priority),
       due_date=COALESCE($6,due_date)
     WHERE id=$7 RETURNING *`,
    [status, title, description, assignee, priority, due_date, req.params.id]
  );
  res.json(result.rows[0]);
});

app.delete("/api/tasks/:id", auth, async (req, res) => {
  await pool.query("DELETE FROM tasks WHERE id=$1", [req.params.id]);
  res.json({ ok: true });
});

// ---------- Serve React build (single deploy) ----------
const clientDist = path.join(__dirname, "../client/dist");
app.use(express.static(clientDist));
app.get("*", (req, res) => {
  res.sendFile(path.join(clientDist, "index.html"));
});

const PORT = process.env.PORT || 3000;
initDb()
  .then(() => app.listen(PORT, () => console.log(`🚀 Server on ${PORT}`)))
  .catch((e) => {
    console.error("DB init failed:", e);
    process.exit(1);
  });
