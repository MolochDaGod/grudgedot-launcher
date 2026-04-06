/**
 * Grudge Playground Editor Redirect System
 * 
 * Maps GDevelopAssistant editor pages to their superior Playground equivalents.
 * These editors have been consolidated into Grudge Playground as the single
 * canonical editor for the Grudge Studio ecosystem.
 * 
 * Usage: Import and call getPlaygroundUrl() to check if a page should redirect.
 */

const PLAYGROUND_BASE = 'https://molochdagod.github.io/Grudge-PlayGround'

export const EDITOR_REDIRECTS: Record<string, { url: string; label: string; description: string }> = {
  '/model-viewer': {
    url: `${PLAYGROUND_BASE}/viewer.html`,
    label: 'Model Viewer',
    description: 'View and inspect 3D models with animation support',
  },
  '/character-editor': {
    url: `${PLAYGROUND_BASE}/character-builder.html`,
    label: 'Character Builder',
    description: 'Create and customize 3D characters with modular parts',
  },
  '/skill-tree-editor': {
    url: `${PLAYGROUND_BASE}/skill-tree.html`,
    label: 'Skill Tree Editor',
    description: 'Design character progression with unlockable abilities',
  },
  '/map-editor': {
    url: `${PLAYGROUND_BASE}/`,
    label: 'World Builder',
    description: '3D scene editor with terrain sculpting, AI biome generation, and object placement',
  },
  '/rts-map-editor': {
    url: `${PLAYGROUND_BASE}/`,
    label: 'World Builder',
    description: 'Full 3D world builder (replaces RTS map editor)',
  },
  '/rts-scene-editor': {
    url: `${PLAYGROUND_BASE}/`,
    label: 'World Builder',
    description: 'Full 3D world builder (replaces RTS scene editor)',
  },
  '/rts-builder': {
    url: `${PLAYGROUND_BASE}/`,
    label: 'World Builder',
    description: 'Full 3D world builder (replaces RTS builder)',
  },
}

/**
 * Check if a route should redirect to Playground.
 * Returns the redirect info or null if no redirect needed.
 */
export function getPlaygroundRedirect(path: string) {
  return EDITOR_REDIRECTS[path] || null
}

/**
 * Get all available Playground editor links for display in navigation.
 */
export function getPlaygroundEditorLinks() {
  return Object.entries(EDITOR_REDIRECTS).map(([route, info]) => ({
    route,
    ...info,
  }))
}

/**
 * Get the base URL for the Playground deployment.
 */
export function getPlaygroundBaseUrl() {
  return PLAYGROUND_BASE
}
