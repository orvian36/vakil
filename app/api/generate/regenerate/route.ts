import { NextRequest, NextResponse } from "next/server";
import { queryLLM } from "@/lib/llm";
import { cookies } from "next/headers";
import { promises as fsPromises } from 'fs';
import { join } from 'path';
import { SocService } from "@/services/socService";
import PDFAnalysisService from "@/services/pdfAnalysisService";

export async function POST(request: NextRequest) {
  try {
    const { documentType, caseId, ocrText, userComment, caseSummary} = await request.json();

    if (!documentType || !caseId || !ocrText) {
      return NextResponse.json({ error: "documentType, caseId, and ocrText are required" }, { status: 400 });
    }

    // Get access token from cookies
    const cookieStore = await cookies();
    const accessToken = cookieStore.get('access_token')?.value;

    if (!accessToken) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Map document types to their respective prompt files
    const promptFileMap: { [key: string]: string } = {
      'statement-of-claim': 'generate_statement_of_claim.txt',
      'witness-statement': 'generate_witness_statement.txt',
      'pre-action-letter': 'generate_pre-action_letter.txt',
      'statement-of-damages': 'generate_statement_of_damages.txt'
    };

    // Map document types to their respective fields in the database
    const fieldMap: { [key: string]: string } = {
      'statement-of-claim': 'statementOfClaim',
      'witness-statement': 'witnessStatement',
      'pre-action-letter': 'preActionLetter',
      'statement-of-damages': 'statementOfDamages'
    };

    const promptFileName = promptFileMap[documentType];
    if (!promptFileName) {
      return NextResponse.json({ error: "Invalid document type" }, { status: 400 });
    }

    // Read the appropriate prompt template from file
    const promptFilePath = join(process.cwd(), 'lib/prompts', promptFileName);
    const promptTemplate = await fsPromises.readFile(promptFilePath, 'utf-8');
    
    // Create regeneration prompt with user modifications
    let regenerationPrompt = `${promptTemplate}

## Case Summary(Provided by user):
${caseSummary}

## Case Documents information:
${ocrText}`;

    // Add user modifications if provided
    if (userComment && userComment.trim()) {
      regenerationPrompt += `

## User Modifications Requested:
${userComment}

Please incorporate these modifications into the generated content while maintaining the same structure and format.`;
    }

    // Call LLM to regenerate content
    const llmResponse = await queryLLM({
      prompt: regenerationPrompt,
      accessToken,
      model: "google/gemini-3-flash-preview",
      max_tokens: 60000,
      appName: "vakil",
      task: `regenerate-${documentType}`,
      provider: "deepinfra"
    });

    if (llmResponse.success && llmResponse.content) {
      try {
        // Parse the JSON response
        let content = llmResponse.content.trim();
        let thinking = llmResponse.thinking?.trim();
        content = content.replace(/^```(?:json)?\n?/, '').replace(/\n```$/, '');
        console.log('Content:', content);
        const pdfAnalysisService = new PDFAnalysisService();
        const result = await pdfAnalysisService.parseJSONWithRetry(content);


        // Update the regenerated content in the database
        await SocService.upsertSocAnalysis(caseId, { [fieldMap[documentType]]: result.content });

        return NextResponse.json({
          content: result.content,
          thinking: thinking
        });
      } catch (parseError) {
        console.error('Failed to parse LLM response:', parseError);
        return NextResponse.json(
          { error: "Failed to parse regenerated content" },
          { status: 500 }
        );
      }
    } else {
      console.error('LLM regeneration failed:', llmResponse.error);
      return NextResponse.json(
        { error: "Failed to regenerate content" },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error('Error regenerating content:', error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}