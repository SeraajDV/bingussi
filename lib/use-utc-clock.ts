"use client";

import { useEffect, useState } from "react";

export function useUtcClock() {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    const update = () => setNow(Date.now());
    update();
    const timer = setInterval(update, 1000);
    document.addEventListener("visibilitychange", update);
    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", update);
    };
  }, []);

  if (now === null) return null;
  const date = new Date(now);
  const nextMidnight = Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate() + 1);
  const seconds = Math.ceil((nextMidnight - now) / 1000);
  const countdown = [Math.floor(seconds / 3600), Math.floor(seconds % 3600 / 60), seconds % 60]
    .map((part) => String(part).padStart(2, "0")).join(":");
  return { dateKey: date.toISOString().slice(0, 10), countdown };
}
