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
  auth: { isAuthenticated: true, isLoading: false },
}));

vi.mock("convex/react", () => ({
  useConvexAuth: () => mocks.auth,
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
  mocks.auth = { isAuthenticated: true, isLoading: false };
});
afterEach(cleanup);

describe("room creation", () => {
  it("submits a creator-selected weekly schedule and time zone", async () => {
    const user = userEvent.setup();
    mocks.mutation.mockResolvedValue("room123");
    render(<CreateRoomForm />);
    await user.type(screen.getByLabelText("Room name"), "Weekly game");
    await user.click(screen.getByRole("radio", { name: /3 × 3/i }));
    await user.selectOptions(screen.getByLabelText("Frequency"), "weekly");
    await user.selectOptions(screen.getByLabelText("Day of week"), "5");
    await user.clear(screen.getByLabelText("Reset time"));
    await user.type(screen.getByLabelText("Reset time"), "08:30");
    await user.selectOptions(screen.getByLabelText("Time zone"), "Africa/Johannesburg");
    await user.click(screen.getByText("Bulk paste items"));
    await user.click(screen.getByLabelText("One item per line"));
    await user.paste(Array.from({ length: 9 }, (_, i) => `Item ${i + 1}`).join("\n"));
    await user.click(screen.getByRole("button", { name: /create room/i }));
    await waitFor(() => expect(mocks.mutation).toHaveBeenCalledWith(expect.objectContaining({
      resetSchedule: { frequency: "weekly", time: "08:30", timeZone: "Africa/Johannesburg", dayOfWeek: 5 },
    })));
  });

  it("submits a monthly reset day", async () => {
    const user = userEvent.setup();
    mocks.mutation.mockResolvedValue("room123");
    render(<CreateRoomForm />);
    await user.type(screen.getByLabelText("Room name"), "Monthly game");
    await user.click(screen.getByRole("radio", { name: /3 × 3/i }));
    await user.selectOptions(screen.getByLabelText("Frequency"), "monthly");
    await user.selectOptions(screen.getByLabelText(/Day of month/), "31");
    await user.click(screen.getByText("Bulk paste items"));
    await user.click(screen.getByLabelText("One item per line"));
    await user.paste(Array.from({ length: 9 }, (_, i) => `Item ${i + 1}`).join("\n"));
    await user.click(screen.getByRole("button", { name: /create room/i }));
    await waitFor(() => expect(mocks.mutation).toHaveBeenCalledWith(expect.objectContaining({
      resetSchedule: { frequency: "monthly", time: "00:00", timeZone: "UTC", dayOfMonth: 31 },
    })));
  });

  it("enables a 5×5 room as soon as 25 pasted items are present", async () => {
    const user = userEvent.setup();
    mocks.mutation.mockResolvedValue("room123");
    render(<CreateRoomForm />);
    await user.type(screen.getByLabelText("Room name"), "Daily");
    await user.click(screen.getByText("Bulk paste items"));
    const bulk = screen.getByLabelText("One item per line");
    await user.click(bulk);
    await user.paste(Array.from({ length: 24 }, (_, i) => `Item ${i + 1}`).join("\n"));
    const submit = screen.getByRole("button", { name: /create room/i });
    expect(screen.getByText("24 / 25 items needed")).toBeTruthy();
    expect(submit.hasAttribute("disabled")).toBe(true);
    await user.paste("\nItem 25");
    expect(screen.getByText("25 / 25 items needed")).toBeTruthy();
    expect(submit.hasAttribute("disabled")).toBe(false);
    await user.click(submit);
    await waitFor(() => expect(mocks.mutation).toHaveBeenCalledWith(expect.objectContaining({
      gridSize: 5,
      itemPool: Array.from({ length: 25 }, (_, i) => `Item ${i + 1}`),
    })));
  });

  it("counts and submits uncommitted single and bulk items without duplication", async () => {
    const user = userEvent.setup();
    mocks.mutation.mockResolvedValue("room123");
    render(<CreateRoomForm />);
    await user.type(screen.getByLabelText("Room name"), "Standup");
    await user.click(screen.getByRole("radio", { name: /3 × 3/i }));
    await user.click(screen.getByText("Bulk paste items"));
    await user.type(screen.getByLabelText("One item per line"), Array.from({ length: 8 }, (_, i) => `Item ${i + 1}`).join("\n"));
    expect(screen.getByText("8 / 9 items needed")).toBeTruthy();
    const submit = screen.getByRole("button", { name: /create room/i });
    expect(submit.hasAttribute("disabled")).toBe(true);
    await user.type(screen.getByLabelText("Bingo item pool"), "Final item");
    expect(screen.getByText("9 / 9 items needed")).toBeTruthy();
    expect(submit.hasAttribute("disabled")).toBe(false);
    await user.click(submit);
    await waitFor(() => expect(mocks.mutation).toHaveBeenCalledWith({
      name: "Standup",
      gridSize: 3,
      freeCenter: false,
      resetSchedule: { frequency: "daily", time: "00:00", timeZone: "UTC" },
      itemPool: ["Final item", ...Array.from({ length: 8 }, (_, i) => `Item ${i + 1}`)],
    }));
    await waitFor(() => expect(mocks.push).toHaveBeenCalledWith("/rooms/room123"));
  });

  it("explains when authentication is still connecting or unavailable", async () => {
    mocks.auth = { isAuthenticated: false, isLoading: true };
    const { rerender } = render(<CreateRoomForm />);
    expect(screen.getByRole("status").textContent).toContain("Connecting your session");
    mocks.auth = { isAuthenticated: false, isLoading: false };
    rerender(<CreateRoomForm />);
    expect(screen.getByRole("alert").textContent).toContain("could not connect to Convex");
  });

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
    mocks.query.mockImplementation((name: string) => name === "rooms:getRoomSchedule" ? { frequency: "daily", time: "00:00", timeZone: "UTC" } : name === "rooms:getRoomState" ? {
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
