import { StateGraph, END, START } from "@langchain/langgraph";
import { DocumentsState } from "../state";
import { fetchChronology } from "../nodes/fetchChronology";
import { fetchParticulars } from "../nodes/fetchParticulars";
import { fetchWritOfSummonsFiles } from "../nodes/fetchWritOfSummonsFiles";
import { generateWritOfSummons } from "../nodes/generateWritOfSummons";
import { generateWitnessStatement } from "../nodes/generateWitnessStatement";
import { generateStatementOfClaim } from "../nodes/generateStatementOfClaim";
import { generateStatementOfDamages } from "../nodes/generateStatementOfDamages";
import { generatePreActionLetter } from "../nodes/generatePreActionLetter";
import { translateWitnessStatement } from "../nodes/translateWitnessStatement";

export const documentsGraph = new StateGraph(DocumentsState)
  .addNode("fetchChronology", fetchChronology)
  .addNode("fetchParticulars", fetchParticulars)
  .addNode("fetchWritOfSummonsFiles", fetchWritOfSummonsFiles)
  .addNode("generateWritOfSummons", generateWritOfSummons)
  .addNode("generateWitnessStatement", generateWitnessStatement)
  .addNode("generateStatementOfClaim", generateStatementOfClaim)
  .addNode("generateStatementOfDamages", generateStatementOfDamages)
  .addNode("generatePreActionLetter", generatePreActionLetter)
  .addNode("translateWitnessStatement", translateWitnessStatement)
  // Fan out from START to the three independent fetches
  .addEdge(START, "fetchChronology")
  .addEdge(START, "fetchParticulars")
  .addEdge(START, "fetchWritOfSummonsFiles")
  // Writ branch
  .addEdge("fetchWritOfSummonsFiles", "generateWritOfSummons")
  .addEdge("generateWritOfSummons", END)
  // Witness branch (depends on both chronology + particulars)
  .addEdge("fetchChronology", "generateWitnessStatement")
  .addEdge("fetchParticulars", "generateWitnessStatement")
  .addEdge("generateWitnessStatement", "translateWitnessStatement")
  .addEdge("translateWitnessStatement", END)
  // SoC, SoD, Pre-Action — fan out from the same two fetches
  .addEdge("fetchChronology", "generateStatementOfClaim")
  .addEdge("fetchParticulars", "generateStatementOfClaim")
  .addEdge("generateStatementOfClaim", END)
  .addEdge("fetchChronology", "generateStatementOfDamages")
  .addEdge("fetchParticulars", "generateStatementOfDamages")
  .addEdge("generateStatementOfDamages", END)
  .addEdge("fetchChronology", "generatePreActionLetter")
  .addEdge("fetchParticulars", "generatePreActionLetter")
  .addEdge("generatePreActionLetter", END)
  .compile();
