import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const caseId = searchParams.get("caseId");

    if (!caseId) {
      return NextResponse.json({ error: "caseId is required" }, { status: 400 });
    }

    const caseFiles = await prisma.file.findMany({
      where: { caseId },
      select: {
        summary: true,
        fileName: true,
        processingStatus: true,
        type: true,
        id: true,
      },
    });

    const allOcrText = caseFiles
      .filter((f) => f.processingStatus === "completed" && f.summary)
      .map(
        (f) =>
          `=== File ID: ${f.id} === File Name: ${f.fileName} === File Type: ${f.type} === \n File Summary: ${f.summary}`,
      )
      .join("\n\n");

    return NextResponse.json({
      ocrText: allOcrText,
      totalFiles: caseFiles.length,
      completedFiles: caseFiles.filter((f) => f.processingStatus === "completed").length,
    });
  } catch (error) {
    console.error("Error fetching OCR data:", error);
    return NextResponse.json({ error: "Failed to fetch OCR data" }, { status: 500 });
  }
}
