// Diagnostic: dynamically imports each server dependency to isolate the crash
export default async function handler(_req: any, res: any) {
  const results: string[] = [];

  const test = async (name: string, fn: () => Promise<any>) => {
    try {
      await fn();
      results.push(`✅ ${name}`);
    } catch (e: any) {
      results.push(`❌ ${name}: ${e.message}`);
    }
  };

  await test("dotenv", () => import("dotenv"));
  await test("express", () => import("express"));
  await test("serverUtils", () => import("../server/serverUtils"));
  await test("db", () => import("../server/db"));
  await test("storage", () => import("../server/storage"));
  await test("grudgeAuth", () => import("../server/grudgeAuth"));
  await test("routes", () => import("../server/routes"));

  res.status(200).json({ imports: results, runtime: process.version });
}
