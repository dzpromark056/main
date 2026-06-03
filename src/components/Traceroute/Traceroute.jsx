/**
 * Traceroute.jsx
 * Self-contained traceroute panel.
 *
 * PLUGIN INTERFACE:
 *   <Traceroute
 *     nodes={nodes}
 *     links={links}
 *     routingTables={routingTables}        ← from useStaticRouting (pass new Map() if not used)
 *     onAnimatePath={(path, success) => {}} ← optional: triggers packet animation
 *   />
 */

import { useState, useRef, useEffect } from "react";
import { runTraceroute } from "./tracerouteEngine.js";

const HOP_STATUS_STYLE = {
  reached:     { color: "#34d399", icon: "●" },
  transit:     { color: "#38bdf8", icon: "◎" },
  unreachable: { color: "#f87171", icon: "✗" },
  loop:        { color: "#f59e0b", icon: "↻" },
  "no-route":  { color: "#f87171", icon: "✗" },
};

function HopRow({ hop, animate }) {
  const s = HOP_STATUS_STYLE[hop.status] ?? HOP_STATUS_STYLE.transit;
  return (
    <div style={{
      display: "grid", gridTemplateColumns: "28px 20px 1fr 80px 60px",
      gap: "4px 8px", alignItems: "center",
      padding: "5px 10px",
      background: animate ? `${s.color}0f` : "#060e1c",
      border: `1px solid ${animate ? s.color + "33" : "#0f2040"}`,
      borderRadius: 6, marginBottom: 3,
      transition: "background 0.3s, border-color 0.3s",
    }}>
      <span style={{ fontSize: 11, color: "#475569", fontFamily: "monospace", textAlign: "right" }}>{hop.hopNum}</span>
      <span style={{ fontSize: 12, color: s.color }}>{s.icon}</span>
      <span style={{ fontSize: 11, fontFamily: "monospace", color: s.color }}>{hop.label}</span>
      <span style={{ fontSize: 10, fontFamily: "monospace", color: "#475569" }}>{hop.ip}</span>
      <span style={{ fontSize: 10, fontFamily: "monospace", color: hop.latencyMs ? "#f59e0b" : "#334155", textAlign: "right" }}>
        {hop.latencyMs ? `${hop.latencyMs} ms` : "* * *"}
      </span>
    </div>
  );
}

function HopTable({ hops, animatedUpTo }) {
  return (
    <div>
      {/* Header */}
      <div style={{ display: "grid", gridTemplateColumns: "28px 20px 1fr 80px 60px", gap: "4px 8px", padding: "0 10px", marginBottom: 5 }}>
        {["TTL", "", "Host", "IP", "Latency"].map((h) => (
          <span key={h} style={{ fontSize: 9, color: "#334155", fontFamily: "monospace", textTransform: "uppercase", letterSpacing: "0.06em" }}>{h}</span>
        ))}
      </div>
      {hops.map((hop) => (
        <HopRow key={hop.hopNum} hop={hop} animate={hop.hopNum <= animatedUpTo} />
      ))}
    </div>
  );
}

export function Traceroute({ nodes, links, routingTables, onAnimatePath }) {
  const [srcId,       setSrcId]       = useState("");
  const [dstId,       setDstId]       = useState("");
  const [result,      setResult]      = useState(null);
  const [animatedUpTo, setAnimatedUpTo] = useState(0);
  const [running,     setRunning]     = useState(false);
  const timerRef = useRef(null);

  const pcs = nodes.filter((n) => n.type === "pc");

  const runTrace = () => {
    if (!srcId || !dstId) return;
    const src = nodes.find((n) => n.id === +srcId);
    const dst = nodes.find((n) => n.id === +dstId);
    if (!src || !dst) return;

    clearInterval(timerRef.current);
    setAnimatedUpTo(0);
    setRunning(true);

    const traceResult = runTraceroute(src, dst, nodes, links, routingTables);
    setResult(traceResult);

    // Animate hops one by one
    let hop = 0;
    timerRef.current = setInterval(() => {
      hop++;
      setAnimatedUpTo(hop);
      if (hop >= traceResult.hops.length) {
        clearInterval(timerRef.current);
        setRunning(false);
        // Trigger packet animation if callback provided
        if (onAnimatePath) {
          const pathNodeIds = traceResult.hops.filter((h) => h.nodeId).map((h) => h.nodeId);
          if (src) pathNodeIds.unshift(src.id);
          const unique = [...new Set(pathNodeIds)];
          onAnimatePath(unique, traceResult.success);
        }
      }
    }, 400);
  };

  useEffect(() => () => clearInterval(timerRef.current), []);

  const selStyle = {
    flex: 1, background: "#0a1628", border: "1px solid #1e3a5f",
    borderRadius: 5, color: "#94c9f0", fontSize: 11,
    fontFamily: "monospace", padding: "5px 7px",
  };

  return (
    <div style={{ padding: "12px 14px", overflowY: "auto", height: "100%", display: "flex", flexDirection: "column", gap: 12 }}>
      <div style={{ fontSize: 10, color: "#1e4a6f", letterSpacing: "0.1em", textTransform: "uppercase", fontWeight: 700 }}>
        ▸ Traceroute
      </div>

      {/* Controls */}
      <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
        <select value={srcId} onChange={(e) => setSrcId(e.target.value)} style={selStyle}>
          <option value="">Source PC…</option>
          {pcs.map((pc) => <option key={pc.id} value={pc.id}>{pc.label}{pc.ip ? ` · ${pc.ip}` : ""}</option>)}
        </select>
        <span style={{ color: "#1e3a5f" }}>→</span>
        <select value={dstId} onChange={(e) => setDstId(e.target.value)} style={selStyle}>
          <option value="">Dest PC…</option>
          {pcs.map((pc) => <option key={pc.id} value={pc.id}>{pc.label}{pc.ip ? ` · ${pc.ip}` : ""}</option>)}
        </select>
      </div>

      <button onClick={runTrace} disabled={!srcId || !dstId || running} style={{
        display: "flex", alignItems: "center", justifyContent: "center", gap: 7,
        background: srcId && dstId && !running ? "#0d1e3b" : "#0a1628",
        border: `1px solid ${srcId && dstId && !running ? "#1e3a5f" : "#0f2040"}`,
        color: srcId && dstId && !running ? "#38bdf8" : "#334155",
        borderRadius: 6, padding: "7px", fontSize: 12,
        fontFamily: "monospace", cursor: srcId && dstId && !running ? "pointer" : "not-allowed",
        fontWeight: 600,
      }}>
        {running ? "⏳ Tracing…" : "▶ Run Traceroute"}
      </button>

      {/* Results */}
      {result && (
        <div>
          {/* Summary bar */}
          <div style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            padding: "6px 10px", marginBottom: 8,
            background: result.success ? "#0a2a14" : "#1a0a0a",
            border: `1px solid ${result.success ? "#145232" : "#3f1515"}`,
            borderRadius: 6,
          }}>
            <span style={{ fontSize: 11, fontFamily: "monospace", color: result.success ? "#34d399" : "#f87171", fontWeight: 700 }}>
              {result.success ? `✓ Reached in ${result.hops.length} hop${result.hops.length !== 1 ? "s" : ""}` : "✗ Trace failed"}
            </span>
            {result.hops.length > 0 && result.success && (
              <span style={{ fontSize: 10, fontFamily: "monospace", color: "#475569" }}>
                total ~{result.hops.reduce((a, h) => a + (h.latencyMs ?? 0), 0)} ms
              </span>
            )}
          </div>

          <HopTable hops={result.hops} animatedUpTo={animatedUpTo} />

          {/* Log */}
          <div style={{
            marginTop: 10, background: "#040a14", border: "1px solid #0f2040",
            borderRadius: 6, padding: "8px 10px",
            fontFamily: "monospace", fontSize: 10.5,
            display: "flex", flexDirection: "column", gap: 2,
            maxHeight: 120, overflowY: "auto",
          }}>
            {result.log.map((line, i) => (
              <div key={i} style={{ display: "flex", gap: 7 }}>
                <span style={{ color: line.type === "ok" ? "#34d399" : line.type === "err" ? "#f87171" : "#475569", fontWeight: 700, flexShrink: 0 }}>
                  {line.type === "ok" ? "✓" : line.type === "err" ? "✗" : "›"}
                </span>
                <span style={{ color: line.type === "ok" ? "#86efac" : line.type === "err" ? "#fca5a5" : "#64748b" }}>{line.msg}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {!result && (
        <div style={{ color: "#334155", fontSize: 12, fontFamily: "monospace", textAlign: "center", padding: "20px 0" }}>
          select source and destination, then run traceroute
        </div>
      )}
    </div>
  );
}
