import { Temporal } from "@js-temporal/polyfill";

export type ResetSchedule =
  | { frequency: "daily"; time: string; timeZone: string }
  | { frequency: "weekly"; time: string; timeZone: string; dayOfWeek: number }
  | { frequency: "monthly"; time: string; timeZone: string; dayOfMonth: number };

export const DEFAULT_RESET_SCHEDULE: ResetSchedule = {
  frequency: "daily",
  time: "00:00",
  timeZone: "UTC",
};

export function validateResetSchedule(schedule: ResetSchedule) {
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(schedule.time)) {
    throw new Error("Reset time must be in HH:MM format.");
  }
  if (schedule.frequency === "weekly" && (!Number.isInteger(schedule.dayOfWeek) || schedule.dayOfWeek < 1 || schedule.dayOfWeek > 7)) {
    throw new Error("Choose a valid day of the week.");
  }
  if (schedule.frequency === "monthly" && (!Number.isInteger(schedule.dayOfMonth) || schedule.dayOfMonth < 1 || schedule.dayOfMonth > 31)) {
    throw new Error("Choose a day from 1 to 31.");
  }
  if (!/^[A-Za-z][A-Za-z0-9._+-]*(?:\/[A-Za-z0-9._+-]+)*$/.test(schedule.timeZone)) {
    throw new Error("Choose a valid time zone.");
  }
  try {
    Temporal.Instant.fromEpochMilliseconds(0).toZonedDateTimeISO(schedule.timeZone);
  } catch (error) {
    if (error instanceof RangeError) throw new Error("Choose a valid time zone.");
    throw error;
  }
}

export function getRoundWindow(schedule: ResetSchedule, now: number) {
  const instant = Temporal.Instant.fromEpochMilliseconds(now);
  const local = instant.toZonedDateTimeISO(schedule.timeZone);
  const time = Temporal.PlainTime.from(schedule.time);
  const atReset = (date: Temporal.PlainDate) => date.toZonedDateTime({ timeZone: schedule.timeZone, plainTime: time });
  const monthDate = (date: Temporal.PlainDate, day: number) =>
    date.with({ day: Math.min(day, date.daysInMonth) });

  let date = local.toPlainDate();
  if (schedule.frequency === "weekly") {
    date = date.subtract({ days: (date.dayOfWeek - schedule.dayOfWeek + 7) % 7 });
  } else if (schedule.frequency === "monthly") {
    date = monthDate(date, schedule.dayOfMonth);
  }

  if (Temporal.Instant.compare(atReset(date).toInstant(), instant) > 0) {
    if (schedule.frequency === "daily") date = date.subtract({ days: 1 });
    else if (schedule.frequency === "weekly") date = date.subtract({ days: 7 });
    else date = monthDate(date.with({ day: 1 }).subtract({ months: 1 }), schedule.dayOfMonth);
  }

  let nextDate: Temporal.PlainDate;
  if (schedule.frequency === "daily") nextDate = date.add({ days: 1 });
  else if (schedule.frequency === "weekly") nextDate = date.add({ days: 7 });
  else nextDate = monthDate(date.with({ day: 1 }).add({ months: 1 }), schedule.dayOfMonth);

  return { dateKey: date.toString(), nextResetAt: atReset(nextDate).epochMilliseconds };
}
