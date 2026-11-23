# BingoSync

A dark-mode-first starting point for daily multiplayer bingo, built with Next.js, Clerk, and Convex.

## Setup

1. Install dependencies with `npm install`.
2. Configure `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`, and `NEXT_PUBLIC_CONVEX_URL` in `.env.local`.
3. Configure the Clerk JWT template named `convex` and set `CLERK_JWT_ISSUER_DOMAIN` in the Convex deployment. See the [Convex Clerk guide](https://docs.convex.dev/auth/clerk).
4. Run `npm run dev`. The Convex development command syncs the schema and functions before starting Next.js.

Signed-in users can create rooms with an item pool and see their rooms on the dashboard. The Convex room API supports joining with an invite code, generating daily cards, marking cells, and tracking each room's first daily winner. Bingo uses UTC calendar days. The free center is automatically marked and cannot be toggled.

For reactive reads, `rooms.getDailyCard` and `rooms.getRoomState` take a `dateKey` in UTC `YYYY-MM-DD` format. Clients must update it at UTC midnight; mutations use the server's current UTC date. Call `rooms.getOrGenerateDailyCard` to create today's card before toggling cells. User profiles are synchronized from available Clerk JWT claims when users create or join rooms or generate a card; configure the JWT template to include name, picture, and email if those details are needed.

Create rooms at `/rooms/new`, add individual items or bulk-paste a list, and share the invite link or code from the room page. Text still in the individual or bulk input counts toward the minimum and is included when you create the room. Signed-in users can join from the dashboard or an invite link; sign-in is required before joining. The room page generates today's card and displays live player progress and the first winner. Tile marks update optimistically; players can continue marking after a winner is crowned. Cards and the countdown reset at midnight UTC. The interactive card on the landing page is a local preview only.

Existing rooms created before item pools and invites were introduced remain visible on the dashboard but cannot be played or invited to until their missing configuration is migrated. Existing memberships are linked to user profiles when those members generate a card.

Run `npm run typecheck`, `npm run lint`, and `npm test` to check the project.
