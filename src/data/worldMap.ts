// ─── World Campaign Map ─────────────────────────────────────────────────────────
// 10 regions, 100 stages, massive open-world style campaign progression

export const REGIONS = [
  // ── Region 1: Bãi Rác Ven Đường (The Roadside Dump) ────────────────────
  {
    id: "region_01",
    nameKey: "campaign.region_01.name",
    descriptionKey: "campaign.region_01.desc",
    gradient: "from-slate-600 via-zinc-700 to-stone-800",
    accentColor: "#94a3b8",
    requiredPlayerLevel: 1,
    requiredPreviousRegion: null,
    stages: [
      { id: "s01_01", nameKey: "campaign.s01_01.name", type: "trash", staminaCost: 5, stars: [{ xp: 10, gold: 5 }, { xp: 15, gold: 8 }, { xp: 20, gold: 12 }], trashCardIds: [1, 2, 3, 4, 5], bossCardId: null, hpMult: 1, atkMult: 1, guaranteedDrop: null, possibleDrops: [1, 2, 3] },
      { id: "s01_02", nameKey: "campaign.s01_02.name", type: "trash", staminaCost: 5, stars: [{ xp: 12, gold: 6 }, { xp: 18, gold: 10 }, { xp: 24, gold: 14 }], trashCardIds: [6, 7, 8, 9, 10], bossCardId: null, hpMult: 1, atkMult: 1, guaranteedDrop: null, possibleDrops: [4, 5, 6] },
      { id: "s01_03", nameKey: "campaign.s01_03.name", type: "trash", staminaCost: 5, stars: [{ xp: 14, gold: 7 }, { xp: 21, gold: 12 }, { xp: 28, gold: 16 }], trashCardIds: [11, 12, 13, 14, 15], bossCardId: null, hpMult: 1, atkMult: 1, guaranteedDrop: null, possibleDrops: [7, 8, 9] },
      { id: "s01_04", nameKey: "campaign.s01_04.name", type: "trash", staminaCost: 5, stars: [{ xp: 16, gold: 8 }, { xp: 24, gold: 14 }, { xp: 32, gold: 20 }], trashCardIds: [16, 17, 18, 19, 20], bossCardId: null, hpMult: 1, atkMult: 1, guaranteedDrop: null, possibleDrops: [10, 11, 12] },
      { id: "s01_05", nameKey: "campaign.s01_05.name", type: "miniboss", staminaCost: 8, stars: [{ xp: 25, gold: 15 }, { xp: 35, gold: 22 }, { xp: 50, gold: 30 }], trashCardIds: [21, 22, 23], bossCardId: 301, hpMult: 1.2, atkMult: 1.1, guaranteedDrop: 21, possibleDrops: [13, 14, 15, 16] },
      { id: "s01_06", nameKey: "campaign.s01_06.name", type: "trash", staminaCost: 6, stars: [{ xp: 18, gold: 9 }, { xp: 27, gold: 16 }, { xp: 36, gold: 22 }], trashCardIds: [24, 25, 26, 27, 28], bossCardId: null, hpMult: 1, atkMult: 1, guaranteedDrop: null, possibleDrops: [17, 18, 19] },
      { id: "s01_07", nameKey: "campaign.s01_07.name", type: "trash", staminaCost: 6, stars: [{ xp: 20, gold: 10 }, { xp: 30, gold: 18 }, { xp: 40, gold: 25 }], trashCardIds: [29, 30, 1, 2, 3], bossCardId: null, hpMult: 1, atkMult: 1, guaranteedDrop: null, possibleDrops: [20, 21, 22] },
      { id: "s01_08", nameKey: "campaign.s01_08.name", type: "trash", staminaCost: 6, stars: [{ xp: 22, gold: 11 }, { xp: 33, gold: 20 }, { xp: 44, gold: 28 }], trashCardIds: [4, 5, 6, 7, 8], bossCardId: null, hpMult: 1, atkMult: 1, guaranteedDrop: null, possibleDrops: [23, 24, 25] },
      { id: "s01_09", nameKey: "campaign.s01_09.name", type: "elite", staminaCost: 10, stars: [{ xp: 35, gold: 20 }, { xp: 50, gold: 30 }, { xp: 70, gold: 40 }], trashCardIds: [9, 10, 11], bossCardId: 302, hpMult: 1.5, atkMult: 1.3, guaranteedDrop: 29, possibleDrops: [26, 27, 28, 30] },
      { id: "s01_10", nameKey: "campaign.s01_10.name", type: "boss", staminaCost: 15, stars: [{ xp: 60, gold: 35 }, { xp: 80, gold: 50 }, { xp: 120, gold: 70 }], trashCardIds: [12, 13, 14, 15, 16], bossCardId: 303, hpMult: 2.0, atkMult: 1.5, guaranteedDrop: 181, possibleDrops: [17, 18, 19, 20, 21] },
    ],
  },

  // ── Region 2: Khu Chợ Trời (The Flea Market) ───────────────────────────
  {
    id: "region_02",
    nameKey: "campaign.region_02.name",
    descriptionKey: "campaign.region_02.desc",
    gradient: "from-amber-700 via-orange-800 to-red-900",
    accentColor: "#f59e0b",
    requiredPlayerLevel: 5,
    requiredPreviousRegion: "region_01",
    stages: [
      { id: "s02_01", nameKey: "campaign.s02_01.name", type: "trash", staminaCost: 8, stars: [{ xp: 25, gold: 15 }, { xp: 38, gold: 24 }, { xp: 52, gold: 32 }], trashCardIds: [31, 32, 33, 34, 35], bossCardId: null, hpMult: 1.1, atkMult: 1.05, guaranteedDrop: null, possibleDrops: [31, 32, 33] },
      { id: "s02_02", nameKey: "campaign.s02_02.name", type: "trash", staminaCost: 8, stars: [{ xp: 28, gold: 18 }, { xp: 42, gold: 28 }, { xp: 56, gold: 38 }], trashCardIds: [36, 37, 38, 39, 40], bossCardId: null, hpMult: 1.1, atkMult: 1.05, guaranteedDrop: null, possibleDrops: [34, 35, 36] },
      { id: "s02_03", nameKey: "campaign.s02_03.name", type: "trash", staminaCost: 8, stars: [{ xp: 32, gold: 20 }, { xp: 48, gold: 32 }, { xp: 64, gold: 44 }], trashCardIds: [41, 42, 43, 44, 45], bossCardId: null, hpMult: 1.15, atkMult: 1.1, guaranteedDrop: null, possibleDrops: [37, 38, 39] },
      { id: "s02_04", nameKey: "campaign.s02_04.name", type: "trash", staminaCost: 8, stars: [{ xp: 36, gold: 22 }, { xp: 54, gold: 36 }, { xp: 72, gold: 50 }], trashCardIds: [46, 47, 48, 49, 50], bossCardId: null, hpMult: 1.2, atkMult: 1.15, guaranteedDrop: null, possibleDrops: [40, 41, 42] },
      { id: "s02_05", nameKey: "campaign.s02_05.name", type: "miniboss", staminaCost: 12, stars: [{ xp: 55, gold: 35 }, { xp: 75, gold: 50 }, { xp: 100, gold: 65 }], trashCardIds: [51, 52, 53], bossCardId: 304, hpMult: 1.5, atkMult: 1.4, guaranteedDrop: 196, possibleDrops: [43, 44, 45, 46] },
      { id: "s02_06", nameKey: "campaign.s02_06.name", type: "trash", staminaCost: 10, stars: [{ xp: 40, gold: 25 }, { xp: 60, gold: 40 }, { xp: 80, gold: 55 }], trashCardIds: [54, 55, 56, 57, 58], bossCardId: null, hpMult: 1.3, atkMult: 1.2, guaranteedDrop: null, possibleDrops: [47, 48, 49] },
      { id: "s02_07", nameKey: "campaign.s02_07.name", type: "trash", staminaCost: 10, stars: [{ xp: 44, gold: 28 }, { xp: 66, gold: 44 }, { xp: 88, gold: 60 }], trashCardIds: [59, 60, 61, 62, 63], bossCardId: null, hpMult: 1.35, atkMult: 1.25, guaranteedDrop: null, possibleDrops: [50, 51, 52] },
      { id: "s02_08", nameKey: "campaign.s02_08.name", type: "trash", staminaCost: 10, stars: [{ xp: 48, gold: 30 }, { xp: 72, gold: 48 }, { xp: 96, gold: 66 }], trashCardIds: [64, 65, 66, 67, 68], bossCardId: null, hpMult: 1.4, atkMult: 1.3, guaranteedDrop: null, possibleDrops: [53, 54, 55] },
      { id: "s02_09", nameKey: "campaign.s02_09.name", type: "elite", staminaCost: 15, stars: [{ xp: 70, gold: 45 }, { xp: 100, gold: 65 }, { xp: 140, gold: 90 }], trashCardIds: [69, 70, 71], bossCardId: 305, hpMult: 1.8, atkMult: 1.6, guaranteedDrop: 197, possibleDrops: [56, 57, 58, 59] },
      { id: "s02_10", nameKey: "campaign.s02_10.name", type: "boss", staminaCost: 20, stars: [{ xp: 100, gold: 65 }, { xp: 140, gold: 90 }, { xp: 200, gold: 130 }], trashCardIds: [72, 73, 74, 75, 76], bossCardId: 306, hpMult: 2.5, atkMult: 2.0, guaranteedDrop: 182, possibleDrops: [60, 61, 62, 63, 64] },
    ],
  },

  // ── Region 3: Bãi Rác Công Nghiệp (Industrial Waste Zone) ─────────────────
  {
    id: "region_03",
    nameKey: "campaign.region_03.name",
    descriptionKey: "campaign.region_03.desc",
    gradient: "from-slate-800 via-zinc-900 to-neutral-950",
    accentColor: "#64748b",
    requiredPlayerLevel: 10,
    requiredPreviousRegion: "region_02",
    stages: [
      { id: "s03_01", nameKey: "campaign.s03_01.name", type: "trash", staminaCost: 12, stars: [{ xp: 50, gold: 30 }, { xp: 75, gold: 48 }, { xp: 100, gold: 65 }], trashCardIds: [91, 92, 93, 94, 95], bossCardId: null, hpMult: 1.4, atkMult: 1.3, guaranteedDrop: null, possibleDrops: [91, 92, 93] },
      { id: "s03_02", nameKey: "campaign.s03_02.name", type: "trash", staminaCost: 12, stars: [{ xp: 55, gold: 35 }, { xp: 82, gold: 55 }, { xp: 110, gold: 75 }], trashCardIds: [96, 97, 98, 99, 100], bossCardId: null, hpMult: 1.5, atkMult: 1.4, guaranteedDrop: null, possibleDrops: [94, 95, 96] },
      { id: "s03_03", nameKey: "campaign.s03_03.name", type: "trash", staminaCost: 12, stars: [{ xp: 60, gold: 40 }, { xp: 90, gold: 62 }, { xp: 120, gold: 85 }], trashCardIds: [101, 102, 103, 104, 105], bossCardId: null, hpMult: 1.6, atkMult: 1.5, guaranteedDrop: null, possibleDrops: [97, 98, 99] },
      { id: "s03_04", nameKey: "campaign.s03_04.name", type: "trash", staminaCost: 12, stars: [{ xp: 65, gold: 42 }, { xp: 98, gold: 68 }, { xp: 130, gold: 92 }], trashCardIds: [106, 107, 108, 109, 110], bossCardId: null, hpMult: 1.7, atkMult: 1.6, guaranteedDrop: null, possibleDrops: [100, 101, 102] },
      { id: "s03_05", nameKey: "campaign.s03_05.name", type: "miniboss", staminaCost: 16, stars: [{ xp: 90, gold: 60 }, { xp: 130, gold: 88 }, { xp: 180, gold: 120 }], trashCardIds: [111, 112, 113], bossCardId: 307, hpMult: 2.0, atkMult: 1.8, guaranteedDrop: 226, possibleDrops: [103, 104, 105, 106] },
      { id: "s03_06", nameKey: "campaign.s03_06.name", type: "trash", staminaCost: 14, stars: [{ xp: 70, gold: 45 }, { xp: 105, gold: 72 }, { xp: 140, gold: 100 }], trashCardIds: [114, 115, 116, 117, 118], bossCardId: null, hpMult: 1.8, atkMult: 1.7, guaranteedDrop: null, possibleDrops: [107, 108, 109] },
      { id: "s03_07", nameKey: "campaign.s03_07.name", type: "trash", staminaCost: 14, stars: [{ xp: 75, gold: 48 }, { xp: 112, gold: 78 }, { xp: 150, gold: 108 }], trashCardIds: [119, 120, 91, 92, 93], bossCardId: null, hpMult: 1.9, atkMult: 1.8, guaranteedDrop: null, possibleDrops: [110, 111, 112] },
      { id: "s03_08", nameKey: "campaign.s03_08.name", type: "trash", staminaCost: 14, stars: [{ xp: 80, gold: 52 }, { xp: 120, gold: 84 }, { xp: 160, gold: 116 }], trashCardIds: [94, 95, 96, 97, 98], bossCardId: null, hpMult: 2.0, atkMult: 1.9, guaranteedDrop: null, possibleDrops: [113, 114, 115] },
      { id: "s03_09", nameKey: "campaign.s03_09.name", type: "elite", staminaCost: 20, stars: [{ xp: 120, gold: 80 }, { xp: 170, gold: 115 }, { xp: 240, gold: 160 }], trashCardIds: [99, 100, 101], bossCardId: 308, hpMult: 2.5, atkMult: 2.2, guaranteedDrop: 227, possibleDrops: [116, 117, 118, 119] },
      { id: "s03_10", nameKey: "campaign.s03_10.name", type: "boss", staminaCost: 25, stars: [{ xp: 160, gold: 110 }, { xp: 220, gold: 155 }, { xp: 320, gold: 220 }], trashCardIds: [102, 103, 104, 105, 106], bossCardId: 309, hpMult: 3.5, atkMult: 2.8, guaranteedDrop: 183, possibleDrops: [120, 181, 182, 183, 184] },
    ],
  },

  // ── Region 4: Trạm Trung Chuyển (The Transfer Station) ─────────────────────
  {
    id: "region_04",
    nameKey: "campaign.region_04.name",
    descriptionKey: "campaign.region_04.desc",
    gradient: "from-green-800 via-emerald-900 to-teal-950",
    accentColor: "#22c55e",
    requiredPlayerLevel: 15,
    requiredPreviousRegion: "region_03",
    stages: [
      { id: "s04_01", nameKey: "campaign.s04_01.name", type: "trash", staminaCost: 15, stars: [{ xp: 80, gold: 50 }, { xp: 120, gold: 80 }, { xp: 160, gold: 110 }], trashCardIds: [121, 122, 123, 124, 125], bossCardId: null, hpMult: 2.0, atkMult: 1.9, guaranteedDrop: null, possibleDrops: [121, 122, 123] },
      { id: "s04_02", nameKey: "campaign.s04_02.name", type: "trash", staminaCost: 15, stars: [{ xp: 85, gold: 55 }, { xp: 128, gold: 88 }, { xp: 170, gold: 120 }], trashCardIds: [126, 127, 128, 129, 130], bossCardId: null, hpMult: 2.1, atkMult: 2.0, guaranteedDrop: null, possibleDrops: [124, 125, 126] },
      { id: "s04_03", nameKey: "campaign.s04_03.name", type: "trash", staminaCost: 15, stars: [{ xp: 90, gold: 60 }, { xp: 135, gold: 96 }, { xp: 180, gold: 130 }], trashCardIds: [131, 132, 133, 134, 135], bossCardId: null, hpMult: 2.2, atkMult: 2.1, guaranteedDrop: null, possibleDrops: [127, 128, 129] },
      { id: "s04_04", nameKey: "campaign.s04_04.name", type: "trash", staminaCost: 15, stars: [{ xp: 95, gold: 62 }, { xp: 142, gold: 100 }, { xp: 190, gold: 138 }], trashCardIds: [136, 137, 138, 139, 140], bossCardId: null, hpMult: 2.3, atkMult: 2.2, guaranteedDrop: null, possibleDrops: [130, 131, 132] },
      { id: "s04_05", nameKey: "campaign.s04_05.name", type: "miniboss", staminaCost: 20, stars: [{ xp: 140, gold: 95 }, { xp: 200, gold: 135 }, { xp: 280, gold: 185 }], trashCardIds: [141, 142, 143], bossCardId: 310, hpMult: 2.8, atkMult: 2.5, guaranteedDrop: 241, possibleDrops: [133, 134, 135, 136] },
      { id: "s04_06", nameKey: "campaign.s04_06.name", type: "trash", staminaCost: 18, stars: [{ xp: 100, gold: 65 }, { xp: 150, gold: 104 }, { xp: 200, gold: 142 }], trashCardIds: [144, 145, 146, 147, 148], bossCardId: null, hpMult: 2.5, atkMult: 2.4, guaranteedDrop: null, possibleDrops: [137, 138, 139] },
      { id: "s04_07", nameKey: "campaign.s04_07.name", type: "trash", staminaCost: 18, stars: [{ xp: 105, gold: 68 }, { xp: 158, gold: 112 }, { xp: 210, gold: 154 }], trashCardIds: [149, 150, 121, 122, 123], bossCardId: null, hpMult: 2.6, atkMult: 2.5, guaranteedDrop: null, possibleDrops: [140, 141, 142] },
      { id: "s04_08", nameKey: "campaign.s04_08.name", type: "trash", staminaCost: 18, stars: [{ xp: 110, gold: 72 }, { xp: 165, gold: 118 }, { xp: 220, gold: 162 }], trashCardIds: [124, 125, 126, 127, 128], bossCardId: null, hpMult: 2.7, atkMult: 2.6, guaranteedDrop: null, possibleDrops: [143, 144, 145] },
      { id: "s04_09", nameKey: "campaign.s04_09.name", type: "elite", staminaCost: 25, stars: [{ xp: 180, gold: 120 }, { xp: 260, gold: 170 }, { xp: 360, gold: 235 }], trashCardIds: [129, 130, 131], bossCardId: 311, hpMult: 3.2, atkMult: 3.0, guaranteedDrop: 242, possibleDrops: [146, 147, 148, 149] },
      { id: "s04_10", nameKey: "campaign.s04_10.name", type: "boss", staminaCost: 30, stars: [{ xp: 250, gold: 170 }, { xp: 350, gold: 240 }, { xp: 500, gold: 340 }], trashCardIds: [132, 133, 134, 135, 136], bossCardId: 312, hpMult: 4.5, atkMult: 3.5, guaranteedDrop: 184, possibleDrops: [150, 185, 186, 187, 188] },
    ],
  },

  // ── Region 5: Vùng Đất Chất Thải (The Toxic Waste Land) ──────────────────
  {
    id: "region_05",
    nameKey: "campaign.region_05.name",
    descriptionKey: "campaign.region_05.desc",
    gradient: "from-red-900 via-rose-950 to-neutral-950",
    accentColor: "#ef4444",
    requiredPlayerLevel: 20,
    requiredPreviousRegion: "region_04",
    stages: [
      { id: "s05_01", nameKey: "campaign.s05_01.name", type: "trash", staminaCost: 20, stars: [{ xp: 120, gold: 80 }, { xp: 180, gold: 125 }, { xp: 240, gold: 170 }], trashCardIds: [151, 152, 153, 154, 155], bossCardId: null, hpMult: 2.8, atkMult: 2.6, guaranteedDrop: null, possibleDrops: [151, 152, 153] },
      { id: "s05_02", nameKey: "campaign.s05_02.name", type: "trash", staminaCost: 20, stars: [{ xp: 130, gold: 88 }, { xp: 195, gold: 138 }, { xp: 260, gold: 188 }], trashCardIds: [156, 157, 158, 159, 160], bossCardId: null, hpMult: 3.0, atkMult: 2.8, guaranteedDrop: null, possibleDrops: [154, 155, 156] },
      { id: "s05_03", nameKey: "campaign.s05_03.name", type: "trash", staminaCost: 20, stars: [{ xp: 140, gold: 95 }, { xp: 210, gold: 150 }, { xp: 280, gold: 205 }], trashCardIds: [161, 162, 163, 164, 165], bossCardId: null, hpMult: 3.2, atkMult: 3.0, guaranteedDrop: null, possibleDrops: [157, 158, 159] },
      { id: "s05_04", nameKey: "campaign.s05_04.name", type: "trash", staminaCost: 20, stars: [{ xp: 150, gold: 100 }, { xp: 225, gold: 160 }, { xp: 300, gold: 220 }], trashCardIds: [166, 167, 168, 169, 170], bossCardId: null, hpMult: 3.4, atkMult: 3.2, guaranteedDrop: null, possibleDrops: [160, 161, 162] },
      { id: "s05_05", nameKey: "campaign.s05_05.name", type: "miniboss", staminaCost: 25, stars: [{ xp: 220, gold: 150 }, { xp: 320, gold: 215 }, { xp: 440, gold: 295 }], trashCardIds: [171, 172, 173], bossCardId: 313, hpMult: 3.8, atkMult: 3.5, guaranteedDrop: 256, possibleDrops: [163, 164, 165, 166] },
      { id: "s05_06", nameKey: "campaign.s05_06.name", type: "trash", staminaCost: 22, stars: [{ xp: 160, gold: 108 }, { xp: 240, gold: 172 }, { xp: 320, gold: 236 }], trashCardIds: [174, 175, 176, 177, 178], bossCardId: null, hpMult: 3.6, atkMult: 3.4, guaranteedDrop: null, possibleDrops: [167, 168, 169] },
      { id: "s05_07", nameKey: "campaign.s05_07.name", type: "trash", staminaCost: 22, stars: [{ xp: 170, gold: 115 }, { xp: 255, gold: 185 }, { xp: 340, gold: 255 }], trashCardIds: [179, 180, 151, 152, 153], bossCardId: null, hpMult: 3.8, atkMult: 3.6, guaranteedDrop: null, possibleDrops: [170, 171, 172] },
      { id: "s05_08", nameKey: "campaign.s05_08.name", type: "trash", staminaCost: 22, stars: [{ xp: 180, gold: 122 }, { xp: 270, gold: 198 }, { xp: 360, gold: 272 }], trashCardIds: [154, 155, 156, 157, 158], bossCardId: null, hpMult: 4.0, atkMult: 3.8, guaranteedDrop: null, possibleDrops: [173, 174, 175] },
      { id: "s05_09", nameKey: "campaign.s05_09.name", type: "elite", staminaCost: 30, stars: [{ xp: 280, gold: 190 }, { xp: 400, gold: 270 }, { xp: 560, gold: 380 }], trashCardIds: [159, 160, 161], bossCardId: 314, hpMult: 4.5, atkMult: 4.0, guaranteedDrop: 257, possibleDrops: [176, 177, 178, 179] },
      { id: "s05_10", nameKey: "campaign.s05_10.name", type: "boss", staminaCost: 35, stars: [{ xp: 380, gold: 260 }, { xp: 530, gold: 365 }, { xp: 750, gold: 520 }], trashCardIds: [162, 163, 164, 165, 166], bossCardId: 315, hpMult: 6.0, atkMult: 5.0, guaranteedDrop: 185, possibleDrops: [180, 189, 190, 191, 192] },
    ],
  },

  // ── Region 6: Nhà Máy Tái Chế (The Recycling Plant) ───────────────────────
  {
    id: "region_06",
    nameKey: "campaign.region_06.name",
    descriptionKey: "campaign.region_06.desc",
    gradient: "from-cyan-800 via-blue-900 to-indigo-950",
    accentColor: "#06b6d4",
    requiredPlayerLevel: 25,
    requiredPreviousRegion: "region_05",
    stages: [
      { id: "s06_01", nameKey: "campaign.s06_01.name", type: "trash", staminaCost: 25, stars: [{ xp: 200, gold: 140 }, { xp: 300, gold: 215 }, { xp: 400, gold: 290 }], trashCardIds: [181, 182, 183, 184, 185], bossCardId: null, hpMult: 3.5, atkMult: 3.2, guaranteedDrop: null, possibleDrops: [181, 182, 183] },
      { id: "s06_02", nameKey: "campaign.s06_02.name", type: "trash", staminaCost: 25, stars: [{ xp: 210, gold: 148 }, { xp: 315, gold: 228 }, { xp: 420, gold: 308 }], trashCardIds: [186, 187, 188, 189, 190], bossCardId: null, hpMult: 3.7, atkMult: 3.4, guaranteedDrop: null, possibleDrops: [184, 185, 186] },
      { id: "s06_03", nameKey: "campaign.s06_03.name", type: "trash", staminaCost: 25, stars: [{ xp: 220, gold: 155 }, { xp: 330, gold: 240 }, { xp: 440, gold: 325 }], trashCardIds: [191, 192, 193, 194, 195], bossCardId: null, hpMult: 3.9, atkMult: 3.6, guaranteedDrop: null, possibleDrops: [187, 188, 189] },
      { id: "s06_04", nameKey: "campaign.s06_04.name", type: "trash", staminaCost: 25, stars: [{ xp: 230, gold: 162 }, { xp: 345, gold: 252 }, { xp: 460, gold: 342 }], trashCardIds: [196, 197, 198, 199, 200], bossCardId: null, hpMult: 4.1, atkMult: 3.8, guaranteedDrop: null, possibleDrops: [190, 191, 192] },
      { id: "s06_05", nameKey: "campaign.s06_05.name", type: "miniboss", staminaCost: 30, stars: [{ xp: 340, gold: 240 }, { xp: 490, gold: 345 }, { xp: 680, gold: 480 }], trashCardIds: [201, 202, 203], bossCardId: 316, hpMult: 4.8, atkMult: 4.2, guaranteedDrop: 212, possibleDrops: [193, 194, 195, 196] },
      { id: "s06_06", nameKey: "campaign.s06_06.name", type: "trash", staminaCost: 28, stars: [{ xp: 240, gold: 170 }, { xp: 360, gold: 265 }, { xp: 480, gold: 360 }], trashCardIds: [204, 205, 206, 207, 208], bossCardId: null, hpMult: 4.3, atkMult: 4.0, guaranteedDrop: null, possibleDrops: [197, 198, 199] },
      { id: "s06_07", nameKey: "campaign.s06_07.name", type: "trash", staminaCost: 28, stars: [{ xp: 250, gold: 178 }, { xp: 375, gold: 278 }, { xp: 500, gold: 378 }], trashCardIds: [209, 210, 211, 212, 213], bossCardId: null, hpMult: 4.5, atkMult: 4.2, guaranteedDrop: null, possibleDrops: [200, 201, 202] },
      { id: "s06_08", nameKey: "campaign.s06_08.name", type: "trash", staminaCost: 28, stars: [{ xp: 260, gold: 185 }, { xp: 390, gold: 290 }, { xp: 520, gold: 395 }], trashCardIds: [214, 215, 216, 217, 218], bossCardId: null, hpMult: 4.7, atkMult: 4.4, guaranteedDrop: null, possibleDrops: [203, 204, 205] },
      { id: "s06_09", nameKey: "campaign.s06_09.name", type: "elite", staminaCost: 35, stars: [{ xp: 420, gold: 300 }, { xp: 610, gold: 435 }, { xp: 850, gold: 605 }], trashCardIds: [219, 220, 221], bossCardId: 317, hpMult: 5.5, atkMult: 5.0, guaranteedDrop: 221, possibleDrops: [206, 207, 208, 209] },
      { id: "s06_10", nameKey: "campaign.s06_10.name", type: "boss", staminaCost: 40, stars: [{ xp: 580, gold: 420 }, { xp: 820, gold: 595 }, { xp: 1150, gold: 840 }], trashCardIds: [222, 223, 224, 225, 226], bossCardId: 318, hpMult: 7.5, atkMult: 6.5, guaranteedDrop: 271, possibleDrops: [210, 271, 272, 273, 274] },
    ],
  },

  // ── Region 7: Đại Dương Rác (The Plastic Ocean) ────────────────────────────
  {
    id: "region_07",
    nameKey: "campaign.region_07.name",
    descriptionKey: "campaign.region_07.desc",
    gradient: "from-blue-900 via-sky-950 to-cyan-950",
    accentColor: "#0ea5e9",
    requiredPlayerLevel: 30,
    requiredPreviousRegion: "region_06",
    stages: [
      { id: "s07_01", nameKey: "campaign.s07_01.name", type: "trash", staminaCost: 30, stars: [{ xp: 300, gold: 220 }, { xp: 450, gold: 340 }, { xp: 600, gold: 460 }], trashCardIds: [227, 228, 229, 230, 231], bossCardId: null, hpMult: 4.5, atkMult: 4.0, guaranteedDrop: null, possibleDrops: [227, 228, 229] },
      { id: "s07_02", nameKey: "campaign.s07_02.name", type: "trash", staminaCost: 30, stars: [{ xp: 320, gold: 235 }, { xp: 480, gold: 362 }, { xp: 640, gold: 490 }], trashCardIds: [232, 233, 234, 235, 236], bossCardId: null, hpMult: 4.8, atkMult: 4.3, guaranteedDrop: null, possibleDrops: [230, 231, 232] },
      { id: "s07_03", nameKey: "campaign.s07_03.name", type: "trash", staminaCost: 30, stars: [{ xp: 340, gold: 250 }, { xp: 510, gold: 385 }, { xp: 680, gold: 520 }], trashCardIds: [237, 238, 239, 240, 241], bossCardId: null, hpMult: 5.1, atkMult: 4.6, guaranteedDrop: null, possibleDrops: [233, 234, 235] },
      { id: "s07_04", nameKey: "campaign.s07_04.name", type: "trash", staminaCost: 30, stars: [{ xp: 360, gold: 265 }, { xp: 540, gold: 408 }, { xp: 720, gold: 552 }], trashCardIds: [242, 243, 244, 245, 246], bossCardId: null, hpMult: 5.4, atkMult: 4.9, guaranteedDrop: null, possibleDrops: [236, 237, 238] },
      { id: "s07_05", nameKey: "campaign.s07_05.name", type: "miniboss", staminaCost: 35, stars: [{ xp: 520, gold: 385 }, { xp: 760, gold: 560 }, { xp: 1050, gold: 775 }], trashCardIds: [247, 248, 249], bossCardId: 319, hpMult: 6.2, atkMult: 5.5, guaranteedDrop: 261, possibleDrops: [239, 240, 241, 242] },
      { id: "s07_06", nameKey: "campaign.s07_06.name", type: "trash", staminaCost: 32, stars: [{ xp: 380, gold: 280 }, { xp: 570, gold: 432 }, { xp: 760, gold: 584 }], trashCardIds: [250, 251, 252, 253, 254], bossCardId: null, hpMult: 5.7, atkMult: 5.2, guaranteedDrop: null, possibleDrops: [243, 244, 245] },
      { id: "s07_07", nameKey: "campaign.s07_07.name", type: "trash", staminaCost: 32, stars: [{ xp: 400, gold: 295 }, { xp: 600, gold: 455 }, { xp: 800, gold: 615 }], trashCardIds: [255, 256, 257, 258, 259], bossCardId: null, hpMult: 6.0, atkMult: 5.5, guaranteedDrop: null, possibleDrops: [246, 247, 248] },
      { id: "s07_08", nameKey: "campaign.s07_08.name", type: "trash", staminaCost: 32, stars: [{ xp: 420, gold: 310 }, { xp: 630, gold: 478 }, { xp: 840, gold: 648 }], trashCardIds: [260, 261, 262, 263, 264], bossCardId: null, hpMult: 6.3, atkMult: 5.8, guaranteedDrop: null, possibleDrops: [249, 250, 251] },
      { id: "s07_09", nameKey: "campaign.s07_09.name", type: "elite", staminaCost: 40, stars: [{ xp: 660, gold: 490 }, { xp: 960, gold: 715 }, { xp: 1340, gold: 995 }], trashCardIds: [265, 266, 267], bossCardId: 320, hpMult: 7.2, atkMult: 6.5, guaranteedDrop: 262, possibleDrops: [252, 253, 254, 255] },
      { id: "s07_10", nameKey: "campaign.s07_10.name", type: "boss", staminaCost: 45, stars: [{ xp: 900, gold: 680 }, { xp: 1280, gold: 970 }, { xp: 1800, gold: 1360 }], trashCardIds: [268, 269, 270, 271, 272], bossCardId: 321, hpMult: 10.0, atkMult: 8.0, guaranteedDrop: 279, possibleDrops: [256, 279, 280, 281, 361] },
    ],
  },

  // ── Region 8: Vùng Cấm Địa (The Forbidden Zone) ─────────────────────────
  {
    id: "region_08",
    nameKey: "campaign.region_08.name",
    descriptionKey: "campaign.region_08.desc",
    gradient: "from-violet-950 via-purple-950 to-fuchsia-950",
    accentColor: "#a855f7",
    requiredPlayerLevel: 35,
    requiredPreviousRegion: "region_07",
    stages: [
      { id: "s08_01", nameKey: "campaign.s08_01.name", type: "trash", staminaCost: 35, stars: [{ xp: 480, gold: 360 }, { xp: 720, gold: 555 }, { xp: 960, gold: 750 }], trashCardIds: [273, 274, 275, 276, 277], bossCardId: null, hpMult: 6.5, atkMult: 5.8, guaranteedDrop: null, possibleDrops: [273, 274, 275] },
      { id: "s08_02", nameKey: "campaign.s08_02.name", type: "trash", staminaCost: 35, stars: [{ xp: 500, gold: 378 }, { xp: 750, gold: 582 }, { xp: 1000, gold: 786 }], trashCardIds: [278, 279, 280, 281, 282], bossCardId: null, hpMult: 6.8, atkMult: 6.1, guaranteedDrop: null, possibleDrops: [276, 277, 278] },
      { id: "s08_03", nameKey: "campaign.s08_03.name", type: "trash", staminaCost: 35, stars: [{ xp: 520, gold: 395 }, { xp: 780, gold: 608 }, { xp: 1040, gold: 822 }], trashCardIds: [283, 284, 285, 286, 287], bossCardId: null, hpMult: 7.1, atkMult: 6.4, guaranteedDrop: null, possibleDrops: [279, 280, 281] },
      { id: "s08_04", nameKey: "campaign.s08_04.name", type: "trash", staminaCost: 35, stars: [{ xp: 540, gold: 412 }, { xp: 810, gold: 635 }, { xp: 1080, gold: 858 }], trashCardIds: [288, 289, 290, 291, 292], bossCardId: null, hpMult: 7.4, atkMult: 6.7, guaranteedDrop: null, possibleDrops: [282, 283, 284] },
      { id: "s08_05", nameKey: "campaign.s08_05.name", type: "miniboss", staminaCost: 40, stars: [{ xp: 800, gold: 610 }, { xp: 1160, gold: 885 }, { xp: 1600, gold: 1220 }], trashCardIds: [293, 294, 295], bossCardId: 391, hpMult: 8.0, atkMult: 7.2, guaranteedDrop: 296, possibleDrops: [285, 286, 287, 288] },
      { id: "s08_06", nameKey: "campaign.s08_06.name", type: "trash", staminaCost: 38, stars: [{ xp: 560, gold: 428 }, { xp: 840, gold: 660 }, { xp: 1120, gold: 892 }], trashCardIds: [296, 297, 298, 299, 300], bossCardId: null, hpMult: 7.7, atkMult: 7.0, guaranteedDrop: null, possibleDrops: [289, 290, 291] },
      { id: "s08_07", nameKey: "campaign.s08_07.name", type: "trash", staminaCost: 38, stars: [{ xp: 580, gold: 445 }, { xp: 870, gold: 688 }, { xp: 1160, gold: 930 }], trashCardIds: [301, 302, 303, 304, 305], bossCardId: null, hpMult: 8.0, atkMult: 7.3, guaranteedDrop: null, possibleDrops: [292, 293, 294] },
      { id: "s08_08", nameKey: "campaign.s08_08.name", type: "trash", staminaCost: 38, stars: [{ xp: 600, gold: 462 }, { xp: 900, gold: 715 }, { xp: 1200, gold: 968 }], trashCardIds: [306, 307, 308, 309, 310], bossCardId: null, hpMult: 8.3, atkMult: 7.6, guaranteedDrop: null, possibleDrops: [295, 296, 297] },
      { id: "s08_09", nameKey: "campaign.s08_09.name", type: "elite", staminaCost: 45, stars: [{ xp: 1000, gold: 775 }, { xp: 1460, gold: 1130 }, { xp: 2040, gold: 1575 }], trashCardIds: [311, 312, 313], bossCardId: 392, hpMult: 9.5, atkMult: 8.5, guaranteedDrop: 393, possibleDrops: [298, 299, 300, 361] },
      { id: "s08_10", nameKey: "campaign.s08_10.name", type: "boss", staminaCost: 50, stars: [{ xp: 1400, gold: 1100 }, { xp: 2000, gold: 1580 }, { xp: 2800, gold: 2200 }], trashCardIds: [314, 315, 316, 317, 318], bossCardId: 394, hpMult: 15.0, atkMult: 12.0, guaranteedDrop: 363, possibleDrops: [362, 363, 364, 391, 392] },
    ],
  },

  // ── Region 9: Vực Thẳm Địa Ngục (The Abyssal Hellscape) ─────────────────
  {
    id: "region_09",
    nameKey: "campaign.region_09.name",
    descriptionKey: "campaign.region_09.desc",
    gradient: "from-neutral-950 via-stone-950 to-zinc-950",
    accentColor: "#525252",
    requiredPlayerLevel: 40,
    requiredPreviousRegion: "region_08",
    stages: [
      { id: "s09_01", nameKey: "campaign.s09_01.name", type: "trash", staminaCost: 40, stars: [{ xp: 700, gold: 540 }, { xp: 1060, gold: 825 }, { xp: 1420, gold: 1110 }], trashCardIds: [319, 320, 321, 322, 323], bossCardId: null, hpMult: 9.0, atkMult: 8.0, guaranteedDrop: null, possibleDrops: [319, 320, 321] },
      { id: "s09_02", nameKey: "campaign.s09_02.name", type: "trash", staminaCost: 40, stars: [{ xp: 730, gold: 565 }, { xp: 1105, gold: 870 }, { xp: 1480, gold: 1175 }], trashCardIds: [324, 325, 326, 327, 328], bossCardId: null, hpMult: 9.4, atkMult: 8.4, guaranteedDrop: null, possibleDrops: [322, 323, 324] },
      { id: "s09_03", nameKey: "campaign.s09_03.name", type: "trash", staminaCost: 40, stars: [{ xp: 760, gold: 590 }, { xp: 1150, gold: 915 }, { xp: 1540, gold: 1240 }], trashCardIds: [329, 330, 331, 332, 333], bossCardId: null, hpMult: 9.8, atkMult: 8.8, guaranteedDrop: null, possibleDrops: [325, 326, 327] },
      { id: "s09_04", nameKey: "campaign.s09_04.name", type: "trash", staminaCost: 40, stars: [{ xp: 790, gold: 615 }, { xp: 1195, gold: 960 }, { xp: 1600, gold: 1305 }], trashCardIds: [334, 335, 336, 337, 338], bossCardId: null, hpMult: 10.2, atkMult: 9.2, guaranteedDrop: null, possibleDrops: [328, 329, 330] },
      { id: "s09_05", nameKey: "campaign.s09_05.name", type: "miniboss", staminaCost: 45, stars: [{ xp: 1200, gold: 940 }, { xp: 1760, gold: 1380 }, { xp: 2440, gold: 1910 }], trashCardIds: [339, 340, 341], bossCardId: 395, hpMult: 11.0, atkMult: 10.0, guaranteedDrop: 364, possibleDrops: [331, 332, 333, 334] },
      { id: "s09_06", nameKey: "campaign.s09_06.name", type: "trash", staminaCost: 42, stars: [{ xp: 820, gold: 640 }, { xp: 1240, gold: 1005 }, { xp: 1660, gold: 1370 }], trashCardIds: [342, 343, 344, 345, 346], bossCardId: null, hpMult: 10.6, atkMult: 9.6, guaranteedDrop: null, possibleDrops: [335, 336, 337] },
      { id: "s09_07", nameKey: "campaign.s09_07.name", type: "trash", staminaCost: 42, stars: [{ xp: 850, gold: 665 }, { xp: 1285, gold: 1050 }, { xp: 1720, gold: 1435 }], trashCardIds: [347, 348, 349, 350, 351], bossCardId: null, hpMult: 11.0, atkMult: 10.0, guaranteedDrop: null, possibleDrops: [338, 339, 340] },
      { id: "s09_08", nameKey: "campaign.s09_08.name", type: "trash", staminaCost: 42, stars: [{ xp: 880, gold: 690 }, { xp: 1330, gold: 1095 }, { xp: 1780, gold: 1500 }], trashCardIds: [352, 353, 354, 355, 356], bossCardId: null, hpMult: 11.4, atkMult: 10.4, guaranteedDrop: null, possibleDrops: [341, 342, 343] },
      { id: "s09_09", nameKey: "campaign.s09_09.name", type: "elite", staminaCost: 50, stars: [{ xp: 1500, gold: 1200 }, { xp: 2200, gold: 1760 }, { xp: 3080, gold: 2460 }], trashCardIds: [357, 358, 359], bossCardId: 396, hpMult: 13.0, atkMult: 11.5, guaranteedDrop: 365, possibleDrops: [344, 345, 346, 365] },
      { id: "s09_10", nameKey: "campaign.s09_10.name", type: "boss", staminaCost: 55, stars: [{ xp: 2100, gold: 1720 }, { xp: 3050, gold: 2500 }, { xp: 4280, gold: 3500 }], trashCardIds: [360, 361, 362, 363, 364], bossCardId: 397, hpMult: 22.0, atkMult: 18.0, guaranteedDrop: 373, possibleDrops: [366, 367, 373, 374, 391] },
    ],
  },

  // ── Region 10: Ngai Vàng Rác Thải (The Trash Throne) ─────────────────────
  {
    id: "region_10",
    nameKey: "campaign.region_10.name",
    descriptionKey: "campaign.region_10.desc",
    gradient: "from-yellow-600 via-amber-700 to-orange-800",
    accentColor: "#f59e0b",
    requiredPlayerLevel: 45,
    requiredPreviousRegion: "region_09",
    stages: [
      { id: "s10_01", nameKey: "campaign.s10_01.name", type: "trash", staminaCost: 45, stars: [{ xp: 1000, gold: 800 }, { xp: 1520, gold: 1220 }, { xp: 2040, gold: 1640 }], trashCardIds: [365, 366, 367, 368, 369], bossCardId: null, hpMult: 12.0, atkMult: 10.5, guaranteedDrop: null, possibleDrops: [365, 366, 367] },
      { id: "s10_02", nameKey: "campaign.s10_02.name", type: "trash", staminaCost: 45, stars: [{ xp: 1050, gold: 845 }, { xp: 1595, gold: 1290 }, { xp: 2140, gold: 1735 }], trashCardIds: [370, 371, 372, 373, 374], bossCardId: null, hpMult: 12.5, atkMult: 11.0, guaranteedDrop: null, possibleDrops: [368, 369, 370] },
      { id: "s10_03", nameKey: "campaign.s10_03.name", type: "trash", staminaCost: 45, stars: [{ xp: 1100, gold: 890 }, { xp: 1670, gold: 1360 }, { xp: 2240, gold: 1830 }], trashCardIds: [375, 376, 377, 378, 379], bossCardId: null, hpMult: 13.0, atkMult: 11.5, guaranteedDrop: null, possibleDrops: [371, 372, 373] },
      { id: "s10_04", nameKey: "campaign.s10_04.name", type: "trash", staminaCost: 45, stars: [{ xp: 1150, gold: 935 }, { xp: 1745, gold: 1430 }, { xp: 2340, gold: 1925 }], trashCardIds: [380, 381, 382, 383, 384], bossCardId: null, hpMult: 13.5, atkMult: 12.0, guaranteedDrop: null, possibleDrops: [374, 375, 376] },
      { id: "s10_05", nameKey: "campaign.s10_05.name", type: "miniboss", staminaCost: 50, stars: [{ xp: 1800, gold: 1480 }, { xp: 2660, gold: 2185 }, { xp: 3680, gold: 3025 }], trashCardIds: [385, 386, 387], bossCardId: 398, hpMult: 15.0, atkMult: 13.0, guaranteedDrop: 379, possibleDrops: [377, 378, 379, 380] },
      { id: "s10_06", nameKey: "campaign.s10_06.name", type: "trash", staminaCost: 48, stars: [{ xp: 1200, gold: 980 }, { xp: 1820, gold: 1500 }, { xp: 2440, gold: 2020 }], trashCardIds: [388, 389, 390, 391, 392], bossCardId: null, hpMult: 14.0, atkMult: 12.5, guaranteedDrop: null, possibleDrops: [381, 382, 383] },
      { id: "s10_07", nameKey: "campaign.s10_07.name", type: "trash", staminaCost: 48, stars: [{ xp: 1250, gold: 1025 }, { xp: 1895, gold: 1570 }, { xp: 2540, gold: 2115 }], trashCardIds: [393, 394, 395, 396, 397], bossCardId: null, hpMult: 14.5, atkMult: 13.0, guaranteedDrop: null, possibleDrops: [384, 385, 386] },
      { id: "s10_08", nameKey: "campaign.s10_08.name", type: "trash", staminaCost: 48, stars: [{ xp: 1300, gold: 1070 }, { xp: 1970, gold: 1640 }, { xp: 2640, gold: 2210 }], trashCardIds: [398, 399, 400, 401, 402], bossCardId: null, hpMult: 15.0, atkMult: 13.5, guaranteedDrop: null, possibleDrops: [387, 388, 389] },
      { id: "s10_09", nameKey: "campaign.s10_09.name", type: "elite", staminaCost: 55, stars: [{ xp: 2200, gold: 1840 }, { xp: 3260, gold: 2725 }, { xp: 4540, gold: 3795 }], trashCardIds: [403, 404, 405], bossCardId: 406, hpMult: 18.0, atkMult: 15.5, guaranteedDrop: 398, possibleDrops: [390, 399, 400, 401] },
      { id: "s10_10", nameKey: "campaign.s10_10.name", type: "boss", staminaCost: 60, stars: [{ xp: 3200, gold: 2750 }, { xp: 4700, gold: 4040 }, { xp: 6600, gold: 5680 }], trashCardIds: [407, 408, 409, 410, 411], bossCardId: 412, hpMult: 30.0, atkMult: 25.0, guaranteedDrop: 409, possibleDrops: [402, 403, 404, 405, 406, 407, 408, 409, 410, 411, 412, 413, 414, 415, 416, 417, 418, 419, 420] },
    ],
  },
];

// ─── Helper Functions ──────────────────────────────────────────────────────────────

export function getRegionById(id: string) {
  return REGIONS.find(r => r.id === id);
}

export function getStageById(regionId: string, stageId: string) {
  const region = getRegionById(regionId);
  return region?.stages.find(s => s.id === stageId);
}

export function getTotalStages(): number {
  return REGIONS.reduce((acc, r) => acc + r.stages.length, 0);
}

export function getTotalStars(): number {
  return REGIONS.reduce((accRegion, region) =>
    accRegion + region.stages.reduce((accStage) => accStage + 3, 0), 0);
}

export function getStageReward(stars: number, starIndex: number): { xp: number; gold: number } {
  const stageRewards = [
    { xp: 10, gold: 5 },
    { xp: 15, gold: 8 },
    { xp: 20, gold: 12 },
  ];
  if (starIndex < 0 || starIndex >= stageRewards.length) return stageRewards[0];
  return stageRewards[starIndex];
}
