"use client";

import { useConvexAuth, useMutation } from "convex/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { Button, buttonVariants } from "@/components/ui/button";

export function JoinInvite({ inviteCode }: { inviteCode: string }) {
  const { isAuthenticated, isLoading } = useConvexAuth();
  const joinRoom = useMutation(api.rooms.joinRoom);
  const router = useRouter();
  const request = useRef<{ code: string; promise: Promise<Id<"rooms">> } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!isAuthenticated) return;
    let active = true;
    if (!request.current || request.current.code !== inviteCode) {
      request.current = { code: inviteCode, promise: joinRoom({ inviteCode }) };
    }
    request.current.promise.then((roomId) => {
      if (!active) return;
      toast.success("You joined the room!");
      router.replace(`/rooms/${roomId}`);
    }).catch((error: unknown) => {
      if (!active) return;
      request.current = null;
      const message = error instanceof Error ? error.message : "Could not join this room. Please try again.";
      setError(message);
      toast.error(message);
    });
    return () => { active = false; };
  }, [attempt, inviteCode, isAuthenticated, joinRoom, router]);

  return (
    <main className="mx-auto max-w-lg px-5 py-20 sm:px-8">
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-8 text-center">
        <p className="text-xs font-semibold uppercase tracking-widest text-emerald-400">Room invitation</p>
        <h1 className="mt-4 text-3xl font-semibold text-white">{error ? "Couldn’t join the room" : "Joining your room..."}</h1>
        {error ? (
          <>
            <p role="alert" className="mt-3 text-sm text-red-400">{error}</p>
            <Button className="mt-6" onClick={() => { setError(null); setAttempt((value) => value + 1); }}>Try again</Button>
          </>
        ) : !isLoading && !isAuthenticated ? (
          <p role="alert" className="mt-3 text-sm text-red-400">Your session could not be connected. Please sign out and sign in again.</p>
        ) : (
          <p role="status" className="mt-3 text-sm text-zinc-400">Connecting your invite to your account.</p>
        )}
        <div className="mt-5"><Link href="/dashboard" className={buttonVariants({ variant: "ghost" })}>Back to my rooms</Link></div>
      </div>
    </main>
  );
}
