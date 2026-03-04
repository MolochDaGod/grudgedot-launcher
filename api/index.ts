/**
 * DIAGNOSTIC BUILD — import one module at a time to find the crash.
 * Once identified, the full Express app will be restored.
 */
import { log } from "../server/serverUtils";
import express from "express";

log("Minimal imports loaded OK");

export default function handler(_req: any, res: any) {
  res.status(200).json({
    ok: true,
    imports: ["serverUtils", "express"],
  });
}
