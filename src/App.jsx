/**
 * App.jsx
 * Root component. Thin orchestration layer only — no business logic here.
 *
 * Responsibilities:
 *   1. Own canvas interaction state (selected, linkMode, linkSrc)
 *   2. Wire hooks together (topology, drag, animation)
 *   3. Call routing engine and pass results to child components
 *   4. Render layout shell and compose panels
 *
 * Architecture:
 *   hooks/useTopology      — node/link CRUD state
 *   hooks/useDrag          — drag-and-drop
 *   hooks/usePacketAnimation — SVG packet dot
 *   engine/routingEngine   — pure ping simulation
 *   engine/conflictEngine  — (used inside ConflictDetector)
 *   utils/ipUtils          — (used in subnetColorMap)
 *   utils/subnetColors     — palette
 */

import { useState, useRef, useCallback, useMemo } from "react";

import { useTopology }         from "./hooks/useTopology.js";
import { usePacketAnimation }  from "./hooks/usePacketAnimation.js";
import { executePing }         from "./engine/routingEngine.js";
import { calcSubnet, isValidIp, isValidMask } from "./utils/ipUtils.js";
import { buildSubnetColorMap, SUBNET_PALETTE } from "./utils/subnetColors.js";

import { Toolbar }         from "./components/Toolbar.jsx";
import { NodeEl }          from "./components/NodeEl.jsx";
import { ConfigPanel }     from "./components/ConfigPanel.jsx";
import { SubnetCalculator } from "./components/SubnetCalculator.jsx";
import { ConflictDetector } from "./components/ConflictDetector.jsx";
import { SubnetMap }        from "./components/SubnetMap.jsx";
import { DiagnosticHub }   from "./components/DiagnosticHub.jsx";
import { DHCPSimulator } from "./components/DHCPSimulator";
// ─── Tab definitions ──────────────────────────────────────────────────────────
const TABS = [
  { id: "config",    label: "Config"    },
  { id: "calc",      label: "Calc"      },
  { id: "conflicts", label: "Conflicts" },
  { id: "map",       label: "Map"       },
    { id: "dhcp",      label: "DHCP"      },
];

// ─── Canvas grid background ───────────────────────────────────────────────────
function GridBackground() {
  return (
    <svg style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none" }}>
      <defs>
        <pattern id="dot-grid" width="32" height="32" patternUnits="userSpaceOnUse">
          <circle cx="16" cy="16" r="1" fill="#0f2040" />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#dot-grid)" />
    </svg>
  );
}

// ─── App ──────────────────────────────────────────────────────────────────────
export default function App() {
  // ── Topology state (nodes, links, CRUD actions) ────────────────────────────
  const { nodes, links, addNode, deleteNode, updateNodeField, moveNode, addLink, deleteLink, clearAll } = useTopology();

  const handleDhcpAssign = useCallback((nodeId, { ip, mask, gateway }) => {
  updateNodeField(nodeId, "ip",   ip);
  updateNodeField(nodeId, "mask", mask);
  updateNodeField(nodeId, "gw",   gateway);
}, [updateNodeField]);


  // ── UI state ───────────────────────────────────────────────────────────────
  const [selected, setSelected]   = useState(null);
  const [linkMode, setLinkMode]   = useState(false);
  const [linkSrc, setLinkSrc]     = useState(null);
  const [rightTab, setRightTab]   = useState("config");
  const [diagLog, setDiagLog]     = useState([]);

  const canvasRef = useRef(null);

  // ── Packet animation ───────────────────────────────────────────────────────
  const { packetPos, startAnimation } = usePacketAnimation();

  // ── Derived: per-node subnet color ────────────────────────────────────────
  const subnetColorMap = useMemo(() => {
    // Collect unique subnet keys in node order (stable palette assignment)
    const keys = [];
    nodes.forEach((node) => {
      const add = (ip, mask) => {
        if (!ip || !mask || !isValidIp(ip) || !isValidMask(mask)) return;
        const { network, cidr } = calcSubnet(ip, mask);
        const key = `${network}/${cidr}`;
        if (!keys.includes(key)) keys.push(key);
      };
      if (node.type === "pc") add(node.ip, node.mask);
      else node.interfaces.forEach((ifc) => add(ifc.ip, ifc.mask));
    });

    const palette = buildSubnetColorMap(keys);

    // Map node id → color
    const map = new Map();
    nodes.forEach((node) => {
      const getColor = (ip, mask) => {
        if (!ip || !mask || !isValidIp(ip) || !isValidMask(mask)) return null;
        const { network, cidr } = calcSubnet(ip, mask);
        return palette.get(`${network}/${cidr}`) ?? null;
      };
      if (node.type === "pc") {
        map.set(node.id, getColor(node.ip, node.mask));
      } else {
        const firstColor = node.interfaces.map((ifc) => getColor(ifc.ip, ifc.mask)).find(Boolean) ?? null;
        map.set(node.id, firstColor);
      }
    });
    return map;
  }, [nodes]);

  // ── Derived: link color (shared subnet → subnet color, else default) ──────
  const getLinkColor = useCallback(
    (link) => {
      const ca = subnetColorMap.get(link.a);
      const cb = subnetColorMap.get(link.b);
      return ca && ca === cb ? ca : "#1e3a5f";
    },
    [subnetColorMap]
  );

  // ── Canvas drag handling ───────────────────────────────────────────────────
  const dragRef = useRef(null);

  const startDrag = useCallback(
    (e, id) => {
      if (linkMode) return;
      e.preventDefault();
      e.stopPropagation();
      const rect = canvasRef.current.getBoundingClientRect();
      const node = nodes.find((n) => n.id === id);
      dragRef.current = { id, ox: e.clientX - rect.left - node.x, oy: e.clientY - rect.top - node.y };
      setSelected(id);

      const onMove = (ev) => {
        if (!dragRef.current) return;
        const r = canvasRef.current.getBoundingClientRect();
        const x = Math.max(36, Math.min(r.width - 36, ev.clientX - r.left - dragRef.current.ox));
        const y = Math.max(30, Math.min(r.height - 30, ev.clientY - r.top - dragRef.current.oy));
        moveNode(dragRef.current.id, x, y);
      };
      const onUp = () => {
        dragRef.current = null;
        window.removeEventListener("mousemove", onMove);
        window.removeEventListener("mouseup", onUp);
      };
      window.addEventListener("mousemove", onMove);
      window.addEventListener("mouseup", onUp);
    },
    [linkMode, nodes, moveNode]
  );

  // ── Node click (select or link) ────────────────────────────────────────────
  const handleNodeClick = useCallback(
    (id) => {
      if (linkMode) {
        if (!linkSrc) {
          setLinkSrc(id);
        } else if (linkSrc !== id) {
          addLink(linkSrc, id);
          setLinkSrc(null);
        }
      } else {
        setSelected(id);
        setRightTab("config");
      }
    },
    [linkMode, linkSrc, addLink]
  );

  // ── Link mode toggle ───────────────────────────────────────────────────────
  const toggleLinkMode = useCallback(() => {
    setLinkMode((prev) => !prev);
    setLinkSrc(null);
  }, []);

  // ── Canvas background click (deselect) ────────────────────────────────────
  const handleCanvasClick = useCallback(
    (e) => {
      const isBackground =
        e.target === canvasRef.current ||
        e.target.tagName === "svg" ||
        e.target.tagName === "line" ||
        e.target.tagName === "circle";
      if (isBackground && !linkMode) setSelected(null);
    },
    [linkMode]
  );

  // ── Clear all ─────────────────────────────────────────────────────────────
  const handleClear = useCallback(() => {
    clearAll();
    setSelected(null);
    setLinkMode(false);
    setLinkSrc(null);
    setDiagLog([]);
  }, [clearAll]);

  // ── Add node (needs canvas rect) ──────────────────────────────────────────
  const handleAddNode = useCallback(
    (type) => {
      const rect = canvasRef.current?.getBoundingClientRect();
      addNode(type, rect);
      setRightTab("config");
    },
    [addNode]
  );

  // ── Ping execution ─────────────────────────────────────────────────────────
  const handlePing = useCallback(
    (srcId, dstId) => {
      const result = executePing(srcId, dstId, nodes, links);
      setDiagLog(result.log);
      if (result.path.length >= 1) {
        startAnimation(result.path, result.success, nodes);
      }
    },
    [nodes, links, startAnimation]
  );

  // ── Derived ────────────────────────────────────────────────────────────────
  const selectedNode = nodes.find((n) => n.id === selected) ?? null;
  const pcs = nodes.filter((n) => n.type === "pc");

  // ─── Render ────────────────────────────────────────────────────────────────
  return (
    <div style={{
      display: "flex", flexDirection: "column",
      height: "100vh", minHeight: 600,
      background: "#060e1c", color: "#e2e8f0",
      fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
      overflow: "hidden",
    }}>
      {/* ── Toolbar ── */}
      <Toolbar
        nodeCount={nodes.length}
        linkCount={links.length}
        linkMode={linkMode}
        linkSrc={linkSrc}
        onAddPc={() => handleAddNode("pc")}
        onAddRouter={() => handleAddNode("router")}
        onToggleLinkMode={toggleLinkMode}
        onClear={handleClear}
      />

      {/* ── Main area ── */}
      <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>

        {/* ── Canvas ── */}
        <div
          ref={canvasRef}
          onClick={handleCanvasClick}
          style={{
            flex: 1, position: "relative", overflow: "hidden",
            background: "radial-gradient(ellipse at 30% 40%, #071428 0%, #060e1c 70%)",
            cursor: linkMode ? "crosshair" : "default",
          }}
        >
          <GridBackground />

          {/* Link lines */}
          <svg style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none" }}>
            {links.map((link) => {
              const a = nodes.find((n) => n.id === link.a);
              const b = nodes.find((n) => n.id === link.b);
              if (!a || !b) return null;
              return (
                <line
                  key={link.id}
                  x1={a.x} y1={a.y} x2={b.x} y2={b.y}
                  stroke={getLinkColor(link)}
                  strokeWidth="2"
                  strokeLinecap="round"
                  style={{ pointerEvents: "all", cursor: "pointer" }}
                  title="Click to delete link"
                  onClick={() => deleteLink(link.id)}
                />
              );
            })}

            {/* Animated packet dot */}
            {packetPos && (
              <circle cx={packetPos.x} cy={packetPos.y} r={8}
                fill={packetPos.success ? "#f59e0b" : "#ef4444"}
                opacity={0.92}
              >
                <animate attributeName="r" values="7;9;7" dur="0.4s" repeatCount="indefinite" />
              </circle>
            )}
          </svg>

          {/* Device nodes */}
          {nodes.map((node) => (
            <NodeEl
              key={node.id}
              node={node}
              selected={selected}
              linkSrc={linkSrc}
              subnetColor={subnetColorMap.get(node.id)}
              onMouseDown={(e) => startDrag(e, node.id)}
              onClick={(e) => { e.stopPropagation(); handleNodeClick(node.id); }}
              onDelete={() => deleteNode(node.id)}
            />
          ))}

          {nodes.length === 0 && (
            <div style={{
              position: "absolute", inset: 0,
              display: "flex", alignItems: "center", justifyContent: "center",
              color: "#1e3a5f", fontSize: 13, pointerEvents: "none", letterSpacing: "0.06em",
            }}>
              click "+ PC" or "+ Router" to begin
            </div>
          )}
        </div>

        {/* ── Right panel ── */}
        <div style={{
          width: 340, flexShrink: 0,
          background: "#080f1e", borderLeft: "1px solid #0f2040",
          display: "flex", flexDirection: "column", overflow: "hidden",
        }}>
          {/* Tab bar */}
          <div style={{ display: "flex", background: "#0a1628", borderBottom: "1px solid #0f2040", flexShrink: 0 }}>
            {TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setRightTab(tab.id)}
                style={{
                  flex: 1, padding: "8px 4px",
                  background: "transparent", border: "none",
                  borderBottom: `2px solid ${rightTab === tab.id ? "#38bdf8" : "transparent"}`,
                  color: rightTab === tab.id ? "#38bdf8" : "#334155",
                  fontSize: 10, fontFamily: "monospace", fontWeight: 700,
                  letterSpacing: "0.07em", textTransform: "uppercase",
                  cursor: "pointer", transition: "color 0.15s",
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Tab content */}
          <div style={{ flex: 1, overflow: "hidden", minHeight: 0 }}>
            {rightTab === "config"    && <ConfigPanel node={selectedNode} onUpdate={updateNodeField} />}
            {rightTab === "calc"      && <SubnetCalculator />}
            {rightTab === "conflicts" && <ConflictDetector nodes={nodes} />}
            {rightTab === "map"       && <SubnetMap nodes={nodes} />}
            {rightTab === "dhcp" && ( <DHCPSimulator   nodes={nodes} links={links}  onAssignIp={handleDhcpAssign}  /> )}

          </div>

          {/* Diagnostic hub (always visible) */}
          <DiagnosticHub pcs={pcs} onPing={handlePing} logLines={diagLog} />
        </div>
      </div>
    </div>
  );
}
