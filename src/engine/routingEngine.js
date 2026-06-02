/**
 * routingEngine.js
 * Pure routing / diagnostic logic.
 * Takes plain node/link arrays and returns a structured result — no React.
 *
 * Public API:
 *   executePing(srcId, dstId, nodes, links) → PingResult
 */

import { sameSubnet, isValidIp, isValidMask } from "../utils/ipUtils.js";

// ─── Types (JSDoc) ────────────────────────────────────────────────────────────
/**
 * @typedef {{ type: 'ok'|'err'|'info'|'warn', msg: string }} LogLine
 * @typedef {{ log: LogLine[], path: number[], success: boolean }} PingResult
 */

// ─── Public ───────────────────────────────────────────────────────────────────

/**
 * Simulate an ICMP ping between two PC nodes.
 *
 * @param {number|null} srcId
 * @param {number|null} dstId
 * @param {object[]} nodes
 * @param {object[]} links
 * @returns {PingResult}
 */
export function executePing(srcId, dstId, nodes, links) {
  const log = [];
  const push = (type, msg) => log.push({ type, msg });
  const fail = (path) => ({ log, path, success: false });
  const succeed = (path) => ({ log, path, success: true });

  // ── Guard: selection ───────────────────────────────────────────────────────
  if (!srcId || !dstId) {
    push("warn", "Select both a source and destination PC.");
    return fail([]);
  }
  if (srcId === dstId) {
    push("warn", "Source and destination must be different devices.");
    return fail([]);
  }

  const src = nodes.find((n) => n.id === srcId);
  const dst = nodes.find((n) => n.id === dstId);

  if (!src || !dst) {
    push("err", "Node not found.");
    return fail([]);
  }

  push("info", `─── PING ${src.label} (${src.ip || "?"}) → ${dst.label} (${dst.ip || "?"}) ───`);

  // ── Guard: IP configuration ────────────────────────────────────────────────
  if (!src.ip || !src.mask || !isValidIp(src.ip) || !isValidMask(src.mask)) {
    push("err", `${src.label}: No valid IP/mask configured. Cannot transmit.`);
    return fail([src.id]);
  }
  if (!dst.ip || !dst.mask || !isValidIp(dst.ip) || !isValidMask(dst.mask)) {
    push("err", `${dst.label}: No valid IP/mask configured. Cannot receive.`);
    return fail([src.id]);
  }

  // ── Case 1: Same subnet ────────────────────────────────────────────────────
  if (sameSubnet(src.ip, dst.ip, src.mask)) {
    push("info", `ARP: Is ${dst.ip} on my subnet (${src.mask})? → YES — direct delivery`);

    const directLink = links.find(
      (l) => (l.a === src.id && l.b === dst.id) || (l.a === dst.id && l.b === src.id)
    );

    if (directLink) {
      push("ok", `Physical link confirmed: ${src.label} ↔ ${dst.label}`);
      push("ok", `Reply from ${dst.ip}: ttl=64 PING SUCCESS ✓`);
      return succeed([src.id, dst.id]);
    }

    push("warn", "No direct cable — searching alternative path via routers…");
    const path = bfs(src.id, dst.id, links);

    if (path) {
      push("ok", `Path: ${path.map((id) => nodes.find((n) => n.id === id)?.label).join(" → ")}`);
      push("ok", `Reply from ${dst.ip}: ttl=64 PING SUCCESS ✓`);
      return succeed(path);
    }

    push("err", "No path found. Packet dropped. ✗");
    return fail([src.id]);
  }

  // ── Case 2: Different subnet — needs routing ───────────────────────────────
  push("info", `${dst.ip} is on a DIFFERENT subnet — must route via gateway`);

  if (!src.gw || !isValidIp(src.gw)) {
    push("err", `${src.label}: No valid default gateway configured. ✗`);
    return fail([src.id]);
  }

  push("info", `ARP: Broadcasting for gateway ${src.gw} on ${src.label}'s segment…`);

  // Find a directly-connected router whose interface matches the gateway IP
  const neighbors = getNeighborIds(src.id, links);
  let gwRouter = null;
  let gwIface = null;

  for (const nid of neighbors) {
    const n = nodes.find((nd) => nd.id === nid);
    if (n?.type !== "router") continue;
    const match = n.interfaces.find((ifc) => ifc.ip === src.gw);
    if (match) {
      gwRouter = n;
      gwIface = match;
      break;
    }
  }

  if (!gwRouter) {
    push("err", `Gateway ${src.gw} unreachable — no directly connected router has that interface IP. ✗`);
    return fail([src.id]);
  }

  push("ok", `ARP reply: ${src.gw} is ${gwRouter.label} (${gwIface.name})`);
  push("info", `Frame forwarded to ${gwRouter.label}. Consulting routing table…`);

  // Find router interface that covers the destination subnet
  let dstIface = null;
  for (const ifc of gwRouter.interfaces) {
    if (ifc.ip && ifc.mask && sameSubnet(ifc.ip, dst.ip, ifc.mask)) {
      dstIface = ifc;
      break;
    }
  }

  if (!dstIface) {
    push("err", `${gwRouter.label}: No interface on destination subnet for ${dst.ip}. No route to host. ✗`);
    return fail([src.id, gwRouter.id]);
  }

  push("ok", `Route matched: ${gwRouter.label}/${dstIface.name} (${dstIface.ip}/${dstIface.mask})`);
  push("info", `Routing out ${dstIface.name} toward ${dst.ip}…`);

  // Check physical cable between router and destination
  const routerNeighbors = getNeighborIds(gwRouter.id, links);
  if (!routerNeighbors.includes(dst.id)) {
    push("err", `No physical cable: ${gwRouter.label} ↔ ${dst.label}. Packet dropped. ✗`);
    return fail([src.id, gwRouter.id]);
  }

  push("ok", `Physical link confirmed: ${gwRouter.label} ↔ ${dst.label}`);
  push("info", `ARP: ${gwRouter.label} resolves ${dst.ip} to destination MAC…`);
  push("ok", `Reply from ${dst.ip}: ttl=63 PING SUCCESS ✓`);
  return succeed([src.id, gwRouter.id, dst.id]);
}

// ─── Private helpers ───────────────────────────────────────────────────────────

/** Return IDs of all nodes directly linked to nodeId. */
function getNeighborIds(nodeId, links) {
  return links
    .filter((l) => l.a === nodeId || l.b === nodeId)
    .map((l) => (l.a === nodeId ? l.b : l.a));
}

/** BFS shortest path between two node IDs. Returns id array or null. */
function bfs(srcId, dstId, links) {
  const queue = [[srcId, [srcId]]];
  const visited = new Set([srcId]);

  while (queue.length > 0) {
    const [cur, path] = queue.shift();
    for (const nid of getNeighborIds(cur, links)) {
      if (visited.has(nid)) continue;
      visited.add(nid);
      const newPath = [...path, nid];
      if (nid === dstId) return newPath;
      queue.push([nid, newPath]);
    }
  }
  return null;
}
