import { NextRequest, NextResponse } from "next/server";
import { SocService } from "@/services/socService";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const caseId = searchParams.get("caseId");

    if (!caseId) {
      return NextResponse.json({ error: "Case ID is required" }, { status: 400 });
    }

    const socAnalysis = await SocService.getByCaseId(caseId);

    if (!socAnalysis) {
      return NextResponse.json(
        { error: "No SOC analysis found for this case" },
        { status: 404 },
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        writOfSummons: socAnalysis.writOfSummons || "",
        witnessStatement: socAnalysis.witnessStatement || "",
        witnessStatementBengali: socAnalysis.witnessStatementBengali || "",
        statementOfClaim: socAnalysis.statementOfClaim || "",
        statementOfDamages: socAnalysis.statementOfDamages || "",
        preActionLetter: socAnalysis.preActionLetter || "",
      },
    });
  } catch (error) {
    console.error("Error fetching all soc analysis data:", error);
    return NextResponse.json(
      { error: "Failed to fetch soc analysis data" },
      { status: 500 },
    );
  }
}
