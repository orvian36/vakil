import { GoogleGenAI } from '@google/genai';
import fs from 'fs';
import path from 'path';

import { queryLLM } from '@/lib/llm';

interface PDFAnalysisResult {
  success: boolean;
  summary?: string;
  error?: string;
}

interface EntityAndDateResult {
  success: boolean;
  entities?: string[];
  documentDate?: string | null;
  documentSummary?: string;
  error?: string;
}

class PDFAnalysisService {
  private genAI: GoogleGenAI;

  constructor() {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY is not defined in environment variables');
    }
    
    this.genAI = new GoogleGenAI({ apiKey });
  }

  /**
   * Analyze a PDF from a download URL and generate a summary
   */
  async analyzePDF(pdfUrl: string, customInstructions?: string, authToken?: string): Promise<PDFAnalysisResult> {
    try {
      console.log(`[PDFAnalysis] Starting analysis for PDF: ${pdfUrl}`);

      // Download and upload PDF to Gemini
      const uploadedFile = await this.uploadPDFToGemini(pdfUrl);
      
      if (!uploadedFile) {
        return {
          success: false,
          error: 'Failed to upload PDF to Gemini'
        };
      }

      // Create the analysis prompt with custom instructions if provided
      const prompt = this.createAnalysisPrompt(customInstructions);
      
      // Create content with prompt and file
      const content = [
        prompt,
        {
          fileData: {
            mimeType: 'application/pdf',
            fileUri: uploadedFile.uri
          }
        }
      ];
      
      // Analyze the PDF using Gemini
      const result = await this.genAI.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: content,
        config: {
          temperature: 0.1,
        }
      });

      //console.log("Gemini result:", result);

      let summary = result.text;
      //remove ```markdown ``` from the summary
      summary = summary?.replace(/^```markdown\n?/, '').replace(/\n```$/, '');
      
      console.log(`[PDFAnalysis] Analysis completed successfully`);
      
      
      return {
        success: true,
        summary: summary
      };

    } catch (error) {
      console.error('[PDFAnalysis] Error analyzing PDF:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  /**
   * Analyze a PDF and extract entities, document date, and comprehensive summary
   */
  async analyzePDFWithEntitiesAndDate(pdfUrl: string, authToken?: string, evidenceType?: string): Promise<EntityAndDateResult> {
    try {
      console.log(`[PDFAnalysis] Starting entity and date analysis for PDF: ${pdfUrl}`);
      console.log(`[PDFAnalysis] Evidence type: ${evidenceType || 'default'}`);

      // Download and upload PDF to Gemini
      const uploadedFile = await this.uploadPDFToGemini(pdfUrl);
      
      if (!uploadedFile) {
        return {
          success: false,
          error: 'Failed to upload PDF to Gemini'
        };
      }

      // Create the analysis prompt for entities and date extraction based on evidence type
      const prompt = this.createEntityAndDatePrompt(evidenceType);
      
      // Create content with prompt and file
      const content = [
        prompt,
        {
          fileData: {
            mimeType: 'application/pdf',
            fileUri: uploadedFile.uri
          }
        }
      ];
      
      // Analyze the PDF using Gemini
      const result = await this.genAI.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: content,
        config: {
          temperature: 0.1,
        }
      });

      let responseText = result.text || '';
      
      // Parse JSON response using robust parsing with retry
      let parsedResponse;
      try {
        const expectedFormat = `{
  "entities": ["Entity 1", "Entity 2", "Entity 3"],
  "documentDate": "YYYY-MM-DD" or null if no date found,
  "documentSummary": "A comprehensive markdown summary highlighting key legal aspects."
}`;
        
        parsedResponse = await this.parseJSONWithRetry(responseText, authToken);
      } catch (parseError) {
        console.error('[PDFAnalysis] Error parsing JSON response:', parseError);
        return {
          success: false,
          error: 'Failed to parse AI response as JSON'
        };
      }

      console.log(`[PDFAnalysis] Entity and date analysis completed successfully`);
      
      
      return {
        success: true,
        entities: parsedResponse.entities || [],
        documentDate: parsedResponse.documentDate || null,
        documentSummary: parsedResponse.documentSummary?.replace(/^```markdown\n?/, '').replace(/\n```$/, '') || ''
      };

    } catch (error) {
      console.error('[PDFAnalysis] Error analyzing PDF for entities and date:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  /**
   * Download PDF and upload to Gemini
   */
  private async uploadPDFToGemini(url: string): Promise<any> {
    try {
      // Fetch the file from URL with timeout and retry
      let response;
      let retries = 3;
      
      while (retries > 0) {
        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout
          
          response = await fetch(url, {
            signal: controller.signal,
            headers: {
              'User-Agent': 'Mozilla/5.0 (compatible; PDFAnalysisBot/1.0)'
            }
          });
          
          clearTimeout(timeoutId);
          break;
        } catch (fetchError: any) {
          retries--;
          console.log(`Fetch attempt failed for ${url}, retries left: ${retries}`);
          if (retries === 0) {
            throw new Error(`Failed to fetch file from URL after 3 attempts: ${url} - ${fetchError.message}`);
          }
          await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds before retry
        }
      }
      
      if (!response!.ok) {
        throw new Error(`Failed to fetch file from URL: ${url} - ${response!.statusText}`);
      }
      
      const fileBuffer = await response!.arrayBuffer();
      const fileBlob = new Blob([fileBuffer], { type: 'application/pdf' });

      // Upload file to Gemini
      const file = await this.genAI.files.upload({
        file: fileBlob,
        config: {
          displayName: `PDF Document ${Date.now()}`,
        },
      });

      // Wait for the file to be processed
      if (!file.name) {
        throw new Error(`File upload failed for: ${url}`);
      }
      
      let getFile = await this.genAI.files.get({ name: file.name });
      while (getFile.state === 'PROCESSING') {
        getFile = await this.genAI.files.get({ name: file.name });
        console.log(`File processing status: ${getFile.state}`);
        
        // Wait 5 seconds before checking again
        await new Promise((resolve) => {
          setTimeout(resolve, 5000);
        });
      }

      if (getFile.state === 'FAILED') {
        throw new Error(`File processing failed on Gemini side for: ${url}`);
      }

      return {
        name: getFile.displayName || `PDF Document ${Date.now()}`,
        mime_type: getFile.mimeType || 'application/pdf',
        size: getFile.sizeBytes || '0',
        state: getFile.state || 'UNKNOWN',
        uri: getFile.uri || ''
      };

    } catch (error) {
      console.error('[PDFAnalysis] Error uploading PDF to Gemini:', error);
      return null;
    }
  }


  /**
   * Create the analysis prompt for Gemini by reading from the prompt file
   */
  private createAnalysisPrompt(customInstructions?: string): string {
    const promptPath = path.join(process.cwd(), 'lib', 'prompts', 'generate_summary.txt');
    let prompt = fs.readFileSync(promptPath, 'utf8').trim();
    
    // Add custom instructions if provided
    if (customInstructions && customInstructions.trim()) {
      prompt += `\n\n## Additional Instructions:\n${customInstructions.trim()}\n\nPlease pay special attention to these specific requirements when analyzing the document.`;
    }
    
    return prompt;
  }

  /**
   * Create the entity and date analysis prompt by reading from the appropriate prompt file
   * Uses evidence-type-specific prompts if available, otherwise falls back to default
   */
  private createEntityAndDatePrompt(evidenceType?: string): string {
    // Default evidence types that have specific prompts
    const defaultEvidenceTypes = [
      'writ_of_summons_supporting',
      'medical_records',
      'medical_bills',
      'police_reports',
      'witness_statements',
      'employment_income',
      'transportation_receipts',
      'damaged_property',
      'future_treatment',
      'correspondence'
    ];

    let promptFileName = 'default.txt';
    
    // Check if evidence type is a default type and has a specific prompt
    if (evidenceType && defaultEvidenceTypes.includes(evidenceType)) {
      promptFileName = `${evidenceType}.txt`;
    }
    // Custom evidence types (those starting with 'custom-') will use default.txt
    
    const promptPath = path.join(process.cwd(), 'lib', 'prompts', 'fileProcessingPrompts', promptFileName);
    
    // Check if file exists, fallback to default if not
    if (!fs.existsSync(promptPath)) {
      console.warn(`[PDFAnalysis] Prompt file not found: ${promptPath}, using default prompt`);
      const defaultPath = path.join(process.cwd(), 'lib', 'prompts', 'fileProcessingPrompts', 'default.txt');
      const prompt = fs.readFileSync(defaultPath, 'utf8').trim();
      return prompt;
    }
    
    const prompt = fs.readFileSync(promptPath, 'utf8').trim();
    console.log(`[PDFAnalysis] Using prompt file: ${promptFileName}`);
    return prompt;
  }

  /**
   * Robust JSON parsing with multiple LLM retry capability
   * If initial parsing fails, it will call the LLM to fix the JSON format
   * If first retry fails, it will attempt a second retry with a different approach
   */
  public async parseJSONWithRetry(rawResponse: string, accessToken?: string): Promise<any> {
    let parseError: Error | null = null;
    
    try {
      // First attempt: Clean and parse the response
      let cleanedResponse = rawResponse?.trim();
      
      // Remove markdown code blocks if present
      cleanedResponse = cleanedResponse?.replace(/^```json\n?/i, '').replace(/\n```$/i, '');
      cleanedResponse = cleanedResponse?.replace(/^```\n?/i, '').replace(/\n```$/i, '');
      
      // Try to parse the cleaned response
      const parsed = JSON.parse(cleanedResponse || '{}');
      return parsed;
      
    } catch (error) {
      parseError = error instanceof Error ? error : new Error('Unknown parsing error');
      console.warn('[PDFAnalysis] Initial JSON parsing failed, attempting first LLM retry:', parseError);
      
      try {
        // First retry: Create a prompt to fix the JSON format with error details
        const fixPrompt = `The following text was supposed to be a JSON response but failed to parse. Please extract the valid JSON from it and return ONLY the corrected JSON with no additional text or explanation. Do not modify the content, only fix the format.

Original response:
${rawResponse}

JSON Parse Error: ${parseError.message}

Return ONLY the corrected JSON`;

        // Call LLM to fix the JSON
        const llmResponse = await queryLLM({
          prompt: fixPrompt,
          model: "gemini-3-flash-preview",
          max_tokens: 6000,
          appName: "vakil",
          task: "fix-json-format",
          accessToken: accessToken || ""
        });
        
        if (!llmResponse.success || !llmResponse.content) {
          throw new Error('First LLM retry returned empty or failed response');
        }
        
        // Try to parse the fixed response
        let cleanedFixedResponse = llmResponse.content.trim();
        cleanedFixedResponse = cleanedFixedResponse.replace(/^```(?:json)?\n?/i, '').replace(/\n```$/i, '');
        console.log('Cleaned fixed response for first retry:', cleanedFixedResponse);
        
        // Additional validation before parsing
        if (!cleanedFixedResponse) {
          throw new Error('First retry returned empty or too short response');
        }
        
        // Check if response looks like JSON (starts with { or [)
        if (!cleanedFixedResponse.match(/^[\s]*[{\[]/)) {
          throw new Error('First retry response does not appear to be JSON');
        }
        
        const parsed = JSON.parse(cleanedFixedResponse);
        console.log('[PDFAnalysis] Successfully parsed JSON after first LLM retry');
        return parsed;
        
      } catch (firstRetryError) {
        const firstRetryParseError = firstRetryError instanceof Error ? firstRetryError : new Error('Unknown first retry error');
        console.warn('[PDFAnalysis] First LLM retry failed, attempting second retry:', firstRetryParseError);
        
        try {
          // Second retry: More aggressive approach with error details
          const secondFixPrompt = `The following text was supposed to be a JSON response but failed to parse. Please extract the valid JSON from it and return ONLY the corrected JSON with no additional text or explanation. Do not modify the content, only fix the format.

The original malformed response was:
${rawResponse}

Original JSON Parse Error: ${parseError.message}
First Retry Parse Error: ${firstRetryParseError.message}

Please:
1. Identify the core data that should be in the JSON
2. Create a completely new, valid JSON structure
3. Return ONLY the corrected JSON with no explanations or additional text
4. Do not modify the content of the JSON, only the format

Corrected JSON:`;

          // Call LLM for second retry
          const secondLlmResponse = await queryLLM({
            prompt: secondFixPrompt,
            model: "gemini-3-flash-preview",
            max_tokens: 6000,
            appName: "vakil",
            task: "fix-json-format-retry-2",
            accessToken: accessToken || ""
          });
          
          if (!secondLlmResponse.success || !secondLlmResponse.content) {
            throw new Error('Second LLM retry returned empty or failed response');
          }
          
          // Try to parse the second fixed response
          let cleanedSecondResponse = secondLlmResponse.content.trim();
          cleanedSecondResponse = cleanedSecondResponse.replace(/^```(?:json)?\n?/i, '').replace(/\n```$/i, '');
          console.log('Cleaned second response for second retry:', cleanedSecondResponse);
          
          // Additional validation before parsing
          if (!cleanedSecondResponse) {
            throw new Error('Second retry returned empty or too short response');
          }
          
          // Check if response looks like JSON (starts with { or [)
          if (!cleanedSecondResponse.match(/^[\s]*[{\[]/)) {
            throw new Error('Second retry response does not appear to be JSON');
          }
          
          const parsed = JSON.parse(cleanedSecondResponse);
          console.log('[PDFAnalysis] Successfully parsed JSON after second LLM retry');
          return parsed;
          
        } catch (secondRetryError) {
          console.error('[PDFAnalysis] Both LLM retries failed:', secondRetryError);
          throw new Error(`Failed to parse JSON after all retry attempts: ${secondRetryError instanceof Error ? secondRetryError.message : 'Unknown error'}`);
        }
      }
    }
  }

}

// Export only the class
export default PDFAnalysisService;
