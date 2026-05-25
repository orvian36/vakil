// Maps LangGraph streamEvents to the SSE schema the existing frontend understands:
//   { type: 'workflow_start' | 'agent_started' | 'agent_complete' | 'agent_error' | 'workflow_complete', ... }

type Send = (data: unknown) => void;

const FRIENDLY: Record<string, string> = {
  fetchContext:              "Loading case context",
  fetchWritOfSummonsFiles:   "Loading Writ of Summons supporting documents",
  generateWritOfSummons:     "Generating Writ of Summons",
  generateWitnessStatement:  "Generating Witness Statement",
  generateStatementOfClaim:  "Generating Statement of Claim",
  generateStatementOfDamages:"Generating Statement of Damages",
  generatePreActionLetter:   "Generating Pre-Action Letter",
  translateWitnessStatement: "Translating Witness Statement",
};

export function emitAgentRegistered(send: Send) {
  for (const [nodeName, message] of Object.entries(FRIENDLY)) {
    send({ type: "agent_registered", agentName: nodeName, message });
  }
}

export function makeSseAdapter(send: Send) {
  send({ type: "workflow_start", message: "Workflow started" });

  return async function handle(event: any) {
    const nodeName: string | undefined = event.metadata?.langgraph_node ?? event.name;
    if (!nodeName || !FRIENDLY[nodeName]) return;

    if (event.event === "on_chain_start") {
      send({
        type: "agent_started",
        agentName: nodeName,
        message: FRIENDLY[nodeName],
      });
    } else if (event.event === "on_chain_end") {
      send({ type: "agent_completed", agentName: nodeName, message: `${FRIENDLY[nodeName]} completed` });
    } else if (event.event === "on_chain_error") {
      send({
        type: "agent_error",
        agentName: nodeName,
        message: String(event.data?.error ?? "unknown"),
      });
    }
  };
}

export function emitWorkflowComplete(send: Send, result: any) {
  send({ type: "complete", message: "Workflow complete", result });
}
