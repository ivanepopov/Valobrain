import { useEffect, useState } from "react";

type Node = {
    id: number;
    x: number;
    y: number;
    vx: number;
    vy: number;
};

type NeuralNetworkBackgroundProps = {
    nodeCount?: number;
    connectionDistance?: number; // in "percent space" (0..100)
    intervalMs?: number;
    className?: string;
};

const NeuralNetworkBackground = ({
                                     nodeCount = 30,
                                     connectionDistance = 20,
                                     intervalMs = 50,
                                     className = "absolute inset-0 w-full h-full opacity-30 pointer-events-none",
                                 }: NeuralNetworkBackgroundProps) => {
    const [nodes, setNodes] = useState<Node[]>([]);

    useEffect(() => {
        const initialNodes: Node[] = Array.from({ length: nodeCount }, (_, i) => ({
            id: i,
            x: Math.random() * 100,
            y: Math.random() * 100,
            vx: (Math.random() - 0.5) * 0.1,
            vy: (Math.random() - 0.5) * 0.1,
        }));
        setNodes(initialNodes);

        const interval = setInterval(() => {
            setNodes((prev) =>
                prev.map((node) => {
                    let newX = node.x + node.vx;
                    let newY = node.y + node.vy;
                    let newVx = node.vx;
                    let newVy = node.vy;

                    // Bounce off edges
                    if (newX <= 0 || newX >= 100) newVx = -node.vx;
                    if (newY <= 0 || newY >= 100) newVy = -node.vy;

                    newX = Math.max(0, Math.min(100, newX));
                    newY = Math.max(0, Math.min(100, newY));

                    return { ...node, x: newX, y: newY, vx: newVx, vy: newVy };
                }),
            );
        }, intervalMs);

        return () => clearInterval(interval);
    }, [intervalMs, nodeCount]);

    return (
        <svg className={className}>
            <defs>
                <filter id="glow">
                    <feGaussianBlur stdDeviation="3" result="coloredBlur" />
                    <feMerge>
                        <feMergeNode in="coloredBlur" />
                        <feMergeNode in="SourceGraphic" />
                    </feMerge>
                </filter>
            </defs>

            {/* Draw connections */}
            {nodes.map((node, i) =>
                nodes.slice(i + 1).map((otherNode, j) => {
                    const distance = Math.sqrt(
                        Math.pow(node.x - otherNode.x, 2) + Math.pow(node.y - otherNode.y, 2),
                    );

                    if (distance < connectionDistance) {
                        return (
                            <line
                                key={`${i}-${j}`}
                                x1={`${node.x}%`}
                                y1={`${node.y}%`}
                                x2={`${otherNode.x}%`}
                                y2={`${otherNode.y}%`}
                                stroke="#3b82f6"
                                strokeWidth="1"
                                opacity={1 - distance / connectionDistance}
                                filter="url(#glow)"
                            />
                        );
                    }
                    return null;
                }),
            )}

            {/* Draw nodes */}
            {nodes.map((node) => (
                <circle
                    key={node.id}
                    cx={`${node.x}%`}
                    cy={`${node.y}%`}
                    r="3"
                    fill="#60a5fa"
                    filter="url(#glow)"
                />
            ))}
        </svg>
    );
};

export default NeuralNetworkBackground;