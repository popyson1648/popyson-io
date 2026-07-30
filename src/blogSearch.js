export function normalizeSearchText(value) {
  return String(value || "")
    .normalize("NFKC")
    .toLowerCase();
}

export function tokenizeSearchQuery(query) {
  return [...new Set(normalizeSearchText(query).trim().split(/\s+/).filter(Boolean))];
}

export function searchLocalPosts(docs, query, limit = Number.POSITIVE_INFINITY) {
  const tokens = tokenizeSearchQuery(query);
  if (tokens.length === 0) return [];

  const matches = docs.flatMap((doc, sequence) => {
    const fields = {
      title: normalizeSearchText(doc.title),
      tag: normalizeSearchText(doc.tags),
      body: normalizeSearchText(doc.body),
    };
    const matchedTokens = tokens.filter((token) =>
      Object.values(fields).some((value) => value.includes(token)),
    );
    if (matchedTokens.length === 0) return [];

    const where = fields.title.includes(matchedTokens[0])
      ? "title"
      : fields.tag.includes(matchedTokens[0])
        ? "tag"
        : "body";
    return [
      {
        p: doc.p,
        where,
        snippet: "",
        matchCount: matchedTokens.length,
        fieldScore: where === "title" ? 3 : where === "tag" ? 2 : 1,
        sequence,
      },
    ];
  });
  const max = Number.isFinite(limit) ? Math.max(0, limit) : Number.POSITIVE_INFINITY;

  return matches
    .sort(
      (left, right) =>
        right.matchCount - left.matchCount ||
        right.fieldScore - left.fieldScore ||
        left.sequence - right.sequence,
    )
    .slice(0, max)
    .map(({ p, where, snippet }) => ({ p, where, snippet }));
}

export function mergePostSearchResults(primary, fallback, limit = Number.POSITIVE_INFINITY) {
  const merged = new Map();
  for (const result of [...primary, ...fallback]) {
    if (!merged.has(result.p.id)) merged.set(result.p.id, result);
  }
  const max = Number.isFinite(limit) ? Math.max(0, limit) : Number.POSITIVE_INFINITY;
  return [...merged.values()].slice(0, max);
}

export function mergePagefindResults(resultGroups, limit = Number.POSITIVE_INFINITY) {
  const merged = new Map();
  let sequence = 0;

  for (const results of resultGroups) {
    for (const result of results) {
      const id = String(result.id || `anonymous-${sequence}`);
      const score = Number.isFinite(result.score) ? result.score : 0;
      const existing = merged.get(id);
      if (existing) {
        existing.matchCount += 1;
        existing.score += score;
        if (score > existing.bestScore) {
          existing.bestScore = score;
          existing.result = result;
        }
      } else {
        merged.set(id, {
          result,
          matchCount: 1,
          score,
          bestScore: score,
          sequence,
        });
      }
      sequence += 1;
    }
  }

  const max = Number.isFinite(limit) ? Math.max(0, limit) : Number.POSITIVE_INFINITY;
  return [...merged.values()]
    .sort(
      (left, right) =>
        right.matchCount - left.matchCount ||
        right.score - left.score ||
        left.sequence - right.sequence,
    )
    .slice(0, max)
    .map((entry) => entry.result);
}

export async function searchPagefindAnyTerms(
  pagefind,
  query,
  options,
  limit = Number.POSITIVE_INFINITY,
) {
  const resultGroups = await Promise.all(
    tokenizeSearchQuery(query).map(async (token) => {
      const response = await pagefind.search(token, options);
      return response.results;
    }),
  );
  return mergePagefindResults(resultGroups, limit);
}
