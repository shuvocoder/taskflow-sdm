import React, { useState, useEffect } from "react";
import { api, getToken, setToken, clearToken } from "./api";

const STATUSES = ["To Do", "In Progress", "Done"];
const PRIORITIES = ["Low", "Medium", "High"];

export default function App() {
  const [user, setUser] = useState(null);
  const [booting, setBooting] = useState(true);

  useEffect(() => {
    // crude "am I logged in" check: if token exists, try loading projects
    if (getToken()) {
      api("/projects")
        .then(() => setUser({ loggedIn: true }))
        .catch(() => clearToken())
        .finally(() => setBooting(false));
    } else {
      setBooting(false);
    }
  }, []);

  if (booting) return <div className="center">Loading…</div>;
  if (!user) return <Auth onAuth={() => setUser({ loggedIn: true })} />;
  return <Dashboard onLogout={() => { clearToken(); setUser(null); }} />;
}

/* ---------------- AUTH ---------------- */
function Auth({ onAuth }) {
  const [mode, setMode] = useState("login");
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit() {
    setErr(""); setLoading(true);
    try {
      const path = mode === "login" ? "/login" : "/register";
      const data = await api(path, { method: "POST", body: form });
      setToken(data.token);
      onAuth();
    } catch (e) {
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-wrap">
      <div className="auth-card">
        <h1 className="logo">TaskFlow</h1>
        <p className="muted">Software Development Management — Project Tracker</p>
        <div className="tabs">
          <button className={mode === "login" ? "tab active" : "tab"} onClick={() => setMode("login")}>Login</button>
          <button className={mode === "register" ? "tab active" : "tab"} onClick={() => setMode("register")}>Sign Up</button>
        </div>
        {mode === "register" && (
          <input className="input" placeholder="Full name"
            value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        )}
        <input className="input" placeholder="Email" type="email"
          value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
        <input className="input" placeholder="Password" type="password"
          value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
        {err && <div className="error">{err}</div>}
        <button className="btn primary full" onClick={submit} disabled={loading}>
          {loading ? "Please wait…" : mode === "login" ? "Login" : "Create account"}
        </button>
      </div>
    </div>
  );
}

/* ---------------- DASHBOARD ---------------- */
function Dashboard({ onLogout }) {
  const [projects, setProjects] = useState([]);
  const [active, setActive] = useState(null);
  const [newName, setNewName] = useState("");

  async function load() {
    const data = await api("/projects");
    setProjects(data);
    if (data.length && !active) setActive(data[0]);
    if (!data.length) setActive(null);
  }
  useEffect(() => { load(); }, []);

  async function addProject() {
    if (!newName.trim()) return;
    const p = await api("/projects", { method: "POST", body: { name: newName } });
    setNewName("");
    setActive(p);
    load();
  }

  async function deleteProject(id) {
    if (!confirm("Delete this project and all its tasks?")) return;
    await api(`/projects/${id}`, { method: "DELETE" });
    setActive(null);
    load();
  }

  return (
    <div className="app">
      <aside className="sidebar">
        <h2 className="logo small">TaskFlow</h2>
        <div className="new-project">
          <input className="input" placeholder="New project…" value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addProject()} />
          <button className="btn primary" onClick={addProject}>+</button>
        </div>
        <div className="project-list">
          {projects.map((p) => (
            <div key={p.id}
              className={active?.id === p.id ? "project-item active" : "project-item"}
              onClick={() => setActive(p)}>
              {p.name}
            </div>
          ))}
          {!projects.length && <p className="muted small">No projects yet.</p>}
        </div>
        <button className="btn ghost full" onClick={onLogout}>Logout</button>
      </aside>

      <main className="main">
        {active ? (
          <Board project={active} onDeleteProject={deleteProject} />
        ) : (
          <div className="center muted">Create a project to get started.</div>
        )}
      </main>
    </div>
  );
}

/* ---------------- BOARD ---------------- */
function Board({ project, onDeleteProject }) {
  const [tasks, setTasks] = useState([]);
  const [showForm, setShowForm] = useState(false);

  async function load() {
    const data = await api(`/projects/${project.id}/tasks`);
    setTasks(data);
  }
  useEffect(() => { load(); }, [project.id]);

  async function moveTask(task, status) {
    await api(`/tasks/${task.id}`, { method: "PATCH", body: { status } });
    load();
  }
  async function deleteTask(id) {
    await api(`/tasks/${id}`, { method: "DELETE" });
    load();
  }

  const stats = {
    total: tasks.length,
    done: tasks.filter((t) => t.status === "Done").length,
    progress: tasks.filter((t) => t.status === "In Progress").length,
    overdue: tasks.filter((t) => t.due_date && new Date(t.due_date) < new Date() && t.status !== "Done").length,
  };

  return (
    <div>
      <div className="board-header">
        <div>
          <h1>{project.name}</h1>
          {project.description && <p className="muted">{project.description}</p>}
        </div>
        <div className="header-actions">
          <button className="btn primary" onClick={() => setShowForm(true)}>+ Add Task</button>
          <button className="btn danger ghost" onClick={() => onDeleteProject(project.id)}>Delete Project</button>
        </div>
      </div>

      <div className="stats">
        <Stat label="Total" value={stats.total} />
        <Stat label="In Progress" value={stats.progress} />
        <Stat label="Done" value={stats.done} />
        <Stat label="Overdue" value={stats.overdue} danger={stats.overdue > 0} />
      </div>

      <div className="columns">
        {STATUSES.map((status) => (
          <div key={status} className="column">
            <h3 className="col-title">{status} <span className="count">{tasks.filter(t => t.status === status).length}</span></h3>
            {tasks.filter((t) => t.status === status).map((t) => (
              <TaskCard key={t.id} task={t} onMove={moveTask} onDelete={deleteTask} />
            ))}
          </div>
        ))}
      </div>

      {showForm && (
        <TaskForm projectId={project.id} onClose={() => setShowForm(false)} onSaved={() => { setShowForm(false); load(); }} />
      )}
    </div>
  );
}

function Stat({ label, value, danger }) {
  return (
    <div className={danger ? "stat danger" : "stat"}>
      <div className="stat-value">{value}</div>
      <div className="stat-label">{label}</div>
    </div>
  );
}

function TaskCard({ task, onMove, onDelete }) {
  const next = { "To Do": "In Progress", "In Progress": "Done", "Done": "To Do" };
  return (
    <div className="card">
      <div className="card-top">
        <span className={`badge ${task.priority?.toLowerCase()}`}>{task.priority}</span>
        <button className="x" onClick={() => onDelete(task.id)}>×</button>
      </div>
      <div className="card-title">{task.title}</div>
      {task.description && <div className="card-desc">{task.description}</div>}
      <div className="card-meta">
        {task.assignee && <span>👤 {task.assignee}</span>}
        {task.due_date && <span>📅 {new Date(task.due_date).toLocaleDateString()}</span>}
      </div>
      <button className="btn tiny" onClick={() => onMove(task, next[task.status])}>
        Move → {next[task.status]}
      </button>
    </div>
  );
}

function TaskForm({ projectId, onClose, onSaved }) {
  const [f, setF] = useState({ title: "", description: "", assignee: "", priority: "Medium", due_date: "" });
  async function save() {
    if (!f.title.trim()) return;
    await api(`/projects/${projectId}/tasks`, { method: "POST", body: f });
    onSaved();
  }
  return (
    <div className="modal-bg" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h3>New Task</h3>
        <input className="input" placeholder="Title *" value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} />
        <textarea className="input" placeholder="Description" value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} />
        <input className="input" placeholder="Assignee" value={f.assignee} onChange={(e) => setF({ ...f, assignee: e.target.value })} />
        <select className="input" value={f.priority} onChange={(e) => setF({ ...f, priority: e.target.value })}>
          {PRIORITIES.map((p) => <option key={p}>{p}</option>)}
        </select>
        <input className="input" type="date" value={f.due_date} onChange={(e) => setF({ ...f, due_date: e.target.value })} />
        <div className="modal-actions">
          <button className="btn ghost" onClick={onClose}>Cancel</button>
          <button className="btn primary" onClick={save}>Save Task</button>
        </div>
      </div>
    </div>
  );
}
