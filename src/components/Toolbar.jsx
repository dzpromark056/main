/**
 * Toolbar.jsx
 * Top toolbar: add node buttons, draw-cable toggle, clear button, stats.
 */

import { LinkIcon, TrashIcon } from "./Icons.jsx";

export function Toolbar({ nodeCount, linkCount, linkMode, linkSrc, onAddPc, onAddRouter, onToggleLinkMode, onClear }) {
  const cableLabel = linkMode
    ? linkSrc ? "→ click destination" : "→ click source"
    : "Draw Cable";

  return (
    <div style={{
      display: "flex", gap: 8, padding: "8px 14px",
      background: "#0a1628", borderBottom: "1px solid #0f2040",
      alignItems: "center", flexWrap: "wrap", flexShrink: 0,
    }}>
      {/* Brand */}
      <span style={{ fontSize: 12, color: "#1e3a5f", fontWeight: 700, letterSpacing: "0.12em", marginRight: 6, textTransform: "uppercase" }}>
        Net//Sim
      </span>

      {/* Add node buttons */}
      {[
        { label: "+ PC",     color: "#38bdf8", action: onAddPc     },
        { label: "+ Router", color: "#34d399", action: onAddRouter },
      ].map(({ label, color, action }) => (
        <GhostButton key={label} label={label} color={color} onClick={action} />
      ))}

      <Divider />

      {/* Draw cable */}
      <button
        onClick={onToggleLinkMode}
        style={{
          display: "flex", alignItems: "center", gap: 6,
          background: linkMode ? "#1e3a5f" : "transparent",
          border: `1px solid ${linkMode ? "#38bdf8" : "#0f2040"}`,
          color: linkMode ? "#38bdf8" : "#475569",
          borderRadius: 6, padding: "5px 12px",
          fontSize: 12, cursor: "pointer", fontFamily: "monospace",
          transition: "all 0.15s",
        }}
      >
        <LinkIcon /> {cableLabel}
      </button>

      {/* Clear */}
      <button
        onClick={onClear}
        style={{
          display: "flex", alignItems: "center", gap: 5,
          background: "transparent", border: "1px solid #3f1515",
          color: "#f87171", borderRadius: 6,
          padding: "5px 10px", fontSize: 12,
          cursor: "pointer", fontFamily: "monospace",
        }}
      >
        <TrashIcon /> Clear
      </button>

      {/* Stats */}
      <span style={{ marginLeft: "auto", fontSize: 11, color: "#1e3a5f" }}>
        {nodeCount} nodes · {linkCount} links
      </span>
    </div>
  );
}

function GhostButton({ label, color, onClick }) {
  return (
    <button
      onClick={onClick}
      onMouseEnter={(e) => { e.currentTarget.style.background = `${color}15`; }}
      onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
      style={{
        background: "transparent", border: `1px solid ${color}22`,
        color, borderRadius: 6, padding: "5px 12px",
        fontSize: 12, cursor: "pointer", fontFamily: "monospace",
        transition: "background 0.15s",
      }}
    >
      {label}
    </button>
  );
}

function Divider() {
  return <div style={{ width: 1, height: 20, background: "#0f2040", margin: "0 4px" }} />;
}
