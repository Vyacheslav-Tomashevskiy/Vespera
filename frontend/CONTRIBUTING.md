# Frontend Contributor Guide

Welcome to the Vespera frontend! This guide covers the project structure, development
workflow, coding standards, and what we expect in a pull request so your changes pass review
and CI.

## Table of Contents

1. [Project Overview](#project-overview)
2. [Project Structure](#project-structure)
3. [Development Workflow](#development-workflow)
4. [Coding Standards](#coding-standards)
5. [Component Conventions](#component-conventions)
6. [Testing Expectations](#testing-expectations)
7. [Git Workflow & Branch Naming](#git-workflow--branch-naming)
8. [Pull Request Checklist](#pull-request-checklist)

---

## Project Overview

The Vespera frontend is a Next.js 15 application for a rental payments protocol built on the
Stellar blockchain.

### Tech Stack

- **Framework:** Next.js 15 (App Router)
- **UI:** React 19
- **Language:** TypeScript 5 (strict mode)
- **Styling:** Tailwind CSS 3
- **Data fetching:** TanStack Query 5
- **Blockchain:** Stellar SDK (`@stellar/stellar-sdk`) + Freighter wallet (`@stellar/freighter-api`)
- **Package manager:** pnpm

---

## Project Structure

```
frontend/
├── app/                      # Next.js App Router
│   ├── layout.tsx            # Root layout
│   ├── page.tsx              # Landing page
│   ├── providers.tsx         # App-wide providers (TanStack Query, etc.)
│   ├── globals.css           # Global styles
│   ├── dashboard/            # Tenant / landlord dashboard
│   ├── properties/           # Property listing
│   │   └── [id]/             # Property details
│   ├── payments/             # Payment receipts
│   └── api/health/           # Health check endpoint
├── components/
│   ├── layout/               # header.tsx, footer.tsx
│   └── wallet/               # wallet-button.tsx, pay-rent-button.tsx
├── lib/                      # stellar.ts, format.ts, mock.ts
├── next.config.ts
├── tailwind.config.ts
├── tsconfig.json
└── package.json
```

The `@/*` path alias (configured in `tsconfig.json`) maps to the `frontend/` root, so import
with `@/components/...` and `@/lib/...` instead of long relative paths.

---

## Development Workflow

### Setup

```bash
cd frontend
pnpm install
cp .env.example .env.local
pnpm dev
```

The dev server runs at `http://localhost:3000`.

### Daily Commands

```bash
pnpm dev         # Start the dev server (hot reload)
pnpm typecheck   # TypeScript type checking (tsc --noEmit)
pnpm lint        # ESLint (next lint)
pnpm build       # Production build
```

Run `pnpm typecheck`, `pnpm lint`, and `pnpm build` before opening a PR. These are the
checks reviewers expect to pass.

---

## Coding Standards

- **TypeScript strict mode** - `strict` is enabled; avoid `any` and type all props, state,
  and API responses.
- **ESLint** - run `pnpm lint` and resolve every error and warning before committing.
- **Imports** - use the `@/*` path alias instead of deep relative paths.
- **No hardcoded values** - design tokens come from `tailwind.config.ts`; secrets, network
  URLs, and contract IDs come from environment variables (`NEXT_PUBLIC_*` for values used in
  the browser). Never commit `.env.local`.
- **Server vs Client Components** - default to Server Components; add `"use client"` only when
  a component needs state, effects, or browser APIs (e.g. wallet interactions).

---

## Component Conventions

- **Naming** - component files use the existing `kebab-case` convention (e.g.
  `wallet-button.tsx`); the exported component is `PascalCase`. One component per file.
- **Hooks** - custom hooks use the `use` prefix.
- **Structure** - keep presentational components pure; isolate data fetching (TanStack Query)
  and side effects in hooks or container components.
- **Styling** - Tailwind utility classes. Compose conditional classes with `clsx` and
  `tailwind-merge` (already in dependencies). Avoid inline style objects.
- **State** - use TanStack Query for server state; do not duplicate server state into local
  state.
- **Accessibility** - semantic HTML, `aria-*` attributes where needed, and keyboard-navigable
  interactive elements.

---

## Testing Expectations

> A shared frontend test runner is not configured yet. Until one lands, follow these
> expectations so new work ships verifiable:

- **Unit / component tests** - Jest + React Testing Library are the intended tools for
  utilities, hooks, and components with logic. Co-locate tests with the file under test
  (`*.test.tsx`).
- **End-to-end tests** - Cypress is the intended tool for critical user flows (wallet connect,
  rent payment).
- At minimum, manually verify your change in the browser in both the **connected** and
  **disconnected** wallet states, and confirm there are no console errors.
- When you change behavior, add tests if the tooling is present in your branch; otherwise
  describe the manual verification steps in your PR description.

---

## Git Workflow & Branch Naming

```bash
# 1. Create a branch off the default branch (main)
git checkout -b <type>/<short-description>

# 2. Commit using Conventional Commits
git commit -m "feat: add property detail card"

# 3. Run checks
pnpm typecheck && pnpm lint && pnpm build

# 4. Push and open a PR against vespera-labs/Vespera
git push -u origin <type>/<short-description>
```

**Branch prefixes:** `feat/`, `fix/`, `docs/`, `refactor/`, `chore/`, `test/`.

**Commit format:** `<type>: <description>` where `<type>` is one of `feat`, `fix`, `docs`,
`refactor`, `chore`, `test`, `perf`, `ci`.

Reference the issue your work closes in the PR description (e.g. `Closes #123`).

---

## Pull Request Checklist

Before submitting a PR:

- [ ] `pnpm typecheck` passes (no type errors)
- [ ] `pnpm lint` passes (no ESLint errors or warnings)
- [ ] `pnpm build` succeeds
- [ ] No `any` types introduced
- [ ] No hardcoded secrets, network URLs, or contract IDs (use environment variables)
- [ ] Server/Client Component boundaries are correct (`"use client"` only where required)
- [ ] UI verified in the browser (connected and disconnected wallet states)
- [ ] No console errors or warnings
- [ ] Accessible markup (semantic HTML, keyboard navigation)
- [ ] Branch name and commits follow the conventions above
- [ ] PR description links the related issue (e.g. `Closes #123`)

---

## Questions?

- Review existing components and `lib/` for established patterns.
- Check the root `README.md` and `backend/CONTRIBUTING.md` for repo-wide context.
- Open an issue for bugs or proposals.

Happy building! 🚀
