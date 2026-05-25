import { StateGraph, END, START } from "@langchain/langgraph";
import { DocumentsState } from "../state";
import { fetchContext } from "../nodes/fetchContext";
import { fetchWritOfSummonsFiles } from "../nodes/fetchWritOfSummonsFiles";
import { generateWritOfSummons } from "../nodes/generateWritOfSummons";
import { generateWitnessStatement } from "../nodes/generateWitnessStatement";
import { generateStatementOfClaim } from "../nodes/generateStatementOfClaim";
import { generateStatementOfDamages } from "../nodes/generateStatementOfDamages";
import { generatePreActionLetter } from "../nodes/generatePreActionLetter";
import { translateWitnessStatement } from "../nodes/translateWitnessStatement";

export const documentsGraph = new StateGraph(DocumentsState)
  .addNode("fetchContext", fetchContext)
  .addNode("fetchWritOfSummonsFiles", fetchWritOfSummonsFiles)
  .addNode("generateWritOfSummons", generateWritOfSummons)
  .addNode("generateWitnessStatement", generateWitnessStatement)
  .addNode("generateStatementOfClaim", generateStatementOfClaim)
  .addNode("generateStatementOfDamages", generateStatementOfDamages)
  .addNode("generatePreActionLetter", generatePreActionLetter)
  .addNode("translateWitnessStatement", translateWitnessStatement)
  // Fan out from START to the three independent fetches
  .addEdge(START, "fetchContext")
  .addEdge(START, "fetchWritOfSummonsFiles")
  // Writ branch
  .addEdge("fetchWritOfSummonsFiles", "generateWritOfSummons")
  .addEdge("generateWritOfSummons", END)
  // Witness branch (depends on both chronology + particulars)
  .addEdge("fetchContext", "generateWitnessStatement")
  .addEdge("generateWitnessStatement", "translateWitnessStatement")
  .addEdge("translateWitnessStatement", END)
  // SoC, SoD, Pre-Action — fan out from the same two fetches
  .addEdge("fetchContext", "generateStatementOfClaim")
  .addEdge("generateStatementOfClaim", END)
  .addEdge("fetchContext", "generateStatementOfDamages")
  .addEdge("generateStatementOfDamages", END)
  .addEdge("fetchContext", "generatePreActionLetter")
  .addEdge("generatePreActionLetter", END)
  .compile();
