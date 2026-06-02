/**
 * useTopology.js
 * Custom hook that owns all node and link state.
 * Exposes stable action callbacks — components never mutate state directly.
 */

import { useState, useCallback } from "react";
import { uid } from "../utils/idUtils.js";
import { buildDemoTopology } from "../data/demoTopology.js";

const DEFAULT_ROUTER_INTERFACES = [
  { name: "eth0", ip: "", mask: "" },
  { name: "eth1", ip: "", mask: "" },
];

export function useTopology() {
  const [nodes, setNodes] = useState(() => buildDemoTopology().nodes);
  const [links, setLinks] = useState(() => buildDemoTopology().links);

  // ── Node CRUD ──────────────────────────────────────────────────────────────

  const addNode = useCallback((type, canvasRect) => {
    const w = canvasRect?.width ?? 700;
    const h = canvasRect?.height ?? 380;
    const count = (prev) => prev.filter((n) => n.type === type).length + 1;

    setNodes((prev) => {
      const label = type === "pc" ? `PC-${count(prev)}` : `R-${count(prev)}`;
      const newNode = {
        id: uid(),
        type,
        label,
        x: 80 + Math.random() * (w - 160),
        y: 60 + Math.random() * (h - 120),
        ip: "",
        mask: "",
        gw: "",
        interfaces:
          type === "router"
            ? DEFAULT_ROUTER_INTERFACES.map((ifc) => ({ ...ifc }))
            : [],
      };
      return [...prev, newNode];
    });
  }, []);

  const deleteNode = useCallback((id) => {
    setNodes((prev) => prev.filter((n) => n.id !== id));
    setLinks((prev) => prev.filter((l) => l.a !== id && l.b !== id));
  }, []);

  /** Generic field updater for both PC and Router nodes. */
  const updateNodeField = useCallback((id, key, value, ifaceIndex) => {
    setNodes((prev) =>
      prev.map((node) => {
        if (node.id !== id) return node;

        switch (key) {
          case "add_iface":
            return {
              ...node,
              interfaces: [
                ...node.interfaces,
                { name: `eth${node.interfaces.length}`, ip: "", mask: "" },
              ],
            };

          case "iface_ip":
          case "iface_mask": {
            const field = key === "iface_ip" ? "ip" : "mask";
            return {
              ...node,
              interfaces: node.interfaces.map((ifc, i) =>
                i === ifaceIndex ? { ...ifc, [field]: value } : ifc
              ),
            };
          }

          default:
            return { ...node, [key]: value };
        }
      })
    );
  }, []);

  /** Move a node to new canvas coordinates. */
  const moveNode = useCallback((id, x, y) => {
    setNodes((prev) =>
      prev.map((n) => (n.id === id ? { ...n, x, y } : n))
    );
  }, []);

  // ── Link CRUD ──────────────────────────────────────────────────────────────

  const addLink = useCallback((aId, bId) => {
    setLinks((prev) => {
      const exists = prev.some(
        (l) => (l.a === aId && l.b === bId) || (l.a === bId && l.b === aId)
      );
      if (exists) return prev;
      return [...prev, { id: uid(), a: aId, b: bId }];
    });
  }, []);

  const deleteLink = useCallback((id) => {
    setLinks((prev) => prev.filter((l) => l.id !== id));
  }, []);

  // ── Reset ──────────────────────────────────────────────────────────────────

  const clearAll = useCallback(() => {
    setNodes([]);
    setLinks([]);
  }, []);

  return {
    nodes,
    links,
    addNode,
    deleteNode,
    updateNodeField,
    moveNode,
    addLink,
    deleteLink,
    clearAll,
  };
}
