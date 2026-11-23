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
    const roomId = await alice.mutation(api.rooms.createRoom, { name: "Room", gridSize: 3, itemPool: pool });
    await expect(outsider.query(api.rooms.getRoomState, { roomId, dateKey })).rejects.toThrow("not a member");
    await expect(outsider.mutation(api.rooms.getOrGenerateDailyCard, { roomId })).rejects.toThrow("not a member");
    await expect(outsider.mutation(api.rooms.toggleCell, { roomId, index: 0 })).rejects.toThrow("not a member");
    await expect(alice.query(api.rooms.getDailyCard, { roomId, dateKey: "2026-02-30" })).rejects.toThrow("Invalid UTC date");
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
    await expect(alice.mutation(api.rooms.toggleCell, { roomId, index: 0, expectedDateKey: dateKey })).rejects.toThrow("UTC day has changed");
    await expect(alice.mutation(api.rooms.getOrGenerateDailyCard, { roomId, expectedDateKey: dateKey })).rejects.toThrow("UTC day has changed");
    const nextCard = await alice.mutation(api.rooms.getOrGenerateDailyCard, { roomId });
    expect(nextCard._id).not.toBe(aliceCard._id);
    expect(nextCard.dateKey).toBe("2026-11-24");
    expect((await alice.query(api.rooms.getRoomState, { roomId, dateKey: nextCard.dateKey })).round?.winner).toBeNull();
    expect((await alice.query(api.rooms.getDailyCard, { roomId, dateKey }))?._id).toBe(aliceCard._id);
  });
});
