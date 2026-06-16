function normalize(value) {
  return String(value || "")
    .normalize("NFKC")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

function bigramsFromNormalized(value) {
  const chars = [...value.replace(/\s/g, "")];
  if (chars.length <= 1) return chars;
  const grams = [];
  for (let i = 0; i < chars.length - 1; i += 1) {
    grams.push(chars[i] + chars[i + 1]);
  }
  return grams;
}

function searchField(value) {
  const text = normalize(value);
  return {
    text,
    grams: new Set(bigramsFromNormalized(text)),
  };
}

function softScore(q, qTokens, qGrams, field) {
  if (!q) return 0;
  if (field.text.includes(q)) return 1;

  const tokenHit = qTokens.length
    ? qTokens.filter((token) => field.text.includes(token)).length / qTokens.length
    : 0;

  const gramHit = qGrams.length
    ? qGrams.filter((gram) => field.grams.has(gram)).length / qGrams.length
    : 0;

  return Math.max(tokenHit * 0.82, gramHit * 0.72);
}

export function createSoftmatcha2SearchIndex(docs) {
  const posts = docs.map((doc) => doc.p);
  const recentPosts = [...posts].sort((a, b) => b.date.localeCompare(a.date));
  const indexedDocs = docs.map((doc) => ({
    ...doc,
    titleField: searchField(doc.title),
    tagField: searchField(doc.tags),
    bodyField: searchField(doc.body),
  }));

  return {
    search(query, { limit = 20 } = {}) {
      const q = normalize(query);
      if (!q) {
        return recentPosts
          .slice(0, limit)
          .map((p) => ({ p, where: null, score: 0 }));
      }

      const qTokens = q.split(" ").filter(Boolean);
      const qGrams = bigramsFromNormalized(q);

      return indexedDocs
        .map((doc) => {
          const titleScore = softScore(q, qTokens, qGrams, doc.titleField);
          const tagScore = softScore(q, qTokens, qGrams, doc.tagField);
          const bodyScore = softScore(q, qTokens, qGrams, doc.bodyField);
          const score = Math.max(titleScore * 1.15, tagScore * 1.05, bodyScore);
          const where = score === 0
            ? null
            : titleScore >= tagScore && titleScore >= bodyScore
              ? "title"
              : tagScore >= bodyScore
                ? "tag"
                : "body";
          return { p: doc.p, where, score };
        })
        .filter((result) => result.score >= 0.34)
        .sort((a, b) => b.score - a.score || b.p.date.localeCompare(a.p.date))
        .slice(0, limit);
    },
  };
}
