import { z } from "zod";
import { validateResetSchedule, type ResetSchedule } from "./reset-schedule";

type ResetFields = {
  resetFrequency: "daily" | "weekly" | "monthly";
  resetTime: string;
  resetTimeZone: string;
  resetDayOfWeek: number;
  resetDayOfMonth: number;
};

export function formResetSchedule(values: ResetFields): ResetSchedule {
  const common = { time: values.resetTime, timeZone: values.resetTimeZone };
  if (values.resetFrequency === "weekly") return { ...common, frequency: "weekly", dayOfWeek: values.resetDayOfWeek };
  if (values.resetFrequency === "monthly") return { ...common, frequency: "monthly", dayOfMonth: values.resetDayOfMonth };
  return { ...common, frequency: "daily" };
}

export function draftItems(item: string, bulkItems: string): string[] {
  return [item, ...bulkItems.split(/\r?\n/)].map((value) => value.trim()).filter(Boolean);
}

export const roomFormSchema = z.object({
  name: z.string().trim().min(1, "Enter a room name.").max(60, "Use 60 characters or fewer."),
  gridSize: z.union([z.literal(3), z.literal(4), z.literal(5)]),
  freeCenter: z.boolean(),
  itemPool: z.array(z.string().trim().min(1)),
  draftItem: z.string(),
  bulkItems: z.string(),
  resetFrequency: z.enum(["daily", "weekly", "monthly"]),
  resetTime: z.string(),
  resetTimeZone: z.string(),
  resetDayOfWeek: z.number(),
  resetDayOfMonth: z.number(),
}).superRefine((values, ctx) => {
  try {
    validateResetSchedule(formResetSchedule(values));
  } catch (error) {
    if (!(error instanceof Error)) throw error;
    ctx.addIssue({ code: "custom", path: ["resetTime"], message: error.message });
  }
  if (values.freeCenter && values.gridSize % 2 === 0) {
    ctx.addIssue({ code: "custom", path: ["freeCenter"], message: "Only odd grids have a center space." });
  }
  if (values.itemPool.length + draftItems(values.draftItem, values.bulkItems).length < values.gridSize * values.gridSize) {
    ctx.addIssue({ code: "custom", path: ["itemPool"], message: `Add at least ${values.gridSize * values.gridSize} items.` });
  }
});

export type RoomFormValues = z.infer<typeof roomFormSchema>;
