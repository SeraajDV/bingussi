import { redirect } from "next/navigation";

export default function CreateRoomRedirect() {
  redirect("/rooms/new");
}
