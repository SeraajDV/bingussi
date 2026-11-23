// @vitest-environment jsdom
import { act, cleanup, render, renderHook, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { getFunctionName } from "convex/server";
import type { OptimisticLocalStore } from "convex/browser";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { RoomDetails } from "./room-details";
import type { Id } from "@/convex/_generated/dataModel";
import { optimisticToggle } from "@/lib/optimistic-bingo";

const mocks = vi.hoisted(() => ({
  query: vi.fn(),
  generate: vi.fn(),
  toggle: vi.fn(),
  confetti: vi.fn(),
  toastError: vi.fn(),
  clock: { dateKey: "2026-11-23", countdown: "08:30:00" },
}));
vi.mock("convex/react", () => ({
  useConvexAuth: () => ({ isAuthenticated: true, isLoading: false }),
  useQuery: (reference: Parameters<typeof getFunctionName>[0], args: unknown) => mocks.query(getFunctionName(reference), args),
  useMutation: (reference: Parameters<typeof getFunctionName>[0]) => getFunctionName(reference) === "rooms:toggleCell"
    ? Object.assign(mocks.toggle, { withOptimisticUpdate: () => mocks.toggle })
    : mocks.generate,
}));
vi.mock("canvas-confetti", () => ({ default: mocks.confetti }));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: mocks.toastError } }));
vi.mock("@/lib/use-utc-clock", () => ({ useUtcClock: () => mocks.clock }));

const roomId = "room123" as Id<"rooms">;
const userId = "user123" as Id<"users">;
const cells = Array.from({ length: 9 }, (_, index) => ({ index, text: index === 4 ? "FREE" : `Item ${index}`, isMarked: index === 4 }));
const card = { _id: "card", _creationTime: 0, roomId, userId, dateKey: "2026-11-23", cells, hasBingo: false };
const state = {
  room: { name: "Team", gridSize: 3, freeCenter: true, inviteCode: "ABC234" },
  members: [
    { user: { id: userId, name: "Alice", imageUrl: null }, markedCount: 1, totalCells: 9, hasBingo: false, joinedAt: 0 },
    { user: { id: "bob", name: "Bob", imageUrl: null }, markedCount: 3, totalCells: 9, hasBingo: false, joinedAt: 0 },
  ],
  round: null,
};

beforeEach(() => {
  vi.clearAllMocks();
  mocks.generate.mockReset();
  mocks.toggle.mockReset().mockResolvedValue(null);
  mocks.query.mockImplementation((name: string) => name === "rooms:getRoomState" ? state : card);
});
afterEach(cleanup);

describe("daily gameplay", () => {
  it("generates a missing card and displays a retryable failure", async () => {
    const user = userEvent.setup();
    mocks.query.mockImplementation((name: string) => name === "rooms:getRoomState" ? state : null);
    mocks.generate.mockRejectedValueOnce(new Error("Cannot generate card")).mockResolvedValueOnce(card);
    render(<RoomDetails roomId={roomId} />);
    expect((await screen.findByRole("alert")).textContent).toContain("Cannot generate card");
    expect(mocks.generate).toHaveBeenCalledWith({ roomId, expectedDateKey: "2026-11-23" });
    await user.click(screen.getByRole("button", { name: "Try again" }));
    await waitFor(() => expect(mocks.generate).toHaveBeenCalledTimes(2));
  });

  it("renders the card and private progress, and sends a dated toggle", async () => {
    const user = userEvent.setup();
    vi.useFakeTimers({ shouldAdvanceTime: true });
    vi.setSystemTime(new Date("2026-11-23T12:00:00Z"));
    render(<RoomDetails roomId={roomId} />);
    expect(screen.getByText("08:30:00")).toBeTruthy();
    expect(screen.getByRole("progressbar", { name: "Bob's progress" }).getAttribute("aria-valuenow")).toBe("3");
    expect((screen.getByRole("button", { name: "FREE, free center" }) as HTMLButtonElement).disabled).toBe(true);
    await user.click(screen.getByRole("button", { name: "Item 0" }));
    expect(mocks.toggle).toHaveBeenCalledWith({ roomId, index: 0, expectedDateKey: "2026-11-23" });
    vi.useRealTimers();
  });

  it.each([4, 5] as const)("renders every square in a %i-wide grid", (size) => {
    const largerCard = {
      ...card,
      cells: Array.from({ length: size * size }, (_, index) => ({ index, text: `Square ${index}`, isMarked: false })),
    };
    const largerState = { ...state, room: { ...state.room, gridSize: size, freeCenter: false } };
    mocks.query.mockImplementation((name: string) => name === "rooms:getRoomState" ? largerState : largerCard);
    const { container } = render(<RoomDetails roomId={roomId} />);
    expect(container.querySelector(`.grid-cols-${size}`)?.querySelectorAll("button")).toHaveLength(size * size);
  });

  it("highlights winning cells and celebrates a confirmed winner only once", () => {
    const winningCard = { ...card, hasBingo: true, cells: cells.map((cell) => ({ ...cell, isMarked: cell.index <= 2 || cell.isMarked })) };
    const winningState = { ...state, round: { winner: { id: userId, name: "Alice", imageUrl: null }, wonAt: 1795435200123 } };
    mocks.query.mockImplementation((name: string) => name === "rooms:getRoomState" ? state : winningCard);
    const view = render(<RoomDetails roomId={roomId} />);
    expect(mocks.confetti).not.toHaveBeenCalled();
    mocks.query.mockImplementation((name: string) => name === "rooms:getRoomState" ? winningState : winningCard);
    view.rerender(<RoomDetails roomId={roomId} />);
    expect(screen.getByText(/Alice got BINGO and won today/)).toBeTruthy();
    expect(screen.getByText(/2026-11-23 12:00:00.123 UTC/)).toBeTruthy();
    expect(screen.getByRole("button", { name: "Item 0" }).className).toContain("border-amber-400");
    expect(screen.getByRole("button", { name: "FREE, free center" }).className).not.toContain("border-amber-400");
    view.rerender(<RoomDetails roomId={roomId} />);
    expect(mocks.confetti).toHaveBeenCalledTimes(1);
  });

  it("does not toggle a stale card across UTC midnight", async () => {
    const user = userEvent.setup();
    vi.useFakeTimers({ shouldAdvanceTime: true });
    vi.setSystemTime(new Date("2026-11-24T00:00:00Z"));
    render(<RoomDetails roomId={roomId} />);
    await user.click(screen.getByRole("button", { name: "Item 0" }));
    expect(mocks.toggle).not.toHaveBeenCalled();
    expect(mocks.toastError).toHaveBeenCalledWith(expect.stringContaining("UTC day has changed"));
    vi.useRealTimers();
  });
});

describe("optimistic toggle", () => {
  it("updates the card and only its owner's progress without predicting a winner", () => {
    const getQuery = vi.fn().mockReturnValueOnce(card).mockReturnValueOnce(state);
    const setQuery = vi.fn();
    const store: OptimisticLocalStore = { getQuery, setQuery, getAllQueries: vi.fn() };
    optimisticToggle(store, { roomId, index: 0, expectedDateKey: "2026-11-23" });
    expect(setQuery).toHaveBeenCalledTimes(2);
    expect(getFunctionName(setQuery.mock.calls[0][0])).toBe("rooms:getDailyCard");
    expect(setQuery.mock.calls[0][2].cells[0].isMarked).toBe(true);
    expect(setQuery.mock.calls[1][2].members[0].markedCount).toBe(2);
    expect(setQuery.mock.calls[1][2].members[1].markedCount).toBe(3);
    expect(setQuery.mock.calls[1][2].round).toBeNull();
    expect(card.cells[0].isMarked).toBe(false);
  });

  it("calculates an optimistic bingo without declaring a winner", () => {
    const almostWon = { ...card, cells: cells.map((cell) => ({ ...cell, isMarked: cell.index === 0 || cell.index === 1 || cell.isMarked })) };
    const getQuery = vi.fn().mockReturnValueOnce(almostWon).mockReturnValueOnce(state);
    const setQuery = vi.fn();
    const store: OptimisticLocalStore = { getQuery, setQuery, getAllQueries: vi.fn() };
    optimisticToggle(store, { roomId, index: 2, expectedDateKey: "2026-11-23" });
    expect(setQuery.mock.calls[0][2].hasBingo).toBe(true);
    expect(setQuery.mock.calls[1][2].round).toBeNull();
  });

  describe("UTC countdown", () => {
    it("rolls the date and countdown over at midnight", async () => {
      const { useUtcClock } = await vi.importActual<typeof import("@/lib/use-utc-clock")>("@/lib/use-utc-clock");
      vi.useFakeTimers();
      vi.setSystemTime(new Date("2026-11-23T23:59:59Z"));
      const { result, unmount } = renderHook(() => useUtcClock());
      expect(result.current).toEqual({ dateKey: "2026-11-23", countdown: "00:00:01" });
      act(() => { vi.advanceTimersByTime(1000); });
      expect(result.current).toEqual({ dateKey: "2026-11-24", countdown: "24:00:00" });
      unmount();
      vi.useRealTimers();
    });
  });
});
