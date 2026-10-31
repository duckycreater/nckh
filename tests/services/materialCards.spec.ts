import { beforeEach, describe, expect, it } from "vitest";
import { buildCardPreview, expectedActionForScenario } from "../../shared/materialCards.js";
import {
  createMaterialCard,
  createMaterialMatch,
  getMaterialMatch,
  materialCardTestUtils,
  saveMaterialScan,
} from "../../server/services/materialCards.js";
import { parseMaterialScanAnalysis } from "../../server/services/materialScanAnalysis.js";

const SCAN_ID = "9b8ea5cb-3f42-465e-ae5a-e20486842dc5";

function validScanJson(overrides: Record<string, unknown> = {}) {
  return JSON.stringify({
    verdict: "single_waste",
    objectName: "Chai nước nhựa",
    category: "plastic",
    description: "Một chai nhựa trong đã sử dụng.",
    disposalInstructions: "Làm sạch, để khô và chuyển vào tuyến nhựa phù hợp.",
    observedConditions: ["transparent", "material_code_visible"],
    uncertaintyReason: null,
    ...overrides,
  });
}

describe("material scan contract", () => {
  it("rejects malformed AI JSON instead of defaulting to organic", () => {
    const result = parseMaterialScanAnalysis("not-json", SCAN_ID);
    expect(result.verdict).toBe("uncertain");
    expect(result.category).toBeNull();
    expect(result.eligibleForCard).toBe(false);
    expect(result.properties).toEqual([]);
  });

  it("does not turn non-waste or multiple objects into a card", () => {
    for (const verdict of ["not_waste", "multiple_objects", "uncertain"] as const) {
      const result = parseMaterialScanAnalysis(
        validScanJson({ verdict, category: "plastic", uncertaintyReason: "Không đủ điều kiện." }),
        SCAN_ID,
      );
      expect(result.category).toBeNull();
      expect(result.eligibleForCard).toBe(false);
    }
  });

  it("separates visual evidence from versioned material knowledge", () => {
    const result = parseMaterialScanAnalysis(validScanJson(), SCAN_ID);
    expect(result.eligibleForCard).toBe(true);
    expect(result.properties.find((property) => property.id === "transparent")?.source).toBe(
      "visual_observation",
    );
    expect(result.properties.find((property) => property.id === "recyclable")?.source).toBe(
      "material_library",
    );
    expect(result.properties.some((property) => property.id === "compostable")).toBe(false);
    const preview = buildCardPreview(
      SCAN_ID,
      result.objectName,
      result.category!,
      null,
      result.properties,
    );
    expect(
      [...preview.passive.basedOn, ...preview.active.basedOn].every((id) =>
        preview.propertyIds.includes(id),
      ),
    ).toBe(true);
  });
});

describe("material card transaction", () => {
  beforeEach(() => materialCardTestUtils.reset());

  it("is idempotent under concurrent create requests and debits once", async () => {
    const analysis = parseMaterialScanAnalysis(validScanJson(), SCAN_ID);
    const preview = buildCardPreview(
      SCAN_ID,
      analysis.objectName,
      analysis.category!,
      "https://example.invalid/card.jpg",
      analysis.properties,
    );
    await saveMaterialScan({
      id: SCAN_ID,
      ownerNick: "alice",
      ownerId: "user-alice",
      imageHash: "hash-a",
      imageUrl: preview.imageUrl,
      analysis,
      preview,
      cardId: null,
      createdAt: Date.now(),
      expiresAt: Date.now() + 86_400_000,
    });
    let points = 100;
    let debitCalls = 0;
    const localEconomy = {
      getPoints: async () => points,
      debit: async (amount: number) => {
        debitCalls += 1;
        points -= amount;
        return points;
      },
    };
    const request = () =>
      createMaterialCard({
        ownerNick: "alice",
        ownerId: "user-alice",
        scanId: SCAN_ID,
        idempotencyKey: `create:${SCAN_ID}`,
        localEconomy,
      });
    const [first, retry] = await Promise.all([request(), request()]);
    expect(first.card.id).toBe(retry.card.id);
    expect([first.charged, retry.charged].filter(Boolean)).toHaveLength(1);
    expect(debitCalls).toBe(1);
    expect(points).toBe(50);
  });

  it("rejects a skill card that is not in the server-owned deck", () => {
    const round = materialCardTestUtils.buildRounds("fixed-seed")[0]!;
    expect(round.objects.every((object) => !("expectedAction" in object))).toBe(true);
    const choices = round.objects.map((object) => ({
      objectId: object.id,
      action: expectedActionForScenario(object),
    }));
    expect(() =>
      materialCardTestUtils.scoreSubmission(
        round,
        { roundIndex: 0, choices, abilityCardId: "forged-card" },
        [{ id: "owned-card", category: "plastic", abilityName: "Ép gọn", sample: false }],
      ),
    ).toThrow(/không thuộc bộ thẻ/i);
  });

  it("does not apply paper compaction to wet paper", () => {
    const round = {
      index: 0,
      actionBudget: 5,
      transportBudget: 3,
      objects: [
        {
          id: "wet-paper",
          label: "Giấy ướt",
          category: "paper" as const,
          condition: "wet" as const,
        },
        { id: "plastic", label: "Chai", category: "plastic" as const, condition: "clean" as const },
        { id: "metal", label: "Lon", category: "metal" as const, condition: "clean" as const },
      ],
    };
    const choices = round.objects.map((object) => ({
      objectId: object.id,
      action: expectedActionForScenario(object),
    }));
    const base = materialCardTestUtils.scoreSubmission(round, { roundIndex: 0, choices }, []);
    const withSkill = materialCardTestUtils.scoreSubmission(
      round,
      {
        roundIndex: 0,
        choices,
        abilityCardId: "paper-card",
        abilityTargetId: "wet-paper",
      },
      [{ id: "paper-card", category: "paper", abilityName: "Ép phẳng", sample: false }],
    );
    expect(withSkill).toBe(base);
  });

  it("uses processing state, resources, and an explainable score", () => {
    const round = {
      index: 0,
      actionBudget: 5,
      transportBudget: 3,
      objects: [
        {
          id: "wet-paper",
          label: "Giấy ướt",
          category: "paper" as const,
          condition: "wet" as const,
          transportCost: 1 as const,
        },
        {
          id: "broken-glass",
          label: "Ly vỡ",
          category: "glass" as const,
          condition: "broken" as const,
          transportCost: 1 as const,
        },
        {
          id: "battery",
          label: "Pin",
          category: "hazard" as const,
          condition: "clean" as const,
          transportCost: 1 as const,
        },
      ],
    };
    const evaluation = materialCardTestUtils.evaluateSubmission(round, {
      roundIndex: 0,
      choices: [
        { objectId: "wet-paper", action: "recycle", steps: ["dry"] },
        { objectId: "broken-glass", action: "recycle", steps: ["protect"] },
        { objectId: "battery", action: "special_collection", steps: [] },
      ],
    });
    expect(evaluation.safety).toBe(evaluation.safetyMax);
    expect(evaluation.correctness).toBe(evaluation.correctnessMax);
    expect(evaluation.actionsUsed).toBe(2);
    expect(evaluation.transportUsed).toBe(3);
    expect(evaluation.log).toHaveLength(3);
  });

  it("rejects processing actions beyond the server-owned round budget", () => {
    const round = materialCardTestUtils.buildRounds("budget-seed")[0]!;
    const choices = round.objects.map((object) => ({
      objectId: object.id,
      action: expectedActionForScenario(object),
      steps: ["clean", "dry", "protect"] as const,
    }));
    expect(() =>
      materialCardTestUtils.evaluateSubmission(round, {
        roundIndex: round.index,
        choices: choices.map((choice) => ({ ...choice, steps: [...choice.steps] })),
      }),
    ).toThrow(/Vượt quá 5 lượt/i);
  });

  it("normalizes match identities and blocks case-variant self challenges", async () => {
    await expect(
      createMaterialMatch({
        playerId: "Alice",
        playerNick: "Alice",
        opponentId: "alice",
        deckCardIds: [],
      }),
    ).rejects.toMatchObject({ code: "invalid_submission" });

    const practice = await createMaterialMatch({
      playerId: "Alice",
      playerNick: "Alice",
      deckCardIds: [],
    });
    expect(practice.playerId).toBe("alice");
    await expect(getMaterialMatch(practice.id, "ALICE")).resolves.toMatchObject({
      id: practice.id,
    });
  });
});
