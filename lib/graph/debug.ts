import { promises as fs } from "node:fs";
import path from "node:path";

const DEBUG_DIR = path.join(process.cwd(), "lib", "graph", "debug");

export async function writeDebugOutput(
  nodeName: string,
  output: unknown,
  metadata: Record<string, unknown> = {},
): Promise<void> {
  try {
    await fs.mkdir(DEBUG_DIR, { recursive: true });
    const stamp = new Date().toISOString().replace(/[:.]/g, "-");
    const file = path.join(DEBUG_DIR, `${nodeName}_${stamp}.json`);
    const body = JSON.stringify(
      { nodeName, timestamp: new Date().toISOString(), metadata, output },
      null,
      2,
    );
    await fs.writeFile(file, body, "utf-8");
  } catch (err) {
    console.error(`[graph:debug] failed to write ${nodeName}:`, err);
  }
}
