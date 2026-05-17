import { Agent, AgentContext, AgentResult } from '../types';
import { queryLLM } from '@/lib/llm';
import { promises as fsPromises } from 'fs';
import { join } from 'path';
import { SocService } from '@/services/socService';
import { writeDebugOutput } from './debug-utils';

export class GeneratePreActionLetterAgent implements Agent {
  name = 'generate-pre-action-letter';

  async execute(context: AgentContext): Promise<AgentResult> {
    try {
      // Get inputs from context
      const caseId = context.caseId;
      const particulars = context.particulars;
      const chronology = context.chronology;

      if (!caseId) {
        return {
          success: false,
          error: 'Case ID is required to generate pre-action letter'
        };
      }

      if (!particulars || !chronology) {
        return {
          success: false,
          error: 'Required input data (particulars and chronology) not found in context'
        };
      }

      console.log(`[GeneratePreActionLetterAgent] Generating pre-action letter for case: ${caseId}`);

      // Read the prompt template from file
      const promptFilePath = join(process.cwd(), 'lib/prompts/generate_pre-action_letter.txt');
      const promptTemplate = await fsPromises.readFile(promptFilePath, 'utf-8');
      
      // Combine prompt template with particulars and chronology data
      const prompt = `${promptTemplate}

## Particulars:
${particulars}

## Chronology:
${chronology}`;



      // Call LLM to generate pre-action letter
      const llmResponse = await queryLLM({
        prompt,
        accessToken: context.accessToken,
        model: "google/gemini-3-flash-preview",
        max_tokens: 60000,
        appName: "personal-injury",
        task: "generate-pre-action-letter",
        provider: "deepinfra"
      });

      if (llmResponse.success && llmResponse.content) {
        try {
          // Parse the JSON response
          let content = llmResponse.content.trim();
          content = content.replace(/^```(?:json)?\n?/, '').replace(/\n```$/, '');
          
          const preActionLetter = JSON.parse(content);

          // Update the pre-action letter in the database
          await SocService.upsertSocAnalysis(caseId, { preActionLetter: preActionLetter.content });

          console.log(`[GeneratePreActionLetterAgent] Successfully generated pre-action letter for case: ${caseId}`);

          // Write debug output
          await writeDebugOutput(this.name, preActionLetter.content, { caseId });

          return {
            success: true,
            data: preActionLetter.content
          };

        } catch (parseError) {
          console.error('[GeneratePreActionLetterAgent] Failed to parse LLM response:', parseError);
          await writeDebugOutput(this.name, { error: 'Failed to parse generated pre-action letter', parseError: parseError instanceof Error ? parseError.message : 'Unknown error', rawResponse: llmResponse.content }, { caseId });
          return {
            success: false,
            error: 'Failed to parse generated pre-action letter'
          };
        }
      } else {
        console.error('[GeneratePreActionLetterAgent] LLM generation failed:', llmResponse.error);
        await writeDebugOutput(this.name, { error: 'LLM generation failed', llmError: llmResponse.error }, { caseId });
        return {
          success: false,
          error: 'Failed to generate pre-action letter'
        };
      }

    } catch (error) {
      console.error('[GeneratePreActionLetterAgent] Error generating pre-action letter:', error);
      await writeDebugOutput(this.name, { error: error instanceof Error ? error.message : 'Unknown error occurred' }, { caseId: context.caseId });
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred while generating pre-action letter'
      };
    }
  }
}
