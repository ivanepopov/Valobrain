import { useState, useEffect } from 'react';

interface Node {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
}

const NeuralBackground = () => {
  const [nodes, setNodes] = useState<Node[]>([]);

  useEffect(() => {
    const initialNodes: Node[] = Array.from({ length: 30 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      vx: (Math.random() - 0.5) * 0.1,
      vy: (Math.random() - 0.5) * 0.1,
    }));
    setNodes(initialNodes);

    const interval = setInterval(() => {
      setNodes(prev => prev.map(node => {
        let newX = node.x + node.vx;
        let newY = node.y + node.vy;
        let newVx = node.vx;
        let newVy = node.vy;

        if (newX <= 0 || newX >= 100) newVx = -node.vx;
        if (newY <= 0 || newY >= 100) newVy = -node.vy;

        newX = Math.max(0, Math.min(100, newX));
        newY = Math.max(0, Math.min(100, newY));

        return { ...node, x: newX, y: newY, vx: newVx, vy: newVy };
      }));
    }, 50);

    return () => clearInterval(interval);
  }, []);

  return (
    <svg className="absolute inset-0 w-full h-full opacity-30 pointer-events-none">
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
            Math.pow(node.x - otherNode.x, 2) + Math.pow(node.y - otherNode.y, 2)
          );
          if (distance < 20) {
            return (
              <line
                key={`${i}-${j}`}
                x1={`${node.x}%`}
                y1={`${node.y}%`}
                x2={`${otherNode.x}%`}
                y2={`${otherNode.y}%`}
                stroke="#3b82f6"
                strokeWidth="1"
                opacity={1 - distance / 20}
                filter="url(#glow)"
              />
            );
          }
          return null;
        })
      )}
      
      {/* Draw nodes */}
      {nodes.map(node => (
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

export default NeuralBackground;
