// News entries are ordered by their date, newest first. An entry without a
// usable date sorts to the top: it is a row someone is still filling in, and
// hiding it below the list — or below a preview's `count` cap — loses it from
// view. Shared by the About form and the preview so both show one order.
const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export function newsDateOf(entry) {
  return String(entry?.date || "").trim();
}

export function compareNewsDates(left, right) {
  const leftDated = ISO_DATE_RE.test(left);
  const rightDated = ISO_DATE_RE.test(right);
  if (leftDated !== rightDated) return leftDated ? 1 : -1;
  if (!leftDated) return 0;
  return right.localeCompare(left);
}
