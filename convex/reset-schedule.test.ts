import { describe, expect, it } from "vitest";
import { DEFAULT_RESET_SCHEDULE, getRoundWindow, validateResetSchedule, type ResetSchedule } from "../lib/reset-schedule";

function windowAt(schedule: ResetSchedule, time: string) {
  const result = getRoundWindow(schedule, Date.parse(time));
  return { dateKey: result.dateKey, next: new Date(result.nextResetAt).toISOString() };
}

describe("reset schedules", () => {
  it("preserves midnight UTC for existing rooms", () => {
    expect(windowAt(DEFAULT_RESET_SCHEDULE, "2026-11-23T23:59:59Z"))
      .toEqual({ dateKey: "2026-11-23", next: "2026-11-24T00:00:00.000Z" });
  });

  it("uses a chosen time zone and daily reset time", () => {
    const schedule: ResetSchedule = { frequency: "daily", time: "06:00", timeZone: "Africa/Johannesburg" };
    expect(windowAt(schedule, "2026-11-23T03:59:59Z"))
      .toEqual({ dateKey: "2026-11-22", next: "2026-11-23T04:00:00.000Z" });
    expect(windowAt(schedule, "2026-11-23T04:00:00Z"))
      .toEqual({ dateKey: "2026-11-23", next: "2026-11-24T04:00:00.000Z" });
  });

  it("resets weekly on the chosen weekday", () => {
    const schedule: ResetSchedule = { frequency: "weekly", time: "09:00", timeZone: "America/New_York", dayOfWeek: 1 };
    expect(windowAt(schedule, "2026-11-23T13:59:59Z"))
      .toEqual({ dateKey: "2026-11-16", next: "2026-11-23T14:00:00.000Z" });
    expect(windowAt(schedule, "2026-11-23T14:00:00Z"))
      .toEqual({ dateKey: "2026-11-23", next: "2026-11-30T14:00:00.000Z" });
  });

  it("clamps monthly resets to the final day and restores the requested day", () => {
    const schedule: ResetSchedule = { frequency: "monthly", time: "09:00", timeZone: "UTC", dayOfMonth: 31 };
    expect(windowAt(schedule, "2028-02-29T08:59:59Z"))
      .toEqual({ dateKey: "2028-01-31", next: "2028-02-29T09:00:00.000Z" });
    expect(windowAt(schedule, "2028-02-29T09:00:00Z"))
      .toEqual({ dateKey: "2028-02-29", next: "2028-03-31T09:00:00.000Z" });
    expect(windowAt(schedule, "2027-02-28T09:00:00Z"))
      .toEqual({ dateKey: "2027-02-28", next: "2027-03-31T09:00:00.000Z" });
  });

  it("handles skipped and repeated daylight-saving times once per local date", () => {
    const spring: ResetSchedule = { frequency: "daily", time: "02:30", timeZone: "America/New_York" };
    expect(windowAt(spring, "2026-03-08T07:29:59Z"))
      .toEqual({ dateKey: "2026-03-07", next: "2026-03-08T07:30:00.000Z" });
    expect(windowAt(spring, "2026-03-08T07:30:00Z"))
      .toEqual({ dateKey: "2026-03-08", next: "2026-03-09T06:30:00.000Z" });
    const fall: ResetSchedule = { frequency: "daily", time: "01:30", timeZone: "America/New_York" };
    expect(windowAt(fall, "2026-11-01T05:30:00Z"))
      .toEqual({ dateKey: "2026-11-01", next: "2026-11-02T06:30:00.000Z" });
    expect(windowAt(fall, "2026-11-01T06:30:00Z"))
      .toEqual({ dateKey: "2026-11-01", next: "2026-11-02T06:30:00.000Z" });
  });

  it("rejects invalid time zones, times, and reset days", () => {
    expect(() => validateResetSchedule({ frequency: "daily", time: "24:00", timeZone: "UTC" })).toThrow("Reset time");
    expect(() => validateResetSchedule({ frequency: "daily", time: "00:00", timeZone: "Invalid/Zone" })).toThrow("time zone");
    expect(() => validateResetSchedule({ frequency: "weekly", time: "00:00", timeZone: "UTC", dayOfWeek: 8 })).toThrow("day of the week");
    expect(() => validateResetSchedule({ frequency: "monthly", time: "00:00", timeZone: "UTC", dayOfMonth: 32 })).toThrow("1 to 31");
  });
});
