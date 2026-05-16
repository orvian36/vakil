import { promises as fs } from 'fs';
import { join } from 'path';

/**
 * Write agent output to a debug file
 * @param agentName - Name of the agent
 * @param output - The output data to write
 * @param metadata - Optional metadata to include
 */
export async function writeDebugOutput(
  agentName: string,
  output: any,
  metadata?: { caseId?: string; [key: string]: any }
): Promise<void> {
  try {
    const debugDir = join(process.cwd(), 'lib', 'orchestration', 'agents', 'debug');
    
    // Create debug directory if it doesn't exist
    try {
      await fs.access(debugDir);
    } catch {
      await fs.mkdir(debugDir, { recursive: true });
    }

    // Generate filename with timestamp
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `${agentName}_${timestamp}.json`;
    const filepath = join(debugDir, filename);

    // Prepare debug data
    const debugData = {
      agentName,
      timestamp: new Date().toISOString(),
      metadata: metadata || {},
      output: typeof output === 'string' ? output : JSON.stringify(output, null, 2)
    };

    // Write to file
    await fs.writeFile(filepath, JSON.stringify(debugData, null, 2), 'utf-8');
    
    console.log(`[Debug] Output written to: ${filepath}`);
  } catch (error) {
    // Don't throw error - debug logging should not break the workflow
    console.error(`[Debug] Failed to write debug output for ${agentName}:`, error);
  }
}
