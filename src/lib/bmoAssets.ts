export const BMO_ASSETS = {
  authHero: "/assets/bmo/scenes/auth-hero.webp",
  campaignArena: "/assets/bmo/scenes/campaign-arena.webp",
  gachaVault: "/assets/bmo/scenes/gacha-vault.webp",
  cardBack: "/assets/bmo/cards/card-back.webp",
} as const;

export const CARD_ELEMENT_ASSETS: Record<string, string> = {
  plastic: "/assets/bmo/card-elements/plastic.webp",
  paper: "/assets/bmo/card-elements/paper.webp",
  glass: "/assets/bmo/card-elements/glass.webp",
  metal: "/assets/bmo/card-elements/metal.webp",
  organic: "/assets/bmo/card-elements/organic.webp",
  hazard: "/assets/bmo/card-elements/hazard.webp",
  energy: "/assets/bmo/card-elements/energy.webp",
  water: "/assets/bmo/card-elements/water.webp",
  tech: "/assets/bmo/card-elements/tech.webp",
};

export const PROFILE_AVATARS = [
  {
    id: "av1",
    name: "Mầm Xanh",
    nameKey: "seedling",
    cost: 50,
    imageSrc: "/assets/bmo/avatars/seedling.webp",
    color: "bg-emerald-100 text-emerald-700",
    bg: "from-emerald-400 to-teal-500",
  },
  {
    id: "av2",
    name: "Chiến Binh Nước",
    nameKey: "guardian",
    cost: 150,
    imageSrc: "/assets/bmo/avatars/water-guardian.webp",
    color: "bg-cyan-100 text-cyan-700",
    bg: "from-blue-400 to-cyan-500",
  },
  {
    id: "av3",
    name: "Thủ Lĩnh Rừng",
    nameKey: "knight",
    cost: 300,
    imageSrc: "/assets/bmo/avatars/forest-guardian.webp",
    color: "bg-amber-100 text-amber-700",
    bg: "from-amber-400 to-emerald-600",
  },
] as const;

export const PROFILE_FRAMES = [
  {
    id: "fr1",
    name: "Khung Gỗ",
    nameKey: "wooden",
    cost: 100,
    style: "ring-4 ring-amber-700",
    previewClass: "border-[6px] border-amber-700",
    desc: "profile.frames.woodenDesc",
  },
  {
    id: "fr2",
    name: "Khung Băng",
    nameKey: "ice",
    cost: 200,
    style: "ring-4 ring-cyan-400",
    previewClass: "border-[6px] border-cyan-400",
    desc: "profile.frames.iceDesc",
  },
  {
    id: "fr3",
    name: "Hào Quang Đất",
    nameKey: "glow",
    cost: 500,
    style: "ring-4 ring-emerald-400 shadow-[0_0_22px_rgba(52,211,153,0.75)]",
    previewClass: "border-[6px] border-emerald-400 shadow-[0_0_22px_rgba(52,211,153,0.75)]",
    desc: "profile.frames.glowDesc",
  },
] as const;
