import React, { useState, useCallback, useMemo } from "react";
import { MdClose } from "react-icons/md";

export default function SearchDrawer({
  isOpen = false,
  onClose = () => {},
  providers = [],
  selectedProviders = [],
  onToggleProvider = () => {},
  searchTerm = "",
  onSearchTerm = () => {},
}) {
  const [gameSearchTerm, setGameSearchTerm] = useState("");
  const [internalSelectedProviders, setInternalSelectedProviders] =
    useState(selectedProviders);

  // Filter providers based on search
  const filteredProviders = useMemo(() => {
    if (!gameSearchTerm) return providers;

    return providers.filter((provider) =>
      provider.toLowerCase().includes(gameSearchTerm.toLowerCase()),
    );
  }, [providers, gameSearchTerm]);

  // Handle provider toggle
  const handleToggle = useCallback((provider) => {
    setInternalSelectedProviders((prev) => {
      if (prev.includes(provider)) {
        return prev.filter((p) => p !== provider);
      }
      return [...prev, provider];
    });
  }, []);

  // Apply changes and close
  const handleApply = useCallback(() => {
    // Call parent's toggle for each changed provider
    const added = internalSelectedProviders.filter(
      (p) => !selectedProviders.includes(p),
    );
    const removed = selectedProviders.filter(
      (p) => !internalSelectedProviders.includes(p),
    );

    [...added, ...removed].forEach((provider) => {
      onToggleProvider(provider);
    });

    onClose();
  }, [internalSelectedProviders, selectedProviders, onToggleProvider, onClose]);

  // Sync when drawer opens
  React.useEffect(() => {
    if (isOpen) {
      setInternalSelectedProviders(selectedProviders);
    }
  }, [isOpen, selectedProviders]);

  return (
    <>
      {/* Overlay - NO BLUR */}
      {isOpen && (
        <div className="fixed inset-0 z-40 bg-black/60" onClick={onClose} />
      )}

      {/* Drawer */}
      <div
        className={`fixed right-0 top-0 z-50 h-full w-full sm:w-96 bg-[#0B1220] border-l border-[#16314D] shadow-2xl transform transition-transform duration-300 flex flex-col ${
          isOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-[#16314D] flex-shrink-0">
          <h2 className="text-lg sm:text-xl font-bold text-[#F5FAFF]">
            Search & Filter
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-[#16314D]/40 rounded-lg transition-colors text-[#8FA6BC] hover:text-[#F5FAFF]"
          >
            <MdClose className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="overflow-y-auto flex-1 flex flex-col">
          {/* Game Search Input */}
          <div className="p-4 border-b border-[#16314D] flex-shrink-0">
            <label className="block text-sm font-medium text-[#8FA6BC] mb-2">
              Search Games
            </label>
            <input
              type="text"
              placeholder="e.g. Aviator, Sweet Bonanza..."
              value={searchTerm}
              onChange={(e) => onSearchTerm(e.target.value)}
              className="w-full px-4 py-2 bg-[#050912] border border-[#16314D] rounded-lg text-[#F5FAFF] placeholder-[#8FA6BC]/60 focus:outline-none focus:border-primary transition-colors"
            />
            <p className="text-xs text-[#8FA6BC]/70 mt-1">
              Games update instantly while typing
            </p>
          </div>

          {/* Provider Filter Section */}
          <div className="p-4 border-b border-[#16314D] flex-shrink-0">
            <label className="block text-sm font-medium text-[#8FA6BC] mb-3">
              Filter by Provider
            </label>
            <input
              type="text"
              placeholder="Search providers..."
              value={gameSearchTerm}
              onChange={(e) => setGameSearchTerm(e.target.value)}
              className="w-full px-4 py-2 bg-[#050912] border border-[#16314D] rounded-lg text-[#F5FAFF] placeholder-[#8FA6BC]/60 focus:outline-none focus:border-primary transition-colors mb-3"
            />
          </div>

          {/* Providers Grid */}
          <div className="p-4 flex-1 overflow-y-auto">
            {filteredProviders.length === 0 ? (
              <p className="text-[#8FA6BC]/70 text-center py-8 text-sm">
                {gameSearchTerm ? "No providers found" : "Loading providers..."}
              </p>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                {filteredProviders.map((provider) => (
                  <button
                    key={provider}
                    onClick={() => handleToggle(provider)}
                    className={`px-3 py-2 rounded-lg font-medium text-sm transition-all ${
                      internalSelectedProviders.includes(provider)
                        ? "bg-primary text-[#050912] font-semibold shadow-[0_0_10px_rgba(0,229,255,0.3)]"
                        : "bg-[#050912] text-[#8FA6BC] hover:bg-[#16314D]/40 hover:text-[#F5FAFF] border border-[#16314D]"
                    }`}
                  >
                    {provider}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer Buttons */}
        <div className="p-4 border-t border-[#16314D] bg-[#0B1220] flex gap-2 flex-shrink-0">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 bg-[#050912] text-[#F5FAFF] hover:bg-[#16314D]/40 border border-[#16314D] rounded-lg font-medium transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleApply}
            className="flex-1 px-4 py-2 bg-primary hover:bg-[#48DDFF] text-[#050912] rounded-lg font-bold shadow-[0_0_15px_rgba(0,229,255,0.35)] transition-colors"
          >
            Apply
          </button>
        </div>
      </div>
    </>
  );
}
