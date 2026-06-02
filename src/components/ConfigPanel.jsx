/**
 * ConfigPanel.jsx
 * Device configuration form.
 * PC: label, IP, mask (with CIDR picker), gateway + inline subnet info.
 * Router: label + per-interface IP/mask/CIDR rows.
 */

import { calcSubnet, maskToCidr, cidrToMask, isValidIp, isValidMask, sameSubnet } from "../utils/ipUtils.js";
import { PCIcon, RouterIcon, PlusIcon } from "./Icons.jsx";

const CIDR_OPTIONS = [8, 16, 24, 25, 26, 27, 28, 29, 30];

// ─── Shared field component ────────────────────────────────────────────────────
function Field({ label, value, onChange, placeholder, validate, hint }) {
  const isInvalid = value && validate && !validate(value);
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      <div style={{ display: "flex", justifyContent: "space-between" }}>
        <span style={styles.fieldLabel}>{label}</span>
        {hint && <span style={{ fontSize: 9, color: "#1e4a6f", fontFamily: "monospace" }}>{hint}</span>}
      </div>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        style={{
          ...styles.input,
          borderColor: isInvalid ? "#7f2020" : "#1e3a5f",
        }}
      />
      {isInvalid && <span style={{ fontSize: 9, color: "#f87171", fontFamily: "monospace" }}>invalid format</span>}
    </label>
  );
}

// ─── Inline subnet summary for a PC ──────────────────────────────────────────
function SubnetSummary({ ip, mask, gw }) {
  const info = calcSubnet(ip, mask);
  if (!info) return null;
  const gwOnSubnet = gw && isValidIp(gw) ? sameSubnet(ip, gw, mask) : null;

  return (
    <div style={{ background: "#060e1c", border: "1px solid #0f2040", borderRadius: 8, padding: "8px 10px", marginTop: 2 }}>
      <div style={styles.sectionLabel}>Subnet Info</div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "3px 10px" }}>
        {[
          ["Network", `${info.network}/${info.cidr}`],
          ["Broadcast", info.broadcast],
          ["First Host", info.firstHost],
          ["Usable Hosts", info.totalHosts.toLocaleString()],
        ].map(([k, v]) => (
          <div key={k} style={{ display: "flex", flexDirection: "column", gap: 1 }}>
            <span style={{ fontSize: 9, color: "#334155" }}>{k}</span>
            <span style={{ fontSize: 10, fontFamily: "monospace", color: "#64748b" }}>{v}</span>
          </div>
        ))}
      </div>
      {gwOnSubnet !== null && (
        <div style={{
          marginTop: 6, padding: "4px 8px", borderRadius: 5,
          background: gwOnSubnet ? "#0a2a14" : "#1a0a0a",
          border: `1px solid ${gwOnSubnet ? "#145232" : "#3f1515"}`,
        }}>
          <span style={{ fontSize: 10, fontFamily: "monospace", color: gwOnSubnet ? "#34d399" : "#f87171" }}>
            {gwOnSubnet ? "✓ Gateway is on this subnet" : "✗ Gateway NOT on this subnet"}
          </span>
        </div>
      )}
    </div>
  );
}

// ─── PC form ───────────────────────────────────────────────────────────────────
function PcForm({ node, onChange }) {
  const cidrValue = node.mask && isValidMask(node.mask) ? String(maskToCidr(node.mask)) : "";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        <Field label="Label" value={node.label ?? ""} onChange={(v) => onChange("label", v)} placeholder="PC-1" />
        <Field label="IP Address" value={node.ip ?? ""} onChange={(v) => onChange("ip", v)} placeholder="192.168.1.10" validate={isValidIp} />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 8, alignItems: "end" }}>
        <Field label="Subnet Mask" value={node.mask ?? ""} onChange={(v) => onChange("mask", v)} placeholder="255.255.255.0" validate={isValidMask} />
        <label style={{ display: "flex", flexDirection: "column", gap: 3 }}>
          <span style={styles.fieldLabel}>CIDR</span>
          <select
            value={cidrValue}
            onChange={(e) => { if (e.target.value) onChange("mask", cidrToMask(e.target.value)); }}
            style={styles.select}
          >
            <option value="">—</option>
            {CIDR_OPTIONS.map((c) => <option key={c} value={c}>/{c}</option>)}
          </select>
        </label>
      </div>

      <Field label="Default Gateway" value={node.gw ?? ""} onChange={(v) => onChange("gw", v)} placeholder="192.168.1.1" validate={isValidIp} />

      {node.ip && node.mask && isValidIp(node.ip) && isValidMask(node.mask) && (
        <SubnetSummary ip={node.ip} mask={node.mask} gw={node.gw} />
      )}
    </div>
  );
}

// ─── Router form ───────────────────────────────────────────────────────────────
function RouterForm({ node, onChange, onAddIface }) {
  return (
    <div>
      <div style={{ marginBottom: 12 }}>
        <Field label="Label" value={node.label ?? ""} onChange={(v) => onChange("label", v)} placeholder="R-1" />
      </div>

      <div style={styles.sectionLabel}>Interfaces</div>

      {/* Header row */}
      <div style={{ display: "grid", gridTemplateColumns: "64px 1fr 1fr auto", gap: "4px 6px", marginBottom: 4 }}>
        {["", "IP Address", "Mask", "CIDR"].map((h) => (
          <span key={h} style={{ fontSize: 9, color: "#334155", fontFamily: "monospace", textTransform: "uppercase", letterSpacing: "0.06em" }}>{h}</span>
        ))}
      </div>

      {node.interfaces.map((iface, i) => {
        const ifInfo = iface.ip && iface.mask && isValidIp(iface.ip) && isValidMask(iface.mask)
          ? calcSubnet(iface.ip, iface.mask) : null;
        const cidrVal = iface.mask && isValidMask(iface.mask) ? String(maskToCidr(iface.mask)) : "";

        return (
          <div key={i} style={{ marginBottom: 6 }}>
            <div style={{ display: "grid", gridTemplateColumns: "64px 1fr 1fr auto", gap: "4px 6px", alignItems: "center" }}>
              <span style={styles.ifaceBadge}>{iface.name}</span>
              <input
                value={iface.ip ?? ""}
                onChange={(e) => onChange("iface_ip", e.target.value, i)}
                placeholder="10.0.0.1"
                style={{ ...styles.input, borderColor: iface.ip && !isValidIp(iface.ip) ? "#7f2020" : "#1e3a5f", fontSize: 11, padding: "5px 6px" }}
              />
              <input
                value={iface.mask ?? ""}
                onChange={(e) => onChange("iface_mask", e.target.value, i)}
                placeholder="255.255.255.0"
                style={{ ...styles.input, borderColor: iface.mask && !isValidMask(iface.mask) ? "#7f2020" : "#1e3a5f", fontSize: 11, padding: "5px 6px" }}
              />
              <select
                value={cidrVal}
                onChange={(e) => { if (e.target.value) onChange("iface_mask", cidrToMask(e.target.value), i); }}
                style={{ ...styles.select, fontSize: 10, padding: "5px 4px" }}
              >
                <option value="">—</option>
                {CIDR_OPTIONS.map((c) => <option key={c} value={c}>/{c}</option>)}
              </select>
            </div>
            {ifInfo && (
              <div style={{ fontSize: 9, color: "#334155", fontFamily: "monospace", marginLeft: 70, marginTop: 2 }}>
                net:{ifInfo.network} · bc:{ifInfo.broadcast} · {ifInfo.totalHosts} hosts
              </div>
            )}
          </div>
        );
      })}

      <button onClick={onAddIface} style={styles.dashedBtn}>
        <PlusIcon /> Add Interface
      </button>
    </div>
  );
}

// ─── Public component ──────────────────────────────────────────────────────────
export function ConfigPanel({ node, onUpdate }) {
  if (!node) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", color: "#334155", fontSize: 13, fontFamily: "monospace" }}>
        — select a device to configure —
      </div>
    );
  }

  const change = (key, value, ifaceIdx) => onUpdate(node.id, key, value, ifaceIdx);

  return (
    <div style={{ padding: "12px 16px", overflowY: "auto", height: "100%" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
        <span style={{ color: node.type === "pc" ? "#38bdf8" : "#34d399" }}>
          {node.type === "pc" ? <PCIcon /> : <RouterIcon />}
        </span>
        <span style={{ fontSize: 13, fontWeight: 700, color: "#e2e8f0", fontFamily: "monospace" }}>{node.label}</span>
        <span style={{ fontSize: 10, color: "#334155", fontFamily: "monospace", marginLeft: 4 }}>id:{node.id}</span>
      </div>

      {node.type === "pc"
        ? <PcForm node={node} onChange={(key, val) => change(key, val)} />
        : <RouterForm node={node} onChange={(key, val, i) => change(key, val, i)} onAddIface={() => change("add_iface")} />
      }
    </div>
  );
}

// ─── Styles ────────────────────────────────────────────────────────────────────
const styles = {
  input: {
    background: "#0a1628",
    border: "1px solid #1e3a5f",
    borderRadius: 6,
    color: "#94c9f0",
    fontSize: 12,
    fontFamily: "monospace",
    padding: "6px 10px",
    outline: "none",
    width: "100%",
  },
  select: {
    background: "#0a1628",
    border: "1px solid #1e3a5f",
    borderRadius: 6,
    color: "#f59e0b",
    fontSize: 11,
    fontFamily: "monospace",
    padding: "6px 8px",
    outline: "none",
  },
  fieldLabel: {
    fontSize: 10,
    color: "#475569",
    fontWeight: 600,
    letterSpacing: "0.08em",
    textTransform: "uppercase",
    fontFamily: "monospace",
  },
  sectionLabel: {
    fontSize: 10,
    color: "#475569",
    fontWeight: 600,
    letterSpacing: "0.08em",
    textTransform: "uppercase",
    fontFamily: "monospace",
    marginBottom: 8,
  },
  ifaceBadge: {
    fontSize: 11,
    color: "#64748b",
    fontFamily: "monospace",
    background: "#0d1f35",
    padding: "4px 6px",
    borderRadius: 4,
    border: "0.5px solid #1e3a5f",
    whiteSpace: "nowrap",
  },
  dashedBtn: {
    marginTop: 6,
    display: "flex",
    alignItems: "center",
    gap: 5,
    background: "transparent",
    border: "1px dashed #1e3a5f",
    color: "#475569",
    borderRadius: 5,
    padding: "4px 10px",
    fontSize: 11,
    fontFamily: "monospace",
    cursor: "pointer",
  },
};
