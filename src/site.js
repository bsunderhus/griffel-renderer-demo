// The application may be served from "/" (local server, tests) or a sub-path such
// as "/griffel-renderer-demo/" (GitHub Pages). The base is derived from the URL of
// the executing app bundle, so one build works in both places.
const script = typeof document !== "undefined" ? document.currentScript : null;

export const SITE_BASE = script?.src ? new URL(".", script.src).pathname : "/";

export function sitePath(path = "") {
  return SITE_BASE + path.replace(/^\//, "");
}

export function siteRoute(pathname, base = SITE_BASE) {
  const relative = pathname.startsWith(base) ? pathname.slice(base.length) : pathname.replace(/^\//, "");
  return relative.replace(/\/$/, "").replace(/\.html$/, "").replace(/^index$/, "");
}
