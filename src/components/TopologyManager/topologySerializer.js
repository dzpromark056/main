/**
 * topologySerializer.js
 * Pure serialization/deserialization for topology state.
 * No React, no side effects — just plain JSON transform functions.
 *
 * Public API:
 *   serializeTopology(nodes, links, routingTables)  → JSON string
 *   deserializeTopology(jsonString)                 → { nodes, links, routingTables } | null
 *   validateTopology(parsed)                        → { valid, errors }
 */

const SCHEMA_VERSION = "1.0";

// ─── Serialize ────────────────────────────────────────────────────────────────

export function serializeTopology(nodes, links, routingTables = new Map()) {
  const routingObj = {};
  routingTables.forEach((routes, routerId) => {
    routingObj[routerId] = routes;
  });

  const payload = {
    version:       SCHEMA_VERSION,
    exportedAt:    new Date().toISOString(),
    nodes,
    links,
    routingTables: routingObj,
  };

  return JSON.stringify(payload, null, 2);
}

// ─── Deserialize ──────────────────────────────────────────────────────────────

export function deserializeTopology(jsonString) {
  try {
    const parsed = JSON.parse(jsonString);
    const { valid, errors } = validateTopology(parsed);
    if (!valid) {
      console.warn("Topology validation errors:", errors);
      return null;
    }

    const routingTables = new Map();
    if (parsed.routingTables) {
      Object.entries(parsed.routingTables).forEach(([routerId, routes]) => {
        routingTables.set(Number(routerId), routes);
      });
    }

    return {
      nodes:         parsed.nodes,
      links:         parsed.links,
      routingTables,
    };
  } catch (e) {
    console.error("Failed to parse topology JSON:", e);
    return null;
  }
}

// ─── Validate ─────────────────────────────────────────────────────────────────

export function validateTopology(parsed) {
  const errors = [];

  if (!parsed || typeof parsed !== "object") {
    return { valid: false, errors: ["Not a valid JSON object"] };
  }
  if (!Array.isArray(parsed.nodes)) errors.push("Missing 'nodes' array");
  if (!Array.isArray(parsed.links)) errors.push("Missing 'links' array");

  if (parsed.nodes) {
    parsed.nodes.forEach((node, i) => {
      if (!node.id)    errors.push(`Node[${i}]: missing id`);
      if (!node.type)  errors.push(`Node[${i}]: missing type`);
      if (!node.label) errors.push(`Node[${i}]: missing label`);
    });
  }

  if (parsed.links) {
    parsed.links.forEach((link, i) => {
      if (!link.id) errors.push(`Link[${i}]: missing id`);
      if (!link.a)  errors.push(`Link[${i}]: missing endpoint a`);
      if (!link.b)  errors.push(`Link[${i}]: missing endpoint b`);
    });
  }

  return { valid: errors.length === 0, errors };
}

// ─── Filename helper ──────────────────────────────────────────────────────────

export function buildFilename() {
  const now  = new Date();
  const date = now.toISOString().slice(0, 10);
  const time = now.toTimeString().slice(0, 5).replace(":", "-");
  return `topology-${date}-${time}.json`;
}
