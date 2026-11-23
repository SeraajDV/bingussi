import type { OptimisticLocalStore } from "convex/browser";
import type { FunctionArgs } from "convex/server";
import { api } from "@/convex/_generated/api";
import { hasBingo } from "@/convex/lib/bingo";

export function optimisticToggle(
  store: OptimisticLocalStore,
  { roomId, index, expectedDateKey }: FunctionArgs<typeof api.rooms.toggleCell>,
) {
  if (!expectedDateKey) return;
  const args = { roomId, dateKey: expectedDateKey };
  const card = store.getQuery(api.rooms.getDailyCard, args);
  if (!card || !card.cells.some((cell) => cell.index === index)) return;

  const cells = card.cells.map((cell) =>
    cell.index === index ? { ...cell, isMarked: !cell.isMarked } : cell,
  );
  const bingo = hasBingo(cells, Math.sqrt(cells.length));
  store.setQuery(api.rooms.getDailyCard, args, { ...card, cells, hasBingo: bingo });

  const state = store.getQuery(api.rooms.getRoomState, args);
  if (state) {
    const markedCount = cells.filter((cell) => cell.isMarked).length;
    store.setQuery(api.rooms.getRoomState, args, {
      ...state,
      members: state.members.map((member) => member.user?.id === card.userId
        ? { ...member, markedCount, hasBingo: bingo }
        : member),
    });
  }
}
