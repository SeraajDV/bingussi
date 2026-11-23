"use client";

import { useConvexAuth, useMutation } from "convex/react";
import { ArrowRight } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";

type GridSize = 3 | 4 | 5;

export function CreateRoomForm() {
  const { isAuthenticated, isLoading } = useConvexAuth();
  const createRoom = useMutation(api.rooms.create);
  const router = useRouter();
  const [name, setName] = useState("");
  const [gridSize, setGridSize] = useState<GridSize>(5);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting) return;
    setError(null);
    setSubmitting(true);
    try {
      await createRoom({ name, gridSize });
      router.push("/dashboard");
    } catch (error) {
      setError(error instanceof Error ? error.message : "Could not create your room. Please try again.");
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mt-8 rounded-2xl border border-zinc-800 bg-zinc-900/70 p-6 sm:p-8">
      <label htmlFor="room-name" className="text-sm font-medium text-zinc-200">Room name</label>
      <input id="room-name" required maxLength={60} value={name} onChange={(event) => setName(event.target.value)} placeholder="e.g. The Daily Good" className="mt-2 h-11 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 text-sm text-white outline-none placeholder:text-zinc-600 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/20" />
      <fieldset className="mt-7">
        <legend className="text-sm font-medium text-zinc-200">Grid size</legend>
        <div className="mt-2 grid grid-cols-3 gap-3">
          {([3, 4, 5] as const).map((size) => (
            <label key={size} className={`cursor-pointer rounded-lg border px-3 py-3 text-center text-sm font-medium transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-emerald-400 ${gridSize === size ? "border-emerald-400 bg-emerald-400/10 text-emerald-300" : "border-zinc-700 text-zinc-400 hover:border-zinc-500"}`}>
              <input type="radio" name="gridSize" value={size} checked={gridSize === size} onChange={() => setGridSize(size)} className="sr-only" />
              {size} × {size}
            </label>
          ))}
        </div>
      </fieldset>
      {error && <p role="alert" className="mt-5 text-sm text-red-400">{error}</p>}
      {!isLoading && !isAuthenticated && <p role="alert" className="mt-5 text-sm text-red-400">Your session could not be connected. Please sign out and sign in again.</p>}
      <Button type="submit" disabled={!isAuthenticated || submitting || !name.trim()} className="mt-8 h-11 w-full font-semibold">{submitting ? "Creating room..." : "Create room"} <ArrowRight className="size-4" /></Button>
    </form>
  );
}
