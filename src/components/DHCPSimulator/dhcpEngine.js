/**
 * dhcpEngine.js
 * Pure DHCP simulation logic — no React, no side effects.
 *
 * Simulates the 4-step DORA handshake:
 *   Discover → Offer → Request → Acknowledge
 *
 * Public API:
 *   createDhcpServer(config)         → DhcpServer
 *   requestIp(server, clientId)      → DhcpResult
 *   releaseIp(server, clientId)      → DhcpServer (updated)
 *   renewLease(server, clientId)     → DhcpResult
 *   getLeaseByClient(server, id)     → Lease | null
 *   getDhcpLog(result)               → LogLine[]
 */

import { ipToInt, intToIp, cidrToMask, isValidIp } from "../../utils/ipUtils.js";

// ─── Constants ────────────────────────────────────────────────────────────────
export const DEFAULT_LEASE_DURATION = 86400; // 24 hours in seconds (simulated)
export const DEFAULT_POOL_SIZE      = 50;

// ─── Factory ──────────────────────────────────────────────────────────────────

/**
 * Create a new DHCP server configuration object.
 *
 * @param {{
 *   routerId: number,         — node ID of the router hosting this server
 *   interfaceName: string,    — which router interface (e.g. "eth0")
 *   networkIp: string,        — network address e.g. "192.168.1.0"
 *   cidr: number,             — prefix length e.g. 24
 *   gatewayIp: string,        — default gateway to hand out (usually router interface IP)
 *   dnsServer?: string,       — optional DNS IP
 *   poolStart?: number,       — first host offset (default 10)
 *   poolEnd?: number,         — last host offset (default 200)
 * }} config
 * @returns {DhcpServer}
 */
export function createDhcpServer(config) {
  const mask = cidrToMask(config.cidr);
  const netInt = ipToInt(config.networkIp);

  return {
    id: `dhcp-${config.routerId}-${config.interfaceName}`,
    routerId: config.routerId,
    interfaceName: config.interfaceName,
    networkIp: config.networkIp,
    cidr: config.cidr,
    mask,
    gatewayIp: config.gatewayIp,
    dnsServer: config.dnsServer ?? "8.8.8.8",
    poolStart: config.poolStart ?? 10,
    poolEnd: config.poolEnd ?? 200,
    netInt,
    leases: [],       // Lease[]
    enabled: true,
  };
}

// ─── DORA simulation ──────────────────────────────────────────────────────────

/**
 * Simulate a full DORA handshake for a client PC.
 * Returns an updated server state and a structured result with log lines.
 *
 * @param {DhcpServer} server
 * @param {string}     clientId    — unique client identifier (node id or label)
 * @param {string}     clientLabel — human-readable label for log output
 * @returns {{ server: DhcpServer, result: DhcpResult }}
 */
export function requestIp(server, clientId, clientLabel) {
  const log = [];
  const push = (type, msg) => log.push({ type, msg });

  push("info", `[DISCOVER] ${clientLabel} broadcasts DHCPDISCOVER on segment`);
  push("info", `[OFFER]    ${server.id} searching pool ${server.networkIp}/${server.cidr}…`);

  // Check if client already has a lease — renew it
  const existing = server.leases.find((l) => l.clientId === clientId);
  if (existing && existing.status === "active") {
    push("warn", `[OFFER]    ${clientLabel} already has lease ${existing.ip} — renewing`);
    const renewed = renewLease(server, clientId, clientLabel);
    return renewed;
  }

  // Find next available IP in pool
  const assignedIps = new Set(server.leases.filter(l => l.status === "active").map((l) => l.ip));
  let assignedIp = null;

  for (let offset = server.poolStart; offset <= server.poolEnd; offset++) {
    const candidate = intToIp((server.netInt + offset) >>> 0);
    if (!assignedIps.has(candidate) && candidate !== server.gatewayIp) {
      assignedIp = candidate;
      break;
    }
  }

  if (!assignedIp) {
    push("err", `[NAK]      Pool exhausted. No IP available for ${clientLabel}. ✗`);
    return {
      server,
      result: { success: false, ip: null, mask: null, gateway: null, dns: null, log },
    };
  }

  push("ok",   `[OFFER]    Offering ${assignedIp}/${server.cidr} to ${clientLabel}`);
  push("info", `[REQUEST]  ${clientLabel} sends DHCPREQUEST for ${assignedIp}`);
  push("ok",   `[ACK]      ${server.id} confirms lease:`);
  push("ok",   `           IP: ${assignedIp}  Mask: ${server.mask}  GW: ${server.gatewayIp}  DNS: ${server.dnsServer}`);
  push("ok",   `[BOUND]    ${clientLabel} is now BOUND ✓`);

  const lease = {
    clientId,
    clientLabel,
    ip: assignedIp,
    mask: server.mask,
    gateway: server.gatewayIp,
    dns: server.dnsServer,
    status: "active",
    leaseTime: DEFAULT_LEASE_DURATION,
    assignedAt: Date.now(),
  };

  const updatedServer = {
    ...server,
    leases: [...server.leases.filter((l) => l.clientId !== clientId), lease],
  };

  return {
    server: updatedServer,
    result: {
      success: true,
      ip: assignedIp,
      mask: server.mask,
      gateway: server.gatewayIp,
      dns: server.dnsServer,
      log,
    },
  };
}

/**
 * Renew an existing lease for a client.
 * @returns {{ server: DhcpServer, result: DhcpResult }}
 */
export function renewLease(server, clientId, clientLabel) {
  const log = [];
  const push = (type, msg) => log.push({ type, msg });

  const existing = server.leases.find((l) => l.clientId === clientId);
  if (!existing) {
    push("err", `[NAK] No existing lease for ${clientLabel}. ✗`);
    return { server, result: { success: false, ip: null, mask: null, gateway: null, dns: null, log } };
  }

  push("info", `[REQUEST]  ${clientLabel} sends DHCPREQUEST (renewal) for ${existing.ip}`);
  push("ok",   `[ACK]      Lease renewed: ${existing.ip}/${server.cidr} for another ${DEFAULT_LEASE_DURATION / 3600}h`);
  push("ok",   `[BOUND]    ${clientLabel} lease refreshed ✓`);

  const renewed = { ...existing, assignedAt: Date.now(), status: "active" };
  const updatedServer = {
    ...server,
    leases: server.leases.map((l) => (l.clientId === clientId ? renewed : l)),
  };

  return {
    server: updatedServer,
    result: {
      success: true,
      ip: existing.ip,
      mask: existing.mask,
      gateway: existing.gateway,
      dns: existing.dns,
      log,
    },
  };
}

/**
 * Release a client's IP back to the pool.
 * @returns {{ server: DhcpServer, log: LogLine[] }}
 */
export function releaseIp(server, clientId, clientLabel) {
  const log = [];
  const existing = server.leases.find((l) => l.clientId === clientId);

  if (!existing) {
    log.push({ type: "warn", msg: `[RELEASE] No active lease found for ${clientLabel}` });
    return { server, log };
  }

  log.push({ type: "info", msg: `[RELEASE] ${clientLabel} sends DHCPRELEASE for ${existing.ip}` });
  log.push({ type: "ok",   msg: `[RELEASE] ${existing.ip} returned to pool ✓` });

  const updatedServer = {
    ...server,
    leases: server.leases.map((l) =>
      l.clientId === clientId ? { ...l, status: "released" } : l
    ),
  };

  return { server: updatedServer, log };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Returns the active lease for a client, or null. */
export function getLeaseByClient(server, clientId) {
  return server.leases.find((l) => l.clientId === clientId && l.status === "active") ?? null;
}

/** Returns pool utilisation stats. */
export function getPoolStats(server) {
  const total   = server.poolEnd - server.poolStart + 1;
  const active  = server.leases.filter((l) => l.status === "active").length;
  const released = server.leases.filter((l) => l.status === "released").length;
  return { total, active, released, available: total - active };
}
