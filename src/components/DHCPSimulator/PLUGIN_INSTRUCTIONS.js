/**
 * HOW TO PLUG DHCPSimulator INTO App.jsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Three changes only. Do NOT touch anything else.
 * ─────────────────────────────────────────────────────────────────────────────
 */


// ── CHANGE 1: Add this import at the top of App.jsx ──────────────────────────

import { DHCPSimulator } from "./components/DHCPSimulator";


// ── CHANGE 2: Add this callback inside App() (after useTopology destructure) ──

const handleDhcpAssign = useCallback((nodeId, { ip, mask, gateway }) => {
  updateNodeField(nodeId, "ip",   ip);
  updateNodeField(nodeId, "mask", mask);
  updateNodeField(nodeId, "gw",   gateway);
}, [updateNodeField]);


// ── CHANGE 3: Add <DHCPSimulator> anywhere in the JSX layout ─────────────────
//    Recommended: as a new right panel tab, or below the existing right panel.
//
//    Option A — Add as a new tab in the right panel tab bar:
//
//    In the TABS array add:
//      { id: "dhcp", label: "DHCP" }
//
//    In the tab content section add:
//      {rightTab === "dhcp" && (
//        <DHCPSimulator
//          nodes={nodes}
//          links={links}
//          onAssignIp={handleDhcpAssign}
//        />
//      )}
//
//
//    Option B — Render as a standalone side panel next to the canvas:
//
//      <DHCPSimulator
//        nodes={nodes}
//        links={links}
//        onAssignIp={handleDhcpAssign}
//      />
//
// ─────────────────────────────────────────────────────────────────────────────
// That's it. No other files touched.
// ─────────────────────────────────────────────────────────────────────────────
