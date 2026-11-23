"use client";

import { useConvexAuth, usePaginatedQuery } from "convex/react";
import { CalendarDays, Grid2X2, Plus, Trophy } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { api } from "@/convex/_generated/api";
import { Button, buttonVariants } from "@/components/ui/button";

function useTodayUtc() {
  const [today, setToday] = useState<string | null>(null);
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    function update() {
      const now = new Date();
      setToday(now.toISOString().slice(0, 10));
      const nextDay = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1);
      timer = setTimeout(update, nextDay - now.getTime() + 50);
    }
    update();
    return () => clearTimeout(timer);
  }, []);
  return today;
}

export function RoomGrid() {
  const { isAuthenticated, isLoading } = useConvexAuth();
  const { results, status, loadMore } = usePaginatedQuery(api.rooms.listMine, isAuthenticated ? {} : "skip", { initialNumItems: 24 });
  const today = useTodayUtc();

  if (isLoading || (isAuthenticated && status === "LoadingFirstPage") || !today) {
    return <p role="status" className="mt-8 text-sm text-zinc-500">Loading your rooms...</p>;
  }
  if (!isAuthenticated) {
    return <p role="alert" className="mt-8 text-sm text-zinc-400">Your session could not be connected to BingoSync. Please sign out and sign in again.</p>;
  }
  if (results.length === 0) {
    return (
      <div className="mt-8 flex flex-col items-center rounded-2xl border border-dashed border-zinc-800 bg-zinc-900/40 px-6 py-20 text-center">
        <div className="flex size-14 items-center justify-center rounded-2xl border border-zinc-700 bg-zinc-800 text-emerald-400"><Grid2X2 className="size-6" /></div>
        <h3 className="mt-6 text-lg font-semibold text-zinc-100">Your first room is waiting</h3>
        <p className="mt-2 max-w-sm text-sm leading-6 text-zinc-500">Create a space for your people and get your daily game started.</p>
        <Link href="/dashboard/create" className={buttonVariants({ className: "mt-6 h-10 px-4" })}><Plus className="size-4" /> Create a room</Link>
      </div>
    );
  }

  return (
    <>
      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {results.map((room) => {
          const crowned = room.winnerDate === today;
          const isToday = room.activeRoundDate === today;
          return (
            <article key={room.id} className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-5 transition-colors hover:border-zinc-700">
              <div className="flex items-start justify-between gap-3">
                <span className="flex size-11 items-center justify-center rounded-xl border border-emerald-400/15 bg-emerald-400/10 text-emerald-400"><Grid2X2 className="size-5" /></span>
                <span className="rounded-full border border-zinc-700 bg-zinc-800/70 px-2.5 py-1 text-xs font-medium text-zinc-400">{room.gridSize} × {room.gridSize}</span>
              </div>
              <h3 className="mt-6 break-words text-lg font-semibold tracking-tight text-zinc-100">{room.name}</h3>
              <div className="mt-5 space-y-3 border-t border-zinc-800 pt-4 text-sm">
                <div className="flex items-center gap-2 text-zinc-400"><CalendarDays className="size-4 text-zinc-500" /> Round: {room.activeRoundDate} UTC{!isToday && <span className="text-xs text-zinc-500">(previous)</span>}</div>
                <div className={`flex items-center gap-2 ${crowned ? "text-amber-400" : "text-zinc-500"}`}><Trophy className="size-4" /> {crowned ? "Today's winner crowned" : "No winner crowned today"}</div>
              </div>
            </article>
          );
        })}
      </div>
      {(status === "CanLoadMore" || status === "LoadingMore") && <Button variant="outline" className="mt-8" disabled={status === "LoadingMore"} onClick={() => loadMore(24)}>{status === "LoadingMore" ? "Loading..." : "Load more"}</Button>}
    </>
  );
}
