export interface AgentConfig {
  "agent-name": string;
  msg: string;
  "input variable": string | string[];
  "output variable": string;
  prompt?: string;
}

export interface AgentContext {
  [key: string]: any;
}

export interface AgentResult {
  success: boolean;
  data?: any;
  error?: string;
}

export interface Agent {
  name: string;
  execute(context: AgentContext): Promise<AgentResult>;
}
