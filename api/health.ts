// Standalone health check — ZERO imports so Vercel can compile this independently
export default function handler(_req: any, res: any) {
  res.status(200).json({
    status: 'healthy',
    service: 'GDevelop Assistant',
    timestamp: new Date().toISOString(),
    runtime: process.version,
    env: {
      hasDatabase: !!process.env.DATABASE_URL,
      hasSessionSecret: !!process.env.SESSION_SECRET,
      hasSupabase: !!process.env.db_SUPABASE_URL,
      nodeEnv: process.env.NODE_ENV || 'not-set',
    },
  });
}
