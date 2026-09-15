const CATEGORY_GROUPS = {
  SLOTS: [
    "slot",
    "slots",
    "video slot",
    "video-slot",
    "hotslots",
    "hot slots",
    "slot game",
    "slot game",
  ],
  CASINO: [
    "casino",
    "casinolive",
    "casino live",
    "live casino",
    "live",
    "evolution live",
  ],
  FISHING: [
    "fishing",
    "fishing games",
    "fish/shooting",
    "fish shooting",
    "instant game",
    "instant games",
  ],
  FLASH: ["flash", "table", "table/poker", "table poker"],
  MINI_GAMES: ["minigames", "mini games"],
  CRASH: ["crash", "aviator", "instant crash", "crash game", "aviator game"],
  SPORTS: [
    "sports",
    "SABA Sports",
    "LuckySport",
    "LuckSportGaming",
    "9wickets",
  ],
  TABLE: ["table"],
  ARCADE: ["arcade"],
  COCKFIGHT: ["cockfight"],
  LOTTERY: ["lottery"],
  POKER: ["poker"],
  CHESS: ["chess"],
  XGAMES: ["xgames"],
  PVC: ["pvc"],
  HOT: ["hot", "hot games"],
};

export const normalizeCategory = (category) => {
  if (!category) return "HOT";
  const normalized = category.toString().toLowerCase().trim();
  for (const [groupKey, variations] of Object.entries(CATEGORY_GROUPS)) {
    for (const v of variations) {
      if (normalized === v) return groupKey;
      if (normalized.includes(v)) return groupKey;
      if (v.includes(normalized)) return groupKey;
    }
  }
  return category.toString().toUpperCase();
};

export const getCategoryDisplayName = (category) => {
  const displayNames = {
    SLOTS: "Slots",
    LIVE: "Live",
    FISHING: "Fishing",
    MINI_GAMES: "Mini Games",
    CRASH: "Crash",
    SPORTS: "Sports",
    CASINO: "Casino",
    TABLE: "Table",
    ARCADE: "Arcade",
    COCKFIGHT: "Cockfight",
    LOTTERY: "Lottery",
    POKER: "Poker",
    CHESS: "Chess",
    XGAMES: "X Games",
    PVC: "PVC",
    FLASH: "Flash",
    BACCARAT: "Baccarat",
    BOARD_GAMES: "Board Games",
    HOT: "Hot",
  };
  return displayNames[category] || category;
};

export const deduplicateCategories = (categories) => {
  const seen = new Set();
  const normalized = [];
  categories.forEach((cat) => {
    const norm = normalizeCategory(cat);
    if (!seen.has(norm)) {
      seen.add(norm);
      normalized.push(norm);
    }
  });
  return normalized;
};
