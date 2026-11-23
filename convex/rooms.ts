import { paginationOptsValidator, paginationResultValidator } from "convex/server";
import { v } from "convex/values";
import { mutation, query, type MutationCtx, type QueryCtx } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import schema from "./schema";
import { hasBingo, makeCells } from "./lib/bingo";

const gridSize = v.union(v.literal(3), v.literal(4), v.literal(5));
const roomSummary = v.object({
  id: v.id("rooms"),
  name: v.string(),
  gridSize,
  activeRoundDate: v.string(),
  winnerDate: v.union(v.string(), v.null()),
});

function todayUtc() {
  return new Date().toISOString().slice(0, 10);
}

function currentDateKey(expectedDateKey?: string) {
  const dateKey = todayUtc();
  if (expectedDateKey !== undefined && expectedDateKey !== dateKey) {
    throw new Error("The UTC day has changed or your device clock is incorrect. Refresh and check your clock.");
  }
  return dateKey;
}

function validateDateKey(dateKey: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateKey)) throw new Error("Invalid UTC date key.");
  const date = new Date(`${dateKey}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== dateKey) {
    throw new Error("Invalid UTC date key.");
  }
}

async function requireIdentity(ctx: QueryCtx | MutationCtx) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) throw new Error("You must be signed in.");
  return identity;
}

async function syncUser(ctx: MutationCtx) {
  const identity = await requireIdentity(ctx);
  const existing = await ctx.db.query("users")
    .withIndex("by_tokenIdentifier", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
    .unique();
  const profile = {
    clerkId: identity.subject,
    tokenIdentifier: identity.tokenIdentifier,
    name: identity.name ?? existing?.name ?? "Bingo player",
    imageUrl: identity.pictureUrl ?? existing?.imageUrl,
    email: identity.email ?? existing?.email,
  };
  if (existing) {
    await ctx.db.patch("users", existing._id, profile);
    return existing._id;
  }
  return await ctx.db.insert("users", profile);
}

async function requireMember(ctx: QueryCtx | MutationCtx, roomId: Id<"rooms">) {
  const identity = await requireIdentity(ctx);
  const room = await ctx.db.get("rooms", roomId);
  if (!room) throw new Error("Room not found.");
  const member = await ctx.db.query("roomMembers")
    .withIndex("by_roomId_and_tokenIdentifier", (q) =>
      q.eq("roomId", roomId).eq("tokenIdentifier", identity.tokenIdentifier))
    .unique();
  if (!member) throw new Error("You are not a member of this room.");
  return { room, member };
}

async function getCard(ctx: QueryCtx | MutationCtx, roomId: Id<"rooms">, userId: Id<"users">, dateKey: string) {
  return await ctx.db.query("dailyCards")
    .withIndex("by_roomId_and_userId_and_dateKey", (q) =>
      q.eq("roomId", roomId).eq("userId", userId).eq("dateKey", dateKey))
    .unique();
}

async function getRound(ctx: QueryCtx | MutationCtx, roomId: Id<"rooms">, dateKey: string) {
  return await ctx.db.query("dailyRounds")
    .withIndex("by_roomId_and_dateKey", (q) => q.eq("roomId", roomId).eq("dateKey", dateKey))
    .unique();
}

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

export const createRoom = mutation({
  args: { name: v.string(), gridSize, freeCenter: v.optional(v.boolean()), itemPool: v.array(v.string()) },
  returns: v.id("rooms"),
  handler: async (ctx, args) => {
    const name = args.name.trim();
    if (name.length < 1 || name.length > 60) {
      throw new Error("Room names must be between 1 and 60 characters.");
    }
    const itemPool = args.itemPool.map((item) => item.trim());
    if (itemPool.length < args.gridSize * args.gridSize || itemPool.some((item) => !item)) {
      throw new Error("The item pool must contain enough non-empty items for the grid.");
    }
    if (args.freeCenter && args.gridSize % 2 === 0) {
      throw new Error("A free center is only available for odd-sized grids.");
    }
    const userId = await syncUser(ctx);
    const identity = await requireIdentity(ctx);
    const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let inviteCode: string | undefined;
    for (let attempt = 0; attempt < 16; attempt++) {
      const code = Array.from({ length: 6 }, () => alphabet[Math.floor(Math.random() * alphabet.length)]).join("");
      const existing = await ctx.db.query("rooms").withIndex("by_inviteCode", (q) => q.eq("inviteCode", code)).unique();
      if (!existing) {
        inviteCode = code;
        break;
      }
    }
    if (!inviteCode) throw new Error("Could not generate an invite code. Please try again.");
    const roomId = await ctx.db.insert("rooms", {
      name,
      gridSize: args.gridSize,
      activeRoundDate: todayUtc(),
      creatorId: userId,
      inviteCode,
      freeCenter: args.freeCenter ?? false,
      itemPool,
    });
    await ctx.db.insert("roomMembers", {
      roomId,
      tokenIdentifier: identity.tokenIdentifier,
      userId,
      joinedAt: Date.now(),
    });
    return roomId;
  },
});

export const joinRoom = mutation({
  args: { inviteCode: v.string() },
  returns: v.id("rooms"),
  handler: async (ctx, { inviteCode }) => {
    const identity = await requireIdentity(ctx);
    const room = await ctx.db.query("rooms")
      .withIndex("by_inviteCode", (q) => q.eq("inviteCode", inviteCode.trim().toUpperCase()))
      .unique();
    if (!room) throw new Error("Invite code not found.");
    const userId = await syncUser(ctx);
    const member = await ctx.db.query("roomMembers")
      .withIndex("by_roomId_and_tokenIdentifier", (q) =>
        q.eq("roomId", room._id).eq("tokenIdentifier", identity.tokenIdentifier))
      .unique();
    if (!member) {
      await ctx.db.insert("roomMembers", { roomId: room._id, userId, tokenIdentifier: identity.tokenIdentifier, joinedAt: Date.now() });
    } else if (!member.userId) {
      await ctx.db.patch("roomMembers", member._id, { userId, joinedAt: member.joinedAt ?? Date.now() });
    }
    return room._id;
  },
});

export const getDailyCard = query({
  args: { roomId: v.id("rooms"), dateKey: v.string() },
  returns: v.union(schema.doc("dailyCards"), v.null()),
  handler: async (ctx, { roomId, dateKey }) => {
    validateDateKey(dateKey);
    const { member } = await requireMember(ctx, roomId);
    return member.userId ? await getCard(ctx, roomId, member.userId, dateKey) : null;
  },
});

export const getOrGenerateDailyCard = mutation({
  args: { roomId: v.id("rooms"), expectedDateKey: v.optional(v.string()) },
  returns: schema.doc("dailyCards"),
  handler: async (ctx, { roomId, expectedDateKey }) => {
    const { room, member } = await requireMember(ctx, roomId);
    const dateKey = currentDateKey(expectedDateKey);
    if (!room.itemPool || room.itemPool.length < room.gridSize * room.gridSize) {
      throw new Error("This older room needs an item pool before it can be played.");
    }
    const userId = await syncUser(ctx);
    if (!member.userId) await ctx.db.patch("roomMembers", member._id, { userId, joinedAt: member.joinedAt ?? Date.now() });
    const existing = await getCard(ctx, roomId, userId, dateKey);
    if (existing) return existing;
    const cardId = await ctx.db.insert("dailyCards", {
      roomId, userId, dateKey,
      cells: makeCells(room.itemPool, room.gridSize, room.freeCenter ?? false),
      hasBingo: false,
    });
    if (!await getRound(ctx, roomId, dateKey)) await ctx.db.insert("dailyRounds", { roomId, dateKey });
    if (room.activeRoundDate !== dateKey) await ctx.db.patch("rooms", roomId, { activeRoundDate: dateKey });
    const card = await ctx.db.get("dailyCards", cardId);
    if (!card) throw new Error("Failed to create daily card.");
    return card;
  },
});

export const toggleCell = mutation({
  args: { roomId: v.id("rooms"), index: v.number(), expectedDateKey: v.optional(v.string()) },
  returns: schema.doc("dailyCards"),
  handler: async (ctx, { roomId, index, expectedDateKey }) => {
    const { room, member } = await requireMember(ctx, roomId);
    const dateKey = currentDateKey(expectedDateKey);
    if (!Number.isInteger(index) || index < 0 || index >= room.gridSize * room.gridSize) {
      throw new Error("Invalid cell index.");
    }
    if (room.freeCenter && index === Math.floor(room.gridSize * room.gridSize / 2)) {
      throw new Error("The free center cannot be unmarked.");
    }
    if (!member.userId) throw new Error("Generate your daily card first.");
    const card = await getCard(ctx, roomId, member.userId, dateKey);
    if (!card) throw new Error("Generate your daily card first.");
    const cells = card.cells.map((cell) => cell.index === index ? { ...cell, isMarked: !cell.isMarked } : cell);
    const bingo = hasBingo(cells, room.gridSize);
    await ctx.db.patch("dailyCards", card._id, { cells, hasBingo: bingo });
    if (bingo) {
      const round = await getRound(ctx, roomId, dateKey);
      if (!round) {
        await ctx.db.insert("dailyRounds", { roomId, dateKey, winnerUserId: member.userId, wonAt: Date.now() });
        await ctx.db.patch("rooms", roomId, { activeRoundDate: dateKey, winnerDate: dateKey });
      } else if (!round.winnerUserId) {
        await ctx.db.patch("dailyRounds", round._id, { winnerUserId: member.userId, wonAt: Date.now() });
        await ctx.db.patch("rooms", roomId, { activeRoundDate: dateKey, winnerDate: dateKey });
      }
    }
    return { ...card, cells, hasBingo: bingo };
  },
});

const publicUser = v.object({ id: v.id("users"), name: v.string(), imageUrl: v.union(v.string(), v.null()) });

export const getRoomState = query({
  args: { roomId: v.id("rooms"), dateKey: v.string() },
  returns: v.object({
    room: schema.doc("rooms"),
    members: v.array(v.object({
      user: v.union(publicUser, v.null()),
      joinedAt: v.union(v.number(), v.null()),
      markedCount: v.number(),
      totalCells: v.number(),
      hasBingo: v.boolean(),
    })),
    round: v.union(v.object({
      dateKey: v.string(),
      winner: v.union(publicUser, v.null()),
      wonAt: v.union(v.number(), v.null()),
    }), v.null()),
  }),
  handler: async (ctx, { roomId, dateKey }) => {
    validateDateKey(dateKey);
    const { room } = await requireMember(ctx, roomId);
    const memberships = await ctx.db.query("roomMembers").withIndex("by_roomId_and_tokenIdentifier", (q) => q.eq("roomId", roomId)).collect();
    const toPublicUser = (user: { _id: Id<"users">; name: string; imageUrl?: string }) =>
      ({ id: user._id, name: user.name, imageUrl: user.imageUrl ?? null });
    const members = await Promise.all(memberships.map(async (member) => {
      const user = member.userId ? await ctx.db.get("users", member.userId) : null;
      if (member.userId && !user) throw new Error("A room membership points to a missing user.");
      const card = member.userId ? await getCard(ctx, roomId, member.userId, dateKey) : null;
      return {
        user: user ? toPublicUser(user) : null,
        joinedAt: member.joinedAt ?? null,
        markedCount: card?.cells.filter((cell) => cell.isMarked).length ?? 0,
        totalCells: room.gridSize * room.gridSize,
        hasBingo: card?.hasBingo ?? false,
      };
    }));
    const round = await getRound(ctx, roomId, dateKey);
    const winner = round?.winnerUserId ? await ctx.db.get("users", round.winnerUserId) : null;
    if (round?.winnerUserId && !winner) throw new Error("A round points to a missing winner.");
    return {
      room,
      members,
      round: round ? { dateKey, winner: winner ? toPublicUser(winner) : null, wonAt: round.wonAt ?? null } : null,
    };
  },
});
