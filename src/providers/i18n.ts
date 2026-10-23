// The reader's language enters server components here: the ae_lang cookie (set by onboarding and the nav toggle).
import { cookies } from "next/headers";
import { isLang, LANG_COOKIE, type Lang } from "@/i18n";

export { t, LANGS, isLang, LANG_COOKIE, type Lang, type MessageKey } from "@/i18n";

export async function currentLang(): Promise<Lang> {
  const v = (await cookies()).get(LANG_COOKIE)?.value;
  return isLang(v) ? v : "en";
}
