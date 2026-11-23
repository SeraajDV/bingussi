/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { afterEach, describe, expect, it, vi } from "vitest";
import { api } from "./_generated/api";
import schema from "./schema";
import { hasBingo, makeCells, winningCellIndexes } from "./lib/bingo";

const modules = import.meta.glob("./**/*.ts");
const pool = Array.from({ length: 9 }, (_, i) => `Item ${i + 1}`);
const dateKey = "2026-11-23";

afterEach(() => {
  vi.useRealTimers();
});

describe("bingo helpers", () => {
  it.each([3, 4, 5])("detects rows, columns, and both diagonals on a %i grid", (size) => {
    const empty = makeCells(Array.from({ length: size * size }, (_, i) => `${i}`), size, false);
    const patterns = [
      Array.from({ length: size }, (_, i) => size + i),
      Array.from({ length: size }, (_, i) => i * size + 1),
      Array.from({ length: size }, (_, i) => i * size + i),
      Array.from({ length: size }, (_, i) => i * size + size - 1 - i),
    ];
    expect(hasBingo(empty, size)).toBe(false);
    for (const pattern of patterns) {
      const marked = empty.map((cell) => ({ ...cell, isMarked: pattern.includes(cell.index) }));
      expect(hasBingo(marked, size)).toBe(true);
      expect([...winningCellIndexes(marked, size)].sort((a, b) => a - b)).toEqual([...pattern].sort((a, b) => a - b));
    }
  });
});

describe("rooms", () => {
  it("validates room creation and restricts room access to members", async () => {
    const t = convexTest(schema, modules);
    const alice = t.withIdentity({ subject: "alice", name: "Alice", email: "alice@example.test" });
    const outsider = t.withIdentity({ subject: "outsider" });
    await expect(t.mutation(api.rooms.createRoom, { name: "Room", gridSize: 3, itemPool: pool })).rejects.toThrow("signed in");
    await expect(alice.mutation(api.rooms.createRoom, { name: "Room", gridSize: 3, itemPool: pool.slice(1) })).rejects.toThrow("item pool");
    await expect(alice.mutation(api.rooms.createRoom, { name: "Room", gridSize: 4, freeCenter: true, itemPool: [...pool, ...pool] })).rejects.toThrow("odd-sized");
    await expect(alice.mutation(api.rooms.createRoom, { name: "Room", gridSize: 3, itemPool: pool, resetSchedule: { frequency: "daily", time: "09:00", timeZone: "No/Such_Zone" } })).rejects.toThrow("time zone");
    const roomId = await alice.mutation(api.rooms.createRoom, { name: "Room", gridSize: 3, itemPool: pool });
    await expect(outsider.query(api.rooms.getRoomState, { roomId, dateKey })).rejects.toThrow("not a member");
    await expect(outsider.mutation(api.rooms.getOrGenerateDailyCard, { roomId })).rejects.toThrow("not a member");
    await expect(outsider.mutation(api.rooms.toggleCell, { roomId, index: 0 })).rejects.toThrow("not a member");
    await expect(alice.query(api.rooms.getDailyCard, { roomId, dateKey: "2026-02-30" })).rejects.toThrow("Invalid round date");
    await expect(outsider.mutation(api.rooms.joinRoom, { inviteCode: "WRONG" })).rejects.toThrow("not found");
  });

  it("keeps legacy rooms visible and reports missing game configuration", async () => {
    const t = convexTest(schema, modules);
    const alice = t.withIdentity({ subject: "alice" });
    const roomId = await t.run(async (ctx) => {
      const id = await ctx.db.insert("rooms", { name: "Old room", gridSize: 3, activeRoundDate: dateKey });
      await ctx.db.insert("roomMembers", { roomId: id, tokenIdentifier: "https://convex.test|alice" });
      return id;
    });
    const rooms = await alice.query(api.rooms.listMine, { paginationOpts: { cursor: null, numItems: 10 } });
    expect(rooms.page.map((room) => room.id)).toContain(roomId);
    await expect(alice.mutation(api.rooms.getOrGenerateDailyCard, { roomId })).rejects.toThrow("older room");
  });

  it.each([
    {
      schedule: { frequency: "daily" as const, time: "06:00", timeZone: "Africa/Johannesburg" },
      before: "2026-11-23T03:59:59Z", after: "2026-11-23T04:00:00Z", oldKey: "2026-11-22", newKey: "2026-11-23",
    },
    {
      schedule: { frequency: "weekly" as const, time: "09:00", timeZone: "America/New_York", dayOfWeek: 1 },
      before: "2026-11-23T13:59:59Z", after: "2026-11-23T14:00:00Z", oldKey: "2026-11-16", newKey: "2026-11-23",
    },
    {
      schedule: { frequency: "monthly" as const, time: "09:00", timeZone: "UTC", dayOfMonth: 31 },
      before: "2027-02-28T08:59:59Z", after: "2027-02-28T09:00:00Z", oldKey: "2027-01-31", newKey: "2027-02-28",
    },
  ])("rolls cards and winners together on a $schedule.frequency schedule", async ({ schedule, before, after, oldKey, newKey }) => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(before));
    const t = convexTest(schema, modules);
    const alice = t.withIdentity({ subject: "alice", name: "Alice" });
    const bob = t.withIdentity({ subject: "bob", name: "Bob" });
    const outsider = t.withIdentity({ subject: "outsider" });
    const roomId = await alice.mutation(api.rooms.createRoom, { name: "Room", gridSize: 3, itemPool: pool, resetSchedule: schedule });
    expect(await alice.query(api.rooms.getRoomSchedule, { roomId })).toEqual(schedule);
    const listed = await alice.query(api.rooms.listMine, { paginationOpts: { cursor: null, numItems: 10 } });
    expect(listed.page[0]).toMatchObject({ activeRoundDate: oldKey, resetSchedule: schedule });
    await expect(outsider.query(api.rooms.getRoomSchedule, { roomId })).rejects.toThrow("not a member");
    const room = await alice.query(api.rooms.getRoomState, { roomId, dateKey: oldKey });
    if (!room.room.inviteCode) throw new Error("Missing invite code");
    await bob.mutation(api.rooms.joinRoom, { inviteCode: room.room.inviteCode });
    const aliceCard = await alice.mutation(api.rooms.getOrGenerateDailyCard, { roomId, expectedDateKey: oldKey });
    const bobCard = await bob.mutation(api.rooms.getOrGenerateDailyCard, { roomId, expectedDateKey: oldKey });
    for (const index of [0, 1, 2]) await alice.mutation(api.rooms.toggleCell, { roomId, index, expectedDateKey: oldKey });
    expect((await bob.query(api.rooms.getRoomState, { roomId, dateKey: oldKey })).round?.winner?.name).toBe("Alice");
    vi.setSystemTime(new Date(after));
    await expect(alice.mutation(api.rooms.toggleCell, { roomId, index: 0, expectedDateKey: oldKey })).rejects.toThrow("round has changed");
    const nextAliceCard = await alice.mutation(api.rooms.getOrGenerateDailyCard, { roomId, expectedDateKey: newKey });
    const nextBobCard = await bob.mutation(api.rooms.getOrGenerateDailyCard, { roomId, expectedDateKey: newKey });
    expect(nextAliceCard._id).not.toBe(aliceCard._id);
    expect(nextBobCard._id).not.toBe(bobCard._id);
    expect((await bob.query(api.rooms.getRoomState, { roomId, dateKey: newKey })).round?.winner).toBeNull();
    expect((await bob.query(api.rooms.getRoomState, { roomId, dateKey: oldKey })).round?.winner?.name).toBe("Alice");
  });

  it("generates one card per day, tracks progress, and preserves the first winner", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(`${dateKey}T12:00:00Z`));
    const t = convexTest(schema, modules);
    const alice = t.withIdentity({ subject: "alice", name: "Alice" });
    const bob = t.withIdentity({ subject: "bob", name: "Bob" });
    const roomId = await alice.mutation(api.rooms.createRoom, { name: "Room", gridSize: 3, freeCenter: true, itemPool: pool });
    const initial = await alice.query(api.rooms.getRoomState, { roomId, dateKey });
    expect(initial.room.inviteCode).toMatch(/^[A-Z2-9]{6}$/);
    const inviteCode = initial.room.inviteCode;
    if (!inviteCode) throw new Error("Missing invite code");
    await bob.mutation(api.rooms.joinRoom, { inviteCode: inviteCode.toLowerCase() });
    await bob.mutation(api.rooms.joinRoom, { inviteCode });
    const aliceCard = await alice.mutation(api.rooms.getOrGenerateDailyCard, { roomId });
    const bobCard = await bob.mutation(api.rooms.getOrGenerateDailyCard, { roomId });
    expect((await alice.mutation(api.rooms.getOrGenerateDailyCard, { roomId }))._id).toBe(aliceCard._id);
    expect(aliceCard.cells).toHaveLength(9);
    expect(aliceCard.cells[4]).toMatchObject({ text: "FREE", isMarked: true });
    expect(bobCard.hasBingo).toBe(false);
    await expect(alice.mutation(api.rooms.toggleCell, { roomId, index: 4 })).rejects.toThrow("free center");
    await expect(alice.mutation(api.rooms.toggleCell, { roomId, index: 9 })).rejects.toThrow("Invalid cell");
    await alice.mutation(api.rooms.toggleCell, { roomId, index: 0 });
    await alice.mutation(api.rooms.toggleCell, { roomId, index: 1 });
    expect((await alice.mutation(api.rooms.toggleCell, { roomId, index: 2 })).hasBingo).toBe(true);
    for (const index of [0, 1, 2]) await bob.mutation(api.rooms.toggleCell, { roomId, index });
    const state = await bob.query(api.rooms.getRoomState, { roomId, dateKey });
    expect(state.members).toHaveLength(2);
    expect(state.members.map((member) => member.markedCount)).toEqual([4, 4]);
    expect(state.round?.winner?.name).toBe("Alice");
    expect(state.round?.wonAt).toBeGreaterThanOrEqual(Date.now());
    expect(state.round?.wonAt).toBeLessThan(Date.now() + 1000);
    expect((await alice.mutation(api.rooms.toggleCell, { roomId, index: 2 })).hasBingo).toBe(false);
    expect((await bob.query(api.rooms.getRoomState, { roomId, dateKey })).round?.winner?.name).toBe("Alice");
    vi.setSystemTime(new Date("2026-11-24T00:00:00Z"));
    await expect(alice.mutation(api.rooms.toggleCell, { roomId, index: 0, expectedDateKey: dateKey })).rejects.toThrow("round has changed");
    await expect(alice.mutation(api.rooms.getOrGenerateDailyCard, { roomId, expectedDateKey: dateKey })).rejects.toThrow("round has changed");
    const nextCard = await alice.mutation(api.rooms.getOrGenerateDailyCard, { roomId });
    expect(nextCard._id).not.toBe(aliceCard._id);
    expect(nextCard.dateKey).toBe("2026-11-24");
    expect((await alice.query(api.rooms.getRoomState, { roomId, dateKey: nextCard.dateKey })).round?.winner).toBeNull();
    expect((await alice.query(api.rooms.getDailyCard, { roomId, dateKey }))?._id).toBe(aliceCard._id);
  });
});
