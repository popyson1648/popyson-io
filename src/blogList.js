function includesString(value, filterValue) {
  const search = String(filterValue).toLowerCase();
  return String(value ?? "")
    .toLowerCase()
    .includes(search);
}

function compareText(a, b) {
  const left = String(a ?? "").toLowerCase();
  const right = String(b ?? "").toLowerCase();
  return left === right ? 0 : left > right ? 1 : -1;
}

export function filterAndSortBlogRows(rows, filters, sortKey, sortDir) {
  const filtered = rows.filter((row) => {
    if (filters.tags.length && !filters.tags.some((tag) => row.tags.includes(tag))) return false;
    if (filters.title && !includesString(row.title, filters.title)) return false;
    if (filters.body && !includesString(row.body, filters.body)) return false;
    return true;
  });
  const direction = sortDir === "desc" ? -1 : 1;

  return [...filtered].sort((a, b) => {
    const comparison =
      sortKey === "kana"
        ? String(a.kana ?? "").localeCompare(String(b.kana ?? ""), "ja")
        : compareText(a.date, b.date);
    return comparison * direction;
  });
}
