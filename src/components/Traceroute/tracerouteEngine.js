/**
 * tracerouteEngine.js
 * Pure traceroute simulation — no React, no side effects.
 *
 * Simulates TTL-based hop discovery, producing per-hop timing and log lines.
 *
 * Public API:
 *   runTraceroute(srcPc, dstPc, nodes, links, routingTables) → TracerouteResult
 */

import { sameSubnet, isValidIp, isValidMask } from "../../utils/ipUtils.js";
import { findBestRoute, buildConnectedRoutes } from "../StaticRouting/staticRoutingEngine.js";

const BASE_LATENCY_MS  = 1;   // latency per hop
const JITTER_MS        = 2;   // random jitter per hop

function simLatency(hop) {
  return BASE_LATENCY_MS * hop + Math.floor(Math.random() * JITTER_MS) + 1;
}

/**
 * @returns {{
 *   hops: HopResult[],
 *   success: boolean,
 *   log: LogLine[]
 * }}
 *
 * HopResult: { hopNum, nodeId, label, ip, latencyMs, status }
 */
export function runTraceroute(srcPc, dstPc, nodes, links, routingTables) {
  const log  = [];
  const hops = [];
  const push = (type, msg) => log.push({ type, msg });

  push("info", `traceroute to ${dstPc.ip} (${dstPc.label}), max 10 hops`);

  if (!srcPc.ip || !srcPc.mask) { push("err", `${srcPc.label}: No IP configured.`); return { hops, success: false, log }; }
  if (!dstPc.ip || !dstPc.mask) { push("err", `${dstPc.label}: No IP configured.`); return { hops, success: false, log }; }

  // Same subnet — 1 hop direct
  if (sameSubnet(srcPc.ip, dstPc.ip, srcPc.mask)) {
    const direct = links.find((l) => (l.a === srcPc.id && l.b === dstPc.id) || (l.a === dstPc.id && l.b === srcPc.id));
    if (direct) {
      const ms = simLatency(1);
      hops.push({ hopNum: 1, nodeId: dstPc.id, label: dstPc.label, ip: dstPc.ip, latencyMs: ms, status: "reached" });
      push("ok", `1  ${dstPc.label} (${dstPc.ip})  ${ms} ms`);
      push("ok", `Trace complete.`);
      return { hops, success: true, log };
    }
  }

  if (!srcPc.gw) { push("err", `${srcPc.label}: No default gateway.`); return { hops, success: false, log }; }

  const visited  = new Set([srcPc.id]);
  let nextHopIp  = srcPc.gw;
  const MAX_HOPS = 10;

  for (let ttl = 1; ttl <= MAX_HOPS; ttl++) {
    const router = findRouterByIp(nextHopIp, nodes, links, [...visited].at(-1));

    if (!router) {
      hops.push({ hopNum: ttl, nodeId: null, label: "*", ip: nextHopIp, latencyMs: null, status: "unreachable" });
      push("err", `${ttl}  * * *  (${nextHopIp} unreachable)`);
      return { hops, success: false, log };
    }

    if (visited.has(router.id)) {
      hops.push({ hopNum: ttl, nodeId: router.id, label: router.label, ip: nextHopIp, latencyMs: null, status: "loop" });
      push("err", `${ttl}  ${router.label} (${nextHopIp})  !L  routing loop detected`);
      return { hops, success: false, log };
    }

    visited.add(router.id);
    const ms = simLatency(ttl);
    hops.push({ hopNum: ttl, nodeId: router.id, label: router.label, ip: nextHopIp, latencyMs: ms, status: "transit" });
    push("info", `${ttl}  ${router.label} (${nextHopIp})  ${ms} ms`);

    // Destination directly reachable from this router?
    const dstIface = router.interfaces.find(
      (ifc) => ifc.ip && ifc.mask && sameSubnet(ifc.ip, dstPc.ip, ifc.mask)
    );
    if (dstIface && getNeighborIds(router.id, links).includes(dstPc.id)) {
      const finalMs = simLatency(ttl + 1);
      hops.push({ hopNum: ttl + 1, nodeId: dstPc.id, label: dstPc.label, ip: dstPc.ip, latencyMs: finalMs, status: "reached" });
      push("ok", `${ttl + 1}  ${dstPc.label} (${dstPc.ip})  ${finalMs} ms`);
      push("ok", `Trace complete.`);
      return { hops, success: true, log };
    }

    // Look up next hop in routing table
    const staticTable    = routingTables.get(router.id) ?? [];
    const connectedTable = buildConnectedRoutes(router);
    const best           = findBestRoute([...connectedTable, ...staticTable], dstPc.ip);

    if (!best) {
      hops.push({ hopNum: ttl + 1, nodeId: null, label: "?", ip: "?", latencyMs: null, status: "no-route" });
      push("err", `${ttl + 1}  * * *  no route on ${router.label}`);
      return { hops, success: false, log };
    }

    nextHopIp = best.nextHop;
  }

  push("err", `Max hops exceeded.`);
  return { hops, success: false, log };
}

function findRouterByIp(ip, nodes, links, fromNodeId) {
  const neighborIds = getNeighborIds(fromNodeId, links);
  for (const nid of neighborIds) {
    const n = nodes.find((nd) => nd.id === nid);
    if (n?.type === "router" && n.interfaces.some((ifc) => ifc.ip === ip)) return n;
  }
  return nodes.find((n) => n.type === "router" && n.interfaces.some((ifc) => ifc.ip === ip)) ?? null;
}

function getNeighborIds(nodeId, links) {
  return links.filter((l) => l.a === nodeId || l.b === nodeId).map((l) => (l.a === nodeId ? l.b : l.a));
}
