import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { files } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const caseId = searchParams.get('caseId');

    if (!caseId) {
      return NextResponse.json({ error: "caseId is required" }, { status: 400 });
    }

    // Fetch all files for the case and get their OCR data
    const caseFiles = await db.query.files.findMany({
      where: eq(files.caseId, caseId),
      columns: {
        summary: true,
        fileName: true,
        processingStatus: true,
        type: true,
        id: true
      }
    });

    // Combine all OCR data from completed files
    const allOcrText = caseFiles
      .filter((file: typeof caseFiles[0]) => file.processingStatus === 'completed' && file.summary)
      .map((file: typeof caseFiles[0]) => `=== File ID: ${file.id} === File Name: ${file.fileName} === File Type: ${file.type} === \n File Summary: ${file.summary}`)
      .join('\n\n');

    return NextResponse.json({ 
      ocrText: allOcrText,
      totalFiles: caseFiles.length,
      completedFiles: caseFiles.filter((f: typeof caseFiles[0]) => f.processingStatus === 'completed').length
    });

  } catch (error) {
    console.error('Error fetching OCR data:', error);
    return NextResponse.json(
      { error: "Failed to fetch OCR data" }, 
      { status: 500 }
    );
  }
}
