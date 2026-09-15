import { useEffect } from "react";

const CHECK_INTERVAL_MS = 750;
const DEVTOOLS_SIZE_THRESHOLD = 220;
const REQUIRED_HITS = 1;
const REQUIRED_CLEARS = 1;
const WARNING_HTML = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Developer tools detected</title>
    <style>
      html,
      body {
        margin: 0;
        min-height: 100%;
        background: #ffffff;
        color: #111827;
        font-family: Arial, Helvetica, sans-serif;
      }

      body {
        min-height: 100vh;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 24px;
        box-sizing: border-box;
        text-align: center;
      }

      h1 {
        margin: 0;
        font-size: 24px;
        font-weight: 600;
        line-height: 1.25;
      }

      p {
        margin: 12px auto 0;
        max-width: 460px;
        color: #4b5563;
        font-size: 14px;
        line-height: 1.6;
      }
    </style>
  </head>
  <body>
    <main>
      <h1>Developer tools detected</h1>
      <p>This site remains active, but developer tools are intended for development purposes</p>
    </main>
  </body>
</html>`;

const isEditableTarget = (target) => {
  if (!(target instanceof HTMLElement)) {
    return false;
  }

  return Boolean(
    target.closest(
      'input, textarea, select, [contenteditable="true"], [contenteditable=""]',
    ),
  );
};

const hasActiveTextSelection = () => {
  const selection = window.getSelection?.();
  return Boolean(selection && !selection.isCollapsed && selection.toString());
};

const isLikelyMobileViewport = () => {
  const hasTouch = navigator.maxTouchPoints > 1;
  const coarsePointer = window.matchMedia?.("(pointer: coarse)")?.matches;
  return Boolean((hasTouch || coarsePointer) && window.innerWidth < 1024);
};

const isDevToolsSizeSignal = () => {
  if (isLikelyMobileViewport()) {
    return false;
  }

  const widthGap = Math.abs(window.outerWidth - window.innerWidth);
  const heightGap = Math.abs(window.outerHeight - window.innerHeight);

  return widthGap > DEVTOOLS_SIZE_THRESHOLD || heightGap > DEVTOOLS_SIZE_THRESHOLD;
};

const isDevToolsShortcut = (event) => {
  const key = event.key?.toLowerCase();

  if (event.key === "F12") {
    return true;
  }

  if (event.ctrlKey && event.shiftKey && ["i", "j", "c"].includes(key)) {
    return true;
  }

  if (event.metaKey && event.altKey && ["i", "j", "c"].includes(key)) {
    return true;
  }

  return Boolean(event.ctrlKey && !event.shiftKey && !event.altKey && key === "u");
};

export const useAntiInspect = () => {
  useEffect(() => {
    if (!import.meta.env.PROD || typeof window === "undefined") {
      return undefined;
    }

    let hitCount = 0;
    let clearCount = 0;
    let hasNavigated = false;

    const navigateToBlankWarning = () => {
      if (hasNavigated) {
        return;
      }

      hasNavigated = true;

      const blankWindow = window.open("about:blank", "_self");

      if (blankWindow?.document) {
        blankWindow.document.open();
        blankWindow.document.write(WARNING_HTML);
        blankWindow.document.close();
        return;
      }

      window.location.assign("about:blank");
    };

    const handleContextMenu = (event) => {
      if (isEditableTarget(event.target) || hasActiveTextSelection()) {
        return;
      }

      event.preventDefault();
    };

    const handleKeyDown = (event) => {
      if (!isDevToolsShortcut(event)) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();
      navigateToBlankWarning();
    };

    const checkDevTools = () => {
      if (isDevToolsSizeSignal()) {
        hitCount += 1;
        clearCount = 0;

        if (hitCount >= REQUIRED_HITS) {
          navigateToBlankWarning();
        }

        return;
      }

      clearCount += 1;
      hitCount = 0;

      if (clearCount >= REQUIRED_CLEARS) {
        clearCount = REQUIRED_CLEARS;
      }
    };

    console.warn("Developer tools are intended for development purposes.");

    document.addEventListener("contextmenu", handleContextMenu);
    window.addEventListener("keydown", handleKeyDown, true);
    window.addEventListener("resize", checkDevTools, { passive: true });

    const intervalId = window.setInterval(checkDevTools, CHECK_INTERVAL_MS);
    checkDevTools();

    return () => {
      document.removeEventListener("contextmenu", handleContextMenu);
      window.removeEventListener("keydown", handleKeyDown, true);
      window.removeEventListener("resize", checkDevTools);
      window.clearInterval(intervalId);
    };
  }, []);

  return undefined;
};
