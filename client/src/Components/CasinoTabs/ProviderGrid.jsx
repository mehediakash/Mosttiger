import React, { memo, useCallback, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { normalizeCategory } from "../../utils/categoryNormalizer";

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
 * Returns a short, clean, single-line provider display name.
 */
export const getShortProviderName = (rawName = "") => {
  if (!rawName || typeof rawName !== "string") return "UNKNOWN";
  const trimmed = rawName.trim();
  const normalized = trimmed.toLowerCase().replace(/[^a-z0-9]/g, "");

  // 1. Direct or partial match against known providers
  for (const [key, short] of Object.entries(KNOWN_PROVIDER_SHORTS)) {
    if (
      normalized === key ||
      normalized.startsWith(key) ||
      normalized.includes(key)
    ) {
      return short;
    }
  }

  // 2. Generic fallback cleanup
  let cleaned = trimmed
    .replace(/\s*\([^)]*\)/g, "") // remove parenthetical notes e.g. (Asia)
    .replace(/[-_]/g, " ")
    .replace(/([a-z])([A-Z])/g, "$1 $2") // split camelCase
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
};

export const ProviderGrid = ({
  providers = [],
  selectedCategory = "",
  onProviderSelect = () => {},
}) => {
  const navigate = useNavigate();
  const [failedImages, setFailedImages] = useState(() => new Set());

  const handleImageError = useCallback((rawName) => {
    setFailedImages((prev) => {
      if (prev.has(rawName)) return prev;
      const next = new Set(prev);
      next.add(rawName);
      return next;
    });
  }, []);

  // Defensive: do not render providers for HOT category
  try {
    if (selectedCategory && normalizeCategory(selectedCategory) === "HOT") {
      return null;
    }
  } catch (e) {
    // ignore normalization errors and continue
  }

  // Process, deduplicate, and sort providers alphabetically from Z to A
  const sortedProviders = useMemo(() => {
    const seen = new Set();
    const list = [];

    providers.forEach((provider) => {
      const rawName = provider.brand_title || provider.name || "";
      if (!rawName || seen.has(rawName)) return;
      seen.add(rawName);

      const shortName = getShortProviderName(rawName);
      list.push({
        rawName,
        shortName,
        logo: provider.logo || "",
      });
    });

    // Dynamic alphabetical sorting from Z to A based on shortName
    return list.sort((a, b) =>
      b.shortName.localeCompare(a.shortName, undefined, {
        numeric: true,
        sensitivity: "base",
      })
    );
  }, [providers]);

  if (!sortedProviders || sortedProviders.length === 0) {
    return null;
  }

  return (
    <div className="w-full bg-[#111111] px-2 py-4 rounded-xl mb-4">
      <h3 className="text-white font-bold text-sm mb-3 px-2">Providers</h3>
      <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-6 lg:grid-cols-6 xl:grid-cols-8 gap-2 sm:gap-3">
        {sortedProviders.map((provider) => {
          const isFailed = !provider.logo || failedImages.has(provider.rawName);

          return (
            <button
              key={provider.rawName}
              type="button"
              onClick={() => {
                onProviderSelect(provider.rawName);
                navigate(`/games?provider=${encodeURIComponent(provider.rawName)}`);
              }}
              className="group relative flex flex-col justify-between w-full rounded-xl overflow-hidden
                bg-gradient-to-b from-[#1b1d22] via-[#131417] to-[#0c0d0f]
                border border-white/[0.08] hover:border-primary/50
                shadow-[0_4px_12px_rgba(0,0,0,0.4)] hover:shadow-[0_6px_18px_rgba(0,0,0,0.6)]
                transition-all duration-200 ease-out
                hover:scale-[1.02] active:scale-[0.98]
                p-1.5 cursor-pointer focus:outline-none"
              title={provider.rawName}
            >
              {/* Logo Presentation Box */}
              <div className="relative w-full aspect-[16/10] sm:aspect-[16/11] flex items-center justify-center rounded-lg bg-gradient-to-b from-[#252830] to-[#15161c] border border-white/[0.06] p-2 overflow-hidden">
                {/* Radial ambient sheen ensuring both dark and light logos pop with high contrast */}
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_rgba(255,255,255,0.09)_0%,_transparent_75%)] pointer-events-none" />

                {isFailed ? (
                  /* Fallback UI: sleek initials badge with clean typography */
                  <div className="relative flex flex-col items-center justify-center w-full h-full text-center px-1">
                    <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-primary/10 border border-primary/30 flex items-center justify-center shadow-inner">
                      <span className="text-[10px] sm:text-xs font-bold text-primary tracking-wider">
                        {provider.shortName.slice(0, 2)}
                      </span>
                    </div>
                  </div>
                ) : (
                  <img
                    src={provider.logo}
                    alt={provider.shortName}
                    loading="lazy"
                    decoding="async"
                    onError={() => handleImageError(provider.rawName)}
                    className="relative max-h-full max-w-full object-contain filter drop-shadow-[0_2px_4px_rgba(0,0,0,0.6)] group-hover:brightness-110 group-hover:scale-105 transition-all duration-200"
                  />
                )}
              </div>

              {/* Provider Name: Single line, uppercase, letter-spaced, clean */}
              <div className="w-full pt-1.5 pb-0.5 px-0.5">
                <span className="block text-[11px] sm:text-[12px] font-medium tracking-wider text-gray-300 group-hover:text-primary truncate text-center uppercase transition-colors duration-200 select-none">
                  {provider.shortName}
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default memo(ProviderGrid);
