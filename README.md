# PM Tool — Full-Stack Project Management App

A modern project management application inspired by Wrike. Built with Next.js 16 App Router, Supabase, Zustand, Tailwind CSS v4, and shadcn/ui primitives.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 16 (App Router) + React 19 + TypeScript |
| Styling | Tailwind CSS v4 + shadcn/ui |
| State | Zustand |
| Icons | Lucide React |
| Drag & Drop | @dnd-kit/core + @dnd-kit/sortable |
| Backend | Next.js Route Handlers |
| Auth + Database | Supabase Auth + Postgres |

---

## Features

- **Table View** — spreadsheet-like with hierarchical tasks (Space → Folder → Project → Task → Subtask), sortable columns, status dropdowns, assignee avatars, date fields, priority, cost, effort
- **Board View** — Kanban columns by status with drag-and-drop card reordering
- **Workload View** — weekly capacity grid showing each team member's daily load (%), overloaded days in red, expandable task bars
- **Task Detail Panel** — slide-over panel with editable title, status, assignee, dates, priority, effort, cost, description, subtask list, comment input
- **Global Search** — ⌘K command palette searching all tasks across all spaces
- **Left Sidebar** — collapsible, dark-themed, hierarchical space/folder/project navigation, notification badge
- **Filters** — status multi-select + assignee filter + text search
- **Optimistic UI** — task status and field updates reflect instantly, then sync in background
- **Gantt / Dashboard** — stubbed with "Coming soon" placeholder

---

## Setup

### Prerequisites

- Node.js 18+
- npm

### Install & Run

```bash
# 1. Install dependencies
npm install

# 2. Copy env values
cp .env.example .env.local

# 3. Create the Supabase tables
# Run supabase/schema.sql once in the Supabase SQL Editor

# 4. Seed demo users + workspace data
npm run db:seed

# 5. Start the development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Required Environment Variables

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
```

`SUPABASE_SERVICE_ROLE_KEY` is server-only. Never expose it in the browser.

### Supabase Setup

1. Create a Supabase project.
2. Open the SQL Editor and run [supabase/schema.sql](supabase/schema.sql).
3. Add the three environment variables above to `.env.local` and Vercel.
4. Run `npm run db:seed` once to create the demo users and workspace data.

Demo logins created by the seed:

- `juliamariatischler@gmail.com / Julia1234!`
- `office@am-sonnenhof.at / Rafaela1234!` (`Rafaela Kamper`)
- `amy@example.com / Amy1234!`

### Available Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Production build |
| `npm run start` | Start production server |
| `npm run db:seed` | Seed Supabase auth users and workspace data |

---

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/spaces` | All spaces with full hierarchy |
| POST | `/api/spaces` | Create space |
| PATCH | `/api/spaces/:id` | Update space |
| DELETE | `/api/spaces/:id` | Delete space (cascades) |
| POST | `/api/folders` | Create folder |
| PATCH | `/api/folders/:id` | Update folder |
| DELETE | `/api/folders/:id` | Delete folder |
| POST | `/api/projects` | Create project |
| PATCH | `/api/projects/:id` | Update project |
| DELETE | `/api/projects/:id` | Delete project |
| GET | `/api/tasks/:id` | Get single task with subtasks |
| POST | `/api/tasks` | Create task |
| PATCH | `/api/tasks/:id` | Update task (status, dates, assignee, etc.) |
| DELETE | `/api/tasks/:id` | Delete task |
| GET | `/api/users` | All users |
| POST | `/api/users` | Create user |

---

## Project Structure

```
src/
├── app/
│   ├── api/               # REST API routes
│   │   ├── spaces/
│   │   ├── folders/
│   │   ├── projects/
│   │   ├── tasks/
│   │   └── users/
│   ├── layout.tsx
│   ├── page.tsx
│   └── globals.css
├── components/
│   ├── AppShell.tsx       # Root client component (data loader)
│   ├── sidebar/
│   ├── toolbar/
│   ├── table/             # Table View
│   ├── board/             # Kanban View
│   ├── workload/          # Workload View
│   ├── task-detail/       # Task Detail Panel
│   └── ui/                # Shared primitives
├── store/
│   └── useAppStore.ts     # Zustand global store
├── services/
│   ├── platform/          # Runtime detection (web / iOS / Android)
│   └── health/            # Platform-specific health integrations
├── lib/
│   ├── data.ts            # Supabase-backed data layer
│   ├── auth.ts            # Supabase session helpers
│   └── utils.ts           # cn(), STATUS_CONFIG, formatDate, etc.
└── types/
    └── index.ts           # TypeScript interfaces

supabase/
└── schema.sql             # Run once in Supabase SQL editor

scripts/
└── seed-supabase.mjs      # Seeds auth users and workspace data
```

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `⌘K` | Open global search |
| `Escape` | Close search / detail panel |
# PM-TOOL
