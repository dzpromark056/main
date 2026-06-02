# Net//Sim — Network Topology Simulator

A drag-and-drop network topology simulator for learning subnetting and routing.

---

## Quick Start

```bash
cd network-sim
npm install
npm run dev
```

Open http://localhost:5173

---

## Project Structure

```
src/
│
├── utils/                      # Pure helper functions (no React)
│   ├── ipUtils.js              # IP ↔ int, CIDR ↔ mask, calcSubnet, sameSubnet, validation
│   ├── idUtils.js              # Monotonic UID factory
│   └── subnetColors.js         # Subnet → stable palette color mapping
│
├── data/
│   └── demoTopology.js         # Demo network factory (PC-1, PC-2, R-1, PC-3)
│
├── engine/                     # Business logic (pure functions, no React)
│   ├── routingEngine.js        # ICMP ping simulation with step-by-step log
│   └── conflictEngine.js       # Duplicate IP / misconfiguration detector
│
├── hooks/                      # Custom React hooks
│   ├── useTopology.js          # Node/link CRUD state + actions
│   ├── usePacketAnimation.js   # rAF-driven SVG packet dot
│   └── useDrag.js              # Canvas drag-and-drop (reference only)
│
├── components/                 # UI components (presentation + local state only)
│   ├── Icons.jsx               # Inline SVG icon library
│   ├── Toolbar.jsx             # Top toolbar
│   ├── NodeEl.jsx              # Draggable canvas device node
│   ├── ConfigPanel.jsx         # Device configuration form
│   ├── SubnetCalculator.jsx    # Standalone subnet calculator + binary breakdown
│   ├── ConflictDetector.jsx    # IP conflict / misconfiguration report
│   ├── SubnetMap.jsx           # Per-subnet device grouping + utilisation bar
│   └── DiagnosticHub.jsx       # Ping controls + scrolling log
│
├── App.jsx                     # Root — layout, wires hooks+engine+components
└── index.jsx                   # ReactDOM entry point
```

---

## Architecture Principles

| Principle | Applied |
|---|---|
| **Separation of concerns** | Engine logic (`routingEngine`, `conflictEngine`) contains zero React. Components never mutate state directly — they call action callbacks. |
| **Custom hooks for state** | `useTopology` owns all node/link state. `usePacketAnimation` owns animation. Components only receive derived data. |
| **Pure utility layer** | `ipUtils.js` functions are pure and unit-testable with no setup. |
| **Single responsibility** | Each file has one job. `App.jsx` only orchestrates — no business logic. |
| **Stable identifiers** | `uid()` is isolated in `idUtils.js` so it can be reset in tests. |

---

## Features

### Canvas
- Drag-and-drop nodes (PC & Router)
- Draw cable links between nodes (click source, then destination)
- Click a link to delete it
- Subnet-colored link lines (links between same-subnet nodes glow that subnet's color)
- Animated packet dot (orange = success, red = failure, halts at broken hop)

### Configuration (Config tab)
- PC: label, IP, subnet mask with CIDR dropdown, default gateway
- Router: per-interface IP + mask + CIDR dropdown, add interfaces dynamically
- Inline subnet info per PC (network, broadcast, host range, gateway validation)

### Subnet Calculator (Calc tab)
- IP + CIDR/mask inputs with bidirectional sync
- Full subnet breakdown: network, broadcast, first/last host, usable hosts, wildcard, class
- Interactive CIDR slider
- 32-bit binary visualiser (network bits vs host bits)

### Conflict Detector (Conflicts tab)
- Duplicate IP detection across all devices
- Gateway not on subnet warning
- Invalid IP/mask format errors
- Same-subnet router interfaces warning
- Unconfigured device notices
- Live count of errors / warnings

### Subnet Map (Map tab)
- Groups all configured devices by subnet
- Per-subnet: host range, broadcast, utilisation bar
- Each subnet gets a stable palette color (matches canvas node dots)

### Diagnostic Hub (always visible)
- Source / destination PC selectors
- Execute Ping button (disabled until both are selected)
- Step-by-step routing log with ARP simulation, gateway resolution, route matching, physical link checks

---

## Routing Engine Logic

```
executePing(srcId, dstId, nodes, links)

1. Validate IP/mask on both endpoints
2. Same subnet?
   YES → ARP direct → check physical link → BFS fallback → SUCCESS or DROP
   NO  → Check gateway configured on src
       → ARP for gateway (find directly-connected router w/ matching interface IP)
       → Check router has interface on dst subnet
       → Check physical cable router ↔ dst
       → SUCCESS or DROP (with specific failure point)
```
