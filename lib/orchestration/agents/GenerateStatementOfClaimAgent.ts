import { Agent, AgentContext, AgentResult } from '../types';
import { queryLLM } from '@/lib/llm';
import { promises as fsPromises } from 'fs';
import { join } from 'path';
import { SocService } from '@/services/socService';
import PDFAnalysisService from '@/services/pdfAnalysisService';
import { writeDebugOutput } from './debug-utils';
export class GenerateStatementOfClaimAgent implements Agent {
  name = 'generate-statement-of-claim';

  async execute(context: AgentContext): Promise<AgentResult> {
    try {
      // Get inputs from context
      const caseId = context.caseId;
      const particulars = context.particulars;
      const chronology = context.chronology;

      if (!caseId) {
        return {
          success: false,
          error: 'Case ID is required to generate statement of claim'
        };
      }

      if (!particulars || !chronology) {
        return {
          success: false,
          error: 'Required input data (particulars and chronology) not found in context'
        };
      }

      console.log(`[GenerateStatementOfClaimAgent] Generating statement of claim for case: ${caseId}`);

      // Read the prompt template from file
      const promptFilePath = join(process.cwd(), 'lib/prompts/generate_statement_of_claim.txt');
      const promptTemplate = await fsPromises.readFile(promptFilePath, 'utf-8');
      
      // Combine prompt template with particulars and chronology data
      const prompt = `${promptTemplate}

## Particulars:
${particulars}

## Chronology:
${chronology}`;


      // Call LLM to generate statement of claim
      const llmResponse = await queryLLM({
        prompt,
        accessToken: context.accessToken,
        model: "google/gemini-3-flash-preview",
        max_tokens: 60000,
        appName: "personal-injury",
        task: "generate-statement-of-claim",
        provider: "deepinfra"
      });

      if (llmResponse.success && llmResponse.content) {
        try {
          // Parse the JSON response
          let content = llmResponse.content.trim();
          content = content.replace(/^```(?:json)?\n?/, '').replace(/\n```$/, '');
          
          const pdfAnalysisService = new PDFAnalysisService();
          const statementOfClaim = await pdfAnalysisService.parseJSONWithRetry(content);

          // Update the statement of claim in the database
          await SocService.upsertSocAnalysis(caseId, { statementOfClaim: statementOfClaim.content });

          console.log(`[GenerateStatementOfClaimAgent] Successfully generated statement of claim for case: ${caseId}`);

          // Write debug output
          await writeDebugOutput(this.name, statementOfClaim.content, { caseId });

          return {
            success: true,
            data: statementOfClaim.content
          };

        } catch (parseError) {
          console.error('[GenerateStatementOfClaimAgent] Failed to parse LLM response:', parseError);
          await writeDebugOutput(this.name, { error: 'Failed to parse generated statement of claim', parseError: parseError instanceof Error ? parseError.message : 'Unknown error', rawResponse: llmResponse.content }, { caseId });
          return {
            success: false,
            error: 'Failed to parse generated statement of claim'
          };
        }
      } else {
        console.error('[GenerateStatementOfClaimAgent] LLM generation failed:', llmResponse.error);
        await writeDebugOutput(this.name, { error: 'LLM generation failed', llmError: llmResponse.error }, { caseId });
        return {
          success: false,
          error: 'Failed to generate statement of claim'
        };
      }

    } catch (error) {
      console.error('[GenerateStatementOfClaimAgent] Error generating statement of claim:', error);
      await writeDebugOutput(this.name, { error: error instanceof Error ? error.message : 'Unknown error occurred' }, { caseId: context.caseId });
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred while generating statement of claim'
      };
    }
  }
}
