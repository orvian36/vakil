import { NextRequest, NextResponse } from "next/server";
import { queryLLM } from "@/lib/llm";
import { cookies } from "next/headers";
import { promises as fsPromises } from 'fs';
import { join } from 'path';
import { SocService } from "@/services/socService";
import PDFAnalysisService from "@/services/pdfAnalysisService";

export async function POST(request: NextRequest) {
  try {
    const { caseId, ocrData } = await request.json();

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
    const promptFilePath = join(process.cwd(), 'lib/prompts/generate_witness_statement.txt');
    const promptTemplate = await fsPromises.readFile(promptFilePath, 'utf-8');
    
    // Combine prompt template with OCR data
    const prompt = `${promptTemplate}

## Case Documents information:
${ocrData}`;

    // Call LLM to generate witness statement
    const llmResponse = await queryLLM({
      prompt,
      accessToken,
      model: "google/gemini-3-flash-preview",
      max_tokens: 60000,
      appName: "vakil",
      task: "generate-witness-statement",
      provider: "deepinfra"
    });

    if (llmResponse.success && llmResponse.content) {
      try {
        // Parse the JSON response
        let content = llmResponse.content.trim();
        let thinking = llmResponse.thinking?.trim();
        content = content.replace(/^```(?:json)?\n?/, '').replace(/\n```$/, '');
        const pdfAnalysisService = new PDFAnalysisService();
        const witnessStatement = await pdfAnalysisService.parseJSONWithRetry(content);

        // Update the witness statement in the database
        await SocService.upsertByCaseId(caseId, { witnessStatement: witnessStatement.content });

        return NextResponse.json({witnessStatement});
      } catch (parseError) {
        console.error('Failed to parse LLM response:', parseError);
        return NextResponse.json(
          { error: "Failed to parse generated witness statement" },
          { status: 500 }
        );
      }
    } else {
      console.error('LLM generation failed:', llmResponse.error);
      return NextResponse.json(
        { error: "Failed to generate witness statement" },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error('Error generating witness statement:', error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
