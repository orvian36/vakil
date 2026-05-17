import { Agent, AgentContext, AgentResult } from '../types';
import { queryLLM } from '@/lib/llm';
import { SocService } from '@/services/socService';
import { writeDebugOutput } from './debug-utils';

export class TranslateWitnessStatementAgent implements Agent {
  name = 'translate-witness-statement';

  async execute(context: AgentContext): Promise<AgentResult> {
    try {
      // Get inputs from context
      const caseId = context.caseId;
      const witnessStatement = context.witness_statement;

      if (!caseId) {
        return {
          success: false,
          error: 'Case ID is required to translate witness statement'
        };
      }

      if (!witnessStatement) {
        return {
          success: false,
          error: 'Witness statement is required to translate to Chinese'
        };
      }

      console.log(`[TranslateWitnessStatementAgent] Translating witness statement to Chinese`);

      // Create the translation prompt
      const prompt = `You are a professional legal translator. Translate the following Witness Statement into accurate, formal, and clear Chinese, preserving all legal terminology and formatting. Ensure the translation is faithful to the original meaning and suitable for use in a legal context. Do not omit or summarize any content. Here is the Witness Statement to translate:

${witnessStatement}

**Critical Formatting: make sure the chinese translation markdown starts with '# è­‰äººé™³è¿°æ›¸\\n' exactly**`;


      // Call LLM to translate witness statement
      const llmResponse = await queryLLM({
        prompt,
        accessToken: context.accessToken,
        model: "google/gemini-3-flash-preview",
        max_tokens: 60000,
        appName: "personal-injury",
        task: "translate-witness-statement-chinese",
        provider: "deepinfra"
      });

      if (llmResponse.success && llmResponse.content) {
        try {
          // Parse the response
          let content = llmResponse.content.trim();
          let thinking = llmResponse.thinking?.trim();
          content = content.replace(/^```(?:markdown)?\n?/, '').replace(/\n```$/, '');

          // Update the witness statement in the database
          // NOTE: column was renamed in Phase 1; the Chinese-to-Bengali prompt swap happens in Phase 4.
          await SocService.upsertSocAnalysis(caseId, { witnessStatementBengali: content });

          console.log(`[TranslateWitnessStatementAgent] Successfully translated witness statement to Chinese`);

          // Write debug output
          await writeDebugOutput(this.name, content, { caseId });

          return {
            success: true,
            data: content
          };

        } catch (parseError) {
          console.error('[TranslateWitnessStatementAgent] Failed to parse LLM response:', parseError);
          await writeDebugOutput(this.name, { error: 'Failed to parse translated witness statement', parseError: parseError instanceof Error ? parseError.message : 'Unknown error', rawResponse: llmResponse.content }, { caseId });
          return {
            success: false,
            error: 'Failed to parse translated witness statement'
          };
        }
      } else {
        console.error('[TranslateWitnessStatementAgent] LLM translation failed:', llmResponse.error);
        await writeDebugOutput(this.name, { error: 'LLM translation failed', llmError: llmResponse.error }, { caseId });
        return {
          success: false,
          error: 'Failed to translate witness statement to Chinese'
        };
      }

    } catch (error) {
      console.error('[TranslateWitnessStatementAgent] Error translating witness statement:', error);
      await writeDebugOutput(this.name, { error: error instanceof Error ? error.message : 'Unknown error occurred' }, { caseId: context.caseId });
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred while translating witness statement'
      };
    }
  }
}
