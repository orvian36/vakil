import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import PDFAnalysisService from "@/services/pdfAnalysisService";
import { getDownloadUrl } from "@/lib/storage/urls";
import { cookies } from "next/headers";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: fileId } = await params;

    if (!fileId) {
      return NextResponse.json(
        { success: false, error: "File ID is required" },
        { status: 400 },
      );
    }

    const cookieStore = await cookies();
    const accessToken = cookieStore.get("access_token")?.value;

    if (!accessToken) {
      return NextResponse.json(
        { success: false, error: "No access token found. Please log in again." },
        { status: 401 },
      );
    }

    const fileRecord = await prisma.file.findUnique({ where: { id: fileId } });

    if (!fileRecord) {
      return NextResponse.json(
        { success: false, error: "File not found" },
        { status: 404 },
      );
    }

    const downloadUrl = await getDownloadUrl(fileRecord.fileKey);

    if (!downloadUrl) {
      return NextResponse.json(
        { success: false, error: "Failed to get PDF download URL" },
        { status: 500 },
      );
    }

    const body = await request.json();
    const customInstructions = body.instructions || "";

    const pdfAnalysisService = new PDFAnalysisService();
    const analysisResult = await pdfAnalysisService.analyzePDF(
      downloadUrl,
      customInstructions,
      accessToken,
    );

    if (!analysisResult.success) {
      return NextResponse.json(
        { success: false, error: analysisResult.error || "Failed to analyze PDF" },
        { status: 500 },
      );
    }

    const summary = analysisResult.summary;
    await prisma.file.update({ where: { id: fileId }, data: { summary } });

    return NextResponse.json({
      success: true,
      summary,
      message: "Summary regenerated successfully",
    });
  } catch (error) {
    console.error("Error regenerating summary:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 },
    );
  }
}
