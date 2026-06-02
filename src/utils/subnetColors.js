/**
 * subnetColors.js
 * Maps subnet keys (e.g. "192.168.1.0/24") to a stable palette color.
 * Pure function — deterministic given the same ordered list of subnet keys.
 */

export const SUBNET_PALETTE = [
  "#3b82f6", // blue
  "#10b981", // emerald
  "#f59e0b", // amber
  "#8b5cf6", // violet
  "#ef4444", // red
  "#06b6d4", // cyan
  "#f97316", // orange
  "#ec4899", // pink
];

/**
 * Given an ordered array of unique subnet keys, returns a Map<key, color>.
 * @param {string[]} subnetKeys
 * @returns {Map<string, string>}
 */
export function buildSubnetColorMap(subnetKeys) {
  const map = new Map();
  subnetKeys.forEach((key, idx) => {
    map.set(key, SUBNET_PALETTE[idx % SUBNET_PALETTE.length]);
  });
  return map;
}
