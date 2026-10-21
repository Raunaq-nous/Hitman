// The five public analysts (docs/PRODUCT_SENSE.md). Public names only; every persona is an AI analyst.
import type { SportKey } from "@/content/landing";

export type PersonaSlug = "opener" | "closer" | "architect" | "professor" | "iceman";

export interface PersonaCard {
  slug: PersonaSlug;
  name: string;
  sport: string;
  sportKey: SportKey;
  skillDomain: "TIMING" | "CRAFT" | "TEMPO" | "RACECRAFT" | "ANGLES";
  colorToken: `--${PersonaSlug}`;
  signatureTool: string;
}

export const PERSONAS: Record<PersonaSlug, PersonaCard> = {
  opener: { slug: "opener", name: "The Opener", sport: "Cricket", sportKey: "cricket", skillDomain: "TIMING", colorToken: "--opener", signatureTool: "Over Call" },
  closer: { slug: "closer", name: "The Closer", sport: "Basketball", sportKey: "basketball", skillDomain: "CRAFT", colorToken: "--closer", signatureTool: "Clutch-time leverage" },
  architect: { slug: "architect", name: "The Architect", sport: "Football", sportKey: "football", skillDomain: "TEMPO", colorToken: "--architect", signatureTool: "Possession value" },
  professor: { slug: "professor", name: "The Professor", sport: "Formula 1", sportKey: "f1", skillDomain: "RACECRAFT", colorToken: "--professor", signatureTool: "Pit window" },
  iceman: { slug: "iceman", name: "The Iceman", sport: "Tennis", sportKey: "tennis", skillDomain: "ANGLES", colorToken: "--iceman", signatureTool: "Pressure Index" },
};

export const PERSONA_SLUGS: PersonaSlug[] = ["opener", "closer", "architect", "professor", "iceman"];
