import { Agent, AgentContext, AgentResult } from '../types';
import { db } from '@/db';
import { files } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { writeDebugOutput } from './debug-utils';

export class FetchFileDataAgent implements Agent {
  name = 'fetch-file-data';

  async execute(context: AgentContext): Promise<AgentResult> {
    try {
      // Get caseId from context
      const caseId = context.caseId;
      
      if (!caseId) {
        return {
          success: false,
          error: 'Case ID is required to fetch file data'
        };
      }

      console.log(`[FetchFileDataAgent] Fetching file data for case: ${caseId}`);

      // Fetch all files for the case and get their OCR data
      const caseFiles = await db.query.files.findMany({
        where: eq(files.caseId, caseId),
        columns: {
          summary: true,
          fileName: true,
          processingStatus: true,
          type: true,
          id: true
        }
      });

      // Combine all OCR data from completed files
      const allOcrText = caseFiles
        .filter((file: typeof caseFiles[0]) => file.processingStatus === 'completed' && file.summary)
        .map((file: typeof caseFiles[0]) => `=== File ID: ${file.id} === File Name: ${file.fileName} === File Type: ${file.type} === \n File Summary: ${file.summary}`)
        .join('\n\n');

      const fileData = {
        ocrText: allOcrText,
        totalFiles: caseFiles.length,
        completedFiles: caseFiles.filter((f: typeof caseFiles[0]) => f.processingStatus === 'completed').length,
        files: caseFiles
      };

      console.log(`[FetchFileDataAgent] Successfully fetched file data for case: ${caseId} - ${fileData.completedFiles}/${fileData.totalFiles} files completed`);

      // Write debug output
      await writeDebugOutput(this.name, fileData, { caseId });

      return {
        success: true,
        data: fileData
      };

    } catch (error) {
      console.error('[FetchFileDataAgent] Error fetching file data:', error);
      await writeDebugOutput(this.name, { error: error instanceof Error ? error.message : 'Unknown error' }, { caseId: context.caseId });
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred while fetching file data'
      };
    }
  }
}
