import { NextRequest, NextResponse } from "next/server";
import { queryLLM } from "@/lib/llm";
import { cookies } from "next/headers";
import { promises as fsPromises } from 'fs';
import { join } from 'path';
import { SocService } from "@/services/socService";
import PDFAnalysisService from "@/services/pdfAnalysisService";

export async function POST(request: NextRequest) {
  try {
    const { caseId, ocrData, caseSummary } = await request.json();

    if (!caseId || !ocrData) {
      return NextResponse.json({ error: "caseId and ocrData are required" }, { status: 400 });
    }

    // Get access token from cookies
    const cookieStore = await cookies();
    const accessToken = cookieStore.get('access_token')?.value;

    if (!accessToken) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Read the prompt template from file
    const promptFilePath = join(process.cwd(), 'lib/prompts/generate_statement_of_damages.txt');
    const promptTemplate = await fsPromises.readFile(promptFilePath, 'utf-8');
    
    // Combine prompt template with OCR data
    const prompt = `${promptTemplate}

## Case Summary(Provided by user):
${caseSummary}


## Case Documents information:
${ocrData}`;

    // Call LLM to generate statement of damages
    const llmResponse = await queryLLM({
      prompt,
      accessToken,
      model: "google/gemini-3-flash-preview",
      max_tokens: 60000,
      appName: "vakil",
      task: "generate-statement-of-damages",
      provider: "deepinfra"
    });

    if (llmResponse.success && llmResponse.content) {
      try {
        // Parse the JSON response
        let content = llmResponse.content.trim();
        let thinking = llmResponse.thinking?.trim();
        content = content.replace(/^```(?:json)?\n?/, '').replace(/\n```$/, '');
        const pdfAnalysisService = new PDFAnalysisService();
        const statementOfDamages = await pdfAnalysisService.parseJSONWithRetry(content);

        // Update the statement of damages in the database
        await SocService.upsertByCaseId(caseId, { statementOfDamages: statementOfDamages.content });

        return NextResponse.json({statementOfDamages});
      } catch (parseError) {
        console.error('Failed to parse LLM response:', parseError);
        return NextResponse.json(
          { error: "Failed to parse generated statement of damages" },
          { status: 500 }
        );
      }
    } else {
      console.error('LLM generation failed:', llmResponse.error);
      return NextResponse.json(
        { error: "Failed to generate statement of damages" },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error('Error generating statement of damages:', error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
