const EN_MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const ISO_DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

export function makeDateLabel(iso) {
  const match = ISO_DATE_RE.exec(String(iso || ""));
  if (!match) return { ja: "", en: "" };
  const [, year, monthText, dayText] = match;
  const month = Number(monthText);
  const day = Number(dayText);
  if (!Number.isInteger(month) || month < 1 || month > 12 || !Number.isInteger(day) || day < 1 || day > 31) {
    return { ja: "", en: "" };
  }
  return {
    ja: `${Number(year)}年${month}月${day}日`,
    en: `${EN_MONTHS[month - 1]} ${day}, ${Number(year)}`,
  };
}

export function localizedDateLabel(item, lang) {
  return item?.dateLabel?.[lang] || item?.dateLabel?.ja || item?.date || "";
}
