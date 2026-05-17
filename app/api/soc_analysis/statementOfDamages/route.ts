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

    if (socAnalysis.statementOfDamages) {
      return NextResponse.json({
        success: true,
        data: { statementOfDamages: socAnalysis.statementOfDamages },
      });
    }

    return NextResponse.json({ success: true, data: null });
  } catch (error) {
    console.error("Error fetching statement of damages data:", error);
    return NextResponse.json(
      { error: "Failed to fetch statement of damages data" },
      { status: 500 },
    );
  }
}
