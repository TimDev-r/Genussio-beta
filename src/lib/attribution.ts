const KEY = "genussio.attribution";
export type Attribution = { code?: string; utm_source?: string; utm_medium?: string; utm_campaign?: string };

export function readAttribution(): Attribution {
  try { return JSON.parse(localStorage.getItem(KEY) ?? "{}"); } catch { return {}; }
}

/** Merges URL params into stored attribution. Call from useEffect. */
export function captureAttribution(search: string): Attribution {
  const params = new URLSearchParams(search);
  const next = { ...readAttribution() };
  for (const k of ["code", "utm_source", "utm_medium", "utm_campaign"] as const) {
    const v = params.get(k)?.trim();
    if (v) next[k] = v;
  }
  localStorage.setItem(KEY, JSON.stringify(next));
  return next;
}

export function saveBetaCode(code: string) {
  localStorage.setItem(KEY, JSON.stringify({ ...readAttribution(), code }));
}
