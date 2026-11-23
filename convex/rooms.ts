import { paginationOptsValidator, paginationResultValidator } from "convex/server";
import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

const gridSize = v.union(v.literal(3), v.literal(4), v.literal(5));
const roomSummary = v.object({
  id: v.id("rooms"),
  name: v.string(),
  gridSize,
  activeRoundDate: v.string(),
  winnerDate: v.union(v.string(), v.null()),
});

export const listMine = query({
  args: { paginationOpts: paginationOptsValidator },
  returns: paginationResultValidator(roomSummary),
  handler: async (ctx, { paginationOpts }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("You must be signed in to view your rooms.");

    const memberships = await ctx.db
      .query("roomMembers")
      .withIndex("by_tokenIdentifier", (q) =>
        q.eq("tokenIdentifier", identity.tokenIdentifier),
      )
      .order("desc")
      .paginate(paginationOpts);

    const page = await Promise.all(
      memberships.page.map(async ({ roomId }) => {
        const room = await ctx.db.get("rooms", roomId);
        if (!room) throw new Error("A room membership points to a missing room.");
        return {
          id: room._id,
          name: room.name,
          gridSize: room.gridSize,
          activeRoundDate: room.activeRoundDate,
          winnerDate: room.winnerDate ?? null,
        };
      }),
    );
    return { ...memberships, page };
  },
});

export const create = mutation({
  args: { name: v.string(), gridSize },
  returns: v.id("rooms"),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("You must be signed in to create a room.");
    const name = args.name.trim();
    if (name.length < 1 || name.length > 60) {
      throw new Error("Room names must be between 1 and 60 characters.");
    }

    const roomId = await ctx.db.insert("rooms", {
      name,
      gridSize: args.gridSize,
      activeRoundDate: new Date().toISOString().slice(0, 10),
    });
    await ctx.db.insert("roomMembers", {
      roomId,
      tokenIdentifier: identity.tokenIdentifier,
    });
    return roomId;
  },
});
