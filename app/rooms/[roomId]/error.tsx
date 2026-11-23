"use client";

import Link from "next/link";

export default function RoomError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="mx-auto max-w-lg px-5 py-20 text-center">
      <h1 className="text-2xl font-semibold text-white">Couldn&apos;t load this room</h1>
      <p role="alert" className="mt-3 text-sm text-zinc-400">The room may not exist, you may not be a member, or the connection may have failed.</p>
      <div className="mt-6 flex justify-center gap-5 text-sm font-medium">
        <button type="button" onClick={reset} className="text-emerald-400 hover:text-emerald-300">Try again</button>
        <Link href="/dashboard" className="text-zinc-300 hover:text-white">Back to my rooms</Link>
      </div>
    </main>
  );
}
