"use client";

import { Check, Grid2X2, Sparkles } from "lucide-react";
import { useState } from "react";

const squares = [
  "Morning coffee", "A good song", "Take a walk", "Say hello", "Try something new",
  "Big stretch", "Good news", "Make a list", "A little laugh", "Drink water",
  "Fresh air", "Send a meme", "FREE SPACE", "A small win", "Snack break",
  "Favorite playlist", "Deep breath", "Make a plan", "Share a photo", "Do a kind thing",
  "Find a moment", "Catch up", "Learn a fact", "Make time", "Celebrate",
];

export function BingoPreview() {
  const [marked, setMarked] = useState<number[]>([1, 7, 12, 16, 23]);
  function toggle(index: number) {
    setMarked((current) => current.includes(index) ? current.filter((item) => item !== index) : [...current, index]);
  }

  return (
    <div className="relative mx-auto w-full max-w-[500px]">
      <div aria-hidden="true" className="absolute -inset-4 rounded-[2rem] bg-emerald-500/5 blur-2xl" />
      <div className="relative rounded-2xl border border-zinc-700/70 bg-zinc-900 p-4 shadow-2xl shadow-black/50 sm:p-6">
        <div className="mb-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="flex size-10 items-center justify-center rounded-xl border border-emerald-400/20 bg-emerald-400/10 text-emerald-400"><Grid2X2 className="size-4" /></span>
            <div><p className="text-sm font-semibold text-zinc-100">The Daily Good</p><p className="mt-0.5 text-xs text-zinc-500">A little preview of the fun</p></div>
          </div>
          <span className="rounded-full border border-zinc-700 bg-zinc-800 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-zinc-400">Preview</span>
        </div>
        <div className="grid grid-cols-5 gap-1.5 sm:gap-2">
          {squares.map((square, index) => {
            const isMarked = marked.includes(index);
            return (
              <button key={square} type="button" aria-pressed={isMarked} onClick={() => toggle(index)} className={`relative flex aspect-square items-center justify-center rounded-lg border p-1 text-center text-[clamp(0.52rem,1.8vw,0.7rem)] font-medium leading-tight transition-all duration-200 active:scale-95 motion-reduce:transition-none ${isMarked ? "border-emerald-400/40 bg-emerald-400/15 text-emerald-200 hover:bg-emerald-400/20" : "border-zinc-700/70 bg-zinc-800/60 text-zinc-400 hover:border-zinc-500 hover:text-zinc-200"}`}>
                {index === 12 ? <Sparkles className="size-4 text-emerald-400" aria-label="Free space" /> : square}
                {isMarked && index !== 12 && <Check className="absolute right-1 top-1 size-2.5 text-emerald-400" aria-hidden="true" />}
              </button>
            );
          })}
        </div>
        <div className="mt-5 flex items-center justify-between text-xs text-zinc-500"><span>Try marking a square</span><span className="text-emerald-400">Just for fun <span aria-hidden="true">✦</span></span></div>
      </div>
    </div>
  );
}
