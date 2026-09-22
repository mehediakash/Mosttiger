import React, { useState, useRef, useCallback } from "react";
import { MdSearch, MdChevronLeft, MdChevronRight } from "react-icons/md";
import SearchDrawer from "./SearchDrawer";
import { normalizeProviderName } from "../../../utils/normalizeProvider";

export default function ProviderFilterBar({
  providers = [],
  selectedProviders = [],
  onToggleProvider = () => {},
  searchTerm = "",
  onSearchTerm = () => {},
}) {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const scrollContainerRef = useRef(null);
  const btnRefs = useRef({});
  const dragStartX = useRef(0);
  const dragScrollLeft = useRef(0);

  const normalize = normalizeProviderName;

  // All providers including ALL
  const allProviders = ["ALL", ...providers];

  // ================= SCROLL HANDLING =================
  const handleWheel = (e) => {
    const container = scrollContainerRef.current;
    if (!container) return;

    if (Math.abs(e.deltaY) > 0) {
      e.preventDefault();
      container.scrollLeft += e.deltaY;
    }
  };

  const handleMouseDown = (e) => {
    const container = scrollContainerRef.current;
    if (!container) return;

    setIsDragging(true);
    dragStartX.current = e.pageX - container.offsetLeft;
    dragScrollLeft.current = container.scrollLeft;
  };

  const handleMouseMove = (e) => {
    if (!isDragging) return;

    const container = scrollContainerRef.current;
    if (!container) return;

    e.preventDefault();

    const x = e.pageX - container.offsetLeft;
    const walk = (x - dragStartX.current) * 1.5;

    container.scrollLeft = dragScrollLeft.current - walk;
  };

  const handleTouchStart = (e) => {
    const container = scrollContainerRef.current;
    if (!container) return;

    dragStartX.current = e.touches[0].pageX - container.offsetLeft;
    dragScrollLeft.current = container.scrollLeft;
  };

  const handleTouchMove = (e) => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const x = e.touches[0].pageX - container.offsetLeft;
    const walk = (x - dragStartX.current) * 1.5;

    container.scrollLeft = dragScrollLeft.current - walk;
  };

  const stopDragging = () => {
    setIsDragging(false);
  };

  // ================= SCROLL BUTTONS =================
  const scroll = (direction) => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollBy({
        left: direction === "left" ? -200 : 200,
        behavior: "smooth",
      });
    }
  };

  // ================= CHECK IF PROVIDER SELECTED =================
  const isProviderSelected = useCallback(
    (provider) => {
      if (provider === "ALL") {
        return selectedProviders.length === 0;
      }
      return selectedProviders.includes(provider);
    },
    [selectedProviders],
  );

  return (
    <>
      <div className="w-full bg-gradient-to-b from-[#1a1a1a] to-black border-b border-primary/20 sticky top-0 z-40">
        <div className="flex items-center gap-2 px-2 sm:px-4 py-3">
          {/* Left Scroll Button */}
          <button
            onClick={() => scroll("left")}
            className="hidden sm:flex flex-shrink-0 w-9 h-9 items-center justify-center bg-primary/10 hover:bg-primary/20 text-primary rounded transition-colors"
            title="Scroll left"
          >
            <MdChevronLeft className="w-5 h-5" />
          </button>

          {/* Scrollable Provider Tabs */}
          <div
            ref={scrollContainerRef}
            onWheel={handleWheel}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={stopDragging}
            onMouseLeave={stopDragging}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={stopDragging}
            className={`flex-1 flex items-center gap-2 overflow-x-auto overflow-y-hidden ${
              isDragging ? "cursor-grabbing" : "cursor-grab"
            } scroll-smooth pb-1`}
            style={{
              scrollBehavior: "smooth",
              WebkitOverflowScrolling: "touch",
            }}
          >
            {allProviders.map((provider) => {
              const key = normalize(provider);
              return (
                <button
                  key={provider}
                  ref={(el) => (btnRefs.current[key] = el)}
                  onClick={() => onToggleProvider(provider)}
                  className={`shrink-0 px-3 sm:px-4 py-2 rounded-full font-medium text-xs sm:text-sm transition-all whitespace-nowrap ${
                    isProviderSelected(provider)
                      ? "bg-primary text-black font-semibold"
                      : "bg-[#2a2a2a] text-gray-400 hover:bg-[#3a3a3a] hover:text-gray-300"
                  }`}
                >
                  {provider}
                </button>
              );
            })}
          </div>

          {/* Right Scroll Button */}
          <button
            onClick={() => scroll("right")}
            className="hidden sm:flex flex-shrink-0 w-9 h-9 items-center justify-center bg-primary/10 hover:bg-primary/20 text-primary rounded transition-colors"
            title="Scroll right"
          >
            <MdChevronRight className="w-5 h-5" />
          </button>

          {/* Search Button */}
          <button
            onClick={() => setIsDrawerOpen(true)}
            className="shrink-0 w-9 h-9 sm:w-10 sm:h-10 flex items-center justify-center bg-primary hover:primary text-black rounded-lg transition-colors"
            title="Search games"
          >
            <MdSearch className="w-5 h-5" />
          </button>
        </div>

        {/* Custom Scrollbar CSS */}
        <style>{`
          div::-webkit-scrollbar {
            height: 4px;
          }

          div::-webkit-scrollbar-track {
            background: rgba(255, 255, 255, 0.03);
          }

          div::-webkit-scrollbar-thumb {
            background: rgba(255, 184, 12, 0.4);
            border-radius: 2px;
          }

          div::-webkit-scrollbar-thumb:hover {
            background: rgba(255, 184, 12, 0.7);
          }
        `}</style>
      </div>

      {/* Search Drawer */}
      <SearchDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        providers={providers}
        selectedProviders={selectedProviders}
        onToggleProvider={onToggleProvider}
        searchTerm={searchTerm}
        onSearchTerm={onSearchTerm}
      />

      {/* Auto-scroll active provider into view */}
      {typeof window !== "undefined" && (
        <AutoScrollHelper
          scrollContainerRef={scrollContainerRef}
          btnRefs={btnRefs}
          selectedProviders={selectedProviders}
          providers={providers}
          normalize={normalize}
        />
      )}
    </>
  );
}

function AutoScrollHelper({
  scrollContainerRef,
  btnRefs,
  selectedProviders,
  providers,
  normalize,
}) {
  const didScrollRef = useRef(false);
  React.useEffect(() => {
    if (!scrollContainerRef?.current) return;
    // If there are selected providers, scroll first into view
    if (selectedProviders && selectedProviders.length > 0) {
      const first = selectedProviders[0];
      const norm = normalize(first);
      const el = btnRefs.current[norm];
      if (el && el.scrollIntoView) {
        // slight delay to allow layout
        setTimeout(
          () =>
            el.scrollIntoView({
              behavior: "smooth",
              inline: "center",
              block: "nearest",
            }),
          50,
        );
        didScrollRef.current = true;
      }
    } else {
      // no provider selected -> scroll to start
      if (!didScrollRef.current) {
        setTimeout(() => {
          try {
            scrollContainerRef.current.scrollTo({
              left: 0,
              behavior: "smooth",
            });
          } catch (e) {}
        }, 50);
      }
    }
  }, [selectedProviders, providers, scrollContainerRef, btnRefs, normalize]);

  return null;
}
