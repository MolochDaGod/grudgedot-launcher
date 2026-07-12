// ── Visual Game Designer Types ─────────────────────────────────────────────────

export type DesignerNodeKind = 'building' | 'unit' | 'hero' | 'upgrade' | 'spell';

export type ConnectionType =
  | 'trains'       // building → unit: this building trains this unit
  | 'requires'     // building → building: prerequisite
  | 'unlocks'      // upgrade → unit/spell: enables this after research
  | 'enables'      // building → upgrade: this building can research this
  | 'has_ability'  // hero → spell: hero owns this ability
  | 'drops'        // creep → item: drops this on death
  | 'custom';      // user-defined relationship

export const CONNECTION_COLORS: Record<ConnectionType, string> = {
  trains:      '#22c55e',  // green
  requires:    '#f59e0b',  // amber
  unlocks:     '#3b82f6',  // blue
  enables:     '#a855f7',  // purple
  has_ability: '#ec4899',  // pink
  drops:       '#f97316',  // orange
  custom:      '#71717a',  // gray
};

export const CONNECTION_LABELS: Record<ConnectionType, string> = {
  trains:      'Trains',
  requires:    'Requires',
  unlocks:     'Unlocks',
  enables:     'Enables',
  has_ability: 'Has Ability',
  drops:       'Drops',
  custom:      'Custom',
};

/** A node on the designer canvas */
export interface DesignerNode {
  id: string;
  kind: DesignerNodeKind;
  /** Display name */
  name: string;
  /** Icon: emoji, or image URL */
  icon: string;
  /** Position on canvas */
  x: number;
  y: number;
  /** Width/height for rendering */
  w: number;
  h: number;
  /** Reference to engine config key (e.g. 'barracks', 'swordsman', 'storm_bolt') */
  configKey: string;
  /** Editable stats (copied from engine config, user can override) */
  stats: Record<string, number | string>;
  /** Color accent for the node card */
  color: string;
  /** Is this node currently selected? */
  selected?: boolean;
  /** Tech tier (for buildings) */
  tier?: number;
  /** Cost */
  cost?: { gold: number; wood: number };
  /** Notes/description */
  description?: string;
}

/** A connection line between two nodes */
export interface Connection {
  id: string;
  fromNodeId: string;
  toNodeId: string;
  type: ConnectionType;
  /** Optional label override */
  label?: string;
}

/** Port position on a node (for snapping connection endpoints) */
export interface NodePort {
  nodeId: string;
  side: 'top' | 'right' | 'bottom' | 'left';
  x: number;
  y: number;
}

/** The full design document — serializable to JSON */
export interface DesignDocument {
  id: string;
  name: string;
  version: number;
  createdAt: string;
  updatedAt: string;
  nodes: DesignerNode[];
  connections: Connection[];
  /** Canvas viewport state */
  viewport: {
    panX: number;
    panY: number;
    zoom: number;
  };
}

/** Template for creating new nodes from the palette */
export interface NodeTemplate {
  configKey: string;
  kind: DesignerNodeKind;
  name: string;
  icon: string;
  color: string;
  /** Category for palette grouping */
  category: string;
  /** Default stats to populate */
  defaultStats: Record<string, number | string>;
  /** Default cost */
  defaultCost?: { gold: number; wood: number };
  /** Default tier */
  defaultTier?: number;
  /** Description */
  description?: string;
}

/** Designer tool mode */
export type DesignerTool = 'select' | 'pan' | 'connect' | 'delete';

/** Drag state for connection drawing */
export interface DragConnectionState {
  fromNodeId: string;
  fromPort: NodePort;
  mouseX: number;
  mouseY: number;
  connectionType: ConnectionType;
}

/** Designer editor state (non-serialized UI state) */
export interface DesignerEditorState {
  tool: DesignerTool;
  selectedNodeIds: Set<string>;
  selectedConnectionId: string | null;
  dragConnection: DragConnectionState | null;
  /** Node being dragged */
  draggingNodeId: string | null;
  dragOffset: { x: number; y: number };
  /** Clipboard for copy/paste */
  clipboard: DesignerNode[];
}

// ── Default dimensions ─────────────────────────────────────────────────────────
export const NODE_DEFAULTS: Record<DesignerNodeKind, { w: number; h: number; color: string }> = {
  building: { w: 140, h: 90, color: '#92400e' },
  unit:     { w: 120, h: 80, color: '#1e40af' },
  hero:     { w: 140, h: 100, color: '#7c3aed' },
  upgrade:  { w: 110, h: 70, color: '#047857' },
  spell:    { w: 110, h: 70, color: '#be123c' },
};
