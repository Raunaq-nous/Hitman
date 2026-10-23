import { z } from "zod";
import type { PublicUserDTO } from "@/domain/users/types";

export interface CrewSummaryDTO { id: string; name: string; memberCount: number; isOwner: boolean }
export interface CrewMemberDTO { user: PublicUserDTO; joinedAt: string; isOwner: boolean }
export interface CrewDetailDTO { id: string; name: string; inviteCode: string; isOwner: boolean; members: CrewMemberDTO[] }

export const createCrewInput = z.object({ name: z.string().trim().min(2, "Give your crew a name of at least 2 characters").max(40, "Keep the crew name under 40 characters") });
export const joinCrewInput = z.object({ inviteCode: z.string().trim().toUpperCase().regex(/^[A-Z0-9]{6}$/, "Invite codes are 6 letters or digits") });
