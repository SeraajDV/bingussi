import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  numbers: defineTable({
    value: v.number(),
  }),
  users: defineTable({
    clerkId: v.string(),
    tokenIdentifier: v.string(),
    name: v.string(),
    imageUrl: v.optional(v.string()),
    email: v.optional(v.string()),
  }).index("by_tokenIdentifier", ["tokenIdentifier"]),
  rooms: defineTable({
    name: v.string(),
    gridSize: v.union(v.literal(3), v.literal(4), v.literal(5)),
    activeRoundDate: v.string(),
    winnerDate: v.optional(v.string()),
    creatorId: v.optional(v.id("users")),
    inviteCode: v.optional(v.string()),
    freeCenter: v.optional(v.boolean()),
    itemPool: v.optional(v.array(v.string())),
  }).index("by_inviteCode", ["inviteCode"]),
  roomMembers: defineTable({
    roomId: v.id("rooms"),
    tokenIdentifier: v.string(),
    userId: v.optional(v.id("users")),
    joinedAt: v.optional(v.number()),
  })
    .index("by_tokenIdentifier", ["tokenIdentifier"])
    .index("by_roomId_and_tokenIdentifier", ["roomId", "tokenIdentifier"]),
  dailyCards: defineTable({
    roomId: v.id("rooms"),
    userId: v.id("users"),
    dateKey: v.string(),
    cells: v.array(v.object({
      index: v.number(),
      text: v.string(),
      isMarked: v.boolean(),
    })),
    hasBingo: v.boolean(),
  }).index("by_roomId_and_userId_and_dateKey", ["roomId", "userId", "dateKey"]),
  dailyRounds: defineTable({
    roomId: v.id("rooms"),
    dateKey: v.string(),
    winnerUserId: v.optional(v.id("users")),
    wonAt: v.optional(v.number()),
  }).index("by_roomId_and_dateKey", ["roomId", "dateKey"]),
});
