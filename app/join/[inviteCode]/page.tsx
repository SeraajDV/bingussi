import { JoinInvite } from "@/components/join-invite";

export default async function JoinPage({ params }: { params: Promise<{ inviteCode: string }> }) {
  const { inviteCode } = await params;
  return <JoinInvite inviteCode={inviteCode} />;
}
