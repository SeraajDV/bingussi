# BingoSync

A dark-mode-first starting point for daily multiplayer bingo, built with Next.js, Clerk, and Convex.

## Setup

1. Install dependencies with `npm install`.
2. Configure `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`, and `NEXT_PUBLIC_CONVEX_URL` in `.env.local`.
3. Configure the Clerk JWT template named `convex` and set `CLERK_JWT_ISSUER_DOMAIN` in the Convex deployment. See the [Convex Clerk guide](https://docs.convex.dev/auth/clerk).
4. Run `npm run dev`. The Convex development command syncs the schema and functions before starting Next.js.

Signed-in users can create rooms and see rooms associated with their authenticated identity on the dashboard. Room creation records the initial round date in UTC. The dashboard identifies an older round as previous and only reports a winner when the stored winner date matches the current UTC day.

This foundation does not yet include invitations, playable cards, automatic daily round creation, or winner selection. The interactive card on the landing page is a local preview only.

Run `npm run typecheck` and `npm run lint` to check the project.
