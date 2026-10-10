// Phone numbers in one format everywhere: digits only, with country code.
// Meta sends "96891234567"; Twilio sends "whatsapp:+96891234567";
// WHATSAPP_ALLOWED_NUMBERS may be written "+968 9123 4567".

export function normalizeNumber(raw: string): string {
  return raw.replace(/^whatsapp:/i, "").replace(/\D/g, "").replace(/^00/, "");
}

/** WHATSAPP_ALLOWED_NUMBERS: comma-separated numbers with country code, or "*" for anyone. */
export function isAllowedSender(from: string, list = process.env.WHATSAPP_ALLOWED_NUMBERS ?? ""): boolean {
  const allowed = list.split(",").map((s) => s.trim()).filter(Boolean);
  if (allowed.includes("*")) return true;
  const n = normalizeNumber(from);
  return n.length > 0 && allowed.map(normalizeNumber).includes(n);
}
