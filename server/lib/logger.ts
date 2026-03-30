/**
 * Simple structured logger for server-side AI services.
 * Wraps console methods with optional metadata context.
 */

function formatMeta(meta?: Record<string, any>): string {
  if (!meta || Object.keys(meta).length === 0) return '';
  try {
    return ' ' + JSON.stringify(meta);
  } catch {
    return '';
  }
}

function createLogger(prefix: string) {
  return {
    info(meta: Record<string, any> | string, msg?: string) {
      if (typeof meta === 'string') {
        console.log(`[${prefix}] ${meta}`);
      } else {
        console.log(`[${prefix}] ${msg || ''}${formatMeta(meta)}`);
      }
    },
    warn(meta: Record<string, any> | string, msg?: string) {
      if (typeof meta === 'string') {
        console.warn(`[${prefix}] ${meta}`);
      } else {
        console.warn(`[${prefix}] ${msg || ''}${formatMeta(meta)}`);
      }
    },
    error(meta: Record<string, any> | string, msg?: string) {
      if (typeof meta === 'string') {
        console.error(`[${prefix}] ${meta}`);
      } else {
        console.error(`[${prefix}] ${msg || ''}${formatMeta(meta)}`);
      }
    },
    debug(meta: Record<string, any> | string, msg?: string) {
      if (process.env.NODE_ENV !== 'production') {
        if (typeof meta === 'string') {
          console.debug(`[${prefix}] ${meta}`);
        } else {
          console.debug(`[${prefix}] ${msg || ''}${formatMeta(meta)}`);
        }
      }
    },
  };
}

export const aiLogger = createLogger('ai');
export const logger = createLogger('server');
export default logger;
