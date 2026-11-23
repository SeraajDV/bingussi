"use client";

import { useEffect, useState } from "react";
import { DEFAULT_RESET_SCHEDULE, getRoundWindow, type ResetSchedule } from "./reset-schedule";

export function useResetClock(schedule: ResetSchedule = DEFAULT_RESET_SCHEDULE) {
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
  const { dateKey, nextResetAt } = getRoundWindow(schedule, now);
  const seconds = Math.ceil((nextResetAt - now) / 1000);
  const days = Math.floor(seconds / 86400);
  const countdown = [Math.floor(seconds % 86400 / 3600), Math.floor(seconds % 3600 / 60), seconds % 60]
    .map((part) => String(part).padStart(2, "0")).join(":");
  return { now, dateKey, nextResetAt, countdown: days > 0 ? `${days}d ${countdown}` : countdown };
}
