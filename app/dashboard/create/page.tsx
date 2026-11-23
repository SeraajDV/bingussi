import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { CreateRoomForm } from "@/components/create-room-form";

export default function CreateRoomPage() {
  return (
    <main className="mx-auto max-w-xl px-5 pb-24 pt-12 sm:px-8 sm:pt-16">
      <Link href="/dashboard" className="inline-flex items-center gap-2 text-sm text-zinc-400 transition-colors hover:text-white"><ArrowLeft className="size-4" /> Back to my rooms</Link>
      <p className="mt-10 text-xs font-semibold uppercase tracking-[0.16em] text-emerald-400">A new place to play</p>
      <h1 className="mt-3 text-4xl font-semibold tracking-tight text-white">Create a room<span className="text-emerald-400">.</span></h1>
      <p className="mt-3 text-sm leading-6 text-zinc-400">Give your room a name, choose its grid size, and add your bingo items.</p>
      <CreateRoomForm />
    </main>
  );
}
