# PM Tool — Full-Stack Project Management App

A modern, production-ready project management application inspired by Wrike. Built with Next.js 16 App Router, Prisma 7 (SQLite), Zustand, Tailwind CSS v4, and shadcn/ui primitives.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 16 (App Router) + React 19 + TypeScript |
| Styling | Tailwind CSS v4 + shadcn/ui |
| State | Zustand |
| Icons | Lucide React |
| Drag & Drop | @dnd-kit/core + @dnd-kit/sortable |
| Backend | Next.js API Routes |
| ORM | Prisma 7 (driver adapter model) |
| Database | SQLite via @libsql/client |
| Mobile Shell | Capacitor 8 |

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

### Data Model

- **2 Spaces**: Manufacturing, Creative Development
- **6 Folders** (3 per space)
- **10 Projects**
- **38+ Tasks** with mixed statuses, priorities, dates, and costs
- **3 Users**: Amy W., Julia H., Jason S.

---

## Setup

### Prerequisites

- Node.js 18+
- npm

### Install & Run

```bash
# 1. Install dependencies
npm install

# 2. Run database migration (creates dev.db)
npm run db:migrate

# 3. Seed with realistic demo data
npm run db:seed

# 4. Start the development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Available Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Production build |
| `npm run start` | Start production server |
| `npm run cap:sync` | Sync web assets/plugins to both native shells |
| `npm run cap:sync:ios` | Sync only the iOS shell |
| `npm run cap:sync:android` | Sync only the Android shell |
| `npm run cap:open:ios` | Open the iOS project in Xcode |
| `npm run cap:open:android` | Open the Android project in Android Studio |
| `npm run db:migrate` | Run Prisma migrations |
| `npm run db:seed` | Seed the database |
| `npm run db:reset` | Reset DB and re-seed |

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
android/                    # Capacitor Android project
ios/                        # Capacitor iOS project
capacitor.config.ts         # Capacitor config
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
│   ├── prisma.ts          # Prisma client singleton
│   └── utils.ts           # cn(), STATUS_CONFIG, formatDate, etc.
└── types/
    └── index.ts           # TypeScript interfaces

prisma/
├── schema.prisma
├── seed.ts
└── migrations/
```

## Mobile Notes

This repo now follows a one-repo web + mobile structure with shared app code in `src/` and native shells in `ios/` and `android/`.

Important: the current app uses Next.js API routes plus Prisma-backed SQLite. That means Capacitor cannot yet ship this as a simple static bundle without additional architecture work. See [docs/mobile-setup.md](docs/mobile-setup.md) for the exact constraints and workflow.

---

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `⌘K` | Open global search |
| `Escape` | Close search / detail panel |
# PM-TOOL
