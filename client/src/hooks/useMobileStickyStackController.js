import { useEffect } from "react";

const NAVBAR_SELECTOR = "[data-mobile-sticky-navbar]";
const TABS_SELECTOR = "[data-mobile-sticky-tabs]";
const MOBILE_QUERY = "(max-width: 767px)";
const NAVBAR_HEIGHT_VAR = "--mosttiger-mobile-navbar-height";

export default function useMobileStickyStackController() {
  useEffect(() => {
    if (typeof window === "undefined") {
      return undefined;
    }

    const mediaQuery = window.matchMedia(MOBILE_QUERY);
    const root = document.documentElement;
    let navbar = null;
    let tabs = null;
    let lastScrollY = Math.max(0, window.scrollY || window.pageYOffset || 0);
    let lastHeight = 0;
    let frameId = 0;
    let measureFrameId = 0;
    let resizeObserver = null;
    let observedNavbar = null;
    let observedTabs = null;

    const resetElements = () => {
      root.style.removeProperty(NAVBAR_HEIGHT_VAR);
      root.removeAttribute("data-mobile-scroll-direction");

      if (navbar) {
        navbar.style.removeProperty("transform");
        navbar.style.removeProperty("will-change");
        navbar.style.removeProperty("backface-visibility");
      }

      if (tabs) {
        tabs.style.removeProperty("top");
        tabs.style.removeProperty("transform");
        tabs.style.removeProperty("will-change");
        tabs.style.removeProperty("backface-visibility");
      }
    };

    const bindElements = () => {
      const nextNavbar = document.querySelector(NAVBAR_SELECTOR);
      const nextTabs = document.querySelector(TABS_SELECTOR);

      if (resizeObserver && nextNavbar && nextNavbar !== observedNavbar) {
        if (observedNavbar) resizeObserver.unobserve(observedNavbar);
        resizeObserver.observe(nextNavbar);
        observedNavbar = nextNavbar;
      }

      if (resizeObserver && nextTabs && nextTabs !== observedTabs) {
        if (observedTabs) resizeObserver.unobserve(observedTabs);
        resizeObserver.observe(nextTabs);
        observedTabs = nextTabs;
      }

      navbar = nextNavbar;
      tabs = nextTabs;
    };

    const measure = () => {
      bindElements();

      if (!mediaQuery.matches || !navbar || !tabs) {
        resetElements();
        return;
      }

      const nextHeight = Math.ceil(navbar.getBoundingClientRect().height);
      if (nextHeight && nextHeight !== lastHeight) {
        lastHeight = nextHeight;
        root.style.setProperty(NAVBAR_HEIGHT_VAR, `${nextHeight}px`);
      }

      navbar.style.transform = "translate3d(0,0,0)";
      navbar.style.willChange = "transform";
      navbar.style.backfaceVisibility = "hidden";

      tabs.style.top = `var(${NAVBAR_HEIGHT_VAR}, ${nextHeight}px)`;
      tabs.style.transform = "translate3d(0,0,0)";
      tabs.style.willChange = "transform";
      tabs.style.backfaceVisibility = "hidden";
    };

    const scheduleMeasure = () => {
      if (measureFrameId) return;

      measureFrameId = window.requestAnimationFrame(() => {
        measureFrameId = 0;
        measure();
      });
    };

    const updateScrollDirection = () => {
      frameId = 0;

      if (!mediaQuery.matches) {
        return;
      }

      const nextScrollY = Math.max(
        0,
        window.scrollY || window.pageYOffset || 0,
      );
      const delta = nextScrollY - lastScrollY;

      if (Math.abs(delta) > 2) {
        root.setAttribute(
          "data-mobile-scroll-direction",
          delta > 0 ? "down" : "up",
        );
        lastScrollY = nextScrollY;
      }
    };

    const onScroll = () => {
      if (frameId) return;
      frameId = window.requestAnimationFrame(updateScrollDirection);
    };

    const onMediaChange = () => {
      lastScrollY = Math.max(0, window.scrollY || window.pageYOffset || 0);
      scheduleMeasure();
    };

    bindElements();
    measure();

    if ("ResizeObserver" in window) {
      resizeObserver = new ResizeObserver(scheduleMeasure);
      bindElements();
    }

    const mutationObserver = new MutationObserver(scheduleMeasure);
    mutationObserver.observe(document.body, {
      childList: true,
      subtree: true,
    });

    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", scheduleMeasure, { passive: true });
    mediaQuery.addEventListener("change", onMediaChange);
    window.visualViewport?.addEventListener("resize", scheduleMeasure, {
      passive: true,
    });

    return () => {
      if (frameId) window.cancelAnimationFrame(frameId);
      if (measureFrameId) window.cancelAnimationFrame(measureFrameId);
      resizeObserver?.disconnect();
      mutationObserver.disconnect();
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", scheduleMeasure);
      mediaQuery.removeEventListener("change", onMediaChange);
      window.visualViewport?.removeEventListener("resize", scheduleMeasure);
      resetElements();
    };
  }, []);
}
