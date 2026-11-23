import { ArrowUpRight, Plus } from "lucide-react";
import Link from "next/link";
import { RoomGrid } from "@/components/room-grid";
import { JoinRoomForm } from "@/components/join-room-form";
import { buttonVariants } from "@/components/ui/button";

export default function DashboardPage() {
  return (
    <main className="mx-auto max-w-7xl px-5 pb-24 pt-12 sm:px-8 sm:pt-16">
      <div className="flex flex-wrap items-end justify-between gap-5">
        <div>
          <div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-emerald-400"><span className="size-1.5 rounded-full bg-emerald-400" /> Your space</div>
          <h1 className="text-4xl font-semibold tracking-tight text-white sm:text-5xl">My rooms<span className="text-emerald-400">.</span></h1>
          <p className="mt-3 text-sm leading-6 text-zinc-400 sm:text-base">Your daily games, all in one place.</p>
        </div>
        <Link href="/rooms/new" className={buttonVariants({ className: "h-10 px-4 font-semibold" })}><Plus className="size-4" /> Create room <ArrowUpRight className="size-4" /></Link>
      </div>
      <JoinRoomForm />
      <div className="mt-12 flex items-center gap-4"><h2 className="text-xs font-semibold uppercase tracking-[0.14em] text-zinc-500">Your rooms</h2><div className="h-px flex-1 bg-zinc-800" /></div>
      <RoomGrid />
    </main>
  );
}
