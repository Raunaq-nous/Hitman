"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Pictogram } from "@/components/landing/Pictogram";
import { UiPictogram, type UiPictogramKey } from "@/ui/UiPictogram";
import type { SportKey } from "@/content/landing";

const SPORTS: { key: SportKey; label: string }[] = [
  { key: "cricket", label: "Cricket" }, { key: "football", label: "Football" }, { key: "basketball", label: "Basketball" }, { key: "f1", label: "Formula 1" }, { key: "tennis", label: "Tennis" },
];

const STEPS: { title: string; body: string; pictos: UiPictogramKey[] }[] = [
  { title: "Make the call before it happens", body: "You see a real moment exactly as it stood. Pick what should happen next, say how sure you are, and lock it before the outcome.", pictos: ["decide", "lock"] },
  { title: "We grade the decision, not the luck", body: "Your call is scored on what the numbers favoured when you made it. A good read that lost is still a good read. Every number has a receipt.", pictos: ["grade", "receipt"] },
  { title: "Your sports and your language", body: "Pick the sports you follow and the language you want. You can change these any time.", pictos: ["crew", "language"] },
];

export function Onboarding({ next }: { next: string }): React.JSX.Element {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [sports, setSports] = useState<SportKey[]>(["cricket"]);
  const [language, setLanguage] = useState<"en" | "hi">("en");
  const [error, setError] = useState<string | null>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const moved = useRef(false);
  // move focus to the new screen's heading on step changes (not on first load)
  useEffect(() => {
    if (moved.current) heading.current?.focus();
    moved.current = true;
  }, [step]);
  const s = STEPS[step];
  const last = step === STEPS.length - 1;

  async function finish(): Promise<void> {
    const res = await fetch("/api/me/preferences", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ sports, language }) });
    if (!res.ok) return setError("Couldn’t save your choices. Try again.");
    router.push(next);
  }

  return (
    <main className="onb" data-testid="onboarding">
      <p className="onb-progress" role="img" aria-label={`Step ${step + 1} of ${STEPS.length}`}>
        {STEPS.map((_, i) => <span key={i} data-on={i <= step ? "" : undefined} aria-hidden="true" />)}
      </p>
      <div className="onb-pictos">{s.pictos.map((p) => <UiPictogram key={p} name={p} className="onb-picto" />)}</div>
      <h1 ref={heading} tabIndex={-1}>{s.title}</h1>
      <p className="onb-body">{s.body}</p>
      {last && (
        <form className="onb-choices" onSubmit={(e) => { e.preventDefault(); void finish(); }}>
          <fieldset>
            <legend>Sports you follow</legend>
            <div className="onb-sports">
              {SPORTS.map((sp) => (
                <label key={sp.key} className="onb-sport">
                  <input type="checkbox" checked={sports.includes(sp.key)} onChange={(e) => setSports((cur) => (e.target.checked ? [...cur, sp.key] : cur.filter((x) => x !== sp.key)))} />
                  <Pictogram sport={sp.key} className="onb-sport-picto" />
                  <span>{sp.label}</span>
                </label>
              ))}
            </div>
          </fieldset>
          <fieldset>
            <legend>Language</legend>
            <label className="onb-lang"><input type="radio" name="lang" checked={language === "en"} onChange={() => setLanguage("en")} /> English</label>
            <label className="onb-lang" lang="hi"><input type="radio" name="lang" checked={language === "hi"} onChange={() => setLanguage("hi")} /> हिन्दी</label>
          </fieldset>
          {error && <p role="alert" className="crew-error">{error}</p>}
        </form>
      )}
      <div className="onb-nav">
        {step > 0 && <button type="button" className="onb-back" onClick={() => setStep(step - 1)}>Back</button>}
        {last ? <button type="button" onClick={() => void finish()} disabled={sports.length === 0}>Start</button> : <button type="button" onClick={() => setStep(step + 1)}>Next</button>}
      </div>
    </main>
  );
}
