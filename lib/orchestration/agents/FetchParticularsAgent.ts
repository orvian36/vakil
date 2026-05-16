import { Agent, AgentContext, AgentResult } from '../types';
import { SocService } from '@/services/socService';
import { writeDebugOutput } from './debug-utils';

export class FetchParticularsAgent implements Agent {
  name = 'fetch-particulars';

  async execute(context: AgentContext): Promise<AgentResult> {
    try {
      // Get caseId from context
      const caseId = context.caseId;
      
      if (!caseId) {
        return {
          success: false,
          error: 'Case ID is required to fetch particulars'
        };
      }

      console.log(`[FetchParticularsAgent] Fetching particulars for case: ${caseId}`);

      // Fetch SOC analysis details (caseAnalysisId = caseId)
      const socAnalysis = await SocService.getSocAnalysis(caseId);

      // Only return the particularsMarkdown field
      const particulars = socAnalysis?.particularsMarkdown || null;

      console.log(`[FetchParticularsAgent] Successfully fetched particulars for case: ${caseId}`);
      
      // Write debug output
      await writeDebugOutput(this.name, particulars, { caseId });

      return {
        success: true,
        data: particulars
      };

    } catch (error) {
      console.error('[FetchParticularsAgent] Error fetching particulars:', error);
      await writeDebugOutput(this.name, { error: error instanceof Error ? error.message : 'Unknown error' }, { caseId: context.caseId });
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred while fetching particulars'
      };
    }
  }
}
