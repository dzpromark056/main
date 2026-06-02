/**
 * DiagnosticHub.jsx
 * Bottom panel: source/dest PC selectors, Execute Ping button, scrolling log.
 */

import { useState, useRef, useEffect } from "react";
import { PlayIcon } from "./Icons.jsx";

// ─── Log line ──────────────────────────────────────────────────────────────────
const LOG_CONFIG = {
  ok:   { icon: "✓", color: "#86efac" },
  err:  { icon: "✗", color: "#fca5a5" },
  warn: { icon: "!", color: "#fcd34d" },
  info: { icon: "›", color: "#64748b" },
};

function LogLine({ line }) {
  const cfg = LOG_CONFIG[line.type] ?? LOG_CONFIG.info;
  return (
    <div style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
      <span style={{ color: cfg.color, fontWeight: 700, flexShrink: 0 }}>{cfg.icon}</span>
      <span style={{ color: cfg.color, lineHeight: 1.5 }}>{line.msg}</span>
    </div>
  );
}

// ─── Public component ──────────────────────────────────────────────────────────
export function DiagnosticHub({ pcs, onPing, logLines }) {
  const [srcId, setSrcId] = useState("");
  const [dstId, setDstId] = useState("");
  const logRef = useRef(null);

  // Auto-scroll log
  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
  }, [logLines]);

  const handlePing = () => {
    if (srcId && dstId) onPing(+srcId, +dstId);
  };

  const selectStyle = {
    flex: 1,
    background: "#0a1628",
    border: "1px solid #1e3a5f",
    borderRadius: 5,
    color: "#94c9f0",
    fontSize: 11,
    fontFamily: "monospace",
    padding: "5px 7px",
  };

  return (
    <div style={{ flexShrink: 0, padding: 12, display: "flex", flexDirection: "column", gap: 8, borderTop: "1px solid #0f2040" }}>
      <div style={{ fontSize: 10, color: "#1e4a6f", letterSpacing: "0.1em", textTransform: "uppercase", fontWeight: 700 }}>
        ▸ Diagnostic Hub
      </div>

      {/* Selectors */}
      <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
        <select value={srcId} onChange={(e) => setSrcId(e.target.value)} style={selectStyle}>
          <option value="">Source PC…</option>
          {pcs.map((pc) => (
            <option key={pc.id} value={pc.id}>
              {pc.label}{pc.ip ? ` · ${pc.ip}` : ""}
            </option>
          ))}
        </select>
        <span style={{ color: "#1e3a5f", fontSize: 14 }}>→</span>
        <select value={dstId} onChange={(e) => setDstId(e.target.value)} style={selectStyle}>
          <option value="">Dest PC…</option>
          {pcs.map((pc) => (
            <option key={pc.id} value={pc.id}>
              {pc.label}{pc.ip ? ` · ${pc.ip}` : ""}
            </option>
          ))}
        </select>
      </div>

      {/* Execute button */}
      <button
        onClick={handlePing}
        disabled={!srcId || !dstId}
        style={{
          display: "flex", alignItems: "center", justifyContent: "center", gap: 7,
          background: srcId && dstId ? "#0d2b1e" : "#0a1628",
          border: `1px solid ${srcId && dstId ? "#145232" : "#0f2040"}`,
          color: srcId && dstId ? "#34d399" : "#334155",
          borderRadius: 6, padding: "7px",
          fontSize: 12, fontFamily: "monospace",
          cursor: srcId && dstId ? "pointer" : "not-allowed",
          fontWeight: 600, transition: "all 0.15s",
        }}
      >
        <PlayIcon /> Execute Ping
      </button>

      {/* Log */}
      <div
        ref={logRef}
        style={{
          overflowY: "auto",
          fontFamily: "monospace",
          fontSize: 11.5,
          background: "#060e1c",
          borderRadius: 6,
          border: "1px solid #0f2040",
          padding: "8px 12px",
          display: "flex",
          flexDirection: "column",
          gap: 3,
          minHeight: 72,
          maxHeight: 160,
        }}
      >
        {logLines.length === 0 ? (
          <span style={{ color: "#334155" }}>// select devices and execute ping</span>
        ) : (
          logLines.map((line, i) => <LogLine key={i} line={line} />)
        )}
      </div>
    </div>
  );
}
