import { Agent, AgentContext, AgentResult } from '../types';
import { queryLLM } from '@/lib/llm';
import { promises as fsPromises } from 'fs';
import { join } from 'path';
import { SocService } from '@/services/socService';
import PDFAnalysisService from '@/services/pdfAnalysisService';
import { writeDebugOutput } from './debug-utils';

export class GenerateStatementOfDamagesAgent implements Agent {
  name = 'generate-statement-of-damages';

  async execute(context: AgentContext): Promise<AgentResult> {
    try {
      // Get inputs from context
      const caseId = context.caseId;
      const particulars = context.particulars;
      const chronology = context.chronology;

      if (!caseId) {
        return {
          success: false,
          error: 'Case ID is required to generate statement of damages'
        };
      }

      if (!particulars || !chronology) {
        return {
          success: false,
          error: 'Required input data (particulars and chronology) not found in context'
        };
      }

      console.log(`[GenerateStatementOfDamagesAgent] Generating statement of damages for case: ${caseId}`);

      // Read the prompt template from file
      const promptFilePath = join(process.cwd(), 'lib/prompts/generate_statement_of_damages.txt');
      const promptTemplate = await fsPromises.readFile(promptFilePath, 'utf-8');
      
      // Combine prompt template with particulars and chronology data
      const prompt = `${promptTemplate}

## Particulars:
${particulars}

## Chronology:
${chronology}`;


      // Call LLM to generate statement of damages
      const llmResponse = await queryLLM({
        prompt,
        accessToken: context.accessToken,
        model: "google/gemini-3-flash-preview",
        max_tokens: 60000,
        appName: "personal-injury",
        task: "generate-statement-of-damages",
        provider: "deepinfra"
      });

      if (llmResponse.success && llmResponse.content) {
        try {
          // Parse the JSON response
          let content = llmResponse.content.trim();
          content = content.replace(/^```(?:json)?\n?/, '').replace(/\n```$/, '');
          
          const pdfAnalysisService = new PDFAnalysisService();
          const statementOfDamages = await pdfAnalysisService.parseJSONWithRetry(content);

          // Update the statement of damages in the database
          await SocService.upsertSocAnalysis(caseId, { statementOfDamages: statementOfDamages.content });

          console.log(`[GenerateStatementOfDamagesAgent] Successfully generated statement of damages for case: ${caseId}`);

          // Write debug output
          await writeDebugOutput(this.name, statementOfDamages.content, { caseId });

          return {
            success: true,
            data: statementOfDamages.content
          };

        } catch (parseError) {
          console.error('[GenerateStatementOfDamagesAgent] Failed to parse LLM response:', parseError);
          await writeDebugOutput(this.name, { error: 'Failed to parse generated statement of damages', parseError: parseError instanceof Error ? parseError.message : 'Unknown error', rawResponse: llmResponse.content }, { caseId });
          return {
            success: false,
            error: 'Failed to parse generated statement of damages'
          };
        }
      } else {
        console.error('[GenerateStatementOfDamagesAgent] LLM generation failed:', llmResponse.error);
        await writeDebugOutput(this.name, { error: 'LLM generation failed', llmError: llmResponse.error }, { caseId });
        return {
          success: false,
          error: 'Failed to generate statement of damages'
        };
      }

    } catch (error) {
      console.error('[GenerateStatementOfDamagesAgent] Error generating statement of damages:', error);
      await writeDebugOutput(this.name, { error: error instanceof Error ? error.message : 'Unknown error occurred' }, { caseId: context.caseId });
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred while generating statement of damages'
      };
    }
  }
}
