// ============================================================
// PITCH11 Ball-by-Ball Match Simulation Engine
// Produces CricBuzz / ESPNcricinfo quality commentary
// ============================================================

// --- Types ---
export type DeliveryType =
  | "good_length" | "short" | "yorker" | "full_toss"
  | "bouncer" | "slower_ball" | "off_break" | "leg_break"
  | "googly" | "carrom_ball" | "wide" | "no_ball";

export type ShotType =
  | "cover_drive" | "straight_drive" | "on_drive" | "pull"
  | "cut" | "sweep" | "reverse_sweep" | "slog"
  | "flick" | "glance" | "edge" | "defensive_block"
  | "leave" | "upper_cut" | "lofted_drive" | "scoop"
  | "inside_edge" | "outside_edge" | "thick_edge";

export type DismissalType =
  | "bowled" | "caught" | "lbw" | "run_out"
  | "stumped" | "caught_behind" | "caught_and_bowled";

export interface BatsmanScore {
  name: string;
  team: string;
  runs: number;
  balls: number;
  fours: number;
  sixes: number;
  strikeRate: number;
  isOut: boolean;
  dismissal: string;
  isOnStrike: boolean;
  battingPosition: number;
}

export interface BowlerFigures {
  name: string;
  team: string;
  overs: string;
  maidens: number;
  runs: number;
  wickets: number;
  economy: number;
  dots: number;
  ballsBowled: number;
}

export interface CommentaryEntry {
  over: string;        // e.g. "3.4"
  bowler: string;
  batsman: string;
  runs: number;
  isWicket: boolean;
  isBoundary: boolean;
  isSix: boolean;
  isExtra: boolean;
  extraType?: string;
  deliveryType: DeliveryType;
  shotType?: ShotType;
  dismissalType?: DismissalType;
  text: string;        // Full commentary string
  timestamp: string;
}

export interface Partnership {
  bat1: string;
  bat2: string;
  runs: number;
  balls: number;
  wicketNumber: number | null;  // null = current
}

export interface FallOfWicket {
  wicketNumber: number;
  score: number;
  overs: string;
  batsmanOut: string;
  dismissal: string;
}

export interface InningsState {
  battingTeam: string;
  bowlingTeam: string;
  totalRuns: number;
  totalWickets: number;
  totalBalls: number;
  overs: string;
  runRate: number;
  extras: { wides: number; noBalls: number; byes: number; legByes: number; total: number };
  batsmen: BatsmanScore[];
  currentBatsmen: BatsmanScore[];
  bowlers: BowlerFigures[];
  currentBowler: BowlerFigures | null;
  partnerships: Partnership[];
  fallOfWickets: FallOfWicket[];
  nextBatsman: string | null;
  isCompleted: boolean;
}

export interface MatchState {
  matchId: string;
  team1: string;
  team2: string;
  tossWinner: string;
  tossDecision: "bat" | "bowl";
  venue: string;
  innings1: InningsState;
  innings2: InningsState | null;
  currentInnings: 1 | 2;
  commentary: CommentaryEntry[];
  status: string;       // "In Progress", "Innings Break", "Completed"
  result: string | null; // "CSK won by 5 wickets" etc
  target: number | null;
  lastUpdated: string;
}

// --- Player Databases per Team ---
const TEAM_SQUADS: Record<string, { batsmen: string[]; bowlers: string[]; allRounders: string[]; wicketkeepers: string[] }> = {
  "CSK": {
    wicketkeepers: ["MS Dhoni", "Devon Conway"],
    batsmen: ["Ruturaj Gaikwad", "Rahul Tripathi", "Shivam Dube", "Moeen Ali"],
    allRounders: ["Ravindra Jadeja", "Deepak Chahar", "Mitchell Santner"],
    bowlers: ["Matheesha Pathirana", "Tushar Deshpande", "Maheesh Theekshana", "Khaleel Ahmed"]
  },
  "PBKS": {
    wicketkeepers: ["Jonny Bairstow", "Jitesh Sharma"],
    batsmen: ["Shreyas Iyer", "Prabhsimran Singh", "Rilee Rossouw", "Shashank Singh"],
    allRounders: ["Marcus Stoinis", "Liam Livingstone", "Marco Jansen"],
    bowlers: ["Arshdeep Singh", "Kagiso Rabada", "Rahul Chahar", "Harpreet Brar"]
  },
  "MI": {
    wicketkeepers: ["Ishan Kishan"],
    batsmen: ["Rohit Sharma", "Suryakumar Yadav", "Tilak Varma", "Ayush Mhatre"],
    allRounders: ["Hardik Pandya", "Tim David", "Naman Dhir"],
    bowlers: ["Jasprit Bumrah", "Trent Boult", "Deepak Chahar", "Ashton Agar"]
  },
  "RCB": {
    wicketkeepers: ["Phil Salt", "Jitesh Sharma"],
    batsmen: ["Virat Kohli", "Rajat Patidar", "Liam Livingstone", "Devdutt Padikkal"],
    allRounders: ["Krunal Pandya", "Romario Shepherd", "Tim David"],
    bowlers: ["Josh Hazlewood", "Bhuvneshwar Kumar", "Yash Dayal", "Suyash Sharma"]
  },
  "KKR": {
    wicketkeepers: ["Quinton de Kock"],
    batsmen: ["Ajinkya Rahane", "Venkatesh Iyer", "Nitish Rana", "Angkrish Raghuvanshi"],
    allRounders: ["Andre Russell", "Sunil Narine", "Ramandeep Singh"],
    bowlers: ["Varun Chakaravarthy", "Harshit Rana", "Umesh Yadav", "Mitchell Starc"]
  },
  "RR": {
    wicketkeepers: ["Sanju Samson", "Dhruv Jurel"],
    batsmen: ["Yashasvi Jaiswal", "Riyan Parag", "Shimron Hetmyer"],
    allRounders: ["Wanindu Hasaranga", "Shubham Dubey"],
    bowlers: ["Trent Boult", "Sandeep Sharma", "Yuzvendra Chahal", "Nandre Burger"]
  },
  "SRH": {
    wicketkeepers: ["Heinrich Klaasen"],
    batsmen: ["Travis Head", "Abhishek Sharma", "Aiden Markram", "Rahul Tripathi"],
    allRounders: ["Pat Cummins", "Nitish Kumar Reddy", "Washington Sundar"],
    bowlers: ["Bhuvneshwar Kumar", "Umran Malik", "T Natarajan", "Jaydev Unadkat"]
  },
  "DC": {
    wicketkeepers: ["Rishabh Pant", "KL Rahul"],
    batsmen: ["Jake Fraser-McGurk", "Tristan Stubbs", "Faf du Plessis"],
    allRounders: ["Axar Patel", "Mitchell Marsh", "Abishek Porel"],
    bowlers: ["Anrich Nortje", "Kuldeep Yadav", "Mukesh Kumar", "Ishant Sharma"]
  },
  "GT": {
    wicketkeepers: ["Wriddhiman Saha"],
    batsmen: ["Shubman Gill", "Sai Sudharsan", "David Miller", "Kane Williamson"],
    allRounders: ["Rashid Khan", "Rahul Tewatia", "Vijay Shankar"],
    bowlers: ["Mohammed Shami", "Josh Little", "Noor Ahmad", "Alzarri Joseph"]
  },
  "LSG": {
    wicketkeepers: ["Nicholas Pooran"],
    batsmen: ["KL Rahul", "Quinton de Kock", "Devdutt Padikkal", "Ayush Badoni"],
    allRounders: ["Marcus Stoinis", "Deepak Hooda", "Krunal Pandya"],
    bowlers: ["Avesh Khan", "Ravi Bishnoi", "Mark Wood", "Mohsin Khan"]
  }
};

// Build batting order from the squad
function buildBattingOrder(teamId: string): string[] {
  const squad = TEAM_SQUADS[teamId];
  if (!squad) return Array.from({ length: 11 }, (_, i) => `Batsman ${i + 1}`);
  const order: string[] = [];
  // Openers: WK + top batsman
  if (squad.wicketkeepers[0]) order.push(squad.wicketkeepers[0]);
  squad.batsmen.forEach(b => order.push(b));
  squad.allRounders.forEach(a => order.push(a));
  if (squad.wicketkeepers[1]) order.push(squad.wicketkeepers[1]);
  squad.bowlers.forEach(b => order.push(b));
  return order.slice(0, 11);
}

function buildBowlingAttack(teamId: string): string[] {
  const squad = TEAM_SQUADS[teamId];
  if (!squad) return Array.from({ length: 6 }, (_, i) => `Bowler ${i + 1}`);
  const attack: string[] = [
    ...squad.bowlers,
    ...squad.allRounders.slice(0, 2),
  ];
  return attack.slice(0, 6);
}

// --- Seeded random for deterministic per-match results ---
function seededRandom(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

// --- Commentary Text Generators ---
const DELIVERY_DESCRIPTIONS: Record<string, string[]> = {
  "good_length": ["good length delivery", "pitched on a good length", "lands on a perfect length", "hits the deck on a good length"],
  "short": ["short ball", "drops it short", "bangs it in short", "short of a length"],
  "yorker": ["yorker!", "full and fast yorker", "toe-crushing yorker", "digs out a yorker"],
  "full_toss": ["full toss", "gift of a full toss", "rank full toss", "full and straight"],
  "bouncer": ["BOUNCER!", "nasty bouncer", "sharp bouncer at the body", "express bouncer"],
  "slower_ball": ["slower ball", "takes the pace off", "clever slower delivery", "disguised slower ball"],
  "off_break": ["off-break", "turns in sharply from off", "rips the off-break", "angles in from outside off"],
  "leg_break": ["leg-break", "classic leg-spinner", "turns away from the right-hander", "loops the leggie"],
  "googly": ["googly!", "the wrong'un!", "turns the other way", "deceiving googly"],
  "carrom_ball": ["carrom ball", "the mystery carrom ball", "flicks the carrom ball"],
  "wide": ["wide delivery", "sprayed down leg side", "too wide outside off"],
  "no_ball": ["no-ball! Overstepping", "front foot no-ball!", "free hit coming up!"]
};

const SHOT_DESCRIPTIONS: Record<string, string[]> = {
  "cover_drive": ["gorgeous cover drive", "punches through the covers", "drives elegantly through cover", "textbook cover drive"],
  "straight_drive": ["straight drive down the ground", "drives it back past the bowler", "lofts straight down the ground"],
  "on_drive": ["on-drive through mid-on", "drills it through the on-side"],
  "pull": ["PULLS it away!", "rocks back and pulls", "swivels and pulls powerfully", "dispatches the pull shot"],
  "cut": ["cuts hard through point", "slashes the cut shot", "square cut races away"],
  "sweep": ["sweeps fine", "fine sweep behind square", "plays the sweep shot"],
  "reverse_sweep": ["REVERSE SWEEP!", "audacious reverse sweep", "plays the reverse with authority"],
  "slog": ["SLOGS it away!", "heaves across the line", "goes big with a mighty slog"],
  "flick": ["flicks off the pads", "wristy flick through midwicket", "deft flick off the hips"],
  "glance": ["glances fine down leg", "delicate leg glance", "tickles it fine"],
  "edge": ["gets an edge", "thick edge flies", "plays and edges"],
  "defensive_block": ["blocks solidly", "dead bat defense", "solid defensive block", "plays with soft hands"],
  "leave": ["leaves it alone", "shoulders arms", "wisely lets it go"],
  "upper_cut": ["UPPER CUT over third man!", "plays the upper cut"],
  "lofted_drive": ["lofts it over the infield!", "lifts it high and handsome"],
  "scoop": ["SCOOP SHOT!", "audacious scoop over the keeper", "paddle scoop for runs"],
  "inside_edge": ["inside edge onto the pad", "gets an inside edge"],
  "outside_edge": ["outside edge, just short!", "plays and gets an edge"],
  "thick_edge": ["thick edge", "gets a thick edge past slip"]
};

const WICKET_DESCRIPTIONS: Record<string, string[]> = {
  "bowled": ["BOWLED HIM! The stumps are shattered!", "Clean bowled! Through the gate!", "TIMBER! The off stump is cartwheeling!", "Bowled through the defense!"],
  "caught": ["CAUGHT! Up in the air and taken!", "GONE! Caught at {pos}!", "Edged and caught! The fielder does well at {pos}!", "Holes out to {pos}!"],
  "lbw": ["LBW! Plumb in front!", "Given out LBW! Struck on the pads!", "Trapped LBW! Dead in front of the stumps!", "That's out LBW! No need for a review!"],
  "run_out": ["RUN OUT! Brilliant fielding!", "Run out by a direct hit!", "SHORT OF THE CREASE! Run out!"],
  "stumped": ["STUMPED! Quick work behind the stumps!", "Stumped by a mile! Dancing down the track!"],
  "caught_behind": ["CAUGHT BEHIND! Thin edge through to the keeper!", "Edged and the keeper takes it!"],
  "caught_and_bowled": ["CAUGHT AND BOWLED! What a reflex catch by the bowler!", "C&B! The bowler pouches his own catch!"]
};

const FIELDING_POSITIONS = ["deep midwicket", "long-on", "long-off", "deep square leg", "third man", "fine leg", "slip", "gully", "point", "covers", "mid-off", "mid-on", "midwicket", "short fine leg", "deep extra cover"];

function pickRandom<T>(arr: T[], rand: () => number): T {
  return arr[Math.floor(rand() * arr.length)];
}

// --- Core Engine ---
// In-memory store for match states (per matchId)
const matchStates: Map<string, MatchState> = new Map();

export function getOrCreateMatchState(matchId: string, team1: string, team2: string, venue: string = "Stadium"): MatchState {
  if (matchStates.has(matchId)) {
    return matchStates.get(matchId)!;
  }
  
  const seed = hashString(matchId + "toss");
  const rand = seededRandom(seed);
  
  const tossWinner = rand() > 0.5 ? team1 : team2;
  const tossDecision = rand() > 0.4 ? "bat" : "bowl";
  const battingFirst = tossDecision === "bat" ? tossWinner : (tossWinner === team1 ? team2 : team1);
  const bowlingFirst = battingFirst === team1 ? team2 : team1;
  
  const battingOrder = buildBattingOrder(battingFirst);
  const bowlingAttack = buildBowlingAttack(bowlingFirst);
  
  const innings1: InningsState = {
    battingTeam: battingFirst,
    bowlingTeam: bowlingFirst,
    totalRuns: 0,
    totalWickets: 0,
    totalBalls: 0,
    overs: "0.0",
    runRate: 0,
    extras: { wides: 0, noBalls: 0, byes: 0, legByes: 0, total: 0 },
    batsmen: battingOrder.map((name, i) => ({
      name,
      team: battingFirst,
      runs: 0,
      balls: 0,
      fours: 0,
      sixes: 0,
      strikeRate: 0,
      isOut: false,
      dismissal: "",
      isOnStrike: i === 0,
      battingPosition: i + 1,
    })),
    currentBatsmen: [],
    bowlers: bowlingAttack.map(name => ({
      name,
      team: bowlingFirst,
      overs: "0.0",
      maidens: 0,
      runs: 0,
      wickets: 0,
      economy: 0,
      dots: 0,
      ballsBowled: 0,
    })),
    currentBowler: null,
    partnerships: [],
    fallOfWickets: [],
    nextBatsman: battingOrder[2] || null,
    isCompleted: false,
  };
  
  // Set initial batsmen
  innings1.currentBatsmen = [innings1.batsmen[0], innings1.batsmen[1]];
  innings1.batsmen[0].isOnStrike = true;
  innings1.batsmen[1].isOnStrike = false;
  innings1.currentBowler = innings1.bowlers[0];
  innings1.partnerships.push({
    bat1: innings1.batsmen[0].name,
    bat2: innings1.batsmen[1].name,
    runs: 0,
    balls: 0,
    wicketNumber: null,
  });

  const state: MatchState = {
    matchId,
    team1,
    team2,
    tossWinner,
    tossDecision,
    venue,
    innings1,
    innings2: null,
    currentInnings: 1,
    commentary: [],
    status: "In Progress",
    result: null,
    target: null,
    lastUpdated: new Date().toISOString(),
  };

  matchStates.set(matchId, state);
  return state;
}

// Advance match by N balls
export function advanceMatch(matchId: string, team1: string, team2: string, venue: string, ballsToAdvance: number): MatchState {
  const state = getOrCreateMatchState(matchId, team1, team2, venue);
  
  if (state.status === "Completed") return state;
  
  const seed = hashString(matchId + "balls" + state.commentary.length);
  const rand = seededRandom(seed);
  
  for (let i = 0; i < ballsToAdvance; i++) {
    if (state.status === "Completed") break;
    
    const innings = state.currentInnings === 1 ? state.innings1 : state.innings2;
    if (!innings || innings.isCompleted) {
      if (state.currentInnings === 1) {
        // Switch to innings 2
        startInnings2(state, rand);
        continue;
      } else {
        state.status = "Completed";
        break;
      }
    }
    
    simulateBall(state, innings, rand);
  }
  
  state.lastUpdated = new Date().toISOString();
  matchStates.set(matchId, state);
  return state;
}

function startInnings2(state: MatchState, rand: () => number) {
  const inn1 = state.innings1;
  state.target = inn1.totalRuns + 1;
  state.currentInnings = 2;
  
  const battingTeam = inn1.bowlingTeam;
  const bowlingTeam = inn1.battingTeam;
  const battingOrder = buildBattingOrder(battingTeam);
  const bowlingAttack = buildBowlingAttack(bowlingTeam);
  
  const innings2: InningsState = {
    battingTeam,
    bowlingTeam,
    totalRuns: 0,
    totalWickets: 0,
    totalBalls: 0,
    overs: "0.0",
    runRate: 0,
    extras: { wides: 0, noBalls: 0, byes: 0, legByes: 0, total: 0 },
    batsmen: battingOrder.map((name, i) => ({
      name,
      team: battingTeam,
      runs: 0,
      balls: 0,
      fours: 0,
      sixes: 0,
      strikeRate: 0,
      isOut: false,
      dismissal: "",
      isOnStrike: i === 0,
      battingPosition: i + 1,
    })),
    currentBatsmen: [],
    bowlers: bowlingAttack.map(name => ({
      name,
      team: bowlingTeam,
      overs: "0.0",
      maidens: 0,
      runs: 0,
      wickets: 0,
      economy: 0,
      dots: 0,
      ballsBowled: 0,
    })),
    currentBowler: null,
    partnerships: [],
    fallOfWickets: [],
    nextBatsman: battingOrder[2] || null,
    isCompleted: false,
  };
  
  innings2.currentBatsmen = [innings2.batsmen[0], innings2.batsmen[1]];
  innings2.batsmen[0].isOnStrike = true;
  innings2.batsmen[1].isOnStrike = false;
  innings2.currentBowler = innings2.bowlers[0];
  innings2.partnerships.push({
    bat1: innings2.batsmen[0].name,
    bat2: innings2.batsmen[1].name,
    runs: 0,
    balls: 0,
    wicketNumber: null,
  });
  
  state.innings2 = innings2;
  state.status = "In Progress";
  
  // Add innings break commentary
  state.commentary.push({
    over: "BREAK",
    bowler: "",
    batsman: "",
    runs: 0,
    isWicket: false,
    isBoundary: false,
    isSix: false,
    isExtra: false,
    deliveryType: "good_length",
    text: `☕ INNINGS BREAK — ${state.innings1.battingTeam} posted ${state.innings1.totalRuns}/${state.innings1.totalWickets} in ${state.innings1.overs} overs. ${innings2.battingTeam} need ${state.target} runs to win from 120 balls.`,
    timestamp: new Date().toISOString()
  });
}

function simulateBall(state: MatchState, innings: InningsState, rand: () => number) {
  if (innings.totalBalls >= 120 || innings.totalWickets >= 10) {
    innings.isCompleted = true;
    checkMatchResult(state);
    return;
  }
  
  const striker = innings.currentBatsmen.find(b => b.isOnStrike);
  const nonStriker = innings.currentBatsmen.find(b => !b.isOnStrike);
  const bowler = innings.currentBowler;
  
  if (!striker || !nonStriker || !bowler) return;
  
  // Choose delivery type
  const isSpin = bowler.name.toLowerCase().match(/chahal|rashid|bishnoi|chakaravarthy|kuldeep|hasaranga|theekshana|narine|agar|ahmad|siddharth|sundar|chahar/);
  let deliveryType: DeliveryType;
  const dRand = rand();
  
  if (isSpin) {
    deliveryType = dRand < 0.35 ? "off_break" : dRand < 0.6 ? "leg_break" : dRand < 0.7 ? "googly" : dRand < 0.75 ? "carrom_ball" : dRand < 0.78 ? "wide" : "good_length";
  } else {
    deliveryType = dRand < 0.3 ? "good_length" : dRand < 0.45 ? "short" : dRand < 0.55 ? "yorker" : dRand < 0.6 ? "bouncer" : dRand < 0.68 ? "slower_ball" : dRand < 0.73 ? "full_toss" : dRand < 0.76 ? "wide" : dRand < 0.78 ? "no_ball" : "good_length";
  }
  
  // Handle extras
  if (deliveryType === "wide") {
    innings.extras.wides++;
    innings.extras.total++;
    innings.totalRuns++;
    bowler.runs++;
    
    const currentPartnership = innings.partnerships[innings.partnerships.length - 1];
    if (currentPartnership) { currentPartnership.runs++; }
    
    updateOversDisplay(innings, bowler, false);
    
    const overStr = formatOver(innings.totalBalls);
    const text = `${overStr} | ${bowler.name} to ${striker.name}, WIDE! ${pickRandom(DELIVERY_DESCRIPTIONS["wide"], rand)}. 1 run added. ${innings.battingTeam}: ${innings.totalRuns}/${innings.totalWickets}`;
    
    state.commentary.unshift({
      over: overStr, bowler: bowler.name, batsman: striker.name,
      runs: 1, isWicket: false, isBoundary: false, isSix: false,
      isExtra: true, extraType: "wide", deliveryType, text,
      timestamp: new Date().toISOString()
    });
    
    checkInnings2Chase(state, innings);
    return;
  }
  
  if (deliveryType === "no_ball") {
    innings.extras.noBalls++;
    innings.extras.total++;
    innings.totalRuns++;
    bowler.runs++;
    
    const overStr = formatOver(innings.totalBalls);
    const text = `${overStr} | ${bowler.name} to ${striker.name}, NO BALL! ${pickRandom(DELIVERY_DESCRIPTIONS["no_ball"], rand)} Free hit coming up. ${innings.battingTeam}: ${innings.totalRuns}/${innings.totalWickets}`;
    
    state.commentary.unshift({
      over: overStr, bowler: bowler.name, batsman: striker.name,
      runs: 1, isWicket: false, isBoundary: false, isSix: false,
      isExtra: true, extraType: "no_ball", deliveryType, text,
      timestamp: new Date().toISOString()
    });
    
    checkInnings2Chase(state, innings);
    return;
  }
  
  // Legal delivery
  innings.totalBalls++;
  striker.balls++;
  bowler.ballsBowled++;
  
  const currentPartnership = innings.partnerships[innings.partnerships.length - 1];
  if (currentPartnership) { currentPartnership.balls++; }
  
  // Determine outcome
  const oRand = rand();
  const phase = innings.totalBalls <= 36 ? "powerplay" : innings.totalBalls <= 90 ? "middle" : "death";
  
  let runs = 0;
  let isWicket = false;
  let isBoundary = false;
  let isSix = false;
  let shotType: ShotType;
  let dismissalType: DismissalType | undefined;
  
  // Wicket probability varies by phase
  const wicketProb = phase === "powerplay" ? 0.05 : phase === "middle" ? 0.06 : 0.07;
  
  if (oRand < wicketProb && innings.totalWickets < 9) {
    // WICKET
    isWicket = true;
    runs = 0;
    
    const wRand = rand();
    dismissalType = wRand < 0.3 ? "bowled" : wRand < 0.65 ? "caught" : wRand < 0.8 ? "lbw" : wRand < 0.88 ? "caught_behind" : wRand < 0.94 ? "stumped" : wRand < 0.97 ? "caught_and_bowled" : "run_out";
    
    shotType = dismissalType === "bowled" ? "defensive_block" :
               dismissalType === "lbw" ? "defensive_block" :
               dismissalType === "caught" ? pickRandom(["slog", "pull", "lofted_drive", "cut", "flick"], rand) :
               "edge";
    
    const fieldPos = pickRandom(FIELDING_POSITIONS, rand);
    let wicketText = pickRandom(WICKET_DESCRIPTIONS[dismissalType] || WICKET_DESCRIPTIONS["caught"], rand);
    wicketText = wicketText.replace("{pos}", fieldPos);
    
    const dismissalString = dismissalType === "bowled" ? `b ${bowler.name}` :
      dismissalType === "caught" ? `c (${fieldPos}) b ${bowler.name}` :
      dismissalType === "lbw" ? `lbw b ${bowler.name}` :
      dismissalType === "caught_behind" ? `c †keeper b ${bowler.name}` :
      dismissalType === "stumped" ? `st †keeper b ${bowler.name}` :
      dismissalType === "caught_and_bowled" ? `c&b ${bowler.name}` :
      `run out`;
    
    striker.isOut = true;
    striker.dismissal = dismissalString;
    striker.strikeRate = striker.balls > 0 ? parseFloat(((striker.runs / striker.balls) * 100).toFixed(1)) : 0;
    
    innings.totalWickets++;
    bowler.wickets++;
    
    // Record fall of wicket
    innings.fallOfWickets.push({
      wicketNumber: innings.totalWickets,
      score: innings.totalRuns,
      overs: formatOver(innings.totalBalls),
      batsmanOut: striker.name,
      dismissal: dismissalString,
    });
    
    // Close current partnership
    if (currentPartnership) {
      currentPartnership.wicketNumber = innings.totalWickets;
    }
    
    // Bring in next batsman
    const nextBatIdx = innings.batsmen.findIndex(b => !b.isOut && !innings.currentBatsmen.includes(b));
    if (nextBatIdx >= 0 && innings.totalWickets < 10) {
      const newBat = innings.batsmen[nextBatIdx];
      newBat.isOnStrike = true;
      innings.currentBatsmen = [newBat, nonStriker];
      
      // Start new partnership
      innings.partnerships.push({
        bat1: newBat.name,
        bat2: nonStriker.name,
        runs: 0,
        balls: 0,
        wicketNumber: null,
      });
      
      // Update next batsman
      const futureIdx = innings.batsmen.findIndex(b => !b.isOut && !innings.currentBatsmen.includes(b) && b !== newBat);
      innings.nextBatsman = futureIdx >= 0 ? innings.batsmen[futureIdx].name : null;
    } else {
      innings.nextBatsman = null;
    }
    
    const delivDesc = pickRandom(DELIVERY_DESCRIPTIONS[deliveryType] || DELIVERY_DESCRIPTIONS["good_length"], rand);
    const overStr = formatOver(innings.totalBalls);
    const text = `${overStr} | ${bowler.name} to ${striker.name}, OUT! ${wicketText} ${delivDesc}. ${striker.name} departs for ${striker.runs} (${striker.balls}b, ${striker.fours}x4, ${striker.sixes}x6). ${innings.battingTeam}: ${innings.totalRuns}/${innings.totalWickets}`;
    
    state.commentary.unshift({
      over: overStr, bowler: bowler.name, batsman: striker.name,
      runs: 0, isWicket: true, isBoundary: false, isSix: false,
      isExtra: false, deliveryType, shotType, dismissalType, text,
      timestamp: new Date().toISOString()
    });
    
  } else {
    // Runs scored
    const rRand = rand();
    
    if (phase === "powerplay") {
      runs = rRand < 0.28 ? 0 : rRand < 0.53 ? 1 : rRand < 0.65 ? 2 : rRand < 0.78 ? 4 : rRand < 0.85 ? 6 : rRand < 0.95 ? 1 : 3;
    } else if (phase === "middle") {
      runs = rRand < 0.32 ? 0 : rRand < 0.58 ? 1 : rRand < 0.72 ? 2 : rRand < 0.82 ? 4 : rRand < 0.88 ? 6 : rRand < 0.96 ? 1 : 3;
    } else { // death overs
      runs = rRand < 0.22 ? 0 : rRand < 0.42 ? 1 : rRand < 0.55 ? 2 : rRand < 0.72 ? 4 : rRand < 0.82 ? 6 : rRand < 0.92 ? 1 : 3;
    }
    
    isBoundary = runs === 4;
    isSix = runs === 6;
    
    // Pick shot type
    if (runs === 0) {
      shotType = pickRandom(["defensive_block", "leave", "defensive_block", "defensive_block"], rand);
    } else if (runs === 1) {
      shotType = pickRandom(["flick", "glance", "cut", "defensive_block", "inside_edge"], rand);
    } else if (runs === 2) {
      shotType = pickRandom(["cover_drive", "on_drive", "flick", "cut", "pull"], rand);
    } else if (runs === 4) {
      shotType = pickRandom(["cover_drive", "straight_drive", "pull", "cut", "sweep", "flick", "upper_cut", "thick_edge"], rand);
    } else if (runs === 6) {
      shotType = pickRandom(["slog", "lofted_drive", "pull", "reverse_sweep", "scoop", "straight_drive"], rand);
    } else {
      shotType = pickRandom(["flick", "cut", "pull"], rand);
    }
    
    striker.runs += runs;
    if (isBoundary) striker.fours++;
    if (isSix) striker.sixes++;
    striker.strikeRate = striker.balls > 0 ? parseFloat(((striker.runs / striker.balls) * 100).toFixed(1)) : 0;
    
    innings.totalRuns += runs;
    bowler.runs += runs;
    if (runs === 0) bowler.dots++;
    
    if (currentPartnership) { currentPartnership.runs += runs; }
    
    // Rotate strike on odd runs or end of over
    if (runs % 2 === 1) {
      innings.currentBatsmen.forEach(b => { b.isOnStrike = !b.isOnStrike; });
    }
    
    const delivDesc = pickRandom(DELIVERY_DESCRIPTIONS[deliveryType] || DELIVERY_DESCRIPTIONS["good_length"], rand);
    const shotDesc = pickRandom(SHOT_DESCRIPTIONS[shotType] || SHOT_DESCRIPTIONS["defensive_block"], rand);
    
    const overStr = formatOver(innings.totalBalls);
    
    let text: string;
    if (runs === 0) {
      text = `${overStr} | ${bowler.name} to ${striker.name}, no run. ${delivDesc}, ${shotDesc}. DOT BALL. ${innings.battingTeam}: ${innings.totalRuns}/${innings.totalWickets}`;
    } else if (isBoundary) {
      text = `${overStr} | ${bowler.name} to ${striker.name}, FOUR! ${delivDesc}, ${shotDesc}, races to the boundary! ${innings.battingTeam}: ${innings.totalRuns}/${innings.totalWickets}`;
    } else if (isSix) {
      text = `${overStr} | ${bowler.name} to ${striker.name}, SIX! ${delivDesc}, ${shotDesc}, sails over the boundary rope! MAXIMUM! ${innings.battingTeam}: ${innings.totalRuns}/${innings.totalWickets}`;
    } else {
      text = `${overStr} | ${bowler.name} to ${striker.name}, ${runs} run${runs > 1 ? "s" : ""}. ${delivDesc}, ${shotDesc}. ${innings.battingTeam}: ${innings.totalRuns}/${innings.totalWickets}`;
    }
    
    state.commentary.unshift({
      over: overStr, bowler: bowler.name, batsman: striker.name,
      runs, isWicket: false, isBoundary, isSix,
      isExtra: false, deliveryType, shotType, text,
      timestamp: new Date().toISOString()
    });
  }
  
  // Update overs display
  updateOversDisplay(innings, bowler, true);
  
  // End of over: rotate bowler, swap strike
  if (innings.totalBalls % 6 === 0 && innings.totalBalls > 0) {
    // Swap strike at end of over
    innings.currentBatsmen.forEach(b => { b.isOnStrike = !b.isOnStrike; });
    
    // Pick next bowler (can't bowl consecutive overs)
    const currentBowlerName = bowler.name;
    const availableBowlers = innings.bowlers.filter(b =>
      b.name !== currentBowlerName && b.ballsBowled < 24
    );
    if (availableBowlers.length > 0) {
      innings.currentBowler = pickRandom(availableBowlers, rand);
    }
    
    // Check for maiden
    const lastSixCommentaries = state.commentary.slice(0, 6).filter(c => c.bowler === bowler.name);
    const isAllDots = lastSixCommentaries.length === 6 && lastSixCommentaries.every(c => c.runs === 0 && !c.isExtra);
    if (isAllDots) {
      bowler.maidens++;
      state.commentary.unshift({
        over: formatOver(innings.totalBalls),
        bowler: bowler.name, batsman: "",
        runs: 0, isWicket: false, isBoundary: false, isSix: false,
        isExtra: false, deliveryType: "good_length",
        text: `End of over ${Math.floor(innings.totalBalls / 6)} | MAIDEN OVER by ${bowler.name}! Figures: ${bowler.overs}-${bowler.maidens}-${bowler.runs}-${bowler.wickets}`,
        timestamp: new Date().toISOString()
      });
    }
  }
  
  // Check innings completion
  if (innings.totalBalls >= 120 || innings.totalWickets >= 10) {
    innings.isCompleted = true;
    checkMatchResult(state);
  }
  
  checkInnings2Chase(state, innings);
}

function checkInnings2Chase(state: MatchState, innings: InningsState) {
  if (state.currentInnings === 2 && state.target && innings.totalRuns >= state.target) {
    innings.isCompleted = true;
    const wicketsRemaining = 10 - innings.totalWickets;
    state.result = `${innings.battingTeam} won by ${wicketsRemaining} wicket${wicketsRemaining !== 1 ? "s" : ""}`;
    state.status = "Completed";
    
    state.commentary.unshift({
      over: formatOver(innings.totalBalls),
      bowler: "", batsman: "",
      runs: 0, isWicket: false, isBoundary: false, isSix: false,
      isExtra: false, deliveryType: "good_length",
      text: `🏆 ${state.result}! ${innings.battingTeam} chase down ${state.target! - 1} with ${120 - innings.totalBalls} balls remaining!`,
      timestamp: new Date().toISOString()
    });
  }
}

function checkMatchResult(state: MatchState) {
  if (state.currentInnings === 1 && state.innings1.isCompleted) {
    // Start innings 2 on next advance
    return;
  }
  
  if (state.currentInnings === 2 && state.innings2?.isCompleted && !state.result) {
    const inn1Score = state.innings1.totalRuns;
    const inn2Score = state.innings2.totalRuns;
    
    if (inn2Score >= inn1Score + 1) {
      const wicketsRem = 10 - state.innings2.totalWickets;
      state.result = `${state.innings2.battingTeam} won by ${wicketsRem} wicket${wicketsRem !== 1 ? "s" : ""}`;
    } else if (inn1Score > inn2Score) {
      state.result = `${state.innings1.battingTeam} won by ${inn1Score - inn2Score} run${(inn1Score - inn2Score) !== 1 ? "s" : ""}`;
    } else {
      state.result = "Match Tied!";
    }
    
    state.status = "Completed";
    state.commentary.unshift({
      over: "END",
      bowler: "", batsman: "",
      runs: 0, isWicket: false, isBoundary: false, isSix: false,
      isExtra: false, deliveryType: "good_length",
      text: `🏆 MATCH RESULT: ${state.result}. ${state.innings1.battingTeam}: ${state.innings1.totalRuns}/${state.innings1.totalWickets} | ${state.innings2!.battingTeam}: ${state.innings2!.totalRuns}/${state.innings2!.totalWickets}`,
      timestamp: new Date().toISOString()
    });
  }
}

function formatOver(totalBalls: number): string {
  const overs = Math.floor(totalBalls / 6);
  const balls = totalBalls % 6;
  return `${overs}.${balls}`;
}

function updateOversDisplay(innings: InningsState, bowler: BowlerFigures, isLegalDelivery: boolean) {
  if (isLegalDelivery) {
    innings.overs = formatOver(innings.totalBalls);
  }
  innings.runRate = innings.totalBalls > 0 ? parseFloat(((innings.totalRuns / innings.totalBalls) * 6).toFixed(2)) : 0;
  
  bowler.overs = formatOver(bowler.ballsBowled);
  bowler.economy = bowler.ballsBowled > 0 ? parseFloat(((bowler.runs / bowler.ballsBowled) * 6).toFixed(2)) : 0;
}

// Get current match state for API consumption
export function getMatchSnapshot(matchId: string, team1: string, team2: string, venue: string = "Stadium"): MatchState {
  const now = new Date();
  const matchStartIST = new Date("2026-04-03T19:30:00+05:30");
  const minutesSinceStart = Math.max(0, (now.getTime() - matchStartIST.getTime()) / 60000);
  
  // ~1.5 balls per minute (realistic T20 pace)
  const targetBalls = Math.min(240, Math.floor(minutesSinceStart * 1.5));
  
  const state = getOrCreateMatchState(matchId, team1, team2, venue);
  const currentTotalBalls = state.innings1.totalBalls + (state.innings2?.totalBalls || 0);
  const ballsToAdv = Math.max(0, targetBalls - currentTotalBalls);
  
  if (ballsToAdv > 0) {
    return advanceMatch(matchId, team1, team2, venue, ballsToAdv);
  }
  
  return state;
}

// Reset match for testing
export function resetMatch(matchId: string) {
  matchStates.delete(matchId);
}
