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
        { error: "No SOC analysis found for this case" },
        { status: 404 },
      );
    }

    if (socAnalysis.preActionLetter) {
      return NextResponse.json({
        success: true,
        data: { preActionLetter: socAnalysis.preActionLetter },
      });
    }

    return NextResponse.json({ success: true, data: null });
  } catch (error) {
    console.error("Error fetching pre-action letter data:", error);
    return NextResponse.json(
      { error: "Failed to fetch pre-action letter data" },
      { status: 500 },
    );
  }
}
