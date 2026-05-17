import { StateGraph, END, START } from "@langchain/langgraph";
import { SingleDocState } from "../state";
import { generateParticulars } from "../nodes/generateParticulars";
import { verifyMarkdownNode } from "../nodes/verifyMarkdown";
import { saveSocFieldFactory } from "../nodes/saveSocField";

const MAX_ATTEMPTS = 3;

export const particularsGraph = new StateGraph(SingleDocState)
  .addNode("generate", generateParticulars)
  .addNode("verify", verifyMarkdownNode)
  .addNode("save", saveSocFieldFactory("particularsMarkdown"))
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
