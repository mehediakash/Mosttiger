const PROVIDER_CATEGORY_MAP = {
  RubyPlay: "SLOTS",
  JILI: ["SLOTS", "CRASH", "FISHING", "LOTTERY"],
  "3Oaks (BNG)": "SLOTS",
  Microgaming: "SLOTS",
  RedTiger: ["SLOTS", "FISHING"],
  Netent: "SLOTS",
  "9wickets": "SPORTS",
  NoLimit: "SLOTS",
  PGSoft: "SLOTS",
  GameArt: "SLOTS",
  PlayAce: "SLOTS",
  "PlayAce(AgGaming)": "SLOTS",
  EazyGaming: "SLOTS",
  "FAST SPIN": "SLOTS",
  PgsGaming: "SLOTS",
  Askmeslot: "SLOTS",
  Bgaming: ["SLOTS", "ARCADE"],
  CQ9: ["CHESS", "FISHING"],
  King: "SLOTS",
  "King Midas": "CASINO",
  "King Midas - One Gaming": "SLOTS",
  Vplus: "SLOTS",
  Amigo: "SLOTS",
  Hacksaw: "SLOTS",
  "Hacksaw World": "SLOTS",
  "Hacksaw Asia": "SLOTS",
  "MAC 88": "LIVE",
  "Evolution Live": "LIVE",
  "Evolution Live (Asia)": "LIVE",
  Playtech: "LIVE",
  Ezugi: "LIVE",
  PragmaticPlayLive: "LIVE",
  "PragmaticPlayLive-EU": "LIVE",
  PragmaticPlay: "SLOTS",
  "PragmaticPlay-EU": "SLOTS",
  "PragmaticPlay-Asia": "SLOTS",
  TADAGaming: "FISHING",
  KA: "FISHING",
  JDB: ["FISHING", "ARCADE"],
  Turbogames: "MINI_GAMES",
  "Turbogames World": "MINI_GAMES",
  "Turbogames Asia": "MINI_GAMES",
  "100HP": "CRASH",
  SBO: "SPORTS",
  Skywind: "FLASH",
  BtGaming: "FLASH",
  BtiGaming: "SPORTS",
  YGRGaming: "FLASH",
  PlaynGo: "FLASH",
  RelaxGaming: "FLASH",
  NextSpin: "FLASH",
  Playson: ["FLASH", "FISHING"],
  EpicWin: ["FLASH", "COCKFIGHT"],
  Rich88: "FLASH",
  Habanero: "FLASH",
  Evoplay: "FLASH",
  "2J": "FLASH",
  Smartsoft: "XGAMES",
  BigTimeGaming: "FISHING",
  iDeal: ["FLASH", "ARCADE"],
  OneGaming: "FLASH",
  Crowdplay: "FLASH",
  Sexy: "CASINO",
  Spribe: "CRASH",
  SimplePlay: "FISHING",
  YeeBet: "LOTTERY",
  CMD: "SPORTS",
  "9Wickets": "9Wickets",
  "SABA Sports": "SPORTS",
  "SABASports(IBC)": "SPORTS",
};

// Merge map: backend category variations -> frontend group
const MERGE_MAP = {
  CASINO: [
    "casino",
    "casinolive",
    "live",
    "casino live",
    "live casino",
    "evolution live",
    "evolution",
  ],
  SLOTS: [
    "slot",
    "slots",
    "slot game",
    "video slot",
    "hotslots",
    "hot slots",
    "video-slot",
  ],
  FISHING: [
    "fishing",
    "fishing games",
    "fish/shooting",
    "fish shooting",
    "instant game",
    "instant games",
  ],
  CRASH: ["crash", "aviator", "instant crash", "crash game", "aviator game"],
  ARCADE: ["arcade", "arcades"],
  COCKFIGHT: ["cockfight", "cock fight"],
  LOTTERY: ["lottery", "lotteries"],
  SPORTS: ["LuckySport", "SABA Sports", "LuckSportGaming", "sports", "sport"],
  FLASH: ["flash", "table", "table/poker", "table poker", "table/pokers"],
  CHESS: ["chess"],
  XGAMES: ["xgames"],
};

const mapRawToGroup = (raw) => {
  if (!raw) return null;
  const r = raw.toString().toLowerCase().trim();
  for (const [groupKey, variations] of Object.entries(MERGE_MAP)) {
    for (const v of variations) {
      if (r === v) return groupKey;
      if (r.includes(v)) return groupKey;
      if (v.includes(r)) return groupKey;
    }
  }
  return null;
};

export const getProviderCategory = (provider) => {
  // returns an array of possible frontend categories for the provider
  if (!provider) return ["HOT"];

  let name = "";
  let rawCat = "";
  if (typeof provider === "object") {
    name = (provider.brand_title || provider.name || "").toString().trim();
    rawCat = (
      provider.category ||
      provider.game_category ||
      provider.brand_category ||
      provider.type ||
      provider.provider_category ||
      ""
    )
      .toString()
      .toLowerCase()
      .trim();
  } else {
    name = provider.toString();
  }

  const results = new Set();

  // map backend-provided category to frontend group
  if (rawCat) {
    const mapped = mapRawToGroup(rawCat);
    if (mapped) results.add(mapped);
  }

  // try direct name mapping from PROVIDER_CATEGORY_MAP
  const direct =
    PROVIDER_CATEGORY_MAP[name] || PROVIDER_CATEGORY_MAP[name.trim()];
  if (direct) {
    if (Array.isArray(direct)) {
      direct.forEach((d) => {
        const mapped = mapRawToGroup(d.toLowerCase());
        results.add(mapped || d.toUpperCase());
      });
    } else {
      const mapped = mapRawToGroup(direct.toLowerCase());
      results.add(mapped || direct.toUpperCase());
    }
  }

  // fuzzy name matching against known provider map keys
  const lowerName = name.toLowerCase();
  for (const [key, val] of Object.entries(PROVIDER_CATEGORY_MAP)) {
    const keyLower = key.toLowerCase();
    if (
      keyLower === lowerName ||
      lowerName.includes(keyLower) ||
      keyLower.includes(lowerName)
    ) {
      if (Array.isArray(val)) {
        val.forEach((v) => {
          const mapped = mapRawToGroup(v.toLowerCase());
          results.add(mapped || v.toUpperCase());
        });
      } else {
        const mapped = mapRawToGroup(val.toLowerCase());
        results.add(mapped || val.toUpperCase());
      }
    }
  }

  // fallback keyword inference, include CRASH keywords
  if (lowerName.includes("live") || lowerName.includes("casino"))
    results.add("CASINO");
  if (
    lowerName.includes("slot") ||
    lowerName.includes("pg") ||
    lowerName.includes("play")
  )
    results.add("SLOTS");
  if (lowerName.includes("fish") || lowerName.includes("fishing"))
    results.add("FISHING");
  if (
    lowerName.includes("crash") ||
    lowerName.includes("aviator") ||
    lowerName.includes("spribe") ||
    lowerName.includes("jili")
  )
    results.add("CRASH");

  if (results.size === 0) results.add("SLOTS");

  return Array.from(results);
};

export const filterProvidersByCategory = (providers, category) => {
  // If no category specified, return all providers.
  if (!category) return providers;
  // For Hot category we must not show providers — return empty list.
  if (category === "HOT") return [];
  return providers.filter((provider) => {
    const providerCats = getProviderCategory(provider);
    if (Array.isArray(providerCats)) return providerCats.includes(category);
    return providerCats === category;
  });
};

export const deduplicateProviders = (providers) => {
  const seen = new Set();
  const unique = [];
  providers.forEach((provider) => {
    const name = (provider.brand_title || provider.name || "").trim();
    if (!seen.has(name)) {
      seen.add(name);
      unique.push(provider);
    }
  });
  return unique;
};

export const addProviderMapping = (provider, category) => {
  // accept string or array
  PROVIDER_CATEGORY_MAP[provider] = category;
};
