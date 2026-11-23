"use client";

import { useConvexAuth, useQuery } from "convex/react";
import { ArrowLeft, Copy, Trophy, UsersRound } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { useTodayUtc } from "@/lib/use-today-utc";

export function RoomDetails({ roomId }: { roomId: Id<"rooms"> }) {
  const { isAuthenticated, isLoading } = useConvexAuth();
  const today = useTodayUtc();
  const state = useQuery(api.rooms.getRoomState, isAuthenticated && today ? { roomId, dateKey: today } : "skip");
  const inviteCode = state?.room.inviteCode;

  async function copyInvite(code: string) {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/join/${encodeURIComponent(code)}`);
      toast.success("Invite link copied!");
    } catch {
      toast.error("Could not copy the invite link. Please copy the code instead.");
    }
  }

  return (
    <main className="mx-auto max-w-4xl px-5 pb-24 pt-12 sm:px-8 sm:pt-16">
      <Link href="/dashboard" className="inline-flex items-center gap-2 text-sm text-zinc-400 hover:text-white"><ArrowLeft className="size-4" /> Back to my rooms</Link>
      {isLoading || (isAuthenticated && !state) ? (
        <p role="status" className="mt-8 text-sm text-zinc-400">Loading your room...</p>
      ) : !isAuthenticated ? (
        <p role="alert" className="mt-8 text-sm text-red-400">Your session could not be connected. Please sign out and sign in again.</p>
      ) : state ? (
        <>
          <div className="mt-10 flex flex-wrap items-end justify-between gap-5">
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-emerald-400">Your room</p>
              <h1 className="mt-3 break-words text-4xl font-semibold text-white">{state.room.name}</h1>
              <p className="mt-3 text-sm text-zinc-400">{state.room.gridSize} × {state.room.gridSize} bingo · {today} UTC</p>
            </div>
            {inviteCode && <Button onClick={() => copyInvite(inviteCode)} className="h-10 px-4"><Copy className="size-4" /> Copy invite link</Button>}
          </div>
          <div className="mt-8 grid gap-5 sm:grid-cols-2">
            <section className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-6">
              <h2 className="text-sm font-semibold text-white">Invite your people</h2>
              {state.room.inviteCode ? (
                <><p className="mt-2 text-sm text-zinc-400">Share the link or give them this code:</p><p className="mt-4 font-mono text-2xl font-semibold tracking-[0.2em] text-emerald-400">{state.room.inviteCode}</p></>
              ) : <p className="mt-2 text-sm text-zinc-400">This older room doesn&apos;t have an invite code yet.</p>}
            </section>
            <section className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-6">
              <h2 className="flex items-center gap-2 text-sm font-semibold text-white"><Trophy className="size-4 text-amber-400" /> Today&apos;s round</h2>
              <p className="mt-3 text-sm text-zinc-400">{state.round?.winner ? `${state.round.winner.name} won today’s round!` : "No winner crowned today."}</p>
              <p className="mt-2 text-xs text-zinc-500">Playable cards are coming soon.</p>
            </section>
          </div>
          <section className="mt-5 rounded-2xl border border-zinc-800 bg-zinc-900/70 p-6">
            <h2 className="flex items-center gap-2 text-sm font-semibold text-white"><UsersRound className="size-4 text-emerald-400" /> Members</h2>
            <ul className="mt-4 divide-y divide-zinc-800">
              {state.members.map((member, index) => <li key={member.user?.id ?? `legacy-${index}`} className="flex items-center justify-between gap-3 py-3 text-sm"><span className="text-zinc-200">{member.user?.name ?? "Room member"}</span><span className="text-zinc-500">{member.markedCount} / {member.totalCells} marked</span></li>)}
            </ul>
          </section>
        </>
      ) : null}
    </main>
  );
}
