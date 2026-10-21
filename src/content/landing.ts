// Landing copy. Describes only what ships, and labels what is still in development. No statistics.
export type SportKey = "cricket" | "basketball" | "football" | "f1" | "tennis";
export type PersonaKey = "opener" | "closer" | "architect" | "professor" | "iceman";

export const ROSTER_COPY: Record<PersonaKey, { mentality: string; tool: string }> = {
  opener: { mentality: "Timing over force. Turn a start into something enormous.", tool: "Over Call: the overs that swing a chase and the bowling choices behind them." },
  closer: { mentality: "Study the film until nothing surprises you, then want the last shot.", tool: "Clutch time: which late-game choices carry the most weight." },
  architect: { mentality: "See the pass before it exists.", tool: "Possession value: how build-up choices change the chance of a goal." },
  professor: { mentality: "Take only the risk the race demands.", tool: "Pit window: when stopping first beats staying out." },
  iceman: { mentality: "Nothing changes on the big points.", tool: "Pressure Index: how much each point matters to the match." },
};

export const LIVE_NOW = [
  { title: "Crews", body: "Private groups for you and your friends, joined by invite link or code. Owners can rotate codes, remove members and hand over.", href: "/crews", cta: "Start a crew" },
  { title: "How calls are graded", body: "A short walkthrough of making a call, grading the decision rather than the luck, and choosing your sports and language.", href: "/onboarding", cta: "See how it works" },
  { title: "Cricket scores", body: "Scores from a third-party aggregator, clearly labelled as delayed. Not a licensed live feed.", href: "/commentary", cta: "Open scores" },
];

export const IN_DEVELOPMENT = [
  { title: "Decision Lab", body: "Make the call at real moments from past IPL matches, built from Cricsheet ball-by-ball records, then review what happened, what was reasonable beforehand and what might have happened otherwise." },
  { title: "The Desk", body: "One brief across sports, ranked by how far win probability moved, with a receipt on every number." },
  { title: "Your alter ego", body: "An identity earned from how you call: your timing, your calibration and your appetite for risk." },
];

export const PRINCIPLES = [
  { title: "Receipts on every number", body: "Every number we show links to where it came from and when we saw it.", color: "--architect" },
  { title: "Decisions over dice", body: "Calls are graded on what the numbers favoured when you made them, so a lucky bounce never outranks a sharp read.", color: "--call" },
  { title: "No money, ever", body: "No entry fees, no payouts and no prizes. Ratings and bragging rights between friends.", color: "--opener" },
  { title: "Honest data states", body: "Delayed, historical replay, stale or source pending: we say which, instead of dressing anything up as live.", color: "--professor" },
];
