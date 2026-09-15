const CACHE_PREFIX = "dexwine_home_cache_v1";

const safeStorage = {
  get(key) {
    try {
      return localStorage.getItem(key);
    } catch (e) {
      return null;
    }
  },
  set(key, value) {
    try {
      localStorage.setItem(key, value);
    } catch (e) {}
  },
};

const buildKey = (key) => `${CACHE_PREFIX}:${key}`;

export const readCache = (key, maxAgeMs) => {
  const raw = safeStorage.get(buildKey(key));
  if (!raw) return { data: null, isStale: true, hasValue: false };

  try {
    const parsed = JSON.parse(raw);
    const ts = Number(parsed?.ts || 0);
    const age = Date.now() - ts;
    const isStale = !maxAgeMs || age > maxAgeMs;
    return {
      data: parsed?.data ?? null,
      isStale,
      hasValue: parsed?.data != null,
      ts,
    };
  } catch (e) {
    return { data: null, isStale: true, hasValue: false };
  }
};

export const writeCache = (key, data) => {
  safeStorage.set(
    buildKey(key),
    JSON.stringify({
      ts: Date.now(),
      data,
    }),
  );
};

export const preloadImage = (src) => {
  if (!src) return;
  const img = new Image();
  img.src = src;
};

export const preloadImages = (images = []) => {
  images.forEach((img) => preloadImage(img));
};
