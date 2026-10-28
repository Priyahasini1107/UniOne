# UniOne

> **One platform. Everything students need.**

UniOne is an all-in-one student platform built with React.js, Node.js, Express.js, and MySQL.

---

## Project Structure

```
UniOne/
├── client/          # React.js frontend (Vite)
│   ├── src/
│   │   ├── components/    # Sidebar, Topbar, ModuleCard
│   │   ├── pages/         # LandingPage, LoginPage, RegisterPage,
│   │   │                  # StudentDashboard, AdminDashboard
│   │   └── styles/        # global.css, Landing.css, Auth.css,
│   │                      # Dashboard.css, Sidebar.css
│   └── vite.config.js     # Proxies /api/* → localhost:5000
│
└── server/          # Node.js + Express.js backend
    ├── config/
    │   └── db.js          # MySQL connection pool
    ├── routes/
    │   └── health.js      # GET /api/health, GET /api/db-health
    ├── .env.example       # Credential template (no real values)
    └── server.js          # Express entry point
```

---

## Getting Started

### 1. Configure the Backend

```bash
cd server
copy .env.example .env
```

Open `server/.env` and fill in your MySQL credentials:

```
PORT=5000
DB_HOST=localhost
DB_PORT=3306
DB_USER=your_mysql_username
DB_PASSWORD=your_mysql_password
DB_NAME=unione_db
```

### 2. Create the MySQL Database

In your MySQL client or MySQL Workbench, run:

```sql
CREATE DATABASE unione_db;
```

> Tables and schema will be added in Stage 2.

### 3. Start the Backend

```bash
cd server
npm start
```

Or for development with auto-restart on file changes (Node.js v18.11+):

```bash
npm run dev
```

The server starts on **http://localhost:5000**

Verify it works:
- **http://localhost:5000/api/health** — Should return `{ "status": "ok" }`
- **http://localhost:5000/api/db-health** — Should return MySQL connection result

### 4. Start the Frontend

```bash
cd client
npm run dev
```

The React app starts on **http://localhost:5173**

---

## Technology Stack

| Layer     | Technology         |
|-----------|--------------------|
| Frontend  | React.js (Vite)    |
| Backend   | Node.js + Express  |
| Database  | MySQL (mysql2)     |
| Styling   | Vanilla CSS        |

No external fonts, APIs, or third-party services are used.
Environment variables use Node.js v20.6+ native `--env-file` support — no `dotenv` package needed.

---

## Stage 1 — Completed

- [x] Project folder structure (client/ + server/)
- [x] Express server with health check endpoints
- [x] MySQL connection pool (lazy — connects when first queried)
- [x] Environment variable configuration (`.env.example`)
- [x] React frontend with Vite dev server
- [x] Vite `/api` proxy → Express backend (no CORS package needed)
- [x] 5 pages: Landing, Login, Register, Student Dashboard, Admin Dashboard
- [x] Sidebar + Topbar layout components
- [x] 12 module cards with navigation
- [x] Responsive design (desktop, tablet, mobile)

## Stage 2 — Planned

- [ ] MySQL database schema and tables
- [ ] User authentication (register + login with MySQL)
- [ ] JWT or session-based auth
- [ ] Module functionality (Academic Resources, Interview Prep, etc.)
- [ ] REST API endpoints for each module

One platform for academic resources, career preparation, student projects, and campus services.
ef0fa8700fd18e86c03e5eba4fb90095043b0e91
