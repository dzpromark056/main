/**
 * StaticRouting.jsx
 * Self-contained static routing table editor.
 *
 * PLUGIN INTERFACE:
 *   <StaticRouting
 *     nodes={nodes}
 *     routingTables={routingTables}
 *     onAddRoute={(routerId, config) => {}}
 *     onRemoveRoute={(routerId, routeId) => {}}
 *   />
 */

import { useState } from "react";
import { buildConnectedRoutes } from "./staticRoutingEngine.js";
import { isValidIp } from "../../utils/ipUtils.js";

function RouteRow({ route, onRemove, isConnected }) {
  return (
    <div style={{
      display: "grid", gridTemplateColumns: "1fr 1fr 1fr auto",
      gap: "4px 8px", alignItems: "center",
      padding: "5px 8px",
      background: isConnected ? "#060e1c" : "#0a1628",
      border: `1px solid ${isConnected ? "#0f2040" : "#1e3a5f"}`,
      borderRadius: 6, marginBottom: 3,
    }}>
      <span style={{ fontSize: 10, fontFamily: "monospace", color: isConnected ? "#334155" : "#38bdf8" }}>
        {route.network}/{route.cidr}
      </span>
      <span style={{ fontSize: 10, fontFamily: "monospace", color: isConnected ? "#334155" : "#94c9f0" }}>
        {route.nextHop || "—"}
      </span>
      <span style={{ fontSize: 10, fontFamily: "monospace", color: "#475569" }}>
        {route.iface || "—"}
      </span>
      {!isConnected ? (
        <button onClick={onRemove} style={{
          background: "transparent", border: "1px solid #3f1515",
          color: "#f87171", borderRadius: 4, padding: "2px 6px",
          fontSize: 10, fontFamily: "monospace", cursor: "pointer",
        }}>✕</button>
      ) : (
        <span style={{ fontSize: 9, color: "#1e3a5f", fontFamily: "monospace" }}>auto</span>
      )}
    </div>
  );
}

function AddRouteForm({ onAdd }) {
  const [network, setNetwork] = useState("");
  const [cidr,    setCidr]    = useState("24");
  const [nextHop, setNextHop] = useState("");
  const [iface,   setIface]   = useState("");
  const [error,   setError]   = useState("");

  const handleAdd = () => {
    if (!network || !isValidIp(network)) { setError("Invalid network address"); return; }
    const c = parseInt(cidr, 10);
    if (isNaN(c) || c < 0 || c > 32) { setError("CIDR must be 0–32"); return; }
    if (!nextHop && !iface) { setError("Enter a next hop IP or interface name"); return; }
    if (nextHop && !isValidIp(nextHop)) { setError("Invalid next hop IP"); return; }
    setError("");
    onAdd({ network, cidr: c, nextHop, iface });
    setNetwork(""); setCidr("24"); setNextHop(""); setIface("");
  };

  const inputStyle = {
    background: "#060e1c", border: "1px solid #1e3a5f", borderRadius: 5,
    color: "#94c9f0", fontSize: 11, fontFamily: "monospace",
    padding: "5px 7px", outline: "none", width: "100%",
  };

  return (
    <div style={{ background: "#060e1c", border: "1px solid #0f2040", borderRadius: 8, padding: "10px 12px", marginTop: 8 }}>
      <div style={{ fontSize: 10, color: "#1e4a6f", textTransform: "uppercase", letterSpacing: "0.08em", fontFamily: "monospace", marginBottom: 8 }}>
        Add Static Route
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 52px 1fr 1fr", gap: 6, marginBottom: 6 }}>
        <input value={network} onChange={(e) => setNetwork(e.target.value)} placeholder="Network (e.g. 10.0.0.0)" style={inputStyle} />
        <input value={cidr}    onChange={(e) => setCidr(e.target.value)}    placeholder="CIDR" style={inputStyle} />
        <input value={nextHop} onChange={(e) => setNextHop(e.target.value)} placeholder="Next Hop IP" style={inputStyle} />
        <input value={iface}   onChange={(e) => setIface(e.target.value)}   placeholder="Interface (opt)" style={inputStyle} />
      </div>
      {error && <div style={{ fontSize: 10, color: "#f87171", fontFamily: "monospace", marginBottom: 6 }}>{error}</div>}
      <button onClick={handleAdd} style={{
        background: "#0d2b1e", border: "1px solid #145232", color: "#34d399",
        borderRadius: 6, padding: "5px 14px", fontSize: 11,
        fontFamily: "monospace", cursor: "pointer", fontWeight: 600,
      }}>
        + Add Route
      </button>
    </div>
  );
}

function RouterTable({ router, staticRoutes, onAdd, onRemove }) {
  const [open, setOpen] = useState(true);
  const connectedRoutes = buildConnectedRoutes(router);
  const allRoutes = [...connectedRoutes, ...staticRoutes];

  return (
    <div style={{ marginBottom: 14 }}>
      <button onClick={() => setOpen((o) => !o)} style={{
        width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between",
        background: "#0a1e0e", border: "1px solid #145232", borderRadius: 8,
        padding: "7px 12px", cursor: "pointer", marginBottom: open ? 8 : 0,
      }}>
        <span style={{ fontSize: 11, fontFamily: "monospace", fontWeight: 700, color: "#34d399" }}>
          ◈ {router.label}
        </span>
        <span style={{ fontSize: 10, color: "#1e4a2f", fontFamily: "monospace" }}>
          {staticRoutes.length} static · {connectedRoutes.length} connected {open ? "▲" : "▼"}
        </span>
      </button>

      {open && (
        <div style={{ paddingLeft: 4 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr auto", gap: "4px 8px", marginBottom: 4, padding: "0 8px" }}>
            {["Network/CIDR", "Next Hop", "Interface", ""].map((h) => (
              <span key={h} style={{ fontSize: 9, color: "#334155", fontFamily: "monospace", textTransform: "uppercase", letterSpacing: "0.06em" }}>{h}</span>
            ))}
          </div>
          {allRoutes.length === 0 ? (
            <div style={{ fontSize: 11, color: "#334155", fontFamily: "monospace", padding: "8px", textAlign: "center" }}>
              no routes — add one below
            </div>
          ) : (
            allRoutes.map((route) => (
              <RouteRow key={route.id} route={route} isConnected={route.metric === 0} onRemove={() => onRemove(router.id, route.id)} />
            ))
          )}
          <AddRouteForm onAdd={(config) => onAdd(router.id, config)} />
        </div>
      )}
    </div>
  );
}

export function StaticRouting({ nodes, routingTables, onAddRoute, onRemoveRoute }) {
  const routers = nodes.filter((n) => n.type === "router");
  return (
    <div style={{ padding: "12px 14px", overflowY: "auto", height: "100%" }}>
      <div style={{ fontSize: 10, color: "#1e4a6f", letterSpacing: "0.1em", textTransform: "uppercase", fontWeight: 700, marginBottom: 12 }}>
        ▸ Static Routing Tables
      </div>
      {routers.length === 0 ? (
        <div style={{ color: "#334155", fontSize: 12, fontFamily: "monospace", textAlign: "center", padding: "20px 0" }}>
          add a router to configure routing tables
        </div>
      ) : (
        routers.map((router) => (
          <RouterTable
            key={router.id}
            router={router}
            staticRoutes={routingTables.get(router.id) ?? []}
            onAdd={onAddRoute}
            onRemove={onRemoveRoute}
          />
        ))
      )}
      <div style={{ marginTop: 8, padding: "8px 10px", background: "#060e1c", border: "1px solid #0f2040", borderRadius: 6 }}>
        <div style={{ fontSize: 9, color: "#334155", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 5 }}>Legend</div>
        {[["#334155","Connected — auto from interface config"],["#38bdf8","Static — manually added"]].map(([color, label]) => (
          <div key={label} style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 3 }}>
            <div style={{ width: 8, height: 8, borderRadius: 2, background: color, flexShrink: 0 }} />
            <span style={{ fontSize: 10, color: "#475569", fontFamily: "monospace" }}>{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
