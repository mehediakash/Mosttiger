import React, { lazy, Suspense } from "react";

const LiveChatWidget = lazy(() => import("./liveChat/LiveChatWidget"));

export default function CrispChat() {
  return (
    <Suspense fallback={null}>
      <LiveChatWidget />
    </Suspense>
  );
}
