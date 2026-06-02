/**
 * usePacketAnimation.js
 * Drives the SVG packet-dot animation along a node path.
 * Keeps animation state out of the main App component.
 */

import { useState, useRef, useCallback, useEffect } from "react";

const STEPS_PER_SEGMENT = 35;

/**
 * @returns {{
 *   packetPos: { x: number, y: number, success: boolean } | null,
 *   startAnimation: (path: number[], success: boolean, nodes: object[]) => void,
 *   stopAnimation: () => void,
 * }}
 */
export function usePacketAnimation() {
  const [packetPos, setPacketPos] = useState(null);
  const rafRef = useRef(null);

  const stopAnimation = useCallback(() => {
    cancelAnimationFrame(rafRef.current);
    setPacketPos(null);
  }, []);

  // Clean up on unmount
  useEffect(() => stopAnimation, [stopAnimation]);

  const startAnimation = useCallback(
    (path, success, nodes) => {
      stopAnimation();
      if (!path || path.length < 2) return;

      let seg = 0;
      let t = 0;

      const tick = () => {
        if (seg >= path.length - 1) {
          setPacketPos(null);
          return;
        }

        const nodeA = nodes.find((n) => n.id === path[seg]);
        const nodeB = nodes.find((n) => n.id === path[seg + 1]);

        if (!nodeA || !nodeB) {
          setPacketPos(null);
          return;
        }

        t++;
        const ratio = t / STEPS_PER_SEGMENT;
        setPacketPos({
          x: nodeA.x + (nodeB.x - nodeA.x) * ratio,
          y: nodeA.y + (nodeB.y - nodeA.y) * ratio,
          success,
        });

        if (t >= STEPS_PER_SEGMENT) {
          seg++;
          t = 0;
        }

        rafRef.current = requestAnimationFrame(tick);
      };

      rafRef.current = requestAnimationFrame(tick);
    },
    [stopAnimation]
  );

  return { packetPos, startAnimation, stopAnimation };
}
