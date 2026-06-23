// Path-based routing. Language lives in the URL: Japanese (default) has no
// prefix, English is served under "/en".

/**
 * @typedef {{ lang: string, name: "about" | "app" | "reading" | "rss" }} StaticRoute
 * @typedef {{ lang: string, name: "blog", tag: string | null }} BlogRoute
 * @typedef {{ lang: string, name: "article" | "appDetail", id: string }} DetailRoute
 * @typedef {StaticRoute | BlogRoute | DetailRoute} Route
 */

/**
 * @param {string} pathname
 * @param {string} search
 * @returns {Route}
 */
export function parseRoute(pathname, search) {
  let path = pathname || "/";
  let lang = "ja";
  if (/^\/en(\/|$)/.test(path)) {
    lang = "en";
    path = path.slice(3) || "/";
  }

  const query = new URLSearchParams(search || "");
  const parts = path.split("/").filter(Boolean);
  const seg = parts[0] || "";

  let route;
  if (seg === "") {
    route = { name: "about" };
  } else if (seg === "about") {
    route = { name: "about" };
  } else if (seg === "blog") {
    route = parts[1]
      ? { name: "article", id: parts[1] }
      : { name: "blog", tag: query.get("tag") || null };
  } else if (seg === "app") {
    route = parts[1] ? { name: "appDetail", id: parts[1] } : { name: "app" };
  } else if (seg === "reading") {
    route = { name: "reading" };
  } else if (seg === "rss") {
    route = { name: "rss" };
  } else {
    route = { name: "about" };
  }

  return /** @type {Route} */ ({ ...route, lang });
}
