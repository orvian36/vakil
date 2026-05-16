import { Agent, AgentContext, AgentResult } from '../types';
import { db } from '@/db';
import { files } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { writeDebugOutput } from './debug-utils';

export class FetchWritOfSummonsFilesAgent implements Agent {
  name = 'fetch-writ-of-summons-files';

  async execute(context: AgentContext): Promise<AgentResult> {
    try {
      // Get caseId from context
      const caseId = context.caseId;
      
      if (!caseId) {
        return {
          success: false,
          error: 'Case ID is required to fetch writ of summons files'
        };
      }

      console.log(`[FetchWritOfSummonsFilesAgent] Fetching writ of summons files for case: ${caseId}`);

      // Fetch all files for the case with type 'writ_of_summons_supporting'
      const writOfSummonsFiles = await db.query.files.findMany({
        where: and(
          eq(files.caseId, caseId),
          eq(files.type, 'writ_of_summons_supporting')
        ),
        columns: {
          summary: true,
          fileName: true,
          processingStatus: true,
          type: true,
          id: true
        }
      });

      // Combine all summaries from completed files
      const combinedText = writOfSummonsFiles
        .filter((file: typeof writOfSummonsFiles[0]) => file.processingStatus === 'completed' && file.summary)
        .map((file: typeof writOfSummonsFiles[0]) => `=== File ID: ${file.id} === File Name: ${file.fileName} === File Type: ${file.type} === \n File Summary: ${file.summary}`)
        .join('\n\n');

      const fileData = {
        combinedText: combinedText,
        totalFiles: writOfSummonsFiles.length,
        completedFiles: writOfSummonsFiles.filter((f: typeof writOfSummonsFiles[0]) => f.processingStatus === 'completed').length,
        files: writOfSummonsFiles
      };

      console.log(`[FetchWritOfSummonsFilesAgent] Successfully fetched writ of summons files for case: ${caseId} - ${fileData.completedFiles}/${fileData.totalFiles} files completed`);

      // Write debug output
      await writeDebugOutput(this.name, fileData, { caseId });

      return {
        success: true,
        data: fileData
      };

    } catch (error) {
      console.error('[FetchWritOfSummonsFilesAgent] Error fetching writ of summons files:', error);
      await writeDebugOutput(this.name, { error: error instanceof Error ? error.message : 'Unknown error' }, { caseId: context.caseId });
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred while fetching writ of summons files'
      };
    }
  }
}

