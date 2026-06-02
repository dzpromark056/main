/**
 * ConflictDetector.jsx
 * Renders the IP conflict / misconfiguration report.
 * Delegates all analysis to the conflictEngine.
 */

import { useMemo } from "react";
import { detectConflicts } from "../engine/conflictEngine.js";

const ENTRY_STYLES = {
  err:  { icon: "✗", textColor: "#fca5a5", bg: "#1a0a0a", border: "#3f1515" },
  warn: { icon: "!", textColor: "#fcd34d", bg: "#1a1200", border: "#3d2e00" },
  info: { icon: "›", textColor: "#475569", bg: "#0a0f1a", border: "#0f2040" },
};

function ConflictEntry({ entry }) {
  const s = ENTRY_STYLES[entry.type] ?? ENTRY_STYLES.info;
  return (
    <div style={{
      display: "flex", gap: 8, alignItems: "flex-start",
      padding: "7px 10px",
      background: s.bg,
      border: `1px solid ${s.border}`,
      borderRadius: 6,
    }}>
      <span style={{ color: s.textColor, fontWeight: 700, flexShrink: 0, marginTop: 1 }}>{s.icon}</span>
      <span style={{ fontSize: 11, fontFamily: "monospace", color: s.textColor, lineHeight: 1.5 }}>{entry.msg}</span>
    </div>
  );
}

export function ConflictDetector({ nodes }) {
  const conflicts = useMemo(() => detectConflicts(nodes), [nodes]);

  const errCount  = conflicts.filter((c) => c.type === "err").length;
  const warnCount = conflicts.filter((c) => c.type === "warn").length;

  const stats = [
    { label: "Errors",   count: errCount,            color: "#f87171", bg: "#3f1515" },
    { label: "Warnings", count: warnCount,            color: "#fcd34d", bg: "#2d1f00" },
    { label: "Total",    count: conflicts.length,     color: "#64748b", bg: "#0d1a2d" },
  ];

  return (
    <div style={{ padding: "12px 16px", overflowY: "auto", height: "100%" }}>
      <div style={styles.sectionTitle}>▸ IP Conflict Detector</div>

      {/* Summary counters */}
      <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
        {stats.map((s) => (
          <div key={s.label} style={{
            flex: 1, background: s.bg,
            border: `1px solid ${s.color}22`,
            borderRadius: 8, padding: "8px 10px", textAlign: "center",
          }}>
            <div style={{ fontSize: 20, fontWeight: 700, color: s.color, fontFamily: "monospace" }}>{s.count}</div>
            <div style={{ fontSize: 10, color: s.color, opacity: 0.7, letterSpacing: "0.06em" }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Issue list */}
      <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
        {conflicts.length === 0 ? (
          <div style={{ display: "flex", gap: 8, alignItems: "center", padding: "10px 12px", background: "#0a2a14", border: "1px solid #145232", borderRadius: 8 }}>
            <span style={{ color: "#34d399", fontSize: 16, fontWeight: 700 }}>✓</span>
            <span style={{ fontSize: 12, color: "#34d399", fontFamily: "monospace" }}>No conflicts detected</span>
          </div>
        ) : (
          conflicts.map((entry, i) => <ConflictEntry key={i} entry={entry} />)
        )}
      </div>

      {nodes.length === 0 && (
        <div style={{ color: "#334155", fontSize: 12, fontFamily: "monospace", textAlign: "center", paddingTop: 16 }}>
          add devices to see conflict analysis
        </div>
      )}
    </div>
  );
}

const styles = {
  sectionTitle: { fontSize: 10, color: "#1e4a6f", letterSpacing: "0.1em", textTransform: "uppercase", fontWeight: 700, marginBottom: 12 },
};
