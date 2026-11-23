import { Show, SignInButton } from "@clerk/nextjs";
import { ArrowRight, CalendarDays, Sparkles, UsersRound } from "lucide-react";
import Link from "next/link";
import { Button, buttonVariants } from "@/components/ui/button";
import { BingoPreview } from "@/components/bingo-preview";

export default function Home() {
  return (
    <main>
      <section className="relative overflow-hidden">
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_75%_35%,rgba(16,185,129,0.12),transparent_38%),radial-gradient(ellipse_at_5%_80%,rgba(99,102,241,0.08),transparent_35%)]" />
        <div className="relative mx-auto grid max-w-7xl items-center gap-16 px-5 pb-20 pt-20 sm:px-8 lg:grid-cols-[1fr_0.9fr] lg:gap-24 lg:pb-28 lg:pt-28">
          <div>
            <div className="mb-7 inline-flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/5 px-3 py-1.5 text-xs font-medium text-emerald-300">
              <Sparkles className="size-3.5" /> A LITTLE FUN, EVERY DAY
            </div>
            <h1 className="max-w-2xl text-5xl font-semibold leading-[1.05] tracking-[-0.055em] text-zinc-50 sm:text-6xl xl:text-7xl">
              Your people.<br />Your game.<br /><span className="text-emerald-400">Every day.</span>
            </h1>
            <p className="mt-6 max-w-lg text-base leading-7 text-zinc-400 sm:text-lg">
              Bring your people together for a fresh round of bingo. Create a room, make the everyday a little more interesting, and see who gets the first line.
            </p>
            <div className="mt-9 flex flex-wrap items-center gap-4">
              <Show when="signed-out">
                <SignInButton mode="modal" forceRedirectUrl="/dashboard">
                  <Button size="lg" className="h-12 px-5 text-sm font-semibold">Get started <ArrowRight className="size-4" /></Button>
                </SignInButton>
              </Show>
              <Show when="signed-in">
                <Link href="/dashboard" className={buttonVariants({ size: "lg", className: "h-12 px-5 text-sm font-semibold" })}>Go to my rooms <ArrowRight className="size-4" /></Link>
              </Show>
              <span className="text-sm text-zinc-500">A new reason to check in.</span>
            </div>
          </div>
          <BingoPreview />
        </div>
      </section>
      <section className="border-t border-zinc-800/80">
        <div className="mx-auto grid max-w-7xl gap-8 px-5 py-10 sm:grid-cols-3 sm:px-8 sm:py-12">
          {[
            { icon: UsersRound, title: "Better together", text: "A little friendly competition for your favorite people." },
            { icon: CalendarDays, title: "Your kind of ritual", text: "Fresh rounds on a schedule that suits you." },
            { icon: Sparkles, title: "Make it yours", text: "Your room, your grid, your kind of fun." },
          ].map(({ icon: Icon, title, text }) => (
            <div key={title} className="flex gap-4">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-zinc-800 bg-zinc-900 text-emerald-400"><Icon className="size-4" /></div>
              <div><h2 className="text-sm font-semibold text-zinc-100">{title}</h2><p className="mt-1 text-sm leading-6 text-zinc-500">{text}</p></div>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
