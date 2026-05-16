import { Agent, AgentContext, AgentResult } from '../types';
import { SocService } from '@/services/socService';
import { writeDebugOutput } from './debug-utils';

export class FetchChronologyAgent implements Agent {
  name = 'fetch-chronology';

  async execute(context: AgentContext): Promise<AgentResult> {
    try {
      // Get caseId from context
      const caseId = context.caseId;
      
      if (!caseId) {
        return {
          success: false,
          error: 'Case ID is required to fetch chronology'
        };
      }

      console.log(`[FetchChronologyAgent] Fetching chronology for case: ${caseId}`);

      // Fetch SOC analysis details (caseAnalysisId = caseId)
      const socAnalysis = await SocService.getSocAnalysis(caseId);

      // Only return the chronologyMarkdown field
      const chronology = socAnalysis?.chronologyMarkdown || null;

      console.log(`[FetchChronologyAgent] Successfully fetched chronology for case: ${caseId}`);
      
      // Write debug output
      await writeDebugOutput(this.name, chronology, { caseId });

      return {
        success: true,
        data: chronology
      };

    } catch (error) {
      console.error('[FetchChronologyAgent] Error fetching chronology:', error);
      await writeDebugOutput(this.name, { error: error instanceof Error ? error.message : 'Unknown error' }, { caseId: context.caseId });
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred while fetching chronology'
      };
    }
  }
}
