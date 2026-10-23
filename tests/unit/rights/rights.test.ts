import { readdirSync, readFileSync } from "node:fs";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { assertRight, checkRight, listPolicies, rightsPolicy, RightsError, type RightsAction } from "@/rights";
import { prisma } from "@/lib/prisma";
import { resetDb } from "../../helpers/db";

const ON = { prototypeData: true };
const OFF = { prototypeData: false };
const ACTIONS: RightsAction[] = ["store", "display", "derive", "embed", "train", "video"];

describe("rights control plane", () => {
  it("every policy file matches the schema in data-and-rights.md and is registered", () => {
    const files = readdirSync("src/rights/policies").filter((f) => f.endsWith(".json"));
    for (const f of files) rightsPolicy.parse(JSON.parse(readFileSync(`src/rights/policies/${f}`, "utf8")));
    expect(listPolicies().map((p) => `${p.source_id}.json`).sort()).toEqual(files.sort());
  });

  it("allows and denies each action exactly as the policy says", () => {
    for (const p of listPolicies()) {
      const field = { store: p.may_store_history, display: p.may_display_raw, derive: p.may_create_derivatives, embed: p.may_embed_for_retrieval, train: p.may_train_models, video: p.may_show_video };
      for (const a of ACTIONS) {
        expect(checkRight(p.source_id, a, ON).ok, `${p.source_id} ${a}`).toBe(field[a]);
        if (field[a]) expect(assertRight(p.source_id, a, ON).source_id).toBe(p.source_id);
        else expect(() => assertRight(p.source_id, a, ON)).toThrow(RightsError);
      }
    }
  });

  it("cricsheet: store, display, derive, embed, train allowed; video denied", () => {
    for (const a of ["store", "display", "derive", "embed", "train"] as const) expect(checkRight("cricsheet", a, OFF).ok).toBe(true);
    expect(() => assertRight("cricsheet", "video", ON)).toThrow(/may_show_video/);
  });

  it("prototype-only sources are off when PROTOTYPE_DATA=false", () => {
    expect(checkRight("openf1", "display", ON).ok).toBe(true);
    expect(() => assertRight("openf1", "display", OFF)).toThrow(/prototype-only/);
    expect(() => assertRight("cricketdata", "display", OFF)).toThrow(/prototype-only/);
  });

  it("unknown sources are denied for every action", () => {
    for (const a of ACTIONS) expect(() => assertRight("random-blog", a, ON)).toThrow(/no rights policy/);
  });
});

describe("rights enforced by repos and services", () => {
  beforeAll(async () => { await resetDb(); });
  afterEach(() => { vi.unstubAllEnvs(); vi.resetModules(); });

  async function event(): Promise<string> {
    const comp = await prisma.competition.upsert({ where: { sportId_slug: { sportId: "cricket", slug: "r" } }, update: {}, create: { sportId: "cricket", slug: "r", name: "R" } });
    const season = await prisma.season.upsert({ where: { competitionId_label: { competitionId: comp.id, label: "1" } }, update: {}, create: { competitionId: comp.id, label: "1" } });
    return (await prisma.event.create({ data: { seasonId: season.id, sourceId: "cricsheet", sourceRef: `m${Math.random()}`, name: "x", startsAt: new Date(0), rightsPolicyId: "cricsheet" } })).id;
  }
  const inc = (sourceId: string, ref: string) => ({ t: 1, seq: 0, actor: null, type: "ball", payload: {}, sourceId, sourceRef: ref, sourceClass: "VERIFIED_DELAYED" as const, rightsPolicyId: sourceId, effectiveAt: new Date(0), observedAt: new Date(1), supersedesId: null });

  it("the incident repo stores licensed sources and refuses others before writing", async () => {
    const { appendIncidents } = await import("@/domain/facts/repo");
    const id = await event();
    expect(await appendIncidents(id, [inc("cricsheet", "a1")])).toBe(1);
    expect(await appendIncidents(id, [inc("cricsheet", "a1")])).toBe(0);
    await expect(appendIncidents(id, [inc("cricketdata", "a2")])).rejects.toThrow(/may_store_history/);
    await expect(appendIncidents(id, [inc("nowhere", "a3")])).rejects.toThrow(/no rights policy/);
    expect(await prisma.incident.count({ where: { eventId: id } })).toBe(1);
  });

  it("the live-score service refuses to display a prototype-only source when PROTOTYPE_DATA=false", async () => {
    vi.stubEnv("CRICKET_API_KEY", "k");
    vi.stubEnv("PROTOTYPE_DATA", "false");
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const { GET } = await import("@/app/api/live-score/route");
    const res = await GET();
    expect(res.status).toBe(503);
    expect(fetchMock).not.toHaveBeenCalled();
    vi.unstubAllGlobals();
  });
});

describe("rights enforced by retrieval", () => {
  it("drops documents whose source may not be embedded", async () => {
    const { embeddable } = await import("@/domain/retrieval/service");
    const docs = [
      { id: "1", sourceId: "cricsheet", observedAt: "2024-01-01T00:00:00Z", text: "a" },
      { id: "2", sourceId: "statsbomb", observedAt: "2024-01-01T00:00:00Z", text: "b" },
      { id: "3", sourceId: "unknown", observedAt: "2024-01-01T00:00:00Z", text: "c" },
    ];
    expect(embeddable(docs).map((d) => d.id)).toEqual(["1"]);
  });
});

describe("rights lookups", () => {
  it("getPolicy returns a policy or undefined", async () => {
    const { getPolicy } = await import("@/rights");
    expect(getPolicy("cricsheet")?.attribution_text).toBe("Data from Cricsheet (cricsheet.org)");
    expect(getPolicy("nope")).toBeUndefined();
  });
});
