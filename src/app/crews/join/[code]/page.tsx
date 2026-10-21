import Link from "next/link";
import { redirect } from "next/navigation";
import { currentUserId } from "@/providers/auth";
import { isDomainError } from "@/domain/shared/types";
import { joinOrOpen } from "@/domain/crews/service";
import { joinCrewInput } from "@/domain/crews/types";

export const metadata = { title: "Join a crew" };

/** Invite link: /crews/join/CODE. Signs you in first if needed, then joins and opens the crew. */
export default async function JoinCrewPage({ params }: { params: Promise<{ code: string }> }): Promise<React.JSX.Element> {
  const { code } = await params;
  const parsed = joinCrewInput.safeParse({ inviteCode: code });
  const userId = await currentUserId();
  if (!userId) redirect(`/login?callbackUrl=${encodeURIComponent(`/crews/join/${code}`)}`);
  let crewId: string | null = null;
  const message = "That invite link doesn’t work any more. Ask the crew owner for a new one.";
  if (parsed.success) {
    try {
      crewId = (await joinOrOpen(userId, parsed.data.inviteCode)).id;
    } catch (e) {
      if (!isDomainError(e)) throw e;
    }
  }
  if (crewId) redirect(`/crews/${crewId}`);
  return (
    <main className="crew-page">
      <h1>Join a crew</h1>
      <p role="alert">{message}</p>
      <Link href="/crews">Back to your crews</Link>
    </main>
  );
}
