function isUsableProductImage(value) {
  const url = String(value || "").trim();
  if (!/^https?:\/\//i.test(url)) return false;
  return !/favicon(?:\.ico)?|(?:^|[\/_-])logo(?:[\/_-]|\.)|placeholder|blank|spacer|1x1|f30_30/i.test(url);
}

module.exports = { isUsableProductImage };
