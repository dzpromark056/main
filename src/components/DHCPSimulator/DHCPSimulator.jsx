/**
 * DHCPSimulator.jsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Self-contained DHCP simulation panel.
 * This is the ONLY file you import into App.jsx.
 *
 * PLUGIN INTERFACE — two props only:
 *
 *   <DHCPSimulator
 *     nodes={nodes}           ← from useTopology
 *     links={links}           ← from useTopology
 *     onAssignIp={             ← callback to apply assigned IP back to a PC node
 *       (nodeId, { ip, mask, gateway }) => updateNodeField(nodeId, ...)
 *     }
 *   />
 *
 * Internals (self-managed, never leak out):
 *   - useDhcp hook (server state, DORA logic)
 *   - DHCPServerSetup (enable/disable servers per router interface)
 *   - DHCPServerCard (pool stats, lease table)
 *   - DHCPClientPanel (per-PC request / release)
 *   - DHCPLog (scrolling activity log)
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { useState } from "react";
import { useDhcp }            from "./useDhcp.js";
import { DHCPServerSetup }    from "./DHCPServerSetup.jsx";
import { DHCPServerCard }     from "./DHCPServerCard.jsx";
import { DHCPClientPanel }    from "./DHCPClientPanel.jsx";
import { DHCPLog }            from "./DHCPLog.jsx";

// ─── Internal tab bar ─────────────────────────────────────────────────────────
const TABS = [
  { id: "servers", label: "Servers" },
  { id: "clients", label: "Clients" },
  { id: "log",     label: "Log"     },
];

function TabBar({ active, onChange }) {
  return (
    <div style={{ display: "flex", borderBottom: "1px solid #0f2040", marginBottom: 12 }}>
      {TABS.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onChange(tab.id)}
          style={{
            flex: 1, padding: "6px 4px",
            background: "transparent", border: "none",
            borderBottom: `2px solid ${active === tab.id ? "#34d399" : "transparent"}`,
            color: active === tab.id ? "#34d399" : "#334155",
            fontSize: 10, fontFamily: "monospace", fontWeight: 700,
            letterSpacing: "0.07em", textTransform: "uppercase",
            cursor: "pointer", transition: "color 0.15s",
          }}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}

// ─── Public component ─────────────────────────────────────────────────────────
export function DHCPSimulator({ nodes, links, onAssignIp }) {
  const [tab, setTab] = useState("servers");

  const {
    servers, serverList, dhcpLog,
    addServer, removeServer,
    requestIp, releaseIp,
    findServerForPc, getStats,
    clearLog,
  } = useDhcp();

  const routers = nodes.filter((n) => n.type === "router");
  const pcs     = nodes.filter((n) => n.type === "pc");

  // Wire DHCP result back to the topology via the onAssignIp callback
  const handleRequest = (serverId, pcNode) => {
    const assigned = requestIp(serverId, pcNode);
    if (assigned && onAssignIp) {
      onAssignIp(pcNode.id, assigned);
    }
  };

  const handleRelease = (serverId, pcNode) => {
    releaseIp(serverId, pcNode);
    // Clear the PC's IP/mask/gw so it shows as unbound
    if (onAssignIp) {
      onAssignIp(pcNode.id, { ip: "", mask: "", gateway: "" });
    }
  };

  return (
    <div style={{
      background: "#080f1e",
      borderLeft: "1px solid #0f2040",
      display: "flex",
      flexDirection: "column",
      overflow: "hidden",
      height: "100%",
    }}>
      {/* Panel header */}
      <div style={{
        padding: "8px 14px",
        background: "#0a1628",
        borderBottom: "1px solid #0f2040",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        flexShrink: 0,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ width: 7, height: 7, borderRadius: "50%", background: "#34d399", boxShadow: "0 0 5px #34d399" }} />
          <span style={{ fontSize: 11, fontWeight: 700, color: "#34d399", fontFamily: "monospace", letterSpacing: "0.1em", textTransform: "uppercase" }}>
            DHCP Simulator
          </span>
        </div>
        <span style={{ fontSize: 10, color: "#1e4a2f", fontFamily: "monospace" }}>
          {serverList.length} server{serverList.length !== 1 ? "s" : ""} · {pcs.length} client{pcs.length !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Scrollable content */}
      <div style={{ flex: 1, overflowY: "auto", padding: "12px 14px" }}>
        <TabBar active={tab} onChange={setTab} />

        {/* ── Servers tab ── */}
        {tab === "servers" && (
          <div>
            <div style={{ fontSize: 10, color: "#1e4a6f", letterSpacing: "0.1em", textTransform: "uppercase", fontWeight: 700, marginBottom: 10 }}>
              ▸ Enable DHCP on Router Interface
            </div>
            <DHCPServerSetup
              routers={routers}
              servers={servers}
              onEnable={addServer}
              onDisable={removeServer}
            />

            {serverList.length > 0 && (
              <div style={{ marginTop: 16 }}>
                <div style={{ fontSize: 10, color: "#1e4a6f", letterSpacing: "0.1em", textTransform: "uppercase", fontWeight: 700, marginBottom: 10 }}>
                  ▸ Active Servers
                </div>
                {serverList.map((server) => (
                  <DHCPServerCard
                    key={server.id}
                    server={server}
                    stats={getStats(server.id)}
                    onRemove={() => removeServer(server.id)}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── Clients tab ── */}
        {tab === "clients" && (
          <div>
            <div style={{ fontSize: 10, color: "#1e4a6f", letterSpacing: "0.1em", textTransform: "uppercase", fontWeight: 700, marginBottom: 10 }}>
              ▸ PC Clients
            </div>
            <DHCPClientPanel
              pcs={pcs}
              servers={servers}
              links={links}
              nodes={nodes}
              findServerForPc={findServerForPc}
              onRequest={handleRequest}
              onRelease={handleRelease}
            />
          </div>
        )}

        {/* ── Log tab ── */}
        {tab === "log" && (
          <div>
            <div style={{ fontSize: 10, color: "#1e4a6f", letterSpacing: "0.1em", textTransform: "uppercase", fontWeight: 700, marginBottom: 10 }}>
              ▸ DORA Activity Log
            </div>
            <DHCPLog lines={dhcpLog} onClear={clearLog} />
          </div>
        )}
      </div>
    </div>
  );
}
