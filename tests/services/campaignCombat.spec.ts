import { describe, expect, it } from "vitest";
import {
  applyCampaignCommand,
  createCampaignRun,
  getCampaignRunScore,
  getTargetIntent,
  isMaterialSynergy,
} from "../../shared/campaignCombat";

const team = [
  { id: 1, elementId: "plastic" as const, role: "vanguard" as const, name: "PET Vanguard" },
  { id: 91, elementId: "metal" as const, role: "striker" as const, name: "Steel Runner" },
  { id: 32, elementId: "paper" as const, role: "support" as const, name: "Carton Relay" },
];

describe("campaign salvage combat", () => {
  it("makes a clean material read resolve a node and build a combo", () => {
    const run = createCampaignRun("test-clean", team, [
      { id: 2, elementId: "plastic", name: "Film Warden" },
      { id: 92, elementId: "metal", name: "Plate Driver" },
    ]);
    const outcome = applyCampaignCommand(run, {
      type: "salvage",
      targetId: 2,
      operatorId: 1,
      claimedElementId: "plastic",
    });
    expect(outcome.event.result).toBe("clean");
    expect(outcome.state.targets.find((target) => target.id === 2)?.resolved).toBe(true);
    expect(outcome.state.combo).toBe(1);
    expect(outcome.state.ap).toBe(1);
  });

  it("rejects an impossible sync without spending AP", () => {
    const run = createCampaignRun("test-sync", team, [{ id: 61, elementId: "glass" }]);
    const outcome = applyCampaignCommand(run, {
      type: "sync",
      targetId: 61,
      firstOperatorId: 91,
      secondOperatorId: 32,
      claimedElementId: "glass",
    });
    expect(outcome.event.result).toBe("invalid");
    expect(outcome.state.ap).toBe(2);
    expect(outcome.state.targets[0].resolved).toBe(false);
  });

  it("keeps material synergies explicit instead of treating every pair as a combo", () => {
    expect(isMaterialSynergy("metal", "plastic")).toBe(true);
    expect(isMaterialSynergy("glass", "water")).toBe(true);
    expect(isMaterialSynergy("plastic", "hazard")).toBe(false);
  });

  it("gives material families distinct hazards and operator mechanics", () => {
    expect(getTargetIntent(91, 0, "metal")).toBe("impact");
    expect(getTargetIntent(151, 0, "hazard")).toBe("spill");
    expect(getTargetIntent(321, 0, "tech")).toBe("jam");

    const run = createCampaignRun("test-paper-tempo", team, [{ id: 31, elementId: "paper" }]);
    const outcome = applyCampaignCommand(run, {
      type: "salvage",
      targetId: 31,
      operatorId: 32,
      claimedElementId: "paper",
    });
    expect(outcome.state.combo).toBe(2);
    expect(outcome.state.log.some((entry) => entry.includes("PRINT TEMPO"))).toBe(true);
  });

  it("commits unused AP and always advances the hazard phase", () => {
    const run = createCampaignRun("test-commit", team, [{ id: 2, elementId: "plastic" }]);
    const outcome = applyCampaignCommand(run, { type: "commit" });
    expect(outcome.event.result).toBe("guarded");
    expect(outcome.state.turn).toBe(2);
    expect(outcome.state.ap).toBe(outcome.state.maxAp);
    expect(outcome.state.lastEnemyAction).not.toBe("No signal yet");
  });

  it("makes lane movement counter a telegraphed jam", () => {
    const exposed = createCampaignRun("test-jam-hit", team, [{ id: 321, elementId: "tech" }]);
    const jammed = applyCampaignCommand(exposed, { type: "commit" }).state;
    expect(jammed.operators[0].jammed).toBe(1);

    const evasive = createCampaignRun("test-jam-evade", team, [{ id: 321, elementId: "tech" }]);
    const shifted = applyCampaignCommand(evasive, {
      type: "shift",
      operatorId: 1,
      lane: "mid",
    }).state;
    const avoided = applyCampaignCommand(shifted, { type: "commit" }).state;
    expect(avoided.operators.every((operator) => operator.jammed === 0)).toBe(true);
    expect(avoided.lastEnemyAction).toContain("NO TARGET");
  });

  it("produces a deterministic score for the same state", () => {
    const run = createCampaignRun("test-score", team, [{ id: 2, elementId: "plastic" }]);
    const outcome = applyCampaignCommand(run, {
      type: "salvage",
      targetId: 2,
      operatorId: 1,
      claimedElementId: "plastic",
    });
    expect(getCampaignRunScore(outcome.state)).toBe(getCampaignRunScore(outcome.state));
    expect(getCampaignRunScore(outcome.state)).toBeGreaterThan(0);
  });
});
