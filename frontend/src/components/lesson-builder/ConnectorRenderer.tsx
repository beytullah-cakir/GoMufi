import React from 'react';
import type { SlideElement, SlideConnection } from './types';

interface ConnectorRendererProps {
    connections: SlideConnection[];
    elements: SlideElement[];
}

const ConnectorRenderer: React.FC<ConnectorRendererProps> = ({ connections, elements }) => {

    // Helper to get edge points
    const getAnchorPoints = (el: SlideElement) => {
        const { x, y, width, height } = el;
        const cx = x + width / 2;
        const cy = y + height / 2;
        return {
            n: { x: cx, y: y },
            s: { x: cx, y: y + height },
            e: { x: x + width, y: cy },
            w: { x: x, y: cy }
        };
    };

    const getPath = (startEl: SlideElement, endEl: SlideElement) => {
        // Simple heuristic: find the pair of anchors with minimum distance
        const startAnchors = getAnchorPoints(startEl);
        const endAnchors = getAnchorPoints(endEl);

        let minDist = Infinity;
        let p1 = { x: 0, y: 0 };
        let p2 = { x: 0, y: 0 };
        let startDir = 'n';
        let endDir = 'n';

        Object.entries(startAnchors).forEach(([dir1, pt1]) => {
            Object.entries(endAnchors).forEach(([dir2, pt2]) => {
                const dist = Math.hypot(pt1.x - pt2.x, pt1.y - pt2.y);
                if (dist < minDist) {
                    minDist = dist;
                    p1 = pt1;
                    p2 = pt2;
                    startDir = dir1;
                    endDir = dir2;
                }
            });
        });

        // Create an "elbow" path
        // For simplicity: Start -> Mid -> End
        // Better: Start -> Control1 -> Control2 -> End

        const dx = p2.x - p1.x;
        const dy = p2.y - p1.y;

        // Path logic can be improved. For now, a simple cubic bezier or step line.
        // Let's try a step line (Manhattan).

        // Simple step logic
        let d = `M ${p1.x} ${p1.y}`;

        // Decide horizontal or vertical first based on directions
        // If coming out of E/W, go horizontal first.
        // If coming out of N/S, go vertical first.

        // Default simplistic approach for now:
        // Move out a bit, then turn.

        // We'll use a bezier for smooth "snake" look like the user image.
        // C cp1x cp1y, cp2x, cp2y, endx, endy

        // Control points should extend from the anchor direction
        const curveStrength = Math.min(Math.abs(dx), Math.abs(dy)) * 0.5 + 50;

        // Helper to get control offset
        const getOffset = (dir: string) => {
            if (dir === 'n') return { x: 0, y: -curveStrength };
            if (dir === 's') return { x: 0, y: curveStrength };
            if (dir === 'e') return { x: curveStrength, y: 0 };
            return { x: -curveStrength, y: 0 }; // w
        };

        const off1 = getOffset(startDir);
        const off2 = getOffset(endDir);

        const cp1 = { x: p1.x + off1.x, y: p1.y + off1.y };
        const cp2 = { x: p2.x + off2.x, y: p2.y + off2.y };

        // Actually, for end point we want connection entering, so control point should be 'out' from the anchor?
        // No, standard bezier is P1 -> CP1 ... CP2 -> P2.
        // If P2 is 'west' side, vector points OUT West. The curve approaches from West.
        // So CP2 should be P2 + (Vector OUT West).
        // Yes, getOffset returns vector OUT from the anchor.

        d += ` C ${cp1.x} ${cp1.y}, ${cp2.x} ${cp2.y}, ${p2.x} ${p2.y}`;

        return d;
    };

    return (
        <svg className="absolute inset-0 w-full h-full pointer-events-none z-0 overflow-visible">
            <defs>
                <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
                    <polygon points="0 0, 10 3.5, 0 7" fill="#000" />
                </marker>
            </defs>
            {connections.map(conn => {
                const startEl = elements.find(e => e.id === conn.startElementId);
                const endEl = elements.find(e => e.id === conn.endElementId);
                if (!startEl || !endEl) return null;

                const pathD = getPath(startEl, endEl);

                return (
                    <g key={conn.id}>
                        <path
                            d={pathD}
                            stroke="black"
                            strokeWidth="4"
                            fill="none"
                            markerEnd="url(#arrowhead)"
                        />
                        {/* White stroke outline relative to bg? Optional. */}
                        {/*                      <path 
                            d={pathD} 
                            stroke="white"
                            strokeWidth="2" 
                            fill="none" 
                        />*/}
                    </g>
                );
            })}
        </svg>
    );
};

export default ConnectorRenderer;
