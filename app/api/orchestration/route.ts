import { NextRequest, NextResponse } from 'next/server';
import { AgentOrchestrator } from '@/lib/orchestration/agent-orchestrator';
import * as agents from '@/lib/orchestration/agents';
import { AgentConfig } from '@/lib/orchestration/types';
import * as fs from 'fs';
import path from 'path';
import { cookies } from 'next/headers';

// Load configuration from JSON file
const loadConfig = (): AgentConfig[] => {
  try {
    const configPath = path.join(process.cwd(), 'lib', 'orchestration', 'agent-config.json');
    const configData = fs.readFileSync(configPath, 'utf8');
    return JSON.parse(configData);
  } catch (error) {
    console.error('Error loading configuration:', error);
    throw error;
  }
};

export async function POST(request: NextRequest) {
  try {
    // Get caseId from request body
    const { caseId } = await request.json();
    
    if (!caseId) {
      return NextResponse.json(
        { error: 'Case ID is required' },
        { status: 400 }
      );
    }

    // Get access token and refresh token from cookies
    const cookieStore = await cookies();
    const accessToken = cookieStore.get('access_token')?.value;
    const refreshToken = cookieStore.get('refresh_token')?.value;

    if (!accessToken) {
      return NextResponse.json(
        { error: 'Unauthorized - No access token found in cookies' },
        { status: 401 }
      );
    }

    if (!refreshToken) {
      return NextResponse.json(
        { error: 'Unauthorized - No refresh token found in cookies' },
        { status: 401 }
      );
    }

    // Create a readable stream for Server-Sent Events
    const stream = new ReadableStream({
      start(controller) {
        const encoder = new TextEncoder();
        
        const sendEvent = (data: any) => {
          const eventData = `data: ${JSON.stringify(data)}\n\n`;
          controller.enqueue(encoder.encode(eventData));
        };

        const runOrchestration = async () => {
          try {
            sendEvent({ type: 'start', message: '🤖 AI Agent Orchestration Started' });
            
            // Load configuration
            const config = loadConfig();
            sendEvent({ type: 'config_loaded', message: `📋 Loaded configuration with ${config.length} agents` });

            // Create orchestrator
            const orchestrator = new AgentOrchestrator(config);
            
            // Set caseId, accessToken, and refreshToken in context
            const templateConfig = config.find(agentConfig => agentConfig.prompt);
            const contextData: any = { caseId, accessToken, refreshToken };
            
            if (templateConfig) {
              contextData.inputVariables = Array.isArray(templateConfig['input variable']) 
                ? templateConfig['input variable'] 
                : [templateConfig['input variable']];
              contextData.outputVariable = templateConfig['output variable'];
              contextData.promptTemplate = templateConfig.prompt;
            }
            
            orchestrator.setContext(contextData);
            sendEvent({ type: 'context_set', message: `📋 Case ID, access token, and refresh token set` });

            // Register all agents
            const agentInstances = [
              new agents.FetchParticularsAgent(),
              new agents.FetchChronologyAgent(),
              new agents.FetchWritOfSummonsFilesAgent(),
              new agents.GenerateWritOfSummonsAgent(),
              new agents.GenerateStatementOfClaimAgent(),
              new agents.GenerateStatementOfDamagesAgent(),
              new agents.GenerateWitnessStatementAgent(),
              new agents.GeneratePreActionLetterAgent(),
              new agents.TranslateWitnessStatementAgent(),
            ];

            agentInstances.forEach(agent => {
              orchestrator.registerAgent(agent);
              sendEvent({ 
                type: 'agent_registered', 
                message: `✅ Registered agent: ${agent.name}`,
                agentName: agent.name
              });
            });

            sendEvent({ type: 'all_agents_registered', message: '✅ All agents registered successfully' });

            // Execute the workflow with streaming updates
            const result = await executeWorkflowWithStreaming(orchestrator, sendEvent);

            sendEvent({ 
              type: 'complete', 
              message: '🎉 Workflow completed successfully!',
              result: result
            });

            // Close the stream
            controller.close();

          } catch (error) {
            sendEvent({ 
              type: 'error', 
              message: `❌ Orchestration failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
              error: error instanceof Error ? error.message : 'Unknown error'
            });
            controller.close();
          }
        };

        runOrchestration();
      }
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });

  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Helper function to execute workflow with streaming updates
async function executeWorkflowWithStreaming(
  orchestrator: AgentOrchestrator, 
  sendEvent: (data: any) => void
): Promise<any> {
  // Use the orchestrator's built-in executeWorkflow method with sendEvent
  return await orchestrator.executeWorkflow(sendEvent);
}
