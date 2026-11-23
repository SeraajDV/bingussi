# Bingussi

A dark-mode-first app for multiplayer bingo, built with Next.js, Clerk, and Convex.

## Setup

1. Install dependencies with `npm install`.
2. Configure `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`, and `NEXT_PUBLIC_CONVEX_URL` in `.env.local`.
3. Configure the Clerk JWT template named `convex` and set `CLERK_JWT_ISSUER_DOMAIN` in the Convex deployment. See the [Convex Clerk guide](https://docs.convex.dev/auth/clerk).
4. Run `npm run dev`. The Convex development command syncs the schema and functions before starting Next.js.

Signed-in users can create rooms with an item pool and a shared daily, weekly, or monthly reset schedule, and see their rooms on the dashboard. The first player to complete a line wins that round. The free center is automatically marked and cannot be toggled.

For reactive reads, `rooms.getDailyCard` and `rooms.getRoomState` take a `dateKey` representing the local calendar date on which the current round began (`YYYY-MM-DD`). Use `rooms.getRoomSchedule` and `getRoundWindow` to calculate the key and next reset; mutations determine the current round from the server clock. Call `rooms.getOrGenerateDailyCard` before toggling cells. User profiles are synchronized from available Clerk JWT claims when users create or join rooms or generate a card; configure the JWT template to include name, picture, and email if those details are needed.

Create rooms at `/rooms/new`, choose a reset time and time zone, add individual items or bulk-paste a list, and share the invite link or code from the room page. The creator sets the schedule at creation; existing rooms without a schedule retain the daily midnight UTC reset. Weekly schedules reset on the chosen weekday. Monthly schedules reset on the chosen day, or the last day in shorter months. During daylight-saving transitions, skipped local times move forward by the gap and repeated times use the first occurrence.

Text still in the individual or bulk input counts toward the minimum and is included when you create the room. Signed-in users can join from the dashboard or an invite link; sign-in is required before joining. The room page generates the current card and displays live player progress and the first winner. Tile marks update optimistically; players can continue marking after a winner is crowned. The interactive card on the landing page is a local preview only.

Existing rooms created before item pools and invites were introduced remain visible on the dashboard but cannot be played or invited to until their missing configuration is migrated. Existing memberships are linked to user profiles when those members generate a card.

Run `npm run typecheck`, `npm run lint`, and `npm test` to check the project.
