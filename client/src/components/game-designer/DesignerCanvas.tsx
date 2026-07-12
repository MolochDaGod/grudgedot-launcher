import { useRef, useState, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  MousePointer2, Hand, Link2, Trash2, ZoomIn, ZoomOut, RotateCcw, Save, Download, Upload,
} from 'lucide-react';
import type {
  DesignerNode, Connection, DesignerTool, ConnectionType, DragConnectionState, DesignDocument,
} from '@/lib/rts-engine/designer-types';
import { CONNECTION_COLORS, CONNECTION_LABELS, NODE_DEFAULTS } from '@/lib/rts-engine/designer-types';

interface DesignerCanvasProps {
  nodes: DesignerNode[];
  connections: Connection[];
  onNodesChange: (nodes: DesignerNode[]) => void;
  onConnectionsChange: (conns: Connection[]) => void;
  onSelectNode: (id: string | null) => void;
  selectedNodeId: string | null;
  /** Called when user drops a node from palette */
  onDropNode?: (kind: string, x: number, y: number) => void;
}

let _uid = 1000;
const uid = () => `conn_${_uid++}`;

export function DesignerCanvas({
  nodes, connections, onNodesChange, onConnectionsChange,
  onSelectNode, selectedNodeId, onDropNode,
}: DesignerCanvasProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [tool, setTool] = useState<DesignerTool>('select');
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const [draggingNode, setDraggingNode] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [dragConn, setDragConn] = useState<{ fromId: string; mx: number; my: number; type: ConnectionType } | null>(null);
  const [connectionType, setConnectionType] = useState<ConnectionType>('trains');

  // ── Coordinate conversion ──────────────────────────────────────────────────
  const screenToCanvas = useCallback((sx: number, sy: number) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return { x: 0, y: 0 };
    return {
      x: (sx - rect.left - pan.x) / zoom,
      y: (sy - rect.top - pan.y) / zoom,
    };
  }, [pan, zoom]);

  // ── Node center ────────────────────────────────────────────────────────────
  const nodeCenter = (n: DesignerNode) => ({ x: n.x + n.w / 2, y: n.y + n.h / 2 });

  // ── Mouse handlers ─────────────────────────────────────────────────────────
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button !== 0) return;
    const { x, y } = screenToCanvas(e.clientX, e.clientY);

    if (tool === 'pan') {
      setIsPanning(true);
      setPanStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
      return;
    }

    // Check if clicking on a node
    const clicked = [...nodes].reverse().find(n => x >= n.x && x <= n.x + n.w && y >= n.y && y <= n.y + n.h);

    if (tool === 'select') {
      if (clicked) {
        onSelectNode(clicked.id);
        setDraggingNode(clicked.id);
        setDragOffset({ x: x - clicked.x, y: y - clicked.y });
      } else {
        onSelectNode(null);
      }
    }

    if (tool === 'connect' && clicked) {
      setDragConn({ fromId: clicked.id, mx: x, my: y, type: connectionType });
    }

    if (tool === 'delete' && clicked) {
      onNodesChange(nodes.filter(n => n.id !== clicked.id));
      onConnectionsChange(connections.filter(c => c.fromNodeId !== clicked.id && c.toNodeId !== clicked.id));
      onSelectNode(null);
    }
  }, [tool, nodes, pan, zoom, screenToCanvas, connectionType, connections, onNodesChange, onConnectionsChange, onSelectNode]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (isPanning) {
      setPan({ x: e.clientX - panStart.x, y: e.clientY - panStart.y });
      return;
    }

    if (draggingNode) {
      const { x, y } = screenToCanvas(e.clientX, e.clientY);
      onNodesChange(nodes.map(n =>
        n.id === draggingNode ? { ...n, x: x - dragOffset.x, y: y - dragOffset.y } : n
      ));
      return;
    }

    if (dragConn) {
      const { x, y } = screenToCanvas(e.clientX, e.clientY);
      setDragConn(prev => prev ? { ...prev, mx: x, my: y } : null);
    }
  }, [isPanning, draggingNode, dragConn, panStart, screenToCanvas, nodes, dragOffset, onNodesChange]);

  const handleMouseUp = useCallback((e: React.MouseEvent) => {
    if (isPanning) { setIsPanning(false); return; }

    if (dragConn) {
      const { x, y } = screenToCanvas(e.clientX, e.clientY);
      const target = [...nodes].reverse().find(n => x >= n.x && x <= n.x + n.w && y >= n.y && y <= n.y + n.h);
      if (target && target.id !== dragConn.fromId) {
        // Check duplicate
        const exists = connections.some(c => c.fromNodeId === dragConn.fromId && c.toNodeId === target.id && c.type === dragConn.type);
        if (!exists) {
          onConnectionsChange([...connections, { id: uid(), fromNodeId: dragConn.fromId, toNodeId: target.id, type: dragConn.type }]);
        }
      }
      setDragConn(null);
    }

    setDraggingNode(null);
  }, [isPanning, dragConn, screenToCanvas, nodes, connections, onConnectionsChange]);

  // ── Wheel zoom ─────────────────────────────────────────────────────────────
  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    setZoom(z => Math.max(0.2, Math.min(3, z * delta)));
  }, []);

  // ── Drop from palette ──────────────────────────────────────────────────────
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const kind = e.dataTransfer.getData('node-kind');
    if (kind && onDropNode) {
      const { x, y } = screenToCanvas(e.clientX, e.clientY);
      onDropNode(kind, x, y);
    }
  }, [screenToCanvas, onDropNode]);

  const handleDragOver = useCallback((e: React.DragEvent) => { e.preventDefault(); }, []);

  // ── Connection line path ───────────────────────────────────────────────────
  const connPath = (from: { x: number; y: number }, to: { x: number; y: number }) => {
    const dx = to.x - from.x;
    const cp = Math.abs(dx) * 0.4;
    return `M ${from.x} ${from.y} C ${from.x + cp} ${from.y}, ${to.x - cp} ${to.y}, ${to.x} ${to.y}`;
  };

  // ── Delete connection on click ─────────────────────────────────────────────
  const handleConnClick = (connId: string) => {
    if (tool === 'delete') {
      onConnectionsChange(connections.filter(c => c.id !== connId));
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="flex items-center gap-1 p-2 bg-zinc-900 border-b border-zinc-700">
        <div className="flex gap-1 mr-4">
          {([
            ['select', MousePointer2, 'Select'],
            ['pan', Hand, 'Pan'],
            ['connect', Link2, 'Connect'],
            ['delete', Trash2, 'Delete'],
          ] as const).map(([t, Icon, label]) => (
            <Button key={t} size="sm" variant={tool === t ? 'default' : 'ghost'}
              onClick={() => setTool(t)} title={label}>
              <Icon className="h-4 w-4" />
            </Button>
          ))}
        </div>

        {tool === 'connect' && (
          <div className="flex gap-1 mr-4">
            {(['trains', 'requires', 'unlocks', 'enables', 'has_ability'] as ConnectionType[]).map(ct => (
              <Button key={ct} size="sm" variant={connectionType === ct ? 'default' : 'outline'}
                onClick={() => setConnectionType(ct)}
                style={{ borderColor: CONNECTION_COLORS[ct], color: connectionType === ct ? '#fff' : CONNECTION_COLORS[ct] }}>
                {CONNECTION_LABELS[ct]}
              </Button>
            ))}
          </div>
        )}

        <div className="flex gap-1 mr-4">
          <Button size="sm" variant="ghost" onClick={() => setZoom(z => Math.min(3, z * 1.2))}><ZoomIn className="h-4 w-4" /></Button>
          <Button size="sm" variant="ghost" onClick={() => setZoom(z => Math.max(0.2, z / 1.2))}><ZoomOut className="h-4 w-4" /></Button>
          <Button size="sm" variant="ghost" onClick={() => { setPan({ x: 0, y: 0 }); setZoom(1); }}><RotateCcw className="h-4 w-4" /></Button>
        </div>

        <Badge variant="secondary" className="text-xs mr-2">
          {nodes.length} nodes · {connections.length} connections
        </Badge>
        <Badge variant="outline" className="text-xs">
          Zoom: {Math.round(zoom * 100)}%
        </Badge>
      </div>

      {/* Canvas */}
      <div ref={containerRef} className="flex-1 overflow-hidden bg-zinc-950 relative cursor-crosshair"
        onMouseDown={handleMouseDown} onMouseMove={handleMouseMove} onMouseUp={handleMouseUp}
        onWheel={handleWheel} onDrop={handleDrop} onDragOver={handleDragOver}
        style={{ cursor: tool === 'pan' ? (isPanning ? 'grabbing' : 'grab') : tool === 'connect' ? 'crosshair' : 'default' }}
      >
        <svg ref={svgRef} className="absolute inset-0 w-full h-full" style={{ pointerEvents: 'none' }}>
          <g transform={`translate(${pan.x}, ${pan.y}) scale(${zoom})`}>
            {/* Grid */}
            <defs>
              <pattern id="grid" width="60" height="60" patternUnits="userSpaceOnUse">
                <path d="M 60 0 L 0 0 0 60" fill="none" stroke="#27272a" strokeWidth="0.5" />
              </pattern>
              <pattern id="gridLg" width="300" height="300" patternUnits="userSpaceOnUse">
                <path d="M 300 0 L 0 0 0 300" fill="none" stroke="#3f3f46" strokeWidth="0.5" />
              </pattern>
            </defs>
            <rect x="-5000" y="-5000" width="10000" height="10000" fill="url(#grid)" />
            <rect x="-5000" y="-5000" width="10000" height="10000" fill="url(#gridLg)" />

            {/* Connection lines */}
            {connections.map(c => {
              const from = nodes.find(n => n.id === c.fromNodeId);
              const to = nodes.find(n => n.id === c.toNodeId);
              if (!from || !to) return null;
              const fc = nodeCenter(from);
              const tc = nodeCenter(to);
              return (
                <g key={c.id} style={{ pointerEvents: 'all', cursor: tool === 'delete' ? 'pointer' : 'default' }}
                  onClick={() => handleConnClick(c.id)}>
                  <path d={connPath(fc, tc)} fill="none" stroke={CONNECTION_COLORS[c.type]} strokeWidth={2.5}
                    strokeDasharray={c.type === 'requires' ? '8,4' : undefined} opacity={0.8} />
                  {/* Arrow head */}
                  <circle cx={tc.x} cy={tc.y} r={5} fill={CONNECTION_COLORS[c.type]} />
                  {/* Label at midpoint */}
                  <text x={(fc.x + tc.x) / 2} y={(fc.y + tc.y) / 2 - 8}
                    fill={CONNECTION_COLORS[c.type]} fontSize={10} textAnchor="middle" fontWeight="bold">
                    {c.label ?? CONNECTION_LABELS[c.type]}
                  </text>
                </g>
              );
            })}

            {/* Drag connection preview */}
            {dragConn && (() => {
              const from = nodes.find(n => n.id === dragConn.fromId);
              if (!from) return null;
              const fc = nodeCenter(from);
              return (
                <path d={connPath(fc, { x: dragConn.mx, y: dragConn.my })}
                  fill="none" stroke={CONNECTION_COLORS[dragConn.type]} strokeWidth={2} strokeDasharray="6,3" opacity={0.6} />
              );
            })()}

            {/* Nodes */}
            {nodes.map(node => (
              <g key={node.id} style={{ pointerEvents: 'all' }}>
                {/* Card background */}
                <rect x={node.x} y={node.y} width={node.w} height={node.h} rx={8}
                  fill={node.id === selectedNodeId ? '#1c1c2e' : '#18181b'}
                  stroke={node.id === selectedNodeId ? '#6366f1' : node.color} strokeWidth={node.id === selectedNodeId ? 2.5 : 1.5}
                />
                {/* Color accent bar */}
                <rect x={node.x} y={node.y} width={node.w} height={6} rx={8}
                  fill={node.color} />
                <rect x={node.x} y={node.y + 3} width={node.w} height={3}
                  fill={node.color} />
                {/* Kind badge */}
                <rect x={node.x + 4} y={node.y + 10} width={node.kind.length * 7 + 8} height={16} rx={4}
                  fill={node.color} opacity={0.3} />
                <text x={node.x + 8} y={node.y + 22} fill={node.color} fontSize={9} fontWeight="bold"
                  style={{ textTransform: 'uppercase' } as React.CSSProperties}>
                  {node.kind}
                </text>
                {/* Icon */}
                <text x={node.x + node.w - 30} y={node.y + 30} fontSize={22} textAnchor="middle">
                  {node.icon}
                </text>
                {/* Name */}
                <text x={node.x + 8} y={node.y + 42} fill="#e4e4e7" fontSize={12} fontWeight="bold">
                  {node.name}
                </text>
                {/* Stats preview */}
                {node.stats.hp !== undefined && (
                  <text x={node.x + 8} y={node.y + 56} fill="#a1a1aa" fontSize={9}>
                    HP:{node.stats.hp} DMG:{node.stats.damage ?? '—'} ARM:{node.stats.armor ?? '—'}
                  </text>
                )}
                {/* Cost */}
                {node.cost && (
                  <text x={node.x + 8} y={node.y + 68} fill="#fbbf24" fontSize={9}>
                    🪙{node.cost.gold} 🪵{node.cost.wood}
                  </text>
                )}
                {/* Tier badge */}
                {node.tier && (
                  <text x={node.x + node.w - 12} y={node.y + node.h - 8} fill="#71717a" fontSize={9} textAnchor="end">
                    T{node.tier}
                  </text>
                )}
                {/* Connection ports (small circles) */}
                {['top', 'right', 'bottom', 'left'].map(side => {
                  const cx = side === 'left' ? node.x : side === 'right' ? node.x + node.w : node.x + node.w / 2;
                  const cy = side === 'top' ? node.y : side === 'bottom' ? node.y + node.h : node.y + node.h / 2;
                  return (
                    <circle key={side} cx={cx} cy={cy} r={4}
                      fill="#3f3f46" stroke="#71717a" strokeWidth={1}
                      opacity={tool === 'connect' ? 0.8 : 0.2} />
                  );
                })}
              </g>
            ))}
          </g>
        </svg>
      </div>
    </div>
  );
}
