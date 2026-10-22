// Languages and UI messages. English is the source; Hindi covers the Desk and navigation (D-024).
export const LANGS = ["en", "hi"] as const;
export type Lang = (typeof LANGS)[number];
export const isLang = (v: unknown): v is Lang => LANGS.includes(v as Lang);
export const LANG_COOKIE = "ae_lang";

const en = {
  "nav.desk": "Desk", "nav.rooms": "Rooms", "nav.crews": "Crews", "nav.roster": "Roster", "nav.scores": "Scores", "nav.how": "How it works",
  "nav.skip": "Skip to content", "nav.menu": "Menu", "nav.signin": "Sign in", "nav.join": "Join free", "nav.signout": "Sign out",
  "lang.switch": "Language: English. Switch to Hindi",
  "desk.title": "The Desk",
  "desk.lead": "Recorded matches from every sport we hold data for, ranked by swing: how far one passage of play moved the win probability. Every number opens its receipt.",
  "desk.replay": "Historical replay", "desk.pending": "Source pending", "desk.pendingTitle": "Source pending",
  "desk.swing": "Swing {pts} pts", "desk.swingNote": "{team} win probability {from}% → {to}% over six balls",
  "desk.notModelled": "Swing: not modelled.", "desk.reason.rain": "Rain-affected or no chase: no exact win probability.", "desk.reason.no-model": "No win-probability model for this sport yet.",
  "desk.storiesFrom": "Stories from {name}", "desk.depth": "Depth", "depth.quick": "Quick", "depth.tactical": "Tactical", "depth.analyst": "Analyst",
  "desk.pending.unusable": "Source not usable here: {reason}",
  "pending.basketball": "No source with display and storage rights yet; a licensed play-by-play feed is needed.",
  "pending.tennis": "No source with display and storage rights yet; a licensed point-by-point feed is needed.",
  "receipt.incidents": "Incidents: {list}", "receipt.more": " and {n} more",
  "receipt": "receipt", "receipt.source": "Source", "receipt.class": "Class", "receipt.observed": "Observed", "receipt.attribution": "Attribution", "receipt.close": "Close", "receipt.region": "Receipt",
  "sport.cricket": "Cricket", "sport.football": "Football", "sport.f1": "Formula 1", "sport.basketball": "Basketball", "sport.tennis": "Tennis",
} as const;

export type MessageKey = keyof typeof en;

const hi: Record<MessageKey, string> = {
  "nav.desk": "डेस्क", "nav.rooms": "रूम", "nav.crews": "क्रू", "nav.roster": "रोस्टर", "nav.scores": "स्कोर", "nav.how": "यह कैसे काम करता है",
  "nav.skip": "सामग्री पर जाएँ", "nav.menu": "मेनू", "nav.signin": "साइन इन", "nav.join": "मुफ़्त जुड़ें", "nav.signout": "साइन आउट",
  "lang.switch": "भाषा: हिन्दी। अंग्रेज़ी पर जाएँ",
  "desk.title": "डेस्क",
  "desk.lead": "हर उस खेल के दर्ज मैच जिनका डेटा हमारे पास है, स्विंग के क्रम में: खेल के एक दौर ने जीत की संभावना को कितना बदला। हर संख्या अपनी रसीद खोलती है।",
  "desk.replay": "ऐतिहासिक रीप्ले", "desk.pending": "स्रोत लंबित", "desk.pendingTitle": "स्रोत लंबित",
  "desk.swing": "स्विंग {pts} अंक", "desk.swingNote": "{team} की जीत की संभावना {from}% → {to}%, छह गेंदों में",
  "desk.notModelled": "स्विंग: मॉडल नहीं है।", "desk.reason.rain": "बारिश से प्रभावित या कोई पीछा नहीं: जीत की सटीक संभावना नहीं।", "desk.reason.no-model": "इस खेल के लिए अभी जीत की संभावना का मॉडल नहीं है।",
  "desk.storiesFrom": "{name} की कहानियाँ", "desk.depth": "गहराई", "depth.quick": "झटपट", "depth.tactical": "रणनीतिक", "depth.analyst": "विश्लेषक",
  "desk.pending.unusable": "स्रोत यहाँ उपयोग योग्य नहीं: {reason}",
  "pending.basketball": "अभी दिखाने और सहेजने के अधिकार वाला कोई स्रोत नहीं है; लाइसेंस वाली प्ले-बाय-प्ले फ़ीड चाहिए।",
  "pending.tennis": "अभी दिखाने और सहेजने के अधिकार वाला कोई स्रोत नहीं है; लाइसेंस वाली पॉइंट-बाय-पॉइंट फ़ीड चाहिए।",
  "receipt.incidents": "घटनाएँ: {list}", "receipt.more": " और {n} अन्य",
  "receipt": "रसीद", "receipt.source": "स्रोत", "receipt.class": "श्रेणी", "receipt.observed": "दर्ज समय", "receipt.attribution": "श्रेय", "receipt.close": "बंद करें", "receipt.region": "रसीद",
  "sport.cricket": "क्रिकेट", "sport.football": "फ़ुटबॉल", "sport.f1": "फ़ॉर्मूला 1", "sport.basketball": "बास्केटबॉल", "sport.tennis": "टेनिस",
};

const MESSAGES: Record<Lang, Record<MessageKey, string>> = { en, hi };

/** A UI message in `lang`, with {placeholders} filled. */
export function t(lang: Lang, key: MessageKey, vars: Record<string, string | number> = {}): string {
  return MESSAGES[lang][key].replace(/\{(\w+)\}/g, (_, k: string) => String(vars[k] ?? `{${k}}`));
}

/** Every key has a message in every language (also checked by tests). */
export const messageKeys = (lang: Lang): MessageKey[] => Object.keys(MESSAGES[lang]) as MessageKey[];
