/**
 * useStaticRouting.js
 * Owns all static routing table state across all routers.
 */

import { useState, useCallback } from "react";
import { createRoute, addRoute, removeRoute } from "./staticRoutingEngine.js";

export function useStaticRouting() {
  const [routingTables, setRoutingTables] = useState(new Map());

  const getTable = useCallback(
    (routerId) => routingTables.get(routerId) ?? [],
    [routingTables]
  );

  const addStaticRoute = useCallback((routerId, config) => {
    const route = createRoute(config);
    setRoutingTables((prev) => {
      const next = new Map(prev);
      next.set(routerId, addRoute(next.get(routerId) ?? [], route));
      return next;
    });
  }, []);

  const removeStaticRoute = useCallback((routerId, routeId) => {
    setRoutingTables((prev) => {
      const next = new Map(prev);
      next.set(routerId, removeRoute(next.get(routerId) ?? [], routeId));
      return next;
    });
  }, []);

  const clearRouterTable = useCallback((routerId) => {
    setRoutingTables((prev) => { const n = new Map(prev); n.delete(routerId); return n; });
  }, []);

  const exportTables = useCallback(() => {
    const obj = {};
    routingTables.forEach((routes, id) => { obj[id] = routes; });
    return obj;
  }, [routingTables]);

  const importTables = useCallback((obj) => {
    const map = new Map();
    Object.entries(obj).forEach(([id, routes]) => map.set(Number(id), routes));
    setRoutingTables(map);
  }, []);

  return { routingTables, getTable, addStaticRoute, removeStaticRoute, clearRouterTable, exportTables, importTables };
}
