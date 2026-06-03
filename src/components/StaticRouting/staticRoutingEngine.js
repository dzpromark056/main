/**
 * staticRoutingEngine.js
 * Pure static routing logic — no React, no side effects.
 *
 * Public API:
 *   createRoute(config)                                          → Route
 *   addRoute(table, route)                                       → Route[]
 *   removeRoute(table, routeId)                                  → Route[]
 *   findBestRoute(table, destIp)                                 → Route | null
 *   resolveFullPath(srcPc, dstPc, nodes, links, routingTables)  → PathResult
 */

import { ipToInt, intToIp, cidrToMask, maskToCidr, isValidIp, isValidMask, sameSubnet } from "../../utils/ipUtils.js";
import { uid } from "../../utils/idUtils.js";

// ─── Factory ──────────────────────────────────────────────────────────────────

export function createRoute({ network, cidr, nextHop = "", iface = "", metric = 1, description = "" }) {
  return {
    id: uid(),
    network,
    cidr,
    mask: cidrToMask(cidr) ?? "",
    nextHop,
    iface,
    metric,
    description,
  };
}

// ─── Table CRUD ───────────────────────────────────────────────────────────────

export function addRoute(table, route) {
  return [...table, route];
}

export function removeRoute(table, routeId) {
  return table.filter((r) => r.id !== routeId);
}

// ─── Longest-prefix-match ─────────────────────────────────────────────────────

export function findBestRoute(table, destIp) {
  if (!isValidIp(destIp)) return null;
  const destInt = ipToInt(destIp);
  let best = null;
  let bestCidr = -1;

  for (const route of table) {
    const maskInt = ipToInt(route.mask);
    const netInt  = ipToInt(route.network);
    if (maskInt === null || netInt === null) continue;
    if (((destInt & maskInt) >>> 0) === ((netInt & maskInt) >>> 0)) {
      if (route.cidr > bestCidr) {
        bestCidr = route.cidr;
        best = route;
      }
    }
  }
  return best;
}

// ─── Connected routes from interfaces ────────────────────────────────────────

export function buildConnectedRoutes(router) {
  return router.interfaces
    .filter((ifc) => ifc.ip && ifc.mask && isValidIp(ifc.ip) && isValidMask(ifc.mask))
    .map((ifc) => {
      const cidr   = maskToCidr(ifc.mask) ?? 24;
      const netInt = (ipToInt(ifc.ip) & ipToInt(ifc.mask)) >>> 0;
      return createRoute({
        network: intToIp(netInt),
        cidr,
        nextHop: ifc.ip,
        iface: ifc.name,
        metric: 0,
        description: `connected (${ifc.name})`,
      });
    });
}

// ─── Multi-hop path resolution ────────────────────────────────────────────────

export function resolveFullPath(srcPc, dstPc, nodes, links, routingTables) {
  const log = [];
  const push = (type, msg) => log.push({ type, msg });
  const fail = (path) => ({ success: false, path, log });
  const ok   = (path) => ({ success: true,  path, log });

  push("info", `─── ROUTE TRACE  ${srcPc.label} → ${dstPc.label} ───`);

  if (!srcPc.ip || !srcPc.mask) { push("err", `${srcPc.label}: No IP configured. ✗`); return fail([srcPc.id]); }
  if (!dstPc.ip || !dstPc.mask) { push("err", `${dstPc.label}: No IP configured. ✗`); return fail([srcPc.id]); }

  // Same subnet — direct
  if (sameSubnet(srcPc.ip, dstPc.ip, srcPc.mask)) {
    push("info", `Same subnet — attempting direct delivery`);
    const direct = links.find((l) => (l.a === srcPc.id && l.b === dstPc.id) || (l.a === dstPc.id && l.b === srcPc.id));
    if (direct) { push("ok", `Direct link ${srcPc.label} ↔ ${dstPc.label} ✓`); return ok([srcPc.id, dstPc.id]); }
    push("warn", `Same subnet but no direct cable`);
  }

  if (!srcPc.gw) { push("err", `${srcPc.label}: No default gateway. ✗`); return fail([srcPc.id]); }

  const path    = [srcPc.id];
  const visited = new Set([srcPc.id]);
  let nextHopIp = srcPc.gw;
  const MAX_HOPS = 10;

  push("info", `Default GW: ${srcPc.gw}`);

  for (let hop = 1; hop <= MAX_HOPS; hop++) {
    const router = findRouterByIp(nextHopIp, nodes, links, path[path.length - 1]);
    if (!router) { push("err", `Hop ${hop}: No router with IP ${nextHopIp} reachable. ✗`); return fail(path); }
    if (visited.has(router.id)) { push("err", `Routing loop at ${router.label}! ✗`); return fail(path); }

    path.push(router.id);
    visited.add(router.id);
    push("ok", `Hop ${hop}: ${router.label} (${nextHopIp})`);

    // Destination directly connected to this router?
    const dstIface = router.interfaces.find(
      (ifc) => ifc.ip && ifc.mask && sameSubnet(ifc.ip, dstPc.ip, ifc.mask)
    );
    if (dstIface) {
      if (!getNeighborIds(router.id, links).includes(dstPc.id)) {
        push("err", `${router.label}: No cable to ${dstPc.label}. ✗`);
        return fail(path);
      }
      path.push(dstPc.id);
      push("ok", `${router.label}/${dstIface.name} → ${dstPc.label} (${dstPc.ip})`);
      push("ok", `Destination reached ✓`);
      return ok(path);
    }

    // Consult static routing table + connected routes
    const staticTable    = routingTables.get(router.id) ?? [];
    const connectedTable = buildConnectedRoutes(router);
    const fullTable      = [...connectedTable, ...staticTable];
    const best           = findBestRoute(fullTable, dstPc.ip);

    if (!best) {
      push("err", `${router.label}: No route to ${dstPc.ip}. Add a static route. ✗`);
      return fail(path);
    }

    push("info", `${router.label}: matched ${best.network}/${best.cidr} → next hop ${best.nextHop || best.iface}`);
    nextHopIp = best.nextHop;
  }

  push("err", `TTL exceeded — max ${MAX_HOPS} hops. Possible loop. ✗`);
  return fail(path);
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function findRouterByIp(ip, nodes, links, fromNodeId) {
  // Prefer directly connected
  const neighborIds = getNeighborIds(fromNodeId, links);
  for (const nid of neighborIds) {
    const n = nodes.find((nd) => nd.id === nid);
    if (n?.type === "router" && n.interfaces.some((ifc) => ifc.ip === ip)) return n;
  }
  // Fallback — any router with that interface IP (for first hop from PC)
  return nodes.find((n) => n.type === "router" && n.interfaces.some((ifc) => ifc.ip === ip)) ?? null;
}

function getNeighborIds(nodeId, links) {
  return links.filter((l) => l.a === nodeId || l.b === nodeId).map((l) => (l.a === nodeId ? l.b : l.a));
}
