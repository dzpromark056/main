/**
 * DHCPServerSetup.jsx
 * Form to enable a DHCP server on a router interface.
 * Lists all routers and their interfaces; lets user click "Enable DHCP".
 */

import { isValidIp, isValidMask } from "../../utils/ipUtils.js";

function InterfaceRow({ router, iface, isActive, onEnable, onDisable }) {
  const configured = isValidIp(iface.ip) && isValidMask(iface.mask);
  const serverId   = `dhcp-${router.id}-${iface.name}`;

  return (
    <div style={{
      display: "grid",
      gridTemplateColumns: "56px 1fr auto",
      gap: 8,
      alignItems: "center",
      padding: "5px 8px",
      background: isActive ? "#0a1e0e" : "#080f1e",
      border: `1px solid ${isActive ? "#145232" : "#0f2040"}`,
      borderRadius: 6,
      marginBottom: 4,
    }}>
      {/* Interface badge */}
      <span style={{
        fontSize: 10, fontFamily: "monospace", color: "#64748b",
        background: "#0d1f35", padding: "3px 6px",
        borderRadius: 4, border: "0.5px solid #1e3a5f",
        textAlign: "center",
      }}>
        {iface.name}
      </span>

      {/* IP info */}
      <span style={{ fontSize: 10, fontFamily: "monospace", color: configured ? "#38bdf8" : "#334155" }}>
        {configured ? `${iface.ip} / ${iface.mask}` : "not configured"}
      </span>

      {/* Toggle */}
      {isActive ? (
        <button onClick={() => onDisable(serverId)} style={{
          background: "transparent", border: "1px solid #3f1515",
          color: "#f87171", borderRadius: 4, padding: "3px 8px",
          fontSize: 10, fontFamily: "monospace", cursor: "pointer",
        }}>
          disable
        </button>
      ) : (
        <button
          onClick={() => configured && onEnable(router, iface)}
          disabled={!configured}
          style={{
            background: configured ? "#0d2b1e" : "transparent",
            border: `1px solid ${configured ? "#145232" : "#0f2040"}`,
            color: configured ? "#34d399" : "#334155",
            borderRadius: 4, padding: "3px 8px",
            fontSize: 10, fontFamily: "monospace",
            cursor: configured ? "pointer" : "not-allowed",
          }}
        >
          enable
        </button>
      )}
    </div>
  );
}

export function DHCPServerSetup({ routers, servers, onEnable, onDisable }) {
  if (routers.length === 0) {
    return (
      <div style={{ color: "#334155", fontSize: 12, fontFamily: "monospace", textAlign: "center", padding: "12px 0" }}>
        add a router to enable DHCP
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {routers.map((router) => (
        <div key={router.id}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 5 }}>
            <span style={{ fontSize: 10, color: "#34d399", fontFamily: "monospace", fontWeight: 700 }}>◈ {router.label}</span>
            <div style={{ flex: 1, height: 1, background: "#0f2040" }} />
          </div>
          {router.interfaces.length === 0 ? (
            <div style={{ fontSize: 10, color: "#334155", fontFamily: "monospace", paddingLeft: 8 }}>no interfaces</div>
          ) : (
            router.interfaces.map((iface) => {
              const serverId = `dhcp-${router.id}-${iface.name}`;
              return (
                <InterfaceRow
                  key={iface.name}
                  router={router}
                  iface={iface}
                  isActive={servers.has(serverId)}
                  onEnable={onEnable}
                  onDisable={onDisable}
                />
              );
            })
          )}
        </div>
      ))}
    </div>
  );
}
