// The five public analysts (docs/PRODUCT_SENSE.md). Cards live in src/personas/<slug>/card.json with a PLAYBOOK.md beside them.
// Public names only; every persona is an AI analyst.
import { z } from "zod";
import architect from "./architect/card.json";
import closer from "./closer/card.json";
import iceman from "./iceman/card.json";
import opener from "./opener/card.json";
import professor from "./professor/card.json";

export type PersonaSlug = "opener" | "closer" | "architect" | "professor" | "iceman";
export const PERSONA_SLUGS: PersonaSlug[] = ["opener", "closer", "architect", "professor", "iceman"];

const cardSchema = z.object({
  slug: z.enum(PERSONA_SLUGS),
  name: z.enum(["The Opener", "The Closer", "The Architect", "The Professor", "The Iceman"]),
  sport: z.string(),
  sportKey: z.enum(["cricket", "basketball", "football", "f1", "tennis"]),
  skillDomain: z.enum(["TIMING", "CRAFT", "TEMPO", "RACECRAFT", "ANGLES"]),
  colorToken: z.enum(["--opener", "--closer", "--architect", "--professor", "--iceman"]),
  signatureTool: z.string(),
  skillWords: z.array(z.string()).min(3),
}).strict();
export type PersonaCard = z.infer<typeof cardSchema>;

export const PERSONAS: Record<PersonaSlug, PersonaCard> = Object.fromEntries(
  [opener, closer, architect, professor, iceman].map((c) => {
    const card = cardSchema.parse(c);
    return [card.slug, card];
  }),
) as Record<PersonaSlug, PersonaCard>;

export const isPersonaSlug = (s: string): s is PersonaSlug => (PERSONA_SLUGS as string[]).includes(s);
