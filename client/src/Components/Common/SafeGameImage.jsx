import React, { memo, useCallback, useEffect, useMemo, useState } from "react";

const failedImageUrls = new Set();

const SafeGameImage = ({
  src,
  alt,
  className = "",
  fallbackSrc = "/placeholder.jpg",
  loading = "lazy",
  decoding = "async",
  draggable = false,
  ...rest
}) => {
  const normalizedSrc = typeof src === "string" ? src.trim() : "";

  const shouldUseFallbackInitially = useMemo(() => {
    return !normalizedSrc || failedImageUrls.has(normalizedSrc);
  }, [normalizedSrc]);

  const [hasFailed, setHasFailed] = useState(shouldUseFallbackInitially);

  useEffect(() => {
    setHasFailed(!normalizedSrc || failedImageUrls.has(normalizedSrc));
  }, [normalizedSrc]);

  const displaySrc = hasFailed ? fallbackSrc : normalizedSrc;

  const handleError = useCallback(
    (event) => {
      if (normalizedSrc) {
        failedImageUrls.add(normalizedSrc);
      }

      // Prevent browser-level recursive error loops on this node
      if (event?.currentTarget) {
        event.currentTarget.onerror = null;
      }

      setHasFailed(true);
    },
    [normalizedSrc],
  );

  return (
    <img
      src={displaySrc || fallbackSrc}
      alt={alt}
      className={className}
      loading={loading}
      decoding={decoding}
      draggable={draggable}
      onError={hasFailed ? undefined : handleError}
      {...rest}
    />
  );
};

export default memo(SafeGameImage);
