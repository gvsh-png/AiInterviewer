const PREFIX = "probe:still:";
const LIMIT = 12;
const mem = new Map<string, string>();

function hashKey(value: string) {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash * 31 + value.charCodeAt(i)) | 0;
  }
  return `${PREFIX}${Math.abs(hash).toString(36)}`;
}

export function stillCacheKey(parts: Array<string | undefined>) {
  return parts.filter(Boolean).join("|").slice(0, 280);
}

export function getCachedStill(key: string) {
  const hit = mem.get(key);
  if (hit) return hit;
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(hashKey(key));
    if (raw) {
      mem.set(key, raw);
      return raw;
    }
  } catch {
    /* quota / private mode */
  }
  return null;
}

export function setCachedStill(key: string, dataUrl: string) {
  mem.set(key, dataUrl);
  if (typeof window === "undefined") return;
  try {
    const storeKey = hashKey(key);
    window.sessionStorage.setItem(storeKey, dataUrl);
    const order = JSON.parse(
      window.sessionStorage.getItem(`${PREFIX}order`) || "[]"
    ) as string[];
    const next = [storeKey, ...order.filter((item) => item !== storeKey)].slice(
      0,
      LIMIT
    );
    for (const extra of order) {
      if (!next.includes(extra)) window.sessionStorage.removeItem(extra);
    }
    window.sessionStorage.setItem(`${PREFIX}order`, JSON.stringify(next));
  } catch {
    /* ignore quota */
  }
}
