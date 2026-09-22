import React, { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { normalizeCategory } from "../../utils/categoryNormalizer";
import SafeGameImage from "../Common/SafeGameImage";

export const ProviderGrid = ({
  providers = [],
  selectedCategory = "",
  onProviderSelect = () => {},
}) => {
  const navigate = useNavigate();
  // Defensive: do not render providers for HOT category
  try {
    if (selectedCategory && normalizeCategory(selectedCategory) === "HOT") {
      return null;
    }
  } catch (e) {
    // ignore normalization errors and continue
  }
  const uniqueProviders = useMemo(() => {
    const seen = new Set();
    return providers.filter((provider) => {
      const name = provider.brand_title || provider.name || "";
      if (seen.has(name)) return false;
      seen.add(name);
      return true;
    });
  }, [providers]);

  if (!uniqueProviders || uniqueProviders.length === 0) {
    return null;
  }

  return (
    <div className="w-full bg-[#111111] px-2 py-4 rounded-lg mb-4">
      <h3 className="text-white font-bold text-sm mb-3 px-2">Providers</h3>
      <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-6 lg:grid-cols-5 xl:grid-cols-8 gap-3">
        {uniqueProviders.map((provider, index) => {
          const providerName =
            provider.brand_title || provider.name || "Unknown";
          const providerLogo = provider.logo || "";

          return (
            <button
              key={`${providerName}-${index}`}
              onClick={() => {
                onProviderSelect(providerName);
                navigate(`/games?provider=${encodeURIComponent(providerName)}`);
              }}
              className="group relative aspect-square rounded-lg overflow-hidden
                bg-gradient-to-b from-gray-800/80 to-gray-950/90
                border border-gray-700/50 hover:border-primary/50
                shadow-lg hover:shadow-2xl hover:shadow-primary/10
                transform transition-all duration-300
                hover:scale-[1.05] active:scale-95"
              title={providerName}
            >
              {/* Yellow Corner Ribbon */}
              <div className="absolute top-0 right-0 w-0 h-0 border-l-[30px] border-l-transparent border-t-[30px] border-t-primary group-hover:border-l-[40px] group-hover:border-t-[40px] transition-all duration-300 z-10" />

              {/* Logo Container */}
              <div className="absolute bg-[#D9D9D9] inset-0 flex items-center justify-center p-2">
                <SafeGameImage
                  src={providerLogo}
                  alt={providerName}
                  className="w-full h-full object-contain filter group-hover:brightness-110 transition-all duration-300"
                />
              </div>

              {/* Hover Overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col items-center justify-end p-2">
                <p className="text-white text-xs font-semibold text-center line-clamp-2">
                  {providerName}
                </p>
              </div>

              {/* Bottom Gradient */}
              <div className="absolute bottom-0 left-0 right-0 h-10 bg-gradient-to-t from-black/40 to-transparent group-hover:from-black/60 transition-all duration-300" />
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default ProviderGrid;
