/**
 * SubnetCalculator.jsx
 * Standalone subnet calculator panel.
 * Features: IP input, CIDR slider, mask auto-sync, binary breakdown visual,
 * full subnet info table.
 */

import { useState } from "react";
import { calcSubnet, cidrToMask, maskToCidr, isValidIp, isValidMask, buildBinaryBreakdown } from "../utils/ipUtils.js";

// ─── Info row ──────────────────────────────────────────────────────────────────
function InfoRow({ label, value, accent }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "5px 0", borderBottom: "1px solid #0f2040" }}>
      <span style={{ fontSize: 10, color: "#475569", textTransform: "uppercase", letterSpacing: "0.07em" }}>{label}</span>
      <span style={{ fontSize: 12, fontFamily: "monospace", color: accent ?? "#94c9f0", fontWeight: accent ? 600 : 400 }}>{value}</span>
    </div>
  );
}

// ─── Binary bit cell ───────────────────────────────────────────────────────────
function BitCell({ bit, isNetBit }) {
  return (
    <div style={{
      width: 14, height: 14, borderRadius: 2,
      background: isNetBit ? "#1e3a5f" : "#0d1a0d",
      border: `1px solid ${isNetBit ? "#38bdf8" : "#145232"}`,
      display: "flex", alignItems: "center", justifyContent: "center",
      fontSize: 7, color: isNetBit ? "#38bdf8" : "#34d399",
      fontFamily: "monospace", lineHeight: 1,
    }}>
      {bit}
    </div>
  );
}

// ─── Binary breakdown visual ──────────────────────────────────────────────────
function BinaryBreakdown({ network, mask }) {
  const bits = buildBinaryBreakdown(network, mask);
  const octets = [bits.slice(0, 8), bits.slice(8, 16), bits.slice(16, 24), bits.slice(24, 32)];
  const octNums = network.split(".");

  return (
    <div style={{ marginTop: 14 }}>
      <div style={{ fontSize: 10, color: "#334155", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6 }}>
        Binary — network bits <span style={{ color: "#38bdf8" }}>■</span> host bits <span style={{ color: "#34d399" }}>■</span>
      </div>
      <div style={{ display: "flex", gap: 6 }}>
        {octets.map((oct, oi) => (
          <div key={oi} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 3 }}>
            <div style={{ display: "flex", gap: 1 }}>
              {oct.map((b, bi) => <BitCell key={bi} bit={b.bit} isNetBit={b.isNetBit} />)}
            </div>
            <span style={{ fontSize: 9, color: "#334155", fontFamily: "monospace" }}>.{octNums[oi]}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Public component ──────────────────────────────────────────────────────────
export function SubnetCalculator() {
  const [ip, setIp] = useState("192.168.1.0");
  const [cidr, setCidr] = useState(24);
  const [mask, setMask] = useState("255.255.255.0");

  const syncCidrToMask = (value) => {
    const c = parseInt(value, 10);
    if (!isNaN(c)) {
      setCidr(c);
      const m = cidrToMask(c);
      if (m) setMask(m);
    }
  };

  const syncMaskToCidr = (value) => {
    setMask(value);
    if (isValidMask(value)) {
      const c = maskToCidr(value);
      if (c !== null) setCidr(c);
    }
  };

  const info = isValidIp(ip) && isValidMask(mask) ? calcSubnet(ip, mask) : null;

  return (
    <div style={{ padding: "12px 16px", overflowY: "auto", height: "100%" }}>
      <div style={styles.sectionTitle}>▸ Subnet Calculator</div>

      {/* IP + CIDR inputs */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 28px 72px", gap: 6, alignItems: "end", marginBottom: 10 }}>
        <label style={{ display: "flex", flexDirection: "column", gap: 3 }}>
          <span style={styles.label}>IP Address</span>
          <input value={ip} onChange={(e) => setIp(e.target.value)} placeholder="192.168.1.0"
            style={{ ...styles.input, borderColor: !ip || isValidIp(ip) ? "#1e3a5f" : "#7f2020" }} />
        </label>
        <span style={{ color: "#1e3a5f", fontSize: 18, paddingBottom: 7, textAlign: "center" }}>/</span>
        <label style={{ display: "flex", flexDirection: "column", gap: 3 }}>
          <span style={styles.label}>CIDR</span>
          <input value={cidr} onChange={(e) => syncCidrToMask(e.target.value)} type="number" min="0" max="32"
            style={{ ...styles.input, color: "#f59e0b" }} />
        </label>
      </div>

      {/* Mask input */}
      <label style={{ display: "flex", flexDirection: "column", gap: 3, marginBottom: 14 }}>
        <span style={styles.label}>Subnet Mask (syncs with CIDR)</span>
        <input value={mask} onChange={(e) => syncMaskToCidr(e.target.value)} placeholder="255.255.255.0"
          style={{ ...styles.input, borderColor: !mask || isValidMask(mask) ? "#1e3a5f" : "#7f2020" }} />
      </label>

      {info ? (
        <>
          {/* Results table */}
          <div style={{ background: "#060e1c", borderRadius: 8, border: "1px solid #0f2040", padding: "8px 12px", marginBottom: 14 }}>
            <InfoRow label="Network Address" value={`${info.network}/${info.cidr}`} accent="#38bdf8" />
            <InfoRow label="Subnet Mask"     value={info.mask} />
            <InfoRow label="Wildcard Mask"   value={info.wildcard} />
            <InfoRow label="Broadcast"       value={info.broadcast} accent="#f59e0b" />
            <InfoRow label="First Host"      value={info.firstHost} accent="#34d399" />
            <InfoRow label="Last Host"       value={info.lastHost}  accent="#34d399" />
            <InfoRow label="Usable Hosts"    value={info.totalHosts.toLocaleString()} accent="#a78bfa" />
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: 5 }}>
              <span style={{ fontSize: 10, color: "#475569", textTransform: "uppercase", letterSpacing: "0.07em" }}>IP Class</span>
              <span style={{ fontSize: 11, fontFamily: "monospace", color: "#64748b", background: "#0d1f35", padding: "2px 8px", borderRadius: 4, border: "0.5px solid #1e3a5f" }}>
                Class {info.netClass}
              </span>
            </div>
          </div>

          {/* Slider */}
          <div style={{ marginBottom: 14 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
              <span style={styles.label}>Prefix length</span>
              <span style={{ fontSize: 11, color: "#f59e0b", fontFamily: "monospace" }}>/{info.cidr} — {info.totalHosts.toLocaleString()} hosts</span>
            </div>
            <input type="range" min="1" max="32" value={info.cidr}
              onChange={(e) => syncCidrToMask(e.target.value)}
              style={{ width: "100%", accentColor: "#38bdf8" }} />
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 9, color: "#334155", fontFamily: "monospace", marginTop: 2 }}>
              <span>/1</span><span>/8 (16M)</span><span>/16 (65K)</span><span>/24 (254)</span><span>/32</span>
            </div>
          </div>

          {/* Binary breakdown */}
          <BinaryBreakdown network={info.network} mask={info.mask} />
        </>
      ) : (
        <div style={{ color: "#334155", fontSize: 12, fontFamily: "monospace", textAlign: "center", padding: "20px 0" }}>
          enter a valid IP and mask / CIDR
        </div>
      )}
    </div>
  );
}

const styles = {
  sectionTitle: { fontSize: 10, color: "#1e4a6f", letterSpacing: "0.1em", textTransform: "uppercase", fontWeight: 700, marginBottom: 12 },
  label: { fontSize: 10, color: "#475569", textTransform: "uppercase", letterSpacing: "0.08em", fontFamily: "monospace" },
  input: { background: "#0a1628", border: "1px solid #1e3a5f", borderRadius: 6, color: "#94c9f0", fontSize: 12, fontFamily: "monospace", padding: "6px 10px", outline: "none", width: "100%" },
};
