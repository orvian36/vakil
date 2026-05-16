import { AgentConfig, AgentContext, AgentResult, Agent } from './types';

export class AgentOrchestrator {
  private agents: Map<string, Agent> = new Map();
  private config: AgentConfig[] = [];
  private context: AgentContext = {};

  constructor(config: AgentConfig[]) {
    this.config = config;
  }

  registerAgent(agent: Agent): void {
    this.agents.set(agent.name, agent);
  }

  async executeWorkflow(sendEvent?: (data: any) => void): Promise<AgentContext> {
    console.log('🚀 Starting AI Agent Workflow Orchestration');
    console.log('==========================================');

    // Send initial event if sendEvent is provided
    sendEvent?.({ 
      type: 'workflow_start', 
      message: '🚀 Starting AI Agent Workflow Orchestration',
      totalAgents: this.config.length
    });

    for (let i = 0; i < this.config.length; i++) {
      const agentConfig = this.config[i];
      try {
        console.log(`\n📋 Executing: ${agentConfig['agent-name']}`);
        console.log(`💬 Message: ${agentConfig.msg}`);

        // Send agent start event
        sendEvent?.({
          type: 'agent_started',
          message: `📋${agentConfig.msg}`,
          agentName: agentConfig['agent-name'],
          agentMessage: agentConfig.msg,
          progress: { current: i + 1, total: this.config.length }
        });

        // Check if agent is registered
        const agent = this.agents.get(agentConfig['agent-name']);
        if (!agent) {
          throw new Error(`Agent '${agentConfig['agent-name']}' not found`);
        }

        // Prepare input variables
        const inputVars = Array.isArray(agentConfig['input variable']) 
          ? agentConfig['input variable'] 
          : [agentConfig['input variable']];

        // Check if all required input variables are available
        const missingInputs = inputVars.filter(inputVar => 
          inputVar !== 'none' && !(inputVar in this.context)
        );

        if (missingInputs.length > 0) {
          throw new Error(`Missing input variables: ${missingInputs.join(', ')}`);
        }

        // Execute the agent
        const result = await agent.execute(this.context);

        if (!result.success) {
          throw new Error(result.error || 'Agent execution failed');
        }

        // Store the output
        this.context[agentConfig['output variable']] = result.data;
        console.log(`✅ Successfully generated: ${agentConfig['output variable']}`);

        // Send agent completion event
        sendEvent?.({
          type: 'agent_complete',
          message: `✅ Successfully generated: ${agentConfig['output variable']}`,
          agentName: agentConfig['agent-name'],
          outputVariable: agentConfig['output variable'],
          progress: { current: i + 1, total: this.config.length }
        });

        // Log the output if it's a string
        if (typeof result.data === 'string') {
          console.log(`📄 Output preview: ${result.data.substring(0, 100)}...`);
        }

      } catch (error) {
        console.error(`❌ Error in agent '${agentConfig['agent-name']}':`, error);
        
        // Send agent error event
        sendEvent?.({
          type: 'agent_error',
          message: `❌ Error in agent '${agentConfig['agent-name']}': ${error instanceof Error ? error.message : 'Unknown error'}`,
          agentName: agentConfig['agent-name'],
          error: error instanceof Error ? error.message : 'Unknown error',
          progress: { current: i + 1, total: this.config.length }
        });
        
        throw error;
      }
    }

    console.log('\n🎉 Workflow completed successfully!');
    console.log('📊 Final context:', Object.keys(this.context));
    
    // Send workflow completion event
    sendEvent?.({
      type: 'workflow_complete',
      message: '🎉 Workflow completed successfully!',
      finalContext: Object.keys(this.context)
    });
    
    return this.context;
  }

  getContext(): AgentContext {
    return { ...this.context };
  }

  clearContext(): void {
    this.context = {};
  }

  setContext(context: AgentContext): void {
    this.context = { ...context };
  }

  setCaseId(caseId: string): void {
    this.context.caseId = caseId;
  }
}
