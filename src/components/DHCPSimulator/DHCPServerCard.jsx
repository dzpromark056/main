/**
 * DHCPServerCard.jsx
 * Displays a single DHCP server — pool config, utilisation, lease table.
 * Receives all data via props; no direct state access.
 */

const STATUS_COLORS = {
  active:   { bg: "#0a2a14", border: "#145232", text: "#34d399", dot: "#34d399" },
  released: { bg: "#1a1200", border: "#3d2e00", text: "#fcd34d", dot: "#fcd34d" },
};

function LeaseBadge({ status }) {
  const s = STATUS_COLORS[status] ?? STATUS_COLORS.released;
  return (
    <span style={{
      fontSize: 9, fontFamily: "monospace", fontWeight: 700,
      background: s.bg, border: `1px solid ${s.border}`,
      color: s.text, borderRadius: 4, padding: "1px 6px",
      textTransform: "uppercase", letterSpacing: "0.06em",
    }}>
      {status}
    </span>
  );
}

function UtilBar({ active, total, color }) {
  const pct = total > 0 ? Math.min(100, (active / total) * 100) : 0;
  const barColor = pct > 80 ? "#ef4444" : pct > 50 ? "#f59e0b" : "#34d399";
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
        <span style={{ fontSize: 9, color: "#475569", textTransform: "uppercase", letterSpacing: "0.07em" }}>Pool utilisation</span>
        <span style={{ fontSize: 9, fontFamily: "monospace", color: barColor }}>{active}/{total} used</span>
      </div>
      <div style={{ height: 5, background: "#0f2040", borderRadius: 3, overflow: "hidden" }}>
        <div style={{ height: "100%", width: `${pct}%`, background: barColor, borderRadius: 3, transition: "width 0.3s ease" }} />
      </div>
    </div>
  );
}

export function DHCPServerCard({ server, stats, onRemove }) {
  const activeLeases = server.leases.filter((l) => l.status === "active");
  const allLeases    = server.leases;

  return (
    <div style={{
      background: "#060e1c", border: "1px solid #0f2040",
      borderRadius: 10, overflow: "hidden", marginBottom: 10,
    }}>
      {/* Header */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "8px 12px",
        background: "#0a1e0e",
        borderBottom: "1px solid #145232",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ width: 7, height: 7, borderRadius: "50%", background: "#34d399", boxShadow: "0 0 5px #34d399" }} />
          <span style={{ fontSize: 12, fontFamily: "monospace", fontWeight: 700, color: "#34d399" }}>
            {server.networkIp}/{server.cidr}
          </span>
          <span style={{ fontSize: 10, color: "#1e4a2f", fontFamily: "monospace" }}>
            on {server.interfaceName}
          </span>
        </div>
        <button onClick={onRemove} style={{
          background: "transparent", border: "1px solid #3f1515",
          color: "#f87171", borderRadius: 4, padding: "2px 8px",
          fontSize: 10, fontFamily: "monospace", cursor: "pointer",
        }}>
          stop
        </button>
      </div>

      {/* Config row */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "4px 8px", padding: "8px 12px", borderBottom: "1px solid #0f2040" }}>
        {[
          ["Gateway", server.gatewayIp],
          ["DNS",     server.dnsServer],
          ["Mask",    server.mask],
          ["Pool start", server.networkIp.split(".").slice(0,3).join(".") + "." + server.poolStart],
          ["Pool end",   server.networkIp.split(".").slice(0,3).join(".") + "." + server.poolEnd],
          ["Available",  stats?.available ?? "—"],
        ].map(([k, v]) => (
          <div key={k} style={{ display: "flex", flexDirection: "column", gap: 1 }}>
            <span style={{ fontSize: 9, color: "#334155", textTransform: "uppercase", letterSpacing: "0.06em" }}>{k}</span>
            <span style={{ fontSize: 10, fontFamily: "monospace", color: "#64748b" }}>{v}</span>
          </div>
        ))}
      </div>

      {/* Utilisation bar */}
      <div style={{ padding: "8px 12px", borderBottom: allLeases.length > 0 ? "1px solid #0f2040" : "none" }}>
        <UtilBar active={stats?.active ?? 0} total={stats?.total ?? 0} />
      </div>

      {/* Lease table */}
      {allLeases.length > 0 && (
        <div style={{ padding: "8px 12px" }}>
          <div style={{ fontSize: 9, color: "#334155", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 6 }}>
            Lease Table ({activeLeases.length} active)
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr auto", gap: "3px 8px", alignItems: "center" }}>
            {["Client", "IP Assigned", "Status"].map((h) => (
              <span key={h} style={{ fontSize: 9, color: "#1e3a5f", fontFamily: "monospace", textTransform: "uppercase" }}>{h}</span>
            ))}
            {allLeases.map((lease, i) => (
              <>
                <span key={`c${i}`} style={{ fontSize: 10, fontFamily: "monospace", color: "#64748b" }}>{lease.clientLabel}</span>
                <span key={`ip${i}`} style={{ fontSize: 10, fontFamily: "monospace", color: "#38bdf8" }}>{lease.ip}</span>
                <LeaseBadge key={`s${i}`} status={lease.status} />
              </>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
