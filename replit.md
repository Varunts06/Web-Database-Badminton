# Workspace

## Overview

pnpm workspace monorepo using TypeScript. Each package manages its own dependencies.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)

## Structure

```text
artifacts-monorepo/
├── artifacts/              # Deployable applications
│   ├── api-server/         # Express API server
│   └── smashtrack/         # SmashTrack React + Vite frontend
├── lib/                    # Shared libraries
│   ├── api-spec/           # OpenAPI spec + Orval codegen config
│   ├── api-client-react/   # Generated React Query hooks
│   ├── api-zod/            # Generated Zod schemas from OpenAPI
│   └── db/                 # Drizzle ORM schema + DB connection
├── scripts/                # Utility scripts (single workspace package)
│   └── src/                # Individual .ts scripts, run via `pnpm --filter @workspace/scripts run <script>`
├── pnpm-workspace.yaml     # pnpm workspace (artifacts/*, lib/*, lib/integrations/*, scripts)
├── tsconfig.base.json      # Shared TS options (composite, bundler resolution, es2022)
├── tsconfig.json           # Root TS project references
└── package.json            # Root package with hoisted devDeps
```

## SmashTrack App

**SmashTrack** is a Badminton Match Tracker for a fixed friend group.

### Players
- 5 fixed members: Varun, Neeraj, Vivaan, Bhaskar, Lakshy
- 1 optional guest player per session (entered on game day)

### Features
1. **Dashboard** — View all player balances, add guest players, manual deposits
2. **Sessions/Matches** — Create game sessions, add doubles matches (pick teams), record winner, auto-settle bets
3. **Court Booking** — Record who paid the 200rs court fee, auto-deduct 50rs from each of the other 3 players
4. **History** — Full transaction log

### Bet Rules
- Match bet: 20rs total per match (each loser pays 10rs to each winner)
- Court fee: 200rs split 4 ways (50rs each); payer gets reimbursed 150rs from other 3

### DB Schema
- `players` — player info + balance
- `sessions` — game day sessions (date + optional guest name)
- `matches` — doubles matches within sessions
- `bets` — all financial transactions (match bets + court booking debts)
- `court_bookings` — court booking records

## TypeScript & Composite Projects

Every package extends `tsconfig.base.json` which sets `composite: true`. The root `tsconfig.json` lists all packages as project references. This means:

- **Always typecheck from the root** — run `pnpm run typecheck` (which runs `tsc --build --emitDeclarationOnly`). This builds the full dependency graph so that cross-package imports resolve correctly. Running `tsc` inside a single package will fail if its dependencies haven't been built yet.
- **`emitDeclarationOnly`** — we only emit `.d.ts` files during typecheck; actual JS bundling is handled by esbuild/tsx/vite...etc, not `tsc`.
- **Project references** — when package A depends on package B, A's `tsconfig.json` must list B in its `references` array. `tsc --build` uses this to determine build order and skip up-to-date packages.

## Root Scripts

- `pnpm run build` — runs `typecheck` first, then recursively runs `build` in all packages that define it
- `pnpm run typecheck` — runs `tsc --build --emitDeclarationOnly` using project references

## Packages

### `artifacts/api-server` (`@workspace/api-server`)

Express 5 API server. Routes live in `src/routes/` and use `@workspace/api-zod` for request and response validation and `@workspace/db` for persistence.

- Entry: `src/index.ts` — reads `PORT`, starts Express
- App setup: `src/app.ts` — mounts CORS, JSON/urlencoded parsing, routes at `/api`
- Routes: `src/routes/index.ts`, `health.ts`, `players.ts`, `sessions.ts`, `matches.ts`, `bets.ts`, `court_bookings.ts`
- Depends on: `@workspace/db`, `@workspace/api-zod`

### `artifacts/smashtrack` (`@workspace/smashtrack`)

React + Vite frontend for SmashTrack. Uses React Query for data fetching.

- Pages: Dashboard, Sessions, SessionDetail, CourtBookings, History
- Components: Layout (sidebar + mobile bottom nav), Modal
- Styling: Tailwind CSS with dark sports theme (green primary)

### `lib/db` (`@workspace/db`)

Database layer using Drizzle ORM with PostgreSQL.

- Schema: `players`, `sessions`, `matches`, `bets`, `court_bookings`
- Dev: `pnpm --filter @workspace/db run push`
