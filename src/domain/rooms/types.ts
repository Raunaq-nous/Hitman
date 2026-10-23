import type { SportSlug } from "@/domain/facts/types";
import type { Receipt } from "@/domain/sources/types";
import type { Story } from "@/domain/stories/types";

export interface RoomSummary { slug: string; name: string; competition: string; season: string }

export interface SportRooms { sport: SportSlug; events: RoomSummary[]; /** why the sport has no rooms */ pending: string | null }

export interface EventRoom extends RoomSummary {
  sport: SportSlug;
  /** win probability after each legal ball (t = legal balls bowled); null when there is no model */
  wp: { points: { t: number; wp: number }[]; model: string } | null;
  /** the chase's peak leverage (std dev of next-ball WP; 0.5 is the most a probability can have) and the ball it came before */
  leverage: { value: number; at: string } | null;
  noModel: string | null;
  stories: (Story & { receipt: Receipt })[];
  observedFrom: string;
  observedTo: string;
  receipt: Receipt;
  attribution: string;
}
