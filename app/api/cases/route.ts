import { NextRequest, NextResponse } from "next/server";
import { CaseService } from "@/services/caseService";

export async function POST(req: NextRequest) {
  try {
    const { userId, title, caseType, summary, parties, court, caseNumber } = await req.json();
    const newCase = await CaseService.createCase(userId, title, caseType, summary, parties, court, caseNumber);
    return NextResponse.json(newCase);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: err.statusCode });
  }
}
