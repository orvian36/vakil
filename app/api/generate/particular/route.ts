import { NextRequest, NextResponse } from "next/server";
import { AgentOrchestrator } from '@/lib/orchestration/agent-orchestrator';
import { FetchFileDataAgent, GenerateParticularsAgent } from '@/lib/orchestration/agents';
import { AgentConfig } from '@/lib/orchestration/types';
import * as fs from 'fs';
import path from 'path';
import { cookies } from 'next/headers';

// Load configuration from JSON file
const loadConfig = (): AgentConfig[] => {
  try {
    const configPath = path.join(process.cwd(), 'lib', 'orchestration', 'particular_generate_config.js');
    const configData = fs.readFileSync(configPath, 'utf8');
    return JSON.parse(configData);
  } catch (error) {
    console.error('Error loading configuration:', error);
    throw error;
  }
};

export async function POST(request: NextRequest) {
  try {
    const { caseId, userComment } = await request.json();

    console.log("caseId from generate/particular", caseId);

    if (!caseId) {
      return NextResponse.json({ error: "caseId is required" }, { status: 400 });
    }

    // Get access token and refresh token from cookies
    const cookieStore = await cookies();
    const accessToken = cookieStore.get('access_token')?.value;
    const refreshToken = cookieStore.get('refresh_token')?.value;

    if (!accessToken) {
      return NextResponse.json({ error: "Unauthorized - No access token found in cookies" }, { status: 401 });
    }

    if (!refreshToken) {
      return NextResponse.json({ error: "Unauthorized - No refresh token found in cookies" }, { status: 401 });
    }

    // Load configuration
    const config = loadConfig();
    console.log(`📋 Loaded configuration with ${config.length} agents`);

    // Create orchestrator
    const orchestrator = new AgentOrchestrator(config);
    
    // Set caseId, accessToken, refreshToken, and userComment in context
    const contextData: any = { caseId, accessToken, refreshToken };
    
    if (userComment && userComment.trim()) {
      contextData.userComment = userComment;
    }
    
    orchestrator.setContext(contextData);
    console.log(`📋 Case ID, access token, refresh token, and user comment set`);

    // Register all agents
    const agentInstances = [
      new FetchFileDataAgent(),
      new GenerateParticularsAgent(),
    ];

    agentInstances.forEach(agent => {
      orchestrator.registerAgent(agent);
      console.log(`✅ Registered agent: ${agent.name}`);
    });

    console.log('✅ All agents registered successfully');

    // Execute the workflow
    const result = await orchestrator.executeWorkflow();

    // Extract the particulars content and thinking from the result
    const particulars = result.particulars;
    const content = particulars?.content || '';
    const thinking = particulars?.thinking || '';

    console.log('🎉 Particulars generation completed successfully!');

    return NextResponse.json({ content, thinking });

  } catch (error) {
    console.error('Error generating particulars:', error);
    return NextResponse.json(
      { error: "Internal server error" }, 
      { status: 500 }
    );
  }
}
