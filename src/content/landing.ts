// Copy and illustrative data for the landing page. Numbers here are labelled illustrative or toy on the page.
export type Depth = "new" | "fan" | "coach";
export type SportKey = "cricket" | "basketball" | "football" | "f1" | "tennis";
export type PersonaKey = "opener" | "closer" | "architect" | "professor" | "iceman";

export const PERSONAS: Record<PersonaKey, { name: string; color: string; sport: string; pictogram: SportKey }> = {
  opener: { name: "The Opener", color: "--opener", sport: "Cricket", pictogram: "cricket" },
  closer: { name: "The Closer", color: "--closer", sport: "Basketball", pictogram: "basketball" },
  architect: { name: "The Architect", color: "--architect", sport: "Football", pictogram: "football" },
  professor: { name: "The Professor", color: "--professor", sport: "F1", pictogram: "f1" },
  iceman: { name: "The Iceman", color: "--iceman", sport: "Tennis", pictogram: "tennis" },
};
export const PERSONA_ORDER: PersonaKey[] = ["opener", "closer", "architect", "professor", "iceman"];

export type BriefItem = {
  id: string; sport: string; pictogram: SportKey; color: string; head: string;
  depth: Record<Depth, string>; receipt: string; receiptBody: string; points: number[]; swing: number;
};

export const BRIEF: BriefItem[] = [
  { id: "rc1", sport: "Cricket", pictogram: "cricket", color: "--opener",
    head: "Three wickets in overs 16 to 18 flipped the chase: the defending side went from a 28% to a 71% chance of winning.",
    depth: {
      new: "The chasing side was on track until it lost three wickets in three overs. After that it needed too many runs from too few balls.",
      fan: "The required rate climbed past 14 an over and the set batter was gone, so the last two overs were a scramble.",
      coach: "Bringing the strike bowler back for the 16th and 18th, instead of saving him for the 19th, broke the partnership before the death. The spinner’s 17th went for five.",
    },
    receipt: "Receipt: ball-by-ball, overs 16 to 18",
    receiptBody: "Source: ball-by-ball records for overs 16 to 18, with the win model’s reading after each delivery. In the live product this opens the exact deliveries behind every number.",
    points: [52, 49, 45, 40, 34, 28, 41, 55, 66, 71], swing: 43 },
  { id: "rc2", sport: "F1", pictogram: "f1", color: "--professor",
    head: "An early stop on lap 22 gained 3.1 seconds on the leader, and the lead never changed hands again.",
    depth: {
      new: "Changing tyres a lap before the leader meant racing on fresh tyres while the leader was still on worn ones. That was enough to come out ahead once both had stopped.",
      fan: "The out-lap on new tyres was 2.4 seconds quicker than the leader’s in-lap on old ones, and the stop itself was 0.7 seconds faster.",
      coach: "The hard tyre was losing about 0.09 seconds a lap by lap 20. Once the undercut gain exceeded the gap, stopping first was the dominant move.",
    },
    receipt: "Receipt: lap timing, laps 20 to 26",
    receiptBody: "Source: lap and sector timing for laps 20 to 26, plus pit-lane times for both cars.",
    points: [38, 39, 41, 43, 46, 58, 66, 70, 72, 74], swing: 36 },
  { id: "rc3", sport: "Football", pictogram: "football", color: "--architect",
    head: "A pressing trap in the 61st minute won the ball 30 metres from goal. The winner came 14 seconds later.",
    depth: {
      new: "The team that scored had a plan to win the ball high up the pitch. They forced a mistake near the other goal and scored straight away.",
      fan: "The press was triggered by a backward pass to the left centre-back. Three players closed the passing lanes and the ball was won in the left half-space.",
      coach: "The trigger was a centre-back receiving on his weaker foot while facing his own goal. The far-side winger tucked in to cut the switch, leaving the full-back as the only way out.",
    },
    receipt: "Receipt: event data, 60th to 62nd minute",
    receiptBody: "Source: on-ball events from the 60th to the 62nd minute, with the positions of the pressing players at the moment of the turnover.",
    points: [50, 51, 49, 48, 52, 50, 64, 72, 75, 78], swing: 30 },
  { id: "rc4", sport: "Tennis", pictogram: "tennis", color: "--iceman",
    head: "Two break points saved at 3–3 in the deciding set, and the break came in the very next game.",
    depth: {
      new: "The player serving was in trouble twice and held on. Then they won their opponent’s next service game.",
      fan: "Both break points were saved with first serves, and the returner didn’t win a first-serve return in that game.",
      coach: "After going wide all set, the serve went to the body on both break points. The returner never adjusted their position to cover it.",
    },
    receipt: "Receipt: point-by-point, final set",
    receiptBody: "Source: point-by-point records for the final set, including serve direction on every point.",
    points: [52, 49, 45, 40, 44, 50, 58, 62, 64, 66], swing: 26 },
  { id: "rc5", sport: "Basketball", pictogram: "basketball", color: "--closer",
    head: "Shot quality, not luck, cut a 12-point lead to three: nine good looks from twelve trips in the last five minutes.",
    depth: {
      new: "In the last minutes the trailing team kept creating easy shots, close to the basket or wide open, and almost caught up.",
      fan: "Nine of twelve possessions ended at the rim or in open threes. Expected points per possession rose to 1.31, from 0.94 earlier in the game.",
      coach: "The guard and centre pick-and-roll pulled the weak-side defender into the paint on almost every trip. That’s where the open corner threes came from.",
    },
    receipt: "Receipt: play-by-play, last five minutes",
    receiptBody: "Source: play-by-play and shot locations for the last five minutes, with each shot’s expected value.",
    points: [30, 27, 24, 22, 25, 29, 33, 36, 39, 41], swing: 19 },
];

export type CallOption = { name: string; sub: string; p: number; bold: boolean };
export type Scenario = {
  sport: string; pictogram: SportKey; color: string; title: string; text: string; facts: [string, string][];
  metric: string; opts: [CallOption, CallOption]; crowd: number; why: string; win: string; lose: string;
};

export const SCENARIOS: Scenario[] = [
  { sport: "Cricket", pictogram: "cricket", color: "--opener", title: "Who bowls the 19th?",
    text: "T20, and you’re defending. They need 22 from 12 balls with three wickets left. Your strike bowler and your spinner each have one over left.",
    facts: [["Needed", "22"], ["Balls left", "12"], ["Wickets left", "3"]],
    metric: "Chance to defend the total with each option, from a toy model.",
    opts: [
      { name: "Strike bowler now", sub: "Use your best over while there are still balls to defend.", p: 63, bold: true },
      { name: "Save him for the 20th", sub: "Keep your best for the final over.", p: 58, bold: false },
    ],
    crowd: 46,
    why: "The 19th usually decides more than the 20th: a wicket now leaves the new batter less time, and a tight over forces risk early.",
    win: "Defended: they finished seven short.", lose: "They got there with a ball to spare." },
  { sport: "F1", pictogram: "f1", color: "--professor", title: "Box under the safety car?",
    text: "Lap 34 of 57 and the safety car is out. You’re second on hard tyres that are 19 laps old, and the leader stays out. Overtaking on this track is hard.",
    facts: [["Lap", "34 of 57"], ["Position", "P2"], ["Tyre age", "19 laps"]],
    metric: "Chance to win the race with each option, from a toy model.",
    opts: [
      { name: "Box for fresh mediums", sub: "A cheap stop now, then attack on grip.", p: 33, bold: true },
      { name: "Stay out", sub: "Keep track position and make them pass you.", p: 38, bold: false },
    ],
    crowd: 64,
    why: "A cheap stop still costs a place. Where passing is rare, fresher tyres don’t help if you can’t get by.",
    win: "Won it: you held track position and the leader’s tyres faded late.", lose: "Finished second: the leader controlled the restart." },
  { sport: "Football", pictogram: "football", color: "--architect", title: "Shut it down or keep a threat?",
    text: "84th minute and you lead 1–0, but they’re pinning you back. Bring on a centre-back for your striker, or keep the striker on?",
    facts: [["Minute", "84"], ["Score", "1–0"], ["Their shots, last 10 min", "5"]],
    metric: "Chance to win the match with each option, from a toy model.",
    opts: [
      { name: "Keep the striker on", sub: "A counter threat stops their full-backs pushing up.", p: 81, bold: true },
      { name: "Bring on a centre-back", sub: "More height for the crosses to come.", p: 77, bold: false },
    ],
    crowd: 42,
    why: "Without an outlet, the pressure has nowhere to go. A striker who can hold the ball pins two of theirs back.",
    win: "Held on: your striker won two free kicks deep in stoppage time.", lose: "Conceded from a late corner to draw 1–1." },
];

export const ROSTER: { key: PersonaKey; mentality: string; tool: string; lineage: string }[] = [
  { key: "opener", mentality: "Timing over force. Turn a start into something enormous.",
    tool: "Over Call: call the next over before it’s bowled, then see how the numbers read it.",
    lineage: "Rohit Sharma, “Hitman”. Bengaluru, 2 November 2013: 209 off 158 balls with 16 sixes. A broadcast crew member called him the Hitman that day, and the commentary box made it stick." },
  { key: "closer", mentality: "Study the film until nothing surprises you, then want the last shot.",
    tool: "Film Room: every possession broken down, and a daily drill that keeps your streak alive.",
    lineage: "Kobe Bryant, “Black Mamba”. Los Angeles, 22 January 2006: 81 points against Toronto in a single game." },
  { key: "architect", mentality: "See the pass before it exists.",
    tool: "Blueprint: the shape of the game drawn as it happens, with what-if set pieces.",
    lineage: "Andrea Pirlo, “L’Architetto”. Dortmund, 4 July 2006: the no-look pass in the 119th minute that sent Italy to the World Cup final." },
  { key: "professor", mentality: "Take only the risk the race demands.",
    tool: "Pit Wall: make the strategy call, then watch the simulation race it out.",
    lineage: "Alain Prost, “The Professor”. Adelaide, 1986: won the race and the championship by two points after his main rival’s tyre exploded." },
  { key: "iceman", mentality: "Nothing changes on the big points.",
    tool: "Pressure Index: who holds when the point matters most.",
    lineage: "Björn Borg, “Ice-Borg”. Wimbledon, 5 July 1980: lost a fourth-set tiebreak 16–18, then won the fifth 8–6 for a fifth straight title." },
];

export const PRINCIPLES = [
  { title: "Receipts on every number", body: "Tap any stat to open the ball, lap, possession or point it came from.", color: "--architect" },
  { title: "Decisions over dice", body: "Calls are graded on what the numbers favoured when you made them, so a lucky bounce never outranks a sharp read.", color: "--call" },
  { title: "No money on the line", body: "Points, ratings and bragging rights between friends. No entry fees and no payouts.", color: "--opener" },
  { title: "In the language you watch in", body: "Briefs and calls in your language, starting with English and Hindi.", color: "--professor" },
];

export const STEPS = [
  { title: "Cricket and F1", body: "The deepest open data in sport: ball-by-ball records and lap-by-lap timing.", color: "--opener" },
  { title: "Football", body: "Event data and tactical shape, with what-if set pieces.", color: "--architect" },
  { title: "Basketball and tennis", body: "Play-by-play and point-by-point, plus the Pressure Index.", color: "--closer" },
];
