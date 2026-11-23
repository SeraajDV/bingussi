import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  numbers: defineTable({
    value: v.number(),
  }),
  rooms: defineTable({
    name: v.string(),
    gridSize: v.union(v.literal(3), v.literal(4), v.literal(5)),
    activeRoundDate: v.string(),
    winnerDate: v.optional(v.string()),
  }),
  roomMembers: defineTable({
    roomId: v.id("rooms"),
    tokenIdentifier: v.string(),
  }).index("by_tokenIdentifier", ["tokenIdentifier"]),
});
