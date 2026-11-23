# Bingussi

Bingussi is a multiplayer bingo app built with Next.js, Convex, and Clerk. Create a room, invite your people, and compete to complete the first line of the round.

## Features

- Create 3×3, 4×4, or 5×5 rooms with a custom item pool and an optional free center on odd-sized grids.
- Choose a shared daily, weekly, or monthly reset time and time zone when creating a room.
- Invite players with a link or six-character code.
- Play with optimistic tile updates, live member progress, and a winner announcement with confetti.
- Keep marking tiles after a winner is crowned; the first winner remains unchanged for the round.

## Getting started

### Prerequisites

- Node.js 24 LTS and npm
- A [Clerk](https://clerk.com/) application
- A [Convex](https://www.convex.dev/) account and development deployment

### Local setup

1. Install dependencies:

   ```sh
   npm install
   ```

2. Add your Clerk keys to `.env.local`:

   ```dotenv
   NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=your_publishable_key
   CLERK_SECRET_KEY=your_secret_key
   ```

3. Configure a Clerk JWT template named `convex` and copy its issuer URL. See the [Convex Clerk guide](https://docs.convex.dev/auth/clerk).
4. Run `npx convex dev` and follow the prompts to configure a development deployment. The CLI writes the Convex deployment configuration and `NEXT_PUBLIC_CONVEX_URL` to `.env.local`. The initial sync may fail until the issuer is configured in the next step. Once setup is complete, stop the command with Ctrl+C if it is still running.
5. Set the issuer URL on the Convex development deployment:

   ```sh
   npx convex env set CLERK_JWT_ISSUER_DOMAIN "your_clerk_issuer_url"
   ```

6. Start the app and Convex development sync:

   ```sh
   npm run dev
   ```

Open the local URL printed by Next.js and sign in. The development command syncs Convex functions and the schema before starting the app.

## Playing

1. Open **Create room** or visit `/rooms/new`. Add at least 9, 16, or 25 items for the chosen grid size. Text left in either item input is included when you create the room.
2. Choose the reset frequency, time, and time zone. Weekly rooms also select a weekday; monthly rooms select a day of the month. The schedule is set at creation and applies to everyone in the room.
3. Share the invite link or code from the room. Players can use the dashboard's **Join via code** form or open `/join/[inviteCode]`; signing in is required.
4. Mark squares on `/rooms/[roomId]`. A full row, column, or diagonal is bingo. The room shows member progress without revealing other players' card layouts.

Each round has a new card, and the first player to get bingo is its winner. The room displays the next reset and countdown. For monthly resets on a day missing from a shorter month, the reset occurs on that month's last day. During daylight-saving transitions, skipped local times move forward by the gap and repeated times use the first occurrence.

The landing-page card is a local preview. Older rooms without a reset schedule keep the daily midnight UTC reset. Rooms created before item pools and invites were added remain visible but need their missing configuration migrated before they can be played or invited to.

## Development

```sh
npm run typecheck  # TypeScript
npm run lint       # ESLint
npm test           # Vitest and convex-test
npm run build      # Typecheck and production build
```

The main app routes live in `app/`, UI components in `components/`, and Convex tables and functions in `convex/`. Shared reset scheduling logic lives in `lib/reset-schedule.ts`.

Convex reads for cards and room state use a `dateKey` in `YYYY-MM-DD` format, representing the local date on which the round began. Clients can use `rooms.getRoomSchedule` and `getRoundWindow` to calculate the current key and next reset. Mutations use the server clock and accept an expected date key to guard against stale-round edits.

User profiles are synchronized from available Clerk JWT claims when users create or join rooms or generate a card. Include name, picture, and email in the JWT template if those profile details are needed.
