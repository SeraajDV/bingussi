"use client";

import { useConvexAuth, useMutation } from "convex/react";
import { ArrowRight, KeyRound } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";

export function JoinRoomForm() {
  const { isAuthenticated, isLoading } = useConvexAuth();
  const joinRoom = useMutation(api.rooms.joinRoom);
  const router = useRouter();
  const [code, setCode] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting) return;
    setError(null);
    setSubmitting(true);
    try {
      const roomId = await joinRoom({ inviteCode: code.trim().toUpperCase() });
      toast.success("You joined the room!");
      router.push(`/rooms/${roomId}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Could not join this room. Please try again.";
      setError(message);
      toast.error(message);
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={submit} className="mt-8 rounded-2xl border border-zinc-800 bg-zinc-900/70 p-5 sm:flex sm:items-end sm:gap-4 sm:p-6">
      <div className="flex-1">
        <label htmlFor="invite-code" className="flex items-center gap-2 text-sm font-semibold text-zinc-200"><KeyRound className="size-4 text-emerald-400" /> Join via code</label>
        <p className="mt-1 text-xs text-zinc-500">Have an invite? Enter the 6-character room code.</p>
        <input id="invite-code" value={code} onChange={(event) => setCode(event.target.value.toUpperCase())} maxLength={6} autoComplete="off" placeholder="e.g. ABC234" className="mt-3 h-11 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 text-sm uppercase tracking-widest text-white outline-none placeholder:tracking-normal placeholder:text-zinc-600 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/20" />
        {error && <p role="alert" className="mt-2 text-sm text-red-400">{error}</p>}
        {!isLoading && !isAuthenticated && <p role="alert" className="mt-2 text-sm text-red-400">Your session could not be connected. Please sign out and sign in again.</p>}
      </div>
      <Button type="submit" className="mt-3 h-11 w-full px-5 sm:mt-0 sm:w-auto" disabled={!isAuthenticated || submitting || code.trim().length !== 6}>{submitting ? "Joining..." : "Join room"} <ArrowRight className="size-4" /></Button>
    </form>
  );
}
