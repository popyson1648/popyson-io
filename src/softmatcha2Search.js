function normalize(value) {
  return String(value || "")
    .normalize("NFKC")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

function bigrams(value) {
  const chars = [...normalize(value).replace(/\s/g, "")];
  if (chars.length <= 1) return chars;
  const grams = [];
  for (let i = 0; i < chars.length - 1; i += 1) {
    grams.push(chars[i] + chars[i + 1]);
  }
  return grams;
}

function softScore(query, text) {
  const q = normalize(query);
  const t = normalize(text);
  if (!q) return 0;
  if (t.includes(q)) return 1;

  const qTokens = q.split(" ").filter(Boolean);
  const tokenHit = qTokens.length
    ? qTokens.filter((token) => t.includes(token)).length / qTokens.length
    : 0;

  const qGrams = bigrams(q);
  const tGrams = new Set(bigrams(t));
  const gramHit = qGrams.length
    ? qGrams.filter((gram) => tGrams.has(gram)).length / qGrams.length
    : 0;

  return Math.max(tokenHit * 0.82, gramHit * 0.72);
}

export function createSoftmatcha2SearchIndex(docs) {
  const posts = docs.map((doc) => doc.p);

  return {
    search(query, { limit = 20 } = {}) {
      const q = normalize(query);
      if (!q) {
        return [...posts]
          .sort((a, b) => b.date.localeCompare(a.date))
          .slice(0, limit)
          .map((p) => ({ p, where: null, score: 0 }));
      }

      return docs
        .map((doc) => {
          const titleScore = softScore(q, doc.title);
          const tagScore = softScore(q, doc.tags);
          const bodyScore = softScore(q, doc.body);
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
