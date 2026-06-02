/**
 * SubnetMap.jsx
 * Visual overview of all subnets in the topology.
 * Groups nodes by subnet, shows utilisation bar, host range, broadcast.
 */

import { useMemo } from "react";
import { calcSubnet, isValidIp, isValidMask } from "../utils/ipUtils.js";
import { SUBNET_PALETTE } from "../utils/subnetColors.js";

function buildSubnets(nodes) {
  const map = new Map();

  const addMember = (ip, mask, label, type) => {
    if (!ip || !mask || !isValidIp(ip) || !isValidMask(mask)) return;
    const info = calcSubnet(ip, mask);
    const key = `${info.network}/${info.cidr}`;
    if (!map.has(key)) map.set(key, { ...info, key, members: [] });
    map.get(key).members.push({ label, ip, type });
  };

  nodes.forEach((node) => {
    if (node.type === "pc") {
      addMember(node.ip, node.mask, node.label, "pc");
    } else if (node.type === "router") {
      node.interfaces.forEach((ifc) =>
        addMember(ifc.ip, ifc.mask, `${node.label}/${ifc.name}`, "router")
      );
    }
  });

  return [...map.values()];
}

function SubnetCard({ subnet, color }) {
  const { network, cidr, mask, broadcast, firstHost, lastHost, totalHosts, members } = subnet;
  const pct = totalHosts > 0 ? Math.min(100, (members.length / Math.min(totalHosts, 254)) * 100) : 0;

  return (
    <div style={{ marginBottom: 14, background: "#060e1c", border: `1px solid ${color}33`, borderRadius: 10, overflow: "hidden" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 12px", background: `${color}12`, borderBottom: `1px solid ${color}22` }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ width: 8, height: 8, borderRadius: "50%", background: color, boxShadow: `0 0 6px ${color}` }} />
          <span style={{ fontSize: 13, fontFamily: "monospace", fontWeight: 700, color }}>{network}/{cidr}</span>
        </div>
        <span style={{ fontSize: 10, color: `${color}99`, fontFamily: "monospace" }}>{mask}</span>
      </div>

      {/* Info grid */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "4px 12px", padding: "8px 12px", borderBottom: `1px solid ${color}11` }}>
        {[["Broadcast", broadcast], ["First Host", firstHost], ["Last Host", lastHost], ["Usable Hosts", totalHosts.toLocaleString()]].map(([k, v]) => (
          <div key={k} style={{ display: "flex", flexDirection: "column", gap: 1 }}>
            <span style={{ fontSize: 9, color: "#334155", textTransform: "uppercase", letterSpacing: "0.07em" }}>{k}</span>
            <span style={{ fontSize: 11, fontFamily: "monospace", color: "#64748b" }}>{v}</span>
          </div>
        ))}
      </div>

      {/* Members */}
      <div style={{ padding: "8px 12px" }}>
        <div style={{ fontSize: 9, color: "#334155", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 6 }}>
          Devices ({members.length})
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
          {members.map((m, i) => (
            <div key={i} style={{
              display: "flex", alignItems: "center", gap: 5,
              background: `${color}0f`, border: `1px solid ${color}33`,
              borderRadius: 6, padding: "3px 8px",
            }}>
              <span style={{ color, fontSize: 10 }}>{m.type === "pc" ? "▣" : "◈"}</span>
              <span style={{ fontSize: 10, fontFamily: "monospace", color: `${color}cc` }}>{m.label}</span>
              <span style={{ fontSize: 9, color: `${color}66`, fontFamily: "monospace" }}>{m.ip}</span>
            </div>
          ))}
        </div>

        {/* Utilisation bar */}
        <div style={{ marginTop: 8 }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
            <span style={{ fontSize: 9, color: "#334155", textTransform: "uppercase", letterSpacing: "0.07em" }}>Utilisation</span>
            <span style={{ fontSize: 9, color: `${color}88`, fontFamily: "monospace" }}>{members.length} / {Math.min(totalHosts, 254)} shown</span>
          </div>
          <div style={{ height: 4, background: "#0f2040", borderRadius: 2, overflow: "hidden" }}>
            <div style={{ height: "100%", width: `${pct}%`, background: color, borderRadius: 2, transition: "width 0.4s ease" }} />
          </div>
        </div>
      </div>
    </div>
  );
}

export function SubnetMap({ nodes }) {
  const subnets = useMemo(() => buildSubnets(nodes), [nodes]);

  return (
    <div style={{ padding: "12px 16px", overflowY: "auto", height: "100%" }}>
      <div style={{ fontSize: 10, color: "#1e4a6f", letterSpacing: "0.1em", textTransform: "uppercase", fontWeight: 700, marginBottom: 12 }}>
        ▸ Subnet Map
      </div>

      {subnets.length === 0 ? (
        <div style={{ color: "#334155", fontSize: 12, fontFamily: "monospace", textAlign: "center", padding: "20px 0" }}>
          configure device IPs to see subnet map
        </div>
      ) : (
        subnets.map((s, idx) => (
          <SubnetCard key={s.key} subnet={s} color={SUBNET_PALETTE[idx % SUBNET_PALETTE.length]} />
        ))
      )}
    </div>
  );
}
