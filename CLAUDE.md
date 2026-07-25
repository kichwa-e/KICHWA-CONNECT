# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project overview

Kichwa Connect is the client web app for a Nairobi (Embakasi) device-repair shop. It's a single-page React app scaffolded via Google AI Studio (see `metadata.json`, `firebase-applet-config.json`, `firebase-blueprint.json` — these are AI Studio/Firebase "applet" artifacts, not hand-rolled config) that lets customers book repairs, track ticket status, and chat with the shop, and lets the shop owner manage tickets from an admin view. There is no custom backend server — the client talks directly to Firebase (Firestore + Auth).

## Commands

- `npm install` — install dependencies
- `npm run dev` — start Vite dev server on port 3000 (`--host=0.0.0.0`)
- `npm run build` — production build (`vite build`)
- `npm run preview` — preview a production build
- `npm run clean` — remove `dist/`
- `npm run lint` — runs `tsc --noEmit`; this is a type-check, not ESLint

There is no test suite configured in this repo (no test runner/script).

ESLint (`eslint.config.js`) is configured only with `@firebase/eslint-plugin-security-rules`, used to lint `firestore.rules`. It isn't wired to an npm script — run it directly if you touch the rules file: `npx eslint firestore.rules`.

## Environment

- `GEMINI_API_KEY` is injected by Vite into `process.env.GEMINI_API_KEY` (see `vite.config.ts`), sourced from `.env.local` locally or from AI Studio secrets in that environment. The `@google/genai` package is a dependency but is not currently wired into any component.
- `vite.config.ts` disables HMR when `DISABLE_HMR=true` (set by the AI Studio environment) — don't "fix" file watching, it's intentionally off there to avoid flicker during agent edits.
- Path alias `@/*` resolves to the repo root (`tsconfig.json` and `vite.config.ts`).

## Architecture

### Routing and pages

`src/main.tsx` mounts `App` from `src/App.tsx`, which owns the `react-router-dom` `<Router>` and all top-level routes (`/`, `/book`, `/track`, `/services`, `/chat`, `/admin`). Most pages (`Dashboard`, `BookRepair`, `TrackRepair`, `Services`) are defined inline in `App.tsx` rather than split into files — when editing a page, look there first. `Chat` (`src/components/Chat.tsx`) and `Admin` (`src/components/Admin.tsx`) are the only pages broken out into their own files.

### Firebase is the entire backend

`src/lib/firebase.ts` initializes the Firebase app from `firebase-applet-config.json` (public client config — the Firestore database is a named, non-default database via `firestoreDatabaseId`) and exports `db`, `auth`, `googleProvider`, and helpers `loginWithGoogle`/`logout`. All data access is direct Firestore reads/writes from components (`onSnapshot`, `getDoc`, `setDoc`, `updateDoc`, `addDoc`) — there is no API layer. Auth is Google sign-in only.

Firestore errors should be routed through `handleFirestoreError(error, operationType, path)` (from `src/lib/firebase.ts`), which logs structured error info (including current auth state) and re-throws. Follow the existing pattern of wrapping writes in try/catch that calls this on failure.

### Data model: keep blueprint, rules, and code in sync

The Firestore schema is defined in two places that must be kept consistent whenever a collection's shape changes:

- `firebase-blueprint.json` — documents the entity schemas (`User`, `Conversation`, `Message`, `Ticket`) and collection paths. This is descriptive/reference, read by AI Studio tooling.
- `firestore.rules` — the actual enforced schema. Rules are strict: `isValid*()` functions check not just field types but **exact key counts** (`data.keys().size() == N`, adjusted for optional fields), so adding a field to a document written by the client requires updating the matching validator function in `firestore.rules` or writes will be rejected.

Collections: `users/{userId}`, `conversations/{conversationId}`, `conversations/{conversationId}/messages/{messageId}`, `tickets/{ticketId}`. Default rule is deny-all; each collection has explicit `get`/`list`/`create`/`update` rules layered on top.

### Admin access is a hardcoded email, in two places

Admin (`src/components/Admin.tsx`) and Firestore rules (`isAdmin()` in `firestore.rules`) both gate on the literal email `kichwarepair@gmail.com`. If the admin identity ever changes, update both — there's no roles/claims system.

### Tickets

Repair tickets use a client-generated ID like `KC-1234A` (`"KC-" + 4 digits + 1 letter`, see `BookRepair` in `App.tsx`) used as both the Firestore doc ID and the `ticketNo` field. Status is one of `created | received | diagnosing | repairing | ready | completed` (duplicated as the `RepairStatus` type in both `App.tsx` and `Admin.tsx`). Anyone can `create`/`get` a ticket (rules), but only the admin can `list` all tickets or `update` one (status, `diagnosisNotes`, `repairCost`).

### Styling

Tailwind v4, configured CSS-first in `src/index.css` via `@theme` (no `tailwind.config.js`). Custom design tokens: `base-bg`, `base-text`, `primary`, `secondary`, `card-light`, `card-dark`, plus `font-sans` (Inter) and `font-serif` (Playfair Display). Use `cn()` from `src/lib/utils.ts` (clsx + tailwind-merge) for conditional class composition, matching existing components. Page transitions and small animations use `motion/react` (Motion for React).
