function normalizeProductImage(value) {
  const raw = String(value || "").trim();
  if (!/^https?:\/\//i.test(raw)) return "";
  try {
    const parsed = new URL(raw);
    if (parsed.hostname === "search.pstatic.net" && parsed.pathname === "/sunny") {
      const source = parsed.searchParams.get("src") || "";
      if (/^https?:\/\//i.test(source) && /(?:^|\.)coupangcdn\.com$/i.test(new URL(source).hostname)) {
        return source;
      }
    }
  } catch {}
  return raw;
}

function isUsableProductImage(value) {
  const url = normalizeProductImage(value);
  if (!/^https?:\/\//i.test(url)) return false;
  return !/favicon(?:\.ico)?|(?:^|[\/_-])logo(?:[\/_-]|\.)|placeholder|blank|spacer|1x1|f30_30/i.test(url);
}

module.exports = { normalizeProductImage, isUsableProductImage };
