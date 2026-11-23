"use client";

import confetti from "canvas-confetti";
import { useConvexAuth, useMutation, useQuery } from "convex/react";
import { ArrowLeft, Check, Clock3, Copy, Sparkles, Trophy, UsersRound } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { winningCellIndexes } from "@/convex/lib/bingo";
import { optimisticToggle } from "@/lib/optimistic-bingo";
import { useUtcClock } from "@/lib/use-utc-clock";

const gridClasses = { 3: "grid-cols-3", 4: "grid-cols-4", 5: "grid-cols-5" } as const;
const dateFormatter = new Intl.DateTimeFormat("en", { weekday: "long", month: "long", day: "numeric", year: "numeric", timeZone: "UTC" });

function WinnerBanner({ dateKey, name, winnerId, wonAt }: { dateKey: string; name: string; winnerId: Id<"users">; wonAt: number | null }) {
  const celebrated = useRef<string | null>(null);
  useEffect(() => {
    const key = `${dateKey}:${winnerId}`;
    if (celebrated.current === key) return;
    celebrated.current = key;
    void confetti({ particleCount: 110, spread: 75, origin: { y: 0.6 }, colors: ["#34d399", "#fbbf24", "#fef3c7"], disableForReducedMotion: true });
  }, [dateKey, winnerId]);

  return (
    <section aria-live="polite" className="mt-8 flex items-start gap-4 rounded-2xl border border-amber-400/40 bg-gradient-to-r from-amber-400/15 to-emerald-400/10 p-5 sm:p-6">
      <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-amber-400/20 text-amber-300"><Trophy className="size-5" /></div>
      <div>
        <p className="text-xs font-semibold uppercase tracking-widest text-amber-300">Today&apos;s champion</p>
        <h2 className="mt-1 text-lg font-semibold text-amber-100 sm:text-xl">{name} got BINGO and won today&apos;s round!</h2>
        {wonAt !== null && <p className="mt-1 text-sm text-amber-200/75">Won at <time dateTime={new Date(wonAt).toISOString()}>{new Date(wonAt).toISOString().replace("T", " ").replace("Z", " UTC")}</time></p>}
        <p className="mt-2 text-xs text-zinc-400">The winner is locked in. Keep marking your card for fun!</p>
      </div>
    </section>
  );
}

export function RoomDetails({ roomId }: { roomId: Id<"rooms"> }) {
  const { isAuthenticated, isLoading } = useConvexAuth();
  const clock = useUtcClock();
  const dateKey = clock?.dateKey;
  const args = isAuthenticated && dateKey ? { roomId, dateKey } : "skip";
  const state = useQuery(api.rooms.getRoomState, args);
  const card = useQuery(api.rooms.getDailyCard, args);
  const generate = useMutation(api.rooms.getOrGenerateDailyCard);
  const toggle = useMutation(api.rooms.toggleCell).withOptimisticUpdate(optimisticToggle);
  const [generationError, setGenerationError] = useState<{ key: string; message: string } | null>(null);
  const pending = useRef(new Set<string>());
  const generationKey = dateKey ? `${roomId}:${dateKey}` : null;

  useEffect(() => {
    if (!isAuthenticated || !state || card !== null || !dateKey || !generationKey ||
      generationError?.key === generationKey || pending.current.has(generationKey)) return;
    pending.current.add(generationKey);
    void generate({ roomId, expectedDateKey: dateKey }).catch((error: unknown) => {
      const message = error instanceof Error ? error.message : "Could not generate your daily card.";
      setGenerationError({ key: generationKey, message });
    }).finally(() => pending.current.delete(generationKey));
  }, [card, dateKey, generate, generationError, generationKey, isAuthenticated, roomId, state]);

  async function copyInvite(code: string) {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/join/${encodeURIComponent(code)}`);
      toast.success("Invite link copied!");
    } catch {
      toast.error("Could not copy the invite link. Please copy the code instead.");
    }
  }

  async function markCell(index: number) {
    if (!dateKey) return;
    if (new Date().toISOString().slice(0, 10) !== dateKey) {
      toast.error("The UTC day has changed. Please wait for the new card.");
      return;
    }
    try {
      await toggle({ roomId, index, expectedDateKey: dateKey });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not update your card. Please try again.");
    }
  }

  const inviteCode = state?.room.inviteCode;
  const winning = card?.hasBingo && state ? winningCellIndexes(card.cells, state.room.gridSize) : new Set<number>();
  const winner = state?.round?.winner;
  const currentError = generationError?.key === generationKey ? generationError.message : null;

  return (
    <main className="mx-auto max-w-7xl px-5 pb-24 pt-10 sm:px-8 sm:pt-14">
      <Link href="/dashboard" className="inline-flex items-center gap-2 text-sm text-zinc-400 hover:text-white"><ArrowLeft className="size-4" /> Back to my rooms</Link>
      {isLoading || (isAuthenticated && !state) ? (
        <p role="status" className="mt-8 text-sm text-zinc-400">Loading your room...</p>
      ) : !isAuthenticated ? (
        <p role="alert" className="mt-8 text-sm text-red-400">Your session could not be connected. Please sign out and sign in again.</p>
      ) : state && clock ? (
        <>
          <header className="mt-8 flex flex-wrap items-end justify-between gap-5">
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-emerald-400">Your daily game</p>
              <h1 className="mt-3 break-words text-3xl font-semibold tracking-tight text-white sm:text-4xl">{state.room.name}</h1>
              <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-zinc-400">
                <span>{dateFormatter.format(new Date(`${clock.dateKey}T00:00:00Z`))} UTC</span>
                <span className="inline-flex items-center gap-1.5 text-zinc-500"><Clock3 className="size-4" /> Resets in <span className="font-mono tabular-nums text-zinc-300">{clock.countdown}</span></span>
              </div>
            </div>
            {inviteCode && <Button onClick={() => copyInvite(inviteCode)} variant="outline" className="h-10 px-4"><Copy className="size-4" /> Copy invite link</Button>}
          </header>

          {winner && <WinnerBanner dateKey={clock.dateKey} name={winner.name} winnerId={winner.id} wonAt={state.round?.wonAt ?? null} />}

          <div className="mt-8 grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
            <section aria-labelledby="card-heading" className="min-w-0 rounded-2xl border border-zinc-800 bg-zinc-900/70 p-4 sm:p-6">
              <div className="mb-5 flex flex-wrap items-center justify-between gap-2">
                <div><h2 id="card-heading" className="text-lg font-semibold text-white">Your bingo card</h2><p className="mt-1 text-xs text-zinc-500">Tap a square to mark your progress.</p></div>
                {card?.hasBingo && <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-400/30 bg-amber-400/10 px-3 py-1 text-xs font-semibold text-amber-300"><Sparkles className="size-3.5" /> BINGO!</span>}
              </div>
              {currentError ? (
                <div className="rounded-xl border border-red-400/20 bg-red-400/5 p-5">
                  <p role="alert" className="text-sm text-red-300">{currentError}</p>
                  <Button variant="outline" className="mt-4" onClick={() => setGenerationError(null)}>Try again</Button>
                </div>
              ) : !card ? (
                <p role="status" className="py-12 text-center text-sm text-zinc-400">Getting today&apos;s card ready...</p>
              ) : (
                <div className={`mx-auto grid w-full max-w-[34rem] ${gridClasses[state.room.gridSize]} gap-1.5 sm:gap-3`}>
                  {card.cells.map((cell) => {
                    const isFree = !!state.room.freeCenter && cell.index === Math.floor(card.cells.length / 2);
                    const isWinning = winning.has(cell.index);
                    return (
                      <button key={cell.index} type="button" disabled={isFree} aria-pressed={cell.isMarked} aria-label={`${cell.text}${isFree ? ", free center" : ""}`} title={cell.text} onClick={() => markCell(cell.index)}
                        className={`relative flex aspect-square min-w-0 items-center justify-center overflow-hidden rounded-xl border p-1.5 text-center text-[clamp(0.65rem,2.4vw,1rem)] font-medium leading-tight transition-all focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-400 sm:p-3 ${isWinning ? "border-amber-400 bg-amber-400/20 text-amber-100 shadow-[0_0_20px_rgba(251,191,36,0.2)]" : cell.isMarked ? "border-emerald-400/60 bg-emerald-400/15 text-emerald-100 shadow-[0_0_16px_rgba(52,211,153,0.12)]" : "border-zinc-700 bg-zinc-950 text-zinc-300 hover:border-emerald-400/50 hover:bg-zinc-800 active:scale-95"} ${isFree ? "cursor-default" : "cursor-pointer"}`}>
                        <span className="line-clamp-4 break-words [overflow-wrap:anywhere]">{cell.text}</span>
                        {cell.isMarked && <span aria-hidden="true" className={`absolute right-1 top-1 rounded-full p-0.5 sm:right-2 sm:top-2 ${isWinning ? "bg-amber-400 text-zinc-950" : "bg-emerald-400 text-zinc-950"}`}><Check className="size-2.5 sm:size-3" strokeWidth={3} /></span>}
                      </button>
                    );
                  })}
                </div>
              )}
            </section>

            <aside className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-5 sm:p-6">
              <h2 className="flex items-center gap-2 text-sm font-semibold text-white"><UsersRound className="size-4 text-emerald-400" /> Room progress <span className="ml-auto text-xs font-normal text-zinc-500">{state.members.length} players</span></h2>
              <ul className="mt-5 space-y-5">
                {state.members.map((member, index) => {
                  const name = member.user?.name ?? "Room member";
                  const progress = member.totalCells > 0 ? Math.min(100, Math.max(0, member.markedCount / member.totalCells * 100)) : 0;
                  return (
                    <li key={member.user?.id ?? `legacy-${index}`} className="flex items-center gap-3">
                      {member.user?.imageUrl ? <Image unoptimized src={member.user.imageUrl} alt="" width={36} height={36} className="size-9 shrink-0 rounded-full object-cover" /> : <span aria-hidden="true" className="flex size-9 shrink-0 items-center justify-center rounded-full bg-zinc-800 text-sm font-semibold text-zinc-300">{name.trim().charAt(0).toUpperCase() || "?"}</span>}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2 text-sm"><span className="truncate font-medium text-zinc-200">{name}</span><span className="shrink-0 text-xs tabular-nums text-zinc-500">{member.markedCount}/{member.totalCells}</span></div>
                        <div role="progressbar" aria-label={`${name}'s progress`} aria-valuenow={member.markedCount} aria-valuemin={0} aria-valuemax={member.totalCells} className="mt-2 h-1.5 overflow-hidden rounded-full bg-zinc-800"><div className="h-full rounded-full bg-emerald-400 transition-[width]" style={{ width: `${progress}%` }} /></div>
                      </div>
                    </li>
                  );
                })}
              </ul>
              {inviteCode ? <p className="mt-6 border-t border-zinc-800 pt-4 text-xs text-zinc-500">Invite code: <span className="font-mono font-semibold tracking-widest text-zinc-300">{inviteCode}</span></p> : <p className="mt-6 border-t border-zinc-800 pt-4 text-xs text-zinc-500">This older room doesn&apos;t have an invite code yet.</p>}
            </aside>
          </div>
        </>
      ) : null}
    </main>
  );
}
