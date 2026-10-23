import { describe, expect, it } from "vitest";
import { eventRoom, sportRooms } from "@/domain/rooms/service";
import { SPORTS } from "@/domain/facts/types";

describe("event rooms (rooms)", () => {
  it("every sport has a room list: events from recorded replays, or an honest pending reason", () => {
    for (const sport of SPORTS) {
      const r = sportRooms(sport);
      if (sport === "basketball" || sport === "tennis") {
        expect(r.events).toEqual([]);
        expect(r.pending).toMatch(/no source/i);
      } else expect(r.events.length).toBeGreaterThan(0);
    }
    expect(sportRooms("cricket").events.length).toBe(7);
  });

  it("a cricket room has a WP trace, peak leverage, stories and receipts", () => {
    const room = eventRoom("cricket", "cricsheet-1082625");
    expect(room).not.toBeNull();
    const r = room!;
    expect(r.name).toBe("Gujarat Lions v Mumbai Indians");
    expect(r.wp?.points.length).toBeGreaterThan(100);
    expect(r.wp?.points[0].t).toBe(0);
    for (const p of r.wp?.points ?? []) { expect(p.wp).toBeGreaterThanOrEqual(0); expect(p.wp).toBeLessThanOrEqual(1); }
    expect(r.leverage?.value).toBeGreaterThan(0);
    expect(r.leverage?.value).toBeLessThanOrEqual(0.5);
    expect(r.leverage?.at).toMatch(/^\d+\.\d$/);
    expect(r.stories.length).toBeGreaterThan(0);
    expect(r.observedFrom < r.observedTo).toBe(true);
    expect(r.receipt).toMatchObject({ sourceId: "cricsheet", sourceClass: "VERIFIED_DELAYED" });
  });

  it("rain-affected cricket, football and F1 rooms say the model is missing instead of showing numbers", () => {
    const dl = eventRoom("cricket", "cricsheet-1082648");
    expect(dl?.wp).toBeNull();
    expect(dl?.noModel).toMatch(/rain/i);
    const fb = eventRoom("football", "statsbomb-7525");
    expect(fb?.wp).toBeNull();
    expect(fb?.leverage).toBeNull();
    expect(fb?.stories.filter((s) => s.kind === "goal" || s.kind === "late-goal")).toHaveLength(5);
    expect(eventRoom("f1", "openf1-7953")?.noModel).toMatch(/no win-probability model/i);
    expect(eventRoom("cricket", "statsbomb-7525")).toBeNull();
    expect(eventRoom("cricket", "nope")).toBeNull();
  });
});
