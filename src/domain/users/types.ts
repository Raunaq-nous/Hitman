// Public user shape. The only way a user leaves the server: picks fields explicitly, so a password hash never can.
export interface PublicUserDTO {
  id: string;
  name: string;
  avatar: string | null;
  xp: number;
}

export function toPublicUser(u: { id: string; name: string; avatar?: string | null; xp?: number }): PublicUserDTO {
  return { id: u.id, name: u.name, avatar: u.avatar ?? null, xp: u.xp ?? 0 };
}

/** Fields repos may select for a public user. Never add `password` or `email`. */
export const PUBLIC_USER_SELECT = { id: true, name: true, avatar: true, xp: true } as const;

import { z } from "zod";
import { SPORTS } from "@/domain/facts/types";

export const LANGUAGES = ["en", "hi"] as const;
export type Language = (typeof LANGUAGES)[number];
export const preferencesInput = z.object({
  sports: z.array(z.enum(SPORTS)).max(5).transform((s) => [...new Set(s)]),
  language: z.enum(LANGUAGES),
});
export type Preferences = z.infer<typeof preferencesInput>;
