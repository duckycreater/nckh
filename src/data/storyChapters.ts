export interface StoryChapter {
  id: number;
  title: string;
  subtitle: string;
  scene: string;
  introText: string;
  locationName: string;
  pollutionBackground: string;
  cleanVision: string;
  unlocksRegion: string[];
  rewardBonus: number;
}

export const STORY_CHAPTERS: StoryChapter[] = [
  {
    id: 1,
    title: "Khởi đầu",
    subtitle: "Chuyến đi bắt đầu",
    scene: "chapter1_intro",
    introText:
      "Bạn là BMO — một robot AI được tạo ra để cứu lấy Trái Đất khỏi cuộc khủng hoảng rác thải. Nhiệm vụ đầu tiên: bắt đầu từ quê hương Việt Nam. Hà Nội và TP.HCM đang chìm trong rác thải nhựa. Hãy dọn sạch chúng!",
    locationName: "Miền Bắc & Nam Việt Nam",
    pollutionBackground:
      "Việt Nam là một trong những quốc gia xả rác thải nhựa nhiều nhất thế giới, với 730.000 tấn nhựa mỗi năm.",
    cleanVision:
      "Những con sông trong xanh, đường phố sạch sẽ, và người dân biết cách phân loại rác.",
    unlocksRegion: ["vietnam_north", "vietnam_south"],
    rewardBonus: 100,
  },
  {
    id: 2,
    title: "Mở rộng tầm nhìn",
    subtitle: "Vượt qua biên giới",
    scene: "chapter2_intro",
    introText:
      "Việt Nam đã sạch hơn! Nhưng ô nhiễm không biên giới. BMO nhận được tín hiệu cầu cứu từ Bangkok, Jakarta, Manila... Cùng với đó là Tokyo và Seoul — những thành phố đối mặt với ô nhiễm kim loại và thủy tinh. Đây là cuộc chiến lớn hơn.",
    locationName: "Đông Nam Á & Đông Á",
    pollutionBackground:
      "Đông Nam Á thải ra 27 triệu tấn rác thải nhựa mỗi năm vào đại dương.",
    cleanVision:
      "Các thành phố châu Á sạch bóng ô nhiễm, với hệ thống tái chế hiện đại.",
    unlocksRegion: ["southeast_asia", "east_asia"],
    rewardBonus: 250,
  },
  {
    id: 3,
    title: "Điểm sáng",
    subtitle: "Lục địa giàu có cũng cần giúp đỡ",
    scene: "chapter3_intro",
    introText:
      "Châu Âu sạch hơn phần còn lại thế giới, nhưng không hoàn hảo. Và Châu Phi đang chịu gánh nặng rác thải từ các nước phát triển. BMO đến để cho thấy mọi người đều có thể thay đổi.",
    locationName: "Châu Âu & Châu Phi",
    pollutionBackground:
      "Châu Phi phải đối mặt với 65% rác thải nhựa đại dương toàn cầu, dù chỉ sản xuất 4% nhựa toàn cầu.",
    cleanVision:
      "Một châu Phi xanh tốt, với công nghệ tái chế bền vững lan rộng khắp lục địa.",
    unlocksRegion: ["europe", "africa"],
    rewardBonus: 500,
  },
  {
    id: 4,
    title: "Cường quốc",
    subtitle: "Giấc mơ xanh của hai châu lục",
    scene: "chapter4_intro",
    introText:
      "New York và São Paulo — hai trung tâm kinh tế lớn của châu Mỹ. Nhưng ngay cả những siêu đô thị này cũng đang chìm trong rác thải. BMO mang theo tất cả những gì đã học được để đối mặt với những thử thách lớn nhất.",
    locationName: "Bắc & Nam Mỹ",
    pollutionBackground:
      "Mỹ sản xuất 42 triệu tấn nhựa mỗi năm, lớn nhất thế giới.",
    cleanVision:
      "Một châu Mỹ xanh mát, nơi mọi người sống hài hòa với thiên nhiên.",
    unlocksRegion: ["americas"],
    rewardBonus: 750,
  },
  {
    id: 5,
    title: "Đại dương cuối cùng",
    subtitle: "Nơi mọi thứ bắt đầu và kết thúc",
    scene: "chapter5_intro",
    introText:
      "Great Barrier Reef — hệ sinh thái biển lớn nhất thế giới — đang chết dần vì rác thải nhựa. Nếu BMO không hành động ngay, hàng ngàn loài sinh vật sẽ biến mất mãi mãi. Đây là trận chiến cuối cùng. Đây là nhiệm vụ của BMO.",
    locationName: "Châu Đại Dương",
    pollutionBackground:
      "Great Barrier Reef đã mất 50% san hô trong 30 năm qua do ô nhiễm và biến đổi khí hậu.",
    cleanVision:
      "Rạn san hô phục hồi, sinh vật biển quay về, và một đại dương trong xanh vô tận.",
    unlocksRegion: ["oceania"],
    rewardBonus: 1000,
  },
];

export const SCENE_TEXT: Record<string, string[]> = {
  chapter1_intro: [
    "BMO khởi động...",
    "Tín hiệu cứu hộ phát hiện: Trái Đất đang trên bờ vực ô nhiễm rác thải.",
    "Nhiệm vụ khẩn cấp được kích hoạt.",
    "Điểm đến đầu tiên: Việt Nam.",
  ],
  chapter1_victory: [
    "Việt Nam đã sạch hơn!",
    "Người dân bắt đầu biết phân loại rác.",
    "Tín hiệu mới: Đông Nam Á đang gọi...",
  ],
  chapter2_intro: [
    "Tín hiệu khẩn từ Bangkok: 'Cứu chúng tôi!'",
    "Jakarta, Manila, Singapore đều gửi lời cầu cứu.",
    "BMO mở rộng nhiệm vụ: cứu cả Đông Nam Á.",
  ],
  chapter2_east_asia: [
    "Sóng gió tiếp tục ập đến.",
    "Tokyo, Seoul, Shanghai đều đang chìm trong rác thải công nghiệp.",
    "BMO nhận ra: đây là cuộc chiến lớn nhất từ trước đến nay.",
  ],
  chapter3_intro: [
    "Châu Âu sạch hơn, nhưng không hoàn hảo.",
    "Paris và Berlin vẫn còn rất nhiều việc phải làm.",
    "BMO tiếp tục hành trình.",
  ],
  chapter3_africa: [
    "Châu Phi — lục địa bị bỏ quên.",
    "Dù chỉ sản xuất 4% nhựa toàn cầu, họ gánh 65% rác đại dương.",
    "BMO đến để cho thế giới thấy: mọi người đều xứng đáng được sống xanh.",
  ],
  chapter4_intro: [
    "New York, São Paulo, Mexico City — những cường quốc đang chật vật.",
    "Hàng triệu tấn rác thải mỗi năm.",
    "BMO mang theo tất cả kiến thức đã học để đối mặt.",
  ],
  chapter5_intro: [
    "Great Barrier Reef — kỳ quan thế giới dưới nước.",
    "Đang chết dần vì rác thải nhựa.",
    "Đây là trận chiến cuối cùng. BMO, hãy cứu lấy đại dương!",
  ],
  chapter5_victory: [
    "Đại dương đã được cứu!",
    "San hô bắt đầu phục hồi.",
    "Trái Đất cảm ơn BMO. Nhiệm vụ hoàn thành.",
  ],
};

export function getChapterById(id: number): StoryChapter | undefined {
  return STORY_CHAPTERS.find((c) => c.id === id);
}
