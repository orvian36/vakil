import { Agent, AgentContext, AgentResult } from '../types';
import { queryLLM } from '@/lib/llm';
import { promises as fsPromises } from 'fs';
import { join } from 'path';
import { SocService } from '@/services/socService';
import PDFAnalysisService from '@/services/pdfAnalysisService';
import { writeDebugOutput } from './debug-utils';

export class GenerateWritOfSummonsAgent implements Agent {
  name = 'generate-writ-of-summons';

  async execute(context: AgentContext): Promise<AgentResult> {
    try {
      // Get inputs from context
      const caseId = context.caseId;
      const writOfSummonsFiles = context.writ_of_summons_files;

      if (!caseId) {
        return {
          success: false,
          error: 'Case ID is required to generate writ of summons'
        };
      }

      if (!writOfSummonsFiles) {
        return {
          success: false,
          error: 'Required input data (writ_of_summons_files) not found in context'
        };
      }

      // Extract combinedText from the file data
      const writOfSummonsText = writOfSummonsFiles.combinedText || '';
      
      if (!writOfSummonsText || writOfSummonsText.trim() === '') {
        console.warn(`[GenerateWritOfSummonsAgent] No completed writ of summons files found for case: ${caseId}`);
        // Still proceed but with empty text - the prompt should handle this
      }

      console.log(`[GenerateWritOfSummonsAgent] Generating writ of summons for case: ${caseId}`);
      console.log(`[GenerateWritOfSummonsAgent] Found ${writOfSummonsFiles.completedFiles || 0} completed writ of summons supporting files`);

      // Read the prompt template from file
      const promptFilePath = join(process.cwd(), 'lib/prompts/generate_writ_of_summons.txt');
      const promptTemplate = await fsPromises.readFile(promptFilePath, 'utf-8');
      
      // Combine prompt template with writ of summons supporting documents data
      const prompt = `${promptTemplate}

## Writ of Summons Supporting Documents:
${writOfSummonsText || 'No supporting documents available.'}`;


      // Call LLM to generate writ of summons
      const llmResponse = await queryLLM({
        prompt,
        accessToken: context.accessToken,
        model: "google/gemini-3-flash-preview",
        max_tokens: 60000,
        appName: "personal-injury",
        task: "generate-writ-of-summons",
        provider: "deepinfra"
      });

      if (llmResponse.success && llmResponse.content) {
        try {
          // Parse the JSON response
          let content = llmResponse.content.trim();
          content = content.replace(/^```(?:json)?\n?/, '').replace(/\n```$/, '');
          
          const pdfAnalysisService = new PDFAnalysisService();
          const writOfSummons = await pdfAnalysisService.parseJSONWithRetry(content);

          // Update the writ of summons in the database
          await SocService.upsertSocAnalysis(caseId, { writOfSummons: writOfSummons.content });

          console.log(`[GenerateWritOfSummonsAgent] Successfully generated writ of summons for case: ${caseId}`);

          // Write debug output
          await writeDebugOutput(this.name, writOfSummons.content, { caseId });

          return {
            success: true,
            data: writOfSummons.content
          };

        } catch (parseError) {
          console.error('[GenerateWritOfSummonsAgent] Failed to parse LLM response:', parseError);
          await writeDebugOutput(this.name, { error: 'Failed to parse generated writ of summons', parseError: parseError instanceof Error ? parseError.message : 'Unknown error', rawResponse: llmResponse.content }, { caseId });
          return {
            success: false,
            error: 'Failed to parse generated writ of summons'
          };
        }
      } else {
        console.error('[GenerateWritOfSummonsAgent] LLM generation failed:', llmResponse.error);
        await writeDebugOutput(this.name, { error: 'LLM generation failed', llmError: llmResponse.error }, { caseId });
        return {
          success: false,
          error: 'Failed to generate writ of summons'
        };
      }

    } catch (error) {
      console.error('[GenerateWritOfSummonsAgent] Error generating writ of summons:', error);
      await writeDebugOutput(this.name, { error: error instanceof Error ? error.message : 'Unknown error occurred' }, { caseId: context.caseId });
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred while generating writ of summons'
      };
    }
  }
}
