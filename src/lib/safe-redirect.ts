// Where to send someone after signing in or following an emailed link.
// Only same-site paths are allowed: "/dashboard" is fine, but "//evil.com"
// or "/\evil.com" (which browsers treat as another website) and full URLs
// are refused and replaced with the fallback — otherwise a crafted
// "?next=" link could bounce a just-signed-in user to someone else's site.
export function safeNextPath(value: string | null | undefined, fallback: string): string {
  const next = String(value ?? "").trim();
  if (!next.startsWith("/")) return fallback;
  if (next.startsWith("//") || next.startsWith("/\\")) return fallback;
  return next;
}
