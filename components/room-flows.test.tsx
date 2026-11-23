// @vitest-environment jsdom
import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CreateRoomForm } from "./create-room-form";
import { JoinRoomForm } from "./join-room-form";
import { JoinInvite } from "./join-invite";
import { RoomDetails } from "./room-details";
import type { Id } from "@/convex/_generated/dataModel";
import { getFunctionName } from "convex/server";

const mocks = vi.hoisted(() => ({
  mutation: vi.fn(),
  push: vi.fn(),
  replace: vi.fn(),
  success: vi.fn(),
  error: vi.fn(),
  query: vi.fn(),
}));

vi.mock("convex/react", () => ({
  useConvexAuth: () => ({ isAuthenticated: true, isLoading: false }),
  useMutation: () => Object.assign(mocks.mutation, { withOptimisticUpdate: () => mocks.mutation }),
  useQuery: (reference: Parameters<typeof getFunctionName>[0]) => mocks.query(getFunctionName(reference)),
}));
vi.mock("next/navigation", () => {
  const router = { push: mocks.push, replace: mocks.replace };
  return { useRouter: () => router };
});
vi.mock("sonner", () => ({ toast: { success: mocks.success, error: mocks.error } }));

beforeEach(() => {
  vi.clearAllMocks();
  mocks.mutation.mockReset();
  mocks.query.mockReset();
});
afterEach(cleanup);

describe("room creation", () => {
  it("adds and removes items, enforces the grid minimum, and creates the room", async () => {
    const user = userEvent.setup();
    mocks.mutation.mockResolvedValue("room123");
    render(<CreateRoomForm />);
    const submit = screen.getByRole("button", { name: /create room/i });
    expect(submit.hasAttribute("disabled")).toBe(true);
    await user.type(screen.getByLabelText("Room name"), "Daily Standup Bingo");
    await user.click(screen.getByRole("radio", { name: /3 × 3/i }));
    await user.click(screen.getByRole("checkbox", { name: /free center space/i }));
    await user.type(screen.getByLabelText("Bingo item pool"), "One{enter}");
    expect(screen.getByText("1 / 9 items needed")).toBeTruthy();
    await user.click(screen.getByText("Bulk paste items"));
    await user.type(screen.getByLabelText("One item per line"), Array.from({ length: 8 }, (_, i) => `Item ${i + 2}`).join("\n"));
    await user.click(screen.getByRole("button", { name: /add pasted items/i }));
    expect(screen.getByText("9 / 9 items needed")).toBeTruthy();
    expect(submit.hasAttribute("disabled")).toBe(false);
    await user.click(within(screen.getByRole("list", { name: "Bingo items" })).getByRole("button", { name: /remove one/i }));
    expect(screen.getByText("8 / 9 items needed")).toBeTruthy();
    expect(submit.hasAttribute("disabled")).toBe(true);
    await user.type(screen.getByLabelText("Bingo item pool"), "Replacement{enter}");
    await user.click(submit);
    await waitFor(() => expect(mocks.mutation).toHaveBeenCalledWith(expect.objectContaining({
      name: "Daily Standup Bingo", gridSize: 3, freeCenter: true,
      itemPool: expect.arrayContaining(["Replacement", "Item 2"]),
    })));
    await waitFor(() => expect(mocks.push).toHaveBeenCalledWith("/rooms/room123"));
  });

  it("disables and clears the free center for 4×4, and updates the minimum", async () => {
    const user = userEvent.setup();
    render(<CreateRoomForm />);
    const toggle = screen.getByRole("checkbox", { name: /free center space/i }) as HTMLInputElement;
    await user.click(toggle);
    expect(toggle.checked).toBe(true);
    await user.click(screen.getByRole("radio", { name: /4 × 4/i }));
    expect(toggle.disabled).toBe(true);
    expect(toggle.checked).toBe(false);
    expect(screen.getByText("0 / 16 items needed")).toBeTruthy();
    await user.click(screen.getByRole("radio", { name: /5 × 5/i }));
    expect(toggle.disabled).toBe(false);
    expect(screen.getByText("0 / 25 items needed")).toBeTruthy();
  });

  it("submits a 4×4 room with the free center disabled", async () => {
    const user = userEvent.setup();
    mocks.mutation.mockResolvedValue("room789");
    render(<CreateRoomForm />);
    await user.type(screen.getByLabelText("Room name"), "Even grid");
    await user.click(screen.getByRole("checkbox", { name: /free center space/i }));
    await user.click(screen.getByRole("radio", { name: /4 × 4/i }));
    await user.click(screen.getByText("Bulk paste items"));
    await user.type(screen.getByLabelText("One item per line"), Array.from({ length: 16 }, (_, i) => `Item ${i + 1}`).join("\n"));
    await user.click(screen.getByRole("button", { name: /add pasted items/i }));
    await user.click(screen.getByRole("button", { name: /create room/i }));
    await waitFor(() => expect(mocks.mutation).toHaveBeenCalledWith(expect.objectContaining({
      gridSize: 4, freeCenter: false, itemPool: expect.arrayContaining(["Item 1", "Item 16"]),
    })));
    await waitFor(() => expect(mocks.push).toHaveBeenCalledWith("/rooms/room789"));
  });
});

describe("room invitations", () => {
  it("joins from the dashboard and redirects to the returned room", async () => {
    const user = userEvent.setup();
    mocks.mutation.mockResolvedValue("room123");
    render(<JoinRoomForm />);
    await user.type(screen.getByLabelText("Join via code"), "abc234");
    await user.click(screen.getByRole("button", { name: /join room/i }));
    await waitFor(() => expect(mocks.mutation).toHaveBeenCalledWith({ inviteCode: "ABC234" }));
    await waitFor(() => expect(mocks.push).toHaveBeenCalledWith("/rooms/room123"));
  });

  it("joins automatically from a link and shows a retryable failure", async () => {
    const user = userEvent.setup();
    mocks.mutation.mockRejectedValueOnce(new Error("Invite code not found.")).mockResolvedValueOnce("room456");
    render(<JoinInvite inviteCode="ABC234" />);
    expect((await screen.findByRole("alert")).textContent).toContain("Invite code not found.");
    await user.click(screen.getByRole("button", { name: "Try again" }));
    await waitFor(() => expect(mocks.replace).toHaveBeenCalledWith("/rooms/room456"));
    expect(mocks.mutation).toHaveBeenCalledTimes(2);
  });

  it("shares the room's invitation link", async () => {
    const user = userEvent.setup();
    mocks.query.mockImplementation((name: string) => name === "rooms:getRoomState" ? {
      room: { name: "Team", gridSize: 3, inviteCode: "ABC234" },
      members: [],
      round: null,
    } : undefined);
    const copy = vi.spyOn(navigator.clipboard, "writeText").mockResolvedValue();
    render(<RoomDetails roomId={"room123" as Id<"rooms">} />);
    await user.click(await screen.findByRole("button", { name: /copy invite link/i }));
    expect(copy).toHaveBeenCalledWith(`${window.location.origin}/join/ABC234`);
    expect(mocks.success).toHaveBeenCalledWith("Invite link copied!");
    copy.mockRestore();
  });
});
