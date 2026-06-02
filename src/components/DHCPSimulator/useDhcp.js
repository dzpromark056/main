/**
 * useDhcp.js
 * Custom hook — owns all DHCP server state and exposes stable actions.
 * Components never touch dhcpEngine directly.
 *
 * Usage:
 *   const dhcp = useDhcp();
 *   dhcp.addServer(router, iface)
 *   dhcp.requestIp(serverId, pcNode)    → applies IP to the PC via onAssign callback
 *   dhcp.releaseIp(serverId, clientId)
 */

import { useState, useCallback } from "react";
import {
  createDhcpServer,
  requestIp   as engineRequest,
  releaseIp   as engineRelease,
  getPoolStats,
} from "./dhcpEngine.js";
import { calcSubnet, isValidIp, isValidMask } from "../../utils/ipUtils.js";

export function useDhcp() {
  // Map<serverId, DhcpServer>
  const [servers, setServers] = useState(new Map());
  const [dhcpLog, setDhcpLog] = useState([]);

  const pushLog = useCallback((lines) => {
    setDhcpLog((prev) => [...prev.slice(-200), ...lines]); // cap at 200 lines
  }, []);

  // ── Add / remove servers ───────────────────────────────────────────────────

  /**
   * Register a DHCP server on a router interface.
   * Safe to call multiple times — re-creates if already exists.
   *
   * @param {object} routerNode   — full node object
   * @param {object} iface        — { name, ip, mask }
   */
  const addServer = useCallback((routerNode, iface) => {
    if (!iface.ip || !iface.mask || !isValidIp(iface.ip) || !isValidMask(iface.mask)) return;

    const subnetInfo = calcSubnet(iface.ip, iface.mask);
    if (!subnetInfo) return;

    const server = createDhcpServer({
      routerId:      routerNode.id,
      interfaceName: iface.name,
      networkIp:     subnetInfo.network,
      cidr:          subnetInfo.cidr,
      gatewayIp:     iface.ip,
      poolStart:     10,
      poolEnd:       200,
    });

    setServers((prev) => new Map(prev).set(server.id, server));
    pushLog([{ type: "ok", msg: `DHCP server started on ${routerNode.label}/${iface.name} — pool ${subnetInfo.network}/${subnetInfo.cidr}` }]);
  }, [pushLog]);

  /**
   * Remove a DHCP server by its ID.
   */
  const removeServer = useCallback((serverId) => {
    setServers((prev) => {
      const next = new Map(prev);
      next.delete(serverId);
      return next;
    });
    pushLog([{ type: "warn", msg: `DHCP server ${serverId} stopped` }]);
  }, [pushLog]);

  // ── DORA flow ──────────────────────────────────────────────────────────────

  /**
   * Run a DORA handshake for a PC node against a specific server.
   * Returns the assigned config or null on failure.
   *
   * @param {string} serverId
   * @param {object} pcNode       — full PC node object
   * @returns {{ ip, mask, gateway, dns } | null}
   */
  const requestIp = useCallback((serverId, pcNode) => {
    const server = servers.get(serverId);
    if (!server) {
      pushLog([{ type: "err", msg: `No DHCP server found with id ${serverId}` }]);
      return null;
    }

    const { server: updated, result } = engineRequest(server, String(pcNode.id), pcNode.label);

    setServers((prev) => new Map(prev).set(serverId, updated));
    pushLog(result.log);

    if (!result.success) return null;
    return { ip: result.ip, mask: result.mask, gateway: result.gateway, dns: result.dns };
  }, [servers, pushLog]);

  /**
   * Release a PC's IP back to the pool.
   * @param {string} serverId
   * @param {object} pcNode
   */
  const releaseIp = useCallback((serverId, pcNode) => {
    const server = servers.get(serverId);
    if (!server) return;

    const { server: updated, log } = engineRelease(server, String(pcNode.id), pcNode.label);
    setServers((prev) => new Map(prev).set(serverId, updated));
    pushLog(log);
  }, [servers, pushLog]);

  /**
   * Find the most appropriate DHCP server for a PC node
   * by checking which server's subnet the PC's connected routers serve.
   * Returns the first matching server id, or null.
   *
   * @param {object[]} nodes
   * @param {object[]} links
   * @param {object}   pcNode
   */
  const findServerForPc = useCallback((nodes, links, pcNode) => {
    const neighborIds = links
      .filter((l) => l.a === pcNode.id || l.b === pcNode.id)
      .map((l) => (l.a === pcNode.id ? l.b : l.a));

    const routers = neighborIds
      .map((id) => nodes.find((n) => n.id === id))
      .filter((n) => n?.type === "router");

    for (const router of routers) {
      for (const iface of router.interfaces) {
        const sid = `dhcp-${router.id}-${iface.name}`;
        if (servers.has(sid)) return sid;
      }
    }
    return null;
  }, [servers]);

  // ── Derived ────────────────────────────────────────────────────────────────

  const serverList = [...servers.values()];

  const getStats = useCallback(
    (serverId) => {
      const s = servers.get(serverId);
      return s ? getPoolStats(s) : null;
    },
    [servers]
  );

  const clearLog = useCallback(() => setDhcpLog([]), []);

  return {
    servers,
    serverList,
    dhcpLog,
    addServer,
    removeServer,
    requestIp,
    releaseIp,
    findServerForPc,
    getStats,
    clearLog,
  };
}
