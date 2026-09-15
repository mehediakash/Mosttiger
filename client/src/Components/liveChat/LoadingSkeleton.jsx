import React from "react";

const LoadingSkeleton = () => (
  <div className="min-h-0 flex-1 space-y-4 overflow-hidden p-4">
    {[0, 1, 2, 3].map((item) => (
      <div
        key={item}
        className={`flex ${item % 2 ? "justify-end" : "justify-start"}`}
      >
        <div className="h-16 w-2/3 animate-pulse rounded-2xl bg-white/10" />
      </div>
    ))}
  </div>
);

export default LoadingSkeleton;
