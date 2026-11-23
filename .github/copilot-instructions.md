# Project Context & Coding Standards — BingoSync

## Tech Stack
- **Framework:** Next.js (App Router) with React 19 and strict TypeScript.
- **Backend & Real-Time State:** Convex (`convex/schema.ts`, queries, mutations, optimistic updates).
- **Authentication:** Clerk (`@clerk/nextjs`), synced to a Convex `users` table.
- **Styling & UI:** Tailwind CSS v4, Shadcn UI (`@/components/ui/*`), Lucide React icons, and `canvas-confetti` for win celebrations.
- **Forms & Validation:** React Hook Form + Zod.

## Architecture & File Conventions
- Keep server/backend logic strictly inside `/convex` with full `v` argument and return validators on all queries and mutations.
- Use Next.js Server Components by default; add `"use client"` only for interactive components, Convex hooks (`useQuery`, `useMutation`), and Clerk client hooks.
- Extract complex game logic (grid generation, Fisher-Yates shuffle, row/column/diagonal Bingo win detection) into pure, unit-testable helper functions in `convex/lib/bingo.ts` or `lib/bingo.ts`.
- Never use `any` in TypeScript. Rely on generated Convex types (`Doc<"rooms">`, `Id<"users">`, `api`) and inferred Zod types.

## UI & Design System Rules
- **Theme:** Modern, dark-mode-first SaaS aesthetic (`bg-zinc-950` base, `bg-zinc-900/70` elevated surfaces, `border-zinc-800` 1px borders, crisp typography).
- **Accents:** Emerald (`emerald-500` / `emerald-400`) for marked cells and active progress; Amber/Gold (`amber-400`) for winning lines and daily champion banners.
- **Responsiveness:** Mobile-first layout. Bingo grids (`grid-cols-3`, `grid-cols-4`, `grid-cols-5`) must maintain square aspect ratios (`aspect-square`) with readable, clamped text on small screens.
- **UX Feedback:** Always implement optimistic updates for tile toggling so cell clicks feel instantaneous, and use Shadcn toast/sonner notifications for actions like copying invite links or joining rooms.

## Date & Time Handling
- Standardize daily card resets using UTC `YYYY-MM-DD` date keys (or explicit timezone-aware keys) so all players in a room share the exact same daily round rollover.