"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useConvexAuth, useMutation } from "convex/react";
import { ArrowRight, Plus, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useSyncExternalStore } from "react";
import { useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { api } from "@/convex/_generated/api";
import { draftItems, formResetSchedule, roomFormSchema, type RoomFormValues } from "@/lib/room-form";

const fieldClass = "w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 text-sm text-white outline-none placeholder:text-zinc-600 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/20";
const utcOnly = ["UTC"];
const availableTimeZones = typeof Intl.supportedValuesOf === "function" ? ["UTC", ...Intl.supportedValuesOf("timeZone")] : utcOnly;
const subscribeTimeZones = () => () => {};
const getTimeZones = () => availableTimeZones;
const getServerTimeZones = () => utcOnly;

export function CreateRoomForm() {
  const { isAuthenticated, isLoading } = useConvexAuth();
  const createRoom = useMutation(api.rooms.createRoom);
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);
  const timeZones = useSyncExternalStore(subscribeTimeZones, getTimeZones, getServerTimeZones);
  const form = useForm<RoomFormValues>({
    resolver: zodResolver(roomFormSchema),
    defaultValues: { name: "", gridSize: 5, freeCenter: false, itemPool: [], draftItem: "", bulkItems: "", resetFrequency: "daily", resetTime: "00:00", resetTimeZone: "UTC", resetDayOfWeek: 1, resetDayOfMonth: 1 },
    mode: "onChange",
  });
  const { register, control, setValue, handleSubmit, formState: { errors, isSubmitting } } = form;
  const gridSize = useWatch({ control, name: "gridSize" });
  const itemPool = useWatch({ control, name: "itemPool" });
  const name = useWatch({ control, name: "name" });
  const freeCenter = useWatch({ control, name: "freeCenter" });
  const item = useWatch({ control, name: "draftItem" });
  const bulkItems = useWatch({ control, name: "bulkItems" });
  const resetFrequency = useWatch({ control, name: "resetFrequency" });
  const minimum = gridSize * gridSize;
  const itemCount = itemPool.length + draftItems(item, bulkItems).length;

  function addItems(items: string[]) {
    const cleaned = items.map((value) => value.trim()).filter(Boolean);
    if (cleaned.length) setValue("itemPool", [...itemPool, ...cleaned], { shouldDirty: true, shouldValidate: true });
  }

  async function onSubmit(values: RoomFormValues) {
    setServerError(null);
    try {
      const { name, gridSize, freeCenter, draftItem, bulkItems, itemPool } = values;
      const roomId = await createRoom({ name, gridSize, freeCenter, resetSchedule: formResetSchedule(values), itemPool: [...itemPool, ...draftItems(draftItem, bulkItems)] });
      toast.success("Room created!");
      router.push(`/rooms/${roomId}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Could not create your room. Please try again.";
      setServerError(message);
      toast.error(message);
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="mt-8 rounded-2xl border border-zinc-800 bg-zinc-900/70 p-6 sm:p-8">
      <label htmlFor="room-name" className="text-sm font-medium text-zinc-200">Room name</label>
      <input id="room-name" maxLength={60} placeholder="e.g. Daily Standup Bingo" className={`${fieldClass} mt-2 h-11`} aria-invalid={!!errors.name} aria-describedby={errors.name ? "room-name-error" : undefined} {...register("name")} />
      {errors.name && <p id="room-name-error" role="alert" className="mt-2 text-sm text-red-400">{errors.name.message}</p>}

      <fieldset className="mt-7">
        <legend className="text-sm font-medium text-zinc-200">Grid size</legend>
        <div className="mt-2 grid grid-cols-3 gap-3">
          {([3, 4, 5] as const).map((size) => (
            <label key={size} className={`cursor-pointer rounded-xl border px-2 py-4 text-center transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-emerald-400 ${gridSize === size ? "border-emerald-400 bg-emerald-400/10 text-emerald-300" : "border-zinc-700 text-zinc-300 hover:border-zinc-500"}`}>
              <input type="radio" name="gridSize" value={size} checked={gridSize === size} onChange={() => {
                setValue("gridSize", size, { shouldDirty: true, shouldValidate: true });
                if (size % 2 === 0) setValue("freeCenter", false, { shouldDirty: true, shouldValidate: true });
              }} className="sr-only" />
              <span className="block text-base font-semibold">{size} × {size}</span>
              <span className="mt-1 block text-xs text-zinc-400">{size * size} items</span>
            </label>
          ))}
        </div>
      </fieldset>

      <label className={`mt-6 flex items-center justify-between gap-4 rounded-xl border border-zinc-800 bg-zinc-950/50 p-4 ${gridSize % 2 === 0 ? "text-zinc-500" : "text-zinc-200"}`}>
        <span><span className="block text-sm font-medium">Free Center Space</span><span className="mt-1 block text-xs text-zinc-500">Available on odd-sized grids.</span></span>
        <input type="checkbox" disabled={gridSize % 2 === 0} checked={freeCenter} onChange={(event) => setValue("freeCenter", event.target.checked, { shouldDirty: true, shouldValidate: true })} className="size-4 accent-emerald-400" />
      </label>

      <fieldset className="mt-8">
        <legend className="text-sm font-medium text-zinc-200">Card reset schedule</legend>
        <p className="mt-2 text-xs leading-5 text-zinc-500">The same schedule applies to everyone in the room and is set when you create it.</p>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <label className="text-xs font-medium text-zinc-300">Frequency
            <select {...register("resetFrequency")} className={`${fieldClass} mt-2 h-11`}>
              <option value="daily">Daily</option><option value="weekly">Weekly</option><option value="monthly">Monthly</option>
            </select>
          </label>
          <label className="text-xs font-medium text-zinc-300">Reset time
            <input type="time" {...register("resetTime")} className={`${fieldClass} mt-2 h-11`} />
          </label>
          {resetFrequency === "weekly" && <label className="text-xs font-medium text-zinc-300">Day of week
            <select {...register("resetDayOfWeek", { valueAsNumber: true })} className={`${fieldClass} mt-2 h-11`}>
              {["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"].map((day, i) => <option key={day} value={i + 1}>{day}</option>)}
            </select>
          </label>}
          {resetFrequency === "monthly" && <label className="text-xs font-medium text-zinc-300">Day of month
            <select {...register("resetDayOfMonth", { valueAsNumber: true })} className={`${fieldClass} mt-2 h-11`}>
              {Array.from({ length: 31 }, (_, i) => <option key={i + 1} value={i + 1}>{i + 1}</option>)}
            </select>
            <span className="mt-1 block text-zinc-500">Shorter months reset on their last day.</span>
          </label>}
          <label className="text-xs font-medium text-zinc-300">Time zone
            {timeZones.length > 1 ? <select {...register("resetTimeZone")} className={`${fieldClass} mt-2 h-11`}>
              {timeZones.map((zone) => <option key={zone} value={zone}>{zone}</option>)}
            </select> : <input {...register("resetTimeZone")} placeholder="e.g. Africa/Johannesburg" className={`${fieldClass} mt-2 h-11`} />}
          </label>
        </div>
        {errors.resetTime && <p role="alert" className="mt-3 text-sm text-red-400">{errors.resetTime.message}</p>}
      </fieldset>

      <div className="mt-8 flex flex-wrap items-center justify-between gap-2">
        <label htmlFor="new-item" className="text-sm font-medium text-zinc-200">Bingo item pool</label>
        <span aria-live="polite" className={`rounded-full border px-2.5 py-1 text-xs font-medium ${itemCount >= minimum ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-300" : "border-zinc-700 bg-zinc-800 text-zinc-300"}`}>{itemCount} / {minimum} items needed</span>
      </div>
      <p className="mt-2 text-xs leading-5 text-zinc-500">Add one at a time or paste a list. Draft text is included when you create the room.</p>
      <div className="mt-3 flex gap-2">
        <input id="new-item" {...register("draftItem")} onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.preventDefault();
            addItems([item]);
            setValue("draftItem", "", { shouldDirty: true, shouldValidate: true });
          }
        }} placeholder="Type an item and press Enter" className={`${fieldClass} h-11 min-w-0`} />
        <Button type="button" variant="outline" className="h-11 px-4" disabled={!item.trim()} onClick={() => { addItems([item]); setValue("draftItem", "", { shouldDirty: true, shouldValidate: true }); }}><Plus className="size-4" /> Add</Button>
      </div>
      {itemPool.length > 0 && (
        <ul aria-label="Bingo items" className="mt-4 flex max-h-56 flex-wrap gap-2 overflow-y-auto">
          {itemPool.map((value, index) => (
            <li key={`${index}-${value}`} className="flex max-w-full items-center gap-1 rounded-full border border-zinc-700 bg-zinc-800 px-3 py-1 text-sm text-zinc-200">
              <span className="break-all">{value}</span>
              <button type="button" aria-label={`Remove ${value}, item ${index + 1}`} className="rounded-full p-1 text-zinc-400 hover:text-white focus-visible:outline-2 focus-visible:outline-emerald-400" onClick={() => setValue("itemPool", itemPool.filter((_, i) => i !== index), { shouldDirty: true, shouldValidate: true })}><X className="size-3.5" /></button>
            </li>
          ))}
        </ul>
      )}
      <details className="mt-5 rounded-xl border border-zinc-800 bg-zinc-950/50 p-4">
        <summary className="cursor-pointer text-sm font-medium text-zinc-300">Bulk paste items</summary>
        <label htmlFor="bulk-items" className="mt-4 block text-xs text-zinc-400">One item per line</label>
        <textarea id="bulk-items" rows={5} {...register("bulkItems")} placeholder={"First item\nSecond item\nThird item"} className={`${fieldClass} mt-2 py-3`} />
        <Button type="button" variant="outline" className="mt-3" disabled={!bulkItems.trim()} onClick={() => { addItems(bulkItems.split(/\r?\n/)); setValue("bulkItems", "", { shouldDirty: true, shouldValidate: true }); }}>Add pasted items</Button>
      </details>
      {errors.itemPool && <p role="alert" className="mt-3 text-sm text-red-400">{errors.itemPool.message}</p>}
      {serverError && <p role="alert" className="mt-5 text-sm text-red-400">{serverError}</p>}
      {isLoading ? <p role="status" className="mt-5 text-sm text-zinc-400">Connecting your session...</p> : !isAuthenticated && <p role="alert" className="mt-5 text-sm text-red-400">Your session could not connect to Convex. Check your connection or sign out and sign in again.</p>}
      {!name.trim() && <p className="mt-5 text-sm text-zinc-400">Enter a room name to continue.</p>}
      <Button type="submit" disabled={!isAuthenticated || isSubmitting || !name.trim() || itemCount < minimum} className="mt-8 h-11 w-full font-semibold">{isSubmitting ? "Creating room..." : "Create room"} <ArrowRight className="size-4" /></Button>
    </form>
  );
}
