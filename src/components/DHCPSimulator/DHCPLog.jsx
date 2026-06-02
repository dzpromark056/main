/**
 * DHCPLog.jsx
 * Scrolling activity log showing DORA handshake steps.
 * Auto-scrolls to latest entry.
 */

import { useRef, useEffect } from "react";

const LINE_STYLES = {
  ok:   { icon: "✓", color: "#86efac" },
  err:  { icon: "✗", color: "#fca5a5" },
  warn: { icon: "!", color: "#fcd34d" },
  info: { icon: "›", color: "#64748b" },
};

export function DHCPLog({ lines, onClear }) {
  const ref = useRef(null);

  useEffect(() => {
    if (ref.current) ref.current.scrollTop = ref.current.scrollHeight;
  }, [lines]);

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 5 }}>
        <span style={{ fontSize: 9, color: "#334155", textTransform: "uppercase", letterSpacing: "0.08em" }}>
          Activity Log ({lines.length})
        </span>
        {lines.length > 0 && (
          <button onClick={onClear} style={{
            background: "transparent", border: "none",
            color: "#334155", fontSize: 10, fontFamily: "monospace", cursor: "pointer",
          }}>
            clear
          </button>
        )}
      </div>

      <div
        ref={ref}
        style={{
          background: "#040a14",
          border: "1px solid #0f2040",
          borderRadius: 6,
          padding: "6px 10px",
          maxHeight: 140,
          overflowY: "auto",
          display: "flex",
          flexDirection: "column",
          gap: 2,
          fontFamily: "monospace",
          fontSize: 10.5,
        }}
      >
        {lines.length === 0 ? (
          <span style={{ color: "#1e3a5f" }}>// DHCP activity appears here</span>
        ) : (
          lines.map((line, i) => {
            const s = LINE_STYLES[line.type] ?? LINE_STYLES.info;
            return (
              <div key={i} style={{ display: "flex", gap: 7, alignItems: "flex-start" }}>
                <span style={{ color: s.color, fontWeight: 700, flexShrink: 0 }}>{s.icon}</span>
                <span style={{ color: s.color, lineHeight: 1.5 }}>{line.msg}</span>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
