import { StateGraph, END, START } from "@langchain/langgraph";
import { SingleDocState } from "../state";
import { generateChronology } from "../nodes/generateChronology";
import { verifyMarkdownNode } from "../nodes/verifyMarkdown";
import { saveSocFieldFactory } from "../nodes/saveSocField";

const MAX_ATTEMPTS = 3;

export const chronologyGraph = new StateGraph(SingleDocState)
  .addNode("generate", generateChronology)
  .addNode("verify", verifyMarkdownNode)
  .addNode("save", saveSocFieldFactory("chronologyMarkdown"))
  .addEdge(START, "generate")
  .addEdge("generate", "verify")
  .addConditionalEdges(
    "verify",
    (s) => {
      if (s.valid) return "save";
      if (s.attempts >= MAX_ATTEMPTS) return END;
      return "generate";
    },
    { save: "save", generate: "generate", [END]: END },
  )
  .addEdge("save", END)
  .compile();
