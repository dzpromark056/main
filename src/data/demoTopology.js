/**
 * demoTopology.js
 * Builds the initial demo network state.
 * Pure factory — no React, no side effects.
 */

import { uid } from "../utils/idUtils.js";

/**
 * @returns {{ nodes: Node[], links: Link[] }}
 *
 * Topology: PC-1 ─┐
 *                  ├─ R-1 ─── PC-3
 *           PC-2 ─┘
 *
 * Subnets:
 *   192.168.1.0/24  (PC-1, PC-2, R-1/eth0)
 *   10.0.0.0/24     (PC-3, R-1/eth1)
 */
export function buildDemoTopology() {
  const pc1 = makePC("PC-1", "192.168.1.10", "255.255.255.0", "192.168.1.1", 110, 160);
  const pc2 = makePC("PC-2", "192.168.1.20", "255.255.255.0", "192.168.1.1", 110, 320);
  const r1 = makeRouter("R-1", [
    { name: "eth0", ip: "192.168.1.1", mask: "255.255.255.0" },
    { name: "eth1", ip: "10.0.0.1",   mask: "255.255.255.0" },
  ], 360, 240);
  const pc3 = makePC("PC-3", "10.0.0.10", "255.255.255.0", "10.0.0.1", 610, 240);

  return {
    nodes: [pc1, pc2, r1, pc3],
    links: [
      { id: uid(), a: pc1.id, b: r1.id },
      { id: uid(), a: pc2.id, b: r1.id },
      { id: uid(), a: r1.id,  b: pc3.id },
    ],
  };
}

// ─── Private factories ────────────────────────────────────────────────────────

function makePC(label, ip, mask, gw, x, y) {
  return { id: uid(), type: "pc", label, ip, mask, gw, x, y, interfaces: [] };
}

function makeRouter(label, interfaces, x, y) {
  return { id: uid(), type: "router", label, ip: "", mask: "", gw: "", x, y, interfaces };
}
