# Mobile setup

This repository now includes the baseline files for a one-repo web + mobile setup:

```text
.
├── src/                  # shared app code
├── ios/                  # Capacitor iOS shell
├── android/              # Capacitor Android shell
└── capacitor.config.ts
```

## Workflow

Install dependencies, then generate or sync native shells:

```bash
npm install
npx cap add ios
npx cap add android
npx cap sync
```

Target a single platform when needed:

```bash
npx cap sync ios
npx cap sync android
```

## Important constraint

The current app is a Next.js 16 App Router project with API routes and Prisma-backed SQLite access. That means a classic static Capacitor bundle is not production-ready yet.

You currently have two realistic paths:

- keep Next.js + Prisma hosted and load the app in Capacitor through a remote/server-backed flow
- extract the mobile data layer away from Next.js server routes before relying on `webDir: "out"`

## Platform-specific code

Use `src/services/platform/` for runtime detection and `src/services/health/` for mobile plugin integration. Keep platform branching there instead of spreading `Capacitor.getPlatform()` checks across pages and components.
