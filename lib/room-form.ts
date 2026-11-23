import { z } from "zod";

export const roomFormSchema = z.object({
  name: z.string().trim().min(1, "Enter a room name.").max(60, "Use 60 characters or fewer."),
  gridSize: z.union([z.literal(3), z.literal(4), z.literal(5)]),
  freeCenter: z.boolean(),
  itemPool: z.array(z.string().trim().min(1)),
}).superRefine((values, ctx) => {
  if (values.freeCenter && values.gridSize % 2 === 0) {
    ctx.addIssue({ code: "custom", path: ["freeCenter"], message: "Only odd grids have a center space." });
  }
  if (values.itemPool.length < values.gridSize * values.gridSize) {
    ctx.addIssue({ code: "custom", path: ["itemPool"], message: `Add at least ${values.gridSize * values.gridSize} items.` });
  }
});

export type RoomFormValues = z.infer<typeof roomFormSchema>;
