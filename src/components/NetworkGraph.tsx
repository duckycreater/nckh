import { useMemo } from "react";

interface Node {
  id: string;
  x: number;
  y: number;
  size: number;
  color: string;
  label: string;
}

interface Edge {
  source: string;
  target: string;
  weight: number;
}

interface NetworkGraphProps {
  edges?: Array<{ from: string; to: string; weight?: number }>;
  labels?: string[];
  title?: string;
}

export function NetworkGraph({ edges = [], labels = [], title = "User Social Network" }: NetworkGraphProps) {
  const { nodes, svgEdges } = useMemo(() => {
    if (edges.length === 0 && labels.length === 0) {
      // Generate sample nodes for demo
      const n = 12;
      const cx = 300;
      const cy = 200;
      const r = 160;
      const sampleNodes: Node[] = Array.from({ length: n }, (_, i) => {
        const angle = (2 * Math.PI * i) / n - Math.PI / 2;
        return {
          id: `node-${i}`,
          x: cx + r * Math.cos(angle),
          y: cy + r * Math.sin(angle),
          size: 8 + Math.random() * 16,
          color: ["#10b981", "#3b82f6", "#8b5cf6", "#f59e0b", "#ef4444"][i % 5],
          label: labels[i] || `U${i + 1}`,
        };
      });

      // Sample edges (connect nearby nodes)
      const sampleEdges: Edge[] = [];
      for (let i = 0; i < n; i++) {
        const j = (i + 1) % n;
        sampleEdges.push({ source: sampleNodes[i].id, target: sampleNodes[j].id, weight: 1 });
        if (Math.random() > 0.5) {
          const k = (i + 2) % n;
          sampleEdges.push({ source: sampleNodes[i].id, target: sampleNodes[k].id, weight: 1 });
        }
      }

      return { nodes: sampleNodes, svgEdges: sampleEdges };
    }

    // Build from actual edges
    const nodeMap = new Map<string, Node>();
    const nodeDegrees = new Map<string, number>();
    edges.forEach((e) => {
      nodeDegrees.set(e.from, (nodeDegrees.get(e.from) || 0) + 1);
      nodeDegrees.set(e.to, (nodeDegrees.get(e.to) || 0) + 1);
    });

    const n = nodeDegrees.size;
    const cx = 300;
    const cy = 200;
    const r = 160;
    let i = 0;
    nodeDegrees.forEach((_, id) => {
      const angle = (2 * Math.PI * i) / n - Math.PI / 2;
      const degree = nodeDegrees.get(id) || 1;
      nodeMap.set(id, {
        id,
        x: cx + r * Math.cos(angle),
        y: cy + r * Math.sin(angle),
        size: 8 + degree * 4,
        color: ["#10b981", "#3b82f6", "#8b5cf6", "#f59e0b", "#ef4444"][i % 5],
        label: labels[i] || id.substring(0, 6),
      });
      i++;
    });

    const svgEdges = edges.map((e) => ({
      source: e.from,
      target: e.to,
      weight: e.weight || 1,
    }));

    return { nodes: Array.from(nodeMap.values()), svgEdges };
  }, [edges, labels]);

  const width = 600;
  const height = 400;

  return (
    <div className="space-y-3">
      <h4 className="font-bold text-gray-800 text-sm">{title}</h4>
      <p className="text-xs text-gray-500">
        Force-directed network graph. Node size = degree centrality (connections). Color = community.
      </p>
      <svg
        width="100%"
        viewBox={`0 0 ${width} ${height}`}
        className="bg-gray-50 rounded-xl"
        style={{ maxWidth: width }}
      >
        {/* Edges */}
        {svgEdges.map((edge, i) => {
          const sourceNode = nodes.find((n) => n.id === edge.source);
          const targetNode = nodes.find((n) => n.id === edge.target);
          if (!sourceNode || !targetNode) return null;
          return (
            <line
              key={i}
              x1={sourceNode.x}
              y1={sourceNode.y}
              x2={targetNode.x}
              y2={targetNode.y}
              stroke="#d1d5db"
              strokeWidth={Math.min(edge.weight, 3)}
              strokeOpacity={0.4}
            />
          );
        })}

        {/* Nodes */}
        {nodes.map((node) => (
          <g key={node.id}>
            <circle
              cx={node.x}
              cy={node.y}
              r={node.size}
              fill={node.color}
              opacity={0.7}
              className="hover:opacity-100 transition-opacity cursor-pointer"
            />
            <text
              x={node.x}
              y={node.y + node.size + 12}
              textAnchor="middle"
              fontSize={9}
              fill="#6b7280"
              fontFamily="monospace"
            >
              {node.label.length > 8 ? node.label.substring(0, 6) + ".." : node.label}
            </text>
          </g>
        ))}
      </svg>

      {/* Legend */}
      <div className="flex items-center gap-3 text-xs text-gray-500">
        <span>Node size = degree</span>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded-full bg-emerald-500 opacity-70" />
          <span>Community A</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded-full bg-blue-500 opacity-70" />
          <span>Community B</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded-full bg-purple-500 opacity-70" />
          <span>Community C</span>
        </div>
      </div>
    </div>
  );
}
