import { Agent, AgentContext, AgentResult } from '../types';
import { queryLLM } from '@/lib/llm';
import { promises as fsPromises } from 'fs';
import { join } from 'path';
import { SocService } from '@/services/socService';
import { verifyAccessToken, refreshTokens } from '@/middleware';
import { preProcessMD } from '@/utils/remarkFixVoidTags';
import { verifyMarkdown } from '@/utils/verify_markdown';
import { writeDebugOutput } from './debug-utils';

export class GenerateChronologyAgent implements Agent {
  name = 'generate-chronology';

  async execute(context: AgentContext): Promise<AgentResult> {
    try {
      // Get inputs from context
      const caseId = context.caseId;
      const fileData = context.file_data;
      const userComment = context.userComment; // Optional user comment

      if (!caseId) {
        return {
          success: false,
          error: 'Case ID is required to generate chronology'
        };
      }

      if (!fileData || !fileData.ocrText) {
        return {
          success: false,
          error: 'File data with OCR text is required to generate chronology'
        };
      }

      console.log(`[GenerateChronologyAgent] Generating chronology for case: ${caseId}`);

      // Read the prompt template from file
      const promptFilePath = join(process.cwd(), 'lib/prompts/generate_chronology.txt');
      const promptTemplate = await fsPromises.readFile(promptFilePath, 'utf-8');
      
      // Combine prompt template with OCR data
      let prompt = `${promptTemplate}

## Case Documents Information(Document Summary with extracted information from the document). Read all the information from the summary and extract the information below:
${fileData.ocrText}`;

      // Add user comment if provided
      if (userComment && userComment.trim()) {
        prompt += `

## User Modifications/Requirements:
The user has requested the following modifications or additional requirements:
${userComment.trim()}

Please incorporate these requirements into the generated chronology while maintaining the structure and format.`;
      }

      // Verify access token
      let verification = await verifyAccessToken(context.accessToken);

      if (!verification.valid) {
        console.log("[GenerateChronologyAgent] Access token invalid, attempting to refresh...");
        if (context.refreshToken) {
          const refreshResult = await refreshTokens(context.refreshToken);
          if (refreshResult.success && refreshResult.access_token && refreshResult.refresh_token) {
            console.log("[GenerateChronologyAgent] Tokens refreshed successfully.");
            context.accessToken = refreshResult.access_token;
            context.refreshToken = refreshResult.refresh_token;
          } else {
            console.error("[GenerateChronologyAgent] Token refresh failed.");
            throw new Error("Failed to refresh access token.");
          }
        } else {
          console.error("[GenerateChronologyAgent] No refresh token available, cannot refresh.");
          throw new Error("Access token invalid and no refresh token available.");
        }
      }

      // Call LLM to generate chronology with retry logic
      const maxRetries = 3;
      let content = '';
      let thinking = '';

      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        console.log(`[GenerateChronologyAgent] Attempt ${attempt}/${maxRetries}`);

        const llmResponse = await queryLLM({
          prompt,
          accessToken: context.accessToken,
          model: "google/gemini-3-flash-preview",
          max_tokens: 60000,
          appName: "personal-injury",
          task: "generate-chronology",
          provider: "deepinfra"
        });

        if (llmResponse.success && llmResponse.content) {
          try {
            // Parse the markdown response
            content = llmResponse.content.trim();
            thinking = llmResponse.thinking?.trim() || '';
            content = content.replace(/^```(?:markdown)?\n?/, '').replace(/\n```$/, '');
            content = await preProcessMD(content);

            // Verify the markdown
            if (verifyMarkdown(content)) {
              // Valid markdown, proceed to save
              await SocService.upsertSocAnalysis(caseId, { 
                chronologyMarkdown: content
              });

              console.log(`[GenerateChronologyAgent] Successfully generated chronology for case: ${caseId}`);

              // Write debug output
              await writeDebugOutput(this.name, { content, thinking }, { caseId });

              return {
                success: true,
                data: {
                  content,
                  thinking
                }
              };
            } else {
              console.warn(`[GenerateChronologyAgent] Invalid markdown on attempt ${attempt}`);
              if (attempt === maxRetries) {
                await writeDebugOutput(this.name, { error: 'Failed to generate valid markdown after multiple attempts', content }, { caseId });
                return {
                  success: false,
                  error: 'Failed to generate valid markdown after multiple attempts'
                };
              }
            }
          } catch (parseError) {
            console.error(`[GenerateChronologyAgent] Parse error on attempt ${attempt}:`, parseError);
            if (attempt === maxRetries) {
              await writeDebugOutput(this.name, { error: 'Failed to parse generated chronology', parseError: parseError instanceof Error ? parseError.message : 'Unknown error', rawResponse: llmResponse.content }, { caseId });
              return {
                success: false,
                error: 'Failed to parse generated chronology'
              };
            }
          }
        } else {
          console.error(`[GenerateChronologyAgent] LLM failed on attempt ${attempt}:`, llmResponse.error);
          if (attempt === maxRetries) {
            await writeDebugOutput(this.name, { error: 'Failed to generate chronology', llmError: llmResponse.error }, { caseId });
            return {
              success: false,
              error: 'Failed to generate chronology'
            };
          }
        }
      }

      // Should not reach here, but just in case
      await writeDebugOutput(this.name, { error: 'Failed to generate chronology - unexpected end' }, { caseId });
      return {
        success: false,
        error: 'Failed to generate chronology'
      };

    } catch (error) {
      console.error('[GenerateChronologyAgent] Error generating chronology:', error);
      await writeDebugOutput(this.name, { error: error instanceof Error ? error.message : 'Unknown error occurred' }, { caseId: context.caseId });
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred while generating chronology'
      };
    }
  }
}
