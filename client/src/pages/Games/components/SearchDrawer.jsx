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
        className={`fixed right-0 top-0 z-50 h-full w-full sm:w-96 bg-[#1a1a1a] border-l border-primary/20 shadow-2xl transform transition-transform duration-300 flex flex-col ${
          isOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-primary/20 flex-shrink-0">
          <h2 className="text-lg sm:text-xl font-bold text-white">
            Search & Filter
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-[#2a2a2a] rounded-lg transition-colors text-gray-400 hover:text-white"
          >
            <MdClose className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="overflow-y-auto flex-1 flex flex-col">
          {/* Game Search Input */}
          <div className="p-4 border-b border-primary/10 flex-shrink-0">
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Search Games
            </label>
            <input
              type="text"
              placeholder="e.g. Aviator, Sweet Bonanza..."
              value={searchTerm}
              onChange={(e) => onSearchTerm(e.target.value)}
              className="w-full px-4 py-2 bg-[#2a2a2a] border border-primary/20 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-primary transition-colors"
            />
            <p className="text-xs text-gray-400 mt-1">
              Games update instantly while typing
            </p>
          </div>

          {/* Provider Filter Section */}
          <div className="p-4 border-b border-primary/10 flex-shrink-0">
            <label className="block text-sm font-medium text-gray-300 mb-3">
              Filter by Provider
            </label>
            <input
              type="text"
              placeholder="Search providers..."
              value={gameSearchTerm}
              onChange={(e) => setGameSearchTerm(e.target.value)}
              className="w-full px-4 py-2 bg-[#2a2a2a] border border-primary/20 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-primary transition-colors mb-3"
            />
          </div>

          {/* Providers Grid */}
          <div className="p-4 flex-1 overflow-y-auto">
            {filteredProviders.length === 0 ? (
              <p className="text-gray-500 text-center py-8 text-sm">
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
                        ? "bg-primary text-black font-semibold"
                        : "bg-[#2a2a2a] text-gray-400 hover:bg-[#3a3a3a] border border-primary/10"
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
        <div className="p-4 border-t border-primary/20 bg-[#1a1a1a] flex gap-2 flex-shrink-0">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 bg-[#2a2a2a] text-white hover:bg-[#3a3a3a] rounded-lg font-medium transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleApply}
            className="flex-1 px-4 py-2 bg-primary text-black hover:primary rounded-lg font-bold transition-colors"
          >
            Apply
          </button>
        </div>
      </div>
    </>
  );
}
