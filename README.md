# Sina Learn API (Backend)

The standalone NestJS backend API powering **Sina Learn** LMS.

## Tech Stack
- **Framework**: NestJS 11
- **Database**: PostgreSQL (via Prisma ORM 5)
- **Compiler**: SWC (20x faster compilation)
- **Validation**: Class-Validator + Zod

---

## Getting Started

### 1. Install Dependencies
```bash
pnpm install
```

### 2. Configure Environment Variables
Copy `.env.example` to `.env` and adjust the variables (especially the `DATABASE_URL` port if using local PostgreSQL instead of the Docker Compose instance):
```bash
cp .env.example .env
```

### 3. Spin up PostgreSQL Container
Run the pre-configured Postgres container using Docker Compose:
```bash
docker compose up -d
```

### 4. Push Database Schema & Seed Data
Initialize your database with tables and populate the default roles, default course catalog, quizzes, and learner accounts:
```bash
# Push prisma schema
pnpm db:push

# Run seed scripts
pnpm db:seed
```

### 5. Run the Server
Start the development server with SWC hot-reloads (running on port `4000` by default):
```bash
pnpm dev
```

---

## Core Commands

| Command | Action |
| :--- | :--- |
| `pnpm dev` | Starts NestJS API in watch mode (`http://localhost:4000/api/v1`) |
| `pnpm build` | Compiles the project using SWC to `/dist` |
| `pnpm test` | Runs the Jest unit and integration test suite |
| `pnpm db:push` | Pushes Prisma schema modifications directly to the database |
| `pnpm db:seed` | Seeds the database (runs `/prisma/seed.ts` via tsx) |

---

## Deployment (Render / Heroku)
When deploying the standalone backend to a hosting service like Render:
- **Build Command**: `pnpm install && pnpm build`
- **Start Command**: `node dist/src/main.js`
- Set `DATABASE_URL` and `JWT_SECRET` in your environment variables.
