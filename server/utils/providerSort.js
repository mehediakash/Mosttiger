const KNOWN_PROVIDER_SHORTS = {
  // P
  pragmaticplay: "PRAGMATIC",
  pragmatic: "PRAGMATIC",
  pragmaticplaylive: "PRAGMATIC",
  playngo: "PLAY'N GO",
  pgsoft: "PG SOFT",
  pgsgaming: "PG SOFT",
  playtech: "PLAYTECH",
  playson: "PLAYSON",
  playace: "PLAYACE",
  pushgaming: "PUSH",

  // E
  evolution: "EVOLUTION",
  evolutiongaming: "EVOLUTION",
  evolutionlive: "EVOLUTION",
  ezugi: "EZUGI",
  evoplay: "EVOPLAY",
  eazygaming: "EAZY",
  epicwin: "EPICWIN",

  // B
  betsoft: "BETSOFT",
  bgaming: "BGAMING",
  bigtimegaming: "BIG TIME",
  btgaming: "BTGAMING",
  btigaming: "BTI",

  // H
  hacksaw: "HACKSAW",
  hacksawgaming: "HACKSAW",
  habanero: "HABANERO",

  // M
  microgaming: "MICROGAMING",
  mac88: "MAC 88",

  // R
  redtiger: "RED TIGER",
  redtigergaming: "RED TIGER",
  relaxgaming: "RELAX",
  relax: "RELAX",
  rubyplay: "RUBY PLAY",
  rich88: "RICH88",

  // N
  netent: "NETENT",
  nolimit: "NOLIMIT",
  nolimitcity: "NOLIMIT",
  nextspin: "NEXTSPIN",

  // J
  jili: "JILI",
  jdb: "JDB",

  // S
  spribe: "SPRIBE",
  smartsoft: "SMARTSOFT",
  smartsoftgaming: "SMARTSOFT",
  skywind: "SKYWIND",
  sbo: "SBO",
  sbobet: "SBO",
  sabasports: "SABA SPORTS",
  saba: "SABA SPORTS",
  simpleplay: "SIMPLEPLAY",
  sexy: "SEXY",

  // Numbers & Others
  "3oaks": "3 OAKS",
  "3oaksgaming": "3 OAKS",
  "100hp": "100HP",
  "2j": "2J",
  "9wickets": "9WICKETS",
  cq9: "CQ9",
  cmd: "CMD",
  crowdplay: "CROWDPLAY",
  gameart: "GAMEART",
  fastspin: "FAST SPIN",
  askmeslot: "ASKMESLOT",
  kingmidas: "KING MIDAS",
  king: "KING",
  tadagaming: "TADA",
  tada: "TADA",
  kagaming: "KA",
  ka: "KA",
  turbogames: "TURBOGAMES",
  turbo: "TURBOGAMES",
  ideal: "IDEAL",
  onegaming: "ONE GAMING",
  yeebet: "YEEBET",
  vplus: "VPLUS",
  amigo: "AMIGO",
  ygrgaming: "YGR",
  ygr: "YGR",
};

/**
 * Returns a short, normalized single-line provider display name.
 */
function getShortProviderName(rawName = "") {
  if (!rawName || typeof rawName !== "string") return "UNKNOWN";
  const trimmed = rawName.trim();
  const normalized = trimmed.toLowerCase().replace(/[^a-z0-9]/g, "");

  for (const [key, short] of Object.entries(KNOWN_PROVIDER_SHORTS)) {
    if (
      normalized === key ||
      normalized.startsWith(key) ||
      normalized.includes(key)
    ) {
      return short;
    }
  }

  let cleaned = trimmed
    .replace(/\s*\([^)]*\)/g, "")
    .replace(/[-_]/g, " ")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/\b(gaming|games|live|asia|world|online|platform|slots?)\b/gi, "")
    .replace(/\s+/g, " ")
    .trim();

  if (!cleaned) {
    cleaned = trimmed.slice(0, 12);
  }

  const words = cleaned.split(" ");
  if (words.length > 2) {
    cleaned = words.slice(0, 2).join(" ");
  }
  if (cleaned.length > 14) {
    cleaned = cleaned.slice(0, 14).trim();
  }

  return cleaned.toUpperCase();
}

/**
 * Validates and normalizes displayOrder input.
 * Rules:
 * - Positive integer (1, 2, 3...)
 * - Rejects negative, decimals, non-numeric values
 * - Allows null or empty string, which is converted to null
 */
function parseAndValidateDisplayOrder(val) {
  if (
    val === null ||
    val === undefined ||
    val === "" ||
    val === "null" ||
    val === "undefined"
  ) {
    return { valid: true, value: null };
  }

  const num = Number(val);
  if (Number.isNaN(num) || !Number.isInteger(num) || num < 1) {
    return {
      valid: false,
      error: "Display Order must be a positive integer (1, 2, 3...) or empty.",
    };
  }

  return { valid: true, value: num };
}

/**
 * Deterministic provider sorting comparator.
 *
 * Priority:
 * 1. Providers WITH valid displayOrder appear FIRST (sorted 1 -> 2 -> 3... ASC).
 * 2. Duplicate displayOrder values break ties deterministically by short name Z -> A.
 * 3. Providers WITHOUT displayOrder appear SECOND (sorted by short name Z -> A DESC).
 */
function compareProviders(a, b) {
  const hasOrderA =
    a.displayOrder !== null &&
    a.displayOrder !== undefined &&
    a.displayOrder !== "" &&
    Number.isInteger(Number(a.displayOrder)) &&
    Number(a.displayOrder) >= 1;

  const hasOrderB =
    b.displayOrder !== null &&
    b.displayOrder !== undefined &&
    b.displayOrder !== "" &&
    Number.isInteger(Number(b.displayOrder)) &&
    Number(b.displayOrder) >= 1;

  const shortA = getShortProviderName(
    a.shortName || a.displayName || a.name || "",
  );
  const shortB = getShortProviderName(
    b.shortName || b.displayName || b.name || "",
  );

  // 1. Both have custom order
  if (hasOrderA && hasOrderB) {
    const orderDiff = Number(a.displayOrder) - Number(b.displayOrder);
    if (orderDiff !== 0) {
      return orderDiff; // 1 -> 2 -> 3...
    }
    // Duplicate tie-breaker: Z -> A
    return shortB.localeCompare(shortA, undefined, {
      numeric: true,
      sensitivity: "base",
    });
  }

  // 2. Only A has custom order -> A comes first
  if (hasOrderA && !hasOrderB) {
    return -1;
  }

  // 3. Only B has custom order -> B comes first
  if (!hasOrderA && hasOrderB) {
    return 1;
  }

  // 4. Neither has custom order -> Z -> A
  return shortB.localeCompare(shortA, undefined, {
    numeric: true,
    sensitivity: "base",
  });
}

module.exports = {
  getShortProviderName,
  parseAndValidateDisplayOrder,
  compareProviders,
};
