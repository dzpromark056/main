/**
 * conflictEngine.js
 * Analyses a node array for IP/subnet configuration problems.
 * Pure function — no React, no side effects.
 *
 * Public API:
 *   detectConflicts(nodes) → ConflictEntry[]
 */

import { isValidIp, isValidMask, sameSubnet } from "../utils/ipUtils.js";

/**
 * @typedef {{ type: 'err'|'warn'|'info', msg: string }} ConflictEntry
 */

/**
 * Run all conflict checks against the node list.
 * @param {object[]} nodes
 * @returns {ConflictEntry[]}
 */
export function detectConflicts(nodes) {
  const issues = [];

  checkDuplicateIps(nodes, issues);
  checkPcConfiguration(nodes, issues);
  checkRouterInterfaces(nodes, issues);
  checkUnconfiguredDevices(nodes, issues);

  return issues;
}

// ─── Individual checks ────────────────────────────────────────────────────────

function checkDuplicateIps(nodes, issues) {
  const seen = new Map(); // ip → label

  const record = (ip, label) => {
    if (!ip) return;
    if (seen.has(ip)) {
      issues.push({ type: "err", msg: `Duplicate IP ${ip} on "${seen.get(ip)}" and "${label}"` });
    } else {
      seen.set(ip, label);
    }
  };

  nodes.forEach((node) => {
    if (node.type === "pc") {
      record(node.ip, node.label);
    } else if (node.type === "router") {
      node.interfaces.forEach((ifc) => record(ifc.ip, `${node.label}/${ifc.name}`));
    }
  });
}

function checkPcConfiguration(nodes, issues) {
  nodes
    .filter((n) => n.type === "pc")
    .forEach((node) => {
      if (!node.ip) return; // handled by unconfigured check

      if (!isValidIp(node.ip)) {
        issues.push({ type: "err", msg: `${node.label}: Invalid IP address "${node.ip}"` });
        return;
      }
      if (node.mask && !isValidMask(node.mask)) {
        issues.push({ type: "err", msg: `${node.label}: Invalid subnet mask "${node.mask}"` });
        return;
      }

      if (node.gw) {
        if (!isValidIp(node.gw)) {
          issues.push({ type: "err", msg: `${node.label}: Invalid gateway address "${node.gw}"` });
        } else if (node.mask && !sameSubnet(node.ip, node.gw, node.mask)) {
          issues.push({ type: "warn", msg: `${node.label}: Gateway ${node.gw} is NOT on the same subnet as ${node.ip}/${node.mask}` });
        } else if (node.ip === node.gw) {
          issues.push({ type: "warn", msg: `${node.label}: Host IP equals gateway IP (${node.ip})` });
        }
      }
    });
}

function checkRouterInterfaces(nodes, issues) {
  nodes
    .filter((n) => n.type === "router")
    .forEach((node) => {
      node.interfaces.forEach((ifc, i) => {
        if (!ifc.ip) return;

        if (!isValidIp(ifc.ip)) {
          issues.push({ type: "err", msg: `${node.label}/${ifc.name}: Invalid IP "${ifc.ip}"` });
          return;
        }
        if (ifc.mask && !isValidMask(ifc.mask)) {
          issues.push({ type: "err", msg: `${node.label}/${ifc.name}: Invalid mask "${ifc.mask}"` });
          return;
        }

        // Two interfaces on the same router sharing the same subnet
        node.interfaces.slice(i + 1).forEach((ifc2) => {
          if (!ifc2.ip || !ifc2.mask || ifc.mask !== ifc2.mask) return;
          if (sameSubnet(ifc.ip, ifc2.ip, ifc.mask)) {
            issues.push({
              type: "warn",
              msg: `${node.label}: ${ifc.name} and ${ifc2.name} are on the same subnet (${ifc.mask})`,
            });
          }
        });
      });
    });
}

function checkUnconfiguredDevices(nodes, issues) {
  nodes.forEach((node) => {
    if (node.type === "pc" && (!node.ip || !node.mask)) {
      issues.push({ type: "info", msg: `${node.label}: IP or mask not configured` });
    }
    if (node.type === "router" && node.interfaces.every((ifc) => !ifc.ip)) {
      issues.push({ type: "info", msg: `${node.label}: No interfaces configured` });
    }
  });
}
