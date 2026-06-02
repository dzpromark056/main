/**
 * DHCPClientPanel.jsx
 * Shows all PCs with their current lease status.
 * Lets users request or release an IP for each PC.
 */

const LEASE_TAG_STYLE = {
  active:  { bg: "#0a2a14", border: "#145232", color: "#34d399" },
  none:    { bg: "#0d1a2d", border: "#1e3a5f", color: "#475569" },
};

function PcRow({ pc, leaseInfo, serverId, onRequest, onRelease }) {
  const hasLease  = !!leaseInfo;
  const tag = LEASE_TAG_STYLE[hasLease ? "active" : "none"];

  return (
    <div style={{
      display: "grid",
      gridTemplateColumns: "80px 1fr auto",
      gap: 8,
      alignItems: "center",
      padding: "7px 10px",
      background: hasLease ? "#0a1a0d" : "#080f1e",
      border: `1px solid ${hasLease ? "#145232" : "#0f2040"}`,
      borderRadius: 7,
      marginBottom: 5,
    }}>
      {/* Label + badge */}
      <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
        <span style={{ fontSize: 11, fontFamily: "monospace", fontWeight: 700, color: "#94a3b8" }}>{pc.label}</span>
        <span style={{
          fontSize: 9, fontFamily: "monospace", fontWeight: 700,
          background: tag.bg, border: `1px solid ${tag.border}`,
          color: tag.color, borderRadius: 3, padding: "1px 5px",
          textTransform: "uppercase", letterSpacing: "0.06em",
          alignSelf: "flex-start",
        }}>
          {hasLease ? "BOUND" : "UNBOUND"}
        </span>
      </div>

      {/* IP info */}
      <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
        {hasLease ? (
          <>
            <span style={{ fontSize: 11, fontFamily: "monospace", color: "#38bdf8" }}>{leaseInfo.ip}/{leaseInfo.cidr ?? "?"}</span>
            <span style={{ fontSize: 9, fontFamily: "monospace", color: "#334155" }}>gw: {leaseInfo.gateway} · dns: {leaseInfo.dns}</span>
          </>
        ) : (
          <span style={{ fontSize: 10, fontFamily: "monospace", color: "#334155" }}>
            {serverId ? "server reachable — click Request" : "no DHCP server on connected router"}
          </span>
        )}
      </div>

      {/* Action button */}
      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        {!hasLease ? (
          <button
            onClick={() => onRequest(pc)}
            disabled={!serverId}
            style={{
              background: serverId ? "#0d2b1e" : "#080f1e",
              border: `1px solid ${serverId ? "#145232" : "#0f2040"}`,
              color: serverId ? "#34d399" : "#334155",
              borderRadius: 5, padding: "4px 10px",
              fontSize: 11, fontFamily: "monospace",
              cursor: serverId ? "pointer" : "not-allowed",
              fontWeight: 600, whiteSpace: "nowrap",
            }}
          >
            Request IP
          </button>
        ) : (
          <button
            onClick={() => onRelease(pc, serverId)}
            style={{
              background: "transparent", border: "1px solid #3f1515",
              color: "#f87171", borderRadius: 5, padding: "4px 10px",
              fontSize: 11, fontFamily: "monospace", cursor: "pointer",
              whiteSpace: "nowrap",
            }}
          >
            Release
          </button>
        )}
      </div>
    </div>
  );
}

export function DHCPClientPanel({ pcs, servers, links, nodes, onRequest, onRelease, findServerForPc }) {
  if (pcs.length === 0) {
    return (
      <div style={{ color: "#334155", fontSize: 12, fontFamily: "monospace", textAlign: "center", padding: "16px 0" }}>
        add PC nodes to request IPs
      </div>
    );
  }

  return (
    <div>
      {pcs.map((pc) => {
        const serverId  = findServerForPc(nodes, links, pc);
        const server    = serverId ? servers.get(serverId) : null;
        const lease     = server?.leases.find((l) => l.clientId === String(pc.id) && l.status === "active");
        const leaseInfo = lease ? { ...lease, cidr: server.cidr } : null;

        return (
          <PcRow
            key={pc.id}
            pc={pc}
            leaseInfo={leaseInfo}
            serverId={serverId}
            onRequest={(node) => onRequest(serverId, node)}
            onRelease={(node, sid) => onRelease(sid, node)}
          />
        );
      })}
    </div>
  );
}
