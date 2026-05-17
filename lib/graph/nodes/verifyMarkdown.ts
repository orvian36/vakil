import { verifyMarkdown } from "@/utils/verify_markdown";
import { preProcessMD } from "@/utils/remarkFixVoidTags";
import type { SingleDocStateType } from "../state";

export async function verifyMarkdownNode(
  state: SingleDocStateType,
): Promise<Partial<SingleDocStateType>> {
  if (!state.content) return { valid: false };
  const cleaned = await preProcessMD(state.content);
  const ok = verifyMarkdown(cleaned);
  return { content: cleaned, valid: ok };
}
