import { describe, expect, it } from "vitest";
import { buildModelInput } from "@/llm/prompt";
import { retrieve, type RetrievableDoc } from "@/llm/retrieval";
import { retrieveForSnapshot } from "@/domain/retrieval/service";

const CUTOFF = "2017-05-19T18:00:00Z";
const docs: RetrievableDoc[] = [
  { id: "a", sourceId: "cricsheet", observedAt: "2017-05-19T17:10:00Z", text: "Mumbai Indians and Gujarat Lions finish level; a super over decides the eliminator" },
  { id: "b", sourceId: "cricsheet", observedAt: "2017-05-19T19:30:00Z", text: "Mumbai Indians win the super over eliminator" },
  { id: "c", sourceId: "cricsheet", observedAt: "2017-05-18T12:00:00Z", text: "Gujarat Lions bowling plans at the death" },
  { id: "d", sourceId: "unlicensed-blog", observedAt: "2017-05-19T10:00:00Z", text: "super over eliminator Mumbai Indians preview" },
];
const canUse = (sourceId: string): boolean => sourceId === "cricsheet";

describe("retrieval with a temporal filter (retrieval)", () => {
  it("never returns a document observed after the cutoff, however well it matches", () => {
    const got = retrieve("Mumbai Indians super over eliminator", docs, { observedCutoff: CUTOFF, canUse });
    expect(got.map((d) => d.id)).toEqual(["a"]);
    // the same query after the match finds the result
    expect(retrieve("Mumbai Indians super over eliminator", docs, { observedCutoff: "2017-05-20T00:00:00Z", canUse })[0].id).toBe("b");
  });

  it("drops sources we may not use, documents with no matching terms, and caps k", () => {
    const got = retrieve("super over", docs, { observedCutoff: "2018-01-01T00:00:00Z", canUse, k: 1 });
    expect(got).toHaveLength(1);
    expect(retrieve("super over", docs, { observedCutoff: "2018-01-01T00:00:00Z", canUse }).some((d) => d.id === "d")).toBe(false);
    expect(retrieve("xyzzy", docs, { observedCutoff: "2018-01-01T00:00:00Z", canUse })).toEqual([]);
    expect(retrieve("", docs, { observedCutoff: "2018-01-01T00:00:00Z", canUse })).toEqual([]);
    expect(() => retrieve("x", docs, { observedCutoff: "not a date", canUse })).toThrow(RangeError);
  });

  it("is deterministic: ties break by most recent observation, then id", () => {
    const twins: RetrievableDoc[] = [
      { id: "y", sourceId: "cricsheet", observedAt: "2017-05-01T00:00:00Z", text: "death overs" },
      { id: "x", sourceId: "cricsheet", observedAt: "2017-05-01T00:00:00Z", text: "death overs" },
      { id: "z", sourceId: "cricsheet", observedAt: "2017-05-02T00:00:00Z", text: "death overs" },
    ];
    expect(retrieve("death", twins, { observedCutoff: CUTOFF, canUse }).map((d) => d.id)).toEqual(["z", "x", "y"]);
  });

  it("model input drops retrieved text and facts observed after the snapshot cutoff", () => {
    const input = buildModelInput({
      facts: [
        { id: "f1", value: 153, sourceId: "cricsheet", observedAt: "2017-05-19T17:00:00Z", kind: "OBSERVED" },
        { id: "f2", value: "Mumbai Indians", sourceId: "cricsheet", observedAt: "2017-05-19T19:30:00Z", kind: "OBSERVED" },
      ],
      retrieved: docs.slice(0, 2),
      snapshotCutoff: CUTOFF,
    });
    expect(input.facts.map((f) => f.id)).toEqual(["f1"]);
    expect(input.untrusted_context.map((d) => d.id)).toEqual(["a"]);
  });

  it("the domain retrieval applies both rules: indexable sources only, nothing after the cutoff", () => {
    const withStatsBomb = [...docs, { id: "e", sourceId: "statsbomb", observedAt: "2017-05-19T10:00:00Z", text: "super over eliminator" }];
    expect(retrieveForSnapshot("super over eliminator", withStatsBomb, CUTOFF).map((d) => d.id)).toEqual(["a"]);
    expect(retrieveForSnapshot("super over eliminator", withStatsBomb, "2017-05-20T00:00:00Z", 1).map((d) => d.id)).toEqual(["b"]);
  });
});
