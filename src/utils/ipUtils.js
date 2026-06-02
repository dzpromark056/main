/**
 * ipUtils.js
 * Pure, side-effect-free IP / subnet helper functions.
 * All functions operate on plain strings / numbers — no React dependency.
 */

// ─── Conversion helpers ───────────────────────────────────────────────────────

/** Convert dotted-decimal IP string → unsigned 32-bit integer, or null on error. */
export function ipToInt(ip) {
  const parts = (ip ?? "").trim().split(".");
  if (parts.length !== 4) return null;
  const nums = parts.map(Number);
  if (nums.some((n) => isNaN(n) || n < 0 || n > 255)) return null;
  return ((nums[0] << 24) | (nums[1] << 16) | (nums[2] << 8) | nums[3]) >>> 0;
}

/** Convert unsigned 32-bit integer → dotted-decimal IP string. */
export function intToIp(n) {
  return [
    (n >>> 24) & 255,
    (n >>> 16) & 255,
    (n >>> 8) & 255,
    n & 255,
  ].join(".");
}

// ─── Validation ────────────────────────────────────────────────────────────────

/** Returns true if the string is a valid dotted-decimal IPv4 address. */
export function isValidIp(ip) {
  const parts = (ip ?? "").trim().split(".");
  if (parts.length !== 4) return false;
  return parts.every((p) => {
    const n = parseInt(p, 10);
    return !isNaN(n) && n >= 0 && n <= 255 && String(n) === p;
  });
}

/** Returns true if the string is a valid contiguous subnet mask. */
export function isValidMask(mask) {
  const n = ipToInt(mask);
  if (n === null) return false;
  // Must be a string of 1s followed by 0s in binary
  return /^1*0*$/.test(n.toString(2).padStart(32, "0"));
}

// ─── Conversion: CIDR ↔ mask ────────────────────────────────────────────────

/** Convert CIDR prefix length (0-32) → dotted-decimal mask, or null. */
export function cidrToMask(cidr) {
  const bits = parseInt(cidr, 10);
  if (isNaN(bits) || bits < 0 || bits > 32) return null;
  if (bits === 0) return "0.0.0.0";
  return intToIp((0xffffffff << (32 - bits)) >>> 0);
}

/** Convert dotted-decimal mask → CIDR prefix length, or null. */
export function maskToCidr(mask) {
  if (!isValidMask(mask)) return null;
  const n = ipToInt(mask);
  let bits = 0;
  let v = n;
  while (v & 0x80000000) {
    bits++;
    v = (v << 1) >>> 0;
  }
  return bits;
}

// ─── Subnet arithmetic ────────────────────────────────────────────────────────

/**
 * Returns true if ip1 and ip2 are on the same subnet given the mask.
 * All three params are dotted-decimal strings.
 */
export function sameSubnet(ip1, ip2, mask) {
  const i1 = ipToInt(ip1);
  const i2 = ipToInt(ip2);
  const m = ipToInt(mask);
  if (i1 === null || i2 === null || m === null) return false;
  return (i1 & m) === (i2 & m);
}

/**
 * Given a host IP and mask (dotted-decimal), compute full subnet details.
 * Returns null if either argument is invalid.
 *
 * @returns {{
 *   network: string, broadcast: string,
 *   firstHost: string, lastHost: string,
 *   totalHosts: number, cidr: number,
 *   mask: string, wildcard: string, netClass: string
 * }}
 */
export function calcSubnet(ip, mask) {
  if (!isValidIp(ip) || !isValidMask(mask)) return null;

  const ipInt = ipToInt(ip);
  const maskInt = ipToInt(mask);
  const netInt = (ipInt & maskInt) >>> 0;
  const wildcardInt = (~maskInt) >>> 0;
  const bcastInt = (netInt | wildcardInt) >>> 0;
  const totalHosts = Math.max(0, wildcardInt - 1);
  const cidr = maskToCidr(mask);
  const firstOctet = (ipInt >>> 24) & 255;

  let netClass = "C";
  if (firstOctet < 128) netClass = "A";
  else if (firstOctet < 192) netClass = "B";

  return {
    network: intToIp(netInt),
    broadcast: intToIp(bcastInt),
    firstHost: intToIp((netInt + 1) >>> 0),
    lastHost: intToIp((bcastInt - 1) >>> 0),
    totalHosts,
    cidr,
    mask,
    wildcard: intToIp(wildcardInt),
    netClass,
  };
}

/**
 * Build a 32-element array describing each bit of the network address,
 * annotated with whether it's a network bit (mask=1) or host bit (mask=0).
 * Used by the binary breakdown visualiser.
 */
export function buildBinaryBreakdown(network, mask) {
  const ni = ipToInt(network) ?? 0;
  const mi = ipToInt(mask) ?? 0;
  return Array.from({ length: 32 }, (_, i) => ({
    bit: (ni >>> (31 - i)) & 1,
    isNetBit: !!((mi >>> (31 - i)) & 1),
  }));
}
