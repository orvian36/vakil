import { Agent, AgentContext, AgentResult } from '../types';
import { queryLLM } from '@/lib/llm';
import { verifyAccessToken, refreshTokens } from '@/middleware';
import { writeDebugOutput } from './debug-utils';

export class GenericTemplateAgent implements Agent {
  name = 'generic-template-agent';

  async execute(context: AgentContext): Promise<AgentResult> {
    try {
      // Get template configuration from context
      const inputVariables = context.inputVariables || [];
      const outputVariable = context.outputVariable || 'output';
      const promptTemplate = context.promptTemplate || '';

      if (!promptTemplate) {
        return {
          success: false,
          error: 'Prompt template is required'
        };
      }

      // Check if all required input variables are available
      const missingInputs = inputVariables.filter((inputVar:string) => 
        inputVar !== 'none' && !(inputVar in context)
      );

      if (missingInputs.length > 0) {
        return {
          success: false,
          error: `Missing input variables: ${missingInputs.join(', ')}`
        };
      }

      console.log(`[GenericTemplateAgent] Executing template agent`);

      // Interpolate variables into the prompt template
      let prompt = promptTemplate;
      inputVariables.forEach((inputVar:string) => {
        if (inputVar !== 'none' && context[inputVar]) {
          const placeholder = `{${inputVar}}`;
          prompt = prompt.replace(new RegExp(placeholder, 'g'), context[inputVar]);
        }
      });

      console.log(`[GenericTemplateAgent] Generated prompt:`, prompt.substring(0, 200) + '...');

      // Verify access token
      let verification = await verifyAccessToken(context.accessToken);

      if (!verification.valid) {
        console.log("[GenericTemplateAgent] Access token invalid, attempting to refresh...");
        if (context.refreshToken) {
          const refreshResult = await refreshTokens(context.refreshToken);
          if (refreshResult.success && refreshResult.access_token && refreshResult.refresh_token) {
            console.log("[GenericTemplateAgent] Tokens refreshed successfully.");
            context.accessToken = refreshResult.access_token;
            context.refreshToken = refreshResult.refresh_token;
          } else {
            console.error("[GenericTemplateAgent] Token refresh failed.");
            // Handle error, maybe mark document processing as failed
            throw new Error("Failed to refresh access token.");
          }
        } else {
          console.error("[GenericTemplateAgent] No refresh token available, cannot refresh.");
          // Handle error
          throw new Error("Access token invalid and no refresh token available.");
        }
      }

      // Call LLM to generate content
      const llmResponse = await queryLLM({
        prompt,
        accessToken: context.accessToken,
        model: "google/gemini-3-flash-preview",
        max_tokens: 60000,
        appName: "personal-injury",
        task: "generate-template-content"
      });

      if (llmResponse.success && llmResponse.content) {
        try {
          // Parse the JSON response
          let content = llmResponse.content.trim();
          content = content.replace(/^```(?:json)?\n?/, '').replace(/\n```$/, '');
          
          let parsedContent;
          try {
            parsedContent = JSON.parse(content);
            // If it's a JSON object with a content field, extract it
            if (parsedContent.content) {
              content = parsedContent.content;
            } else {
              content = parsedContent;
            }
          } catch {
            // If not JSON, use the content as is
            parsedContent = content;
          }

          console.log(`[GenericTemplateAgent] Successfully generated ${outputVariable}`);

          // Write debug output
          await writeDebugOutput(this.name, content, { outputVariable, caseId: context.caseId });

          return {
            success: true,
            data: content
          };

        } catch (parseError) {
          console.error(`[GenericTemplateAgent] Failed to parse LLM response:`, parseError);
          await writeDebugOutput(this.name, { error: `Failed to parse generated ${outputVariable}`, parseError: parseError instanceof Error ? parseError.message : 'Unknown error', rawResponse: llmResponse.content }, { outputVariable, caseId: context.caseId });
          return {
            success: false,
            error: `Failed to parse generated ${outputVariable}`
          };
        }
      } else {
        console.error(`[GenericTemplateAgent] LLM generation failed:`, llmResponse.error);
        await writeDebugOutput(this.name, { error: `Failed to generate ${outputVariable}`, llmError: llmResponse.error }, { outputVariable, caseId: context.caseId });
        return {
          success: false,
          error: `Failed to generate ${outputVariable}`
        };
      }

    } catch (error) {
      console.error(`[GenericTemplateAgent] Error:`, error);
      await writeDebugOutput(this.name, { error: error instanceof Error ? error.message : 'Unknown error occurred' }, { outputVariable: context.outputVariable, caseId: context.caseId });
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }
}
