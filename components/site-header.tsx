import { Show, SignInButton, UserButton } from "@clerk/nextjs";
import { Grid2X2, Plus } from "lucide-react";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-30 border-b border-zinc-800/80 bg-zinc-950/85 backdrop-blur-xl">
      <nav aria-label="Main navigation" className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-3 px-5 sm:px-8">
        <Link href="/" className="flex items-center gap-2.5 font-semibold tracking-tight text-white">
          <span className="flex size-8 items-center justify-center rounded-lg bg-emerald-400 text-zinc-950"><Grid2X2 className="size-4" strokeWidth={2.5} /></span>
          <span>Bingo<span className="text-emerald-400">Sync</span></span>
        </Link>
        <div className="flex items-center gap-3 sm:gap-6">
          <Show when="signed-in">
            <Link href="/dashboard" className="text-sm font-medium text-zinc-400 transition-colors hover:text-white">My Rooms</Link>
            <Link href="/dashboard/create" className={buttonVariants({ className: "h-9 px-3 sm:px-4" })}>
              <Plus className="size-4" /><span className="hidden sm:inline">Create Room</span><span className="sm:hidden">Create</span>
            </Link>
            <UserButton />
          </Show>
          <Show when="signed-out">
            <SignInButton mode="modal" forceRedirectUrl="/dashboard">
              <button className="text-sm font-medium text-zinc-400 transition-colors hover:text-white">Sign in</button>
            </SignInButton>
          </Show>
        </div>
      </nav>
    </header>
  );
}
