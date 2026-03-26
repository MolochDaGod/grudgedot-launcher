/**
 * RTS Interaction State Machine
 * Modeled after Island Warfare RTS Testbed:
 *   Select mode (default) → click select, drag box-select
 *   Move mode (M)         → click ground = move, enemy hover = blocked
 *   Attack mode (A)       → click enemy = attack, enemy hover = red ring
 *   ESC = back to select
 */

export type InteractionMode = 'select' | 'move' | 'attack' | 'build';

export interface RTSEntity {
  id: string;
  name: string;
  kind: 'unit' | 'building' | 'resource';
  team: 'player' | 'enemy' | 'neutral';
  hp: number;
  maxHp: number;
  armor: number;
  damage: string;
  xp?: number;
  maxXp?: number;
  level?: number;
  position: { x: number; y: number; z: number };
  commands: string[];
  modelPath?: string;
  iconEmoji?: string;
  selected?: boolean;
}

export interface LogEntry {
  text: string;
  tone: 'neutral' | 'warn' | 'danger' | 'success';
  time: number;
}

export interface InteractionState {
  mode: InteractionMode;
  selectedIds: string[];
  hoverEntityId: string | null;
  isDragging: boolean;
  dragStart: { x: number; y: number } | null;
  dragEnd: { x: number; y: number } | null;
  log: LogEntry[];
  resources: { gold: number; wood: number; food: number; maxFood: number };
  buildingType?: string;
}

export function createInitialState(): InteractionState {
  return {
    mode: 'select',
    selectedIds: [],
    hoverEntityId: null,
    isDragging: false,
    dragStart: null,
    dragEnd: null,
    log: [],
    resources: { gold: 1500, wood: 400, food: 15, maxFood: 50 },
  };
}

export function addLog(state: InteractionState, text: string, tone: LogEntry['tone'] = 'neutral'): InteractionState {
  const entry: LogEntry = { text, tone, time: Date.now() };
  return { ...state, log: [entry, ...state.log].slice(0, 20) };
}

export function setMode(state: InteractionState, mode: InteractionMode): InteractionState {
  return addLog({ ...state, mode, buildingType: mode === 'build' ? state.buildingType : undefined },
    `Mode: ${mode.charAt(0).toUpperCase() + mode.slice(1)}`);
}

export function selectSingle(state: InteractionState, id: string): InteractionState {
  return { ...state, selectedIds: [id] };
}

export function selectMany(state: InteractionState, ids: string[]): InteractionState {
  return addLog({ ...state, selectedIds: ids },
    `Box-selected ${ids.length} unit${ids.length > 1 ? 's' : ''}.`);
}

export function addToSelection(state: InteractionState, id: string): InteractionState {
  if (state.selectedIds.includes(id)) return state;
  return { ...state, selectedIds: [...state.selectedIds, id] };
}

export function clearSelection(state: InteractionState): InteractionState {
  return { ...state, selectedIds: [], hoverEntityId: null };
}

export function setHover(state: InteractionState, entityId: string | null): InteractionState {
  return { ...state, hoverEntityId: entityId };
}

export function startDrag(state: InteractionState, x: number, y: number): InteractionState {
  return { ...state, isDragging: true, dragStart: { x, y }, dragEnd: { x, y } };
}

export function updateDrag(state: InteractionState, x: number, y: number): InteractionState {
  if (!state.isDragging) return state;
  return { ...state, dragEnd: { x, y } };
}

export function endDrag(state: InteractionState): InteractionState {
  return { ...state, isDragging: false, dragStart: null, dragEnd: null };
}

/** Get cursor CSS class based on mode + hover state */
export function getCursorClass(state: InteractionState, entities: RTSEntity[]): string {
  const hovered = entities.find(e => e.id === state.hoverEntityId);
  const isEnemy = hovered?.team === 'enemy';

  switch (state.mode) {
    case 'move':
      return isEnemy ? 'cursor-not-allowed' : 'cursor-cell';
    case 'attack':
      return 'cursor-crosshair';
    case 'build':
      return 'cursor-copy';
    default:
      return 'cursor-default';
  }
}

/** Get commands available for current selection */
export function getCommands(state: InteractionState, entities: RTSEntity[]): { label: string; key: string; active: boolean }[] {
  const selected = entities.filter(e => state.selectedIds.includes(e.id));

  if (!selected.length) {
    return [
      { label: 'Move', key: 'M', active: state.mode === 'move' },
      { label: 'Attack', key: 'A', active: state.mode === 'attack' },
      { label: 'Stop', key: 'S', active: false },
      { label: 'Reset', key: 'R', active: false },
    ];
  }

  if (selected.length === 1 && selected[0].kind === 'building') {
    return [
      { label: 'Build', key: 'B', active: state.mode === 'build' },
      { label: 'Upgrade', key: 'U', active: false },
      { label: 'Rally', key: 'RMB', active: false },
      { label: 'Back', key: 'Esc', active: false },
    ];
  }

  return [
    { label: 'Move', key: 'M', active: state.mode === 'move' },
    { label: 'Attack', key: 'A', active: state.mode === 'attack' },
    { label: 'Hold', key: 'H', active: false },
    { label: 'Stop', key: 'S', active: false },
    { label: 'Build', key: 'B', active: state.mode === 'build' },
    { label: 'Towers', key: 'T', active: false },
    { label: '', key: '', active: false },
    { label: '', key: '', active: false },
    { label: '', key: '', active: false },
    { label: '', key: '', active: false },
    { label: 'Upgrade', key: 'U', active: false },
    { label: 'Reset', key: 'R', active: false },
  ];
}

/** Handle keyboard input, return new state */
export function handleKeyDown(state: InteractionState, key: string): InteractionState {
  switch (key.toLowerCase()) {
    case 'm': return setMode(state, 'move');
    case 'a': return setMode(state, 'attack');
    case 'b': return setMode(state, 'build');
    case 'escape': return setMode(state, 'select');
    case 's': return addLog(state, 'Stop order issued.', 'neutral');
    case 'h': return addLog(state, 'Hold position.', 'neutral');
    default: return state;
  }
}

/** Get drag box rectangle for rendering */
export function getDragBox(state: InteractionState): { left: number; top: number; width: number; height: number } | null {
  if (!state.isDragging || !state.dragStart || !state.dragEnd) return null;
  return {
    left: Math.min(state.dragStart.x, state.dragEnd.x),
    top: Math.min(state.dragStart.y, state.dragEnd.y),
    width: Math.abs(state.dragEnd.x - state.dragStart.x),
    height: Math.abs(state.dragEnd.y - state.dragStart.y),
  };
}
