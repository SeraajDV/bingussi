"use client";

import { useEffect, useState } from "react";

export function useTodayUtc() {
  const [today, setToday] = useState<string | null>(null);
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    function update() {
      const now = new Date();
      setToday(now.toISOString().slice(0, 10));
      const nextDay = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1);
      timer = setTimeout(update, nextDay - now.getTime() + 50);
    }
    update();
    return () => clearTimeout(timer);
  }, []);
  return today;
}
