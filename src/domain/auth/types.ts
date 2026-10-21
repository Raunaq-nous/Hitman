import { z } from "zod";

export const PASSWORD_MIN = 10;

export const passwordPolicy = z.string()
  .min(PASSWORD_MIN, `Use a password of at least ${PASSWORD_MIN} characters.`)
  .max(128, "Use a password of at most 128 characters.");

export const registerInput = z.object({
  name: z.string().trim().min(1, "Name, email and password are required.").max(60, "Keep your name under 60 characters."),
  email: z.string().trim().toLowerCase().email("Enter a valid email address."),
  password: passwordPolicy,
  ageConfirmed: z.literal(true, { error: "ALTER EGO’s beta is for people aged 18 and over. Please confirm your age to continue." }),
});
export type RegisterInput = z.infer<typeof registerInput>;
