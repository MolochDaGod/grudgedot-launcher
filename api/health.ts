// Standalone health check — ZERO imports so Vercel can compile this independently
export default function handler(_req: any, res: any) {
  res.status(200).json({
    status: 'healthy',
    service: 'GDevelop Assistant',
    timestamp: new Date().toISOString(),
    runtime: process.version,
    env: {
      grudgeBackend: process.env.GRUDGE_BACKEND_URL || 'https://api.grudge-studio.com',
      hasSessionSecret: !!process.env.SESSION_SECRET,
      hasXaiKey: !!process.env.XAI_API_KEY,
      nodeEnv: process.env.NODE_ENV || 'not-set',
    },
  });
}
