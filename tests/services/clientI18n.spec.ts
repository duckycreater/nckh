import { afterAll, describe, expect, it } from "vitest";
import i18n from "../../src/lib/i18n";
import { tCardName } from "../../src/lib/cards";

describe("client i18n rendering", () => {
  afterAll(async () => {
    await i18n.changeLanguage("vi");
  });

  it("uses the canonical Vietnamese card name instead of the English fallback", async () => {
    await i18n.changeLanguage("vi");
    expect(tCardName("Chai nhựa PET")).toBe("Chai nhựa PET");
    expect(tCardName("Giấy note")).toBe("Giấy note");
  });

  it("still translates card names for English users", async () => {
    await i18n.changeLanguage("en");
    expect(tCardName("Chai nhựa PET")).toBe("PET Bottle");
    expect(tCardName("Giấy note")).toBe("Memo Paper");
  });

  it("resolves formerly raw interface keys in both canonical locales", async () => {
    const keys = [
      "admin.totalUsers",
      "aiScanner.cameraPreview",
      "bmoCare.moodHappy",
      "chatbot.voiceError",
      "dataset.title",
      "wasteRush.timeLeft",
    ];

    for (const language of ["vi", "en"]) {
      await i18n.changeLanguage(language);
      for (const key of keys) {
        expect(i18n.t(key), `${language}:${key}`).not.toBe(key);
      }
    }
  });

  it("humanizes an unknown dynamic key instead of exposing its raw path", async () => {
    await i18n.changeLanguage("vi");
    expect(i18n.t("futureFeature.someRawKey")).toBe("Some Raw Key");
  });
});
