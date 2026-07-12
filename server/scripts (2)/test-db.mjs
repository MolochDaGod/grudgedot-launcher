import 'dotenv/config';
import pg from 'postgres';

const sql = pg(process.env.DATABASE_URL);

try {
  const result = await sql`SELECT 1 as ok`;
  console.log('✅ DB connected:', result[0]);
} catch (e) {
  console.error('❌ DB error:', e.message);
} finally {
  await sql.end();
  process.exit(0);
}
