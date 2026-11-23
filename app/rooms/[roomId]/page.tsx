import { RoomDetails } from "@/components/room-details";
import type { Id } from "@/convex/_generated/dataModel";

export default async function RoomPage({ params }: { params: Promise<{ roomId: string }> }) {
  const { roomId } = await params;
  return <RoomDetails roomId={roomId as Id<"rooms">} />;
}
