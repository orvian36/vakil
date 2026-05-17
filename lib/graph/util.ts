import { promises as fs } from "node:fs";
import path from "node:path";

export async function loadPrompt(filename: string): Promise<string> {
  return fs.readFile(path.join(process.cwd(), "lib", "prompts", filename), "utf-8");
}

export function stripCodeFence(s: string): string {
  return s
    .trim()
    .replace(/^```(?:markdown|json|md)?\n?/, "")
    .replace(/\n```$/, "");
}
