const EN_MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const ISO_DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

function emptyDateLabel() {
  return { ja: "", en: "" };
}

function isSupportedMonthDay(month, day) {
  return Number.isInteger(month)
    && month >= 1
    && month <= 12
    && Number.isInteger(day)
    && day >= 1
    && day <= 31;
}

export function normalizeIsoDate(value) {
  if (value instanceof Date && Number.isFinite(value.getTime())) {
    return value.toISOString().slice(0, 10);
  }
  const text = String(value || "");
  return ISO_DATE_RE.test(text) ? text : "";
}

export function makeDateLabel(value) {
  const match = ISO_DATE_RE.exec(normalizeIsoDate(value));
  if (!match) return emptyDateLabel();
  const [, year, monthText, dayText] = match;
  const month = Number(monthText);
  const day = Number(dayText);
  if (!isSupportedMonthDay(month, day)) return emptyDateLabel();
  return {
    ja: `${Number(year)}年${month}月${day}日`,
    en: `${EN_MONTHS[month - 1]} ${day}, ${Number(year)}`,
  };
}

export function localizedDateLabel(item, lang) {
  return item?.dateLabel?.[lang] || item?.dateLabel?.ja || item?.date || "";
}
