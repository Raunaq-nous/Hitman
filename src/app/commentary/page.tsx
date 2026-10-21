import LiveMatchCenter from "@/components/LiveMatchCenter";

export const metadata = { title: "Cricket scores" };

export default function CommentaryPage(): React.JSX.Element {
  return (
    <main className="legacy-dark" style={{ maxWidth: "56rem", margin: "0 auto" }}>
      <header style={{ textAlign: "center", margin: "1rem 0 1.5rem" }}>
        <h1 style={{ margin: 0, font: "800 var(--step-3)/1.1 var(--font-display)", fontStretch: "72%" }}>Cricket scores</h1>
        <p style={{ margin: ".5rem 0 0", color: "var(--mist)" }}>
          From CricketData.org, a third-party aggregator. This is not a licensed live feed: scores can lag, and each update shows when we fetched it.
        </p>
      </header>
      <LiveMatchCenter />
    </main>
  );
}
