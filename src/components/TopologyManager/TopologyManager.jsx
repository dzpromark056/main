/**
 * TopologyManager.jsx
 * Self-contained Save / Load panel.
 *
 * PLUGIN INTERFACE:
 *   <TopologyManager
 *     nodes={nodes}
 *     links={links}
 *     routingTables={routingTables}           ← pass new Map() if not using StaticRouting
 *     onLoad={({ nodes, links, routingTables }) => {}}
 *   />
 *
 * onLoad is called with the deserialized topology.
 * The parent is responsible for applying it to its own state.
 */

import { useState, useRef } from "react";
import { serializeTopology, deserializeTopology, buildFilename, validateTopology } from "./topologySerializer.js";

// ─── Save panel ────────────────────────────────────────────────────────────────
function SavePanel({ nodes, links, routingTables }) {
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    const json     = serializeTopology(nodes, links, routingTables);
    const blob     = new Blob([json], { type: "application/json" });
    const url      = URL.createObjectURL(blob);
    const a        = document.createElement("a");
    a.href         = url;
    a.download     = buildFilename();
    a.click();
    URL.revokeObjectURL(url);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const stats = [
    ["Nodes",  nodes.length],
    ["Links",  links.length],
    ["Routes", [...routingTables.values()].reduce((a, r) => a + r.length, 0)],
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <div style={{ fontSize: 10, color: "#1e4a6f", textTransform: "uppercase", letterSpacing: "0.08em", fontFamily: "monospace", fontWeight: 700 }}>
        ▸ Export Topology
      </div>

      {/* Snapshot preview */}
      <div style={{ display: "flex", gap: 8 }}>
        {stats.map(([label, count]) => (
          <div key={label} style={{
            flex: 1, background: "#060e1c", border: "1px solid #0f2040",
            borderRadius: 8, padding: "8px 10px", textAlign: "center",
          }}>
            <div style={{ fontSize: 18, fontWeight: 700, color: "#38bdf8", fontFamily: "monospace" }}>{count}</div>
            <div style={{ fontSize: 10, color: "#334155", letterSpacing: "0.06em" }}>{label}</div>
          </div>
        ))}
      </div>

      <button onClick={handleSave} style={{
        display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
        background: saved ? "#0a2a14" : "#0d1e3b",
        border: `1px solid ${saved ? "#145232" : "#1e3a5f"}`,
        color: saved ? "#34d399" : "#38bdf8",
        borderRadius: 8, padding: "10px",
        fontSize: 12, fontFamily: "monospace",
        cursor: "pointer", fontWeight: 700,
        transition: "all 0.2s",
      }}>
        {saved ? "✓ Saved!" : "⬇ Download topology.json"}
      </button>

      <div style={{ fontSize: 10, color: "#334155", fontFamily: "monospace", lineHeight: 1.6 }}>
        Saves all nodes, links, IP configs, and static routes as a JSON file.
        Share it with others or re-import it later.
      </div>
    </div>
  );
}

// ─── Load panel ────────────────────────────────────────────────────────────────
function LoadPanel({ onLoad }) {
  const [status,   setStatus]   = useState(null); // null | "ok" | "err"
  const [message,  setMessage]  = useState("");
  const [preview,  setPreview]  = useState(null);
  const fileRef = useRef(null);

  const handleFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setStatus(null); setPreview(null);

    const reader = new FileReader();
    reader.onload = (ev) => {
      const text    = ev.target.result;
      const parsed  = deserializeTopology(text);

      if (!parsed) {
        setStatus("err");
        setMessage("Invalid file — could not parse topology JSON.");
        return;
      }

      setPreview({
        nodeCount:  parsed.nodes.length,
        linkCount:  parsed.links.length,
        routeCount: [...parsed.routingTables.values()].reduce((a, r) => a + r.length, 0),
        data:       parsed,
      });
      setStatus("ok");
      setMessage(`Ready to load: ${file.name}`);
    };
    reader.readAsText(file);
  };

  const handleLoad = () => {
    if (!preview?.data) return;
    onLoad(preview.data);
    setStatus("ok");
    setMessage("Topology loaded ✓");
    setPreview(null);
    if (fileRef.current) fileRef.current.value = "";
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <div style={{ fontSize: 10, color: "#1e4a6f", textTransform: "uppercase", letterSpacing: "0.08em", fontFamily: "monospace", fontWeight: 700 }}>
        ▸ Import Topology
      </div>

      {/* File drop area */}
      <label style={{
        display: "flex", flexDirection: "column", alignItems: "center",
        justifyContent: "center", gap: 8,
        padding: "20px", cursor: "pointer",
        background: "#060e1c", border: "2px dashed #1e3a5f",
        borderRadius: 10, transition: "border-color 0.2s",
      }}
        onMouseEnter={(e) => e.currentTarget.style.borderColor = "#38bdf8"}
        onMouseLeave={(e) => e.currentTarget.style.borderColor = "#1e3a5f"}
      >
        <span style={{ fontSize: 22 }}>📂</span>
        <span style={{ fontSize: 12, color: "#475569", fontFamily: "monospace" }}>
          Click to choose topology.json
        </span>
        <span style={{ fontSize: 10, color: "#334155", fontFamily: "monospace" }}>
          or drag and drop
        </span>
        <input ref={fileRef} type="file" accept=".json" onChange={handleFile} style={{ display: "none" }} />
      </label>

      {/* Status */}
      {status && (
        <div style={{
          padding: "8px 12px",
          background: status === "ok" ? "#0a2a14" : "#1a0a0a",
          border: `1px solid ${status === "ok" ? "#145232" : "#3f1515"}`,
          borderRadius: 6,
        }}>
          <span style={{ fontSize: 11, fontFamily: "monospace", color: status === "ok" ? "#34d399" : "#f87171" }}>
            {status === "ok" ? "✓" : "✗"} {message}
          </span>
        </div>
      )}

      {/* Preview */}
      {preview && (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <div style={{ display: "flex", gap: 8 }}>
            {[["Nodes", preview.nodeCount], ["Links", preview.linkCount], ["Routes", preview.routeCount]].map(([label, count]) => (
              <div key={label} style={{
                flex: 1, background: "#060e1c", border: "1px solid #1e3a5f",
                borderRadius: 8, padding: "8px 10px", textAlign: "center",
              }}>
                <div style={{ fontSize: 18, fontWeight: 700, color: "#38bdf8", fontFamily: "monospace" }}>{count}</div>
                <div style={{ fontSize: 10, color: "#334155" }}>{label}</div>
              </div>
            ))}
          </div>
          <button onClick={handleLoad} style={{
            background: "#0d2b1e", border: "1px solid #145232", color: "#34d399",
            borderRadius: 8, padding: "10px", fontSize: 12,
            fontFamily: "monospace", cursor: "pointer", fontWeight: 700,
          }}>
            ⬆ Load This Topology
          </button>
          <div style={{ fontSize: 10, color: "#f59e0b", fontFamily: "monospace" }}>
            ⚠ This will replace your current canvas
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Example topologies ────────────────────────────────────────────────────────
const EXAMPLES = [
  {
    name: "Two Subnets",
    description: "PC-1, PC-2 on 192.168.1.0/24 — Router — PC-3 on 10.0.0.0/24",
    data: {
      version: "1.0", exportedAt: "",
      nodes: [
        { id:1, type:"pc",     label:"PC-1", x:110, y:160, ip:"192.168.1.10", mask:"255.255.255.0", gw:"192.168.1.1",  interfaces:[] },
        { id:2, type:"pc",     label:"PC-2", x:110, y:320, ip:"192.168.1.20", mask:"255.255.255.0", gw:"192.168.1.1",  interfaces:[] },
        { id:3, type:"router", label:"R-1",  x:360, y:240, ip:"", mask:"", gw:"", interfaces:[{name:"eth0",ip:"192.168.1.1",mask:"255.255.255.0"},{name:"eth1",ip:"10.0.0.1",mask:"255.255.255.0"}] },
        { id:4, type:"pc",     label:"PC-3", x:610, y:240, ip:"10.0.0.10",   mask:"255.255.255.0", gw:"10.0.0.1",     interfaces:[] },
      ],
      links: [{id:10,a:1,b:3},{id:11,a:2,b:3},{id:12,a:3,b:4}],
      routingTables: {},
    },
  },
  {
    name: "Broken Gateway",
    description: "PC-1 has wrong gateway — can you fix it?",
    data: {
      version: "1.0", exportedAt: "",
      nodes: [
        { id:1, type:"pc",     label:"PC-1", x:120, y:200, ip:"192.168.1.10", mask:"255.255.255.0", gw:"192.168.1.99", interfaces:[] },
        { id:2, type:"router", label:"R-1",  x:380, y:200, ip:"", mask:"", gw:"", interfaces:[{name:"eth0",ip:"192.168.1.1",mask:"255.255.255.0"},{name:"eth1",ip:"10.0.0.1",mask:"255.255.255.0"}] },
        { id:3, type:"pc",     label:"PC-2", x:620, y:200, ip:"10.0.0.10",   mask:"255.255.255.0", gw:"10.0.0.1",     interfaces:[] },
      ],
      links: [{id:10,a:1,b:2},{id:11,a:2,b:3}],
      routingTables: {},
    },
  },
];

function ExamplesPanel({ onLoad }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <div style={{ fontSize: 10, color: "#1e4a6f", textTransform: "uppercase", letterSpacing: "0.08em", fontFamily: "monospace", fontWeight: 700 }}>
        ▸ Example Topologies
      </div>
      {EXAMPLES.map((ex) => (
        <div key={ex.name} style={{
          padding: "10px 12px", background: "#060e1c",
          border: "1px solid #0f2040", borderRadius: 8,
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 4 }}>
            <span style={{ fontSize: 12, fontFamily: "monospace", fontWeight: 700, color: "#e2e8f0" }}>{ex.name}</span>
            <button onClick={() => onLoad({ nodes: ex.data.nodes, links: ex.data.links, routingTables: new Map() })} style={{
              background: "#0d1e3b", border: "1px solid #1e3a5f", color: "#38bdf8",
              borderRadius: 5, padding: "3px 10px", fontSize: 10,
              fontFamily: "monospace", cursor: "pointer",
            }}>
              Load
            </button>
          </div>
          <div style={{ fontSize: 10, color: "#475569", fontFamily: "monospace" }}>{ex.description}</div>
        </div>
      ))}
    </div>
  );
}

// ─── Public component ──────────────────────────────────────────────────────────
const TABS = [
  { id: "save",     label: "Save"     },
  { id: "load",     label: "Load"     },
  { id: "examples", label: "Examples" },
];

export function TopologyManager({ nodes, links, routingTables = new Map(), onLoad }) {
  const [tab, setTab] = useState("save");

  return (
    <div style={{ padding: "12px 14px", overflowY: "auto", height: "100%", display: "flex", flexDirection: "column", gap: 12 }}>
      <div style={{ fontSize: 10, color: "#1e4a6f", letterSpacing: "0.1em", textTransform: "uppercase", fontWeight: 700 }}>
        ▸ Topology Manager
      </div>

      {/* Internal tabs */}
      <div style={{ display: "flex", borderBottom: "1px solid #0f2040", marginBottom: 4 }}>
        {TABS.map((t) => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{
            flex: 1, padding: "6px 4px", background: "transparent", border: "none",
            borderBottom: `2px solid ${tab === t.id ? "#38bdf8" : "transparent"}`,
            color: tab === t.id ? "#38bdf8" : "#334155",
            fontSize: 10, fontFamily: "monospace", fontWeight: 700,
            letterSpacing: "0.07em", textTransform: "uppercase",
            cursor: "pointer", transition: "color 0.15s",
          }}>{t.label}</button>
        ))}
      </div>

      {tab === "save"     && <SavePanel nodes={nodes} links={links} routingTables={routingTables} />}
      {tab === "load"     && <LoadPanel onLoad={onLoad} />}
      {tab === "examples" && <ExamplesPanel onLoad={onLoad} />}
    </div>
  );
}
