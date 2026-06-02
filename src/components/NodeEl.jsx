/**
 * NodeEl.jsx
 * Single draggable device node rendered on the canvas.
 * Visual state: default / selected / link-source-pending.
 * Displays a subnet color indicator dot when the node has a known subnet.
 */

import { PCIcon, RouterIcon } from "./Icons.jsx";

export function NodeEl({ node, selected, linkSrc, subnetColor, onMouseDown, onClick, onDelete }) {
  const isPC = node.type === "pc";
  const isSelected = selected === node.id;
  const isSrc = linkSrc === node.id;

  const borderColor = isSrc
    ? "#f59e0b"
    : isSelected
    ? "#38bdf8"
    : subnetColor ?? (isPC ? "#1e3a5f" : "#145232");

  const boxShadow = isSelected
    ? `0 0 0 3px ${borderColor}44, 0 4px 20px rgba(0,0,0,0.5)`
    : subnetColor
    ? `0 0 8px ${subnetColor}33, 0 2px 12px rgba(0,0,0,0.4)`
    : "0 2px 12px rgba(0,0,0,0.4)";

  return (
    <div
      data-node-id={node.id}
      data-x={node.x}
      data-y={node.y}
      onMouseDown={onMouseDown}
      onClick={onClick}
      style={{
        position: "absolute",
        left: node.x - 36,
        top: node.y - 30,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 5,
        cursor: "grab",
        userSelect: "none",
        zIndex: isSelected ? 20 : 10,
      }}
    >
      {/* ── Device body ── */}
      <div
        style={{
          width: 72,
          height: 60,
          borderRadius: 10,
          background: isPC ? "#0f1f3d" : "#0d2b1e",
          border: `1.5px solid ${borderColor}`,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 2,
          boxShadow,
          transition: "border-color 0.2s, box-shadow 0.2s",
          position: "relative",
        }}
      >
        {/* Subnet color dot */}
        {subnetColor && (
          <div
            style={{
              position: "absolute",
              top: 4,
              right: 4,
              width: 7,
              height: 7,
              borderRadius: "50%",
              background: subnetColor,
              boxShadow: `0 0 5px ${subnetColor}`,
            }}
          />
        )}

        {/* Device icon */}
        <span style={{ color: isPC ? "#38bdf8" : "#34d399" }}>
          {isPC ? <PCIcon /> : <RouterIcon />}
        </span>

        {/* Device type badge */}
        <span
          style={{
            fontSize: 9,
            color: isPC ? "#64a5c8" : "#4ead8a",
            fontFamily: "monospace",
            letterSpacing: "0.06em",
            fontWeight: 600,
          }}
        >
          {isPC ? "HOST" : "ROUTER"}
        </span>

        {/* Delete button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          title="Delete node"
          style={{
            position: "absolute",
            top: -8,
            right: -8,
            width: 18,
            height: 18,
            borderRadius: "50%",
            background: "#3f1515",
            border: "1px solid #7f2020",
            color: "#f87171",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 10,
            lineHeight: 1,
          }}
        >
          ×
        </button>
      </div>

      {/* Label */}
      <span
        style={{
          fontSize: 11,
          fontWeight: 600,
          color: isSelected ? "#e2e8f0" : "#94a3b8",
          fontFamily: "monospace",
          background: "rgba(0,0,0,0.5)",
          padding: "1px 6px",
          borderRadius: 4,
          border: "0.5px solid #1e293b",
          maxWidth: 90,
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        }}
      >
        {node.label}
      </span>

      {/* IP (when configured) */}
      {node.ip && (
        <span
          style={{
            fontSize: 9,
            color: subnetColor ?? "#475569",
            fontFamily: "monospace",
          }}
        >
          {node.ip}
        </span>
      )}
    </div>
  );
}
