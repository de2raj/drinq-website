/**
 * PayNow QR (SGQR / EMVCo) for a fixed amount to a company UEN.
 * Any Singapore banking app can scan it; the reference shows on the payment.
 */
const tlv = (id: string, v: string) => id + String(v.length).padStart(2, "0") + v;

function crc16(s: string) {
  let crc = 0xffff;
  for (let i = 0; i < s.length; i++) {
    crc ^= s.charCodeAt(i) << 8;
    for (let j = 0; j < 8; j++) crc = crc & 0x8000 ? ((crc << 1) ^ 0x1021) & 0xffff : (crc << 1) & 0xffff;
  }
  return crc.toString(16).toUpperCase().padStart(4, "0");
}

export function paynowPayload(opts: { uen: string; name: string; amountCents: number; reference: string; expiry?: string }) {
  const account =
    tlv("00", "SG.PAYNOW") + tlv("01", "2") + tlv("02", opts.uen) + tlv("03", "0") + (opts.expiry ? tlv("04", opts.expiry) : "");
  const body =
    tlv("00", "01") + tlv("01", "12") + tlv("26", account) + tlv("52", "0000") + tlv("53", "702") +
    tlv("54", (opts.amountCents / 100).toFixed(2)) + tlv("58", "SG") + tlv("59", opts.name.slice(0, 25)) +
    tlv("60", "Singapore") + tlv("62", tlv("01", opts.reference.slice(0, 25))) + "6304";
  return body + crc16(body);
}
