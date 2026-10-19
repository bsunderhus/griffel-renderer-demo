import { scenarioAliases, scenarioAliasVersions, scenarioAliasPolicies } from "./experiments/scenarios.js";
import { SITE_BASE, siteRoute } from "./site.js";

function canonical(id, params) {
  if (Object.hasOwn(scenarioAliasVersions, id)) params.set("personaVersion", scenarioAliasVersions[id]);
  if (Object.hasOwn(scenarioAliasPolicies, id)) params.set("hostPolicy", scenarioAliasPolicies[id]);
  return scenarioAliases[id];
}

// Client-side counterpart of the server's legacy redirects, for static hosting
// where the server cannot answer with a 302. Returns the canonical URL or null.
export function normalizeLegacyLocation({ pathname, search, hash }, base = SITE_BASE) {
  const route = siteRoute(pathname, base);
  const params = new URLSearchParams(search);
  const scenario = params.get("scenario");
  const legacyRoute = route === "source" || route === "three-actors";
  const aliasScenario = (legacyRoute || route === "") && Object.hasOwn(scenarioAliases, scenario);
  const fragment = hash.slice(1);
  const aliasFragment = Object.hasOwn(scenarioAliases, fragment);
  if (!legacyRoute && !aliasScenario && !aliasFragment) return null;
  if (aliasScenario) params.set("scenario", canonical(scenario, params));
  const nextHash = aliasFragment ? `#${canonical(fragment, params)}` : hash;
  const nextPath = legacyRoute ? base : pathname;
  return `${nextPath}${params.size ? `?${params}` : ""}${nextHash}`;
}
