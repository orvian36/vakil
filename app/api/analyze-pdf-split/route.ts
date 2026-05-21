import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';
import { queryLLM } from '@/lib/llm';

// Types for intelligent splitting
interface SplitSegmentSuggestion {
  id: string;
  fromPage: number;
  toPage: number;
  suggestedName: string;
  suggestedCategory: string;
  confidence: number;
  description: string;
  documentType: string;
}

interface IntelligentAnalysisResult {
  success: boolean;
  totalPages?: number;
  suggestedSegments?: SplitSegmentSuggestion[];
  analysisConfidence?: number;
  error?: string;
}

export async function POST(request: NextRequest) {
  try {
    // Parse form data
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const caseId = formData.get('caseId') as string;
    
    // Get authorization token from headers
    const authHeader = request.headers.get('authorization');
    const authToken = authHeader?.replace('Bearer ', '') || undefined;
    
    // Validate required fields
    if (!file) {
      return NextResponse.json(
        { success: false, error: 'No file provided' },
        { status: 400 }
      );
    }
    
    if (!caseId) {
      return NextResponse.json(
        { success: false, error: 'Case ID is required' },
        { status: 400 }
      );
    }
    
    // Validate file type
    if (file.type !== 'application/pdf') {
      return NextResponse.json(
        { success: false, error: 'Only PDF files are supported' },
        { status: 400 }
      );
    }
    
    // Validate file size (max 50MB for AI analysis)
    const maxSize = 200 * 1024 * 1024; // 200MB
    if (file.size > maxSize) {
      return NextResponse.json(
        { success: false, error: 'File size exceeds 200MB limit for AI analysis. Please use manual mode for larger files.' },
        { status: 400 }
      );
    }
    
    // Initialize Gemini AI
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { success: false, error: 'AI service not configured' },
        { status: 500 }
      );
    }
    
    const genAI = new GoogleGenAI({ apiKey });
    
    // Convert File to Blob for Gemini upload
    const fileBuffer = await file.arrayBuffer();
    const fileBlob = new Blob([fileBuffer], { type: 'application/pdf' });
    
    // Upload file to Gemini with timeout handling
    let uploadedFile: any;
    try {
      uploadedFile = await Promise.race([
        genAI.files.upload({
          file: fileBlob,
          config: {
            displayName: `PDF Document for Splitting ${Date.now()}`,
          },
        }),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('File upload timed out after 120 seconds')), 120000)
        )
      ]) as any;
    } catch (error) {
      console.error('[API] File upload failed:', error);
      return NextResponse.json(
        { success: false, error: 'File upload to AI service timed out. Please try with a smaller file or use manual mode.' },
        { status: 408 }
      );
    }
    
    // Wait for file processing with timeout
    if (!uploadedFile.name) {
      return NextResponse.json(
        { success: false, error: 'Failed to upload file to AI service' },
        { status: 500 }
      );
    }
    
    let getFile = await genAI.files.get({ name: uploadedFile.name });
    let processingAttempts = 0;
    const maxProcessingAttempts = 30; // 60 seconds total (30 * 2s)
    
    while (getFile.state === 'PROCESSING' && processingAttempts < maxProcessingAttempts) {
      await new Promise((resolve) => setTimeout(resolve, 2000));
      getFile = await genAI.files.get({ name: uploadedFile.name });
      processingAttempts++;
    }
    
    if (getFile.state === 'PROCESSING') {
      return NextResponse.json(
        { success: false, error: 'AI service is taking too long to process the file. Please try with a smaller file' },
        { status: 408 }
      );
    }
    
    if (getFile.state === 'FAILED') {
      return NextResponse.json(
        { success: false, error: 'AI service failed to process the file.' },
        { status: 500 }
      );
    }
    
    // Create intelligent splitting prompt
    const prompt = createIntelligentSplitPrompt();
    
    // Analyze PDF using Gemini with timeout and retry logic
    let result: any;
    let analysisAttempts = 0;
    const maxAnalysisAttempts = 2;
    
    while (analysisAttempts < maxAnalysisAttempts) {
      try {
        analysisAttempts++;
        
        result = await Promise.race([
          genAI.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: [
              prompt,
              {
                fileData: {
                  mimeType: 'application/pdf',
                  fileUri: getFile.uri || ''
                }
              }
            ],
            config: {
              temperature: 0.1,
            }
          }),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('AI analysis timed out after 120 seconds')), 120000)
          )
        ]);
        
        // If we get here, the analysis succeeded
        break;
        
      } catch (error) {
        console.error(`[API] Analysis attempt ${analysisAttempts} failed:`, error);
        
        if (analysisAttempts >= maxAnalysisAttempts) {
          // Check if it's a timeout or service unavailable error
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          if (errorMessage.includes('timed out') || errorMessage.includes('UNAVAILABLE') || errorMessage.includes('503')) {
            return NextResponse.json(
              { success: false, error: 'AI analysis timed out. The file may be too complex or the service is busy. Please try manual mode or a smaller file.' },
              { status: 408 }
            );
          } else {
            return NextResponse.json(
              { success: false, error: `AI analysis failed: ${errorMessage}. Please try manual mode.` },
              { status: 500 }
            );
          }
        }
        
        // Wait before retry
        if (analysisAttempts < maxAnalysisAttempts) {
          await new Promise((resolve) => setTimeout(resolve, 3000));
        }
      }
    }
    
    if (!result) {
      return NextResponse.json(
        { success: false, error: 'AI analysis failed after multiple attempts. Please try manual mode.' },
        { status: 500 }
      );
    }
    
    let responseText = result.text || '';
    
    // Parse JSON response
    let parsedResponse;
    try {
      parsedResponse = await parseJSONWithRetry(responseText, authToken);
    } catch (parseError) {
      console.error('[API] Error parsing JSON response:', parseError);
      return NextResponse.json(
        { success: false, error: 'Failed to parse AI response' },
        { status: 500 }
      );
    }
    
    // Convert to our format
    const suggestedSegments: SplitSegmentSuggestion[] = parsedResponse.segments?.map((segment: any, index: number) => ({
      id: `ai-segment-${Date.now()}-${index}`,
      fromPage: segment.fromPage || 1,
      toPage: segment.toPage || 1,
      suggestedName: segment.suggestedName || `Document ${index + 1}`,
      suggestedCategory: segment.suggestedCategory || 'correspondence',
      confidence: segment.confidence || 0.5,
      description: segment.description || 'AI-suggested document segment',
      documentType: segment.documentType || 'Unknown'
    })) || [];
    
    return NextResponse.json({
      success: true,
      data: {
        totalPages: parsedResponse.totalPages || 1,
        suggestedSegments,
        analysisConfidence: parsedResponse.analysisConfidence || 0.5
      }
    });
    
  } catch (error) {
    console.error('[API] Error in intelligent PDF split analysis:', error);
    
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Internal server error' 
      },
      { status: 500 }
    );
  }
}

/**
 * Create the intelligent splitting prompt for Gemini
 */
function createIntelligentSplitPrompt(): string {
  return `You are an AI assistant specializing in intelligent document analysis for Vakil legal cases. Your task is to analyze a PDF document and suggest how it should be split into separate documents based on content analysis.

## Evidence Categories Available:
- medical_records: Medical Records & Reports
- medical_bills: Medical Bills & Receipts/Invoices  
- police_reports: Police / Incident Reports
- witness_statements: Witness Statements
- employment_income: Employment & Income Proof
- transportation_receipts: Transportation Receipts
- damaged_property: Damaged Property Evidence
- future_treatment: Future Treatment Estimates
- correspondence: Correspondence

## Analysis Instructions:
1. **Analyze the entire PDF document** page by page
2. **Identify distinct document types** within the PDF (different medical reports, bills, correspondence, etc.)
3. **Determine logical page ranges** for each distinct document or section
4. **Suggest appropriate names** for each document segment based on content
5. **Categorize each segment** using the evidence categories above
6. **Provide confidence scores** (0-1) for each suggestion
7. **Include brief descriptions** explaining why each split is suggested

## Analysis Criteria:
- Look for **clear document boundaries** such as new letterheads, different institutions, or completely different document types
- Identify **distinctly different document types** (e.g., medical report vs. billing statement vs. correspondence)
- Consider **chronological order** and **logical groupings**
- Detect **different sources** (different hospitals, doctors, institutions)
- Notice **different purposes** (diagnostic vs. treatment vs. billing)

## Anti-Oversplitting Guidelines:
- **PREFER LARGER SEGMENTS** over smaller ones when content is related
- **Group related pages together** even if they have minor formatting differences
- **Only split when there's a CLEAR document boundary** (new institution, different document type, etc.)
- **Avoid splitting** based on minor formatting changes, page headers, or continuation pages
- **Combine pages** that are clearly part of the same report, letter, or document
- **Default to fewer, larger segments** rather than many small segments
- **Only create a new segment** if the content is substantially different in purpose or source

## Naming Convention Guidelines:
- Use descriptive names like "Hospital Discharge Summary - Jan 2024"
- Include dates when visible: "Medical Bill - ABC Clinic - 2024-01-15"  
- Include institution names: "Police Report - Metro Police Department"
- Be specific: "X-Ray Report - Right Ankle" instead of just "X-Ray"
- Use professional terminology appropriate for legal documentation

## Output Requirements:
Return ONLY a JSON response with this exact structure:

{
  "totalPages": <number of pages in PDF>,
  "analysisConfidence": <overall confidence 0-1>,
  "segments": [
    {
      "fromPage": <start page number>,
      "toPage": <end page number>,
      "suggestedName": "<descriptive document name>",
      "suggestedCategory": "<evidence category key>",
      "confidence": <confidence score 0-1>,
      "description": "<brief explanation of why this split is suggested>",
      "documentType": "<type of document identified>"
    }
  ]
}

## Important Rules:
- **Page numbers start from 1** (not 0)
- **Every page must be included** in exactly one segment
- **No overlapping page ranges**
- **No gaps between segments**
- **Minimum segment size is 1 page**
- **Use only the evidence category keys** provided above
- **Confidence scores should reflect** how certain you are about the split and categorization
- **If unsure about category**, use "correspondence" as default
- **Always provide at least one segment** even if the entire document seems to be one type

**STRICT INSTRUCTION**: Return ONLY the JSON response with no additional text, explanations, or markdown formatting.`;
}

/**
 * Robust JSON parsing with retry capability
 */
async function parseJSONWithRetry(rawResponse: string, accessToken?: string): Promise<any> {
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
    console.warn('[API] Initial JSON parsing failed, attempting LLM retry:', parseError);
    
    try {
      // Retry with LLM to fix JSON format
      const fixPrompt = `The following text was supposed to be a JSON response for PDF splitting analysis but failed to parse. Please extract the valid JSON from it and return ONLY the corrected JSON with no additional text or explanation.

Original response:
${rawResponse}

JSON Parse Error: ${parseError.message}

Expected JSON structure:
{
  "totalPages": <number>,
  "analysisConfidence": <number 0-1>,
  "segments": [
    {
      "fromPage": <number>,
      "toPage": <number>,
      "suggestedName": "<string>",
      "suggestedCategory": "<string>",
      "confidence": <number 0-1>,
      "description": "<string>",
      "documentType": "<string>"
    }
  ]
}

Return ONLY the corrected JSON`;

      // Call LLM to fix the JSON
      const llmResponse = await queryLLM({
        prompt: fixPrompt,
        model: "gemini-2.5-flash",
        max_tokens: 4000,
        appName: "vakil",
        task: "fix-split-json-format",
        accessToken: accessToken || ""
      });
      
      if (!llmResponse.success || !llmResponse.content) {
        throw new Error('LLM retry returned empty or failed response');
      }
      
      // Try to parse the fixed response
      let cleanedFixedResponse = llmResponse.content.trim();
      cleanedFixedResponse = cleanedFixedResponse.replace(/^```(?:json)?\n?/i, '').replace(/\n```$/i, '');
      
      const parsed = JSON.parse(cleanedFixedResponse);
      console.log('[API] Successfully parsed JSON after LLM retry');
      return parsed;
      
    } catch (retryError) {
      console.error('[API] LLM retry failed:', retryError);
      // Return a fallback response instead of throwing
      return {
        totalPages: 1,
        analysisConfidence: 0.3,
        segments: [
          {
            fromPage: 1,
            toPage: 1,
            suggestedName: "Complete Document",
            suggestedCategory: "correspondence",
            confidence: 0.3,
            description: "Failed to analyze document automatically - manual review required",
            documentType: "Unknown"
          }
        ]
      };
    }
  }
}

