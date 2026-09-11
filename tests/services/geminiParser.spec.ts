import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { visionPipeline } from "../../server/services/visionPipeline.js";

describe("Gemini waste response parser", () => {
  it("accepts the strict six-class JSON contract", () => {
    const parsed = visionPipeline.parseGeminiStructuredResponse(
      JSON.stringify({
        category: "plastic",
        description: "Chai nhựa PET.",
        disposalInstructions: "Rửa sạch và bỏ vào thùng tái chế.",
      }),
    );
    assert.deepEqual(parsed, {
      category: "plastic",
      description: "Chai nhựa PET.",
      disposalInstructions: "Rửa sạch và bỏ vào thùng tái chế.",
    });
  });

  it("extracts JSON from a fenced model response", () => {
    const parsed = visionPipeline.parseGeminiStructuredResponse(
      '```json\n{"category":"hazard","description":"Pin cũ.","disposalInstructions":"Đưa tới điểm thu gom pin."}\n```',
    );
    assert.equal(parsed?.category, "hazard");
  });

  it("rejects unknown categories and incomplete output", () => {
    assert.equal(
      visionPipeline.parseGeminiStructuredResponse(
        '{"category":"other","description":"x","disposalInstructions":"y"}',
      ),
      null,
    );
    assert.equal(
      visionPipeline.parseGeminiStructuredResponse('{"category":"paper","description":"x"}'),
      null,
    );
  });
});
