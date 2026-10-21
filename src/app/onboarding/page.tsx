import { Onboarding } from "./Onboarding";

export const metadata = { title: "How it works" };

export default async function OnboardingPage({ searchParams }: { searchParams: Promise<{ next?: string }> }): Promise<React.JSX.Element> {
  const { next } = await searchParams;
  return <Onboarding next={next && next.startsWith("/") && !next.startsWith("//") ? next : "/crews"} />;
}
