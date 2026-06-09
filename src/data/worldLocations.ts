export interface Location {
  id: string;
  name: string;
  lat: number;
  lng: number;
  description: string;
  trivia: string;
  trashTypes: string[];
  pollutionAdded: number;
  cleanBonus: number;
}

export interface WorldRegion {
  id: string;
  name: string;
  chapter: number;
  unlockRequirement: {
    minLevel?: number;
    prevRegionId?: string;
    minPower?: number;
  };
  pollution: number;
  maxPollution: number;
  rewardXP: number;
  locations: Location[];
  bossCardIds: number[];
  storyScene: string;
  mapX: number;
  mapY: number;
  continentColor: string;
}

export const WORLD_REGIONS: WorldRegion[] = [
  {
    id: "vietnam_north",
    name: "Miền Bắc Việt Nam",
    chapter: 1,
    unlockRequirement: { minLevel: 1 },
    pollution: 65,
    maxPollution: 100,
    rewardXP: 300,
    storyScene: "chapter1_intro",
    bossCardIds: [101, 102, 103],
    mapX: 72,
    mapY: 42,
    continentColor: "#ef4444",
    locations: [
      {
        id: "hanoi",
        name: "Hà Nội",
        lat: 21.0285,
        lng: 105.8542,
        description: "Thủ đô nghìn năm văn hiến với 8 triệu dân.",
        trivia: "Hà Nội thải ra khoảng 80.000 tấn rác mỗi ngày.",
        trashTypes: ["plastic", "paper"],
        pollutionAdded: 8,
        cleanBonus: 12,
      },
      {
        id: "ha_long",
        name: "Hạ Long",
        lat: 20.9101,
        lng: 107.1839,
        description: "Vịnh di sản thế giới UNESCO với hàng nghìn hòn đảo đá vôi.",
        trivia: "Mỗi năm Hạ Long tiếp nhận hơn 7 triệu lượt khách du lịch.",
        trashTypes: ["plastic", "hazard"],
        pollutionAdded: 5,
        cleanBonus: 15,
      },
      {
        id: "sa_pa",
        name: "Sa Pa",
        lat: 22.3367,
        lng: 103.8436,
        description: "Thị trấn trong sương mù với ruộng bậc thang tuyệt đẹp.",
        trivia: "Sa Pa từng được mệnh danh là 'Đà Lạt của miền Bắc'.",
        trashTypes: ["organic", "plastic"],
        pollutionAdded: 4,
        cleanBonus: 10,
      },
    ],
  },
  {
    id: "vietnam_south",
    name: "Miền Nam Việt Nam",
    chapter: 1,
    unlockRequirement: { prevRegionId: "vietnam_north", minLevel: 3 },
    pollution: 80,
    maxPollution: 100,
    rewardXP: 400,
    storyScene: "chapter1_victory",
    bossCardIds: [104, 105, 106],
    mapX: 70,
    mapY: 56,
    continentColor: "#f97316",
    locations: [
      {
        id: "hcmc",
        name: "TP. Hồ Chí Minh",
        lat: 10.8231,
        lng: 106.6297,
        description: "Thành phố năng động nhất Việt Nam với 9 triệu dân.",
        trivia: "TP.HCM thải ra khoảng 9.500 tấn rác mỗi ngày, 80% là nhựa.",
        trashTypes: ["plastic", "metal", "glass"],
        pollutionAdded: 10,
        cleanBonus: 15,
      },
      {
        id: "mekong",
        name: "Cửa sông Mekong",
        lat: 10.0452,
        lng: 106.4117,
        description: "Vùng nước ngọt lớn nhất Việt Nam, nuôi sống hàng triệu người.",
        trivia: "Sông Mekong mang về khoảng 65.000 tấn nhựa ra biển mỗi năm.",
        trashTypes: ["organic", "hazard", "plastic"],
        pollutionAdded: 7,
        cleanBonus: 10,
      },
      {
        id: "can_tho",
        name: "Cần Thơ",
        lat: 10.0452,
        lng: 105.7467,
        description: "Thủ phủ Đồng bằng sông Cửu Long với chợ nổi nổi tiếng.",
        trivia: "ĐBSCL là vùng sản xuất lúa lớn nhất Việt Nam.",
        trashTypes: ["organic", "plastic"],
        pollutionAdded: 5,
        cleanBonus: 9,
      },
    ],
  },
  {
    id: "southeast_asia",
    name: "Đông Nam Á",
    chapter: 2,
    unlockRequirement: { prevRegionId: "vietnam_south", minLevel: 5, minPower: 500 },
    pollution: 72,
    maxPollution: 100,
    rewardXP: 600,
    storyScene: "chapter2_intro",
    bossCardIds: [201, 202, 203],
    mapX: 60,
    mapY: 52,
    continentColor: "#a855f7",
    locations: [
      {
        id: "bangkok",
        name: "Bangkok",
        lat: 13.7563,
        lng: 100.5018,
        description: "Thủ đô hoàng gia của Thái Lan, thành phố lớn nhất ĐNA.",
        trivia: "Bangkok sản xuất 10.000 tấn rác mỗi ngày từ 10 triệu dân.",
        trashTypes: ["plastic", "hazard"],
        pollutionAdded: 9,
        cleanBonus: 13,
      },
      {
        id: "jakarta",
        name: "Jakarta",
        lat: -6.2088,
        lng: 106.8456,
        description: "Thủ đô Indonesia, quốc gia có dân số lớn thứ 4 thế giới.",
        trivia: "Indonesia là quốc gia xả rác nhựa ra biển nhiều thứ 2 thế giới.",
        trashTypes: ["plastic", "organic"],
        pollutionAdded: 11,
        cleanBonus: 14,
      },
      {
        id: "manila",
        name: "Manila",
        lat: 14.5995,
        lng: 120.9842,
        description: "Thủ đô Philippines, quốc đảo với hơn 7.000 hòn đảo.",
        trivia: "Pasig River ở Manila từng được gọi là 'dòng sông chết' vì ô nhiễm.",
        trashTypes: ["plastic", "hazard", "paper"],
        pollutionAdded: 8,
        cleanBonus: 11,
      },
      {
        id: "singapore",
        name: "Singapore",
        lat: 1.3521,
        lng: 103.8198,
        description: "Quốc đảo nhỏ bé nhưng là một trong những nước sạch nhất thế giới.",
        trivia: "Singapore có hệ thống tái chế nhựa thông minh, thu hồi 80% rác.",
        trashTypes: ["plastic", "glass"],
        pollutionAdded: 3,
        cleanBonus: 18,
      },
    ],
  },
  {
    id: "east_asia",
    name: "Đông Á",
    chapter: 2,
    unlockRequirement: { prevRegionId: "southeast_asia", minLevel: 7, minPower: 800 },
    pollution: 55,
    maxPollution: 100,
    rewardXP: 800,
    storyScene: "chapter2_east_asia",
    bossCardIds: [204, 205, 206],
    mapX: 82,
    mapY: 38,
    continentColor: "#ec4899",
    locations: [
      {
        id: "tokyo",
        name: "Tokyo",
        lat: 35.6762,
        lng: 139.6503,
        description: "Thủ đô công nghệ Nhật Bản, thành phố lớn nhất thế giới.",
        trivia: "Tokyo có hệ thống phân loại rác 8 loại khác nhau.",
        trashTypes: ["metal", "glass", "paper"],
        pollutionAdded: 6,
        cleanBonus: 18,
      },
      {
        id: "seoul",
        name: "Seoul",
        lat: 37.5665,
        lng: 126.978,
        description: "Thành phố hiện đại Hàn Quốc, trung tâm K-pop và công nghệ.",
        trivia: "Hàn Quốc tái chế 95% pin đã qua sử dụng — tỷ lệ cao nhất thế giới.",
        trashTypes: ["plastic", "metal", "glass"],
        pollutionAdded: 7,
        cleanBonus: 16,
      },
      {
        id: "shanghai",
        name: "Shanghai",
        lat: 31.2304,
        lng: 121.4737,
        description: "Trung tâm tài chính Trung Quốc, thành phố lớn nhất ĐNA.",
        trivia: "Trung Quốc sản xuất 60 triệu tấn nhựa mỗi năm — nhiều nhất thế giới.",
        trashTypes: ["plastic", "hazard", "metal"],
        pollutionAdded: 9,
        cleanBonus: 12,
      },
    ],
  },
  {
    id: "europe",
    name: "Châu Âu",
    chapter: 3,
    unlockRequirement: { prevRegionId: "east_asia", minLevel: 10, minPower: 1200 },
    pollution: 40,
    maxPollution: 100,
    rewardXP: 1000,
    storyScene: "chapter3_intro",
    bossCardIds: [301, 302, 303],
    mapX: 48,
    mapY: 30,
    continentColor: "#3b82f6",
    locations: [
      {
        id: "paris",
        name: "Paris",
        lat: 48.8566,
        lng: 2.3522,
        description: "Thành phố ánh sáng, trung tâm văn hóa và nghệ thuật châu Âu.",
        trivia: "Paris có 65% tỷ lệ tái chế, thuộc hàng cao nhất châu Âu.",
        trashTypes: ["glass", "paper", "organic"],
        pollutionAdded: 4,
        cleanBonus: 20,
      },
      {
        id: "berlin",
        name: "Berlin",
        lat: 52.52,
        lng: 13.405,
        description: "Thủ đô xanh của Đức, trung tâm công nghệ châu Âu.",
        trivia: "Đức có tỷ lệ tái chế 83% cho đồ nhựa — cao nhất EU.",
        trashTypes: ["plastic", "metal", "glass"],
        pollutionAdded: 5,
        cleanBonus: 17,
      },
      {
        id: "london",
        name: "London",
        lat: 51.5074,
        lng: -0.1278,
        description: "Thành phố nghìn năm tuổi bên bờ sông Thames.",
        trivia: "Luân Đôn sản xuất 700.000 tấn nhựa mỗi năm.",
        trashTypes: ["plastic", "glass", "paper"],
        pollutionAdded: 6,
        cleanBonus: 14,
      },
    ],
  },
  {
    id: "africa",
    name: "Châu Phi",
    chapter: 3,
    unlockRequirement: { prevRegionId: "europe", minLevel: 12, minPower: 1500 },
    pollution: 85,
    maxPollution: 100,
    rewardXP: 1200,
    storyScene: "chapter3_africa",
    bossCardIds: [304, 305, 306],
    mapX: 52,
    mapY: 55,
    continentColor: "#f59e0b",
    locations: [
      {
        id: "cairo",
        name: "Cairo",
        lat: 30.0444,
        lng: 31.2357,
        description: "Thành phố ngàn tuổi bên sông Nile, lớn nhất châu Phi.",
        trivia: "Ai Cập nhập khẩu rác thải từ các nước phương Tây để tái chế.",
        trashTypes: ["plastic", "hazard", "organic"],
        pollutionAdded: 12,
        cleanBonus: 8,
      },
      {
        id: "nairobi",
        name: "Nairobi",
        lat: -1.2921,
        lng: 36.8219,
        description: "Cửa ngõ châu Phi, trung tâm kinh tế Đông Phi.",
        trivia: "Kenya cấm sản xuất và nhập khẩu túi nilon từ 2017.",
        trashTypes: ["plastic", "organic"],
        pollutionAdded: 10,
        cleanBonus: 9,
      },
      {
        id: "lagos",
        name: "Lagos",
        lat: 6.5244,
        lng: 3.3792,
        description: "Thành phố lớn nhất Nigeria, trung tâm kinh tế Tây Phi.",
        trivia: "Nigeria thải khoảng 200.000 tấn nhựa ra đại dương mỗi năm.",
        trashTypes: ["plastic", "hazard"],
        pollutionAdded: 11,
        cleanBonus: 7,
      },
    ],
  },
  {
    id: "americas",
    name: "Châu Mỹ",
    chapter: 4,
    unlockRequirement: { prevRegionId: "africa", minLevel: 15, minPower: 2000 },
    pollution: 50,
    maxPollution: 100,
    rewardXP: 1500,
    storyScene: "chapter4_intro",
    bossCardIds: [401, 402, 403],
    mapX: 22,
    mapY: 40,
    continentColor: "#22c55e",
    locations: [
      {
        id: "new_york",
        name: "New York",
        lat: 40.7128,
        lng: -74.006,
        description: "Thành phố không ngủ, trung tâm tài chính thế giới.",
        trivia: "New York thu gom 12.000 tấn rác mỗi ngày từ 8,4 triệu dân.",
        trashTypes: ["plastic", "paper", "glass"],
        pollutionAdded: 7,
        cleanBonus: 15,
      },
      {
        id: "sao_paulo",
        name: "São Paulo",
        lat: -23.5505,
        lng: -46.6333,
        description: "Thành phố lớn nhất Brazil và Nam bán cầu.",
        trivia: "Brazil có 5 nhà máy tái chế nhựa lớn nhất thế giới.",
        trashTypes: ["plastic", "hazard", "organic"],
        pollutionAdded: 9,
        cleanBonus: 11,
      },
      {
        id: "mexico_city",
        name: "Mexico City",
        lat: 19.4326,
        lng: -99.1332,
        description: "Thủ đô Mexico, một trong những thành phố đông dân nhất thế giới.",
        trivia: "Mexico City thải 13.000 tấn rác nhựa mỗi ngày.",
        trashTypes: ["plastic", "organic"],
        pollutionAdded: 8,
        cleanBonus: 10,
      },
    ],
  },
  {
    id: "oceania",
    name: "Châu Đại Dương",
    chapter: 5,
    unlockRequirement: { prevRegionId: "americas", minLevel: 18, minPower: 2500 },
    pollution: 30,
    maxPollution: 100,
    rewardXP: 2000,
    storyScene: "chapter5_intro",
    bossCardIds: [501, 502, 503],
    mapX: 85,
    mapY: 72,
    continentColor: "#06b6d4",
    locations: [
      {
        id: "sydney",
        name: "Sydney",
        lat: -33.8688,
        lng: 151.2093,
        description: "Thành phố cảng nổi tiếng nhất nước Úc với nhà hát opera.",
        trivia: "Úc tái chế 87% nhựa PET — tỷ lệ cao nhất thế giới.",
        trashTypes: ["plastic", "glass", "organic"],
        pollutionAdded: 5,
        cleanBonus: 19,
      },
      {
        id: "great_barrier",
        name: "Great Barrier Reef",
        lat: -18.2871,
        lng: 147.6992,
        description: "Rạn san hô lớn nhất thế giới, nhìn từ không gian.",
        trivia: "Great Barrier Reef đã mất 50% san hô trong 30 năm qua.",
        trashTypes: ["plastic", "hazard"],
        pollutionAdded: 15,
        cleanBonus: 25,
      },
    ],
  },
];

export function getRegionById(id: string): WorldRegion | undefined {
  return WORLD_REGIONS.find((r) => r.id === id);
}

export function getRegionsByChapter(chapter: number): WorldRegion[] {
  return WORLD_REGIONS.filter((r) => r.chapter === chapter);
}

export function getNextRegion(currentId: string): WorldRegion | undefined {
  const idx = WORLD_REGIONS.findIndex((r) => r.id === currentId);
  return idx >= 0 ? WORLD_REGIONS[idx + 1] : undefined;
}

export const CHAPTER_REGION_MAP: Record<number, string[]> = {
  1: ["vietnam_north", "vietnam_south"],
  2: ["southeast_asia", "east_asia"],
  3: ["europe", "africa"],
  4: ["americas"],
  5: ["oceania"],
};
