// Maps LangGraph streamEvents to the SSE schema the existing frontend understands:
//   { type: 'workflow_start' | 'agent_started' | 'agent_complete' | 'agent_error' | 'workflow_complete', ... }

type Send = (data: unknown) => void;

const FRIENDLY: Record<string, string> = {
  fetchChronology:           "Loading chronology",
  fetchParticulars:          "Loading particulars",
  fetchWritOfSummonsFiles:   "Loading Writ of Summons supporting documents",
  generateWritOfSummons:     "Generating Writ of Summons",
  generateWitnessStatement:  "Generating Witness Statement",
  generateStatementOfClaim:  "Generating Statement of Claim",
  generateStatementOfDamages:"Generating Statement of Damages",
  generatePreActionLetter:   "Generating Pre-Action Letter",
  translateWitnessStatement: "Translating Witness Statement",
};

export function makeSseAdapter(send: Send) {
  send({ type: "workflow_start", message: "Workflow started" });

  return async function handle(event: any) {
    const nodeName: string | undefined = event.metadata?.langgraph_node ?? event.name;
    if (!nodeName || !FRIENDLY[nodeName]) return;

    if (event.event === "on_chain_start") {
      send({
        type: "agent_started",
        agentName: nodeName,
        agentMessage: FRIENDLY[nodeName],
      });
    } else if (event.event === "on_chain_end") {
      send({ type: "agent_complete", agentName: nodeName });
    } else if (event.event === "on_chain_error") {
      send({
        type: "agent_error",
        agentName: nodeName,
        error: String(event.data?.error ?? "unknown"),
      });
    }
  };
}

export function emitWorkflowComplete(send: Send) {
  send({ type: "workflow_complete", message: "Workflow complete" });
}
