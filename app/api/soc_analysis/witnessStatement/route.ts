import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const caseId = searchParams.get("caseId");

    if (!caseId) {
      return NextResponse.json({ error: "Case ID is required" }, { status: 400 });
    }

    const socAnalysis = await prisma.socAnalysis.findUnique({
      where: { caseAnalysisId: caseId },
    });

    if (!socAnalysis) {
      return NextResponse.json(
        { error: "No SOC analysis found for this case for witness statement" },
        { status: 404 },
      );
    }

    if (socAnalysis.witnessStatement) {
      return NextResponse.json({
        success: true,
        data: { witnessStatement: socAnalysis.witnessStatement },
      });
    }

    return NextResponse.json({ success: true, data: null });
  } catch (error) {
    console.error("Error fetching witness statement data:", error);
    return NextResponse.json(
      { error: "Failed to fetch witness statement data" },
      { status: 500 },
    );
  }
}
